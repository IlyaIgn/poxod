# Публикация на Яндекс Играх

## Что уже сделано в проекте

- Подключение SDK: `<script src="/sdk.js"></script>` в `index.html`
- Обёртка `js/YandexSDK.js`: `LoadingAPI.ready()`, `GameplayAPI.start/stop()`, пауза при сворачивании вкладки
- Phaser локально в `vendor/phaser.min.js` (без CDN)
- Адаптивный масштаб `Phaser.Scale.FIT` на весь iframe
- Управление указателем (кнопки и кубик), без клавиатуры
- Язык интерфейса: русский

## Локальный запуск

### Простой сервер (без SDK)

```bash
npm start
# http://localhost:8080
```

Игра работает, в консоли будет «SDK не найден — локальный режим».

### С эмуляцией Яндекс SDK (рекомендуется)

```bash
npm run dev:yandex
```

Откроется `https://localhost:8080` с моками SDK.

### Через черновик на yandex.ru (prod)

1. Создайте черновик в [консоли разработчика](https://games.yandex.ru/console).
2. Запустите: `npm run dev:yandex:prod -- --app-id=ВАШ_ID_ИГРЫ`
3. Либо откройте черновик с параметром `?game_url=https://localhost:8080`.

## Сборка архива для загрузки

```bash
npm run build:zip
```

Файл: `dist/krugovoj-pohod-yandex.zip`

В консоли: **Добавить игру → Загрузить архив**. Корень архива должен содержать `index.html`.

## Чеклист перед модерацией

| Пункт | Статус |
|--------|--------|
| SDK подключён (`/sdk.js`) | ✅ |
| `LoadingAPI.ready()` после загрузки | ✅ (при входе в HomeScene) |
| `GameplayAPI` start/stop | ✅ |
| Звук отключается при сворачивании | ✅ (пауза Phaser loop) |
| Нет обязательной клавиатуры | ✅ |
| Русский язык | ✅ |
| Иконка 512×512, обложка, скриншоты | ⬜ добавить в консоли |
| Описание и жанр в консоли | ⬜ |
| Лицензия ассетов monsters (CC-BY 3.0, Segel) | ✅ атрибуция в `monsters/CREDITS.txt` |

## Отладка SDK

В URL игры на платформе добавьте `&debug-mode=16`. В панели отладки индикатор загрузчика должен быть **IT**.

## Полезные ссылки

- [Требования к игре](https://yandex.ru/dev/games/doc/dg/concepts/requirements)
- [SDK: загрузка и геймплей](https://yandex.ru/dev/games/doc/dg/sdk/sdk-game-events)
- [Локальный запуск](https://yandex.ru/dev/games/doc/dg/concepts/local-launch)
