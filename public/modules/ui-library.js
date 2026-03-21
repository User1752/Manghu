// ============================================================================
// LIBRARY RENDERING
// ============================================================================

function renderLibrary() {
  const grid = $("library"); // Fixed: was "library-grid", correct ID is "library"
  if (!grid) return;

  const filterVal = $("libraryStatusFilter")?.value || "all";
  const favs = state.favorites.filter(manga => {
    if (filterVal === "all") return true;
    const key = `${manga.id}:${manga.sourceId}`;
    const status = state.readingStatus[key]?.status;
    return status === filterVal;
  });

  const totalCount = favs.length + (filterVal === "all" ? state.localManga.length : 0);
  if ($("libraryCount")) {
    $("libraryCount").textContent = `${totalCount} manga`;
  }

  const favHTML = favs.map(manga => {
    const key    = `${manga.id}:${manga.sourceId}`;
    const status = state.readingStatus[key]?.status;
    const statusBadge = status
      ? `<div class="library-card-status status-badge-${status}">${statusLabel(status).split(' ')[0]}</div>`
      : "";
    const currentRating = state.ratings[manga.id] || 0;
    const lastChapterId = state.lastReadChapter?.[manga.id];
    const btnLabel = lastChapterId ? "Continue Reading" : "Start Reading";
    return `
      <div class="library-card" data-manga-id="${escapeHtml(manga.id)}" data-source-id="${escapeHtml(manga.sourceId || state.currentSourceId)}">
        <div class="library-card-cover">
          ${manga.cover && !manga.cover.endsWith('.pdf') ? `<img src="${escapeHtml(manga.cover)}" alt="${escapeHtml(manga.title)}" loading="lazy" decoding="async">` : (manga.cover ? '<div class="no-cover">&#128196;</div>' : '<div class="no-cover">?</div>')}
          ${statusBadge}
          <div class="library-card-overlay">
            <button class="btn-read">${btnLabel}</button>
          </div>
        </div>
        <div class="library-card-info">
          <h3 class="library-card-title">${escapeHtml(manga.title)}</h3>
          <p class="library-card-author">${escapeHtml(manga.author || "")}</p>
          ${status ? `<div style="margin-top:0.3rem"><span class="status-badge status-badge-${status}">${statusLabel(status)}</span></div>` : ""}
          ${currentRating ? `<span class="card-score-badge">${currentRating}<span class="card-score-badge-max">/10</span></span>` : ""}
        </div>
      </div>`;
  }).join("");

  // Local manga section
  const localHTML = (filterVal === "all" && state.localManga.length > 0)
    ? `<div class="local-section-header">&#128193; Local Manga</div>` +
      state.localManga.map(manga => {
        const localRating = state.ratings[manga.id] || 0;
        const localLastChapter = state.lastReadChapter?.[manga.id];
        const localBtnLabel = localLastChapter ? 'Continue Reading' : 'Read';
        return `
        <div class="library-card local-manga-card" data-manga-id="${escapeHtml(manga.id)}" data-source-id="local">
          <div class="library-card-cover">
            <img src="/api/local/${escapeHtml(manga.id)}/thumb" alt="${escapeHtml(manga.title)}" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="no-cover" style="display:none">&#128196;</div>
            <div class="local-badge">${escapeHtml((manga.type || 'local').toUpperCase())}</div>
            <button class="local-delete-btn" data-manga-id="${escapeHtml(manga.id)}" title="Delete local manga">&#128465;</button>
            <div class="library-card-overlay"><button class="btn-read">${localBtnLabel}</button></div>
          </div>
          <div class="library-card-info">
            <h3 class="library-card-title">${escapeHtml(manga.title)}</h3>
            <p class="library-card-author">${escapeHtml((manga.type || 'local').toUpperCase())}</p>
            ${localRating ? `<span class="card-score-badge">${localRating}<span class="card-score-badge-max">/10</span></span>` : ""}
          </div>
        </div>`;
      }).join("")
    : "";

  if (favs.length === 0 && !localHTML) {
    grid.innerHTML = `<div class="muted">No manga found. Add favorites or import local files!</div>`;
    return;
  }

  grid.innerHTML = favHTML + localHTML;

  grid.querySelectorAll(".library-card:not(.local-manga-card)").forEach(card => {
    const mangaId  = card.dataset.mangaId;
    const sourceId = card.dataset.sourceId;
    card.onclick = async (e) => {
      const prevSource = state.currentSourceId;
      if (sourceId && sourceId !== state.currentSourceId) {
        state.currentSourceId = sourceId;
        renderSourceSelect();
        const srcName = state.installedSources[sourceId]?.name || sourceId;
        showToast("Source switched", srcName, "info");
      }

      // "Continue Reading" overlay button — jump directly to last chapter + page
      if (e.target.closest(".btn-read") && state.lastReadChapter?.[mangaId]) {
        const lastChapterId = state.lastReadChapter[mangaId];
        const lastPageIndex = state.lastReadPages?.[`${mangaId}:${lastChapterId}`] || 0;
        try {
          showToast("Resuming...", "", "info");
          // Load manga details silently so state.currentManga is populated
          const result = await api(`/api/source/${state.currentSourceId}/mangaDetails`, {
            method: "POST",
            body: JSON.stringify({ mangaId })
          });
          state.currentManga = result;
          // Load chapters so state.allChapters is populated
          const cr = await api(`/api/source/${state.currentSourceId}/chapters`, {
            method: "POST",
            body: JSON.stringify({ mangaId })
          });
          state.allChapters = cr.chapters || [];
          const idx = state.allChapters.findIndex(c => c.id === lastChapterId);
          if (idx >= 0) {
            const ch = state.allChapters[idx];
            await loadChapter(lastChapterId, ch.name || `Chapter ${ch.chapter || idx + 1}`, idx, lastPageIndex);
          } else {
            // Chapter no longer exists — fall back to detail page
            await loadMangaDetails(mangaId, "library");
          }
        } catch (err) {
          showToast("Error", err.message, "error");
        }
        return;
      }

      await loadMangaDetails(mangaId, "library");
      if (!state.currentSourceId) state.currentSourceId = prevSource;
    };
  });

  grid.querySelectorAll(".local-manga-card").forEach(card => {
    const mangaId = card.dataset.mangaId;
    card.onclick = async (e) => {
      if (e.target.closest(".local-delete-btn")) return;
      state.currentSourceId = "local";

      // "Continue Reading" — jump directly to last chapter + page
      if (e.target.closest(".btn-read") && state.lastReadChapter?.[mangaId]) {
        const lastChapterId = state.lastReadChapter[mangaId];
        const lastPageIndex = state.lastReadPages?.[`${mangaId}:${lastChapterId}`] || 0;
        try {
          showToast("Resuming...", "", "info");
          const result = await api(`/api/source/local/mangaDetails`, {
            method: "POST",
            body: JSON.stringify({ mangaId })
          });
          state.currentManga = result;
          const cr = await api(`/api/source/local/chapters`, {
            method: "POST",
            body: JSON.stringify({ mangaId })
          });
          state.allChapters = cr.chapters || [];
          const idx = state.allChapters.findIndex(c => c.id === lastChapterId);
          if (idx >= 0) {
            const ch = state.allChapters[idx];
            await loadChapter(lastChapterId, ch.name || `Chapter ${ch.chapter || idx + 1}`, idx, lastPageIndex);
          } else {
            await loadMangaDetails(mangaId, "library");
          }
        } catch (err) {
          showToast("Error", err.message, "error");
        }
        return;
      }

      await loadMangaDetails(mangaId, "library");
    };
  });

  grid.querySelectorAll(".local-delete-btn").forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const mangaId = btn.dataset.mangaId;
      if (!confirm("Delete this local manga?")) return;
      await deleteLocalManga(mangaId);
    };
  });
}

async function loadLocalManga() {
  try {
    const data = await api("/api/local/list");
    state.localManga = data.localManga || [];
  } catch (_) { state.localManga = []; }
}

async function deleteLocalManga(mangaId) {
  try {
    await api(`/api/local/${mangaId}`, { method: "DELETE" });
    state.localManga = state.localManga.filter(m => m.id !== mangaId);
    renderLibrary();
    showToast("Deleted", "Local manga removed", "info");
  } catch (e) {
    showToast("Error", e.message, "error");
  }
}

