// systems/ui/dialogUI.js

let container = null;
let playerRef = null;

export function initDialogUI(rootElement, playerController) {
  playerRef = playerController;

  container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "50%";
  container.style.bottom = "10%";
  container.style.transform = "translateX(-50%)";
  container.style.pointerEvents = "none";
  container.style.color = "#ffffff";
  container.style.fontSize = "14px";
  container.style.maxWidth = "60%";
  container.style.textAlign = "center";
  container.style.textShadow = "0 0 4px rgba(0,0,0,0.9)";
  container.style.display = "none"; // hidden until dialogs are active

  rootElement.appendChild(container);
}

export function updateDialogUI(dt) {
  // Later we'll read from dialogSystem.js for active dialog text.
}
