// collisionSystem.js
// Collision system
// - Prevents player from passing through NPCs and static colliders (walls/trees)
// - Removes player arrows when they hit NPCs or static colliders
// - Handles enemy arrows hitting the player, NPCs (block), or static colliders

import { getNPCs } from "./npcSystem.js";

let TRef = null;
let sceneRef = null;
let playerRef = null;
let staticColliders = [];

// turn collision on/off
export let collisionEnabled = true;
export function setCollisionEnabled(v) {
    collisionEnabled = v;
}

// Default damage for enemy arrows if not specified on the arrow itself
const ENEMY_ARROW_DEFAULT_DAMAGE = 8;

export function initCollisionSystem(T, scene, playerController, colliders = []) {
  TRef = T;
  sceneRef = scene;
  playerRef = playerController;
  staticColliders = Array.isArray(colliders) ? colliders.slice() : [];

  console.log("Collision system initialized.");
}

export function updateCollisionSystem(dt) {
  if (!TRef || !sceneRef || !playerRef || !playerRef.mesh) return;

  if (!collisionEnabled) return;

  try {
    handlePlayerCollisions();
    handleArrowCollisions();
  } catch (err) {
    console.warn("collisionSystem update error", err);
  }
}

function handlePlayerCollisions() {
  const Box3 = TRef.Box3;
  const playerBox = new Box3().setFromObject(playerRef.mesh);

  // Checks for static colliders (walls, trees)
  for (const obj of staticColliders) {
    if (!obj) continue;
    const objBox = new Box3().setFromObject(obj);
    if (playerBox.intersectsBox(objBox)) {
      resolveBoxPenetration(playerRef.mesh, playerBox, objBox);
      playerBox.setFromObject(playerRef.mesh);
    }
  }

  // Checks for NPCs
  const npcs = getNPCs();
  for (const npc of npcs) {
    if (!npc || !npc.mesh) continue;
    const npcBox = new Box3().setFromObject(npc.mesh);
    if (playerBox.intersectsBox(npcBox)) {
      resolveBoxPenetration(playerRef.mesh, playerBox, npcBox);
      playerBox.setFromObject(playerRef.mesh);
    }
  }
}

function resolveBoxPenetration(playerMesh, playerBox, objBox) {
  // Move the player out along the smallest axis (X or Z)
  const pxMin = playerBox.min.x, pxMax = playerBox.max.x;
  const pzMin = playerBox.min.z, pzMax = playerBox.max.z;
  const oxMin = objBox.min.x, oxMax = objBox.max.x;
  const ozMin = objBox.min.z, ozMax = objBox.max.z;
  const overlapX = Math.min(pxMax, oxMax) - Math.max(pxMin, oxMin);
  const overlapZ = Math.min(pzMax, ozMax) - Math.max(pzMin, ozMin);

  if (overlapX <= 0 || overlapZ <= 0) return;

  // push out along smaller overlap
  if (overlapX < overlapZ) {
    const pxCenter = (pxMin + pxMax) / 2;
    const oxCenter = (oxMin + oxMax) / 2;
    const dir = pxCenter < oxCenter ? -1 : 1;
    playerMesh.position.x += dir * (overlapX + 0.01);
  } else {
    const pzCenter = (pzMin + pzMax) / 2;
    const ozCenter = (ozMin + ozMax) / 2;
    const dir = pzCenter < ozCenter ? -1 : 1;
    playerMesh.position.z += dir * (overlapZ + 0.01);
  }
}

// Arrow collision handler
function handleArrowCollisions() {
  const playerArrows = [];
  const enemyArrows = [];

  // Collect all active arrows
  sceneRef.traverse((obj) => {
    if (!obj.userData || obj.userData._removed) return;
    if (obj.userData.isPlayerArrow) {
      playerArrows.push(obj);
    } else if (obj.userData.isEnemyArrow) {
      enemyArrows.push(obj);
    }
  });

  const hasPlayerArrows = playerArrows.length > 0;
  const hasEnemyArrows = enemyArrows.length > 0;
  if (!hasPlayerArrows && !hasEnemyArrows) return;

  const Box3 = TRef.Box3;
  const npcs = getNPCs();

  // --- Player arrows: hit NPCs or static colliders; damage logic is handled by battleSystem via "bow-shot" ---
  for (const arrow of playerArrows) {
    const aPos = arrow.position;
    let removed = false;

    // Check NPCs (so arrows can't pass through them)
    for (const npc of npcs) {
      if (!npc || !npc.mesh) continue;
      const box = new Box3().setFromObject(npc.mesh);
      if (box.containsPoint(aPos)) {
        removeArrow(arrow);
        removed = true;
        break;
      }
    }
    if (removed) continue;

    // Check static colliders (walls/trees/etc.)
    for (const obj of staticColliders) {
      if (!obj) continue;
      const box = new Box3().setFromObject(obj);
      if (box.containsPoint(aPos)) {
        removeArrow(arrow);
        removed = true;
        break;
      }
    }
  }

  // --- Enemy arrows: can hit PLAYER, then are blocked by NPCs or static colliders ---
  if (hasEnemyArrows && playerRef && playerRef.mesh) {
    const playerBox = new Box3().setFromObject(playerRef.mesh);

    for (const arrow of enemyArrows) {
      const aPos = arrow.position;
      let removed = false;

      // 1) Hit player?
      if (playerBox.containsPoint(aPos)) {
        const dmg =
          (arrow.userData && typeof arrow.userData.damage === "number"
            ? arrow.userData.damage
            : ENEMY_ARROW_DEFAULT_DAMAGE);

        const sourceNpcId =
          arrow.userData && arrow.userData.ownerId
            ? arrow.userData.ownerId
            : null;

        try {
          window.dispatchEvent(
            new CustomEvent("enemy-attack-player", {
              detail: {
                npcId: sourceNpcId,
                dmg,
              },
            })
          );
        } catch (err) {
          // ignore
        }

        removeArrow(arrow);
        continue;
      }

      // 2) Blocked by any NPC (including tanks) -> arrow is removed (no damage for now)
      for (const npc of npcs) {
        if (!npc || !npc.mesh) continue;
        const box = new Box3().setFromObject(npc.mesh);
        if (box.containsPoint(aPos)) {
          removeArrow(arrow);
          removed = true;
          break;
        }
      }
      if (removed) continue;

      // 3) Blocked by static colliders
      for (const obj of staticColliders) {
        if (!obj) continue;
        const box = new Box3().setFromObject(obj);
        if (box.containsPoint(aPos)) {
          removeArrow(arrow);
          removed = true;
          break;
        }
      }
    }
  }
}

function removeArrow(arrow) {
  try {
    arrow.userData = arrow.userData || {};
    arrow.userData._removed = true;
    if (arrow.parent) arrow.parent.remove(arrow);
  } catch (err) {
    // ignore
  }
}

export function addStaticCollider(mesh) {
  if (!mesh) return;
  staticColliders.push(mesh);
}
