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

    domRef.addEventListener("click", () => {
    if (!pointerLocked) {
        domRef.requestPointerLock();
        return;
    }

    if (playerRef && playerRef.attack) {
        playerRef.attack();

        // 🔔 Notify weapon UI that an attack happened
        const weapon =
        playerRef.getWeapon && typeof playerRef.getWeapon === "function"
            ? playerRef.getWeapon()
            : null;

        window.dispatchEvent(
        new CustomEvent("weapon-attack", {
            detail: { weapon },
        })
        );
    }
    });

    document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === domRef;
    });

    document.addEventListener("mousemove", (e) => {
    if (!pointerLocked) return;
    if (!playerRef) return;

    const sensitivity = 0.0025;

    // moving mouse right -> look right
    yaw += e.movementX * sensitivity;
    // mouse up -> look up
    pitch -= e.movementY * sensitivity;

    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));

    playerRef.setLookAngles(yaw, pitch);
    });

    // --- Dialog integration ---

    // When dialog starts, unlock pointer and show cursor
    window.addEventListener("dialog-start", () => {
    // Exit pointer lock if active
    if (document.pointerLockElement === domRef) {
    document.exitPointerLock();
    }
    });

    // When dialog ends, pointer is no longer locked
    // Next click will request pointer lock again (as normal)
    window.addEventListener("dialog-end", () => {
    // Nothing special needed — next click will re-lock
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
