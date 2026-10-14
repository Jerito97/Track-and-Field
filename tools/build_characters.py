"""Build every athlete's rig pieces from the base character.

Reads   assets/characters/characters.json   (id, nombre, paleta)
        assets/characters/base/<piece>.png  (the base character)
        assets/characters/base/<anim>/      (base animation frames + meta.json, from tools/cut_sprite_sheet.py)
Writes  assets/characters/<id>/<piece>.png  (recoloured base pieces)
        assets/characters/<id>/<anim>/*.png (recoloured animation frames)
        js/roster.js                        (names, colours, size and pivot of every piece; the game imports it)
        assets/characters/.generated.json   (which PNGs this script wrote, to tell them from your own)

Recolouring works by colour zones of the base: skin, hair/beard, vest, vest stripe,
shorts and shoes. Each pixel keeps its brightness relative to its zone, so shadows,
highlights and the black outlines survive.

Own pieces: if assets/characters/<id>/ has a PNG that this script did not write
(for example a hand-drawn head.png), it is left alone and used instead of the
recoloured one. Athletes with "recolorear": false get the base pieces unchanged
(their palette is only used for flags and the vector fallback). Athletes marked
"propio": true are skipped entirely.

Usage: python3 tools/build_characters.py
Needs: Pillow, numpy
"""
import hashlib
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CHARS = ROOT / 'assets/characters'
BASE = CHARS / 'base'
WRITTEN = CHARS / '.generated.json'
ROSTER_JS = ROOT / 'js/roster.js'
PIECES = ['head', 'torso', 'shorts', 'uarm', 'farm', 'thigh', 'shin']
# pivot: which end of the piece holds the joint, and how far in from that end (fraction of height)
#   head: neck · torso: hip · shorts: waist · uarm: shoulder · farm: elbow · thigh: hip · shin: knee
PIVOT = {'head': ('bottom', .05), 'torso': ('bottom', .08), 'shorts': ('top', .12), 'uarm': ('top', .10),
         'farm': ('top', .10), 'thigh': ('top', .06), 'shin': ('top', .06)}
OUTLINE_V = .09  # darker than this is outline and is never recoloured
# palette key in characters.json for each zone
ZONE_KEY = {'skin': 'piel', 'hair': 'pelo', 'shirt': 'musculosa', 'stripe': 'franja', 'shorts': 'short', 'shoes': 'zapatillas'}


def hsv(rgb):
    mx, mn = rgb.max(2), rgb.min(2)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def components(mask):
    """Connected regions of a boolean mask, as a list of (ys, xs)."""
    seen = np.zeros_like(mask)
    out = []
    h, w = mask.shape
    for sy, sx in zip(*np.nonzero(mask)):
        if seen[sy, sx]:
            continue
        seen[sy, sx] = True
        q, pts = deque([(sy, sx)]), []
        while q:
            y, x = q.popleft()
            pts.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        out.append(tuple(np.array(pts).T))
    return out


def zones(piece, rgba):
    """Label each base pixel with its colour zone (None = keep as is)."""
    rgb = rgba[..., :3] / 255
    h, s, v = hsv(rgb)
    opaque = rgba[..., 3] > 0
    paint = opaque & (v >= OUTLINE_V)
    z = {}
    if piece == 'head':
        hair = paint & (h >= 5) & (h < 50) & (s > .3) & (v < .62)
        # only big regions are hair/beard; small dark bits (eyes, nostrils) stay as drawn
        big = np.zeros_like(hair)
        for ys, xs in components(hair):
            if len(ys) >= .01 * opaque.sum():
                big[ys, xs] = True
        z['hair'] = big
        z['skin'] = paint & ~hair & ~((s < .12) & (v > .8))  # eye whites and teeth stay white
    elif piece == 'torso':
        z['shirt'] = paint & ((h < 20) | (h > 330)) & (s > .35)
        z['stripe'] = paint & ~z['shirt'] & (s < .25) & (v > .6)
    elif piece == 'shorts':
        z['shorts'] = paint & (s < .45) & (v < .6)
        z['skin'] = paint & ~z['shorts']
    elif piece == 'shin':
        z['shoes'] = paint & (s < .18)
        z['skin'] = paint & ~z['shoes']
    else:
        z['skin'] = paint
    return z


def body_zones(rgba):
    """Zones of a full-body frame: like the pieces, plus height bands to tell
    hair from shorts (both dark) and the vest stripe from the shoes (both white)."""
    rgb = rgba[..., :3] / 255
    h, s, v = hsv(rgb)
    opaque = rgba[..., 3] > 0
    paint = opaque & (v >= OUTLINE_V)
    rows = np.nonzero(opaque.any(1))[0]
    f = ((np.arange(rgba.shape[0]) - rows.min()) / max(np.ptp(rows), 1))[:, None] * np.ones((1, rgba.shape[1]))
    hair = paint & (h >= 5) & (h < 50) & (s > .3) & (v < .62) & (f < .38)
    big = np.zeros_like(hair)
    for ys, xs in components(hair):
        if len(ys) >= .005 * opaque.sum():
            big[ys, xs] = True
    z = {'hair': big}
    z['shirt'] = paint & ((h < 14) | (h > 335)) & (s > .62) & (f > .28)  # pink skin (ears, knuckles) is less saturated
    z['shoes'] = paint & (s < .2) & (f > .7)
    z['shorts'] = paint & ~hair & (s < .45) & (v < .5) & (f > .38) & (f < .78)
    z['stripe'] = paint & (s < .25) & (v > .6) & (f > .25) & (f < .65) & ~z['shoes']
    taken = big | z['shirt'] | z['shoes'] | z['shorts'] | z['stripe']
    z['skin'] = paint & ~taken & ~((s < .12) & (v > .8))  # eye whites and teeth stay white
    return z


def zone_refs(images, zone_maps):
    """Median brightness of each zone across several frames, so recoloured frames don't flicker."""
    refs = {}
    for zone in zone_maps[0]:
        vals = [lum(img[..., :3] / 255)[z[zone]] for img, z in zip(images, zone_maps) if z[zone].any()]
        if vals:
            refs[zone] = float(np.median(np.concatenate(vals)))
    return refs


def lum(rgb):
    return rgb[..., 0] * .299 + rgb[..., 1] * .587 + rgb[..., 2] * .114


def hex_rgb(c):
    c = c.lstrip('#')
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)]) / 255


def recolor(rgba, z, palette, refs=None):
    out = rgba.astype(float)
    rgb = out[..., :3] / 255
    y = lum(rgb)
    for zone, mask in z.items():
        if not mask.any():
            continue
        ref = max(refs[zone] if refs else np.median(y[mask]), 1e-3)
        t = hex_rgb(palette[ZONE_KEY[zone]])
        ratio = (y[mask] / ref)[:, None]
        # darker than the zone colour: scale the target down; lighter: blend it toward white
        lighter = t + (1 - t) * np.clip((ratio - 1) / max(1 / ref - 1, 1e-3), 0, 1)
        out[mask, :3] = np.where(ratio <= 1, t * ratio, lighter) * 255
    return np.clip(out, 0, 255).astype(np.uint8)


def pivot(piece, rgba):
    a = rgba[..., 3] > 32
    h = a.shape[0]
    end, inset = PIVOT[piece]
    rows = np.nonzero(a.any(1))[0]
    y = rows.max() - inset * h if end == 'bottom' else rows.min() + inset * h
    xs = np.nonzero(a[int(round(y))])[0]
    return round((xs.min() + xs.max()) / 2, 1), round(float(y), 1)


def sha(path):
    return hashlib.sha1(path.read_bytes()).hexdigest()


def main():
    roster = json.loads((CHARS / 'characters.json').read_text())['atletas']
    written = json.loads(WRITTEN.read_text()) if WRITTEN.exists() else {}  # path -> sha1 of files this script wrote
    base = {p: np.asarray(Image.open(BASE / f'{p}.png').convert('RGBA')) for p in PIECES}
    base_zones = {p: zones(p, base[p]) for p in PIECES}
    anims = {}  # every base/<anim>/meta.json: run cycle, start, ...
    for meta_file in sorted(BASE.glob('*/meta.json')):
        name = meta_file.parent.name
        meta = json.loads(meta_file.read_text())
        frames = [np.asarray(Image.open(meta_file.parent / f'{name}{i + 1}.png').convert('RGBA')) for i in range(meta['frames'])]
        zs = [body_zones(f) for f in frames]
        anims[name] = (meta, frames, zs, zone_refs(frames, zs))
    new_written, out = {}, []
    for c in roster:
        entry = {'id': c['id'], 'name': c['nombre'], 'palette': c['paleta'], 'own': bool(c.get('propio'))}
        out.append(entry)
        if c.get('propio'):
            continue
        folder = CHARS / c['id']
        folder.mkdir(exist_ok=True)
        parts = {}
        for p in PIECES:
            f = folder / f'{p}.png'
            rel = f.relative_to(CHARS).as_posix()
            own = f.exists() and written.get(rel) != sha(f)
            if own:
                img = np.asarray(Image.open(f).convert('RGBA'))
            else:
                img = base[p] if c.get('recolorear') is False else recolor(base[p], base_zones[p], c['paleta'])
                Image.fromarray(img, 'RGBA').save(f, optimize=True)
                new_written[rel] = sha(f)
            px, py = pivot(p, img)
            parts[p] = {'file': rel, 'w': img.shape[1], 'h': img.shape[0], 'px': px, 'py': py, 'own': own}
        entry['parts'] = parts
        entry['anims'] = {}
        for name, (meta, frames, zs, refs) in anims.items():
            (folder / name).mkdir(exist_ok=True)
            files = []
            for i, (img0, z) in enumerate(zip(frames, zs)):
                f = folder / f'{name}/{name}{i + 1}.png'
                rel = f.relative_to(CHARS).as_posix()
                if not (f.exists() and written.get(rel) != sha(f)):
                    img = img0 if c.get('recolorear') is False else recolor(img0, z, c['paleta'], refs)
                    Image.fromarray(img, 'RGBA').save(f, optimize=True)
                    new_written[rel] = sha(f)
                files.append(rel)
            entry['anims'][name] = {'files': files, **{k: v for k, v in meta.items() if k not in ('hair_src', 'size_src')}}
        own = [p for p in PIECES if parts[p]['own']]
        kind = 'base pieces' if c.get('recolorear') is False else 'recoloured'
        print(f"{c['id']}: {kind}" + (f", own {', '.join(own)}" if own else ''))
    WRITTEN.write_text(json.dumps(new_written, indent=1) + '\n')
    ROSTER_JS.write_text('// Generated by tools/build_characters.py from assets/characters/characters.json. Do not edit.\n'
                         '// parts: file (under assets/characters/), image size w,h and joint pivot px,py in image px\n'
                         '// anims: animation frames (run, start, ...), all w x h, hip at x=hx, lowest point at y=feet;\n'
                         '//        every animation is drawn at the same character scale\n'
                         'export const ROSTER=' + json.dumps(out, indent=1, ensure_ascii=False) + ';\n')


if __name__ == '__main__':
    main()
