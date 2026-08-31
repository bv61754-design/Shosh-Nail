"""Recolour a REAL nail in place. Nothing is drawn: the silhouette, the edge,
   the gloss, the shadow and the cloth all stay exactly as photographed.
   Only C changes in  P = C.d + s."""
import numpy as np, sys
from PIL import Image
from scipy import ndimage as nd

def decompose(a, m):
    grey = a.mean(2)
    chrom = a - grey[..., None]
    q = np.linalg.norm(chrom, axis=2)
    sel = m & (q > np.percentile(q[m], 55))
    c = chrom[sel].mean(0); chat = c / np.linalg.norm(c)
    proj = (chrom * chat).sum(2)
    K = np.percentile(proj[m], 85)
    d = np.clip(proj / K, 0, None)
    ok = m & (d > 0.35)
    G = np.percentile(grey[ok] / d[ok], 3)
    s = np.clip(grey - d * G, 0, None)
    C = chat * K + G
    rec = np.clip(C[None, None, :] * d[..., None] + s[..., None], 0, 1)
    return d, s, C, float(np.abs(rec - a)[m].mean())

a = np.asarray(Image.open('refs/gloss-nail-1.png').convert('RGB')).astype(np.float64)/255
# The nail is WARM against a cold cloth. Thresholding on luminance loses the
# shadowed side of the nail, which then shows the old polish as a crescent.
warm = a[...,0] - a[...,2]
m = warm > 0.05
m = nd.binary_opening(m, np.ones((7,7))); m = nd.binary_closing(m, np.ones((21,21)))
m = nd.binary_fill_holes(m)
lab,n = nd.label(m); sz = nd.sum(m,lab,range(1,n+1)); m = lab==(1+int(np.argmax(sz)))
# feather the mask so the composite has no hard seam — the photo's own edge stays
soft = nd.gaussian_filter(m.astype(float), 1.4)[..., None]

d, s, C, err = decompose(a, m)
print('decomposed: reconstruction error %.4f   original polish #%02X%02X%02X'
      % (err, *[int(np.clip(x,0,1)*255) for x in C]))

TARGETS = [('#E9C2C0','Rosy Nude'), ('#C0392B','Red'), ('#1B1B1F','Onyx'),
           ('#6B4E8E','Purple'), ('#2E6F6A','Emerald'), ('#E8D2B8','Sand')]
outs = [(np.clip(a,0,1), 'PHOTOGRAPH')]
for hexc, name in TARGETS:
    Cn = np.array([int(hexc[1+2*i:3+2*i],16)/255 for i in range(3)])
    # keep the new colour's own brightness relative to the measured one
    rec = np.clip(Cn[None,None,:]*d[...,None] + s[...,None], 0, 1)
    outs.append((a*(1-soft) + rec*soft, name))

H,W = a.shape[:2]
cols = 4; rows = (len(outs)+cols-1)//cols
sheet = Image.new('RGB', (W*cols, H*rows), (14,14,14))
from PIL import ImageDraw, ImageFont
dr = ImageDraw.Draw(sheet)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 46)
for i,(img,name) in enumerate(outs):
    px = Image.fromarray((np.clip(img,0,1)*255).astype(np.uint8))
    x0,y0 = (i%cols)*W, (i//cols)*H
    sheet.paste(px, (x0,y0))
    dr.rectangle([x0,y0,x0+W-1,y0+H-1], outline=(30,30,30), width=4)
    dr.text((x0+24, y0+18), name, fill=(0,0,0), font=F, stroke_width=5, stroke_fill=(255,255,255))
sheet = sheet.resize((sheet.width//2, sheet.height//2), Image.LANCZOS)
sheet.save('recolour/sheet.png')
print('wrote recolour/sheet.png', sheet.size)
