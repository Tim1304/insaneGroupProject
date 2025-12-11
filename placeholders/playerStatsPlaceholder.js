// placeholders/playerStatsPlaceholder.js

const KEY = {
  HEALTH_DOWN: "BracketLeft",   // [
  HEALTH_UP: "BracketRight",    // ]
  STAMINA_DOWN: "Minus",        // -
  STAMINA_UP: "Equal"           // =
};

export function createPlayerStats() {
  let health = 100.0;
  const baseMaxHealth = 100.0;
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

  function clampToMax(value, max) {
    return Math.max(0, Math.min(max, value));
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

  // --- Stats + leveling ---
  const stats = {
    speed: { level: 1, jumpsSinceLevel: 0 },
    strength: { level: 1, killsSinceLevel: 0 },
    handEye: { level: 1, killsSinceLevel: 0 },
    health: { level: 1, killsSinceLevel: 0 },
  };

  function safeStatName(name) {
    if (!name) return null;
    const n = name.toLowerCase();
    if (n === 'hand-eye' || n === 'handeye' || n === 'hand_eye') return 'handEye';
    if (n === 'health') return 'health';
    if (n === 'speed') return 'speed';
    if (n === 'strength') return 'strength';
    return name;
  }

  function notifyStatLeveled(statKey, newLevel) {
    safeDispatch('player-stat-leveled', { stat: statKey, level: newLevel });
  }

  function getMaxHealth() {
    // Each health stat level grants +10 max HP per level above 1
    const lvl = stats.health ? stats.health.level : 1;
    return baseMaxHealth + (Math.max(0, lvl - 1) * 10);
  }

  function notifyHealthChanged() {
    safeDispatch('player-health-changed', { health, maxHealth: getMaxHealth() });
  }

  function tryLevelUpKills(statKey) {
    const s = stats[statKey];
    if (!s) return;
    // To go from level N -> N+1 requires N kills
    while (s.killsSinceLevel >= s.level) {
      s.killsSinceLevel -= s.level;
      s.level += 1;
      // if health stat leveled, increase current health by 10
      if (statKey === 'health') {
        health = Math.min(getMaxHealth(), health + 10);
        notifyHealthChanged();
      }
      notifyStatLeveled(statKey, s.level);
    }
  }

  function tryLevelUpJumps() {
    const s = stats.speed;
    if (!s) return;
    // To go from level N -> N+1 requires N * 10 jumps
    while (s.jumpsSinceLevel >= s.level * 10) {
      s.jumpsSinceLevel -= s.level * 10;
      s.level += 1;
      notifyStatLeveled('speed', s.level);
    }
  }

  // Stats progress from kills with each weapon
  window.addEventListener('enemy-killed', (e) => {
    const d = (e && e.detail) || {};
    const by = d.by || d.weapon || null;
    if (!by) return;
    const w = String(by).toLowerCase();
    if (w === 'sword') {
      stats.strength.killsSinceLevel += 1;
      tryLevelUpKills('strength');
    } else if (w === 'bow') {
      stats.handEye.killsSinceLevel += 1;
      tryLevelUpKills('handEye');
    } else if (w === 'hand' || w === 'fist') {
      stats.health.killsSinceLevel += 1;
      tryLevelUpKills('health');
    }
  });

  function notifyStaminaChanged() {
    safeDispatch("player-stamina-changed", { stamina });
  }

  document.addEventListener("keydown", (e) => {
    switch (e.code) {
      case KEY.HEALTH_DOWN:
        health = clampToMax(health - 5, getMaxHealth());
        console.log("Health:", health);
        notifyHealthChanged();
        break;

      case KEY.HEALTH_UP:
        health = clampToMax(health + 5, getMaxHealth());
        console.log("Health:", health);
        notifyHealthChanged();
        break;

      case KEY.STAMINA_DOWN:
        stamina = clamp(stamina - 5);
        console.log("Stamina:", stamina);
        notifyStaminaChanged();
        break;

      case KEY.STAMINA_UP:
        stamina = clamp(stamina + 5);
        console.log("Stamina:", stamina);
        notifyStaminaChanged();
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
    getMaxHealth: () => getMaxHealth(),
    setHealth: (v) => { health = Math.max(0, Math.min(getMaxHealth(), v)); notifyHealthChanged(); },

    // Stamina
    getStamina: () => stamina,
    setStamina: (v) => { stamina = clamp(v); notifyStaminaChanged(); },

    // Helpers
    damage: (amt) => { health = clampToMax(health - amt, getMaxHealth()); notifyHealthChanged(); },
    restoreHealth: (amt) => { health = clampToMax(health + amt, getMaxHealth()); notifyHealthChanged(); },
    useStamina: (amt) => { stamina = clamp(stamina - amt); notifyStaminaChanged(); },
    restoreStamina: (amt) => { stamina = clamp(stamina + amt); notifyStaminaChanged(); },

    // Stats API 
    // Record a jump 
    recordJump: () => { stats.speed.jumpsSinceLevel += 1; tryLevelUpJumps(); },

    // Record a kill made with a particular weapon
    recordKillWith: (weapon) => {
      const w = String(weapon || '').toLowerCase();
      if (w === 'sword') {
        stats.strength.killsSinceLevel += 1;
        tryLevelUpKills('strength');
      } else if (w === 'bow') {
        stats.handEye.killsSinceLevel += 1;
        tryLevelUpKills('handEye');
      } else if (w === 'hand' || w === 'fist') {
        stats.health.killsSinceLevel += 1;
        tryLevelUpKills('health');
      }
    },

    getStatLevel: (statName) => {
      const key = safeStatName(statName);
      return stats[key] ? stats[key].level : null;
    },

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
