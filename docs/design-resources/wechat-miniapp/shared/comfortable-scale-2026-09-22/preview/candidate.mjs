import {openSharing} from '/docs/design-resources/wechat-miniapp/shared/journey-sharing-2026-09-22/share-shell.mjs?v=20260922-4';
import {spots as shareSpots} from '/docs/design-resources/wechat-miniapp/plan/revisions/three-requirements-2026-09-13/preview/plan-model.mjs';
import {root,credit,disclosure,copyButton} from './source-ui.mjs';
import {matteImage,replaceGraphic,applyTimeIcons} from '/docs/design-resources/wechat-miniapp/shared/icons/material-preview.mjs';
const surface=document.body.dataset.scaleSurface;
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
function appendOnce(parent,key,html,tag='div'){if(!parent||parent.querySelector(`[data-candidate="${key}"]`))return;const el=document.createElement(tag);el.dataset.candidate=key;el.innerHTML=html;parent.append(el);return el;}
function replaceText(old,value){const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let t;while(t=walk.nextNode())if(!t.parentElement.closest('script,style')&&t.data.includes(old))t.data=t.data.replaceAll(old,value);}
const routes={'/my/':'my.html','/settings/':'settings.html','/search/':'search.html','/plan/':'plan.html','/contributions/':'contributions.html','/feedback/':'feedback.html','/sky/':'sky.html'};
function localLink(value){if(!value||!value.includes('/docs/design-resources/')||value.includes('comfortable-scale-2026-09-22'))return value;const u=new URL(value,location.href);for(const [part,file]of Object.entries(routes))if(u.pathname.includes(part)&&/\.html$/.test(u.pathname))return root+file+u.search;return value;}
function iconize(){
 applyTimeIcons(document);
 if(surface==='feedback'){
  replaceGraphic(document,'.address-field svg','search',{size:22});replaceGraphic(document,'[aria-label="添加观星点"] svg','add',{size:26});replaceGraphic(document,'.nearby-pin svg','place-pin',{size:28});
  all('#close-sheet,#clear-address,button[aria-label^="移除"]').forEach(b=>{if(!b.querySelector('img'))b.replaceChildren(matteImage('close',{size:22}));});
  all('[data-purpose=bottom-tab-bar] button').forEach((b,i)=>replaceGraphic(b,'svg',i?'account-user':'map',{size:26}));
 }
 const known=[['[aria-label="返回"] svg,#back svg','arrow-left'],['[aria-label="设置"] svg','settings'],['#avatar svg','account-user'],['#nickname svg','pencil'],['svg.plan-suv','plan-suv'],['#more-plans svg','more'],['.spot-address-icon svg','place-pin'],['[aria-label="定位"] svg','location'],['[aria-label="图层"] svg','layers'],['[aria-label="关闭筛选"] svg','close'],['[data-search-leading] svg','arrow-left'],['[data-filter-open] svg','filter'],['#location .icon-well svg','place-pin'],['#cache .icon-well svg','refresh'],['#export .icon-well svg','download'],['#delete .icon-well svg','trash'],['#sheet-close svg','close'],['.chevron svg','chevron-right']];
 for(const [selector,name]of known)replaceGraphic(document,selector,name,{size:26});
 if(surface==='my'){
  replaceGraphic(document,'#submitted button>svg','chevron-right',{size:24});
  replaceGraphic(document,'#submitted button div svg','pencil',{size:30});
  all('footer button').forEach(b=>{if(b.querySelector('svg'))replaceGraphic(b,'svg',b.textContent.includes('我的')?'account-user':'map',{size:28,state:b.textContent.includes('我的')?'selected':'default'});});
 }
 const filters={'光害':'bulb','少云':'cloud','停车':'parking','厕所':'restroom','可驾车直达':'plan-suv','有实拍照片':'images','可露营/驻车':'tent','特定天象':'meteor','月亮影响':'moon','徒步难度':'walking','信号':'signal','充电':'charging','天空开阔方向':'horizon','最近核验时间':'verified'};
 all('[data-filter-option]').forEach(b=>{const n=filters[b.dataset.filterOption];if(n)replaceGraphic(b,'.filter-prefix svg',n,{size:22});});
 all('a[href]').forEach(a=>{const href=localLink(a.getAttribute('href'));if(href!==a.getAttribute('href'))a.href=href;});
 for(const [selector,name]of [['#direction .icon-well svg','compass'],['#precise .icon-well svg','location'],['#planReminder .icon-well svg','bell'],['#reviewReminder .icon-well svg','checklist'],['.badge.DRAFT svg','pencil'],['.badge.PENDING svg','clock'],['.badge.REJECTED svg','warning'],['.badge.PUBLISHED svg,.badge.APPROVED svg','verified'],['button[data-mode=DAY] svg','sun'],['button[data-mode=NIGHT] svg','moon'],['button[data-mode=OBSERVATION] svg','telescope']])replaceGraphic(document,selector,name,{size:24});
 if(surface==='layers')all('#primary-nav>div').forEach((e,i)=>replaceGraphic(e,'svg',i?'account-user':'map',{size:28,state:i?'default':'selected'}));
 all('iframe[src]').forEach(f=>{const raw=f.getAttribute('src');if(raw.includes('/map/')&&/panel\.html|spot-information\/preview\/index.html/.test(raw)&&!raw.includes('comfortable-scale'))f.src=root+'map-panel.html'+new URL(raw,location.href).search;});
}
function patchDynamic(){
 iconize();
 // Retired providers/route semantics must not reappear in dynamic renderers.
 all('svg text').filter(e=>e.textContent.includes('© OpenStreetMap')).forEach(e=>e.parentElement.remove());
 all('span,div').filter(e=>e.childElementCount===0&&e.textContent.trim()==='© OpenStreetMap 贡献者').forEach(e=>e.remove());
 if(surface==='search'){
  all('[data-filter-option="驾车时长"],[data-filter-option="低云阈值"],[data-drive-config]').forEach(e=>{if(!e.hidden)e.hidden=true;});
  const selected=all('[data-filter-scroll] [data-filter-option="少云"]').some(b=>b.dataset.selected==='true'||b.getAttribute('aria-pressed')==='true');
  let source=$('.search-source');if(!source){source=document.createElement('div');source.className='search-source';source.innerHTML=credit('weather')+disclosure(['weather'],'天气来源与覆盖');$('.results-scroll')?.append(source);}source.hidden=!selected;
 }
 if(surface==='plan'){
  all('.fact strong').forEach(e=>{if(e.textContent==='待获取')e.textContent='暂无数据';});
  const facts=$('.facts');if(facts&&new URLSearchParams(location.search).get('weather')==='available'){
   if(!facts.dataset.candidateWeather){facts.dataset.candidateWeather='true';const values=['20:04 天文夜','月亮位于地平线下','总云量 30%','东北风 9 km/h · 22°C'];facts.querySelectorAll('strong').forEach((e,i)=>e.textContent=values[i]);appendOnce(facts.parentElement,'weather',credit('weather')+disclosure(['weather','engine'],'观测参考来源'));}
  }
  all('.reminder-status small').forEach(e=>{if(e.textContent.includes('已授权'))e.textContent='提醒已保存';});
 }
 const eventSource=$('.event-source');if(eventSource&&!eventSource.dataset.candidate){eventSource.dataset.candidate='true';eventSource.outerHTML=disclosure(['meteor'],'数据来源与日期精度');}
 if(surface==='sky'){
  const current=$('#details');if(current?.open){all('.celestial-source-link').forEach(e=>e.remove());}
 }
}
function mapCompliance(){
 const weather=$('.weather-source');if(weather){weather.innerHTML=credit('weather');const next=weather.nextElementSibling;if(next?.matches('details'))next.outerHTML=disclosure(['weather','engine'],'来源与有效时间');}
 const terrain=$('.terrain-source');if(terrain)terrain.outerHTML='<div class=terrain-provenance>'+disclosure(['terrain','nightlight'],'地形与夜光来源')+'</div>';$('.terrain-sample')?.remove();
 const light=$('.night-light');appendOnce(light,'nightlight',credit('nightlight')+disclosure(['nightlight'],'年度夜光来源'));
 const map=$('.terrain-box');if(map){const c=appendOnce(map,'eog',credit('nightlight'));const check=$('#terrain-light-visible');if(c&&check){c.hidden=!check.checked;check.addEventListener('change',()=>c.hidden=!check.checked);}}
 appendOnce($('#overview-facts'),'recent-weather',`<section class="weather-supplement"><h3>近期天气</h3><p class="secondary">邻近地区 · 前两个自然日</p><p>地区暂无数据</p><details><summary>说明近期天气数据范围</summary><p>展示邻近地区前两个自然日的历史再分析，不含今天，也不是点位过去48小时现场实测。未返回的日期或字段不补齐。</p><p>天气只提示可能影响，不能确认道路、积水、结冰、开放或通行安全。</p></details></section>`);
 const astronomy=$('#astronomy');appendOnce(astronomy,'air-quality',`<section class="weather-supplement"><h3>空气质量</h3><p class="secondary">当前区域参考</p><p>当前空气质量暂无可用数据。</p><p class="secondary">所选时刻的空气质量预报</p><p>所选时刻暂无空气质量预报。</p><p class="secondary">不同 AQI 标准保留原值；空气质量不等于天文透明度或视宁度。</p></section>`);
 if(new URLSearchParams(location.search).get('evidence')==='available'){
  $('[data-candidate=recent-weather]').innerHTML=`<section class="weather-supplement"><h3>近期天气</h3><p class="secondary">邻近地区：滨海 · 截至09月22日的前两日</p><div class="weather-day"><span>09月20日</span><p>气温 23–29°C · 降水量 2.1 mm</p></div><div class="weather-day"><span>09月21日</span><p>气温 24–30°C · 降水量 0 mm</p></div><p class="secondary">降水可能使路面湿滑，无法据此确认现场通行。</p>${credit('recent')}${disclosure(['recent'],'近期天气范围与来源')}</section>`;
  $('[data-candidate=air-quality]').innerHTML=`<section class="weather-supplement"><h3>空气质量</h3><p class="secondary">当前区域参考 · 获取于09月22日20:00</p><div class="weather-metrics"><div><span>中国 AQI</span><strong>42 · 优</strong></div><div><span>PM2.5</span><strong>12 μg/m³</strong></div></div><p class="secondary">所选时刻预报：暂无数据</p><p class="secondary">获取时间不是点位实测时间。空气质量不等于透明度或视宁度。</p>${credit('air')}${disclosure(['air'],'空气质量来源')}</section>`;
 }
 if(new URLSearchParams(location.search).get('evidence')==='warning'){
  const warning=appendOnce(astronomy,'warnings',`<section class="weather-supplement weather-warning"><div class="warning-heading"><img src="/docs/design-resources/wechat-miniapp/shared/icons/adopted/b-matte-256/assets/warning--day--default.png" alt=""><div><h3>雷电黄色预警</h3><p>深圳市气象台</p></div></div><dl class="warning-times"><div><dt>发布</dt><dd>09-08 17:30</dd></div><div><dt>生效</dt><dd>09-08 17:30</dd></div><div><dt>到期</dt><dd>09-08 23:30</dd></div><div><dt>时区</dt><dd>北京时间 UTC+8</dd></div></dl><p>预计所在区域将出现雷电活动。请留意天气变化，避免在空旷地带停留，及时进入安全室内。</p><details><summary>防御指引</summary><p>停止露天观测；远离孤立树木、金属围栏与水边，不在高处架设器材。</p></details>${credit('warning')}${disclosure(['warning'],'预警来源与说明')}</section>`);astronomy.prepend(warning);
 }
 if(new URLSearchParams(location.search).get('evidence')==='error'){
  const warning=appendOnce(astronomy,'warnings',`<section class="weather-supplement weather-warning"><h3>官方预警</h3><p>官方预警暂未确认最新状态，不能据此判断没有预警。</p><button class="source-copy" data-retry>重试官方预警</button>${credit('warning')}</section>`);astronomy.prepend(warning);
  warning.querySelector('[data-retry]').onclick=e=>{const b=e.currentTarget;b.textContent='正在更新官方预警…';setTimeout(()=>{b.textContent='重试官方预警';},700);};
 }
 // Keep existing map actions and drawer owner; only route to the resized design consumer.
 document.addEventListener('click',e=>{const b=e.target.closest('[data-target]');if(!b)return;const target={sky:'sky.html',feedback:'feedback.html?mode=feedback',navigation:null}[b.dataset.target];if(target){e.preventDefault();e.stopImmediatePropagation();location.href=root+target;}},true);
}
function layerCompliance(){
 const host=document.createElement('div');host.className='layer-compliance';$('#layer-panel')?.append(host);
 const weather=document.createElement('div');weather.innerHTML=credit('weather')+disclosure(['weather'],'天气来源与覆盖');
 const light=document.createElement('div');light.innerHTML=credit('nightlight')+disclosure(['nightlight'],'夜光来源与许可');
 const terrain=document.createElement('div');terrain.innerHTML=disclosure(['terrain'],'地形来源与许可');host.append(weather,light,terrain);
 const sync=()=>{weather.hidden=document.body.dataset.selectedLayer!=='TOTAL_CLOUD';light.hidden=document.body.dataset.selectedLayer!=='LIGHT';terrain.hidden=!$('#terrain-toggle')?.checked;};
 document.addEventListener('change',sync);new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-selected-layer']});sync();
}
if(surface==='map')mapCompliance();if(surface==='layers')layerCompliance();
if(surface==='my'){
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;let dest;if(b.getAttribute('aria-label')==='设置')dest='settings.html';if(b.closest('#submitted'))dest='contributions.html';if(b.id==='all-plans')dest='plan.html';if(dest){e.preventDefault();e.stopImmediatePropagation();location.href=root+dest;}},true);
}
if(surface==='sky'){
 const back=$('#back');if(back)back.replaceChildren(matteImage('arrow-left',{size:28}));
 const close=$('#close-details');if(close)close.replaceChildren(matteImage('close',{size:26}));
 const objects=$('#objects');if(objects)objects.replaceChildren(matteImage('telescope',{size:30}),Object.assign(document.createElement('span'),{textContent:'天体'}));
}
if(surface==='feedback'){
 const search=$('.map-search');if(search){search.replaceChildren(matteImage('search',{size:24}),document.createTextNode('搜索观星点'));search.setAttribute('role','button');search.tabIndex=0;search.onclick=()=>location.href=root+'search.html';}
}
// Keep route destinations inside this review package, while retaining each original form/modal owner.
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;let dest=null;
 if(surface==='sky'&&b.id==='back'&&window.parent===window)dest='map.html?map=1';
 if(['my','feedback'].includes(surface)&&b.closest('footer,nav')&&b.textContent.trim()==='地图')dest='map.html?map=1&browse=1';
 if(surface==='feedback'&&b.closest('nav')&&b.textContent.trim()==='我的')dest='my.html';
 if(dest){e.preventDefault();e.stopImmediatePropagation();location.href=root+dest;}
},true);
const observer=new MutationObserver(()=>{observer.disconnect();patchDynamic();observe();});function observe(){observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-selected','aria-pressed']});}patchDynamic();observe();

// New journey resource entry; shared product navigation remains in each current owner.
const journeyRoot='/docs/design-resources/wechat-miniapp/shared/journey-sharing-2026-09-22/index.html';
if(surface==='my'){
 const entry=document.createElement('button');entry.id='journey-achievements';
 entry.style.cssText='display:flex;align-items:center;gap:12px;width:100%;padding:18px;background:#ffffffc9;border:0;border-radius:22px;text-align:left;color:#263646;font:inherit';
 entry.append(matteImage('telescope',{size:32}));
 const label=document.createElement('span');label.style.flex='1';label.innerHTML='<strong style="font-size:16px">个人行程成就</strong><small style="display:block;margin-top:5px;font-size:13px;color:#6f8190">回顾每一份已结束的计划</small>';entry.append(label,matteImage('chevron-right',{size:24}));
 entry.onclick=()=>location.href=journeyRoot+'?from=my';document.querySelector('#plan-card').after(entry);
}
if(surface==='map')document.addEventListener('click',e=>{
 const b=e.target.closest('#fixed-actions button');if(!b||!b.textContent.includes('分享'))return;
 e.preventDefault();e.stopImmediatePropagation();const name=document.querySelector('#overview h2')?.textContent.trim();const spotId=document.body.dataset.shareSpotId||shareSpots.find(s=>s.name===name)?.id||'unavailable';if(parent!==window&&parent.document.querySelector('#spot-frame,#spot-host'))parent.postMessage({type:'sharing-open',spotId},location.origin);else openSharing('page=spot&spot='+encodeURIComponent(spotId),b);
},true);

document.body.dataset.candidateReady='true';
