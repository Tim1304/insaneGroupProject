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
let fistButton = null;

export function initBattleSystem(scene, playerController) {
  sceneRef = scene;
  playerRef = playerController;

  //Battle Trigger: Right now when dialog box is clicked
  window.addEventListener("dialog-update", onDialogUpdate);

  //Attack Trigger
  window.addEventListener("player-attack", onPlayerAttack);
  window.addEventListener("bow-shot", onBowShot);

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

function onPlayerAttack(e) {
  if (!inBattle) return;
  const detail = e.detail || {};
  const pos = detail.pos; 
  const range = Number(detail.range) || 0;
  const dmg = Number(detail.dmg) || 0;

  if (!banditId) return;
  const npc = getNPCs().find((n) => n.id === banditId);
  if (!npc || !npc.mesh) return;

  try {
    const dx = npc.mesh.position.x - pos.x;
    const dy = npc.mesh.position.y - pos.y;
    const dz = npc.mesh.position.z - pos.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq <= range * range) {
      banditHP -= dmg;
      console.log(`player-attack hit bandit for ${dmg}. banditHP=${banditHP}`);
      if (banditHP <= 0) endBattle(true);
    }
  } catch (err) {
  }
}

function onBowShot(e) {
  if (!inBattle) return;
  const d = e.detail || {};
  const pos = d.pos;
  const dir = d.dir;
  const dmg = Number(d.dmg) || 0;

  if (!pos || !dir) return;
  if (!banditId) return;

  const npc = getNPCs().find((n) => n.id === banditId);
  if (!npc || !npc.mesh) return;

  try {
    // Vector from shot to NPC
    const vx = npc.mesh.position.x - pos.x;
    const vy = npc.mesh.position.y - pos.y;
    const vz = npc.mesh.position.z - pos.z;
    const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1e-6;
    const nx = vx / len;
    const ny = vy / len;
    const nz = vz / len;

    // Computes dot
    const dot = dir.x * nx + dir.y * ny + dir.z * nz;

    // Angle threshold
    const threshold = 0.98; // ~11 degrees

    // Max distance
    const maxDist = 50;

    if (dot >= threshold && len <= maxDist) {
      banditHP -= dmg;
      console.log(`bow-shot hit bandit for ${dmg}. banditHP=${banditHP}`);
      flashNPC(npc, 0xff0000, 150);
      if (banditHP <= 0) endBattle(true);
    } else {
      console.log(`bow-shot missed (dot=${dot.toFixed(3)} distance=${len.toFixed(2)})`);
    }
  } catch (err) {
    // ignore
  }
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
  createFistButton();
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

function createFistButton() {
  if (fistButton) return;

  fistButton = document.createElement("button");
  fistButton.innerText = "Fist";
  fistButton.style.position = "fixed";
  fistButton.style.bottom = "24px";
  fistButton.style.left = "110px";
  fistButton.style.padding = "12px 18px";
  fistButton.style.fontSize = "16px";
  fistButton.style.zIndex = "2000";
  fistButton.style.pointerEvents = "auto";

  fistButton.addEventListener("click", onFistClick);

  document.body.appendChild(fistButton);
}

function removeSwordButton() {
  if (!swordButton) return;
  swordButton.removeEventListener("click", onSwordClick);
  if (swordButton.parentElement) swordButton.parentElement.removeChild(swordButton);
  swordButton = null;
  if (fistButton) {
    fistButton.removeEventListener("click", onFistClick);
    if (fistButton.parentElement) fistButton.parentElement.removeChild(fistButton);
    fistButton = null;
  }
}

function onSwordClick() {
  if (!inBattle) return;

  // Sword: 20 damage
  const dmg = 20;
  const range = 5.0;

  applyDamageToBanditIfInRange(dmg, range);
}

function onFistClick() {
  if (!inBattle) return;

  // Fist attack: 10 damage 
  const dmg = 10;
  const range = 2.5;

  applyDamageToBanditIfInRange(dmg, range);
}

function applyDamageToBanditIfInRange(dmg, range) {
  if (!banditId || !playerRef) return;
  const npc = getNPCs().find((n) => n.id === banditId);
  if (!npc || !npc.mesh) return;

  try {
    const px = playerRef.mesh.position.x;
    const py = playerRef.mesh.position.y;
    const pz = playerRef.mesh.position.z;
    const dx = npc.mesh.position.x - px;
    const dy = npc.mesh.position.y - py;
    const dz = npc.mesh.position.z - pz;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq <= range * range) {
      banditHP -= dmg;
      console.log(`Button attack hit bandit for ${dmg}. banditHP=${banditHP}`);
      flashNPC(npc, 0xff0000, 150);
      if (banditHP <= 0) endBattle(true);
    } else {
      console.log(`Button attack missed (range=${range}).`);
    }
  } catch (err) {
  }
}

function flashNPC(npc, colorHex, ms) {
  if (!npc || !npc.mesh || !npc.mesh.material || !npc.mesh.material.color) return;
  try {
    const prev = npc.mesh.material.color.getHex();
    npc.mesh.material.color.set(colorHex);
    setTimeout(() => {
      try {
        npc.mesh.material.color.set(prev);
      } catch (e) {}
    }, ms);
  } catch (e) {}
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
