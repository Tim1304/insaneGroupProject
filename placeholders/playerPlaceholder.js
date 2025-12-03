// placeholders/playerPlaceholder.js

const KEY = {
  W: "KeyW",
  A: "KeyA",
  S: "KeyS",
  D: "KeyD",
  DIGIT1: "Digit1",
  DIGIT2: "Digit2",
};

export function createPlayerController(T, scene, mapInfo) {
  // --- Player mesh ---
  const playerGeo = new T.BoxGeometry(1, 2, 1);
  const playerMat = new T.MeshStandardMaterial({ color: 0xff0000 }); // sword (red)
  const player = new T.Mesh(playerGeo, playerMat);
  player.position.set(0, 1, 0);
  scene.add(player);

  // --- Orientation (controlled by cameraSystem) ---
  let yaw = 0;   // left/right
  let pitch = 0; // up/down
  const pitchLimit = Math.PI / 2 - 0.1;

  // --- Keyboard state ---
  const keys = new Set();

  window.addEventListener("keydown", (e) => {
    keys.add(e.code);

    // Weapon selection: 1 = melee / sword, 2 = bow
    if (e.code === KEY.DIGIT1) {
      setWeapon("sword");
    } else if (e.code === KEY.DIGIT2) {
      setWeapon("bow");
    }
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
  });

  // --- Weapon state ---
  let currentWeapon = "sword"; // "sword" or "bow"

  function updatePlayerColor() {
    if (currentWeapon === "sword") {
      player.material.color.set(0xff0000); // red
    } else {
      player.material.color.set(0x0088ff); // blue
    }
  }

  function setWeapon(type) {
    currentWeapon = type;
    updatePlayerColor();
    console.log("Weapon set to:", currentWeapon);
  }

  // --- Projectiles (arrows) ---
  const arrows = [];
  const arrowSpeed = 25;
  const arrowLifetime = 2.0;

  function shootArrow() {
    if (currentWeapon !== "bow") return;

    const arrowGeo = new T.BoxGeometry(0.2, 0.2, 0.6);
    const arrowMat = new T.MeshStandardMaterial({ color: 0xffff00 });
    const arrow = new T.Mesh(arrowGeo, arrowMat);

    const eye = getEyePosition();
    arrow.position.copy(eye);

    const dir = getForwardDirection();
    arrow.lookAt(eye.clone().add(dir));
    scene.add(arrow);

    arrows.push({
      mesh: arrow,
      direction: dir.clone().normalize(),
      age: 0,
    });
  }

  function updateArrows(dt) {
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i];
      a.age += dt;

      a.mesh.position.addScaledVector(a.direction, arrowSpeed * dt);

      if (a.age > arrowLifetime) {
        scene.remove(a.mesh);
        arrows.splice(i, 1);
      }
    }
  }

  // --- Melee (placeholder) ---
  let meleeCooldown = 0;

  function meleeAttack() {
    if (currentWeapon !== "sword") return;
    if (meleeCooldown > 0) return;

    meleeCooldown = 0.3;

    player.scale.set(1.2, 0.8, 1.2);
    setTimeout(() => {
      player.scale.set(1, 1, 1);
    }, 150);

    console.log("Melee attack!");
  }

  // --- Simple interactable object ---
  const interactGeo = new T.BoxGeometry(1, 1, 1);
  const interactMat = new T.MeshStandardMaterial({ color: 0x00ff00 });
  const interactObj = new T.Mesh(interactGeo, interactMat);
  interactObj.position.set(5, 0.5, 0);
  scene.add(interactObj);

  function tryInteract() {
    const dist = player.position.distanceTo(interactObj.position);
    if (dist < 2.5) {
      interactObj.material.color.set(0xffff00);
      console.log("Interacted with object!");
    } else {
      console.log("Too far to interact.");
    }
  }

  // --- Movement & collision (WASD in yaw space) ---
  const moveSpeed = 10;

  function updateMovement(dt) {
    const forward = new T.Vector3(
      Math.sin(yaw),
      0,
      -Math.cos(yaw)
    );
    const right = new T.Vector3(forward.z, 0, -forward.x);

    let moveDir = new T.Vector3();

    if (keys.has(KEY.W)) moveDir.add(forward);
    if (keys.has(KEY.S)) moveDir.addScaledVector(forward, -1);
    if (keys.has(KEY.A)) moveDir.add(right);
    if (keys.has(KEY.D)) moveDir.addScaledVector(right, -1);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      player.position.addScaledVector(moveDir, moveSpeed * dt);
    }

    if (mapInfo && mapInfo.bounds) {
      const { minX, maxX, minZ, maxZ } = mapInfo.bounds;
      player.position.x = Math.max(minX, Math.min(maxX, player.position.x));
      player.position.z = Math.max(minZ, Math.min(maxZ, player.position.z));
    }

    // for later enemy reuse / 3rd person
    player.rotation.y = yaw;
  }

  // --- Eye & direction helpers (used by cameraSystem & arrows) ---
  function getEyePosition() {
    const eye = player.position.clone();
    eye.y += 1.6;
    return eye;
  }

  function getForwardDirection() {
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const dir = new T.Vector3(
      Math.sin(yaw) * cosPitch,
      sinPitch,
      -Math.cos(yaw) * cosPitch
    );
    return dir.normalize();
  }

  // --- Exposed hooks for cameraSystem ---
  function setLookAngles(newYaw, newPitch) {
    yaw = newYaw;

    // clamp pitch here too, just in case
    pitch = Math.max(-pitchLimit, Math.min(pitchLimit, newPitch));
  }

  function attack() {
    if (currentWeapon === "sword") {
      meleeAttack();
    } else if (currentWeapon === "bow") {
      shootArrow();
    }
  }

  // --- Exposed update function ---
  function update(dt) {
    meleeCooldown = Math.max(0, meleeCooldown - dt);

    updateMovement(dt);
    updateArrows(dt);
  }

  // default weapon
  setWeapon("sword");

  return {
    mesh: player,
    update,
    getWeapon: () => currentWeapon,
    // camera helpers
    setLookAngles,
    getEyePosition,
    getForwardDirection,
    attack,
  };
}
