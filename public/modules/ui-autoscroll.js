// ============================================================================
// ROW AUTO-SCROLL + DRAG
// ============================================================================

function initRowAutoScroll(row) {
  if (row._autoScrollId) cancelAnimationFrame(row._autoScrollId);

  const SPEED = 0.4; // px per frame
  let pos = 0;

  row.style.scrollSnapType = "none";

  function tick() {
    if (!row._dragging) {
      pos += SPEED;
      const max = row.scrollWidth - row.clientWidth;
      if (max <= 0) { row._autoScrollId = requestAnimationFrame(tick); return; }
      if (pos >= max) pos = 0;
      row.scrollLeft = pos;
    } else {
      pos = row.scrollLeft;
    }
    row._autoScrollId = requestAnimationFrame(tick);
  }
  row._autoScrollId = requestAnimationFrame(tick);

  initRowDrag(row);
}

function initRowDrag(row) {
  if (row._dragInit) return;
  row._dragInit = true;

  let startX    = 0;
  let startLeft = 0;
  let hasMoved  = false;

  row.style.cursor = "grab";

  row.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    startX    = e.clientX;
    startLeft = row.scrollLeft;
    hasMoved  = false;
    row.style.cursor = "grabbing";
  }, { passive: true });

  row.addEventListener("pointermove", e => {
    if (e.buttons !== 1) return;
    const dx = e.clientX - startX;
    if (!hasMoved && Math.abs(dx) < 5) return; // threshold: ignore tiny jitter
    hasMoved = true;
    row._dragging = true;
    row.scrollLeft = startLeft - dx;
  }, { passive: true });

  const stopDrag = () => { row._dragging = false; row.style.cursor = "grab"; };
  row.addEventListener("pointerup",     stopDrag);
  row.addEventListener("pointercancel", () => { hasMoved = false; stopDrag(); });

  // Block click from opening manga only if user actually dragged (not just clicked)
  row.addEventListener("click", e => {
    if (hasMoved) {
      e.stopPropagation();
      hasMoved = false;
    }
  }, true); // capture phase — fires before card onclick
}

