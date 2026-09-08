// Isolated, synthetic DESIGN fixtures. Not a production data provider.
const contentQuery=new URLSearchParams(location.search);
let scenario=contentQuery.get('scenario')||'partial',facilityMedia=true;
let fixtureRows=window.designDays[7].hours;
let selectedSlice=6;
function value(id,n,unit=''){const el=document.getElementById(id);el.classList.toggle('missing',n===null);el.replaceChildren(document.createTextNode(n===null?'暂无数据':String(n)));if(n!==null&&unit){const u=document.createElement('span');u.textContent=unit;el.append(u);}}
function updateFacts(i){selectedSlice=i;const row=fixtureRows[i],partial=scenario==='partial';document.getElementById('selected-time').textContent='09月07日 '+row.at;
 for(const [id,key,unit] of [['cloud-total','cloud','%'],['cloud-low','low','%'],['cloud-mid','mid','%'],['cloud-high','high','%'],['temperature','temp','°C'],['humidity','humidity','%'],['dew-point','dew','°C'],['wind','wind','km/h'],['gust','gust','km/h'],['visibility','visibility','km'],['rain','rain','mm'],['rain-chance','chance','%'],['moon-alt','moonAlt','°']])value(id,partial&&['gust','visibility'].includes(key)?null:row[key],unit);
 value('moon-lit',18,'%');document.getElementById('darkness').textContent=i===0?'暮光':'天文夜';document.getElementById('target-one-alt').textContent=row.one+'°';document.getElementById('target-two-alt').textContent=row.two+'°';
 if(typeof updateMoonPanel==='function')updateMoonPanel(i);
}

function setScenario(next){scenario=next;document.body.dataset.record=next==='absent'?'absent':'present';document.getElementById('contact-value').textContent=next==='full'?'无门禁电话 · 预约凭证入场':'暂无数据';document.getElementById('contact-value').classList.toggle('muted',next!=='full');document.getElementById('toilet-hours').textContent=next==='full'?'18:00–次日06:00，与场地开放时间一致':'开放时段暂无数据';updateFacts(selectedSlice);}
const viewer=document.getElementById('photo-viewer');let photoTrigger=null,photoScroll=0;
const photoCredits={parking:{author:'Matthew Paul Argall',url:'https://commons.wikimedia.org/wiki/File:Parked_cars,_parking_lot_(24760952367).jpg'},toilet:{author:'Benjamin Berne / SuSanA Secretariat',url:'https://commons.wikimedia.org/wiki/File:Public_toilet_block_in_OFP_(5537452770).jpg'}};
addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin)return;if(['partial','full','absent'].includes(e.data.scenario))setScenario(e.data.scenario);if(typeof e.data.facilityMedia==='boolean'){facilityMedia=e.data.facilityMedia;document.body.dataset.facilityMedia=facilityMedia?'on':'off';document.querySelectorAll('[data-photo]').forEach(b=>{b.setAttribute('aria-disabled',String(!facilityMedia));b.setAttribute('aria-label',b.dataset.photo==='parking'?(facilityMedia?'停车设施，查看设施照片':'停车设施'):(facilityMedia?'洗手间，查看设施照片':'洗手间'));});}});
setScenario(scenario);
