import numpy as np, sys, json
from PIL import Image, ImageDraw
from scipy import ndimage as nd
def deciles(px,name):
    R,G,B=px[:,0],px[:,1],px[:,2]
    L=0.2126*R+0.7152*G+0.0722*B
    mx=px.max(1); mn=px.min(1); S=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
    o=np.argsort(L); L=L[o]; S=S[o]; n=len(L)
    out=[]
    for i in range(10):
        a,b=n*i//10,n*(i+1)//10
        out.append((np.median(L[a:b]),np.median(S[a:b])))
    print('%-9s lum %s'%(name,' '.join('%.2f'%x for x,_ in out)))
    print('%-9s sat %s   (top/bottom %.2f)'%('',' '.join('%.3f'%y for _,y in out), out[-1][1]/max(out[0][1],1e-6)))
mode=sys.argv[1]
if mode=='ref':
    im=Image.open(sys.argv[2]).convert('RGB'); q=np.asarray(im).astype(float)/255
    boxes=[tuple(map(int,b.split(','))) for b in sys.argv[3].split(';')]
    px=np.concatenate([q[y0:y1,x0:x1].reshape(-1,3) for x0,y0,x1,y1 in boxes])
    d=im.copy(); dr=ImageDraw.Draw(d)
    for x0,y0,x1,y1 in boxes: dr.rectangle([x0,y0,x1,y1],outline=(0,255,0),width=2)
    d.save('night/satbox.png')
    deciles(px,sys.argv[4])
else:
    png=sys.argv[2]; D=json.load(open(png.replace('.png','.json'))); dsr=D['dsr']
    im=Image.open(png).convert('RGB'); q=np.asarray(im).astype(float)/255
    nail=np.zeros(q.shape[:2],bool)
    for poly in D['polys']:
        mk=Image.new('L',im.size,0); ImageDraw.Draw(mk).polygon([(x*dsr,y*dsr) for x,y in poly],fill=255)
        nail|=np.asarray(mk)>128
    deciles(q[nd.binary_erosion(nail,np.ones((13,13)))],sys.argv[3])
