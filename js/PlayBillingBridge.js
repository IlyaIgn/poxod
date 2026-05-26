/**
 * Мост к Google Play Billing (Capacitor-плагин PlayBilling на Android).
 */
const PlayBillingBridge = {
  _ready: false,
  _catalog: [],

  getPlugin() {
    return window.Capacitor?.Plugins?.PlayBilling || null;
  },

  isAvailable() {
    return window.Capacitor?.getPlatform?.() === 'android' && !!this.getPlugin();
  },

  async init(productIds = []) {
    const plugin = this.getPlugin();
    if (!plugin) {
      this._ready = false;
      this._catalog = [];
      return false;
    }

    try {
      const conn = await plugin.initialize();
      this._ready = !!conn?.ready;
      if (!this._ready) {
        this._catalog = [];
        return false;
      }

      const ids = [...new Set((productIds || []).filter(Boolean))];
      if (!ids.length) {
        this._catalog = [];
        return true;
      }

      const res = await plugin.getProducts({ productIds: ids });
      this._catalog = res?.products || [];
      return true;
    } catch (err) {
      console.warn('[PlayBilling]', err);
      this._ready = false;
      this._catalog = [];
      return false;
    }
  },

  getPrice(productId) {
    const item = this._catalog.find((p) => p.id === productId);
    return item?.price || null;
  },

  async purchase(productId) {
    const plugin = this.getPlugin();
    if (!plugin || !productId) {
      return { ok: false, error: 'billing_unavailable' };
    }

    try {
      const res = await plugin.purchase({ productId });
      if (res?.cancelled) return { ok: false, cancelled: true };
      return { ok: true, productId: res?.productId || productId, orderId: res?.orderId };
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (/cancel/i.test(msg)) return { ok: false, cancelled: true };
      console.warn('[PlayBilling] purchase', err);
      return { ok: false, error: msg || 'purchase_failed' };
    }
  },
};
