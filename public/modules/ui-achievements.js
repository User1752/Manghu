// ============================================================================
// ACHIEVEMENTS SYSTEM
// ============================================================================

async function checkAndUnlockAchievements() {
  try {
    // Fetch current analytics data
    const anaData = await api("/api/analytics");
    const a = anaData.analytics || {};
    
    // Build analytics object for achievement checking
    const analytics = {
      totalChaptersRead: a.totalChaptersRead || state.readChapters.size,
      totalTimeSpent:    a.totalTimeSpent || 0,
      totalFavorites:    (anaData.totalFavorites || 0),
      completedCount:    (anaData.statusDistribution?.completed || 0),
      totalLists:        (anaData.totalLists || 0),
      statusDistribution: anaData.statusDistribution || {},
      dailyStreak:       a.dailyStreak || 0,
      libraryTitles:     (state.favorites || []).map(m => (m.title || '').toLowerCase())
    };

    // Check achievements using AchievementManager
    const newlyUnlocked = achievementManager.checkAchievements(analytics);
    
    // Send newly unlocked achievements to backend
    for (const achievementId of newlyUnlocked) {
      try {
        await api("/api/achievements/unlock", {
          method: "POST",
          body: JSON.stringify({ achievementId })
        });
        
        // Show toast notification
        const achievement = achievementManager.getAchievement(achievementId);
        if (achievement) {
          showToast(
            `Achievement Unlocked! `, 
            `${achievement.name}: ${achievement.description}`, 
            "success"
          );
        }
      } catch (err) {
        dbg.error(dbg.ERR_ACHIEVE, `Failed to sync achievement ${achievementId}`, err);
      }
    }
    
    // Update state
    state.earnedAchievements = achievementManager.unlockedAchievements;
    updateApBadge();
  } catch (e) {
    dbg.error(dbg.ERR_ACHIEVE, 'Error checking achievements', e);
  }
}

async function renderAchievementsGrid() {
  const grid = $("achievementsGrid");
  if (!grid) return;
  
  try {
    // Get achievement stats
    const stats = achievementManager.getStats();
    const countEl = $("achievementCount");
    if (countEl) countEl.textContent = `${stats.unlocked}/${stats.total}`;

    // Render achievements by category
    const html = achievementManager.categories.map(category => {
      const achievements = achievementManager.getAchievementsByCategory(category.id);
      
      return `
        <div class="achievement-category">
          <h3 class="achievement-category-title">${escapeHtml(category.name)}</h3>
          <p class="achievement-category-desc">${escapeHtml(category.description)}</p>
          <div class="achievement-category-grid">
            ${achievements.map(a => {
              const isUnlocked = achievementManager.isUnlocked(a.id);
              const rarityClass = a.rarity || 'common';
              
              return `
                <div class="achievement-item ${isUnlocked ? 'earned' : 'locked'} rarity-${rarityClass}">
                  <div class="achievement-icon">
                    <i data-feather="${escapeHtml(a.icon)}" ${isUnlocked ? '' : 'class="locked-icon"'}></i>
                  </div>
                  <div class="achievement-info">
                    <h4>${escapeHtml(a.name)}</h4>
                    <p>${escapeHtml(a.description)}</p>
                    ${a.points ? `<span class="achievement-points">+${a.points} pts</span>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    grid.innerHTML = html || '<div class="muted">No achievements available.</div>';
    
    // Initialize Feather icons if available
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
    
  } catch (e) {
    dbg.error(dbg.ERR_ACHIEVE, 'Error rendering achievements', e);
    grid.innerHTML = `<div class="muted">Could not load achievements.</div>`;
  }
}

