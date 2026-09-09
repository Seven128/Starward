// Design-resource adapter of the established SVG displacement technique; see README research.
// No React dependency, page screenshot, per-frame scene copy, or production runtime claim.
const ns='http://www.w3.org/2000/svg';let sequence=0;
export function mountLiquidGlass(element,{theme='light'}={}){
 element.dataset.liquidGlass=theme;
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;width:0;height:0;pointer-events:none';
 const id='starward-glass-'+(++sequence);svg.innerHTML=`<filter id="${id}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="-18" xChannelSelector="R" yChannelSelector="G"/></filter>`;
 document.body.append(svg);const image=svg.querySelector('feImage');let key='',raf=0;
 const update=()=>{const box=element.getBoundingClientRect();if(box.width<1||box.height<1)return;const radius=parseFloat(getComputedStyle(element).borderTopLeftRadius)||20,w=Math.ceil(box.width),h=Math.ceil(box.height),next=[w,h,radius].join(':');if(next===key)return;key=next;
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d'),data=ctx.createImageData(w,h),r=Math.min(radius,w/2,h/2),rim=12;
  // Rounded-rectangle signed distance and normal. Neutral center; bending confined to rim.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const px=x+.5-w/2,py=y+.5-h/2,qx=Math.abs(px)-(w/2-r),qy=Math.abs(py)-(h/2-r),ox=Math.max(qx,0),oy=Math.max(qy,0),len=Math.hypot(ox,oy),distance=len+Math.min(Math.max(qx,qy),0)-r;let nx=0,ny=0;if(len){nx=ox/len*Math.sign(px);ny=oy/len*Math.sign(py);}else if(qx>qy)nx=Math.sign(px);else ny=Math.sign(py);const amount=distance<=0?Math.pow(Math.max(0,1+distance/rim),2):1,i=(y*w+x)*4;data.data[i]=128+Math.round(nx*amount*100);data.data[i+1]=128+Math.round(ny*amount*100);data.data[i+2]=128;data.data[i+3]=255;}
  ctx.putImageData(data,0,0);image.setAttribute('href',c.toDataURL());
  // Enhanced path is only enabled on this verified Chromium preview family; syntax support alone is insufficient.
  if(/Chrome\/|Chromium\//.test(navigator.userAgent)&&CSS.supports('backdrop-filter',`url("#${id}")`)){element.style.setProperty('--glass-filter',`url("#${id}") blur(.35px) saturate(1.12)`);element.dataset.glassMode='refractive';}else element.dataset.glassMode='translucent';
 };
 const observer=new ResizeObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(update);});observer.observe(element);update();
 return {setMode(mode){element.dataset.glassMode=mode;if(mode==='translucent')element.style.removeProperty('--glass-filter');else if(mode==='refractive'){key='';update();}},destroy(){observer.disconnect();cancelAnimationFrame(raf);svg.remove();element.style.removeProperty('--glass-filter');delete element.dataset.liquidGlass;delete element.dataset.glassMode;}};
}
const instances=[...document.querySelectorAll('[data-liquid-glass]')].map(e=>mountLiquidGlass(e,{theme:e.dataset.liquidGlass}));
addEventListener('pagehide',e=>{if(!e.persisted)instances.forEach(i=>i.destroy());});
