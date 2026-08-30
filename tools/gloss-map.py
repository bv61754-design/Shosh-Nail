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
OUT_W, OUT_H = 128, 192          # what ships
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
    return nd.gaussian_filter(oM, 0.8), nd.gaussian_filter(oS, 0.8)


def finish(M):
    v = np.linspace(0, 1, UV_H)[:, None]
    # a nail is a section of a cylinder: it smears what it reflects along its
    # own length, and the photograph's own curvature already started the job
    M = nd.gaussian_filter(M, (UV_H * 0.014, UV_W * 0.008), mode='nearest')
    # the cuticle end of a nail lying on cloth tips toward the window; a worn
    # nail has nothing there, so it fades out
    fade = np.clip((v - 0.58) / 0.22, 0, 1)
    M = M * (1 - fade) + fade
    # the free edge is drawn by SN.Nail as its own translucent layer
    tf = np.clip((0.035 - v) / 0.035, 0, 1)
    M = M * (1 - tf) + tf
    M = np.clip(M / float(np.percentile(M, 99.5)), 0, 1)
    M = np.clip(1 - (1 - M) * 1.18, 0, 1)     # a little more bite in the form
    # the colour the customer picked is the one she must see: re-centre on the
    # middle, not the brightest point, or every shade quietly loses 7%
    return np.clip(M / 0.94, 0, 1)


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
