import {journeys,summarize} from './journey-data.mjs';
import {spots} from '/docs/design-resources/wechat-miniapp/plan/revisions/three-requirements-2026-09-13/preview/plan-model.mjs';
import {data,copyButton} from '../comfortable-scale-2026-09-22/preview/source-ui.mjs';
const query=new URLSearchParams(location.search),page=['trip','spot'].includes(query.get('page'))?query.get('page'):'achievements';
const root='../comfortable-scale-2026-09-22/preview/';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const assets='/docs/design-resources/wechat-miniapp/shared/icons/adopted/b-matte-256/assets/';
const icon=n=>`<img class="matte-icon" src="${assets}${n}--day--default.png" alt="">`;
const go=(type,id='perseids')=>location.href=`?page=${type}&id=${encodeURIComponent(id)}&from=${page}${query.has('plan')?'&plan='+encodeURIComponent(query.get('plan')):''}${query.has('embedded')?'&embedded=1':''}`;
document.body.dataset.page=page;
const id=query.get('id')||'perseids';
let invalid=!['summer','perseids','current'].includes(id);
let model=id==='summer'?{spotId:'hill',sourceKeys:[],title:'把夏夜\n留给星空',spot:'山顶观星点',date:'07.18 — 07.19 / 2026',time:'21:00 — 次日01:30',event:null}:{spotId:'bay',sourceKeys:['meteor'],title:'赴一场\n英仙座的约',spot:'星湾观星点',date:'08.12 — 08.13 / 2026',time:'21:00 — 次日02:00',event:'英仙座流星雨'};
if(id==='current'){invalid=true;try{const saved=JSON.parse(sessionStorage.getItem('starward-design-public-trip:'+query.get('plan')));if(saved&&saved.planId===query.get('plan')&&spots.some(s=>s.id===saved.spotId)&&typeof saved.date==='string'){invalid=false;model={...saved,title:'向星而行',event:saved.event||null};}}catch{}}
const spotId=query.get('spot')||model.spotId;const selectedSpot=spots.find(s=>s.id===spotId);if(!selectedSpot)invalid=true;
const sources=(model.sourceKeys||[]).map(k=>data[k]).filter(Boolean);const sourceText=sources.map(s=>s.name+' · '+s.url).join('；');
function back(){if(query.has('embedded')&&query.get('from')!=='trip')parent.postMessage({type:'sharing-close'},location.origin);else if(query.get('from')==='trip'||document.referrer.startsWith(location.origin)&&history.length>1)history.back();else location.href=root+'my.html';}
$('[aria-label="返回我的"]').onclick=back;
if(page!=='achievements'){
 const nav=document.createElement('header');nav.className='page-top';nav.innerHTML=`<button class="icon-btn" aria-label="返回">${icon('arrow-left')}</button><h1>${page==='trip'?'行程分享':'观星点分享'}</h1><div class="wechat-capsule" aria-hidden="true">•••　│　⊙</div>`;
 $('.app-viewport').prepend(nav);nav.querySelector('button').onclick=back;
}
if(page==='achievements'){
 all('.trip-record-card').forEach((el,i)=>{const month=document.createElement('h2');month.className='month-label';month.textContent=i?'七月 · JUL':'八月 · AUG';el.before(month);el.onclick=()=>go('trip',i?'summer':'perseids');el.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();el.click();}};});
 $('#year').onchange=()=>{const summary=summarize(journeys,$('#year').value,Date.parse('2026-09-22T12:00:00+08:00'));const empty=summary.count===0;$('.trip-list-stack').hidden=empty;$('#achieve-empty-state').hidden=!empty;$('.stat-number').textContent=String(summary.count);all('.sub-stat-item strong').forEach((s,i)=>s.textContent=String(i?summary.events:summary.spots));$('.timeline-count-hint').textContent=empty?'暂无记录':summary.count+' 份行程记录';};$('#year').onchange();
 if(query.get('state')==='empty'){$('#year').value='2025';$('#year').onchange();}
}else if(!invalid){
 const view=$('#view-'+page),art=view.querySelector('.share-art');
 if(page==='trip'){
  $('.ticket-title').replaceChildren(...model.title.split('\n').flatMap((s,i)=>i?[document.createElement('br'),document.createTextNode(s)]:[document.createTextNode(s)]));
  $('.ticket-date-sup').textContent=model.date;
  const values=all('.detail-line-val');values[0].textContent=model.spot;values[2].textContent=model.time+'（UTC+8）';values[3].textContent=model.event||'未关联天象';
  const details=art.querySelector('.source-details');
  details.hidden=!model.event;
  if(sources.length){details.querySelector('p').textContent='关联天象资料来自 '+sources.map(s=>s.name).join('、')+'。计划记录不代表实际观测结果。';sources.forEach(source=>details.insertAdjacentHTML('beforeend',copyButton(source.url,'复制 '+source.name+' 原始出处')));}
  if(model.solar){const safety=document.createElement('p');safety.className='spot-safety-warning';safety.textContent='日食观测须使用符合标准且完好的专用观测镜；不可裸眼或使用普通太阳镜看太阳。';details.before(safety);}
  if(model.spotId!=='bay')values[1].textContent=selectedSpot?.address||'地点资料暂无数据';
 }
 const actions=view.querySelector('.share-page-actions');
 actions.querySelector('.btn-primary-action').onclick=()=>{if(page==='trip')go('spot',id);else if(query.has('embedded'))parent.postMessage({type:'sharing-map',spotId},location.origin);else location.href=root+'map.html?map=1';};
 actions.querySelector('.btn-secondary-action').onclick=()=>{const u=new URL(location.href);u.searchParams.set('poster','1');location.href=u.href;};
 if(query.has('poster')){
  actions.replaceChildren();const status=document.createElement('p');status.className='poster-note';status.setAttribute('role','status');status.textContent='正在生成海报…';actions.append(status);
  const save=document.createElement('a');save.className='btn-primary-action action-link';save.download=page==='trip'?'Starward-观星行程.png':'Starward-观星点.png';save.textContent='保存分享海报';save.hidden=true;actions.append(save);
  const retry=document.createElement('button');retry.className='btn-secondary-action';retry.textContent='重新生成';retry.hidden=true;actions.append(retry);
  const done=document.createElement('button');done.className='btn-secondary-action';done.textContent='返回分享页';done.onclick=()=>{const u=new URL(location.href);u.searchParams.delete('poster');const ref=document.referrer?new URL(document.referrer):null;if(ref?.origin===location.origin&&ref.pathname===location.pathname&&!ref.searchParams.has('poster'))history.back();else location.replace(u.href);};actions.append(done);
  const generate=async()=>{
   retry.hidden=true;art.hidden=false;
   try{
    await document.fonts.ready;await Promise.all([...art.querySelectorAll('img')].map(i=>i.decode()));
    // Export the same object card; retain text attribution, omit interactive disclosure controls.
    const source=art.querySelector('.source-details');const credit=document.createElement('p');credit.className='source-credit';credit.dataset.posterCredit='true';credit.textContent=page==='trip'?(model.event?'天象资料：'+sourceText:'计划记录 · 地点当地时间 UTC+8'):'场地资料：'+(spotId!=='bay'?'暂无可归属资料':'场地管理方 · 2026-09-06核验');
    source.before(credit);source.hidden=true;
    let png;try{png=await htmlToImage.toPng(art,{pixelRatio:3,backgroundColor:'#f6f5f1',skipFonts:true});}finally{credit.remove();source.hidden=page==='trip'&&!model.event;}
    const poster=document.createElement('img');poster.className='poster-preview';poster.alt=page==='trip'?model.spot+'行程海报':'观星点分享海报';poster.src=png;art.hidden=true;art.after(poster);save.href=png;save.hidden=false;status.textContent='海报已生成';
   }catch{status.textContent='海报生成失败，请重试。';retry.hidden=false;}
  };retry.onclick=generate;requestAnimationFrame(()=>generate());
 }
 if(page==='spot'&&selectedSpot){$('.spot-main-title').textContent=selectedSpot.name;}
 if(spotId!=='bay'&&page==='spot'){$('.spot-region-pill').textContent=selectedSpot?.address||'地点资料暂无数据';const mapButton=actions.querySelector('.btn-primary-action');if(mapButton){mapButton.disabled=true;mapButton.textContent='地点位置暂无数据';}all('.spot-fact-row .fact-val').forEach(el=>el.textContent='暂无数据');$('.spot-safety-warning').textContent='进入与安全信息以地点最新资料为准。';$('.spot-share-body .source-details p').textContent='此地点当前未提供可归属的开放、设施与核验资料。';}
}
const state=invalid?'expired':query.get('state');
if(['error','login','expired','unpublished'].includes(state)){
 const view=$('#view-'+page);const retainedHeader=view.querySelector('.app-header');view.replaceChildren();if(retainedHeader)view.append(retainedHeader);const box=document.createElement('section');box.className='recovery';
 const copy=state==='error'?['暂时无法读取','请稍后重试，你的计划记录仍会保留。','重试']:state==='login'?['登录后查看我的星旅','你的行程记录只对你可见。','返回我的']:state==='unpublished'?['这个观星点暂不可用','地点可能已下架。请返回地图查看其他正式观星点。','返回地图']:['这份分享已失效','发起人可能已撤销分享。','返回地图'];
 box.innerHTML=icon(state==='login'?'account-user':'plan-suv')+`<h2>${copy[0]}</h2><p>${copy[1]}</p><button class="btn-primary-action">${copy[2]}</button>`;view.append(box);
 box.querySelector('button').onclick=()=>{if(state==='error'){const u=new URL(location.href);u.searchParams.delete('state');location.href=u.href;}else location.href=root+(state==='login'?'my.html':'map.html?map=1&browse=1');};
}
document.body.dataset.journeyReady='true';
