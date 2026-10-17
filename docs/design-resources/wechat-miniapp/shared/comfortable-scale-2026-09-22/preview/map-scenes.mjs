import {sceneId,status,notice,navigateScene,loader,dialog} from './scene-ui.mjs';
export async function mountMapScenes({phone,map,tools,showInfo,hideInfo,newEditor,openLayer,reviewRecord,baseline}){
 const id=sceneId;
 if(id==='11D-draft'||id==='11D-pending'){await showInfo(reviewRecord(id.endsWith('draft')?'draft':'pending'));phone.dataset.sceneReady='true';return;}
 if(id==='11F'){await newEditor();const save=document.querySelector('#save-draft'),submit=document.querySelector('#submit');save.innerHTML=loader('arc')+' 保存中';submit.innerHTML=loader()+' 提交中';save.disabled=true;submit.disabled=true;phone.dataset.sceneReady='true';return;}
 hideInfo();
 if(['11A','11B','11C'].includes(id)){document.querySelectorAll('.nearby-pin').forEach(e=>e.hidden=true);document.querySelector('#candidate').hidden=true;}
 if(id==='11A')notice('当前区域暂无观星点');
 if(id==='11A-layer'){await openLayer();notice('当前范围暂无图层覆盖');}
 if(id==='11B'||id==='11B-map'){
  notice(id==='11B'?'观星点暂未取得，可点刷新重试':'地图暂不可用，可重新加载');
  const retry=document.createElement('button');retry.type='button';retry.className='scene-map-retry';retry.textContent=id==='11B'?'刷新观星点':'重新加载地图';retry.onclick=()=>navigateScene('11C');phone.append(retry);
  if(id==='11B-map'){document.querySelector('[data-purpose=daytime-map-background]').style.visibility='hidden';document.querySelectorAll('.nearby-pin').forEach(e=>e.hidden=true);}
 }
 if(id==='11C'||id==='11D'){
  const loading=status(id==='11C'?'正在加载观星点':'正在读取地点资料','','', 'loading');loading.classList.add('scene-map-loading');phone.append(loading);if(id==='11D')loading.append(Object.assign(document.createElement('button'),{textContent:'取消',onclick:()=>loading.remove()}));
 }
 if(id.startsWith('10F')){
  tools[0].onclick=()=>navigateScene('10F');
  if(id==='10F'){const loading=status('正在获取本次位置','取消',()=>loading.remove(),'loading');loading.classList.add('scene-map-loading');phone.append(loading);}
  if(id==='10F-failed')notice('本次位置暂不可用，可继续手动浏览地图');
  if(id==='10F-ready'){const button=document.createElement('button');button.type='button';button.className='scene-map-retry';button.textContent='移动到本次位置';button.onclick=()=>{map.recenter();notice('已移动到本次位置（设计示意）');button.remove();};phone.append(button);}
 }
 phone.dataset.sceneReady='true';
}
