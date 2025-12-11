// systems/ui/dialogUI.js

import { chooseDialogOption } from "../dialogSystem.js";

let rootRef = null;

// "Press E to talk" prompt
let promptContainer = null;

// Dialog box UI
let dialogContainer = null;
let dialogTitle = null;
let dialogText = null;
let dialogChoicesContainer = null;

export function initDialogUI(rootElement) {
    rootRef = rootElement;
    if (!rootRef) {
        console.warn("DialogUI: rootElement missing");
        return;
    }

    createPrompt();
    createDialogBox();
    setupEventListeners();

    console.log("Dialog UI initialized.");
}

function createPrompt() {
    promptContainer = document.createElement("div");
    promptContainer.style.position = "absolute";
    promptContainer.style.left = "50%";
    promptContainer.style.bottom = "60px";
    promptContainer.style.transform = "translateX(-50%)";
    promptContainer.style.padding = "6px 12px";
    promptContainer.style.borderRadius = "6px";
    promptContainer.style.background = "rgba(0, 0, 0, 0.7)";
    promptContainer.style.color = "#ffffff";
    promptContainer.style.fontSize = "14px";
    promptContainer.style.pointerEvents = "none";
    promptContainer.style.textShadow = "0 0 4px rgba(0,0,0,0.9)";
    promptContainer.style.display = "none";

    promptContainer.textContent = "Press E to talk";

    rootRef.appendChild(promptContainer);
}

function createDialogBox() {
    dialogContainer = document.createElement("div");
    dialogContainer.style.position = "absolute";
    dialogContainer.style.left = "50%";
    dialogContainer.style.bottom = "12%";
    dialogContainer.style.transform = "translateX(-50%)";
    dialogContainer.style.maxWidth = "600px";
    dialogContainer.style.padding = "12px 16px";
    dialogContainer.style.borderRadius = "10px";
    dialogContainer.style.background =
        "linear-gradient(180deg, rgba(10,10,10,0.95), rgba(25,25,25,0.95))";
    dialogContainer.style.border = "1px solid rgba(255,255,255,0.1)";
    dialogContainer.style.boxShadow = "0 8px 24px rgba(0,0,0,0.7)";
    dialogContainer.style.color = "#ffffff";
    dialogContainer.style.fontSize = "14px";
    dialogContainer.style.pointerEvents = "auto";
    dialogContainer.style.display = "none";

    dialogTitle = document.createElement("div");
    dialogTitle.style.fontWeight = "600";
    dialogTitle.style.marginBottom = "8px";
    dialogTitle.style.fontSize = "14px";
    dialogTitle.style.color = "#ffd27f";

    dialogText = document.createElement("div");
    dialogText.style.marginBottom = "10px";
    dialogText.style.lineHeight = "1.4";

    dialogChoicesContainer = document.createElement("div");
    dialogChoicesContainer.style.display = "flex";
    dialogChoicesContainer.style.flexWrap = "wrap";
    dialogChoicesContainer.style.gap = "8px";

    dialogContainer.appendChild(dialogTitle);
    dialogContainer.appendChild(dialogText);
    dialogContainer.appendChild(dialogChoicesContainer);

    rootRef.appendChild(dialogContainer);
}

function setupEventListeners() {
    // NPC in range -> show "Press E to talk"
    window.addEventListener("dialog-availability-show", (e) => {
        if (!promptContainer) return;

        const {
            npcName,
            isDungeonEntrance,
            isDungeonExit,
            isTavernEntrance,
        } = e.detail || {};

        if (isDungeonEntrance) {
            promptContainer.textContent = "Press E to enter the dungeon";
        } else if (isDungeonExit) {
            promptContainer.textContent = "Press E to leave the dungeon";
        } else if (isTavernEntrance) {
            promptContainer.textContent = "Press E to enter the tavern";
        } else {
            promptContainer.textContent = npcName
                ? `Press E to talk to ${npcName}`
                : "Press E to talk";
        }

        promptContainer.style.display = "block";
    });

    // NPC not in range -> hide prompt
    window.addEventListener("dialog-availability-hide", () => {
        if (!promptContainer) return;
        promptContainer.style.display = "none";
    });

    // Dialog started
    window.addEventListener("dialog-start", (e) => {
        if (!dialogContainer || !promptContainer) return;

        promptContainer.style.display = "none"; // hide prompt while talking

        const { npcName, node } = e.detail || {};
        showDialog(npcName, node);
    });

    // Dialog updated (new node)
    window.addEventListener("dialog-update", (e) => {
        if (!dialogContainer) return;

        const { npcName, node } = e.detail || {};
        showDialog(npcName, node);
    });

    // Dialog ended
    window.addEventListener("dialog-end", () => {
        if (!dialogContainer) return;
        dialogContainer.style.display = "none";
    });
}

function showDialog(npcName, node) {
    if (!node) {
        dialogContainer.style.display = "none";
        return;
    }

    dialogContainer.style.display = "block";

    dialogContainer.onclick = null;

    dialogTitle.textContent = npcName || "Someone";
    dialogText.textContent = node.text || "";

    // Clear old choices
    dialogChoicesContainer.innerHTML = "";

    if (node.choices && node.choices.length > 0) {
        node.choices.forEach((choice) => {
            const btn = document.createElement("button");
            btn.textContent = choice.label;
            btn.style.padding = "6px 10px";
            btn.style.borderRadius = "6px";
            btn.style.border = "1px solid rgba(255,255,255,0.15)";
            btn.style.background = "rgba(40,40,40,0.95)";
            btn.style.color = "#ffffff";
            btn.style.cursor = "pointer";
            btn.style.fontSize = "13px";
            btn.style.pointerEvents = "auto";

            btn.addEventListener("click", () => {
                chooseDialogOption(choice.id);
            });

            dialogChoicesContainer.appendChild(btn);
        });
    } else {
        // No choices: show a faint hint that E or click continues / closes
        const hint = document.createElement("div");
        hint.textContent = "[Press E or click to continue]";
        hint.style.fontSize = "12px";
        hint.style.opacity = "0.7";
        hint.style.marginTop = "4px";
        dialogChoicesContainer.appendChild(hint);

        // Clicking anywhere in the box will signal "continue" via dialogSystem
        dialogContainer.onclick = () => {
            // dialogSystem already auto-advances E when only one choice,
            // but here we might be at an end node with no choices.
            // For now, we'll just hide; dialogSystem will fire dialog-end as needed.
            dialogContainer.style.display = "none";
        };
    }
}

export function updateDialogUI(dt) {
    // For now, nothing per-frame.
    // If we want dialog fade-ins / typing effects later, could go here.
}
