/**
 * routes/lists.js — Custom manga list management
 *
 * Endpoints:
 *   GET    /api/lists                        — List all custom lists
 *   POST   /api/lists                        — Create a new list
 *   PUT    /api/lists/:id                    — Update list name / description
 *   DELETE /api/lists/:id                    — Delete a list
 *   POST   /api/lists/:id/manga              — Add a manga to a list (idempotent)
 *   DELETE /api/lists/:id/manga/:mangaId     — Remove a manga from a list
 *
 * Security:
 *  • List IDs and manga IDs are length-capped; characters are not further
 *    restricted because they are always compared with strict equality (===).
 *  • Manga payloads added to lists are sanitised via safeManga() to prevent
 *    arbitrary key injection.
 *  • String field lengths are capped: name 100 chars, description 500 chars.
 */

'use strict';

const { safeManga } = require('../helpers');
const { readStore, writeStore } = require('../store');

/**
 * @param {import('express').Router} router
 */
function registerListRoutes(router) {
  // ── GET /api/lists ─────────────────────────────────────────────────────────
  router.get('/api/lists', async (_req, res) => {
    try {
      const store = await readStore();
      res.json({ lists: store.customLists });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── POST /api/lists ────────────────────────────────────────────────────────
  router.post('/api/lists', async (req, res) => {
    try {
      const { name, description } = req.body || {};
      if (!name?.trim()) return res.status(400).json({ error: 'List name required' });
      const store = await readStore();
      const list  = {
        id:          `list_${Date.now()}`,
        name:        name.trim().slice(0, 100),
        description: String(description || '').slice(0, 500),
        mangaItems:  [],
        createdAt:   new Date().toISOString(),
      };
      store.customLists.push(list);
      await writeStore(store);
      res.json({ ok: true, list });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── PUT /api/lists/:id ─────────────────────────────────────────────────────
  router.put('/api/lists/:id', async (req, res) => {
    try {
      const listId = String(req.params.id || '').slice(0, 100);
      const { name, description } = req.body || {};
      const store  = await readStore();
      const list   = store.customLists.find(l => l.id === listId);
      if (!list) return res.status(404).json({ error: 'List not found' });
      if (name)                    list.name        = name.trim().slice(0, 100);
      if (description !== undefined) list.description = String(description).slice(0, 500);
      await writeStore(store);
      res.json({ ok: true, list });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── DELETE /api/lists/:id ──────────────────────────────────────────────────
  router.delete('/api/lists/:id', async (req, res) => {
    try {
      const listId        = String(req.params.id || '').slice(0, 100);
      const store         = await readStore();
      store.customLists   = store.customLists.filter(l => l.id !== listId);
      await writeStore(store);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── POST /api/lists/:id/manga ──────────────────────────────────────────────
  router.post('/api/lists/:id/manga', async (req, res) => {
    try {
      const listId     = String(req.params.id || '').slice(0, 100);
      const { mangaData } = req.body || {};
      if (!mangaData?.id) return res.status(400).json({ error: 'mangaData.id required' });
      const store = await readStore();
      const list  = store.customLists.find(l => l.id === listId);
      if (!list) return res.status(404).json({ error: 'List not found' });
      if (!list.mangaItems.some(m => m.id === mangaData.id)) {
        list.mangaItems.push({ ...safeManga(mangaData), addedAt: new Date().toISOString() });
      }
      await writeStore(store);
      res.json({ ok: true, list });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── DELETE /api/lists/:id/manga/:mangaId ───────────────────────────────────
  router.delete('/api/lists/:id/manga/:mangaId', async (req, res) => {
    try {
      const listId  = String(req.params.id      || '').slice(0, 100);
      const mId     = String(req.params.mangaId || '').slice(0, 200);
      const store   = await readStore();
      const list    = store.customLists.find(l => l.id === listId);
      if (!list) return res.status(404).json({ error: 'List not found' });
      list.mangaItems = list.mangaItems.filter(m => m.id !== mId);
      await writeStore(store);
      res.json({ ok: true, list });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

module.exports = { registerListRoutes };
