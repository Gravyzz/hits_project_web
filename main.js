// ================== Console ==================
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
  if (consoleState.logs.length === 0) consoleTextEl.textContent = "";
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

const posState = {
  left: parseFloat(consoleEl.style.left) || 0,
  top: parseFloat(consoleEl.style.top) || 0,
};
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function applyConsolePos() {
  consoleEl.style.left = posState.left + "px";
  consoleEl.style.top = posState.top + "px";
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
consoleClearBtn.addEventListener("click", clearLogs);
consoleHideBtn.addEventListener("click", hideKeepLogs);
consoleCloseBtn.addEventListener("click", closeClearAndHide);

consoleBtnTop.addEventListener("click", () => {
  if (consoleState.visible) hideKeepLogs();
  else showConsole();
});

renderConsole();

// ---- Размеры консоли -----
const sizeState = {
  width: consoleEl.offsetWidth,
  height: consoleEl.offsetHeight,
};

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

  start = { x: e.clientX, y: e.clientY, w: sizeState.width, h: sizeState.height };
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

resizer.addEventListener("pointerup", () => (resizing = false));
resizer.addEventListener("pointercancel", () => (resizing = false));

applyConsoleSize();

// ----- Перенос консоли -----
let draggingConsole = false;
let dragStart = null;

headerEl.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (e.target.closest("button")) return;

  draggingConsole = true;
  headerEl.setPointerCapture(e.pointerId);

  const rect = consoleEl.getBoundingClientRect();
  dragStart = { pointerX: e.clientX, pointerY: e.clientY, startLeft: rect.left, startTop: rect.top };
});

headerEl.addEventListener("pointermove", (e) => {
  if (!draggingConsole) return;

  const wrapRect = workspaceWrap.getBoundingClientRect();
  const dx = e.clientX - dragStart.pointerX;
  const dy = e.clientY - dragStart.pointerY;

  let newLeft = dragStart.startLeft - wrapRect.left + dx;
  let newTop = dragStart.startTop - wrapRect.top + dy;

  const maxLeft = wrapRect.width - consoleEl.offsetWidth;
  const maxTop = wrapRect.height - consoleEl.offsetHeight;

  posState.left = clamp(newLeft, 0, Math.max(0, maxLeft));
  posState.top = clamp(newTop, 0, Math.max(0, maxTop));
  applyConsolePos();
});

headerEl.addEventListener("pointerup", () => (draggingConsole = false));
headerEl.addEventListener("pointercancel", () => (draggingConsole = false));

// ================== Drag tools / Canvas ==================
const canvas = document.getElementById("canvas");
const toolbox = document.querySelector(".toolbox");
const OVERSCROLL = 300;

let active = null;
let offsetX = 0;
let offsetY = 0;

function getLeftTop(el) {
  return {
    left: parseFloat(el.style.left) || 0,
    top: parseFloat(el.style.top) || 0,
  };
}

function getZ(el) {
  const z = parseInt(el.style.zIndex, 10);
  return Number.isFinite(z) ? z : 0;
}

// ---- Snap helpers ----
function findBestSnapTarget(activeEl, excludeSet = null) {
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

  let best = null;

  canvas.querySelectorAll(".placed-block").forEach((b) => {
    if (b === activeEl) return;
    if (excludeSet && excludeSet.has(b)) return;

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

  if (targetEl.classList.contains("end")) {
    activeEl.style.left = bx - 40 + "px";
    activeEl.style.top = y + "px";
  } else if (targetEl.classList.contains("start")) {
    activeEl.style.left = bx + 40 + "px";
    activeEl.style.top = y + "px";
  } else {
    activeEl.style.left = bx + "px";
    activeEl.style.top = y + "px";
  }
}


// ---- Single drag ----
function startDrag(block, clientX, clientY, presetOffsetX, presetOffsetY) {
  active = block;
  active.classList.add("dragging");

  if (typeof presetOffsetX === "number" && typeof presetOffsetY === "number") {
    offsetX = presetOffsetX;
    offsetY = presetOffsetY;
  } else {
    const r = active.getBoundingClientRect();
    offsetX = clientX - r.left;
    offsetY = clientY - r.top;
  }

  active.style.zIndex = String(Date.now());

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

function onMove(e) {
  if (!active) return;

  const canvasRect = canvas.getBoundingClientRect();
  const bw = active.offsetWidth;
  const bh = active.offsetHeight;

  let x = e.clientX - canvasRect.left - offsetX;
  let y = e.clientY - canvasRect.top - offsetY;

  const minX = -OVERSCROLL;
  const minY = -OVERSCROLL;
  const maxX = canvas.clientWidth - bw + OVERSCROLL;
  const maxY = canvas.clientHeight - bh + OVERSCROLL;

  x = Math.max(minX, Math.min(maxX, x));
  y = Math.max(minY, Math.min(maxY, y));

  active.style.left = x + "px";
  active.style.top = y + "px";
}

function onUp() {
  if (!active) return;

  const bw = active.offsetWidth;
  const bh = active.offsetHeight;

  let x = parseFloat(active.style.left) || 0;
  let y = parseFloat(active.style.top) || 0;

  const maxX = canvas.clientWidth - bw;
  const maxY = canvas.clientHeight - bh;

  x = clamp(x, 0, Math.max(0, maxX));
  y = clamp(y, 0, Math.max(0, maxY));

  active.style.left = x + "px";
  active.style.top = y + "px";

  const target = findBestSnapTarget(active);
  if (target) {
    snapUnder(active, target);

    target.dataset.next = active.dataset.id;
    active.dataset.prev = target.dataset.id;

    const x2 = parseFloat(active.style.left) || 0;
    const y2 = parseFloat(active.style.top) || 0;

    const maxX2 = canvas.clientWidth - active.offsetWidth;
    const maxY2 = canvas.clientHeight - active.offsetHeight;

    active.style.left = clamp(x2, 0, Math.max(0, maxX2)) + "px";
    active.style.top = clamp(y2, 0, Math.max(0, maxY2)) + "px";
  }

  active.classList.remove("dragging");
  active = null;

  document.removeEventListener("mousemove", onMove);
  document.removeEventListener("mouseup", onUp);
}

// ---- Drag from toolbox -> clone to canvas ----
toolbox.addEventListener("mousedown", (e) => {
  const item = e.target.closest(".tool-item");
  if (!item) return;
  if (e.target.closest("input, select, textarea, button")) return;

  e.preventDefault();

  const clone = item.cloneNode(true);
  clone.classList.add("placed-block");
  clone.style.position = "absolute";

  clone.dataset.id = crypto.randomUUID();
  clone.dataset.prev = "";
  clone.dataset.next = "";

  clone.style.width = item.getBoundingClientRect().width + "px";

  const itemRect = item.getBoundingClientRect();
  const grabOffsetX = e.clientX - itemRect.left;
  const grabOffsetY = e.clientY - itemRect.top;

  canvas.appendChild(clone);

  const canvasRect = canvas.getBoundingClientRect();
  clone.style.left = e.clientX - canvasRect.left - grabOffsetX + "px";
  clone.style.top = e.clientY - canvasRect.top - grabOffsetY + "px";

  clearAllSelected();
  clone.classList.add("selected");
  selectedBlock = clone;

  startDrag(clone, e.clientX, e.clientY, grabOffsetX, grabOffsetY);
});

// ================== Selection ==================
let selectedBlock = null;
let suppressClick = false;

function clearAllSelected() {
  canvas.querySelectorAll(".placed-block.selected").forEach((b) => b.classList.remove("selected"));
}

// --- Клик по canvas: выбор блоков ---
// Shift+клик: добавить/убрать из выделения
// Клик без Shift: выделить только этот блок
// Клик по пустому месту: снять выделение
canvas.addEventListener("click", (e) => {
  if (suppressClick) return;
  if (e.target.closest("input, select, textarea, button")) return;

  const block = e.target.closest(".placed-block");

  if (!block) {
    clearAllSelected();
    selectedBlock = null;
    return;
  }

  if (e.shiftKey) {
    block.classList.toggle("selected");
    selectedBlock = block.classList.contains("selected") ? block : selectedBlock;
    return;
  }

  clearAllSelected();
  block.classList.add("selected");
  selectedBlock = block;
});

// --- Delete / Backspace: удалить все selected ---
document.addEventListener("keydown", (e) => {
  if (e.key !== "Delete" && e.key !== "Backspace") return;
  if (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;

  canvas.querySelectorAll(".placed-block.selected").forEach((b) => b.remove());
  selectedBlock = null;
});

// --- Delete All ---
const deleteAllBtn = document.getElementById("deleteAllBtn");
deleteAllBtn?.addEventListener("click", () => {
  const blocks = canvas.querySelectorAll(".placed-block");
  if (blocks.length === 0) return;

  const confirmed = confirm("Are you sure you want to delete all blocks?");
  if (!confirmed) return;

  blocks.forEach((b) => b.remove());
  selectedBlock = null;
});

// --- Выделение рамкой ---
let selectionBox = null;
let startX = 0;
let startY = 0;
let isSelecting = false;

canvas.addEventListener("mousedown", (e) => {
  // стартуем рамку только по пустому месту canvas
  if (e.target !== canvas) return;
  if (e.button !== 0) return;

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

  // если не держим Shift — начинаем новое выделение
  if (!e.shiftKey) clearAllSelected();

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
  selectionBox.style.top = (height < 0 ? currentY : startY) + "px";
}

function onSelectUp() {
  if (!isSelecting || !selectionBox) return;

  isSelecting = false;

  const boxRect = selectionBox.getBoundingClientRect();
  const blocks = canvas.querySelectorAll(".placed-block");

  blocks.forEach((block) => {
    const r = block.getBoundingClientRect();
    const intersects = !(
      r.right < boxRect.left ||
      r.left > boxRect.right ||
      r.bottom < boxRect.top ||
      r.top > boxRect.bottom
    );
    if (intersects) block.classList.add("selected");
  });

  selectionBox.remove();
  selectionBox = null;

  document.removeEventListener("mousemove", onSelectMove);
  document.removeEventListener("mouseup", onSelectUp);

  suppressClick = true;
  setTimeout(() => (suppressClick = false), 0);
}

// ================== Group drag ==================
let dragGroup = null; // [{ el, startLeft, startTop }]
let groupLeader = null;
let leaderGrabOffset = { x: 0, y: 0 };
let isGroupDrag = false;
let groupRAF = 0;
let lastGroupEvent = null;
let groupDx = 0;
let groupDy = 0;



function collectSelectedGroup(leaderEl) {
  const selected = Array.from(canvas.querySelectorAll(".placed-block.selected"));
  if (selected.length === 0) {
    return [{ el: leaderEl, startLeft: getLeftTop(leaderEl).left, startTop: getLeftTop(leaderEl).top }];
  }

  if (!leaderEl.classList.contains("selected")) {
    clearAllSelected();
    leaderEl.classList.add("selected");
    return [{ el: leaderEl, startLeft: getLeftTop(leaderEl).left, startTop: getLeftTop(leaderEl).top }];
  }

  return selected.map((el) => {
    const { left, top } = getLeftTop(el);
    return { el, startLeft: left, startTop: top };
  });
}

function clampGroupToCanvas(group) {
  let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;

  group.forEach(({ el }) => {
    const { left, top } = getLeftTop(el);
    minL = Math.min(minL, left);
    minT = Math.min(minT, top);
    maxR = Math.max(maxR, left + el.offsetWidth);
    maxB = Math.max(maxB, top + el.offsetHeight);
  });

  let shiftX = 0;
  let shiftY = 0;

  if (minL < 0) shiftX = -minL;
  if (minT < 0) shiftY = -minT;

  const overflowX = maxR - canvas.clientWidth;
  const overflowY = maxB - canvas.clientHeight;

  if (overflowX > 0) shiftX -= overflowX;
  if (overflowY > 0) shiftY -= overflowY;

  if (shiftX !== 0 || shiftY !== 0) {
    group.forEach(({ el }) => {
      const p = getLeftTop(el);
      el.style.left = p.left + shiftX + "px";
      el.style.top = p.top + shiftY + "px";
    });
  }
}

function startGroupDrag(leader, clientX, clientY) {
  groupLeader = leader;
  isGroupDrag = true;

  dragGroup = collectSelectedGroup(leader);

  const base = Date.now();
  dragGroup
    .map((item) => ({ item, z: getZ(item.el) }))
    .sort((a, b) => a.z - b.z)
    .forEach((wrap, i) => {
      wrap.item.el.style.zIndex = String(base + i);
    });

  const r = leader.getBoundingClientRect();
  leaderGrabOffset.x = clientX - r.left;
  leaderGrabOffset.y = clientY - r.top;

  document.addEventListener("mousemove", onGroupMove);
  document.addEventListener("mouseup", onGroupUp);
}

function onGroupMove(e) {
  if (!isGroupDrag || !dragGroup || !groupLeader) return;
  lastGroupEvent = e;

  if (groupRAF) return;
  groupRAF = requestAnimationFrame(applyGroupMoveFrame);
}

function getSnapPosVirtual(activeEl, target, virtualPos) {
  const aW = activeEl.offsetWidth;
  const aH = activeEl.offsetHeight;

  const t = getLeftTop(target);

  return {
    left: t.left,
    top:  t.top + target.offsetHeight + GAP 
  };

}

function applyGroupMoveFrame() {
  groupRAF = 0;
  if (!lastGroupEvent || !isGroupDrag || !dragGroup || !groupLeader) return;

  const e = lastGroupEvent;
  const canvasRect = canvas.getBoundingClientRect();

  const leaderItem = dragGroup.find(i => i.el === groupLeader);
  if (!leaderItem) return;

  const rawLeaderLeft = e.clientX - canvasRect.left - leaderGrabOffset.x;
  const rawLeaderTop  = e.clientY - canvasRect.top  - leaderGrabOffset.y;

  const rawDx = rawLeaderLeft - leaderItem.startLeft;
  const rawDy = rawLeaderTop  - leaderItem.startTop;

  groupDx = rawDx;
  groupDy = rawDy;

  const exclude = new Set(dragGroup.map(x => x.el));
  const target = findBestSnapTarget(groupLeader, exclude);

  if (target) {
    const snapPos = getSnapPosVirtual(groupLeader, target, {
      left: leaderItem.startLeft + rawDx,
      top:  leaderItem.startTop  + rawDy
    });

    const snapDx = snapPos.left - (leaderItem.startLeft + rawDx);
    const snapDy = snapPos.top  - (leaderItem.startTop  + rawDy);

    groupDx = rawDx + snapDx;
    groupDy = rawDy + snapDy;
  }

  for (const item of dragGroup) {
    item.el.style.left = (item.startLeft + groupDx) + "px";
    item.el.style.top  = (item.startTop  + groupDy) + "px";
  }
}

function onGroupUp() {
  if (groupRAF) {
    cancelAnimationFrame(groupRAF);
    groupRAF = 0;
  }
  lastGroupEvent = null;

  if (!isGroupDrag || !dragGroup || !groupLeader) return;

  clampGroupToCanvas(dragGroup);

  const before = getLeftTop(groupLeader);
  const exclude = new Set(dragGroup.map(x => x.el));
  const target = findBestSnapTarget(groupLeader, exclude);

  if (target) {
    snapUnder(groupLeader, target);

    const after = getLeftTop(groupLeader);
    const ddx = after.left - before.left;
    const ddy = after.top - before.top;

    dragGroup.forEach((item) => {
      if (item.el === groupLeader) return;
      const p = getLeftTop(item.el);
      item.el.style.left = p.left + ddx + "px";
      item.el.style.top = p.top + ddy + "px";
    });

    clampGroupToCanvas(dragGroup);

  }

  isGroupDrag = false;
  dragGroup = null;
  groupLeader = null;

  document.removeEventListener("mousemove", onGroupMove);
  document.removeEventListener("mouseup", onGroupUp);
}

canvas.addEventListener("mousedown", (e) => {
  if (isSelecting) return;

  const block = e.target.closest(".placed-block");
  if (!block) return;

  if (e.target.closest("input, select, textarea, button")) return;

  e.preventDefault();

  if (block.classList.contains("selected")) {
    startGroupDrag(block, e.clientX, e.clientY);
  } else {
    clearAllSelected();
    block.classList.add("selected");
    selectedBlock = block;
    startDrag(block, e.clientX, e.clientY);
  }
});