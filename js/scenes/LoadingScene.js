/**
 * Экран перехода между сценами.
 */
class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingScene' });
  }

  init(data = {}) {
    this._loadData = data;
  }

  create() {
    YandexSDK.onLeavePlayScene();

    const data = {
      ...(this._loadData || {}),
      ...(this.sys.settings.data || {}),
    };
    this.nextScene = data.next
      || this.game.registry.get('loadingNext')
      || 'HomeScene';
    this.label = data.label || GameConfig.text.loading.default;
    this.game.registry.remove('loadingNext');

    const targetScene = this.nextScene;
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0d1117);

    this.add.text(width / 2, height * 0.38, this.label, {
      fontSize: scaleFontSize(this, 24),
      color: '#f0e6d3',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const barW = 360;
    const barH = 16;
    const barX = width / 2 - barW / 2;
    const barY = height * 0.52;

    this.add.rectangle(width / 2, barY + barH / 2, barW, barH, 0x243447)
      .setStrokeStyle(1, 0x3d566e);

    const progressBar = this.add.rectangle(barX + 2, barY + barH / 2, 0, barH - 4, 0xc0392b)
      .setOrigin(0, 0.5);

    const percentText = this.add.text(width / 2, height * 0.6, '0%', {
      fontSize: scaleFontSize(this, 13),
      color: '#95a5a6',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: { p: 0 },
      p: 1,
      duration: 550,
      ease: 'Power2',
      onUpdate: (tween) => {
        const v = tween.getValue();
        progressBar.width = Math.max(0, (barW - 4) * v);
        percentText.setText(`${Math.round(v * 100)}%`);
      },
      onComplete: () => {
        this.scene.start(targetScene);
      },
    });
  }
}
