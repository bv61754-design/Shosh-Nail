import numpy as np, sys
from PIL import Image
from scipy import ndimage as nd
c=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)/255
l=0.2126*c[...,0]+0.7152*c[...,1]+0.0722*c[...,2]
r,g,b=c[...,0],c[...,1],c[...,2]
nail=(l>0.30)&(l<0.95)&((r-b)>0.03)&((r-b)<0.22)&((r-g)>0.0)
nail=nd.binary_opening(nail,np.ones((5,5))); nail=nd.binary_closing(nail,np.ones((11,11)))
nail=nd.binary_fill_holes(nail)
lab,k=nd.label(nail); sz=nd.sum(nail,lab,range(1,k+1))
core=np.zeros_like(nail); n=0
for i in range(k):
    if 1500<sz[i]<20000:
        core|=nd.binary_erosion(lab==i+1,np.ones((3,3))); n+=1
v=l[core]
p=np.percentile(v,[1,5,50,95,99])
print('%-28s plates=%2d  p1 %.3f  p5 %.3f  p50 %.3f  p95 %.3f  p99 %.3f   range %.3f   stops %.2f'%(
    sys.argv[1].split('/')[-1], n, *p, p[4]-p[0], np.log2(p[4]/max(p[0],1e-6))))
