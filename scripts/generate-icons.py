#!/usr/bin/env python3
"""
Generates the OpenBook icon set: a serif gold "O." on a near-black tile.

Run once: python3 scripts/generate-icons.py

Outputs into public/icons/ at every size the apple-touch-icon and PWA spec
need.
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
os.makedirs(OUT_DIR, exist_ok=True)

BG = (8, 8, 8, 255)
FG = (255, 255, 255, 255)
GOLD = (212, 175, 55, 255)

FONT_CANDIDATES = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf',
    '/System/Library/Fonts/Times.ttc',
    '/Library/Fonts/Times New Roman Bold.ttf',
    '/usr/share/fonts/TTF/times.ttf',
    'C:/Windows/Fonts/timesbd.ttf',
]

def find_font():
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return path
    raise FileNotFoundError(
        'No serif font found. On Mac this script should just work. '
        'On Linux, install fonts-dejavu. On Windows, run from a system '
        'with Times New Roman installed.'
    )

FONT_PATH = find_font()

ICONS = [
    ('apple-touch-icon-57.png', 57, False),
    ('apple-touch-icon-60.png', 60, False),
    ('apple-touch-icon-72.png', 72, False),
    ('apple-touch-icon-76.png', 76, False),
    ('apple-touch-icon-114.png', 114, False),
    ('apple-touch-icon-120.png', 120, False),
    ('apple-touch-icon-144.png', 144, False),
    ('apple-touch-icon-152.png', 152, False),
    ('apple-touch-icon-167.png', 167, False),
    ('apple-touch-icon-180.png', 180, False),
    ('favicon-16.png', 16, False),
    ('favicon-32.png', 32, False),
    ('favicon-48.png', 48, False),
    ('icon-192.png', 192, False),
    ('icon-512.png', 512, False),
    ('maskable-192.png', 192, True),
    ('maskable-512.png', 512, True),
]


def render_icon(filename, size, maskable):
    img = Image.new('RGBA', (size, size), BG)
    draw = ImageDraw.Draw(img)

    safe_factor = 0.62 if maskable else 0.78
    glyph_box = int(size * safe_factor)

    low, high = 4, size * 2
    chosen = low
    while low <= high:
        mid = (low + high) // 2
        try:
            font = ImageFont.truetype(FONT_PATH, mid)
        except Exception:
            break
        bbox = draw.textbbox((0, 0), 'O', font=font)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        if w <= glyph_box and h <= glyph_box:
            chosen = mid
            low = mid + 1
        else:
            high = mid - 1

    font = ImageFont.truetype(FONT_PATH, chosen)
    bbox = draw.textbbox((0, 0), 'O', font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) / 2 - bbox[0]
    y = (size - text_h) / 2 - bbox[1]

    draw.text((x, y), 'O', font=font, fill=FG)

    if size >= 48:
        dot_diameter = max(2, int(text_h * 0.16))
        dot_x = x + text_w + max(1, int(text_h * 0.04))
        dot_y = y + text_h - dot_diameter
        draw.ellipse(
            [dot_x, dot_y, dot_x + dot_diameter, dot_y + dot_diameter],
            fill=GOLD,
        )

    img.save(os.path.join(OUT_DIR, filename), 'PNG', optimize=True)
    print(f'  {filename} ({size}x{size})')


def main():
    print(f'Rendering {len(ICONS)} icons into {OUT_DIR}')
    print(f'Font: {FONT_PATH}')
    for filename, size, maskable in ICONS:
        render_icon(filename, size, maskable)
    print('Done.')


if __name__ == '__main__':
    main()
