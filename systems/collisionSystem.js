// systems/collisionSystem.js
// Collision system 
// - Prevents player from passing through NPCs and static colliders (walls/trees)
// - Removes player arrows when they hit NPCs or static colliders

import { getNPCs } from "./npcSystem.js";

let TRef = null;
let sceneRef = null;
let playerRef = null;
let staticColliders = [];

export function initCollisionSystem(T, scene, playerController, colliders = []) {
  TRef = T;
  sceneRef = scene;
  playerRef = playerController;
  staticColliders = Array.isArray(colliders) ? colliders.slice() : [];

  console.log("Collision system initialized.");
}

export function updateCollisionSystem(dt) {
  if (!TRef || !sceneRef || !playerRef || !playerRef.mesh) return;

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

// Arrow collison handler
function handleArrowCollisions() {
  const arrows = [];
  sceneRef.traverse((obj) => {
    if (obj.userData && obj.userData.isPlayerArrow && !obj.userData._removed) {
      arrows.push(obj);
    }
  });

  if (arrows.length === 0) return;

  const npcs = getNPCs();

  for (const arrow of arrows) {
    // Build a small box around the arrow to check intersection
    const aPos = arrow.position;

    // Checks the NPCs first
    let removed = false;
    for (const npc of npcs) {
      if (!npc || !npc.mesh) continue;
      const box = new TRef.Box3().setFromObject(npc.mesh);
      if (box.containsPoint(aPos)) {
        // Removes the arrow
        removeArrow(arrow);
        removed = true;
        break;
      }
    }
    if (removed) continue;

    // Checks the static colliders
    for (const obj of staticColliders) {
      if (!obj) continue;
      const box = new TRef.Box3().setFromObject(obj);
      if (box.containsPoint(aPos)) {
        removeArrow(arrow);
        removed = true;
        break;
      }
    }
  }
}

function removeArrow(arrow) {
  try {
    arrow.userData._removed = true;
    if (arrow.parent) arrow.parent.remove(arrow);
  } catch (err) {
  }
}

export function addStaticCollider(mesh) {
  if (!mesh) return;
  staticColliders.push(mesh);
}
