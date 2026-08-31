const{chromium}=require('playwright-core');
(async()=>{
const [out,mode,off]=process.argv.slice(2);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1280,height:900},deviceScaleFactor:3});
const p=await c.newPage();
p.on('pageerror',e=>console.log('PAGEERR',e.message));
if(off==='off') await p.addInitScript(()=>{ Object.defineProperty(window,'SN_NOGLOSS',{value:1}); });
await p.goto('http://127.0.0.1:8123/design.html',{waitUntil:'load'});
  if(off==='off'){ await p.evaluate(()=>{ delete window.SN.Gloss; }); }
if(off==='off') await p.evaluate(()=>{ delete SN.Gloss; SN.UI&&0; });
await p.waitForTimeout(1200);
// pick a colour so the nails are not nude
await p.evaluate(()=>{
  const d=SN.Store.get('design')||{};
  try{ SN.Studio && SN.Studio.setAll && SN.Studio.setAll({color:'#B3122B'}); }catch(e){}
});
// click the requested preview tab
if(mode==='photo'){ await p.evaluate(()=>{const r=document.getElementById('studio-view-photo'); if(r){r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true}));}}); }
await p.waitForTimeout(2000);
const el=await p.$('.studio-stage, .stage, #stage, .studio-preview, [class*=preview]');
await (el||p).screenshot({path:out});
console.log('shot',out);
await b.close();})();
