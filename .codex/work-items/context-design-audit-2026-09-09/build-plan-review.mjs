import fs from 'node:fs/promises';
const root='E:/dev/Starward/docs/design-resources/wechat-miniapp/';
const source=root+'plan/adopted/plan-page/', dest=root+'plan/candidates/context-audit-2026-09-09/';
await fs.mkdir(dest+'preview',{recursive:true});
let app=await fs.readFile(source+'app.mjs','utf8');
// Browser-only resource adapter. Production code and adopted files stay untouched.
app=app.replaceAll("'/events/","'/docs/design-resources/wechat-miniapp/events/").replaceAll('src="/events/','src="/docs/design-resources/wechat-miniapp/events/').replaceAll("'/map/","'/docs/design-resources/wechat-miniapp/map/").replaceAll("'/my/","'/docs/design-resources/wechat-miniapp/my/");
app=app.replace("const current=()",`const scenario=query.get('scenario')||'late';
let routeQuality=scenario==='unknown'?'unknown':scenario==='stale'?'stale':'ready';
const reminderStates=['ungranted','scheduled','unknown','failed','expired'];
const stateLabels={ungranted:'通知未授权',scheduled:'待发送',unknown:'结果待确认',failed:'发送失败',expired:'已跳过',rescheduled:'等待重新排期'};
const stateNotes={ungranted:'提醒意图已保存，尚未获得本组微信通知授权。清单可继续使用。',scheduled:'本组已授权，等待触发；发送前需核对当前计划与提醒版本。',unknown:'发送结果尚未确认，先核对发送回执，不盲目重复发送。清单仍可使用。',failed:'已确认发送失败；只有出发前且仍有效的任务才能有限重试。',expired:'已错过触发时间或计划已失效，跳过旧任务，不补发过时通知。'};
for(const p of plans){p.reminders.forEach((r,i)=>r.delivery=reminderStates[i%5]);}
function arrival(p){
 if(routeQuality!=='ready')return '<p class="arrival-note">'+(routeQuality==='stale'?'路线估计已过期':'路线暂未获取')+'，暂无法核对到达时间</p>';
 const at=shifted(p.departureAt,130/60),late=Math.ceil((Date.parse(at)-Date.parse(p.selectedAt))/60000);
 return '<div class="arrival-note '+(late>0?'late':'')+'"><strong>预计 '+day(at)+' '+clock(at)+' 到达</strong>'+(late>0?'<p>预计晚于观测开始 '+late+' 分钟</p><small>可保留原时间，或编辑出发安排</small>':'<p>预计可在观测开始前到达</p>')+'</div>';
}
stateNotes.rescheduled='修改已保存，通知授权事实保留；旧版本任务失效，按新计划核对并重新排期。';
function statusInfo(r){return '<div class="reminder-status"><small>提醒已保存 · '+((r.delivery||'ungranted')==='ungranted'?'未授权':'已授权')+'</small><button type="button" class="delivery-state" data-delivery="'+r.id+'">'+stateLabels[r.delivery||'ungranted']+'</button></div>';}
function wireStatus(p){main.querySelectorAll('[data-delivery]').forEach(b=>b.onclick=()=>{const r=p.reminders.find(r=>r.id===b.dataset.delivery);notice(stateLabels[r.delivery||'ungranted'],stateNotes[r.delivery||'ungranted']);});}
const current=()`);
app=app.replace("let stack=[route],cursor=0;",`let stack=[route],cursor=0;
if(query.get('from')==='my-review'&&query.get('sample')){try{const input=JSON.parse(query.get('sample'));if(input.planId&&Number.isFinite(Date.parse(input.selectedAt))&&Date.parse(input.endsAt)>Date.parse(input.selectedAt)){const spotId='review:'+input.planId;spots.push({id:spotId,name:String(input.name),address:'样例观星点'});const p={planId:input.planId,spotId,selectedAt:input.selectedAt,endAt:input.endsAt,departureAt:shifted(input.selectedAt,-1.5),origin:'样例出发地',travelMode:'驾车',events:[],reminders:[],notes:''};plans=plans.filter(x=>x.planId!==p.planId);plans.push(p);route={view:'detail',id:p.planId};stack=[route];}}catch{}}
`);
app=app.replace("else if(fromMy)location.href=", "else if(query.get('from')==='my-review')parent.postMessage({type:'plan-review-back'},location.origin);else if(fromMy)location.href=");
app=app.replace('路线时长与预计到达时间待获取','路线信息见下方到达核对');
app=app.replace("</div>`)+section('<span class=\"symbol\">◌</span>天文事件'","</div>\${arrival(p)}`)+section('<span class=\"symbol\">◌</span>天文事件'");
app=app.replace('<div class="notification">微信通知未开启<button id="notify">查看</button></div>','<p class="footnote">通知状态按每组记录，清单可独立使用。</p>');
app=app.replace(/\$\('#notify'\)\.onclick=.*?;renderChecks\(p\);/,'renderChecks(p);');
app=app.replace('${r.items.filter(i=>i.done).length}/${r.items.length}</span></div>','${r.items.filter(i=>i.done).length}/${r.items.length}</span></div>${statusInfo(r)}');
app=app.replace("function renderChecks(p){","function renderChecks(p){");
app=app.replace("function newEditor(spot)","function newEditor(spot)");
app=app.replace('item.done=!item.done;renderChecks(p);});}','item.done=!item.done;renderChecks(p);});wireStatus(p);}');
app=app.replace('地点当地时间 UTC+8，支持跨日观测。','地点当地时间 UTC+8，支持跨日观测。</p><p class="footnote">天气暂未覆盖，仍可保存计划。');
app=app.replace('<div class="edit-section"><div class="row"><h3>天文事件</h3>','<div id="arrival-editor">${arrival(draft)}</div><div class="edit-section"><div class="row"><h3>天文事件</h3>');
app=app.replace("const f=$('#form');","const f=$('#form'); f.addEventListener('input',()=>queueMicrotask(()=>{$('#arrival-editor').innerHTML=arrival(draft);}));");
app=app.replace("r.hours>8760||", "r.hours>8760||");
app=app.replace("const saved=structuredClone(draft);", "const saved=structuredClone(draft); saved.reminders.forEach(r=>r.delivery=!r.delivery||r.delivery==='ungranted'?'ungranted':'rescheduled');");
app=app.replace("route={view:'detail',id:saved.planId};", "route={view:'detail',id:saved.planId};");
app=app.replace("render();\n\naddEventListener('message'", "render();\n\naddEventListener('message'");
app+=`\naddEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='plan-review-route'){routeQuality=e.data.value;if(route.view==='edit')$('#arrival-editor').innerHTML=arrival(draft);else render();}if(e.data?.type==='plan-review-reminder'){const p=current();if(p?.reminders[0]){p.reminders[0].delivery=e.data.value;renderChecks(p);}}});\n`;
await fs.writeFile(dest+'preview/app.mjs',app);
let model=await fs.readFile(source+'plan-model.mjs','utf8');
model=model.replaceAll('2026-09-08','2026-09-10').replaceAll('2026-09-09','2026-09-11').replace('2026-09-12T21:00','2026-10-10T20:30');
model=model.replace('2026-09-10T18:30:00','2026-09-10T16:00:00');
model=model.replace('Date.parse(p.selectedAt)<now:Date.parse(p.selectedAt)>=now','Date.parse(p.endAt)<=now:Date.parse(p.endAt)>now');
await fs.writeFile(dest+'preview/plan-model.mjs',model);
let html=await fs.readFile(source+'index.html','utf8');
html=html.replaceAll('/events/','/docs/design-resources/wechat-miniapp/events/').replace('href="style.css"','href="../../../adopted/plan-page/style.css"').replace('</head>','<link rel="stylesheet" href="revision.css"></head>');
await fs.writeFile(dest+'preview/index.html',html);
await fs.writeFile(dest+'preview/revision.css',`body{max-width:430px}.arrival-note{margin:8px 0 14px;padding:8px 10px;background:#f5f7f8;border-radius:7px;font-size:12px;color:#607781}.arrival-note.late{background:#fbf7ef;border-left:2px solid #b6a06d;color:#8b754d}.arrival-note strong{font-size:12px;font-weight:500}.arrival-note p{margin:4px 0}.arrival-note small{color:inherit;font-size:11px}.delivery-state{font-size:11px;color:#7e765e;padding:0 8px;min-height:44px;border-radius:5px;text-decoration:underline;text-underline-offset:4px}.check{min-height:44px}#back{min-width:44px}.hero .row>button{min-height:44px}footer{padding-bottom:max(8px,env(safe-area-inset-bottom))}.notification button{min-height:44px}`);
await fs.writeFile(dest+'review.html',`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>观星计划 · 待审候选</title><style>body{background:#edf0f3;color:#405664;font:14px/1.7 system-ui;margin:0}main{display:flex;gap:24px;padding:24px;justify-content:center}aside{max-width:320px}iframe{width:390px;height:844px;border:0;flex:none}button,select{min-height:44px;font:inherit;margin:3px}h1{font-size:20px}@media(max-width:760px){main{flex-direction:column;align-items:center}iframe{max-width:100%}}</style><main><aside><h1>计划 · 到达与提醒</h1><p>待审、未采用。路线耗时130分钟为交互样例；样例时钟2026-09-10 16:00，来源/更新时间无真实服务。本资源不发送通知。</p><label>宽度 <select id="width">${[320,375,390,430].map(w=>'<option '+(w===390?'selected':'')+'>'+w+'</option>').join('')}</select></label><br><button data-src="?id=p1">详情</button><button data-src="?view=edit&id=p1">编辑</button><button data-src="?view=edit&id=future&scenario=unknown">远期无天气</button><button data-src="">全部计划</button><br><label>路线 <select id="quality"><option value="ready">可靠估计</option><option value="unknown">未获取</option><option value="stale">已过期</option></select></label><br><label>首组通知 <select id="delivery"><option value="ungranted">未授权</option><option value="scheduled">待发送</option><option value="unknown">结果待确认</option><option value="failed">明确失败</option><option value="expired">过时跳过</option></select></label><p>选择不同状态后，清单仍可独立勾选；未知结果不提供盲目重发。修改出发时间可查看迟到提示变化，保存不以天气或路线成功为前提。</p><p>候选待用户审查，未采用。<a href="README.md">来源与验证</a> · <a href="my-return.html">我的往返</a></p></aside><iframe title="计划候选" src="preview/index.html?id=p1"></iframe></main><script>const f=document.querySelector('iframe');document.querySelectorAll('[data-src]').forEach(b=>b.onclick=()=>f.src='preview/index.html'+b.dataset.src);document.querySelector('#width').onchange=e=>f.style.width=e.target.value+'px';for(const [id,type]of [['quality','plan-review-route'],['delivery','plan-review-reminder']])document.querySelector('#'+id).onchange=e=>f.contentWindow.postMessage({type,value:e.target.value},location.origin);</script></html>`);
console.log('Plan candidate integration written; verification pending');
