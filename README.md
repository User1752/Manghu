# Manghu - Manga Web Reader

A self-hosted web-based manga reader with MangaDex support, library tracking, analytics, and more.

## Features

**Reading**
- LTR, RTL, and Webtoon (vertical scroll) reading modes
- Zoom controls (+/−/reset) with keyboard shortcuts
- Automatic progress saving — resume from where you left off
- Mark chapters as read, skip duplicates

**Library & Organization**
- Add manga to your personal library
- Set reading status per manga: Reading, Completed, On Hold, Plan to Read, Dropped
- Filter your library by reading status
- Create and manage custom lists (group manga however you like)

**Discovery**
- Quick search and Advanced Search with filters (order by, status, tags)
- Random manga button
- Personalized recommendations based on the genres in your library

**Reviews & Ratings**
- Rate manga with 1–5 stars
- Write optional text reviews

**Analytics & Achievements**
- Track total chapters read, time spent reading, and daily streak
- Status distribution chart (how much of your library is completed, reading, etc.)
- 12 unlockable achievements with in-app notifications

**Interface**
- Dark and Light mode toggle (persisted across sessions)
- Toast notifications for all actions
- Responsive layout — works on mobile and desktop

---

## Quick Start

### Local

```bash
npm install
npm start
```

Open: http://localhost:3000

### Docker

```bash
cd docker
docker compose up --build
```

Open: http://localhost:3000

---

## User Guide

### Searching for Manga

1. Enter a title in the search bar on the Home view and press Enter or click **Search**
2. Click any result to open the manga detail page
3. For filters (genre, status, tags, sort order) use **Advanced Search** in the sidebar

### Managing Your Library

- On any manga detail page, click **Add to Library** to save it
- Use the **Reading Status** dropdown on the detail page to track your progress
- Go to **Library** in the sidebar to see all saved manga — use the filter to narrow by status

### Custom Lists

1. Go to **My Lists** in the sidebar
2. Click **New List** to create a list with a name and optional description
3. From any manga detail page, click **Add to List** to add it to an existing list
4. Open a list to browse or remove items

### Reading a Chapter

1. Open a manga and click any chapter from the chapter list
2. Navigate pages with the arrow buttons or keyboard:
   - `→` / `d` — next page
   - `←` / `a` — previous page
   - `Escape` — close reader
   - `+` / `=` — zoom in
   - `-` — zoom out
3. Change reading mode (LTR/RTL/Webtoon) in **Settings** (⚙️)

### Analytics

Go to **Analytics** in the sidebar to see:
- Chapters read, total reading time, and daily streak
- Status distribution across your library
- Recent reading sessions
- Earned achievements

---

## Settings

Access via the ⚙️ button in the sidebar.

| Setting | Description |
|---|---|
| Reading Mode | LTR / RTL / Webtoon |
| Hide Read Chapters | Only show unread chapters in chapter lists |
| Skip Duplicate Chapters | Skip chapters with the same chapter number |
| Pan Wide Images | Enable horizontal scroll for double-page spreads |
| Clear Reading History | Reset all locally saved reading progress |

---

## Project Structure

```
Manghu/
├── data/
│   ├── sources/           # Manga source scripts
│   │   └── mangadex.js
│   ├── store.json         # All persistent data (library, lists, analytics, etc.)
│   └── cache/             # API cache
├── public/
│   ├── index.html         # App shell and views
│   ├── styles.css         # Styles (dark/light themes, all components)
│   └── app.js             # Frontend logic
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── server.js              # Express API server
└── package.json
```

---

## API Reference

### Content

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/source/:id/search` | Search manga. Body: `{ query, page, orderBy?, statuses?, tags? }` |
| `POST` | `/api/source/:id/mangaDetails` | Get manga info. Body: `{ mangaId }` |
| `POST` | `/api/source/:id/chapters` | Get chapter list. Body: `{ mangaId }` |
| `POST` | `/api/source/:id/pages` | Get page images. Body: `{ chapterId }` |

### Library

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/library` | Returns `{ favorites, history }` |
| `POST` | `/api/favorites/toggle` | Add or remove from library |
| `GET` | `/api/user/status` | Get all reading statuses |
| `POST` | `/api/user/status` | Set status for a manga |

### Reviews

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reviews/:mangaId` | Get reviews for a manga |
| `POST` | `/api/reviews` | Submit a review (`{ mangaId, rating, text }`) |

### Custom Lists

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/lists` | Get all lists |
| `POST` | `/api/lists` | Create a list |
| `PUT` | `/api/lists/:id` | Rename/update a list |
| `DELETE` | `/api/lists/:id` | Delete a list |
| `POST` | `/api/lists/:id/manga` | Add manga to a list |
| `DELETE` | `/api/lists/:id/manga/:mangaId` | Remove manga from a list |

### Analytics & Achievements

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics` | Get stats, status distribution, sessions |
| `POST` | `/api/analytics/session` | Record a reading session |
| `GET` | `/api/achievements` | Get unlocked achievements |
| `POST` | `/api/achievements/unlock` | Unlock an achievement |

---

## Adding a Custom Source

Create `data/sources/mysource.js`:

```javascript
module.exports = {
  meta: {
    id: "mysource",
    name: "My Source",
    version: "1.0.0",
    author: "You",
    icon: ""
  },

  async search(query, page) {
    // return { results: [{ id, title, cover, author, ... }] }
  },

  async mangaDetails(mangaId) {
    // return { id, title, cover, author, description, genres, status, ... }
  },

  async chapters(mangaId) {
    // return { chapters: [{ id, name, date, ... }] }
  },

  async pages(chapterId) {
    // return { pages: [{ img: "url" }] }
  }
};
```

Restart the server — the source will be auto-installed.

---

## Data Storage

| Location | What's stored |
|---|---|
| `data/store.json` | Library, history, reading status, reviews, lists, analytics, achievements |
| `localStorage` | Settings, read chapters, reading progress |

---

## Troubleshooting

**Manga not loading** — Check your internet connection and that the MangaDex source is installed.

**Images not showing** — MangaDex may be temporarily unavailable. Check the browser console for errors.

**Progress not saving** — Make sure localStorage is enabled in your browser and cookies aren't blocked.

---

## License

MIT — free to use and modify.
