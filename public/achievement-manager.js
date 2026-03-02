/**
 * Achievement Manager
 * Manages achievement loading, tracking, and unlocking
 */

// Bundled fallback so the achievements page works even if the API is unreachable.
const _ACHIEVEMENT_FALLBACK = {"version":"1.0.0","categories":[{"id":"reading","name":"Reading Progress","description":"Achievements related to reading chapters","icon":"book-open","achievements":[{"id":"first_read","name":"First Steps","description":"Read your first chapter","icon":"book","rarity":"common","points":10,"condition":{"type":"stat_check","stat":"totalChaptersRead","operator":">=","value":1}},{"id":"reader_10","name":"Bookworm","description":"Read 10 chapters","icon":"book-open","rarity":"common","points":25,"condition":{"type":"stat_check","stat":"totalChaptersRead","operator":">=","value":10}},{"id":"reader_100","name":"Manga Addict","description":"Read 100 chapters","icon":"award","rarity":"rare","points":100,"condition":{"type":"stat_check","stat":"totalChaptersRead","operator":">=","value":100}},{"id":"reader_500","name":"Legend","description":"Read 500 chapters","icon":"star","rarity":"epic","points":500,"condition":{"type":"stat_check","stat":"totalChaptersRead","operator":">=","value":500}},{"id":"reader_1000","name":"Unstoppable","description":"Read 1000 chapters","icon":"star","rarity":"legendary","points":1000,"condition":{"type":"stat_check","stat":"totalChaptersRead","operator":">=","value":1000}}]},{"id":"collection","name":"Library Management","description":"Achievements related to building your library","icon":"library","achievements":[{"id":"first_fav","name":"Collector","description":"Add your first manga to library","icon":"heart","rarity":"common","points":10,"condition":{"type":"stat_check","stat":"totalFavorites","operator":">=","value":1}},{"id":"fav_10","name":"Hoarder","description":"Have 10 manga in your library","icon":"box","rarity":"common","points":50,"condition":{"type":"stat_check","stat":"totalFavorites","operator":">=","value":10}},{"id":"fav_50","name":"Mega Reader","description":"Have 50 manga in your library","icon":"package","rarity":"rare","points":200,"condition":{"type":"stat_check","stat":"totalFavorites","operator":">=","value":50}},{"id":"fav_100","name":"Archive Master","description":"Have 100 manga in your library","icon":"archive","rarity":"epic","points":500,"condition":{"type":"stat_check","stat":"totalFavorites","operator":">=","value":100}}]},{"id":"completion","name":"Completionist","description":"Achievements for completing manga series","icon":"check-circle","achievements":[{"id":"completed_1","name":"The End","description":"Complete your first manga series","icon":"check","rarity":"common","points":25,"condition":{"type":"stat_check","stat":"completedCount","operator":">=","value":1}},{"id":"completed_5","name":"Veteran Reader","description":"Complete 5 manga","icon":"award","rarity":"rare","points":100,"condition":{"type":"stat_check","stat":"completedCount","operator":">=","value":5}},{"id":"completed_10","name":"Dedicated Reader","description":"Complete 10 manga","icon":"award","rarity":"rare","points":250,"condition":{"type":"stat_check","stat":"completedCount","operator":">=","value":10}},{"id":"completed_25","name":"Master Reader","description":"Complete 25 manga","icon":"star","rarity":"epic","points":500,"condition":{"type":"stat_check","stat":"completedCount","operator":">=","value":25}}]},{"id":"time","name":"Time Investment","description":"Achievements based on time spent reading","icon":"clock","achievements":[{"id":"night_owl","name":"Night Owl","description":"Spend 1 hour reading total","icon":"moon","rarity":"common","points":50,"condition":{"type":"stat_check","stat":"totalTimeSpent","operator":">=","value":60}},{"id":"marathon","name":"Marathon Reader","description":"Spend 5 hours reading total","icon":"activity","rarity":"rare","points":200,"condition":{"type":"stat_check","stat":"totalTimeSpent","operator":">=","value":300}},{"id":"dedicated","name":"Dedicated","description":"Spend 24 hours reading total","icon":"zap","rarity":"epic","points":1000,"condition":{"type":"stat_check","stat":"totalTimeSpent","operator":">=","value":1440}},{"id":"devoted","name":"Devoted","description":"Spend 100 hours reading total","icon":"maximize","rarity":"legendary","points":5000,"condition":{"type":"stat_check","stat":"totalTimeSpent","operator":">=","value":6000}}]},{"id":"streak","name":"Consistency","description":"Achievements for reading streaks","icon":"calendar","achievements":[{"id":"streak_3","name":"Getting Started","description":"Read 3 days in a row","icon":"activity","rarity":"common","points":30,"condition":{"type":"stat_check","stat":"currentStreak","operator":">=","value":3}},{"id":"streak_7","name":"Weekly Warrior","description":"Read 7 days in a row","icon":"trending-up","rarity":"rare","points":100,"condition":{"type":"stat_check","stat":"currentStreak","operator":">=","value":7}},{"id":"streak_30","name":"Unwavering","description":"Read 30 days in a row","icon":"zap","rarity":"epic","points":500,"condition":{"type":"stat_check","stat":"currentStreak","operator":">=","value":30}},{"id":"streak_100","name":"Immortal","description":"Read 100 days in a row","icon":"maximize","rarity":"legendary","points":2000,"condition":{"type":"stat_check","stat":"currentStreak","operator":">=","value":100}},{"id":"streak_365","name":"Eternal","description":"Read every day for a full year","icon":"star","rarity":"legendary","points":10000,"condition":{"type":"stat_check","stat":"currentStreak","operator":">=","value":365}}]},{"id":"special","name":"Special","description":"Unique and special achievements","icon":"gift","achievements":[{"id":"first_review","name":"Critic","description":"Write your first review","icon":"edit","rarity":"common","points":25,"condition":{"type":"stat_check","stat":"totalReviews","operator":">=","value":1}},{"id":"explorer","name":"Explorer","description":"Use manga from 5 different sources","icon":"compass","rarity":"rare","points":100,"condition":{"type":"stat_check","stat":"uniqueSources","operator":">=","value":5}},{"id":"source_master","name":"Source Master","description":"Use all 11 manga sources","icon":"globe","rarity":"epic","points":300,"condition":{"type":"stat_check","stat":"uniqueSources","operator":">=","value":11}},{"id":"sayajin","name":"Sayajin","description":"Have a Dragon Ball manga in your library","icon":"zap","rarity":"epic","points":300,"condition":{"type":"library_title_match","pattern":"dragon ball"}},{"id":"early_bird","name":"Early Bird","description":"Read a chapter within 1 hour of its release","icon":"sun","rarity":"epic","points":150,"condition":{"type":"custom","handler":"checkEarlyBird"}},{"id":"genre_explorer","name":"Genre Explorer","description":"Read manga from 10 different genres","icon":"map","rarity":"rare","points":150,"condition":{"type":"stat_check","stat":"uniqueGenres","operator":">=","value":10}}]}]};

class AchievementManager {
  constructor() {
    this.achievements = [];
    this.categories = [];
    this.unlockedAchievements = new Set();
    this.achievementPoints = 0;
    this.storageKey = 'manghu_unlocked_achievements';
    // Populate immediately from bundled fallback so the page never starts empty.
    this._applyData(_ACHIEVEMENT_FALLBACK);
    this.loadFromStorage();
  }

  /** @private */
  _applyData(data) {
    this.categories = (data && data.categories) ? data.categories : [];
    this.achievements = [];
    for (const category of this.categories) {
      for (const achievement of category.achievements || []) {
        this.achievements.push({
          ...achievement,
          category: category.id,
          categoryName: category.name
        });
      }
    }
  }

  /**
   * Load achievements from JSON file
   * @returns {Promise<void>}
   */
  async loadAchievements() {
    let data;
    try {
      const response = await fetch('/api/achievements/definitions');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
    } catch (err) {
      console.warn('Failed to fetch achievement definitions, using bundled fallback:', err);
      data = _ACHIEVEMENT_FALLBACK;
    }
    this._applyData(data);
    return data;
  }

  /**
   * Check achievement conditions
   * @param {object} analytics - Current analytics data
   * @returns {string[]} - Array of newly unlocked achievement IDs
   */
  checkAchievements(analytics) {
    const newlyUnlocked = [];
    
    for (const achievement of this.achievements) {
      // Skip if already unlocked
      if (this.unlockedAchievements.has(achievement.id)) {
        continue;
      }
      
      // Check condition
      if (this.evaluateCondition(achievement.condition, analytics)) {
        this.unlockAchievement(achievement.id, achievement.points);
        newlyUnlocked.push(achievement.id);
      }
    }
    
    return newlyUnlocked;
  }

  /**
   * Evaluate achievement condition
   * @param {object} condition - Condition object
   * @param {object} analytics - Analytics data
   * @returns {boolean}
   */
  evaluateCondition(condition, analytics) {
    if (!condition) return false;
    
    switch (condition.type) {
      case 'stat_check':
        return this.evaluateStatCheck(condition, analytics);
      
      case 'time_based':
        return this.evaluateTimeBased(condition, analytics);
      
      case 'status_distribution':
        return this.evaluateStatusDistribution(condition, analytics);
      
      case 'composite':
        return this.evaluateComposite(condition, analytics);
      
      case 'library_title_match':
        return this.evaluateLibraryTitleMatch(condition, analytics);
      
      default:
        console.warn(`Unknown condition type: ${condition.type}`);
        return false;
    }
  }

  /**
   * Evaluate stat check condition
   * @param {object} condition
   * @param {object} analytics
   * @returns {boolean}
   */
  evaluateStatCheck(condition, analytics) {
    const statValue = analytics[condition.stat] || 0;
    const targetValue = condition.value;
    
    switch (condition.operator) {
      case '>=': return statValue >= targetValue;
      case '>':  return statValue > targetValue;
      case '<=': return statValue <= targetValue;
      case '<':  return statValue < targetValue;
      case '==': return statValue == targetValue;
      case '!=': return statValue != targetValue;
      default:
        console.warn(`Unknown operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Evaluate time-based condition
   * @param {object} condition
   * @param {object} analytics
   * @returns {boolean}
   */
  evaluateTimeBased(condition, analytics) {
    const totalMinutes = analytics.totalTimeSpent || 0;
    const targetMinutes = condition.minutes;
    return totalMinutes >= targetMinutes;
  }

  /**
   * Evaluate status distribution condition
   * @param {object} condition
   * @param {object} analytics
   * @returns {boolean}
   */
  evaluateStatusDistribution(condition, analytics) {
    const statusDistribution = analytics.statusDistribution || {};
    const statusCount = statusDistribution[condition.status] || 0;
    return statusCount >= condition.count;
  }

  /**
   * Evaluate library title match condition
   * @param {object} condition - { pattern: string }
   * @param {object} analytics - must include libraryTitles: string[]
   * @returns {boolean}
   */
  evaluateLibraryTitleMatch(condition, analytics) {
    const titles = analytics.libraryTitles || [];
    const pattern = (condition.pattern || '').toLowerCase();
    if (!pattern) return false;
    return titles.some(t => t.toLowerCase().includes(pattern));
  }

  /**
   * Evaluate composite condition (AND/OR logic)
   * @param {object} condition
   * @param {object} analytics
   * @returns {boolean}
   */
  evaluateComposite(condition, analytics) {
    const subconditions = condition.conditions || [];
    
    if (condition.logic === 'AND') {
      return subconditions.every(sub => this.evaluateCondition(sub, analytics));
    } else if (condition.logic === 'OR') {
      return subconditions.some(sub => this.evaluateCondition(sub, analytics));
    }
    
    return false;
  }

  /**
   * Unlock an achievement
   * @param {string} achievementId
   * @param {number} points
   */
  unlockAchievement(achievementId, points = 0) {
    if (this.unlockedAchievements.has(achievementId)) {
      return; // Already unlocked
    }
    
    this.unlockedAchievements.add(achievementId);
    this.achievementPoints += points;
    this.saveToStorage();
    
    // Emit event for UI notification
    const achievement = this.achievements.find(a => a.id === achievementId);
    if (achievement) {
      this.emitAchievementUnlocked(achievement);
    }
  }

  /**
   * Emit achievement unlocked event
   * @param {object} achievement
   */
  emitAchievementUnlocked(achievement) {
    const event = new CustomEvent('achievementUnlocked', {
      detail: { achievement }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get achievement by ID
   * @param {string} id
   * @returns {object|null}
   */
  getAchievement(id) {
    return this.achievements.find(a => a.id === id) || null;
  }

  /**
   * Get all achievements in a category
   * @param {string} categoryId
   * @returns {array}
   */
  getAchievementsByCategory(categoryId) {
    return this.achievements.filter(a => a.category === categoryId);
  }

  /**
   * Get achievement progress
   * @param {string} achievementId
   * @param {object} analytics
   * @returns {object}
   */
  getProgress(achievementId, analytics) {
    const achievement = this.getAchievement(achievementId);
    if (!achievement || !achievement.condition) {
      return { current: 0, target: 0, percentage: 0 };
    }
    
    const condition = achievement.condition;
    
    if (condition.type === 'stat_check') {
      const current = analytics[condition.stat] || 0;
      const target = condition.value;
      const percentage = Math.min(100, (current / target) * 100);
      return { current, target, percentage };
    }
    
    if (condition.type === 'time_based') {
      const current = analytics.totalTimeSpent || 0;
      const target = condition.minutes;
      const percentage = Math.min(100, (current / target) * 100);
      return { current, target, percentage };
    }
    
    return { current: 0, target: 0, percentage: 0 };
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    const total = this.achievements.length;
    const unlocked = this.unlockedAchievements.size;
    const percentage = total > 0 ? (unlocked / total) * 100 : 0;
    
    return {
      total,
      unlocked,
      locked: total - unlocked,
      percentage: Math.round(percentage),
      points: this.achievementPoints
    };
  }

  /**
   * Get achievements by rarity
   * @param {string} rarity
   * @returns {array}
   */
  getAchievementsByRarity(rarity) {
    return this.achievements.filter(a => a.rarity === rarity);
  }

  /**
   * Check if achievement is unlocked
   * @param {string} achievementId
   * @returns {boolean}
   */
  isUnlocked(achievementId) {
    return this.unlockedAchievements.has(achievementId);
  }

  /**
   * Save unlocked achievements to localStorage
   */
  saveToStorage() {
    try {
      const data = {
        unlocked: Array.from(this.unlockedAchievements),
        points: this.achievementPoints,
        timestamp: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to save achievements:', err);
    }
  }

  /**
   * Load unlocked achievements from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.unlockedAchievements = new Set(data.unlocked || []);
        this.achievementPoints = data.points || 0;
      }
    } catch (err) {
      console.warn('Failed to load achievements:', err);
      this.unlockedAchievements = new Set();
      this.achievementPoints = 0;
    }
  }

  /**
   * Reset all achievements (for testing/debugging)
   */
  reset() {
    this.unlockedAchievements.clear();
    this.achievementPoints = 0;
    this.saveToStorage();
  }

  /**
   * Get recent unlocks
   * @param {number} limit
   * @returns {array}
   */
  getRecentUnlocks(limit = 5) {
    // This could be enhanced with unlock timestamps
    const unlocked = Array.from(this.unlockedAchievements);
    return unlocked
      .map(id => this.getAchievement(id))
      .filter(a => a !== null)
      .slice(0, limit);
  }
}
