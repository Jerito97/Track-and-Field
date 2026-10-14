"""Separate figures whose long javelins cross the neighbouring figures (used by cut_sprite_sheet.py).

Each javelin is given by hand as a rough straight line, tail end to tip (sheet px).
The line is fitted to the shaft (the light band between its two black outlines);
every javelin is lifted off the sheet, the figures are separated, and each figure
gets back its own javelin. Where a javelin crossed another figure the hidden or
covering stretch is redrawn by copying the nearest clean stretch of the same javelin,
and the other figure gets its pixels back (or, where the javelin covered it, the
colours from the nearer side of the band).
"""
import numpy as np

GRIP_DELAY = 150  # growth steps before the grip hands start growing


def _geom(shape, p0, p1):
    """Distance along (t, in px from p0) and across (d) the line p0 -> p1, for every pixel."""
    H, W = shape
    yy, xx = np.mgrid[0:H, 0:W]
    u = np.subtract(p1, p0, dtype=float)
    L = np.hypot(*u)
    u /= L
    t = (xx - p0[0]) * u[0] + (yy - p0[1]) * u[1]
    d = -(xx - p0[0]) * u[1] + (yy - p0[1]) * u[0]
    return t, d, L, u


def _fit(im, p0, p1, fg=None):
    """Refit a rough line to the shaft centre; returns new end points and the band half width.
    With fg, the tip is moved to the real end of the javelin (the last foreground pixel on the line)."""
    dark = im.min(2) < 110
    light = im.min(2) > 150
    p0, p1 = np.array(p0, float), np.array(p1, float)
    u = (p1 - p0) / np.hypot(*(p1 - p0))
    n = np.array([-u[1], u[0]])
    pts, widths = [], []
    for t in np.arange(0, np.hypot(*(p1 - p0)), 3):
        c = p0 + u * t
        prof = []
        for o in range(-16, 17):
            x, y = np.round(c + n * o).astype(int)
            ok = 0 <= y < im.shape[0] and 0 <= x < im.shape[1]
            prof.append((dark[y, x] if ok else False, light[y, x] if ok else False))
        # light run framed by dark on both sides, nearest the rough centre
        best = None
        o = 0
        while o < len(prof):
            if prof[o][1]:
                e = o
                while e + 1 < len(prof) and prof[e + 1][1]:
                    e += 1
                if 3 <= e - o + 1 <= 14 and o > 0 and e + 1 < len(prof) and prof[o - 1][0] and prof[e + 1][0]:
                    mid = (o + e) / 2 - 16
                    if best is None or abs(mid) < abs(best[0]):
                        best = (mid, e - o + 1)
                o = e + 1
            else:
                o += 1
        if best and abs(best[0]) < 8:
            pts.append(c + n * best[0])
            widths.append(best[1])
    pts = np.array(pts)
    if len(pts) < 8:
        return p0, p1, 8
    # total least squares line through the centres
    m = pts.mean(0)
    _, _, vt = np.linalg.svd(pts - m)
    v = vt[0] if vt[0] @ u > 0 else -vt[0]
    q0 = m + v * ((p0 - m) @ v)
    q1 = m + v * ((p1 - m) @ v)
    if fg is not None:
        L = np.hypot(*(q1 - q0))
        for e in np.arange(L - 40, L + 40, .5):
            x, y = np.round(q0 + v * e).astype(int)
            if 0 <= y < fg.shape[0] and 0 <= x < fg.shape[1] and fg[max(0, y - 1):y + 2, max(0, x - 1):x + 2].any():
                q1 = q0 + v * e
    return q0, q1, float(np.median(widths)) / 2 + 3.5


def fit_line(im, fg, p0, p1):
    """Tail and tip of a javelin drawn roughly from p0 (tail) to p1 (tip), fitted to the sheet."""
    q0, q1, _ = _fit(im, p0, p1, fg)
    return q0, q1


def split(im, fg, lines, flood):
    """im: sheet RGB (int); fg: foreground mask; lines: [((x0, y0), (x1, y1)), ...] tail -> tip, one per figure
    left to right (None for a figure without a javelin).
    Returns [(mask, rgb, (tail, tip) or None), ...] per figure, in the order of the lines, each with its own javelin."""
    H, W = fg.shape
    f = im / 255
    mx, mn = f.max(2), f.min(2)
    s = (mx - mn) / np.maximum(mx, 1e-6)
    javlike = (s < .3) | (mx < .45)  # white/grey shaft, black outline (the red grip stays with the hand)
    n = len(lines)
    owner = [k for k, ln in enumerate(lines) if ln]  # figure holding each javelin
    ends_of = [None] * n
    bands, ends = [], []
    for p0, p1 in (ln for ln in lines if ln):
        q0, q1, hw = _fit(im, p0, p1, fg)
        ends.append((q0, q1))
        t, d, L, u = _geom((H, W), q0, q1)
        band = (np.abs(d) <= hw) & (t >= -4) & (t <= L + 4)
        bands.append((band, t, d, L, hw))
    # where each grip starts: the javelin's tail (before the grip) is what crosses the neighbours
    red = ((f[..., 0] == mx) & (s > .5) & (mx > .35) & (((f[..., 1] - f[..., 2]) / np.maximum(mx - mn, 1e-6)) < .4))
    grips = []
    for band, t, d, L, hw in bands:
        g = band & red & (np.abs(d) <= hw - 3) & (t > 10) & (t < L * .8)
        # the grip is the red stretch nearest the tip (red further back is a shirt the tail crosses)
        ts = np.unique(np.round(t[g]).astype(int))
        start = L * .4
        if len(ts):
            start = ts[-1]
            for v in ts[::-1]:
                if start - v > 3:
                    break
                start = v
        grips.append(float(start))
    lifted = np.zeros_like(fg)
    for band, *_ in bands:
        lifted |= band & fg & javlike
    # seeds: shorts and hair of each figure, left to right (the javelins come in the same order)
    dark = fg & (mx > .07) & (mx < .35) & (s < .4) & ~lifted
    hue = np.where(mx == f[..., 0], ((f[..., 1] - f[..., 2]) / np.maximum(mx - mn, 1e-6)) % 6 * 60, 180)
    hair = fg & (hue >= 5) & (hue < 50) & (s > .3) & (mx < .62) & (mx > .09) & ~lifted
    shorts = _big_blobs(dark, flood, n)
    shorts.sort(key=lambda b: np.nonzero(b)[1].mean())
    sx = [np.nonzero(b)[1].mean() for b in shorts]
    seeds = [b.copy() for b in shorts]
    grip_seeds = [(np.zeros_like(fg), np.zeros_like(fg)) for _ in range(n)]
    for j, (band, t, d, L, hw) in enumerate(bands):  # the hand around the grip belongs to the javelin's owner
        zone = fg & ~lifted & (t >= grips[j] - 12) & (t < grips[j] + 45)
        grip_seeds[owner[j]] = (zone & (np.abs(d) <= hw + 6), zone & (np.abs(d) <= hw + 14))
        ends_of[owner[j]] = ends[j]
    for b in _big_blobs(hair, flood, 3 * n, min_px=400):
        k = int(np.argmin([abs(np.nonzero(b)[1].mean() - x) for x in sx]))
        seeds[k] |= b
    # each figure grows from its seeds through the sheet, blocked by every javelin tail and by the other figures' javelins;
    # every pixel goes to the figure that reaches it first
    # where a javelin crosses a body (body colours on both sides of the band) the figures may step across it,
    # so an arm cut off by a javelin in front of it still joins its body
    body = fg & ~javlike
    bridges = []
    for band, t, d, L, hw in bands:
        side = []
        for sgn in (1, -1):
            edge = (np.abs(d - sgn * (hw + 3)) <= 1.5) & body
            hit = np.zeros(int(L) + 20, bool)
            hit[np.clip(t[edge].astype(int) + 8, 0, len(hit) - 1)] = True
            side.append(hit)
        ok = side[0] & side[1]
        bridges.append(band & ok[np.clip(t.astype(int) + 8, 0, len(ok) - 1)])
    allowed = []
    for k in range(n):
        a = fg.copy()
        for j, (band, t, d, L, hw) in enumerate(bands):
            a &= ~(band & javlike & ((t < grips[j]) | (owner[j] != k)) & ~bridges[j])
        allowed.append(a)
    # the grip hands start late: a neighbour's front hand touching them is reached first from its own body
    # (the fingers right around the grip are taken at once but only start growing then)
    # first without crossing the black outlines (where two figures touch, their outlines keep them apart),
    # then the outlines go to whichever figure reaches them first
    ink = mx < .12
    label = _grow([(s, 0, 0) for s in seeds] + [(g[0], 0, GRIP_DELAY) for g in grip_seeds]
                  + [(g[1], GRIP_DELAY, GRIP_DELAY) for g in grip_seeds], [a & ~ink for a in allowed] * 3)
    label = np.where(label >= 0, label % n, -1)
    label = _grow([(label == k, 0, 0) for k in range(n)], allowed)
    label[lifted] = -1
    figs = [label == k for k in range(n)]

    def inside(k, band, t, d, hw):
        """Band pixels lying inside figure k's silhouette (figure k on both sides of the band)."""
        side = np.zeros(int(t[band].max()) + 10, int)
        for sgn, bit in ((1, 1), (-1, 2)):
            edge = (np.abs(d - sgn * (hw + 3)) <= 1.5) & (label == k)
            ts = np.clip(t[edge].astype(int), 0, len(side) - 1)
            hit = np.zeros(len(side), bool)
            hit[ts] = True
            side[hit] |= bit
        ti = np.clip(t.astype(int), 0, len(side) - 1)
        return band & (side[ti] == 3)

    out = []
    for k, b in enumerate(figs):
        rgb = im.copy()
        m = b.copy()
        for j, (band, t, d, L, hw) in enumerate(bands):
            if owner[j] == k:
                continue
            ins = inside(k, band, t, d, hw)
            # javelin passing behind figure k: k's own pixels; passing over it: colours from the nearer side
            keep = ins & fg & ~javlike
            m |= keep
            cover = ins & ~keep
            if cover.any():
                ys, xs = np.nonzero(cover)
                for y, x in zip(ys, xs):  # colour from the nearer side
                    rgb[y, x] = im[_step(t, d, y, x, hw + 2, band.shape, sign=1 if d[y, x] >= 0 else -1)]
                m |= cover
        for j, (band, t, d, L, hw) in enumerate(bands):
            if owner[j] != k:
                continue
            own_in = inside(k, band, t, d, hw)
            hidden = np.zeros_like(band)
            for kk in range(len(figs)):
                if kk != k:
                    hidden |= inside(kk, band, t, d, hw)
            hidden &= ~own_in
            m |= band & fg & ~hidden & (javlike | red | (label == k))
            # the tail, wherever anything but its own shaft shows across the band (another figure in front,
            # or behind it and lifted with it), is redrawn from the median cross-section of its clean stretches
            ti = np.round(t).astype(int)
            tail = band & (ti < grips[j] - 2) & (label != k)
            other = (label >= 0) & (label != k)
            bad_px = tail & (other | hidden | (fg & ~javlike))
            nb = np.bincount(np.clip(ti[tail], 0, None), bad_px[tail], minlength=int(L) + 10)
            rows = np.arange(len(nb))
            seen = np.bincount(np.clip(ti[tail], 0, None), minlength=len(nb)) > 0
            good = seen & (nb == 0) & (rows > 20) & (rows < grips[j] - 10)
            if good.sum() >= 5:
                di = np.round(d).astype(int)
                ref = tail & good[np.clip(ti, 0, len(good) - 1)]
                prof_rgb, prof_a = {}, {}
                for o in range(int(-hw) - 1, int(hw) + 2):
                    sel = ref & (di == o)
                    if sel.any():
                        prof_rgb[o] = np.median(im[sel], 0)
                        prof_a[o] = fg[sel].mean()
                redo = tail & ~good[np.clip(ti, 0, len(good) - 1)] & (nb[np.clip(ti, 0, len(nb) - 1)] > 0) & (ti > 3)
                for o in prof_rgb:
                    sel = redo & (di == o)
                    rgb[sel] = prof_rgb[o]
                    m[sel] = prof_a[o] > .5
        # drop specks left over from the neighbours
        left = m.copy()
        for sy, sx in zip(*np.nonzero(m)):
            if left[sy, sx]:
                piece = flood(left, [(sy, sx)])
                left &= ~piece
                if piece.sum() < 200:
                    m &= ~piece
        out.append((m, rgb, ends_of[k]))
    return out


def _dir(t, shape):
    """Unit direction of increasing t (t is linear in x and y)."""
    return float(t[0, 1] - t[0, 0]), float(t[1, 0] - t[0, 0])


def _step(t, d, y, x, dist, shape, sign):
    """Pixel just outside the band on one side, straight across from (y, x)."""
    nx, ny = float(d[0, 1] - d[0, 0]), float(d[1, 0] - d[0, 0])
    k = sign * dist - d[y, x]
    return (int(np.clip(round(y + ny * k), 0, shape[0] - 1)), int(np.clip(round(x + nx * k), 0, shape[1] - 1)))


def _big_blobs(mask, flood, n, min_px=0):
    left, blobs = mask.copy(), []
    for sy, sx in zip(*np.nonzero(mask)):
        if left[sy, sx]:
            m = flood(left, [(sy, sx)])
            left &= ~m
            if m.sum() >= min_px:
                blobs.append(m)
    blobs.sort(key=lambda b: -b.sum())
    return blobs[:n]


def _grow(seeds, allowed):
    """Breadth-first growth of several labelled regions at once, each only through its allowed mask.
    seeds: [(mask, step taken, step it starts growing), ...]; a seed pixel already taken stays with its taker."""
    H, W = allowed[0].shape
    lab = np.full((H, W), -1).tolist()
    al = [a.tolist() for a in allowed]
    pending = sorted(range(len(seeds)), key=lambda k: seeds[k][1])
    front, step, sleeping = [], 0, []
    while front or pending or sleeping:
        while pending and seeds[pending[0]][1] <= step:
            k = pending.pop(0)
            for y, x in zip(*np.nonzero(seeds[k][0] & allowed[k])):
                if lab[y][x] < 0:
                    lab[y][x] = k
                    sleeping.append((seeds[k][2], y, x, k))
        front += [(y, x, k) for s, y, x, k in sleeping if s <= step]
        sleeping = [e for e in sleeping if e[0] > step]
        nxt = []
        for y, x, k in front:
            a = al[k]
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < H and 0 <= nx < W and lab[ny][nx] < 0 and a[ny][nx]:
                    lab[ny][nx] = k
                    nxt.append((ny, nx, k))
        front, step = nxt, step + 1
    return np.array(lab)
