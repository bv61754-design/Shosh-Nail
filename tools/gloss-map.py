"""Turn a photograph of ONE nail into the measured surface in nail-gloss.js.

    python3 tools/gloss-map.py photo.jpg
    python3 tools/gloss-map.py photo.jpg --write      # patch assets/js/nail-gloss.js
    python3 tools/gloss-map.py photo.jpg --preview p.png

HOW TO TAKE THE PHOTOGRAPH. One press-on nail, nothing else in the frame, lying
flat on a dark cloth, shot from DIRECTLY ABOVE. Daylight from a window, no
flash, no lamp pointed at it. A mid-tone colour - not black, not white - because
the maths below recovers the shading from the nail's own colour, and a colour
too close to grey has nothing to recover it from. Fill the frame. Focus.

WHAT IT DOES. Write a pixel as

    P = C.d + s

with C the polish's own colour, d the diffuse shading and s a white specular.
The chromatic part of P - P minus its own grey - is C.d alone, because s is grey
and cancels; so d comes straight off the chroma and s is whatever grey is left.
The script prints the reconstruction error, and if that number is not tiny the
photograph broke one of the rules above.

d is what ships. It is warped out of the nail's silhouette into a plain
rectangle (every row stretched to the full width, so "across the nail" means the
same thing on every shape), the cuticle end - which in this pose catches a hard
reflection that a worn nail never has - is faded out, and the result is
re-centred so the typical pixel renders the chosen colour exactly.

s is thrown away on purpose. See the header of assets/js/nail-gloss.js.

Needs numpy, scipy and Pillow.
"""

import argparse, base64, io, pathlib, re, sys

import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGET = ROOT / 'assets' / 'js' / 'nail-gloss.js'
OUT_W, OUT_H = 192, 288          # what ships
UV_W, UV_H = 192, 288            # working resolution before the final resize


def segment(a):
    """The nail against a dark cloth: warmer than its background and lighter."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    m = ((r - b) > 0.045) & (lum > 0.22)
    m = nd.binary_closing(m, np.ones((9, 9)))
    m = nd.binary_fill_holes(m)
    m = nd.binary_opening(m, np.ones((9, 9)))
    lab, n = nd.label(m)
    if n == 0:
        sys.exit('no nail found: is the background dark and the nail in focus?')
    sizes = nd.sum(m, lab, range(1, n + 1))
    m = nd.binary_fill_holes(lab == int(np.argmax(sizes)) + 1)
    if m.mean() < 0.02:
        sys.exit('the nail fills less than 2% of the frame - move closer')
    return m


def upright(a, m):
    """Rotate so the nail runs cuticle (bottom) to free edge (top)."""
    ys, xs = np.nonzero(m)
    X = np.stack([xs - xs.mean(), ys - ys.mean()]).astype(np.float64)
    w, v = np.linalg.eigh(X @ X.T / X.shape[1])
    major = v[:, int(np.argmax(w))]
    rot = -np.degrees(np.arctan2(major[1], major[0])) + 90.0
    mr = nd.rotate(m.astype(np.float32), rot, reshape=True, order=1, cval=0.0) > 0.5
    ar = np.stack([nd.rotate(a[..., i], rot, reshape=True, order=1, cval=0.0)
                   for i in range(3)], axis=-1)
    ys, xs = np.nonzero(mr)
    mr = mr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    ar = ar[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    rw = mr.sum(1)
    h = len(rw)
    if rw[:h // 3].mean() > rw[-h // 3:].mean():   # the tip is the NARROW end
        mr, ar = mr[::-1], ar[::-1]
    return ar, mr


def decompose(a, m):
    """P = C.d + s. Returns d, s and the reconstruction error."""
    grey = a.mean(2)
    chrom = a - grey[..., None]
    q = np.linalg.norm(chrom, axis=2)
    sel = m & (q > np.percentile(q[m], 55))
    c = chrom[sel].mean(0)
    chat = c / np.linalg.norm(c)
    proj = (chrom * chat).sum(2)
    K = np.percentile(proj[m], 85)
    d = np.clip(proj / K, 0, None)
    ok = m & (d > 0.35)
    G = np.percentile(grey[ok] / d[ok], 3)
    s = np.clip(grey - d * G, 0, None)
    C = chat * K + G
    rec = np.clip(C[None, None, :] * d[..., None] + s[..., None], 0, 1)
    return d, s, G, float(np.abs(rec - a)[m].mean())


def to_uv(m, d, s, G):
    """Row-normalise into a rectangle: u = across the nail HERE, v = along it."""
    H = m.shape[0]
    rows = []
    for y in range(H):
        xs = np.nonzero(m[y])[0]
        rows.append((xs[0], xs[-1]) if len(xs) > 6 else None)
    first = next(i for i, r in enumerate(rows) if r)
    last = H - 1 - next(i for i, r in enumerate(reversed(rows)) if r)

    d_ref, s_ref = float(np.median(d[m])), float(np.median(s[m]))
    M = (d + np.minimum(s, s_ref) / G) / (d_ref + s_ref / G)   # multiply map, 1 at the reference
    S = np.maximum(s - s_ref, 0.0)                             # what is left is the reflection

    INSET = 0.022        # the outermost pixels are the cloth's anti-aliased edge
    u = np.linspace(0, 1, UV_W)
    oM = np.zeros((UV_H, UV_W), np.float64)
    oS = np.zeros((UV_H, UV_W), np.float64)
    for j in range(UV_H):
        y0 = int(np.clip(round(first + (last - first) * j / (UV_H - 1)), first, last))
        a_, b_ = rows[y0] or rows[first]
        span = b_ - a_
        xs = a_ + span * INSET + span * (1 - 2 * INSET) * u
        yy = np.full(UV_W, float(y0))
        oM[j] = nd.map_coordinates(M, [yy, xs], order=1, mode='nearest')
        oS[j] = nd.map_coordinates(S, [yy, xs], order=1, mode='nearest')
    return nd.gaussian_filter(oM, 0.45), nd.gaussian_filter(oS, 0.45)


def finish(M):
    """Keep the material, replace the room.

    THE MISTAKE THIS FIXES. The first version of this faded the cuticle end of
    the map to a flat 1.0. That removed the room, but it also left a third of
    every nail with literally no variation in it, and a flat mid-tone is the
    single loudest thing that says "drawn". Measured: 47% of that map had zero
    gradient, against 3.5% for the photograph it came from and 0% for a nail
    shot in a studio.

    So the split is by FREQUENCY, not by position. The low frequencies are the
    room — which window, which angle, which cloth — and only those get
    replaced past the middle of the nail. The high frequencies are the gel
    itself: its lengthwise striations, its milky depth, the grain of the
    surface. Those are the same in any room, and they now run the whole length
    of the plate.
    """
    v = np.linspace(0, 1, UV_H)[:, None]
    # a light pass first: at this resolution a pixel of noise is not detail
    M = nd.gaussian_filter(M, (UV_H * 0.006, UV_W * 0.005), mode='nearest')

    # THREE BANDS, NOT TWO.
    #   fine   below 2% of the width — the grain of the topcoat
    #   mid    2% to 12% — the mottling of the gel, small reflections, the
    #          nail bed showing through. This is the band the eye reads as
    #          "a surface" at the size a nail is actually looked at.
    #   form   above 12% — the shape of the room, and the only band that is
    #          specific to the pose this nail was photographed in.
    # An earlier version split at 2% only and replaced EVERYTHING above it
    # below the cut with a carried cross-section. That is smooth by
    # construction, and it left 22% of a plate with no gradient at all at
    # viewing size. (A single split at 7% was tried before that and failed
    # differently: the reflection here is a window with a hard edge, and a
    # hard edge has every frequency in it, so it survived into the material
    # band and drew a black wedge across all ten nails.)
    # So: only `form` is replaced. `mid` and `fine` are MIRRORED down from the
    # clean half of the nail's own surface — real texture, and nothing shaped
    # like a window can come with them, because the half they come from has
    # no window in it.
    fine = M - nd.gaussian_filter(M, (UV_H * 0.020, UV_W * 0.020), mode='nearest')
    mid = (nd.gaussian_filter(M, (UV_H * 0.020, UV_W * 0.020), mode='nearest')
           - nd.gaussian_filter(M, (UV_H * 0.120, UV_W * 0.120), mode='nearest'))
    form = nd.gaussian_filter(M, (UV_H * 0.120, UV_W * 0.120), mode='nearest')

    # the nail was lying on cloth, which tips its cuticle end toward the
    # window and catches a bright wedge there with a dark one under it. Past
    # the middle, carry the cross-section from the last honest row down
    # instead, shading gently into the cuticle the way a worn nail does.
    cut = int(UV_H * 0.54)
    ref = form[cut - int(UV_H * 0.08):cut].mean(0)
    for j in range(cut, UV_H):
        w = min(1.0, (j - cut) / (UV_H * 0.13))
        t = (j - cut) / float(UV_H - cut)
        form[j] = form[j] * (1 - w) + (ref * (1.0 - 0.085 * t)) * w
        src = max(0, 2 * cut - j)
        mid[j] = mid[src]
        fine[j] = fine[src]
    M = form + mid + fine

    # the free edge is drawn by SN.Nail as its own translucent layer
    tf = np.clip((0.035 - v) / 0.035, 0, 1)
    M = M * (1 - tf) + tf
    M = np.clip(M / float(np.percentile(M, 99.5)), 0, 1)
    M = M / M.mean() * 0.905          # hold the average where it was
    # BITE. Measured against the photograph it came from, the map that ships
    # varies about a quarter less than the real surface does — some of that is
    # resolution, the rest is the two blurs above. Give it back, around the
    # middle so the colour the customer picked does not move.
    M = np.clip(1.0 + (M - 1.0) * 1.12, 0, 1)
    M = np.clip(1 - (1 - M) * 1.18, 0, 1)     # a little more bite in the form
    # the colour the customer picked is the one she must see: re-centre on the
    # middle, not the brightest point, or every shade quietly loses 7%
    return np.clip(M / 1.02, 0, 1)


def uri(M):
    im = Image.fromarray(np.round(M * 255).astype(np.uint8), 'L') \
              .resize((OUT_W, OUT_H), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True, compress_level=9)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('photo')
    ap.add_argument('--write', action='store_true', help='patch assets/js/nail-gloss.js')
    ap.add_argument('--preview', help='write a PNG of the map on four colours')
    args = ap.parse_args()

    a = np.asarray(Image.open(args.photo).convert('RGB')).astype(np.float64) / 255.0
    m = segment(a)
    a, m = upright(a, m)
    d, s, G, err = decompose(a, m)
    print('nail is %d x %d px, %.1f%% of the frame' % (m.shape[1], m.shape[0], 100 * m.mean()))
    print('reconstruction error %.4f  (under 0.01 = the model fits; above it, retake the photo)' % err)
    M, S = to_uv(m, d, s, G)
    print('measured reflection: %.1f%% of the nail above 0.30, peak %.2f of pure white'
          % (100 * (S > 0.3).mean(), S.max()))
    M = finish(M)
    u = uri(M)
    print('map: %d x %d, %d bytes of data URI' % (OUT_W, OUT_H, len(u)))

    if args.preview:
        cols = ((201, 139, 160), (179, 18, 43), (15, 13, 18), (239, 227, 218))
        strip = np.concatenate([np.repeat(M[..., None], 3, 2)] +
                               [np.clip(np.array(c, np.float64)[None, None, :] / 255 * M[..., None], 0, 1)
                                for c in cols], axis=1)
        Image.fromarray((strip * 255).astype(np.uint8)).save(args.preview)
        print('preview ->', args.preview)

    if args.write:
        src = TARGET.read_text(encoding='utf-8')
        new = re.sub(r"shade: '[^']*'", "shade: '" + u + "'", src, count=1)
        if new == src:
            sys.exit('could not find the shade: field in ' + str(TARGET))
        TARGET.write_text(new, encoding='utf-8')
        print('wrote', TARGET)
    else:
        print('(dry run - pass --write to patch assets/js/nail-gloss.js)')


if __name__ == '__main__':
    main()
