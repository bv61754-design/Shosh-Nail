import numpy as np
from PIL import Image
m=np.load('gloss/mask.npy'); d=np.load('gloss/d.npy'); s=np.load('gloss/s.npy')
G=0.381
# the reference pixel: the typical mid-body. Everything is expressed relative
# to it, so that at the reference the render is EXACTLY the chosen colour.
d_ref=float(np.median(d[m])); s_ref=float(np.median(s[m]))
print('d_ref',round(d_ref,4),'s_ref',round(s_ref,4))
# white below the reference is just less light -> fold it into the multiplier
base = d + np.minimum(s,s_ref)/G
M = base/(d_ref + s_ref/G)
S = np.maximum(s-s_ref,0.0)
for nm,arr in (('M',M),('S',S)):
    v=arr[m]
    print(nm,'p1',round(float(np.percentile(v,1)),3),'p50',round(float(np.percentile(v,50)),3),
          'p95',round(float(np.percentile(v,95)),3),'p999',round(float(np.percentile(v,99.9)),3),
          'max',round(float(v.max()),3))
np.save('gloss/M.npy',M); np.save('gloss/S.npy',S)
# preview: the two maps, and the pair applied to three very different colours
def show(col):
    c=np.array(col,dtype=np.float32)/255.
    out=np.clip(c[None,None,:]*np.clip(M,0,2)[...,None]+S[...,None],0,1)
    return np.where(m[...,None],out,0)
strip=np.concatenate([
    np.repeat(np.where(m,np.clip(M/1.4,0,1),0)[...,None],3,2),
    np.repeat(np.where(m,S,0)[...,None],3,2),
    show((205,150,152)), show((16,16,20)), show((214,32,48)), show((236,226,214)),
],axis=1)
Image.fromarray((strip*255).astype(np.uint8)).resize((strip.shape[1]//4,strip.shape[0]//4)).save('gloss/split.png')
