import {compactCredit,disclosure,data} from './source-ui.mjs?v=20261015-scenes';
import {sceneId,status,navigateScene} from './scene-ui.mjs';
const $=s=>document.querySelector(s);
// Extend the complete adopted panel. Identity, photos, facilities, terrain,
// chapter/scroll ownership, date ruler and fixed actions are never reconstructed.
export function applyWeatherScenes(){
 const astro=$('#astronomy');if(!astro)return;
 const query=new URLSearchParams(location.search),id=sceneId;
 const weatherAt=data.weather.retrievedAt.match(/\d{2}:\d{2}/)?.[0]||'未提供',airAt=data.air.retrievedAt.match(/\d{2}:\d{2}/)?.[0]||'未提供';
 const recent=$('[data-candidate="recent-weather"]');
 if(recent){
  const available=query.get('evidence')==='available'||id==='09E'||id==='09E-partial';
  let content=available?`<div class="weather-day"><span>09月06日</span><p>24–29°C · 降水 7.2 mm</p></div>${id==='09E-partial'?'<p class="secondary">09月07日 · 未返回</p>':'<div class="weather-day"><span>09月07日</span><p>23–30°C · 降水 0 mm</p></div>'}<p class="secondary">近期有降水，未硬化道路可能湿滑。</p>`:'<p>地区暂无数据</p>';
  if(id==='09E-failed')content='<p>近期天气暂未取得</p><button class="source-copy" data-recent-retry>重试</button>';
  recent.innerHTML=`<section class="weather-supplement"><h3>近期天气</h3><p class="secondary">邻近地区：滨海 · 截至09月08日前两日</p>${content}${available?compactCredit('recent'):''}${disclosure(['recent'],'数据范围与来源')}</section>`;
  recent.querySelector('[data-recent-retry]')?.addEventListener('click',()=>navigateScene('09E'));
 }
 const weather=$('.weather-card'),source=$('.weather-source');
 if(source)source.innerHTML=compactCredit('weather');
 const light=$('.night-light [data-credit="nightlight"]');if(light)light.outerHTML=compactCredit('nightlight');
 if(weather){
  const time=document.createElement('p');time.className='secondary weather-time';time.textContent='21:00 · 对应小时预报 · 更新20:10';weather.querySelector('h3')?.after(time);
  if(id==='09B'){weather.querySelectorAll('dd').forEach(e=>e.textContent='暂无覆盖');time.textContent='所选时刻暂无天气覆盖';}
  if(id==='09C'){time.textContent='21:00 · 上次更新20:10';weather.querySelector('h3')?.after(status('预报更新失败，保留上次有效时段','重试',()=>navigateScene('09A'),'warning'));}
 }
 const air=$('[data-candidate="air-quality"]');
 if(air){
  const available=query.get('evidence')==='available'||['09A','09C','09D'].includes(id);
  air.innerHTML=`<section class="weather-supplement content-card"><h3>空气质量</h3><p class="secondary">当前区域参考 · 适用20:00 · 获取时间${airAt}</p>${available?'<div class="weather-metrics"><div><span>中国 AQI</span><strong>28 · 优</strong></div><div><span>PM2.5</span><strong>12 μg/m³</strong></div></div>':'<p>当前区域暂无数据</p>'}<div data-aq-forecast></div>${available?compactCredit('air'):''}${disclosure(['air'],'空气质量范围与来源')}</section>`;
  if(id==='09D')air.querySelector('section').append(status('预报暂未取得，当前区域参考保留','重试',()=>navigateScene('09A'),'error'));
 }
 if(id==='09D'){
  let warning=$('[data-candidate="warnings"]');if(!warning){warning=document.createElement('section');warning.dataset.candidate='warnings';astro.prepend(warning);}
  warning.className='weather-supplement weather-warning content-card';warning.innerHTML=`<div class="warning-heading"><img src="/docs/design-resources/wechat-miniapp/shared/icons/adopted/b-matte-256/assets/warning--day--default.png" alt=""><div><h3>雷电黄色预警</h3><p>深圳市气象台</p></div></div><dl class="warning-times"><div><dt>发布</dt><dd>09-08 17:30</dd></div><div><dt>生效</dt><dd>09-08 17:30</dd></div><div><dt>到期</dt><dd>09-08 23:30</dd></div><div><dt>时区</dt><dd>北京时间 UTC+8</dd></div></dl><p>雷电活动 · 停止露天观测</p><details><summary>完整预警与防御指引</summary><p>预计所在区域将出现雷电活动。请留意天气变化，避免在空旷地带停留，及时进入安全室内。</p><p>远离孤立树木、金属围栏与水边，不在高处架设器材。</p>${disclosure(['warning'],'预警来源与说明')}</details>${compactCredit('warning')}`;
 }
 // Observe the original ruler's visible selection; it remains the sole time owner.
 // Current AQ is independent. This example has only the 09-08 21:00 AQ forecast.
 function selectedTime(){
  const selected=$('#selected-time')?.textContent.trim()||'2026-09-08 21:00',hour=selected.slice(11,13)+':00';
  const covered=selected>='2026-09-08 18:00'&&selected<='2026-09-09 06:00'&&id!=='09B';
  const time=weather?.querySelector('.weather-time');if(time)time.textContent=covered?selected+' · 对应小时'+hour+(id==='09C'?' · 上次更新'+weatherAt:' · 更新'+weatherAt):selected+' · 暂无预报覆盖';
  if(!covered)weather?.querySelectorAll('dd').forEach(e=>{e.textContent='暂无覆盖';e.classList.add('missing');});
  if(source)source.innerHTML=compactCredit('weather');
  const forecast=air?.querySelector('[data-aq-forecast]');if(forecast){const available=query.get('evidence')==='available'||['09A','09C','09D'].includes(id),known=available&&selected.startsWith('2026-09-08 21:')&&id!=='09D';forecast.innerHTML='<p class="secondary">所选时刻预报 · '+selected+' → '+hour+'</p>'+(known?'<div class="weather-metrics"><div><span>中国 AQI</span><strong>35 · 优</strong></div></div>':'<p>'+(id==='09D'?'所选时刻预报暂未取得':'该小时暂无空气质量预报')+'</p>');}
 }
 selectedTime();const selection=$('#selected-time');if(selection)new MutationObserver(selectedTime).observe(selection,{childList:true,characterData:true,subtree:true});
 document.body.dataset.weatherScenesReady='true';
}
