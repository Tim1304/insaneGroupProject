// collisionSystem.js
// Rotation-aware collision system using OBB-like boxes (XZ-plane oriented boxes + Y overlap).
// - Prevents player from passing through NPCs and static colliders (walls/trees/etc.)
// - Removes player arrows when they hit NPCs or static colliders
// - Handles enemy arrows hitting the player, NPCs (block), or static colliders

import { getNPCs } from "./npcSystem.js";

let TRef = null;

// separate scene refs for overworld vs dungeon
let overworldSceneRef = null;
let dungeonSceneRef = null;
let sceneRef = null;

let playerRef = null;

let playerCollisionEnabled = true;

// separate collider lists (arrays of ColliderOBB)
let overworldColliders = [];
let dungeonColliders = [];
// active list for current space
let staticColliders = overworldColliders;

// are we logically in the dungeon right now?
let inDungeonSpace = false;

// turn collision on/off globally
export let collisionEnabled = true;
export function setCollisionEnabled(v) {
  collisionEnabled = v;
}

// Default damage for enemy arrows if not specified on the arrow itself
const ENEMY_ARROW_DEFAULT_DAMAGE = 8;

// -------------------------------------------------------
// OBB helper classes / functions
// -------------------------------------------------------

/**
 * Simple 2D vector on XZ plane.
 */
function vec2(x = 0, z = 0) {
  return { x, z };
}

function vec2Dot(a, b) {
  return a.x * b.x + a.z * b.z;
}

function vec2Length(a) {
  return Math.sqrt(a.x * a.x + a.z * a.z);
}

function vec2Normalize(v) {
  const len = vec2Length(v) || 1;
  v.x /= len;
  v.z /= len;
  return v;
}

function vec2Sub(a, b) {
  return { x: a.x - b.x, z: a.z - b.z };
}

function vec2Scale(v, s) {
  return { x: v.x * s, z: v.z * s };
}

function vec2Add(a, b) {
  return { x: a.x + b.x, z: a.z + b.z };
}

/**
 * ColliderOBB wraps an Object3D and stores oriented bounds on XZ plane.
 * - Assumes "upright" objects (no crazy tilt), rotation mostly around Y.
 * - Extents come from geometry.boundingBox when available.
 */
class ColliderOBB {
  /**
   * @param {THREE.Object3D} object
   * @param {boolean} dynamic Whether the object moves/rotates a lot (player/NPC)
   */
  constructor(object, dynamic = false) {
    this.object = object;
    this.dynamic = dynamic;

    this.centerWorld = new TRef.Vector3();
    this.center2D = vec2(0, 0);

    // Local-space bounding box center & half-sizes
    this.localCenter = new TRef.Vector3(0, 0, 0);
    this.localHalfSize = new TRef.Vector3(0.5, 1, 0.5);

    // Height handling
    this.localHeightHalf = 1;

    // Cached world-space half-height
    this.heightHalf = 1;

    // Axes on XZ plane (unit vectors)
    this.axisU = vec2(1, 0); // local X projected
    this.axisV = vec2(0, 1); // local Z projected

    // Extents on X/Z in local
    this.halfX = 0.5;
    this.halfZ = 0.5;

    this._tmpQuat = new TRef.Quaternion();
    this._tmpScale = new TRef.Vector3();

    this._initialized = false;
    this._initFromObject();
  }

  _initFromObject() {
    const obj = this.object;
    if (!obj) return;

    // Try to get bounding box from geometry if it's a mesh.
    let geom = null;
    if (obj.geometry) {
      geom = obj.geometry;
    }

    if (geom) {
      if (!geom.boundingBox) {
        geom.computeBoundingBox();
      }
      const bb = geom.boundingBox;
      if (bb) {
        bb.getCenter(this.localCenter);
        bb.getSize(this.localHalfSize).multiplyScalar(0.5);

        this.localHeightHalf = (bb.max.y - bb.min.y) * 0.5;
        this.halfX = Math.max(0.001, this.localHalfSize.x);
        this.halfZ = Math.max(0.001, this.localHalfSize.z);
        this._initialized = true;
        this.update();
        return;
      }
    }

    // Fallback: use Box3.setFromObject → we lose "true" rotations, but better than nothing.
    const box = new TRef.Box3().setFromObject(obj);
    const size = new TRef.Vector3();
    box.getCenter(this.centerWorld);
    box.getSize(size);

    this.localCenter.set(0, 0, 0);
    this.localHalfSize.copy(size).multiplyScalar(0.5);
    this.localHeightHalf = size.y * 0.5;
    this.halfX = Math.max(0.001, this.localHalfSize.x);
    this.halfZ = Math.max(0.001, this.localHalfSize.z);

    // Set world center using the box center
    this.center2D.x = this.centerWorld.x;
    this.center2D.z = this.centerWorld.z;

    // AABB-style axes
    this.axisU = vec2(1, 0);
    this.axisV = vec2(0, 1);

    this.heightHalf = this.localHeightHalf;
    this._initialized = true;
  }

  /**
   * Update world-space center and axes from the object's transform.
   * For static colliders, you could skip calling this every frame,
   * but it's cheap enough that we just call it always.
   */
  update() {
    if (!this._initialized || !this.object) return;

    const obj = this.object;

    // Local center -> world
    this.centerWorld.copy(this.localCenter);
    obj.localToWorld(this.centerWorld);

    this.center2D.x = this.centerWorld.x;
    this.center2D.z = this.centerWorld.z;

    // World scale
    obj.getWorldScale(this._tmpScale);

    // Height (simple Y overlap)
    this.heightHalf = this.localHeightHalf * Math.abs(this._tmpScale.y || 1);

    // Orientation: get world quaternion, project local axes to XZ
    obj.getWorldQuaternion(this._tmpQuat);

    const localX = new TRef.Vector3(1, 0, 0).applyQuaternion(this._tmpQuat);
    const localZ = new TRef.Vector3(0, 0, 1).applyQuaternion(this._tmpQuat);

    const u = vec2(localX.x, localX.z);
    const v = vec2(localZ.x, localZ.z);
    vec2Normalize(u);
    vec2Normalize(v);

    this.axisU = u;
    this.axisV = v;

    // world extents in X/Z
    this.halfX = Math.max(0.001, this.localHalfSize.x * Math.abs(this._tmpScale.x || 1));
    this.halfZ = Math.max(0.001, this.localHalfSize.z * Math.abs(this._tmpScale.z || 1));
  }

  /**
   * Point containment test (for arrow hit).
   * @param {THREE.Vector3} point
   */
  containsPoint(point) {
    if (!this._initialized) return false;
    // Y overlap check
    const dy = Math.abs(point.y - this.centerWorld.y);
    if (dy > this.heightHalf) return false;

    // XZ plane SAT: transform point into OBB local coords
    const p2 = vec2(point.x, point.z);
    const d = vec2Sub(p2, this.center2D);

    const localX = vec2Dot(d, this.axisU);
    const localZ = vec2Dot(d, this.axisV);

    return (
      Math.abs(localX) <= this.halfX + 1e-4 &&
      Math.abs(localZ) <= this.halfZ + 1e-4
    );
  }
}

/**
 * SAT-based intersection between two ColliderOBBs (XZ plane + Y overlap).
 * Returns { intersects: boolean, axis: vec2, depth: number, sign: +1/-1 }.
 * sign is the direction to push A away from B along axis.
 */
function testOBBIntersection(a, b) {
  if (!a || !b) {
    return { intersects: false };
  }

  // --- Y overlap ---
  const dy = Math.abs(a.centerWorld.y - b.centerWorld.y);
  if (dy > a.heightHalf + b.heightHalf) {
    return { intersects: false };
  }

  // 2D SAT on XZ
  const axes = [a.axisU, a.axisV, b.axisU, b.axisV];

  const c1 = a.center2D;
  const c2 = b.center2D;
  const centerDiff = vec2Sub(c1, c2);

  let minOverlap = Infinity;
  let bestAxis = null;
  let bestSign = 1;

  for (const axis of axes) {
    const axisNorm = vec2Normalize({ x: axis.x, z: axis.z });

    const projCenterDiff = Math.abs(vec2Dot(centerDiff, axisNorm));

    // projection radius for a
    const r1 =
      Math.abs(a.halfX * vec2Dot(a.axisU, axisNorm)) +
      Math.abs(a.halfZ * vec2Dot(a.axisV, axisNorm));
    // projection radius for b
    const r2 =
      Math.abs(b.halfX * vec2Dot(b.axisU, axisNorm)) +
      Math.abs(b.halfZ * vec2Dot(b.axisV, axisNorm));

    const overlap = r1 + r2 - projCenterDiff;
    if (overlap <= 0) {
      // Separating axis found -> no intersection
      return { intersects: false };
    }

    if (overlap < minOverlap) {
      minOverlap = overlap;
      bestAxis = axisNorm;
      // Determine sign: push A away from B
      const signRaw = vec2Dot(centerDiff, axisNorm) >= 0 ? 1 : -1;
      bestSign = signRaw === 0 ? 1 : signRaw;
    }
  }

  return {
    intersects: true,
    axis: bestAxis,
    depth: minOverlap,
    sign: bestSign,
  };
}

// -------------------------------------------------------
// Public initialization / configuration
// -------------------------------------------------------

export function initCollisionSystem(T, scene, playerController, colliders = []) {
  TRef = T;
  overworldSceneRef = scene;
  sceneRef = scene;
  playerRef = playerController;

  // Build OBBs from the provided colliders (e.g., mapInfo.walls)
  overworldColliders = Array.isArray(colliders)
    ? colliders.map((obj) => new ColliderOBB(obj, false))
    : [];
  staticColliders = overworldColliders;

  console.log("Collision system (OBB) initialized.");
}

// Tell the collision system about the dungeon scene
export function registerDungeonSceneForCollision(dungeonScene) {
  dungeonSceneRef = dungeonScene;
}

// Switch between overworld and dungeon collision mode
export function setCollisionDungeonMode(isInDungeon) {
  inDungeonSpace = !!isInDungeon;

  staticColliders = inDungeonSpace ? dungeonColliders : overworldColliders;

  if (inDungeonSpace && dungeonSceneRef) {
    sceneRef = dungeonSceneRef;
  } else {
    sceneRef = overworldSceneRef;
  }
}

// Optionally set dungeon colliders in bulk (array of meshes/objects)
export function setDungeonColliders(colliders = []) {
  dungeonColliders = Array.isArray(colliders)
    ? colliders.map((obj) => new ColliderOBB(obj, false))
    : [];
  if (inDungeonSpace) {
    staticColliders = dungeonColliders;
  }
}

export function updateCollisionSystem(dt) {
  if (!TRef || !sceneRef || !playerRef || !playerRef.mesh) return;
  if (!collisionEnabled || !playerCollisionEnabled) return;

  try {
    handlePlayerCollisions();
    handleArrowCollisions();
  } catch (err) {
    console.warn("collisionSystem (OBB) update error", err);
  }
}

// -------------------------------------------------------
// Player collisions vs static and NPCs
// -------------------------------------------------------

function handlePlayerCollisions() {
  const playerMesh = playerRef.mesh;
  if (!playerMesh) return;

  // Player OBB
  const playerOBB = new ColliderOBB(playerMesh, true);
  playerOBB.update();

  // --- Static colliders ---
  for (const col of staticColliders) {
    if (!col || !col.object) continue;
    col.update();

    const result = testOBBIntersection(playerOBB, col);
    if (!result.intersects || !result.axis) continue;

    // resolve penetration: push player along best axis
    const move = vec2Scale(result.axis, result.depth * result.sign + 0.01);
    playerMesh.position.x += move.x;
    playerMesh.position.z += move.z;

    // update player OBB after move
    playerOBB.update();
  }

  // --- NPCs ---
  const npcs = getNPCs();
  for (const npc of npcs) {
    if (!npc || !npc.mesh) continue;

    if (!npc._obb) {
      npc._obb = new ColliderOBB(npc.mesh, true);
    }
    npc._obb.update();

    const result = testOBBIntersection(playerOBB, npc._obb);
    if (!result.intersects || !result.axis) continue;

    const move = vec2Scale(result.axis, result.depth * result.sign + 0.01);
    playerMesh.position.x += move.x;
    playerMesh.position.z += move.z;

    playerOBB.update();
  }
}

// -------------------------------------------------------
// Arrow collision handler
// -------------------------------------------------------

function handleArrowCollisions() {
  const playerArrows = [];
  const enemyArrows = [];

  if (!sceneRef) return;

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

  const npcs = getNPCs();

  // Pre-build OBBs for NPCs
  const npcObbs = new Map();
  for (const npc of npcs) {
    if (!npc || !npc.mesh) continue;
    if (!npc._obb) {
      npc._obb = new ColliderOBB(npc.mesh, true);
    }
    npc._obb.update();
    npcObbs.set(npc, npc._obb);
  }

  // Update static collider OBBs
  for (const col of staticColliders) {
    if (!col || !col.object) continue;
    col.update();
  }

  // --- Player arrows: hit NPCs or static colliders ---
  for (const arrow of playerArrows) {
    const aPos = arrow.position;
    let removed = false;

    // Hit NPCs?
    for (const [npc, obb] of npcObbs.entries()) {
      if (obb.containsPoint(aPos)) {
        removeArrow(arrow);
        removed = true;
        break;
      }
    }
    if (removed) continue;

    // Hit static colliders?
    for (const col of staticColliders) {
      if (!col || !col.object) continue;
      if (col.containsPoint(aPos)) {
        removeArrow(arrow);
        removed = true;
        break;
      }
    }
  }

  // --- Enemy arrows: can hit PLAYER, then block on NPCs or static colliders ---
  if (hasEnemyArrows && playerRef && playerRef.mesh) {
    const playerOBB = new ColliderOBB(playerRef.mesh, true);
    playerOBB.update();

    for (const arrow of enemyArrows) {
      const aPos = arrow.position;
      let removed = false;

      // 1) Hit player?
      if (playerOBB.containsPoint(aPos)) {
        const dmg =
          arrow.userData && typeof arrow.userData.damage === "number"
            ? arrow.userData.damage
            : ENEMY_ARROW_DEFAULT_DAMAGE;

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

      // 2) Blocked by NPCs (tank, etc.)
      for (const [npc, obb] of npcObbs.entries()) {
        if (obb.containsPoint(aPos)) {
          removeArrow(arrow);
          removed = true;
          break;
        }
      }
      if (removed) continue;

      // 3) Blocked by static colliders
      for (const col of staticColliders) {
        if (!col || !col.object) continue;
        if (col.containsPoint(aPos)) {
          removeArrow(arrow);
          removed = true;
          break;
        }
      }
    }
  }
}

// -------------------------------------------------------
// Utilities
// -------------------------------------------------------

function removeArrow(arrow) {
  try {
    arrow.userData = arrow.userData || {};
    arrow.userData._removed = true;
    if (arrow.parent) arrow.parent.remove(arrow);
  } catch (err) {
    // ignore
  }
}

/**
 * Register a new static collider object.
 * Keeps the same API as before: addStaticCollider(mesh, isDungeon)
 */
export function addStaticCollider(mesh, isDungeon = false) {
  if (!mesh || !TRef) return;

  const col = new ColliderOBB(mesh, false);

  if (isDungeon) {
    dungeonColliders.push(col);
    if (inDungeonSpace) {
      staticColliders = dungeonColliders;
    }
  } else {
    overworldColliders.push(col);
    if (!inDungeonSpace) {
      staticColliders = overworldColliders;
    }
  }
}

export function setPlayerCollisionEnabled(on) {
  playerCollisionEnabled = !!on;
  console.log("Player collision:", playerCollisionEnabled ? "ON" : "OFF");
}
