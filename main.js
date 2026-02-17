const consoleEl = document.getElementById("console");
const consoleTextEl = document.getElementById("consoleText");
const headerEl = document.getElementById("consoleHeader");
const resizer = document.getElementById("consoleResizer");
const consoleBtnTop = document.getElementById("consoleBtn");
const consoleClearBtn = document.getElementById("consoleClear");
const consoleHideBtn = document.getElementById("consoleHide");
const consoleCloseBtn = document.getElementById("consoleClose");
const workspaceWrap = consoleEl.parentElement;

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









console.log({ consoleEl, headerEl, resizer });