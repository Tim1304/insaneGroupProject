// systems/dialogSystem.js

import {
  getNearestTalkableNPC,
  setNPCHostile,
} from "./npcSystem.js";

let sceneRef = null;
let playerRef = null;

const TALK_RANGE = 4.5;

let activeNPC = null;
let inDialog = false;
let currentDialogId = null;
let currentNode = null;
let promptNPCId = null;

// Simple sample dialog definitions
// can expand/replace later.
const dialogDefs = {
  innkeeper: {
    start: "greet",
    nodes: {
      greet: {
        id: "greet",
        text: "Welcome to the inn. Would you like to buy something?",
        choices: [
          { id: "yes", label: "Yes", next: "chooseItem" },
          { id: "no", label: "No, thanks.", next: "goodbye" },
        ],
      },
      chooseItem: {
        id: "chooseItem",
        text: "What would you like to buy?",
        choices: [
          {
            id: "health",
            label: "Health potion",
            next: "boughtHealth",
          },
          {
            id: "stamina",
            label: "Stamina potion",
            next: "boughtStamina",
          },
          {
            id: "neverMind",
            label: "Never mind.",
            next: "goodbye",
          },
        ],
      },
      boughtHealth: {
        id: "boughtHealth",
        text: "You bought a health potion.",
        choices: [
          { id: "done", label: "Okay.", next: "goodbye" },
        ],
      },
      boughtStamina: {
        id: "boughtStamina",
        text: "You bought a stamina potion.",
        choices: [
          { id: "done", label: "Okay.", next: "goodbye" },
        ],
      },
      goodbye: {
        id: "goodbye",
        text: "Come again soon.",
        choices: [],
        end: true,
      },
    },
  },

  // Example bandit dialog where a choice can trigger hostility
  bandit: {
    start: "intro",
    nodes: {
      intro: {
        id: "intro",
        text: "You look lost. Got any gold?",
        choices: [
          {
            id: "pay",
            label: "Here, take some.",
            next: "thanks",
          },
          {
            id: "refuse",
            label: "No way.",
            next: "threaten",
          },
        ],
      },
      thanks: {
        id: "thanks",
        text: "Heh. Pleasure doing business.",
        choices: [],
        end: true,
      },
      threaten: {
        id: "threaten",
        text: "Then I'll take it by force.",
        choices: [],
        end: true,
        effects: {
          // Make this NPC hostile when node is shown
          hostile: true,
        },
      },
    },
  },
};

export function initDialogSystem(scene, playerController) {
  sceneRef = scene;
  playerRef = playerController;

  // Listen for E key to start / advance dialog
  document.addEventListener("keydown", onKeyDown);

  console.log("Dialog system initialized.");
}

function onKeyDown(e) {
  if (e.code !== "KeyE") return;

  if (!inDialog) {
    tryStartDialog();
  } else {
    // While in dialog, pressing E can be used as a simple "continue"
    // if there is only one choice.
    if (currentNode && currentNode.choices && currentNode.choices.length === 1) {
      chooseDialogOption(currentNode.choices[0].id);
    }
    // If there are multiple choices, dialogUI will call chooseDialogOption(...)
    // based on user selection, so we don't auto-advance here.
  }
}

function tryStartDialog() {
  if (!playerRef || !playerRef.mesh) return;

  const playerPos = playerRef.mesh.position;
  const npc = getNearestTalkableNPC(playerPos, TALK_RANGE);
  if (!npc) return;

  // Special case: dungeon entrance acts like an interactable, not a dialog NPC
  if (npc.isDungeonEntrance) {
    window.dispatchEvent(
      new CustomEvent("dungeon-enter-request", {
        detail: {
          sourceId: npc.id,
          sourceName: npc.name,
        },
      })
    );
    return;
  }

  const dialogId = npc.dialogId;
  if (!dialogId || !dialogDefs[dialogId]) {
    console.warn("No dialog defined for NPC:", npc.id, npc.name);
    return;
  }

  startDialog(npc, dialogId);
}

function startDialog(npc, dialogId) {
  activeNPC = npc;
  inDialog = true;
  currentDialogId = dialogId;

  const def = dialogDefs[dialogId];
  const startNode = def.nodes[def.start];
  setCurrentNode(startNode);

  // Notify UI that a dialog has started
  window.dispatchEvent(
    new CustomEvent("dialog-start", {
      detail: {
        npcId: npc.id,
        npcName: npc.name,
        dialogId,
        node: stripNodeForUI(startNode),
      },
    })
  );
}

function setCurrentNode(node) {
  currentNode = node;

  // Apply node-level effects (e.g., hostility)
  if (currentNode.effects && currentNode.effects.hostile && activeNPC) {
    setNPCHostile(activeNPC.id, true);
  }

  // Inform UI. This fires both at start and on every update.
  window.dispatchEvent(
    new CustomEvent("dialog-update", {
      detail: {
        npcId: activeNPC?.id || null,
        npcName: activeNPC?.name || null,
        dialogId: currentDialogId,
        node: stripNodeForUI(currentNode),
      },
    })
  );

  // If this node is marked as end, close dialog on next update
  if (currentNode.end) {
    endDialog();
  }
}

export function chooseDialogOption(choiceId) {
  if (!inDialog || !currentNode || !currentDialogId) return;

  const def = dialogDefs[currentDialogId];
  if (!def) return;

  const choice = currentNode.choices?.find((c) => c.id === choiceId);
  if (!choice) {
    console.warn("Dialog choice not found:", choiceId);
    return;
  }

  const nextNode = def.nodes[choice.next];
  if (!nextNode) {
    console.warn("Dialog node not found:", choice.next);
    endDialog();
    return;
  }

  setCurrentNode(nextNode);
}

function endDialog() {
  if (!inDialog) return;

  const npcId = activeNPC?.id || null;

  inDialog = false;
  activeNPC = null;
  currentDialogId = null;
  currentNode = null;

  window.dispatchEvent(
    new CustomEvent("dialog-end", {
      detail: {
        npcId,
      },
    })
  );
}

/**
 * Called every frame from game.js
 * - Handles "Press E to talk" availability logic
 */
export function updateDialogSystem(dt) {
  if (!playerRef || !playerRef.mesh) return;

  // If we are in dialog, we hide the "Press E" prompt.
  if (inDialog) {
    if (promptNPCId !== null) {
      promptNPCId = null;
      window.dispatchEvent(
        new CustomEvent("dialog-availability-hide", {})
      );
    }
    return;
  }

  const playerPos = playerRef.mesh.position;
  const npc = getNearestTalkableNPC(playerPos, TALK_RANGE);

  if (npc && promptNPCId !== npc.id) {
    // We have a talkable NPC (or entrance) in range; show prompt.
    promptNPCId = npc.id;
    window.dispatchEvent(
      new CustomEvent("dialog-availability-show", {
        detail: {
          npcId: npc.id,
          npcName: npc.name,
          isDungeonEntrance: !!npc.isDungeonEntrance,
        },
      })
    );
  } else if (!npc && promptNPCId !== null) {
    // No NPC in range anymore; hide prompt.
    promptNPCId = null;
    window.dispatchEvent(
      new CustomEvent("dialog-availability-hide", {})
    );
  }
}

// Utility: send only what UI needs (no effects/internal fields)
function stripNodeForUI(node) {
  if (!node) return null;
  return {
    id: node.id,
    text: node.text,
    choices: node.choices?.map((c) => ({
      id: c.id,
      label: c.label,
    })) ?? [],
    end: !!node.end,
  };
}
