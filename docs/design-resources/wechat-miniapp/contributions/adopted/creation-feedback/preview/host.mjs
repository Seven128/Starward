const bridge=parent.creationReview,r=bridge.record();
const labels={DRAFT:'草稿',PENDING:'审核中',PUBLISHED:'已上线',APPROVED:'已通过',REJECTED:'审核未通过'};
window.contributionPreviewHost={recordId:r.id,submitLabel:r.status==='REJECTED'?'再次提交':r.kind==='NEW'?'提交审核':'提交反馈',api:(p,b)=>bridge.api(p,b),close:()=>bridge.close(),completed:r=>bridge.completed(r),decorate(){
 document.body.classList.add('record-editor');const title=document.querySelector('.sheet-heading h2');title.textContent=r.kind==='FEEDBACK'?r.payload.fields.name+'反馈页':(['DRAFT','REJECTED'].includes(r.status)?'编辑观星点':r.payload.fields.name);
 const status=document.querySelector('#save-status');status.textContent=labels[r.status];status.className='review-tag '+r.status;document.querySelector('#close-sheet').textContent='‹';document.querySelector('#close-sheet').ariaLabel='返回记录';
 if(r.reason){const n=document.createElement('aside');n.className='review-reason';n.innerHTML='<strong>审核意见</strong>';const p=document.createElement('p');p.textContent=r.reason;n.append(p);document.querySelector('.form-scroll').prepend(n);}
 document.querySelector('.quiet').textContent='审核前不公开';
 }};
const css=document.createElement('link');css.rel='stylesheet';css.href='/contributions/adopted/creation-feedback/preview/host.css';document.head.append(css);
await import('/feedback/adopted/spot-feedback/preview/editor.mjs');

const focusTitle=document.querySelector('.sheet-heading h2');focusTitle.tabIndex=-1;focusTitle.focus({preventScroll:true});
