import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
def lengthwise(m,l,N=24):
    ys,xs=np.nonzero(m)
    X=np.stack([xs-xs.mean(),ys-ys.mean()]).astype(float)
    w,v=np.linalg.eigh(X@X.T/X.shape[1]); d=v[:,int(np.argmax(w))]
    t=(xs-xs.mean())*d[0]+(ys-ys.mean())*d[1]; lo,hi=t.min(),t.max()
    prof=[];wd=[]
    for i in range(N):
        a=lo+(hi-lo)*i/N; b=lo+(hi-lo)*(i+1)/N; sel=(t>=a)&(t<b)
        prof.append(l[ys[sel],xs[sel]].mean() if sel.sum()>20 else np.nan); wd.append(sel.sum())
    p=np.array(prof)
    if np.isnan(p).any(): return None
    if np.mean(wd[:N//4])<np.mean(wd[-N//4:]): p=p[::-1]
    return p/np.median(p)
png=sys.argv[1]
D=json.load(open(png.replace('.png','.json'))); dsr=D['dsr']
im=Image.open(png).convert('RGB'); q=np.asarray(im).astype(float)/255
ql=0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]
ps=[]
for poly in D['polys']:
    mk=Image.new('L',im.size,0); ImageDraw.Draw(mk).polygon([(x*dsr,y*dsr) for x,y in poly],fill=255)
    mm=nd.binary_erosion(np.asarray(mk)>128,np.ones((5,5)))
    if mm.sum()<800: continue
    p=lengthwise(mm,ql)
    if p is not None: ps.append(p)
O=np.array(ps).mean(0)
print('%-10s cuticle->tip: %s'%(sys.argv[2],' '.join('%.2f'%x for x in O)))
print('%-10s tip/body %.2f   (real 1.04, real tip peak 1.10)'%('',O[-4:].mean()/O[6:18].mean()))
