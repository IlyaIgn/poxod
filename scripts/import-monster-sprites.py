#!/usr/bin/env python3
"""
Импорт chibi-врагов в стиле Segel (OpenGameArt, CC-BY 3.0):
- слизь — Adventurer and Slime (Segel)
- летучая мышь — 2D Monster Bat Enemy (Segel)
- крыса — 2D Goblin Chibi (Segel, та же серия что рыцарь)
"""
from __future__ import annotations

import shutil
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit('Установите pillow: pip install pillow')

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'monsters'
TMP = Path('/tmp/monster_import')

TARGET_SIZE = (880, 660)
BOTTOM_PAD = 24

EXPORTS = [
    {
        'prefix': 'Slime Blue',
        'frames': {
            'Neutral': TMP / 'rpg/Free RPG Sprites/PNG_/SLIME04/01-Idle/FR_Slime4_Idle_004.png',
            'Angry': TMP / 'rpg/Free RPG Sprites/PNG_/SLIME04/03-Attack/FR_Slime4_Attack_004.png',
            'Hurt': TMP / 'rpg/Free RPG Sprites/PNG_/SLIME04/04-Hurt/FR_Slime4_Hurt_002.png',
        },
    },
    {
        'prefix': 'Bat Starter',
        'frames': {
            'Neutral': TMP / 'batpack/_02/01-Idle/__Bat02_Idle_000.png',
            'Angry': TMP / 'batpack/_02/03-Attack/__Bat02_Attack_004.png',
            'Hurt': TMP / 'batpack/_02/04-Hurt/NoFX/__Bat02_Hurt_002.png',
        },
    },
    {
        'prefix': 'Rat Starter',
        'frames': {
            'Neutral': TMP / 'goblin/2D CHIBI GOBLIN/CHIBI GOBLIN-PNG/01-Idle_/01-NoBlink/2D_GOBLIN__Idle_000.png',
            'Angry': TMP / 'goblin/2D CHIBI GOBLIN/CHIBI GOBLIN-PNG/03-Attack_/2D_GOBLIN__Attack_004.png',
            'Hurt': TMP / 'goblin/2D CHIBI GOBLIN/CHIBI GOBLIN-PNG/05-Hurt_/2D_GOBLIN__Hurt_002.png',
        },
    },
]


def fit_on_canvas(src: Path, dest: Path) -> None:
    img = Image.open(src).convert('RGBA')
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    tw, th = TARGET_SIZE
    scale = min(tw / img.width, th / img.height) * 0.92
    nw = max(1, int(img.width * scale))
    nh = max(1, int(img.height * scale))
    try:
        resample = Image.Resampling.LANCZOS
    except AttributeError:
        resample = Image.LANCZOS
    img = img.resize((nw, nh), resample)

    canvas = Image.new('RGBA', TARGET_SIZE, (0, 0, 0, 0))
    x = (tw - nw) // 2
    y = th - nh - BOTTOM_PAD
    canvas.paste(img, (x, y), img)
    canvas.save(dest, 'PNG', optimize=True)


def ensure_sources() -> None:
    missing = [str(p) for spec in EXPORTS for p in spec['frames'].values() if not p.is_file()]
    if missing:
        raise SystemExit(
            'Нет исходников. Сначала скачайте архивы в /tmp/monster_import:\n'
            + '\n'.join(f'  - {m}' for m in missing[:6])
            + ('\n  ...' if len(missing) > 6 else '')
            + '\nСм. scripts/import-monster-sprites.py (комментарии в README).'
        )


def main() -> None:
    ensure_sources()

    legacy = ROOT / 'monsters_witpop_legacy'
    if OUT.is_dir() and not legacy.exists():
        shutil.copytree(OUT, legacy, ignore=shutil.ignore_patterns('monsters_witpop_legacy'))

    for spec in EXPORTS:
        for mood, src in spec['frames'].items():
            dest = OUT / f"{spec['prefix']} {mood}.png"
            fit_on_canvas(src, dest)
            print('OK', dest.name)

    credits = OUT / 'CREDITS.txt'
    credits.write_text(
        'Враги (chibi, стиль Segel T — как 2D Knight Chibi):\n'
        '- Slime: Adventurer and Slime game Sprites\n'
        '  https://opengameart.org/content/adventurer-and-slime-game-sprites\n'
        '- Bat: 2D Monster Bat Enemy\n'
        '  https://opengameart.org/content/2d-monster-bat-enemy\n'
        '- Rat (гоблин): 2D Goblin Chibi\n'
        '  https://opengameart.org/content/2d-goblin-chibi\n'
        'Лицензия: CC-BY 3.0 / OGA-BY 3.0 (OpenGameArt)\n',
        encoding='utf-8',
    )
    readme_note = OUT / 'READ ME CC-BY-NC.txt'
    if readme_note.exists():
        readme_note.unlink()

    print('Готово:', OUT)


if __name__ == '__main__':
    main()
