// systems/battleSystem.js
// Simple battle system: player vs a bandit NPC.
// - Both start with 100 HP
// - Player sword deals 20 damage per click
// - Battle is triggered when dialog with bandit reaches the 'thanks' node

import { getNPCs, setNPCHostile } from "./npcSystem.js";

let sceneRef = null;
let playerRef = null;

let inBattle = false;
let playerHP = 100;
let banditHP = 100;
let banditId = null;
let swordButton = null;

export function initBattleSystem(scene, playerController) {
  sceneRef = scene;
  playerRef = playerController;

  //Battle Trigger: Right now when dialog box is clicked
  window.addEventListener("dialog-update", onDialogUpdate);

  console.log("Battle system initialized.");
}

function onDialogUpdate(e) {
  try {
    const detail = e.detail || {};
    const dialogId = detail.dialogId;
    const node = detail.node || null;
    const npcId = detail.npcId || null;

    if (!dialogId || !node) return;

    if (dialogId === "bandit" && node.id === "thanks") {
      startBattle(npcId);
    }
  } catch (err) {
    console.warn("battleSystem: onDialogUpdate error", err);
  }
}

export function updateBattleSystem(dt) {
}

function startBattle(npcIdParam) {
  if (inBattle) return;

  inBattle = true;
  playerHP = 100;
  banditHP = 100;
  banditId = npcIdParam || null;

  console.log("Battle started against:", banditId);

  // Mark the NPC as hostile (so other systems can react later)
  if (banditId) setNPCHostileSafe(banditId, true);

  createSwordButton();
  highlightBanditMesh(true);
}

function endBattle(won) {
  console.log("Battle ended. Player won:", !!won);
  removeSwordButton();
  highlightBanditMesh(false);

  // If the bandit died, mark talkable=false / remove mesh
  if (won && banditId) {
    const npc = getNPCs().find((n) => n.id === banditId);
    if (npc) {
      if (npc.mesh && sceneRef) sceneRef.remove(npc.mesh);
      npc.talkable = false;
      npc.hostile = false;
    }
  }

  // Reset state
  inBattle = false;
  banditId = null;
  banditHP = 0;
}

// Sword attack button
function createSwordButton() {
  if (swordButton) return;

  swordButton = document.createElement("button");
  swordButton.innerText = "Sword";
  swordButton.style.position = "fixed";
  swordButton.style.bottom = "24px";
  swordButton.style.left = "24px";
  swordButton.style.padding = "12px 18px";
  swordButton.style.fontSize = "16px";
  swordButton.style.zIndex = "2000";
  swordButton.style.pointerEvents = "auto";

  swordButton.addEventListener("click", onSwordClick);

  document.body.appendChild(swordButton);
}

function removeSwordButton() {
  if (!swordButton) return;
  swordButton.removeEventListener("click", onSwordClick);
  if (swordButton.parentElement) swordButton.parentElement.removeChild(swordButton);
  swordButton = null;
}

function onSwordClick() {
  if (!inBattle) return;

  // Each click deals 20 damage
  const dmg = 20;
  banditHP -= dmg;
  console.log(`Player attacks bandit for ${dmg}. banditHP=${banditHP}`);

  if (banditHP <= 0) {
    endBattle(true);
  }
}

function highlightBanditMesh(on) {
  if (!banditId) return;
  const npc = getNPCs().find((n) => n.id === banditId);
  if (!npc || !npc.mesh) return;

  try {
    if (on) {
      if (npc.mesh.material && npc.mesh.material.color)
        npc.mesh.material.color.set(0xff4444);
    } else {
      if (npc.mesh.material && npc.mesh.material.color)
        npc.mesh.material.color.set(0xaa3333);
    }
  } catch (err) {
  }
}

function setNPCHostileSafe(id, hostile) {
  try {
    setNPCHostile(id, hostile);
  } catch (err) {
  }
}

export function isInBattle() {
  return inBattle;
}
