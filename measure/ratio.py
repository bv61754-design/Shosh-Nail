import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
png=sys.argv[1]
D=json.load(open(png.replace('.png','.json'))); dsr=D['dsr']
im=Image.open(png).convert('RGB'); q=np.asarray(im).astype(float)/255
l=0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]
r,g,b=q[...,0],q[...,1],q[...,2]
nail=np.zeros(l.shape,bool)
for poly in D['polys']:
    mk=Image.new('L',im.size,0); ImageDraw.Draw(mk).polygon([(x*dsr,y*dsr) for x,y in poly],fill=255)
    nail|=np.asarray(mk)>128
sk=nd.binary_erosion((r-b>0.20)&(l>0.55)&~nd.binary_dilation(nail,np.ones((31,31))),np.ones((15,15)))
n=np.median(l[nd.binary_erosion(nail,np.ones((9,9)))]); s=np.median(l[sk])
print('%-14s nail %.3f  skin %.3f  nail/skin %.2f   (real pale nails on a real hand: 1.18)'%(sys.argv[2],n,s,n/s))
