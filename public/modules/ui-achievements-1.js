// ============================================================================
// ACHIEVEMENTS PAGE VIEW
// ============================================================================

async function renderAchievementsView() {
  const content = document.getElementById('achPageContent');
  if (!content) return;
  updateApBadge();

  // If definitions haven't loaded yet (e.g., first navigation hit before async
  // startup finished, or the initial fetch failed), try once more.
  if (achievementManager.categories.length === 0) {
    try {
      content.innerHTML = '<div class="muted">Loading achievements…</div>';
      await achievementManager.loadAchievements();
    } catch (_) { /* fall through — will show "no achievements" */ }
  }

  // Secret Dragon Ball easter egg: collect all 7 dragon balls → Shenlong grants 50 AP
  const db = document.getElementById('achDragonBall');
  if (db) {
    if (!db.dataset.eggBound) {
      db.dataset.eggBound = '1';
      db.dataset.ball = '1';
      let eggTimer = null;
      db.addEventListener('click', () => {
        let ball = parseInt(db.dataset.ball || '1');
        db.style.transform = `scale(1.25) rotate(${ball * 52}deg)`;
        setTimeout(() => { db.style.transform = ''; }, 250);
        clearTimeout(eggTimer);
        if (ball === 7) {
          // All 7 balls collected — summon Shenlong!
          db.dataset.ball = '1';
          setTimeout(() => { db.innerHTML = dragonBallSVG(1); }, 3000);
          summonShenlong();
        } else {
          ball++;
          db.dataset.ball = ball;
          db.innerHTML = dragonBallSVG(ball);
          // Reset if idle for 3 seconds without reaching 7
          eggTimer = setTimeout(() => {
            db.dataset.ball = '1';
            db.innerHTML = dragonBallSVG(1);
          }, 3000);
        }
      });
    }
    // Render current ball if empty
    if (!db.innerHTML.trim()) db.innerHTML = dragonBallSVG(1);
  }
  const total    = achievementManager.achievements.length;
  const unlocked = achievementManager.unlockedAchievements.size;
  const countEl  = document.getElementById('achievementCount');
  if (countEl) countEl.textContent = `${unlocked}/${total}`;
  const html = achievementManager.categories.map(cat => {
    const achs = achievementManager.getAchievementsByCategory(cat.id);
    const catUnlocked = achs.filter(a => achievementManager.isUnlocked(a.id)).length;
    return `
      <div class="ach-page-category">
        <div class="ach-category-header">
          <h3>${escapeHtml(cat.name)}</h3>
          <span class="ach-category-count">${catUnlocked}/${achs.length}</span>
        </div>
        <div class="ach-category-grid">
          ${achs.map(a => {
            const isUnlocked = achievementManager.isUnlocked(a.id);
            return `
              <div class="ach-card ${isUnlocked ? 'ach-unlocked' : 'ach-locked'} ach-rarity-${escapeHtml(a.rarity || 'common')}" title="${escapeHtml(a.description)}">
                <div class="ach-card-icon"><i data-feather="${escapeHtml(a.icon)}"></i></div>
                <div class="ach-card-name">${escapeHtml(a.name)}</div>
                ${isUnlocked
                  ? `<div class="ach-card-ap">+1 AP</div>`
                  : `<div class="ach-card-locked-desc">${escapeHtml(a.description)}</div>`}
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');
  content.innerHTML = html || '<div class="muted">No achievements yet.</div>';
  if (typeof feather !== 'undefined') feather.replace();
}

