// ============================================================================
// READER & PAGE RENDERING
// ============================================================================

// ── Auto-hide header state ──────────────────────────────────────────────────
let _headerHideTimer = null;

function _readerMouseMove(e) {
  const readerEl = $("reader");
  if (!readerEl) return;
  const SHOW_ZONE = 72; // px from top of viewport
  if (e.clientY <= SHOW_ZONE) {
    // Mouse is in the header zone — show and cancel any pending hide
    readerEl.classList.remove("header-hidden");
    clearTimeout(_headerHideTimer);
    _headerHideTimer = null;
  } else {
    // Mouse left the zone — schedule hide if not already pending
    if (!_headerHideTimer && !readerEl.classList.contains("header-hidden")) {
      _headerHideTimer = setTimeout(() => {
        readerEl.classList.add("header-hidden");
        _headerHideTimer = null;
      }, 2000);
    }
  }
}

function showReader() {
  const readerEl = $("reader");
  readerEl.classList.remove("hidden", "header-hidden");
  const chapterName = state.currentChapter?.name || "Chapter";
  $("readerTitle").textContent = `${state.currentManga?.title || ""} — ${chapterName}`;
  updateZoomUI();
  // Auto-hide header after 3 s of inactivity and on mouse position
  clearTimeout(_headerHideTimer);
  _headerHideTimer = setTimeout(() => { readerEl.classList.add("header-hidden"); _headerHideTimer = null; }, 3000);
  readerEl.addEventListener("mousemove", _readerMouseMove);
}

async function hideReader() {
  stopAutoScroll();
  await recordReadingSession();
  const readerEl = $("reader");
  readerEl.classList.add("hidden");
  readerEl.classList.remove("header-hidden");
  readerEl.removeEventListener("mousemove", _readerMouseMove);
  clearTimeout(_headerHideTimer);
  _headerHideTimer = null;
}

