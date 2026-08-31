const{chromium}=require('playwright-core');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const c=await b.newContext({viewport:{width:400,height:300},deviceScaleFactor:1});
const p=await c.newPage();
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto('http://127.0.0.1:8123/_gloss.html?m=finish',{waitUntil:'load'});
await p.waitForTimeout(900);
const r=await p.evaluate(()=>{
  const NS='http://www.w3.org/2000/svg';
  function mk(useTag,alpha){
    const svg=document.createElementNS(NS,'svg');
    svg.setAttribute('width',100);svg.setAttribute('height',160);
    svg.setAttribute('viewBox','0 0 100 160');
    const defs=document.createElementNS(NS,'defs');svg.appendChild(defs);
    const img=document.createElementNS(NS,'image');
    img.setAttribute('id','probe-img');img.setAttribute('x',0);img.setAttribute('y',0);
    img.setAttribute('width',1);img.setAttribute('height',1);
    img.setAttribute('preserveAspectRatio','none');
    img.setAttribute('href',SN.Gloss.shade);defs.appendChild(img);
    const iso=document.createElementNS(NS,'g');iso.setAttribute('style','isolation:isolate');
    const r=document.createElementNS(NS,'rect');
    r.setAttribute('width',100);r.setAttribute('height',160);r.setAttribute('fill','#C0C0C0');
    iso.appendChild(r);
    let node;
    if(useTag){node=document.createElementNS(NS,'use');
      node.setAttribute('href','#probe-img');
      node.setAttribute('transform','scale(100 160)');
    }else{node=document.createElementNS(NS,'image');
      node.setAttribute('x',0);node.setAttribute('y',0);node.setAttribute('width',100);node.setAttribute('height',160);
      node.setAttribute('preserveAspectRatio','none');node.setAttribute('href',SN.Gloss.shade);}
    node.setAttribute('style','mix-blend-mode:multiply');
    node.setAttribute('opacity',alpha);
    iso.appendChild(node);svg.appendChild(iso);
    document.body.appendChild(svg);return svg;
  }
  const a=mk(false,1), b2=mk(true,1), c2=mk(true,0.95);
  return {ok:1};
});
await p.waitForTimeout(600);
// sample the three svgs
const px=await p.evaluate(()=>{
  const svgs=[...document.querySelectorAll('body > svg')];
  return svgs.length;
});
console.log('svgs appended',px);
await p.screenshot({path:'gloss/probe.png',fullPage:true});
await b.close();})();
