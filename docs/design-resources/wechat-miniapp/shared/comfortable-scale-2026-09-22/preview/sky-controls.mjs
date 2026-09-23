import {openTarget,skyTargets,cancelSkyTime} from './sky-app.mjs';
import {matteImage} from '/docs/design-resources/wechat-miniapp/shared/icons/material-preview.mjs';
import {root} from './source-ui.mjs';
const phone=document.querySelector('#phone'),bottom=document.querySelector('#bottom'),time=document.querySelector('#observation-time'),details=document.querySelector('#details');
const dock=document.createElement('div');dock.className='sky-dock';dock.setAttribute('role','group');dock.setAttribute('aria-label','天空控件');
const panels={};const buttons={};let selected=null,editing=false;
for(const [id,name,glyph]of [['calibration','重新校准','compass'],['objects','天体','telescope'],['time','时间','clock']]){const b=document.createElement('button');b.append(matteImage(glyph,{size:26}),document.createTextNode(name));b.setAttribute('aria-expanded','false');b.onclick=()=>toggle(id);dock.append(b);buttons[id]=b;const p=document.createElement('section');p.className='sky-panel sky-panel-'+id;p.hidden=true;phone.append(p);panels[id]=p;}
phone.append(dock);panels.time.append(document.querySelector('#selected-place'),time);bottom.hidden=true;
panels.calibration.innerHTML='<h3>重新校准</h3><p>画面已冻结。移动手机，使星图与真实星空对应。</p><p class="sky-small">确认后继续跟随手机方向。</p><div><button data-cancel>取消</button><button data-confirm>确定</button></div>';
function end(){editing=false;delete phone.dataset.calibrating;buttons.objects.disabled=false;buttons.time.disabled=false;selected=null;Object.values(panels).forEach(p=>(StarwardFluid.show?StarwardFluid.show(p,false):p.hidden=true));Object.values(buttons).forEach(b=>b.setAttribute('aria-expanded','false'));buttons.calibration.focus();}
panels.calibration.querySelector('[data-cancel]').onclick=end;panels.calibration.querySelector('[data-confirm]').onclick=end;
function list(){panels.objects.replaceChildren();const title=document.createElement('h3');title.textContent='天体';panels.objects.append(title);const extras=[{id:'M:31',name:'仙女座星系',kind:'GALAXY'},{id:'M:42',name:'猎户座大星云',kind:'NEBULA'}];for(const t of [...skyTargets(),...extras]){const b=document.createElement('button');b.className='sky-list-row';const name=document.createElement('strong');name.textContent=t.name;const value=document.createElement('small');value.textContent=Number.isFinite(t.altitudeDeg)?(t.altitudeDeg>0?'地平线上方':'地平线以下')+' · '+Math.round(t.altitudeDeg)+'°':t.id+' · 巡天影像';b.append(name,value);b.onclick=()=>{openTarget(t);};panels.objects.append(b);}}
function toggle(id){if(editing)return;if(selected==='time')cancelSkyTime();details.close();const next=selected===id?null:id;selected=next;Object.entries(panels).forEach(([k,p])=>(StarwardFluid.show?StarwardFluid.show(p,k===next):p.hidden=k!==next));Object.entries(buttons).forEach(([k,b])=>b.setAttribute('aria-expanded',String(k===next)));if(next==='objects')list();if(next==='calibration'){editing=true;phone.dataset.calibrating='true';buttons.objects.disabled=true;buttons.time.disabled=true;}}
const independent=document.createElement('div');independent.className='sky-independent';independent.innerHTML='<button data-theme>普通</button><button data-constellation aria-pressed="true">星座：开</button><button data-sources>星座来源</button>';phone.append(independent);
independent.querySelector('[data-theme]').onclick=e=>{const modes=['普通','夜间','观测'];const next=(modes.indexOf(e.currentTarget.textContent)+1)%3;e.currentTarget.textContent=modes[next];document.body.classList.toggle('red',next===2);};
independent.querySelector('[data-constellation]').onclick=e=>{const on=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',String(on));e.currentTarget.textContent=on?'星座：开':'星座：关';};
independent.querySelector('[data-sources]').onclick=e=>openSourcePage('constellation','星座连线与插画',e.currentTarget);
export function openSourcePage(kind,name,trigger){
 const shell=document.createElement('dialog');shell.className='source-page-shell';const frame=document.createElement('iframe');frame.className='source-page-frame';frame.title='来源与许可';frame.src=root+'sources.html?kind='+encodeURIComponent(kind)+'&name='+encodeURIComponent(name)+'&embedded=1';shell.append(frame);document.body.append(shell);shell.showModal();
 const prior=history.state;history.pushState({...prior,sourceReview:true},'',location.pathname+location.search+'#sources');let active=true;
 const cleanup=()=>{if(!active)return;active=false;removeEventListener('message',message);removeEventListener('popstate',pop);shell.close();shell.remove();trigger?.focus({preventScroll:true});};
 const back=()=>{if(active)history.back();};const message=e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.type==='source-back')back();};const pop=()=>cleanup();
 shell.addEventListener('cancel',e=>{e.preventDefault();back();});addEventListener('message',message);addEventListener('popstate',pop);
}
document.addEventListener('open-sky-source',e=>openSourcePage(e.detail.kind,e.detail.name,e.detail.trigger));

const review=new URLSearchParams(location.search).get('review');
function reviewReady(){if(['time','objects','calibration'].includes(review))toggle(review);if(review==='deep'){toggle('objects');openTarget({id:'M:31',name:'仙女座星系',kind:'GALAXY'});}}
if(skyTargets().length)reviewReady();else document.addEventListener('sky-ready',reviewReady,{once:true});
