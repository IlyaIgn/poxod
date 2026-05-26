#!/usr/bin/env python3
"""Восстановление фонов варианта 1 (оружейная + арена)."""
from __future__ import annotations

import os
import shutil
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit('Установите pillow: pip install pillow')

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
ARCHIVE = Path.home() / '.cursor/projects/home-work-cur-tetst/assets'
TARGET_SIZE = (800, 600)
RESAMPLE = getattr(Image, 'Resampling', Image).LANCZOS


def resize_cover(img: Image.Image, width: int, height: int) -> Image.Image:
    sw, sh = img.size
    scale = max(width / sw, height / sh)
    resized = img.resize((int(sw * scale), int(sh * scale)), RESAMPLE)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    for name in ('home_bg.png', 'board_bg.png'):
        src = ARCHIVE / name
        if not src.is_file():
            raise SystemExit(f'Нет архива: {src}')
        img = Image.open(src).convert('RGBA')
        dst = ASSETS / name
        out = resize_cover(img, *TARGET_SIZE)
        source = ROOT / 'assets' / 'source_v1' / name
        source.parent.mkdir(parents=True, exist_ok=True)
        out.save(source, 'PNG', optimize=True)
        out.save(dst, 'PNG', optimize=True)
        print(f'OK: {source} + {dst} ({os.path.getsize(dst)} bytes)')


if __name__ == '__main__':
    main()
