#!/usr/bin/env node
/**
 * Сборка ZIP-архива для загрузки в консоль Яндекс Игр.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(DIST, 'krugovoj-pohod-yandex.zip');

const EXCLUDE = [
  'node_modules/*',
  'dist/*',
  '.git/*',
  '.cursor/*',
  '*.zip',
  'scripts/build-release.js',
  'package-lock.json',
];

if (!fs.existsSync(DIST)) {
  fs.mkdirSync(DIST, { recursive: true });
}

if (fs.existsSync(OUT)) {
  fs.unlinkSync(OUT);
}

const excludeArgs = EXCLUDE.map((e) => `-x "${e}"`).join(' ');
execSync(`zip -r "${OUT}" . ${excludeArgs}`, { cwd: ROOT, stdio: 'inherit' });

const sizeMb = (fs.statSync(OUT).size / (1024 * 1024)).toFixed(2);
console.log(`\nГотово: ${OUT} (${sizeMb} MB)`);
console.log('Загрузите архив в https://games.yandex.ru/console');
