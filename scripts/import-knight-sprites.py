#!/usr/bin/env python3
"""Импорт кадров 2D Knight Chibi (OpenGameArt) в silver_knight/."""
import glob
import os
import shutil
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit('pip install pillow')

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'silver_knight'
SRC = Path('/tmp/CHIBI KNIGHT-PNG')

MAPPING = {
    'idle': ('01-Idle_', '2D_KNIGHT__Idle_*.png'),
    'run': ('02-Run_', '2D_KNIGHT__Run_*.png'),
    'attack': ('03-Attack_', '2D_KNIGHT__Attack_*.png'),
    'hurt': ('05-Hurt_', '2D_KNIGHT__Hurt_*.png'),
    'dead': ('06-Die_', '2D_KNIGHT__Die_*.png'),
}

JUMP_UP = '04-Jump_/2D_KNIGHT__Jump_Up_000.png'
JUMP_FALL = '04-Jump_/2D_KNIGHT__Fall_Down_000.png'

WALK_RUN_INDICES = [0, 2, 4, 6]


def copy_frame(src: Path, dest: Path) -> None:
    img = Image.open(src).convert('RGBA')
    img.save(dest, 'PNG', optimize=True)


def main() -> None:
    if not SRC.is_dir():
        raise SystemExit(f'Нет исходников: {SRC}. Скачайте CHIBI KNIGHT-PNG.zip')

    backup = ROOT / 'silver_knight_legacy'
    if OUT.is_dir() and not backup.exists():
        shutil.copytree(OUT, backup)

    if OUT.exists():
        for f in OUT.glob('*.png'):
            f.unlink()

    for anim, (folder, pattern) in MAPPING.items():
        files = sorted(glob.glob(str(SRC / folder / pattern)))
        for i, src in enumerate(files, start=1):
            copy_frame(Path(src), OUT / f'{anim}_{i}.png')

    run_files = sorted(glob.glob(str(SRC / '02-Run_' / '2D_KNIGHT__Run_*.png')))
    for i, idx in enumerate(WALK_RUN_INDICES, start=1):
        copy_frame(Path(run_files[idx]), OUT / f'walk_{i}.png')

    copy_frame(SRC / JUMP_UP, OUT / 'jump_1.png')
    copy_frame(SRC / JUMP_FALL, OUT / 'jump_2.png')

    credits = OUT / 'CREDITS.txt'
    credits.write_text(
        '2D Knight Chibi — Segel T (OpenGameArt.org)\n'
        'https://opengameart.org/content/2d-knight-chibi\n',
        encoding='utf-8',
    )
    print('Готово:', OUT)


if __name__ == '__main__':
    main()
