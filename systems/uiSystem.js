// systems/uiSystem.js

let rootElement = null;
let playerControllerRef = null;

export function initUISystem(domElement, playerController) {
  rootElement = domElement;
  playerControllerRef = playerController;
  console.log("UI system initialized (stub).");
}

export function updateUISystem(dt) {
  // TODO: In-game HUD, weapon icons, health bars, dialog boxes, etc. later.
}
