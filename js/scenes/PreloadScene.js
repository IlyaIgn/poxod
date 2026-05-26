/**
 * Загрузка ассетов и регистрация анимаций.
 */
class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    const { width, height } = this.scale;

    purgeKnightAssets(this);
    purgeMonsterAssets(this);

    this.add.rectangle(width / 2, height / 2, width, height, 0x0d1117);
    this.add.text(width / 2, height * 0.32, GameConfig.meta.gameTitle, {
      fontSize: scaleFontSize(this, 32),
      color: '#f0e6d3',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.loadText = this.add.text(width / 2, height * 0.48, GameConfig.text.loading.default, {
      fontSize: scaleFontSize(this, 16),
      color: '#8b9cb3',
    }).setOrigin(0.5);

    const barW = 420;
    const barH = 18;
    const barX = width / 2 - barW / 2;
    const barY = height * 0.56;

    this.add.rectangle(width / 2, barY + barH / 2, barW, barH, 0x243447)
      .setStrokeStyle(1, 0x3d566e);
    this.progressBar = this.add.rectangle(barX + 2, barY + barH / 2, 0, barH - 4, 0x2980b9)
      .setOrigin(0, 0.5);

    this.percentText = this.add.text(width / 2, height * 0.64, '0%', {
      fontSize: scaleFontSize(this, 14),
      color: '#bdc3c7',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      const fillW = Math.max(0, (barW - 4) * value);
      this.progressBar.width = fillW;
      this.progressBar.x = barX + 2;
      this.percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('loaderror', (file) => {
      console.error('[PreloadScene] Ошибка загрузки:', file.key, file.src);
    });

    this.load.image('home_bg', 'assets/home_bg.png?v=8');
    this.load.image('board_bg', 'assets/board_bg.png?v=8');

    Object.values(BOARD_TILE_TEXTURES).forEach((key) => {
      this.load.image(key, `assets/tiles/${key}.png?v=${TILE_ASSETS_VERSION}`);
    });

    KnightAnimator.loadAssets(this);

    MONSTER_TYPES.forEach(({ key, file }) => {
      MONSTER_MOODS.forEach((mood) => {
        const moodKey = mood.toLowerCase();
        this.load.image(
          `monster_${key}_${moodKey}`,
          monsterAssetUrl(file, mood),
        );
      });
    });

    for (let i = 1; i <= 6; i++) {
      this.load.image(`dice_d6_${i}`, `dice/skoll/inverted-dice-${i}.png`);
    }
  }

  create() {
    this.loadText.setText(GameConfig.text.loading.ready);
    this.percentText.setText('100%');

    this.time.delayedCall(350, () => {
      this.scene.start('LoadingScene', {
        next: 'HomeScene',
        label: GameConfig.text.loading.home,
      });
    });
  }
}

