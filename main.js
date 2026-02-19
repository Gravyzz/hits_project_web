const consoleEl = document.getElementById("console");
const consoleTextEl = document.getElementById("consoleText");
const headerEl = document.getElementById("consoleHeader");
const resizer = document.getElementById("consoleResizer");
const consoleBtnTop = document.getElementById("consoleBtn");
const consoleClearBtn = document.getElementById("consoleClear");
const consoleHideBtn = document.getElementById("consoleHide");
const consoleCloseBtn = document.getElementById("consoleClose");
const workspaceWrap = consoleEl.parentElement;

const GAP = 3;  
const MAGNET = 40;    

const consoleState = {
  visible: true,
  logs: ["Ready…"],
};

function renderConsole() {
  consoleTextEl.textContent = consoleState.logs.join("\n");

  consoleEl.classList.toggle("is-hidden", !consoleState.visible);
  if (consoleState.logs.length === 0) {
    consoleTextEl.textContent = "";
  }
}

export function consoleLog(msg) {
  consoleState.logs.push(String(msg));
  renderConsole();
}

function clearLogs() {
  consoleState.logs = [];
  renderConsole();
}

function hideKeepLogs() {
  consoleState.visible = false;
  renderConsole();
}

function closeClearAndHide() {
  consoleState.logs = [];
  consoleState.visible = false;
  renderConsole();
}

function showConsole() {
  consoleState.visible = true;
  renderConsole();
}

function clampConsoleToWorkspace() {
  const wrapRect = workspaceWrap.getBoundingClientRect();
  const maxLeft = wrapRect.width - consoleEl.offsetWidth;
  const maxTop = wrapRect.height - consoleEl.offsetHeight;

  posState.left = clamp(posState.left, 0, Math.max(0, maxLeft));
  posState.top = clamp(posState.top, 0, Math.max(0, maxTop));
  applyConsolePos();
}

// --- Events ---
consoleClearBtn.addEventListener("click", () => {
  clearLogs();
});

consoleHideBtn.addEventListener("click", () => {
  hideKeepLogs();
});

consoleCloseBtn.addEventListener("click", () => {
  closeClearAndHide();
});

// Кнопка Console сверху
consoleBtnTop.addEventListener("click", () => {
  if (consoleState.visible) {
    hideKeepLogs();
  } else {
    showConsole();
  }
});

renderConsole();


// ----Размеры консоли-----

const sizeState = {
  width: consoleEl.offsetWidth,
  height: consoleEl.offsetHeight,
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function applyConsoleSize() {
  consoleEl.style.width = sizeState.width + "px";
  consoleEl.style.height = sizeState.height + "px";
}

let resizing = false;
let start = null;

resizer.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  resizing = true;
  resizer.setPointerCapture(e.pointerId);

  start = {
    x: e.clientX,
    y: e.clientY,
    w: sizeState.width,
    h: sizeState.height,
  };
});

resizer.addEventListener("pointermove", (e) => {
  if (!resizing) return;

  const dx = e.clientX - start.x;
  const dy = e.clientY - start.y;

  sizeState.width = clamp(start.w + dx, 320, 900);
  sizeState.height = clamp(start.h + dy, 120, 420);

  applyConsoleSize();
  clampConsoleToWorkspace();
});

resizer.addEventListener("pointerup", () => {
  resizing = false;
});

resizer.addEventListener("pointercancel", () => {
  resizing = false;
});

applyConsoleSize();

// -----Перенос консоли-------
let dragging = false;
let dragStart = null;

headerEl.addEventListener("pointerdown", (e) => {
  e.preventDefault();

  const target = e.target;
  if (target.closest("button")) return;

  dragging = true;
  headerEl.setPointerCapture(e.pointerId);

  const rect = consoleEl.getBoundingClientRect();
  dragStart = {
    pointerX: e.clientX,
    pointerY: e.clientY,
    startLeft: rect.left,
    startTop: rect.top,
  };
});

headerEl.addEventListener("pointermove", (e) => {
  if (!dragging) return;

  const wrapRect = workspaceWrap.getBoundingClientRect();

  const dx = e.clientX - dragStart.pointerX;
  const dy = e.clientY - dragStart.pointerY;

  let newLeft = (dragStart.startLeft - wrapRect.left) + dx;
  let newTop = (dragStart.startTop - wrapRect.top) + dy;

  // ограничения, чтобы консоль не уехала за границы
  const maxLeft = wrapRect.width - consoleEl.offsetWidth;
  const maxTop = wrapRect.height - consoleEl.offsetHeight;

  newLeft = clamp(newLeft, 0, Math.max(0, maxLeft));
  newTop = clamp(newTop, 0, Math.max(0, maxTop));

  consoleEl.style.left = newLeft + "px";
  consoleEl.style.top = newTop + "px";
});

headerEl.addEventListener("pointerup", () => {
  dragging = false;
});

headerEl.addEventListener("pointercancel", () => {
  dragging = false;
});



// ------- Drug tools --------

const canvas = document.getElementById('canvas');
const toolbox = document.querySelector('.toolbox');
const OVERSCROLL = 300; // насколько можно вылезать за края во время drag

let active = null;
let offsetX = 0;
let offsetY = 0;


function getLeftTop(el) {
  return {
    left: parseFloat(el.style.left) || 0,
    top:  parseFloat(el.style.top)  || 0,
  };
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

// Найти лучший "якорь" для active: куда его приклеить
function findBestSnapTarget(activeEl) {
  const { left: ax, top: ay } = getLeftTop(activeEl);
  const aW = activeEl.offsetWidth;
  const aH = activeEl.offsetHeight;

  const A = {
    left: ax,
    right: ax + aW,
    top: ay,
    bottom: ay + aH,
    w: aW,
    h: aH,
  };

  let best = null; // { el, d }

  canvas.querySelectorAll(".placed-block").forEach((b) => {
    if (b === activeEl) return;

    const { left: bx, top: by } = getLeftTop(b);
    const bW = b.offsetWidth;
    const bH = b.offsetHeight;

    const B = {
      left: bx,
      right: bx + bW,
      top: by,
      bottom: by + bH,
      w: bW,
      h: bH,
    };

    const overlapX = Math.min(A.right, B.right) - Math.max(A.left, B.left);
    const overlapY = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);

    const minOverlapX = Math.min(20, A.w * 0.25, B.w * 0.25);
    const minOverlapY = Math.min(20, A.h * 0.25, B.h * 0.25);

    let d = Infinity;

    if (overlapX > minOverlapX) {
      d = Math.min(d, Math.abs(A.bottom - B.top));
      d = Math.min(d, Math.abs(A.top - B.bottom));
    }

    if (overlapY > minOverlapY) {
      d = Math.min(d, Math.abs(A.right - B.left)); 
      d = Math.min(d, Math.abs(A.left - B.right));
    }

    if (d <= MAGNET) {
      if (!best || d < best.d) best = { el: b, d };
    }
  });

  return best ? best.el : null;
}

function snapUnder(activeEl, targetEl) {
  const { left: bx, top: by } = getLeftTop(targetEl);
  const y = by + targetEl.offsetHeight + GAP;

  // магнитим по X
  if (targetEl.classList.contains("end")){
    activeEl.style.left = bx - 40 + 'px';
    activeEl.style.top  = y + 'px';
  }

  else if (targetEl.classList.contains("start")){
    activeEl.style.left = bx + 40 + 'px';
    activeEl.style.top  = y + 'px';
  }
  else {
    activeEl.style.left = bx + 'px';
    activeEl.style.top  = y + 'px';
  }

}



function startDrag(block, clientX, clientY, presetOffsetX, presetOffsetY) {
  active = block;
  active.classList.add('dragging');

  if (typeof presetOffsetX === 'number' && typeof presetOffsetY === 'number') {
    offsetX = presetOffsetX;
    offsetY = presetOffsetY;
  } else {

    const r = active.getBoundingClientRect();
    offsetX = clientX - r.left;
    offsetY = clientY - r.top;
  }

  active.style.zIndex = String(Date.now());

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function onMove(e) {
  if (!active) return;

  const canvasRect = canvas.getBoundingClientRect();

  const bw = active.offsetWidth;
  const bh = active.offsetHeight;

  let x = e.clientX - canvasRect.left - offsetX;
  let y = e.clientY - canvasRect.top  - offsetY;

  const minX = -OVERSCROLL;
  const minY = -OVERSCROLL;
  const maxX = canvas.clientWidth  - bw + OVERSCROLL;
  const maxY = canvas.clientHeight - bh + OVERSCROLL;

  if (x < minX) x = minX;
  if (y < minY) y = minY;
  if (x > maxX) x = maxX;
  if (y > maxY) y = maxY;

  active.style.left = x + 'px';
  active.style.top  = y + 'px';
}

function onUp() {
  if (!active) return;

  const bw = active.offsetWidth;
  const bh = active.offsetHeight;

  let x = parseFloat(active.style.left) || 0;
  let y = parseFloat(active.style.top)  || 0;

  const maxX = canvas.clientWidth  - bw;
  const maxY = canvas.clientHeight - bh;

  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x > maxX) x = maxX;
  if (y > maxY) y = maxY;

  active.style.left = x + "px";
  active.style.top  = y + "px";

  const target = findBestSnapTarget(active);
  if (target) {
    snapUnder(active, target);

    target.dataset.next = active.dataset.id;
    active.dataset.prev = target.dataset.id;

    const x2 = parseFloat(active.style.left) || 0;
    const y2 = parseFloat(active.style.top)  || 0;

    const maxX2 = canvas.clientWidth  - active.offsetWidth;
    const maxY2 = canvas.clientHeight - active.offsetHeight;

    active.style.left = Math.max(0, Math.min(x2, maxX2)) + "px";
    active.style.top  = Math.max(0, Math.min(y2, maxY2)) + "px";
  }

  active.classList.remove("dragging");
  active = null;

  document.removeEventListener("mousemove", onMove);
  document.removeEventListener("mouseup", onUp);
}

toolbox.addEventListener('mousedown', (e) => {
  const item = e.target.closest('.tool-item');
  if (!item) return;

  if (e.target.closest('input, select, textarea, button')) return;

  e.preventDefault();

  const clone = item.cloneNode(true);
  clone.classList.add('placed-block');
  clone.style.position = 'absolute';
  
  clone.dataset.id = crypto.randomUUID();
  clone.dataset.prev = "";
  clone.dataset.next = "";  

  clone.style.width = item.getBoundingClientRect().width + 'px';

  const itemRect = item.getBoundingClientRect();
  const grabOffsetX = e.clientX - itemRect.left;
  const grabOffsetY = e.clientY - itemRect.top;

  canvas.appendChild(clone);

  const canvasRect = canvas.getBoundingClientRect();
  clone.style.left = (e.clientX - canvasRect.left - grabOffsetX) + 'px';
  clone.style.top  = (e.clientY - canvasRect.top  - grabOffsetY) + 'px';

  startDrag(clone, e.clientX, e.clientY, grabOffsetX, grabOffsetY);
});

canvas.addEventListener('mousedown', (e) => {
  const block = e.target.closest('.placed-block');
  if (!block) return;

  if (e.target.closest('input, select, textarea, button')) return;

  e.preventDefault();
  startDrag(block, e.clientX, e.clientY);
});





//------block delete--------
let selectedBlock = null;

// выбор блока кликом
canvas.addEventListener('mousedown', (e) => {
  const block = e.target.closest('.placed-block');

  if (!block) {
    if (selectedBlock) selectedBlock.classList.remove('selected');
    selectedBlock = null;
    return;
  }

  if (e.target.closest('input, select, textarea, button')) return;

  if (selectedBlock) selectedBlock.classList.remove('selected');
  selectedBlock = block;
  selectedBlock.classList.add('selected');
});

// удаление по Delete/Backspace
document.addEventListener("keydown", (e) => {
  if (e.key !== "Delete" && e.key !== "Backspace") return;
  if (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;

  canvas.querySelectorAll(".placed-block.selected").forEach(b => b.remove());
  selectedBlock = null;
});

//--------- delete all ----------
const deleteAllBtn = document.getElementById("deleteAllBtn");

deleteAllBtn.addEventListener("click", () => {
  const blocks = canvas.querySelectorAll(".placed-block");

  if (blocks.length === 0) return;

  const confirmed = confirm("Are you sure you want to delete all blocks?");

  if (!confirmed) return;

  blocks.forEach(block => block.remove());
  selectedBlock = null;
});

// ------ Выделение рамкой ---------
let selectionBox = null;
let startX = 0;
let startY = 0;
let isSelecting = false;

canvas.addEventListener("mousedown", (e) => {
  if (e.target !== canvas) return;

  isSelecting = true;

  const canvasRect = canvas.getBoundingClientRect();
  startX = e.clientX - canvasRect.left;
  startY = e.clientY - canvasRect.top;

  selectionBox = document.createElement("div");
  selectionBox.className = "selection-box";
  selectionBox.style.left = startX + "px";
  selectionBox.style.top = startY + "px";
  selectionBox.style.width = "0px";
  selectionBox.style.height = "0px";

  canvas.appendChild(selectionBox);

  document.addEventListener("mousemove", onSelectMove);
  document.addEventListener("mouseup", onSelectUp);
});

function onSelectMove(e) {
  if (!isSelecting || !selectionBox) return;

  const canvasRect = canvas.getBoundingClientRect();
  const currentX = e.clientX - canvasRect.left;
  const currentY = e.clientY - canvasRect.top;

  const width = currentX - startX;
  const height = currentY - startY;

  selectionBox.style.width = Math.abs(width) + "px";
  selectionBox.style.height = Math.abs(height) + "px";
  selectionBox.style.left = (width < 0 ? currentX : startX) + "px";
  selectionBox.style.top  = (height < 0 ? currentY : startY) + "px";
}

function onSelectUp() {
  if (!isSelecting || !selectionBox) return;

  isSelecting = false;

  const boxRect = selectionBox.getBoundingClientRect();
  const blocks = canvas.querySelectorAll(".placed-block");

  blocks.forEach(block => {
    const r = block.getBoundingClientRect();

    const intersects = !(
      r.right < boxRect.left ||
      r.left > boxRect.right ||
      r.bottom < boxRect.top ||
      r.top > boxRect.bottom
    );

    block.classList.toggle("selected", intersects);
  });

  selectionBox.remove();
  selectionBox = null;

  document.removeEventListener("mousemove", onSelectMove);
  document.removeEventListener("mouseup", onSelectUp);
}


// ------- Перенос группы -----------