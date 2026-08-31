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
core=nd.binary_erosion(nail,np.ones((17,17)))
hp=l-nd.gaussian_filter(l,1.6)
skin=nd.binary_erosion((r-b>0.20)&(l>0.55)&~nd.binary_dilation(nail,np.ones((31,31))),np.ones((15,15)))
gg=np.hypot(*np.gradient(nd.gaussian_filter(l,1.2)))
flat=[]
for poly in D['polys']:
    mk=Image.new('L',im.size,0); ImageDraw.Draw(mk).polygon([(x*dsr,y*dsr) for x,y in poly],fill=255)
    m=nd.binary_erosion(np.asarray(mk)>128,np.ones((5,5)))
    if m.sum()<800: continue
    ys,xs=np.nonzero(m); w=xs.max()-xs.min()
    y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
    sub=l[y0:y1+1,x0:x1+1]; sm=m[y0:y1+1,x0:x1+1]
    q=np.hypot(*np.gradient(nd.gaussian_filter(sub/np.median(sub[sm]),1.2)))*w*0.01
    flat.append((q[sm]<0.004).mean())
print('%-8s plate hf %.5f   skin hf %.5f   ratio %.2f   flat %.1f%%   (core %d px)'%(
    sys.argv[2], hp[core].std(), hp[skin].std(), hp[core].std()/max(hp[skin].std(),1e-9),
    100*np.mean(flat), core.sum()))
