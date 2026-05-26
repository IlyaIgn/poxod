/**
 * Сохранение и загрузка прогресса (localStorage + Yandex Games Player).
 */
const SAVE_VERSION = 1;
const LOCAL_KEY = 'krugovoj_pohod_save_v1';
const YANDEX_DATA_KEY = 'progress_v1';

const SaveManager = {
  _saveTimer: null,
  _saving: false,
  loadedFromSave: false,
  lastSavedAt: 0,

  toSnapshot() {
    return {
      v: SAVE_VERSION,
      hp: GameState.hp,
      maxHp: GameState.maxHp,
      attack: GameState.attack,
      defense: GameState.defense,
      gold: GameState.gold,
      laps: GameState.laps,
      boardLevel: GameState.boardLevel,
      storyUnlocked: GameState.storyUnlocked,
      upgradeCosts: { ...GameState.upgradeCosts },
      tutorialStep: GameState.tutorialStep,
      tutorialDone: GameState.tutorialDone,
      energy: GameState.energy,
      energyUpdatedAt: GameState.energyUpdatedAt,
    };
  },

  applySnapshot(data) {
    if (!data || data.v !== SAVE_VERSION) return false;

    const num = (v, fallback) => (Number.isFinite(v) ? v : fallback);
    const playerDefaults = GameConfig.economy.player;

    GameState.hp = Math.max(0, num(data.hp, GameState.hp));
    GameState.maxHp = Math.max(1, num(data.maxHp, GameState.maxHp));
    GameState.attack = Math.max(1, num(data.attack, GameState.attack));
    GameState.defense = Math.max(0, num(data.defense, GameState.defense));
    GameState.gold = Math.max(0, num(data.gold, GameState.gold));
    GameState.laps = Math.max(0, num(data.laps, 0));
    GameState.boardLevel = Phaser.Math.Clamp(
      num(data.boardLevel, 1),
      1,
      GameConfig.meta.bossLevel,
    );
    GameState.storyUnlocked = Phaser.Math.Clamp(
      num(data.storyUnlocked, 0),
      0,
      typeof HeroStory !== 'undefined' ? HeroStory.totalChapters() : 99,
    );

    if (data.upgradeCosts && typeof data.upgradeCosts === 'object') {
      const def = GameConfig.economy.upgradeCosts;
      GameState.upgradeCosts = {
        hp: Math.max(1, num(data.upgradeCosts.hp, def.hp)),
        attack: Math.max(1, num(data.upgradeCosts.attack, def.attack)),
        defense: Math.max(1, num(data.upgradeCosts.defense, def.defense)),
      };
    }

    GameState.hp = Math.min(GameState.hp, GameState.maxHp);

    const maxEnergy = GameState.getMaxEnergy();
    if (Object.prototype.hasOwnProperty.call(data, 'energy')) {
      GameState.energy = Phaser.Math.Clamp(num(data.energy, maxEnergy), 0, maxEnergy);
      GameState.energyUpdatedAt = num(data.energyUpdatedAt, Date.now());
    } else {
      GameState.energy = maxEnergy;
      GameState.energyUpdatedAt = Date.now();
    }
    GameState.syncEnergy();

    if (Object.prototype.hasOwnProperty.call(data, 'tutorialDone')) {
      GameState.tutorialDone = !!data.tutorialDone;
      GameState.tutorialStep = Math.max(0, num(data.tutorialStep, 0));
    } else {
      const looksLikeFreshRun = (
        num(data.laps, 0) === 0
        && num(data.boardLevel, 1) === 1
        && num(data.storyUnlocked, 0) === 0
        && num(data.attack, playerDefaults.attack) === playerDefaults.attack
        && num(data.defense, playerDefaults.defense) === playerDefaults.defense
        && num(data.maxHp, playerDefaults.maxHp) === playerDefaults.maxHp
      );
      GameState.tutorialDone = !looksLikeFreshRun;
      GameState.tutorialStep = 0;
    }

    return true;
  },

  readLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return null;
      return this.normalizeStored(JSON.parse(raw));
    } catch (err) {
      console.warn('[SaveManager] localStorage read', err);
      return null;
    }
  },

  writeLocal(snapshot) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(snapshot));
      return true;
    } catch (err) {
      console.warn('[SaveManager] localStorage write', err);
      return false;
    }
  },

  normalizeStored(raw) {
    if (!raw) return null;
    if (raw.payload?.v === SAVE_VERSION) {
      return { payload: raw.payload, savedAt: raw.savedAt || 0, source: raw.source || 'unknown' };
    }
    if (raw.v === SAVE_VERSION) {
      return { payload: raw, savedAt: raw.savedAt || 0, source: 'legacy' };
    }
    return null;
  },

  async readCloud() {
    if (!YandexSDK.ysdk?.getPlayer) return null;
    try {
      const player = await YandexSDK.ysdk.getPlayer({ scopes: false });
      const data = await player.getData();
      if (!data?.[YANDEX_DATA_KEY]) return null;
      const parsed = typeof data[YANDEX_DATA_KEY] === 'string'
        ? JSON.parse(data[YANDEX_DATA_KEY])
        : data[YANDEX_DATA_KEY];
      return this.normalizeStored(parsed);
    } catch (err) {
      console.warn('[SaveManager] Yandex getData', err);
      return null;
    }
  },

  async writeCloud(wrapped) {
    if (!YandexSDK.ysdk?.getPlayer) return false;
    try {
      const player = await YandexSDK.ysdk.getPlayer({ scopes: false });
      await player.setData({
        [YANDEX_DATA_KEY]: JSON.stringify(wrapped),
      });
      return true;
    } catch (err) {
      console.warn('[SaveManager] Yandex setData', err);
      return null;
    }
  },

  pickNewer(localSnap, cloudSnap) {
    if (!localSnap && !cloudSnap) return null;
    if (!localSnap) return cloudSnap;
    if (!cloudSnap) return localSnap;
    const lt = localSnap.savedAt || 0;
    const ct = cloudSnap.savedAt || 0;
    return ct > lt ? cloudSnap : localSnap;
  },

  migrateLegacyStory() {
    if (typeof HeroStory === 'undefined') return;
    const legacy = HeroStory.loadProgress();
    if (legacy > (GameState.storyUnlocked || 0)) {
      GameState.storyUnlocked = legacy;
    }
  },

  async load() {
    this.loadedFromSave = false;

    const localWrap = this.readLocal();
    const cloudWrap = await this.readCloud();
    const chosen = this.pickNewer(localWrap, cloudWrap);

    if (!chosen?.payload) {
      this.migrateLegacyStory();
      return false;
    }

    const ok = this.applySnapshot(chosen.payload);
    if (ok) {
      this.loadedFromSave = true;
      console.info('[SaveManager] Прогресс загружен', chosen.source || 'unknown');
    }
    return ok;
  },

  async save() {
    if (this._saving) return;
    this._saving = true;

    const snapshot = this.toSnapshot();
    const wrapped = {
      payload: snapshot,
      savedAt: Date.now(),
      source: YandexSDK.ysdk ? 'yandex' : 'local',
    };

    this.writeLocal(wrapped);
    await this.writeCloud(wrapped);

    if (typeof HeroStory !== 'undefined') {
      HeroStory.saveProgress(GameState.storyUnlocked);
    }

    this.lastSavedAt = wrapped.savedAt;
    this._saving = false;
  },

  scheduleSave(delayMs = 600) {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
    }
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.save().catch((err) => console.warn('[SaveManager] save', err));
    }, delayMs);
  },

  saveNow() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    return this.save();
  },

  hasSave() {
    return !!this.readLocal() || false;
  },

  async clear() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch (_) { /* ignore */ }

    if (YandexSDK.ysdk?.getPlayer) {
      try {
        const player = await YandexSDK.ysdk.getPlayer({ scopes: false });
        await player.setData({ [YANDEX_DATA_KEY]: '' });
      } catch (err) {
        console.warn('[SaveManager] clear cloud', err);
      }
    }

    this.loadedFromSave = false;
  },
};
