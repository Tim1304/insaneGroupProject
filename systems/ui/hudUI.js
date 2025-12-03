// systems/ui/hudUI.js

let rootRef = null;
let playerRef = null;

let crosshair = null;

export function initHUDUI(rootElement, playerController) {
  rootRef = rootElement;
  playerRef = playerController;

  createCrosshair();
  setupEventListeners();

  console.log("HUD UI initialized (crosshair only).");
}

function createCrosshair() {
  crosshair = document.createElement("div");
  crosshair.style.position = "absolute";
  crosshair.style.left = "50%";
  crosshair.style.top = "50%";
  crosshair.style.transform = "translate(-50%, -50%)";
  crosshair.style.pointerEvents = "none";
  crosshair.style.zIndex = "1000";

  // Small dot crosshair
  crosshair.style.width = "6px";
  crosshair.style.height = "6px";
  crosshair.style.borderRadius = "50%";
  crosshair.style.background = "white";
  crosshair.style.boxShadow = "0 0 4px rgba(0,0,0,0.8)";

  rootRef.appendChild(crosshair);
}

function setupEventListeners() {
  // Hide crosshair during dialog
  window.addEventListener("dialog-start", () => {
    if (crosshair) crosshair.style.display = "none";
  });

  window.addEventListener("dialog-end", () => {
    if (crosshair) crosshair.style.display = "block";
  });
}

export function updateHUDUI(dt) {
  // No quest marker or dynamic HUD elements right now.
}
