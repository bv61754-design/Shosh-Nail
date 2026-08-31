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
m=nd.binary_erosion(nail,np.ones((int(sys.argv[4]) if len(sys.argv)>4 else 13,)*2))
px=q[m]
L=lambda a:0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2]
mx=px.max(1); mn=px.min(1); S=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
l=L(px)
o=np.argsort(l); ls=l[o]; ss=S[o]; n=len(ls)
dl=[np.median(ls[n*i//10:n*(i+1)//10]) for i in range(10)]
ds=[np.median(ss[n*i//10:n*(i+1)//10]) for i in range(10)]
c=[int(hexc[1+2*i:3+2*i],16)/255 for i in range(3)]
cl=0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
cs=(max(c)-min(c))/max(max(c),1e-6)
body=np.median(ds[0:8])
# skin
r,g,b=q[...,0],q[...,1],q[...,2]; ql=L(q)
sk=nd.binary_erosion((r-b>0.20)&(ql>0.55)&~nd.binary_dilation(nail,np.ones((31,31))),np.ones((15,15)))
skin=np.median(ql[sk])
print('%-9s lum %s'%(name,' '.join('%.2f'%x for x in dl)))
print('%-9s sat %s'%('',' '.join('%.3f'%x for x in ds)))
print('%-9s  lumx %.2f  satx %.2f | bodySat/paint %.2f (ref .90) | satTop/Bot %.2f (ref .17-.30) | lumD10/D1 %.2f (ref 1.9-2.7) | nail/skin %.2f (ref 1.07)'
      %('',np.median(l)/cl,np.median(S)/cs,body/cs,ds[-1]/max(ds[0],1e-6),dl[-1]/max(dl[0],1e-6),np.median(l)/skin))
