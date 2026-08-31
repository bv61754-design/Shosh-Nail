import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
png,target=sys.argv[1],sys.argv[2]
t=np.array([int(target[i:i+2],16) for i in (1,3,5)],float)
D=json.load(open(png.replace('.png','.json'))); dsr=D['dsr']
im=Image.open(png).convert('RGB'); a=np.asarray(im).astype(float)
vals=[]
for poly in D['polys']:
    mk=Image.new('L',im.size,0); ImageDraw.Draw(mk).polygon([(x*dsr,y*dsr) for x,y in poly],fill=255)
    m=nd.binary_erosion(np.asarray(mk)>128,np.ones((5,5)))
    if m.sum()<800: continue
    ys,xs=np.nonzero(m); y0,y1=ys.min(),ys.max()
    band=m.copy(); band[:y0+int((y1-y0)*0.45)]=False; band[y0+int((y1-y0)*0.70):]=False
    if band.sum()<200: continue
    vals.append(np.median(a[band],0))
v=np.mean(vals,0)
print('%-12s rendered %s   swatch %s   ratio %.2f  hue drift %.1f%%'%(
    sys.argv[3], np.round(v).astype(int).tolist(), t.astype(int).tolist(),
    (v/t).mean(), 100*(v/t).std()/max((v/t).mean(),1e-9)))
