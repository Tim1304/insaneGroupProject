// @ts-check
import * as T from "../CS559-Three/build/three.module.js";

export class Dungeon extends T.Scene {
  /**
   * @param {number} lenPieces
   * @param {*} player
   * @param {{ mode?: "full" | "prototype" }=} opts
   */
  constructor(lenPieces = 3, player, opts = {}) {
    super();

    const mode = opts.mode ?? "full";
    const prototypeMode = mode === "prototype";

    const self = this;
    self.add(player);

    // Valid tunnel cells where we can spawn monsters
    this.spawnCells = [];

    /* -------------------- Lighting -------------------- */
    this.add(new T.AmbientLight(0xffffff, prototypeMode ? 0.4 : 0.01));
    const dirLight = new T.DirectionalLight(0xffffff, prototypeMode ? 0.6 : 0.2);
    dirLight.position.set(10, 5, 10);
    this.add(dirLight);

    /* -------------------- Materials -------------------- */
    let wallMat, floorMat, doorMat, finalWallMat;

    if (prototypeMode) {
      wallMat = new T.MeshStandardMaterial({ color: 0x444444 });
      floorMat = new T.MeshStandardMaterial({ color: 0x2a2a2a });
      doorMat = new T.MeshStandardMaterial({ color: 0x1f1f26 });
      finalWallMat = new T.MeshStandardMaterial({ color: 0x555555 });
    } else {
      const loader = new T.TextureLoader();
      wallMat = new T.MeshBasicMaterial({
        map: loader.load("./env/textures/dungeon-wall.jpg"),
      });
      floorMat = new T.MeshStandardMaterial({
        map: loader.load("./env/textures/dirt.jpg"),
      });
      doorMat = new T.MeshBasicMaterial({
        map: loader.load("./env/textures/dungeon-door.jpg"),
      });
      finalWallMat = new T.MeshBasicMaterial({
        map: loader.load("./env/textures/dungeon-end.jpg"),
      });
    }

    /* -------------------- Geometry -------------------- */
    const wallGeom = new T.BoxGeometry(0.5, 4, 8);
    const floorGeom = new T.BoxGeometry(8, 0.5, 8);
    const conWallGeom = new T.BoxGeometry(0.5, 4, 11.31);

    /* -------------------- Initial Door -------------------- */
    const firstWall = new T.Mesh(wallGeom, doorMat);
    firstWall.position.set(0, 2, -4);
    firstWall.rotateY(Math.PI / 2);
    this.add(firstWall);

    /* -------------------- Generation State -------------------- */
    let lastJointRight = false;
    let lastJointForward = true;
    let currentX = 0;
    let currentZ = 0;

    /* -------------------- Tunnel Pieces -------------------- */
    function createBox(x, z) {
      const floor = new T.Mesh(floorGeom, floorMat);
      floor.position.set(x, -0.25, z);
      self.add(floor);

      self.spawnCells.push({ x, z });

      const walls = new T.Group();
      const w1 = new T.Mesh(wallGeom, wallMat);
      const w2 = new T.Mesh(wallGeom, wallMat);
      w1.position.set(4, 2, 0);
      w2.position.set(-4, 2, 0);
      walls.add(w1, w2);

      const ceiling = new T.Mesh(floorGeom, wallMat);
      ceiling.position.set(x, 4, z);

      walls.position.set(x, 0, z);
      self.add(walls);
      self.add(ceiling);

      if (!lastJointForward) {
        walls.rotateY(Math.PI / 2);
        currentX += lastJointRight ? -8 : 8;
      } else {
        currentZ += 8;
      }
    }

    function createJoint(x, z, rightHanded = true) {
      const conWall = new T.Mesh(conWallGeom, wallMat);
      const conFloor = new T.Mesh(floorGeom, floorMat);
      const conCeil = new T.Mesh(floorGeom, wallMat);

      if (lastJointForward) {
        createBox(x, z);
        lastJointForward = false;

        if (rightHanded) {
          createBox(x - 8, z + 8);
          conWall.position.set(x, 2, z + 8);
          conWall.rotateY(-Math.PI / 4);
          currentX = x - 16;
          lastJointRight = true;
        } else {
          createBox(x + 8, z + 8);
          conWall.position.set(x, 2, z + 8);
          conWall.rotateY(Math.PI / 4);
          currentX = x + 16;
          lastJointRight = false;
        }

        conFloor.position.set(x, -0.25, z + 8);
        conCeil.position.set(x, 4, z + 8);
        currentZ = z + 8;
      } else {
        createBox(x, z);
        lastJointForward = true;

        if (lastJointRight) {
          createBox(x - 8, z + 8);
          conWall.position.set(x - 8, 2, z);
          conWall.rotateY(-Math.PI / 4);
          currentX = x - 8;
        } else {
          createBox(x + 8, z + 8);
          conWall.position.set(x + 8, 2, z);
          conWall.rotateY(Math.PI / 4);
          currentX = x + 8;
        }

        conFloor.position.set(conWall.position.x, -0.25, z);
        conCeil.position.set(conWall.position.x, 4, z);
        currentZ = z + 16;
      }

      self.add(conWall, conFloor, conCeil);
    }

    /* -------------------- Generate Dungeon -------------------- */
    let count = 0;
    while (count < lenPieces) {
      Math.random() < 0.25
        ? createBox(currentX, currentZ)
        : createJoint(currentX, currentZ, Math.random() < 0.5);
      count++;
    }

    /* -------------------- Final Wall -------------------- */
    const finalWall = new T.Mesh(wallGeom, finalWallMat);
    if (lastJointForward) {
      finalWall.position.set(currentX, 2, currentZ - 4);
      finalWall.rotateY(Math.PI / 2);
    } else {
      finalWall.position.set(
        currentX + (lastJointRight ? 4 : -4),
        2,
        currentZ
      );
    }
    this.add(finalWall);
  }

  /* -------------------- Spawn Helper -------------------- */
  getRandomSpawnPosition() {
    if (!this.spawnCells.length) return new T.Vector3(0, 1, 0);
    const c = this.spawnCells[Math.floor(Math.random() * this.spawnCells.length)];
    return new T.Vector3(
      c.x + (Math.random() * 6 - 3),
      1,
      c.z + (Math.random() * 6 - 3)
    );
  }
}
