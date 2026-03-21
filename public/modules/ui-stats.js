// ============================================================================
// STATISTICS
// ============================================================================

async function updateStats() {
  try {
    const anaData = await api("/api/analytics");
    state.analytics = anaData;

    const totalLibrary = state.favorites.length;
    const completedCount = anaData.statusDistribution?.completed || 0;
    const chaptersRead = anaData.analytics?.totalChaptersRead || state.readChapters.size;
    const streak = anaData.analytics?.dailyStreak || 0;

    const el = (id, val) => { const e = $(id); if (e) e.textContent = val; };
    el("statTotalLibrary", totalLibrary);
    el("statCompleted", completedCount);
    el("statChaptersRead", chaptersRead);
    el("statReadingStreak", streak);
    if ($("libraryCount")) $("libraryCount").textContent = `${totalLibrary} manga`;
  } catch (e) {
    // Non-fatal
  }
}

