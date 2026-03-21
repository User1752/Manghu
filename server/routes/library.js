/**
 * routes/library.js — User library, reading history, favorites, and reading status
 *
 * Endpoints:
 *   GET    /api/library              — Returns favorites + history arrays
 *   POST   /api/library/add          — Add or update a manga in favorites
 *   POST   /api/library/remove       — Remove a manga from favorites
 *   POST   /api/history/add          — Prepend an entry to reading history (cap 100)
 *   POST   /api/history/remove       — Remove a specific history entry
 *   DELETE /api/history/clear        — Wipe all history
 *   POST   /api/favorites/toggle     — Toggle favorite status (add or remove)
 *   GET    /api/user/status          — Return the reading-status map
 *   POST   /api/user/status          — Set / clear reading status for a manga
 *
 * Security:
 *  • All manga payloads are sanitised via safeManga() — only a whitelisted
 *    set of scalar/array fields are written to the store.
 *  • Reading-status composite keys (mangaId:sourceId) are sanitised to
 *    prevent prototype-pollution attacks (__proto__, constructor…).
 *  • The `status` value is validated against a strict whitelist of known
 *    reading states to prevent arbitrary data injection.
 *  • String fields are length-capped throughout.
 */

'use strict';

const { safeManga } = require('../helpers');
const { readStore, writeStore } = require('../store');

// Valid reading status states
const VALID_STATUSES = new Set(['reading', 'completed', 'on_hold', 'plan_to_read', 'dropped']);

/**
 * Higher-order function to encapsulate try-catch blocks for async route handlers.
 * Ensures that any unhandled promise rejections are mapped cleanly to 500 errors.
 * 
 * @param {Function} fn 
 */
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

/**
 * @param {import('express').Router} router
 */
function registerLibraryRoutes(router) {
  // ── GET /api/library ────────────────────────────────────────────────────────
  router.get('/api/library', asyncHandler(async (_req, res) => {
    const store = await readStore();
    res.json({ favorites: store.favorites || [], history: store.history || [] });
  }));

  // ── POST /api/library/add ───────────────────────────────────────────────────
  router.post('/api/library/add', asyncHandler(async (req, res) => {
    const { mangaId, sourceId, manga } = req.body || {};
    const store = await readStore();
    
    const safeEntry = { ...safeManga(manga), sourceId, addedAt: new Date().toISOString() };
    const existing = store.favorites.findIndex(m => m.id === mangaId && m.sourceId === sourceId);
    
    if (existing >= 0) {
      store.favorites[existing] = safeEntry;
    } else {
      store.favorites.push(safeEntry);
    }
    
    await writeStore(store);
    res.json({ ok: true, favorites: store.favorites });
  }));

  // ── POST /api/library/remove ────────────────────────────────────────────────
  router.post('/api/library/remove', asyncHandler(async (req, res) => {
    const { mangaId, sourceId } = req.body || {};
    const store = await readStore();
    
    store.favorites = store.favorites.filter(m => !(m.id === mangaId && m.sourceId === sourceId));
    
    await writeStore(store);
    res.json({ ok: true, favorites: store.favorites });
  }));

  // ── POST /api/history/add ───────────────────────────────────────────────────
  router.post('/api/history/add', asyncHandler(async (req, res) => {
    const { mangaId, sourceId, manga, chapterId } = req.body || {};
    const store = await readStore();
    
    const existing = store.history.findIndex(m => m.id === mangaId && m.sourceId === sourceId);
    if (existing >= 0) store.history.splice(existing, 1);
    
    store.history.unshift({
      ...safeManga(manga),
      sourceId,
      chapterId: String(chapterId ?? '').slice(0, 200),
      readAt: new Date().toISOString(),
    });
    
    store.history = store.history.slice(0, 100); // cap at 100 entries
    
    await writeStore(store);
    res.json({ ok: true, history: store.history });
  }));

  // ── POST /api/history/remove ────────────────────────────────────────────────
  router.post('/api/history/remove', asyncHandler(async (req, res) => {
    const { mangaId, sourceId } = req.body || {};
    const store = await readStore();
    
    store.history = store.history.filter(m => !(m.id === mangaId && m.sourceId === sourceId));
    
    await writeStore(store);
    res.json({ ok: true, history: store.history });
  }));

  // ── DELETE /api/history/clear ───────────────────────────────────────────────
  router.delete('/api/history/clear', asyncHandler(async (_req, res) => {
    const store = await readStore();
    
    store.history = [];
    
    await writeStore(store);
    res.json({ ok: true });
  }));

  // ── POST /api/favorites/toggle ──────────────────────────────────────────────
  router.post('/api/favorites/toggle', asyncHandler(async (req, res) => {
    const { mangaId, sourceId, manga } = req.body || {};
    const store = await readStore();
    
    const index = store.favorites.findIndex(m => m.id === mangaId && m.sourceId === sourceId);
    let isFavorite = false;
    
    if (index > -1) {
      store.favorites.splice(index, 1);
    } else {
      store.favorites.push({
        ...safeManga(manga),
        id: mangaId,
        sourceId,
        addedAt: new Date().toISOString()
      });
      isFavorite = true;
    }
    
    await writeStore(store);
    res.json({ success: true, isFavorite, favorites: store.favorites });
  }));

  // ── GET /api/user/status ────────────────────────────────────────────────────
  router.get('/api/user/status', asyncHandler(async (_req, res) => {
    const store = await readStore();
    res.json({ readingStatus: store.readingStatus });
  }));

  // ── POST /api/user/status ───────────────────────────────────────────────────
  router.post('/api/user/status', asyncHandler(async (req, res) => {
    const { mangaId, sourceId, status, mangaData } = req.body || {};
    
    if (!mangaId || !sourceId) {
      return res.status(400).json({ error: 'mangaId and sourceId required' });
    }

    const store = await readStore();
    // Sanitise the composite key to prevent prototype-pollution attacks.
    const key = `${mangaId}:${sourceId}`.replace(/[^a-z0-9:_-]/gi, '_').slice(0, 300);

    if (!status || status === 'none') {
      delete store.readingStatus[key];
    } else {
      // Reject unknown status values
      if (!VALID_STATUSES.has(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      
      store.readingStatus[key] = {
        status,
        updatedAt: new Date().toISOString(),
        manga: safeManga(mangaData),
      };
    }

    await writeStore(store);
    res.json({ ok: true, readingStatus: store.readingStatus });
  }));
}

module.exports = { registerLibraryRoutes };
