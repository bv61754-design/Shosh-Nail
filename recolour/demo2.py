"""Recolour a real nail WITHOUT flattening its hue.

   The old model was  out = C.d + s  with C a single flat colour. Adding a grey
   s to a scalar multiple of one colour leaves exactly ONE hue everywhere — HSV
   hue is invariant under adding a constant to all three channels — and a real
   nail is not one hue. Measured on this photograph, inside the nail, where the
   chroma is meaningful (99.2% of it): the chroma DIRECTION has a standard
   deviation of 5.33 degrees and drifts systematically with brightness, from
   -1.0 in the darkest eighth to -11.0 in the brightest. The old recolour
   measured 0.00. That is the whole "it is obviously drawn".

   So: keep the photograph's own chroma vector per pixel. Rotate it to the new
   colour's hue and scale it to the new colour's chroma. The wander rides along
   untouched — it belonged to the pigment and the light, not to the colour."""
import numpy as np, sys
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as nd

a = np.asarray(Image.open('refs/gloss-nail-1.png').convert('RGB')).astype(np.float64)/255
warm = a[...,0]-a[...,2]
m = warm > 0.05
m = nd.binary_opening(m, np.ones((7,7))); m = nd.binary_closing(m, np.ones((21,21)))
m = nd.binary_fill_holes(m)
lab,n = nd.label(m); sz = nd.sum(m,lab,range(1,n+1)); m = lab==(1+int(np.argmax(sz)))
soft = nd.gaussian_filter(m.astype(float), 1.4)[..., None]

grey = a.mean(2)
chrom = a - grey[..., None]

# an orthonormal basis of the chroma plane (perpendicular to grey)
u1 = np.array([1.,-1.,0.])/np.sqrt(2)
u2 = np.array([1.,1.,-2.])/np.sqrt(6)
P = np.stack([(chrom*u1).sum(2), (chrom*u2).sum(2)], -1)      # per-pixel 2-vector
mag = np.linalg.norm(P, axis=-1)
ang = np.arctan2(P[...,1], P[...,0])

sel = m & (mag > np.percentile(mag[m], 55))
base = P[sel].mean(0)
base_ang = np.arctan2(base[1], base[0])
base_mag = np.linalg.norm(base)

# the polish's own grey level, from the model that still works: grey = d.G + s
q = np.linalg.norm(chrom, axis=2)
chat = chrom[sel].mean(0); chat = chat/np.linalg.norm(chat)
proj = (chrom*chat).sum(2)
K = np.percentile(proj[m], 85)
d = np.clip(proj/K, 0, None)
ok = m & (d > 0.35)
G = np.percentile(grey[ok]/d[ok], 3)
s = np.clip(grey - d*G, 0, None)
print('original polish grey level %.3f   chroma %.4f   direction %.1f deg'
      % (G, base_mag, np.degrees(base_ang)))

def recolour(hexc):
    Cn = np.array([int(hexc[1+2*i:3+2*i],16)/255 for i in range(3)])
    gn = Cn.mean()
    cn = Cn - gn
    p = np.array([cn@u1, cn@u2])
    na, nm = np.arctan2(p[1], p[0]), np.linalg.norm(p)
    # rotate every pixel's own chroma to the new hue, scale to the new chroma
    A = ang + (na - base_ang)
    M = mag * (nm/max(base_mag,1e-6))
    ch = np.cos(A)[...,None]*u1[None,None,:] + np.sin(A)[...,None]*u2[None,None,:]
    g = (d*gn + s)
    C3 = ch*M[...,None]
    # A pigment cannot remove more light than is falling on it. Carrying the
    # photograph's chroma onto a dark saturated colour drives channels below
    # zero in the shadows, and clipping there rotates the hue exactly the way
    # clipping at the top does: emerald measured 47.6 degrees of spread against
    # the photograph's 5-6. So the chroma is scaled back until the darkest
    # channel just reaches zero — which is saturation reaching 1, the real
    # limit — instead of being cut off after the fact.
    low = -C3.min(-1)
    k = np.clip(np.where(low > 1e-6, g/np.maximum(low,1e-6), 1.0), 0, 1)
    return shoulder(g[...,None] + C3*k[...,None])


KNEE = 0.78

def shoulder(x):
    """A sensor does not clip each channel independently — it rolls the whole
       pixel off toward white, which is why a photograph's highlight keeps its
       hue while a hard per-channel clip rotates it. Measured: clipping took the
       chroma-direction spread of a pale recolour to 20-48 degrees against the
       photograph's 5-6. So: find the pixel's brightest channel, compress THAT
       through a shoulder, and scale all three by the same factor. Hue and the
       ratio between the channels survive exactly; nothing ever reaches 1."""
    mx = x.max(-1)
    over = mx > KNEE
    y = np.where(over, KNEE + (1-KNEE)*np.tanh((mx-KNEE)/max(1e-6,1-KNEE)), mx)
    sc = np.where(mx > 1e-6, y/np.maximum(mx,1e-6), 1.0)
    return np.clip(x*sc[...,None], 0, 1)

TARGETS = [('#E9C2C0','Rosy Nude'),('#C0392B','Red'),('#1B1B1F','Onyx'),
           ('#6B4E8E','Purple'),('#2E6F6A','Emerald'),('#E8D2B8','Sand')]
core = nd.binary_erosion(m, np.ones((15,15)))
good = core & (mag > 0.05/np.sqrt(2))
def huesd(img,label):
    c = img - img.mean(2)[...,None]
    p1 = (c*u1).sum(2); p2 = (c*u2).sum(2)
    th = np.arctan2(p2,p1)[good]
    # CIRCULAR sd — a plain std of an angle is meaningless across the +-180 wrap,
    # and emerald's hue sits exactly on it. That cost one wrong diagnosis.
    R = np.hypot(np.cos(th).mean(), np.sin(th).mean())
    v = np.degrees(np.sqrt(max(0.0, -2*np.log(max(R,1e-12)))))
    print('   %-11s chroma-direction sd %5.2f deg'%(label, v))
huesd(a,'PHOTOGRAPH')
outs=[(a,'PHOTOGRAPH')]
for hexc,name in TARGETS:
    r = recolour(hexc); huesd(r,name)
    outs.append((a*(1-soft)+r*soft, name))

H,W = a.shape[:2]; cols=4; rows=(len(outs)+cols-1)//cols
sheet = Image.new('RGB',(W*cols,H*rows),(14,14,14)); dr=ImageDraw.Draw(sheet)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 46)
for i,(img,name) in enumerate(outs):
    x0,y0=(i%cols)*W,(i//cols)*H
    sheet.paste(Image.fromarray((np.clip(img,0,1)*255).astype(np.uint8)),(x0,y0))
    dr.rectangle([x0,y0,x0+W-1,y0+H-1],outline=(30,30,30),width=4)
    dr.text((x0+24,y0+18),name,fill=(0,0,0),font=F,stroke_width=5,stroke_fill=(255,255,255))
sheet.resize((sheet.width//2,sheet.height//2),Image.LANCZOS).save('recolour/sheet2.png')
print('wrote recolour/sheet2.png')
