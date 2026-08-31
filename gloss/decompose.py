import numpy as np
from PIL import Image
from scipy import ndimage as nd

m=np.load('gloss/mask.npy'); a=np.load('gloss/rgb.npy')
H,W,_=a.shape
grey=a.mean(2)
chrom=a-grey[...,None]                       # zero-mean chromatic part

# albedo hue direction: mean chromatic vector over the least-specular pixels
q=np.linalg.norm(chrom,axis=2)
sel=m&(q>np.percentile(q[m],55))
c=chrom[sel].mean(0); chat=c/np.linalg.norm(c)
print('albedo hue dir (R,G,B offsets)',np.round(chat,4))

proj=(chrom*chat).sum(2)                     # = d * ||chrom(C)||
K=np.percentile(proj[m],85)
d=np.clip(proj/K,0,None)
print('K',round(float(K),5),'  d: p5',round(float(np.percentile(d[m],5)),3),
      'p50',round(float(np.percentile(d[m],50)),3),'p99',round(float(np.percentile(d[m],99)),3))

ok=m&(d>0.35)
G=np.percentile((grey[ok]/d[ok]),3)          # albedo grey level
s=np.clip(grey-d*G,0,None)
print('G (albedo grey)',round(float(G),4),
      '  s: p50',round(float(np.percentile(s[m],50)),4),
      'p95',round(float(np.percentile(s[m],95)),4),
      'max',round(float(s[m].max()),4))

# reconstruct with the recovered albedo to check the model holds
C=chat*K+G
rec=np.clip(C[None,None,:]*d[...,None]+s[...,None],0,1)
err=np.abs(rec-a)[m].mean()
print('recovered albedo RGB',np.round(C*255).astype(int),' mean abs recon err',round(float(err),4))
Image.fromarray((np.where(m[...,None],rec,0)*255).astype(np.uint8)).save('gloss/recon.png')

np.save('gloss/d.npy',d); np.save('gloss/s.npy',s)
side=np.concatenate([np.where(m[...,None],a,0),np.where(m[...,None],rec,0)],axis=1)
Image.fromarray((side*255).astype(np.uint8)).resize((side.shape[1]//3,side.shape[0]//3)).save('gloss/cmp.png')
