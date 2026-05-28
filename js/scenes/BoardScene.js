/**
 * Изометрическая доска: квадрат, круг или контур с острыми углами; кубик, клетки, враги, бафы и ловушки.
 */

/** Размер ромба в сетке (логическая клетка) */
const ISO_TW = 72;
const ISO_TH = 36;

/** Плитка = ровно одна изометрическая клетка (без уменьшения — общие рёбра) */
const TILE_VISUAL_SCALE = 1;

/** Фишка героя на клетке: чуть ниже и к центру петли доски */
const BOARD_PLAYER_SLOT_NUDGE = {
  towardCenter: 0,
  downFactor: 0.35,
};

const BOSS_LEVEL = GameConfig.meta.bossLevel;

const BOARD_SHAPE = {
  SQUARE: 'square',
  CIRCLE: 'circle',
  SHARP: 'sharp',
};

/** Сторона квадрата на 1-м и 5-м уровне забега (клеток: 4×side − 4) */
const BOARD_SIDE_AT_LEVEL_1 = 4;
const BOARD_SIDE_AT_MAX_LEVEL = 8;

/** «Стадион» для круглой доски по уровню (halfW × halfH) */
const STADIUM_TIERS = [
  { halfW: 2, halfH: 1 },
  { halfW: 2, halfH: 2 },
  { halfW: 3, halfH: 2 },
  { halfW: 3, halfH: 3 },
  { halfW: 4, halfH: 3 },
];

/** Квадратная доска: периметр сетки side×side (12 клеток при side=4) */
const SQUARE_PATH_4 = [
  { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 },
  { col: 3, row: 1 }, { col: 3, row: 2 },
  { col: 3, row: 3 }, { col: 2, row: 3 }, { col: 1, row: 3 }, { col: 0, row: 3 },
  { col: 0, row: 2 }, { col: 0, row: 1 },
];

function getBoardTier(boardLevel) {
  return Phaser.Math.Clamp(Math.floor(boardLevel) || 1, 1, BOSS_LEVEL);
}

function getSquareSideForLevel(boardLevel) {
  const tier = getBoardTier(boardLevel);
  if (BOSS_LEVEL <= 1) return BOARD_SIDE_AT_MAX_LEVEL;
  const span = BOARD_SIDE_AT_MAX_LEVEL - BOARD_SIDE_AT_LEVEL_1;
  return BOARD_SIDE_AT_LEVEL_1 + Math.round(((tier - 1) * span) / (BOSS_LEVEL - 1));
}

function getStadiumDimsForLevel(boardLevel) {
  const tier = getBoardTier(boardLevel);
  return STADIUM_TIERS[Math.min(tier - 1, STADIUM_TIERS.length - 1)];
}

/** Круглая доска: замкнутый контур «стадиона» */
function buildStadiumPath(halfW, halfH) {
  const path = [];
  for (let c = -halfW; c <= halfW; c++) path.push({ col: c, row: -halfH });
  for (let r = -halfH + 1; r <= halfH - 1; r++) path.push({ col: halfW, row: r });
  for (let c = halfW; c >= -halfW; c--) path.push({ col: c, row: halfH });
  for (let r = halfH - 1; r >= -halfH + 1; r--) path.push({ col: -halfW, row: r });
  return path;
}

function isoCellsAdjacent(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;
}

/** У каждой клетки маршрута ровно 2 соседа по ортогональной сетке */
function isValidLoopPath(path) {
  const n = path.length;
  if (n < 3) return false;

  for (let i = 0; i < n; i++) {
    let neighborCount = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j && isoCellsAdjacent(path[i], path[j])) {
        neighborCount += 1;
      }
    }
    if (neighborCount !== 2) return false;
  }

  if (!isoCellsAdjacent(path[0], path[n - 1])) return false;
  return true;
}

function clonePath(path) {
  return path.map((p) => ({ col: p.col, row: p.row }));
}

function offsetPath(path, dc, dr) {
  return path.map((p) => ({ col: p.col + dc, row: p.row + dr }));
}

function rotatePath(path, offset) {
  const n = path.length;
  const o = ((offset % n) + n) % n;
  return path.slice(o).concat(path.slice(0, o));
}

function pushPathCell(path, col, row) {
  const n = path.length;
  if (n && path[n - 1].col === col && path[n - 1].row === row) return;
  path.push({ col, row });
}

/** Ортогональный отрезок сетки */
function linePath(path, c0, r0, c1, r1) {
  if (c0 === c1) {
    const step = r0 <= r1 ? 1 : -1;
    for (let r = r0; r !== r1; r += step) pushPathCell(path, c0, r);
    pushPathCell(path, c1, r1);
  } else if (r0 === r1) {
    const step = c0 <= c1 ? 1 : -1;
    for (let c = c0; c !== c1; c += step) pushPathCell(path, c, r0);
    pushPathCell(path, c1, r1);
  }
}

/** Ступенька между углами (острый излом контура) */
function cornerStairPath(path, c0, r0, c1, r1) {
  let c = c0;
  let r = r0;
  const dc = Math.sign(c1 - c0);
  const dr = Math.sign(r1 - r0);
  while (c !== c1 || r !== r1) {
    if (c !== c1) {
      c += dc;
      pushPathCell(path, c, r);
    }
    if (r !== r1) {
      r += dr;
      pushPathCell(path, c, r);
    }
  }
}

function pathExtent(path) {
  const cols = path.map((p) => p.col);
  const rows = path.map((p) => p.row);
  return {
    minC: Math.min(...cols),
    maxC: Math.max(...cols),
    minR: Math.min(...rows),
    maxR: Math.max(...rows),
  };
}

/** Периметр квадрата side×side по часовой стрелке */
function buildSquarePerimeter(side) {
  if (side < 3) return clonePath(SQUARE_PATH_4);

  const path = [];
  for (let c = 0; c < side; c++) path.push({ col: c, row: 0 });
  for (let r = 1; r < side - 1; r++) path.push({ col: side - 1, row: r });
  for (let c = side - 1; c >= 0; c--) path.push({ col: c, row: side - 1 });
  for (let r = side - 2; r >= 1; r--) path.push({ col: 0, row: r });
  return path;
}

function generateSquareBoardPath(boardLevel) {
  return buildSquarePerimeter(getSquareSideForLevel(boardLevel));
}

function generateCircleBoardPath(boardLevel) {
  const { halfW, halfH } = getStadiumDimsForLevel(boardLevel);
  return buildStadiumPath(halfW, halfH);
}

/** Восьмиугольный контур со срезанными углами (острые повороты) */
function buildChamferedSquare(side, chamfer) {
  const s = side - 1;
  const c = Math.max(1, Math.min(chamfer, Math.floor((side - 3) / 2)));
  const path = [];

  linePath(path, c, 0, s - c, 0);
  cornerStairPath(path, s - c, 0, s, c);
  linePath(path, s, c, s, s - c);
  cornerStairPath(path, s, s - c, s - c, s);
  linePath(path, s - c, s, c, s);
  cornerStairPath(path, c, s, 0, s);
  linePath(path, 0, s, 0, c + 1);
  cornerStairPath(path, 0, c + 1, c, c);
  linePath(path, c, c, c, 0);

  const last = path[path.length - 1];
  if (last.col === path[0].col && last.row === path[0].row) path.pop();
  return path;
}

/** Прямоугольник с вырезом на стороне — острый внутренний угол */
function buildNotchedRectangle(w, h, notchW, notchH) {
  const path = [];
  linePath(path, 0, 0, w, 0);
  linePath(path, w, 0, w, h - notchH);
  linePath(path, w, h - notchH, w - notchW, h - notchH);
  linePath(path, w - notchW, h - notchH, w - notchW, h);
  linePath(path, w - notchW, h, 0, h);
  linePath(path, 0, h, 0, 0);
  const last = path[path.length - 1];
  if (last.col === path[0].col && last.row === path[0].row) path.pop();
  return path;
}

function generateSharpBoardPath(boardLevel) {
  const tier = getBoardTier(boardLevel);
  const side = getSquareSideForLevel(boardLevel) + 1;
  const chamfer = tier <= 2 ? 1 : 2;
  const variant = tier % 3;

  if (variant === 0) {
    return buildChamferedSquare(side, Math.min(chamfer, Math.floor((side - 3) / 2)));
  }
  if (variant === 1) {
    const w = side + 1;
    const h = Math.max(5, side - 1);
    return buildNotchedRectangle(w, h, tier <= 2 ? 1 : 2, 1);
  }
  return buildChamferedSquare(side + 1, chamfer);
}

const BOARD_LAYOUT_BUILDERS = [
  { shape: BOARD_SHAPE.SQUARE, build: generateSquareBoardPath },
  { shape: BOARD_SHAPE.CIRCLE, build: generateCircleBoardPath },
  { shape: BOARD_SHAPE.SHARP, build: generateSharpBoardPath },
];

/**
 * Генерация доски по уровню забега: чем выше boardLevel, тем длиннее маршрут.
 * @returns {{ path: {col:number,row:number}[], shape: string, cells: number }}
 */
function generateBoardLayout(boardLevel = 1) {
  const pick = Phaser.Utils.Array.GetRandom(BOARD_LAYOUT_BUILDERS);
  let path = pick.build(boardLevel);
  const fallbackSide = getSquareSideForLevel(boardLevel);

  if (!isValidLoopPath(path)) {
    path = buildSquarePerimeter(fallbackSide);
    return { path, shape: BOARD_SHAPE.SQUARE, cells: path.length };
  }

  path = rotatePath(path, Phaser.Math.Between(0, path.length - 1));

  const ext = pathExtent(path);
  const maxShift = Math.max(0, Math.floor(Math.min(ext.maxC - ext.minC, ext.maxR - ext.minR) / 4) - 1);
  path = offsetPath(
    path,
    Phaser.Math.Between(-maxShift, maxShift),
    Phaser.Math.Between(-maxShift, maxShift),
  );

  if (!isValidLoopPath(path)) {
    path = buildSquarePerimeter(fallbackSide);
    return { path, shape: BOARD_SHAPE.SQUARE, cells: path.length };
  }

  return { path, shape: pick.shape, cells: path.length };
}

function boardShapeLabel(shape) {
  return GameConfig.getBoardShapeLabel(shape);
}
const TILE = {
  START: 'start',
  FINISH: 'finish',
  ENEMY: 'enemy',
  BUFF: 'buff',
  DAMAGE: 'damage',
  GOLD: 'gold',
};

function formatNextLevelLabel(boardLevel) {
  return GameConfig.formatNextLevel(boardLevel);
}

function mapConfigTile(tile) {
  const types = {
    enemy: TILE.ENEMY,
    buff: TILE.BUFF,
    damage: TILE.DAMAGE,
    gold: TILE.GOLD,
  };
  return {
    ...tile,
    configType: tile.type,
    type: types[tile.type] || TILE.ENEMY,
  };
}

function boardTileTextureKey(tile) {
  if (tile.defeated) return BOARD_TILE_TEXTURES.defeated;
  if (tile.boss) return BOARD_TILE_TEXTURES.boss;
  switch (tile.type) {
    case TILE.START: return BOARD_TILE_TEXTURES.start;
    case TILE.FINISH: return BOARD_TILE_TEXTURES.finish;
    case TILE.ENEMY: return BOARD_TILE_TEXTURES.enemy;
    case TILE.BUFF: return BOARD_TILE_TEXTURES.buff;
    case TILE.DAMAGE: return BOARD_TILE_TEXTURES.damage;
    case TILE.GOLD: return BOARD_TILE_TEXTURES.gold;
    default: return BOARD_TILE_TEXTURES.defeated;
  }
}

const BOARD_STAT_FORMATS = {
  hp: (s) => `${s.hp}/${s.maxHp}`,
  attack: (s) => String(s.attack),
  defense: (s) => String(s.defense),
  gold: (s) => String(s.gold),
  energy: (s) => s.formatEnergyStat(),
  boardLevel: (s) => `${s.boardLevel}/${BOSS_LEVEL}`,
};

const BOARD_STATS = GameConfig.ui.boardStats.map((row) => ({
  ...row,
  format: BOARD_STAT_FORMATS[row.key],
})).filter((row) => row.key !== 'energy');

const BOARD_CFG = GameConfig.economy.board;

const BOARD_LAYOUT = [
  { type: TILE.START, label: BOARD_CFG.start.label },
  ...BOARD_CFG.tiles.map(mapConfigTile),
];

const BOSS_TILE = {
  type: TILE.ENEMY,
  label: BOARD_CFG.boss.label,
  monster: BOARD_CFG.boss.monster,
  boss: true,
  hp: BOARD_CFG.boss.hp,
  atk: BOARD_CFG.boss.atk,
  defense: BOARD_CFG.boss.defense,
  gold: BOARD_CFG.boss.gold,
};

const BOARD_TILE_POOL = BOARD_LAYOUT.slice(1).filter((t) => !t.boss);

const DICE_SPIN_DELAYS = [45, 50, 55, 60, 70, 80, 95, 110, 130, 155, 190, 240, 310, 400, 520];

const TELEPORT_DEPTH = 5500;

class BoardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BoardScene' });
    this.playerPos = 0;
    this.isMoving = false;
    this.isInCombat = false;
    this.isRolling = false;
    this.currentEnemy = null;
    this.deathHandled = false;
    this.isTeleporting = false;
    this._moveGeneration = 0;
  }

  getRouteLen() {
    const pathLen = this.boardPath?.length || 0;
    const tileLen = this.boardTiles?.length || 0;
    if (!pathLen || !tileLen) return Math.max(pathLen, tileLen);
    return Math.min(pathLen, tileLen);
  }

  clampTileIndex(index) {
    const len = this.getRouteLen();
    if (len <= 0) return 0;
    const i = Number.isFinite(index) ? Math.floor(index) : 0;
    return ((i % len) + len) % len;
  }

  clampPlayerPos() {
    this.playerPos = this.clampTileIndex(this.playerPos);
  }

  cancelBoardMotion() {
    this._moveGeneration += 1;
    this.isMoving = false;
    this.isRolling = false;
    if (this.playerToken?.active) {
      this.tweens.killTweensOf(this.playerToken);
    }
  }

  getFinishTileIndex() {
    return Math.max(0, this.getRouteLen() - 1);
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x0f1419);
    this.createBoardBackground(width, height);

    this.tileObjects = [];
    const layout = generateBoardLayout(GameState.boardLevel);
    this.boardPath = layout.path;
    this.boardShape = layout.shape;
    this.boardCellCount = layout.cells;
    this.applyBoardViewport(width, height);
    this.isoOffsets = this.calcIsoBoardOffsets();

    this.boardTiles = this.generateBoardTiles();
    this.clampPlayerPos();
    this.createBoard();
    this.createPlayerToken();
    this.createStatsPanel();
    this.createEnergyPanel(width);
    this.createBoardLegend(width, height);
    this.createBottomButtons(width, height);
    this.createDiceRandomizer();

    this.combatPanel = this.add.container(0, 0).setVisible(false).setDepth(3000);
    this.buildCombatPanel();
    this.centerMsgContainer = null;
    this.deathAlertContainer = null;

    this.refreshHud();
    this.startEnergyTick();
    this.startTutorial();
    YandexSDK.onEnterPlayScene();
  }

  startTutorial() {
    if (!TutorialManager.isActiveForScene('BoardScene')) return;

    this.tutorialOverlay = new TutorialOverlay(this, {
      dice: { mainDie: this.mainDie },
      legend: this.legendInfoBtn,
    });
    this.tutorialOverlay.start();
  }

  createBoardBackground(width, height) {
    if (!this.textures.exists('board_bg')) {
      console.warn('[BoardScene] Текстура board_bg не загружена');
      this.add.rectangle(width / 2, height / 2, width, height, 0x0f1419).setDepth(-100);
      return;
    }

    const bg = this.add.image(width / 2, height / 2, 'board_bg')
      .setDepth(-100)
      .setScrollFactor(0);
    bg.setDisplaySize(width, height);

    this.add.rectangle(width / 2, height / 2, width, height, 0x0f1419, 0.18)
      .setDepth(-99)
      .setScrollFactor(0);
  }

  shutdown() {
    this.stopEnergyTick();
    this.tutorialOverlay?.destroy();
    this.tutorialOverlay = null;
    this.destroyTeleportUi();
    YandexSDK.onLeavePlayScene();
  }

  startEnergyTick() {
    this.stopEnergyTick();
    GameState.syncEnergy();
    this._energyTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.scene.isActive()) return;
        GameState.syncEnergy();
        this.refreshHud();
      },
    });
  }

  stopEnergyTick() {
    if (this._energyTimer) {
      this._energyTimer.remove();
      this._energyTimer = null;
    }
  }

  canInteractWithDice() {
    return !this.isTeleporting
      && !this.isMoving
      && !this.isInCombat
      && !this.isRolling
      && GameState.hp > 0
      && GameState.canSpendEnergyForRoll();
  }

  refreshDiceState() {
    this.setDiceStandEnabled(this.canInteractWithDice());
  }

  showDeathAlert() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    if (this.deathAlertContainer) {
      this.deathAlertContainer.destroy();
      this.deathAlertContainer = null;
    }

    const container = this.add.container(cx, cy).setDepth(4000).setAlpha(0);
    const panel = this.add.rectangle(0, 0, 420, 100, 0x5c1a1a, 0.96)
      .setStrokeStyle(3, 0xe74c3c);
    const label = this.add.text(0, 0, GameConfig.text.board.death, {
      fontSize: scaleFontSize(this, 24),
      color: '#ff7675',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    container.add([panel, label]);
    this.deathAlertContainer = container;

    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 280,
      ease: 'Power2',
    });
  }

  getMessageAnchor() {
    const sprite = (this.isInCombat && this.combatKnight?.active)
      ? this.combatKnight
      : this.playerToken;

    if (sprite?.active) {
      const offsetY = sprite.displayHeight * 0.92 + 18;
      return { x: sprite.x, y: sprite.y - offsetY };
    }

    const { width, height } = this.scale;
    return { x: width / 2, y: height / 2 };
  }

  showCenterMessage(text, kind = 'buff') {
    const anchor = this.getMessageAnchor();
    const startY = anchor.y;

    if (this.centerMsgContainer) {
      this.centerMsgContainer.destroy();
      this.centerMsgContainer = null;
    }
    if (this.centerMsgTimer) {
      this.centerMsgTimer.remove();
    }

    const style = kind === 'damage'
      ? { bg: 0x7b241c, stroke: 0xe74c3c, text: '#ff7675' }
      : { bg: 0x1e6f4a, stroke: 0x2ecc71, text: '#7bed9f' };

    const container = this.add.container(anchor.x, startY).setDepth(3250).setAlpha(0);
    const panel = this.add.rectangle(0, 0, 220, 58, style.bg, 0.94)
      .setStrokeStyle(2, style.stroke);
    const label = this.add.text(0, 0, text, {
      fontSize: scaleFontSize(this, 15),
      color: style.text,
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);

    container.add([panel, label]);
    this.centerMsgContainer = container;

    this.tweens.add({
      targets: container,
      alpha: 1,
      y: startY - 10,
      duration: 220,
      ease: 'Power2',
    });

    this.centerMsgTimer = this.time.delayedCall(1600, () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        y: startY - 48,
        duration: 350,
        onComplete: () => {
          container.destroy();
          if (this.centerMsgContainer === container) {
            this.centerMsgContainer = null;
          }
        },
      });
    });
  }

  applyBoardViewport(width, height) {
    this.boardMargins = getBoardLayoutMargins(width, height);
    const center = getBoardPlayAreaCenter(width, height, this.boardMargins);
    this.boardCenterX = center.x;
    this.boardCenterY = center.y;
    this.calcIsoScale(width, height);
  }

  calcIsoScale(width, height) {
    if (!this.boardPath?.length) {
      this.isoTw = ISO_TW * BOARD_PRESENTATION_SCALE;
      this.isoTh = ISO_TH * BOARD_PRESENTATION_SCALE;
      return;
    }

    const points = this.boardPath.map(({ col, row }) => ({
      x: (col - row) * (ISO_TW / 2),
      y: (col + row) * (ISO_TH / 2),
    }));
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const boundsW = Math.max(...xs) - Math.min(...xs) + ISO_TW;
    const boundsH = Math.max(...ys) - Math.min(...ys) + ISO_TH;
    const m = this.boardMargins || getBoardLayoutMargins(width, height);
    const scale = Math.min(
      (width - m.margin * 2 - m.leftStatsUi - m.rightUi) / boundsW,
      (height - m.margin - m.topStatsUi - m.bottomUi) / boundsH,
    ) * BOARD_PRESENTATION_SCALE;
    this.isoTw = ISO_TW * scale;
    this.isoTh = ISO_TH * scale;
  }

  createStatsPanel() {
    const pad = 16;
    const cfg = GameConfig.ui.boardStatsPanel || {
      width: 350,
      height: 200,
      fontTitle: 16,
      fontIcon: 22,
      fontLabel: 16,
      fontValue: 17,
    };
    const panelW = cfg.width;
    const panelH = cfg.height;
    const fontTitle = cfg.fontTitle ?? 16;
    const fontIcon = cfg.fontIcon ?? 22;
    const fontLabel = cfg.fontLabel ?? 16;
    const fontValue = cfg.fontValue ?? 17;
    const panelX = pad + panelW / 2;
    const panelY = pad + panelH / 2;
    const depth = 2000;

    this.add.rectangle(panelX, panelY, panelW, panelH, 0x243447, 0.92)
      .setStrokeStyle(2, 0x3d566e)
      .setDepth(depth);

    this.add.text(pad + 14, pad + 10, GameConfig.text.board.paramsTitle, {
      fontSize: scaleFontSize(this, fontTitle),
      color: '#8b9cb3',
      fontStyle: 'bold',
    }).setDepth(depth + 1);

    this.statRows = {};
    const titleBlock = fontTitle + 18;
    const rowH = Math.floor((panelH - titleBlock - 8) / BOARD_STATS.length);
    const startY = pad + titleBlock;

    BOARD_STATS.forEach((stat, i) => {
      const rowY = startY + i * rowH + rowH / 2;
      const xIcon = pad + 14;
      const xLabel = pad + 42;
      const xValue = pad + panelW - 14;

      this.add.text(xIcon, rowY, stat.icon, {
        fontSize: scaleFontSize(this, fontIcon),
        color: stat.color,
      }).setOrigin(0, 0.5).setDepth(depth + 1);

      this.add.text(xLabel, rowY, stat.label, {
        fontSize: scaleFontSize(this, fontLabel),
        color: '#95a5a6',
      }).setOrigin(0, 0.5).setDepth(depth + 1);

      const valueText = this.add.text(xValue, rowY, '', {
        fontSize: scaleFontSize(this, fontValue),
        color: '#ecf0f1',
        fontStyle: 'bold',
      }).setOrigin(1, 0.5).setDepth(depth + 1);

      let timerText = null;
      let timerTooltip = null;
      let timerTooltipBg = null;
      if (stat.key === 'energy') {
        timerTooltipBg = this.add.rectangle(0, 0, 24, 18, 0x243447, 0.96)
          .setOrigin(0, 0.5)
          .setStrokeStyle(1, 0x3d566e);
        timerText = this.add.text(8, 0, '', {
          fontSize: scaleFontSize(this, 12),
          color: '#2ecc71',
          fontStyle: 'bold',
        })
          .setOrigin(0, 0.5);
        timerTooltip = this.add.container(xValue + 10, rowY, [timerTooltipBg, timerText])
          .setVisible(false)
          .setDepth(depth + 2);
      }

      this.statRows[stat.key] = {
        valueText,
        format: stat.format,
        timerText,
        timerTooltip,
        timerTooltipBg,
      };

      if (stat.key === 'energy') {
        const hitX = pad + panelW / 2;
        GameState.bindEnergyStatRowToggle(
          this,
          this.statRows.energy,
          hitX,
          rowY,
          panelW - 20,
          rowH,
          depth + 2,
        );
      }
    });
  }

  createEnergyPanel(width) {
    const pad = 16;
    const homeCfg = GameConfig.ui.boardHomeButton || { width: 172, height: 62, fontSize: 22 };
    const homeH = homeCfg.height;
    const panelW = 240;
    const compactH = 56;
    const x = width / 2;
    const y = pad + homeH / 2;
    const depth = 2000;

    this.energyPanelCompactH = compactH;
    this.energyPanelExpandedH = 82;
    this.energyPanelCenterY = y;

    this.energyPanelBg = this.add.rectangle(x, y, panelW, compactH, 0x243447, 0.92)
      .setStrokeStyle(2, 0x3d566e)
      .setDepth(depth);

    this.energyLabelText = this.add.text(x - panelW / 2 + 14, y - 11, '⚡ Энергия', {
      fontSize: scaleFontSize(this, 18),
      color: '#95a5a6',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(depth + 1).setVisible(false);

    this.energyValueText = this.add.text(x + panelW / 2 - 14, y - 11, '', {
      fontSize: scaleFontSize(this, 20),
      color: '#2ecc71',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(depth + 1).setVisible(false);

    this.energyTimerText = this.add.text(x, y + 14, '', {
      fontSize: scaleFontSize(this, 13),
      color: '#7bed9f',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(depth + 1).setVisible(false);

    this.updateEnergyPanel();
  }

  updateEnergyPanel() {
    if (!this.energyPanelBg || !this.energyValueText) return;
    const timerLabel = GameState.getRegenTimerLabel();
    const showTimer = !!timerLabel;
    const h = showTimer ? this.energyPanelExpandedH : this.energyPanelCompactH;
    const y = this.energyPanelCenterY;
    const topY = showTimer ? y - 11 : y;
    this.energyPanelBg.setSize(this.energyPanelBg.width, h);
    this.energyLabelText.setPosition(this.energyLabelText.x, topY).setVisible(true);
    this.energyValueText.setPosition(this.energyValueText.x, topY).setVisible(true);
    this.energyTimerText.setText(timerLabel).setVisible(showTimer);
  }

  createBoardLegend(width, height) {
    const items = GameConfig.ui.boardLegend || [];
    if (!items.length) return;

    const legendCfg = GameConfig.ui.legendPanel || {};
    const pad = legendCfg.outerPadding ?? 16;
    const innerPad = legendCfg.innerPadding ?? 10;
    const iconW = legendCfg.iconWidth ?? 28;
    const iconH = legendCfg.iconHeight ?? 14;
    const titleH = legendCfg.titleBlockHeight ?? 18;
    const rowGap = legendCfg.rowGap ?? 3;
    const titleTopOffset = legendCfg.titleTopOffset ?? 8;
    const contentTopOffset = legendCfg.contentTopOffset ?? 8;
    const titleFontSize = legendCfg.titleFontSize ?? 12;
    const rowFontSize = legendCfg.rowFontSize ?? 12;
    const rowLineSpacing = legendCfg.rowLineSpacing ?? 1;
    const rowMinHeight = legendCfg.rowMinHeight ?? 15;
    const rowHeightExtra = legendCfg.rowHeightExtra ?? 2;
    const panelW = legendCfg.width || 252;
    const textMaxW = panelW - innerPad * 2 - iconW - 8;
    const depth = 2000;

    const measureStyle = {
      fontSize: scaleFontSize(this, rowFontSize),
      wordWrap: { width: textMaxW },
    };
    const rowHeights = items.map((item) => {
      const probe = this.add.text(0, -9999, `${item.slot} — ${item.desc}`, measureStyle);
      const h = Math.max(rowMinHeight, Math.ceil(probe.height) + rowHeightExtra);
      probe.destroy();
      return h;
    });
    const rowsH = rowHeights.reduce((sum, h) => sum + h, 0) + rowGap * Math.max(0, items.length - 1);
    const panelH = Math.max(legendCfg.minHeight || 0, titleH + 10 + rowsH + 8);
    const margins = this.boardMargins || getBoardLayoutMargins(width, height);
    const infoSize = margins.legendInfoSize || GameConfig.ui.legendInfoButtonSize || 44;
    const statsPanelH = margins.statsPanelH
      || GameConfig.ui.boardStatsPanel?.height
      || 152;

    let panelX;
    let panelY;
    if (margins.legendAnchor === 'left') {
      panelX = pad + panelW / 2;
      panelY = pad + statsPanelH + 12 + panelH / 2;
    } else {
      panelX = pad + panelW / 2;
      panelY = height - pad - infoSize - 10 - panelH / 2;
    }

    this.legendPanelContainer = this.add.container(panelX, panelY)
      .setDepth(depth)
      .setVisible(false);

    const panelLeft = -panelW / 2;
    const panelTop = -panelH / 2;

    this.legendPanelContainer.add(
      this.add.rectangle(0, 0, panelW, panelH, 0x243447, 0.92)
        .setStrokeStyle(2, 0x3d566e),
    );

    this.legendPanelContainer.add(
      this.add.text(panelLeft + innerPad, panelTop + titleTopOffset, GameConfig.text.board.legendTitle, {
        fontSize: scaleFontSize(this, titleFontSize),
        color: '#8b9cb3',
        fontStyle: 'bold',
      }).setOrigin(0, 0),
    );

    const iconX = panelLeft + innerPad + iconW / 2;
    const textX = panelLeft + innerPad + iconW + 8;
    let rowY = panelTop + titleH + contentTopOffset;

    items.forEach((item, i) => {
      const rowH = rowHeights[i];
      const centerY = rowY + rowH / 2;

      if (this.textures.exists(item.texture)) {
        this.legendPanelContainer.add(
          this.add.image(iconX, centerY, item.texture)
            .setOrigin(0.5)
            .setDisplaySize(iconW, iconH),
        );
      }

      this.legendPanelContainer.add(
        this.add.text(textX, rowY, `${item.slot} — ${item.desc}`, {
          fontSize: scaleFontSize(this, rowFontSize),
          color: '#d5dbdb',
          wordWrap: { width: textMaxW },
          lineSpacing: rowLineSpacing,
        }).setOrigin(0, 0),
      );

      rowY += rowH + rowGap;
    });

    const infoX = pad;
    const infoY = height - pad - infoSize;
    const infoFont = scaleFontSize(this, Math.max(18, Math.round(infoSize * 0.5)));
    this.legendInfoBtn = this.makeButton(
      infoX,
      infoY,
      infoSize,
      infoSize,
      GameConfig.text.board.legendInfoButton,
      0x34495e,
      () => this.toggleBoardLegend(),
      infoFont,
      depth + 2,
    );
    this.legendOpen = false;
  }

  toggleBoardLegend() {
    if (!this.legendPanelContainer) return;
    this.legendOpen = !this.legendOpen;
    this.legendPanelContainer.setVisible(this.legendOpen);
    const activeColor = 0x3d566e;
    const idleColor = 0x34495e;
    this.legendInfoBtn.bg.setFillStyle(this.legendOpen ? activeColor : idleColor);
  }

  createDiceRandomizer() {
    const dieScale = ((this.diceSlotSize || 72) * 0.98) / 512;

    this.diceRandomizer = this.add.container(this.diceCenterX, this.diceCenterY).setDepth(2102);

    this.mainDie = this.add.image(0, 0, diceFaceKey(1))
      .setScale(dieScale)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.diceRandomizer.add(this.mainDie);

    this.mainDie.on('pointerdown', () => this.startDiceRoll());
    this.mainDieBaseScale = dieScale;
  }

  setDiceFace(sprite, value) {
    sprite.setTexture(diceFaceKey(value));
  }

  setDiceStandEnabled(enabled) {
    if (!this.mainDie) return;
    if (enabled) {
      this.mainDie.setInteractive({ useHandCursor: true });
      this.mainDie.setAlpha(1);
    } else {
      this.mainDie.disableInteractive();
      this.mainDie.setAlpha(0.5);
    }
  }

  startDiceRoll() {
    if (this.isTeleporting || this.isMoving || this.isInCombat || this.isRolling || GameState.hp <= 0) return;

    if (!GameState.canSpendEnergyForRoll()) {
      const cfg = GameState.getEnergyConfig();
      this.showCenterMessage(
        GameConfig.format(GameConfig.text.board.notEnoughEnergy, {
          cost: cfg.rollCost ?? 1,
          seconds: GameState.secondsUntilEnergyForRoll(),
        }),
        'damage',
      );
      this.refreshDiceState();
      return;
    }

    if (!GameState.spendEnergyForRoll()) {
      this.refreshDiceState();
      return;
    }

    TutorialManager.notifyAction('dice');
    this.tutorialOverlay?.refresh();

    this.isRolling = true;
    this.setDiceStandEnabled(false);

    const finalRoll = GameConfig.rollDice();
    this.runDiceSpin(0, finalRoll);
  }

  runDiceSpin(step, finalRoll) {
    if (step >= DICE_SPIN_DELAYS.length) {
      this.setDiceFace(this.mainDie, finalRoll);

      this.tweens.add({
        targets: this.mainDie,
        scale: this.mainDieBaseScale * 1.12,
        duration: 120,
        yoyo: true,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.mainDie.setScale(this.mainDieBaseScale);
          this.isRolling = false;
          this.time.delayedCall(250, () => this.applyRoll(finalRoll));
        },
      });
      return;
    }

    this.setDiceFace(this.mainDie, Phaser.Math.Between(1, 6));

    this.time.delayedCall(DICE_SPIN_DELAYS[step], () => {
      this.runDiceSpin(step + 1, finalRoll);
    });
  }

  applyRoll(roll) {
    this.isMoving = true;
    this.setDiceStandEnabled(false);
    this.startPlayerWalk();

    this.movePlayerSteps(roll, () => {
      this.setPlayerStatic();
      this.resolveTile(this.playerPos);
    });
  }

  createBottomButtons(width, height) {
    const pad = 20;
    const diceH = Math.round((GameConfig.ui.diceBaseSize || 96) * UI_PRESENTATION_SCALE);
    this.diceSlotSize = diceH;

    const homeCfg = GameConfig.ui.boardHomeButton || { width: 172, height: 62, fontSize: 22 };
    const homeW = homeCfg.width;
    const homeH = homeCfg.height;
    const homeX = width - pad - homeW;
    const homeY = pad;
    const homeFont = scaleFontSize(this, homeCfg.fontSize);

    this.homeBtn = this.makeButton(homeX, homeY, homeW, homeH, GameConfig.text.board.homeButton, 0x34495e, () => {
      if (!this.isTeleporting && !this.isMoving && !this.isInCombat && !this.isRolling) {
        this.scene.start('LoadingScene', {
          next: 'HomeScene',
          label: GameConfig.text.loading.home,
        });
      }
    }, homeFont, 2000);

    this.diceCenterX = width - pad - diceH / 2;
    this.diceCenterY = height - pad - diceH / 2;

    const rollInfoCfg = GameConfig.ui.rollEnergyInfo || {};
    const rollInfoW = rollInfoCfg.width ?? 230;
    const rollInfoH = rollInfoCfg.height ?? 44;
    const rollInfoGap = rollInfoCfg.gapFromDice ?? 10;
    const rollInfoFont = rollInfoCfg.fontSize ?? 14;
    const rollCost = GameState.getEnergyConfig().rollCost ?? 1;
    const rollInfoText = GameConfig.format(
      GameConfig.text.board.rollEnergyInfo || '1 ролл = {cost}⚡',
      { cost: rollCost },
    );
    const rollInfoX = this.diceCenterX;
    const rollInfoY = this.diceCenterY - diceH / 2 - rollInfoGap - rollInfoH / 2;

    this.rollEnergyInfoBg = this.add.rectangle(rollInfoX, rollInfoY, rollInfoW, rollInfoH, 0x243447, 0.92)
      .setStrokeStyle(2, 0x3d566e)
      .setDepth(2001);
    this.rollEnergyInfoText = this.add.text(rollInfoX, rollInfoY, rollInfoText, {
      fontSize: scaleFontSize(this, rollInfoFont),
      color: '#2ecc71',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(2002);
  }

  calcIsoBoardOffsets() {
    const points = this.boardPath.map(({ col, row }) => this.isoGridToLocal(col, row));
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    return { cx, cy };
  }

  isoGridToLocal(col, row) {
    return {
      x: (col - row) * (this.isoTw / 2),
      y: (col + row) * (this.isoTh / 2),
    };
  }

  getTileScreenPos(index) {
    const i = this.clampTileIndex(index);
    const cell = this.boardPath?.[i];
    if (!cell) {
      console.warn('[BoardScene] Нет клетки маршрута', { index, i, len: this.boardPath?.length });
      return {
        x: this.boardCenterX,
        y: this.boardCenterY,
        depth: 0,
      };
    }
    const { col, row } = cell;
    const local = this.isoGridToLocal(col, row);
    return {
      x: this.boardCenterX + local.x - this.isoOffsets.cx,
      y: this.boardCenterY + local.y - this.isoOffsets.cy,
      depth: col + row,
    };
  }

  /** Центр петли маршрута (центроид полигона) — «внутри» доски */
  getBoardCenterScreen() {
    const n = this.boardPath.length;
    if (!n) return { x: this.boardCenterX, y: this.boardCenterY };

    const pts = [];
    for (let i = 0; i < n; i++) {
      pts.push(this.getTileScreenPos(i));
    }

    let area2 = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const cross = pts[i].x * pts[j].y - pts[j].x * pts[i].y;
      area2 += cross;
      cx += (pts[i].x + pts[j].x) * cross;
      cy += (pts[i].y + pts[j].y) * cross;
    }

    if (Math.abs(area2) < 1e-4) {
      let sx = 0;
      let sy = 0;
      pts.forEach((p) => {
        sx += p.x;
        sy += p.y;
      });
      return { x: sx / n, y: sy / n };
    }

    const inv = 1 / (3 * area2);
    return { x: cx * inv, y: cy * inv };
  }

  createFinishTile() {
    if (GameState.boardLevel >= BOSS_LEVEL) {
      return GameConfig.applyBoardTileScaling({
        ...BOSS_TILE,
        label: BOARD_CFG.finish.label,
        defeated: false,
      }, GameState.boardLevel);
    }
    return { type: TILE.FINISH, label: formatNextLevelLabel(GameState.boardLevel), defeated: false };
  }

  generateBoardTiles() {
    const start = { type: TILE.START, label: BOARD_CFG.start.label, defeated: false };
    const finish = this.createFinishTile();
    const pool = BOARD_TILE_POOL.map((t) => GameConfig.applyBoardTileScaling(
      { ...t, defeated: false },
      GameState.boardLevel,
    ));
    const routeLen = this.boardPath?.length || 0;
    if (routeLen < 2) {
      return [start, finish];
    }
    const middleCount = Math.max(0, routeLen - 2);
    const middle = [];
    for (let i = 0; i < middleCount; i += 1) {
      const picked = GameConfig.pickBoardTileFromPool(pool, middle);
      if (picked) middle.push({ ...picked });
    }
    return [start, ...middle, finish];
  }

  destroyTileVisuals() {
    this.tileObjects.forEach((t) => {
      if (!t) return;
      t.tileSprite?.destroy();
      t.label?.destroy();
    });
    this.tileObjects = [];
  }

  getTileDisplaySize() {
    return {
      w: this.isoTw * TILE_VISUAL_SCALE,
      h: this.isoTh * TILE_VISUAL_SCALE,
    };
  }

  createTileSprite(x, y, depth, tile, highlight = false) {
    const key = boardTileTextureKey(tile);
    const { w, h } = this.getTileDisplaySize();
    const sprite = this.add.image(x, y, key)
      .setOrigin(0.5, 0.5)
      .setDepth(depth);
    sprite.setDisplaySize(w, h);
    sprite.setTint(highlight ? 0xfff5b0 : 0xffffff);
    return sprite;
  }

  updateTileSpriteVisual(obj, tile, highlight = false) {
    if (!obj?.tileSprite) return;
    const key = boardTileTextureKey(tile);
    const { w, h } = this.getTileDisplaySize();
    if (this.textures.exists(key)) {
      obj.tileSprite.setTexture(key);
    }
    obj.tileSprite.setDisplaySize(w, h);
    obj.tileSprite.setTint(highlight ? 0xfff5b0 : 0xffffff);
  }

  rebuildBoardLayout() {
    const { width, height } = this.scale;
    this.destroyTileVisuals();
    const layout = generateBoardLayout(GameState.boardLevel);
    this.boardPath = layout.path;
    this.boardShape = layout.shape;
    this.boardCellCount = layout.cells;
    this.applyBoardViewport(width, height);
    this.isoOffsets = this.calcIsoBoardOffsets();
    this.boardTiles = this.generateBoardTiles();
    this.clampPlayerPos();
    this.createBoard();
  }

  collectBoardVisuals() {
    const items = [];
    this.tileObjects.forEach((t) => {
      if (!t) return;
      if (t.tileSprite) items.push(t.tileSprite);
      if (t.label) items.push(t.label);
    });
    return items;
  }

  destroyTeleportUi() {
    if (this.teleportCaption) {
      this.teleportCaption.destroy();
      this.teleportCaption = null;
    }
    if (this.teleportOverlay) {
      this.teleportOverlay.destroy();
      this.teleportOverlay = null;
    }
    this.teleportUi = null;
  }

  showTeleportCaption(text, duration = 0) {
    this.destroyTeleportUi();
    const { width, height } = this.scale;
    const label = this.add.text(width / 2, height * 0.36, text, {
      fontSize: scaleFontSize(this, 20),
      color: '#aed6f1',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(TELEPORT_DEPTH).setAlpha(0);

    this.teleportCaption = label;
    this.tweens.add({ targets: label, alpha: 1, duration: 120 });

    if (duration > 0) {
      this.time.delayedCall(duration, () => {
        if (this.teleportCaption === label) {
          this.tweens.add({
            targets: label,
            alpha: 0,
            duration: 180,
            onComplete: () => label.destroy(),
          });
        }
      });
    }
  }

  createTeleportOverlay() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const container = this.add.container(0, 0).setDepth(TELEPORT_DEPTH);
    const veil = this.add.rectangle(cx, cy, width, height, 0x0d1117, 0);
    const panel = this.add.rectangle(cx, cy, 420, 200, 0x1a252f, 0.96)
      .setStrokeStyle(2, 0x3498db);
    const title = this.add.text(cx, cy - 52, GameConfig.text.board.teleportTitle, {
      fontSize: scaleFontSize(this, 26),
      color: '#f0e6d3',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const phase = this.add.text(cx, cy - 12, GameConfig.text.loading.default, {
      fontSize: scaleFontSize(this, 18),
      color: '#85c1e9',
    }).setOrigin(0.5);
    const levelTitle = this.add.text(cx, cy + 22, '', {
      fontSize: scaleFontSize(this, 22),
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const barW = 300;
    const barH = 14;
    const barY = cy + 58;
    const barBg = this.add.rectangle(cx, barY, barW, barH, 0x243447)
      .setStrokeStyle(1, 0x3d566e);
    const barFill = this.add.rectangle(cx - barW / 2 + 2, barY, 0, barH - 4, 0x2980b9)
      .setOrigin(0, 0.5);

    container.add([veil, panel, title, phase, levelTitle, barBg, barFill]);
    container.setAlpha(0);

    this.teleportOverlay = container;
    this.teleportUi = { veil, panel, title, phase, levelTitle, barBg, barFill, barW, barH, cx, cy };

    this.tweens.add({ targets: container, alpha: 1, duration: 220 });
    this.tweens.add({ targets: veil, alpha: 0.88, duration: 280 });

    return this.teleportUi;
  }

  setTeleportPhase(text) {
    if (!this.teleportUi?.phase) return;
    this.teleportUi.phase.setText(text);
    this.teleportUi.phase.setScale(0.92);
    this.tweens.add({
      targets: this.teleportUi.phase,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  runTeleportProgress(duration, onComplete) {
    const ui = this.teleportUi;
    if (!ui) {
      onComplete?.();
      return;
    }

    this.tweens.add({
      targets: { p: 0 },
      p: 1,
      duration,
      ease: 'Power2',
      onUpdate: (tween) => {
        const v = tween.getValue();
        ui.barFill.width = Math.max(0, (ui.barW - 4) * v);
        ui.barFill.x = ui.cx - ui.barW / 2 + 2;
      },
      onComplete: () => onComplete?.(),
    });
  }

  fadeInBoardVisuals(onComplete) {
    const visuals = this.collectBoardVisuals();
    visuals.forEach((o) => o.setAlpha(0));

    if (!visuals.length) {
      onComplete?.();
      return;
    }

    let done = 0;
    const check = () => {
      done += 1;
      if (done >= visuals.length) onComplete?.();
    };

    visuals.forEach((obj, i) => {
      this.tweens.add({
        targets: obj,
        alpha: 1,
        duration: 320,
        delay: i * 28,
        ease: 'Power2.out',
        onComplete: check,
      });
    });
  }

  playLevelTeleportTransition() {
    this.cancelBoardMotion();
    this.isTeleporting = true;
    this.setDiceStandEnabled(false);
    this.homeBtn?.bg?.disableInteractive();

    const unitScale = this.isoTw / ISO_TW;
    const tokenScale = KNIGHT_SCALE.board * unitScale;
    const boardVisuals = this.collectBoardVisuals();

    this.showTeleportCaption(GameConfig.text.board.teleportVanish);

    this.tweens.add({
      targets: this.playerToken,
      alpha: 0,
      scaleX: tokenScale * 0.35,
      scaleY: tokenScale * 0.35,
      duration: 360,
      ease: 'Power2.in',
    });

    if (boardVisuals.length) {
      this.tweens.add({
        targets: boardVisuals,
        alpha: 0,
        duration: 300,
        ease: 'Power2.in',
      });
    }

    this.time.delayedCall(380, () => {
      if (!this.scene.isActive()) return;

      this.playerToken.setVisible(false);
      if (this.teleportCaption) {
        this.teleportCaption.destroy();
        this.teleportCaption = null;
      }

      this.createTeleportOverlay();
      this.setTeleportPhase(GameConfig.text.loading.default);

      this.runTeleportProgress(520, () => {
        if (!this.scene.isActive()) return;

        this.rebuildBoardLayout();
        this.setTeleportPhase(GameConfig.text.board.teleportAppearLevel);
        this.teleportUi.levelTitle.setText(
          GameConfig.format(GameConfig.text.board.levelTeleport, {
            level: GameState.boardLevel,
          }),
        );
        this.tweens.add({
          targets: this.teleportUi.levelTitle,
          alpha: 1,
          duration: 280,
          ease: 'Power2.out',
        });

        this.fadeInBoardVisuals(() => {
          if (!this.scene.isActive()) return;

          this.time.delayedCall(280, () => {
            this.setTeleportPhase(GameConfig.text.board.teleportAppearHero);

            const pos = this.getTilePosition(0);
            this.playerToken.setPosition(pos.x, pos.y);
            this.playerToken.setScale(tokenScale * 0.4);
            this.playerToken.setAlpha(0);
            this.playerToken.setVisible(true);
            this.setPlayerStatic();

            this.tweens.add({
              targets: this.playerToken,
              alpha: 1,
              scaleX: tokenScale,
              scaleY: tokenScale,
              duration: 420,
              ease: 'Back.easeOut',
              onComplete: () => this.finishLevelTeleport(tokenScale),
            });
          });
        });
      });
    });
  }

  finishLevelTeleport(tokenScale) {
    if (!this.scene.isActive()) return;

    this.destroyTeleportUi();
    this.playerToken.setScale(tokenScale);
    this.highlightTile(this.playerPos);
    this.updateTokenPosition(false);
    this.refreshHud();

    this.isTeleporting = false;
    this.refreshDiceState();
    this.homeBtn?.bg?.setInteractive({ useHandCursor: true });

    const finishHint = GameState.boardLevel >= BOSS_LEVEL
      ? GameConfig.text.board.goalBoss
      : GameConfig.format(GameConfig.text.board.goalLevel, {
        level: formatNextLevelLabel(GameState.boardLevel),
      });

    if (GameState.boardLevel >= BOSS_LEVEL) {
      this.showCenterMessage(
        GameConfig.format(GameConfig.text.board.levelBossReached, {
          bossLevel: BOSS_LEVEL,
          hint: finishHint,
        }),
        'damage',
      );
    } else {
      const cells = this.boardCellCount || this.boardPath?.length || 0;
      this.showCenterMessage(
        GameConfig.format(GameConfig.text.board.levelReached, {
          level: GameState.boardLevel,
          hint: `${boardShapeLabel(this.boardShape)} · ${cells} клеток\n${finishHint}`,
        }),
        'buff',
      );
    }
  }

  advanceBoardLevel() {
    if (this.isTeleporting) return;

    this.cancelBoardMotion();
    GameState.boardLevel = Math.min(BOSS_LEVEL, GameState.boardLevel + 1);
    this.playerPos = 0;
    GameState.persist();
    this.playLevelTeleportTransition();
  }

  returnToLobby() {
    GameState.laps += 1;
    GameState.boardLevel = 1;
    GameState.persist();
    this.scene.start('LoadingScene', {
      next: 'HomeScene',
      label: GameConfig.text.loading.home,
    });
  }

  /** Пометить клетку пройденной и сменить спрайт на «пройдено» */
  markTilePassed(index) {
    const i = this.clampTileIndex(index);
    const tile = this.boardTiles[i];
    const obj = this.tileObjects[i];
    if (!tile || !obj || tile.defeated) return;
    if (tile.type === TILE.FINISH) return;

    tile.defeated = true;
    this.updateTileSpriteVisual(obj, tile, i === this.playerPos);
  }

  buildTileVisual(index, highlight = false) {
    const i = this.clampTileIndex(index);
    const tile = this.boardTiles[i];
    if (!tile) return;
    const old = this.tileObjects[i];
    if (old) {
      old.tileSprite?.destroy();
      old.label?.destroy();
    }

    const { x, y, depth } = this.getTileScreenPos(i);
    const tileSprite = this.createTileSprite(x, y, depth, tile, highlight);

    this.tileObjects[i] = {
      tileSprite,
      x,
      y,
      label: null,
      depth,
      index: i,
      tileType: tile.type,
    };
  }

  createBoard() {
    const order = this.boardTiles.map((tile, i) => ({ tile, i, ...this.getTileScreenPos(i) }));
    order.sort((a, b) => a.depth - b.depth);
    order.forEach(({ i }) => this.buildTileVisual(i, false));
  }

  setPlayerStatic() {
    if (!this.playerToken?.active) return;
    stopKnightAnim(this.playerToken);
  }

  startPlayerWalk() {
    if (!this.playerToken?.active) return;
    playKnightAnim(this.playerToken, 'walk');
  }

  /** Поворот рыцаря по горизонтали движения (вправо / влево) */
  setKnightWalkFacing(dx) {
    if (!this.playerToken?.active || Math.abs(dx) < 1.5) return;
    this.playerToken.setFlipX(dx > 0);
  }

  createPlayerToken() {
    const unitScale = this.isoTw / ISO_TW;
    this.playerToken = KnightAnimator.createSprite(this, 0, 0, {
      scale: KNIGHT_SCALE.board * unitScale,
      originX: 0.5,
      originY: 1,
    });
    this.playerToken.setDepth(100);
    this.setPlayerStatic();
    this.updateTokenPosition(false);
    this.highlightTile(this.playerPos);
  }

  updateTokenPosition(animate) {
    const pos = this.getTilePosition(this.playerPos);
    if (!animate) {
      this.playerToken.setPosition(pos.x, pos.y);
      return;
    }

    this.tweens.add({
      targets: this.playerToken,
      x: pos.x,
      y: pos.y,
      duration: 320,
      ease: 'Power2',
    });
  }

  getTilePosition(index) {
    const { x, y } = this.getTileScreenPos(index);
    const center = this.getBoardCenterScreen();
    const t = BOARD_PLAYER_SLOT_NUDGE.towardCenter;
    const down = this.isoTh * BOARD_PLAYER_SLOT_NUDGE.downFactor;
    return {
      x: x + (center.x - x) * t,
      y: y + (center.y - y) * t + down,
    };
  }

  highlightTile(index) {
    const activeIndex = this.clampTileIndex(index);
    this.tileObjects.forEach((t, i) => {
      if (!t) return;
      const active = i === activeIndex;
      const tile = this.boardTiles[i];
      this.updateTileSpriteVisual(t, tile, active);
      if (active) {
        this.playerToken.setDepth(t.depth + 50);
      }
    });
  }

  movePlayerSteps(steps, onComplete) {
    if (this.isTeleporting || !this.scene?.isActive()) {
      return;
    }

    const len = this.getRouteLen();
    if (len <= 0) {
      this.isMoving = false;
      onComplete?.();
      return;
    }

    if (steps <= 0) {
      this.isMoving = false;
      this.refreshDiceState();
      onComplete();
      return;
    }

    const moveGen = this._moveGeneration;
    const finishIndex = this.getFinishTileIndex();
    this.clampPlayerPos();
    const fromIndex = this.playerPos;
    const toIndex = (fromIndex + 1) % len;
    const fromPos = this.getTilePosition(fromIndex);
    const toPos = this.getTilePosition(toIndex);

    this.setKnightWalkFacing(toPos.x - fromPos.x);
    this.playerPos = toIndex;

    this.highlightTile(this.playerPos);
    this.updateTokenPosition(true);

    this.time.delayedCall(340, () => {
      if (!this.scene?.isActive() || this.isTeleporting || moveGen !== this._moveGeneration) {
        return;
      }
      if (this.playerPos === finishIndex) {
        this.isMoving = false;
        this.setPlayerStatic();
        this.resolveTile(this.playerPos);
        return;
      }
      this.movePlayerSteps(steps - 1, onComplete);
    });
  }

  resolveTile(index) {
    const i = this.clampTileIndex(index);
    const tile = this.boardTiles?.[i];
    if (!tile) return;
    this.refreshHud();

    switch (tile.type) {
      case TILE.START:
        GameState.healToFull();
        GameState.persist();
        this.showCenterMessage(GameConfig.text.board.startHeal, 'buff');
        this.markTilePassed(i);
        break;

      case TILE.FINISH:
        this.advanceBoardLevel();
        return;

      case TILE.ENEMY:
        if (tile.defeated) break;
        this.startCombat(tile, index);
        return;

      case TILE.BUFF:
        if (tile.defeated) break;
        this.applyBuff(tile);
        GameState.persist();
        this.markTilePassed(i);
        break;

      case TILE.DAMAGE:
        if (tile.defeated) break;
        this.playKnightHurt();
        const dmg = GameState.takeDamage(tile.damage);
        this.showFloatingPlayerTooltip(
          GameConfig.format(
            GameConfig.text.board.trapTooltip || '-{damage} HP',
            { damage: dmg },
          ),
          '#ff6b6b',
        );
        this.checkDeath();
        this.markTilePassed(i);
        break;

      case TILE.GOLD:
        if (tile.defeated) break;
        GameState.gold += tile.gold;
        GameState.persist();
        this.showGoldTooltip(tile.gold);
        this.markTilePassed(i);
        break;
    }

    this.refreshHud();
  }

  playKnightHurt() {
    playKnightAnim(this.playerToken, 'hurt', {
      onComplete: () => {
        if (this.playerToken?.active && !this.isMoving) {
          this.setPlayerStatic();
        }
      },
    });
  }

  applyBuff(tile) {
    const buffCfg = GameConfig.economy.buffs;
    let message = '';
    let tooltip = '';
    let color = '#2ecc71';
    switch (tile.buff) {
      case 'heal': {
        const n = buffCfg.heal.hp;
        GameState.hp = Math.min(GameState.maxHp, GameState.hp + n);
        message = GameConfig.format(GameConfig.text.board.buffHeal, {
          label: tile.label,
          hp: n,
        });
        tooltip = GameConfig.format(
          GameConfig.text.board.buffHealTooltip || '+{hp} HP',
          { hp: n },
        );
        color = '#2ecc71';
        break;
      }
      case 'attack': {
        const n = buffCfg.attack.attack;
        GameState.attack += n;
        message = GameConfig.format(GameConfig.text.board.buffAttack, {
          label: tile.label,
          attack: n,
        });
        tooltip = GameConfig.format(
          GameConfig.text.board.buffAttackTooltip || '+{attack} ATK',
          { attack: n },
        );
        color = '#e67e22';
        break;
      }
      case 'defense': {
        const n = buffCfg.defense.defense;
        GameState.defense += n;
        message = GameConfig.format(GameConfig.text.board.buffDefense, {
          label: tile.label,
          defense: n,
        });
        tooltip = GameConfig.format(
          GameConfig.text.board.buffDefenseTooltip || '+{defense} DEF',
          { defense: n },
        );
        color = '#9b59b6';
        break;
      }
    }
    if (tooltip) {
      this.showFloatingPlayerTooltip(tooltip, color);
    } else if (message) {
      this.showCenterMessage(message, 'buff');
    }
  }

  createCombatStatTooltip(x, y) {
    const w = 96;
    const h = 42;
    const bg = this.add.rectangle(x, y, w, h, 0x1e2d3a, 0.95)
      .setStrokeStyle(1, 0x5d6d7e);
    const text = this.add.text(x, y, '', {
      fontSize: scaleFontSize(this, 13),
      color: '#ecf0f1',
      align: 'center',
      lineSpacing: 2,
    }).setOrigin(0.5);
    return {
      bg,
      text,
      setStats(hp, maxHp, defense) {
        text.setText(`♥ ${hp}/${maxHp}\n◆ ${defense}`);
      },
    };
  }

  getCombatFighterScale(textureKey) {
    const frame = this.textures.getFrame(textureKey);
    const h = frame?.height || COMBAT_FIGHTER_DISPLAY_H;
    return COMBAT_FIGHTER_DISPLAY_H / h;
  }

  layoutCombatKnight(sprite, x, baselineY) {
    const scale = this.getCombatFighterScale('knight_idle_1');
    sprite
      .setPosition(x, baselineY)
      .setOrigin(0.5, 1)
      .setScale(scale);
    return scale;
  }

  layoutCombatMonster(sprite, textureKey, x, baselineY) {
    const scale = this.getCombatFighterScale(textureKey);
    if (sprite.texture?.key !== textureKey) {
      sprite.setTexture(textureKey);
    }
    sprite
      .setPosition(x, baselineY)
      .setOrigin(0.5, 1)
      .setScale(scale);
    return scale;
  }

  syncCombatFighters(monsterMood = 'neutral') {
    if (!this.combatKnight || !this.combatMonster || !this.combatLayout) return;
    const { knightX, monsterX, baselineY } = this.combatLayout;
    const monsterKey = monsterTexture(
      this.currentEnemy?.monster || 'slime',
      monsterMood,
    );
    this.layoutCombatKnight(this.combatKnight, knightX, baselineY);
    applyKnightFacing(this.combatKnight);
    this.layoutCombatMonster(this.combatMonster, monsterKey, monsterX, baselineY);
    this.combatMonster.setFlipX(true);
  }

  buildCombatPanel() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.7);
    const panelW = 520;
    const panelH = 280;
    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x2c3e50);
    const panelTop = cy - panelH / 2;

    const spread = 108;
    const knightX = cx - spread;
    const monsterX = cx + spread;
    const titleY = panelTop + 22;
    const fighterTop = panelTop + 52;
    const baselineY = fighterTop + COMBAT_FIGHTER_DISPLAY_H;
    const tipGap = 14;
    const tipBoxH = 42;
    const tipY = baselineY + tipGap + tipBoxH / 2;

    this.combatLayout = { knightX, monsterX, baselineY, tipY, tipGap };

    const title = this.add.text(cx, titleY, GameConfig.text.board.combatTitle, {
      fontSize: scaleFontSize(this, 20),
      color: '#f0e6d3',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.combatKnight = KnightAnimator.createSprite(this, knightX, baselineY, {
      originX: 0.5,
      originY: 1,
    });
    playKnightAnim(this.combatKnight, 'idle');

    this.combatMonster = this.add.image(monsterX, baselineY, monsterTexture('slime', 'neutral'));

    this.syncCombatFighters('neutral');

    const playerTip = this.createCombatStatTooltip(knightX, tipY);
    const enemyTip = this.createCombatStatTooltip(monsterX, tipY);

    this.combatPanel.add([
      overlay,
      panel,
      title,
      this.combatKnight,
      this.combatMonster,
      playerTip.bg,
      playerTip.text,
      enemyTip.bg,
      enemyTip.text,
    ]);
    this.combatUI = { title, playerTip, enemyTip };
  }

  startCombat(tile, tileIndex) {
    this.combatTileIndex = this.clampTileIndex(tileIndex);
    this.currentEnemy = {
      name: tile.label,
      monster: tile.monster,
      boss: !!tile.boss,
      hp: tile.hp,
      maxHp: tile.hp,
      atk: tile.atk,
      defense: tile.defense ?? 2,
      gold: tile.gold,
    };

    this.isInCombat = true;
    this.setDiceStandEnabled(false);
    this.homeBtn.bg.disableInteractive();

    playKnightAnim(this.combatKnight, 'idle');
    this.syncCombatFighters(tile.boss ? 'angry' : 'neutral');

    this.combatPanel.setVisible(true);
    this.updateCombatUI();
    this.time.delayedCall(500, () => this.runAutoCombatLoop());
  }

  runAutoCombatLoop() {
    if (!this.currentEnemy || GameState.hp <= 0) return;

    this.combatRound(() => {
      if (this.currentEnemy && GameState.hp > 0) {
        this.time.delayedCall(650, () => this.runAutoCombatLoop());
      }
    });
  }

  updateCombatUI() {
    if (!this.currentEnemy || !this.combatUI) return;
    const e = this.currentEnemy;
    const s = GameState;
    this.combatUI.playerTip.setStats(s.hp, s.maxHp, s.defense);
    this.combatUI.enemyTip.setStats(e.hp, e.maxHp, e.defense);
  }

  setMonsterMood(mood) {
    if (!this.currentEnemy) return;
    this.syncCombatFighters(mood);
  }

  showFloatingPlayerTooltip(label, color = '#f1c40f') {
    const textValue = String(label || '').trim();
    if (!textValue) return;

    const sprite = (this.isInCombat && this.combatKnight?.active)
      ? this.combatKnight
      : this.playerToken;
    if (!sprite?.active) return;

    const offsetY = sprite.displayHeight * 0.92 + 14;
    const x = sprite.x;
    const y = sprite.y - offsetY;

    const text = this.add.text(x, y, textValue, {
      fontSize: scaleFontSize(this, 20),
      color,
      fontStyle: 'bold',
      stroke: '#1a1a1a',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(3260).setAlpha(1);

    this.tweens.add({
      targets: text,
      y: y - 48,
      alpha: 0,
      duration: 950,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  showGoldTooltip(amount) {
    const gold = Math.round(Number(amount) || 0);
    if (gold <= 0) return;
    const label = GameConfig.format(GameConfig.text.board.goldTooltip, { gold });
    this.showFloatingPlayerTooltip(label, '#f1c40f');
  }

  showFloatingDamage(sprite, amount, target) {
    if (!sprite?.active) return;

    const offsetY = COMBAT_FIGHTER_DISPLAY_H * 0.72;
    const x = sprite.x;
    const y = sprite.y - offsetY;
    const color = target === 'player' ? '#ff6b6b' : '#f1c40f';

    const text = this.add.text(x, y, `-${amount}`, {
      fontSize: scaleFontSize(this, 30),
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(3200).setAlpha(1);

    this.tweens.add({
      targets: text,
      y: y - 55,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  combatRound(onComplete) {
    if (!this.currentEnemy) {
      onComplete?.();
      return;
    }
    const e = this.currentEnemy;

    playKnightAnim(this.combatKnight, 'attack', {
      onComplete: () => {
        if (this.combatKnight?.active) playKnightAnim(this.combatKnight, 'idle');
      },
    });

    const playerDmg = Math.max(1, GameState.attack - e.defense);
    e.hp -= playerDmg;
    this.showFloatingDamage(this.combatMonster, playerDmg, 'enemy');
    this.setMonsterMood('hurt');
    this.updateCombatUI();
    this.refreshHud();

    if (e.hp <= 0) {
      GameState.gold += e.gold;
      GameState.persist();
      this.showGoldTooltip(e.gold);
      const wasBoss = e.boss;
      let bossDelay = 500;

      if (wasBoss) {
        const chapterIdx = HeroStory.unlockNextChapter();
        if (chapterIdx !== null) {
          const ch = HeroStory.getChapter(chapterIdx);
          this.game.registry.set('pendingStoryChapter', chapterIdx);
          this.showCenterMessage(
            GameConfig.format(GameConfig.text.board.bossVictoryChapter, {
              gold: e.gold,
              chapter: ch.subtitle,
            }),
            'buff',
          );
          bossDelay = 2400;
        } else {
          this.showCenterMessage(
            GameConfig.format(GameConfig.text.board.bossVictoryDone, { gold: e.gold }),
            'buff',
          );
          bossDelay = 1800;
        }
      } else {
        this.showCenterMessage(
          GameConfig.format(GameConfig.text.board.victory, { gold: e.gold }),
          'buff',
        );
      }

      this.markTilePassed(this.combatTileIndex);
      this.time.delayedCall(wasBoss ? bossDelay : 500, () => {
        this.endCombat();
        if (wasBoss) {
          this.returnToLobby();
          return;
        }
        onComplete?.();
      });
      return;
    }

    this.time.delayedCall(550, () => {
      if (!this.currentEnemy) return;

      this.setMonsterMood('angry');
      const enemyDmg = GameState.takeDamage(e.atk);
      this.showFloatingDamage(this.combatKnight, enemyDmg, 'player');
      playKnightAnim(this.combatKnight, 'hurt', {
        onComplete: () => {
          if (this.combatKnight?.active) playKnightAnim(this.combatKnight, 'idle');
        },
      });

      this.updateCombatUI();
      this.refreshHud();

      if (GameState.hp <= 0) {
        this.handlePlayerDeath();
        return;
      }

      onComplete?.();
    });
  }

  endCombat() {
    this.currentEnemy = null;
    this.combatTileIndex = null;
    this.isInCombat = false;
    this.combatPanel.setVisible(false);

    if (this.playerToken?.active && GameState.hp > 0) {
      this.setPlayerStatic();
    }

    if (!this.isMoving && !this.isRolling && GameState.hp > 0) {
      this.refreshDiceState();
      this.homeBtn.bg.setInteractive({ useHandCursor: true });
    }
  }

  handlePlayerDeath() {
    if (this.deathHandled || GameState.hp > 0) return;
    this.deathHandled = true;

    this.isMoving = false;
    this.isRolling = false;
    this.setDiceStandEnabled(false);
    this.homeBtn?.bg?.disableInteractive();

    if (this.isInCombat) {
      this.endCombat();
    }

    if (this.playerToken?.active) {
      playKnightAnim(this.playerToken, 'dead');
    }

    this.showDeathAlert();

    this.time.delayedCall(2200, () => {
      GameState.boardLevel = 1;
      GameState.persist();
      this.scene.start('LoadingScene', {
        next: 'HomeScene',
        label: GameConfig.text.loading.home,
      });
    });
  }

  checkDeath() {
    if (GameState.hp <= 0) {
      this.handlePlayerDeath();
    }
  }

  makeButton(x, y, w, h, label, color, onClick, fontSize = '14px', depth = 0) {
    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, color)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth);
    const text = this.add.text(x + w / 2, y + h / 2, label, {
      fontSize: scaleFontSize(this, fontSize),
      color: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth + 1);
    bg.on('pointerover', () => bg.setAlpha(0.85));
    bg.on('pointerout', () => bg.setAlpha(1));
    bg.on('pointerdown', onClick);
    return { bg, text };
  }

  refreshHud() {
    GameState.syncEnergy();
    const s = GameState;
    BOARD_STATS.forEach((stat) => {
      const row = this.statRows[stat.key];
      if (row) row.valueText.setText(row.format(s));
    });
    if (this.energyValueText) this.energyValueText.setText(GameState.formatEnergyStat());
    this.updateEnergyPanel();
    if (!this.isRolling && !this.isMoving && !this.isInCombat && !this.isTeleporting) {
      this.refreshDiceState();
    }
  }
}
