const{chromium}=require('playwright-core');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const p=await c.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://127.0.0.1:8123/design.html',{waitUntil:'load'});
await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(()=>{
  const d=SN.Nail.blank(); const t=performance.now(); let r;
  for(let i=0;i<8;i++) r=SN.Nail.preview(d,{});
  const vec=(performance.now()-t)/8;
  const t2=performance.now(); let s;
  for(let i=0;i<8;i++) s=SN.Nail.thumb(d,120);
  return {previewMs:Math.round(vec*100)/100, nodes:r.querySelectorAll('*').length,
          thumbMs:Math.round((performance.now()-t2)/8*100)/100};
})));
await b.close();})();
