/**
 * Начальный туториал: пошаговые подсказки на базе и на доске.
 */
const TUTORIAL_DEPTH = 9000;

const TutorialManager = {
  isEnabled() {
    return GameConfig.tutorial?.enabled !== false;
  },

  isComplete() {
    return !!GameState.tutorialDone;
  },

  isActiveForScene(sceneKey) {
    if (!this.isEnabled() || this.isComplete()) return false;
    const step = this.getCurrentStep();
    return step?.scene === sceneKey;
  },

  getSteps() {
    return GameConfig.tutorial?.steps || [];
  },

  getCurrentStep() {
    const steps = this.getSteps();
    const idx = Phaser.Math.Clamp(GameState.tutorialStep || 0, 0, Math.max(0, steps.length - 1));
    return steps[idx] || null;
  },

  advance() {
    GameState.tutorialStep = (GameState.tutorialStep || 0) + 1;
    if (GameState.tutorialStep >= this.getSteps().length) {
      this.complete();
    } else {
      GameState.persist();
    }
  },

  complete() {
    GameState.tutorialDone = true;
    GameState.persist();
    if (typeof SaveManager !== 'undefined') {
      SaveManager.saveNow().catch(() => {});
    }
  },

  notifyAction(actionId) {
    if (!this.isEnabled() || this.isComplete()) return;
    const step = this.getCurrentStep();
    if (step?.advanceOn === actionId) {
      this.advance();
    }
  },

  getText(key, fallback = '') {
    return GameConfig.tutorial?.[key] ?? fallback;
  },
};

class TutorialOverlay {
  constructor(scene, targets = {}) {
    this.scene = scene;
    this.targets = targets;
    this.container = null;
    this.blockers = [];
    this.focusGlow = null;
    this.focusFrame = null;
  }

  start() {
    this.showStep();
  }

  showStep() {
    if (TutorialManager.isComplete()) {
      this.destroy();
      return;
    }
    const step = TutorialManager.getCurrentStep();
    if (!step || step.scene !== this.scene.scene.key) {
      this.destroy();
      return;
    }

    this.destroyUi();

    const { width, height } = this.scene.scale;
    const cx = width / 2;
    const panelH = 168;
    const panelY = height - panelH / 2 - 24;
    const panelW = Math.min(560, width - 48);
    const focusBounds = step.highlight ? this.getHighlightBounds(step.highlight) : null;

    this.container = this.scene.add.container(0, 0).setDepth(TUTORIAL_DEPTH);
    this.createBlockers(width, height, focusBounds, step);

    const panel = this.scene.add.rectangle(cx, panelY, panelW, panelH, 0x1e2d3a, 0.98)
      .setStrokeStyle(2, 0x3498db)
      .setDepth(TUTORIAL_DEPTH + 2);

    const stepNum = (GameState.tutorialStep || 0) + 1;
    const total = TutorialManager.getSteps().length;
    const title = this.scene.add.text(cx, panelY - 52, step.title || '', {
      fontSize: scaleFontSize(this.scene, 20),
      color: '#f0e6d3',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(TUTORIAL_DEPTH + 3);

    const counter = this.scene.add.text(cx - panelW / 2 + 16, panelY - panelH / 2 + 12, `${stepNum} / ${total}`, {
      fontSize: scaleFontSize(this.scene, 12),
      color: '#8b9cb3',
    }).setOrigin(0, 0).setDepth(TUTORIAL_DEPTH + 3);

    const body = this.scene.add.text(cx, panelY - 8, step.body || '', {
      fontSize: scaleFontSize(this.scene, 15),
      color: '#d5dbdb',
      align: 'center',
      wordWrap: { width: panelW - 40 },
      lineSpacing: 4,
    }).setOrigin(0.5).setDepth(TUTORIAL_DEPTH + 3);

    this.container.add([panel, title, counter, body]);

    const btnY = panelY + panelH / 2 - 28;
    const skipLabel = TutorialManager.getText('skipButton', 'Пропустить');
    const nextLabel = step.done
      ? TutorialManager.getText('doneButton', 'Понятно')
      : TutorialManager.getText('nextButton', 'Далее');

    const skipBtn = this.makeButton(
      cx - 100,
      btnY,
      140,
      40,
      skipLabel,
      0x566573,
      () => this.onSkip(),
    );

    const nextBtn = this.makeButton(
      cx + 100,
      btnY,
      140,
      40,
      nextLabel,
      0x2980b9,
      () => this.onNext(step),
    );

    this.container.add([skipBtn.bg, skipBtn.text, nextBtn.bg, nextBtn.text]);

    if (step.highlight && this.targets[step.highlight]) {
      this.pulseHighlight(step.highlight);
    }
  }

  getHighlightTarget(key) {
    const target = this.targets[key];
    if (!target) return null;
    const sprite = target.bg || target.mainDie || target;
    return sprite?.active ? sprite : null;
  }

  getHighlightBounds(key) {
    const sprite = this.getHighlightTarget(key);
    if (!sprite) return null;

    const rawBounds = typeof sprite.getBounds === 'function' ? sprite.getBounds() : null;
    const width = rawBounds?.width || sprite.displayWidth || sprite.width || 0;
    const height = rawBounds?.height || sprite.displayHeight || sprite.height || 0;
    const centerX = rawBounds ? rawBounds.x + rawBounds.width / 2 : (sprite.x ?? 0);
    const centerY = rawBounds ? rawBounds.y + rawBounds.height / 2 : (sprite.y ?? 0);
    if (width <= 0 || height <= 0) return null;

    const pad = Math.max(16, Math.round(Math.min(width, height) * 0.18));
    const maxW = this.scene.scale.width;
    const maxH = this.scene.scale.height;
    const left = Phaser.Math.Clamp(centerX - width / 2 - pad, 0, maxW);
    const top = Phaser.Math.Clamp(centerY - height / 2 - pad, 0, maxH);
    const right = Phaser.Math.Clamp(centerX + width / 2 + pad, 0, maxW);
    const bottom = Phaser.Math.Clamp(centerY + height / 2 + pad, 0, maxH);

    return new Phaser.Geom.Rectangle(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
  }

  addBlockerRect(x, y, width, height, onClick = null) {
    if (width <= 0 || height <= 0) return;
    const rect = this.scene.add.rectangle(x + width / 2, y + height / 2, width, height, 0x000000, 0.45)
      .setDepth(TUTORIAL_DEPTH)
      .setInteractive();
    if (onClick) {
      rect.on('pointerdown', onClick);
    }
    this.blockers.push(rect);
  }

  createBlockers(width, height, focusBounds, step) {
    this.blockers = [];
    const onBackdropClick = () => this.onNext(step);
    if (!focusBounds || focusBounds.width <= 0 || focusBounds.height <= 0) {
      this.addBlockerRect(0, 0, width, height, onBackdropClick);
      return;
    }

    const right = focusBounds.x + focusBounds.width;
    const bottom = focusBounds.y + focusBounds.height;
    this.addBlockerRect(0, 0, width, focusBounds.y, onBackdropClick);
    this.addBlockerRect(0, bottom, width, height - bottom, onBackdropClick);
    this.addBlockerRect(0, focusBounds.y, focusBounds.x, focusBounds.height, onBackdropClick);
    this.addBlockerRect(right, focusBounds.y, width - right, focusBounds.height, onBackdropClick);
  }

  pulseHighlight(key) {
    const bounds = this.getHighlightBounds(key);
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;

    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    this.focusGlow = this.scene.add.rectangle(cx, cy, bounds.width + 16, bounds.height + 16, 0xffffff, 0)
      .setStrokeStyle(8, 0xf1c40f, 0.18)
      .setDepth(TUTORIAL_DEPTH + 1);
    this.focusFrame = this.scene.add.rectangle(cx, cy, bounds.width, bounds.height, 0xffffff, 0)
      .setStrokeStyle(3, 0xf1c40f, 0.95)
      .setDepth(TUTORIAL_DEPTH + 1);

    this.scene.tweens.add({
      targets: [this.focusGlow, this.focusFrame],
      scaleX: 1.04,
      scaleY: 1.04,
      alpha: { from: 0.9, to: 1 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  makeButton(x, y, w, h, label, color, onClick) {
    const bg = this.scene.add.rectangle(x, y, w, h, color)
      .setDepth(TUTORIAL_DEPTH + 4)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add.text(x, y, label, {
      fontSize: scaleFontSize(this.scene, 15),
      color: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(TUTORIAL_DEPTH + 5);

    bg.on('pointerdown', onClick);
    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', onClick);
    return { bg, text };
  }

  onNext(step) {
    if (step.done) {
      TutorialManager.complete();
      this.destroy();
      return;
    }
    TutorialManager.advance();
    this.showStep();
  }

  onSkip() {
    TutorialManager.complete();
    this.destroy();
  }

  destroyUi() {
    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }
    this.blockers.forEach((blocker) => blocker.destroy());
    this.blockers = [];
    if (this.focusGlow) {
      this.scene.tweens.killTweensOf(this.focusGlow);
      this.focusGlow.destroy();
      this.focusGlow = null;
    }
    if (this.focusFrame) {
      this.scene.tweens.killTweensOf(this.focusFrame);
      this.focusFrame.destroy();
      this.focusFrame = null;
    }
  }

  destroy() {
    this.destroyUi();
  }

  refresh() {
    if (TutorialManager.isActiveForScene(this.scene.scene.key)) {
      this.showStep();
    } else {
      this.destroy();
    }
  }
}
