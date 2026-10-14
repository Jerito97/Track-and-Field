"""Cut an animation sprite sheet (figures on a white background) into aligned frames.

Every figure becomes one frame, in reading order (rows top to bottom, left to right).
Frames share one canvas size: the hip (centre of the shorts) sits at the same x in
every frame and the feet stand on the bottom edge. Writes <name>1.png ... and
meta.json (frame count, size, hip x, feet y) next to them.

Usage: python3 tools/cut_sprite_sheet.py assets/source/base_run_sheet.jpg assets/characters/base/run run
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


def main(src, outdir, name):
    im = np.asarray(Image.open(src).convert('RGB')).astype(int)
    H, W, _ = im.shape
    light = im.min(2) > 215
    border = [(y, x) for x in range(W) for y in (0, H - 1)] + [(y, x) for y in range(H) for x in (0, W - 1)]
    fg = ~flood(light, border)
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
    blobs = [t[2] for _, t in sorted(zip(rows, info), key=lambda p: (p[0], p[1][1]))]

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
        frames.append((np.dstack([rgb, a]).astype(np.uint8), int(round(sx.mean())), ys.min(), ys.max(), xs.min(), xs.max()))
    L = max(f[1] - f[4] for f in frames) + 6
    R = max(f[5] - f[1] for f in frames) + 6
    T = max(f[3] - f[2] for f in frames) + 6
    out = Path(outdir)
    out.mkdir(parents=True, exist_ok=True)
    size = (round((L + R) * SCALE), round((T + 2) * SCALE))
    for i, (rgba, hx, top, bot, x0, x1) in enumerate(frames):
        c = Image.new('RGBA', (L + R, T + 2), (0, 0, 0, 0))
        piece = Image.fromarray(rgba[top:bot + 1, x0:x1 + 1], 'RGBA')
        c.paste(piece, (L - (hx - x0), T - (bot - top)), piece)
        premultiplied_resize(c, size).save(out / f'{name}{i + 1}.png', optimize=True)
    meta = {'frames': len(frames), 'w': size[0], 'h': size[1], 'hx': round(float(L * SCALE), 1), 'feet': round(float(T * SCALE), 1)}
    (out / 'meta.json').write_text(json.dumps(meta) + '\n')
    print(meta)


if __name__ == '__main__':
    main(*sys.argv[1:4])
