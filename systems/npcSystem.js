// systems/npcSystem.js

let TRef = null;
let sceneRef = null;
let playerRef = null;

/**
 * NPC structure:
 * {
 *   id: string,
 *   name: string,
 *   mesh: THREE.Mesh,
 *   talkable: boolean,
 *   hostile: boolean,
 *   dialogId?: string
 * }
 */
const npcs = [];

export function initNPCSystem(T, scene, playerController) {
  TRef = T;
  sceneRef = scene;
  playerRef = playerController;

  createNPCs();

  console.log("NPC system initialized with", npcs.length, "NPCs.");
}

function createNPCs() {
  if (!TRef || !sceneRef) return;

  const npcGeo = new TRef.BoxGeometry(1, 2, 1);

  // Innkeeper – for dialog example
  const innMat = new TRef.MeshStandardMaterial({ color: 0xffcc66 });
  const innMesh = new TRef.Mesh(npcGeo, innMat);
  innMesh.position.set(4, 1, 0);
  sceneRef.add(innMesh);

  npcs.push({
    id: "npc_innkeeper",
    name: "Innkeeper",
    mesh: innMesh,
    talkable: true,
    hostile: false,
    dialogId: "innkeeper",
  });

  // Bandit – example that can become hostile based on dialog choice later
  const banditMat = new TRef.MeshStandardMaterial({ color: 0xaa3333 });
  const banditMesh = new TRef.Mesh(npcGeo, banditMat);
  banditMesh.position.set(-6, 1, 3);
  sceneRef.add(banditMesh);

  npcs.push({
    id: "npc_bandit",
    name: "Bandit",
    mesh: banditMesh,
    talkable: true,
    hostile: false,
    dialogId: "bandit",
  });
}

export function updateNPCSystem(dt) {
  // For now, no AI movement – purely placeholders.
  // Later we can add idle animations / patrols here.
}

// --- Helpers used by dialogSystem ---

export function getNPCs() {
    return npcs;
}

export function getNearestTalkableNPC(playerPosition, maxDistance) {
    let best = null;
    let bestDistSq = maxDistance * maxDistance;

    for (const npc of npcs) {
    if (!npc.talkable) continue;
    const dx = npc.mesh.position.x - playerPosition.x;
    const dy = npc.mesh.position.y - playerPosition.y;
    const dz = npc.mesh.position.z - playerPosition.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq <= bestDistSq) {
        best = npc;
        bestDistSq = distSq;
    }
    }
    return best;
}

export function setNPCHostile(npcId, hostile) {
    const npc = npcs.find((n) => n.id === npcId);
    if (!npc) return;

    npc.hostile = hostile;
    npc.talkable = !hostile;  // <-- important fix

    if (hostile) {
    console.log(`[NPC SYSTEM] ${npc.name} (${npc.id}) is now hostile!`);
    } else {
    console.log(`[NPC SYSTEM] ${npc.name} (${npc.id}) calmed down.`);
    }
}
