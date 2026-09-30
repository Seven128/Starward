// Local design companion only. No map, account or contribution service requests.
const params=new URLSearchParams(location.search), panel=document.querySelector('#extent-panel'), doc=document.querySelector('#document'), handle=document.querySelector('#handle-band'), media=document.querySelector('#site-media'), nav=document.querySelector('#section-nav');
let hasMedia=params.get('media')==='1', extent=params.get('extent')||'medium', height=339.7, frame=0;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const stops=()=>({small:156,medium:Math.min(368,innerHeight-220),large:innerHeight-68.8-88});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function paint(h){
  height=h;panel.style.height=height+'px';
  // Keep the title legible beneath fixed native chrome while the outer shell stretches.
  const upperOver=Math.max(0,height-stops().large);doc.style.transform=upperOver?'translateY('+(upperOver*.9)+'px)':'';
  const p=clamp((height-stops().medium)/(stops().large-stops().medium),0,1), reveal=hasMedia?clamp(p/0.72,0,1):0;
  media.style.height=(160*reveal)+'px';media.style.opacity=String(reveal);media.setAttribute('aria-hidden',String(!reveal));
  const fade=clamp((p-.8)/.2,0,1);document.querySelector('header').style.background=fade>.9?'white':'';
  const search=document.querySelector('header>div:last-child');search.style.opacity=1-fade;search.style.visibility=fade>.999?'hidden':'visible';
  document.querySelector('#map-reference').style.opacity=1-fade;
  panel.style.setProperty('border-radius',(28*(1-p))+'px '+(28*(1-p))+'px 0 0','important');
  document.body.dataset.extent=height>=stops().large-.5?'large':height<=stops().small+.5?'small':'medium';
  doc.style.paddingBottom=Math.max(0,doc.clientHeight-nav.offsetHeight-document.querySelector('#astronomy').offsetHeight)+'px';
  handle.setAttribute('aria-valuenow',String(clamp((height-stops().small)/(stops().large-stops().small)*2,0,2)));
  handle.setAttribute('aria-valuetext',document.body.dataset.extent==='large'?'大档':document.body.dataset.extent==='small'?'小档':'中档');
}
function setExtent(next,done,velocity=0){
  cancelAnimationFrame(frame);extent=next;
  const start=height,target=stops()[next],at=performance.now();
  if(document.body.dataset.extent!=='large'||next!=='large')doc.scrollTop=0;
  document.body.dataset.sheetMotion='settling';
  const finish=()=>{paint(target);document.body.dataset.sheetMotion='idle';done?.();};
  if(reduced()||Math.abs(start-target)<.1&&Math.abs(velocity)<.01){finish();return;}
  function tick(now){const state=StarwardElasticSheet.spring(start,target,velocity,now-at);paint(state.height);
    if(now-at>=650||Math.abs(state.height-target)<.25&&Math.abs(state.speed)<.005)finish();else frame=requestAnimationFrame(tick);}
  frame=requestAnimationFrame(tick);
}
let drag=null,suppressTap=false;
function beginDrag(e,compact=false){
  if(e.isPrimary===false||e.button!==0||drag)return;
  e.preventDefault();panel.setPointerCapture(e.pointerId);
  const moving=document.body.dataset.sheetMotion==='settling';cancelAnimationFrame(frame);
  document.body.dataset.sheetMotion='holding';
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,h:StarwardElasticSheet.unRubber(height,stops().small,stops().large),moving,origin:extent,compact,moved:false,samples:[{y:e.clientY,t:e.timeStamp}]};
}
function moveDrag(e){
  if(!drag||e.pointerId!==drag.id)return;
  const d=drag,delta=d.y-e.clientY;
  if(!d.moved){if(Math.abs(delta)<6)return;if(Math.abs(e.clientX-d.x)>Math.abs(delta)){drag=null;panel.releasePointerCapture(e.pointerId);if(d.moving)setExtent(d.origin);else document.body.dataset.sheetMotion='idle';return;}
    cancelAnimationFrame(frame);d.moved=true;panel.setPointerCapture(e.pointerId);document.body.dataset.sheetMotion='dragging';}
  d.samples.push({y:e.clientY,t:e.timeStamp});d.samples=d.samples.filter(s=>e.timeStamp-s.t<=120);
  e.preventDefault();paint(StarwardElasticSheet.rubber(d.h+delta,stops().small,stops().large));
}
function endDrag(e,cancel=false){
  if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;
  if(!d.moved){if(d.moving)setExtent(d.origin);else document.body.dataset.sheetMotion='idle';return;}
  suppressTap=true;setTimeout(()=>suppressTap=false,0);
  const velocity=cancel?0:StarwardElasticSheet.velocity(d.samples,e.timeStamp);
  const target=cancel?d.origin:StarwardElasticSheet.snap(stops(),height,velocity,d.origin);
  const raw=d.h+d.y-e.clientY;
  setExtent(target,undefined,velocity*StarwardElasticSheet.resistance(raw,stops().small,stops().large));
}
document.addEventListener('pointerdown',e=>{if(drag&&e.pointerId!==drag.id){const origin=drag.origin;drag=null;setExtent(origin);}},true);
handle.addEventListener('pointerdown',e=>beginDrag(e));
panel.addEventListener('pointerdown',e=>{if(document.body.dataset.extent==='small'&&!e.target.closest('#handle-band,#fixed-actions,button,a,input,summary'))beginDrag(e,true);});
panel.addEventListener('pointermove',moveDrag);
panel.addEventListener('pointerup',e=>endDrag(e));
panel.addEventListener('pointercancel',e=>endDrag(e,true));
panel.addEventListener('click',e=>{if(suppressTap){e.preventDefault();e.stopImmediatePropagation();}},true);
handle.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const all=['small','medium','large'],i=all.indexOf(extent);setExtent(e.key==='Home'?'small':e.key==='End'?'large':all[clamp(i+(e.key==='ArrowUp'?1:-1),0,2)]);});
document.querySelector('#favorite').addEventListener('click',e=>{const b=e.currentTarget;b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));});
const routeNote=document.querySelector('#route-note');
document.querySelectorAll('[data-target]').forEach(button=>button.addEventListener('click',()=>{const target=button.dataset.target;routeNote.querySelector('h2').textContent=target==='feedback'?'反馈纠错 · 跳转说明':target==='sky'?'云观星 · 跳转说明':'导航 · 跳转说明';routeNote.querySelector('p').textContent=target==='feedback'?'这是设计预览的说明层。正式产品从这里进入现有反馈纠错页面，携带观星点身份；授权、草稿、待审核提交及返回规则沿用现有流程。本预览不提交数据。':target==='sky'?'正式产品验证所选正式观星点及观测上下文后进入云观星。本预览不伪造实时星空。':'正式产品核对开放、合法进入和显式危险后，使用真实坐标交给地图应用。本预览没有导航数据，不发起外部导航。';routeNote.showModal();}));
routeNote.querySelector('button').addEventListener('click',()=>routeNote.close());
addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin)return;const command=e.data;if(command.extent&&stops()[command.extent])setExtent(command.extent);if(typeof command.media==='boolean'){hasMedia=command.media;paint(height);}});
addEventListener('resize',()=>{cancelAnimationFrame(frame);drag=null;paint(stops()[extent]);document.body.dataset.sheetMotion='idle';});
paint(stops()[extent]||stops().medium);

panel.addEventListener('wheel',e=>{if(document.body.dataset.extent!=='small')return;e.preventDefault();if(e.deltaY>0)setExtent('medium');},{passive:false});
addEventListener('blur',()=>{if(drag){const original=drag.origin;drag=null;setExtent(original);}});
