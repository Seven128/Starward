// Editable design experiment, not a WEAPP renderer. Optical reference: README.
const ns='http://www.w3.org/2000/svg';let sequence=0;
export function mountLiquidGlass(element,{theme='light'}={}){
 element.dataset.liquidGlass=theme;
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;width:0;height:0;pointer-events:none';
 const id='starward-glass-'+(++sequence);
 svg.innerHTML='<filter id="'+id+'" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="24" xChannelSelector="R" yChannelSelector="G"/></filter>';
 document.body.append(svg);const image=svg.querySelector('feImage');let key='',raf=0,mode='refractive',disposed=false;
 const enhanced=/Chrome\/|Chromium\//.test(navigator.userAgent)&&CSS.supports('backdrop-filter','url("#'+id+'")');
 const applyMode=()=>{element.dataset.glassMode=mode==='refractive'&&!enhanced?'translucent':mode;
  if(mode==='refractive'&&enhanced)element.style.setProperty('--glass-displacement','url("#'+id+'")');else element.style.removeProperty('--glass-displacement');};
 const update=()=>{
  if(disposed)return;const box=element.getBoundingClientRect();if(box.width<1||box.height<1)return;
  const radius=parseFloat(getComputedStyle(element).borderTopLeftRadius)||20,w=Math.ceil(box.width),h=Math.ceil(box.height),next=[w,h,radius].join(':');if(next===key)return;key=next;
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d'),data=ctx.createImageData(w,h),rimData=ctx.createImageData(w,h),r=Math.min(radius,w/2,h/2),bevel=Math.min(16,r),depth=7,base=3,ior=1.5;
  // Convex fourth-order cross-section, Snell bending through the top surface,
  // projected to a background plane: a bounded single-interface approximation.
  // Foreground text never enters the filter. No scene screenshots/per-frame copies.
  const shifts=Array.from({length:257},(_,i)=>{const t=Math.max(.0001,i/256),u=1-t,a=1-u**4,height=a**.25,slope=depth/bevel*u**3*a**(-.75),theta=Math.atan(slope),bend=theta-Math.asin(Math.sin(theta)/ior);return Math.min(12,(base+depth*height)*Math.tan(bend));});
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const px=x+.5-w/2,py=y+.5-h/2,qx=Math.abs(px)-(w/2-r),qy=Math.abs(py)-(h/2-r),ox=Math.max(qx,0),oy=Math.max(qy,0),len=Math.hypot(ox,oy),distance=len+Math.min(Math.max(qx,qy),0)-r;
   let nx=0,ny=0;if(len){nx=ox/len*Math.sign(px);ny=oy/len*Math.sign(py);}else if(qx>qy)nx=Math.sign(px);else ny=Math.sign(py);
   const inset=Math.max(0,-distance),shift=distance<=0&&inset<bevel?shifts[Math.round(inset/bevel*256)]:0,i=(y*w+x)*4;
   data.data[i]=Math.round(255*(.5-nx*shift/24));data.data[i+1]=Math.round(255*(.5-ny*shift/24));data.data[i+2]=128;data.data[i+3]=255;
   // Directional rim follows the same normals, with a weaker secondary reflection.
   const light=-.447*nx-.894*ny,shine=.035+.82*Math.max(0,light)**4+.17*Math.max(0,-light)**9,band=Math.exp(-(((inset-.55)/.66)**2))+.14*Math.exp(-(((inset-1.6)/1.6)**2));
   rimData.data[i]=rimData.data[i+1]=rimData.data[i+2]=255;rimData.data[i+3]=distance<=0?Math.round(255*Math.min(1,shine*band)):0;
  }
  ctx.putImageData(data,0,0);image.setAttribute('href',c.toDataURL());ctx.putImageData(rimData,0,0);element.style.setProperty('--glass-rim-map','url("'+c.toDataURL()+'")');applyMode();
 };
 const observer=new ResizeObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(update);});observer.observe(element);update();
 return {setMode(value){mode=value;applyMode();},destroy(){if(disposed)return;disposed=true;observer.disconnect();cancelAnimationFrame(raf);svg.remove();element.style.removeProperty('--glass-displacement');element.style.removeProperty('--glass-rim-map');delete element.dataset.liquidGlass;delete element.dataset.glassMode;}};
}
const instances=[...document.querySelectorAll('[data-liquid-glass]')].map(e=>mountLiquidGlass(e,{theme:e.dataset.liquidGlass}));
addEventListener('pagehide',e=>{if(!e.persisted)instances.forEach(i=>i.destroy());});


