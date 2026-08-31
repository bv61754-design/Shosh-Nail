const{chromium}=require('playwright-core');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const p=await c.newPage();
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto('http://127.0.0.1:8123/design.html',{waitUntil:'load'});
await p.waitForTimeout(2500);
console.log(JSON.stringify(await p.evaluate(()=>{
  const s=new XMLSerializer();
  const svgs=[...document.querySelectorAll('svg')];
  let total=0, glossImgs=0;
  svgs.forEach(v=>{ total+=s.serializeToString(v).length;
    glossImgs+=[...v.querySelectorAll('defs image')].filter(i=>/^data:image\/png/.test(i.getAttribute('href')||'')).length; });
  return {svgCount:svgs.length, totalSvgBytes:total, glossMapCopies:glossImgs,
          domNodes:document.querySelectorAll('*').length};
})));
await b.close();})();
