import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
D=json.load(open(sys.argv[1].replace('.png','.json'))); dsr=D['dsr']
im=Image.open(sys.argv[1]).convert('RGB'); a=np.asarray(im).astype(float)/255
l=0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2]
r,g,b=a[...,0],a[...,1],a[...,2]
nail=np.zeros(l.shape,bool)
for poly in D['polys']:
    mk=Image.new('L',im.size,0); ImageDraw.Draw(mk).polygon([(x*dsr,y*dsr) for x,y in poly],fill=255)
    nail|=np.asarray(mk)>128
skin=(r-b>0.16)&(l>0.45); cloth=~skin&~nail&(l<0.42)
d=nd.distance_transform_edt(~nail)
ref=l[cloth&(d>50)&(d<110)].mean()
out=[]
for lo,hi in [(1,4),(4,8),(8,14),(14,22),(22,34)]:
    band=cloth&(d>lo)&(d<=hi)
    if band.sum()<200: continue
    out.append('%d-%d:%+.1f'%(lo,hi,255*(l[band].mean()-ref)))
print('%-10s cloth vs far cloth, levels — %s   (hand does -8.5 -23 -33)'%(sys.argv[2],'  '.join(out)))
