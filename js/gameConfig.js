/**
 * Настройка экономики и текстов игры.
 * Меняйте значения здесь — сцены подхватят автоматически.
 */
const GameConfig = {
  meta: {
    gameTitle: 'Круговой Поход',
    /** На этом уровне доски финиш — босс */
    bossLevel: 5,
  },

  /** Начальный туториал (только для новой игры) */
  tutorial: {
    enabled: true,
    skipButton: 'Пропустить',
    nextButton: 'Далее',
    doneButton: 'Понятно',
    steps: [
      {
        scene: 'HomeScene',
        title: 'Добро пожаловать!',
        body: 'Это ваша база. Здесь вы прокачиваете рыцаря перед выходом на доску.',
      },
      {
        scene: 'HomeScene',
        title: 'Параметры',
        body: 'Слева — HP, атака, защита и золото. Следите за ними перед каждым забегом.',
        highlight: 'stats',
      },
      {
        scene: 'HomeScene',
        title: 'Улучшения',
        body: 'Потратьте золото на карточки внизу — HP, атаку или защиту.',
        highlight: 'upgrades',
      },
      {
        scene: 'HomeScene',
        title: 'В бой!',
        body: 'Когда готовы — нажмите «В бой».',
        highlight: 'battle',
        advanceOn: 'battle',
      },
      {
        scene: 'BoardScene',
        title: 'Боевая доска',
        body: 'Круговой маршрут: враги, золото, ловушки и бафы. Старт восстанавливает HP.',
      },
      {
        scene: 'BoardScene',
        title: 'Кубик',
        body: 'Нажмите кубик внизу справа — чтобы сделать ход.',
        highlight: 'dice',
        advanceOn: 'dice',
      },
      {
        scene: 'BoardScene',
        title: 'Легенда',
        body: 'Кнопка ℹ внизу слева — расшифровка типов клеток на маршруте.',
        highlight: 'legend',
      },
      {
        scene: 'BoardScene',
        title: 'Цель забега',
        body: 'Проходите круги, сстановитесь сильнее и дойдите до Финала. Каждые 5 уровней вас ждет босс. Удачи! Откройте всю историю...',
        done: true,
      },
    ],
  },

  economy: {
    /** Стартовые параметры новой игры */
    player: {
      hp: 100,
      maxHp: 100,
      attack: 12,
      defense: 4,
      gold: 50,
      boardLevel: 1,
      laps: 0,
      /** Стартовая энергия (не больше economy.energy.max) */
      energy: 100,
    },

    /**
     * Энергия на бросок кубика на доске.
     * regenMsPerPoint: 60000 — 1 энергия за 1 минуту.
     */
    energy: {
      max: 100,
      rollCost: 1,
      regenMsPerPoint: 60_000,
    },

    /**
     * Внутриигровые покупки:
     * - Яндекс Игры: yandexProductId (консоль Яндекса)
     * - Google Play: googlePlayProductId (консоль Play, consumable INAPP)
     * type: upgrade | energy
     */
    iap: {
      enabled: true,
      /** true — тест без оплаты (только если нет Yandex/Google) */
      devMode: true,
      products: [
        {
          id: 'iap_upgrade_hp',
          type: 'upgrade',
          upgradeKey: 'hp',
          title: 'Здоровье+',
          description: '+15 HP (разово)',
          priceLabel: '49 ₽',
          yandexProductId: 'upgrade_hp',
          googlePlayProductId: 'upgrade_hp',
        },
        {
          id: 'iap_upgrade_attack',
          type: 'upgrade',
          upgradeKey: 'attack',
          title: 'Атака+',
          description: '+4 ATK (разово)',
          priceLabel: '49 ₽',
          yandexProductId: 'upgrade_attack',
          googlePlayProductId: 'upgrade_attack',
        },
        {
          id: 'iap_upgrade_defense',
          type: 'upgrade',
          upgradeKey: 'defense',
          title: 'Защита+',
          description: '+2 DEF (разово)',
          priceLabel: '49 ₽',
          yandexProductId: 'upgrade_defense',
          googlePlayProductId: 'upgrade_defense',
        },
        {
          id: 'iap_energy_30',
          type: 'energy',
          amount: 30,
          title: '30 энергии',
          description: 'Сверх лимита, без восстановления',
          priceLabel: '29 ₽',
          yandexProductId: 'energy_30',
          googlePlayProductId: 'energy_30',
        },
        {
          id: 'iap_energy_100',
          type: 'energy',
          amount: 100,
          title: '100 энергии',
          description: 'Сверх лимита, без восстановления',
          priceLabel: '79 ₽',
          yandexProductId: 'energy_100',
          googlePlayProductId: 'energy_100',
        },
      ],
    },

    /** HP при возврате на базу после смерти (доля от maxHp) */
    homeReviveHpRatio: 0.4,

    /** Цены улучшений на базе */
    upgradeCosts: {
      hp: 30,
      attack: 40,
      defense: 35,
    },

    /** Бонусы и рост цены после покупки */
    upgrades: {
      hp: {
        title: 'Здоровье',
        desc: 'Увеличивает макс. HP и восстанавливает его',
        bonusLabel: '+15 HP',
        bonusMaxHp: 15,
        bonusHeal: 15,
        costMultiplier: 1.35,
        color: 0x27ae60,
        colorHover: 0x2ecc71,
      },
      attack: {
        title: 'Атака',
        desc: 'Сильнее бьёте врагов на доске',
        bonusLabel: '+4 ATK',
        bonus: 4,
        costMultiplier: 1.4,
        color: 0xe67e22,
        colorHover: 0xf39c12,
      },
      defense: {
        title: 'Защита',
        desc: 'Меньше урона от врагов и ловушек',
        bonusLabel: '+2 DEF',
        bonus: 2,
        costMultiplier: 1.35,
        color: 0x9b59b6,
        colorHover: 0xa569bd,
      },
    },

    /** Эффекты клеток «баф» на доске */
    buffs: {
      heal: { hp: 25 },
      attack: { attack: 3 },
      defense: { defense: 2 },
    },

    /**
     * Бросок d6 по весам (чем больше weight — чаще выпадает грань).
     * face — значение 1…6.
     */
    dice: {
      faces: [
        { face: 1, weight: 10 },
        { face: 2, weight: 10 },
        { face: 3, weight: 10 },
        { face: 4, weight: 10 },
        { face: 5, weight: 10 },
        { face: 6, weight: 10 },
      ],
    },

    board: {
      start: { label: 'Старт' },
      finish: { label: 'Финал' },
      /** Шаблон подписи следующего уровня: Lvl 2, Lvl 3… */
      nextLevelPrefix: 'Lvl',

      /**
       * Веса типов слотов при заполнении маршрута (ключ = type из tiles).
       * Сначала выбирается тип, затем конкретная клетка из пула этого типа.
       */
      slotWeights: {
        enemy: 35,
        buff: 25,
        damage: 15,
        gold: 25,
      },

      /**
       * Клетки маршрута (кроме старта/финиша).
       * weight — опционально: чаще выпадает вариант внутри своего type.
       */
      tiles: [
        { type: 'enemy', weight: 12, label: 'Слизь', monster: 'slime', hp: 35, atk: 8, defense: 2, gold: 18 },
        { type: 'buff', weight: 10, label: 'Аптека', buff: 'heal' },
        { type: 'damage', weight: 8, label: 'Шипы', damage: 12 },
        { type: 'enemy', weight: 10, label: 'Мышь', monster: 'bat', hp: 50, atk: 12, defense: 2, gold: 25 },
        { type: 'gold', weight: 10, label: 'Сундук', gold: 20 },
        { type: 'buff', weight: 8, label: 'Кузница', buff: 'attack' },
        { type: 'enemy', weight: 8, label: 'Крыса', monster: 'rat', hp: 70, atk: 16, defense: 3, gold: 35 },
        { type: 'damage', weight: 6, label: 'Яма', damage: 18 },
        { type: 'buff', weight: 8, label: 'Живая вода', buff: 'defense' },
        { type: 'gold', weight: 8, label: 'Тайник', gold: 15 },
      ],

      boss: {
        label: 'Босс-слизь',
        monster: 'slime',
        hp: 95,
        atk: 22,
        defense: 4,
        gold: 55,
      },
    },

    /** Множитель статов врагов за каждую завершённую главу: scale ^ storyUnlocked */
    enemyChapterScale: 2,

    /**
     * Множители по раунду забега (boardLevel: 1 … bossLevel).
     * Массив: [уровень 1, уровень 2, …] или объект { 1: 1, 2: 1.1 }.
     * enemy — HP / ATK / DEF врагов и босса; reward — золото с врагов и клеток «gold».
     */
    roundScaling: {
      enemy: [1, 1.1, 1.22, 1.35, 1.5],
      reward: [1, 1.08, 1.17, 1.26, 1.36],
    },
  },

  text: {
    loading: {
      default: 'Загрузка...',
      ready: 'Готово!',
      home: 'Домашняя база',
      board: 'Боевая доска',
    },

    home: {
      paramsTitle: 'Параметры',
      battleButton: 'В бой',
      chroniclesButton: '📜 Хроника',
      saveLoaded: 'Прогресс загружен',
      notEnoughGold: 'Недостаточно золота!',
      notEnoughEnergy: 'Недостаточно энергии!\n+{cost} через {seconds} сек.',
      energyRegenTimer: '⏱ до {max}: {time}',
      upgradeBought: '{title}\n{bonus}',
      goldPrice: '● {cost} зол.',
    },

    board: {
      paramsTitle: 'Параметры',
      homeButton: 'Домой',
      combatTitle: 'Сражение',
      shapeSquare: 'квадратная',
      shapeCircle: 'круглая',
      shapeSharp: 'с острыми углами',
      goalBoss: 'Финал — босс!',
      goalLevel: 'Цель: {level}',
      levelReached: 'Уровень {level}\n{hint}',
      levelBossReached: 'Уровень {bossLevel}\n{hint}',
      levelTeleport: 'Уровень {level}',
      cellsCount: '{shape} · {cells} клеток',
      startHeal: 'Старт\nHP восстановлены',
      trapDamage: '{label}\n-{damage} HP',
      buffHeal: '{label}\n+{hp} HP',
      buffAttack: '{label}\n+{attack} ATK',
      buffDefense: '{label}\n+{defense} DEF',
      goldTooltip: '+{gold}',
      victory: 'Победа!\n+{gold} золота',
      bossVictoryChapter: 'Босс повержен!\n+{gold} золота\n📜 {chapter}',
      bossVictoryDone: 'Босс повержен!\n+{gold} золота\nХроника завершена',
      death: 'Вы погибли!\nВозврат на базу...',
      teleportTitle: 'Телепортация',
      teleportLoading: 'Загрузка...',
      teleportVanish: 'Исчезновение...',
      teleportAppearLevel: 'Появление уровня...',
      teleportAppearHero: 'Появление персонажа...',
      legendTitle: 'Легенда',
      legendInfoButton: 'ℹ',
      notEnoughEnergy: 'Недостаточно энергии!\n+{cost} через {seconds} сек.',
      shopButton: '🛒 Магазин',
      shopButtonTitle: 'Магазин',
      shopButtonSubtitleYandex: 'Яндекс Игры',
      shopButtonSubtitleGoogle: 'Google Play',
      shopButtonSubtitleDev: 'тест · без оплаты',
      shopButtonSubtitleLocal: 'без реальной оплаты',
      shopEnergyRegenHint: 'Энергия сверх {max} не восстанавливается — только тратится. До лимита — по таймеру из экономики.',
      shopTitle: 'Магазин',
      shopPaymentHintYandex: 'Оплата: встроенные покупки Яндекс Игр (Payments API).',
      shopPaymentHintGoogle: 'Оплата: Google Play Billing (встроенная касса Play).',
      shopPaymentHintDev: 'Оплата: тестовый режим (devMode) — товар выдаётся сразу, деньги не списываются.',
      shopPaymentHintLocal: 'Оплата: SDK Яндекса недоступен — покупка применяется локально (сайт/APK).',
      shopClose: 'Закрыть',
      shopBuy: 'Купить',
      shopBuyFor: 'Купить {price}',
      shopPurchasedUpgrade: '{title}\n{bonus}',
      shopPurchasedEnergy: '+{amount} энергии',
      shopPurchaseFailed: 'Покупка не удалась',
      shopPurchaseCancelled: 'Покупка отменена',
    },

    story: {
      empty: 'Хроника пуста.\nПобедите босса на доске!',
      listTitle: 'Хроника Кругового Похода',
      listProgress: 'Открыто глав: {unlocked} из {total}',
    },
  },

  ui: {
    homeStats: [
      { key: 'hp', icon: '♥', label: 'HP', color: '#e74c3c' },
      { key: 'attack', icon: '🗡', label: 'Атака', color: '#e67e22' },
      { key: 'defense', icon: '◆', label: 'Защита', color: '#9b59b6' },
      { key: 'gold', icon: '●', label: 'Золото', color: '#f1c40f' },
      { key: 'energy', icon: '⚡', label: 'Энергия', color: '#2ecc71' },
      { key: 'laps', icon: '↻', label: 'Круги', color: '#3498db' },
      { key: 'story', icon: '📜', label: 'Хроника', color: '#bdc3c7' },
    ],
    boardStats: [
      { key: 'hp', icon: '♥', label: 'HP', color: '#e74c3c' },
      { key: 'attack', icon: '🗡', label: 'ATK', color: '#e67e22' },
      { key: 'defense', icon: '◆', label: 'DEF', color: '#9b59b6' },
      { key: 'gold', icon: '●', label: 'Золото', color: '#f1c40f' },
      { key: 'energy', icon: '⚡', label: 'Энергия', color: '#2ecc71' },
      { key: 'boardLevel', icon: '▲', label: 'Уровень', color: '#3498db' },
    ],
    battleButton: {
      color: 0xc0392b,
      colorHover: 0xe74c3c,
    },
    /** Панель параметров на боевой доске (BoardScene, слева сверху) */
    boardStatsPanel: {
      width: 350,
      height: 228,
      fontTitle: 20,
      fontIcon: 22,
      fontLabel: 20,
      fontValue: 20,
    },
    /** Кнопка «Домой» на боевой доске (правый верхний угол) */
    boardHomeButton: { width: 250, height: 100, fontSize: 30 },
    /** Кнопка «информация» — открывает легенду клеток */
    legendInfoButtonSize: 80,
    legendPanel: { width: 252 },
    /** Размер кубика на доске (px; до UI_PRESENTATION_SCALE ≈0.72) */
    diceBaseSize: 200,
    /** Иконка плитки + «слот — описание» (BoardScene, слева внизу) */
    boardLegend: [
      { texture: 'tile_start', slot: 'Старт', desc: 'полное HP' },
      { texture: 'tile_finish', slot: 'Финал', desc: 'след. уровень' },
      { texture: 'tile_enemy', slot: 'Враг', desc: 'бой, золото' },
      { texture: 'tile_boss', slot: 'Босс', desc: 'на 5-м уровне' },
      { texture: 'tile_buff', slot: 'Баф', desc: 'HP / ATK / DEF' },
      { texture: 'tile_damage', slot: 'Ловушка', desc: 'урон HP' },
      { texture: 'tile_gold', slot: 'Золото', desc: 'монеты' },
      { texture: 'tile_defeated', slot: 'Пройдено', desc: 'уже пройдена' },
    ],
  },
};

/** Подстановка {ключ} в шаблон */
GameConfig.format = function format(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => (
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''
  ));
};

GameConfig.cloneUpgradeCosts = function cloneUpgradeCosts() {
  return { ...GameConfig.economy.upgradeCosts };
};

GameConfig.applyPlayerDefaults = function applyPlayerDefaults(target) {
  const p = GameConfig.economy.player;
  target.hp = p.hp;
  target.maxHp = p.maxHp;
  target.attack = p.attack;
  target.defense = p.defense;
  target.gold = p.gold;
  target.laps = p.laps;
  target.boardLevel = p.boardLevel;
  target.storyUnlocked = 0;
  target.upgradeCosts = GameConfig.cloneUpgradeCosts();
  target.tutorialStep = 0;
  target.tutorialDone = false;
  const energyCfg = GameConfig.economy.energy || {};
  const maxEnergy = Math.max(1, energyCfg.max ?? 100);
  target.energy = Math.min(maxEnergy, p.energy ?? maxEnergy);
  target.energyUpdatedAt = Date.now();
};

GameConfig.formatNextLevel = function formatNextLevel(boardLevel) {
  return `${GameConfig.economy.board.nextLevelPrefix} ${boardLevel + 1}`;
};

GameConfig.getBoardShapeLabel = function getBoardShapeLabel(shape) {
  const t = GameConfig.text.board;
  if (shape === 'circle') return t.shapeCircle;
  if (shape === 'sharp') return t.shapeSharp;
  return t.shapeSquare;
};

GameConfig.buildHomeUpgrades = function buildHomeUpgrades() {
  const map = [
    { key: 'hp', icon: '♥' },
    { key: 'attack', icon: '🗡' },
    { key: 'defense', icon: '◆' },
  ];
  return map.map(({ key, icon }) => {
    const u = GameConfig.economy.upgrades[key];
    return {
      key,
      icon,
      title: u.title,
      desc: u.desc,
      bonusLabel: u.bonusLabel,
      color: u.color,
      colorHover: u.colorHover,
    };
  });
};
