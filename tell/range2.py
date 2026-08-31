import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
png=sys.argv[1]; js=png.replace('.png','.json')
im=Image.open(png).convert('RGB'); a=np.asarray(im).astype(float)/255
l=0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2]
D=json.load(open(js)); dsr=D['dsr']
mask=Image.new('L',im.size,0); dr=ImageDraw.Draw(mask)
for poly in D['polys']:
    dr.polygon([(x*dsr,y*dsr) for x,y in poly], fill=255)
m=np.asarray(mask)>128
import scipy.ndimage as _n
m=_n.binary_erosion(m,np.ones((7,7)))
print('plate pixels', m.sum())
v=l[m]
p=np.percentile(v,[1,5,25,50,75,95,99])
print('%-16s p1 %.3f  p5 %.3f  p50 %.3f  p95 %.3f  p99 %.3f   range %.3f   stops %.2f'%(
    png.split('/')[-1],p[0],p[1],p[3],p[5],p[6],p[6]-p[0],np.log2(p[6]/max(p[0],1e-6))))
# and only the outer 8% band, where the reflection lives
d=nd.distance_transform_edt(m)
w=np.sqrt(m.sum()/len(D['polys'])/1.6)     # rough plate half-width in px
rim=m&(d<w*0.16)
print('   outer rim: mean %.3f   interior mean %.3f   ratio %.2f  (real nail: 0.62 at the very edge, 0.91 by 6%%)'
      %(l[rim].mean(), l[m&(d>w*0.6)].mean(), l[rim].mean()/l[m&(d>w*0.6)].mean()))
