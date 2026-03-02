/**
 * helpers.js — Shared utility functions for Manghu server
 *
 * Exports:
 *   safeId(id)           — Validates and returns a safe alphanumeric ID (or null)
 *   safeManga(manga)     — Whitelist-filters incoming manga objects to prevent injection
 *   sha1Short(input)     — Returns a 12-character SHA-1 hex prefix
 *   isSafeUrl(rawUrl)    — SSRF guard: rejects private/loopback URLs
 *   fetchJson(url)       — Fetches and parses JSON with 10 s timeout
 *   fetchText(url)       — Fetches text with 10 s timeout
 */

'use strict';

const crypto = require('crypto');

// ── ID validation ────────────────────────────────────────────────────────────
/**
 * Validates a source/manga ID.
 * IDs must be 1–80 chars, alphanumeric + hyphen/underscore only.
 * Returns the ID unchanged, or null if invalid.
 *
 * @param {unknown} id
 * @returns {string|null}
 */
function safeId(id) {
  if (typeof id !== 'string') return null;
  return /^[a-z0-9_-]{1,80}$/i.test(id) ? id : null;
}

// ── Manga payload sanitiser ──────────────────────────────────────────────────
/**
 * Strips unknown keys from a client-supplied manga object.
 * Prevents prototype pollution, oversized blobs, and arbitrary key injection
 * into the store.
 *
 * @param {unknown} manga
 * @returns {object}
 */
function safeManga(manga) {
  if (!manga || typeof manga !== 'object') return {};
  const str = (v, max = 300) => String(v ?? '').slice(0, max);
  const arr = (v) => (Array.isArray(v) ? v.map(x => str(x, 100)).slice(0, 50) : []);
  return {
    id:          str(manga.id, 100),
    title:       str(manga.title),
    cover:       str(manga.cover, 500),
    author:      str(manga.author),
    description: str(manga.description, 1000),
    status:      str(manga.status, 50),
    url:         str(manga.url, 500),
    genres:      arr(manga.genres),
    type:        str(manga.type, 20),
  };
}

// ── Hashing ──────────────────────────────────────────────────────────────────
/**
 * Returns the first 12 hex characters of a SHA-1 digest.
 * Used for generating short deterministic IDs (not for security).
 *
 * @param {string} input
 * @returns {string}
 */
function sha1Short(input) {
  return crypto.createHash('sha1').update(String(input)).digest('hex').slice(0, 12);
}

// ── SSRF guard ───────────────────────────────────────────────────────────────
// Reject URLs resolving to private / loopback address spaces so that the
// image proxy and external API callers cannot be weaponised as an SSRF vector.
const PRIVATE_IP_RE =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|::1$|fc00:|fe80:)/i;

/**
 * Returns true only for public-internet HTTP/HTTPS URLs.
 *
 * @param {string} rawUrl
 * @returns {boolean}
 */
function isSafeUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.replace(/\[|\]/g, ''); // strip IPv6 brackets
    return !PRIVATE_IP_RE.test(host) && host !== 'localhost';
  } catch {
    return false;
  }
}

// ── Network helpers ──────────────────────────────────────────────────────────
/**
 * Fetches a URL and returns the parsed JSON body.
 * Enforces a 10 s timeout and throws on non-2xx responses.
 *
 * @param {string} url
 * @returns {Promise<unknown>}
 */
async function fetchJson(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Fetches a URL and returns the raw text body.
 * Enforces a 10 s timeout and throws on non-2xx responses.
 *
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

module.exports = { safeId, safeManga, sha1Short, isSafeUrl, fetchJson, fetchText };
