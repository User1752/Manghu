// ============================================================================
// DOWNLOAD FUNCTIONS
// ============================================================================

async function downloadChapter(chapterId, chapterName) {
  try {
    showToast("Download Started", `Downloading ${chapterName}...`, "info");

    // Get chapter pages
    const result = await api(`/api/source/${state.currentSourceId}/pages`, {
      method: "POST",
      body: JSON.stringify({ chapterId })
    });

    if (!result.pages || result.pages.length === 0) {
      showToast("Error", "No pages found for this chapter", "error");
      return;
    }

    // Request CBZ from server (binary response)
    const resp = await fetch("/api/download/chapter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mangaTitle: state.currentManga?.title || "Unknown",
        chapterName,
        chapterId,
        sourceId: state.currentSourceId,
        pages: result.pages
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      showToast("Error", err.error || "Download failed", "error");
      return;
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const filename = (resp.headers.get("Content-Disposition") || "").match(/filename="(.+?)"/)?.at(1)
      || `${chapterName}.cbz`;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("Download Complete", `${chapterName} downloaded as CBZ!`, "success");
  } catch (e) {
    showToast("Error", `Download failed: ${e.message}`, "error");
  }
}

function showBulkDownloadModal(chapters) {
  // Create modal HTML
  const modalHtml = `
    <div class="modal-overlay" id="bulkDownloadModal">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>Save Chapters Offline</h2>
          <button class="modal-close" onclick="closeBulkDownloadModal()">&#x2715;</button>
        </div>
        <div class="modal-body">
          <p class="modal-description">Select chapters to save for offline reading:</p>
          <div class="bulk-download-controls">
            <button class="btn btn-sm" onclick="selectAllChapters()">Select All</button>
            <button class="btn btn-sm" onclick="deselectAllChapters()">Deselect All</button>
            <span class="selected-count">0 selected</span>
          </div>
          <div class="bulk-chapters-list" id="bulkChaptersList">
            ${chapters.map((ch, i) => `
              <label class="bulk-chapter-item">
                <input type="checkbox" class="bulk-chapter-checkbox" data-chapter-id="${escapeHtml(ch.id)}" data-chapter-name="${escapeHtml(ch.name || `Chapter ${ch.chapter || i + 1}`)}">
                <span>${escapeHtml(ch.name || `Chapter ${ch.chapter || i + 1}`)}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeBulkDownloadModal()">Cancel</button>
          <button class="btn btn-save-bulk-offline" id="confirmBulkSaveOffline">Save Selected</button>
        </div>
      </div>
    </div>
  `;

  // Add modal to page
  const existing = $("bulkDownloadModal");
  if (existing) existing.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Update count on checkbox change
  const updateCount = () => {
    const checked = document.querySelectorAll('.bulk-chapter-checkbox:checked').length;
    document.querySelector('.selected-count').textContent = `${checked} selected`;
  };

  document.querySelectorAll('.bulk-chapter-checkbox').forEach(cb => {
    cb.addEventListener('change', updateCount);
  });

  // Confirm save offline button
  $("confirmBulkSaveOffline").onclick = async () => {
    const selected = Array.from(document.querySelectorAll('.bulk-chapter-checkbox:checked'))
      .map(cb => ({ id: cb.dataset.chapterId, name: cb.dataset.chapterName }));

    if (selected.length === 0) {
      showToast("No Selection", "Please select at least one chapter", "warning");
      return;
    }

    closeBulkDownloadModal();
    await saveBulkOffline(selected);
  };
}

window.closeBulkDownloadModal = function() {
  const modal = $("bulkDownloadModal");
  if (modal) modal.remove();
};

window.selectAllChapters = function() {
  document.querySelectorAll('.bulk-chapter-checkbox').forEach(cb => cb.checked = true);
  const count = document.querySelectorAll('.bulk-chapter-checkbox').length;
  document.querySelector('.selected-count').textContent = `${count} selected`;
};

window.deselectAllChapters = function() {
  document.querySelectorAll('.bulk-chapter-checkbox').forEach(cb => cb.checked = false);
  document.querySelector('.selected-count').textContent = `0 selected`;
};

async function downloadBulkChapters(selectedChapters) {
  // Step 1 — start the job on the server
  let jobId;
  try {
    const startResp = await fetch("/api/download/bulk/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mangaTitle: state.currentManga?.title || "Unknown",
        sourceId: state.currentSourceId,
        chapters: selectedChapters
      })
    });
    if (!startResp.ok) {
      const err = await startResp.json().catch(() => ({}));
      showToast("Error", err.error || "Could not start download", "error");
      return;
    }
    ({ jobId } = await startResp.json());
  } catch (e) {
    showToast("Error", `Bulk download failed: ${e.message}`, "error");
    return;
  }

  // Step 2 — show progress modal and listen to SSE
  showBulkProgressModal(selectedChapters.length);

  await new Promise((resolve) => {
    const es = new EventSource(`/api/download/bulk/progress/${jobId}`);

    es.addEventListener('progress', (e) => {
      const { done, total, chapter } = JSON.parse(e.data);
      updateBulkProgress(done, total, chapter);
    });

    es.addEventListener('done', async () => {
      es.close();
      updateBulkProgress(selectedChapters.length, selectedChapters.length, '');

      // Step 3 — trigger file download
      const link = document.createElement('a');
      link.href = `/api/download/bulk/file/${jobId}`;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => closeBulkProgressModal(), 800);
      showToast("Download Complete", `${selectedChapters.length} chapters saved as CBZ!`, "success");
      resolve();
    });

    es.addEventListener('error', (e) => {
      es.close();
      const msg = e.data ? JSON.parse(e.data).error : 'Unknown error';
      closeBulkProgressModal();
      showToast("Error", msg || "Bulk download failed", "error");
      resolve();
    });
  });
}

function showBulkProgressModal(total) {
  const existing = $("bulkProgressModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="bulkProgressModal">
      <div class="modal-content bulk-progress-modal">
        <div class="modal-header">
          <h2>Downloading...</h2>
        </div>
        <div class="modal-body">
          <div class="bulk-progress-chapter" id="bulkProgressChapter">Starting...</div>
          <div class="bulk-progress-bar-wrap">
            <div class="bulk-progress-bar" id="bulkProgressBar" style="width:0%"></div>
          </div>
          <div class="bulk-progress-count" id="bulkProgressCount">0 / ${total}</div>
        </div>
      </div>
    </div>
  `);
}

function updateBulkProgress(done, total, chapter) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const bar = $("bulkProgressBar");
  const count = $("bulkProgressCount");
  const chEl = $("bulkProgressChapter");
  if (bar) bar.style.width = pct + '%';
  if (count) count.textContent = `${done} / ${total}`;
  if (chEl && chapter) chEl.textContent = chapter;
}

window.closeBulkProgressModal = function() {
  const m = $("bulkProgressModal");
  if (m) m.remove();
};

