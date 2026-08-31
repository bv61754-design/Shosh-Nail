import numpy as np, json, sys
D=json.load(open(sys.argv[1]))
def norm(poly):
    P=np.array(poly,float)
    P-=P.mean(0)
    C=P.T@P/len(P); w,v=np.linalg.eigh(C)
    lon=v[:,int(np.argmax(w))]; sho=v[:,int(np.argmin(w))]
    t=P@lon; u=P@sho
    L=t.max()-t.min(); W=u.max()-u.min()
    t=(t-t.min())/L; u=u/W
    if np.abs(u[t<0.15]).mean() > np.abs(u[t>0.85]).mean(): t=1-t   # cuticle (wide) at 0
    return t,u,L,W
prof=[]
for poly in D['polys']:
    t,u,L,W=norm(poly)
    # half-width at 12 stations along the length
    hw=[]
    for i in range(12):
        a,b=i/12.,(i+1)/12.; sel=(t>=a)&(t<b)
        hw.append(np.abs(u[sel]).max() if sel.sum()>2 else np.nan)
    prof.append((W/L, np.array(hw)))
ar=np.array([p[0] for p in prof]); H=np.array([p[1] for p in prof])
print('aspect W/L per plate: %s'%' '.join('%.3f'%x for x in ar))
print('   spread: min %.3f max %.3f  max/min %.2f  cv %.3f'%(ar.min(),ar.max(),ar.max()/ar.min(),ar.std()/ar.mean()))
Hn=H/np.nanmax(H,1,keepdims=True)
print('normalised half-width profile, cuticle->tip (mean of 10):')
print('   '+' '.join('%.3f'%x for x in np.nanmean(Hn,0)))
print('   per-plate spread at each station (max-min):')
print('   '+' '.join('%.3f'%x for x in (np.nanmax(Hn,0)-np.nanmin(Hn,0))))
