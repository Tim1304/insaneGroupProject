// systems/battleSystem.js
// Simple battle system: player vs a hostile NPC.
// - Player attacks any current hostile target (enemyId) with melee or bow
// - Enemies damage the player via the "enemy-attack-player" event
// - Battle starts when an NPC becomes hostile (via dialog) and a dialog-update fires

import { getNPCs, setNPCHostile, spawnRandomMonster } from "./npcSystem.js";

let sceneRef = null;
let playerRef = null;
let playerStatsRef = null;

let inBattle = false;
let playerHP = 100;
let enemyHP = 100;
let enemyId = null;
let swordButton = null;
let fistButton = null;

// Difficulty scaling
let difficultyLevel = 1;
let enemiesDefeated = 0;

/**
 * Initialize the battle system.
 * @param {THREE.Scene} scene
 * @param {object} playerController
 * @param {object} playerStats - object from createPlayerStats()
 */
export function initBattleSystem(scene, playerController, playerStats) {
  sceneRef = scene;
  playerRef = playerController;
  playerStatsRef = playerStats || null;

  window.addEventListener("dialog-update", onDialogUpdate);
  window.addEventListener("player-attack", onPlayerAttack);
  window.addEventListener("bow-shot", onBowShot);
  window.addEventListener("enemy-attack-player", onEnemyAttackPlayer);

  console.log("Battle system initialized.");
}

export function updateBattleSystem(dt) {
  // currently nothing per-frame
}

/**
 * When dialog changes, check if the associated NPC is hostile; if so, start battle.
 */
function onDialogUpdate(e) {
  try {
    const detail = e.detail || {};
    const npcId = detail.npcId || null;
    if (!npcId) return;

    const npc = getNPCs().find((n) => n.id === npcId);
    if (!npc || !npc.mesh) return;

    if (npc.hostile && !inBattle) {
      startBattle(npcId);
    }
  } catch (err) {
    console.warn("battleSystem: onDialogUpdate error", err);
  }
}

/**
 * Player melee attack event from placeholder controller.
 * detail: { pos: {x,y,z}, range: number, dmg: number }
 */
function onPlayerAttack(e) {
  if (!inBattle) return;
  const d = e.detail || {};
  const pos = d.pos;
  const range = Number(d.range) || 0;
  const dmg = Number(d.dmg) || 0;
  if (!pos || range <= 0 || dmg <= 0) return;
  if (!enemyId) return;

  const npc = getNPCs().find((n) => n.id === enemyId);
  if (!npc || !npc.mesh) return;

  try {
    const dx = npc.mesh.position.x - pos.x;
    const dy = npc.mesh.position.y - pos.y;
    const dz = npc.mesh.position.z - pos.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq <= range * range) {
      applyDamageToEnemy(dmg, npc);
    }
  } catch (err) {
    console.warn("battleSystem: onPlayerAttack error", err);
  }
}

/**
 * Player bow shot event (hitscan style).
 * detail: { pos: {x,y,z}, dir: {x,y,z}, dmg: number }
 */
function onBowShot(e) {
  if (!inBattle) return;
  const d = e.detail || {};
  const origin = d.pos;
  const dirInput = d.dir;
  const dmg = Number(d.dmg) || 0;

  if (!origin || !dirInput || dmg <= 0) return;
  if (!enemyId) return;

  const npc = getNPCs().find((n) => n.id === enemyId);
  if (!npc || !npc.mesh) return;

  try {
    const enemyPos = npc.mesh.position;

    const vx = enemyPos.x - origin.x;
    const vy = enemyPos.y - origin.y;
    const vz = enemyPos.z - origin.z;

    const lenDir =
      Math.sqrt(
        dirInput.x * dirInput.x +
          dirInput.y * dirInput.y +
          dirInput.z * dirInput.z
      ) || 1e-6;
    const dx = dirInput.x / lenDir;
    const dy = dirInput.y / lenDir;
    const dz = dirInput.z / lenDir;

    const t = vx * dx + vy * dy + vz * dz;

    if (t < 0) return;

    const MAX_BOW_RANGE = 30;
    if (t > MAX_BOW_RANGE) return;

    const cx = origin.x + dx * t;
    const cy = origin.y + dy * t;
    const cz = origin.z + dz * t;

    const ddx = enemyPos.x - cx;
    const ddy = enemyPos.y - cy;
    const ddz = enemyPos.z - cz;
    const distToRaySq = ddx * ddx + ddy * ddy + ddz * ddz;

    const hitRadius = 1.5;
    if (distToRaySq <= hitRadius * hitRadius) {
      applyDamageToEnemy(dmg, npc);
    }
  } catch (err) {
    console.warn("battleSystem: onBowShot error", err);
  }
}

/**
 * Called when an NPC AI wants to damage the player.
 * detail: { npcId, dmg }
 */
function onEnemyAttackPlayer(e) {
  const detail = e.detail || {};
  const dmg = Number(detail.dmg) || 0;
  const npcId = detail.npcId || null;
  if (dmg <= 0) return;

  playerTakeDamage(dmg, npcId);
}

/**
 * Begin a battle with a specific NPC id (any hostile NPC).
 */
function startBattle(npcIdParam) {
  if (inBattle) return;

  inBattle = true;

  if (playerStatsRef && typeof playerStatsRef.getHealth === "function") {
    playerHP = Number(playerStatsRef.getHealth()) || 0;
  } else {
    playerHP = 100;
  }

  // Scale enemy HP based on type + difficulty
  let baseHP = 100;
  const npc = npcIdParam ? getNPCs().find((n) => n.id === npcIdParam) : null;
  if (npc) {
    switch (npc.type) {
      case "melee":
        baseHP = 80;
        break;
      case "bow":
        baseHP = 70;
        break;
      case "tank":
        baseHP = 120;
        break;
      default:
        baseHP = 100;
        break;
    }
  }

  const multiplier = 1 + (difficultyLevel - 1) * 0.5; // +50% HP per difficulty step
  enemyHP = Math.round(baseHP * multiplier);

  enemyId = npcIdParam || null;

  console.log(
    `Battle started against: ${enemyId} (baseHP=${baseHP}, difficulty=${difficultyLevel}, enemyHP=${enemyHP})`
  );

  if (enemyId) setNPCHostileSafe(enemyId, true);

  createSwordButton();
  createFistButton();
  highlightEnemyMesh(true);
}

/**
 * End battle. If won === true, enemy is removed.
 */
function endBattle(won) {
  console.log("Battle ended. Player won:", !!won);

  let npc = null;
  if (enemyId) {
    npc = getNPCs().find((n) => n.id === enemyId) || null;
  }

  // Rewards + difficulty scaling + monster generator
  if (won && npc) {
    grantEnemyDefeatRewards(npc);
  }

  removeSwordButton();
  removeFistButton();
  highlightEnemyMesh(false);

  if (won && npc) {
    if (npc.mesh && sceneRef) sceneRef.remove(npc.mesh);
    npc.talkable = false;
    npc.hostile = false;
  }

  inBattle = false;
  enemyId = null;
  enemyHP = 0;
}

// --- enemy damage & rewards ---

function applyDamageToEnemy(dmg, npc) {
  enemyHP -= dmg;
  console.log(`Player hit ${npc.id} for ${dmg}. enemyHP=${enemyHP}`);
  flashNPC(npc, 0xff0000, 150);
  if (enemyHP <= 0) {
    endBattle(true);
  }
}

function grantEnemyDefeatRewards(npc) {
  if (!playerStatsRef) return;

  const type = npc.type || "melee";

  let goldMin = 5;
  let goldMax = 10;
  let scoreGain = 10;

  switch (type) {
    case "melee":
      goldMin = 5;
      goldMax = 10;
      scoreGain = 10;
      break;
    case "bow":
      goldMin = 8;
      goldMax = 14;
      scoreGain = 12;
      break;
    case "tank":
      goldMin = 10;
      goldMax = 18;
      scoreGain = 15;
      break;
    default:
      break;
  }

  const goldBase = goldMin + Math.random() * (goldMax - goldMin);
  const goldMultiplier = 1 + (difficultyLevel - 1) * 0.25;
  const goldDrop = Math.round(goldBase * goldMultiplier);

  if (typeof playerStatsRef.addGold === "function") {
    playerStatsRef.addGold(goldDrop);
  }
  if (typeof playerStatsRef.addScore === "function") {
    playerStatsRef.addScore(scoreGain);
  }

  enemiesDefeated += 1;

  if (enemiesDefeated > 0 && enemiesDefeated % 3 === 0) {
    difficultyLevel += 1;
    console.log(
      `[BattleSystem] Difficulty increased to ${difficultyLevel} after ${enemiesDefeated} kills.`
    );
  }

  // Monster generator: spawn a new monster for the next fight
  try {
    spawnRandomMonster(difficultyLevel);
  } catch (err) {
    console.warn("battleSystem: spawnRandomMonster failed", err);
  }

  console.log(
    `[BattleSystem] Rewards: +${goldDrop} gold, +${scoreGain} score (difficulty ${difficultyLevel})`
  );
}

// --- UI Buttons for player melee attacks (debug) ---

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
  if (swordButton && swordButton.parentElement) {
    swordButton.parentElement.removeChild(swordButton);
    swordButton = null;
  }
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

function removeFistButton() {
  if (fistButton && fistButton.parentElement) {
    fistButton.parentElement.removeChild(fistButton);
    fistButton = null;
  }
}

function onSwordClick() {
  if (!inBattle || !playerRef) return;

  const dmg = 20;
  const range = 5.0;

  applyButtonMelee(dmg, range);
}

function onFistClick() {
  if (!inBattle || !playerRef) return;

  const dmg = 10;
  const range = 2.5;

  applyButtonMelee(dmg, range);
}

function applyButtonMelee(dmg, range) {
  if (!enemyId || !playerRef) return;
  const npc = getNPCs().find((n) => n.id === enemyId);
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
      applyDamageToEnemy(dmg, npc);
    } else {
      console.log("Button melee missed.");
    }
  } catch (err) {
    console.warn("battleSystem: applyButtonMelee error", err);
  }
}

// --- Visual helpers ---

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

function highlightEnemyMesh(on) {
  if (!enemyId) return;
  const npc = getNPCs().find((n) => n.id === enemyId);
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
    console.warn("battleSystem: highlightEnemyMesh error", err);
  }
}

// --- Player HP handling ---

export function playerTakeDamage(amount, sourceNpcId) {
  const dmg = Math.max(0, Number(amount) || 0);
  if (dmg <= 0) return;

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
    playerHP = Math.max(0, playerHP - dmg);
  }

  console.log(
    `Player took ${dmg} damage` +
      (sourceNpcId ? ` from ${sourceNpcId}` : "") +
      `. playerHP=${playerHP}`
  );

  if (playerHP <= 0) {
    endBattle(false);
    // TODO: proper death/respawn system
  }
}

function setNPCHostileSafe(id, hostile) {
  try {
    setNPCHostile(id, hostile);
  } catch (err) {
    console.warn("battleSystem: setNPCHostileSafe error", err);
  }
}

export function isInBattle() {
  return inBattle;
}
