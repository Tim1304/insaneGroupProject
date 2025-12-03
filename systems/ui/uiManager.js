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

export function initUIManager(domElement, playerController, playerStats) {
  domRef = domElement;
  playerRef = playerController;
  playerStatsRef = playerStats;

  createUIRoot();

  initPlayerStatusUI(uiRoot, playerStatsRef);
  initDialogUI(uiRoot);
  initHUDUI(uiRoot, playerRef, playerStatsRef);

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

export function updateUIManager(dt) {
  if (!playerStatsRef) return;

  updatePlayerStatusUI(dt);
  updateDialogUI(dt);
  updateHUDUI(dt);
}
