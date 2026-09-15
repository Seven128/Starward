// Review-only composition. Production uses the existing context/time owners.
const astronomy=document.querySelector('#astronomy'),facts=document.querySelector('#overview-facts');
const terrain=window.StarwardTerrain.mount(astronomy);const terrainItem=nav.children[1].cloneNode(true);terrainItem.textContent='地形';nav.insertBefore(terrainItem,nav.children[1]);
const chapterItems=[...nav.children];nav.setAttribute('role','navigation');nav.setAttribute('aria-label','地点信息章节');panel.append(nav);
window.StarwardTabs.prepare(nav,chapterItems,['基本信息','地形','天文']);
const indicator=document.createElement('span');indicator.id='chapter-indicator';indicator.setAttribute('aria-hidden','true');nav.append(indicator);
const identity=document.querySelector('#overview');identity.classList.add('content-card','identity-card');
facts.classList.add('content-card','basic-card');
// Identity currently owns only its own heading; a single basic module may span two semantic wrappers.
const weather=document.createElement('section');weather.className='content-card weather-card';weather.setAttribute('aria-labelledby','weather-heading');weather.innerHTML='<h3 id="weather-heading">气象条件</h3>';
astronomy.querySelectorAll(':scope>.evidence-group').forEach(e=>weather.append(e));
weather.append(astronomy.querySelector('.measurement-note'));
const moon=document.createElement('section');moon.className='content-card moon-card';moon.setAttribute('aria-labelledby','moon-heading');
moon.innerHTML='<h3 id="moon-heading">月相</h3><div class="moon-summary"><img id="phase-image" alt=""><div><strong id="phase-name"></strong><p id="phase-detail"></p></div></div><div class="moon-events"><div><span>月出</span><strong id="moon-rise"></strong></div><div><span>月落</span><strong id="moon-set"></strong></div></div>';
const lunar=astronomy.querySelector('.lunar-section');lunar.classList.add('lunar-facts');moon.append(lunar);
const nightlight=astronomy.querySelector('.night-light');nightlight.classList.add('content-card');
const targets=astronomy.querySelector('.targets');targets.classList.add('content-card');
const weatherSource=astronomy.querySelector('.weather-source'),sourceDetails=astronomy.querySelector('.more-site');
sourceDetails.innerHTML='<summary>数据来源 <span>查看详情</span></summary><p>天气信息按所选日期与有效时段展示，缺失的观测要素保留未知。天体位置、月相与月出月落来自天文计算，采用地点当地时间；实际地形遮挡可能影响月亮出现的时刻。</p><p>卫星夜光是区域估算，不等同现场天空亮度测量。</p>';
const sourceCard=document.createElement('section');sourceCard.className='content-card source-card';sourceCard.append(weatherSource,sourceDetails);
const oldRuler=document.querySelector('#time-ruler');oldRuler.remove();
const timeline=document.createElement('section');timeline.className='content-card timeline-card';timeline.setAttribute('aria-label','观测日期与时间');
astronomy.append(timeline,moon,weather,nightlight,targets,sourceCard);
astronomy.querySelector('.astronomy-heading').classList.add('semantic-heading');

let selectedDay=7,chapterFrame=0,chapterTarget=null;
function astronomyOffset(){return astronomy.getBoundingClientRect().top-doc.getBoundingClientRect().top+doc.scrollTop;}
function terrainOffset(){return terrain.getBoundingClientRect().top-doc.getBoundingClientRect().top+doc.scrollTop;}
function setChapter(i){chapterItems.forEach((b,j)=>{b.setAttribute('aria-current',i===j?'location':'false');});const box=chapterItems[i].getBoundingClientRect(),base=nav.getBoundingClientRect();indicator.style.transform=`translateX(${box.x-base.x+(box.width-23)/2}px)`;}
function trackChapter(){const reached=doc.scrollTop>=terrainOffset()-nav.offsetHeight-2;const active=doc.scrollTop>=astronomyOffset()-nav.offsetHeight-2?2:reached?1:0;const visible=(reached||chapterTarget!==null)&&document.body.dataset.extent==='large';nav.dataset.visible=String(visible);nav.setAttribute('aria-hidden',String(!visible));chapterItems.forEach(b=>b.tabIndex=visible?0:-1);setChapter(chapterTarget??active);}
function stopChapter(){cancelAnimationFrame(chapterFrame);chapterTarget=null;trackChapter();}
function goChapter(i,instant=false,moveFocus=false){cancelAnimationFrame(chapterFrame);chapterTarget=i;trackChapter();const begin=doc.scrollTop,end=i?Math.max(0,(i===1?terrainOffset():astronomyOffset())-nav.offsetHeight):0,start=performance.now();
 const duration=instant||reduced()?0:400;
 function tick(now){const t=duration?Math.min(1,(now-start)/duration):1;doc.scrollTop=begin+(end-begin)*(1-Math.pow(1-t,3));if(t<1){chapterFrame=requestAnimationFrame(tick);return;}chapterTarget=null;trackChapter();const heading=i?(i===1?terrain:astronomy).querySelector('h3'):identity.querySelector('h2');if(moveFocus){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
 chapterFrame=requestAnimationFrame(tick);
}
chapterItems.forEach((b,i)=>{b.setAttribute('role','button');b.setAttribute('aria-label',['基本信息','地形','天文'][i]);b.addEventListener('click',e=>goChapter(i,false,e.detail===0));b.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();goChapter(i,false,true);}});});
doc.addEventListener('scroll',trackChapter,{passive:true});doc.addEventListener('pointerdown',stopChapter,{passive:true});doc.addEventListener('wheel',stopChapter,{passive:true});
new MutationObserver(trackChapter).observe(document.body,{attributes:true,attributeFilter:['data-extent']});
addEventListener('resize',trackChapter);

function updateMoonPanel(i){const day=window.designDays[selectedDay],row=fixtureRows[i];
 document.querySelector('#phase-image').src='moon/phase-'+row.phase+'.svg?v=5b';document.querySelector('#phase-image').alt=row.phaseName;
 document.querySelector('#phase-name').textContent=row.phaseName;document.querySelector('#phase-detail').textContent='月面照明 '+row.illum+'%';
 document.querySelector('#moon-rise').textContent=day.rise||'本观测夜无月出';document.querySelector('#moon-set').textContent=day.set||'本观测夜无月落';
 value('moon-lit',row.illum,'%');value('moon-alt',row.moonAlt,'°');document.querySelector('#darkness').textContent=(i<2||i>22)?'暮光':'天文夜';
 document.querySelector('#selected-time').textContent=(window.spotObservationTime?.getState().localDate||day.date)+' '+row.at;
 document.querySelectorAll('[data-time]').forEach((b,j)=>{const r=fixtureRows[j];b.querySelector('.tick-moon').src='moon/phase-'+r.phase+'.svg?v=5b';b.setAttribute('aria-label',(r.next?'次日 ':'')+r.at+'，'+r.phaseName+'，照明'+r.illum+'%');});
 const beyondWeather=day.offset===15&&row.next;
 if(beyondWeather)weather.querySelectorAll('dd').forEach(e=>{e.textContent='暂无数据';e.classList.add('missing');});
 weatherSource.innerHTML='<span>'+(beyondWeather?'该时段无预报数据 · 月相仍可查看':day.offset<0?'历史预报不作为现场记录':day.offset>2?'和风天气 · 以实际返回时段为准':'和风天气 · 实际返回时段')+' <button type="button" aria-label="说明天气数据范围">?</button><br>天体位置按所选时刻计算</span>';
}
window.spotObservationTime=window.StarwardObservationTime.mount(timeline,{days:window.designDays,dayIndex:selectedDay,index:selectedSlice,moonSource:row=>'moon/phase-'+row.phase+'.svg?v=5b',onChange:selection=>{selectedDay=selection.dayIndex;fixtureRows=selection.day.hours;updateFacts(selection.index);}});
updateFacts(selectedSlice);paint(height);trackChapter();
if(contentQuery.get('section')==='astronomy')goChapter(2,true);

if(contentQuery.get('section')==='terrain')goChapter(1,true);
addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.chapter){setExtent('large',()=>goChapter(['basic','terrain','astronomy'].indexOf(e.data.chapter),true));}});
