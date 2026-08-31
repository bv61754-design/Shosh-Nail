const{chromium}=require('playwright-core');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:1240,height:300},deviceScaleFactor:2});
for(const off of [false,true]){
  const p=await c.newPage();
  await p.goto('http://127.0.0.1:8123/_gloss.html?m=color'+(off?'&g=off':''),{waitUntil:'load'});
  await p.waitForTimeout(1400);
  await p.screenshot({path:'gloss/fid-'+(off?'off':'on')+'.png',fullPage:true});
  await p.close();
}
await b.close(); console.log('ok');})();
