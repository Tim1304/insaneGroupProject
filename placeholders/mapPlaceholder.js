// placeholders/mapPlaceholder.js

/**
 * Creates a very simple map:
 * - large ground plane
 * - visual boundary walls
 * Returns basic collision bounds for the player.
 *
 * Supports:
 *   createBasicMap(T, scene)                    // FULL default behavior
 *   createBasicMap(T, scene, { mode: "prototype" }) // PROTOTYPE behavior
 */
export function createBasicMap(T, scene, opts = {}) {
  const mode = opts && opts.mode ? opts.mode : "full";
  const prototypeMode = mode === "prototype";

  // -------------------------
  // Ground
  // -------------------------
  const groundGeo = new T.PlaneGeometry(100, 100);

  let groundMat;
  if (prototypeMode) {
    // PROTOTYPE: no image textures
    groundMat = new T.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 1.0,
      metalness: 0.0,
    });
  } else {
    // FULL: keep textured ground
    let groundTexture = new T.TextureLoader().load("./env/textures/grass.jpg");
    groundTexture.wrapS = T.RepeatWrapping;
    groundTexture.wrapT = T.RepeatWrapping;
    groundTexture.repeat.set(20, 20);

    groundMat = new T.MeshStandardMaterial({
      map: groundTexture,
    });
  }

  const ground = new T.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // -------------------------
  // Grass tufts (visual-only)
  // -------------------------
  // In PROTOTYPE mode we skip it (keeps graybox feel + avoids huge geometry cost).
  if (!prototypeMode) {
    // ATTRIBUTION: CoPilot with manual edits
    // Generate grass tufts on the ground
    const grassCount = 150000;
    const grassGeometry = new T.BufferGeometry();
    const grassPositions = [];
    const grassColors = [];

    for (let i = 0; i < grassCount; i++) {
      // Random position within ground bounds
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      const y = 0;

      // Create a simple grass blade (thin vertical triangle)
      const bladeHeight = 0.15 + Math.random() * 0.4;
      const bladeWidth = 0.05;

      // Random rotation angle for blade orientation
      const angle = Math.random() * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Base vertices rotated around Y axis
      const x1 = -bladeWidth / 2;
      const x2 = bladeWidth / 2;

      grassPositions.push(
        x + x1 * cosA, y, z + x1 * sinA,
        x + x2 * cosA, y, z + x2 * sinA,
        x, y + bladeHeight, z
      );

      // Random green shade
      const g = 0.5 + Math.random() * 0.5;
      grassColors.push(
        0.1, g, 0.1,
        0.1, g, 0.1,
        0.1, g, 0.1
      );
    }

    grassGeometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(grassPositions, 3)
    );
    grassGeometry.setAttribute(
      "color",
      new T.Float32BufferAttribute(grassColors, 3)
    );

    const grassMaterial = new T.MeshBasicMaterial({
      vertexColors: true,
      side: T.DoubleSide,
    });

    const grassMesh = new T.Mesh(grassGeometry, grassMaterial);
    scene.add(grassMesh);
    // END ATTRIBUTION
  }

  // -------------------------
  // Visual arena walls (not currently added)
  // -------------------------
  const wallHeight = 3;
  const wallThickness = 0.5;
  const arenaSize = 300; // half-extent

  const wallMat = new T.MeshStandardMaterial({ color: 0x555555 });

  function makeWall(width, depth, x, z) {
    const geo = new T.BoxGeometry(width, wallHeight, depth);
    const mesh = new T.Mesh(geo, wallMat);
    mesh.position.set(x, wallHeight / 2, z);
    // RESTORE IF NECESSARY
    // scene.add(mesh);
    return mesh;
  }

  // Four walls
  const walls = [];
  walls.push(makeWall(arenaSize * 2, wallThickness, 0, -arenaSize)); // north
  walls.push(makeWall(arenaSize * 2, wallThickness, 0, arenaSize));  // south
  walls.push(makeWall(wallThickness, arenaSize * 2, -arenaSize, 0)); // west
  walls.push(makeWall(wallThickness, arenaSize * 2, arenaSize, 0));  // east

  // Return simple collision info (we'll just clamp to this box)
  return {
    bounds: {
      minX: -arenaSize + 1,
      maxX: arenaSize - 1,
      minZ: -arenaSize + 1,
      maxZ: arenaSize - 1,
    },
    walls, // in case we want more detailed collision later
    ground,
  };
}
