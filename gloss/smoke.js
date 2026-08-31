const{chromium}=require('playwright-core');
(async()=>{
const pages=['index.html','design.html','shop.html','faq.html','admin.html','404.html'];
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
for(const w of [390]){
 for(const pg of pages){
  const c=await b.newContext({viewport:{width:w,height:844},deviceScaleFactor:1});
  const p=await c.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
  p.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push('CONSOLE '+m.text());});
  await p.goto('http://127.0.0.1:8123/'+pg,{waitUntil:'load'});
  await p.waitForTimeout(1800);
  const r=await p.evaluate(()=>{
    const s=new XMLSerializer(); let bytes=0,copies=0;
    document.querySelectorAll('svg').forEach(v=>{bytes+=s.serializeToString(v).length;
      copies+=[...v.querySelectorAll('defs image')].filter(i=>/^data:image\/png/.test(i.getAttribute('href')||'')).length;});
    return {ow:document.documentElement.scrollWidth, iw:window.innerWidth, bytes, copies,
            nodes:document.querySelectorAll('*').length};
  });
  console.log(String(w).padEnd(5),pg.padEnd(13),
    'scrollW',String(r.ow).padEnd(5),'inner',String(r.iw).padEnd(5),
    'svgKB',String(Math.round(r.bytes/1024)).padEnd(5),'mapCopies',String(r.copies).padEnd(3),
    'nodes',String(r.nodes).padEnd(5), errs.length?('ERR: '+errs.join(' | ')):'clean');
  await c.close();
 }
}
await b.close();})();
