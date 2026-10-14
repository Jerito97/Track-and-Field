"""Cut the base character sheet (assets/source/base_sheet.webp) into rig pieces.

One-off asset prep: writes assets/characters/base/<piece>.png with a transparent
background. Two pieces get fixed up so they work on the rig:
  - torso: the sheet draws the near arm on top of the vest; the arm is removed,
    the vest is filled in behind it (stripe continued) and a back edge is drawn.
  - shorts: the bit of thigh showing under the hem is removed (the thighs are
    separate pieces that swing under the shorts).

Usage: python3 tools/cut_base_sheet.py
Needs: Pillow, numpy
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/source/base_sheet.webp'
OUT = ROOT / 'assets/characters/base'

# piece name for each blob, identified by a point inside it (sheet px)
PIECES = {'head': (180, 300), 'torso': (620, 300), 'shorts': (920, 450), 'uarm': (210, 900),
          'thigh': (700, 900), 'farm': (440, 900), 'shin': (970, 900)}
# vest back edge (sheet px), top to bottom; everything left of it is cut away
BACK_EDGE = [(503, 128), (484, 165), (471, 240), (462, 350), (456, 470), (452, 600)]
OUTLINE_W = 8  # sheet outline thickness in px
SCALE = .4  # saved pieces end up ~150-200 px tall, like Yo's


def premultiplied_resize(img, size):
    """Downscale without dark/bright fringes from transparent pixels."""
    f = np.asarray(img).astype(float)
    a = f[..., 3:] / 255
    pre = Image.fromarray(np.dstack([f[..., :3] * a, f[..., 3:]]).astype(np.uint8), 'RGBA').resize(size, Image.LANCZOS)
    g = np.asarray(pre).astype(float)
    ga = np.maximum(g[..., 3:] / 255, 1e-6)
    rgb = np.clip(g[..., :3] / ga, 0, 255)
    return Image.fromarray(np.dstack([rgb, g[..., 3:]]).astype(np.uint8), 'RGBA')


def shift_or(m, r):
    """Dilate a boolean mask by r px (square)."""
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dy or dx:
                out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


def flood(mask, seeds):
    seen = np.zeros_like(mask)
    q = deque()
    for y, x in seeds:
        if mask[y, x] and not seen[y, x]:
            seen[y, x] = True
            q.append((y, x))
    h, w = mask.shape
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def hsv(rgb):
    f = rgb.astype(float) / 255
    mx, mn = f.max(2), f.min(2)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def main():
    rgb = np.asarray(Image.open(SRC).convert('RGB')).copy()
    H, W, _ = rgb.shape
    light = rgb.min(2) > 225
    border = [(y, x) for x in range(W) for y in (0, H - 1)] + [(y, x) for y in range(H) for x in (0, W - 1)]
    bg = flood(light, border)
    fg = ~bg
    # un-matte the anti-aliased rim: black outline over white paper
    rim = fg & shift_or(bg, 2)
    alpha = np.where(fg, 255, 0).astype(np.uint8)
    dark = 255 - rgb.min(2)
    alpha[rim & (rgb.min(2) > 60)] = dark[rim & (rgb.min(2) > 60)]
    rgb[rim & (rgb.min(2) > 60)] = 0
    hue, sat, val = hsv(rgb)

    OUT.mkdir(parents=True, exist_ok=True)
    for name, (sx, sy) in PIECES.items():
        m = flood(fg, [(sy, sx)])
        px, a = rgb.copy(), np.where(m, alpha, 0).astype(np.uint8)
        if name == 'torso':
            px, a = fix_torso(px, a, m, hue, sat, val, bg)
        elif name == 'shorts':
            a = fix_shorts(a, m, hue, sat, val)
        ys, xs = np.nonzero(a)
        y0, y1, x0, x1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
        out = Image.fromarray(np.dstack([px, a])[y0:y1, x0:x1], 'RGBA')
        out = premultiplied_resize(out, (round(out.width * SCALE), round(out.height * SCALE)))
        out.save(OUT / f'{name}.png', optimize=True)
        print(f'{name}: {out.width}x{out.height}')


def fix_torso(px, a, piece, hue, sat, val, bg):
    """Repaint the vest without the arm: keep the outer outline, refill the inside
    (red with a soft shade toward the back, stripe continued as a straight band)."""
    H, W = a.shape
    red = piece & ((hue < 15) | (hue > 340)) & (sat > .5) & (val > .45)
    white = piece & (sat < .2) & (val > .85)
    sil = Image.new('L', (W, H), 0)
    poly = [(0, BACK_EDGE[0][1] - 40), BACK_EDGE[0]] + BACK_EDGE[1:] + [(BACK_EDGE[-1][0], H), (0, H)]
    ImageDraw.Draw(sil).polygon(poly, fill=255)
    keep = piece & (np.asarray(sil) == 0)
    outline = keep & (val < .3) & shift_or(bg, OUTLINE_W + 1)
    inside = keep & ~outline
    # stripe band fitted to the visible stripe
    ys, xs = np.nonzero(white)
    pts = np.stack([xs, ys], 1).astype(float)
    c = pts.mean(0)
    d = np.linalg.svd(pts - c, full_matrices=False)[2][0]
    n = np.array([-d[1], d[0]])
    half = np.percentile(np.abs((pts - c) @ n), 95)
    base_red = np.median(px[red], axis=0)
    base_white = np.median(px[white], axis=0)
    iy, ix = np.nonzero(inside)
    back_x = np.interp(iy, [p[1] for p in BACK_EDGE], [p[0] for p in BACK_EDGE])
    front_x = ix.max()
    shade = (.78 + .22 * np.clip((ix - back_x) / (front_x - back_x), 0, 1) ** .7)[:, None]
    on_stripe = (np.abs((np.stack([ix, iy], 1) - c) @ n) <= half)[:, None]
    px[iy, ix] = np.where(on_stripe, base_white * (.88 + .12 * shade), base_red * shade).astype(np.uint8)
    px[outline] = 0
    a = np.where(keep, 255, 0).astype(np.uint8)
    a[outline] = np.maximum(a[outline], 0)
    img = Image.fromarray(np.dstack([px, a]), 'RGBA')
    ImageDraw.Draw(img).line(BACK_EDGE, fill=(0, 0, 0, 255), width=OUTLINE_W, joint='curve')
    out = np.asarray(img)
    return out[..., :3].copy(), out[..., 3].copy()


def fix_shorts(a, piece, hue, sat, val):
    fabric = piece & (val >= .07) & (val < .4) & (sat < .45)
    fabric &= ~shift_or(~fabric, 3)  # drop thin anti-aliased lines, keep the cloth
    near = shift_or(fabric, OUTLINE_W + 6)
    return np.where(piece & near & ~(piece & (hue >= 5) & (hue < 50) & (val >= .45) & (sat > .15)), a, 0).astype(np.uint8)


if __name__ == '__main__':
    main()
