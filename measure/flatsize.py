import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd

def flat(l, m, N):
    g = np.hypot(*np.gradient(nd.gaussian_filter(l/np.median(l[m]), 1.2)))*N*0.01
    gv = g[m]
    return np.median(gv), (gv < 0.004).mean()

# reference at a range of widths
q = np.asarray(Image.open('refs/gloss-nail-1.png').convert('RGB')).astype(float)/255
lr = 0.2126*q[...,0]+0.7152*q[...,1]+0.0722*q[...,2]
mr = lr > 0.28
mr = nd.binary_opening(mr, np.ones((9,9))); mr = nd.binary_closing(mr, np.ones((15,15)))
lab,n = nd.label(mr); sz = nd.sum(mr,lab,range(1,n+1)); mr = lab==(1+int(np.argmax(sz)))
ys,xs = np.nonzero(mr); y0,y1,x0,x1 = ys.min(),ys.max()+1,xs.min(),xs.max()+1
subr = lr[y0:y1,x0:x1]; smr = mr[y0:y1,x0:x1]
REF = {}
for N in range(40, 60):
    k = N/432.
    h2,w2 = int(subr.shape[0]*k), int(subr.shape[1]*k)
    s2 = np.asarray(Image.fromarray((subr*255).astype(np.uint8)).resize((w2,h2),Image.LANCZOS)).astype(float)/255
    m2 = np.asarray(Image.fromarray((smr*255).astype(np.uint8)).resize((w2,h2),Image.LANCZOS))>128
    m2 = nd.binary_erosion(m2, np.ones((3,3)))
    REF[N] = flat(s2, m2, N)

png = sys.argv[1]
D = json.load(open(png.replace('.png','.json'))); dsr = D['dsr']
qq = np.asarray(Image.open(png).convert('RGB')).astype(float)/255
ll = 0.2126*qq[...,0]+0.7152*qq[...,1]+0.0722*qq[...,2]
print('%-6s %6s   %-16s   %-16s'%('plate','width','ours |grad| flat','ref  |grad| flat'))
og=[];of=[];rg=[];rf=[]
for i,poly in enumerate(D['polys']):
    mk = Image.new('L',(qq.shape[1],qq.shape[0]),0)
    ImageDraw.Draw(mk).polygon([(x*dsr,y*dsr) for x,y in poly],fill=255)
    m = nd.binary_erosion(np.asarray(mk)>128, np.ones((3,3)))
    ys,xs = np.nonzero(m)
    P = np.stack([xs-xs.mean(),ys-ys.mean()]).astype(float)
    C = P@P.T/P.shape[1]; w,v = np.linalg.eigh(C)
    u = P.T@v[:,int(np.argmin(w))]; N = int(round(u.max()-u.min()))
    gg,ff = flat(ll,m,N)
    r = REF.get(max(40,min(59,N)))
    og.append(gg); of.append(ff); rg.append(r[0]); rf.append(r[1])
    print('%-6d %6d   %.4f  %5.1f%%      %.4f  %5.1f%%'%(i,N,gg,100*ff,r[0],100*r[1]))
print('mean          %.4f  %5.1f%%      %.4f  %5.1f%%'%(np.mean(og),100*np.mean(of),np.mean(rg),100*np.mean(rf)))
