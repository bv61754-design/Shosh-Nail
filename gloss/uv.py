import numpy as np
from PIL import Image
from scipy import ndimage as nd
m=np.load('gloss/mask.npy'); M=np.load('gloss/M.npy'); S=np.load('gloss/S.npy')
H,W=m.shape
# pull the sampling window 2% inside the silhouette: the outermost pixels carry
# the fabric's anti-aliased edge, not the polish.
INSET=0.022
OW,OH=192,288                     # UV resolution: u across the nail, v along it
outM=np.zeros((OH,OW),np.float32); outS=np.zeros((OH,OW),np.float32)
rows=[]
for y in range(H):
    xs=np.nonzero(m[y])[0]
    rows.append((xs[0],xs[-1]) if len(xs)>6 else None)
# fill the very tip from the nearest usable row so noise never lands there
first=next(i for i,r in enumerate(rows) if r)
last =len(rows)-1-next(i for i,r in enumerate(reversed(rows)) if r)
u=np.linspace(0,1,OW)
for j in range(OH):
    y=first+(last-first)*j/(OH-1)
    y0=int(np.clip(round(y),first,last))
    r=rows[y0] or rows[first]
    a,b=r; span=b-a
    xs=a+span*INSET+(span*(1-2*INSET))*u
    outM[j]=nd.map_coordinates(M,[np.full(OW,y),xs],order=1,mode='nearest')
    outS[j]=nd.map_coordinates(S,[np.full(OW,y),xs],order=1,mode='nearest')
# a touch of smoothing: the UV grid is a resample of a 445x820 crop, so a
# half-pixel blur removes resampling grain without touching the streak.
outM=nd.gaussian_filter(outM,0.8); outS=nd.gaussian_filter(outS,0.8)
print('M',round(float(outM.min()),3),round(float(np.median(outM)),3),round(float(outM.max()),3))
print('S',round(float(outS.min()),3),round(float(np.median(outS)),3),round(float(outS.max()),3))
np.save('gloss/uvM.npy',outM); np.save('gloss/uvS.npy',outS)
def show(col):
    c=np.array(col,np.float32)/255.
    return np.clip(c[None,None,:]*outM[...,None]+outS[...,None],0,1)
strip=np.concatenate([np.repeat(np.clip(outM/1.4,0,1)[...,None],3,2),
                      np.repeat(outS[...,None],3,2),
                      show((205,150,152)),show((16,16,20)),show((214,32,48))],axis=1)
Image.fromarray((strip*255).astype(np.uint8)).save('gloss/uv.png')
