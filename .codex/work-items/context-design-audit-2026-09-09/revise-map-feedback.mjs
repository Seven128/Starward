import fs from 'node:fs/promises';
const root='E:/dev/Starward/',rel='docs/design-resources/wechat-miniapp/map/candidates/context-audit-2026-09-09/',dir=root+rel+'preview/';
// Candidate-only integration repair. Original adopted source stays unchanged.
await fs.mkdir(dir+'../before-feedback-02',{recursive:true});
for(const name of ['editor.mjs','revision.css']){try{await fs.copyFile(dir+name,dir+'../before-feedback-02/'+name,fs.constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;}}
let app=await fs.readFile(dir+'../before-feedback-02/editor.mjs','utf8');
app=app.replace("const frame=$('#spot-frame'),holder=$('#spot-presentation');holder.hidden=true;map.focus(record.id,414);setTimeout(()=>{if(ticket!==token)return;holder.hidden=false;const sync=()=>{if(ticket!==token)return;", "const previous=$('#spot-frame'),holder=$('#spot-presentation'),frame=document.createElement('iframe');frame.className='spot-buffer';frame.title='观星点信息';frame.style.visibility='hidden';frame.style.height=(phone.clientHeight+6.8)+'px';holder.append(frame);const sync=()=>{if(ticket!==token){frame.remove();return;}");
app=app.replace("holder.style.height=panel.getBoundingClientRect().height+'px';frame.style.bottom='-68.8px';const observer=new ResizeObserver", "holder.style.height=panel.getBoundingClientRect().height+'px';frame.style.bottom='-68.8px';previous?.remove();frame.id='spot-frame';frame.style.visibility='visible';holder.hidden=false;map.focus(record.id,414);const observer=new ResizeObserver");
app=app.replace("frame.src='/docs/design-resources/wechat-miniapp/map/adopted/spot-information/preview/index.html?extent=medium&v='+ticket;},300);}","frame.src='panel.html?extent=medium';}");
await fs.writeFile(dir+'editor.mjs',app);
let html=await fs.readFile(root+'docs/design-resources/wechat-miniapp/map/adopted/spot-information/preview/index.html','utf8');
html=html.replace('<head>','<head><base href="/docs/design-resources/wechat-miniapp/map/adopted/spot-information/preview/">');
html=html.replace(/src="preview.js[^\"]*"/,'src="/'+rel+'preview/panel-gestures.js"');
html=html.replace('</head>','<style>body[data-extent="medium"] #document,body[data-extent="large"] #document{overflow-y:auto;pointer-events:auto}body[data-extent="small"] #document{overflow:hidden;pointer-events:auto;touch-action:none}body[data-extent="small"] #extent-panel{touch-action:none}</style></head>');
await fs.writeFile(dir+'panel.html',html);
let gestures=await fs.readFile(root+'docs/design-resources/wechat-miniapp/map/adopted/spot-information/preview/preview.js','utf8');
gestures+=`\n// Compact viewport owns vertical expansion; its lower boundary is a hard stop.
let compactDrag=null;
panel.addEventListener('pointerdown',e=>{if(document.body.dataset.extent!=='small'||e.target.closest('#handle-band,#fixed-actions'))return;cancelAnimationFrame(frame);compactDrag={id:e.pointerId,y:e.clientY,h:height,moved:false};panel.setPointerCapture(e.pointerId);});
panel.addEventListener('pointermove',e=>{if(!compactDrag)return;const delta=compactDrag.y-e.clientY;if(Math.abs(delta)>6)compactDrag.moved=true;if(compactDrag.moved)paint(clamp(compactDrag.h+delta,stops().small,stops().medium));});
panel.addEventListener('pointerup',e=>{if(!compactDrag)return;const g=compactDrag;compactDrag=null;if(g.moved){e.preventDefault();setExtent(g.y-e.clientY>24?'medium':'small');}});
panel.addEventListener('pointercancel',()=>{if(compactDrag){compactDrag=null;setExtent('small');}});
panel.addEventListener('wheel',e=>{if(document.body.dataset.extent!=='small')return;e.preventDefault();if(e.deltaY>0)setExtent('medium');},{passive:false});
`;
await fs.writeFile(dir+'panel-gestures.js',gestures);
const css=await fs.readFile(dir+'../before-feedback-02/revision.css','utf8');
await fs.writeFile(dir+'revision.css',css+'\n#spot-presentation{animation:none!important;border-radius:0!important} .spot-buffer{position:absolute;left:0;bottom:-68.8px;width:100%;border:0;background:white} #phone[data-spot-open=true] #map-touch{top:88px}\n');
console.log('Map candidate repaired; baseline builder must be followed by this revision script.');
