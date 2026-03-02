/**
 * store.js — In-memory store cache backed by disk persistence
 *
 * Design goals:
 *  • Single source of truth: all reads and writes go through this module.
 *  • Race-condition safe: an in-memory object is updated synchronously on
 *    every mutation so concurrent reads always see the latest state.
 *  • Debounced disk writes: rapid mutations are coalesced into a single
 *    write (300 ms window) to avoid hammering the filesystem.
 *  • Graceful shutdown: SIGINT/SIGTERM flush the store synchronously.
 *
 * Exports:
 *   readStore()        — Returns the current store object (Promise)
 *   writeStore(store)  — Persists store in memory and schedules a disk flush
 *   initStore()        — Loads store from disk at startup
 *   flushStoreSync()   — Synchronously writes the store to disk (used during shutdown)
 *   normaliseStore(s)  — Fills missing fields on the store object (migrations)
 */

'use strict';

const fs  = require('fs');
const fsp = fs.promises;
const path = require('path');

// STORE_PATH is injected by the bootstrapper (server.js) before any routes run.
let STORE_PATH = null;

/** @type {object|null} */
let _store = null;

/** @type {ReturnType<typeof setTimeout>|null} */
let _flushTimer = null;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Configure the store file path. Must be called once at startup, before
 * initStore() or any route handler runs.
 *
 * @param {string} storePath  Absolute path to store.json
 */
function configure(storePath) {
  STORE_PATH = storePath;
}

/**
 * Returns the in-memory store, reading from disk only on the very first call
 * (startup path via initStore is preferred).
 *
 * @returns {Promise<object>}
 */
async function readStore() {
  if (!_store) {
    const raw = await fsp.readFile(STORE_PATH, 'utf8');
    _store = JSON.parse(raw);
    normaliseStore(_store);
  }
  return _store;
}

/**
 * Replaces the in-memory store and schedules a debounced disk flush.
 * Returns immediately so callers are never blocked by I/O.
 *
 * @param {object} store
 */
async function writeStore(store) {
  _store = store; // synchronous — concurrent reads see new state immediately
  _debouncedFlush();
}

/**
 * Reads store.json from disk and primes the in-memory cache.
 * Should be called once during startup, after ensureDirs().
 */
async function initStore() {
  if (!fs.existsSync(STORE_PATH)) return;
  let raw;
  try {
    raw = await fsp.readFile(STORE_PATH, 'utf8');
  } catch (e) {
    console.error('Store read error at startup:', e.message);
    return;
  }
  try {
    _store = JSON.parse(raw);
  } catch (e) {
    console.error('Store JSON parse error — starting fresh:', e.message);
    _store = {};
  }
  normaliseStore(_store);
}

/**
 * Writes the current in-memory store to disk synchronously.
 * Called from SIGINT/SIGTERM handlers so data is not lost on shutdown.
 */
function flushStoreSync() {
  if (!_store) return;
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(_store, null, 2), 'utf8');
  } catch (e) {
    console.error('Shutdown flush error:', e.message);
  }
}

/**
 * Fills in any missing fields introduced by newer versions of the app.
 * Runs once at startup (via initStore) so the store is always normalised.
 * Also safe to call on freshly-created stores.
 *
 * @param {object} s  The raw store object (mutated in place)
 */
function normaliseStore(s) {
  s.repos            = Array.isArray(s.repos)
    ? s.repos.map(r => ({ ...r, kind: r.kind || 'jsrepo', name: r.name || r.url }))
    : [];
  s.installedSources = s.installedSources || {};
  s.history          = s.history          || [];
  s.favorites        = s.favorites        || [];
  s.readingStatus    = s.readingStatus    || {};
  s.reviews          = s.reviews          || {};
  s.customLists      = s.customLists      || [];
  s.analytics        = s.analytics || {
    totalChaptersRead: 0,
    totalTimeSpent:    0,
    readingSessions:   [],
    dailyStreak:       0,
    lastReadDate:      null,
  };
  s.achievements = s.achievements || [];
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function _debouncedFlush() {
  if (_flushTimer) clearTimeout(_flushTimer);
  _flushTimer = setTimeout(async () => {
    _flushTimer = null;
    try {
      await fsp.writeFile(STORE_PATH, JSON.stringify(_store, null, 2), 'utf8');
    } catch (e) {
      console.error('Store write error:', e.message);
    }
  }, 300);
}

// Graceful shutdown hooks — registered once when this module is first loaded.
process.on('SIGINT',  () => { flushStoreSync(); process.exit(0); });
process.on('SIGTERM', () => { flushStoreSync(); process.exit(0); });

module.exports = { configure, readStore, writeStore, initStore, flushStoreSync, normaliseStore };
