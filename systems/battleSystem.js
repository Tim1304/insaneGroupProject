// systems/battleSystem.js
// Generic battle system using shared attack logic.
// - Player HP comes from playerStats (createPlayerStats placeholder).
// - NPC HP is tracked locally per NPC id for now.
// - Battle starts either:
//    • when a dialog node has effects.hostile === true
//    • OR when a hostile NPC hits the player (npc-hostile-attack)
// - Player & NPC attacks both go through performAttack(attackerId, ...)

import { getNPCs, setNPCHostile } from "./npcSystem.js";

const PLAYER_ID = "player";

let sceneRef = null;
let playerRef = null;
let playerStatsRef = null; // <-- hook into createPlayerStats

// Battle state
let inBattle = false;
let engagedEnemies = new Set(); // npcIds in this battle
let currentTargetId = null;

// Only NPC HP is tracked here.
// Player HP lives in playerStatsRef.
const enemyHP = new Map();
const DEFAULT_ENEMY_HP = 100;

// UI
let swordButton = null;
let fistButton = null;

// Player hit reaction state
let playerOriginalColor = null;
let playerOriginalScale = null;
let hitEffectTimeout = null;

export function initBattleSystem(scene, playerController, playerStats) {
  sceneRef = scene;
  playerRef = playerController;
  playerStatsRef = playerStats;

  window.addEventListener("dialog-update", onDialogOrHostileStateChanged);
  // One event handler for both player & NPC attacks:
  window.addEventListener("npc-hostile-attack", onAttackEvent);
  window.addEventListener("player-attack", onAttackEvent);

  console.log("Battle system initialized (uses shared attack logic + playerStats).");
}

export function updateBattleSystem(dt) {
  // event-driven for now
}

export function isInBattle() {
  return inBattle;
}

// Exposed in case you ever want to attack via code: attackEntity("player", {...})
export function attackEntity(attackerId, options) {
  performAttack(attackerId, options);
}

// --------------------------------------------------
// Dialog → battle trigger (generic via effects.hostile)
// --------------------------------------------------

function onDialogOrHostileStateChanged(e) {
  const detail = e.detail || {};
  const npcId = detail.npcId || null;
  const node = detail.node || null;

  if (!npcId || !node) return;

  // Generic: if this node is marked hostile, start a battle
  if (node.effects && node.effects.hostile) {
    startBattleWithEnemy(npcId);
  }
}

// --------------------------------------------------
// Unified attack event handler
// --------------------------------------------------

function onAttackEvent(e) {
  const detail = e.detail || {};

  if (e.type === "player-attack") {
    // Player hit attempt (melee, sword, bow, etc.)
    const dmg = Number(detail.dmg) || 0;
    const range = Number(detail.range) || 0;
    performAttack(PLAYER_ID, {
      damage: dmg,
      range,
      attackPos: null,
    });
    return;
  }

  if (e.type === "npc-hostile-attack") {
    // Enemy hit attempt. NPC AI has already checked range.
    const attackerId = detail.npcId || null;
    if (!attackerId) return;
    const dmg = detail.damage != null ? Number(detail.damage) : 10;
    const attackPos = detail.position || null;

    performAttack(attackerId, {
      damage: dmg,
      range: 0, // range already handled by NPC AI
      attackPos,
    });
  }
}

// --------------------------------------------------
// Shared attack logic
// --------------------------------------------------

function performAttack(attackerId, { damage, range = 0, attackPos = null } = {}) {
  const dmg = Math.max(0, Number(damage) || 0);
  if (!dmg) return;

  if (attackerId === PLAYER_ID) {
    handlePlayerAttack(dmg, range);
  } else {
    handleEnemyAttack(attackerId, dmg, attackPos);
  }
}

// Player → NPCs
function handlePlayerAttack(dmg, range) {
  if (!inBattle || !playerRef || !playerRef.mesh) return;
  if (engagedEnemies.size === 0) return;

  const npcs = getNPCs();
  const playerPos = playerRef.mesh.position;
  const r = Math.max(0, range);

  let bestId = null;
  let bestDistSq = Infinity;

  for (const enemyId of engagedEnemies) {
    const npc = npcs.find((n) => n.id === enemyId);
    if (!npc || !npc.mesh) continue;

    const dx = npc.mesh.position.x - playerPos.x;
    const dy = npc.mesh.position.y - playerPos.y;
    const dz = npc.mesh.position.z - playerPos.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq <= r * r && distSq < bestDistSq) {
      bestDistSq = distSq;
      bestId = enemyId;
    }
  }

  if (!bestId) {
    console.log("Player attack: no engaged enemy in range.");
    return;
  }

  const hpBefore = getEnemyHP(bestId);
  setEnemyHP(bestId, hpBefore - dmg);
  console.log(`Player hit ${bestId} for ${dmg}. HP ${hpBefore} → ${getEnemyHP(bestId)}`);

  if (getEnemyHP(bestId) <= 0) {
    // Kill this enemy
    removeEnemy(bestId);

    // If no enemies left in this battle, player wins
    if (engagedEnemies.size === 0) {
      endBattle(true);
    }
  }
}

// Enemy → Player
function handleEnemyAttack(attackerId, dmg, attackPos) {
  if (!playerRef || !playerRef.mesh || !playerStatsRef) return;

  // If no battle yet, create one with this attacker.
  if (!inBattle) {
    startBattleWithEnemy(attackerId);
  }

  if (!inBattle) return;
  if (!engagedEnemies.has(attackerId)) return;

  // Damage goes through playerStats so UI updates automatically
  if (typeof playerStatsRef.damage === "function") {
    playerStatsRef.damage(dmg);
  } else if (typeof playerStatsRef.setHealth === "function"
          && typeof playerStatsRef.getHealth === "function") {
    const oldH = playerStatsRef.getHealth();
    playerStatsRef.setHealth(oldH - dmg);
  }

  const hp = typeof playerStatsRef.getHealth === "function"
    ? playerStatsRef.getHealth()
    : 100;

  console.log(`Player took ${dmg} damage from ${attackerId}. Player HP now ${hp}.`);

  // Check defeat
  if (hp <= 0) {
    console.log("Player has been defeated.");
    endBattle(false);
    return;
  }

  // Visual feedback
  applyPlayerHitReaction(attackPos);
}

// --------------------------------------------------
// Battle management
// --------------------------------------------------

function startBattleWithEnemy(enemyId) {
  const npc = getNPCs().find((n) => n.id === enemyId);
  if (!npc) {
    console.warn("battleSystem: startBattleWithEnemy unknown id", enemyId);
    return;
  }

  // If already in battle, just add this enemy if not present
  if (inBattle) {
    if (!engagedEnemies.has(enemyId)) {
      engagedEnemies.add(enemyId);
      highlightEnemyMesh(enemyId, true);
    }
    return;
  }

  // New battle
  inBattle = true;
  engagedEnemies.clear();
  engagedEnemies.add(enemyId);
  currentTargetId = enemyId;

  // Initialize enemy HP if needed
  if (!enemyHP.has(enemyId)) {
    enemyHP.set(enemyId, DEFAULT_ENEMY_HP);
  }

  console.log("Battle started against:", enemyId);

  setNPCHostileSafe(enemyId, true);
  highlightEnemyMesh(enemyId, true);

  createSwordButton();
  createFistButton();
}

function endBattle(playerWon) {
  console.log("Battle ended. Player won:", !!playerWon);

  // Remove highlights
  for (const enemyId of engagedEnemies) {
    highlightEnemyMesh(enemyId, false);
  }

  // Optionally remove dead enemies (when player wins)
  if (playerWon) {
    for (const enemyId of engagedEnemies) {
      if (getEnemyHP(enemyId) <= 0) {
        removeEnemy(enemyId);
      }
    }
  }

  // Remove UI
  removeSwordButton();
  removeFistButton();

  inBattle = false;
  engagedEnemies.clear();
  currentTargetId = null;
}

// Remove enemy mesh + mark non-hostile/talkable
function removeEnemy(enemyId) {
  const npc = getNPCs().find((n) => n.id === enemyId);
  if (!npc) return;

  if (npc.mesh && sceneRef) {
    sceneRef.remove(npc.mesh);
  }
  npc.hostile = false;
  npc.talkable = false;

  engagedEnemies.delete(enemyId);
  enemyHP.delete(enemyId);
}

// Enemy HP helpers
function getEnemyHP(id) {
  return enemyHP.get(id) ?? DEFAULT_ENEMY_HP;
}
function setEnemyHP(id, v) {
  enemyHP.set(id, Math.max(0, v));
}

// --------------------------------------------------
// Player hit reaction: knockback + visible hitbox
// --------------------------------------------------

function applyPlayerHitReaction(attackPos) {
  if (!playerRef || !playerRef.mesh) return;
  const mesh = playerRef.mesh;
  const mat = mesh.material;
  if (!mat) return;

  // Knockback away from attacker
  if (attackPos) {
    const p = mesh.position;
    let dx = p.x - attackPos.x;
    let dz = p.z - attackPos.z;
    let len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.0001) {
      dx = 1;
      dz = 0;
      len = 1;
    }
    const strength = 1.5;
    p.x += (dx / len) * strength;
    p.z += (dz / len) * strength;
  }

  // Save original once
  if (playerOriginalColor === null && mat.color) {
    playerOriginalColor = mat.color.getHex();
  }
  if (!playerOriginalScale) {
    playerOriginalScale = {
      x: mesh.scale.x,
      y: mesh.scale.y,
      z: mesh.scale.z,
    };
  }

  // Visible hitbox: bigger, semi-transparent red
  if (mat.color) {
    mat.color.set(0xff4444);
  }
  mat.transparent = true;
  mat.opacity = 0.5;
  mesh.scale.set(
    playerOriginalScale.x * 1.2,
    playerOriginalScale.y * 1.2,
    playerOriginalScale.z * 1.2
  );

  if (hitEffectTimeout) {
    clearTimeout(hitEffectTimeout);
  }
  hitEffectTimeout = setTimeout(() => {
    try {
      if (!playerRef || !playerRef.mesh) return;
      const m = playerRef.mesh;
      const mm = m.material;
      if (!mm) return;

      if (mm.color && playerOriginalColor !== null) {
        mm.color.set(playerOriginalColor);
      }
      if (playerOriginalScale) {
        m.scale.set(
          playerOriginalScale.x,
          playerOriginalScale.y,
          playerOriginalScale.z
        );
      }
      mm.opacity = 1.0;
      mm.transparent = false;
    } catch {
      // ignore
    }
  }, 150);
}

// --------------------------------------------------
// UI: Sword / Fist
// --------------------------------------------------

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

  swordButton.addEventListener("click", () => {
    performAttack(PLAYER_ID, { damage: 20, range: 5.0 });
  });

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

  fistButton.addEventListener("click", () => {
    performAttack(PLAYER_ID, { damage: 10, range: 2.5 });
  });

  document.body.appendChild(fistButton);
}

function removeSwordButton() {
  if (!swordButton) return;
  swordButton.remove();
  swordButton = null;
}

function removeFistButton() {
  if (!fistButton) return;
  fistButton.remove();
  fistButton = null;
}

// --------------------------------------------------
// Visual helpers for enemies
// --------------------------------------------------

function highlightEnemyMesh(enemyId, on) {
  const npc = getNPCs().find((n) => n.id === enemyId);
  if (!npc || !npc.mesh || !npc.mesh.material || !npc.mesh.material.color) return;

  if (!npc._originalColor) {
    npc._originalColor = npc.mesh.material.color.clone();
  }

  if (on) {
    npc.mesh.material.color.set(0xff4444);
  } else if (npc._originalColor) {
    npc.mesh.material.color.copy(npc._originalColor);
  }
}

function setNPCHostileSafe(id, hostile) {
  try {
    setNPCHostile(id, hostile);
  } catch (err) {
    console.warn("battleSystem: setNPCHostileSafe error", err);
  }
}
