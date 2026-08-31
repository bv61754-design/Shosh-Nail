import numpy as np, sys
from PIL import Image, ImageDraw
f=sys.argv[1]; name=sys.argv[2]
nails=[tuple(map(int,p.split(','))) for p in sys.argv[3].split(';')]
skins=[tuple(map(int,p.split(','))) for p in sys.argv[4].split(';')]
R=int(sys.argv[5]) if len(sys.argv)>5 else 9
im=Image.open(f).convert('RGB'); q=np.asarray(im).astype(float)/255
l=0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]
def med(pts):
    v=[]
    for x,y in pts: v.append(np.median(l[y-R:y+R+1, x-R:x+R+1]))
    return np.array(v)
n=med(nails); s=med(skins)
print('%-12s nail med %.3f  skin med %.3f  nail/skin %.2f'%(name,np.median(n),np.median(s),np.median(n)/np.median(s)))
print('             nails: %s'%' '.join('%.2f'%x for x in n))
print('             skin : %s'%' '.join('%.2f'%x for x in s))
d=im.copy(); dr=ImageDraw.Draw(d)
for x,y in nails: dr.rectangle([x-R,y-R,x+R,y+R],outline=(0,255,0),width=2)
for x,y in skins: dr.rectangle([x-R,y-R,x+R,y+R],outline=(255,0,0),width=2)
d.save('night/boxes-%s.png'%name)
