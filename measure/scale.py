import numpy as np, sys
from PIL import Image
from scipy import ndimage as nd
im=Image.open('refs/gloss-nail-1.png').convert('RGB')
q=np.asarray(im).astype(float)/255
l=0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]
# the nail is the one big bright blob on dark cloth
m=l>0.28
m=nd.binary_opening(m,np.ones((9,9))); m=nd.binary_closing(m,np.ones((15,15)))
lab,n=nd.label(m); sz=nd.sum(m,lab,range(1,n+1)); m=lab==(1+int(np.argmax(sz)))
ys,xs=np.nonzero(m)
P=np.stack([xs-xs.mean(),ys-ys.mean()]).astype(float)
C=P@P.T/P.shape[1]; w,v=np.linalg.eigh(C)
u=P.T@v[:,int(np.argmin(w))]
W0=u.max()-u.min()
print('source nail short axis: %.0f px'%W0)
y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
sub=l[y0:y1,x0:x1]; sm=m[y0:y1,x0:x1]
print('%6s  %8s  %8s'%('width','|grad|','flat%'))
for N in [445,330,220,165,110,80,55,42]:
    k=N/W0
    h2,w2=max(4,int(round(sub.shape[0]*k))), max(4,int(round(sub.shape[1]*k)))
    s2=np.asarray(Image.fromarray((sub*255).astype(np.uint8)).resize((w2,h2),Image.LANCZOS)).astype(float)/255
    m2=np.asarray(Image.fromarray((sm*255).astype(np.uint8)).resize((w2,h2),Image.LANCZOS))>128
    m2=nd.binary_erosion(m2,np.ones((3,3)))
    if m2.sum()<50: print('%6d  too small'%N); continue
    g=np.hypot(*np.gradient(nd.gaussian_filter(s2/np.median(s2[m2]),1.2)))*N*0.01
    gv=g[m2]
    print('%6d  %8.4f  %7.1f%%'%(N,np.median(gv),100*(gv<0.004).mean()))
