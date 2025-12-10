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

// Sample environment objects
const birch = new Gen.Birch(new T.Vector3(5, 0, 5), 1);
scene.add(birch);
const spruce = new Gen.Spruce(new T.Vector3(5, 0, 10), 1.5);
scene.add(spruce);
const rock = new Gen.Rock(new T.Vector3(10, 0, 5), 2);
scene.add(rock);
const well = new Gen.Well(new T.Vector3(10, 0, 10), 1);
scene.add(well);
const oak = new Gen.Oak(new T.Vector3(0, 0, 10), 1.2);
scene.add(oak);
const bush = new Gen.Bush(new T.Vector3(-3, 0, 10), 1.3);
scene.add(bush);
const barrel = new Gen.Barrel(new T.Vector3(0, 0, 5), 1);
scene.add(barrel);

// Dungeon entrance (overworld)
let dungeonEntrance = new Gen.DungeonEntrance(new T.Vector3(-7, -3, 8), 7);
dungeonEntrance.rotateY(Math.PI / 1.2);
scene.add(dungeonEntrance);
registerDungeonEntrance(dungeonEntrance);

const camera = new T.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Dungeon / scene state
let activeScene = scene;
let inDungeon = false;

let hasSpawnedDungeonMonsters = false;

function spawnInitialDungeonMonsters() {
  // difficulty = 1 for now, spawns around the player
  for (let i = 0; i < 3; i++) {
    spawnRandomMonster(1);
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
setCollisionEnabled(false);

// Register world objects as static colliders
addStaticCollider(birch);
addStaticCollider(spruce);
addStaticCollider(rock);
addStaticCollider(well);
addStaticCollider(oak);
addStaticCollider(bush);
addStaticCollider(barrel);
addStaticCollider(dungeonEntrance);

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
const dungeon = new Dungeon();
registerDungeonScene(dungeon);

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
  setInDungeonMode(true);

  if (playerController && playerController.mesh) {
    // Teleport player logically to dungeon location
    playerController.mesh.position.set(0, 0, 0);
  }

  // Spawn monsters the first time we enter the dungeon
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

  if (playerController && playerController.mesh) {
    // Return player near the dungeon entrance in overworld
    playerController.mesh.position.set(-7, 0, 8);
  }

  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);
});

// --- Main loop ---
function animate(time) {
  const dt = (time - lastTime) / 1000 || 0;
  lastTime = time;

  playerController.update(dt);
  updateNPCSystem(dt);
  updateDialogSystem(dt);
  updateCameraSystem(dt);
  updateBattleSystem(dt);
  updateCollisionSystem(dt);
  updateUIManager(dt);

  // Ambient animations
  oak.animateLeaves(dt);
  spruce.animateLeaves(dt);
  birch.animateLeaves(dt);
  bush.animateLeaves(dt);

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
