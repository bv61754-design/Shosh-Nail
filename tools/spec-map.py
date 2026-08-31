"""Harvest real reflections off the shop's own product photograph.

    python3 tools/spec-map.py refs/shosh-cateye-post.jpg
    python3 tools/spec-map.py refs/shosh-cateye-post.jpg --write

WHY THIS EXISTS. tools/gloss-map.py splits one photographed nail into
P = C.d + s and ships d. It throws s — the specular — away, because that
photograph was taken with the nail lying flat under a wide window, and a wide
window does not make a highlight, it makes a 92%-coverage veil sitting in the
wrong place. Measured, the plate that came out of that had its brightest pixel
at 1.18x its own body against 1.78-2.14x for a real press-on, nothing above 3x
its median anywhere (a real nail: 4-31% of its area), and a highlight edge 13x
too soft. Nothing on it was white. That is most of what still read as a
drawing.

WHAT THIS DOES INSTEAD. The shop photographs its own work properly: black gel
under a strip light, shot upright. Black gel has no pigment to speak of, so its
image very nearly IS the reflection — and the reflection is the shape of the
light, which is the same shape whatever colour the polish underneath is. So
this pulls the reflections straight out of that photograph, one per nail, and
they go on the site as an ADDITIVE layer:

    out = colour x SHADE + REFLECTION

A reflection is white. That one fact is what makes this cheap: it is
independent of all 45 colours, 8 shapes, 4 lengths, 6 finishes, 22 patterns
and 43 charms. One small greyscale sheet covers the whole catalogue.

Five nails in the frame means five DIFFERENT reflections, which is the other
half of the job: ten fingers wearing one reflection is the most artificial
thing a render can do, and five real ones dealt round the hand is not.

The glitter is filtered out on the way — glitter is thousands of isolated
specks and belongs to that design, while a reflected strip light is one
connected object. Anything too small to be a reflection is dropped, or every
nail on the site would inherit this nail's glitter.

Needs numpy, scipy and Pillow.
"""

import argparse, base64, io, pathlib, re, sys

import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGET = ROOT / 'assets' / 'js' / 'nail-gloss.js'
UW, UH = 96, 144
HALO_K, HALO_SIG = 0.34, 0.05          # one tile, in the same UV rectangle as the shade map


def nails(a):
    """The press-ons: near-black objects, taller than wide, against bokeh."""
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    m = (lum < 0.62) & ((a[..., 0] - a[..., 2]) < 0.16)
    m[:int(m.shape[0] * 0.19)] = False           # app chrome across the top
    m = nd.binary_opening(nd.binary_closing(m, np.ones((9, 9))), np.ones((7, 7)))
    m = nd.binary_fill_holes(m)
    lab, k = nd.label(m)
    out = []
    for i in range(1, k + 1):
        b = lab == i
        if b.sum() < 4000:
            continue
        ys, xs = np.nonzero(b)
        h, w = ys.max() - ys.min(), xs.max() - xs.min()
        if h < 100 or w < 40 or not (1.4 < h / w < 4.0):
            continue
        out.append((xs.mean(), b))
    out.sort(key=lambda t: t[0])
    return [b for _, b in out], lum


def unwrap(lum, m):
    """Row-normalise into the same UV rectangle SN.Gloss.shade lives in."""
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    sub, sm = lum[y0:y1 + 1, x0:x1 + 1], m[y0:y1 + 1, x0:x1 + 1]
    rows = []
    for y in range(sm.shape[0]):
        r = np.nonzero(sm[y])[0]
        rows.append((r[0], r[-1]) if len(r) > 4 else None)
    first = next(j for j, r in enumerate(rows) if r)
    last = sm.shape[0] - 1 - next(j for j, r in enumerate(reversed(rows)) if r)
    uv = np.zeros((UH, UW))
    u = np.linspace(0, 1, UW)
    for j in range(UH):
        y = int(np.clip(round(first + (last - first) * j / (UH - 1)), first, last))
        A, B = rows[y] or rows[first]
        span = B - A
        uv[j] = nd.map_coordinates(sub, [np.full(UW, float(y)), A + span * 0.03 + span * 0.94 * u],
                                   order=1, mode='nearest')
    return uv


def reflection(uv):
    """For a near-black gel the luminance IS very nearly the reflection, so the
       honest operation is a black point, not a high-pass.

       WHAT THIS FIXES. The first version high-passed the tile and kept what
       stood above the 85th percentile. That finds the CORES of the bars and
       throws their shoulders away, and the shoulders are most of a reflection:
       against the source photograph the sheet was three times short above 0.6
       of white, four times short above 0.85 and five times short above 0.95.
       On the site that showed up as a plate that never reached three times its
       own median anywhere, where a real nail has four per cent of its area up
       there.

       The black point sits above the cat-eye band on purpose. That band is
       pigment doing something clever, not the shape of the light, and it
       belongs in the design rather than on every nail on the site."""
    black = np.percentile(uv, 78)
    s = np.clip((uv - black) / max(1e-6, 1.0 - black), 0, 1)
    # glitter is thousands of isolated specks; a reflected strip light is one
    # connected object. Anything too small to be a reflection is dropped, or
    # every nail on the site inherits this nail's glitter.
    lab, k = nd.label(s > 0.12)
    if k:
        sz = nd.sum(s > 0.12, lab, range(1, k + 1))
        big = np.zeros_like(s, bool)
        for q in range(k):
            if sz[q] >= 0.004 * UW * UH:
                big |= lab == q + 1
        s = s * nd.binary_dilation(big, np.ones((5, 5)))
    # The blur takes the sensor's own speckle off a reflection that is a smooth
    # object, and the price of it is the top of the reflection: a gaussian is a
    # mean, and the peak of a small bright thing is exactly what a mean removes.
    # Measured against the four nails of the source photograph that a box fits
    # cleanly inside, black-pointed by this same rule, the shipped tiles matched
    # it above 0.60 (6.2-8.0% of the tile against 5.1-10.4%) and above 0.85
    # (1.5-2.8% against 0.6-4.3%), and were three to four times short above 0.95
    # (0.04-0.33% against 0.13-1.29%) — never reaching white at all, 0.965-0.973
    # against 0.992-1.000. A reflected strip light IS white where it is
    # brightest, and "nothing on it was white" is the exact complaint this whole
    # sheet exists to answer. So the blur keeps its shape and gives the peak
    # back.
    hi = float(s.max())
    s = nd.gaussian_filter(s, 0.9)
    if s.max() > 1e-6:
        s = s * (hi / s.max())
    # A real reflection is not just its core. Measured out from the centre of
    # one, a real nail is still at 1.66x its own base three units away and
    # 1.38x at six; the drawn ellipse this replaces had fallen to nothing by
    # then. That surrounding pool of light is what reads as WET.
    halo = nd.gaussian_filter(s, (UH * HALO_SIG, UW * HALO_SIG))
    s = np.maximum(s, HALO_K * halo / max(1e-6, halo.max()))
    return np.clip(s, 0, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('photo')
    ap.add_argument('--write', action='store_true')
    ap.add_argument('--preview')
    ap.add_argument('--halo', type=float)
    ap.add_argument('--halosig', type=float)
    args = ap.parse_args()
    global HALO_K, HALO_SIG
    if args.halo is not None: HALO_K = args.halo
    if args.halosig is not None: HALO_SIG = args.halosig

    a = np.asarray(Image.open(args.photo).convert('RGB')).astype(np.float64) / 255
    masks, lum = nails(a)
    if len(masks) < 3:
        sys.exit('found only %d nails — this wants a frame with several in it' % len(masks))
    tiles = [reflection(unwrap(lum, m)) for m in masks]
    for i, s in enumerate(tiles):
        print('reflection %d: %.1f%% above 0.3, %.1f%% above 0.6, %.2f%% above 0.95, peak %.3f'
              % (i + 1, 100 * (s > 0.3).mean(), 100 * (s > 0.6).mean(),
                 100 * (s > 0.95).mean(), s.max()))

    sheet = np.concatenate(tiles, axis=1)
    im = Image.fromarray(np.round(np.clip(sheet, 0, 1) * 255).astype(np.uint8), 'L')
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True, compress_level=9)
    uri = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    print('sheet: %d tiles of %dx%d, %d bytes of data URI' % (len(tiles), UW, UH, len(uri)))

    if args.preview:
        Image.fromarray((np.clip(sheet, 0, 1) * 255).astype(np.uint8)).save(args.preview)
        print('preview ->', args.preview)

    if args.write:
        src = TARGET.read_text(encoding='utf-8')
        new = re.sub(r"specN: \d+", "specN: %d" % len(tiles), src, count=1)
        new = re.sub(r"spec: '[^']*'", "spec: '" + uri + "'", new, count=1)
        if new == src:
            sys.exit('could not find specN/spec in ' + str(TARGET))
        TARGET.write_text(new, encoding='utf-8')
        print('wrote', TARGET)
    else:
        print('(dry run — pass --write)')


if __name__ == '__main__':
    main()
