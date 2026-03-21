// ============================================================================
// DRAGON BALL EASTER EGG HELPERS
// ============================================================================

function dragonBallSVG(n) {
  return `<img src="/dragon-ball-${n}.png" class="db-sprite" draggable="false" alt="${n}-star Dragon Ball">`;
}

function summonShenlong() {
  addBonusAP(50);
  updateApBadge();
  const overlay = document.getElementById('shenlong-overlay');
  const gif = document.getElementById('shenlong-gif');
  if (overlay) {
    // Reset GIF src so it replays from frame 1 every time
    if (gif) {
      const src = gif.getAttribute('src');
      gif.setAttribute('src', '');
      requestAnimationFrame(() => gif.setAttribute('src', src));
    }
    overlay.classList.remove('hidden');
    overlay.classList.add('shenlong-show');
    setTimeout(() => {
      overlay.classList.add('shenlong-hide');
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('shenlong-show', 'shenlong-hide');
      }, 800);
    }, 2800);
  }
  showToast('Shenlong appears!', 'Your wish is granted — +50 AP!', 'success');
}

