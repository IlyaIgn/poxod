# Круговой Поход (Phaser 3)

Браузерная игра: домашняя база для прокачки и изометрическая боевая доска с кубиком. Подготовлена для публикации на **Яндекс Играх**.

## Сцены

- **PreloadScene** — первая загрузка спрайтов (прогресс-бар)
- **LoadingScene** — переход между домом и доской
- **HomeScene** / **BoardScene** — игровые сцены

## Запуск

```bash
npm start
# http://localhost:8080
```

С SDK Яндекса (моки):

```bash
npm run dev:yandex
```

## Сборка для Яндекс Игр

```bash
npm run build:zip
```

Архив: `dist/krugovoj-pohod-yandex.zip` — загрузите в [консоль разработчика](https://games.yandex.ru/console).

Подробная инструкция: [docs/YANDEX_GAMES.md](docs/YANDEX_GAMES.md)

## Сборка под Android

```bash
npm install
npm run android:build
```

APK: `dist/krugovoj-pohod-debug.apk`. Подробнее: [docs/ANDROID.md](docs/ANDROID.md)

## Структура

```
index.html          — точка входа, /sdk.js
vendor/phaser.min.js
js/YandexSDK.js     — интеграция Yandex Games SDK
js/main.js          — Phaser + масштабирование
assets/home_bg.png — фон дома; assets/board_bg.png — фон доски (вариант 1)
assets/tiles/       — изометрические плитки секторов доски
silver_knight/      — спрайты героя
monsters/           — враги
dice/               — кубики
```

## Спрайты

- **assets/** — фоны вариант 1, стилизованы под chibi/UI (`scripts/stylize-backgrounds.py`)  
  Сырьё: `assets/source_v1/` · восстановление: `scripts/restore-backgrounds-v1.py`
- **silver_knight/** — анимации героя (idle, walk, run, attack, hurt, dead, jump)  
  Источник: [2D Knight Chibi](https://opengameart.org/content/2d-knight-chibi) — Segel T (OpenGameArt)
- **monsters/** — крыса (goblin chibi), летучая мышь, слизь (Neutral / Angry / Hurt)  
  Стиль Segel T, как у **2D Knight Chibi** — см. `monsters/CREDITS.txt` (CC-BY 3.0)  
  Импорт: `python3 scripts/import-monster-sprites.py` (нужны архивы в `/tmp/monster_import`)

## Настройка баланса и текстов

Все числа и подписи для балансировки — в **`js/gameConfig.js`**:

- `economy` — HP, атака, золото, цены улучшений, враги, босс, бафы на доске
- `text` — кнопки, сообщения, подсказки
- `meta.bossLevel` — уровень, на котором финиш = босс

В шаблонах текстов плейсхолдеры: `{gold}`, `{label}`, `{level}` и т.д.

## Сохранение прогресса

Параметры героя, золото, уровень доски, круги и хроника сохраняются автоматически (`js/SaveManager.js`):

- **localStorage** — локальный запуск
- **Yandex Games Player** — в облаке на платформе Яндекса

Загрузка при старте игры, сохранение при покупках, боях, смене уровня и сворачивании вкладки.

## Хроника героя

После каждой **победы над боссом** (финиш на 5-м уровне доски) открывается новая глава сюжета о серебряном рыцаре Эйрене и «Круге Забытых Ходов». Всего **12 глав**; прогресс сохраняется в `localStorage`.

На базе: кнопка **«📜 Хроника»** — перечень открытых глав. Текст: `js/HeroStory.js`.

## Геймплей

**Дом (HomeScene)**  
Прокачка за золото, кнопка «В бой».

**Доска (BoardScene)**  
Кубик, замкнутый маршрут, враги и комнаты, босс после 5 комнат, автобой.
