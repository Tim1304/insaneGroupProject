// systems/battleSystem.js
// Simple battle system: player vs a bandit NPC.
// - Both start with 100 HP
// - Player sword deals 20 damage per click
// - Battle is triggered when NPC becomes hostile

import { getNPCs, setNPCHostile } from "./npcSystem.js";

let sceneRef = null;
let playerRef = null;
let playerStatsRef = null;

let inBattle = false;
let playerHP = 100;
let banditHP = 100;
let banditId = null;
let swordButton = null;
let fistButton = null;

export function initBattleSystem(scene, playerController, playerStats) {
  sceneRef = scene;
  playerRef = playerController;
  playerStatsRef = playerStats || null;

  // Battle trigger: driven by dialog updates + NPC hostility
  window.addEventListener("dialog-update", onDialogUpdate);

  // Attack triggers
  window.addEventListener("player-attack", onPlayerAttack);
  window.addEventListener("bow-shot", onBowShot);

  console.log("Battle system initialized.");
}

function onDialogUpdate(e) {
  try {
    const detail = e.detail || {};
    const npcId = detail.npcId || null;

    if (!npcId) return;

    // Look up this NPC and check if it is hostile.
    const npc = getNPCs().find((n) => n.id === npcId);
    if (!npc) return;

    // Battle is now triggered purely by hostility, not by a specific dialog node.
    if (npc.hostile && !inBattle) {
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
    // Check distance from attack position to NPC
    const { x, y, z } = npc.mesh.position;
    const dx = x - pos.x;
    const dy = y - pos.y;
    const dz = z - pos.z;
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

function onBowShot(e) {
  if (!inBattle) return;
  const detail = e.detail || {};
  const pos = detail.pos;
  const dir = detail.dir;
  const dmg = Number(detail.dmg) || 0;
  const maxDist = Number(detail.maxDist) || 0;

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

    // dot with direction
    const dot = nx * dir.x + ny * dir.y + nz * dir.z;
    const dist = len;

    if (dot > 0.99 && dist <= maxDist) {
      banditHP -= dmg;
      console.log(`bow-shot hit bandit for ${dmg}. banditHP=${banditHP}`);
      flashNPC(npc, 0xff0000, 150);
      if (banditHP <= 0) endBattle(true);
    } else {
      console.log(
        `bow-shot missed (dot=${dot.toFixed(3)} distance=${len.toFixed(2)})`
      );
    }
  } catch (err) {
    // ignore
  }
}

function startBattle(npcIdParam) {
  if (inBattle) return;

  inBattle = true;
  // Initialize playerHP from stats if available; fall back to 100.
  if (playerStatsRef && typeof playerStatsRef.getHealth === "function") {
    playerHP = Number(playerStatsRef.getHealth()) || 0;
  } else {
    playerHP = 100;
  }
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
  removeFistButton();
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
  swordButton.textContent = "Sword Attack";
  swordButton.style.position = "absolute";
  swordButton.style.bottom = "20px";
  swordButton.style.left = "20px";
  swordButton.style.padding = "8px 16px";
  swordButton.style.zIndex = "2000";

  swordButton.addEventListener("click", () => {
    if (!inBattle) return;
    try {
      const playerPos =
        playerRef && typeof playerRef.getPosition === "function"
          ? playerRef.getPosition()
          : { x: 0, y: 0, z: 0 };

      const evt = new CustomEvent("player-attack", {
        detail: {
          pos: { x: playerPos.x, y: playerPos.y, z: playerPos.z },
          range: 3,
          dmg: 20,
        },
      });
      window.dispatchEvent(evt);
    } catch (err) {
    }
  });

  document.body.appendChild(swordButton);
}

function removeSwordButton() {
  if (swordButton && swordButton.parentElement) {
    swordButton.parentElement.removeChild(swordButton);
  }
  swordButton = null;
}

// Fist attack button (example of another attack type)
function createFistButton() {
  if (fistButton) return;

  fistButton = document.createElement("button");
  fistButton.textContent = "Punch";
  fistButton.style.position = "absolute";
  fistButton.style.bottom = "20px";
  fistButton.style.left = "140px";
  fistButton.style.padding = "8px 16px";
  fistButton.style.zIndex = "2000";

  fistButton.addEventListener("click", () => {
    if (!inBattle) return;
    try {
      const playerPos =
        playerRef && typeof playerRef.getPosition === "function"
          ? playerRef.getPosition()
          : { x: 0, y: 0, z: 0 };

      const evt = new CustomEvent("player-attack", {
        detail: {
          pos: { x: playerPos.x, y: playerPos.y, z: playerPos.z },
          range: 2,
          dmg: 10,
        },
      });
      window.dispatchEvent(evt);
    } catch (err) {
    }
  });

  document.body.appendChild(fistButton);
}

function removeFistButton() {
  if (fistButton && fistButton.parentElement) {
    fistButton.parentElement.removeChild(fistButton);
  }
  fistButton = null;
}

function flashNPC(npc, color, ms) {
  if (!npc || !npc.mesh) return;
  try {
    const mat = npc.mesh.material;
    if (!mat || !mat.color) return;

    const prev = mat.color.getHex();
    mat.color.set(color);

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
      if (npc.mesh.material && npc.mesh.material.color) {
        npc._prevColor = npc.mesh.material.color.getHex();
        npc.mesh.material.color.set(0xff0000);
      }
    } else if (npc._prevColor != null) {
      npc.mesh.material.color.set(npc._prevColor);
      npc._prevColor = null;
    }
  } catch (err) {
  }
}

/**
 * Apply damage to the player, synced with the shared playerStats object.
 * This is intended to be called by NPC AI or other systems.
 *
 * @param {number} amount - Raw damage amount (positive).
 * @param {string} [sourceNpcId] - Optional id of the NPC causing damage.
 */
export function playerTakeDamage(amount, sourceNpcId) {
  const dmg = Math.max(0, Number(amount) || 0);
  if (dmg <= 0) return;

  // Prefer the shared playerStats object if available.
  if (playerStatsRef && typeof playerStatsRef.damage === "function") {
    try {
      playerStatsRef.damage(dmg);
      if (typeof playerStatsRef.getHealth === "function") {
        playerHP = Number(playerStatsRef.getHealth()) || playerHP;
      } else {
        playerHP = Math.max(0, playerHP - dmg);
      }
    } catch (err) {
      console.warn("battleSystem: error applying damage via playerStatsRef", err);
      playerHP = Math.max(0, playerHP - dmg);
    }
  } else {
    // Fallback if stats system isn't wired: maintain our local HP only.
    playerHP = Math.max(0, playerHP - dmg);
  }

  console.log(
    `Player took ${dmg} damage` +
      (sourceNpcId ? ` from ${sourceNpcId}` : "") +
      `. playerHP=${playerHP}`
  );

  if (playerHP <= 0) {
    // Player lost the battle.
    endBattle(false);
    // TODO: hook into a proper "player dead / respawn" system once available.
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
