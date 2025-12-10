// placeholders/playerPlaceholder.js

// Player controller placeholder for testing camera, dialog, and UI.
// Aiden will replace internals later, but should keep this API shape.

const KEY = {
  W: "KeyW",
  A: "KeyA",
  S: "KeyS",
  D: "KeyD",
  DIGIT1: "Digit1", // fist (hand)
  DIGIT2: "Digit2", // sword
  DIGIT3: "Digit3", // bow / aim
  SPACE: "Space",
};

export function createPlayerController(T, scene, mapInfo, playerStats) {
  // --- Player visual (simple box) ---
  const playerGeo = new T.BoxGeometry(1, 2, 1);
  const playerMat = new T.MeshStandardMaterial({ color: 0x3366ff });
  const player = new T.Mesh(playerGeo, playerMat);
  player.position.set(0, 1, 0);
  scene.add(player);

  // Simple "dummy" to hit (for debug)
  const dummyGeo = new T.BoxGeometry(1, 2, 1);
  const dummyMat = new T.MeshStandardMaterial({ color: 0x00ff00 });
  const dummy = new T.Mesh(dummyGeo, dummyMat);
  dummy.position.set(6, 1, 0);
  scene.add(dummy);

  const playerStatsRef = playerStats || null;

  // --- Movement state ---
  const keys = new Set();
  const moveSpeed = 6; // units per second
  const eyeHeight = 1.5;

  // --- Vertical jump
  let velocityY = 0; // units per second
  const gravity = 30;
  const jumpStrength = 8; // initial jump velocity
  const groundY = player.position.y;
  let isGrounded = true;

  // --- Bow aiming / crosshair ---
  let isAimingBow = false;
  let crosshairEl = null;

  // --- Look state (controlled by cameraSystem) ---
  let yaw = 0;   // horizontal angle
  let pitch = 0; // vertical angle

  // --- Weapon state ---
  let currentWeapon = "hand"; // "hand" | "sword" | "bow"
  let arrowMeshes = [];
  const arrowSpeed = 16;
  const arrowLifetime = 2.0; // seconds

  // --- Input listeners (keyboard) ---
  document.addEventListener("keydown", (e) => {
    keys.add(e.code);

    // Weapon switching:
    if (e.code === KEY.DIGIT1) {
      // fists are always available
      setCurrentWeapon("hand");
      return;
    }

    if (e.code === KEY.DIGIT2) {
      if (playerStatsRef && typeof playerStatsRef.ownsWeapon === "function") {
        if (!playerStatsRef.ownsWeapon("sword")) {
          console.log("[Player] You don't own a sword yet.");
          return;
        }
      }
      setCurrentWeapon("sword");
      return;
    }

    if (e.code === KEY.DIGIT3) {
      // Bow only if owned
      if (playerStatsRef && typeof playerStatsRef.ownsWeapon === "function") {
        if (!playerStatsRef.ownsWeapon("bow")) {
          console.log("[Player] You don't own a bow yet.");
          return;
        }
      }
      // toggle aim mode with bow equipped
      setCurrentWeapon("bow");
      if (!isAimingBow) {
        isAimingBow = true;
        createCrosshair();
      } else {
        isAimingBow = false;
        removeCrosshair();
      }
      return;
    }

    // Space: jump
    if (e.code === KEY.SPACE) {
      if (isGrounded) {
        velocityY = jumpStrength;
        isGrounded = false;
      }
    }
  });

  document.addEventListener("keyup", (e) => {
    keys.delete(e.code);
  });

  // --- Listen to inventory / external weapon changes ---
  window.addEventListener("player-weapon-changed", (e) => {
    const detail = e.detail || {};
    const w = detail.equipped;
    if (!w) return;
    // When external system (inventory) changes weapon, follow it.
    setCurrentWeapon(w);
  });

  function setCurrentWeapon(type) {
    if (type !== "hand" && type !== "sword" && type !== "bow") return;

    currentWeapon = type;

    if (currentWeapon !== "bow") {
      // only bow uses our crosshair/aim state
      isAimingBow = false;
      removeCrosshair();
    }

    if (playerStatsRef && typeof playerStatsRef.getEquippedWeapon === "function") {
      const statsWeapon = playerStatsRef.getEquippedWeapon();
      if (statsWeapon !== type && typeof playerStatsRef.equipWeapon === "function") {
        // sync stats with controller
        playerStatsRef.equipWeapon(type);
      }
    }

    console.log("[Player] Equipped weapon:", currentWeapon);
  }

  // --- Input listener (mouse attack) ---
  document.addEventListener("mousedown", (e) => {
    // left button only
    if (e.button !== 0) return;

    // If we're aiming the bow (crosshair visible) allows click to fire
    if (isAimingBow && currentWeapon === "bow") {
      bowAttack();
      // exit aiming mode after shot
      isAimingBow = false;
      removeCrosshair();
      return;
    }

    // otherwise require pointer lock for FPS-style attacks
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

  function updateVertical(dt) {
    if (!isGrounded || velocityY !== 0) {
      velocityY -= gravity * dt;
      player.position.y += velocityY * dt;

      if (player.position.y <= groundY) {
        player.position.y = groundY;
        velocityY = 0;
        isGrounded = true;
      }
    }
  }

  // --- Attack logic ---

  function attack() {
    if (currentWeapon === "sword") {
      meleeAttack("sword");
    } else if (currentWeapon === "bow") {
      bowAttack();
    } else {
      // fists
      meleeAttack("hand");
    }
  }

  function meleeAttack(weaponOverride) {
    const weapon = weaponOverride || currentWeapon;

    // base stats
    let dmg = 20;
    let range = 2.5; // sword base

    if (weapon === "hand") {
      dmg = 10;
      range = 2.5 / 2; // shorter reach
    }

    range = range * 2; // fudge factor

    const dist = player.position.distanceTo(dummy.position);
    if (dist < range) {
      console.log(`Melee hit on dummy! dmg=${dmg} range=${range}`);
      dummy.material.color.set(0xff0000); // flash red
      setTimeout(() => dummy.material.color.set(0x00ff00), 200);
    } else {
      console.log(`Melee swing (no hit) range=${range}`);
    }

    try {
      window.dispatchEvent(
        new CustomEvent("player-attack", {
          detail: {
            pos: player.position.clone(),
            range,
            dmg,
          },
        })
      );
    } catch (err) {
      // ignore if dispatch fails
    }
  }

  function createCrosshair() {
    if (crosshairEl) return;
    crosshairEl = document.createElement("div");
    crosshairEl.style.position = "fixed";
    crosshairEl.style.left = "50%";
    crosshairEl.style.top = "50%";
    crosshairEl.style.transform = "translate(-50%, -50%)";
    crosshairEl.style.width = "24px";
    crosshairEl.style.height = "24px";
    crosshairEl.style.zIndex = "3000";
    crosshairEl.style.pointerEvents = "none";
    crosshairEl.style.display = "flex";
    crosshairEl.style.alignItems = "center";
    crosshairEl.style.justifyContent = "center";
    crosshairEl.style.color = "white";
    crosshairEl.style.fontSize = "20px";
    crosshairEl.innerText = "+";
    document.body.appendChild(crosshairEl);
  }

  function removeCrosshair() {
    if (!crosshairEl) return;
    if (crosshairEl.parentElement) crosshairEl.parentElement.removeChild(crosshairEl);
    crosshairEl = null;
  }

  function bowAttack() {
    const eye = getEyePosition();
    const dir = getForwardDirection();

    const arrowGeo = new T.BoxGeometry(0.1, 0.1, 0.8);
    const arrowMat = new T.MeshStandardMaterial({ color: 0xffff00 });
    const arrow = new T.Mesh(arrowGeo, arrowMat);

    const spawnPos = eye.clone().add(dir.clone().multiplyScalar(0.8));
    arrow.position.copy(spawnPos);
    arrow.lookAt(spawnPos.clone().add(dir));

    scene.add(arrow);

    arrow.userData = arrow.userData || {};
    arrow.userData.isPlayerArrow = true;
    arrow.userData._removed = false;

    arrowMeshes.push({
      mesh: arrow,
      dir: dir.clone(),
      age: 0,
    });

    try {
      window.dispatchEvent(
        new CustomEvent("bow-shot", {
          detail: {
            pos: eye.clone(),
            dir: dir.clone(),
            dmg: 15,
          },
        })
      );
    } catch (err) {
      // ignore
    }
  }

  function updateArrows(dt) {
    const toRemove = [];

    arrowMeshes.forEach((arrowInfo, idx) => {
      arrowInfo.age += dt;
      if (arrowInfo.age > arrowLifetime) {
        if (arrowInfo.mesh && arrowInfo.mesh.userData) arrowInfo.mesh.userData._removed = true;
        toRemove.push(idx);
        return;
      }

      arrowInfo.mesh.position.add(
        arrowInfo.dir.clone().multiplyScalar(arrowSpeed * dt)
      );

      const dist = arrowInfo.mesh.position.distanceTo(dummy.position);
      if (dist < 1.2) {
        console.log("Arrow hit dummy!");
        dummy.material.color.set(0xff0000);
        setTimeout(() => dummy.material.color.set(0x00ff00), 200);
        if (arrowInfo.mesh && arrowInfo.mesh.userData) arrowInfo.mesh.userData._removed = true;
        toRemove.push(idx);
      }
    });

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const a = arrowMeshes[idx];
      scene.remove(a.mesh);
      arrowMeshes.splice(idx, 1);
    }
  }

  // --- Public update called from game.js ---
  function update(dt) {
    updateVertical(dt);
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
  };
}
