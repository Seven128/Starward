import {events} from './catalog.mjs';
const meteor='<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M25 36 51 10M34 41 57 18M18 28 39 7" stroke="#ddc88f" stroke-width="5" stroke-linecap="round"/><path d="m24 27 5 9 10 2-7 7 1 10-9-4-9 4 1-10-7-7 10-2z" fill="#d8bc74"/><path d="m24 30 4 8 8 2-11 2-1 8-2-11-9-1 8-2z" fill="#fff1c4"/></svg>';
export function renderEventList(host,{date='2026-09-08',linked=[],onOpen}={}){
  let filter='all';
  function render(){
    const values=filter==='period'?events.filter(e=>date>=e.start&&date<=e.end):events;
    host.innerHTML=`<div class="event-list-intro"><div><small>2026 · 天象日历</small><h2>下一场，抬头见</h2></div>${meteor}</div><div class="event-list-tabs" role="group" aria-label="事件范围"><button data-filter="all" aria-pressed="${filter==='all'}">已收录事件</button><button data-filter="period" aria-pressed="${filter==='period'}">所选日期</button><span>${date.slice(5).replace('-',' / ')}</span></div><div class="event-months"></div><p class="event-coverage">当前收录流星雨目录；日食、月食资料待接入。<br>活动日期不代表所选地点一定可见。</p>`;
    let month='';const body=host.querySelector('.event-months');
    for(const e of values){const m=e.peak.slice(5,7);if(m!==month){month=m;body.insertAdjacentHTML('beforeend',`<div class="event-month"><b>${m}</b><span>月</span><i></i><small>目录极大日期</small></div>`);}const active=date>=e.start&&date<=e.end;
      body.insertAdjacentHTML('beforeend',`<button class="event-ticket" data-event="${e.id}"><span class="event-ticket-date"><strong>${e.peak.slice(8)}</strong><small>${m}月极大</small></span><span class="event-ticket-content"><span class="event-ticket-meta">流星雨 · ${e.code}${linked.includes(e.id)?'<em>已关联</em>':active?'<em>所选日活动中</em>':''}</span><strong>${e.name}</strong><small>活动期 ${e.start.slice(5).replace('-','.')} — ${e.end.slice(5).replace('-','.')}</small></span><span class="event-ticket-arrow">›</span></button>`);
    }
    if(!values.length)body.innerHTML='<p class="event-empty">已收录目录中，所选日期没有匹配记录。</p>';
    host.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render()});
    host.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>onOpen(b.dataset.event));
  }render();
}
