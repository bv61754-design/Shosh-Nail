import numpy as np, base64, io, sys
from PIL import Image
from scipy import ndimage as nd
M=np.load('gloss/uvM.npy').astype(np.float64); S=np.load('gloss/uvS.npy').astype(np.float64)
OH,OW=M.shape
v=np.linspace(0,1,OH)[:,None]

# A nail is a section of a CYLINDER, so it smears every reflection along its
# own length. The photograph caught one window in one room and kept its
# corners; smearing hard along v and lightly across u finishes the job the
# curvature had already started, and what is left is the light's shape on a
# glossy nail rather than the shape of that particular window.
S=nd.gaussian_filter(S,(OH*0.048,OW*0.026),mode='nearest')
M=nd.gaussian_filter(M,(OH*0.014,OW*0.008),mode='nearest')
S=S/np.percentile(S,99.9)
# crush the faint dusting: on a black nail every stray 0.02 of white reads as
# dust on the polish. The bright catch is what was measured; the haze is what
# a dark room throws at any glossy thing and the eye already discounts it.
S=np.clip(S,0,1)**1.45*0.92

# WHAT IS KEPT AND WHAT IS THROWN AWAY.
# The nail was photographed lying on cloth. Its cuticle end therefore tips
# toward the window and catches a hard bright wedge with a dark one under it —
# the reflection of that particular room in that particular pose. Worn on a
# finger there is nothing there at all, and pasted onto ten fingers the same
# wedge ten times is the most artificial thing a render can do. So the bottom
# of both maps fades out.
# What survives is the part that is about the MATERIAL and not the pose: the
# lengthwise striations of the gel, the milky depth of it, the bright band
# running down the length where the plate turns toward the light, the way the
# side walls fall away. None of that depends on which room it was in.
fade=np.clip((v-0.58)/0.22,0,1)
M=M*(1-fade)+1.0*fade
sfade=np.clip((v-0.46)/0.20,0,1)
S=S*(1-sfade)
# the free edge is drawn by SN.Nail as its own translucent layer
tf=np.clip((0.035-v)/0.035,0,1);  M=M*(1-tf)+tf;    S=S*(1-tf*0.6)
p=float(np.percentile(M,99.5)); M=np.clip(M/p,0,1)
M=np.clip(1-(1-M)*1.18,0,1)   # a little more bite in the form
# THE COLOUR THE CUSTOMER PICKED IS THE ONE SHE MUST SEE. A multiply map can
# only darken, so left as measured it quietly takes about 7% off every shade.
# Re-centre it on its own middle instead of its brightest point: the typical
# pixel now renders the chosen colour almost exactly, and only the shading
# darkens.
M=np.clip(M/0.94,0,1)
S=np.clip(S,0,1)
print('M p1',round(float(np.percentile(M,1)),3),'p50',round(float(np.percentile(M,50)),3),
      ' S p50',round(float(np.percentile(S,50)),3),'p95',round(float(np.percentile(S,95)),3),
      'max',round(float(S.max()),3))
W,H=128,192
def uri(arr):
    im=Image.fromarray(np.round(np.clip(arr,0,1)*255).astype(np.uint8),'L').resize((W,H),Image.LANCZOS)
    b=io.BytesIO(); im.save(b,'PNG',optimize=True,compress_level=9)
    return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
mu,su=uri(M),uri(S)
print('bytes M',len(mu),'S',len(su))
open('gloss/M.uri','w').write(mu); open('gloss/S.uri','w').write(su)
prev=np.concatenate([np.repeat(M[...,None],3,2),np.repeat(S[...,None],3,2)]+
  [np.clip(np.array(c,np.float64)[None,None,:]/255*M[...,None]+S[...,None],0,1)
   for c in ((201,139,160),(179,18,43),(15,13,18),(239,227,218))],axis=1)
Image.fromarray((prev*255).astype(np.uint8)).save('gloss/emit-prev.png')
