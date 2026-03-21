// ============================================================================
// SETTINGS MODAL
// ============================================================================

function showSettings() {
  const modal = document.createElement("div");
  modal.className = "settings-modal";
  modal.innerHTML = `
    <div class="settings-content">
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="btn secondary" id="closeSettings">&#x2715;</button>
      </div>
      <div class="settings-body">
        <div class="setting-group">
          <label>Reading Mode</label>
          <select id="modeSelect" class="input">
            <option value="ltr"     ${state.settings.readingMode === "ltr"     ? "selected" : ""}>Left to Right</option>
            <option value="rtl"     ${state.settings.readingMode === "rtl"     ? "selected" : ""}>Right to Left (Manga)</option>
            <option value="webtoon" ${state.settings.readingMode === "webtoon" ? "selected" : ""}>Webtoon (Vertical Scroll)</option>
          </select>
        </div>
        <div class="settings-divider"></div>
        <h3 class="settings-subsection">Advanced Settings</h3>
        <div class="setting-group">
          <label>Line Sharpness</label>
          <select id="sharpnessSelect" class="input">
            <option value="0" ${(state.settings.lineSharpness||0) === 0 ? 'selected' : ''}>Off</option>
            <option value="1" ${(state.settings.lineSharpness||0) === 1 ? 'selected' : ''}>Subtle</option>
            <option value="2" ${(state.settings.lineSharpness||0) === 2 ? 'selected' : ''}>Strong</option>
            <option value="3" ${(state.settings.lineSharpness||0) === 3 ? 'selected' : ''}>Max</option>
          </select>
          <p class="setting-description">Increases contrast to make manga lines crisper</p>
        </div>
        <div class="setting-group">
          <label class="toggle-label">
            <span class="toggle-text">Hide read chapters</span>
            <input type="checkbox" id="skipReadToggle" ${state.settings.skipReadChapters ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
          <p class="setting-description">Hides chapters you've already finished reading</p>
        </div>
        <div class="setting-group">
          <label class="toggle-label">
            <span class="toggle-text">Skip duplicate chapters</span>
            <input type="checkbox" id="skipDuplicatesToggle" ${state.settings.skipDuplicates ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
          <p class="setting-description">Automatically advances past duplicates of the same chapter number</p>
        </div>
        <div class="setting-group">
          <label class="toggle-label">
            <span class="toggle-text">Pan wide images</span>
            <input type="checkbox" id="panWideToggle" ${state.settings.panWideImages ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
          <p class="setting-description">Allows horizontal scrolling on double-page spreads</p>
        </div>
        <div class="settings-divider"></div>
        <div class="setting-group">
          <button class="btn secondary" id="clearReadBtn">Clear Reading History</button>
        </div>
        <div class="settings-divider"></div>
        <h3 class="settings-subsection">Tracking</h3>
        <div id="anilist-loggedout" ${_alToken() ? 'style="display:none"' : ''}>
          <div class="setting-group">
            <label>AniList Client ID</label>
            <input type="text" id="anilistClientIdInput" class="input" value="${escapeHtml(_alClientId())}" placeholder="e.g. 23361" autocomplete="off" spellcheck="false">
            <p class="setting-description">
              Register a free app at <strong>anilist.co/settings/developer</strong> and set the
              redirect URI to <code>${escapeHtml(window.location.origin)}</code>.
            </p>
          </div>
          <div class="setting-group">
            <button class="btn primary" id="btnAniListConnect">Connect AniList</button>
          </div>
        </div>
        <div id="anilist-loggedin" ${_alToken() ? '' : 'style="display:none"'}>
          <div class="setting-group">
            <div class="anilist-user-card" id="anilistUserCard">
              ${(() => {
                const u = _alUser();
                if (!u) return '<span class="muted" style="padding:0">Loading…</span>';
                return `${u.avatar ? `<img src="${escapeHtml(u.avatar)}" alt="" class="anilist-avatar">` : ''}
                        <span class="anilist-username">${escapeHtml(u.name)}</span>`;
              })()}
            </div>
          </div>
          <div class="setting-group">
            <label class="toggle-label">
              <span class="toggle-text">Auto-sync progress</span>
              <input type="checkbox" id="anilistAutoSyncToggle" ${state.settings.anilistAutoSync ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
            <p class="setting-description">Automatically updates your AniList chapter progress when you read</p>
          </div>
          <div class="setting-group">
            <button class="btn secondary" id="btnAniListDisconnect">Disconnect AniList</button>
          </div>
        </div>
        <div class="settings-divider"></div>
        <h3 class="settings-subsection">Commands</h3>
        <div class="setting-group">
          <div style="display:flex;gap:8px;align-items:center">
            <input type="text" id="cheatInput" class="input" placeholder="Enter command…" autocomplete="off" autocorrect="off" spellcheck="false" style="flex:1;font-family:monospace">
            <button class="btn primary" id="cheatRunBtn">Run</button>
          </div>
          <p class="setting-description" style="margin-top:6px">Available: <code>cls</code> — reset all AP &amp; achievements &nbsp;·&nbsp; <code>godmode</code> — add 500 AP</p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  $("closeSettings").onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  $("modeSelect").onchange = (e) => {
    state.settings.readingMode = e.target.value;
    saveSettings();
    if (state.currentChapter) { showReader(); renderPage(); }
  };
  $("sharpnessSelect").onchange = (e) => {
    state.settings.lineSharpness = parseInt(e.target.value, 10);
    saveSettings();
    const pw = $("pageWrap");
    if (pw) {
      pw.classList.remove('sharp-1', 'sharp-2', 'sharp-3');
      if (state.settings.lineSharpness > 0) pw.classList.add(`sharp-${state.settings.lineSharpness}`);
    }
  };
  $("skipReadToggle").onchange = (e) => {
    state.settings.skipReadChapters = e.target.checked;
    saveSettings();
    if (state.currentManga) loadChapters();
  };
  $("skipDuplicatesToggle").onchange = (e) => {
    state.settings.skipDuplicates = e.target.checked;
    saveSettings();
  };
  $("panWideToggle").onchange = (e) => {
    state.settings.panWideImages = e.target.checked;
    saveSettings();
    if (state.currentChapter) renderPage();
  };
  function runCheatCommand(cmd) {
    switch ((cmd || '').trim().toLowerCase()) {
      case 'cls':
        achievementManager.reset();
        localStorage.setItem('scrollscape_ap_bonus', '0');
        localStorage.setItem('scrollscape_ap_spent', '0');
        updateApBadge();
        showToast('Reset complete', 'All AP and achievements cleared.', 'info');
        break;
      case 'godmode':
        addBonusAP(500);
        updateApBadge();
        showToast('Godmode activated', '+500 AP added to your wallet.', 'success');
        break;
      default:
        showToast('Unknown command', `"${cmd}" is not a valid command.`, 'warning');
    }
  }
  $('cheatRunBtn').onclick = () => {
    const inp = $('cheatInput');
    runCheatCommand(inp.value);
    inp.value = '';
  };
  $('cheatInput').onkeydown = (e) => {
    if (e.key === 'Enter') { runCheatCommand($('cheatInput').value); $('cheatInput').value = ''; }
  };

  $("clearReadBtn").onclick = async () => {
    if (confirm("Clear all reading history?")) {
      try { await fetch("/api/history/clear", { method: "DELETE" }); } catch (_) {}
      state.history = [];
      state.readChapters.clear();
      state.flaggedChapters.clear();
      state.lastReadPages = {};
      state.lastReadChapter = {};
      saveSettings();
      if (state.currentManga) loadChapters();
      modal.remove();
      renderLibrary();
      showToast("Reading history cleared", "", "info");
    }
  };

  // ── AniList settings handlers ──────────────────────────────────────────────
  const alClientInput = $('anilistClientIdInput');
  if (alClientInput) {
    alClientInput.oninput = () => _alSetClientId(alClientInput.value.trim());
  }
  const btnConnect = $('btnAniListConnect');
  if (btnConnect) {
    btnConnect.onclick = () => {
      if (alClientInput) _alSetClientId(alClientInput.value.trim());
      anilistOAuthConnect();
    };
  }
  const btnDisconnect = $('btnAniListDisconnect');
  if (btnDisconnect) {
    btnDisconnect.onclick = () => {
      _alDisconnect();
      $('anilist-loggedin').style.display = 'none';
      $('anilist-loggedout').style.display = '';
      showToast('AniList', 'Disconnected.', 'info');
    };
  }
  const alAutoToggle = $('anilistAutoSyncToggle');
  if (alAutoToggle) {
    alAutoToggle.onchange = (e) => {
      state.settings.anilistAutoSync = e.target.checked;
      saveSettings();
    };
  }
}

