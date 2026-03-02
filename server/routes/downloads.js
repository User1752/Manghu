/**
 * routes/downloads.js — Chapter and bulk download endpoints
 *
 * Endpoints:
 *   POST /api/download/chapter  — Download a single chapter as a CBZ archive
 *   POST /api/download/bulk     — Download multiple chapters as a single CBZ archive
 *
 * Security:
 *  • All page URLs are checked via isSafeUrl() before any fetch is issued.
 *    Local/private-range URLs are silently skipped rather than fetched.
 *  • The sourceId parameter in the bulk download endpoint is validated with
 *    safeId() to prevent path traversal when loading the source module.
 *  • Downloaded filenames are sanitised to ASCII-safe characters.
 *  • Per-image fetch timeout: 30 seconds per image; slow CDNs cannot stall
 *    the entire download indefinitely.
 *
 * Performance:
 *  • Images are fetched sequentially within each chapter to avoid hammering
 *    CDN rate limits.  If a single image fails it is skipped with a warning
 *    so the rest of the chapter still downloads.
 */

'use strict';

const AdmZip = require('adm-zip');
const { safeId, isSafeUrl } = require('../helpers');
const { loadSourceFromFile } = require('../sourceLoader');

/** Max time to wait for a single image fetch (ms). */
const IMG_FETCH_TIMEOUT = 30_000;

/**
 * Fetches a remote image and returns its raw Buffer.
 * Enforces a per-image timeout; throws on non-2xx responses.
 *
 * @param {string} url
 * @param {string} [referer]
 * @returns {Promise<Buffer>}
 */
async function fetchImageBuffer(url, referer = 'https://mangadex.org/') {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), IMG_FETCH_TIMEOUT);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        Referer:      referer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
    return Buffer.from(await resp.arrayBuffer());
  } finally {
    clearTimeout(tid);
  }
}

/** Sanitise a string so it is safe as a filename component. */
const safeName = (s) => String(s || '').replace(/[^a-z0-9\-_. ]/gi, '_').trim();

/**
 * @param {import('express').Router} router
 */
function registerDownloadRoutes(router) {
  // ── POST /api/download/chapter ─────────────────────────────────────────────
  router.post('/api/download/chapter', async (req, res) => {
    try {
      const { mangaTitle, chapterName, pages } = req.body || {};
      if (!Array.isArray(pages) || pages.length === 0)
        return res.status(400).json({ error: 'No pages provided' });

      // SSRF guard — filter out any non-public URLs.
      const safePages = pages.filter(p => typeof p === 'string' && isSafeUrl(p));
      if (safePages.length === 0)
        return res.status(400).json({ error: 'No valid page URLs' });

      const zip = new AdmZip();
      for (let i = 0; i < safePages.length; i++) {
        try {
          const buf = await fetchImageBuffer(safePages[i]);
          const ext = ((safePages[i].match(/\.(jpe?g|png|webp|gif)/i) || ['', 'jpg'])[1])
            .replace('jpeg', 'jpg');
          zip.addFile(`${String(i + 1).padStart(3, '0')}.${ext}`, buf);
        } catch (e) {
          console.warn(`[download] skipped page ${i + 1}: ${e.message}`);
        }
      }

      const filename = `${safeName(mangaTitle)} - ${safeName(chapterName)}.cbz`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(zip.toBuffer());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── POST /api/download/bulk ────────────────────────────────────────────────
  router.post('/api/download/bulk', async (req, res) => {
    try {
      const { mangaTitle, chapters, sourceId } = req.body || {};
      if (!Array.isArray(chapters) || chapters.length === 0)
        return res.status(400).json({ error: 'No chapters provided' });

      // Validate source ID before loading the module.
      const sid = safeId(sourceId);
      if (!sid) return res.status(400).json({ error: 'Invalid sourceId' });

      const source = loadSourceFromFile(sid);
      const zip    = new AdmZip();

      for (const ch of chapters) {
        let pages = [];
        try {
          const result = await source.pages(ch.id);
          pages = result.pages || [];
        } catch (e) {
          console.warn(`[bulk-dl] pages() failed for ${ch.name}: ${e.message}`);
          continue;
        }

        const folder = safeName(ch.name);
        for (let i = 0; i < pages.length; i++) {
          // SSRF guard — skip local/private URLs.
          if (!isSafeUrl(pages[i]?.img || pages[i])) {
            console.warn(`[bulk-dl] skipped unsafe URL for ${ch.name} p${i + 1}`);
            continue;
          }
          const imgUrl = pages[i]?.img || pages[i];
          try {
            const buf = await fetchImageBuffer(imgUrl);
            const ext = ((imgUrl.match(/\.(jpe?g|png|webp|gif)/i) || ['', 'jpg'])[1])
              .replace('jpeg', 'jpg');
            zip.addFile(`${folder}/${String(i + 1).padStart(3, '0')}.${ext}`, buf);
          } catch (e) {
            console.warn(`[bulk-dl] skipped ${ch.name} p${i + 1}: ${e.message}`);
          }
        }
      }

      const filename = `${safeName(mangaTitle)} - ${chapters.length} chapters.cbz`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(zip.toBuffer());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

module.exports = { registerDownloadRoutes };
