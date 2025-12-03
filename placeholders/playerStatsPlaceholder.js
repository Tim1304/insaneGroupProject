// placeholders/playerStatsPlaceholder.js

const KEY = {
  HEALTH_DOWN: "BracketLeft",   // [
  HEALTH_UP: "BracketRight",    // ]
  STAMINA_DOWN: "Minus",        // -
  STAMINA_UP: "Equal"           // =
};

export function createPlayerStats() {
  let health = 100.0;
  let stamina = 100.0;

  function clamp(value) {
    return Math.max(0, Math.min(100, value));
  }

  // For debugging: see key codes in console if needed
  // document.addEventListener("keydown", (e) => console.log(e.code));

  document.addEventListener("keydown", (e) => {
    switch (e.code) {
      case KEY.HEALTH_DOWN:
        health = clamp(health - 5);
        console.log("Health:", health);
        break;

      case KEY.HEALTH_UP:
        health = clamp(health + 5);
        console.log("Health:", health);
        break;

      case KEY.STAMINA_DOWN:
        stamina = clamp(stamina - 5);
        console.log("Stamina:", stamina);
        break;

      case KEY.STAMINA_UP:
        stamina = clamp(stamina + 5);
        console.log("Stamina:", stamina);
        break;
    }
  });

  return {
    // Health
    getHealth: () => health,
    setHealth: (v) => { health = clamp(v); },

    // Stamina
    getStamina: () => stamina,
    setStamina: (v) => { stamina = clamp(v); },

    // Helpers (for future usage)
    damage: (amt) => { health = clamp(health - amt); },
    restoreHealth: (amt) => { health = clamp(health + amt); },
    useStamina: (amt) => { stamina = clamp(stamina - amt); },
    restoreStamina: (amt) => { stamina = clamp(stamina + amt); },
  };
}
