/* One image gesture owner for site and facility albums, including nested panel consumers. */
(() => {
 const F=StarwardFluid;
 F.mountImage=(image,{viewer,canStep,onStep,onClose,chrome,beforeGrab,isBusy})=>{
  let drag=null,x=0,y=0,scale=1;
  const paint=()=>{image.style.transform=`translate(${x}px,${y}px) scale(${scale})`;viewer.style.setProperty('--viewer-alpha',String(.98*Math.max(.3,1-Math.max(0,y)/500)));};
  const mx=F.scalar(0,v=>{x=v;paint();}),my=F.scalar(0,v=>{y=v;paint();}),ms=F.scalar(1,v=>{scale=v;paint();});
  const stop=()=>{mx.stop();my.stop();ms.stop();};
  const settle=(vx=0,vy=0)=>{viewer.dataset.motion='open';let pending=3;const done=()=>{if(--pending===0&&!drag)chrome(false);};mx.to(0,{velocity:vx,bouncy:true,done});ms.to(1,{done});my.to(0,{velocity:vy,bouncy:true,done});};
  const cancel=()=>{if(!drag)return;drag=null;settle();};
  const api={reset(){stop();drag=null;mx.set(0);my.set(0);ms.set(1);},enter(direction){api.reset();mx.set(F.reduced()?0:direction*48);chrome(true);settle();},stop};
  image.addEventListener('dragstart',e=>e.preventDefault());
  viewer.addEventListener('pointerdown',e=>{if(!e.isPrimary){cancel();return;}if(e.button!==0||isBusy())return;if(e.target!==image){if(viewer.dataset.motion!=='opening'||e.target.closest('button'))return;const r=viewer.querySelector('#photo-flight').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;}e.preventDefault();stop();const live=beforeGrab?.();if(live){mx.set(live.x);my.set(live.y);ms.set(live.scale);}drag={id:e.pointerId,px:e.clientX,py:e.clientY,ox:x,oy:y,minX:canStep(1)?-Infinity:0,maxX:canStep(-1)?Infinity:0,rawX:x,rawY:y,baseScale:scale/Math.max(.64,1-Math.max(0,y)/800),axis:null,dx:0,dy:0,sx:[{v:e.clientX,t:e.timeStamp}],sy:[{v:e.clientY,t:e.timeStamp}]};viewer.setPointerCapture(e.pointerId);});
  viewer.addEventListener('pointermove',e=>{const g=drag;if(!g||g.id!==e.pointerId)return;g.dx=e.clientX-g.px;g.dy=e.clientY-g.py;if(!g.axis&&Math.max(Math.abs(g.dx),Math.abs(g.dy))>7)g.axis=Math.abs(g.dx)>Math.abs(g.dy)?'x':'y';if(!g.axis)return;chrome(true);viewer.dataset.motion='dragging';g.sx.push({v:e.clientX,t:e.timeStamp});g.sy.push({v:e.clientY,t:e.timeStamp});g.sx=g.sx.slice(-24);g.sy=g.sy.slice(-24);
    if(g.axis==='x'){const raw=F.unRubber(g.ox,g.minX,g.maxX,52)+g.dx;g.rawX=raw;mx.set(F.rubber(raw,g.minX,g.maxX,52));}
    else{const raw=F.unRubber(g.oy,0,innerHeight*.7,68)+g.dy;g.rawY=raw;my.set(F.reduced()?0:F.rubber(raw,0,innerHeight*.7,68));mx.set(F.reduced()?0:g.ox+g.dx*.2);ms.set(F.reduced()?1:g.baseScale*Math.max(.64,1-Math.max(0,y)/800));}});
  viewer.addEventListener('pointerup',e=>{const g=drag;drag=null;if(!g)return;const vx=F.velocity(g.sx,e.timeStamp),vy=F.velocity(g.sy,e.timeStamp);
    if(g.axis==='y'&&(g.dy>100||(g.dy>20&&vy>.55))){stop();onClose();return;}
    if(g.axis==='x'&&(Math.abs(g.dx)>70||(Math.abs(g.dx)>18&&Math.abs(vx)>.5))){const direction=(Math.abs(vx)>.5?vx:g.dx)<0?1:-1;if(canStep(direction)){stop();onStep(direction);return;}}
    settle(g.axis==='x'?vx*F.resistance(g.rawX,g.minX,g.maxX,52):0,g.axis==='y'?vy*F.resistance(g.rawY,0,innerHeight*.7,68):0);});
  addEventListener('pointerdown',e=>{if(!e.isPrimary&&drag)cancel();},true);viewer.addEventListener('pointercancel',cancel);viewer.addEventListener('lostpointercapture',()=>{if(drag)cancel();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();mx.finish();my.finish();ms.finish();}});
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{if(F.reduced()){mx.finish();my.finish();ms.finish();}});
  return api;
 };
})();
