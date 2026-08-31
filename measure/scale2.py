import numpy as np, sys
from PIL import Image
from scipy import ndimage as nd

def nailmask(f, thr, invert=False):
    im=Image.open(f).convert('RGB'); q=np.asarray(im).astype(float)/255
    l=0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]
    m=(l<thr) if invert else (l>thr)
    m=nd.binary_opening(m,np.ones((9,9))); m=nd.binary_closing(m,np.ones((15,15)))
    lab,n=nd.label(m); sz=nd.sum(m,lab,range(1,n+1)); m=lab==(1+int(np.argmax(sz)))
    return q,l,m

def report(name,f,thr,invert=False,widths=(445,220,110,55,42)):
    q,l,m=nailmask(f,thr,invert)
    ys,xs=np.nonzero(m)
    P=np.stack([xs-xs.mean(),ys-ys.mean()]).astype(float)
    C=P@P.T/P.shape[1]; w,v=np.linalg.eigh(C)
    u=P.T@v[:,int(np.argmin(w))]; W0=u.max()-u.min()
    y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    subq=q[y0:y1,x0:x1]; sm=m[y0:y1,x0:x1]
    print('%s  (source nail %.0f px across)'%(name,W0))
    print('%6s %8s %7s %8s %7s %7s %8s'%('width','|grad|','flat%','peak/bd','>2x','>3x','leastSat'))
    for N in widths:
        k=N/W0
        h2,w2=max(4,int(round(subq.shape[0]*k))), max(4,int(round(subq.shape[1]*k)))
        c2=np.asarray(Image.fromarray((subq*255).astype(np.uint8)).resize((w2,h2),Image.LANCZOS)).astype(float)/255
        m2=np.asarray(Image.fromarray((sm*255).astype(np.uint8)).resize((w2,h2),Image.LANCZOS))>128
        m2=nd.binary_erosion(m2,np.ones((3,3)))
        if m2.sum()<50: continue
        l2=0.2126*c2[...,0]+0.7152*c2[...,1]+0.0722*c2[...,2]
        mx=c2.max(2); mn=c2.min(2); sat=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
        med=np.median(l2[m2])
        g=np.hypot(*np.gradient(nd.gaussian_filter(l2/med,1.2)))*N*0.01
        gv=g[m2]; s=sat[m2]; v2=l2[m2]
        print('%6d %8.4f %6.1f%% %8.2f %6.2f%% %6.2f%% %8.2f'%(
            N,np.median(gv),100*(gv<0.004).mean(),np.percentile(v2,99.5)/med,
            100*(v2>2*med).mean(),100*(v2>3*med).mean(),
            np.percentile(s,2)/max(np.median(s),1e-6)))
    print()

report('REF plain dusty pink (on cloth)','refs/gloss-nail-1.png',0.28)
