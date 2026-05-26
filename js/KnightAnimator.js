/**
 * Анимация рыцаря: смена PNG-текстур по таймеру (без Phaser.Anims).
 * Каждый кадр — отдельная текстура knight_{anim}_{n}.
 */
const KNIGHT_FRAME_MS = {
  idle: 125,
  walk: 125,
  run: 80,
  jump: 160,
  attack: 70,
  hurt: 85,
  dead: 100,
};

const KNIGHT_LOOP_ANIMS = new Set(['idle', 'walk', 'run']);

const KnightAnimator = {
  defaultTexture: 'knight_idle_1',

  texturesReady(scene) {
    return !!scene?.textures?.exists(this.defaultTexture);
  },

  purgeTextures(scene) {
    if (!scene?.textures) return;
    Object.keys(scene.textures.list).forEach((key) => {
      if (key.startsWith('knight_')) {
        scene.textures.remove(key);
      }
    });
  },

  loadAssets(scene) {
    Object.entries(KNIGHT_ANIM_DEFS).forEach(([anim, count]) => {
      for (let i = 1; i <= count; i += 1) {
        scene.load.image(`knight_${anim}_${i}`, knightAssetUrl(anim, i));
      }
    });
  },

  getFrameKeys(scene, animId) {
    const count = KNIGHT_ANIM_DEFS[animId];
    if (!count) return [];
    const keys = [];
    for (let i = 1; i <= count; i += 1) {
      const key = `knight_${animId}_${i}`;
      if (scene.textures.exists(key)) keys.push(key);
    }
    return keys;
  },

  stop(sprite) {
    if (!sprite) return;
    if (sprite._knightAnimEvent) {
      sprite._knightAnimEvent.destroy();
      sprite._knightAnimEvent = null;
    }
    const scene = sprite.scene;
    if (scene?.textures?.exists(this.defaultTexture)) {
      sprite.setTexture(this.defaultTexture);
    }
  },

  /**
   * @param {Phaser.GameObjects.Sprite} sprite
   * @param {string} animKey — 'knight_idle' или 'idle'
   * @param {{ loop?: boolean, onComplete?: () => void }} [options]
   */
  play(sprite, animKey, options = {}) {
    if (!sprite?.active) return;

    const scene = sprite.scene;
    const animId = String(animKey).replace(/^knight_/, '');
    const keys = this.getFrameKeys(scene, animId);
    if (!keys.length) return;

    const loop = options.loop ?? KNIGHT_LOOP_ANIMS.has(animId);
    const frameMs = KNIGHT_FRAME_MS[animId] || 100;

    this.stop(sprite);
    sprite.setTexture(keys[0]);

    if (keys.length === 1) {
      if (!loop) options.onComplete?.();
      return;
    }

    if (loop) {
      let index = 0;
      sprite._knightAnimEvent = scene.time.addEvent({
        delay: frameMs,
        loop: true,
        callback: () => {
          if (!sprite.active) return;
          index = (index + 1) % keys.length;
          sprite.setTexture(keys[index]);
        },
      });
      return;
    }

    let index = 0;
    const step = () => {
      if (!sprite.active) return;
      index += 1;
      if (index < keys.length) {
        sprite.setTexture(keys[index]);
        sprite._knightAnimEvent = scene.time.delayedCall(frameMs, step);
      } else {
        sprite._knightAnimEvent = null;
        options.onComplete?.();
      }
    };
    sprite._knightAnimEvent = scene.time.delayedCall(frameMs, step);
  },

  createSprite(scene, x, y, config = {}) {
    const {
      scale = 1,
      originX = 0.5,
      originY = 1,
      faceRight = true,
    } = config;
    const key = this.texturesReady(scene) ? this.defaultTexture : '__MISSING';
    const sprite = scene.add.sprite(x, y, key);
    sprite.setScale(scale);
    sprite.setOrigin(originX, originY);
    applyKnightFacing(sprite, faceRight);
    return sprite;
  },
};

function playKnightAnim(sprite, animKey, options) {
  KnightAnimator.play(sprite, animKey, options);
}

function stopKnightAnim(sprite) {
  KnightAnimator.stop(sprite);
}
