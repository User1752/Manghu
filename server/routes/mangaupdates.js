/**
 * routes/mangaupdates.js — MangaUpdates series metadata lookup
 *
 * Endpoints:
 *   POST /api/mangaupdates/search — Search MangaUpdates for a series by title
 *
 * Returns enriched metadata (latest chapter, status, year, genres) from the
 * MangaUpdates API.  Results are intended as a supplemental data source,
 * not a replacement for the primary manga source.
 *
 * Security:
 *  • The search query is trimmed and capped at 200 characters before being
 *    sent to the external API.
 *  • The series_id returned by MangaUpdates is validated as a positive finite
 *    integer before being interpolated into a URL.
 *  • All external fetch calls carry an AbortSignal.timeout(10_000) to prevent
 *    a slow MangaUpdates API from blocking the Node.js event loop.
 */

'use strict';

/**
 * @param {import('express').Router} router
 */
function registerMangaUpdatesRoutes(router) {
  router.post('/api/mangaupdates/search', async (req, res) => {
    try {
      const { title } = req.body || {};
      if (!title || typeof title !== 'string')
        return res.status(400).json({ error: 'title (string) required' });

      const safeTitle = title.trim().slice(0, 200);

      // ── Step 1: search for the series ──────────────────────────────────────
      const searchRes = await fetch('https://api.mangaupdates.com/v1/series/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ search: safeTitle, perpage: 5 }),
        signal:  AbortSignal.timeout(10_000),
      });
      if (!searchRes.ok) throw new Error(`MangaUpdates search error: ${searchRes.status}`);

      const searchData = await searchRes.json();
      const results    = searchData.results || [];
      if (!results.length) return res.json({ found: false, message: 'No results found on MangaUpdates' });

      // ── Step 2: validate series ID, then fetch details ─────────────────────
      const seriesId = Number(results[0].record?.series_id);
      if (!Number.isFinite(seriesId) || seriesId <= 0)
        throw new Error('Invalid series_id in MangaUpdates response');

      const detailRes = await fetch(`https://api.mangaupdates.com/v1/series/${seriesId}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!detailRes.ok) throw new Error(`MangaUpdates detail error: ${detailRes.status}`);

      const details = await detailRes.json();

      res.json({
        found:          true,
        seriesId,
        title:          results[0].record.title,
        latestChapter:  details.latest_chapter || null,
        status:         details.status         || 'Unknown',
        year:           details.year           || 'Unknown',
        genres:         (details.genres || []).map(g => g.genre),
        url:            `https://www.mangaupdates.com/series/${seriesId}`,
      });
    } catch (e) {
      console.error('MangaUpdates error:', e.message);
      res.status(500).json({ error: e.message, found: false, message: 'Failed to fetch from MangaUpdates' });
    }
  });
}

module.exports = { registerMangaUpdatesRoutes };
