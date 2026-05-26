#!/usr/bin/env node
/**
 * Копирует веб-игру в www/ для Capacitor (Android).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WWW = path.join(ROOT, 'www');

const COPY = [
  'index.html',
  'style.css',
  'sdk.js',
  'vendor',
  'js',
  'assets',
  'dice',
  'silver_knight',
  'monsters',
];

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyEntry(name) {
  const src = path.join(ROOT, name);
  const dest = path.join(WWW, name);
  if (!fs.existsSync(src)) {
    console.warn(`[sync-www] Пропуск (нет): ${name}`);
    return;
  }
  fs.cpSync(src, dest, { recursive: true });
}

rmDir(WWW);
fs.mkdirSync(WWW, { recursive: true });

COPY.forEach(copyEntry);

const size = walkSize(WWW);
console.log(`[sync-www] Готово: ${WWW} (${(size / 1024 / 1024).toFixed(2)} MB)`);

function walkSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? walkSize(p) : fs.statSync(p).size;
  }
  return total;
}
