#!/usr/bin/env python3
"""
Подгонка фонов варианта 1 под стиль Segel chibi и UI игры:
ярче, насыщеннее, ограниченная палитра, холодный/тёплый тинт как у плиток.
"""
from __future__ import annotations

import math
import shutil
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter
except ImportError:
    raise SystemExit('Установите pillow: pip install pillow')

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
SOURCE = ASSETS / 'source_v1'
ARCHIVE = Path.home() / '.cursor/projects/home-work-cur-tetst/assets'

PROFILES = {
    'home_bg.png': {
        'saturation': 1.48,
        'brightness': 1.18,
        'contrast': 0.82,
        'colors': 22,
        'blur': 1.1,
        'pixel_pass': (200, 150),
        'tint': (52, 73, 94),
        'tint_mix': 0.3,
        'warm': (241, 196, 15),
        'warm_mix': 0.1,
        'accent': (93, 173, 226),
        'accent_mix': 0.06,
        'center_lift': 0.18,
    },
    'board_bg.png': {
        'saturation': 1.42,
        'brightness': 1.1,
        'contrast': 0.8,
        'colors': 24,
        'blur': 1.2,
        'pixel_pass': (220, 165),
        'tint': (26, 35, 50),
        'tint_mix': 0.34,
        'warm': (230, 126, 34),
        'warm_mix': 0.08,
        'accent': (52, 152, 219),
        'accent_mix': 0.1,
        'center_lift': 0.14,
    },
}


def ensure_sources() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)
    for name in PROFILES:
        dst = SOURCE / name
        if dst.is_file():
            continue
        src = ASSETS / name
        if src.is_file() and src.stat().st_size > 200_000:
            shutil.copy2(src, dst)
            print(f'Источник (из assets): {dst}')
            continue
        arch = ARCHIVE / name
        if arch.is_file():
            img = Image.open(arch).convert('RGBA')
            sw, sh = img.size
            scale = max(800 / sw, 600 / sh)
            resized = img.resize(
                (int(sw * scale), int(sh * scale)),
                getattr(Image, 'Resampling', Image).LANCZOS,
            )
            left = (resized.width - 800) // 2
            top = (resized.height - 600) // 2
            resized.crop((left, top, left + 800, top + 600)).save(dst, 'PNG')
            print(f'Источник (архив): {dst}')
            continue
        raise SystemExit(f'Нет исходника для {name}')


def solid_layer(size: tuple[int, int], rgb: tuple[int, int, int]) -> Image.Image:
    return Image.new('RGB', size, rgb)


def radial_center_mask(size: tuple[int, int], power: float = 1.6) -> Image.Image:
    w, h = size
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    cx, cy = w / 2, h / 2
    max_r = math.hypot(cx, cy)
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            d = math.hypot(x - cx, y - cy) / max_r
            v = int(255 * max(0, 1 - d) ** power)
            draw.rectangle([x, y, x + 3, y + 3], fill=v)
    return mask.filter(ImageFilter.GaussianBlur(radius=18))


def apply_tint(img: Image.Image, rgb: tuple[int, int, int], mix: float) -> Image.Image:
    tint = solid_layer(img.size, rgb)
    mult = ImageChops.multiply(img, tint)
    return Image.blend(img, mult, mix)


def center_lift(img: Image.Image, amount: float) -> Image.Image:
    mask = radial_center_mask(img.size)
    glow = Image.new('RGB', img.size, (240, 230, 210))
    lit = ImageChops.screen(img, glow)
    return Image.composite(lit, img, mask.point(lambda p: int(p * amount)))


def cartoon_pass(img: Image.Image, small: tuple[int, int]) -> Image.Image:
    """Упрощение текстур — ближе к chibi-спрайтам."""
    w, h = img.size
    tiny = img.resize(small, getattr(Image, 'Resampling', Image).LANCZOS)
    return tiny.resize((w, h), getattr(Image, 'Resampling', Image).NEAREST)


def stylize(img: Image.Image, profile: dict) -> Image.Image:
    rgb = img.convert('RGB')

    if profile.get('pixel_pass'):
        rgb = cartoon_pass(rgb, profile['pixel_pass'])

    rgb = ImageEnhance.Color(rgb).enhance(profile['saturation'])
    rgb = ImageEnhance.Brightness(rgb).enhance(profile['brightness'])
    rgb = ImageEnhance.Contrast(rgb).enhance(profile['contrast'])

    if profile.get('blur', 0) > 0:
        rgb = rgb.filter(ImageFilter.GaussianBlur(radius=profile['blur']))

    rgb = rgb.quantize(
        colors=profile['colors'],
        method=Image.MEDIANCUT,
    ).convert('RGB')

    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=0.9, percent=95, threshold=5))

    rgb = apply_tint(rgb, profile['tint'], profile['tint_mix'])
    if profile.get('warm_mix', 0) > 0:
        warm = apply_tint(rgb, profile['warm'], profile['warm_mix'])
        rgb = Image.blend(rgb, warm, 0.5)
    if profile.get('accent_mix', 0) > 0:
        accent = apply_tint(rgb, profile['accent'], profile['accent_mix'])
        rgb = Image.blend(rgb, accent, 0.45)

    rgb = center_lift(rgb, profile.get('center_lift', 0.1))

    return rgb.convert('RGBA')


def main() -> None:
    ensure_sources()
    for name, profile in PROFILES.items():
        src = SOURCE / name
        out = ASSETS / name
        img = Image.open(src)
        result = stylize(img, profile)
        result.save(out, 'PNG', optimize=True)
        print(f'OK: {out} ← stylized {name}')


if __name__ == '__main__':
    main()
