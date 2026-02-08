# 🎌 Manghu - Manga Web Reader

A self-contained web-based manga reader with MangaDex support and extensible source system.

## ✨ Features

- 🔍 **Advanced Search**: Search manga with filters (genre, status, tags)
- 📚 **Library Management**: Organize favorites and track reading progress
- 📖 **Multiple Reading Modes**: LTR, RTL, and Webtoon scroll modes
- 💾 **Progress Tracking**: Automatic bookmark saving and chapter marking
- 🎨 **Modern UI**: Clean, responsive interface with dark theme
- 🔌 **Extensible**: Support for custom manga sources
- 🐳 **Docker Ready**: Easy deployment with Docker

## 🚀 Quick Start

### Local Installation

```bash
npm install
npm start
```

Open: http://localhost:3000

### Docker Deployment

```bash
cd docker
docker compose up --build
```

Open: http://localhost:3000

## 📖 User Guide

### Basic Usage

1. **Search Manga**: Enter manga title in search bar and click "Search"
2. **View Details**: Click on any manga card to see details and chapters
3. **Read Chapters**: Click on a chapter to start reading
4. **Add to Library**: Click "Add to Favorites" to save manga to your library
5. **Continue Reading**: Use "Continue Reading" button to resume from last page

### Reading Modes

- **LTR (Left-to-Right)**: Standard Western reading direction
- **RTL (Right-to-Left)**: Traditional manga reading direction
- **Webtoon**: Vertical scrolling for webtoons

Change mode in Settings (⚙️).

### Advanced Search

Navigate to "Advanced Search" to use:
- **Order By**: Sort by relevance, rating, follows, date, etc.
- **Publication Status**: Filter by ongoing, completed, hiatus, cancelled
- **Tags**: Filter by format, genre, theme, and content tags

### Keyboard Shortcuts (Reader)

- **Right Arrow / Click Right**: Next page
- **Left Arrow / Click Left**: Previous page
- **ESC**: Close reader

## 📚 Included Sources

### MangaDex (Pre-installed)
- Thousands of manga in multiple languages
- High-quality scans
- Regular updates
- Community translations

## 🏗️ Project Structure

```
Manghu/
├── data/
│   ├── sources/           # JavaScript source files
│   │   └── mangadex.js   # MangaDex source implementation
│   ├── store.json        # Persistent data (favorites, history)
│   └── cache/            # Cached data
├── public/
│   ├── index.html        # Main HTML file
│   ├── styles.css        # Application styles
│   └── app.js            # Frontend application logic
├── docker/
│   ├── Dockerfile        # Docker image configuration
│   └── docker-compose.yml
├── server.js             # Express backend server
├── package.json          # Node.js dependencies
└── README.md             # Documentation
```

## 🛠️ Development

### Creating Custom Sources

Create a new source file in `data/sources/yoursource.js`:

```javascript
module.exports = {
  meta: {
    id: "yoursource",
    name: "Your Source Name",
    version: "1.0.0",
    author: "Your Name",
    icon: "https://example.com/icon.png"
  },

  async search(query, page) {
    // Return: { results: [{ id, title, cover, author, ... }] }
  },

  async mangaDetails(mangaId) {
    // Return: { id, title, cover, author, description, genres, status, ... }
  },

  async chapters(mangaId) {
    // Return: { chapters: [{ id, name, date, ... }] }
  },

  async pages(chapterId) {
    // Return: { pages: [{ img: "url" }] }
  }
};
```

Restart the server to auto-install the new source.

### API Endpoints

#### Get Application State
```
GET /api/state
Returns: { repos, availableSources, installedSources }
```

#### Search Manga
```
POST /api/source/:sourceId/search
Body: { query, page, orderBy?, statuses?, tags? }
Returns: { results: [...] }
```

#### Get Manga Details
```
POST /api/source/:sourceId/mangaDetails
Body: { mangaId }
Returns: { id, title, cover, description, ... }
```

#### Get Chapters
```
POST /api/source/:sourceId/chapters
Body: { mangaId }
Returns: { chapters: [...] }
```

#### Get Pages
```
POST /api/source/:sourceId/pages
Body: { chapterId }
Returns: { pages: [{ img }] }
```

#### Library Operations
```
POST /api/favorites/toggle
Body: { mangaId, sourceId, manga }

GET /api/library
Returns: { favorites, history }
```

## 🔧 Configuration

### Settings (Accessible via ⚙️ button)

- **Reading Mode**: LTR / RTL / Webtoon
- **Hide Read Chapters**: Skip chapters already marked as read
- **Skip Duplicate Chapters**: Automatically skip duplicate chapter numbers
- **Pan Wide Images**: Enable horizontal scrolling for double-page spreads
- **Clear Reading History**: Reset all reading progress

### Data Storage

All data is stored locally in:
- `data/store.json`: Favorites and history
- `localStorage`: User settings and reading progress

## 🐛 Troubleshooting

### Manga not loading
- Check internet connection
- Verify source is installed
- Try refreshing the page

### Images not displaying
- MangaDex might be down temporarily
- Check browser console for errors
- Try a different chapter

### Progress not saving
- Check browser localStorage is enabled
- Ensure cookies are not blocked
- Try clearing browser cache

## 📝 License

MIT License - Feel free to use and modify

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 🙏 Credits

- MangaDex API for manga data
- Open-source manga reading community

## 📧 Support

For issues and feature requests, please open an issue on GitHub.

---

Made with ❤️ for manga readers worldwide
