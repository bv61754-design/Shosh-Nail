const{chromium}=require('playwright-core');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
const p=await c.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://127.0.0.1:8123/design.html',{waitUntil:'load'}); await p.waitForTimeout(1200);
const out=await p.evaluate(()=>{
  const d=SN.Nail.blank(); d.color='#E9C2C0';
  const host=document.createElement('div'); host.id='probe'; host.style.cssText='position:fixed;inset:0;z-index:9999';
  host.appendChild((SN.Nail.photoPreview?SN.Nail.photoPreview(d,{w:1200}):SN.Nail.preview(d,{w:1200}))); document.body.appendChild(host);
  const res=[];
  document.querySelectorAll('#probe g.sn-photo-nail').forEach((wrap,i)=>{
    const screens=[...wrap.querySelectorAll('rect')].filter(r=>(r.getAttribute('style')||'').includes('screen'));
    res.push({i, screens: screens.map(r=>({op:r.getAttribute('opacity'), fill:r.getAttribute('fill')}))});
  });
  const grads=[...document.querySelectorAll('#probe linearGradient')].slice(0,60).map(g=>g.id+':'+[...g.children].map(s=>s.getAttribute('offset')+'/'+s.getAttribute('stop-opacity')).join(' '));
  return {res, n:grads.length};
});
console.log(JSON.stringify(out.res.slice(0,3),null,1));
await b.close();})();
