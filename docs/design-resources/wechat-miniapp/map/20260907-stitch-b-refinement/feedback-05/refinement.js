// Design companion: preserve source geometry and return context during image expansion.
const photoImage=document.getElementById('photo-original');
const flight=document.createElement('div');flight.id='photo-flight';
const flightImage=document.createElement('img'),wash=document.createElement('span');wash.className='flight-wash';flight.append(flightImage,wash);viewer.append(flight);
let photoProgress=0,photoFrame=0,photoEpoch=0,photoFrom=null,photoTo=null,photoNatural={w:1,h:1};
const rectOf=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
const interpolate=(a,b,p)=>a+(b-a)*p;
function paintPhoto(p){
 photoProgress=p;viewer.style.setProperty('--reveal',String(p));
 if(!photoFrom||!photoTo)return;
 const box={};for(const k of ['x','y','w','h'])box[k]=interpolate(photoFrom[k],photoTo[k],p);
 Object.assign(flight.style,{left:box.x+'px',top:box.y+'px',width:box.w+'px',height:box.h+'px',borderRadius:(10*(1-p))+'px'});
 const ratio=photoNatural.w/photoNatural.h;
 const cover=Math.max(photoFrom.w/photoNatural.w,photoFrom.h/photoNatural.h);
 const contain=Math.min(photoTo.w/photoNatural.w,photoTo.h/photoNatural.h);
 const width=photoNatural.w*interpolate(cover,contain,p),height=width/ratio;
 Object.assign(flightImage.style,{width:width+'px',height:height+'px',left:(box.w-width)/2+'px',top:(box.h-height)/2+'px',filter:`blur(${1.6*(1-p)}px)`});
 wash.style.opacity=String(1-p);
}
function movePhoto(target){
 cancelAnimationFrame(photoFrame);const from=photoProgress,start=performance.now(),duration=reduced()?100:360*Math.max(.25,Math.abs(target-from));
 viewer.dataset.motion=target?'opening':'closing';
 function tick(now){const t=Math.min(1,(now-start)/duration),p=from+(target-from)*(1-Math.pow(1-t,3));paintPhoto(p);
  if(t<1){photoFrame=requestAnimationFrame(tick);return;}
  if(target){viewer.dataset.motion='open';}else{viewer.dataset.motion='closed';viewer.close();}
 }photoFrame=requestAnimationFrame(tick);
}
async function expandPhoto(){
 const epoch=++photoEpoch;photoFrom=rectOf(photoTrigger);photoProgress=0;viewer.dataset.motion='opening';viewer.style.setProperty('--reveal','0');
 flightImage.src=photoImage.src;flightImage.alt='';
 const thumb=photoTrigger.querySelector('img');photoNatural={w:thumb.naturalWidth||1,h:thumb.naturalHeight||1};photoTo=photoFrom;paintPhoto(0);
 try{await photoImage.decode();}catch{if(epoch===photoEpoch){viewer.dataset.motion='open';viewer.style.setProperty('--reveal','1');}return;}
 if(epoch!==photoEpoch||!viewer.open)return;
 photoNatural={w:photoImage.naturalWidth,h:photoImage.naturalHeight};photoTo=rectOf(photoImage);paintPhoto(0);movePhoto(1);
}
function collapsePhoto(){++photoEpoch;if(!viewer.open)return;if(photoTrigger)photoFrom=rectOf(photoTrigger);movePhoto(0);}
// content.js calls these after it has assigned the actual facility and caption.
viewer.addEventListener('cancel',e=>{e.preventDefault();collapsePhoto();});
viewer.addEventListener('close',()=>{cancelAnimationFrame(photoFrame);photoEpoch++;photoProgress=0;viewer.dataset.motion='closed';});
addEventListener('resize',()=>{if(viewer.open){photoFrom=rectOf(photoTrigger);photoTo=rectOf(photoImage);paintPhoto(photoProgress);}});
