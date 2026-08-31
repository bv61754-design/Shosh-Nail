import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
png=sys.argv[1]
D=json.load(open(png.replace('.png','.json'))); dsr=D['dsr']
im=Image.open(png).convert('RGB'); a=np.asarray(im).astype(float)/255
l=0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2]
r,g,b=a[...,0],a[...,1],a[...,2]
nail=np.zeros(l.shape,bool)
for poly in D['polys']:
    mk=Image.new('L',im.size,0); ImageDraw.Draw(mk).polygon([(x*dsr,y*dsr) for x,y in poly],fill=255)
    nail|=np.asarray(mk)>128
core=nd.binary_erosion(nail,np.ones((9,9)))
hp=l-nd.gaussian_filter(l,2.0)
skin=(r-b>0.20)&(l>0.55)&~nd.binary_dilation(nail,np.ones((31,31)))
skin=nd.binary_erosion(skin,np.ones((13,13)))
cloth=nd.binary_erosion((l<0.32)&((r-b)<0.05),np.ones((13,13)))
print('%-22s plate %.5f   skin %.5f   cloth %.5f   plate/skin %.2f'%(
    png.split('/')[-1], hp[core].std(), hp[skin].std(), hp[cloth].std(), hp[core].std()/max(hp[skin].std(),1e-9)))
