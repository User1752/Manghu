// ============================================================================
// SHOP VIEW
// ============================================================================

function renderShopView() {
  const grid = document.getElementById('shopGrid');
  if (!grid) return;
  updateApBadge();
  const ap        = getAvailableAP();
  const purchased = getPurchasedThemes();
  const active    = getActiveTheme();
  grid.innerHTML = SHOP_THEMES.map(t => {
    const owned    = purchased.includes(t.id);
    const isActive = active === t.id;
    const canAfford = ap >= t.cost;
    let btn, badge = '';
    if (isActive) {
      btn = `<button class="shop-btn shop-btn-active" disabled>Active</button>`;
      badge = `<span class="shop-active-badge">&#x2713; Active</span>`;
    } else if (owned) {
      btn = `<button class="shop-btn shop-btn-owned" onclick="setActiveTheme('${t.id}');renderShopView()">Apply</button>`;
    } else if (t.cost === 0) {
      btn = `<button class="shop-btn shop-btn-buy" onclick="addPurchasedTheme('${t.id}');setActiveTheme('${t.id}');renderShopView()">Get Free</button>`;
    } else if (canAfford) {
      btn = `<button class="shop-btn shop-btn-buy" onclick="buyTheme('${t.id}')">Buy</button>`;
    } else {
      btn = `<button class="shop-btn shop-btn-afford" disabled>Need ${t.cost} AP</button>`;
    }
    const costStr = t.cost === 0 ? '<span style="color:var(--success)">Free</span>' : `<span class="ap-star">&#x2B50;</span>${t.cost} AP`;
    return `
      <div class="shop-card ${isActive ? 'shop-active' : owned ? 'shop-owned' : ''}">
        <div class="shop-card-preview" style="background:${t.preview}"></div>
        <div class="shop-card-body">
          <div class="shop-card-name">${escapeHtml(t.name)}</div>
          <div class="shop-card-desc">${escapeHtml(t.desc)}</div>
          <div class="shop-card-footer">
            <span class="shop-card-cost">${costStr}</span>
            ${btn}
          </div>
          ${badge}
        </div>
      </div>`;
  }).join('');
}

function buyTheme(id) {
  const t  = SHOP_THEMES.find(x => x.id === id);
  if (!t) return;
  const ap = getAvailableAP();
  if (ap < t.cost) { showToast('Not enough AP', `You need ${t.cost} AP`, 'warning'); return; }
  spendAP(t.cost);
  addPurchasedTheme(id);
  setActiveTheme(id);
  showToast('Theme unlocked! ', t.name, 'success');
  renderShopView();
  updateApBadge();
}

