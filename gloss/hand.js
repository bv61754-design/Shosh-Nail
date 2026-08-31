const{chromium}=require('playwright-core');
(async()=>{
const off = process.argv[2]==='off';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2});
const p=await c.newPage();
p.on('pageerror',e=>console.log('PAGEERR',e.message));
if(off) await p.addInitScript(()=>{addEventListener('DOMContentLoaded',()=>{});});
await p.goto('http://127.0.0.1:8123/design.html',{waitUntil:'load'});
if(off){ await p.evaluate(()=>{ delete window.SN.Gloss; }); await p.reload({waitUntil:'load'}); }
await p.waitForTimeout(2500);
const el = await p.$('.studio-stage, .stage, #stage, .studio-preview, [class*=preview]');
if(el) await el.screenshot({path:process.argv[3]});
else await p.screenshot({path:process.argv[3]});
console.log('shot', process.argv[3], !!el);
await b.close();})();
