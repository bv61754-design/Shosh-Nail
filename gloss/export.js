const{chromium}=require('playwright-core');const fs=require('fs');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:900,height:700},deviceScaleFactor:1});
const p=await c.newPage();
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto('http://127.0.0.1:8123/design.html',{waitUntil:'load'});
await p.waitForTimeout(1000);
const url=await p.evaluate(async()=>{
  const d=SN.Nail.blank(); d.color='#B3122B';
  Object.keys(d.nails).forEach(k=>{d.nails[k].color='#B3122B';});
  const svg=SN.Nail.preview(d,{});
  document.body.appendChild(svg);
  await new Promise(r=>setTimeout(r,600));
  return SN.Nail.toDataURL(svg,{scale:1,bg:'#FFF8F6'});
});
fs.writeFileSync('gloss/export.png',Buffer.from(url.split(',')[1],'base64'));
console.log('export bytes',url.length);
await b.close();})();
