// systems/ui/weaponUI.js

let container = null;
let playerRef = null;
let playerStatsRef = null;

export function initWeaponUI(rootElement, playerController, playerStats) {
  playerRef = playerController;
  playerStatsRef = playerStats;

  // We'll implement this later: weapon icon / text, ammo, etc.
  // Keep a simple container ready.
  container = document.createElement("div");
  container.style.position = "absolute";
  container.style.right = "20px";
  container.style.bottom = "20px";
  container.style.pointerEvents = "none";
  container.style.color = "#ffffff";
  container.style.fontSize = "14px";
  container.style.textShadow = "0 0 4px rgba(0,0,0,0.9)";
  container.textContent = ""; // empty for now

  rootElement.appendChild(container);
}

export function updateWeaponUI(dt) {
  // TODO: hook into playerRef.getWeapon() later.
}
