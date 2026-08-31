import numpy as np, json, sys, colorsys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
png,hexc,name=sys.argv[1],sys.argv[2],sys.argv[3]
D=json.load(open(png.replace('.png','.json'))); dsr=D['dsr']
im=Image.open(png).convert('RGB'); q=np.asarray(im).astype(float)/255
nail=np.zeros(q.shape[:2],bool)
for poly in D['polys']:
    mk=Image.new('L',im.size,0); ImageDraw.Draw(mk).polygon([(x*dsr,y*dsr) for x,y in poly],fill=255)
    nail|=np.asarray(mk)>128
m=nd.binary_erosion(nail,np.ones((11,11)))
px=q[m]
R,G,B=[np.median(px[:,i]) for i in range(3)]
L=lambda r,g,b:0.2126*r+0.7152*g+0.0722*b
cr,cg,cb=[int(hexc[1+2*i:3+2*i],16)/255 for i in range(3)]
def hsv(r,g,b): h,s,v=colorsys.rgb_to_hsv(r,g,b); return h*360,s,v
ph,ps,pv=hsv(cr,cg,cb); rh,rs,rv=hsv(R,G,B)
print('%-10s paint  #%02X%02X%02X lum %.3f  hue %5.1f sat %.3f'%(name,int(cr*255),int(cg*255),int(cb*255),L(cr,cg,cb),ph,ps))
print('%-10s render #%02X%02X%02X lum %.3f  hue %5.1f sat %.3f'%('',int(R*255),int(G*255),int(B*255),L(R,G,B),rh,rs))
print('%-10s        lum x%.2f   sat x%.2f   hue %+.1f'%('',L(R,G,B)/L(cr,cg,cb),rs/max(ps,1e-6),rh-ph))
