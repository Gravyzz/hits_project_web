import { Interpreter } from './interpreter/interpreter.js';
import { BlockParser } from './interpreter/block-parser.js';
import type { InterpreterError } from './types/blocks.js';


const consoleEl = document.getElementById("console") as HTMLElement;
const consoleTextEl = document.getElementById("consoleText") as HTMLPreElement;
const headerEl = document.getElementById("consoleHeader") as HTMLElement;
const resizer = document.getElementById("consoleResizer") as HTMLElement;
const consoleBtnTop = document.getElementById("consoleBtn") as HTMLButtonElement;
const consoleClearBtn = document.getElementById("consoleClear") as HTMLButtonElement;
const consoleHideBtn = document.getElementById("consoleHide") as HTMLButtonElement;
const consoleCloseBtn = document.getElementById("consoleClose") as HTMLButtonElement;
const workspaceWrap = consoleEl.parentElement!;

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

export function consoleLog(msg: string) {
  consoleState.logs.push(String(msg));
  renderConsole();

  consoleTextEl.scrollTop = consoleTextEl.scrollHeight;
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

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

const _measureSpan = document.createElement('span');
_measureSpan.style.cssText = `
  position: absolute; visibility: hidden; white-space: pre;
  font-size: 12px; font-family: system-ui, sans-serif;
  padding: 0 8px; top: -9999px; left: -9999px;
`;
document.body.appendChild(_measureSpan);

function autoResizeInput(input: HTMLInputElement) {
  const text = input.value || input.placeholder || '';
  _measureSpan.textContent = text;
  const textWidth = _measureSpan.offsetWidth;
  const newWidth = Math.max(60, Math.min(400, textWidth + 8));
  input.style.width = newWidth + 'px';
}


function setupAutoResize(container: HTMLElement) {
  const inputs = container.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
  inputs.forEach(input => {
    input.addEventListener('input', () => autoResizeInput(input));
    if (input.value) {
      autoResizeInput(input);
    }
  });
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


consoleClearBtn.addEventListener("click", clearLogs);
consoleHideBtn.addEventListener("click", hideKeepLogs);
consoleCloseBtn.addEventListener("click", closeClearAndHide);

consoleBtnTop.addEventListener("click", () => {
  if (consoleState.visible) hideKeepLogs();
  else showConsole();
});

renderConsole();

const sizeState = {
  width: consoleEl.offsetWidth,
  height: consoleEl.offsetHeight,
};

function applyConsoleSize() {
  consoleEl.style.width = sizeState.width + "px";
  consoleEl.style.height = sizeState.height + "px";
}

let resizing = false;
let start: any = null;

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

let draggingConsole = false;
let dragStart: any = null;

headerEl.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if ((e.target as HTMLElement).closest("button")) return;

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

// ================== Console Input Handling ==================
let pendingInputResolve: ((value: string) => void) | null = null;
let inputElement: HTMLInputElement | null = null;

function createConsoleInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    pendingInputResolve = resolve;
    

    consoleLog(prompt);
    
    inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.placeholder = 'Введите значение и нажмите Enter...';
    inputElement.style.cssText = `
      width: 100%;
      padding: 8px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 4px;
      color: var(--text);
      font-family: inherit;
      margin-top: 8px;
    `;
    
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = inputElement!.value || '0';
        consoleLog(`> ${value}`);
        
        inputElement!.remove();
        inputElement = null;
        
        if (pendingInputResolve) {
          pendingInputResolve(value);
          pendingInputResolve = null;
        }
      }
    });
    

    consoleTextEl.parentElement!.appendChild(inputElement);
    inputElement.focus();
    
    if (!consoleState.visible) {
      showConsole();
    }
  });
}

const interpreter = new Interpreter();


interpreter.setCallbacks(

  (message: string) => {
    consoleLog(message);
  },
  
  async (prompt: string): Promise<string> => {
    return createConsoleInput(prompt);
  },
  

  (error: InterpreterError) => {
    consoleLog(`❌ Ошибка в блоке ${error.blockId}: ${error.message}`);
    highlightErrorBlock(error.blockId);
  }
);

function highlightErrorBlock(blockId: string) {

  document.querySelectorAll('.placed-block.error').forEach(block => {
    block.classList.remove('error');
  });

  const errorBlock = document.querySelector(`[data-id="${blockId}"]`);
  if (errorBlock) {
    errorBlock.classList.add('error');
  }
}

function clearErrorHighlights() {
  document.querySelectorAll('.placed-block.error').forEach(block => {
    block.classList.remove('error');
  });
}


const runBtn = document.querySelector('.btn-run') as HTMLButtonElement;
const debugBtn = document.getElementById('debugBtn') as HTMLButtonElement;

let isDebugging = false;
let debugStepBtn: HTMLButtonElement | null = null;
let debugContinueBtn: HTMLButtonElement | null = null;
let debugStopBtn: HTMLButtonElement | null = null;
let currentDebugBlock: HTMLElement | null = null;


runBtn.addEventListener('click', async () => {
  clearErrorHighlights();

  consoleLog('─────────────────── Новый запуск ───────────────────');
  consoleLog('🚀 Запуск программы...');
  
  try {
    const canvas = document.getElementById('canvas') as HTMLElement;
    const astNodes = BlockParser.parseFromCanvas(canvas);
    
    if (astNodes.length === 0) {
      consoleLog('⚠️ Нет блоков для выполнения');
      return;
    }
    
    consoleLog(`📊 Найдено блоков: ${astNodes.length}`);
    interpreter.setDebugMode(false);
    await interpreter.execute(astNodes);
    consoleLog('✅ Программа завершена');
    
  } catch (error) {
    consoleLog(`❌ Критическая ошибка: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Debug mode
debugBtn.addEventListener('click', async () => {
  if (isDebugging) {
    stopDebug();
    return;
  }
  
  clearErrorHighlights();

  consoleLog('─────────────────── Новый запуск ───────────────────');
  consoleLog('🐛 Запуск в режиме отладки...');
  
  try {
    const canvas = document.getElementById('canvas') as HTMLElement;
    const astNodes = BlockParser.parseFromCanvas(canvas);
    
    if (astNodes.length === 0) {
      consoleLog('⚠️ Нет блоков для выполнения');
      return;
    }
    
    startDebug();
    
    interpreter.setDebugMode(true, async (node, context) => {
      await onDebugStep(node, context);
    });
    
    consoleLog(`📊 Найдено блоков: ${astNodes.length}`);
    await interpreter.execute(astNodes);
    consoleLog('✅ Программа завершена');
    
  } catch (error) {
    consoleLog(`❌ Критическая ошибка: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    stopDebug();
  }
});

function startDebug() {
  isDebugging = true;
  debugBtn.textContent = '🛑 Stop Debug';
  debugBtn.style.background = '#ef4444';
  

  if (!debugStepBtn) {
    const actions = document.querySelector('.actions')!;
    
    debugStepBtn = document.createElement('button');
    debugStepBtn.className = 'btn';
    debugStepBtn.textContent = '➡️ Step';
    debugStepBtn.style.background = '#10b981';
    actions.appendChild(debugStepBtn);
    
    debugContinueBtn = document.createElement('button');
    debugContinueBtn.className = 'btn';
    debugContinueBtn.textContent = '▶️ Continue';
    debugContinueBtn.style.background = '#3b82f6';
    actions.appendChild(debugContinueBtn);
    
    debugStepBtn.addEventListener('click', () => {
      interpreter.debugStep();
    });
    
    debugContinueBtn.addEventListener('click', () => {
      interpreter.setDebugMode(false);
      interpreter.debugStep();
    });
  }
  
  if (debugStepBtn) debugStepBtn.style.display = 'inline-block';
  if (debugContinueBtn) debugContinueBtn.style.display = 'inline-block';
  
  showConsole();
}

function stopDebug() {
  isDebugging = false;
  debugBtn.textContent = '🐛 Debug';
  debugBtn.style.background = '#00bcd4';
  
  if (debugStepBtn) debugStepBtn.style.display = 'none';
  if (debugContinueBtn) debugContinueBtn.style.display = 'none';
  

  if (currentDebugBlock) {
    currentDebugBlock.classList.remove('debug-current');
    currentDebugBlock = null;
  }
}

async function onDebugStep(node: ASTNode, context: ExecutionContext) {
  if (currentDebugBlock) {
    currentDebugBlock.classList.remove('debug-current');
  }
  
  if (node.element) {
    currentDebugBlock = node.element;
    currentDebugBlock.classList.add('debug-current');
  }
  

  showVariableState(context);
}

function showVariableState(context: ExecutionContext) {
  let varsDisplay = '\n📋 Переменные:\n';
  

  for (const [name, value] of context.variables) {
    varsDisplay += `  ${name} (int): ${value}\n`;
  }
  

  for (const [name, value] of context.floatVariables) {
    varsDisplay += `  ${name} (float): ${value}\n`;
  }
  

  for (const [name, value] of context.stringVariables) {
    varsDisplay += `  ${name} (str): "${value}"\n`;
  }
  

  for (const [name, arr] of context.arrays) {
    varsDisplay += `  ${name} (array): [${arr.join(', ')}]\n`;
  }
  
  if (context.variables.size === 0 && context.floatVariables.size === 0 && 
      context.stringVariables.size === 0 && context.arrays.size === 0) {
    varsDisplay += '  (пусто)\n';
  }
  
  consoleLog(varsDisplay);
}


const canvas = document.getElementById("canvas") as HTMLElement;
const toolbox = document.querySelector(".toolbox") as HTMLElement;
const OVERSCROLL = 300;

let active: HTMLElement | null = null;
let offsetX = 0;
let offsetY = 0;

function getLeftTop(el: HTMLElement) {
  return {
    left: parseFloat(el.style.left) || 0,
    top: parseFloat(el.style.top) || 0,
  };
}

function getZ(el: HTMLElement) {
  const z = parseInt(el.style.zIndex, 10);
  return Number.isFinite(z) ? z : 0;
}

// ---- Snap helpers ----
function findBestSnapTarget(activeEl: HTMLElement, excludeSet: Set<HTMLElement> | null = null): HTMLElement | null {
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

  let best: { el: HTMLElement; d: number } | null = null;

  canvas.querySelectorAll(".placed-block").forEach((b) => {
    const block = b as HTMLElement;
    if (block === activeEl) return;
    if (excludeSet && excludeSet.has(block)) return;

    const { left: bx, top: by } = getLeftTop(block);
    const bW = block.offsetWidth;
    const bH = block.offsetHeight;

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
      if (!best || d < best.d) best = { el: block, d };
    }
  });

  return best ? best.el : null;
}

function getSnapPos(_activeEl: HTMLElement, targetEl: HTMLElement) {
  const { left: bx, top: by } = getLeftTop(targetEl);
  const y = by + targetEl.offsetHeight + GAP;

  let x = bx;
  
  if (targetEl.classList.contains("end")) x = bx - 40;
  else if (targetEl.classList.contains("start")) x = bx + 40;

  return { left: x, top: y };
}

function snapUnder(activeEl: HTMLElement, targetEl: HTMLElement) {
  const snapPos = getSnapPos(activeEl, targetEl);
  activeEl.style.left = snapPos.left + "px";
  activeEl.style.top = snapPos.top + "px";
}

// ==================== Marquee Selection ====================
let selectionBox: HTMLElement | null = null;
let startSelectionX = 0;
let startSelectionY = 0;
let isSelecting = false;

function onSelectMove(e: MouseEvent) {
  if (!isSelecting || !selectionBox) return;

  const canvasRect = canvas.getBoundingClientRect();

  const currentX = e.clientX - canvasRect.left;
  const currentY = e.clientY - canvasRect.top + workspaceWrap.scrollTop;

  const width = currentX - startSelectionX;
  const height = currentY - startSelectionY;

  selectionBox.style.width = Math.abs(width) + "px";
  selectionBox.style.height = Math.abs(height) + "px";
  selectionBox.style.left = (width < 0 ? currentX : startSelectionX) + "px";
  selectionBox.style.top = (height < 0 ? currentY : startSelectionY) + "px";
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

interface GroupItem {
  el: HTMLElement;
  startLeft: number;
  startTop: number;
}

let dragGroup: GroupItem[] | null = null;
let groupLeader: HTMLElement | null = null;
let leaderGrabOffset = { x: 0, y: 0 };
let isGroupDrag = false;

function collectSelectedGroup(leaderEl: HTMLElement): GroupItem[] {
  const selected = Array.from(canvas.querySelectorAll(".placed-block.selected")) as HTMLElement[];
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

function clampGroupToCanvas(group: GroupItem[]) {
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

  const overflowX = maxR - workspaceWrap.clientWidth;
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

function startGroupDrag(leader: HTMLElement, clientX: number, clientY: number) {
  isGroupDrag = true;
  groupLeader = leader;

  dragGroup = collectSelectedGroup(leader);

  const base = Date.now();
  dragGroup
    .map((item) => ({ item, z: getZ(item.el) }))
    .sort((a, b) => a.z - b.z)
    .forEach((wrap, i) => {
      wrap.item.el.style.zIndex = String(base + i);
      wrap.item.el.classList.add("group-dragging");
    });


  const canvasRect = canvas.getBoundingClientRect();
  leaderGrabOffset.x = clientX - canvasRect.left;
  leaderGrabOffset.y = clientY - canvasRect.top + workspaceWrap.scrollTop;

  document.addEventListener("mousemove", onGroupMove);
  document.addEventListener("mouseup", onGroupUp);
}

function onGroupMove(e: MouseEvent) {
  if (!isGroupDrag || !dragGroup || !groupLeader) return;

  const canvasRect = canvas.getBoundingClientRect();

  const curX = e.clientX - canvasRect.left;
  const curY = e.clientY - canvasRect.top + workspaceWrap.scrollTop;

  const dx = curX - leaderGrabOffset.x;
  const dy = curY - leaderGrabOffset.y;

  dragGroup.forEach(item => {
    item.el.style.left = (item.startLeft + dx) + "px";
    item.el.style.top  = (item.startTop  + dy) + "px";
  });
}

function onGroupUp() {
  if (!isGroupDrag || !dragGroup || !groupLeader) return;

  isGroupDrag = false;

  const target = findBestSnapTarget(groupLeader, new Set(dragGroup.map(x => x.el)));
  if (target) {
    target.dataset.next = groupLeader.dataset.id;
    groupLeader.dataset.prev = target.dataset.id;
  }

  dragGroup.forEach(item => {
    item.el.classList.remove("group-dragging");
    clampBlockToCanvas(item.el);
  });
  expandCanvasIfNeeded();

  dragGroup = null;
  groupLeader = null;

  document.removeEventListener("mousemove", onGroupMove);
  document.removeEventListener("mouseup", onGroupUp);
}


function startDrag(block: HTMLElement, clientX: number, clientY: number, presetOffsetX?: number, presetOffsetY?: number) {
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

function onMove(e: MouseEvent) {
  if (!active) return;

  const canvasRect = canvas.getBoundingClientRect();

  let x = e.clientX - canvasRect.left - offsetX;
  let y = e.clientY - canvasRect.top - offsetY + workspaceWrap.scrollTop;

  const maxX = workspaceWrap.clientWidth - active.offsetWidth;
  if (x < 0) x = 0;
  if (x > maxX) x = maxX;
  if (y < 0) y = 0;

  active.style.left = x + "px";
  active.style.top = y + "px";
}

function clampBlockToCanvas(el: HTMLElement) {
  let x = parseFloat(el.style.left) || 0;
  let y = parseFloat(el.style.top) || 0;
  const maxX = workspaceWrap.clientWidth - el.offsetWidth;
  if (x < 0) x = 0;
  if (x > maxX) x = maxX;
  if (y < 0) y = 0;
  el.style.left = x + "px";
  el.style.top  = y + "px";
}

function expandCanvasIfNeeded() {
  let maxBottom = 0;
  canvas.querySelectorAll(".placed-block").forEach(b => {
    const el = b as HTMLElement;
    const bottom = (parseFloat(el.style.top) || 0) + el.offsetHeight;
    if (bottom > maxBottom) maxBottom = bottom;
  });
  const needed = maxBottom + 400; 
  const current = parseInt(canvas.style.minHeight || '0', 10) || canvas.offsetHeight;
  if (needed > current) {
    canvas.style.minHeight = needed + "px";
  }
}

function onUp() {
  if (!active) return;

  const target = findBestSnapTarget(active);
  if (target) {
    snapUnder(active, target);
    target.dataset.next = active.dataset.id;
    active.dataset.prev = target.dataset.id;
  }

  // Не даём блоку уйти за левый/правый край
  clampBlockToCanvas(active);
  // Расширяем canvas вниз если нужно
  expandCanvasIfNeeded();

  active.classList.remove("dragging");
  active = null;

  document.removeEventListener("mousemove", onMove);
  document.removeEventListener("mouseup", onUp);
}

toolbox.addEventListener("mousedown", (e) => {
  const item = (e.target as HTMLElement).closest(".tool-item") as HTMLElement;
  if (!item) return;
  if ((e.target as HTMLElement).closest("input, select, textarea, button")) return;

  e.preventDefault();

  const clone = item.cloneNode(true) as HTMLElement;
  clone.classList.add("placed-block");
  clone.style.position = "absolute";

  clone.dataset.id = crypto.randomUUID();
  clone.dataset.prev = "";
  clone.dataset.next = "";

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "block-delete-btn";
  deleteBtn.innerHTML = "×";
  deleteBtn.title = "Удалить блок";
  deleteBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    clone.remove();
    if (selectedBlock === clone) selectedBlock = null;
  });
  clone.appendChild(deleteBtn);

  setupAutoResize(clone);

  canvas.appendChild(clone);

  const canvasRect = canvas.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const grabOffsetX = e.clientX - itemRect.left;
  const grabOffsetY = e.clientY - itemRect.top;
  const initLeft = e.clientX - canvasRect.left - grabOffsetX;
  const initTop  = e.clientY - canvasRect.top  - grabOffsetY + workspaceWrap.scrollTop;
  clone.style.left = initLeft + "px";
  clone.style.top  = initTop  + "px";

  clearAllSelected();
  clone.classList.add("selected");
  selectedBlock = clone;

  expandCanvasIfNeeded();


  startDrag(clone, e.clientX, e.clientY, grabOffsetX, grabOffsetY);
});


let selectedBlock: HTMLElement | null = null;
let suppressClick = false;

function clearAllSelected() {
  canvas.querySelectorAll(".placed-block.selected").forEach((b) => b.classList.remove("selected"));
}

canvas.addEventListener("mousedown", (e) => {
  if (e.target === canvas && e.button === 0) {
    isSelecting = true;
    const canvasRect = canvas.getBoundingClientRect();
    startSelectionX = e.clientX - canvasRect.left;
    startSelectionY = e.clientY - canvasRect.top + workspaceWrap.scrollTop;

    selectionBox = document.createElement("div");
    selectionBox.className = "selection-box";
    selectionBox.style.left = startSelectionX + "px";
    selectionBox.style.top = startSelectionY + "px";
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";
    if (!e.shiftKey) clearAllSelected();

    canvas.appendChild(selectionBox);

    document.addEventListener("mousemove", onSelectMove);
    document.addEventListener("mouseup", onSelectUp);
    return;
  }

  const block = (e.target as HTMLElement).closest(".placed-block") as HTMLElement;
  if (!block) return;
  if ((e.target as HTMLElement).closest("input, select, textarea, button")) return;

  e.preventDefault();


  const selectedBlocks = canvas.querySelectorAll(".placed-block.selected");
  if (selectedBlocks.length > 1 && block.classList.contains("selected")) {
    startGroupDrag(block, e.clientX, e.clientY);
    return;
  }

  if (!block.classList.contains("selected")) {
    clearAllSelected();
    block.classList.add("selected");
    selectedBlock = block;
  }

  startDrag(block, e.clientX, e.clientY);
});

canvas.addEventListener("click", (e) => {
  if (suppressClick) return;
  if ((e.target as HTMLElement).closest("input, select, textarea, button")) return;

  const block = (e.target as HTMLElement).closest(".placed-block") as HTMLElement;

  if (!block) {
    clearAllSelected();
    selectedBlock = null;
    return;
  }

  if ((e as MouseEvent).shiftKey) {
    block.classList.toggle("selected");
    selectedBlock = block.classList.contains("selected") ? block : selectedBlock;
    return;
  }

  clearAllSelected();
  block.classList.add("selected");
  selectedBlock = block;
});

canvas.addEventListener("contextmenu", (e) => {
  const block = (e.target as HTMLElement).closest(".placed-block") as HTMLElement;
  if (!block) return;
  e.preventDefault();
  block.remove();
  if (selectedBlock === block) selectedBlock = null;
});


document.addEventListener("keydown", (e) => {
  if (e.key !== "Delete" && e.key !== "Backspace") return;
  if (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;

  canvas.querySelectorAll(".placed-block.selected").forEach((b) => b.remove());
  selectedBlock = null;
});


const deleteAllBtn = document.getElementById("deleteAllBtn") as HTMLButtonElement;
deleteAllBtn?.addEventListener("click", () => {
  const blocks = canvas.querySelectorAll(".placed-block");
  if (blocks.length === 0) return;

  const confirmed = confirm("Are you sure you want to delete all blocks?");
  if (!confirmed) return;

  blocks.forEach((b) => b.remove());
  selectedBlock = null;
});

const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const loadBtn = document.getElementById('loadBtn') as HTMLButtonElement;


const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.vb.json';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

saveBtn.addEventListener('click', () => {
  const canvas = document.getElementById('canvas') as HTMLElement;
  const blocks = Array.from(canvas.querySelectorAll('.placed-block')) as HTMLElement[];
  
  if (blocks.length === 0) {
    consoleLog('⚠️ Нет блоков для сохранения');
    return;
  }
  
  const saveData = {
    version: 1,
    blocks: blocks.map(block => {
      const inputs: { [key: string]: string } = {};
      const inputElements = block.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
      
      inputElements.forEach(input => {
        if (input.placeholder) {
          inputs[input.placeholder] = input.value;
        }
      });
      
      const selectElement = block.querySelector('select') as HTMLSelectElement;
      const selectValue = selectElement ? selectElement.value : null;
      
      return {
        type: getBlockSaveType(block),
        classes: Array.from(block.classList),
        position: {
          left: parseFloat(block.style.left) || 0,
          top: parseFloat(block.style.top) || 0
        },
        inputs,
        select: selectValue
      };
    })
  };
  
  const jsonData = JSON.stringify(saveData, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `vibeblock_${new Date().toISOString().slice(0, 10)}.vb.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  consoleLog(`💾 Алгоритм сохранен (${blocks.length} блоков)`);
});

loadBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const saveData = JSON.parse(event.target?.result as string);
      loadAlgorithm(saveData);
    } catch (error) {
      consoleLog(`❌ Ошибка при загрузке файла: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  reader.readAsText(file);
});

function getBlockSaveType(block: HTMLElement): string {
  if (block.classList.contains('make-variable')) return 'make-variable';
  if (block.classList.contains('if-part')) return 'if-part';
  if (block.classList.contains('else-part')) return 'else-part';
  if (block.classList.contains('while-part')) return 'while-part';
  if (block.classList.contains('for-part')) return 'for-part';
  if (block.classList.contains('input-part')) return 'input-part';
  if (block.classList.contains('output-part')) return 'output-part';
  if (block.classList.contains('command-part')) return 'command-part';
  if (block.classList.contains('func-def-part')) return 'func-def-part';
  if (block.classList.contains('return-part')) return 'return-part';
  if (block.classList.contains('end-part-if')) return 'end-part-if';
  if (block.classList.contains('end-part-for')) return 'end-part-for';
  return 'unknown';
}

function loadAlgorithm(saveData: any) {
  if (!saveData.blocks || !Array.isArray(saveData.blocks)) {
    consoleLog('❌ Неверный формат файла');
    return;
  }
  
  const canvas = document.getElementById('canvas') as HTMLElement;
  

  const existingBlocks = canvas.querySelectorAll('.placed-block');
  existingBlocks.forEach(block => block.remove());
  

  let loadedCount = 0;
  
  saveData.blocks.forEach((blockData: any) => {
    try {
      const block = createBlockFromSaveData(blockData);
      if (block) {
        canvas.appendChild(block);
        loadedCount++;
      }
    } catch (error) {
      console.warn('Failed to load block:', error);
    }
  });
  
  consoleLog(`📂 Алгоритм загружен (${loadedCount} блоков)`);
  clearAllSelected();
}

function createBlockFromSaveData(blockData: any): HTMLElement | null {

  const toolbox = document.querySelector('.toolbox') as HTMLElement;
  let template: HTMLElement | null = null;
  

  const toolItems = toolbox.querySelectorAll('.tool-item') as NodeListOf<HTMLElement>;
  for (const item of toolItems) {
    if (item.classList.contains(blockData.type.replace('-part', '-part')) || 
        (blockData.type === 'make-variable' && item.classList.contains('make-variable')) ||
        (blockData.type === 'command-part' && item.classList.contains('command-part'))) {
      template = item;
      break;
    }
  }
  
  if (!template) {
    console.warn(`Template not found for block type: ${blockData.type}`);
    return null;
  }
  

  const block = template.cloneNode(true) as HTMLElement;
  block.classList.add('placed-block');
  block.style.position = 'absolute';
  block.style.left = blockData.position.left + 'px';
  block.style.top = blockData.position.top + 'px';
  

  block.dataset.id = crypto.randomUUID();
  block.dataset.prev = "";
  block.dataset.next = "";
    const inputs = block.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
  inputs.forEach(input => {
    if (input.placeholder && blockData.inputs[input.placeholder]) {
      input.value = blockData.inputs[input.placeholder];
    }
  });

  const select = block.querySelector('select') as HTMLSelectElement;
  if (select && blockData.select) {
    select.value = blockData.select;
  }
  

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "block-delete-btn";
  deleteBtn.innerHTML = "×";
  deleteBtn.title = "Удалить блок";
  deleteBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    block.remove();
    if (selectedBlock === block) selectedBlock = null;
  });
  block.appendChild(deleteBtn);

  setupAutoResize(block);
  
  return block;
}

showConsole();