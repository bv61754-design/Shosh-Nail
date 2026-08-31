const{chromium}=require('playwright-core');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const p=await c.newPage();
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto('http://127.0.0.1:8123/_gloss.html?m=finish',{waitUntil:'load'});
await p.waitForTimeout(900);
console.log(JSON.stringify(await p.evaluate(()=>{
  const out={};
  const d=SN.Nail.blank();
  function timed(fn,n){const t=performance.now();let r;for(let i=0;i<n;i++)r=fn();return [Math.round((performance.now()-t)/n*100)/100,r];}
  let [tHand,hand]=timed(()=>SN.Nail.preview(d,{}),6);
  out.previewMs=tHand;
  out.previewNodes=hand.querySelectorAll('*').length;
  out.previewImages=hand.querySelectorAll('image').length;
  out.previewUses=hand.querySelectorAll('use[href^="#sn-gl"], use').length;
  out.previewGlossUses=[...hand.querySelectorAll('use')].filter(u=>/gl-/.test(u.getAttribute('href')||'')).length;
  out.previewBytes=new XMLSerializer().serializeToString(hand).length;
  let [tThumb,th]=timed(()=>SN.Nail.thumb(d,120),10);
  out.thumbMs=tThumb; out.thumbBytes=new XMLSerializer().serializeToString(th).length;
  out.thumbGloss=[...th.querySelectorAll('image')].filter(i=>/data:image\/png/.test(i.getAttribute('href')||'')).length;
  let [tOne,one]=timed(()=>SN.Nail.single(d.nails.leftIndex,d,{}),10);
  out.singleMs=tOne; out.singleBytes=new XMLSerializer().serializeToString(one).length;
  return out;
})));
await b.close();})();
