const{chromium}=require('playwright-core');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
const p=await c.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://127.0.0.1:8123/design.html',{waitUntil:'load'}); await p.waitForTimeout(1200);
console.log(JSON.stringify(await p.evaluate(()=>{
  const d=SN.Nail.blank(); d.color='#C0392B';
  Object.keys(d.nails).forEach(k=>{d.nails[k].color='#C0392B';});
  const host=document.createElement('div'); host.id='probe'; host.style.cssText='position:fixed;inset:0;z-index:9999';
  host.appendChild(SN.Nail.photoPreview?SN.Nail.photoPreview(d,{w:488}):SN.Nail.preview(d,{w:488}));
  document.body.appendChild(host);
  const g=[...document.querySelectorAll('#probe g[filter]')].map(x=>x.getAttribute('filter'));
  const f=[...document.querySelectorAll('#probe filter')].map(x=>x.id);
  const fe=[...document.querySelectorAll('#probe feFuncR, #probe feFuncG, #probe feFuncB')]
     .slice(0,3).map(x=>x.tagName+' '+x.getAttribute('type')+' '+x.getAttribute('exponent'));
  return {groupsWithFilter:g.slice(0,4), filterIds:f.slice(0,6), funcs:fe};
}),null,1));
await b.close();})();
