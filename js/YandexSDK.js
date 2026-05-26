/**
 * Обёртка Yandex Games SDK: загрузка, геймплей, пауза при сворачивании.
 * Без SDK (локальный сервер) игра работает в режиме разработки.
 */
const YandexSDK = {
  ysdk: null,
  loadingReported: false,
  gameplayActive: false,

  async init() {
    if (typeof YaGames === 'undefined') {
      console.info('[YandexSDK] SDK не найден — локальный режим');
      this.bindVisibility();
      return null;
    }

    try {
      this.ysdk = await YaGames.init();
      this.bindVisibility();
      return this.ysdk;
    } catch (err) {
      console.error('[YandexSDK] Ошибка инициализации', err);
      this.bindVisibility();
      return null;
    }
  },

  /** Игра загружена и готова к взаимодействию (один раз) */
  gameReady() {
    if (this.loadingReported) return;
    this.loadingReported = true;
    this.ysdk?.features?.LoadingAPI?.ready();
  },

  gameplayStart() {
    if (this.gameplayActive) return;
    this.gameplayActive = true;
    this.ysdk?.features?.GameplayAPI?.start();
  },

  gameplayStop() {
    if (!this.gameplayActive) return;
    this.gameplayActive = false;
    this.ysdk?.features?.GameplayAPI?.stop();
  },

  ensureGameRunning() {
    const game = window.__phaserGame;
    if (game?.loop && !game.loop.isRunning) {
      game.loop.wake();
    }
  },

  bindVisibility() {
    if (this._visibilityBound) return;
    this._visibilityBound = true;

    // Только скрытие вкладки — blur ломал клики по кнопкам в iframe
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.gameplayStop();
        if (typeof SaveManager !== 'undefined') {
          SaveManager.saveNow().catch(() => {});
        }
      } else {
        this.ensureGameRunning();
        const game = window.__phaserGame;
        const scene = game?.scene?.getScenes(true)[0];
        const key = scene?.scene?.key;
        if (key === 'HomeScene' || key === 'BoardScene') {
          this.gameplayStart();
        }
      }
    });
  },

  onEnterPlayScene() {
    this.ensureGameRunning();
    this.gameReady();
    this.gameplayStart();
  },

  onLeavePlayScene() {
    this.gameplayStop();
  },
};
