"""Cut an animation sprite sheet (figures on a white background) into aligned frames.

Every figure becomes one frame, in reading order (rows top to bottom, left to right).
Frames share one canvas size: the hip (centre of the shorts) sits at the same x in
every frame and the lowest point (feet, hands) on the bottom edge. Writes <name>1.png ...
and meta.json (frame count, size, hip x, feet y) next to them.

Sheets come at different zoom levels; with a reference animation folder the frames
are scaled so the character's head (hair) is the same size as in the reference.

With --keep-height, figures keep their height above the sheet's ground line (the
lowest point of each row): use it for jumps, so airborne frames stay in the air.

Usage: python3 tools/cut_sprite_sheet.py SHEET OUT_DIR NAME [REFERENCE_DIR] [--keep-height]
  e.g. python3 tools/cut_sprite_sheet.py assets/source/base_start_sheet.jpg assets/characters/base/start start assets/characters/base/run
Needs: Pillow, numpy
"""
import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

SCALE = .4  # source sheets are ~400 px per figure; the game draws them ~60 px tall


def flood(mask, seeds):
    h, w = mask.shape
    seen = np.zeros_like(mask)
    q = deque()
    for y, x in seeds:
        if mask[y, x] and not seen[y, x]:
            seen[y, x] = True
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def premultiplied_resize(img, size):
    f = np.asarray(img).astype(float)
    a = f[..., 3:] / 255
    pre = Image.fromarray(np.dstack([f[..., :3] * a, f[..., 3:]]).astype(np.uint8), 'RGBA').resize(size, Image.LANCZOS)
    g = np.asarray(pre).astype(float)
    rgb = np.clip(g[..., :3] / np.maximum(g[..., 3:] / 255, 1e-6), 0, 255)
    return Image.fromarray(np.dstack([rgb, g[..., 3:]]).astype(np.uint8), 'RGBA')


def hair_area(rgb, m):
    """Area of the dark-brown hair in a figure (source px): a stable measure of the character's scale."""
    f = rgb / 255
    mx, mn = f.max(2), f.min(2)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = (mx - mn) / np.maximum(mx, 1e-6)
    return int((m & (h >= 5) & (h < 50) & (s > .3) & (mx < .62) & (mx > .09)).sum())


def main(src, outdir, name, ref=None, keep_height=False):
    im = np.asarray(Image.open(src).convert('RGB')).astype(int)
    H, W, _ = im.shape
    light = im.min(2) > 215
    border = [(y, x) for x in range(W) for y in (0, H - 1)] + [(y, x) for y in range(H) for x in (0, W - 1)]
    bg = flood(light, border)
    # paper showing through gaps (between the legs, under an arm) is pure white;
    # the vest stripe and the shoes are a greyer white
    holes, left = light & ~bg, light & ~bg
    for sy, sx in zip(*np.nonzero(holes)):
        if not left[sy, sx]:
            continue
        m = flood(left, [(sy, sx)])
        left &= ~m
        px = im[m]
        if m.sum() >= 40 and px.mean() >= 249 and np.percentile(px.min(1), 5) >= 228:
            bg |= m
    fg = ~bg
    # figures = big connected blobs
    left, blobs = fg.copy(), []
    for sy, sx in zip(*np.nonzero(fg)):
        if not left[sy, sx]:
            continue
        m = flood(left, [(sy, sx)])
        left &= ~m
        blobs.append(m)
    big = max(b.sum() for b in blobs)
    blobs = [b for b in blobs if b.sum() > .4 * big]
    # reading order: a new row starts when the vertical centre jumps by more than half a figure
    info = sorted(((np.nonzero(b)[0].mean(), np.nonzero(b)[1].mean(), b) for b in blobs), key=lambda t: t[0])
    fh = np.median([np.ptp(np.nonzero(b)[0]) for b in blobs])
    rows, row = [], 0
    for i, t in enumerate(info):
        if i and t[0] - info[i - 1][0] > fh / 2:
            row += 1
        rows.append(row)
    order = sorted(zip(rows, info), key=lambda p: (p[0], p[1][1]))
    blobs = [t[2] for _, t in order]
    row_of = [r for r, _ in order]
    ground = {r: max(np.nonzero(b)[0].max() for rr, b in zip(row_of, blobs) if rr == r) for r in set(row_of)}

    v = im.max(2) / 255
    s = (im.max(2) - im.min(2)) / np.maximum(im.max(2), 1)
    frames = []
    for m in blobs:
        rim = np.zeros_like(m)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            rim |= m & ~np.roll(np.roll(m, dy, 0), dx, 1)
        near = rim.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            near |= np.roll(np.roll(rim, dy, 0), dx, 1)
        rgb, a = im.copy(), np.where(m, 255, 0)
        soft = near & m & (im.min(2) > 60)  # anti-aliased rim: black outline over white paper
        a[soft] = 255 - im.min(2)[soft]
        rgb[soft] = 0
        ys, xs = np.nonzero(m)
        sy, sx = np.nonzero(m & (v > .07) & (v < .35) & (s < .4))  # shorts
        # bottom: own lowest point, or the row's ground line to keep jumps in the air
        bottom = ground[row_of[len(frames)]] if keep_height else ys.max()
        frames.append((np.dstack([rgb, a]).astype(np.uint8), int(round(sx.mean())), ys.min(), ys.max(), xs.min(), xs.max(), bottom))
    hair = float(np.median([hair_area(im, m) for m in blobs]))
    scale = SCALE
    if ref:
        scale = SCALE * (json.loads((Path(ref) / 'meta.json').read_text())['hair_src'] / hair) ** .5
    L = max(f[1] - f[4] for f in frames) + 6
    R = max(f[5] - f[1] for f in frames) + 6
    T = max(f[6] - f[2] for f in frames) + 6
    out = Path(outdir)
    out.mkdir(parents=True, exist_ok=True)
    size = (round((L + R) * scale), round((T + 2) * scale))
    for i, (rgba, hx, top, bot, x0, x1, bottom) in enumerate(frames):
        c = Image.new('RGBA', (L + R, T + 2), (0, 0, 0, 0))
        piece = Image.fromarray(rgba[top:bot + 1, x0:x1 + 1], 'RGBA')
        c.paste(piece, (L - (hx - x0), T - (bottom - top)), piece)
        premultiplied_resize(c, size).save(out / f'{name}{i + 1}.png', optimize=True)
    meta = {'frames': len(frames), 'w': size[0], 'h': size[1], 'hx': round(float(L * scale), 1), 'feet': round(float(T * scale), 1),
            'scale': round(scale, 4), 'hair_src': hair}
    (out / 'meta.json').write_text(json.dumps(meta) + '\n')
    print(meta)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--keep-height']
    main(*args[:4], keep_height='--keep-height' in sys.argv)
