// systems/dialogSystem.js

import {
  getNearestTalkableNPC,
  setNPCHostile,
} from "./npcSystem.js";

let sceneRef = null;
let playerRef = null;
let playerStatsRef = null;

const TALK_RANGE = 4.5;

let activeNPC = null;
let inDialog = false;
let currentDialogId = null;
let currentNode = null;
let promptNPCId = null;

// Dialog definitions
const dialogDefs = {
  innkeeper: {
    start: "greet",
    nodes: {
      greet: {
        id: "greet",
        text: "Welcome to the inn. Looking for weapons?",
        choices: [
          { id: "yes", label: "Show me what you have.", next: "chooseWeapon" },
          { id: "no", label: "No, thanks.", next: "goodbye" },
        ],
      },
      chooseWeapon: {
        id: "chooseWeapon",
        text: "What would you like to buy?",
        choices: [
          {
            id: "buySword",
            label: "Buy Sword (50 gold)",
            next: "boughtSword",
          },
          {
            id: "buyBow",
            label: "Buy Bow (75 gold)",
            next: "boughtBow",
          },
          {
            id: "neverMind",
            label: "Never mind.",
            next: "goodbye",
          },
        ],
      },
      boughtSword: {
        id: "boughtSword",
        text: "You bought a sword.",
        choices: [
          { id: "more", label: "See items again.", next: "chooseWeapon" },
          { id: "done", label: "That's all for now.", next: "goodbye" },
        ],
        effects: {
          buyWeapon: "sword",
          cost: 50,
        },
      },
      boughtBow: {
        id: "boughtBow",
        text: "You bought a bow.",
        choices: [
          { id: "more", label: "See items again.", next: "chooseWeapon" },
          { id: "done", label: "That's all for now.", next: "goodbye" },
        ],
        effects: {
          buyWeapon: "bow",
          cost: 75,
        },
      },
      goodbye: {
        id: "goodbye",
        text: "Come again soon.",
        choices: [],
        end: true,
      },
    },
  },

  moneyTest: {
    start: "intro",
    nodes: {
      intro: {
        id: "intro",
        text: "Here, have some debug gold.",
        effects: { giveGold: 100 },
        choices: [
          { id: "more", label: "Give me more.", next: "extra" }
        ]
      },
      extra: {
        id: "extra",
        text: "Okay dang, here’s 500 on top.",
        effects: { giveGold: 500 },
        end: true
      }
    }
  },



  moneyTest: {
    start: "intro",
    nodes: {
      intro: {
        id: "intro",
        text: "Here, have some debug gold.",
        choices: [
          { id: "take", label: "Thanks!", next: "done" },
          { id: "takeMore", label: "Give me even more.", next: "doneMore" },
        ],
        effects: {
          giveGold: 100,   // first time: +100
        },
      },
      done: {
        id: "done",
        text: "Come back if you need more test gold.",
        choices: [],
        end: true,
      },
      doneMore: {
        id: "doneMore",
        text: "Okay, okay, chill. That’s another 500 gold.",
        choices: [],
        end: true,
        effects: {
          giveGold: 500,   // second option: +500
        },
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
          hostile: true,
        },
      },
    },
  },
};

export function initDialogSystem(scene, playerController, playerStats) {
  sceneRef = scene;
  playerRef = playerController;
  playerStatsRef = playerStats || null;

  document.addEventListener("keydown", onKeyDown);

  console.log("Dialog system initialized.");
}

function onKeyDown(e) {
  if (e.code !== "KeyE") return;

  if (!inDialog) {
    tryStartDialog();
  } else {
    if (currentNode && currentNode.choices && currentNode.choices.length === 1) {
      chooseDialogOption(currentNode.choices[0].id);
    }
  }
}

function tryStartDialog() {
  if (!playerRef || !playerRef.mesh) return;

  const playerPos = playerRef.mesh.position;
  const npc = getNearestTalkableNPC(playerPos, TALK_RANGE);
  if (!npc) return;

  // Dungeon / tavern entrance / exit act as special interactables
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

  if (npc.isDungeonExit) {
    window.dispatchEvent(
      new CustomEvent("dungeon-exit-request", {
        detail: {
          sourceId: npc.id,
          sourceName: npc.name,
        },
      })
    );
    return;
  }

  if (npc.isTavernEntrance) {
    window.dispatchEvent(
      new CustomEvent("tavern-enter-request", {
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

  setCurrentNode(startNode, true);
}

function setCurrentNode(node, isStart = false) {
  currentNode = node;

  let overrideText = null;

  // Hostility
  if (currentNode.effects && currentNode.effects.hostile && activeNPC) {
    setNPCHostile(activeNPC.id, true);
  }

  // Give gold effect (used by moneyTest NPC)
  if (currentNode.effects && currentNode.effects.giveGold && playerStatsRef) {
    const amount = Number(currentNode.effects.giveGold) || 0;
    if (amount > 0 && typeof playerStatsRef.addGold === "function") {
      playerStatsRef.addGold(amount);
      console.log(`[DialogSystem] Gave player ${amount} gold from dialog.`);
    }
  }

  // Shop effects (buy weapons)
  if (currentNode.effects && currentNode.effects.buyWeapon && playerStatsRef) {
    overrideText = handleBuyWeaponEffect(currentNode.effects, currentNode.text);
  }



  const uiNode = {
    ...currentNode,
    text: overrideText ?? currentNode.text,
  };

  const eventName = isStart ? "dialog-start" : "dialog-update";

  window.dispatchEvent(
    new CustomEvent(eventName, {
      detail: {
        npcId: activeNPC?.id || null,
        npcName: activeNPC?.name || null,
        dialogId: currentDialogId,
        node: stripNodeForUI(uiNode),
      },
    })
  );

  if (currentNode.end) {
    endDialog();
  }
}

function handleBuyWeaponEffect(effects, defaultText) {
  if (!playerStatsRef) return null;

  const type = effects.buyWeapon;
  const cost = Number(effects.cost) || 0;

  if (!playerStatsRef.ownsWeapon || !playerStatsRef.buyWeapon) {
    console.warn("DialogSystem: playerStats missing weapon API");
    return null;
  }

  if (playerStatsRef.ownsWeapon(type)) {
    if (type === "sword") {
      return "You already own a sword.";
    } else if (type === "bow") {
      return "You already own a bow.";
    }
    return "You already own that item.";
  }

  const result = playerStatsRef.buyWeapon(type, cost);

  if (!result.success && result.reason === "notEnoughGold") {
    return `You don't have enough gold (${cost} required).`;
  }

  if (result.success) {
    if (type === "sword") return "You bought a sword.";
    if (type === "bow") return "You bought a bow.";
    return "Purchase complete.";
  }

  return defaultText || "Nothing happened.";
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

  setCurrentNode(nextNode, false);
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
    promptNPCId = npc.id;
    window.dispatchEvent(
      new CustomEvent("dialog-availability-show", {
        detail: {
          npcId: npc.id,
          npcName: npc.name,
          isDungeonEntrance: !!npc.isDungeonEntrance,
          isDungeonExit: !!npc.isDungeonExit,
          isTavernEntrance: !!npc.isTavernEntrance,
        },
      })
    );
  } else if (!npc && promptNPCId !== null) {
    promptNPCId = null;
    window.dispatchEvent(
      new CustomEvent("dialog-availability-hide", {})
    );
  }
}

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

window.addEventListener("force-dialog-end", () => {
  if (inDialog) endDialog();
});