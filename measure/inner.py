import numpy as np, json, sys
from PIL import Image
from scipy import ndimage as nd
png=sys.argv[1]
D=json.load(open(png.replace('.png','.json'))); dsr=D['dsr']
q=np.asarray(Image.open(png).convert('RGB')).astype(float)/255
gs=[];fs=[]
for poly in D['polys']:
    P=np.array(poly)*dsr; c=P.mean(0); Pc=P-c
    C=Pc.T@Pc/len(Pc); w,v=np.linalg.eigh(C)
    lon=v[:,int(np.argmax(w))]; sho=v[:,int(np.argmin(w))]
    t=Pc@lon; u=Pc@sho; N=u.max()-u.min(); L=t.max()-t.min()
    pts=np.array([c+lon*a*L*0.25+sho*b*N*0.25 for a in(-1,1) for b in(-1,1)])
    x0,y0=pts.min(0).astype(int); x1,y1=pts.max(0).astype(int)
    sub=q[y0:y1,x0:x1]
    if sub.shape[0]<6 or sub.shape[1]<6: continue
    l=0.2126*sub[...,0]+0.7152*sub[...,1]+0.0722*sub[...,2]
    g=np.hypot(*np.gradient(nd.gaussian_filter(l/np.median(l),1.2)))*N*0.01
    gs.append(np.median(g)); fs.append((g<0.004).mean())
print('%-22s interior |grad| %.4f  flat %5.1f%%   (five real press-ons: 0.0085-0.0139, 9.4-18.9%%)'%(
    sys.argv[2],np.mean(gs),100*np.mean(fs)))
