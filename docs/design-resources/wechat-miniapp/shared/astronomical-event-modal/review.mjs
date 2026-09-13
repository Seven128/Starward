let view='map',state='available',ticket=0,media=false;
const frame=document.querySelector('iframe');
const post=data=>frame.contentWindow.postMessage(data,location.origin);
const panel=control=>post({mapReview:'panel-control',control});
function load(){
 const request=++ticket,target=view;
 frame.onload=()=>{
  if(target==='plan')return;
  let attempts=0;
  const ready=setInterval(()=>{
   if(request!==ticket||++attempts>80){clearInterval(ready);return;}
   if(frame.contentDocument?.querySelector('#phone')?.dataset.reviewReady!=='true')return;
   const f=frame.contentDocument?.querySelector('#spot-frame');
   if(target==='terrain'&&!f?.contentDocument?.querySelector('#terrain'))return;
   clearInterval(ready);
   if(target==='terrain')panel({chapter:'terrain'});
   if(target==='layers'){
    post({mapReview:'layer'});let count=0;
    const choose=setInterval(()=>{if(request!==ticket||++count>80){clearInterval(choose);return;}const d=frame.contentDocument?.querySelector('#layer-review')?.contentDocument,t=d?.querySelector('#terrain-toggle');if(!t||d.body.dataset.reviewReady!=='true')return;clearInterval(choose);t.checked=true;t.dispatchEvent(new Event('change'));d.querySelector('[data-layer=LIGHT]').click();},100);
   }
  },100);
 };
 frame.src=target==='plan'?'../../plan/revisions/three-requirements-2026-09-13/preview/index.html?view=edit&id=p1&state='+state:'../../map/revisions/three-requirements-2026-09-13/preview/index.html?map=1&'+(target==='map'?'browse=1&':'')+'state='+state+'&reviewView='+target;
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));load()});
document.querySelectorAll('[data-state]').forEach(b=>b.onclick=()=>{state=b.dataset.state;load()});
document.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{frame.style.width=b.dataset.size+'px';frame.style.height=b.dataset.size==='768'?'1024px':'844px';document.querySelector('main').style.maxWidth=b.dataset.size==='768'?'1300px':'1050px'});
document.querySelectorAll('[data-extent]').forEach(b=>b.onclick=()=>panel({extent:b.dataset.extent}));
document.querySelector('#photos').onclick=()=>panel({media:media=!media});
