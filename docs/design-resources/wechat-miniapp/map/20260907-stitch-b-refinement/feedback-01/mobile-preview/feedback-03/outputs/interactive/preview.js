// Local design companion only. No map, account or contribution service requests.
const params=new URLSearchParams(location.search), panel=document.querySelector('#extent-panel'), doc=document.querySelector('#document'), handle=document.querySelector('#handle-band'), media=document.querySelector('#site-media'), nav=document.querySelector('#section-nav');
let hasMedia=params.get('media')==='1', extent=params.get('extent')||'medium', height=339.7, frame=0;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const stops=()=>({small:156,medium:Math.min(368,innerHeight-220),large:innerHeight-68.8-88});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function paint(h){
  height=clamp(h,stops().small,stops().large);panel.style.height=height+'px';
  const p=clamp((height-stops().medium)/(stops().large-stops().medium),0,1), reveal=hasMedia?clamp(p/0.72,0,1):0;
  media.style.height=(160*reveal)+'px';media.style.opacity=String(reveal);media.setAttribute('aria-hidden',String(!reveal));
  const fade=clamp((p-.8)/.2,0,1);document.querySelector('header').style.background=fade>.9?'white':'';
  const search=document.querySelector('header>div:last-child');search.style.opacity=1-fade;search.style.visibility=fade>.999?'hidden':'visible';
  document.querySelector('#map-reference').style.opacity=1-fade;
  panel.style.borderRadius=(24*(1-p))+'px '+(24*(1-p))+'px 0 0';
  document.body.dataset.extent=height>=stops().large-.5?'large':height<=stops().small+.5?'small':'medium';
  doc.style.paddingBottom=Math.max(0,doc.clientHeight-nav.offsetHeight-document.querySelector('#astronomy').offsetHeight)+'px';
  handle.setAttribute('aria-valuenow',String((height-stops().small)/(stops().large-stops().small)*2));
  handle.setAttribute('aria-valuetext',document.body.dataset.extent==='large'?'大档':document.body.dataset.extent==='small'?'小档':'中档');
}
function setExtent(next,done){cancelAnimationFrame(frame);extent=next;const start=height,target=stops()[next],at=performance.now();if(document.body.dataset.extent!=='large'||next!=='large')doc.scrollTop=0;
  if(reduced()||Math.abs(start-target)<.5){paint(target);done?.();return;}
  function tick(now){const p=clamp((now-at)/300,0,1);paint(start+(target-start)*(1-Math.pow(1-p,3)));if(p<1)frame=requestAnimationFrame(tick);else done?.();}frame=requestAnimationFrame(tick);
}
let drag=null;
handle.addEventListener('pointerdown',e=>{cancelAnimationFrame(frame);drag={y:e.clientY,h:height,lastY:e.clientY,lastT:e.timeStamp,v:0,moved:false};handle.setPointerCapture(e.pointerId);});
handle.addEventListener('pointermove',e=>{if(!drag)return;const delta=drag.y-e.clientY;if(Math.abs(delta)>6)drag.moved=true;if(drag.moved){const dt=e.timeStamp-drag.lastT;if(dt>0)drag.v=(drag.lastY-e.clientY)/dt;paint(drag.h+delta);}drag.lastY=e.clientY;drag.lastT=e.timeStamp;});
handle.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;if(!d.moved)return;const projected=height+(e.timeStamp-d.lastT<100?d.v*100:0);setExtent(Object.entries(stops()).sort((a,b)=>Math.abs(a[1]-projected)-Math.abs(b[1]-projected))[0][0]);});
handle.addEventListener('pointercancel',()=>{drag=null;setExtent(extent);});
handle.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const all=['small','medium','large'],i=all.indexOf(extent);setExtent(e.key==='Home'?'small':e.key==='End'?'large':all[clamp(i+(e.key==='ArrowUp'?1:-1),0,2)]);});
const items=[...nav.children];
function activeNav(index){items.forEach((el,i)=>{el.setAttribute('aria-current',i===index?'location':'false');const text=el.querySelector('span');text.style.color=i===index?'#0f172a':'#94a3b8';text.style.fontWeight=i===index?'600':'400';el.style.boxShadow=i===index?'0 2px 0 #0f172a':'none';const old=el.querySelector('span:nth-child(2)');if(old)old.style.display='none';});}
items.forEach((el,i)=>{el.setAttribute('role','button');el.tabIndex=0;const go=()=>setExtent('large',()=>{const target=document.querySelector(i?'#astronomy':'#overview');doc.scrollTo({top:Math.max(0,doc.scrollTop+target.getBoundingClientRect().top-doc.getBoundingClientRect().top-nav.offsetHeight),behavior:reduced()?'instant':'smooth'});const focusTarget=target.querySelector("h3,h2")||target;focusTarget.tabIndex=-1;focusTarget.focus({preventScroll:true});activeNav(i);});el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();go();}});});
doc.addEventListener('scroll',()=>activeNav(doc.scrollTop>=document.querySelector('#astronomy').offsetTop-nav.offsetHeight-24?1:0));
document.querySelector('#favorite').addEventListener('click',e=>{const b=e.currentTarget;b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));});
const routeNote=document.querySelector('#route-note');
document.querySelectorAll('[data-target]').forEach(button=>button.addEventListener('click',()=>{const target=button.dataset.target;routeNote.querySelector('h2').textContent=target==='feedback'?'反馈纠错 · 跳转说明':target==='sky'?'云观星 · 跳转说明':'导航 · 跳转说明';routeNote.querySelector('p').textContent=target==='feedback'?'这是设计预览的说明层。正式产品从这里进入现有反馈纠错页面，携带观星点身份；授权、草稿、待审核提交及返回规则沿用现有流程。本预览不提交数据。':target==='sky'?'正式产品验证所选正式观星点及观测上下文后进入云观星。本预览不伪造实时星空。':'正式产品核对开放、合法进入和显式危险后，使用真实坐标交给地图应用。本预览没有导航数据，不发起外部导航。';routeNote.showModal();}));
routeNote.querySelector('button').addEventListener('click',()=>routeNote.close());
addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin)return;const command=e.data;if(command.extent&&stops()[command.extent])setExtent(command.extent);if(typeof command.media==='boolean'){hasMedia=command.media;paint(height);}});
addEventListener('resize',()=>paint(stops()[extent]));
paint(stops()[extent]||stops().medium);activeNav(0);
