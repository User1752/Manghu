# Manghu

**A self-hosted manga reader** that aggregates multiple online sources, tracks your reading progress, and runs as a standalone executable or inside Docker.

---

## Table of Contents

1. [Features](#features)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Backend Module Reference](#backend-module-reference)
5. [Frontend Module Reference](#frontend-module-reference)
6. [API Reference](#api-reference)
7. [Source Plugin API](#source-plugin-api)
8. [Security](#security)
9. [Performance Notes](#performance-notes)
10. [Platform Support](#platform-support)
11. [Build Instructions](#build-instructions)
12. [Docker](#docker)
13. [Configuration](#configuration)

---

## Features

- **Multiple sources**  MangaDex, AllManga, MangaPill; add your own in `data/sources/`
- **CBZ / CBR / PDF import**  read your local files through the same reader
- **Reading progress tracking**  per-chapter read markers, continue-reading, history
- **Library & lists**  favorites, custom lists, reading status (Reading / Completed / On hold)
- **Achievements & AP shop**  unlock achievements, spend AP on community themes
- **Analytics**  daily reading streaks, time spent, chapter counts
- **Recommendation engine**  genre-based suggestions from your library
- **Bulk CBZ download**  download entire series as CBZ archives
- **i18n**  English and Portuguese; add more locales in `public/modules/i18n.js`
- **Theming**  dark/light mode + community themes defined in `public/themes.js`

---

## Quick Start

### Windows (Docker)
```bat
Manghu.bat
```

### Linux / macOS (Docker)
```bash
chmod +x manghu.sh
./manghu.sh
```

### Standalone (Node.js, any platform)
```bash
npm install
node server.js
#  http://localhost:3000
```

### Standalone executable

Download a pre-built binary from the Releases page, or [build it yourself](#build-instructions).

---

## Architecture

```
Manghu/
 server.js               thin orchestrator (entry point, ~165 lines)
 server/
    helpers.js          shared server-side utilities
    store.js            in-memory store + debounced JSON persistence
    sourceLoader.js     plugin loading, path-confinement, caching
    middleware/
       security.js     security headers + rate limiter
    routes/
        proxy.js        image proxy (/api/proxy-image)
        repos.js        repository management
        sources.js      source install/dispatch/popular
        local.js        CBZ/CBR/PDF import
        library.js      favorites, history, reading status
        downloads.js    CBZ chapter/bulk downloads
        reviews.js      user reviews & ratings (110)
        lists.js        custom manga lists
        analytics.js    reading sessions & statistics
        achievements.js achievement unlock/query
        mangaupdates.js MangaUpdates metadata lookup
 public/
    modules/            extracted, documented frontend modules
       api.js          api() fetch helper
       i18n.js         translations, t(), setLanguage()
       state.js        global state object
       navigation.js   NavigationManager class + singletons
       utils.js        DOM helpers, formatters, theme, toast
    app.js              main UI logic (SETTINGS onwards)
    themes.js           community theme definitions
    achievement-manager.js  AchievementManager class
    customSelect.js     accessible custom select widget
    index.html          single-page HTML shell
    styles.css          CSS custom-property design system
 data/
     store.json          user data (auto-created, git-ignored)
     achievements.json   achievement definitions
     icon-mapping.json   Feather icon name  SVG cache
     sources/            source plugin files (JS, git-ignored)
```

---

## Backend Module Reference

### `server/helpers.js`

| Export | Description |
|--------|-------------|
| `safeId(id)` | Strips everything outside `[a-z0-9_\-./]`, max 120 chars. Used to sanitise source IDs before path operations. |
| `safeManga(obj)` | Whitelists known keys on a manga object to prevent prototype-pollution. |
| `sha1Short(str)` | 8-char hex SHA-1 digest. Used for cache key generation. |
| `isSafeUrl(url)` | Returns `false` for loopback, RFC-1918, and link-local addresses (SSRF guard). |
| `fetchJson(url, opts)` | fetch + JSON parse with a 10 s `AbortSignal` timeout. |
| `fetchText(url, opts)` | Same as above but returns the raw response text. |

### `server/store.js`

Wraps `data/store.json` in an in-memory cache with a 300 ms debounced flush.

| Export | Description |
|--------|-------------|
| `configure(storePath)` | Set the path to `store.json`. Call once before `initStore()`. |
| `initStore()` | Load JSON from disk into memory. Creates a blank store on first run. |
| `readStore()` | Return the current in-memory store object. |
| `writeStore(data)` | Merge data into the store and schedule a debounced disk write. |
| `flushStoreSync()` | Force an immediate synchronous write (called on SIGINT/SIGTERM). |

### `server/sourceLoader.js`

| Export | Description |
|--------|-------------|
| `configure(opts)` | Set `sourcesDir`, `snapSourcesDir`, `isPkg` flags. |
| `sourcePath(id)` | Returns the absolute path for a source file, rejecting traversal sequences. |
| `loadSourceFromFile(id)` | `require()` a source, validates the 4-function interface, returns the module. |
| `clearSourceCache(id?)` | Invalidate the require cache for one source (or all). |
| `autoInstallLocalSources()` | Parallel-scan `sourcesDir` and register any `.js` files as sources. |
| `seedSourcesFromSnapshot()` | On first run inside a pkg bundle, copy bundled sources to the writable directory. |

### `server/middleware/security.js`

| Export | Description |
|--------|-------------|
| `applySecurityHeaders(app)` | Attaches security response headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Content-Security-Policy). |
| `rateLimiter(windowMs, max)` | Sliding-window rate limiter middleware. Returns 429 with Retry-After on breach. |

---

## Frontend Module Reference

All modules are loaded as plain scripts in global scope before `app.js`.

| File | Globals exported |
|------|-----------------|
| `modules/api.js` | `api(path, opts)` |
| `modules/i18n.js` | `translations`, `currentLanguage`, `t(key)`, `setLanguage(lang)`, `applyTranslations()` |
| `modules/state.js` | `state` |
| `modules/navigation.js` | `NavigationManager` (class), `navigationManager`, `achievementManager` |
| `modules/utils.js` | `$(id)`, `escapeHtml(s)`, `formatTime(minutes)`, `statusLabel(status)`, `initTheme()`, `toggleTheme()`, `showToast(title, msg, type)` |

Script load order in `index.html`:
```
customSelect.js  achievement-manager.js  themes.js
   modules/api.js  modules/i18n.js  modules/state.js
   modules/navigation.js  modules/utils.js  app.js
```

---

## API Reference

All endpoints are prefixed `/api/`. Rate limit: **600 requests / 10 minutes** per IP.

### State & repositories

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/state` | Installed sources, available sources, repo list. |
| `POST` | `/api/repos` | Add a source repository. Body: `{ url }`. SSRF-guarded. |
| `DELETE` | `/api/repos` | Remove a repository. Body: `{ url }`. |

### Sources

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sources/install` | Install a source from a repo. Body: `{ sourceId, url }`. |
| `DELETE` | `/api/sources/:id` | Uninstall a source. |
| `POST` | `/api/source/:id/:method` | Dispatch to a source method (`search`, `mangaDetails`, `chapters`, `pages`). 30 s timeout. |
| `GET` | `/api/popular-all` | Aggregated popular manga across all sources. 60 s TTL cache. |

### Library

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/library` | Returns `{ favorites, history }`. |
| `POST` | `/api/favorites/toggle` | Add or remove a manga from favorites (sanitised with `safeManga`). |
| `POST` | `/api/history` | Append a chapter read event. |
| `GET` | `/api/user/status` | Returns `{ readingStatus }` map. |
| `POST` | `/api/user/status` | Set reading status. Body: `{ mangaId, sourceId, status, manga }`. |
| `GET` | `/api/ratings` | Returns `{ ratings }` map. |
| `POST` | `/api/ratings` | Set a rating. Body: `{ mangaId, rating }`. Rating clamped to [1, 10]. |

### Downloads

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/download/chapter` | Download a single chapter as CBZ. |
| `POST` | `/api/download/bulk` | Download multiple chapters as CBZ. `sourceId` validated with `safeId()`. |

### Local manga

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/local/import` | Upload a CBZ / CBR / PDF file via multipart. |
| `GET` | `/api/local/list` | List all imported local manga. |
| `DELETE` | `/api/local/:id` | Delete a local manga. |
| `POST` | `/api/source/local/:method` | Virtual local source (`mangaDetails`, `chapters`, `pages`). |

### Reviews & lists

| Method | Path | Description |
|--------|------|-------------|
| `GET` `POST` `DELETE` | `/api/reviews` | CRUD for user reviews. Text capped at 2 000 chars. |
| `GET` `POST` | `/api/lists` | List all / create a custom list. |
| `DELETE` | `/api/lists/:id` | Delete a list. |
| `POST` `DELETE` | `/api/lists/:id/items` | Add / remove a manga from a list. |

### Analytics & achievements

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics` | Aggregated reading statistics. |
| `POST` | `/api/analytics/session` | Record a reading session. Duration clamped to [0, 1 440] min. |
| `GET` | `/api/achievements` | Returns `{ achievements }` array. |
| `POST` | `/api/achievements/unlock` | Idempotently unlock an achievement. |

### Utilities

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/proxy-image?url=&ref=` | SSRF-guarded image proxy. 24 h cache, 15 s timeout. |
| `POST` | `/api/mangaupdates/search` | MangaUpdates metadata lookup. 10 s timeout. |

---

## Source Plugin API

A source is a CommonJS module placed in `data/sources/`:

```js
exports.meta = { id: 'my-source', name: 'My Source', baseUrl: 'https://example.com', lang: 'en' };

exports.search       = async ({ query, page = 1 }) => ({ results: [], hasNextPage: false });
exports.mangaDetails = async ({ mangaId })         => ({ id, title, cover, chapters: [] });
exports.chapters     = async ({ mangaId })         => ([ /* Chapter[] */ ]);
exports.pages        = async ({ mangaId, chapterId }) => ({ pages: [ /* url strings */ ] });
```

All four exports are required. Source calls are wrapped in a **30 s timeout**; exceeding it returns HTTP 504.

---

## Security

### Fixed vulnerabilities (v1.1.0)

| Severity | Endpoint | Issue | Fix |
|----------|----------|-------|-----|
| High | `POST /api/repos` | No SSRF guard on supplied URL | `isSafeUrl()` check in `repos.js` |
| High | `POST /api/favorites/toggle` | Raw `{...manga}` spread allowed arbitrary key injection | `safeManga()` whitelist in `library.js` |
| High | `POST /api/download/bulk` | `sourceId` passed directly to `require()` path | `safeId()` validation in `downloads.js` |
| Medium | All `/api/*` | No rate limiting | Sliding-window limiter (600 req / 10 min / IP) |
| Medium | Source calls | No timeout  hung scraper blocks event loop | `withTimeout(call, 30_000)` in `sources.js` |
| Low | `/api/mangaupdates/search` | No fetch timeout | `AbortSignal.timeout(10_000)` |

### Ongoing hardening

- **SSRF**  `isSafeUrl()` blocks loopback, RFC-1918, and link-local ranges
- **Prototype pollution**  review/status keys sanitised with character-class whitelists
- **Path traversal**  `sourcePath()` rejects `..` and absolute path prefixes
- **Content-type confusion**  image proxy validates upstream `Content-Type` against an allowlist
- **Security headers**  `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`

---

## Performance Notes

| Area | Optimisation |
|------|-------------|
| Store I/O | 300 ms debounced flush; all reads are in-memory |
| Source init | `autoInstallLocalSources()` uses `Promise.all()`  parallel, not serial |
| Popular cache | `/api/popular-all` has a 60 s TTL in-memory cache |
| Source timeouts | 30 s hard cap prevents hung scrapers from blocking the event loop |
| Gzip | All HTTP responses compressed by the `compression` middleware |
| Static caching | `Cache-Control: public, max-age=7d` in production; `0` in development |
| Image proxy | `Cache-Control: public, max-age=86400` (24 h) |

---

## Platform Support

| Platform | Method | Notes |
|----------|--------|-------|
| **Windows** | `Manghu.bat` (Docker) or `Manghu-win.exe` | Primary development target |
| **Linux** | `manghu.sh` (Docker) or `Manghu-linux` exe | Ubuntu 22.04 tested |
| **macOS** | `manghu.sh` (Docker) or `Manghu-mac` exe | `open` used for browser launch |
| **Android (Termux)** | `node server.js` | `pkg install nodejs` in Termux; no auto browser open |
| **Docker** | `docker compose up -d --build` in `docker/` | Data and public dirs mounted as volumes |

**Android (Termux) setup:**
```bash
pkg update && pkg install nodejs git
git clone <repo> Manghu && cd Manghu
npm install
node server.js &
# Open http://localhost:3000 in your mobile browser
```

---

## Build Instructions

**Prerequisites:** Node.js  20, `npm install`

```bash
npm run build:win    #  dist/Manghu-win.exe
npm run build:linux  #  dist/Manghu-linux
npm run build:mac    #  dist/Manghu-mac
npm run build:all    # all three
```

The `pkg` configuration bundles `public/**/*`, `server/**/*.js`, `data/achievements.json`, `data/icon-mapping.json`, and the WASM RAR extractor. On first launch the executable seeds `data/sources/` from the bundle so users can customise sources without rebuilding.

---

## Docker

```yaml
# docker/docker-compose.yml
services:
  manghu:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ../data:/app/data      # user data persists across rebuilds
      - ../public:/app/public  # live CSS/JS changes without rebuild
    restart: unless-stopped
```

Editing `public/` files takes effect immediately without rebuilding the image. To apply server-side code changes:

```bash
cd docker && docker compose up -d --build
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP listen port |
| `NODE_ENV` | `development` | Set to `production` for long-lived static caching |

User data lives in `data/store.json`. Back up this file to preserve your library, history, and achievements.