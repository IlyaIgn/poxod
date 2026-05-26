#!/usr/bin/env python3
"""
Импорт фонов с OpenGameArt (800×600, cover-crop):
- home_bg — Fantasy Cartoon Game Backgrounds (CraftPix), башня
- board_bg — Bevouliin Nature Game Background, flat-пейзаж
"""
from __future__ import annotations

import zipfile
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen

try:
    from PIL import Image
except ImportError:
    raise SystemExit('Установите pillow: pip install pillow')

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
TARGET_SIZE = (800, 600)

URLS = {
    'craftpix': (
        'https://opengameart.org/sites/default/files/'
        'Fantasy-Cartoon-Game-Backgrounds_0.zip'
    ),
    'nature': (
        'https://opengameart.org/sites/default/files/'
        'nature%20mountain%20game%20background%20for%20gamedevs.zip'
    ),
}

HOME_MEMBER = 'png/1.png'
BOARD_MEMBER = 'PNG/full-bg.png'


def resize_cover(img: Image.Image, width: int, height: int) -> Image.Image:
    src_w, src_h = img.size
    scale = max(width / src_w, height / src_h)
    resized = img.resize(
        (int(src_w * scale), int(src_h * scale)),
        getattr(Image, 'Resampling', Image).LANCZOS,
    )
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def download(url: str) -> bytes:
    print(f'Скачивание {url}…')
    with urlopen(url, timeout=120) as resp:
        return resp.read()


def load_zip_member(payload: bytes, member_suffix: str) -> Image.Image:
    with zipfile.ZipFile(BytesIO(payload)) as zf:
        for name in zf.namelist():
            if name.replace('\\', '/').endswith(member_suffix):
                return Image.open(BytesIO(zf.read(name))).convert('RGBA')
    raise FileNotFoundError(f'В архиве нет {member_suffix}')


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)

    craftpix = download(URLS['craftpix'])
    nature = download(URLS['nature'])

    home = load_zip_member(craftpix, HOME_MEMBER)
    board = load_zip_member(nature, BOARD_MEMBER)

    home_out = ASSETS / 'home_bg.png'
    board_out = ASSETS / 'board_bg.png'
    resize_cover(home, *TARGET_SIZE).save(home_out, optimize=True)
    resize_cover(board, *TARGET_SIZE).save(board_out, optimize=True)
    print(f'OK: {home_out} ← CraftPix {HOME_MEMBER}')
    print(f'OK: {board_out} ← Bevouliin {BOARD_MEMBER}')


if __name__ == '__main__':
    main()
