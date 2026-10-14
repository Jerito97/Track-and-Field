"""Cut an animation sprite sheet (figures on a white background) into aligned frames.

Every figure becomes one frame, in reading order (rows top to bottom, left to right).
Frames share one canvas size: the hip (centre of the shorts) sits at the same x in
every frame and the lowest point (feet, hands) on the bottom edge. Writes <name>1.png ...
and meta.json (frame count, size, hip x, feet y) next to them.

Sheets come at different zoom levels, and each generated sheet draws the body a bit
bigger or smaller than the others. With a reference animation folder the frames are
scaled to the reference by the median of four size ratios: hair, vest + shorts, shoes
and whole silhouette, so one odd proportion doesn't throw the scale off.

With --keep-height, figures keep their height above the sheet's ground line (the
lowest point of each row): use it for jumps, so airborne frames stay in the air.

With --measure=2,3 only those frames (1-based) are used to measure the size, for sheets
that mix views (e.g. a celebration with front-view frames for the podium).

With --javelin, long javelins whose tail touches the neighbouring figure are cut
loose at the tail end before the figures are separated.

With --javelins="x0,y0,x1,y1;..." (sheet px, tail end to tip, one per figure; an empty item for a figure without one) javelins
that cross the neighbouring figures are lifted off and given back to their owner
(tools/javelin_split.py); the lines only need to be roughly right. meta.json then also
has 'jav': each frame's javelin tail x,y and tip x,y in frame px. --javelin-lines="..." (same
format) only records 'jav', for sheets whose figures come apart on their own.

With --adjust=0.95 the measured scale is multiplied by that factor, for a final touch by eye.

Usage: python3 tools/cut_sprite_sheet.py SHEET OUT_DIR NAME [REFERENCE_DIR] [--keep-height] [--measure=2,3] [--adjust=0.95]
  e.g. python3 tools/cut_sprite_sheet.py assets/source/base_start_sheet.jpg assets/characters/base/start start assets/characters/base/run
Needs: Pillow, numpy
"""
import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import javelin_split  # noqa: E402

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


def sizes(rgb, m):
    """Areas (source px) that measure the character's scale: hair, vest + shorts, shoes, silhouette."""
    f = rgb / 255
    mx, mn = f.max(2), f.min(2)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = (mx - mn) / np.maximum(mx, 1e-6)
    hair = m & (h >= 5) & (h < 50) & (s > .3) & (mx < .62) & (mx > .09)
    body = m & ((((h < 14) | (h > 335)) & (s > .62)) | ((s < .45) & (mx > .07) & (mx < .35)))
    shoes = m & (s < .2) & (mx > .6)
    return {'hair': int(hair.sum()), 'body': int(body.sum()), 'shoes': int(shoes.sum()), 'silhouette': int(m.sum())}


def cut_javelin_tails(fg, im):
    """Break the contact between each javelin's tail end and the figure to its left."""
    H, W = fg.shape
    f = im / 255
    mx, mn = f.max(2), f.min(2)
    s = (mx - mn) / np.maximum(mx, 1e-6)
    shaft = fg & (s < .2) & (mx > .55)
    shaft[int(H * .5):] = False
    left = shaft.copy()
    fg = fg.copy()
    for sy, sx in zip(*np.nonzero(shaft)):
        if not left[sy, sx]:
            continue
        m = flood(left, [(sy, sx)])
        left &= ~m
        ys, xs = np.nonzero(m)
        if np.ptp(xs) < 20 or np.ptp(xs) < 2 * np.ptp(ys):  # not a thin shaft piece
            continue
        # the tail piece is the one that runs into the red grip on its right end
        xr = xs.max()
        yr = int(ys[xs == xr].mean())
        win = (slice(max(0, yr - 10), yr + 11), slice(xr, min(W, xr + 14)))
        h = np.where(mx == f[..., 0], ((f[..., 1] - f[..., 2]) / np.maximum(mx - mn, 1e-6)) % 6 * 60, 180)
        # (the grip is a strong red; the tip's pinkish shading is not)
        if (((h[win] < 15) | (h[win] > 340)) & (s[win] > .65) & (mx[win] > .45)).sum() < 8:
            continue
        x0 = xs.min()
        y0 = int(ys[xs == x0].mean())
        if x0 < 12:
            continue
        fg[max(0, y0 - 22):y0 + 23, max(0, x0 - 7):x0 + 1] = False
    return fg


def main(src, outdir, name, ref=None, keep_height=False, measure=None, adjust=1.0, javelin=False, javelins=None, javelin_lines=None):
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
        hy, hx = np.nonzero(m)
        thin = np.ptp(hx) > 3 * max(np.ptp(hy), 1)  # long thin white shape: a javelin shaft, not paper
        if m.sum() >= 40 and px.mean() >= 249 and np.percentile(px.min(1), 5) >= 228 and not thin:
            bg |= m
    fg = ~bg
    if javelin:
        fg = cut_javelin_tails(fg, im)
    # figures = big connected blobs
    if javelins:
        pairs = javelin_split.split(im, fg, javelins, flood)
        blobs, rgbs = [m for m, _, _ in pairs], [c for _, c, _ in pairs]
        jav_of = {id(m): e for m, _, e in pairs}
    else:
        left, blobs = fg.copy(), []
        for sy, sx in zip(*np.nonzero(fg)):
            if not left[sy, sx]:
                continue
            m = flood(left, [(sy, sx)])
            left &= ~m
            blobs.append(m)
        big = max(b.sum() for b in blobs)
        blobs = [b for b in blobs if b.sum() > .4 * big]
        rgbs = [im] * len(blobs)
        jav_of = {}
    rgb_of = {id(b): c for b, c in zip(blobs, rgbs)}
    jav = []
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
    if javelin_lines:  # only record where each javelin is
        jav_of = {id(b): javelin_split.fit_line(im, fg, *ln) if ln else None for b, ln in zip(blobs, javelin_lines)}
    ground = {r: max(np.nonzero(b)[0].max() for rr, b in zip(row_of, blobs) if rr == r) for r in set(row_of)}

    v = im.max(2) / 255
    s = (im.max(2) - im.min(2)) / np.maximum(im.max(2), 1)
    frames = []
    for m in blobs:
        im = rgb_of[id(m)]
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
        if jav_of:  # javelin tail and tip, from the hip and the bottom
            e = jav_of[id(m)]
            jav.append([(float(p[0]) - int(round(sx.mean())), float(p[1]) - bottom) for p in e] if e else None)
        frames.append((np.dstack([rgb, a]).astype(np.uint8), int(round(sx.mean())), ys.min(), ys.max(), xs.min(), xs.max(), bottom))
    per = [sizes(rgb_of[id(m)], m) for i, m in enumerate(blobs) if not measure or i + 1 in measure]
    size_src = {k: float(np.median([p[k] for p in per])) for k in per[0]}
    scale = SCALE
    if ref:
        rs = json.loads((Path(ref) / 'meta.json').read_text())['size_src']
        scale = SCALE * float(np.median([(rs[k] / size_src[k]) ** .5 for k in rs if size_src[k] > 0]))
    scale *= adjust
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
            'scale': round(scale, 4), 'size_src': size_src}
    if jav:  # javelin tail x,y and tip x,y in frame px, per frame
        meta['jav'] = [[round((L + dx) * scale, 1) if k % 2 == 0 else round((T + dx) * scale, 1) for k, dx in enumerate(np.ravel(e))] if e else None for e in jav]
    (out / 'meta.json').write_text(json.dumps(meta) + '\n')
    print(meta)


if __name__ == '__main__':
    flags = [a for a in sys.argv[1:] if a.startswith('--')]
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    measure = next((a.split('=')[1] for a in flags if a.startswith('--measure=')), None)
    adjust = next((float(a.split('=')[1]) for a in flags if a.startswith('--adjust=')), 1.0)
    jl = next((a.split('=')[1] for a in flags if a.startswith('--javelins=')), None)
    jl = [((float(q[0]), float(q[1])), (float(q[2]), float(q[3]))) if len(q) == 4 else None for q in (s.split(',') for s in jl.split(';'))] if jl else None
    jo = next((a.split('=')[1] for a in flags if a.startswith('--javelin-lines=')), None)
    jo = [((float(q[0]), float(q[1])), (float(q[2]), float(q[3]))) if len(q) == 4 else None for q in (s.split(',') for s in jo.split(';'))] if jo else None
    main(*args[:4], javelin_lines=jo, javelins=jl, javelin='--javelin' in flags, keep_height='--keep-height' in flags, measure=[int(n) for n in measure.split(',')] if measure else None, adjust=adjust)
