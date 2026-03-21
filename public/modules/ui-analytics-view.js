// ============================================================================
// ANALYTICS VIEW
// ============================================================================

async function renderAnalyticsView() {
  try {
    const data = await api("/api/analytics");
    state.analytics = data;
    const a    = data.analytics || {};
    const dist = data.statusDistribution || {};

    // Stat cards
    const el = (id, val) => { const e = $(id); if (e) e.textContent = val; };
    el("anaChapters",  a.totalChaptersRead || 0);
    el("anaTime",      formatTime(a.totalTimeSpent || 0));
    el("anaMeanScore", data.meanScore != null ? data.meanScore.toFixed(2) : "—");
    el("anaLibrary",   data.totalFavorites || 0);

    // Status distribution
    const distEl = $("statusDistribution");
    if (distEl) {
      const total = Object.values(dist).reduce((n, v) => n + v, 0) || 1;
      const rows = [
        { key: "reading",       label: "Reading" },
        { key: "completed",     label: "Completed" },
        { key: "on_hold",       label: "On Hold" },
        { key: "plan_to_read",  label: "Plan to Read" },
        { key: "dropped",       label: "Dropped" },
      ];
      distEl.innerHTML = rows.map(r => `
        <div class="dist-row">
          <span class="dist-label">${r.label}</span>
          <div class="dist-bar-wrap">
            <div class="dist-bar dist-bar-${r.key}" style="width:${((dist[r.key] || 0) / total * 100).toFixed(1)}%"></div>
          </div>
          <span class="dist-count">${dist[r.key] || 0}</span>
        </div>`).join("");
    }

    // Recent sessions
    const sessionsEl = $("recentSessions");
    if (sessionsEl) {
      const sessions = (a.readingSessions || []).slice(0, 10);
      if (!sessions.length) {
        sessionsEl.innerHTML = `<div class="muted">No reading sessions yet. Start reading!</div>`;
      } else {
        sessionsEl.innerHTML = sessions.map(s => `
          <div class="session-item">
            <span class="session-manga">${escapeHtml(s.mangaId || "Unknown")}</span>
            <span class="session-duration">${formatTime(s.duration || 0)}</span>
            <span class="session-date">${new Date(s.date).toLocaleDateString()}</span>
          </div>`).join("");
      }
    }
  } catch (e) {
    dbg.error(dbg.ERR_ANALYTICS, 'Analytics error', e);
  }
}

