const consoleEl = document.getElementById("console");
const consoleTextEl = document.getElementById("consoleText");

const consoleBtnTop = document.getElementById("consoleBtn");
const consoleClearBtn = document.getElementById("consoleClear");
const consoleHideBtn = document.getElementById("consoleHide");
const consoleCloseBtn = document.getElementById("consoleClose");

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
