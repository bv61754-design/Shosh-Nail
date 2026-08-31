import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd

def cells(l, m, N, label):
    """dead-flat fraction in a 4x6 grid of the nail's own frame (across x along)"""
    g = np.hypot(*np.gradient(nd.gaussian_filter(l / np.median(l[m]), 1.2))) * N * 0.01
    ys, xs = np.nonzero(m)
    P = np.stack([xs - xs.mean(), ys - ys.mean()]).astype(float)
    C = P @ P.T / P.shape[1]; w, v = np.linalg.eigh(C)
    lon = v[:, int(np.argmax(w))]; sho = v[:, int(np.argmin(w))]
    t = P.T @ lon; u = P.T @ sho
    t = (t - t.min()) / (t.max() - t.min()); u = (u - u.min()) / (u.max() - u.min())
    # cuticle (wide) end at 0
    if np.abs(u[t < 0.15] - 0.5).mean() < np.abs(u[t > 0.85] - 0.5).mean(): t = 1 - t
    gv = g[ys, xs] < 0.004
    out = np.full((6, 4), np.nan)
    for i in range(6):
        for j in range(4):
            sel = (t >= i / 6.) & (t < (i + 1) / 6.) & (u >= j / 4.) & (u < (j + 1) / 4.)
            if sel.sum() > 12: out[i, j] = gv[sel].mean()
    print('%s   overall %.1f%%' % (label, 100 * gv.mean()))
    print('   tip  ' + '  '.join('%5s' % ('%.0f%%' % (100 * x) if x == x else '-') for x in out[0]))
    for i in range(1, 5):
        print('        ' + '  '.join('%5s' % ('%.0f%%' % (100 * x) if x == x else '-') for x in out[i]))
    print('   cut  ' + '  '.join('%5s' % ('%.0f%%' % (100 * x) if x == x else '-') for x in out[5]))

mode = sys.argv[1]
if mode == 'ours':
    png = sys.argv[2]; D = json.load(open(png.replace('.png', '.json'))); dsr = D['dsr']
    q = np.asarray(Image.open(png).convert('RGB')).astype(float) / 255
    l = 0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]
    idx = int(sys.argv[3])
    poly = D['polys'][idx]
    mk = Image.new('L', (q.shape[1], q.shape[0]), 0)
    ImageDraw.Draw(mk).polygon([(x*dsr, y*dsr) for x, y in poly], fill=255)
    m = nd.binary_erosion(np.asarray(mk) > 128, np.ones((3,3)))
    ys, xs = np.nonzero(m)
    P = np.stack([xs-xs.mean(), ys-ys.mean()]).astype(float)
    C = P@P.T/P.shape[1]; w, v = np.linalg.eigh(C)
    u = P.T@v[:, int(np.argmin(w))]
    cells(l, m, u.max()-u.min(), 'OURS plate %d (%.0f px)' % (idx, u.max()-u.min()))
else:
    N = int(sys.argv[2])
    q = np.asarray(Image.open('refs/gloss-nail-1.png').convert('RGB')).astype(float)/255
    l = 0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]
    m = l > 0.28
    m = nd.binary_opening(m, np.ones((9,9))); m = nd.binary_closing(m, np.ones((15,15)))
    lab, n = nd.label(m); sz = nd.sum(m, lab, range(1, n+1)); m = lab == (1+int(np.argmax(sz)))
    ys, xs = np.nonzero(m); y0,y1,x0,x1 = ys.min(), ys.max()+1, xs.min(), xs.max()+1
    sub = l[y0:y1, x0:x1]; sm = m[y0:y1, x0:x1]; k = N/432.
    h2, w2 = int(sub.shape[0]*k), int(sub.shape[1]*k)
    s2 = np.asarray(Image.fromarray((sub*255).astype(np.uint8)).resize((w2,h2), Image.LANCZOS)).astype(float)/255
    m2 = np.asarray(Image.fromarray((sm*255).astype(np.uint8)).resize((w2,h2), Image.LANCZOS)) > 128
    m2 = nd.binary_erosion(m2, np.ones((3,3)))
    cells(s2, m2, N, 'REF plain @%d px' % N)
