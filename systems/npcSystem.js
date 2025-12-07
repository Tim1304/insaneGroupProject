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

// Default hostile AI parameters
const DEFAULT_HOSTILE_CONFIG = {
  speed: 3.0,         // movement speed (units / second)
  chaseRange: 15.0,   // start chasing if within this range
  attackRange: 1.8,   // can hit the player when this close
  attackCooldown: 1.2 // seconds between attacks
};

function ensureHostileState(npc) {
  if (!npc._ai) {
    npc._ai = {
      state: "idle",
      cooldown: 0,
      config: { ...DEFAULT_HOSTILE_CONFIG },
    };
  }
  // Save original color for visual feedback when toggling hostile
  if (!npc._originalColor && npc.mesh && npc.mesh.material && npc.mesh.material.color) {
    npc._originalColor = npc.mesh.material.color.clone();
  }
}

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
  if (!playerRef || !playerRef.mesh) return;

  const playerPos = playerRef.mesh.position;

  for (const npc of npcs) {
    if (!npc.hostile || !npc.mesh) continue;

    ensureHostileState(npc);
    const ai = npc._ai;
    const cfg = ai.config;

    // cooldown
    if (ai.cooldown > 0) {
      ai.cooldown = Math.max(0, ai.cooldown - dt);
    }

    const npcPos = npc.mesh.position;
    const dx = playerPos.x - npcPos.x;
    const dz = playerPos.z - npcPos.z;
    const distSq = dx * dx + dz * dz;
    const dist = Math.sqrt(distSq);

    // too far → idle
    if (dist > cfg.chaseRange) {
      ai.state = "idle";
      continue;
    }

    // chase if not yet in attack range
    if (dist > cfg.attackRange) {
      ai.state = "chase";

      const step = cfg.speed * dt;
      if (step > 0 && dist > 0.0001) {
        const factor = step / dist;
        npcPos.x += dx * factor;
        npcPos.z += dz * factor;
      }

      // face the player horizontally
      npc.mesh.lookAt(playerPos.x, npcPos.y, playerPos.z);
      continue;
    }

    // in attack range
    ai.state = "attack";

    if (ai.cooldown <= 0) {
      ai.cooldown = cfg.attackCooldown;

      // Tell everyone “I hit the player”
      try {
        window.dispatchEvent(
          new CustomEvent("npc-hostile-attack", {
            detail: {
              npcId: npc.id,
              npcName: npc.name,
              position: {
                x: npcPos.x,
                y: npcPos.y,
                z: npcPos.z,
              },
            },
          })
        );
      } catch (err) {
        // non-browser, ignore
      }

      console.log(`[NPC AI] ${npc.name} attacks the player.`);
    }
  }
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
  npc.talkable = !hostile;

  if (hostile) {
    ensureHostileState(npc);

    // make enemies visibly red
    if (npc.mesh && npc.mesh.material && npc.mesh.material.color) {
      if (!npc._originalColor) {
        npc._originalColor = npc.mesh.material.color.clone();
      }
      npc.mesh.material.color.set(0xff0000);
    }

    npc._ai.state = "idle";
    npc._ai.cooldown = 0;

    console.log(`[NPC SYSTEM] ${npc.name} (${npc.id}) is now hostile!`);
  } else {
    // restore original color
    if (npc.mesh && npc.mesh.material && npc.mesh.material.color && npc._originalColor) {
      npc.mesh.material.color.copy(npc._originalColor);
    }

    if (npc._ai) {
      npc._ai.state = "idle";
      npc._ai.cooldown = 0;
    }

    console.log(`[NPC SYSTEM] ${npc.name} (${npc.id}) calmed down.`);
  }
}