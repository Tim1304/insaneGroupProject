// placeholders/playerPlaceholder.js

// Player controller placeholder for testing camera, dialog, and UI.
// Aiden will replace internals later, but should keep this API shape.

const KEY = {
  W: "KeyW",
  A: "KeyA",
  S: "KeyS",
  D: "KeyD",
  DIGIT1: "Digit1", // melee weapon
  DIGIT2: "Digit2", // bow
};

export function createPlayerController(T, scene, mapInfo) {
  // --- Player visual (simple box) ---
  const playerGeo = new T.BoxGeometry(1, 2, 1);
  const playerMat = new T.MeshStandardMaterial({ color: 0x3366ff });
  const player = new T.Mesh(playerGeo, playerMat);
  player.position.set(0, 1, 0);
  scene.add(player);

  // Simple "dummy" to hit
  const dummyGeo = new T.BoxGeometry(1, 2, 1);
  const dummyMat = new T.MeshStandardMaterial({ color: 0x00ff00 });
  const dummy = new T.Mesh(dummyGeo, dummyMat);
  dummy.position.set(6, 1, 0);
  scene.add(dummy);

  // --- Movement state ---
  const keys = new Set();
  const moveSpeed = 6; // units per second
  const eyeHeight = 1.5;

  // --- Look state (controlled by cameraSystem) ---
  let yaw = 0;   // horizontal angle
  let pitch = 0; // vertical angle

  // --- Weapon state ---
  let currentWeapon = "sword"; // "sword" | "bow"
  let arrowMeshes = [];
  const arrowSpeed = 16;
  const arrowLifetime = 2.0; // seconds

  // --- Input listeners (keyboard) ---
  document.addEventListener("keydown", (e) => {
    keys.add(e.code);

    // Weapon swap
    if (e.code === KEY.DIGIT1) {
      currentWeapon = "sword";
      player.material.color.set(0x3366ff); // blue-ish for sword
    } else if (e.code === KEY.DIGIT2) {
      currentWeapon = "bow";
      player.material.color.set(0x8844cc); // purple-ish for bow
    }
  });

  document.addEventListener("keyup", (e) => {
    keys.delete(e.code);
  });

  // --- Input listener (mouse attack) ---
  document.addEventListener("mousedown", (e) => {
    // left button only, and only when pointer is locked (FPS mode)
    if (e.button !== 0) return;
    if (document.pointerLockElement == null) return;
    attack(); // call our internal attack function
  });

  // --- Helper: clamp inside map bounds if available ---
  function clampToBounds(pos) {
    if (!mapInfo || !mapInfo.bounds) return;

    const b = mapInfo.bounds;
    pos.x = Math.max(b.minX, Math.min(b.maxX, pos.x));
    pos.z = Math.max(b.minZ, Math.min(b.maxZ, pos.z));
  }

  // --- Camera helpers expected by cameraSystem ---

  function setLookAngles(newYaw, newPitch) {
    yaw = newYaw;
    // Clamp pitch a bit to avoid crazy angles
    const pitchLimit = Math.PI / 2 - 0.1;
    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, newPitch));
  }

  function getEyePosition() {
    return new T.Vector3(
      player.position.x,
      player.position.y + eyeHeight,
      player.position.z
    );
  }

  function getForwardDirection() {
    // Forward based on yaw/pitch (FPS style)
    const dir = new T.Vector3();
    const cosPitch = Math.cos(pitch);
    dir.x = Math.sin(yaw) * cosPitch;
    dir.y = Math.sin(pitch);
    dir.z = Math.cos(yaw) * cosPitch;
    dir.normalize();
    return dir;
  }

  // --- Movement update ---
  function updateMovement(dt) {
    const forward = new T.Vector3(
      Math.sin(yaw),
      0,
      Math.cos(yaw)
    );
    const right = new T.Vector3().crossVectors(forward, new T.Vector3(0, 1, 0)).normalize().negate();

    const velocity = new T.Vector3(0, 0, 0);

    if (keys.has(KEY.W)) velocity.add(forward);
    if (keys.has(KEY.S)) velocity.sub(forward);
    if (keys.has(KEY.A)) velocity.add(right);
    if (keys.has(KEY.D)) velocity.sub(right);

    if (velocity.lengthSq() > 0) {
      velocity.normalize().multiplyScalar(moveSpeed * dt);
      player.position.add(velocity);
      clampToBounds(player.position);
    }
  }

  // --- Attack logic (placeholder) ---

  function attack() {
    if (currentWeapon === "sword") {
      meleeAttack();
    } else if (currentWeapon === "bow") {
      bowAttack();
    }
  }

  function meleeAttack() {
    // Very simple: if close enough to the dummy, "hit" it
    const dist = player.position.distanceTo(dummy.position);
    if (dist < 2.5) {
      console.log("Melee hit on dummy!");
      dummy.material.color.set(0xff0000); // flash red
      setTimeout(() => dummy.material.color.set(0x00ff00), 200);
    } else {
      console.log("Melee swing (no hit)");
    }
  }

  function bowAttack() {
    const eye = getEyePosition();
    const dir = getForwardDirection();

    const arrowGeo = new T.BoxGeometry(0.1, 0.1, 0.8);
    const arrowMat = new T.MeshStandardMaterial({ color: 0xffff00 });
    const arrow = new T.Mesh(arrowGeo, arrowMat);

    // Spawn a little in front of the eye
    const spawnPos = eye.clone().add(dir.clone().multiplyScalar(0.8));
    arrow.position.copy(spawnPos);

    // Orient arrow roughly along direction
    arrow.lookAt(spawnPos.clone().add(dir));

    scene.add(arrow);

    arrowMeshes.push({
      mesh: arrow,
      dir: dir.clone(),
      age: 0,
    });
  }

  function updateArrows(dt) {
    const toRemove = [];

    arrowMeshes.forEach((arrowInfo, idx) => {
      arrowInfo.age += dt;
      if (arrowInfo.age > arrowLifetime) {
        toRemove.push(idx);
        return;
      }

      arrowInfo.mesh.position.add(
        arrowInfo.dir.clone().multiplyScalar(arrowSpeed * dt)
      );

      // simple hit test vs dummy
      const dist = arrowInfo.mesh.position.distanceTo(dummy.position);
      if (dist < 1.2) {
        console.log("Arrow hit dummy!");
        dummy.material.color.set(0xff0000);
        setTimeout(() => dummy.material.color.set(0x00ff00), 200);
        toRemove.push(idx);
      }
    });

    // remove in reverse order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const a = arrowMeshes[idx];
      scene.remove(a.mesh);
      arrowMeshes.splice(idx, 1);
    }
  }

  // --- Public update called from game.js ---
  function update(dt) {
    updateMovement(dt);
    updateArrows(dt);
  }

  return {
    mesh: player,
    update,
    getWeapon: () => currentWeapon,
    setLookAngles,
    getEyePosition,
    getForwardDirection,
    attack,        // exposed, but currently triggered by our mousedown listener
  };
}
