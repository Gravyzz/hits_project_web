const consoleEl = document.getElementById("console");
const consoleTextEl = document.getElementById("consoleText");
const headerEl = document.getElementById("consoleHeader");
const resizer = document.getElementById("consoleResizer");
const consoleBtnTop = document.getElementById("consoleBtn");
const consoleClearBtn = document.getElementById("consoleClear");
const consoleHideBtn = document.getElementById("consoleHide");
const consoleCloseBtn = document.getElementById("consoleClose");
const workspaceWrap = consoleEl.parentElement;

const GAP = 5;  
const MAGNET = 70;    

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

  // текущие координаты в координатах viewport -> переводим в координаты workspaceWrap
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

// Drag & Drop для VibeBlock (кастомный)
// - из toolbox: создаём копию и тащим (курсор держит ту же точку)
// - на canvas: тащим уже размещённые блоки
// - клики по input/select внутри блока НЕ запускают drag

const canvas = document.getElementById('canvas');
const toolbox = document.querySelector('.toolbox');
const OVERSCROLL = 30; // насколько можно вылезать за края во время drag

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

// Найти лучший "якорь" для active: куда его приклеить (под какой блок)
function findBestSnapTarget(activeEl) {
  const { left: ax, top: ay } = getLeftTop(activeEl);
  const aW = activeEl.offsetWidth;
  const aH = activeEl.offsetHeight;

  // точка "верх середина" активного блока
  const aTopMid = { x: ax + aW / 2, y: ay };

  let best = null;

  canvas.querySelectorAll('.placed-block').forEach((b) => {
    if (b === activeEl) return;

    const { left: bx, top: by } = getLeftTop(b);
    const bW = b.offsetWidth;
    const bH = b.offsetHeight;

    // точка "низ середина" блока-цели
    const bBottomMid = { x: bx + bW / 2, y: by + bH };

    const d = distance(aTopMid, bBottomMid);

    // плюс условие: по X должны быть более-менее в одной колонке
    const xClose = Math.abs((ax + aW / 2) - (bx + bW / 2)) <= 80;

    if (d <= MAGNET && xClose) {
      if (!best || d < best.d) best = { el: b, d };
    }
  });

  return best ? best.el : null;
}

function snapUnder(activeEl, targetEl) {
  const { left: bx, top: by } = getLeftTop(targetEl);
  const y = by + targetEl.offsetHeight + GAP;

  // магнитим по X (колонка)
  activeEl.style.left = bx + 'px';
  activeEl.style.top  = y + 'px';
}



function startDrag(block, clientX, clientY, presetOffsetX, presetOffsetY) {
  active = block;
  active.classList.add('dragging');

  // используем смещение "где схватили"
  if (typeof presetOffsetX === 'number' && typeof presetOffsetY === 'number') {
    offsetX = presetOffsetX;
    offsetY = presetOffsetY;
  } else {
    // для перетаскивания уже размещённого блока
    const r = active.getBoundingClientRect();
    offsetX = clientX - r.left;
    offsetY = clientY - r.top;
  }

  // поднимаем блок наверх
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

  // "мягкий" clamp: можно чуть выйти за границу
  if (x < minX) x = minX;
  if (y < minY) y = minY;
  if (x > maxX) x = maxX;
  if (y > maxY) y = maxY;

  active.style.left = x + 'px';
  active.style.top  = y + 'px';
}

function onUp() {
  if (!active) return;

  // 1) Сначала строго возвращаем внутрь canvas
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

  // 2) Потом пробуем магнит
  const target = findBestSnapTarget(active);
  if (target) {
    snapUnder(active, target);

    // связь (опционально)
    target.dataset.next = active.dataset.id;
    active.dataset.prev = target.dataset.id;

    // 3) на всякий случай ещё раз зажмём (если snap поставил близко к краю)
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

// 1) Drag из TOOLBOX -> создаём копию в CANVAS
toolbox.addEventListener('mousedown', (e) => {
  const item = e.target.closest('.tool-item');
  if (!item) return;

  // не начинаем drag, если клик по интерактивным элементам
  if (e.target.closest('input, select, textarea, button')) return;

  e.preventDefault();

  const clone = item.cloneNode(true);
  clone.classList.add('placed-block');
  clone.style.position = 'absolute';
  
  clone.dataset.id = crypto.randomUUID();
  clone.dataset.prev = "";
  clone.dataset.next = "";  

  // фиксируем ширину как в панели (чтобы не растягивался на canvas)
  clone.style.width = item.getBoundingClientRect().width + 'px';

  // смещение клика внутри оригинального элемента (где "схватили")
  const itemRect = item.getBoundingClientRect();
  const grabOffsetX = e.clientX - itemRect.left;
  const grabOffsetY = e.clientY - itemRect.top;

  canvas.appendChild(clone);

  // ставим клон так, чтобы курсор держал ту же точку
  const canvasRect = canvas.getBoundingClientRect();
  clone.style.left = (e.clientX - canvasRect.left - grabOffsetX) + 'px';
  clone.style.top  = (e.clientY - canvasRect.top  - grabOffsetY) + 'px';

  // начинаем перетаскивание с уже известными offset'ами
  startDrag(clone, e.clientX, e.clientY, grabOffsetX, grabOffsetY);
});

// 2) Drag по CANVAS -> двигаем существующий placed-block
canvas.addEventListener('mousedown', (e) => {
  const block = e.target.closest('.placed-block');
  if (!block) return;

  // позволяем ввод в input/select без драга
  if (e.target.closest('input, select, textarea, button')) return;

  e.preventDefault();
  startDrag(block, e.clientX, e.clientY);
});





//------block delete--------
let selectedBlock = null;

// выбор блока кликом
canvas.addEventListener('mousedown', (e) => {
  const block = e.target.closest('.placed-block');

  // кликнули в пустое место — снять выделение
  if (!block) {
    if (selectedBlock) selectedBlock.classList.remove('selected');
    selectedBlock = null;
    return;
  }

  // если кликаем по input/select — не меняем выделение
  if (e.target.closest('input, select, textarea, button')) return;

  if (selectedBlock) selectedBlock.classList.remove('selected');
  selectedBlock = block;
  selectedBlock.classList.add('selected');
});

// удаление по Delete/Backspace
document.addEventListener('keydown', (e) => {
  if (!selectedBlock) return;
  if (e.key !== 'Delete' && e.key !== 'Backspace') return;

  // чтобы случайно не удалить, пока печатаешь в input
  if (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;

  selectedBlock.remove();
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