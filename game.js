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
  registerTavernEntrance,
  getAliveMobs,
  setInTavernMode,
  registerTavernInnkeeper,
  removeNPCsInScene,
  setPrototypeMode,
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
  registerDungeonSceneForCollision,
  setCollisionDungeonMode,
  setDungeonColliders,
} from "./systems/collisionSystem.js";

import * as Gen from "./env/worldObjects.js";
import { Dungeon } from "./env/Dungeon.js";

// ---- IMPORTANT ----
// This file must not auto-run.
// startScreen.js will dynamic-import game.js and call startGame().

let _started = false;

function addStaticColliderWhenReady(obj, isDungeon = false, shrinkXZ = 1.0, shrinkY = 1.0) {
  let done = false;

  function hasAnyMesh(o) {
    let found = false;
    o.traverse((c) => {
      if (c && c.isMesh) found = true;
    });
    return found;
  }

  function tick() {
    if (done) return;

    // Wait until GLTF children (meshes) exist
    if (obj && obj.traverse && hasAnyMesh(obj)) {
      addStaticCollider(obj, isDungeon, shrinkXZ, shrinkY);
      done = true;
      return;
    }

    requestAnimationFrame(tick);
  }

  tick();
}


/**
 * @param {{mode?: "full" | "prototype"}=} opts
 */
export function startGame(opts = {}) {
  if (_started) return;
  _started = true;

  const mode = opts && opts.mode ? opts.mode : "full";
  const prototypeMode = mode === "prototype";

  setPrototypeMode(prototypeMode);

  console.log(`[Game] Starting in mode: ${prototypeMode ? "PROTOTYPE" : "FULL"}`);

  // --- Renderer setup ---
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const host = document.getElementById("div1");
  if (!host) {
    throw new Error('Missing <div id="div1"></div> in index.html');
  }
  host.appendChild(renderer.domElement);

  // --- Scene & camera ---
  const scene = new T.Scene();

  const camera = new T.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, -10);
  camera.lookAt(0, 0, 0);

  // Dungeon / scene state
  let activeScene = scene;
  let inDungeon = false;

  let inTavern = false;
  let tavernScene = null;

  let hasSpawnedDungeonMonsters = false;
  let aliveMobs = [];
  window.aliveMobs = aliveMobs;

  // --- Lights ---
  const ambientLight = new T.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  const dirLight = new T.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // --------------------------
  // PROTOTYPE helpers (primitives only)
  // --------------------------
  function makeProtoMat(color) {
    return new T.MeshStandardMaterial({ color });
  }

  function makeProtoBox(w, h, d, color) {
    return new T.Mesh(new T.BoxGeometry(w, h, d), makeProtoMat(color));
  }

  function makeProtoCylinder(rTop, rBot, h, color) {
    return new T.Mesh(new T.CylinderGeometry(rTop, rBot, h, 16), makeProtoMat(color));
  }

  function buildPrototypeDungeonEntrance() {
    const cube = makeProtoBox(2.0, 2.0, 2.0, 0x3a3a3a);
    cube.position.set(0, 1.0, 30); // same spot as your full cave entrance
    return cube;
  }

  function buildPrototypeTavernEntrance() {
    const cube = makeProtoBox(2.0, 2.0, 2.0, 0x5b3a2a);
    cube.position.set(-10, 1.0, 0); // same “village tavern” region
    return cube;
  }

  function buildPrototypeOverworldStatics() {
    // a few trees/rocks as primitives, plus “village-ish” markers
    for (let i = 0; i < 120; i++) {
      const x = (Math.random() - 0.5) * 120;
      const z = (Math.random() - 0.5) * 120;
      if (Math.hypot(x, z) < 18) continue; // keep a clear center-ish area

      // tree = trunk cylinder + canopy box
      const trunk = makeProtoCylinder(0.35, 0.45, 3.0, 0x6b4a2f);
      trunk.position.set(x, 1.5, z);
      scene.add(trunk);
      addStaticCollider(trunk, false, 0.9, 0.9);

      const canopy = makeProtoBox(2.2, 2.2, 2.2, 0x2e6b3f);
      canopy.position.set(x, 3.4, z);
      scene.add(canopy);
      addStaticCollider(canopy, false, 0.9, 0.9);
    }

    // simple plaza props near village
    const well = makeProtoCylinder(1.2, 1.2, 1.2, 0x777777);
    well.position.set(0, 0.6, 7);
    scene.add(well);
    addStaticCollider(well);

    const house = makeProtoBox(8, 5, 8, 0x8a8a8a);
    house.position.set(2, 2.5, -8);
    scene.add(house);
    addStaticCollider(house);
  }

  // --------------------------
  // Map placeholder (Tim)
  // NOTE: we pass opts so later we can remove textures inside mapPlaceholder.js
  // (extra arg is harmless until that file is updated)
  // --------------------------
  const mapInfo = createBasicMap(T, scene, { mode });

  // --- Player stats (Aiden) ---
  const playerStats = createPlayerStats();

  // --- Player placeholder (Aiden) ---
  // NOTE: later we’ll make playerPlaceholder respect prototype mode (primitive weapons)
  const playerController = createPlayerController(T, scene, mapInfo, playerStats, { mode });

  // --- systems ---
  initNPCSystem(T, scene, playerController);
  initDialogSystem(scene, playerController, playerStats);
  initCameraSystem(scene, camera, playerController, renderer.domElement);
  initUIManager(renderer.domElement, playerController, playerStats);
  initBattleSystem(scene, playerController, playerStats);
  initCollisionSystem(T, scene, playerController, mapInfo.walls || []);

  // --------------------------
  // Environment / map layout
  // --------------------------
  const animatedEnvironment = [];

  function registerAnimatedFoliage(obj) {
    if (obj && typeof obj.animateLeaves === "function") {
      animatedEnvironment.push(obj);
    }
  }

  function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function createTreeCluster(radius, numTrees) {
    let count = 0;
    while (count < numTrees) {
      const horiz = Math.random() < 0.5 ? 1 : -1;
      let x = randomInRange(-50, 50);
      let z = randomInRange(-50, 50);
      if (Math.hypot(x, z) > radius) {
        const type = Math.floor(Math.random() * 5);
        const pos = new T.Vector3(x, 0, z);
        const scale = 0.8 + Math.random() * 0.7;
        let tree;

        if (type === 0) tree = new Gen.Birch(pos, scale);
        else if (type === 1) tree = new Gen.Spruce(pos, scale);
        else if (type === 2) tree = new Gen.Oak(pos, scale);
        else if (type === 3) tree = new Gen.Bush(pos, scale);
        else tree = new Gen.Rock(pos, scale);

        tree.rotateY(Math.random() * Math.PI * 2);
        scene.add(tree);
        registerAnimatedFoliage(tree);
        addStaticCollider(tree, false, 0.55, 0.75);

        count++;
      }
    }
  }

  function createVillage() {
    // Tavern
    const tavern = new Gen.Tavern(new T.Vector3(-10, -1.5, 0), 4);
    tavern.rotateY(Math.PI / 4);
    scene.add(tavern);
    addStaticColliderWhenReady(tavern, false, 0.08, 0.08);
    registerTavernEntrance(tavern);

    const house2 = new Gen.House(new T.Vector3(10, 0, 6), 1);
    house2.rotateY(Math.PI / 2);
    scene.add(house2);
    addStaticCollider(house2);

    const largeHouse = new Gen.LargeHouse(new T.Vector3(0, 0, -8), 1);
    largeHouse.rotateY(Math.PI);
    scene.add(largeHouse);
    addStaticCollider(largeHouse);

    const well = new Gen.Well(new T.Vector3(0, 0, 7), 1);
    scene.add(well);
    addStaticCollider(well);

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.3;
      const r = 2 + Math.random();
      const pos = new T.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r + 7);
      const barrel = new Gen.Barrel(pos, 1);
      barrel.rotateY(Math.random() * Math.PI * 2);
      scene.add(barrel);
      addStaticCollider(barrel);
    }
  }

  // Dungeon entrance (overworld)
  let dungeonEntrance = null;
  if (prototypeMode) {
    dungeonEntrance = buildPrototypeDungeonEntrance();
    scene.add(dungeonEntrance);
    addStaticCollider(dungeonEntrance);
    registerDungeonEntrance(dungeonEntrance);
    // prototype village/tavern entrances
    const tavernEntrance = buildPrototypeTavernEntrance();
    scene.add(tavernEntrance);
    addStaticCollider(tavernEntrance);
    registerTavernEntrance(tavernEntrance);

    buildPrototypeOverworldStatics();
  } else {
    dungeonEntrance = new Gen.DungeonEntrance(new T.Vector3(0, -3, 30), 7);
    dungeonEntrance.rotateY(Math.PI / 1.2);
    scene.add(dungeonEntrance);
    registerDungeonEntrance(dungeonEntrance);

    function generateOverworld() {
      createTreeCluster(15, 100);
      createVillage();
      addStaticCollider(dungeonEntrance);
    }
    generateOverworld();
  }

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

  if (prototypeMode) {
    // No texture skybox in prototype mode
    scene.background = new T.Color(0x101018);
  } else {
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

  function spawnInitialDungeonMonsters() {
    for (let i = 0; i < 3; i++) {
      const pos = dungeon.getRandomSpawnPosition();
      spawnRandomMonster(1, pos.x, pos.z);
    }
  }

  function initDungeonScene(newDungeon) {
    registerDungeonScene(newDungeon);
    registerDungeonSceneForCollision(newDungeon);

    const dungeonWalls = [];
    const tempBox = new T.Box3();

    newDungeon.traverse((obj) => {
      if (!obj.isMesh) return;
      tempBox.setFromObject(obj);
      const height = tempBox.max.y - tempBox.min.y;
      if (height > 2.0) dungeonWalls.push(obj);
    });

    setDungeonColliders(dungeonWalls);

    const dungeonExitGeo = new T.BoxGeometry(2, 3, 0.5);
    const dungeonExitMat = new T.MeshStandardMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.6,
    });
    const dungeonExit = new T.Mesh(dungeonExitGeo, dungeonExitMat);
    dungeonExit.position.set(0, 1.5, -8);
    newDungeon.add(dungeonExit);
    registerDungeonExit(dungeonExit);
  }

  // --- Dungeon setup ---
  let dungeon = new Dungeon(3, playerController, { mode });
  initDungeonScene(dungeon);

  function buildNewDungeon() {
    if (dungeon) removeNPCsInScene(dungeon);

    dungeon = new Dungeon(3, playerController, { mode });

    registerDungeonScene(dungeon);
    registerDungeonSceneForCollision(dungeon);

    const dungeonWalls = [];
    const tempBox = new T.Box3();

    dungeon.traverse((obj) => {
      if (!obj.isMesh) return;
      tempBox.setFromObject(obj);
      const height = tempBox.max.y - tempBox.min.y;
      if (height > 2.0) dungeonWalls.push(obj);
    });

    setDungeonColliders(dungeonWalls);

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

    hasSpawnedDungeonMonsters = false;
  }

  // Dungeon enter
  window.addEventListener("dungeon-enter-request", () => {
    buildNewDungeon();

    inDungeon = true;
    activeScene = dungeon;
    setCollisionDungeonMode(true);
    setInDungeonMode(true);

    if (playerController && playerController.mesh) {
      dungeon.add(playerController.mesh);
      playerController.mesh.position.set(0, 1, 0);
    }

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
    setCollisionDungeonMode(false);

    if (playerController && playerController.mesh) {
      scene.add(playerController.mesh);
      playerController.mesh.position.set(-7, 1, 8);
    }

    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
  });

  // Tavern exit
  window.addEventListener("tavern-exit-request", () => {
    inTavern = false;
    activeScene = scene;

    setInTavernMode(false);
    setCollisionDungeonMode(false);

    window.dispatchEvent(new Event("force-dialog-end"));

    if (playerController && playerController.mesh) {
      scene.add(playerController.mesh);
      playerController.mesh.position.set(-10, 1, 4);
    }

    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
  });

  // Press F to exit Tavern
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyF" && inTavern) {
      window.dispatchEvent(new Event("tavern-exit-request"));
    }
  });

  // Tavern enter
  window.addEventListener("tavern-enter-request", () => {
    inDungeon = false;
    inTavern = true;

    (async () => {
      try {
        if (!tavernScene) {
          if (prototypeMode) {
            // Primitive-only tavern interior
            tavernScene = new T.Scene();

            const amb = new T.AmbientLight(0xffffff, 0.6);
            tavernScene.add(amb);

            const dl = new T.DirectionalLight(0xffffff, 0.8);
            dl.position.set(5, 10, 5);
            tavernScene.add(dl);

            const floor = new T.Mesh(
              new T.BoxGeometry(20, 1, 20),
              makeProtoMat(0x303030)
            );
            floor.position.set(0, -0.5, 0);
            tavernScene.add(floor);

            const wallN = makeProtoBox(20, 6, 1, 0x4a3a2f);
            wallN.position.set(0, 2.5, -10);
            tavernScene.add(wallN);

            const wallS = makeProtoBox(20, 6, 1, 0x4a3a2f);
            wallS.position.set(0, 2.5, 10);
            tavernScene.add(wallS);

            const wallE = makeProtoBox(1, 6, 20, 0x4a3a2f);
            wallE.position.set(10, 2.5, 0);
            tavernScene.add(wallE);

            const wallW = makeProtoBox(1, 6, 20, 0x4a3a2f);
            wallW.position.set(-10, 2.5, 0);
            tavernScene.add(wallW);

            // simple “innkeeper” as a capsule-like stack
            const inn = new T.Group();
            const body = makeProtoCylinder(0.6, 0.6, 2.0, 0x2f6aa0);
            body.position.y = 1.0;
            inn.add(body);
            const head = new T.Mesh(new T.SphereGeometry(0.45, 16, 16), makeProtoMat(0xf1c9a5));
            head.position.y = 2.2;
            inn.add(head);
            inn.position.set(0, 0, -4);
            tavernScene.add(inn);

            // mimic Tavern.js API used elsewhere
            tavernScene.innkeeper = {
              mesh: inn,
              name: "Innkeeper",
              animate: () => { },
            };

            registerTavernInnkeeper(tavernScene.innkeeper);
          } else {
            const mod = await import("./env/Tavern.js");
            const Tavern = mod.Tavern;
            tavernScene = new Tavern();
          }
        }

        activeScene = tavernScene;
        setInTavernMode(true);

        if (!prototypeMode) {
          registerTavernInnkeeper(tavernScene.innkeeper);
        }

        setInDungeonMode(false);
        setCollisionDungeonMode(false);

        if (playerController && playerController.mesh) {
          tavernScene.add(playerController.mesh);
          playerController.mesh.position.set(0, 1, 0);
        }

        camera.position.set(0, 5, 10);
        camera.lookAt(0, 0, 0);
      } catch (err) {
        console.warn(
          "Tavern.js not available yet – tavern teleport event is wired, but scene is missing.",
          err
        );
      }
    })();
  });

  // --- Main loop ---
  function animate(time) {
    const dt = (time - lastTime) / 1000 || 0;
    lastTime = time;

    // Only animate innkeeper if it exists and has animate()
    if (tavernScene && inTavern && tavernScene.innkeeper && typeof tavernScene.innkeeper.animate === "function") {
      tavernScene.innkeeper.animate(dt);
    }

    getAliveMobs().forEach((mob) => {
      mob["mesh"].animate(dt);
    });

    playerController.update(dt);
    updateNPCSystem(dt);
    updateDialogSystem(dt);
    updateCameraSystem(dt);
    updateBattleSystem(dt);
    updateCollisionSystem(dt);
    updateUIManager(dt);

    aliveMobs = getAliveMobs();
    window.aliveMobs = aliveMobs;

    animatedEnvironment.forEach((obj) => obj.animateLeaves(dt));

    if (!prototypeMode) {
      timeSinceLastSkybox += dt;
      if (timeSinceLastSkybox >= 5) {
        if (currentSkybox === 0) dayToNight = true;
        else if (currentSkybox === 4) dayToNight = false;

        timeSinceLastSkybox = 0;
        currentSkybox += dayToNight ? 1 : -1;

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
    }

    renderer.render(activeScene, camera);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
