#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const kind = process.argv[2] === 'release' ? 'release' : 'debug';
const ROOT = path.resolve(__dirname, '..');
const src = path.join(
  ROOT,
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  kind,
  kind === 'release' ? 'app-release-unsigned.apk' : 'app-debug.apk',
);
const dist = path.join(ROOT, 'dist');
const dest = path.join(dist, `krugovoj-pohod-${kind}.apk`);

if (!fs.existsSync(src)) {
  console.error(`[copy-apk] APK не найден: ${src}`);
  process.exit(1);
}

if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(src, dest);
const mb = (fs.statSync(dest).size / (1024 * 1024)).toFixed(2);
console.log(`[copy-apk] ${dest} (${mb} MB)`);
