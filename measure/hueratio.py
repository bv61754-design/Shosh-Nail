import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
U1=np.array([1.,-1.,0.])/np.sqrt(2); U2=np.array([1.,1.,-2.])/np.sqrt(6)
def sd(img,m):
    c=img-img.mean(2)[...,None]
    p1=(c*U1).sum(2); p2=(c*U2).sum(2); mag=np.hypot(p1,p2)
    good=m&(mag>0.035)
    if good.sum()<200: return float('nan')
    th=np.arctan2(p2,p1)[good]
    R=np.hypot(np.cos(th).mean(),np.sin(th).mean())
    return np.degrees(np.sqrt(max(0.0,-2*np.log(max(R,1e-12)))))
png=sys.argv[1]
D=json.load(open(png.replace('.png','.json'))); dsr=D['dsr']
q=np.asarray(Image.open(png).convert('RGB')).astype(float)/255
l=0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]; warm=q[...,0]-q[...,2]
nail=np.zeros(q.shape[:2],bool)
for poly in D['polys']:
    mk=Image.new('L',(q.shape[1],q.shape[0]),0)
    ImageDraw.Draw(mk).polygon([(x*dsr,y*dsr) for x,y in poly],fill=255)
    nail|=np.asarray(mk)>128
core=nd.binary_erosion(nail,np.ones((5,5)))
skin=nd.binary_erosion((warm>0.20)&(l>0.55)&~nd.binary_dilation(nail,np.ones((31,31))),np.ones((9,9)))
hp=l-nd.gaussian_filter(l,2.0)
p,sk=sd(q,core),sd(q,skin)
print('%-26s hue: plate %.2f  skin %.2f  ratio %.2f   |   lum-noise ratio %.2f'%(
    sys.argv[2],p,sk,p/sk, hp[core].std()/max(hp[skin].std(),1e-9)))
