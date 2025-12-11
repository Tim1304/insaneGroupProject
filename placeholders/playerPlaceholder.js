// Player controller placeholder for testing camera, dialog, and UI.
// Aiden will replace internals later, but should keep this API shape.
import { getInDungeonMode, getDungeonSceneRef } from "../systems/npcSystem.js";
import { setPlayerCollisionEnabled } from "../systems/collisionSystem.js";
import * as Gen from "../env/worldObjects.js";

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

let playerCollision = true;
// 🔹 NEW: global flag to lock controls when dead
let controlsLocked = false;

export function createPlayerController(T, scene, mapInfo, playerStats) {
  //--- Player visual (simple box) ---
  let isSwinging = false;
  const player = new T.Group();
  player.position.y += 1;
  scene.add(player);

  // 🔹 Weapon root: follow camera pitch
  const weaponRoot = new T.Group();
  player.add(weaponRoot);

  let dagger = new Gen.Dagger();
  dagger.position.set(-1, 0, 2);
  weaponRoot.add(dagger);

  // start hidden; will only show when sword is equipped
  dagger.visible = false;


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
  // --- Sprinting ---
  const sprintMultiplier = 1.25; // +25% speed
  const sprintDrainPerSec = 20.0; // stamina bar drained per second while sprinting
  const staminaRegenPerSec = 10.0; // regens per second when not sprinting
  const staminaRegenDelay = 3.0; // delay until regen starts
  let isSprinting = false;
  let sprintCooldownTimer = 0.0; // counts time since sprint stopped

  // --- Head bobbing (camera) ---
  const bobEnabled = true;
  const bobAmplitudeWalk = 0.06; // vertical bob amplitude 
  const bobAmplitudeSprint = 0.12; // amplitude when sprinting
  const bobBaseFreq = 3.5;
  let bobTimer = 0.0;
  let bobOffsetY = 0.0;
  let wasMoving = false;
  let lastMoveSpeed = moveSpeed;

  // --- Vertical jump ---
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

  // 🔹 NEW: lock controls when player-dead event fires
  window.addEventListener("player-dead", () => {
    controlsLocked = true;
  });

  // --- Input listeners (keyboard) ---
  document.addEventListener("keydown", (e) => {
    if (controlsLocked) return; // 🔹 ignore input when dead

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

    if (e.code === "KeyC") {
      // Toggle player collision
      playerCollision = !playerCollision;
      setPlayerCollisionEnabled(playerCollision);
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
        // records jumps for speed stat 
        try {
          if (playerStatsRef && typeof playerStatsRef.recordJump === 'function') {
            playerStatsRef.recordJump();
          }
        } catch (err) {
        }
      }
    }
  });

  document.addEventListener("keyup", (e) => {
    if (controlsLocked) return; // 🔹 ignore input when dead
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
    if (dagger) {
      dagger.visible = currentWeapon === "sword";
    }
  }

  // --- Input listener (mouse attack) ---
  document.addEventListener("mousedown", (e) => {
    if (controlsLocked) return; // 🔹 ignore attacks when dead

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
      player.position.y + eyeHeight + bobOffsetY,
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

    const moving = keys.has(KEY.W) || keys.has(KEY.S) || keys.has(KEY.A) || keys.has(KEY.D);

    if (keys.has(KEY.W)) velocity.add(forward);
    if (keys.has(KEY.S)) velocity.sub(forward);
    if (keys.has(KEY.A)) velocity.add(right);
    if (keys.has(KEY.D)) velocity.sub(right);

    // Sprint handling: require holding Shift and moving
    const shiftPressed = keys.has("ShiftLeft") || keys.has("ShiftRight");
    // Apply speed stat (10% per level above 1)
    let speedLevel = 1;
    try {
      if (playerStatsRef && typeof playerStatsRef.getStatLevel === 'function') {
        speedLevel = Math.max(1, Number(playerStatsRef.getStatLevel('speed')) || 1);
      }
    } catch (err) {
      speedLevel = 1;
    }
    const effectiveBaseSpeed = moveSpeed * (1 + 0.1 * (Math.max(0, speedLevel - 1)));
    let currentSpeed = effectiveBaseSpeed;
    if (playerStatsRef && shiftPressed && moving && playerStatsRef.getStamina && playerStatsRef.setStamina) {
      const curStam = playerStatsRef.getStamina();
      const canSprint = curStam > 0;
      if (canSprint && shiftPressed && moving) {
        // start/continue sprinting
        isSprinting = true;
        sprintCooldownTimer = 0;
        currentSpeed = effectiveBaseSpeed * sprintMultiplier;
        // drains stamina
        const newStam = curStam - sprintDrainPerSec * dt;
        playerStatsRef.setStamina(newStam);
        // if the stamina is depleted, stop sprinting
        if (playerStatsRef.getStamina() <= 0) {
          isSprinting = false;
          sprintCooldownTimer = 0;
        }
      }
    }

    if (isSprinting && (!shiftPressed || !moving)) {
      isSprinting = false;
      sprintCooldownTimer = 0; // start cooldown before regen
    }

    // If player is not sprinting: regen after cooldown regardless of current stamina
    if (!isSprinting && playerStatsRef && playerStatsRef.getStamina && playerStatsRef.setStamina) {
      sprintCooldownTimer += dt;
      if (sprintCooldownTimer >= staminaRegenDelay) {
        const cur = playerStatsRef.getStamina();
        if (cur < 100) {
          playerStatsRef.setStamina(cur + staminaRegenPerSec * dt);
        }
      }
    }

    if (velocity.lengthSq() > 0) {
      velocity.normalize().multiplyScalar(currentSpeed * dt);
      // Rotate player to face forward direction
      player.rotation.y = Math.atan2(forward.x, forward.z);
      player.position.add(velocity);
      clampToBounds(player.position);
    }

    // bobbing state
    const currentlyMoving = velocity.lengthSq() > 0;
    wasMoving = currentlyMoving;
    lastMoveSpeed = currentSpeed;
  }

  function updateBobbing(dt) {
    if (!bobEnabled) {
      bobOffsetY = 0;
      return;
    }

    // bob only when moving and grounded
    const moving = wasMoving && isGrounded;

    if (moving) {
      // bob frequency scales with speed
      const freq = bobBaseFreq * (lastMoveSpeed / moveSpeed);
      const amp = isSprinting ? bobAmplitudeSprint : bobAmplitudeWalk;
      bobTimer += dt * freq;
      bobOffsetY = Math.sin(bobTimer * Math.PI * 2) * amp;
    } else {
      bobOffsetY = bobOffsetY * Math.max(0, 1 - 10 * dt);
      if (bobTimer > 1e6) bobTimer = bobTimer % 1.0;
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

    // Trigger sword swing animation (alternating diagonal)
    if (weapon === "sword" && dagger && typeof dagger.startSwing === "function") {
      dagger.startSwing();
      isSwinging = true;
    }

    // base stats
    let dmg = 20;
    let range = 2.5; // sword base

    if (weapon === "hand") {
      dmg = 10;
      range = 2.5 / 2; // shorter reach
    }

    // apply strength stat for sword damage (10% per level above 1)
    if (
      weapon === "sword" &&
      playerStatsRef &&
      typeof playerStatsRef.getStatLevel === "function"
    ) {
      try {
        const lvl = Number(playerStatsRef.getStatLevel("strength")) || 1;
        const mult = 1 + 0.1 * Math.max(0, lvl - 1);
        dmg = dmg * mult;
      } catch (err) {
        // ignore
      }
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

    // Put the arrow into the *active* scene:
    // - overworld when we are outside
    // - dungeon scene when we are inside
    let parentScene = scene;
    try {
      if (typeof getInDungeonMode === "function" && getInDungeonMode()) {
        const dungeonScene =
          typeof getDungeonSceneRef === "function"
            ? getDungeonSceneRef()
            : null;
        if (dungeonScene) {
          parentScene = dungeonScene;
        }
      }
    } catch (err) {
      // if anything goes wrong, we just fall back to the overworld scene
    }

    parentScene.add(arrow);

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
            dmg: (function () {
              let base = 15;
              try {
                if (playerStatsRef && typeof playerStatsRef.getStatLevel === 'function') {
                  const lvl = Number(playerStatsRef.getStatLevel('handEye')) || 1;
                  const mult = 1 + 0.1 * Math.max(0, lvl - 1);
                  base = base * mult;
                }
              } catch (err) { }
              return base;
            })(),
          },
        })
      );
    } catch (err) {
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
    // If dead, freeze movement/jumping/bobbing.
    if (controlsLocked) {
      return;
    }
    // Dagger animation
    if (isSwinging) {
      console.log("hello");
      isSwinging = dagger.animateSwing(dt);
    }
    updateVertical(dt);
    updateMovement(dt);
    updateBobbing(dt);
    updateArrows(dt);
    player.rotation.y = Math.atan2(getForwardDirection().x, getForwardDirection().z);
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
