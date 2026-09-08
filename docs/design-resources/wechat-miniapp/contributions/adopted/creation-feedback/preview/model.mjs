// Design-only session model. Production remains the authenticated contribution owner.
export const names={DRAFT:'草稿',PENDING:'审核中',PUBLISHED:'已上线',APPROVED:'已通过',REJECTED:'审核未通过'};
export function mutate(record, action, body, now=new Date().toISOString()){
 if(body.revision!==record.rev)throw Error('记录已更新，请重新打开后核对');
 if(!['DRAFT','REJECTED'].includes(record.status))throw Error('此记录当前不可编辑');
 if(action==='draft'&&record.kind!=='NEW')throw Error('反馈不支持存草稿');
 const next=structuredClone(record);next.rev++;next.updatedAt=now;next.payload=structuredClone(body.data);
 if(action!=='draft'){
  if(!body.data.fields.name?.trim()||!body.data.point)throw Error('请填写地点名称并选择地址');
  if(record.kind==='FEEDBACK'&&body.baseRevision!==record.baseRevision)throw Error('正式资料已更新，请核对后再次提交');
  const attempt={id:record.id+'-attempt-'+(record.attempts.length+1),payload:structuredClone(body.data),baseline:structuredClone(record.baseline),submittedAt:now,status:'PENDING'};
  next.attempts.push(attempt);next.status='PENDING';next.reason='';
 }
 return next;
}
export function seed(base){
 const make=(id,kind,status,name,address,date,reason='')=>{const payload=structuredClone(base);payload.fields.name=name;payload.fields.address=address;payload.point.address=address;return {id,kind,status,spot:kind==='FEEDBACK'?'bay':null,rev:1,baseRevision:1,payload,baseline:structuredClone(base),updatedAt:date,reason,attempts:status==='DRAFT'?[]:[{id:id+'-attempt-1',status,payload:structuredClone(payload),reason}]};};
 const records=[
 make('n-rejected','NEW','REJECTED','草甸观星点','高山草甸南侧 · 林场防火道尽头','2026-09-08T16:40:00+08:00','入口位置与现场照片不一致，请核对位置并补充入口照片。'),
 make('n-draft','NEW','DRAFT','星湾观星点','滨海 · 东岸路观景步道入口','2026-09-08T14:20:00+08:00'),
 make('n-pending','NEW','PENDING','山顶观星点','山脊步道 · 北侧平台','2026-09-07T20:35:00+08:00'),
 make('n-live','NEW','PUBLISHED','海岸观星点','滨海 · 海岸步道观景平台','2026-09-06T11:20:00+08:00'),
 make('f-rejected','FEEDBACK','REJECTED','星湾观星点',base.point.address,'2026-09-08T15:10:00+08:00','请补充开放时间依据，例如入口公告照片或管理方说明。'),
 make('f-pending','FEEDBACK','PENDING','山顶观星点','山脊步道北入口','2026-09-07T18:42:00+08:00'),
 make('f-approved','FEEDBACK','APPROVED','海岸观星点','海岸步道观景平台','2026-09-05T12:00:00+08:00')];
 for(const r of records){if(r.kind==='FEEDBACK'){r.baseline.fields.name=r.payload.fields.name;r.baseline.fields.address=r.payload.fields.address;r.baseline.point.address=r.payload.point.address;r.payload.fields.hours='19:00—次日05:00';r.payload.fields.parkingNote='入口120米，约12个车位';r.attempts[0].payload=structuredClone(r.payload);r.attempts[0].baseline=structuredClone(r.baseline);}}
 const covers={ 'n-draft':['滨海 · 东岸','coastal-observatory.png'],'n-pending':['山麓 · 北岭','mountain-terrace.png'],'n-live':['滨海 · 海岸','coastal-platform.png'],'f-rejected':['滨海 · 东岸','coastal-observatory.png'],'f-pending':['山麓 · 北岭','mountain-terrace.png'],'f-approved':['滨海 · 海岸','coastal-platform.png'],'n-rejected':['山麓 · 草甸',null]};
 for(const r of records){const [region,cover]=covers[r.id];r.presentation={region};r.payload.photos=r.payload.photos.filter(p=>p.kind!=='site');if(cover)r.payload.photos.push({id:'site-'+r.id,kind:'site',name:'场地照片',url:'/search/adopted/search-page/preview/assets/'+cover});r.baseline.photos=structuredClone(r.payload.photos);if(r.attempts.length){r.attempts[0].payload=structuredClone(r.payload);r.attempts[0].baseline=structuredClone(r.baseline);}}
 return records;
}
