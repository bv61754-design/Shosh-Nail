const{chromium}=require('playwright-core');const fs=require('fs');
(async()=>{
const [out,color,pat]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1280,height:900},deviceScaleFactor:3});
const p=await c.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://127.0.0.1:8123/design.html',{waitUntil:'load'});
await p.waitForTimeout(1200);
await p.evaluate(({col,pat})=>{
  const d=SN.Nail.blank(); d.color=col;
  Object.keys(d.nails).forEach(k=>{d.nails[k].color=col; if(pat) d.nails[k].pattern={kind:pat,color:'#F6EDE6',color2:'#D9A441',scale:1};});
  const host=document.createElement('div');
  host.id='probe'; host.style.cssText='position:fixed;inset:0;z-index:9999;background:#000';
  const svg=SN.Nail.photoPreview? SN.Nail.photoPreview(d,{w:1200}) : SN.Nail.preview(d,{w:1200});
  host.appendChild(svg); document.body.appendChild(host);
},{col:color,pat:pat||null});
await p.waitForTimeout(2500);
const el=await p.$('#probe svg');
await el.screenshot({path:out});
const polys=await p.evaluate(()=>{
  const svg=document.querySelector('#probe svg'); const bb=svg.getBoundingClientRect(); const res=[];
  svg.querySelectorAll('g.sn-photo-nail').forEach(wrap=>{
    const path=wrap.querySelector('g.nail > g[clip-path] path')||wrap.querySelector('g.nail path');
    if(!path) return; const L=path.getTotalLength(), m=path.getScreenCTM(); const pts=[];
    for(let i=0;i<220;i++){const q=path.getPointAtLength(L*i/220);
      pts.push([(q.x*m.a+q.y*m.c+m.e-bb.x),(q.x*m.b+q.y*m.d+m.f-bb.y)]);}
    res.push(pts);});
  return res;
});
fs.writeFileSync(out.replace(/\.png$/,'.json'),JSON.stringify({polys,dsr:3}));
console.log('plates',polys.length);
await b.close();})();
