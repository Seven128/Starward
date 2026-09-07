// Review-only composition. Production uses the existing context/time owners.
const astronomy=document.querySelector('#astronomy'),facts=document.querySelector('#overview-facts');
const chapterItems=[...nav.children];nav.setAttribute('role','navigation');nav.setAttribute('aria-label','地点信息章节');panel.append(nav);
chapterItems[0].querySelector('span:nth-child(2)')?.remove();
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
const dateBar=document.createElement('div');dateBar.className='date-bar';dateBar.innerHTML='<button id="date-prev" aria-label="前一观测夜">‹</button><button id="date-open" aria-haspopup="dialog"><span id="date-label"></span><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18"/></svg></button><button id="date-next" aria-label="后一观测夜">›</button><button id="date-today">今晚</button>';
const timeline=document.createElement('section');timeline.className='content-card timeline-card';timeline.setAttribute('aria-label','观测日期与时间');timeline.append(dateBar,document.querySelector('#time-ruler'));
const timeLabel=document.createElement('p');timeLabel.id='night-time-label';timeline.append(timeLabel);
astronomy.append(timeline,moon,weather,nightlight,targets,sourceCard);
astronomy.querySelector('.astronomy-heading').classList.add('semantic-heading');

let selectedDay=7,chapterFrame=0,chapterTarget=null;
function astronomyOffset(){return astronomy.getBoundingClientRect().top-doc.getBoundingClientRect().top+doc.scrollTop;}
function setChapter(i){chapterItems.forEach((b,j)=>{b.setAttribute('aria-current',i===j?'location':'false');});const box=chapterItems[i].getBoundingClientRect(),base=nav.getBoundingClientRect();indicator.style.transform=`translateX(${box.x-base.x+(box.width-23)/2}px)`;}
function trackChapter(){const reached=doc.scrollTop>=astronomyOffset()-nav.offsetHeight-2;const visible=(reached||chapterTarget!==null)&&document.body.dataset.extent==='large';nav.dataset.visible=String(visible);nav.setAttribute('aria-hidden',String(!visible));chapterItems.forEach(b=>b.tabIndex=visible?0:-1);setChapter(chapterTarget??(reached?1:0));}
function stopChapter(){cancelAnimationFrame(chapterFrame);chapterTarget=null;trackChapter();}
function goChapter(i,instant=false){cancelAnimationFrame(chapterFrame);chapterTarget=i;trackChapter();const begin=doc.scrollTop,end=i?Math.max(0,astronomyOffset()-nav.offsetHeight):0,start=performance.now();
 const duration=instant||reduced()?0:400;
 function tick(now){const t=duration?Math.min(1,(now-start)/duration):1;doc.scrollTop=begin+(end-begin)*(1-Math.pow(1-t,3));if(t<1){chapterFrame=requestAnimationFrame(tick);return;}chapterTarget=null;trackChapter();const heading=i?astronomy.querySelector('h3'):identity.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});}
 chapterFrame=requestAnimationFrame(tick);
}
chapterItems.forEach((b,i)=>{b.setAttribute('role','button');b.setAttribute('aria-label',i?'天文':'基本信息');b.addEventListener('click',()=>goChapter(i));b.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();goChapter(i);}});});
doc.addEventListener('scroll',trackChapter,{passive:true});doc.addEventListener('pointerdown',stopChapter,{passive:true});doc.addEventListener('wheel',stopChapter,{passive:true});
new MutationObserver(trackChapter).observe(document.body,{attributes:true,attributeFilter:['data-extent']});
addEventListener('resize',trackChapter);

const calendar=document.createElement('dialog');calendar.id='date-picker';calendar.setAttribute('aria-labelledby','calendar-title');calendar.innerHTML='<header><h2 id="calendar-title">选择观测夜</h2><button id="calendar-close" aria-label="关闭日期选择">×</button></header><p>2026年9月 · 地点当地时间</p><div class="calendar-week"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div><div id="calendar-days"></div><p class="calendar-note">灰色日期超出当前可选范围。跨午夜时刻归入前一观测夜。</p>';
document.body.append(calendar);
const grid=calendar.querySelector('#calendar-days');grid.setAttribute('role','group');grid.setAttribute('aria-label','九月日期');grid.append(document.createElement('span'));
for(let day=1;day<=30;day++){const b=document.createElement('button');b.textContent=String(day);b.disabled=day>window.designDays.length;b.dataset.day=String(day-1);b.setAttribute('aria-label',`9月${day}日观测夜`);if(day===8)b.innerHTML='8<small>今天</small>';b.addEventListener('click',()=>{chooseDay(day-1);calendar.close();});grid.append(b);}
document.querySelector('#date-open').addEventListener('click',()=>{calendar.showModal();calendar.querySelector(`[data-day="${selectedDay}"]`).focus();});
calendar.querySelector('#calendar-close').addEventListener('click',()=>calendar.close());calendar.addEventListener('close',()=>document.querySelector('#date-open').focus({preventScroll:true}));
document.querySelector('#date-prev').addEventListener('click',()=>chooseDay(selectedDay-1));document.querySelector('#date-next').addEventListener('click',()=>chooseDay(selectedDay+1));document.querySelector('#date-today').addEventListener('click',()=>chooseDay(7));
function chooseDay(i){if(i<0||i>=window.designDays.length)return;selectedDay=i;fixtureRows=window.designDays[i].hours;updateFacts(selectedSlice);}
function updateMoonPanel(i){const day=window.designDays[selectedDay],row=fixtureRows[i];
 const week=new Intl.DateTimeFormat('zh-CN',{weekday:'short',timeZone:'UTC'}).format(new Date(day.date+'T12:00:00Z'));
 document.querySelector('#date-label').textContent=day.label+' '+week;
 document.querySelector('#date-prev').disabled=selectedDay===0;document.querySelector('#date-next').disabled=selectedDay===window.designDays.length-1;
 document.querySelector('#date-today').hidden=selectedDay===7;
 document.querySelector('#night-time-label').textContent=(day.offset<0?'历史时段 · ':day.offset===0?'今晚 · ':'观测夜 · ')+(row.next?'次日 ':'')+row.at;
 document.querySelector('#phase-image').src='moon/phase-'+row.phase+'.svg?v=5b';document.querySelector('#phase-image').alt=row.phaseName;
 document.querySelector('#phase-name').textContent=row.phaseName;document.querySelector('#phase-detail').textContent='月面照明 '+row.illum+'%';
 document.querySelector('#moon-rise').textContent=day.rise||'本观测夜无月出';document.querySelector('#moon-set').textContent=day.set||'本观测夜无月落';
 value('moon-lit',row.illum,'%');value('moon-alt',row.moonAlt,'°');document.querySelector('#darkness').textContent=(i<2||i>22)?'暮光':'天文夜';
 document.querySelector('#selected-time').textContent=day.date+' '+(row.next?'次日 ':'')+row.at;
 document.querySelectorAll('[data-time]').forEach((b,j)=>{const r=fixtureRows[j];b.querySelector('.tick-moon').src='moon/phase-'+r.phase+'.svg?v=5b';b.setAttribute('aria-label',(r.next?'次日 ':'')+r.at+'，'+r.phaseName+'，照明'+r.illum+'%');});
 grid.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.day)===selectedDay)));
 const beyondWeather=day.offset===15&&row.next;
 if(beyondWeather)weather.querySelectorAll('dd').forEach(e=>{e.textContent='暂无数据';e.classList.add('missing');});
 weatherSource.innerHTML='<span>'+(beyondWeather?'该时段超出天气覆盖 · 月相仍可查看':day.offset<0?'Open-Meteo · 历史天气':day.offset>2?'Open-Meteo · 预报更新18:00':'预报更新18:00 · 模型一致性高')+'<br>天体位置按所选时刻计算</span>';
}
updateFacts(selectedSlice);paint(height);trackChapter();
if(contentQuery.get('section')==='astronomy')goChapter(1,true);
