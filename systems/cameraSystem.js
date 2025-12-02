// systems/cameraSystem.js

let sceneRef = null;
let cameraRef = null;
let playerRef = null;
let domRef = null;

let pointerLocked = false;
let yaw = 0;
let pitch = 0;
const pitchLimit = Math.PI / 2 - 0.1;

export function initCameraSystem(scene, camera, playerController, domElement) {
  sceneRef = scene;
  cameraRef = camera;
  playerRef = playerController;
  domRef = domElement;

  if (!domRef) {
    console.warn("CameraSystem: no DOM element provided for pointer lock.");
    return;
  }

  // Click: first time = request pointer lock, later = attack
  domRef.addEventListener("click", () => {
    if (!pointerLocked) {
      domRef.requestPointerLock();
      return;
    }
    if (playerRef && playerRef.attack) {
      playerRef.attack();
    }
  });

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === domRef;
  });

  // Mouse move → adjust yaw/pitch
  document.addEventListener("mousemove", (e) => {
    if (!pointerLocked) return;
    if (!playerRef) return;

    const sensitivity = 0.0025;

    // FIXED: moving mouse right turns camera right (positive yaw)
    yaw += e.movementX * sensitivity;
    // keep typical FPS vertical (mouse up → look up)
    pitch -= e.movementY * sensitivity;

    // clamp pitch
    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));

    playerRef.setLookAngles(yaw, pitch);
  });

  console.log("Camera system initialized.");
}

export function updateCameraSystem(dt) {
  if (!cameraRef || !playerRef) return;

  const eye = playerRef.getEyePosition();
  const dir = playerRef.getForwardDirection();

  cameraRef.position.copy(eye);
  cameraRef.lookAt(eye.clone().add(dir));
}
