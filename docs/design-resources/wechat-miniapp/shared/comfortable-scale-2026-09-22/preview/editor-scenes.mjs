import {ensureSceneStyles,status,notice,navigateScene,dialog,loader,esc} from './scene-ui.mjs';

// State composition for the existing four-chapter design form. All records are
// copied from its local baseline/session examples; no product API is called.
export async function mountEditorScenes(owner){
  const {phone,form,sheet,openEditor,payload,setBusy,renderDiff,error,baseline,records,labels,changes,showInfo,reviewRecord}=owner;
  const scene=new URLSearchParams(location.search).get('design_scene')||'';
  const feedback=scene.startsWith('14E')||scene==='14D-feedback';
  const kind=feedback?'FEEDBACK':'NEW',key='starward-design-editor-scenes-20261015.'+kind;
  const copy=value=>structuredClone(value),field=name=>form.elements.namedItem(name);
  const $=selector=>sheet.querySelector(selector),scroll=sheet.querySelector('.form-scroll');
  let state={working:null,pending:null,publicPermission:false,positionConfirmed:false,advance:''};
  if(!new URLSearchParams(location.search).has('capture'))try{const saved=JSON.parse(sessionStorage.getItem(key)||'null');if(saved?.working?.fields&&Array.isArray(saved.working.photos))state={...state,...saved};}catch{}
  let timer=null,epoch=0,locked=false,readonly=false,slot,failedPhotoId=null,uploadPanel=null;
  const feedbackSample=copy(records.find(record=>record.kind==='FEEDBACK')?.payload||baseline);
  const original=copy(baseline);
  const storedWorking=!!state.working;
  state.working??=copy(baseline);
  if(scene==='14E'){state.working=copy(baseline);state.pending=null;state.advance='';}
  if(!storedWorking&&scene==='14B')state.working.fields.name='';
  if(!storedWorking&&['14E-conflict','14E-unknown','14D-feedback'].includes(scene))state.working=copy(feedbackSample);
  if(scene==='14E-conflict'&&!changes(original,state.working).length)state.working=copy(feedbackSample);
  if((scene==='14C-unknown'||scene==='14E-unknown')&&!state.pending)state.pending=copy(state.working);
  ensureSceneStyles();

  function persist(){
    if(!readonly&&!locked)state.working=copy(payload());
    try{sessionStorage.setItem(key,JSON.stringify(state));return true;}catch{return false;}
  }
  function move(id){
    if(id===state.advance)state.advance='';persist();epoch++;clearTimeout(timer);timer=null;navigateScene(id);
  }
  function later(action){
    clearTimeout(timer);const ticket=epoch;
    timer=setTimeout(()=>{timer=null;if(ticket===epoch)action();},900);
  }
  function action(label,run){
    const button=document.createElement('button');button.type='button';button.className='scene-inline-button';button.textContent=label;button.onclick=run;return button;
  }
  function addTextField(name,label,placeholder){
    const row=document.createElement('label');row.className='field-row';
    const caption=document.createElement('span');caption.textContent=label;
    const input=document.createElement('input');input.name=name;input.ariaLabel=label;input.placeholder=placeholder;
    row.append(caption,input);labels[name]=label;return row;
  }
  const contact=field('contact').closest('.field-row');
  const purpose=addTextField('contactPurpose','联系用途','如预约、门禁或夜间进入咨询');
  const source=addTextField('contactSource','号码出处','管理方提供或公开发布的位置');
  const permission=document.createElement('div');permission.className='field-row choice-row';
  permission.innerHTML='<span>公开许可</span><div class="choice-group" role="radiogroup" aria-label="管理方允许公开号码"><button type="button" role="radio" data-permission="false">未确认</button><button type="button" role="radio" data-permission="true">已获同意</button></div>';
  const contactNote=document.createElement('p');contactNote.className='scene-microcopy';contactNote.textContent='只填写获准公开的管理方号码，并说明用途与出处。';
  contact.after(purpose,source,permission,contactNote);
  const locationRow=document.createElement('div');locationRow.className='field-row';
  locationRow.innerHTML='<span>地图位置</span>';
  const locationButton=action('确认本次位置',()=>confirmLocation());locationRow.append(locationButton);
  const locationNote=document.createElement('p');locationNote.className='scene-microcopy';locationNote.textContent='仅确认本次选择用于地点审核，不持续记录位置。';
  sheet.querySelector('#chapter-place').append(locationRow,locationNote);
  function syncExtras(){
    const hasPhone=/\d{3}/u.test(field('contact').value);
    for(const el of [purpose,source,permission,contactNote])el.hidden=!hasPhone;
    permission.querySelectorAll('button').forEach(button=>{const selected=String(state.publicPermission)===button.dataset.permission;button.setAttribute('aria-checked',String(selected));button.tabIndex=selected?0:-1;button.disabled=locked||readonly;});
    locationButton.textContent=readonly?'当前只读':state.positionConfirmed?'已确认本次位置':'确认本次位置';locationButton.disabled=locked||readonly;
  }
  permission.querySelectorAll('button').forEach(button=>button.onclick=()=>{state.publicPermission=button.dataset.permission==='true';persist();syncExtras();});
  permission.querySelector('.choice-group').onkeydown=event=>{
    if(locked||readonly||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const buttons=[...permission.querySelectorAll('button')];
    const next=event.key==='Home'?0:event.key==='End'?1:Number(!state.publicPermission);buttons[next].click();buttons[next].focus();
  };
  function confirmLocation(then=()=>{}){
    const point=payload().point;
    if(!point){error('请先从地址结果中选择地图位置。');field('address').focus();return;}
    const modal=dialog('确认本次地图位置',`<p>${esc(point.address)}</p><p>本次选择用于地点审核，公开展示按地点资料规则处理。</p><footer><button type="button" data-cancel>返回核对</button><button type="button" data-confirm>确认用于审核</button></footer>`);
    modal.querySelector('[data-cancel]').onclick=()=>modal.close();
    modal.querySelector('[data-confirm]').onclick=()=>{state.positionConfirmed=true;field('consent').checked=true;persist();syncExtras();modal.close();then();};
  }
  function mount(nextMode,data,record=null,freeze=false){
    form.querySelectorAll('[data-editor-scene-status]').forEach(el=>el.remove());
    readonly=freeze;locked=false;openEditor(nextMode,copy(data),record,freeze);
    slot=document.createElement('div');slot.dataset.editorSceneStatus='';form.prepend(slot);syncExtras();
  }
  function message(text,label='',run=()=>{},tone='info'){
    const panel=status(text,label,run,tone);slot.append(panel);return panel;
  }
  function lock(saving=false){
    locked=true;setBusy(saving);
    for(const el of form.elements)el.disabled=true;
    form.querySelectorAll('.choice-group button').forEach(button=>button.disabled=true);
    $('#submit').disabled=true;$('#save-draft').disabled=true;
    form.setAttribute('aria-busy',String(saving));syncExtras();
  }
  function recordFor(data,recordStatus='PENDING'){
    const template=records.find(record=>record.kind===kind&&record.status==='PENDING');
    return {...copy(template||{}),id:template?.id||'design-'+kind.toLowerCase(),kind,status:recordStatus,payload:copy(data),...(feedback?{spot:'bay',baseline:copy(original)}:{})};
  }
  function showFrozen(recordStatus='PENDING'){
    const data=state.pending||(feedback&&!changes(original,state.working).length?feedbackSample:state.working);
    mount(feedback?'feedback':'new',data,recordFor(data,recordStatus),true);
    const rejected=recordStatus==='REJECTED';$('#save-status').textContent=rejected?'审核未通过':'审核中';
    message(rejected?'请补充夜间入口说明，原提交内容保留。':'本次提交内容已冻结，审核结果尚未确定。',rejected?'修改后再提交':'返回我的记录',()=>{
      if(!rejected){move('14A');return;}
      state.working=copy(data);state.pending=null;mount('new',state.working,recordFor(data,'REJECTED'),false);
      $('#save-status').textContent='审核未通过';message('请补充夜间入口说明，再提交审核。','',()=>{},'warning');persist();
    },rejected?'warning':'info');
    renderDiff();
  }
  if(scene==='14D-published'){
    await owner.closeEditor(true);
    await showInfo({...reviewRecord('formal'),status:'FORMAL'});
    phone.dataset.editorScene='published';return;
  }
  if(scene==='14D'||scene==='14D-feedback'||scene==='14D-rejected')showFrozen(scene==='14D-rejected'?'REJECTED':'PENDING');
  else{
    mount(feedback?'feedback':'new',state.pending&&['14C-unknown','14E-unknown'].includes(scene)?state.pending:state.working);
    if(scene==='14E-unavailable'){
      readonly=true;mount('feedback',state.working,recordFor(state.working),true);
      $('#save-status').textContent='当前不可编辑';message('该资料当前不可编辑，原有内容保持只读。','返回我的记录',()=>move('14A'));
    }else if(scene==='14C'){
      lock(true);$('#submit').innerHTML=loader()+'提交中';const panel=message('正在提交，当前输入保持不变。','',()=>{},'loading');panel.setAttribute('aria-busy','true');
      if(state.advance==='14C-unknown')later(()=>move('14C-unknown'));
    }else if(scene==='14C-unknown'||scene==='14E-unknown'){
      lock();$('#submit').textContent='结果待确认';
      message('提交结果尚未确认，原输入已保留。','确认提交结果',()=>{
        const panel=slot.querySelector('.scene-status');const button=panel.querySelector('button');button.disabled=true;button.innerHTML=loader()+'正在核对';
        later(()=>{state.pending=copy(state.pending||state.working);persist();move(feedback?'14D-feedback':'14D');});
      },'warning');
    }else if(scene==='14E-conflict'){
      const panel=message('正式资料已有新版本，本次修改仍保留。','',()=>{},'warning');
      const summary=document.createElement('dl');summary.className='scene-facts';
      summary.innerHTML=`<div><dt>当前正式资料</dt><dd>${esc(original.fields.hours)}</dd></div><div><dt>本次修改</dt><dd>${esc(state.working.fields.hours)}</dd></div>`;
      summary.style.flexBasis='100%';panel.append(summary);
      panel.append(action('使用当前资料',()=>{field('hours').value=original.fields.hours;field('hours').dispatchEvent(new Event('input',{bubbles:true}));notice('已使用当前开放时间，其它修改保留。');}),action('保留我的修改',()=>notice('本次修改已保留，核对差异后再提交。')));
      renderDiff();
    }else if(scene==='14E'){
      const panel=message('尚未修改资料。');
      const sync=()=>{const changed=changes(original,payload()).length>0;panel.querySelector('span').textContent=changed?'有待提交的修改，请核对下方差异。':'尚未修改资料。';$('#submit').disabled=!changed;};
      form.addEventListener('input',sync);form.addEventListener('change',sync);sync();
    }else if(scene==='14B-upload'){
      const group=sheet.querySelector('#photo-list-site').closest('.media-group');
      failedPhotoId=payload().photos.find(photo=>photo.kind==='site')?.id||null;
      uploadPanel=status('这张现场照片未上传，其它资料保留。','重试这张照片',()=>{persist();move('14B');},'error');group.append(uploadPanel);
    }else if(scene==='14B'&&!field('name').value.trim())error('请填写地点名称。');
  }
  function submit(){
    if(locked||readonly)return;
    const data=payload();
    if(failedPhotoId&&data.photos.some(photo=>photo.id===failedPhotoId)){error('请先重试或移除未上传的现场照片。');return;}
    if(feedback&&!changes(original,data).length){error('尚未修改任何信息');return;}
    if(!data.fields.name.trim()){error('请填写地点名称。');field('name').focus();return;}
    if(!data.point){error('请从地址结果中选择地图位置。');field('address').focus();return;}
    if((data.fields.openness==='有条件开放'||data.fields.access==='需预约或其他条件')&&!data.fields.accessNote.trim()){error('请填写进入条件。');field('accessNote').focus();return;}
    if(/\d{3}/u.test(data.fields.contact)&&(!data.fields.contactPurpose.trim()||!data.fields.contactSource.trim()||!state.publicPermission)){error('请补充号码用途与出处，并确认管理方允许公开。');field('contact').focus();return;}
    if(data.photos.some(photo=>photo.url.startsWith('data:'))&&!field('rights').checked){error('请确认照片使用权');return;}
    if(!feedback&&!state.positionConfirmed&&!field('consent').checked){confirmLocation(submit);return;}
    state.working=copy(data);state.pending=copy(data);persist();
    if(feedback)move('14E-unknown');else{state.advance='14C-unknown';move('14C');}
  }
  form.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();submit();},true);
  form.addEventListener('input',event=>{if(locked||readonly)return;if(event.target.name==='address'){state.positionConfirmed=false;field('consent').checked=false;}persist();syncExtras();});
  form.addEventListener('change',()=>{if(!locked&&!readonly){persist();syncExtras();}});
  form.addEventListener('click',()=>{if(failedPhotoId&&!payload().photos.some(photo=>photo.id===failedPhotoId)){failedPhotoId=null;uploadPanel?.remove();persist();}});
  // Manual draft save and dirty-leave confirmation remain with the host owner.
  addEventListener('pagehide',()=>{persist();epoch++;clearTimeout(timer);});
  renderDiff();syncExtras();scroll.scrollTop=0;
  // The board opens the original photo chapter so the failed attachment is visible.
  if(scene==='14B-upload'&&new URLSearchParams(location.search).has('capture'))sheet.querySelector('[data-chapter="notes"]').click();
}
