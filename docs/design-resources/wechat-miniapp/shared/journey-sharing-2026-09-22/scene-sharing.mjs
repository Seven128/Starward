import {sceneId,status,loader,navigateScene,notice} from '../comfortable-scale-2026-09-22/preview/scene-ui.mjs';
const $=s=>document.querySelector(s);
export function mountSharingScenes(){
 const id=sceneId;
 if(id==='13R-loading'){
  $('.stat-number').textContent='—';document.querySelectorAll('.sub-stat-item strong').forEach(e=>e.textContent='—');$('.timeline-count-hint').textContent='正在读取';$('.trip-list-stack').hidden=false;$('.trip-list-stack').replaceChildren(status('正在读取已结束计划','','','loading'));$('#achieve-empty-state').hidden=true;
 }
 const page=document.body.dataset.page,view=$('#view-'+page),actions=view?.querySelector('.share-page-actions');
 if(id==='14F-preparing'&&actions){actions.prepend(status('正在准备公开分享','','','loading'));actions.querySelectorAll('button').forEach(e=>e.disabled=true);}
 if(['14F','14F-spot','14F-detail'].includes(id)&&actions){
  const note=document.createElement('p');note.className='scene-microcopy';note.textContent=page==='trip'?'公开计划安排；私人出发地、清单与备注不包含在分享中。':'公开静态地点资料；不分享实时位置或陈旧天气。';actions.before(note);
 }
 if(id==='14H-poster'||id==='14H-poster-failed'){
  const busy=id==='14H-poster';actions.replaceChildren(status(busy?'正在生成分享海报':'海报保存未完成',busy?'':'重试',()=>navigateScene('14H-poster'),busy?'loading':'error'));
  const back=document.createElement('button');back.className='btn-secondary-action';back.textContent='返回分享页';back.onclick=()=>navigateScene('14F');actions.append(back);
 }
 document.body.dataset.sceneReady='true';
}
