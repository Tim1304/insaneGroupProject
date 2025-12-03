// @ts-check
import * as T from "./CS559-Three/build/three.module.js";

import { createBasicMap } from "./placeholders/mapPlaceholder.js";
import { createPlayerController } from "./placeholders/playerPlaceholder.js";

import { initNPCSystem, updateNPCSystem } from "./systems/npcSystem.js";
import { initDialogSystem, updateDialogSystem } from "./systems/dialogSystem.js";
import { initCameraSystem, updateCameraSystem } from "./systems/cameraSystem.js";
import { createPlayerStats } from "./placeholders/playerStatsPlaceholder.js";
import { initUIManager, updateUIManager } from "./systems/ui/uiManager.js";

// --- Renderer setup ---
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("div1").appendChild(renderer.domElement);

// --- Scene & camera ---
const scene = new T.Scene();
scene.background = new T.Color(0x202020);

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

// --- Your systems ---
initNPCSystem(T, scene, playerController);
initDialogSystem(scene, playerController);
initCameraSystem(scene, camera, playerController, renderer.domElement);
initUIManager(renderer.domElement, playerController, playerStats);

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

function animate(time) {
  const dt = (time - lastTime) / 1000 || 0;
  lastTime = time;

  playerController.update(dt);
  updateNPCSystem(dt);
  updateDialogSystem(dt);
  updateCameraSystem(dt);
  updateUIManager(dt);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
