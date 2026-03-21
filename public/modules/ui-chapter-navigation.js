// ============================================================================
// CHAPTER NAVIGATION
// ============================================================================

function getNextChapterIndex(currentIndex) {
  // Chapters are sorted newest-first, so "next" chapter = lower index
  if (!state.settings.skipDuplicates || !state.allChapters.length) return currentIndex - 1;
  const cur = state.allChapters[currentIndex];
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (state.allChapters[i].chapter !== cur?.chapter) return i;
  }
  return currentIndex - 1;
}

function getPrevChapterIndex(currentIndex) {
  // Chapters are sorted newest-first, so "prev" chapter = higher index
  if (!state.settings.skipDuplicates || !state.allChapters.length) return currentIndex + 1;
  const cur = state.allChapters[currentIndex];
  for (let i = currentIndex + 1; i < state.allChapters.length; i++) {
    if (state.allChapters[i].chapter !== cur?.chapter) return i;
  }
  return currentIndex + 1;
}

async function goToNextChapter() {
  const next = getNextChapterIndex(state.currentChapterIndex);
  if (next < 0 || next >= (state.allChapters?.length || 0)) {
    showToast("Last chapter reached", "", "info"); return;
  }
  const ch = state.allChapters[next];
  if (!ch) { showToast("Last chapter reached", "", "info"); return; }
  await recordReadingSession();
  await loadChapter(ch.id, ch.name || `Chapter ${ch.chapter || next + 1}`, next);
}

async function goToPrevChapter() {
  const prev = getPrevChapterIndex(state.currentChapterIndex);
  if (prev >= state.allChapters.length) { showToast("First chapter reached", "", "info"); return; }
  await recordReadingSession();
  const ch = state.allChapters[prev];
  await loadChapter(ch.id, ch.name || `Chapter ${ch.chapter || prev + 1}`, prev);
}

