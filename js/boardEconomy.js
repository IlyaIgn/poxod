/**
 * Экономика доски: веса, кубик, масштаб врагов и наград по раунду.
 */
const BoardEconomy = {
  getTileIdentity(tile) {
    const randomCfg = GameConfig.economy.board?.random || {};
    const keys = Array.isArray(randomCfg.tileIdentityKeys) && randomCfg.tileIdentityKeys.length
      ? randomCfg.tileIdentityKeys
      : ['configType', 'type', 'label', 'monster', 'buff', 'damage', 'gold'];
    return keys.map((k) => String(tile?.[k] ?? '')).join('|');
  },

  limitConsecutivePool(pool, recentTiles) {
    const randomCfg = GameConfig.economy.board?.random || {};
    const maxConsecutive = Math.max(0, Math.floor(Number(randomCfg.maxConsecutiveSameTile) || 0));
    if (maxConsecutive <= 0 || !Array.isArray(recentTiles) || recentTiles.length < maxConsecutive) {
      return pool;
    }

    const tail = recentTiles.slice(-maxConsecutive);
    const firstId = this.getTileIdentity(tail[0]);
    const sameRun = tail.every((t) => this.getTileIdentity(t) === firstId);
    if (!sameRun) return pool;

    const filtered = pool.filter((tile) => this.getTileIdentity(tile) !== firstId);
    return filtered.length ? filtered : pool;
  },

  pickWeighted(entries, getWeight) {
    if (!entries?.length) return undefined;
    const weightOf = getWeight || ((e) => e.weight ?? 1);
    let total = 0;
    const weights = entries.map((entry) => {
      const w = Math.max(0, Number(weightOf(entry)) || 0);
      total += w;
      return w;
    });
    if (total <= 0) return entries[0];
    let roll = Math.random() * total;
    for (let i = 0; i < entries.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return entries[i];
    }
    return entries[entries.length - 1];
  },

  rollDice() {
    const faces = GameConfig.economy.dice?.faces;
    if (!faces?.length) {
      return typeof Phaser !== 'undefined'
        ? Phaser.Math.Between(1, 6)
        : 1 + Math.floor(Math.random() * 6);
    }
    const picked = this.pickWeighted(faces, (f) => f.weight ?? 1);
    const value = picked?.face ?? picked?.value;
    return Phaser.Math.Clamp(Math.round(Number(value) || 1), 1, 6);
  },

  pickBoardTileFromPool(pool, recentTiles = []) {
    if (!pool?.length) return null;

    const randomCfg = GameConfig.economy.board?.random || {};
    const strategy = randomCfg.strategy || 'typeThenTile';
    const tileWeightKey = randomCfg.tileWeightKey || 'weight';
    const tileTypeKey = randomCfg.tileTypeKey || 'configType';
    const fallbackTileTypeKey = randomCfg.fallbackTileTypeKey || 'type';
    const typeWeightKey = randomCfg.typeWeightKey || 'weight';
    const fallbackToTileOnly = randomCfg.fallbackToTileOnly !== false;
    const tileWeightOf = (tile) => tile?.[tileWeightKey] ?? tile?.weight ?? 1;

    const sourcePool = this.limitConsecutivePool(pool, recentTiles);

    if (strategy === 'tileOnly') {
      return this.pickWeighted(sourcePool, tileWeightOf);
    }

    const slotWeights = GameConfig.economy.board?.slotWeights;
    if (!slotWeights || typeof slotWeights !== 'object') {
      return this.pickWeighted(sourcePool, tileWeightOf);
    }

    const grouped = {};
    sourcePool.forEach((tile) => {
      const key = tile?.[tileTypeKey] ?? tile?.[fallbackTileTypeKey];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(tile);
    });

    const typeEntries = Object.keys(slotWeights)
      .filter((key) => grouped[key]?.length)
      .map((key) => ({ key, [typeWeightKey]: slotWeights[key] }));

    if (!typeEntries.length) {
      return this.pickWeighted(sourcePool, tileWeightOf);
    }

    const typeKey = this.pickWeighted(typeEntries, (e) => e?.[typeWeightKey] ?? e?.weight ?? 1).key;
    if (!grouped[typeKey]?.length) {
      return fallbackToTileOnly ? this.pickWeighted(sourcePool, tileWeightOf) : null;
    }
    return this.pickWeighted(grouped[typeKey], tileWeightOf);
  },

  getRoundMultiplier(kind, boardLevel) {
    const cfg = GameConfig.economy.roundScaling?.[kind];
    const maxLevel = GameConfig.meta?.bossLevel ?? 5;
    const level = Phaser.Math.Clamp(Math.floor(boardLevel) || 1, 1, maxLevel);

    if (Array.isArray(cfg) && cfg.length) {
      const idx = Math.min(level - 1, cfg.length - 1);
      const value = Number(cfg[idx]);
      return Number.isFinite(value) && value > 0 ? value : 1;
    }

    if (cfg && typeof cfg === 'object') {
      const value = Number(cfg[level] ?? cfg[String(level)]);
      return Number.isFinite(value) && value > 0 ? value : 1;
    }

    return 1;
  },

  getEnemyStatMultiplier() {
    const base = GameConfig.economy.enemyChapterScale ?? 2;
    const chapters = (typeof GameState !== 'undefined' && GameState.storyUnlocked) || 0;
    return Math.pow(base, Math.max(0, chapters));
  },

  applyEnemyScaling(tile, boardLevel) {
    if (!tile || tile.type !== 'enemy') return { ...tile };

    const level = boardLevel ?? (
      typeof GameState !== 'undefined' ? GameState.boardLevel : 1
    );
    const mul = this.getEnemyStatMultiplier()
      * this.getRoundMultiplier('enemy', level);

    if (mul <= 1) return { ...tile };

    return {
      ...tile,
      hp: Math.max(1, Math.round(tile.hp * mul)),
      atk: Math.max(1, Math.round(tile.atk * mul)),
      defense: Math.max(0, Math.round((tile.defense ?? 2) * mul)),
    };
  },

  applyRewardScaling(tile, boardLevel) {
    if (!tile || tile.gold == null) return { ...tile };

    const level = boardLevel ?? (
      typeof GameState !== 'undefined' ? GameState.boardLevel : 1
    );
    const mul = this.getRoundMultiplier('reward', level);
    if (mul <= 1) return { ...tile };

    return {
      ...tile,
      gold: Math.max(1, Math.round(Number(tile.gold) * mul)),
    };
  },

  applyBoardTileScaling(tile, boardLevel) {
    const scaled = this.applyEnemyScaling(tile, boardLevel);
    return this.applyRewardScaling(scaled, boardLevel);
  },
};

GameConfig.pickWeighted = BoardEconomy.pickWeighted.bind(BoardEconomy);
GameConfig.rollDice = BoardEconomy.rollDice.bind(BoardEconomy);
GameConfig.pickBoardTileFromPool = BoardEconomy.pickBoardTileFromPool.bind(BoardEconomy);
GameConfig.getRoundMultiplier = BoardEconomy.getRoundMultiplier.bind(BoardEconomy);
GameConfig.getEnemyStatMultiplier = BoardEconomy.getEnemyStatMultiplier.bind(BoardEconomy);
GameConfig.applyEnemyScaling = BoardEconomy.applyEnemyScaling.bind(BoardEconomy);
GameConfig.applyRewardScaling = BoardEconomy.applyRewardScaling.bind(BoardEconomy);
GameConfig.applyBoardTileScaling = BoardEconomy.applyBoardTileScaling.bind(BoardEconomy);
