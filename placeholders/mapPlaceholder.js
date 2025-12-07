// placeholders/mapPlaceholder.js

/**
 * Creates a very simple map:
 * - large ground plane
 * - visual boundary walls
 * Returns basic collision bounds for the player.
 */
export function createBasicMap(T, scene) {
  // Ground
  const groundGeo = new T.PlaneGeometry(100, 100);
  let groundTexture = new T.TextureLoader().load("./env/textures/grass.jpg");
  groundTexture.wrapS = T.RepeatWrapping;
  groundTexture.wrapT = T.RepeatWrapping;
  groundTexture.repeat.set(20, 20);
  const groundMat = new T.MeshStandardMaterial({
    map: groundTexture,
    side: T.DoubleSide,
  });
  const ground = new T.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

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

    // Three vertices for a triangle blade
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

    // Slight color variation for natural look
    const greenShade = 0.1 + Math.random() * 0.3;
    for (let j = 0; j < 3; j++) {
      grassColors.push(0.2, greenShade, 0.1);
    }
  }

  grassGeometry.setAttribute('position', new T.Float32BufferAttribute(grassPositions, 3));
  grassGeometry.setAttribute('color', new T.Float32BufferAttribute(grassColors, 3));

  const grassMaterial = new T.MeshBasicMaterial({
    vertexColors: true,
    side: T.DoubleSide
  });

  const grassMesh = new T.Mesh(grassGeometry, grassMaterial);
  scene.add(grassMesh);
  // END ATTRIBUTION

  // Simple square “arena” walls for visual feedback
  const wallHeight = 3;
  const wallThickness = 0.5;
  const arenaSize = 300; // half-extent

  const wallMat = new T.MeshStandardMaterial({ color: 0x555555 });

  function makeWall(width, depth, x, z) {
    const geo = new T.BoxGeometry(width, wallHeight, depth);
    const mesh = new T.Mesh(geo, wallMat);
    mesh.position.set(x, wallHeight / 2, z);
    scene.add(mesh);
    return mesh;
  }

  // Four walls
  const walls = [];
  walls.push(
    makeWall(arenaSize * 2, wallThickness, 0, -arenaSize) // front
  );
  walls.push(
    makeWall(arenaSize * 2, wallThickness, 0, arenaSize) // back
  );
  walls.push(
    makeWall(wallThickness, arenaSize * 2, -arenaSize, 0) // left
  );
  walls.push(
    makeWall(wallThickness, arenaSize * 2, arenaSize, 0) // right
  );

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
