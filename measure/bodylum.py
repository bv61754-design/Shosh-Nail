import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
png=sys.argv[1]
D=json.load(open(png.replace('.png','.json'))); dsr=D['dsr']
q=np.asarray(Image.open(png).convert('RGB')).astype(float)/255
l=0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]
m=np.zeros(l.shape,bool)
for poly in D['polys']:
    mk=Image.new('L',(q.shape[1],q.shape[0]),0)
    ImageDraw.Draw(mk).polygon([(x*dsr,y*dsr) for x,y in poly],fill=255)
    m|=np.asarray(mk)>128
m=nd.binary_erosion(m,np.ones((7,7)))
v=l[m]
print('%-22s body(median) %.3f   p99.5 %.3f   peak/body %.2f'%(sys.argv[2],np.median(v),np.percentile(v,99.5),np.percentile(v,99.5)/np.median(v)))
