import numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC='refs/gloss-nail-1.png'
im=Image.open(SRC).convert('RGB')
a=np.asarray(im).astype(np.float32)/255.0
r,g,b=a[...,0],a[...,1],a[...,2]
lum=0.2126*r+0.7152*g+0.0722*b

# --- 1. mask -------------------------------------------------------------
m=((r-b)>0.045)&(lum>0.22)
m=nd.binary_closing(m,np.ones((9,9)))
m=nd.binary_fill_holes(m)
m=nd.binary_opening(m,np.ones((9,9)))
lab,n=nd.label(m)
sizes=nd.sum(m,lab,range(1,n+1))
m=lab==(int(np.argmax(sizes))+1)
m=nd.binary_fill_holes(m)
print('components',n,'kept frac',round(float(m.mean()),4))

ys,xs=np.nonzero(m)
cy,cx=ys.mean(),xs.mean()
# --- 2. principal axis ---------------------------------------------------
X=np.stack([xs-cx,ys-cy]).astype(np.float64)
cov=X@X.T/X.shape[1]
w,v=np.linalg.eigh(cov)
major=v[:,np.argmax(w)]           # unit vector along the nail length
ang=np.degrees(np.arctan2(major[1],major[0]))
print('centroid',round(cx,1),round(cy,1),'major axis deg',round(ang,2),
      'len ratio',round(float(np.sqrt(max(w)/min(w))),3))

# --- 3. rotate so the nail runs bottom(cuticle) -> top(tip) --------------
# rotate by -(ang) puts major axis horizontal; then +90 to put it vertical
rot = -ang + 90.0
def rotate(arr,order):
    return nd.rotate(arr,rot,reshape=True,order=order,mode='constant',cval=0.0)
mr = rotate(m.astype(np.float32),1)>0.5
ar = np.stack([rotate(a[...,i],1) for i in range(3)],axis=-1)
ys,xs=np.nonzero(mr)
y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
mr=mr[y0:y1+1,x0:x1+1]; ar=ar[y0:y1+1,x0:x1+1]
H,W=mr.shape
print('upright crop',W,'x',H)

# which end is the tip? narrower half.
roww=mr.sum(1)
top=roww[:H//3].mean(); bot=roww[-H//3:].mean()
print('row width  top third',round(float(top),1),' bottom third',round(float(bot),1))
if top < bot:
    pass                       # tip already at top
else:
    mr=mr[::-1]; ar=ar[::-1]
    print('flipped: tip was at the bottom')
np.save('gloss/mask.npy',mr); np.save('gloss/rgb.npy',ar)
Image.fromarray((mr*255).astype(np.uint8)).save('gloss/mask.png')
Image.fromarray((ar*255).astype(np.uint8)).save('gloss/upright.png')
