// @ts-check
import * as T from "./CS559-Three/build/three.module.js";

import { createBasicMap } from "./placeholders/mapPlaceholder.js";
import { createPlayerController } from "./placeholders/playerPlaceholder.js";

import { initNPCSystem, updateNPCSystem } from "./systems/npcSystem.js";
import { initDialogSystem, updateDialogSystem } from "./systems/dialogSystem.js";
import { initCameraSystem, updateCameraSystem } from "./systems/cameraSystem.js";
import { createPlayerStats } from "./placeholders/playerStatsPlaceholder.js";
import { initUIManager, updateUIManager } from "./systems/ui/uiManager.js";
import { initBattleSystem, updateBattleSystem } from "./systems/battleSystem.js";
import { initCollisionSystem, updateCollisionSystem, addStaticCollider } from "./systems/collisionSystem.js";
import * as Gen from "./env/worldObjects.js";
import { Dungeon } from "./env/Dungeon.js";

// --- Renderer setup ---
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("div1").appendChild(renderer.domElement);

// --- Scene & camera ---
const scene = new T.Scene();
// These are just sample objects for review
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
let dungeonEntrance = new Gen.DungeonEntrance(new T.Vector3(-7, -3, 8), 7);
dungeonEntrance.rotateY(Math.PI / 1.2);
scene.add(dungeonEntrance);

const camera = new T.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// --- Lights ---
const ambientLight = new T.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const dirLight = new T.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// --- Map placeholder (Tim) ---
/* returns:
    bounds: {
      minX: -arenaSize + 1,
      maxX: arenaSize - 1,
      minZ: -arenaSize + 1,
      maxZ: arenaSize - 1,
    },
    walls, // in case we want more detailed collision later
    ground, 
*/
const mapInfo = createBasicMap(T, scene);

// --- Player placeholder (Aiden) ---
/* returns:
    1. mesh
    2. update(dt) 
    3. setLookAngles(yaw, pitch) where 
            • yaw (number): rotation around vertical axis.
            • pitch (number): rotation around horizontal axis.
    4. getEyePosition()
            • Returns a THREE.Vector3.
            • Represents where the camera should be placed (eye height).
    5. getForwardDirection
            • Returns a normalized THREE.Vector3.
            • Represents viewing direction calculated from stored yaw/pitch.
 */
const playerController = createPlayerController(T, scene, mapInfo);

// --- Player stats placeholder (Aiden) ---
/* returns:
    getHealth: () => health,
    getStamina: () => stamina,

    more to be added later...
 */
const playerStats = createPlayerStats();

// --- systems ---
initNPCSystem(T, scene, playerController);
initDialogSystem(scene, playerController);
initCameraSystem(scene, camera, playerController, renderer.domElement);
initUIManager(renderer.domElement, playerController, playerStats);
initBattleSystem(scene, playerController);
initCollisionSystem(T, scene, playerController, mapInfo.walls || []);

// Registers world objects as static colliders so player and arrows can't pass through them
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

// --- Main loop ---
let lastTime = 0;
// Switch to determine the direction of the skybox shift
let dayToNight = true;
let currentSkybox = 0;
let timeSinceLastSkybox = 0;
let parentDir = './env/textures/sky/';
const loader = new T.CubeTextureLoader();
loader.setPath(parentDir + `${currentSkybox}/`);
let textureCube = loader.load([
  'left.png', 'right.png', 'top.png', 'bottom.png', 'back.png', 'front.png'
]);
scene.background = textureCube;

// Dungeon test
const dungeon = new Dungeon();

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

  // Skybox color shift logic
  // Shifts to next skybox every minute
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
      'left.png', 'right.png', 'top.png', 'bottom.png', 'back.png', 'front.png'
    ]);
    scene.background = textureCube;
  }

  // SCENE SELECTION
  renderer.render(dungeon, camera);
  //renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
