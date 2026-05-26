function isFileProtocol() {
  return window.location.protocol === 'file:';
}

function showFileProtocolWarning() {
  const root = document.getElementById('game-container');
  if (!root) return;

  root.innerHTML = `
    <div class="file-protocol-warning">
      <h1>Игра не запускается через file://</h1>
      <p>Браузер блокирует загрузку картинок и анимаций (CORS). Нужен локальный HTTP-сервер.</p>
      <p class="file-protocol-warning__cmd">cd ${window.location.pathname.replace(/\/[^/]*$/, '') || '.'}<br>npm start</p>
      <p>Затем откройте в браузере: <strong>http://localhost:8080</strong></p>
      <p class="file-protocol-warning__alt">Или: <code>python3 -m http.server 8080</code> → http://localhost:8080</p>
    </div>
  `;
}

function createPhaserConfig() {
  return {
    type: Phaser.AUTO,
    width: GAME_DESIGN_WIDTH,
    height: GAME_DESIGN_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#0d1117',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      orientation: Phaser.Scale.LANDSCAPE,
    },
    input: {
      activePointers: 2,
    },
    scene: [BootScene, PreloadScene, LoadingScene, HomeScene, BoardScene],
  };
}

async function bootstrap() {
  if (isFileProtocol()) {
    showFileProtocolWarning();
    return;
  }

  await YandexSDK.init();
  if (typeof SaveManager !== 'undefined') {
    await SaveManager.load();
  }
  if (typeof IAPManager !== 'undefined') {
    await IAPManager.init();
  }
  window.__phaserGame = new Phaser.Game(createPhaserConfig());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => bootstrap().catch(console.error));
} else {
  bootstrap().catch(console.error);
}
