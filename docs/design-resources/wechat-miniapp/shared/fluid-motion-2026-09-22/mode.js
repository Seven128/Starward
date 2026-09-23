/* Three-detent interaction; caller owns mode/theme and accessibility state. */
(() => {
 const F=StarwardFluid;
 F.mountMode=(track,{getIndex,onCommit})=>{
  const thumb=track.querySelector('.mode-thumb');let drag=null,suppress=false;
  thumb.style.transition='none';const motion=F.scalar(getIndex(),v=>{thumb.style.transform=`translateX(${v*100}%)`;track.dataset.motion=motion.active?'settling':'idle';});
  const cancel=()=>{drag=null;track.dataset.dragging='false';motion.to(getIndex());};
  track.onpointerdown=e=>{if(!e.isPrimary||e.button!==0){cancel();return;}motion.stop();suppress=false;const step=track.getBoundingClientRect().width/3;drag={id:e.pointerId,x:e.clientX,y:e.clientY,step,origin:F.unRubber(motion.value*step,0,2*step,18),committed:getIndex(),axis:null,raw:motion.value*step,samples:[{v:e.clientX,t:e.timeStamp}]};};
  track.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;const g=drag,dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.axis&&Math.max(Math.abs(dx),Math.abs(dy))>6)g.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';if(g.axis==='y'){suppress=true;cancel();if(track.hasPointerCapture(e.pointerId))track.releasePointerCapture(e.pointerId);return;}if(g.axis!=='x')return;track.setPointerCapture(e.pointerId);e.preventDefault();suppress=true;g.raw=g.origin+dx;g.samples.push({v:e.clientX,t:e.timeStamp});g.samples=g.samples.slice(-24);motion.set(F.rubber(g.raw,0,2*g.step,18)/g.step);track.dataset.dragging='true';track.dataset.motion='dragging';};
  track.onpointerup=e=>{const g=drag;drag=null;if(!g)return;track.dataset.dragging='false';if(g.axis==='x'){const v=F.reduced()?0:F.velocity(g.samples,e.timeStamp);const next=F.projected(g.raw/g.step,v/g.step,Math.max(0,g.committed-1),Math.min(2,g.committed+1),120);onCommit(next);motion.to(next,{velocity:v*F.resistance(g.raw,0,2*g.step,18)/g.step,bouncy:true});}else motion.to(getIndex());};
  track.onpointercancel=()=>{suppress=true;cancel();};track.onlostpointercapture=()=>{if(drag)cancel();};
  track.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();suppress=false;}},true);
  const mq=matchMedia('(prefers-reduced-motion: reduce)');mq.addEventListener('change',()=>{if(mq.matches)motion.finish();});
  addEventListener('pointerdown',e=>{if(!e.isPrimary&&drag)cancel();},true);addEventListener('pointerup',()=>{if(drag&&drag.axis!=='x')cancel();});addEventListener('resize',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();motion.set(getIndex());}});
  return{to(index){motion.to(index,{bouncy:true});},cancel};
 };
})();
