import {eclipseMarkup,articleMarkup} from './event-details.mjs';
import {sourceCard} from './source-ui.mjs';
// Editable design prototype. Shared by the map and plan review consumers; no production API.
import {events} from '/docs/design-resources/wechat-miniapp/shared/comfortable-scale-2026-09-22/preview/events.mjs';
const icons=new URL('/docs/design-resources/wechat-miniapp/shared/icons/adopted/b-matte-256/assets/',location.origin);
export const icon=(name,cls='')=>`<img class="${cls}" src="${icons}${name}--day--default.png" alt="">`;
const short=d=>d.slice(5).replace('-','.');
export function createEventModal(){
  const dialog=document.createElement('dialog');
  dialog.className='event-modal'; dialog.setAttribute('aria-labelledby','event-title');
  dialog.innerHTML=`<header class="event-header"><button class="event-back" aria-label="返回事件列表">${icon('arrow-left')}</button><h2 id="event-title">天文事件</h2><button class="event-close" aria-label="关闭天文事件">${icon('close')}</button></header><div class="event-viewport"><div class="event-track"><section class="event-list" aria-label="事件列表"></section><section class="event-detail" aria-label="事件详情" inert></section></div></div><footer class="event-footer"><button class="event-clear">清除选择</button><button class="event-confirm primary">确认选择</button></footer>`;
  document.body.append(dialog);
  const $=s=>dialog.querySelector(s),list=$('.event-list'),detail=$('.event-detail');
  let mode,selection,active,opener,onConfirm,context,scenario,returnFocus,closing=false,motion=[];
  const reduced=()=>new URLSearchParams(location.search).has("capture")||matchMedia("(prefers-reduced-motion: reduce)").matches;
  function animate(visible){
    const live=getComputedStyle(dialog),from={opacity:live.opacity,transform:live.transform};
    motion.forEach(a=>a.cancel());
    const end={opacity:visible?1:0,transform:visible?"none":"translateY(8px) scale(.97)"};
    motion=[dialog.animate([from,end],{duration:reduced()?0:visible?240:180,easing:"cubic-bezier(.2,.7,.2,1)",fill:"forwards"})];
    dialog.dataset.phase=visible?"opening":"closing";
    const animation=motion[0];
    return animation.finished.catch(()=>null).then(()=>animation===motion[0]);
  }
  const selected=()=>events.find(e=>e.id===selection);
  function selectionUI(){
    list.querySelectorAll('[data-event]').forEach(row=>{
      const yes=row.dataset.event===selection;
      row.classList.toggle('is-selected',mode==='select-one'&&yes);
      row.querySelector('.chosen-label').textContent=mode==='select-one'&&yes?'已选':'';
      const radio=row.querySelector('input'); if(radio) radio.checked=yes;
    });
    $('.event-confirm').textContent=selection?'确认选择':'确认不关联';
    $('.event-confirm').setAttribute('aria-label',selected()?`确认选择：${selected().name}`:'确认不关联');
  }
  function toList(){
    dialog.classList.remove('show-detail'); list.inert=false;detail.inert=true;
    $('.event-back').hidden=true;$('.event-footer').hidden=mode!=='select-one';
    $('#event-title').textContent='天文事件';
    (returnFocus||list.querySelector('button'))?.focus({preventScroll:true});
  }
  function openDetail(e,trigger){
    active=e;returnFocus=trigger;
    if(e.kind!=='METEOR_SHOWER'){
      detail.innerHTML=eclipseMarkup(e,mode);detail.scrollTop=0;detail.inert=false;list.inert=true;dialog.classList.add('show-detail');
      $('.event-back').hidden=false;$('.event-footer').hidden=true;$('#event-title').textContent='天文事件详情';$('.event-back').focus({preventScroll:true});
      detail.querySelector('.choose-detail')?.addEventListener('click',()=>{selection=e.id;selectionUI();toList();});return;
    }
    const date=context.date||e.peak;
    detail.innerHTML=`<div class="event-identity">${icon('meteor')}<small>流星雨 · ${e.code} · 2026</small><h3>${e.name}</h3></div><div class="event-facts"><div><small>监测参考期</small><strong>${short(e.start)} — ${short(e.end)}</strong></div><div><small>常年参考日（UTC）</small><strong>${short(e.peak)}</strong></div></div><p class="precision">历史太阳黄经映射至当年，不是当年极大预报。</p><div class="activity-axis"><span>${short(e.start)} 开始</span><b>${short(e.peak)} 参考</b><span>${short(e.end)} 结束</span></div><section class="local-context"><h4>当地观测条件</h4>${mode==='browse'?`<label>观星点<select aria-label="事件观星点"><option>${context.place||'星湾观星点'}</option><option>山顶观星点</option></select></label><label>观测日期<input aria-label="事件观测日期" type="date" value="${date}"></label>`:`<p>${context.place||'星湾观星点'}<br>${date} · 地点当地时间</p>`}<p class="local-result">${scenario==='error'?'当地条件暂时读取失败':'暂无当地观测数据'}</p>${scenario==='error'?'<button class="detail-retry">重试</button>':''}<p class="quiet">监测参考日期不代表此处可见；地点与日期影响当地条件。</p></section><details class="event-source"><summary>数据来源与日期精度</summary><p>Global Meteor Network · 年度活动参考，不代表当年极大或爆发预报。</p><a href="https://globalmeteornetwork.org/flux/" target="_blank" rel="noopener">原始年度资料 ↗</a></details>${mode==='select-one'?'<button class="choose-detail primary">选择此事件</button>':''}`;
    // Retain the adopted event detail's date strip, proportional activity axis and source precision.
    const ms=d=>Date.parse(d+'T12:00:00Z'),fraction=d=>(ms(d)-ms(e.start))/(ms(e.end)-ms(e.start))*100;
    const axis=detail.querySelector('.activity-axis');axis.style.position='relative';axis.querySelector('b').style.cssText='position:absolute;top:-22px;left:'+fraction(e.peak)+'%;transform:translateX(-50%);white-space:nowrap';
    const point=document.createElement('i');point.className='event-date-dot';axis.append(point);
    const note=document.createElement('p');note.className='event-date-note quiet';detail.querySelector('.local-context').append(note);
    const strip=document.createElement('div');strip.className='event-day-strip';strip.setAttribute('role','group');strip.setAttribute('aria-label','观测日期');
    if(mode==='browse'){
      const place=detail.querySelector('select');for(const name of ['海岸观星点','草甸观星点']){const option=document.createElement('option');option.textContent=name;place.append(option);}
      detail.querySelector('.local-result').before(strip);
      for(let time=ms(e.start);time<=ms(e.end);time+=86400000){const day=new Date(time).toISOString().slice(0,10),button=document.createElement('button');button.dataset.date=day;button.ariaLabel=day+(day===e.peak?'，常年参考日（UTC）':'');button.innerHTML='<small>'+['日','一','二','三','四','五','六'][new Date(time).getUTCDay()]+'</small>'+day.slice(8);button.onclick=()=>{const input=detail.querySelector('input');input.value=day;input.dispatchEvent(new Event('change'));button.scrollIntoView({block:'nearest',inline:'nearest'});};strip.append(button);}
    }
    function dateState(){const date=context.date||e.peak,outside=date<e.start||date>e.end;point.hidden=outside;point.style.left=fraction(date)+'%';note.textContent=outside?(mode==='select-one'?'计划日期不在此事件监测参考期，关联不会改变计划日期。':'所选日期不在本次监测参考期。'):mode==='select-one'?'地点和日期沿用当前计划；关联事件不改变计划安排。':'常年参考日（UTC）不等于这个地点的最佳观测时间。';strip.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.date===date)));}
    detail.querySelector('.event-source p').textContent='Global Meteor Network · gmn-annual-2022-2023.20260914.1。日期由历史太阳黄经参考映射到当年，不是当年极大预测；当地可见性另行计算。';
    detail.querySelector('.local-result').insertAdjacentHTML('afterend','<p class="quiet">可见时段、方位高度与月光影响将在取得计算结果后显示。</p>');
    dateState();
    detail.querySelector('.event-source').outerHTML=sourceCard('meteor')+articleMarkup();
    detail.scrollTop=0;detail.inert=false;list.inert=true;dialog.classList.add('show-detail');
    $('.event-back').hidden=false;$('.event-footer').hidden=true;$('#event-title').textContent='天文事件详情';
    $('.event-back').focus({preventScroll:true});
    detail.querySelector('.choose-detail')?.addEventListener('click',()=>{selection=e.id;selectionUI();toList();});
    detail.querySelector('.detail-retry')?.addEventListener('click',()=>{detail.querySelector('.local-result').textContent='暂无当地观测数据';detail.querySelector('.detail-retry').remove();});
    detail.querySelectorAll('input,select').forEach(input=>input.addEventListener('change',()=>{context.date=detail.querySelector('input')?.value||context.date;context.place=detail.querySelector('select')?.value||context.place;detail.querySelector('.local-result').textContent='暂无当地观测数据';dateState();}));
  }
  function renderList(){
    list.innerHTML='<p class="catalogue">2026 天文事件 <span>按月份</span></p>';
    if(scenario==='empty'||scenario==='list-error'){
      list.innerHTML+=`<div class="event-empty">${icon('meteor')}<h3>${scenario==='empty'?'暂无可展示的事件':'事件暂时读取失败'}</h3><p>关闭后可继续浏览原页面。</p>${scenario==='list-error'?'<button class="retry-list">重试</button>':''}</div>`;
      list.querySelector('.retry-list')?.addEventListener('click',()=>{scenario='available';renderList();});return;
    }
    let month='';
    for(const e of events){
      if(e.peak.slice(5,7)!==month){month=e.peak.slice(5,7);list.insertAdjacentHTML('beforeend',`<h3 class="month-heading">${Number(month)}月 <span>2026</span></h3>`);}
      const row=document.createElement('article');row.className='event-card';row.dataset.event=e.id;
      row.innerHTML=`<button class="event-open" aria-label="查看${e.name}"><span class="date-ticket"><small>${Number(month)}月</small><strong>${e.peak.slice(8)}</strong><small>${e.kind==='METEOR_SHOWER'?'参考':'食甚'}</small></span><span class="event-copy"><span class="event-name">${e.name}</span><small>${e.code} · ${e.kind==='METEOR_SHOWER'?'流星雨':e.kind==='SOLAR_ECLIPSE'?'日食':'月食'} <em class="chosen-label"></em></small><span class="event-period">${e.kind==='METEOR_SHOWER'?'监测参考期':'事件期'} ${short(e.start)} — ${short(e.end)}</span></span><span class="chevron" aria-hidden="true">${icon('chevron-right')}</span></button>${mode==='select-one'?`<label class="event-radio"><input type="radio" name="event-selection" aria-label="选择${e.name}" value="${e.id}"></label>`:''}`;
      row.querySelector('button').onclick=ev=>openDetail(e,ev.currentTarget);
      row.querySelector('input')?.addEventListener('change',()=>{selection=e.id;selectionUI();});list.append(row);
    }
    list.insertAdjacentHTML('beforeend','<p class="quiet catalogue-end">已显示本次目录内容</p>');selectionUI();
  }
  function close(){if(!dialog.open||closing)return;closing=true;animate(false).then(current=>{if(!current||!closing)return;dialog.close();dialog.dataset.phase="closed";closing=false;opener?.focus({preventScroll:true});});}
  $('.event-close').onclick=close;$('.event-back').onclick=toList;
  $('.event-clear').onclick=()=>{selection=null;selectionUI();};
  $('.event-confirm').onclick=()=>{if(closing)return;onConfirm?.(selection);close();};
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(closing)return;if(dialog.classList.contains('show-detail'))toList();else close();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  return {open(options={}){
    const wasOpen=dialog.open;closing=false;if(!wasOpen){motion.forEach(a=>a.cancel());motion=[];dialog.dataset.phase='closed';}
    mode=options.mode||'browse';selection=options.value||null;onConfirm=options.onConfirm;context={...(options.context||{})};scenario=options.scenario||'available';opener=options.trigger||document.activeElement;active=null;returnFocus=null;
    dialog.dataset.mode=mode;dialog.classList.remove('show-detail');list.inert=false;detail.inert=true;detail.innerHTML='';renderList();list.scrollTop=0;$('.event-back').hidden=true;$('#event-title').textContent='天文事件';$('.event-footer').hidden=mode!=='select-one';if(!dialog.open)dialog.showModal();animate(true).then(current=>{if(current&&!closing)dialog.dataset.phase='open';});$('.event-close').focus({preventScroll:true});const initial=events.find(e=>e.id===options.initialOccurrenceId);if(initial)openDetail(initial,list.querySelector('[data-event="'+initial.id+'"] button'));
  },close};
}
