import {sceneId,status,loader,notice,navigateScene} from './scene-ui.mjs';
export function mountSettingsScenes({openSheet,closeSheet,render}){
 const id=sceneId,$=s=>document.querySelector(s);
 if(id==='10E'||id==='10E-denied'){
  openSheet('附近地点',`<p>${id==='10E-denied'?'定位权限未开启，可继续手动浏览地图。':'仅获取一次当前位置，用于查找附近观星点。'}</p><p class="scene-microcopy">不会持续定位，也不会公开你的实时位置。</p>`,[{text:'手动浏览',run:closeSheet},{text:id==='10E-denied'?'查看权限设置':'获取本次位置',primary:true,run:()=>id==='10E-denied'?notice('在微信设置中开启位置权限后可再次尝试'):navigateScene('10F')}]);
 }
 if(id.startsWith('14S')&&id!=='14S'){
  const waiting=id==='14S-loading',stale=id==='14S-stale';$('#settings-page').prepend(status(waiting?'正在同步偏好':stale?'更新失败，保留上次设置':'账户偏好暂未取得',waiting?'':'重试',()=>navigateScene('14S-loading'),waiting?'loading':'error'));
  if(!stale){$('#privacy-group').querySelectorAll('.row-value').forEach(e=>e.textContent='待确认');$('#privacy-group').querySelectorAll('button').forEach(e=>e.disabled=true);$('#reminder-group').querySelectorAll('input').forEach(e=>e.disabled=true);}
 }
 if(/^14H/.test(id)){
  const ready=id==='14H-ready',failed=id==='14H-failed',cancelled=id==='14H-cancelled';
  openSheet(ready?'账户文件已准备':'导出账户数据',`<div>${id==='14H'?loader()+' 正在整理服务端账户数据':ready?'文件已准备，尚未完成交接':failed?'文件交接失败，文件仍可再次分享':cancelled?'文件交接已取消':'导出数据'}</div><p>包含当前账户的计划、投稿和设置。由微信文件分享交付 JSON 文件。</p><p class="scene-microcopy">服务端完成与文件交接是两个独立结果。</p>`,id==='14H'?[{text:'返回设置',run:closeSheet}]:[{text:'返回设置',run:closeSheet},{text:'交给微信文件分享',primary:true,run:()=>navigateScene('14H-cancelled')}]);
 }
 if(id==='14I')$('#cache').click();
 if(id==='14I-delete')$('#delete').click();
 if(id==='14I-final')openSheet('确认删除账户？','<p>账户资料、偏好、个人计划与相关个人数据将被删除。为保留公共观星点的审核依据，必要的发布与审核记录会去标识化保留。</p><p>此操作不可撤销。再次进入时，将按新账户开始。</p>',[{text:'保留账户',run:closeSheet},{text:'确认删除',danger:true,run:()=>navigateScene('14J')}]);
 if(id==='14J'){
  $('#settings-page').querySelectorAll('button,input').forEach(e=>e.disabled=true);
  openSheet('本机清理未完成','<p>服务端删除成功；本机身份和草稿清理尚未确认。</p><p>完成清理前暂停账户操作，避免继续使用旧身份。</p>',[{text:'重试本机清理',primary:true,run:()=>{notice('正在确认本机清理结果');}}]);
 }
 document.body.dataset.sceneReady='true';
}
