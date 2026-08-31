import numpy as np, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
im=Image.open(sys.argv[1]).convert('RGB'); q=np.asarray(im).astype(float)/255
l=0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]
warm=q[...,0]-q[...,2]
pts=[tuple(map(int,p.split(','))) for p in sys.argv[2].split(';')]
R=int(sys.argv[3]) if len(sys.argv)>3 else 55
d=im.copy(); dr=ImageDraw.Draw(d)
print('%-8s %6s %6s %6s'%('nail','W','L','W/L'))
ars=[]
for k,(cx,cy) in enumerate(pts):
    y0,y1,x0,x1=max(0,cy-R),cy+R,max(0,cx-R),cx+R
    sub_l=l[y0:y1,x0:x1]; sub_w=warm[y0:y1,x0:x1]
    # nail: brighter than the local median AND less warm than the local median
    m=(sub_l>np.percentile(sub_l,62))&(sub_w<np.percentile(sub_w,48))
    m=nd.binary_opening(m,np.ones((5,5))); m=nd.binary_closing(m,np.ones((9,9)))
    lab,n=nd.label(m)
    if n==0: print('%-8d  no blob'%k); continue
    sz=nd.sum(m,lab,range(1,n+1)); m=lab==(1+int(np.argmax(sz)))
    ys,xs=np.nonzero(m)
    P=np.stack([xs-xs.mean(),ys-ys.mean()]).astype(float)
    C=P@P.T/P.shape[1]; w,v=np.linalg.eigh(C)
    lon=v[:,int(np.argmax(w))]; sho=v[:,int(np.argmin(w))]
    t=P.T@lon; u=P.T@sho
    L=t.max()-t.min(); W=u.max()-u.min()
    ars.append(W/L)
    print('%-8d %6.1f %6.1f %6.3f'%(k,W,L,W/L))
    for yy,xx in zip(ys[::7],xs[::7]): dr.point((x0+xx,y0+yy),fill=(0,255,0))
    dr.rectangle([x0,y0,x1,y1],outline=(255,0,0))
d.save('night/natnails.png')
a=np.array(ars)
print('spread: min %.3f max %.3f  max/min %.2f  cv %.3f'%(a.min(),a.max(),a.max()/a.min(),a.std()/a.mean()))
