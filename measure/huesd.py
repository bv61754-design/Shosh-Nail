import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd
U1=np.array([1.,-1.,0.])/np.sqrt(2); U2=np.array([1.,1.,-2.])/np.sqrt(6)
def circsd(img, m):
    c = img - img.mean(2)[...,None]
    p1=(c*U1).sum(2); p2=(c*U2).sum(2)
    mag=np.hypot(p1,p2)
    good = m & (mag > 0.035)
    if good.sum() < 200: return None, 0.0
    th=np.arctan2(p2,p1)[good]
    R=np.hypot(np.cos(th).mean(), np.sin(th).mean())
    return np.degrees(np.sqrt(max(0.0,-2*np.log(max(R,1e-12))))), good.sum()/max(m.sum(),1)
def drift(img, m):
    """how the chroma direction moves from the darkest to the brightest eighth"""
    c = img - img.mean(2)[...,None]
    p1=(c*U1).sum(2); p2=(c*U2).sum(2); mag=np.hypot(p1,p2)
    good = m & (mag > 0.035)
    if good.sum() < 400: return None
    th=np.arctan2(p2,p1)[good]
    l=(0.2126*img[...,0]+0.7152*img[...,1]+0.0722*img[...,2])[good]
    o=np.argsort(l); n8=len(l)//8
    def mean_ang(v): return np.degrees(np.arctan2(np.sin(v).mean(), np.cos(v).mean()))
    a0=mean_ang(th[o[:n8]]); a7=mean_ang(th[o[-n8:]])
    d=(a7-a0+180)%360-180
    return d
mode=sys.argv[1]
if mode=='ours':
    png=sys.argv[2]; D=json.load(open(png.replace('.png','.json'))); dsr=D['dsr']
    q=np.asarray(Image.open(png).convert('RGB')).astype(float)/255
    m=np.zeros(q.shape[:2],bool)
    for poly in D['polys']:
        mk=Image.new('L',(q.shape[1],q.shape[0]),0)
        ImageDraw.Draw(mk).polygon([(x*dsr,y*dsr) for x,y in poly],fill=255)
        m|=np.asarray(mk)>128
    m=nd.binary_erosion(m,np.ones((5,5)))
    sd,frac=circsd(q,m); dr=drift(q,m)
    print('%-24s chroma-direction sd %s   drift dark->bright %s   (chroma-bearing %.0f%%)'%(
        sys.argv[3], '%5.2f deg'%sd if sd else '   n/a', '%+6.1f deg'%dr if dr is not None else '  n/a',
        100*frac))
else:
    f=sys.argv[2]; box=tuple(map(int,sys.argv[3].split(',')))
    q=np.asarray(Image.open(f).convert('RGB')).astype(float)/255
    m=np.zeros(q.shape[:2],bool); m[box[1]:box[3],box[0]:box[2]]=True
    sd,frac=circsd(q,m); dr=drift(q,m)
    print('%-24s chroma-direction sd %5.2f deg   drift dark->bright %+6.1f deg   (chroma-bearing %.0f%%)'%(
        sys.argv[4], sd, dr if dr is not None else float('nan'), 100*frac))
