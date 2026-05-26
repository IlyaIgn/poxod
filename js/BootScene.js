/**
 * Константы ассетов, анимаций и утилиты.
 */
/** Меняйте при обновлении silver_knight/, чтобы сбросить кэш браузера */
const KNIGHT_ASSETS_VERSION = '2';

/** Базовый размер PNG-плиток (совпадает с scripts/generate-board-tiles.py) */
const ISO_TILE_TEX_W = 144;
const ISO_TILE_TEX_H = 72;

const BOARD_TILE_TEXTURES = {
  start: 'tile_start',
  finish: 'tile_finish',
  enemy: 'tile_enemy',
  boss: 'tile_boss',
  buff: 'tile_buff',
  damage: 'tile_damage',
  gold: 'tile_gold',
  defeated: 'tile_defeated',
};

const TILE_ASSETS_VERSION = '2';

/** Меняйте при обновлении monsters/, чтобы сбросить кэш браузера */
const MONSTER_ASSETS_VERSION = '2';

const KNIGHT_ANIM_DEFS = {
  idle: 8,
  walk: 4,
  run: 8,
  jump: 2,
  attack: 8,
  hurt: 8,
  dead: 8,
};

function purgeKnightAssets(scene) {
  KnightAnimator.purgeTextures(scene);
}

function purgeMonsterAssets(scene) {
  Object.keys(scene.textures.list).forEach((key) => {
    if (key.startsWith('monster_')) {
      scene.textures.remove(key);
    }
  });
}

function monsterAssetUrl(file, mood) {
  const fileName = `${file} ${mood}.png`;
  return `monsters/${encodeURI(fileName)}?v=${MONSTER_ASSETS_VERSION}`;
}

function knightAssetUrl(anim, index) {
  return `silver_knight/${anim}_${index}.png?v=${KNIGHT_ASSETS_VERSION}`;
}

const MONSTER_TYPES = [
  { key: 'slime', file: 'Slime Blue' },
  { key: 'bat', file: 'Bat Starter' },
  { key: 'rat', file: 'Rat Starter' },
];

const MONSTER_MOODS = ['Neutral', 'Angry', 'Hurt'];

/** Базовое разрешение игры — альбомная ориентация 16:9 */
const GAME_DESIGN_WIDTH = 1280;
const GAME_DESIGN_HEIGHT = 720;

function isLandscapeViewport(width, height) {
  return width >= height;
}

/** Вертикальные зоны HomeScene (доля высоты) */
function getHomeLayoutZones(width, height) {
  if (isLandscapeViewport(width, height)) {
    return { stats: 0.44, hero: 0.46, cards: 0.74, message: 0.9 };
  }
  return { stats: 0.2, hero: 0.52, cards: 0.8, message: 0.94 };
}

/** Отступы UI на боевой доске под ширину/высоту экрана */
function getBoardLayoutMargins(width, height) {
  const margin = 10;
  const ui = (typeof GameConfig !== 'undefined' && GameConfig.ui) || {};
  const statsPanel = ui.boardStatsPanel || { width: 200, height: 132 };
  const legendInfoSize = ui.legendInfoButtonSize || 44;
  const diceUi = Math.round(
    ((ui.diceBaseSize) || 96) * UI_PRESENTATION_SCALE,
  );
  const homeBtn = ui.boardHomeButton || { width: 172, height: 62 };
  const homeUiW = homeBtn.width + 20;
  const topStatsUi = statsPanel.height + 24;
  const leftStatsUi = Math.max(172, statsPanel.width + 32);
  const rightUi = 20 + Math.max(diceUi, homeUiW) + 16;
  const bottomUi = 24 + Math.max(diceUi + 16, legendInfoSize + 20);

  return {
    margin,
    leftStatsUi,
    rightUi,
    topStatsUi,
    bottomUi,
    legendAnchor: isLandscapeViewport(width, height) ? 'left' : 'bottom',
    statsPanelH: statsPanel.height,
    legendInfoSize,
  };
}

/** Центр доступной области доски (между панелями UI) */
function getBoardPlayAreaCenter(width, height, margins) {
  const innerLeft = margins.margin + margins.leftStatsUi;
  const innerRight = width - margins.margin - margins.rightUi;
  const innerTop = margins.margin + margins.topStatsUi;
  const innerBottom = height - margins.margin - margins.bottomUi;
  return {
    x: (innerLeft + innerRight) / 2,
    y: (innerTop + innerBottom) / 2,
  };
}

function getReadableViewportSize(scene) {
  const scale = scene?.scale;
  return {
    width: scale?.displaySize?.width || scale?.parentSize?.width || window.innerWidth || GAME_DESIGN_WIDTH,
    height: scale?.displaySize?.height || scale?.parentSize?.height || window.innerHeight || GAME_DESIGN_HEIGHT,
  };
}

/**
 * Дополнительный масштаб шрифта для маленьких экранов.
 * На десктопе возвращает 1, на телефонах плавно увеличивает текст.
 */
function getReadableFontScale(scene) {
  const { width, height } = getReadableViewportSize(scene);
  const shortest = Math.max(320, Math.min(width, height));
  const boost = Math.max(0, (GAME_DESIGN_HEIGHT / shortest) - 1);
  return Phaser.Math.Clamp(1 + boost * 0.35, 1, 1.25);
}

function scaleFontSize(scene, value) {
  const base = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (!Number.isFinite(base)) return String(value);
  return `${Math.round(base * getReadableFontScale(scene))}px`;
}

/** Масштаб доски на экране боя (1 = вписать в доступную область без доп. уменьшения) */
const BOARD_PRESENTATION_SCALE = 0.97;

/** Масштаб кнопок и рыцаря */
const UI_PRESENTATION_SCALE = 0.72;

/** Масштаб рыцаря под размер UI */
const KNIGHT_SCALE = {
  home: 0.36,
  board: 0.10,
  combat: 0.28,
};

/** В PNG рыцарь смотрит влево; setFlipX(true) — вправо */
function applyKnightFacing(sprite, faceRight = true) {
  return sprite.setFlipX(faceRight);
}

/** Масштаб монстров */
const MONSTER_SCALE = {
  tile: 0.055,
  combat: 0.11,
};

/** Высота бойца на экране «Сражение» (рыцарь и враг одинаковые) */
const COMBAT_FIGHTER_DISPLAY_H = 140;

function monsterTexture(monsterKey, mood) {
  return `monster_${monsterKey}_${mood}`;
}

function diceFaceKey(value) {
  const v = Phaser.Math.Clamp(Math.round(value), 1, 6);
  return `dice_d6_${v}`;
}

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this.scene.start('PreloadScene');
  }
}
