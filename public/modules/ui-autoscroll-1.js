// ============================================================================
// AUTOSCROLL
// ============================================================================

let _autoScrollRAF = null;
const AUTOSCROLL_SPEEDS = [0.2, 0.5, 1.0, 2.0, 3.5]; // px per animation frame

function startAutoScroll() {
  stopAutoScroll();
  const pageWrap = $("pageWrap");
  if (!pageWrap) return;

  function tick() {
    const speedPx = AUTOSCROLL_SPEEDS[state.autoScroll.speed - 1] || 1.5;
    pageWrap.scrollTop += speedPx;
    _autoScrollRAF = requestAnimationFrame(tick);
  }
  _autoScrollRAF = requestAnimationFrame(tick);
}

function stopAutoScroll() {
  if (_autoScrollRAF !== null) {
    cancelAnimationFrame(_autoScrollRAF);
    _autoScrollRAF = null;
  }
}

function toggleAutoScroll() {
  state.autoScroll.enabled = !state.autoScroll.enabled;
  const btn   = $("autoScrollToggle");
  const bar   = $("autoScrollBar");
  if (btn) {
    btn.classList.toggle("active", state.autoScroll.enabled);
    btn.title = state.autoScroll.enabled ? "Stop AutoScroll" : "Start AutoScroll";
  }
  if (bar) bar.classList.toggle("hidden", !state.autoScroll.enabled);
  if (state.autoScroll.enabled) startAutoScroll();
  else stopAutoScroll();
}

function renderPage() {
  if (!state.currentChapter?.pages) return;

  // PDF mode: delegate to async PDF.js renderer (respects reading mode)
  if (state.currentChapter.isPDF && state.pdfDocument) {
    const _mode = state.settings.readingMode;
    if (_mode === 'webtoon')    renderPDFWebtoon();
    else if (_mode === 'rtl')   renderPDFSpread(true);
    else if (_mode === 'ltr')   renderPDFSpread(false);
    else                        renderPDFPageToCanvas(state.currentPageIndex + 1);
    return;
  }

  const pages   = state.currentChapter.pages;
  const pageWrap = $("pageWrap");
  const idx     = state.currentPageIndex;
  const mode    = state.settings.readingMode;

  // Reset zoom on new chapter
  const zoomStyle = state.zoomLevel !== 1.0 ? `style="transform:scale(${state.zoomLevel});transform-origin:top center;"` : "";

  if (mode === "webtoon") {
    pageWrap.className = "reader-content reading-mode-webtoon";
    const validPages = pages.filter(p => p.img);
    const nextWIdx = getNextChapterIndex(state.currentChapterIndex);
    const nextWCh  = (nextWIdx >= 0 && nextWIdx < (state.allChapters?.length || 0)) ? state.allChapters[nextWIdx] : null;
    const nextWLabel = nextWCh ? (nextWCh.name || `Chapter ${nextWCh.chapter || nextWIdx + 1}`) : null;
    pageWrap.innerHTML = `
      <div class="page-zoom-wrap webtoon-wrap" ${zoomStyle}>
        ${validPages.map((p, i) => `<img src="${escapeHtml(p.img)}" alt="Page ${i + 1}" class="webtoon-page" loading="eager">`).join("")}
      </div>
      <div class="chapter-end-wrap">
        ${nextWLabel
          ? `<p class="chapter-end-label">Next Chapter</p>
             <p class="chapter-end-name">${escapeHtml(nextWLabel)}</p>
             <button class="btn chapter-next-btn" onclick="goToNextChapter()">Read Next →</button>`
          : `<p class="chapter-end-label">You've reached the last chapter!</p>`}
      </div>`;
    $("pageCounter").textContent = `Webtoon Mode — ${validPages.length} pages`;
    $("prevPage").style.display = "none";
    $("nextPage").style.display = "none";
    updateReadingProgress(state.currentManga?.id, state.currentChapter?.id, 0);
  } else if (mode === "rtl") {
    renderBookSpread();
    return;
  } else if (mode === "ltr") {
    renderLTRSpread();
    return;
  } else {
    pageWrap.className = "reader-content";
    if (idx < 0 || idx >= pages.length) return;
    const page     = pages[idx];
    const isLast   = idx === pages.length - 1;
    const imgClass = state.settings.panWideImages ? "page-img pannable" : "page-img";
    const nextIdx  = isLast ? getNextChapterIndex(state.currentChapterIndex) : -1;
    const nextCh   = (isLast && nextIdx >= 0 && nextIdx < (state.allChapters?.length || 0)) ? state.allChapters[nextIdx] : null;
    const nextLabel = nextCh ? (nextCh.name || `Chapter ${nextCh.chapter || nextIdx + 1}`) : null;
    const endBanner = isLast ? `
      <div class="chapter-end-wrap">
        <div class="chapter-end-divider"></div>
        ${nextLabel
          ? `<p class="chapter-end-label">Next Chapter</p>
             <p class="chapter-end-name">${escapeHtml(nextLabel)}</p>
             <button class="btn chapter-next-btn" onclick="goToNextChapter()">Read Next →</button>`
          : `<p class="chapter-end-label">Last chapter reached!</p>`}
      </div>` : "";
    pageWrap.innerHTML = page.img
      ? `<div class="page-zoom-wrap" ${zoomStyle}><img src="${escapeHtml(page.img)}" alt="Page ${idx + 1}" class="${imgClass}"></div>${endBanner}`
      : `<div class="muted">Page not available</div>`;
    // Scroll to top on new page (not when same chapter end-banner update)
    if (!isLast) pageWrap.scrollTop = 0;
    else pageWrap.scrollTo({ top: 0, behavior: "smooth" });

    $("pageCounter").textContent = `${idx + 1} / ${pages.length}`;
    $("prevPage").disabled = false;
    $("nextPage").disabled = false;
    $("prevPage").style.display = "block";
    $("nextPage").style.display = "block";
    updateReadingProgress(state.currentManga?.id, state.currentChapter?.id, idx);
  }
}

