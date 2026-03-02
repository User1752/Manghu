/**
 * routes/achievements.js — Achievement unlock and query endpoints
 *
 * Endpoints:
 *   GET  /api/achievements          — Return the list of unlocked achievement IDs
 *   POST /api/achievements/unlock   — Unlock an achievement (idempotent)
 *
 * Security:
 *  • Achievement IDs are sanitised to safe identifier characters and capped
 *    at 100 characters to prevent oversized payloads reaching the store.
 *  • Unlock is idempotent: re-submitting an already-unlocked ID is a no-op,
 *    so callers can safely retry without bloating the achievements array.
 */

'use strict';

const { readStore, writeStore } = require('../store');

/**
 * @param {import('express').Router} router
 */
function registerAchievementRoutes(router) {
  // ── GET /api/achievements ──────────────────────────────────────────────────
  router.get('/api/achievements', async (_req, res) => {
    try {
      const store = await readStore();
      res.json({ achievements: store.achievements });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── POST /api/achievements/unlock ──────────────────────────────────────────
  router.post('/api/achievements/unlock', async (req, res) => {
    try {
      const { achievementId } = req.body || {};
      if (!achievementId || typeof achievementId !== 'string')
        return res.status(400).json({ error: 'achievementId (string) required' });

      // Sanitise: allow only safe identifier characters.
      const safeAchId = achievementId.slice(0, 100).replace(/[^a-z0-9_-]/gi, '_');

      const store = await readStore();
      const isNew = !store.achievements.includes(safeAchId);
      if (isNew) {
        store.achievements.push(safeAchId);
        await writeStore(store);
      }

      res.json({ ok: true, isNew, achievements: store.achievements });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

module.exports = { registerAchievementRoutes };
