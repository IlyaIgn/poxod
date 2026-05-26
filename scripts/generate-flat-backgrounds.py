#!/usr/bin/env python3
"""
Flat design фоны по мотивам оригинальных сцен:
- home_bg — оружейная с камином, знаменем и окном
- board_bg — изометрическая каменная арена с факелами
"""
from __future__ import annotations

from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    raise SystemExit('Установите pillow: pip install pillow')

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
SIZE = (800, 600)
RESAMPLE = getattr(Image, 'Resampling', Image).LANCZOS


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def draw_home_bg() -> Image.Image:
    w, h = SIZE
    img = Image.new('RGBA', SIZE, hex_rgb('#1a2332'))
    d = ImageDraw.Draw(img)

    # пол
    d.rectangle([0, int(h * 0.58), w, h], fill=hex_rgb('#2c3e50'))
    for row in range(4):
        for col in range(10):
            x0 = col * 82 + (row % 2) * 41 - 20
            y0 = int(h * 0.58) + row * 28
            tone = '#34495e' if (row + col) % 2 else '#3d566e'
            d.rectangle([x0, y0, x0 + 80, y0 + 26], fill=hex_rgb(tone))

    # задняя стена
    d.rectangle([0, 0, w, int(h * 0.62)], fill=hex_rgb('#243447'))
    for i in range(0, w, 96):
        d.rectangle([i, 0, i + 2, int(h * 0.62)], fill=hex_rgb('#2c3e50'))

    # окно слева
    wx0, wy0 = 48, 72
    d.rectangle([wx0, wy0, wx0 + 168, wy0 + 200], fill=hex_rgb('#1a5276'))
    d.rectangle([wx0 + 12, wy0 + 12, wx0 + 156, wy0 + 188], fill=hex_rgb('#5dade2'))
    d.rectangle([wx0 + 78, wy0 + 12, wx0 + 90, wy0 + 188], fill=hex_rgb('#3498db'))
    d.rectangle([wx0 + 12, wy0 + 98, wx0 + 156, wy0 + 110], fill=hex_rgb('#3498db'))
    d.ellipse([wx0 + 30, wy0 + 40, wx0 + 70, wy0 + 58], fill=hex_rgb('#ebf5fb'))
    d.ellipse([wx0 + 100, wy0 + 120, wx0 + 140, wy0 + 138], fill=hex_rgb('#d6eaf8'))
    # башня за окном
    d.rectangle([wx0 + 118, wy0 + 130, wx0 + 138, wy0 + 188], fill=hex_rgb('#2c3e50'))
    d.polygon(
        [(wx0 + 108, wy0 + 130), (wx0 + 148, wy0 + 130), (wx0 + 128, wy0 + 108)],
        fill=hex_rgb('#566573'),
    )

    # камин справа
    fx0 = w - 248
    fy0 = 56
    d.rectangle([fx0, fy0, fx0 + 200, fy0 + 260], fill=hex_rgb('#566573'))
    d.rectangle([fx0 + 36, fy0 + 70, fx0 + 164, fy0 + 230], fill=hex_rgb('#1c2833'))
    d.polygon(
        [
            (fx0 + 48, fy0 + 200),
            (fx0 + 152, fy0 + 200),
            (fx0 + 100, fy0 + 120),
        ],
        fill=hex_rgb('#e67e22'),
    )
    d.polygon(
        [
            (fx0 + 62, fy0 + 200),
            (fx0 + 138, fy0 + 200),
            (fx0 + 100, fy0 + 140),
        ],
        fill=hex_rgb('#f39c12'),
    )
    d.rectangle([fx0 + 88, fy0 + 52, fx0 + 112, fy0 + 72], fill=hex_rgb('#7f8c8d'))

    # знамя и мечи
    bx = fx0 - 36
    d.rectangle([bx, fy0 + 24, bx + 56, fy0 + 150], fill=hex_rgb('#2980b9'))
    d.polygon(
        [(bx + 8, fy0 + 52), (bx + 48, fy0 + 52), (bx + 28, fy0 + 34)],
        fill=hex_rgb('#f1c40f'),
    )
    d.rectangle([bx - 34, fy0 + 30, bx - 26, fy0 + 170], fill=hex_rgb('#95a5a6'))
    d.rectangle([bx + 62, fy0 + 30, bx + 70, fy0 + 170], fill=hex_rgb('#95a5a6'))

    # манекен
    d.rectangle([wx0 + 200, int(h * 0.52), wx0 + 238, int(h * 0.58) + 120], fill=hex_rgb('#6e2c00'))
    d.ellipse([wx0 + 208, int(h * 0.48), wx0 + 230, int(h * 0.54) + 20], fill=hex_rgb('#d68910'))

    # стойка оружия
    rx = w - 120
    d.rectangle([rx, int(h * 0.54), rx + 14, int(h * 0.58) + 110], fill=hex_rgb('#6e2c00'))
    for i, length in enumerate([90, 70, 100]):
        d.rectangle(
            [rx + 18 + i * 22, int(h * 0.56) + 20, rx + 24 + i * 22, int(h * 0.56) + 20 + length],
            fill=hex_rgb('#bdc3c7'),
        )

    # факелы
    for tx in (32, w - 32):
        d.rectangle([tx - 6, 180, tx + 6, 240], fill=hex_rgb('#6e2c00'))
        d.ellipse([tx - 14, 156, tx + 14, 188], fill=hex_rgb('#f39c12'))

    # центр — зона для UI/героя (чуть светлее)
    d.ellipse([w // 2 - 180, int(h * 0.72) - 40, w // 2 + 180, int(h * 0.72) + 80], fill=hex_rgb('#2c3e50'))

    return img


def _iso_point(cx: float, cy: float, col: float, row: float, tw: float, th: float) -> tuple[float, float]:
    x = cx + (col - row) * tw / 2
    y = cy + (col + row) * th / 2
    return x, y


def draw_board_bg() -> Image.Image:
    w, h = SIZE
    img = Image.new('RGBA', SIZE, hex_rgb('#0f1419'))
    d = ImageDraw.Draw(img)

    # туман по краям
    d.rectangle([0, 0, w, 90], fill=hex_rgb('#1b2631'))
    d.rectangle([0, h - 70, w, h], fill=hex_rgb('#1b2631'))
    d.rectangle([0, 0, 70, h], fill=hex_rgb('#17202a'))
    d.rectangle([w - 70, 0, w, h], fill=hex_rgb('#17202a'))

    cx, cy = w / 2, h / 2 + 10
    tw, th = 52, 26
    cols, rows = 9, 9

    # платформа — ромбы плиток
    for row in range(rows):
        for col in range(cols):
            p0 = _iso_point(cx, cy, col, row, tw, th)
            p1 = _iso_point(cx, cy, col + 1, row, tw, th)
            p2 = _iso_point(cx, cy, col + 1, row + 1, tw, th)
            p3 = _iso_point(cx, cy, col, row + 1, tw, th)
            tone = '#3d566e' if (row + col) % 2 else '#34495e'
            d.polygon([p0, p1, p2, p3], fill=hex_rgb(tone), outline=hex_rgb('#2c3e50'))

    # периметр-стены (изометрические блоки)
    wall = hex_rgb('#566573')
    for col in range(cols):
        pts = [
            _iso_point(cx, cy, col, 0, tw, th),
            _iso_point(cx, cy, col + 1, 0, tw, th),
            _iso_point(cx, cy, col + 1, 0, tw, th - 8),
            _iso_point(cx, cy, col, 0, tw, th - 8),
        ]
        d.polygon(pts, fill=wall)
    for row in range(rows):
        pts = [
            _iso_point(cx, cy, cols, row, tw, th),
            _iso_point(cx, cy, cols, row + 1, tw, th),
            _iso_point(cx, cy, cols, row + 1, tw, th - 8),
            _iso_point(cx, cy, cols, row, tw, th - 8),
        ]
        d.polygon(pts, fill=wall)

    # компас в центре
    cc = _iso_point(cx, cy, cols / 2, rows / 2, tw, th)
    d.ellipse([cc[0] - 28, cc[1] - 14, cc[0] + 28, cc[1] + 14], outline=hex_rgb('#5d6d7e'), width=2)
    d.line([(cc[0] - 20, cc[1]), (cc[0] + 20, cc[1])], fill=hex_rgb('#7f8c8d'), width=2)
    d.line([(cc[0], cc[1] - 10), (cc[0], cc[1] + 10)], fill=hex_rgb('#7f8c8d'), width=2)

    # факелы по углам арены
    torch_points = [
        _iso_point(cx, cy, 0.5, 0.5, tw, th),
        _iso_point(cx, cy, cols - 0.5, 0.5, tw, th),
        _iso_point(cx, cy, cols - 0.5, rows - 0.5, tw, th),
        _iso_point(cx, cy, 0.5, rows - 0.5, tw, th),
    ]
    for px, py in torch_points:
        d.rectangle([px - 4, py - 28, px + 4, py - 8], fill=hex_rgb('#6e2c00'))
        d.ellipse([px - 12, py - 42, px + 12, py - 18], fill=hex_rgb('#f39c12'))

    # знамёна
    for px, py, flip in [
        (_iso_point(cx, cy, 2, 0.2, tw, th)[0], _iso_point(cx, cy, 2, 0.2, tw, th)[1], False),
        (_iso_point(cx, cy, cols - 2, rows - 0.2, tw, th)[0],
         _iso_point(cx, cy, cols - 2, rows - 0.2, tw, th)[1], True),
    ]:
        d.rectangle([px, py - 50, px + 4, py - 10], fill=hex_rgb('#6e2c00'))
        flag = [(px + 4, py - 48), (px + 34, py - 38), (px + 4, py - 28)]
        d.polygon(flag, fill=hex_rgb('#c0392b'))

    return img


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    home = draw_home_bg()
    board = draw_board_bg()
    home_path = ASSETS / 'home_bg.png'
    board_path = ASSETS / 'board_bg.png'
    home.save(home_path, 'PNG', optimize=True)
    board.save(board_path, 'PNG', optimize=True)
    print(f'OK: {home_path} ({home.size})')
    print(f'OK: {board_path} ({board.size})')


if __name__ == '__main__':
    main()
