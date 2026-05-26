/**
 * Внутриигровые покупки:
 * - Яндекс Игры (Payments API) в браузере на платформе Яндекса
 * - Google Play Billing в Android APK (Capacitor)
 * - dev/local для теста без оплаты
 */
const IAPManager = {
  _payments: null,
  _catalog: null,
  _yandexReady: false,
  _googleReady: false,

  getConfig() {
    return GameConfig.economy?.iap || { enabled: false, products: [] };
  },

  isEnabled() {
    return this.getConfig().enabled !== false;
  },

  /** yandex | google | dev | local | off */
  getActiveProvider() {
    if (!this.isEnabled()) return 'off';
    if (this.isYandexChannel()) return 'yandex';
    if (this.isGoogleChannel()) return 'google';
    if (this.getConfig().devMode) return 'dev';
    return 'local';
  },

  getPaymentChannel() {
    return this.getActiveProvider();
  },

  isYandexChannel() {
    return this._yandexReady && typeof YaGames !== 'undefined';
  },

  isGoogleChannel() {
    return this._googleReady && typeof PlayBillingBridge !== 'undefined' && PlayBillingBridge.isAvailable();
  },

  usesDevPurchases() {
    const channel = this.getActiveProvider();
    return channel === 'dev' || channel === 'local';
  },

  getPaymentProviderShortLabel() {
    const t = GameConfig.text?.home || {};
    switch (this.getActiveProvider()) {
      case 'yandex':
        return t.shopButtonSubtitleYandex || 'Яндекс Игры';
      case 'google':
        return t.shopButtonSubtitleGoogle || 'Google Play';
      case 'dev':
        return t.shopButtonSubtitleDev || 'тест';
      default:
        return t.shopButtonSubtitleLocal || 'без оплаты';
    }
  },

  getPaymentProviderHint() {
    const t = GameConfig.text?.home || {};
    switch (this.getActiveProvider()) {
      case 'yandex':
        return t.shopPaymentHintYandex || '';
      case 'google':
        return t.shopPaymentHintGoogle || '';
      case 'dev':
        return t.shopPaymentHintDev || '';
      default:
        return t.shopPaymentHintLocal || '';
    }
  },

  getBuyButtonLabel(product) {
    const price = this.getPriceLabel(product);
    const tpl = GameConfig.text?.home?.shopBuyFor || '{buy} {price}';
    const buy = GameConfig.text?.home?.shopBuy || 'Купить';
    return GameConfig.format(tpl, { buy, price });
  },

  getProducts() {
    return (this.getConfig().products || []).filter((p) => p && p.id);
  },

  getProduct(id) {
    return this.getProducts().find((p) => p.id === id) || null;
  },

  getGoogleProductId(product) {
    return product?.googlePlayProductId || product?.id || '';
  },

  getYandexProductId(product) {
    return product?.yandexProductId || product?.id || '';
  },

  async init() {
    if (!this.isEnabled()) return;

    this._yandexReady = false;
    this._googleReady = false;
    this._payments = null;
    this._catalog = null;

    if (typeof PlayBillingBridge !== 'undefined' && PlayBillingBridge.isAvailable()) {
      const googleIds = this.getProducts().map((p) => this.getGoogleProductId(p)).filter(Boolean);
      this._googleReady = await PlayBillingBridge.init(googleIds);
    }

    if (typeof YaGames !== 'undefined' && YandexSDK.ysdk?.getPayments) {
      try {
        this._payments = await YandexSDK.ysdk.getPayments({ signed: false });
        this._catalog = await this._payments.getCatalog();
        this._yandexReady = true;
      } catch (err) {
        console.warn('[IAP] Yandex init', err);
        this._payments = null;
        this._catalog = null;
        this._yandexReady = false;
      }
    }

    console.info('[IAP] provider:', this.getActiveProvider(), {
      yandex: this._yandexReady,
      google: this._googleReady,
    });
  },

  getPriceLabel(product) {
    if (!product) return '—';

    const provider = this.getActiveProvider();
    if (provider === 'google') {
      const gId = this.getGoogleProductId(product);
      return PlayBillingBridge.getPrice(gId) || product.priceLabel || '—';
    }

    if (provider === 'yandex') {
      const yId = this.getYandexProductId(product);
      const fromCatalog = this._catalog?.find((item) => item.id === yId);
      if (fromCatalog?.price) return fromCatalog.price;
    }

    return product.priceLabel || '—';
  },

  getProductDescription(product) {
    if (!product) return '';
    if (product.type === 'energy') {
      return product.description
        || GameConfig.format?.(GameConfig.text.home.shopEnergyHint, {
          amount: product.amount ?? 0,
          max: GameState.getMaxEnergy(),
        })
        || `+${product.amount} энергии`;
    }
    if (product.type === 'upgrade' && product.upgradeKey) {
      const u = GameConfig.economy.upgrades[product.upgradeKey];
      return product.description || u?.bonusLabel || u?.desc || '';
    }
    return product.description || '';
  },

  async purchase(productId) {
    const product = this.getProduct(productId);
    if (!product) return { ok: false, error: 'unknown_product' };

    const provider = this.getActiveProvider();
    if (provider === 'dev' || provider === 'local') {
      return this.grantProduct(product);
    }
    if (provider === 'google') {
      return this.purchaseGoogle(product);
    }
    if (provider === 'yandex') {
      return this.purchaseYandex(product);
    }
    return { ok: false, error: 'no_provider' };
  },

  async purchaseGoogle(product) {
    const gId = this.getGoogleProductId(product);
    const result = await PlayBillingBridge.purchase(gId);
    if (!result.ok) return result;
    return this.grantProduct(product);
  },

  async purchaseYandex(product) {
    if (!this._payments) {
      return { ok: false, error: 'yandex_unavailable' };
    }

    try {
      const yId = this.getYandexProductId(product);
      await this._payments.purchase({ id: yId });
      return this.grantProduct(product);
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (err?.code === 'PURCHASE_CANCELED' || /cancel/i.test(msg)) {
        return { ok: false, cancelled: true };
      }
      console.warn('[IAP] Yandex purchase', err);
      return { ok: false, error: msg || 'purchase_failed' };
    }
  },

  grantProduct(product) {
    if (product.type === 'energy') {
      const added = GameState.addPurchasedEnergy(product.amount ?? 0);
      if (added <= 0) return { ok: false, error: 'invalid_amount' };
      return { ok: true, type: 'energy', added, product };
    }

    if (product.type === 'upgrade') {
      const ok = GameState.applyIapUpgrade(product.upgradeKey);
      if (!ok) return { ok: false, error: 'invalid_upgrade' };
      const u = GameConfig.economy.upgrades[product.upgradeKey];
      return {
        ok: true,
        type: 'upgrade',
        upgradeKey: product.upgradeKey,
        bonus: u?.bonusLabel || '',
        product,
      };
    }

    return { ok: false, error: 'invalid_type' };
  },
};
