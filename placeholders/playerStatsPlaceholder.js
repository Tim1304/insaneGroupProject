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

  // Economy + inventory
  let gold = 0;
  let score = 0;

  const weapons = {
    hand: true,   // always owned
    sword: false,
    bow: false,
  };

  let equippedWeapon = "hand";

  function clamp(value) {
    return Math.max(0, Math.min(100, value));
  }

  function safeDispatch(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch (e) {
      // ignore if window/dispatch not available
    }
  }

  function notifyGoldChanged() {
    safeDispatch("player-gold-changed", { gold });
  }

  function notifyScoreChanged() {
    safeDispatch("player-score-changed", { score });
  }

  function notifyWeaponChanged() {
    safeDispatch("player-weapon-changed", { equipped: equippedWeapon });
  }

  function notifyWeaponsUpdated() {
    safeDispatch("player-weapons-updated", {
      weapons: { ...weapons },
      equipped: equippedWeapon,
    });
  }

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

  function setGoldInternal(v) {
    gold = Math.max(0, Math.floor(Number(v) || 0));
    notifyGoldChanged();
  }

  function addGoldInternal(amt) {
    setGoldInternal(gold + Math.floor(Number(amt) || 0));
  }

  function spendGoldInternal(amt) {
    const cost = Math.floor(Number(amt) || 0);
    if (cost <= 0) return true;
    if (gold < cost) return false;
    setGoldInternal(gold - cost);
    return true;
  }

  function addScoreInternal(amt) {
    const delta = Math.floor(Number(amt) || 0);
    if (delta <= 0) return;
    score += delta;
    notifyScoreChanged();
  }

  function ownsWeapon(type) {
    return !!weapons[type];
  }

  function equipWeaponInternal(type) {
    if (!ownsWeapon(type)) return false;
    if (equippedWeapon === type) return true;
    equippedWeapon = type;
    notifyWeaponChanged();
    return true;
  }

  function buyWeaponInternal(type, cost) {
    if (type === "hand") {
      // fist is always free/owned
      weapons.hand = true;
      notifyWeaponsUpdated();
      return { success: true, reason: "alwaysOwned" };
    }

    if (ownsWeapon(type)) {
      return { success: false, reason: "alreadyOwned" };
    }

    if (!spendGoldInternal(cost)) {
      return { success: false, reason: "notEnoughGold" };
    }

    weapons[type] = true;
    notifyWeaponsUpdated();
    // Auto-equip newly bought weapon
    equipWeaponInternal(type);
    return { success: true, reason: "bought" };
  }

  return {
    // Health
    getHealth: () => health,
    setHealth: (v) => { health = clamp(v); },

    // Stamina
    getStamina: () => stamina,
    setStamina: (v) => { stamina = clamp(v); },

    // Helpers
    damage: (amt) => { health = clamp(health - amt); },
    restoreHealth: (amt) => { health = clamp(health + amt); },
    useStamina: (amt) => { stamina = clamp(stamina - amt); },
    restoreStamina: (amt) => { stamina = clamp(stamina + amt); },

    // Gold / score API ---

    getGold: () => gold,
    setGold: (v) => setGoldInternal(v),
    addGold: (amt) => addGoldInternal(amt),
    spendGold: (amt) => spendGoldInternal(amt),

    getScore: () => score,
    addScore: (amt) => addScoreInternal(amt),

    // Weapons / inventory API ---

    ownsWeapon: (type) => ownsWeapon(type),
    getOwnedWeapons: () => ({ ...weapons }),
    getEquippedWeapon: () => equippedWeapon,

    equipWeapon: (type) => equipWeaponInternal(type),

    /**
     * Buy a weapon with gold.
     * @param {"hand"|"sword"|"bow"} type
     * @param {number} cost
     * @returns {{success: boolean, reason: string}}
     */
    buyWeapon: (type, cost) => buyWeaponInternal(type, cost),
  };
}
