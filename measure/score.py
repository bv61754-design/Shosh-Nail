import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as nd

def plates(png):
    D=json.load(open(png.replace('.png','.json'))); dsr=D['dsr']
    im=Image.open(png).convert('RGB'); a=np.asarray(im).astype(float)/255
    for poly in D['polys']:
        mk=Image.new('L',im.size,0); ImageDraw.Draw(mk).polygon([(x*dsr,y*dsr) for x,y in poly],fill=255)
        m=nd.binary_erosion(np.asarray(mk)>128,np.ones((5,5)))
        if m.sum()>800: yield a,m

def score(png,name):
    L=lambda a:0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2]
    pk=[];a2=[];a3=[];sr=[];gr=[];fl=[];sl=[]
    for a,m in plates(png):
        l=L(a); v=l[m]; med=np.median(v)
        mx=a.max(2); mn=a.min(2); sat=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
        pk.append(v.max()/med); a2.append((v>2*med).mean()); a3.append((v>3*med).mean())
        s=sat[m]; sr.append(np.percentile(s,2)/max(np.median(s),1e-6))
        ys,xs=np.nonzero(m); w=xs.max()-xs.min()
        y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
        sub=l[y0:y1+1,x0:x1+1]; sm=m[y0:y1+1,x0:x1+1]
        g=np.hypot(*np.gradient(nd.gaussian_filter(sub/np.median(sub[sm]),1.2)))*w*0.01
        gv=g[sm]; gr.append(np.median(gv)); fl.append((gv<0.004).mean())
        # chroma vs luminance slope, 8 bins
        c=sat[m]*l[m]     # crude chroma proxy in linear-ish terms
        q=np.argsort(v); n=len(v)//8
        xs_=[v[q[i*n:(i+1)*n]].mean() for i in range(8)]
        ys_=[c[q[i*n:(i+1)*n]].mean() for i in range(8)]
        sl.append(np.polyfit(xs_,ys_,1)[0])
    f=lambda x:np.mean(x)
    print('%-16s peak/body %5.2f  >2x %5.2f%%  >3x %5.2f%%  leastSat %.2f  |grad| %.4f  flat %4.1f%%  chromaSlope %+.3f'%(
        name,f(pk),100*f(a2),100*f(a3),f(sr),f(gr),100*f(fl),f(sl)))
    return dict(peak=f(pk),a2=f(a2),a3=f(a3),sat=f(sr),grad=f(gr),flat=f(fl),slope=f(sl))

out={}
for i in range(1,len(sys.argv),2):
    out[sys.argv[i+1]]=score(sys.argv[i],sys.argv[i+1])
print('%-16s targets:  1.8-2.1        8.40%%        3.80%%          0.23         0.0190       3.5%%        negative'%'')
json.dump({k:{a:float(b) for a,b in v.items()} for k,v in out.items()}, open('night/score.json','w'), indent=1)
