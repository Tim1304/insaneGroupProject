// systems/ui/playerStatusUI.js

let playerStatsRef = null;

let container = null;
let healthFill = null;
let staminaFill = null;

export function initPlayerStatusUI(rootElement, playerStats) {
    playerStatsRef = playerStats;
    if (!rootElement) {
        console.warn("PlayerStatusUI: rootElement missing");
        return;
    }

    if (container) return; // already created

    container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "20px";
    container.style.bottom = "20px";
    container.style.pointerEvents = "none";
    container.style.color = "#ffffff";
    container.style.textShadow = "0 0 4px rgba(0,0,0,0.9)";

    // Helper to make a labeled bar
    function createBar(labelText, barColor, textColor = "#ffffff") {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "8px";

        const label = document.createElement("div");
        label.textContent = labelText;
        label.style.fontSize = "12px";
        label.style.marginBottom = "2px";
        label.style.color = textColor;

        const outer = document.createElement("div");
        outer.style.position = "relative";
        outer.style.width = "260px";
        outer.style.height = "16px";
        outer.style.borderRadius = "12px";
        outer.style.overflow = "hidden";
        outer.style.background = "rgba(0, 0, 0, 0.7)";
        outer.style.boxShadow = "0 0 6px rgba(0,0,0,0.8) inset";

        const inner = document.createElement("div");
        inner.style.width = "100%";
        inner.style.height = "100%";
        inner.style.background = barColor;
        inner.style.borderRadius = "12px";
        inner.style.transition = "width 0.12s linear";

        outer.appendChild(inner);
        wrapper.appendChild(label);
        wrapper.appendChild(outer);

        return { wrapper, fill: inner };
    }

    // Health (red)
    const healthBar = createBar(
        "HEALTH",
        "linear-gradient(90deg, #ff5555, #b30000)"
    );
    healthFill = healthBar.fill;

    // Stamina (green)
    const staminaBar = createBar(
        "STAMINA",
        "linear-gradient(90deg, #66ff66, #1aa31a)"
    );
    staminaFill = staminaBar.fill;

    container.appendChild(healthBar.wrapper);
    container.appendChild(staminaBar.wrapper);

    rootElement.appendChild(container);
}

export function updatePlayerStatusUI(dt) {
    if (!playerStatsRef || !healthFill || !staminaFill) return;

    const health = playerStatsRef.getHealth ? playerStatsRef.getHealth() : 100;
    const stamina = playerStatsRef.getStamina ? playerStatsRef.getStamina() : 100;

    const h = Math.max(0, Math.min(100, health));
    const s = Math.max(0, Math.min(100, stamina));

    healthFill.style.width = `${h}%`;
    staminaFill.style.width = `${s}%`;
}
