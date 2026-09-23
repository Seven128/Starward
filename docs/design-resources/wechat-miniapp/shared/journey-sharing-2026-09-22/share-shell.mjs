// Retain the opener document (including scroll, plan draft and drawer extent).
const root='/docs/design-resources/wechat-miniapp/shared/journey-sharing-2026-09-22/';
export function openSharing(query,opener=document.activeElement){
 let destination=null;const boundary=crypto.randomUUID();history.pushState({...history.state,sharingBoundary:boundary},'');
 const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','分享页面');
 dialog.style.cssText='position:fixed;inset:0;margin:0;padding:0;border:0;width:100%;max-width:none;height:100dvh;max-height:none;background:#f6f5f1';
 const frame=document.createElement('iframe');frame.title='行程与观星点分享';frame.style.cssText='width:100%;height:100%;border:0;display:block';
 frame.src=root+'index.html?'+query+'&embedded=1';dialog.append(frame);document.body.append(dialog);
 const finish=()=>{dialog.close();dialog.remove();removeEventListener('message',receive);removeEventListener('popstate',pop,true);opener?.focus?.({preventScroll:true});if(destination)location.href=destination;};
 const close=()=>{if(history.state?.sharingBoundary===boundary)history.back();else finish();};
 const pop=e=>{if(e.state?.sharingBoundary!==boundary){e.stopImmediatePropagation();finish();}};
 const receive=e=>{if(e.origin!==location.origin||e.source!==frame.contentWindow)return;if(e.data?.type==='sharing-close')close();if(e.data?.type==='sharing-map'){destination='/docs/design-resources/wechat-miniapp/shared/comfortable-scale-2026-09-22/preview/map.html?map=1';close();}};
 addEventListener('message',receive);addEventListener('popstate',pop,true);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();frame.focus();
}
addEventListener('message',e=>{
 if(e.origin!==location.origin||e.data?.type!=='sharing-open')return;
 if(![...document.querySelectorAll('iframe')].some(f=>f.contentWindow===e.source))return;
 if(typeof e.data.spotId==='string')openSharing('page=spot&spot='+encodeURIComponent(e.data.spotId));
});
