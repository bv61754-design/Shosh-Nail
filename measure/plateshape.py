import numpy as np, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
im=Image.open(sys.argv[1]).convert('RGB'); q=np.asarray(im).astype(float)/255
l=0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]
warm=q[...,0]-q[...,2]
pts=[tuple(map(int,p.split(','))) for p in sys.argv[2].split(';')]
R=int(sys.argv[3]); PW=float(sys.argv[4]) if len(sys.argv)>4 else 45
d=im.copy(); dr=ImageDraw.Draw(d); ars=[]
for k,(cx,cy) in enumerate(pts):
    y0,y1,x0,x1=max(0,cy-R),cy+R,max(0,cx-R),cx+R
    sl=l[y0:y1,x0:x1]; sw=warm[y0:y1,x0:x1]
    m=(sw<np.percentile(sw,PW))
    m=nd.binary_opening(m,np.ones((5,5))); m=nd.binary_closing(m,np.ones((7,7)))
    lab,n=nd.label(m)
    if not n: print('%d: none'%k); continue
    # the blob nearest the window centre
    best=None;bd=1e9
    for i in range(1,n+1):
        ys,xs=np.nonzero(lab==i)
        if len(ys)<400: continue
        dd=(ys.mean()-R)**2+(xs.mean()-R)**2
        if dd<bd: bd=dd; best=i
    if best is None: print('%d: too small'%k); continue
    ys,xs=np.nonzero(lab==best)
    P=np.stack([xs-xs.mean(),ys-ys.mean()]).astype(float)
    C=P@P.T/P.shape[1]; w,v=np.linalg.eigh(C)
    t=P.T@v[:,int(np.argmax(w))]; u=P.T@v[:,int(np.argmin(w))]
    L=t.max()-t.min(); W=u.max()-u.min(); ars.append(W/L)
    print('%d  W %5.1f  L %5.1f  W/L %.3f  px %d'%(k,W,L,W/L,len(ys)))
    for yy,xx in zip(ys[::5],xs[::5]): dr.point((x0+xx,y0+yy),fill=(0,255,0))
d.save('night/plateseg.png')
a=np.array(ars)
print('n=%d  min %.3f  max %.3f  max/min %.2f  cv %.3f'%(len(a),a.min(),a.max(),a.max()/a.min(),a.std()/a.mean()))
