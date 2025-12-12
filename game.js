// game.js
// @ts-check
import * as T from "./CS559-Three/build/three.module.js";

import { createBasicMap } from "./placeholders/mapPlaceholder.js";
import { createPlayerController } from "./placeholders/playerPlaceholder.js";

import {
  initNPCSystem,
  updateNPCSystem,
  registerDungeonEntrance,
  registerDungeonExit,
  registerDungeonScene,
  setInDungeonMode,
  spawnRandomMonster,
  registerTavernEntrance,
  getAliveMobs,
} from "./systems/npcSystem.js";


import { initDialogSystem, updateDialogSystem } from "./systems/dialogSystem.js";
import { initCameraSystem, updateCameraSystem } from "./systems/cameraSystem.js";
import { createPlayerStats } from "./placeholders/playerStatsPlaceholder.js";
import { initUIManager, updateUIManager } from "./systems/ui/uiManager.js";
import { initBattleSystem, updateBattleSystem } from "./systems/battleSystem.js";
import {
  initCollisionSystem,
  updateCollisionSystem,
  addStaticCollider,
  setCollisionEnabled,
  registerDungeonSceneForCollision,
  setCollisionDungeonMode,
  setDungeonColliders,
} from "./systems/collisionSystem.js";
import * as Gen from "./env/worldObjects.js";
import { Dungeon } from "./env/Dungeon.js";

// --- Renderer setup ---
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("div1").appendChild(renderer.domElement);

// --- Scene & camera ---
const scene = new T.Scene();

// Dungeon entrance (overworld)
let dungeonEntrance = new Gen.DungeonEntrance(new T.Vector3(0, -3, 30), 7);
dungeonEntrance.rotateY(Math.PI / 1.2);
scene.add(dungeonEntrance);
registerDungeonEntrance(dungeonEntrance);

const camera = new T.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, -10);
camera.lookAt(0, 0, 0);

// Dungeon / scene state
let activeScene = scene;
let inDungeon = false;

let inTavern = false;
let tavernScene = null;

let hasSpawnedDungeonMonsters = false;

let aliveMobs = [];

// expose for debugging in console
window.aliveMobs = aliveMobs;

function spawnInitialDungeonMonsters() {
  for (let i = 0; i < 3; i++) {
    // Use Dungeon's built-in helper
    const pos = dungeon.getRandomSpawnPosition();
    spawnRandomMonster(1, pos.x, pos.z);
  }
}


// --- Lights ---
const ambientLight = new T.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const dirLight = new T.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// --- Map placeholder (Tim) ---
const mapInfo = createBasicMap(T, scene);

// --- Player stats (Aiden) ---
const playerStats = createPlayerStats();

// --- Player placeholder (Aiden) ---
const playerController = createPlayerController(T, scene, mapInfo, playerStats);

// --- systems ---
initNPCSystem(T, scene, playerController);
initDialogSystem(scene, playerController, playerStats);
initCameraSystem(scene, camera, playerController, renderer.domElement);
initUIManager(renderer.domElement, playerController, playerStats);
initBattleSystem(scene, playerController, playerStats);
initCollisionSystem(T, scene, playerController, mapInfo.walls || []);

// TEMP: disable collision so we can walk into cave
//setCollisionEnabled(false);

// --------------------------
// Environment / map layout
// --------------------------

// All objects that have animateLeaves(dt)
const animatedEnvironment = [];

/**
 * Register a foliage object that exposes animateLeaves(dt)
 * so we can update it centrally in the main loop.
 * @param {any} obj
 */
function registerAnimatedFoliage(obj) {
  if (obj && typeof obj.animateLeaves === "function") {
    animatedEnvironment.push(obj);
  }
}

/**
 * Simple random helper in [min, max]
 */
function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Create a mixed tree cluster (Birch/Spruce/Oak/Bush/Boulder)
 * @param {number} radius
 * @param {number} count
 */
function createTreeCluster(radius, numTrees) {
  let count = 0;
  while (count < numTrees) {
    const angle = Math.random() * Math.PI * 2;
    // Determine on which side of the exclusion circle the tree will be placed
    const horiz = Math.random() < 0.5 ? 1 : -1;
    let x = randomInRange(-50, 50);
    let z = randomInRange(-50, 50);
    if (Math.hypot(x, z) > radius) {
      const type = Math.floor(Math.random() * 5); // 0 = Birch, 1 = Spruce, 2 = Oak, 3 = Bush, 4 = Boulder
      const pos = new T.Vector3(x, 0, z);
      const scale = 0.8 + Math.random() * 0.7;
      let tree;

      if (type === 0) {
        tree = new Gen.Birch(pos, scale);
      } else if (type === 1) {
        tree = new Gen.Spruce(pos, scale);
      } else if (type === 2) {
        tree = new Gen.Oak(pos, scale);
      } else if (type === 3) {
        tree = new Gen.Bush(pos, scale);
      } else {
        tree = new Gen.Rock(pos, scale);
      }

      tree.rotateY(Math.random() * Math.PI * 2);
      scene.add(tree);
      registerAnimatedFoliage(tree);
      addStaticCollider(tree, false, 0.55, 0.75);

      count++;
    }
  }
}

/**
 * Create a small village with houses, a central well, and barrels.
 */
function createVillage() {
  // Houses around the center, rotated for a natural look

  // Tavern
  const tavern = new Gen.Tavern(new T.Vector3(-10, -1.5, 0), 4);
  tavern.rotateY(Math.PI / 4);
  scene.add(tavern);
  addStaticCollider(tavern);
  registerTavernEntrance(tavern);

  const house2 = new Gen.House(new T.Vector3(10, 0, 6), 1);
  house2.rotateY(Math.PI / 2);
  scene.add(house2);
  addStaticCollider(house2);

  const largeHouse = new Gen.LargeHouse(new T.Vector3(0, 0, -8), 1);
  largeHouse.rotateY(Math.PI);
  scene.add(largeHouse);
  addStaticCollider(largeHouse);

  // Central well
  const well = new Gen.Well(new T.Vector3(0, 0, 7), 1);
  scene.add(well);
  addStaticCollider(well);

  // Barrels scattered around the well
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.3;
    const r = 2 + Math.random();
    const pos = new T.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r + 7);
    const barrel = new Gen.Barrel(pos, 1);
    barrel.rotateY(Math.random() * Math.PI * 2);
    scene.add(barrel);
    addStaticCollider(barrel);
  }
}

/**
 * Generate the overworld layout: forest, village, scattered rocks/bushes.
 */
function generateOverworld() {
  // Forest patches
  createTreeCluster(15, 300);

  // Village with well and barrels
  createVillage();

  // Dungeon entrance collider
  addStaticCollider(dungeonEntrance);
}

// Build the overworld after systems are ready
//generateOverworld();

// --- Resize handling ---
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

// --- Skybox ---
let lastTime = 0;
let dayToNight = true;
let currentSkybox = 0;
let timeSinceLastSkybox = 0;
let parentDir = "./env/textures/sky/";
const loader = new T.CubeTextureLoader();
loader.setPath(parentDir + `${currentSkybox}/`);
let textureCube = loader.load([
  "left.png",
  "right.png",
  "top.png",
  "bottom.png",
  "back.png",
  "front.png",
]);
scene.background = textureCube;

scene.add(new T.AxesHelper(5));

// --- Dungeon setup ---
const dungeon = new Dungeon(3, playerController);
registerDungeonScene(dungeon);

// Tell the collision system about the dungeon scene
registerDungeonSceneForCollision(dungeon);

// Build a list of dungeon wall meshes to use as colliders
const dungeonWalls = [];
const tempBox = new T.Box3();

dungeon.traverse((obj) => {
  if (!obj.isMesh) return;

  // Approximate filter: treat tall meshes as walls, ignore flat floors
  tempBox.setFromObject(obj);
  const height = tempBox.max.y - tempBox.min.y;

  if (height > 2.0) {
    dungeonWalls.push(obj);
  }
});

// Register dungeon walls as dungeon colliders
setDungeonColliders(dungeonWalls);


// Simple dungeon exit object
const dungeonExitGeo = new T.BoxGeometry(2, 3, 0.5);
const dungeonExitMat = new T.MeshStandardMaterial({
  color: 0x66ccff,
  transparent: true,
  opacity: 0.6,
});
const dungeonExit = new T.Mesh(dungeonExitGeo, dungeonExitMat);
dungeonExit.position.set(0, 1.5, -8);
dungeon.add(dungeonExit);
registerDungeonExit(dungeonExit);

// Dungeon enter
window.addEventListener("dungeon-enter-request", () => {
  inDungeon = true;
  activeScene = dungeon;
  setCollisionDungeonMode(true);
  setInDungeonMode(true);

  if (playerController && playerController.mesh) {
    // Move player (and all its children like the sword) into the dungeon scene
    dungeon.add(playerController.mesh);

    // Teleport player logically to dungeon location
    playerController.mesh.position.set(0, 1, 0);  // use groundY
  }

  if (!hasSpawnedDungeonMonsters) {
    spawnInitialDungeonMonsters();
    hasSpawnedDungeonMonsters = true;
  }

  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);
});

// Dungeon exit
window.addEventListener("dungeon-exit-request", () => {
  inDungeon = false;
  activeScene = scene;
  setInDungeonMode(false);
  setCollisionDungeonMode(false);

  if (playerController && playerController.mesh) {
    // Move player (and sword) back to overworld scene
    scene.add(playerController.mesh);

    // Return player near the dungeon entrance in overworld
    playerController.mesh.position.set(-7, 1, 8);  // use groundY
  }

  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);
});

// Tavern enter
window.addEventListener("tavern-enter-request", () => {
  // We are not in dungeon anymore
  inDungeon = false;
  inTavern = true;

  (async () => {
    try {
      // Lazy-load Tavern.js so the game does not break while it doesn't exist yet
      if (!tavernScene) {
        const mod = await import("./env/Tavern.js");
        const Tavern = mod.Tavern;
        tavernScene = new Tavern();
      }

      activeScene = tavernScene;

      // Tavern is NOT "dungeon mode" for NPC logic or collision
      setInDungeonMode(false);
      setCollisionDungeonMode(false);

      if (playerController && playerController.mesh) {
        // Move player into tavern scene
        tavernScene.add(playerController.mesh);
        playerController.mesh.position.set(0, 1, 0);
      }

      camera.position.set(0, 5, 10);
      camera.lookAt(0, 0, 0);
    } catch (err) {
      // While Tavern.js is missing, we just log and do nothing else.
      console.warn(
        "Tavern.js not available yet – tavern teleport event is wired, but scene is missing.",
        err
      );
    }
  })();
});

// --- Main loop ---
function animate(time) {
  const dt = (time - lastTime) / 1000 || 0;
  lastTime = time;

  if (tavernScene && inTavern)
    tavernScene.innkeeper.animate(dt);

  playerController.update(dt);
  updateNPCSystem(dt);
  updateDialogSystem(dt);
  updateCameraSystem(dt);
  updateBattleSystem(dt);
  updateCollisionSystem(dt);
  updateUIManager(dt);

  // Refresh the alive mobs array
  aliveMobs = getAliveMobs();
  window.aliveMobs = aliveMobs; // keep the global in sync

  aliveMobs.forEach((mob) => {
    const mobType = mob.type;   // "melee" | "bow" | "tank"
    const mobId = mob.id;
  });

// Ambient foliage animations (trees, bushes)
animatedEnvironment.forEach((obj) => obj.animateLeaves(dt));

// Skybox color shift
timeSinceLastSkybox += dt;
if (timeSinceLastSkybox >= 5) {
  if (currentSkybox === 0) {
    dayToNight = true;
  } else if (currentSkybox === 4) {
    dayToNight = false;
  }
  timeSinceLastSkybox = 0;
  currentSkybox += dayToNight ? 1 : -1;
  console.log(`Switching to skybox ${currentSkybox}`);
  loader.setPath(parentDir + `${currentSkybox}/`);
  let textureCube = loader.load([
    "left.png",
    "right.png",
    "top.png",
    "bottom.png",
    "back.png",
    "front.png",
  ]);
  scene.background = textureCube;
}

renderer.render(activeScene, camera);

requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
