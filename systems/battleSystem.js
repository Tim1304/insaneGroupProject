// systems/battleSystem.js
// Simple battle system: player vs a hostile NPC.
// - Player attacks any current hostile target (enemyId) with melee or bow
// - Enemies damage the player via the "enemy-attack-player" event
// - Battle starts when an NPC becomes hostile (via dialog) and a dialog-update fires

import {
  getNPCs,
  setNPCHostile,
  spawnRandomMonster,
  getInDungeonMode,
} from "./npcSystem.js";

let sceneRef = null;
let playerRef = null;
let playerStatsRef = null;

let inBattle = false;
let playerHP = 100;
let enemyHP = 100;
let enemyId = null;

function ensureNPCStats(npc) {
  if (!npc) return null;

  // NPC stats mirror the player stat structure:
  //   speed:   { level, jumpsSinceLevel }
  //   strength:{ level, killsSinceLevel }
  //   handEye: { level, killsSinceLevel }
  //   health:  { level, killsSinceLevel }
  if (!npc.stats) {
    npc.stats = {
      speed:   { level: 1, jumpsSinceLevel: 0 },
      strength:{ level: 1, killsSinceLevel: 0 },
      handEye: { level: 1, killsSinceLevel: 0 },
      health:  { level: 1, killsSinceLevel: 0 },
    };
  }
  return npc.stats;
}


let swordButton = null;
let fistButton = null;

// Difficulty scaling
let difficultyLevel = 1;
let enemiesDefeated = 0;

const BOW_AUTO_LOCK_RANGE = 30.0;


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

function findNearestHostileInRange(pos, range) {
  const npcs = getNPCs();
  let best = null;
  let bestDistSq = range * range;

  for (const npc of npcs) {
    if (!npc || !npc.mesh) continue;
    if (!npc.hostile) continue;     // only lock onto hostile enemies

    const dx = npc.mesh.position.x - pos.x;
    const dy = npc.mesh.position.y - pos.y;
    const dz = npc.mesh.position.z - pos.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = npc;
    }
  }

  return best;
}


/**
 * Player melee attack event from placeholder controller.
 * detail: { pos: {x,y,z}, range: number, dmg: number }
 */
function onPlayerAttack(e) {
  const d = e.detail || {};
  const pos = d.pos;
  const range = Number(d.range) || 0;
  const dmg = Number(d.dmg) || 0;

  if (!pos || range <= 0 || dmg <= 0) return;

  // 1) If we are NOT in battle yet, try to auto-lock a hostile enemy in range.
  if (!inBattle) {
    const target = findNearestHostileInRange(pos, range);
    if (!target) {
      // swung at air, nothing to hit
      return;
    }

    // start a new battle with this enemy
    startBattle(target.id);
  }

  // 2) Now we should have enemyId set by startBattle (or already in battle)
  if (!enemyId) return;

  const npc = getNPCs().find((n) => n.id === enemyId);
  if (!npc || !npc.mesh) return;

  const dx = npc.mesh.position.x - pos.x;
  const dy = npc.mesh.position.y - pos.y;
  const dz = npc.mesh.position.z - pos.z;
  const distSq = dx * dx + dy * dy + dz * dz;

  // 3) If enemy is in melee range, apply damage.
  if (distSq <= range * range) {
    applyDamageToEnemy(dmg, npc);
  }
}


/**
 * Player bow shot event (hitscan style).
 * detail: { pos: {x,y,z}, dir: {x,y,z}, dmg: number }
 */
function onBowShot(e) {
  const d = e.detail || {};
  const origin = d.pos;
  const dirInput = d.dir;
  const dmg = Number(d.dmg) || 0;

  if (!origin || !dirInput || dmg <= 0) return;

  // If we're not already in battle, try to auto-lock a hostile in front
  // of the arrow origin within some reasonable range.
  if (!inBattle) {
    const target = findNearestHostileInRange(origin, BOW_AUTO_LOCK_RANGE);
    if (!target) {
      return;
    }
    startBattle(target.id);
  }

  if (!enemyId) return;

  const npc = getNPCs().find((n) => n.id === enemyId);
  if (!npc || !npc.mesh) return;

  const enemyPos = npc.mesh.position;
  const toEnemy = enemyPos.clone().sub(origin);
  const distAlongDir = toEnemy.dot(dirInput);

  if (distAlongDir < 0) {
    // enemy is behind the shot direction
    return;
  }

  const closestPoint = origin
    .clone()
    .add(dirInput.clone().multiplyScalar(distAlongDir));
  const separation = enemyPos.distanceTo(closestPoint);

  const hitRadius = 1.2;
  if (separation <= hitRadius) {
    applyDamageToEnemy(dmg, npc);
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
/**
 * Begin a battle with a specific NPC id (any hostile NPC).
 */
function startBattle(npcIdParam) {
  if (inBattle) return;

  inBattle = true;

  // --- initialize player HP from playerStats ---
  if (playerStatsRef && typeof playerStatsRef.getHealth === "function") {
    playerHP = Number(playerStatsRef.getHealth()) || 0;
  } else {
    playerHP = 100;
  }

  enemyId = npcIdParam || null;

  // --- look up the NPC and make sure it has stats attached ---
  const npc = enemyId ? getNPCs().find((n) => n.id === enemyId) : null;
  const stats = npc ? ensureNPCStats(npc) : null;

  // --- base HP by type (same as before) ---
  let baseHP = 100;
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

  // --- health stat level from npc.stats.health.level ---
  let healthLevel = 1;
  if (stats && stats.health && typeof stats.health.level === "number") {
    healthLevel = stats.health.level;
  }

  // difficulty scaling (same as before)
  const difficultyMultiplier = 1 + (difficultyLevel - 1) * 0.5;

  // final enemy HP: type base * healthLevel * difficulty
  enemyHP = Math.round(baseHP * healthLevel * difficultyMultiplier);

  // also store current HP on the npc's stats object so it actually has health
  if (stats && stats.health) {
    stats.health.currentHP = enemyHP;
  }

  console.log(
    `Battle started against: ${enemyId} (baseHP=${baseHP}, healthLevel=${healthLevel}, difficulty=${difficultyLevel}, enemyHP=${enemyHP})`
  );

  if (enemyId) setNPCHostileSafe(enemyId, true);

  createSwordButton();
  createFistButton();
  highlightEnemyMesh(true);
}

// --- rewards for killing an enemy ---

function rewardForKill(npc) {
  if (!playerStatsRef || !npc) return;

  // Base rewards by NPC type
  let goldBase = 8;
  let scoreBase = 10;

  switch (npc.type) {
    case "melee":
      goldBase = 8;
      scoreBase = 10;
      break;
    case "bow":
      goldBase = 10;
      scoreBase = 12;
      break;
    case "tank":
      goldBase = 12;
      scoreBase = 15;
      break;
    default:
      goldBase = 6;
      scoreBase = 8;
      break;
  }

  // Small random variation so drops aren't all identical
  const gold = Math.round(goldBase * (0.8 + Math.random() * 0.4));
  const score = Math.round(scoreBase);

  if (typeof playerStatsRef.addGold === "function") {
    playerStatsRef.addGold(gold);
  }
  if (typeof playerStatsRef.addScore === "function") {
    playerStatsRef.addScore(score);
  }

  console.log(
    `Reward for killing ${npc.id} (type=${npc.type}): +${gold} gold, +${score} score`
  );
}


/**
 * End battle. If won === true, enemy is removed.
 */
function endBattle(won) {
  console.log("Battle ended. Player won:", !!won);
  removeSwordButton();
  removeFistButton();
  highlightEnemyMesh(false);

  if (won && enemyId) {
    const npc = getNPCs().find((n) => n.id === enemyId);
    if (npc) {
      // Give rewards BEFORE removing the NPC
      rewardForKill(npc);

      if (npc.mesh && sceneRef) {
        sceneRef.remove(npc.mesh);
      }
      npc.talkable = false;
      npc.hostile = false;
    }
  }

  inBattle = false;
  enemyId = null;
  enemyHP = 0;
}



// --- enemy damage & rewards ---

function applyDamageToEnemy(dmg, npc) {
  if (!npc) return;

  enemyHP -= dmg;

  // keep NPC's health stat in sync with the battle HP, if present
  const stats = ensureNPCStats(npc);
  if (stats && stats.health) {
    stats.health.currentHP = enemyHP;
  }

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

  // Monster generator: ONLY spawn new monsters if we're in the dungeon.
  try {
    if (typeof getInDungeonMode === "function" && getInDungeonMode()) {
      spawnRandomMonster(difficultyLevel);
    }
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
