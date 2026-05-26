# Сборка под Android

Игра упакована через [Capacitor](https://capacitorjs.com/) в нативное Android-приложение (WebView + ваши HTML/JS/ассеты).

## Требования

- **Node.js** 18+
- **Java 21** (`openjdk-21-jdk`)
- **Android SDK** (Command-line tools или Android Studio)

Переменные окружения:

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH
```

Файл `android/local.properties` (не в git) должен содержать:

```
sdk.dir=/home/ВАШ_ПОЛЬЗОВАТЕЛЬ/Android/Sdk
```

## Команды

```bash
npm install

# Скопировать веб-игру в www/ и синхронизировать с Android
npm run sync:www
npm run android:sync

# Debug APK → dist/krugovoj-pohod-debug.apk
npm run android:build

# Release (без подписи) → dist/krugovoj-pohod-release.apk
npm run android:release

# Открыть проект в Android Studio
npm run android:open
```

## Установка на телефон

```bash
adb install -r dist/krugovoj-pohod-debug.apk
```

## Ориентация

Приложение работает только в **горизонтальной** ориентации (`sensorLandscape` в `AndroidManifest.xml`). Разрешение игры: 1280×720.

## Примечания

- На Android **Yandex Games SDK** не используется: подключается локальная заглушка `sdk.js`, сохранение — через `localStorage` (`SaveManager`).
- После изменения игры всегда запускайте `npm run android:build` (он сам вызывает `sync:www` и `cap sync`).
- Для публикации в Google Play нужна подпись release-ключом (настройка в Android Studio → Generate Signed Bundle / APK).
