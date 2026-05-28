const HOME_UPGRADES = GameConfig.buildHomeUpgrades();

const HOME_STAT_FORMATS = {
  hp: (s) => `${s.hp} / ${s.maxHp}`,
  attack: (s) => String(s.attack),
  defense: (s) => String(s.defense),
  gold: (s) => String(s.gold),
  energy: (s) => s.formatEnergyStat(),
  laps: (s) => String(s.laps),
  story: () => HeroStory.chapterProgressLabel(),
};

const HOME_STATS = GameConfig.ui.homeStats.map((row) => ({
  ...row,
  format: HOME_STAT_FORMATS[row.key],
})).filter((row) => row.key !== 'energy');

const BATTLE_BUTTON = GameConfig.ui.battleButton;

/** Размер карточки покупки — кнопки «В бой» и «Хроника» такого же размера */
const UPGRADE_CARD_W = 230;
const UPGRADE_CARD_H = 108;

/** Верхняя панель: «В бой» слева, «Хроника» справа в одну линию */
const HOME_TOP_PAD = 24;
const HOME_TOP_BTN_GAP = 12;

class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HomeScene' });
  }

  create() {
    const { width, height } = this.scale;

    if (GameState.hp <= 0) {
      GameState.hp = Math.max(
        1,
        Math.floor(GameState.maxHp * GameConfig.economy.homeReviveHpRatio),
      );
    }

    this.createHomeBackground(width, height);

    const layout = getHomeLayoutZones(width, height);
    const y = (zone) => height * layout[zone];
    const landscape = isLandscapeViewport(width, height);
    const knightX = landscape ? width * 0.4 : width / 2;

    this.createStatsPanel(width, y('stats'));
    this.createEnergyPanel();
    this.createChroniclesButton();
    this.createShopButton();

    HeroStory.syncFromStorage();

    if (!KnightAnimator.texturesReady(this)) {
      console.warn('[HomeScene] Текстуры рыцаря не загружены — запустите игру через HTTP (python3 -m http.server)');
    }
    this.knightSprite = KnightAnimator.createSprite(this, knightX, y('hero'), {
      scale: KNIGHT_SCALE.home,
      originX: 0,
      originY: 0.5,
    });
    KnightAnimator.play(this.knightSprite, 'idle');

    this.upgradeCards = this.createUpgradeCards(width, y('cards'));
    this.createBattleButton();

    this.messageText = this.add.text(width / 2, y('message'), '', {
      fontSize: scaleFontSize(this, 14),
      color: '#7bed9f',
    }).setOrigin(0.5);

    this.centerAlertContainer = null;
    this._battleNavigating = false;
    this.refreshUI();
    this.startEnergyTick();
    this.showPendingStoryChapter();
    if (SaveManager.loadedFromSave && TutorialManager.isComplete()) {
      this.showCenterAlert(GameConfig.text.home.saveLoaded, 'success');
    }

    this.startTutorial();
    YandexSDK.onEnterPlayScene();
  }

  startTutorial() {
    if (!TutorialManager.isActiveForScene('HomeScene')) return;

    this.tutorialOverlay = new TutorialOverlay(this, {
      stats: { bg: this.statsPanelBg },
      upgrades: this.upgradeCards?.[0],
      battle: this.battleButton,
    });
    this.tutorialOverlay.start();
  }

  getTopButtonLayout(index, total) {
    const w = UPGRADE_CARD_W;
    const h = UPGRADE_CARD_H;
    const gap = HOME_TOP_BTN_GAP;
    const totalW = total * w + Math.max(0, total - 1) * gap;
    const left = (this.scale.width - totalW) / 2;
    const x = left + index * (w + gap);
    return {
      w,
      h,
      pad: HOME_TOP_PAD,
      cx: x + w / 2,
      cy: HOME_TOP_PAD + h / 2,
    };
  }

  createChroniclesButton() {
    const total = IAPManager.isEnabled() ? 2 : 1;
    const { w, h, pad, cx, cy } = this.getTopButtonLayout(0, total);
    const depth = 5000;
    const color = 0x2c3e50;
    const colorHover = 0x34495e;

    const bg = this.add.rectangle(cx, cy, w, h, color, 0.35)
      .setStrokeStyle(2, color)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });

    const accent = this.add.rectangle(cx, pad + 3, w, 6, colorHover, 1).setDepth(depth);

    const label = this.add.text(cx, cy, GameConfig.text.home.chroniclesButton, {
      fontSize: scaleFontSize(this, 18),
      color: '#f0e6d3',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth);

    const onOpen = () => {
      if (this._battleNavigating) return;
      HeroStory.openChronicles(this);
    };

    bg.on('pointerdown', onOpen);
    label.on('pointerdown', onOpen);
    const hoverOn = () => {
      bg.setFillStyle(color, 0.5);
      accent.setFillStyle(0x5d6d7e);
      label.setColor('#f1c40f');
    };
    const hoverOff = () => {
      bg.setFillStyle(color, 0.35);
      accent.setFillStyle(colorHover);
      label.setColor('#f0e6d3');
    };
    bg.on('pointerover', hoverOn);
    bg.on('pointerout', hoverOff);
    label.on('pointerover', hoverOn);
    label.on('pointerout', hoverOff);
    label.setInteractive({ useHandCursor: true });

    this.chroniclesBtn = { bg, accent, label };
  }

  createShopButton() {
    if (!IAPManager.isEnabled()) return;

    const { w, h, pad, cx, cy } = this.getTopButtonLayout(1, 2);
    const depth = 5000;
    const color = 0x8e44ad;
    const colorHover = 0x9b59b6;

    const bg = this.add.rectangle(cx, cy, w, h, color, 0.35)
      .setStrokeStyle(2, color)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });

    const accent = this.add.rectangle(cx, pad + 3, w, 6, colorHover, 1).setDepth(depth);

    const titleText = GameConfig.text.home.shopButtonTitle || 'Магазин';
    const label = this.add.text(cx, cy, `🛒 ${titleText}`, {
      fontSize: scaleFontSize(this, 17),
      color: '#f0e6d3',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: w - 16 },
    }).setOrigin(0.5).setDepth(depth);

    const onOpen = () => {
      if (this._battleNavigating) return;
      ShopOverlay.open(this);
    };

    bg.on('pointerdown', onOpen);
    label.on('pointerdown', onOpen);
    const hoverOn = () => {
      bg.setFillStyle(color, 0.55);
      accent.setFillStyle(0xbb8fce);
      label.setColor('#f1c40f');
    };
    const hoverOff = () => {
      bg.setFillStyle(color, 0.35);
      accent.setFillStyle(colorHover);
      label.setColor('#f0e6d3');
    };
    bg.on('pointerover', hoverOn);
    bg.on('pointerout', hoverOff);
    label.on('pointerover', hoverOn);
    label.on('pointerout', hoverOff);
    label.setInteractive({ useHandCursor: true });

    this.shopBtn = { bg, accent, label };
  }

  showPendingStoryChapter() {
    const pending = this.game.registry.get('pendingStoryChapter');
    if (pending === undefined || pending === null) return;

    this.game.registry.remove('pendingStoryChapter');
    this.time.delayedCall(450, () => {
      if (!this.scene.isActive()) return;
      HeroStory.openReader(this, pending, { auto: true });
    });
  }

  createHomeBackground(width, height) {
    if (!this.textures.exists('home_bg')) {
      console.warn('[HomeScene] Текстура home_bg не загружена');
      this.add.rectangle(width / 2, height / 2, width, height, 0x1a2332).setDepth(-100);
      return;
    }

    const bg = this.add.image(width / 2, height / 2, 'home_bg')
      .setDepth(-100)
      .setScrollFactor(0);
    bg.setDisplaySize(width, height);

    this.add.rectangle(width / 2, height / 2, width, height, 0x0d1117, 0.12)
      .setDepth(-99)
      .setScrollFactor(0);
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
        this.refreshUI();
      },
    });
  }

  stopEnergyTick() {
    if (this._energyTimer) {
      this._energyTimer.remove();
      this._energyTimer = null;
    }
  }

  shutdown() {
    this.stopEnergyTick();
    ShopOverlay.close(this);
    this.tutorialOverlay?.destroy();
    this.tutorialOverlay = null;
    this._battleNavigating = false;
    if (this.storyReader?.active) {
      this.storyReader.destroy();
      this.storyReader = null;
    }
    if (this.chroniclesMenu?.active) {
      this.chroniclesMenu.destroy();
      this.chroniclesMenu = null;
    }
    YandexSDK.onLeavePlayScene();
  }

  showCenterAlert(text, kind = 'error') {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    if (this.centerAlertContainer) {
      this.centerAlertContainer.destroy();
      this.centerAlertContainer = null;
    }
    if (this.centerAlertTimer) {
      this.centerAlertTimer.remove();
    }

    const style = kind === 'success'
      ? { bg: 0x1e6f4a, stroke: 0x2ecc71, text: '#7bed9f' }
      : { bg: 0x7b241c, stroke: 0xe74c3c, text: '#ff7675' };

    const container = this.add.container(cx, cy).setDepth(2000).setAlpha(0);
    const panel = this.add.rectangle(0, 0, 400, 88, style.bg, 0.95)
      .setStrokeStyle(2, style.stroke);
    const label = this.add.text(0, 0, text, {
      fontSize: scaleFontSize(this, 22),
      color: style.text,
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

    container.add([panel, label]);
    this.centerAlertContainer = container;

    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });

    this.centerAlertTimer = this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          container.destroy();
          if (this.centerAlertContainer === container) {
            this.centerAlertContainer = null;
          }
        },
      });
    });
  }

  createStatsPanel(width, panelCenterY) {
    const padX = width - 24;
    const panelW = 200;
    const rowH = 28;
    const headerH = 36;
    const panelH = headerH + HOME_STATS.length * rowH + 8;
    const padY = panelCenterY - panelH / 2;

    this.statsPanelBg = this.add.rectangle(padX - panelW / 2, panelCenterY, panelW, panelH, 0x243447, 0.92)
      .setStrokeStyle(2, 0x3d566e);

    this.add.text(padX - panelW + 14, padY + 10, GameConfig.text.home.paramsTitle, {
      fontSize: scaleFontSize(this, 13),
      color: '#8b9cb3',
      fontStyle: 'bold',
    });

    this.statRows = {};
    const startY = padY + headerH;

    HOME_STATS.forEach((stat, i) => {
      const rowY = startY + i * rowH;
      const xIcon = padX - panelW + 18;
      const xLabel = padX - panelW + 44;
      const xValue = padX - 16;

      this.add.text(xIcon, rowY, stat.icon, {
        fontSize: scaleFontSize(this, 18),
        color: stat.color,
      }).setOrigin(0, 0.5);

      this.add.text(xLabel, rowY, stat.label, {
        fontSize: scaleFontSize(this, 14),
        color: '#95a5a6',
      }).setOrigin(0, 0.5);

      const valueText = this.add.text(xValue, rowY, '', {
        fontSize: scaleFontSize(this, 15),
        color: '#ecf0f1',
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);

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
          .setDepth(10);
      }

      this.statRows[stat.key] = {
        valueText,
        format: stat.format,
        timerText,
        timerTooltip,
        timerTooltipBg,
      };

      if (stat.key === 'energy') {
        const hitX = padX - panelW / 2 + 8;
        const hitW = panelW - 16;
        GameState.bindEnergyStatRowToggle(this, this.statRows.energy, hitX, rowY, hitW, rowH);
      }
    });
  }

  createEnergyPanel() {
    const panel = this.statsPanelBg;
    if (!panel) return;

    const panelW = panel.displayWidth;
    const compactH = 56;
    const x = panel.x;
    const y = panel.y + panel.displayHeight / 2 + 12 + compactH / 2;

    this.energyPanelCompactH = compactH;
    this.energyPanelExpandedH = 82;
    this.energyPanelCenterY = y;

    this.energyPanelBg = this.add.rectangle(x, y, panelW, compactH, 0x243447, 0.92)
      .setStrokeStyle(2, 0x3d566e)
      .setDepth(5);

    this.energyLabelText = this.add.text(x - panelW / 2 + 14, y - 11, '⚡ Энергия', {
      fontSize: scaleFontSize(this, 14),
      color: '#95a5a6',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(6).setVisible(false);

    this.energyValueText = this.add.text(x + panelW / 2 - 14, y - 11, '', {
      fontSize: scaleFontSize(this, 15),
      color: '#2ecc71',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(6).setVisible(false);

    this.energyTimerText = this.add.text(x, y + 14, '', {
      fontSize: scaleFontSize(this, 12),
      color: '#7bed9f',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(6).setVisible(false);

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

  createUpgradeCards(width, cardsCenterY) {
    const cardW = UPGRADE_CARD_W;
    const cardH = UPGRADE_CARD_H;
    const gap = 16;
    const totalW = HOME_UPGRADES.length * cardW + (HOME_UPGRADES.length - 1) * gap;
    const startX = (width - totalW) / 2;
    const cardY = cardsCenterY - cardH / 2;

    const cards = [];

    HOME_UPGRADES.forEach((def, i) => {
      const x = startX + i * (cardW + gap);
      const cx = x + cardW / 2;
      const cy = cardsCenterY;

      const bg = this.add.rectangle(cx, cy, cardW, cardH, def.color, 0.25)
        .setStrokeStyle(2, def.color)
        .setInteractive({ useHandCursor: true });

      const accent = this.add.rectangle(cx, cy - cardH / 2 + 3, cardW, 6, def.color, 1);

      this.add.text(x + 18, cardY + 18, def.icon, {
        fontSize: scaleFontSize(this, 22),
        color: '#ecf0f1',
      });

      this.add.text(x + 48, cardY + 18, def.title, {
        fontSize: scaleFontSize(this, 17),
        color: '#f0e6d3',
        fontStyle: 'bold',
      });

      this.add.text(x + 16, cardY + 68, def.bonusLabel, {
        fontSize: scaleFontSize(this, 14),
        color: '#7bed9f',
        fontStyle: 'bold',
      });

      const price = this.add.text(x + 120, cardY + 68, '', {
        fontSize: scaleFontSize(this, 14),
        color: '#f1c40f',
        fontStyle: 'bold',
      });

      const onBuy = () => {
        if (!GameState.canAfford(def.key)) {
          this.showCenterAlert(GameConfig.text.home.notEnoughGold);
          return;
        }
        if (GameState.buyUpgrade(def.key)) {
          this.showCenterAlert(
            GameConfig.format(GameConfig.text.home.upgradeBought, {
              title: def.title,
              bonus: def.bonusLabel,
            }),
            'success',
          );
        }
        this.refreshUI();
      };

      bg.on('pointerdown', onBuy);
      bg.on('pointerover', () => {
        if (!GameState.canAfford(def.key)) return;
        bg.setFillStyle(def.color, 0.45);
        accent.setFillStyle(def.colorHover);
      });
      bg.on('pointerout', () => {
        this.refreshCardStyle(def.key);
      });

      cards.push({ key: def.key, bg, accent, price, def });
    });

    return cards;
  }

  refreshCardStyle(key) {
    const card = this.upgradeCards.find((c) => c.key === key);
    if (!card) return;
    const affordable = GameState.canAfford(key);
    card.bg.setFillStyle(card.def.color, affordable ? 0.25 : 0.12);
    card.bg.setStrokeStyle(2, affordable ? card.def.color : 0x566573);
    card.accent.setFillStyle(affordable ? card.def.color : 0x566573);
    card.price.setColor(affordable ? '#f1c40f' : '#e74c3c');

    if (card.bg.input) {
      card.bg.input.cursor = affordable ? 'pointer' : 'default';
    }
  }

  goToBoard() {
    if (!GameState.canSpendEnergyForBattle()) {
      const cfg = GameState.getEnergyConfig();
      this.showCenterAlert(
        GameConfig.format(GameConfig.text.home.notEnoughEnergyBattle, {
          cost: cfg.battleCost ?? 0,
          seconds: GameState.secondsUntilEnergyForBattle(),
        }),
      );
      this._battleNavigating = false;
      return;
    }
    if (!GameState.spendEnergyForBattle()) {
      this._battleNavigating = false;
      return;
    }

    TutorialManager.notifyAction('battle');
    this.tutorialOverlay?.destroy();
    this.tutorialOverlay = null;

    GameState.healToFull();
    GameState.startBoardRun();
    this.game.registry.set('loadingNext', 'BoardScene');
    this.scene.start('LoadingScene', {
      next: 'BoardScene',
      label: GameConfig.text.loading.board,
    });
  }

  createBattleButton() {
    const w = UPGRADE_CARD_W;
    const h = UPGRADE_CARD_H;
    const panel = this.statsPanelBg;
    const panelCx = panel?.x ?? (HOME_TOP_PAD + w / 2);
    const panelTop = panel ? (panel.y - panel.displayHeight / 2) : HOME_TOP_PAD;
    const gap = 14;
    const cx = panelCx;
    const cy = panelTop - gap - h / 2;
    const depth = 5000;
    const def = BATTLE_BUTTON;

    const bg = this.add.rectangle(cx, cy, w, h, def.color, 0.25)
      .setStrokeStyle(2, def.color)
      .setDepth(depth)
      .setInteractive({ useHandCursor: true });

    const accent = this.add.rectangle(cx, cy - h / 2 + 3, w, 6, def.color, 1).setDepth(depth);

    const battleCost = GameState.getEnergyConfig().battleCost ?? 0;
    const battleLabelTpl = GameConfig.text.home.battleButtonWithEnergy || GameConfig.text.home.battleButton;
    this.add.text(cx, cy, GameConfig.format(battleLabelTpl, { cost: battleCost }), {
      fontSize: scaleFontSize(this, 20),
      color: '#f0e6d3',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(depth);

    const onBattle = () => {
      if (this._battleNavigating) return;
      this._battleNavigating = true;
      this.goToBoard();
    };

    bg.on('pointerdown', onBattle);
    bg.on('pointerover', () => {
      bg.setFillStyle(def.color, 0.45);
      accent.setFillStyle(def.colorHover);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(def.color, 0.25);
      accent.setFillStyle(def.color);
    });

    this.battleButton = { bg, accent };
  }

  makeButton(x, y, w, h, label, color, onClick, fontSize = '15px') {
    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, color, 1)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x + w / 2, y + h / 2, label, {
      fontSize: scaleFontSize(this, fontSize),
      color: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setAlpha(0.85));
    bg.on('pointerout', () => bg.setAlpha(1));
    bg.on('pointerdown', onClick);
    return { bg, text };
  }

  refreshUI() {
    GameState.syncEnergy();
    const s = GameState;

    HOME_STATS.forEach((stat) => {
      const row = this.statRows[stat.key];
      if (row) row.valueText.setText(row.format(s));
    });
    if (this.energyValueText) this.energyValueText.setText(GameState.formatEnergyStat());
    this.updateEnergyPanel();

    this.upgradeCards.forEach((card) => {
      const cost = GameState.upgradeCosts[card.key];
      card.price.setText(GameConfig.format(GameConfig.text.home.goldPrice, { cost }));
      this.refreshCardStyle(card.key);
    });
  }
}
