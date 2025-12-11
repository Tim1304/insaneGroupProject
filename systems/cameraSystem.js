// systems/cameraSystem.js
import * as T from "three";
import * as Gen from "../env/worldObjects.js";

let sceneRef = null;
let cameraRef = null;
let playerRef = null;
let domRef = null;

let pointerLocked = false;
let inDialog = false;

// yaw / pitch for FPS look
let yaw = 0;
let pitch = 0;
const pitchLimit = Math.PI / 2 - 0.1; // avoid flipping over

export function initCameraSystem(scene, camera, playerController, domElement) {
  sceneRef = scene;
  cameraRef = camera;
  playerRef = playerController;
  domRef = domElement;

  if (!domRef) {
    console.warn("CameraSystem: no DOM element provided for pointer lock.");
    return;
  }

  // Left click: request pointer lock if not in dialog and not already locked.
  domRef.addEventListener("click", () => {
    if (inDialog) return;
    if (!pointerLocked) {
      domRef.requestPointerLock();
    }
    // When pointer is already locked, we do nothing here.
  });

  // Track pointer lock state
  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === domRef;
  });

  // Mouse look while pointer is locked
  document.addEventListener("mousemove", (e) => {
    if (!pointerLocked) return;
    if (!playerRef || typeof playerRef.setLookAngles !== "function") return;

    const sensitivity = 0.0025;

    // Moving mouse right -> look right
    yaw -= e.movementX * sensitivity;
    // Moving mouse up -> look up
    pitch -= e.movementY * sensitivity;

    // Clamp pitch to avoid flipping
    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));

    playerRef.setLookAngles(yaw, pitch);
  });

  // --- Dialog integration: unlock pointer when dialog opens ---

  window.addEventListener("dialog-start", () => {
    inDialog = true;
    if (document.pointerLockElement === domRef) {
      document.exitPointerLock();
    }
  });

  window.addEventListener("dialog-end", () => {
    inDialog = false;
  });

  console.log("Camera system initialized.");
}

export function updateCameraSystem(dt) {
  if (!cameraRef || !playerRef) return;

  if (
    typeof playerRef.getEyePosition !== "function" ||
    typeof playerRef.getForwardDirection !== "function"
  ) {
    return;
  }

  const eye = playerRef.getEyePosition();
  const dir = playerRef.getForwardDirection();

  cameraRef.position.copy(eye);
  cameraRef.add(new T.Mesh(new T.SphereGeometry(10, 32, 32), new T.MeshBasicMaterial({ color: 0xff0000 })));
  cameraRef.lookAt(eye.clone().add(dir));
}
