// systems/ui/deathUI.js
// Minecraft-style death screen UI.
// This file ONLY handles the visuals. No game logic.

let deathRoot = null;
let scoreTextEl = null;
let isVisible = false;

/**
 * Initialize the death UI overlay.
 * Call this once from uiManager.
 * @param {HTMLElement} [parent] - Optional parent element; if omitted, uses document.body
 */
export function initDeathUI(parent) {
  if (deathRoot) return; // already initialized

  const host =
    (parent && parent.parentElement) ||
    document.body;

  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "0";
  root.style.top = "0";
  root.style.width = "100%";
  root.style.height = "100%";
  root.style.display = "none"; // hidden by default
  root.style.alignItems = "center";
  root.style.justifyContent = "center";
  root.style.flexDirection = "column";
  root.style.background =
    "rgba(0, 0, 0, 0.75)"; // dark overlay
  root.style.zIndex = "9999";
  root.style.pointerEvents = "auto";
  root.style.fontFamily = "system-ui, sans-serif";

  // Title text: "You Died"
  const title = document.createElement("div");
  title.innerText = "You died";
  title.style.fontSize = "48px";
  title.style.fontWeight = "700";
  title.style.color = "#ff5555";
  title.style.textShadow = "0 0 16px rgba(0,0,0,0.8)";
  title.style.marginBottom = "16px";
  root.appendChild(title);

  // Score text
  const score = document.createElement("div");
  score.innerText = "Score: 0";
  score.style.fontSize = "24px";
  score.style.color = "#ffffff";
  score.style.marginBottom = "32px";
  score.style.textShadow = "0 0 8px rgba(0,0,0,0.7)";
  root.appendChild(score);
  scoreTextEl = score;

  // Restart button
  const btn = document.createElement("button");
  btn.innerText = "Restart";
  btn.style.padding = "12px 24px";
  btn.style.fontSize = "18px";
  btn.style.borderRadius = "4px";
  btn.style.border = "none";
  btn.style.cursor = "pointer";
  btn.style.background = "#ffffff";
  btn.style.color = "#111111";
  btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";

  btn.addEventListener("click", () => {
    // simplest: full restart
    window.location.reload();
  });

  root.appendChild(btn);

  host.appendChild(root);
  deathRoot = root;
}

/**
 * Show the death screen with a given score.
 * @param {number} score
 */
export function showDeathUI(score) {
  if (!deathRoot) {
    // in case someone forgot to call initDeathUI()
    initDeathUI();
  }

  // Exit pointer lock so mouse can click button
  try {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  } catch (e) {
    // ignore
  }

  if (scoreTextEl) {
    const s = Number.isFinite(score) ? score : 0;
    scoreTextEl.innerText = `Score: ${s}`;
  }

  deathRoot.style.display = "flex";
  isVisible = true;
}

/**
 * Hide the death screen (if you ever add respawn instead of reload).
 */
export function hideDeathUI() {
  if (!deathRoot) return;
  deathRoot.style.display = "none";
  isVisible = false;
}
