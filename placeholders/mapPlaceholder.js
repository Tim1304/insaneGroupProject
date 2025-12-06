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
  const groundMat = new T.MeshStandardMaterial({
    color: 0x303030,
    side: T.DoubleSide,
  });
  const ground = new T.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

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
