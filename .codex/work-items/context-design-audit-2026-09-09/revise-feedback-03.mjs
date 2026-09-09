import fs from 'node:fs';
import path from 'node:path';
const root='E:/dev/Starward', base=root+'/docs/design-resources/wechat-miniapp';
const dir=k=>`${base}/${k}/candidates/context-audit-2026-09-09`;
const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
for(const k of ['search','my','sky','map']){const p=dir(k);if(!fs.existsSync(p+'/before-feedback-03'))fs.cpSync(p+'/preview',p+'/before-feedback-03',{recursive:true});}
fs.appendFileSync(dir('search')+'/preview/revision.css',`
/* Feedback 03: Stitch double-row composition; local integration retains transactional controls. */
.drive-config,.drive-config[data-enabled="false"]{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:2px;border:0;border-radius:0;background:transparent;padding:0 2px 8px}
.drive-config>.filter-option{min-width:0;width:auto;margin:0;font-size:11px}
.drive-config .chip-face{gap:4px;white-space:nowrap}.drive-config .chip-face svg{width:13px;height:13px;flex:none}
.drive-mode{gap:0}.drive-mode button{padding:0;min-width:44px;height:44px;font-size:11px}
.drive-mode button[aria-pressed=true]:after{bottom:8px;left:14px;right:14px;height:2px;background:#91a8b8}
.drive-input-row{grid-column:1/-1;gap:10px;border:0;padding:0 0 4px;color:#697684;font-size:12px}
.drive-input-row input{width:64px;height:44px;min-height:44px;border:0;border-bottom:1px solid #c6d1da;border-radius:5px 5px 0 0;background:#f4f6f8;color:#273c4b;font-size:19px;font-weight:500;font-variant-numeric:tabular-nums;outline-offset:2px;box-shadow:none}
.drive-error{grid-column:1/-1}.drive-config[data-enabled="false"] .drive-input-row{opacity:.65}
`);
fs.appendFileSync(dir('my')+'/preview/revision.css',`
/* Feedback 03: Stitch centered quiet badge, slightly more breathing room. */
.plan-row[data-ongoing=true] .plan-time{display:flex;align-items:center;gap:9px;line-height:16px}
.plan-row[data-ongoing=true] .plan-time>span:first-child{display:inline-flex;align-items:center;justify-content:center;flex:none;padding:3px 9px;line-height:16px;font-size:10.5px;border:1px solid #dce5de;border-radius:5px;background:#f0f4f0;color:#496354;font-weight:400}
.plan-row[data-ongoing=true] .plan-time>span:last-child{display:inline-block;line-height:16px;margin:0;align-self:center}
`);
edit(dir('sky')+'/preview/app.mjs',s=>s.replace("b.onclick=()=>{if(selected===t.id)openTarget(t);else{selected=t.id;draw();}};","b.onclick=()=>{selected=t.id;openTarget(t);draw();};").replace(/function openTarget\(t\)\{.*?\}\n/,`function openTarget(t){
 const d=$('#details');d.dataset.objectId=t.id;$('#detail-title').textContent=t.name;
 const body=$('#detail-body');body.replaceChildren();
 const add=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;e.textContent=text;body.append(e);return e;};
 add('div','celestial-kind',t.kind==='STAR'?'恒星':t.kind);
 if(t.id==='vega')add('p','celestial-alias','Vega · α Lyrae');
 add('p','celestial-intro','这颗天体的介绍暂未收录。你仍可查看所选地点与时刻的位置资料。');
 const facts=add('dl','celestial-facts','');for(const [label,value]of [['方位',t.azimuthDeg.toFixed(1)+'°'],['仰角',t.altitudeDeg.toFixed(1)+'°']]){const box=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;box.append(dt,dd);facts.append(box);}
 add('p','celestial-context',locationName+' · '+row.at+' · UTC+8');
 add('p','celestial-horizon',t.altitudeDeg>0?'位于理论地平线上方；现场山体、建筑和云层可能遮挡。':'位于理论地平线以下。');
 add('p','celestial-source','位置：设计预览演算样例 · 非实时观测');
 if(!d.open)d.showModal();
}
`));
fs.appendFileSync(dir('sky')+'/preview/revision.css',`
/* Feedback 03: Stitch centered graphite modal, scoped away from the shared calendar. */
#details{position:fixed;inset:0;margin:auto;width:calc(100% - 48px);max-width:350px;height:fit-content;max-height:calc(100dvh - 112px);box-sizing:border-box;padding:22px;border:1px solid #ffffff1c;border-radius:20px;background:linear-gradient(155deg,#15202e,#0d1622 70%);color:#dce3ec;box-shadow:0 24px 72px #0009;animation:none;overflow:hidden}
#details::backdrop{background:#03071099}#details header{position:relative;inset:auto;display:flex;align-items:center;justify-content:space-between;height:auto;padding:0;margin:0 0 4px;gap:10px}
#details h2{font-size:21px;font-weight:500;letter-spacing:.04em;line-height:30px;padding:0;margin:0;overflow-wrap:anywhere}
#close-details{position:relative;flex:none;width:44px;height:44px;margin:-10px -10px 0 0;border:0;border-radius:50%;background:transparent;color:#a7b4c4;font-size:25px;line-height:1}
#detail-body{max-height:calc(100dvh - 206px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}#detail-body::-webkit-scrollbar{display:none}
#detail-body .celestial-kind{display:inline-block;font-size:10px;line-height:18px;color:#a8bacb;border:1px solid #9eafc522;border-radius:4px;padding:1px 7px;margin:1px 0 0}
#detail-body .celestial-alias{font-size:12px;letter-spacing:.03em;color:#8d9eaf;margin:12px 0 0}
#detail-body .celestial-intro{font-size:13px;line-height:1.85;color:#c0cbd7;margin:20px 0}
.celestial-facts{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:0;padding:17px 0;border-top:1px solid #ffffff0d;border-bottom:1px solid #ffffff0d}.celestial-facts dt{font-size:11px;color:#8396aa;margin-bottom:7px}.celestial-facts dd{margin:0;font-size:22px;font-weight:400;line-height:1.3;font-variant-numeric:tabular-nums;color:#dce4ee}
#detail-body .celestial-context,#detail-body .celestial-horizon{font-size:11px;line-height:1.7;color:#91a1b3;margin:14px 0 0}#detail-body .celestial-source{font-size:10px;line-height:1.6;color:#8295a9;margin:18px 0 0}
body.red #details{background:#170c0b;color:#d69182;border-color:#81413766}body.red #details *{color:#c98779!important}body.red #details .celestial-facts,body.red #details .celestial-kind{border-color:#81413744}
@media(max-height:500px){#details{max-height:calc(100dvh - 32px)}#detail-body{max-height:calc(100dvh - 126px)}}
`);
edit(dir('map')+'/preview/editor.mjs',s=>s.replace("const host=window.contributionPreviewHost;",`const host=window.contributionPreviewHost;
// Large-panel corner pixels belong to its presentation, not the exposed map.
const cornerGuard=document.createElement('div');cornerGuard.id='panel-corner-guard';cornerGuard.setAttribute('aria-hidden','true');phone.append(cornerGuard);
function syncPanelGeometry(holder,panel,d){holder.style.height=panel.getBoundingClientRect().height+'px';const large=d.body.dataset.extent==='large',media=(d.querySelector('#site-media')?.getBoundingClientRect().height||0)>1;holder.style.borderRadius=large&&media?'0':'24px 24px 0 0';phone.dataset.panelExtent=large?'large':'other';cornerGuard.style.top=holder.offsetTop+'px';}
`).replaceAll("holder.style.height=panel.getBoundingClientRect().height+'px';holder.style.borderRadius=d.body.dataset.extent==='large'?'0':'24px 24px 0 0';","syncPanelGeometry(holder,panel,d);"));
fs.appendFileSync(dir('map')+'/preview/revision.css',`
#panel-corner-guard{display:none;position:absolute;left:0;right:0;height:24px;z-index:30;background:transparent;touch-action:none}
#phone[data-surface=spot-panel][data-spot-open=true][data-panel-extent=large] #panel-corner-guard{display:block}
`);
console.log('Four candidate previews revised; before-feedback-03 snapshots retained.');
