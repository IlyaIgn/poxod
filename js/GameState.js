/**
 * Глобальное состояние игрока между сценами.
 */
const GameState = {
  hp: 100,
  maxHp: 100,
  attack: 12,
  defense: 4,
  gold: 50,
  laps: 0,
  boardLevel: 1,
  storyUnlocked: 0,
  upgradeCosts: { hp: 30, attack: 40, defense: 35 },
  tutorialStep: 0,
  tutorialDone: false,
  energy: 100,
  energyUpdatedAt: Date.now(),

  getEnergyConfig() {
    return GameConfig.economy.energy || { max: 100, rollCost: 1, regenMsPerPoint: 60_000 };
  },

  getMaxEnergy() {
    return Math.max(1, this.getEnergyConfig().max ?? 100);
  },

  syncEnergy() {
    const cfg = this.getEnergyConfig();
    const max = this.getMaxEnergy();
    const now = Date.now();
    const updatedAt = Number.isFinite(this.energyUpdatedAt) ? this.energyUpdatedAt : now;
    const elapsed = Math.max(0, now - updatedAt);
    const regenMs = Math.max(1, cfg.regenMsPerPoint ?? 60_000);
    let energy = Number.isFinite(this.energy) ? this.energy : max;

    // Реген только до лимита; купленная сверх лимита энергия не восстанавливается
    if (energy < max) {
      const gained = elapsed / regenMs;
      energy = Math.min(max, energy + gained);
    }

    this.energy = energy;
    this.energyUpdatedAt = now;
    return this.energy;
  },

  formatEnergyStat() {
    const cur = this.getEnergyDisplay();
    const max = this.getMaxEnergy();
    return cur > max ? `${cur}/${max}+` : `${cur}/${max}`;
  },

  /** Секунды до заполнения только реген-части (до max), без учёта бонуса сверх лимита */
  secondsUntilRegenCap() {
    this.syncEnergy();
    const max = this.getMaxEnergy();
    if (this.energy >= max) return 0;
    const needed = max - this.energy;
    const regenMs = Math.max(1, this.getEnergyConfig().regenMsPerPoint ?? 60_000);
    return Math.max(1, Math.ceil((needed * regenMs) / 1000));
  },

  formatRegenCountdown(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    if (sec <= 0) return '';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}ч ${String(m).padStart(2, '0')}м`;
    if (m > 0) return `${m}:${String(s).padStart(2, '0')}`;
    return `${s}с`;
  },

  getRegenTimerLabel() {
    const sec = this.secondsUntilRegenCap();
    if (sec <= 0) return '';
    const max = this.getMaxEnergy();
    const tpl = GameConfig.text?.home?.energyRegenTimer
      || 'до {max}: {time}';
    return GameConfig.format(tpl, {
      max,
      time: this.formatRegenCountdown(sec),
    });
  },

  refreshEnergyRegenTimer(statRow) {
    if (!statRow?.timerText) return;
    const label = this.getRegenTimerLabel();
    statRow.timerText.setText(label);
    const show = !!statRow.timerVisible && !!label;
    statRow.timerText.setVisible(show);
  },

  bindEnergyStatRowToggle(scene, statRow, x, y, width, height, depth = 0) {
    if (!statRow?.timerText || !scene) return;

    statRow.timerVisible = false;
    statRow.timerText.setVisible(false);

    const toggle = () => {
      statRow.timerVisible = !statRow.timerVisible;
      this.refreshEnergyRegenTimer(statRow);
    };

    const zone = scene.add.zone(x, y, width, height)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', toggle);
    statRow.hitZone = zone;
  },

  addPurchasedEnergy(amount) {
    const add = Math.max(0, Math.floor(amount));
    if (add <= 0) return 0;
    this.syncEnergy();
    this.energy += add;
    this.energyUpdatedAt = Date.now();
    this.persist();
    return add;
  },

  applyIapUpgrade(key) {
    const cfg = GameConfig.economy.upgrades[key];
    if (!cfg) return false;

    switch (key) {
      case 'hp':
        this.maxHp += cfg.bonusMaxHp;
        this.hp += cfg.bonusHeal ?? cfg.bonusMaxHp;
        break;
      case 'attack':
        this.attack += cfg.bonus;
        break;
      case 'defense':
        this.defense += cfg.bonus;
        break;
      default:
        return false;
    }

    this.persist();
    return true;
  },

  getEnergyDisplay() {
    return Math.floor(this.syncEnergy());
  },

  canSpendEnergyForRoll() {
    const cfg = this.getEnergyConfig();
    return this.syncEnergy() >= (cfg.rollCost ?? 1);
  },

  spendEnergyForRoll() {
    const cfg = this.getEnergyConfig();
    const cost = cfg.rollCost ?? 1;
    this.syncEnergy();
    if (this.energy < cost) return false;
    this.energy -= cost;
    this.energyUpdatedAt = Date.now();
    this.persist();
    return true;
  },

  secondsUntilEnergyForRoll() {
    const cfg = this.getEnergyConfig();
    const cost = cfg.rollCost ?? 1;
    this.syncEnergy();
    if (this.energy >= cost) return 0;
    const needed = cost - this.energy;
    const regenMs = Math.max(1, cfg.regenMsPerPoint ?? 60_000);
    return Math.max(1, Math.ceil((needed * regenMs) / 1000));
  },

  persist() {
    if (typeof SaveManager !== 'undefined') {
      SaveManager.scheduleSave();
    }
  },

  reset() {
    GameConfig.applyPlayerDefaults(this);
    if (typeof HeroStory !== 'undefined') {
      HeroStory.saveProgress(0);
    }
    if (typeof SaveManager !== 'undefined') {
      SaveManager.clear();
    }
  },

  startBoardRun() {
    this.boardLevel = 1;
    this.persist();
  },

  healToFull() {
    this.hp = this.maxHp;
  },

  canAfford(type) {
    return this.gold >= this.upgradeCosts[type];
  },

  buyUpgrade(type) {
    if (!this.canAfford(type)) return false;
    const cfg = GameConfig.economy.upgrades[type];
    if (!cfg) return false;

    this.gold -= this.upgradeCosts[type];

    switch (type) {
      case 'hp':
        this.maxHp += cfg.bonusMaxHp;
        this.hp += cfg.bonusHeal ?? cfg.bonusMaxHp;
        this.upgradeCosts.hp = Math.floor(this.upgradeCosts.hp * cfg.costMultiplier);
        break;
      case 'attack':
        this.attack += cfg.bonus;
        this.upgradeCosts.attack = Math.floor(this.upgradeCosts.attack * cfg.costMultiplier);
        break;
      case 'defense':
        this.defense += cfg.bonus;
        this.upgradeCosts.defense = Math.floor(this.upgradeCosts.defense * cfg.costMultiplier);
        break;
    }

    this.persist();
    return true;
  },

  takeDamage(amount) {
    const dmg = Math.max(1, amount - this.defense);
    this.hp = Math.max(0, this.hp - dmg);
    return dmg;
  },
};

GameConfig.applyPlayerDefaults(GameState);
