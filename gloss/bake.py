import numpy as np, base64, io, json
from PIL import Image
M=np.load('gloss/uvM.npy').astype(np.float64); S=np.load('gloss/uvS.npy').astype(np.float64)
OH,OW=M.shape
v=np.linspace(0,1,OH)[:,None]        # 0 = free edge (tip), 1 = cuticle

# The press-on was photographed lying on cloth, so its cuticle edge caught a
# hard rim of light that a nail sitting against skin never gets. Fade the last
# stretch back to neutral so the plate meets the finger instead of glowing at
# it. Nothing else about the photograph is touched.
fade=np.clip((v-0.86)/0.14,0,1)
M=M*(1-fade)+1.0*fade
S=S*(1-fade)
# same, much gentler, at the very tip: the free edge is drawn as its own layer
tf=np.clip((0.035-v)/0.035,0,1)
M=M*(1-tf)+1.0*tf; S=S*(1-tf*0.6)

p=float(np.percentile(M,99.5))
M=np.clip(M/p,0,1)                   # brightest diffuse point == the chosen colour
S=np.clip(S,0,1)
print('scale',round(p,4),'M p1',round(float(np.percentile(M,1)),3),
      'p50',round(float(np.percentile(M,50)),3),
      '  S p50',round(float(np.percentile(S,50)),3),'p99',round(float(np.percentile(S,99)),3))

def png(arr,w,h):
    im=Image.fromarray(np.round(np.clip(arr,0,1)*255).astype(np.uint8),'L')
    im=im.resize((w,h),Image.LANCZOS)
    best=None
    for lv in (9,):
        b=io.BytesIO(); im.save(b,'PNG',optimize=True,compress_level=lv)
        if best is None or b.tell()<len(best): best=b.getvalue()
    return best
for w,h in ((192,288),(160,240),(128,192),(112,168)):
    print(w,'x',h,'  M',len(png(M,w,h)),'B   S',len(png(S,w,h)),'B')
