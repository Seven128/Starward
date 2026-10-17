// Editable design scenes only; no SDK, account writes, or live provider calls.
export const sceneId=new URLSearchParams(location.search).get('design_scene')||'';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function ensureSceneStyles(){
 if(!sceneId||document.querySelector('[data-scene-styles]'))return;
 const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./scene-ui.css',import.meta.url).href;link.dataset.sceneStyles='';document.head.append(link);document.body.dataset.designScene=sceneId;
}
export function loader(kind='dots'){return `<span class="scene-loader ${kind==='arc'?'scene-loader--arc':''}" aria-hidden="true">${kind==='arc'?'':'<i></i><i></i><i></i>'}</span>`;}
export function status(text,actionLabel='',action=()=>{},tone='info'){
 const el=document.createElement('div');el.className='scene-status scene-status--'+tone;el.setAttribute('role',tone==='error'?'alert':'status');
 if(tone==='loading')el.innerHTML=loader();const copy=document.createElement('span');copy.textContent=text;el.append(copy);
 if(actionLabel){const button=document.createElement('button');button.type='button';button.textContent=actionLabel;button.onclick=action;el.append(button);}return el;
}
export function notice(text){
 document.querySelectorAll('.scene-notice').forEach(el=>el.remove());const el=document.createElement('button');el.type='button';el.className='scene-notice';el.setAttribute('role','status');el.setAttribute('aria-label',text+'，点击关闭');el.textContent=text;
 const host=document.querySelector('#phone')||document.querySelector('.phone')||document.body;host.append(el);let timer;const close=()=>{clearTimeout(timer);el.remove();};el.onclick=close;if(!new URLSearchParams(location.search).has('capture'))timer=setTimeout(close,3000);return el;
}
export function navigateScene(id){
 if(parent!==window){parent.postMessage({type:'design-scene-navigate',id},'*');return;}
 const next=new URL(location.href);next.searchParams.set('design_scene',id);location.href=next.href;
}
export function dialog(title,bodyHTML,{onClose}={}){
 const el=document.createElement('dialog');el.className='scene-dialog';el.innerHTML=`<header><h2>${esc(title)}</h2><button type="button" data-scene-close aria-label="关闭">×</button></header><div class="scene-dialog-body">${bodyHTML}</div>`;
 const focus=document.activeElement;el.querySelector('[data-scene-close]').onclick=()=>el.close();el.addEventListener('close',()=>{onClose?.();el.remove();focus?.focus();},{once:true});document.body.append(el);el.showModal();return el;
}
ensureSceneStyles();
