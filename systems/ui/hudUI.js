// systems/ui/hudUI.js

let rootRef = null;
let playerRef = null;
let playerStatsRef = null;

let crosshair = null;
let hudContainer = null;
let goldLabel = null;
let scoreLabel = null;

export function initHUDUI(rootElement, playerController, playerStats) {
  rootRef = rootElement;
  playerRef = playerController;
  playerStatsRef = playerStats || null;

  createCrosshair();
  createGoldScoreHUD();
  setupEventListeners();

  console.log("HUD UI initialized (crosshair + gold/score).");
}

function createCrosshair() {
  crosshair = document.createElement("div");
  crosshair.style.position = "absolute";
  crosshair.style.left = "50%";
  crosshair.style.top = "50%";
  crosshair.style.transform = "translate(-50%, -50%)";
  crosshair.style.pointerEvents = "none";
  crosshair.style.zIndex = "1000";

  crosshair.style.width = "6px";
  crosshair.style.height = "6px";
  crosshair.style.borderRadius = "50%";
  crosshair.style.background = "white";
  crosshair.style.boxShadow = "0 0 4px rgba(0,0,0,0.8)";

  rootRef.appendChild(crosshair);
}

function createGoldScoreHUD() {
  hudContainer = document.createElement("div");
  hudContainer.style.position = "absolute";
  hudContainer.style.top = "16px";
  hudContainer.style.left = "16px";
  hudContainer.style.display = "flex";
  hudContainer.style.flexDirection = "column";
  hudContainer.style.gap = "4px";
  hudContainer.style.pointerEvents = "none";
  hudContainer.style.zIndex = "900";
  hudContainer.style.color = "#ffffff";
  hudContainer.style.textShadow = "0 0 4px rgba(0,0,0,0.9)";
  hudContainer.style.fontSize = "14px";

  goldLabel = document.createElement("div");
  scoreLabel = document.createElement("div");

  const initialGold =
    playerStatsRef && typeof playerStatsRef.getGold === "function"
      ? playerStatsRef.getGold()
      : 0;
  const initialScore =
    playerStatsRef && typeof playerStatsRef.getScore === "function"
      ? playerStatsRef.getScore()
      : 0;

  goldLabel.textContent = `Gold: ${initialGold}`;
  scoreLabel.textContent = `Score: ${initialScore}`;

  hudContainer.appendChild(goldLabel);
  hudContainer.appendChild(scoreLabel);
  rootRef.appendChild(hudContainer);
}

function setupEventListeners() {
  // Hide crosshair during dialog
  window.addEventListener("dialog-start", () => {
    if (crosshair) crosshair.style.display = "none";
  });

  window.addEventListener("dialog-end", () => {
    if (crosshair) crosshair.style.display = "block";
  });

  window.addEventListener("player-gold-changed", (e) => {
    if (!goldLabel) return;
    const gold = (e.detail && e.detail.gold) ?? 0;
    goldLabel.textContent = `Gold: ${gold}`;
  });

  window.addEventListener("player-score-changed", (e) => {
    if (!scoreLabel) return;
    const score = (e.detail && e.detail.score) ?? 0;
    scoreLabel.textContent = `Score: ${score}`;
  });
}

export function updateHUDUI(dt) {
  // nothing per-frame for now
}
