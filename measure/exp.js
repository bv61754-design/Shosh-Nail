const{chromium}=require('playwright-core');const fs=require('fs');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1});
const p=await c.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://127.0.0.1:8123/design.html',{waitUntil:'load'});
await p.waitForTimeout(1500);
const url=await p.evaluate(async()=>{
  const d=SN.Nail.blank(); d.color='#B3122B';
  Object.keys(d.nails).forEach(k=>{d.nails[k].color='#B3122B';});
  const svg=SN.Nail.preview(d,{w:1200});
  const host=document.createElement('div'); host.id='live';
  host.style.cssText='position:fixed;inset:0;z-index:9999;background:#000';
  host.appendChild(svg); document.body.appendChild(host);
  await new Promise(r=>setTimeout(r,1200));
  return SN.Nail.toDataURL(svg,{scale:1,bg:'#FFF8F6'});
});
fs.writeFileSync('night/exported.png',Buffer.from(url.split(',')[1],'base64'));
await (await p.$('#live svg')).screenshot({path:'night/live.png'});
console.log('ok');
await b.close();})();
