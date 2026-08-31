import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd

def profile(mask, lum, N=16, axis='across'):
    ys, xs = np.nonzero(mask)
    X = np.stack([xs - xs.mean(), ys - ys.mean()]).astype(float)
    w, v = np.linalg.eigh(X @ X.T / X.shape[1])
    long = v[:, int(np.argmax(w))]; short = v[:, int(np.argmin(w))]
    d = short if axis == 'across' else long
    t = (xs - xs.mean()) * d[0] + (ys - ys.mean()) * d[1]
    lo, hi = np.percentile(t, 1), np.percentile(t, 99)
    out = []
    for i in range(N):
        a = lo + (hi - lo) * i / N; b = lo + (hi - lo) * (i + 1) / N
        sel = (t >= a) & (t < b)
        out.append(lum[ys[sel], xs[sel]].mean() if sel.sum() > 20 else np.nan)
    p = np.array(out)
    return None if np.isnan(p).any() else p / np.median(p)

mode = sys.argv[1]
if mode == 'ref':
    im = Image.open(sys.argv[2]).convert('RGB'); q = np.asarray(im).astype(float)/255
    l = 0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]
    x0,y0,x1,y1 = map(int, sys.argv[3].split(','))
    m = np.zeros(l.shape, bool); m[y0:y1, x0:x1] = True
    ps = [profile(m, l)]
    name = sys.argv[4]
else:
    png = sys.argv[2]; D = json.load(open(png.replace('.png','.json'))); dsr = D['dsr']
    im = Image.open(png).convert('RGB'); q = np.asarray(im).astype(float)/255
    l = 0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]
    ps = []
    for poly in D['polys']:
        mk = Image.new('L', im.size, 0)
        ImageDraw.Draw(mk).polygon([(x*dsr, y*dsr) for x,y in poly], fill=255)
        ER = int(sys.argv[4]) if len(sys.argv)>4 else 3
        mm = nd.binary_erosion(np.asarray(mk) > 128, np.ones((ER,ER)))
        if mm.sum() < 800: continue
        p = profile(mm, l)
        if p is not None:
            if p[:len(p)//2].mean() > p[len(p)//2:].mean(): p = p[::-1]
            ps.append(p)
    name = sys.argv[3]
O = np.nanmean(np.array(ps), 0)
if O[:4].mean() > O[-4:].mean(): O = O[::-1]
print('%-12s across: %s'%(name, ' '.join('%.2f'%x for x in O)))
print('%-12s         darkWall/centre %.2f   litWall/centre %.2f   swing %.2f'%(
    '', O[:2].mean()/O[6:10].mean(), O[-2:].mean()/O[6:10].mean(), O.max()/O.min()))
