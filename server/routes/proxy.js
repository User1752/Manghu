/**
 * routes/proxy.js — Image proxy endpoint
 *
 * GET /api/proxy-image?url=<encoded>&ref=<encoded>
 *
 * Fetches an image from an external CDN and pipes it back to the client,
 * adding the `Referer` header that some CDNs (e.g. MangaPill) require.
 *
 * Security:
 *  • SSRF guard: the `url` query parameter is checked via isSafeUrl() before
 *    any network request is made.  Loopback / private-range addresses are
 *    rejected unconditionally.
 *  • Content-type allowlist: only known image MIME types are forwarded.
 *    This prevents the upstream origin from using this endpoint to serve
 *    HTML, JavaScript, or other active content to the browser (content-type
 *    confusion / reflected XSS through the proxy).
 *  • Cache headers: successful responses are cached by the browser for 24 h
 *    to reduce repeated proxy traffic.
 */

'use strict';

const { Readable } = require('stream');
const { isSafeUrl } = require('../helpers');

const ALLOWED_IMAGE_CT = /^image\/(jpeg|png|gif|webp|avif|bmp|svg\+xml)/i;

/**
 * @param {import('express').Router} router
 */
function registerProxyRoutes(router) {
  router.get('/api/proxy-image', async (req, res) => {
    const { url, ref } = req.query;

    // Validate: must be a public HTTP/HTTPS URL (SSRF guard).
    if (!url || !isSafeUrl(url)) return res.status(400).end();

    // Validate referer origin too — only trust public URLs as a Referer.
    const safeRef = (ref && isSafeUrl(ref)) ? ref : undefined;

    try {
      const imgRes = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
        headers: {
          Referer:      safeRef || 'https://mangapill.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!imgRes.ok) return res.status(imgRes.status).end();

      // Allowlist: reject non-image content types.
      const upstreamCt = imgRes.headers.get('content-type') || '';
      if (!ALLOWED_IMAGE_CT.test(upstreamCt)) return res.status(415).end();

      res.set('Content-Type', upstreamCt.split(';')[0].trim());
      res.set('Cache-Control', 'public, max-age=86400');
      Readable.fromWeb(imgRes.body).pipe(res);
    } catch (e) {
      res.status(500).end();
    }
  });
}

module.exports = { registerProxyRoutes };
