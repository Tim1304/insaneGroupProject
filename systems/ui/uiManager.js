// systems/ui/uiManager.js

import {
  initPlayerStatusUI,
  updatePlayerStatusUI,
} from "./playerStatusUI.js";
import {
  initDialogUI,
  updateDialogUI,
} from "./dialogUI.js";
import { initHUDUI, updateHUDUI } from "./hudUI.js";

let domRef = null;
let playerRef = null;
let playerStatsRef = null;

let uiRoot = null;

// Stats panel (Tab)
let statsPanel = null;
let statsOpen = false;

// basic resources
let statsHealthEl = null;
let statsStaminaEl = null;
let statsGoldEl = null;
let statsScoreEl = null;

// leveled stats
let statsSpeedEl = null;
let statsStrengthEl = null;
let statsHandEyeEl = null;
let statsHealthLevelEl = null;


// Inventory panel (I)
let inventoryPanel = null;
let inventoryOpen = false;
let invHandSlot = null;
let invSwordSlot = null;
let invBowSlot = null;

export function initUIManager(domElement, playerController, playerStats) {
  domRef = domElement;
  playerRef = playerController;
  playerStatsRef = playerStats;

  createUIRoot();

  initPlayerStatusUI(uiRoot, playerStatsRef);
  initDialogUI(uiRoot);
  initHUDUI(uiRoot, playerRef, playerStatsRef);

  createStatsPanel();
  createInventoryPanel();
  setupKeyHandlers();
  setupInventoryListeners();

  console.log("UI Manager initialized.");
}

function createUIRoot() {
  if (uiRoot) return;

  uiRoot = document.createElement("div");
  uiRoot.style.position = "fixed";
  uiRoot.style.left = "0";
  uiRoot.style.top = "0";
  uiRoot.style.width = "100%";
  uiRoot.style.height = "100%";
  uiRoot.style.pointerEvents = "none";
  uiRoot.style.zIndex = "1000";
  uiRoot.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  document.body.appendChild(uiRoot);
}

function setupKeyHandlers() {
  document.addEventListener("keydown", (e) => {
    if (e.code === "Tab") {
      e.preventDefault();
      toggleStatsPanel();
    } else if (e.code === "KeyI") {
      toggleInventoryPanel();
    }
  });
}

function createStatsPanel() {
  statsPanel = document.createElement("div");
  statsPanel.style.position = "absolute";
  statsPanel.style.left = "50%";
  statsPanel.style.top = "15%";
  statsPanel.style.transform = "translateX(-50%)";
  statsPanel.style.minWidth = "260px";
  statsPanel.style.padding = "12px 16px";
  statsPanel.style.borderRadius = "10px";
  statsPanel.style.background = "rgba(0,0,0,0.8)";
  statsPanel.style.border = "1px solid rgba(255,255,255,0.15)";
  statsPanel.style.boxShadow = "0 8px 24px rgba(0,0,0,0.7)";
  statsPanel.style.color = "#ffffff";
  statsPanel.style.fontSize = "14px";
  statsPanel.style.pointerEvents = "none";
  statsPanel.style.display = "none";
  statsPanel.style.zIndex = "1500";

  const title = document.createElement("div");
  title.textContent = "Player Stats";
  title.style.fontWeight = "600";
  title.style.marginBottom = "8px";
  title.style.color = "#ffd27f";

  // basic resource values
  statsHealthEl = document.createElement("div");
  statsStaminaEl = document.createElement("div");
  statsGoldEl = document.createElement("div");
  statsScoreEl = document.createElement("div");

  // divider
  const divider = document.createElement("div");
  divider.style.margin = "6px 0";
  divider.style.height = "1px";
  divider.style.background = "rgba(255,255,255,0.15)";

  // leveled stat values
  statsSpeedEl = document.createElement("div");
  statsStrengthEl = document.createElement("div");
  statsHandEyeEl = document.createElement("div");
  statsHealthLevelEl = document.createElement("div");

  statsPanel.appendChild(title);

  // top section: raw values
  statsPanel.appendChild(statsHealthEl);
  statsPanel.appendChild(statsStaminaEl);
  statsPanel.appendChild(statsGoldEl);
  statsPanel.appendChild(statsScoreEl);

  // separator
  statsPanel.appendChild(divider);

  // bottom section: leveled stats (speed/strength/handEye/health)
  statsPanel.appendChild(statsSpeedEl);
  statsPanel.appendChild(statsStrengthEl);
  statsPanel.appendChild(statsHandEyeEl);
  statsPanel.appendChild(statsHealthLevelEl);

  uiRoot.appendChild(statsPanel);
  refreshStatsPanel();
}


function refreshStatsPanel() {
  if (!playerStatsRef) return;
  if (!statsPanel || !statsHealthEl) return;

  // --- basic values (HP, stamina, gold, score) ---
  const health =
    typeof playerStatsRef.getHealth === "function"
      ? playerStatsRef.getHealth()
      : 0;
  const stamina =
    typeof playerStatsRef.getStamina === "function"
      ? playerStatsRef.getStamina()
      : 0;
  const gold =
    typeof playerStatsRef.getGold === "function"
      ? playerStatsRef.getGold()
      : 0;
  const score =
    typeof playerStatsRef.getScore === "function"
      ? playerStatsRef.getScore()
      : 0;

  statsHealthEl.textContent = `Health (HP): ${Math.round(health)}`;
  statsStaminaEl.textContent = `Stamina: ${Math.round(stamina)}`;
  statsGoldEl.textContent = `Gold: ${gold}`;
  statsScoreEl.textContent = `Score: ${score}`;

  // --- leveled stats (speed, strength, handEye, health) ---
  // uses playerStatsPlaceholder.getStatLevel(statName)
  const getLevel =
    typeof playerStatsRef.getStatLevel === "function"
      ? playerStatsRef.getStatLevel.bind(playerStatsRef)
      : null;

  if (getLevel) {
    const speedLevel = getLevel("speed");
    const strengthLevel = getLevel("strength");
    const handEyeLevel = getLevel("handEye");
    const healthLevel = getLevel("health");

    if (statsSpeedEl) {
      statsSpeedEl.textContent = `Speed Lv ${speedLevel}`;
    }
    if (statsStrengthEl) {
      statsStrengthEl.textContent = `Strength Lv ${strengthLevel}`;
    }
    if (statsHandEyeEl) {
      statsHandEyeEl.textContent = `Hand-Eye Lv ${handEyeLevel}`;
    }
    if (statsHealthLevelEl) {
      statsHealthLevelEl.textContent = `Health Stat Lv ${healthLevel}`;
    }
  } else {
    // fallback text if for some reason getStatLevel doesn't exist
    if (statsSpeedEl) statsSpeedEl.textContent = "Speed Lv ?";
    if (statsStrengthEl) statsStrengthEl.textContent = "Strength Lv ?";
    if (statsHandEyeEl) statsHandEyeEl.textContent = "Hand-Eye Lv ?";
    if (statsHealthLevelEl) statsHealthLevelEl.textContent = "Health Stat Lv ?";
  }
}


function toggleStatsPanel() {
  if (!statsPanel) return;
  statsOpen = !statsOpen;
  statsPanel.style.display = statsOpen ? "block" : "none";

  if (statsOpen) {
    refreshStatsPanel();
  }
}

function createInventoryPanel() {
  inventoryPanel = document.createElement("div");
  inventoryPanel.style.position = "absolute";
  inventoryPanel.style.right = "16px";
  inventoryPanel.style.bottom = "16px";
  inventoryPanel.style.minWidth = "260px";
  inventoryPanel.style.padding = "12px 16px";
  inventoryPanel.style.borderRadius = "10px";
  inventoryPanel.style.background = "rgba(5,5,5,0.9)";
  inventoryPanel.style.border = "1px solid rgba(255,255,255,0.15)";
  inventoryPanel.style.boxShadow = "0 8px 24px rgba(0,0,0,0.7)";
  inventoryPanel.style.color = "#ffffff";
  inventoryPanel.style.fontSize = "14px";
  inventoryPanel.style.pointerEvents = "auto"; // clickable
  inventoryPanel.style.display = "none";
  inventoryPanel.style.zIndex = "1500";

  const title = document.createElement("div");
  title.textContent = "Inventory (Weapons)";
  title.style.fontWeight = "600";
  title.style.marginBottom = "8px";
  title.style.color = "#cce6ff";

  const grid = document.createElement("div");
  grid.style.display = "flex";
  grid.style.gap = "8px";

  invHandSlot = createWeaponSlot("hand", "Fists (1)");
  invSwordSlot = createWeaponSlot("sword", "Sword (2)");
  invBowSlot = createWeaponSlot("bow", "Bow (3)");

  grid.appendChild(invHandSlot);
  grid.appendChild(invSwordSlot);
  grid.appendChild(invBowSlot);

  inventoryPanel.appendChild(title);
  inventoryPanel.appendChild(grid);
  uiRoot.appendChild(inventoryPanel);

  refreshInventoryPanel();
}

function createWeaponSlot(type, label) {
  const slot = document.createElement("div");
  slot.dataset.weaponType = type;
  slot.style.flex = "1 1 0";
  slot.style.minWidth = "70px";
  slot.style.padding = "8px 6px";
  slot.style.borderRadius = "8px";
  slot.style.border = "1px solid rgba(255,255,255,0.15)";
  slot.style.background = "rgba(30,30,30,0.95)";
  slot.style.display = "flex";
  slot.style.flexDirection = "column";
  slot.style.alignItems = "center";
  slot.style.justifyContent = "center";
  slot.style.fontSize = "12px";
  slot.style.textAlign = "center";
  slot.style.cursor = "pointer";
  slot.style.pointerEvents = "auto";

  const nameLabel = document.createElement("div");
  nameLabel.textContent = label;
  nameLabel.style.marginBottom = "4px";

  const stateLabel = document.createElement("div");
  stateLabel.style.fontSize = "11px";
  stateLabel.style.opacity = "0.8";
  stateLabel.textContent = "N/A";

  slot.appendChild(nameLabel);
  slot.appendChild(stateLabel);

  slot.addEventListener("click", () => {
    if (!playerStatsRef || !playerStatsRef.ownsWeapon || !playerStatsRef.equipWeapon) return;

    if (!playerStatsRef.ownsWeapon(type)) {
      console.log(`[Inventory] You don't own ${type} yet.`);
      return;
    }

    playerStatsRef.equipWeapon(type);
    refreshInventoryPanel();
  });

  slot._stateLabel = stateLabel;
  return slot;
}

function refreshInventoryPanel() {
  if (!playerStatsRef) return;
  if (!inventoryPanel) return;

  const owns =
    typeof playerStatsRef.getOwnedWeapons === "function"
      ? playerStatsRef.getOwnedWeapons()
      : { hand: true };
  const equipped =
    typeof playerStatsRef.getEquippedWeapon === "function"
      ? playerStatsRef.getEquippedWeapon()
      : "hand";

  function styleSlot(slot, type) {
    if (!slot || !slot._stateLabel) return;
    const owned = !!owns[type];
    const isEquipped = equipped === type;

    if (!owned && type !== "hand") {
      slot._stateLabel.textContent = "Locked";
      slot._stateLabel.style.color = "#ff8080";
      slot.style.opacity = "0.4";
      slot.style.borderColor = "rgba(255,255,255,0.15)";
    } else {
      slot.style.opacity = "1.0";
      if (isEquipped) {
        slot._stateLabel.textContent = "Equipped";
        slot._stateLabel.style.color = "#a4ffb0";
        slot.style.borderColor = "#a4ffb0";
        slot.style.boxShadow = "0 0 10px rgba(164,255,176,0.6)";
      } else {
        slot._stateLabel.textContent = owned ? "Owned" : "Default";
        slot._stateLabel.style.color = "#ffffff";
        slot.style.borderColor = "rgba(255,255,255,0.3)";
        slot.style.boxShadow = "none";
      }
    }
  }

  styleSlot(invHandSlot, "hand");
  styleSlot(invSwordSlot, "sword");
  styleSlot(invBowSlot, "bow");
}

function setupInventoryListeners() {
  window.addEventListener("player-weapon-changed", () => {
    if (inventoryOpen) refreshInventoryPanel();
  });

  window.addEventListener("player-weapons-updated", () => {
    if (inventoryOpen) refreshInventoryPanel();
  });

  window.addEventListener("player-gold-changed", () => {
    if (statsOpen) refreshStatsPanel();
  });

  window.addEventListener("player-score-changed", () => {
    if (statsOpen) refreshStatsPanel();
  });
}

function toggleInventoryPanel() {
  if (!inventoryPanel) return;
  inventoryOpen = !inventoryOpen;
  inventoryPanel.style.display = inventoryOpen ? "block" : "none";

  if (inventoryOpen) {
    refreshInventoryPanel();
  }
}

export function updateUIManager(dt) {
  if (!playerStatsRef) return;

  updatePlayerStatusUI(dt);
  updateDialogUI(dt);
  updateHUDUI(dt);

  if (statsOpen) {
    refreshStatsPanel();
  }
}
