/**
 * Окно магазина (ИАП): улучшения и энергия.
 */
const SHOP_DEPTH = 4800;

const ShopOverlay = {
  open(scene) {
    if (!IAPManager.isEnabled()) return;
    if (scene.shopOverlay?.active) return;

    const { width, height } = scene.scale;
    const cx = width / 2;
    const cy = height / 2;
    const products = IAPManager.getProducts();
    const cols = products.length > 3 ? 2 : 1;
    const cardW = cols === 2 ? 280 : 320;
    const cardH = 88;
    const gap = 12;
    const rows = Math.ceil(products.length / cols);
    const gridH = rows * cardH + Math.max(0, rows - 1) * gap;
    const panelW = Math.min(width - 48, cols * cardW + (cols - 1) * gap + 48);
    const panelH = Math.min(height - 48, gridH + 148);
    const panelTop = cy - panelH / 2;

    const overlay = scene.add.rectangle(cx, cy, width, height, 0x000000, 0.78)
      .setInteractive()
      .setDepth(SHOP_DEPTH);

    const panel = scene.add.rectangle(cx, cy, panelW, panelH, 0x1a2332, 0.98)
      .setStrokeStyle(2, 0x9b59b6)
      .setDepth(SHOP_DEPTH + 1);

    const title = scene.add.text(cx, panelTop + 28, GameConfig.text.home.shopTitle, {
      fontSize: scaleFontSize(scene, 22),
      color: '#f0e6d3',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(SHOP_DEPTH + 2);

    const paymentHint = scene.add.text(cx, panelTop + 50, IAPManager.getPaymentProviderHint(), {
      fontSize: scaleFontSize(scene, 11),
      color: '#aed6f1',
      align: 'center',
      wordWrap: { width: panelW - 40 },
    }).setOrigin(0.5).setDepth(SHOP_DEPTH + 2);

    const regenHint = GameConfig.format(GameConfig.text.home.shopEnergyRegenHint, {
      max: GameState.getMaxEnergy(),
    });
    const hint = scene.add.text(cx, panelTop + 68, regenHint, {
      fontSize: scaleFontSize(scene, 10),
      color: '#8b9cb3',
      align: 'center',
      wordWrap: { width: panelW - 40 },
    }).setOrigin(0.5).setDepth(SHOP_DEPTH + 2);

    const items = [];
    const gridLeft = cx - (cols * cardW + (cols - 1) * gap) / 2;
    const gridTop = panelTop + 88;

    products.forEach((product, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = gridLeft + col * (cardW + gap) + cardW / 2;
      const y = gridTop + row * (cardH + gap) + cardH / 2;

      const color = product.type === 'energy' ? 0x27ae60 : 0x2980b9;
      const cardBg = scene.add.rectangle(x, y, cardW, cardH, color, 0.22)
        .setStrokeStyle(2, color)
        .setDepth(SHOP_DEPTH + 2)
        .setInteractive({ useHandCursor: true });

      const name = scene.add.text(x - cardW / 2 + 14, y - 28, product.title || product.id, {
        fontSize: scaleFontSize(scene, 16),
        color: '#f0e6d3',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(SHOP_DEPTH + 3);

      const desc = scene.add.text(x - cardW / 2 + 14, y - 4, IAPManager.getProductDescription(product), {
        fontSize: scaleFontSize(scene, 12),
        color: '#bdc3c7',
        wordWrap: { width: cardW - 110 },
      }).setOrigin(0, 0).setDepth(SHOP_DEPTH + 3);

      const buyLabel = scene.add.text(
        x + cardW / 2 - 14,
        y + 26,
        IAPManager.getBuyButtonLabel(product),
        {
          fontSize: scaleFontSize(scene, 13),
          color: '#7bed9f',
          fontStyle: 'bold',
          align: 'right',
          wordWrap: { width: cardW - 28 },
        },
      ).setOrigin(1, 0.5).setDepth(SHOP_DEPTH + 3);

      const onBuy = async () => {
        if (scene._shopPurchasing) return;
        scene._shopPurchasing = true;
        cardBg.disableInteractive();

        const result = await IAPManager.purchase(product.id);
        scene._shopPurchasing = false;

        if (result.ok) {
          close();
          if (result.type === 'energy') {
            scene.showCenterAlert?.(
              GameConfig.format(GameConfig.text.home.shopPurchasedEnergy, {
                amount: result.added,
              }),
              'success',
            );
          } else if (result.type === 'upgrade') {
            scene.showCenterAlert?.(
              GameConfig.format(GameConfig.text.home.shopPurchasedUpgrade, {
                title: product.title || '',
                bonus: result.bonus || '',
              }),
              'success',
            );
          }
          scene.refreshUI?.();
          return;
        }

        cardBg.setInteractive({ useHandCursor: true });
        if (result.cancelled) {
          scene.showCenterAlert?.(GameConfig.text.home.shopPurchaseCancelled, 'error');
        } else {
          scene.showCenterAlert?.(GameConfig.text.home.shopPurchaseFailed, 'error');
        }
      };

      cardBg.on('pointerdown', onBuy);
      cardBg.on('pointerover', () => cardBg.setFillStyle(color, 0.38));
      cardBg.on('pointerout', () => cardBg.setFillStyle(color, 0.22));

      items.push(cardBg, name, desc, buyLabel);
    });

    const closeBtnY = panelTop + panelH - 32;
    const closeBtn = scene.add.text(cx, closeBtnY, GameConfig.text.home.shopClose, {
      fontSize: scaleFontSize(scene, 15),
      color: '#ecf0f1',
      backgroundColor: '#566573',
      padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setDepth(SHOP_DEPTH + 3).setInteractive({ useHandCursor: true });

    const close = () => {
      if (!scene.shopOverlay?.active) return;
      scene.shopOverlay.destroy();
      scene.shopOverlay = null;
      scene._shopPurchasing = false;
    };

    closeBtn.on('pointerdown', close);
    overlay.on('pointerdown', close);

    scene.shopOverlay = scene.add.container(0, 0, [
      overlay, panel, title, paymentHint, hint, closeBtn, ...items,
    ]).setDepth(SHOP_DEPTH);
  },

  close(scene) {
    if (scene.shopOverlay?.active) {
      scene.shopOverlay.destroy();
      scene.shopOverlay = null;
    }
    scene._shopPurchasing = false;
  },
};
