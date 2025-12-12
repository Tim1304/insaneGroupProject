// npcSystem.js
// NPC management + basic AI for melee / bow / tank monsters.
// Also handles enemy arrow spawning & movement.

import * as Gen from "../env/worldObjects.js";

let TRef = null;
let overworldSceneRef = null;
let dungeonSceneRef = null;
let playerRef = null;

let tavernSceneRef = null;
let tavernInnkeeperRef = null;
let inTavernMode = false;

export function setInTavernMode(isInTavern) {
  inTavernMode = !!isInTavern;
}

export function registerTavernInnkeeper(mesh) {
  tavernInnkeeperRef = mesh;
}

/**
 * NPC structure:
 * {
 *   id: string,
 *   name: string,
 *   mesh: THREE.Mesh,
 *   talkable: boolean,
 *   hostile: boolean,
 *   dialogId?: string,
 *
 *   type: "neutral" | "melee" | "bow" | "tank",
 *   aiState: string,
 *   aiData: object,
 *   elite?: boolean,
 *   team?: string,
 * }
 */

const npcs = [];

// --- AI tuning constants ---

// Melee
const MELEE_CHASE_RANGE = 18.0;
const MELEE_ATTACK_RANGE = 2.5;
const MELEE_MOVE_SPEED = 5.0;
const MELEE_WINDUP_TIME = 0.35;
const MELEE_RECOVER_TIME = 0.45;
const MELEE_DAMAGE = 10;

// Tank
const TANK_CHASE_RANGE = 20.0;
const TANK_ATTACK_RANGE = 3.0;
const TANK_MOVE_SPEED = 3.0;
const TANK_WINDUP_TIME = 0.7;
const TANK_RECOVER_TIME = 0.8;
const TANK_DAMAGE = 20;

// Bow (distance band + shooting)
const BOW_IDEAL_MIN = 10.0;
const BOW_IDEAL_MAX = 15.0;
const BOW_TOO_FAR = 20.0;
const BOW_TOO_CLOSE = 8.0;
const BOW_DANGER_RANGE = 3.0;
const BOW_MOVE_SPEED_RUN = 5.0;
const BOW_MOVE_SPEED_AIM = 2.5;
const BOW_SHOT_COOLDOWN = 2.5;
const BOW_ARROW_DAMAGE = 8;
const BOW_TANK_SUPPORT_RADIUS = 6.0;

// Enemy arrow
const ENEMY_ARROW_SPEED = 16;
const ENEMY_ARROW_LIFETIME = 2.5;
const enemyArrows = [];

let dungeonEntranceRef = null;
let dungeonExitRef = null;
let tavernEntranceRef = null;
let inDungeonMode = false;

// For dynamically generated dungeon monsters
let nextMonsterId = 1;

// -------------------------------------------------------
// Initialization
// -------------------------------------------------------

export function initNPCSystem(T, scene, playerController) {
  TRef = T;
  overworldSceneRef = scene;
  playerRef = playerController;

  createNPCs();

  console.log("NPC system initialized with", npcs.length, "NPCs.");
}

/**
 * Called from game.js after Dungeon is created.
 */
export function registerDungeonScene(dungeonScene) {
  dungeonSceneRef = dungeonScene;
}
export function registerTavernScene(tavernScene) {
  tavernSceneRef = tavernScene;
}

// -------------------------------------------------------
// Scene setup
// -------------------------------------------------------

function createNPCs() {
  if (!TRef || !overworldSceneRef) return;

  const npcGeo = new TRef.BoxGeometry(1, 2, 1);

  // --- Money Test NPC (Rich Guy) ---
  const moneyMat = new TRef.MeshStandardMaterial({ color: 0x88ff88 });
  const moneyMesh = new TRef.Mesh(npcGeo, moneyMat);
  moneyMesh.position.set(2, 1, -3);

  overworldSceneRef.add(moneyMesh);

  npcs.push({
    id: "npc_money",
    name: "Rich Guy",
    mesh: moneyMesh,
    talkable: true,
    hostile: false,
    dialogId: "moneyTest",    // MUST match dialogDefs.moneyTest
    type: "neutral",
    aiState: "idle",
    aiData: {},
    team: null,
  });

  // Bandit – melee
  const banditMesh = new Gen.Npc(new TRef.Vector3(0, 0, 0), 2.3, "bandit");
  banditMesh.position.set(-6, 0, 3);
  overworldSceneRef.add(banditMesh);

  npcs.push({
    id: "npc_bandit",
    name: "Bandit",
    mesh: banditMesh,
    talkable: true,
    hostile: false,
    dialogId: "bandit",
    type: "melee",
    aiState: "idle",
    aiData: {
      moveSpeed: MELEE_MOVE_SPEED,
      meleeDamage: MELEE_DAMAGE,
      inDesperation: false,
    },
    elite: false,
    team: "bandits",
  });

  // Caster (formerly "archer")
  const archerMesh = new Gen.Npc(new TRef.Vector3(0, 0, 0), 2.3, "caster");
  archerMesh.position.set(-2, 0, -10);
  overworldSceneRef.add(archerMesh);

  npcs.push({
    id: "npc_archer_1",
    name: "Archer",
    mesh: archerMesh,
    talkable: false,
    hostile: false,
    dialogId: null,
    type: "bow",
    aiState: "aim",
    aiData: {
      moveSpeedRun: BOW_MOVE_SPEED_RUN,
      moveSpeedAim: BOW_MOVE_SPEED_AIM,
      shotCooldown: BOW_SHOT_COOLDOWN,
    },
    elite: false,
    team: "bandits",
  });

  // Tank (devil)
  const tankMesh = new Gen.Npc(new TRef.Vector3(0, 0, 0), 1.7, "devil");
  tankMesh.position.set(-6, 0, -8);
  overworldSceneRef.add(tankMesh);

  npcs.push({
    id: "npc_tank_1",
    name: "Tank",
    mesh: tankMesh,
    talkable: false,
    hostile: false,
    dialogId: null,
    type: "tank",
    aiState: "idle",
    aiData: {
      moveSpeed: TANK_MOVE_SPEED,
      meleeDamage: TANK_DAMAGE,
    },
    elite: false,
    team: "bandits",
  });
}

// -------------------------------------------------------
// Per-frame update
// -------------------------------------------------------

export function updateNPCSystem(dt) {
  if (!playerRef || !playerRef.mesh) {
    updateEnemyArrows(dt);
    return;
  }

  const playerPos = playerRef.mesh.position;

  for (const npc of npcs) {
    if (!npc || !npc.mesh) continue;

    // Is this NPC part of the dungeon scene?
    const isDungeonNPC =
      dungeonSceneRef && npc.mesh.parent === dungeonSceneRef;

    // Only update AI for NPCs in the *current* world.
    if (inDungeonMode) {
      // We are inside the dungeon → ignore overworld NPCs
      if (!isDungeonNPC) continue;
    } else {
      // We are in the overworld → ignore dungeon NPCs
      if (isDungeonNPC) continue;
    }

    if (!npc.hostile) {
      npc.aiState = npc.aiState || "idle";
      continue;
    }

    const type = npc.type || "neutral";
    switch (type) {
      case "melee":
        updateMeleeAI(npc, dt, playerPos);
        break;
      case "bow":
        updateBowAI(npc, dt, playerPos);
        break;
      case "tank":
        updateTankAI(npc, dt, playerPos);
        break;
      default:
        break;
    }
  }

  updateEnemyArrows(dt);
}

// -------------------------------------------------------
// Melee monster AI
// -------------------------------------------------------

function updateMeleeAI(npc, dt, playerPos) {
  const data = (npc.aiData = npc.aiData || {});
  let state = npc.aiState || "idle";

  const pos = npc.mesh.position;
  const dx = playerPos.x - pos.x;
  const dz = playerPos.z - pos.z;
  const distSq = dx * dx + dz * dz;

  const chaseRangeSq = MELEE_CHASE_RANGE * MELEE_CHASE_RANGE;
  const attackRangeSq = MELEE_ATTACK_RANGE * MELEE_ATTACK_RANGE;

  npc.mesh.rotation.y = Math.atan2(dx, dz);

  switch (state) {
    case "idle": {
      if (distSq < chaseRangeSq) state = "chase";
      break;
    }
    case "chase": {
      if (distSq <= attackRangeSq) {
        state = "windup";
        data.attackTimer = MELEE_WINDUP_TIME;
      } else {
        moveTowards(npc, playerPos, data.moveSpeed || MELEE_MOVE_SPEED, dt, 1.0);
      }
      break;
    }
    case "windup": {
      data.attackTimer = (data.attackTimer || 0) - dt;
      if (data.attackTimer <= 0) {
        if (distSq <= attackRangeSq) {
          const dmg = data.meleeDamage || MELEE_DAMAGE;
          try {
            window.dispatchEvent(
              new CustomEvent("enemy-attack-player", {
                detail: { npcId: npc.id, dmg },
              })
            );
          } catch (err) { }
        }
        state = "recover";
        data.attackTimer = MELEE_RECOVER_TIME;
      }
      break;
    }
    case "recover": {
      data.attackTimer = (data.attackTimer || 0) - dt;
      if (data.attackTimer <= 0) {
        state = distSq <= chaseRangeSq ? "chase" : "idle";
      }
      break;
    }
    default:
      state = "idle";
      break;
  }

  npc.aiState = state;
}

// -------------------------------------------------------
// Bow monster AI
// -------------------------------------------------------

function updateBowAI(npc, dt, playerPos) {
  const data = (npc.aiData = npc.aiData || {});
  let state = npc.aiState || "aim";

  const pos = npc.mesh.position;
  const dx = playerPos.x - pos.x;
  const dz = playerPos.z - pos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  npc.mesh.rotation.y = Math.atan2(dx, dz);

  if (data.shotCooldown == null) data.shotCooldown = 0;
  if (data.moveSpeedRun == null) data.moveSpeedRun = BOW_MOVE_SPEED_RUN;
  if (data.moveSpeedAim == null) data.moveSpeedAim = BOW_MOVE_SPEED_AIM;

  const tooFar = dist > BOW_TOO_FAR;
  const inIdeal = dist >= BOW_IDEAL_MIN && dist <= BOW_IDEAL_MAX;
  const closeButNotDanger = dist < BOW_IDEAL_MIN && dist > BOW_DANGER_RANGE;
  const inDanger = dist <= BOW_DANGER_RANGE;

  const tank = findNearestTank(npc);
  let tankClose = false;
  if (tank && tank.mesh) {
    const tx = tank.mesh.position.x - pos.x;
    const tz = tank.mesh.position.z - pos.z;
    const tDistSq = tx * tx + tz * tz;
    tankClose = tDistSq <= BOW_TANK_SUPPORT_RADIUS * BOW_TANK_SUPPORT_RADIUS;
  }

  switch (state) {
    case "runToTank": {
      if (!tank || !tank.mesh || tankClose) {
        state = "aim";
        break;
      }
      const tankPos = tank.mesh.position;
      moveTowards(npc, tankPos, data.moveSpeedRun, dt, 1.0);
      break;
    }

    case "aim":
    default: {
      if (inDanger) {
        if (tank && tank.mesh && !tankClose) {
          state = "runToTank";
        } else {
          moveAwayFrom(npc, playerPos, data.moveSpeedRun, dt);
        }
        data.shotCooldown = Math.max(data.shotCooldown, 0);
        break;
      }

      if (tooFar) {
        moveTowards(npc, playerPos, data.moveSpeedRun, dt, 1.0);
      } else if (closeButNotDanger) {
        moveAwayFrom(npc, playerPos, data.moveSpeedAim, dt);
      } else if (inIdeal) {
        // sit and shoot
      }

      data.shotCooldown -= dt;
      if (data.shotCooldown <= 0) {
        spawnEnemyArrow(npc, playerPos);
        data.shotCooldown = BOW_SHOT_COOLDOWN;
      }

      break;
    }
  }

  npc.aiState = state;
}

// -------------------------------------------------------
// Tank monster AI
// -------------------------------------------------------

function updateTankAI(npc, dt, playerPos) {
  const data = (npc.aiData = npc.aiData || {});
  let state = npc.aiState || "idle";

  const pos = npc.mesh.position;
  const dx = playerPos.x - pos.x;
  const dz = playerPos.z - pos.z;
  const distSq = dx * dx + dz * dz;

  const chaseRangeSq = TANK_CHASE_RANGE * TANK_CHASE_RANGE;
  const attackRangeSq = TANK_ATTACK_RANGE * TANK_ATTACK_RANGE;

  npc.mesh.rotation.y = Math.atan2(dx, dz);

  if (data.moveSpeed == null) data.moveSpeed = TANK_MOVE_SPEED;
  if (data.meleeDamage == null) data.meleeDamage = TANK_DAMAGE;

  switch (state) {
    case "idle": {
      if (distSq < chaseRangeSq) state = "chase";
      break;
    }
    case "chase": {
      if (distSq <= attackRangeSq) {
        state = "windup";
        data.attackTimer = TANK_WINDUP_TIME;
      } else {
        moveTowards(npc, playerPos, data.moveSpeed, dt, 1.0);
      }
      break;
    }
    case "windup": {
      data.attackTimer = (data.attackTimer || 0) - dt;
      if (data.attackTimer <= 0) {
        if (distSq <= attackRangeSq) {
          const dmg = data.meleeDamage;
          try {
            window.dispatchEvent(
              new CustomEvent("enemy-attack-player", {
                detail: { npcId: npc.id, dmg },
              })
            );
          } catch (err) { }
        }
        state = "recover";
        data.attackTimer = TANK_RECOVER_TIME;
      }
      break;
    }
    case "recover": {
      data.attackTimer = (data.attackTimer || 0) - dt;
      if (data.attackTimer <= 0) {
        state = distSq <= chaseRangeSq ? "chase" : "idle";
      }
      break;
    }
    default:
      state = "idle";
      break;
  }

  npc.aiState = state;
}

// -------------------------------------------------------
// Enemy projectile helpers
// -------------------------------------------------------

function spawnEnemyArrow(npc, playerPos) {
  if (!TRef || (!overworldSceneRef && !dungeonSceneRef) || !playerPos || !npc || !npc.mesh) return;

  const parentScene = inDungeonMode && dungeonSceneRef ? dungeonSceneRef : overworldSceneRef;
  if (!parentScene) return;

  const origin = npc.mesh.position.clone();
  origin.y += 1.3;

  const target = playerPos.clone();
  target.y += 1.3;

  const dir = target.clone().sub(origin).normalize();

  // Small orange sphere instead of a box arrow
  const arrowGeo = new TRef.SphereGeometry(0.15, 12, 12); // radius 0.15 = not too big
  const arrowMat = new TRef.MeshStandardMaterial({ color: 0xffaa00 });
  const arrow = new TRef.Mesh(arrowGeo, arrowMat);

  const spawnPos = origin.clone().add(dir.clone().multiplyScalar(0.8));
  arrow.position.copy(spawnPos);

  arrow.userData = arrow.userData || {};
  arrow.userData.isEnemyArrow = true;
  arrow.userData._removed = false;
  arrow.userData.ownerId = npc.id;
  arrow.userData.damage = BOW_ARROW_DAMAGE;

  parentScene.add(arrow);

  enemyArrows.push({ mesh: arrow, dir: dir.clone(), age: 0 });
}

function updateEnemyArrows(dt) {
  if (!TRef) return;
  const toRemove = [];

  enemyArrows.forEach((info, idx) => {
    const mesh = info.mesh;
    if (!mesh || !mesh.parent || (mesh.userData && mesh.userData._removed)) {
      toRemove.push(idx);
      return;
    }

    info.age += dt;
    if (info.age > ENEMY_ARROW_LIFETIME) {
      try {
        if (mesh.userData) mesh.userData._removed = true;
        if (mesh.parent) mesh.parent.remove(mesh);
      } catch (err) { }
      toRemove.push(idx);
      return;
    }

    mesh.position.add(info.dir.clone().multiplyScalar(ENEMY_ARROW_SPEED * dt));
  });

  for (let i = toRemove.length - 1; i >= 0; i--) {
    const idx = toRemove[i];
    enemyArrows.splice(idx, 1);
  }
}

// -------------------------------------------------------
// Movement helpers
// -------------------------------------------------------

function moveTowards(npc, targetPos, speed, dt, directionSign = 1.0) {
  if (!npc || !npc.mesh || !targetPos) return;
  const pos = npc.mesh.position;
  const dx = targetPos.x - pos.x;
  const dz = targetPos.z - pos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 1e-4) return;

  const nx = (dx / dist) * directionSign;
  const nz = (dz / dist) * directionSign;
  const step = speed * dt;

  pos.x += nx * step;
  pos.z += nz * step;
}

function moveAwayFrom(npc, targetPos, speed, dt) {
  moveTowards(npc, targetPos, speed, dt, -1.0);
}

function findNearestTank(excludeNpc) {
  let best = null;
  let bestDistSq = Infinity;
  for (const npc of npcs) {
    if (!npc || !npc.mesh) continue;
    if (npc === excludeNpc) continue;
    if (npc.type !== "tank") continue;

    const dx = npc.mesh.position.x - excludeNpc.mesh.position.x;
    const dz = npc.mesh.position.z - excludeNpc.mesh.position.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = npc;
    }
  }
  return best;
}

// -------------------------------------------------------
// Public helpers used by other systems
// -------------------------------------------------------

/**
 * Force-spawn a dungeon monster at a specific X/Z position.
 * Uses the same logic for type, AI, stats, mesh, etc.
 */
export function spawnDungeonMonsterAt(x, z, difficulty = 1) {
  return spawnRandomMonster(difficulty, x, z);
}


export function getNPCs() {
  return npcs;
}

// Remove all NPCs whose meshes are attached to a given scene.
// Used to wipe old dungeon mobs when regenerating the dungeon.
export function removeNPCsInScene(scene) {
  if (!scene) return;

  for (const npc of npcs) {
    if (!npc || !npc.mesh) continue;
    if (npc.mesh.parent !== scene) continue;

    try {
      if (npc.mesh.parent) npc.mesh.parent.remove(npc.mesh);
    } catch (e) {}

    // Mark as removed/dead so other systems ignore it
    npc.mesh = null;
    npc.hostile = false;
    npc.talkable = false;
    npc.aiState = "idle";
  }
}


// Return only "alive" hostile mobs (things that can still fight)
// - must still have a mesh
// - must be hostile (so neutral NPCs like innkeeper are excluded)
export function getAliveMobs() {
  return npcs.filter(
    (npc) => npc && npc.mesh && npc.hostile
  );
}


export function getNearestTalkableNPC(playerPosition, maxDistance) {
  if (!playerPosition) return null;

  // Normal NPC talk radius
  const normalRangeSq = maxDistance * maxDistance;
  // Slightly extended radius for entrance/exit so collision walls don't block interaction
  const extendedRange = maxDistance + 3.0;
  const extendedRangeSq = extendedRange * extendedRange;

  let best = null;
  let bestDistSq = normalRangeSq;

  // --- DUNGEON MODE: only exit is talkable ---
  if (inDungeonMode) {
    if (!dungeonExitRef) return null;

    const dx = dungeonExitRef.position.x - playerPosition.x;
    const dy = dungeonExitRef.position.y - playerPosition.y;
    const dz = dungeonExitRef.position.z - playerPosition.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq <= extendedRangeSq) {
      best = {
        id: "dungeon_exit",
        name: "Dungeon Exit",
        mesh: dungeonExitRef,
        talkable: true,
        hostile: false,
        isDungeonExit: true,
        dialogId: null,
      };
    }

    return best;
  }

  // --- TAVERN MODE: only tavern innkeeper is talkable ---
  if (inTavernMode) {
    if (!tavernInnkeeperRef) return null;

    const dx = tavernInnkeeperRef.position.x - playerPosition.x;
    const dy = tavernInnkeeperRef.position.y - playerPosition.y;
    const dz = tavernInnkeeperRef.position.z - playerPosition.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq <= normalRangeSq) {
      return {
        id: "tavern_innkeeper",
        name: "Innkeeper",
        mesh: tavernInnkeeperRef,
        talkable: true,
        hostile: false,
        dialogId: "innkeeper",
        type: "neutral",
      };
    }
    return null;
  }


  // --- OVERWORLD: normal talkable NPCs first ---
  for (const npc of npcs) {
    if (!npc || !npc.talkable || !npc.mesh) continue;

    const dx = npc.mesh.position.x - playerPosition.x;
    const dy = npc.mesh.position.y - playerPosition.y;
    const dz = npc.mesh.position.z - playerPosition.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = npc;
    }
  }

  // --- Dungeon entrance: allow a larger radius so you can stand in front of the cave ---
  if (dungeonEntranceRef) {
    const dx = dungeonEntranceRef.position.x - playerPosition.x;
    const dy = dungeonEntranceRef.position.y - playerPosition.y;
    const dz = dungeonEntranceRef.position.z - playerPosition.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq <= extendedRangeSq && distSq < bestDistSq) {
      bestDistSq = distSq;
      best = {
        id: "dungeon_entrance",
        name: "Dungeon Entrance",
        mesh: dungeonEntranceRef,
        talkable: true,
        hostile: false,
        isDungeonEntrance: true,
        dialogId: null,
      };
    }
  }

  // --- Tavern entrance: same idea, slightly extended radius ---
  if (tavernEntranceRef) {
    const dx = tavernEntranceRef.position.x - playerPosition.x;
    const dy = tavernEntranceRef.position.y - playerPosition.y;
    const dz = tavernEntranceRef.position.z - playerPosition.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq <= extendedRangeSq && distSq < bestDistSq) {
      bestDistSq = distSq;
      best = {
        id: "tavern_entrance",
        name: "Tavern Entrance",
        mesh: tavernEntranceRef,
        talkable: true,
        hostile: false,
        isTavernEntrance: true,
        dialogId: null,
      };
    }
  }

  return best;
}



export function setNPCHostile(npcId, hostile) {
  const npc = npcs.find((n) => n.id === npcId);
  if (!npc) return;

  npc.hostile = hostile;
  npc.talkable = !hostile;

  if (hostile) {
    console.log(`[NPC SYSTEM] ${npc.name} (${npc.id}) is now hostile!`);
    npc.aiState = npc.aiState || (npc.type === "bow" ? "aim" : "idle");
    npc.aiData = npc.aiData || {};

    // TEAM AGGRO
    if (npc.team) {
      for (const ally of npcs) {
        if (!ally || ally === npc) continue;
        if (ally.team !== npc.team) continue;

        ally.hostile = true;
        ally.talkable = false;
        ally.aiState = ally.aiState || (ally.type === "bow" ? "aim" : "idle");
        ally.aiData = ally.aiData || {};
        console.log(
          `[NPC SYSTEM] ${ally.name} (${ally.id}) joined hostility as part of team "${npc.team}".`
        );
      }
    }
  } else {
    console.log(`[NPC SYSTEM] ${npc.name} (${npc.id}) calmed down.`);
  }
}

export function registerDungeonEntrance(mesh) {
  dungeonEntranceRef = mesh;
}

export function registerDungeonExit(mesh) {
  dungeonExitRef = mesh;
}

export function setInDungeonMode(isInDungeon) {
  inDungeonMode = !!isInDungeon;
}

export function getInDungeonMode() {
  return inDungeonMode;
}

export function registerTavernEntrance(mesh) {
  tavernEntranceRef = mesh;
}

/**
 * Optional helpers for other systems (like the player controller)
 * to know which scene to attach things to.
 */
export function getDungeonSceneRef() {
  return dungeonSceneRef;
}

export function getOverworldSceneRef() {
  return overworldSceneRef;
}


// Monster generator: spawn a new hostile monster in the dungeon.
// If dungeonSceneRef is missing, falls back to overworld (for safety/testing).
export function spawnRandomMonster(difficulty = 1, overrideX = null, overrideZ = null) {
  if (!TRef || (!dungeonSceneRef && !overworldSceneRef)) return null;

  // Are we actually in dungeon mode and have a dungeon scene?
  const inDungeon = !!dungeonSceneRef && inDungeonMode === true;

  // Pick which scene to attach the monster to
  const parentScene = inDungeon ? dungeonSceneRef : overworldSceneRef;
  if (!parentScene) return null;

  // -----------------------------
  // Decide spawn position
  // -----------------------------
  let spawnX, spawnZ;

  if (overrideX !== null && overrideZ !== null) {
    // Explicit forced position
    spawnX = overrideX;
    spawnZ = overrideZ;
  } else if (inDungeon && typeof dungeonSceneRef.getRandomSpawnPosition === "function") {
    // Use dungeon's spawnCells via Dungeon.getRandomSpawnPosition()
    const v = dungeonSceneRef.getRandomSpawnPosition();
    if (v && typeof v.x === "number" && typeof v.z === "number") {
      spawnX = v.x;
      spawnZ = v.z;
    } else {
      // Fallback inside dungeon if something is weird
      spawnX = 0;
      spawnZ = 0;
    }
  } else {
    // Overworld (or no dungeon spawn helper): original behavior, around player
    let centerX = 0;
    let centerZ = 0;
    if (playerRef && playerRef.mesh) {
      centerX = playerRef.mesh.position.x;
      centerZ = playerRef.mesh.position.z;
    }

    const radius = 6 + Math.random() * 6;
    const angle = Math.random() * Math.PI * 2;
    spawnX = centerX + Math.cos(angle) * radius;
    spawnZ = centerZ + Math.sin(angle) * radius;
  }

  // -----------------------------
  // Choose monster type
  // -----------------------------
  const safeDiff = Math.max(1, Number(difficulty) || 1);
  const speedScale = 1 + 0.15 * (safeDiff - 1);
  const damageScale = 1 + 0.2 * (safeDiff - 1);

  let type = "melee";

  if (inDungeon) {
    // In dungeon: mix of melee / bow / tank
    const roll = Math.random();
    if (roll < 0.4) {
      type = "melee";

    } else if (roll < 0.7) {
      type = "bow";
    } else {
      type = "tank";
    }
  } else {
    // Overworld waves (if you use them later) -> keep simple
    type = "melee";
  }

  let color = 0x993333;
  let name = "Dungeon Monster";
  let aiState = "chase";
  let aiData = {};
  let loggedMoveSpeed = 0;
  let loggedDamage = 0;

  if (type === "melee") {
    // Red melee
    color = 0xaa3333;
    name = inDungeon ? "Dungeon Melee" : "Bandit";
    aiState = "chase";

    const moveSpeed = MELEE_MOVE_SPEED * speedScale;
    const damage = MELEE_DAMAGE * damageScale;

    aiData = {
      moveSpeed,
      meleeDamage: damage,
      inDesperation: false,
    };

    loggedMoveSpeed = moveSpeed;
    loggedDamage = damage;
  } else if (type === "bow") {
    // Green archer
    color = 0x33aa55;
    name = "Dungeon Archer";
    aiState = "aim";

    const moveSpeedRun = BOW_MOVE_SPEED_RUN * speedScale;
    const moveSpeedAim = BOW_MOVE_SPEED_AIM * speedScale;
    const shotCooldown = Math.max(
      0.4,
      BOW_SHOT_COOLDOWN / (1 + 0.1 * (safeDiff - 1))
    );
    const arrowDamage = BOW_ARROW_DAMAGE * damageScale;

    aiData = {
      moveSpeedRun,
      moveSpeedAim,
      shotCooldown,
      arrowDamage,
    };

    loggedMoveSpeed = moveSpeedRun;
    loggedDamage = arrowDamage;
  } else {
    // Blue tank
    color = 0x555588;
    name = "Dungeon Tank";
    aiState = "idle"; // updateTankAI will switch to "chase" when in range

    const moveSpeed = TANK_MOVE_SPEED * speedScale;
    const damage = TANK_DAMAGE * damageScale;

    aiData = {
      moveSpeed,
      meleeDamage: damage,
    };

    loggedMoveSpeed = moveSpeed;
    loggedDamage = damage;
  }

  // -----------------------------
  // Create mesh and NPC entry
  // -----------------------------
  let variant;
  if (type === "melee") {
    variant = "bandit";
  } else if (type === "bow") {
    variant = "caster";
  } else if (type === "tank") {
    variant = "devil";
  }
  const mesh = new Gen.Npc(new TRef.Vector3(spawnX, 0, spawnZ), 2, variant);
  mesh.position.set(spawnX, 1, spawnZ);
  parentScene.add(mesh);

  const id = `monster_${nextMonsterId++}`;

  const npc = {
    id,
    name,
    mesh,
    talkable: false,
    hostile: true,
    dialogId: null,
    type,
    aiState,
    aiData,
    elite: safeDiff >= 3,
    team: "bandits",
  };

  npcs.push(npc);

  console.log(
    `[NPC SYSTEM] Spawned ${inDungeon ? "dungeon" : "overworld"} ${type} monster ${id} at (${spawnX.toFixed(
      1
    )}, ${spawnZ.toFixed(1)}), diff=${safeDiff}, speed=${loggedMoveSpeed.toFixed(
      2
    )}, dmg=${loggedDamage.toFixed(1)}`
  );

  return npc;
}


