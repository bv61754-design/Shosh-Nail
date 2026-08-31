const{chromium}=require('playwright-core');const fs=require('fs');
(async()=>{
const [out,color]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1280,height:900},deviceScaleFactor:3});
const p=await c.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://127.0.0.1:8123/design.html',{waitUntil:'load'});
await p.waitForTimeout(1200);
await p.evaluate(()=>{const r=document.getElementById('studio-view-photo'); if(r){r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));}});
await p.waitForTimeout(600);
if(color) await p.evaluate((col)=>{
  const d=SN.Store.get('design')||{};
  d.color=col; Object.keys(d.nails||{}).forEach(k=>{d.nails[k].color=col;});
  SN.Store.set('design',d);
  window.dispatchEvent(new CustomEvent('sn:design'));
}, color);
await p.waitForTimeout(1800);
const el=await p.$('.studio-stage, .stage, #stage, .studio-preview, [class*=preview]');
const box=await el.boundingBox();
await el.screenshot({path:out});
const polys=await p.evaluate((box)=>{
  const res=[];
  document.querySelectorAll('g.sn-photo-nail').forEach(wrap=>{
    const path=wrap.querySelector('g.nail > g[clip-path] path')||wrap.querySelector('g.nail path');
    if(!path) return; const L=path.getTotalLength(), m=path.getScreenCTM(); const pts=[];
    for(let i=0;i<220;i++){const q=path.getPointAtLength(L*i/220);
      pts.push([(q.x*m.a+q.y*m.c+m.e-box.x),(q.x*m.b+q.y*m.d+m.f-box.y)]);}
    res.push(pts);});
  return res;},box);
fs.writeFileSync(out.replace(/\.png$/,'.json'),JSON.stringify({polys,dsr:3}));
console.log('plates',polys.length);
await b.close();})();
