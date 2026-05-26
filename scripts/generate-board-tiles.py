#!/usr/bin/env python3
"""Изометрические плитки 144×72: ромб вплотную к краям (стыкуется в Phaser)."""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'tiles'
W, H = 144, 72
HW, HH = W // 2, H // 2

TILES = {
    'tile_start': {
        'top': (88, 214, 141),
        'left': (30, 132, 73),
        'right': (46, 160, 88),
        'stroke': (255, 243, 164),
        'symbol': 'star',
    },
    'tile_finish': {
        'top': (52, 152, 219),
        'left': (26, 82, 126),
        'right': (36, 110, 160),
        'stroke': (133, 214, 241),
        'symbol': 'portal',
    },
    'tile_enemy': {
        'top': (192, 57, 43),
        'left': (108, 28, 22),
        'right': (140, 36, 28),
        'stroke': (245, 176, 65),
        'symbol': 'skull',
    },
    'tile_boss': {
        'top': (120, 40, 31),
        'left': (70, 18, 14),
        'right': (92, 24, 18),
        'stroke': (241, 148, 138),
        'symbol': 'boss',
    },
    'tile_buff': {
        'top': (93, 173, 226),
        'left': (52, 106, 170),
        'right': (68, 130, 200),
        'stroke': (174, 235, 255),
        'symbol': 'buff',
    },
    'tile_damage': {
        'top': (155, 89, 182),
        'left': (98, 44, 120),
        'right': (120, 58, 145),
        'stroke': (210, 170, 240),
        'symbol': 'spike',
    },
    'tile_gold': {
        'top': (243, 156, 18),
        'left': (180, 100, 8),
        'right': (210, 120, 12),
        'stroke': (255, 235, 150),
        'symbol': 'coin',
    },
    'tile_defeated': {
        'top': (84, 110, 122),
        'left': (52, 68, 78),
        'right': (64, 82, 94),
        'stroke': (140, 160, 170),
        'symbol': 'none',
    },
}


def diamond_points(cx: int, cy: int, hw: int, hh: int):
    return [
        (cx, cy - hh),
        (cx + hw, cy),
        (cx, cy + hh),
        (cx - hw, cy),
    ]


def draw_symbol(draw: ImageDraw.ImageDraw, cx: int, cy: int, kind: str, color):
    if kind == 'star':
        draw.polygon([
            (cx, cy - 10), (cx + 4, cy - 2), (cx + 11, cy - 2),
            (cx + 6, cy + 3), (cx + 8, cy + 11), (cx, cy + 6),
            (cx - 8, cy + 11), (cx - 6, cy + 3), (cx - 11, cy - 2), (cx - 4, cy - 2),
        ], fill=color)
    elif kind == 'portal':
        draw.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), outline=color, width=2)
        draw.ellipse((cx - 7, cy - 7, cx + 7, cy + 7), fill=color)
    elif kind == 'skull':
        draw.ellipse((cx - 10, cy - 10, cx + 10, cy + 6), fill=color)
        draw.rectangle((cx - 8, cy + 2, cx + 8, cy + 10), fill=color)
        draw.ellipse((cx - 5, cy - 4, cx - 2, cy - 1), fill=(20, 20, 30))
        draw.ellipse((cx + 2, cy - 4, cx + 5, cy - 1), fill=(20, 20, 30))
    elif kind == 'boss':
        draw.polygon([(cx, cy - 12), (cx + 12, cy + 10), (cx - 12, cy + 10)], fill=color)
        draw.ellipse((cx - 4, cy - 2, cx - 1, cy + 1), fill=(30, 0, 0))
        draw.ellipse((cx + 1, cy - 2, cx + 4, cy + 1), fill=(30, 0, 0))
    elif kind == 'buff':
        draw.polygon([
            (cx, cy - 12), (cx + 6, cy - 2), (cx + 12, cy - 2),
            (cx + 7, cy + 4), (cx + 9, cy + 12), (cx, cy + 7),
            (cx - 9, cy + 12), (cx - 7, cy + 4), (cx - 12, cy - 2), (cx - 6, cy - 2),
        ], fill=color)
    elif kind == 'spike':
        for dx in (-8, 0, 8):
            draw.polygon([(cx + dx, cy + 10), (cx + dx + 5, cy - 8), (cx + dx - 5, cy - 8)], fill=color)
    elif kind == 'coin':
        draw.ellipse((cx - 11, cy - 11, cx + 11, cy + 11), fill=color, outline=(120, 80, 0))


def render_tile(name: str, spec: dict) -> None:
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    cx, cy = W // 2, H // 2
    pts = diamond_points(cx, cy, HW, HH)

    draw = ImageDraw.Draw(img)
    left_pts = [pts[0], pts[3], pts[2]]
    right_pts = [pts[0], pts[1], pts[2]]
    draw.polygon(left_pts, fill=spec['left'] + (255,))
    draw.polygon(right_pts, fill=spec['right'] + (255,))
    draw.polygon(pts, fill=spec['top'] + (255,))
    draw.line(pts + [pts[0]], fill=spec['stroke'] + (255,), width=2)

    sym_color = tuple(min(255, c + 40) for c in spec['stroke'][:3])
    if spec['symbol'] != 'none':
        draw_symbol(draw, cx, cy - 2, spec['symbol'], sym_color)

    out_path = OUT / f'{name}.png'
    img.save(out_path, 'PNG', optimize=True)
    print('saved', out_path)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, spec in TILES.items():
        render_tile(name, spec)
    print('done:', OUT)


if __name__ == '__main__':
    main()
