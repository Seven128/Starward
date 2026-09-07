/* Independently authored paired candidates. Standard Figma Plugin API only. */
async function buildDesign({root,page,direction,width=390,height=844,mode='day',state,fonts,icons,mapImageHash,fixture}) {
  if (![0,1,2].includes(direction)) throw Error('Unknown direction');
  if (mode !== 'day') throw Error('This round covers day only');
  const w=width, h=height, D=direction;
  const C={ink:'#282b29',secondary:'#5e655f',muted:'#6d746d',line:'#e2e5dd',strong:'#8a9088',white:'#ffffff',subtle:'#f6f7f5',sky:'#4859b8',skySoft:'#f5f6ff',green:'#1f6b45',greenSoft:'#e9f8ee',gold:'#6f5500',goldSoft:'#fff7d6'};
  const own={map:'apps/wechat-miniapp/src/pages/map/index.tsx',panel:'apps/wechat-miniapp/src/pages/map/spot-panel.tsx',time:'apps/wechat-miniapp/src/pages/map/time-ruler.tsx',my:'apps/wechat-miniapp/src/features/my/my-library-page.tsx',nav:'apps/wechat-miniapp/src/components/custom-nav.tsx'};
  const rgb=hex=>({r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255});
  const fill=hex=>[{type:'SOLID',color:rgb(hex)}];
  root.resize(w,h); root.clipsContent=true; root.fills=fill(C.white);
  root.setPluginData('design-direction',['continuous-place','task-comparison','field-handbook'][D]);
  root.setPluginData('coverage','day; map medium / my normal; static design, no runtime gesture claim');
  function frame(p,name,x,y,ww,hh,color=null,r=0){const n=figma.createFrame();p.appendChild(n);n.name=name;n.resize(ww,hh);n.x=x;n.y=y;n.fills=color?fill(color):[];n.cornerRadius=r;n.clipsContent=false;return n;}
  function rect(p,name,x,y,ww,hh,color,r=0){const n=figma.createRectangle();p.appendChild(n);n.name=name;n.resize(ww,hh);n.x=x;n.y=y;n.fills=fill(color);n.cornerRadius=r;return n;}
  function text(p,name,value,ww,size=14,line=21,weight='regular',color=C.ink){const t=figma.createText();p.appendChild(t);t.name=name;t.fontName=fonts[weight];t.fontSize=size;t.lineHeight={unit:'PIXELS',value:line};t.letterSpacing={unit:'PIXELS',value:0};t.characters=String(value);t.fills=fill(color);t.resize(ww,Math.max(line,1));t.textAutoResize='HEIGHT';return t;}
  function atText(p,name,value,x,y,ww,size=14,line=21,weight='regular',color=C.ink){const t=text(p,name,value,ww,size,line,weight,color);t.x=x;t.y=y;return t;}
  function stack(p,name,ww,gap=0,pad=0){const f=frame(p,name,0,0,ww,1);f.layoutMode='VERTICAL';f.primaryAxisSizingMode='AUTO';f.counterAxisSizingMode='FIXED';f.itemSpacing=gap;f.paddingTop=f.paddingBottom=f.paddingLeft=f.paddingRight=pad;return f;}
  function row(p,name,ww,hh,gap=0,pad=0){const f=frame(p,name,0,0,ww,hh);f.layoutMode='HORIZONTAL';f.primaryAxisSizingMode='FIXED';f.counterAxisSizingMode='FIXED';f.counterAxisAlignItems='CENTER';f.itemSpacing=gap;f.paddingLeft=f.paddingRight=pad;return f;}
  function rule(p,ww){return rect(p,'Quiet divider',0,0,ww,1,C.line);}
  function control(n,key,owner=own.panel){StarwardFigma.control(n,key,owner);n.setPluginData('interaction','press-in feedback; valid release commits; cancel preserves prior state');return n;}
  const iconComponents={}; let componentIndex=0;
  function ico(p,key,size=18,color=C.ink){
    const id=key+size+color;
    if(!iconComponents[id]){
      const svg=(key==='telescope'?icons[key]:icons[key+'-day'])||icons[key]; if(!svg)throw Error('Missing supplied icon '+key);
      const c=figma.createComponent();root.appendChild(c);c.name='Icon / '+key+' / '+color;c.resize(size,size);c.x=w+64;c.y=componentIndex++*42;c.fills=[];
      const v=StarwardFigma.icon(c,svg.replace(/currentColor/g,color),{size,name:'Existing SVG / '+key});v.x=0;v.y=0;
      // The selected vocabulary here is linear. Normalize paint after native import,
      // because the runtime may already have substituted currentColor in the SVG.
      function recolor(n){for(const prop of ['fills','strokes'])if(Array.isArray(n[prop]))n[prop]=n[prop].map(paint=>paint.type==='SOLID'?{...paint,color:rgb(color)}:paint);if('children' in n)n.children.forEach(recolor);}recolor(v);
      iconComponents[id]=c;
    }
    const i=iconComponents[id].createInstance();p.appendChild(i);i.name='Icon / '+key;return i;
  }
  function iconButton(p,key,label,icon,x,y,owner=own.map){const f=control(frame(p,label+' / hit 44',x,y,44,44),key,owner);const b=frame(f,'Visible surface',6,6,32,32,C.white,8);b.strokes=fill(C.line);b.strokeWeight=1;const i=ico(b,icon,18);i.x=7;i.y=7;return f;}
  function inlineButton(p,key,label,icon,ww=84,color=C.ink,owner=own.panel){const f=control(row(p,label+' / hit',ww,44,6,8),key,owner);if(icon)ico(f,icon,17,color);text(f,'Action label',label,ww-(icon?39:16),14,20,'medium',color);return f;}
  function sys(){
    frame(root,'System safe area',0,0,w,44,C.white);
    atText(root,'System time','9:41',22,14,70,13,18,'medium');
    const signal=frame(root,'System status',w-78,17,54,14);[4,7,10,13].forEach((v,j)=>rect(signal,'Signal',j*4,13-v,2.5,v,C.ink,1));
    rect(signal,'Battery outline',27,2,23,11,C.ink,3);rect(signal,'Battery fill',29,4,17,7,C.white,1);rect(signal,'Battery terminal',51,5,2,5,C.ink,1);
    frame(root,'WeChat title safe area',0,44,w,44,C.white);
    atText(root,'Application title','今晚去观星',16,54,180,16,23,'medium');
    const cap=frame(root,'WeChat capsule',w-96,51,80,29,C.white,15);cap.strokes=fill(C.line);cap.strokeWeight=1;
    const dots=ico(cap,'ellipsis',18);dots.x=12;dots.y=5;rect(cap,'Capsule divider',40,7,1,15,C.line);
    const circle=figma.createEllipse();cap.appendChild(circle);circle.resize(14,14);circle.x=54;circle.y=7;circle.fills=[];circle.strokes=fill(C.ink);circle.strokeWeight=1.5;
  }
  function navigation(){
    const y=h-90;const n=frame(root,'Map / My primary navigation',0,y,w,90,C.white);rect(n,'Top divider',0,0,w,1,C.line);
    ['map','my'].forEach((p,j)=>{const f=control(frame(n,p==='map'?'地图 / selected state':'我的 / selected state',j*w/2,1,w/2,55), 'nav-'+p,own.nav);const chosen=p===page;const sw=D===1?78:70;
      if(chosen)frame(f,'Selected visible capsule',w/4-sw/2,7,sw,38,C.skySoft,D===2?7:19);
      const i=ico(f,p==='map'?'map':'user-round',18,chosen?C.sky:C.secondary);i.x=w/4-26;i.y=17;
      atText(f,'Navigation label',p==='map'?'地图':'我的',w/4-2,15,38,13,20,chosen?'medium':'regular',chosen?C.sky:C.secondary);
      if(chosen)rect(f,'Selected underline',w/4-10,46,20,2,C.sky,1);
    });
    rect(n,'Home indicator',w/2-54,77,108,4,C.ink,2);
  }
  sys();
  if(page==='map'){
    const map=frame(root,'OSM reference / fixed crop',0,88,390,480);map.clipsContent=true;map.fills=[{type:'IMAGE',imageHash:mapImageHash,scaleMode:'FILL'}];
    map.setPluginData('asset-license','OpenStreetMap contributors / ODbL; https://www.openstreetmap.org/copyright; external reference, not WEAPP native-map evidence');
    const marker=control(frame(root,'Selected formal spot marker',173,88+187,44,44),'marker',own.map);
    const dot=figma.createEllipse();marker.appendChild(dot);dot.resize(22,22);dot.x=11;dot.y=8;dot.fills=fill(C.skySoft);dot.strokes=fill(C.sky);dot.strokeWeight=2;
    const mi=ico(marker,'map-pin',16,C.sky);mi.x=14;mi.y=11;rect(marker,'Anchor',20,31,4,4,C.sky,1);
    marker.setPluginData('reference-anchor','195,209 relative to fixed 390x480 OSM image');
    const search=control(frame(root,'Floating search / stationary route anchor',12,100,w-24,44,C.white,D===2?8:12),'search',own.map);search.strokes=fill(C.line);search.strokeWeight=1;
    const si=ico(search,'search',18,C.secondary);si.x=13;si.y=13;atText(search,'Search placeholder','搜索观星点',42,11,w-76,15,22,'regular',C.secondary);
    iconButton(root,'locate','定位','locate-fixed',w-54,238);iconButton(root,'layers','图层','layers-3',w-54,286);
    const panelY=state==='large'?88:state==='small'?h-250:366;
    const attribution=frame(root,'OSM attribution',8,panelY-24,199,19,C.white,3);atText(attribution,'Map attribution','© OpenStreetMap 贡献者',5,0,189,12,18,'regular',C.secondary);
    const panel=frame(root,'One retained spot document / '+(state||'medium'),0,panelY,w,h-90-panelY,C.white,18);panel.clipsContent=true;
    const handle=control(frame(panel,'Handle only / tap no-op',(w-76)/2,0,76,44),'handle',own.panel);rect(handle,'Visible handle',23,13,30,3,C.strong,2);handle.setPluginData('interaction','Vertical threshold then live extent preview; release velocity + bounded snaps; interruption starts at live position; subthreshold tap no-op');
    const bodyViewport=frame(panel,'Retained document viewport',0,44,w,panel.height-114);bodyViewport.clipsContent=true;bodyViewport.overflowDirection=state==='large'?'VERTICAL':'NONE';
    const doc=stack(bodyViewport,'Identity → access → evidence → astronomy',w,0,16);doc.paddingTop=0;doc.paddingBottom=24;
    const cw=w-32;
    const identity=stack(doc,'Place identity',cw,D===1?2:3);
    if(D===2){const label=row(identity,'Region and object identity',cw,18,6);ico(label,'map-pin',13,C.secondary);text(label,'Region',fixture.spot.region,cw-19,12,18,'regular',C.secondary);}
    text(identity,'Formal spot title',fixture.spot.name,cw,D===1?19:20,D===1?27:28,'medium');
    if(D!==2)text(identity,'Region',fixture.spot.region,cw,12,18,'regular',C.secondary);
    const sections=row(doc,'Sticky document section navigation',cw,44,8);
    ['概览','天文'].forEach((label,j)=>{const f=control(frame(sections,label+' section anchor',0,0,52,44),j?'astronomy':'overview');atText(f,'Section label',label,0,10,52,14,20,j?'regular':'medium',j?C.secondary:C.ink);if(!j)rect(f,'Selected section underline',0,37,25,2,C.sky,1);f.setPluginData('interaction','Resolve large then scroll same retained document to heading; no hidden tab tree');});
    rule(doc,cw);
    const basics=stack(doc,'Basic information',cw,8);basics.paddingTop=10;basics.paddingBottom=10;
    const route=row(basics,'Route evidence and handoff',cw,44,8);
    const routeCopy=stack(route,'Route facts',cw-92,1);text(routeCopy,'Route label','路线与到达',cw-92,14,20,'medium');text(routeCopy,'Route unavailable','距离、预计到达暂无数据',cw-92,12,18,'regular',C.secondary);inlineButton(route,'navigation','导航','navigation',84,C.green);
    if(D===0){
      const access=row(basics,'Opening hours',cw,22,8);ico(access,'clock-3',16,C.secondary);text(access,'Access uncertainty','开放时间待核实',cw-24,14,21);
      const facilities=row(basics,'Related facility statuses',cw,25,14);['停车','厕所'].forEach((label,j)=>{const f=row(facilities,label,(cw-14)/2,25,6);ico(f,j?'toilet':'car-front',16,C.secondary);text(f,'Facility status',label+'待核实',(cw-14)/2-22,14,21,'regular',C.secondary);});
    }else if(D===1){
      const access=stack(basics,'Access and facilities / shared axis',cw,5);const a=row(access,'Access row',cw,21,0);text(a,'Key','开放时间',83,13,20,'regular',C.secondary);text(a,'Value','待核实',cw-83,14,21);const b=row(access,'Facility row',cw,21,0);text(b,'Key','场地设施',83,13,20,'regular',C.secondary);text(b,'Value','停车、厕所待核实',cw-83,14,21);
    }else{
      const facts=stack(basics,'Site checks',cw,5);text(facts,'Access uncertainty','开放时间待核实',cw,14,21,'medium');text(facts,'Facility uncertainty','停车、厕所待核实',cw,14,21,'regular',C.secondary);
    }
    rule(doc,cw);
    const evidence=row(doc,'Field and source entry group',cw,44,0);
    inlineButton(evidence,'field','场地资料',null,cw/3);inlineButton(evidence,'source','数据来源',null,cw/3);inlineButton(evidence,'spot-contribution','反馈纠错',null,cw/3);
    rule(doc,cw);
    const astro=stack(doc,'Astronomy section / remains below medium crop',cw,10);astro.paddingTop=24;
    text(astro,'Astronomy heading','天文信息',cw,16,23,'medium');
    const time=control(stack(astro,'Single real selected time',cw,3),'time',own.time);time.paddingTop=4;time.paddingBottom=4;time.minHeight=60;
    const tt=text(time,'Selected time',fixture.time,cw,18,25,'medium',C.sky);tt.textAlignHorizontal='CENTER';
    const tickRow=row(time,'Single-slice axis',cw,12);tickRow.primaryAxisAlignItems='CENTER';rect(tickRow,'Only supplied real slice',0,0,2,12,C.sky,1);
    const dt=text(time,'Selected date',fixture.date,cw,12,18,'regular',C.secondary);dt.textAlignHorizontal='CENTER';
    time.setPluginData('interaction','Only 21:00 exists in fixture; no invented adjacent ticks. Runtime uses real discrete slices, horizontal preview, release commit, cancel prior value.');
    const metrics=row(astro,'Related objective measurements',cw,49,0);[['总云量',fixture.spot.cloud+'%'],['气温',fixture.spot.temperature+'°C'],['风速',fixture.spot.wind+' m/s']].forEach(([k,v])=>{const cell=stack(metrics,k,cw/3,2);text(cell,'Metric label',k,cw/3,12,18,'regular',C.secondary);text(cell,'Metric value',v,cw/3,16,23,'medium');});
    text(astro,'Moon fact','月光影响'+fixture.spot.moonImpact,cw,14,21);
    text(astro,'Other unavailable facts','透明度、视宁度、光污染暂无数据',cw,14,21,'regular',C.secondary);
    text(astro,'Source freshness','更新时间 '+fixture.updatedAt,cw,12,18,'regular',C.secondary);
    const actions=frame(panel,'Fixed three action lane',16,panel.height-52,cw,48,C.white,22);actions.strokes=fill(C.line);actions.strokeWeight=1;
    [['favorite','想去','star',C.sky],['share','分享','send',C.ink],['sky','云观星','telescope',C.ink]].forEach(([k,l,i,c],j)=>{const a=inlineButton(actions,k,l,i,cw/3,c);a.x=j*cw/3;a.y=2;});
  }else if(page==='my'){
    const content=stack(root,'My content / one native vertical flow',w-32,0);content.x=16;content.y=106;
    const cw=w-32;
    const header=row(content,'Compact account header',cw,64,10);
    const avatar=frame(header,'Neutral current-account avatar',0,0,34,34,C.subtle,17);const av=ico(avatar,'user-round',20,C.secondary);av.x=7;av.y=7;
    const account=stack(header,'Account identity',cw-98,3);text(account,'Account heading',fixture.account.title,cw-98,D===1?19:20,28,'medium');text(account,'Current identity',fixture.account.identity,cw-98,13,20,'regular',C.secondary);
    const gear=control(frame(header,'Single settings gear / hit',0,0,44,44),'settings',own.my);const gi=ico(gear,'settings',19,C.secondary);gi.x=12;gi.y=12;
    const gap=frame(content,'Account to content spacing',0,0,cw,D===0?16:12);
    function utility(p,key,title,icon,details,ww,style='plain'){
      const f=control(stack(p,title+' / utility',ww,6,style==='plain'?0:12),key,own.my);f.paddingTop=f.paddingBottom=style==='plain'?12:14;f.minHeight=44;
      const inner=ww-f.paddingLeft-f.paddingRight;const head=row(f,'Utility header',inner,24,8);const i=ico(head,icon,17,key==='plan'?C.green:C.sky);text(head,'Utility title',title,inner-47,15,22,'medium');ico(head,'chevron-right',14,C.secondary);
      details.forEach(([value,role])=>text(f,role,value,inner,role==='Plan place'?15:13,role==='Plan place'?22:20,role==='Plan place'?'regular':'regular',role==='Plan place'?C.ink:C.secondary));return f;
    }
    function routine(p,key,title,subtitle,icon,color,soft,ww=cw){
      const f=control(row(p,title+' / entry',ww,68,10,0),key,own.my);
      const tile=frame(f,'Role-colored visible icon tile',0,0,28,28,soft,7);const i=ico(tile,icon,16,color);i.x=6;i.y=6;
      const labels=stack(f,'Entry title and state',ww-62,3);text(labels,'Entry title',title,ww-62,14,21,'medium');text(labels,'Entry state',subtitle,ww-62,13,20,'regular',C.secondary);ico(f,'chevron-right',14,C.secondary);return f;
    }
    if(D===0){
      const group=stack(content,'Plan and contribution / shared utility surface',cw,0,12);group.fills=fill(C.subtle);group.cornerRadius=10;
      utility(group,'plan','今晚计划','route',[[fixture.plan.spotName,'Plan place'],[fixture.plan.date+' · '+fixture.plan.detail,'Plan date and detail']],cw-24);
      rule(group,cw-24);utility(group,'contribution','现场反馈与纠错','message-square-warning',[[fixture.account.drafts+' 条草稿 · '+fixture.account.pending+' 条待审核','Contribution status']],cw-24);
      frame(content,'Utility to routine spacing',0,0,cw,16);
      routine(content,'profile-links','主页链接',fixture.account.profileLinks+' 条已保存','link',C.sky,C.skySoft);rule(content,cw);
      routine(content,'import','内容导入','导入自己的帖子并提交审核','file-up',C.gold,C.goldSoft);
    }else if(D===1){
      const group=stack(content,'Plan and contribution / continuous utility ledger',cw,0);rule(group,cw);
      const plan=control(row(group,'Tonight plan entry',cw,102,14),'plan',own.my);
      const date=stack(plan,'Plan date column',64,3);text(date,'Plan date day','09.07',64,18,25,'medium',C.sky);text(date,'Plan date year','2026',64,12,18,'regular',C.secondary);
      const copy=stack(plan,'Plan content',cw-106,3);text(copy,'Utility heading','今晚计划',cw-106,15,22,'medium');text(copy,'Plan place',fixture.plan.spotName,cw-106,14,21);text(copy,'Plan detail',fixture.plan.detail,cw-106,13,20,'regular',C.secondary);ico(plan,'chevron-right',14,C.secondary);
      rule(group,cw);
      routine(group,'contribution','现场反馈与纠错',fixture.account.drafts+' 条草稿 · '+fixture.account.pending+' 条待审核','message-square-warning',C.sky,C.skySoft);rule(group,cw);
      frame(content,'Utility to routine spacing',0,0,cw,14);
      routine(content,'profile-links','主页链接',fixture.account.profileLinks+' 条已保存','link',C.sky,C.skySoft);rule(content,cw);
      routine(content,'import','内容导入','导入自己的帖子并提交审核','file-up',C.gold,C.goldSoft);
    }else{
      const group=row(content,'Plan and contribution / paired field tasks',cw,144,0);group.counterAxisAlignItems='MIN';group.fills=fill(C.subtle);group.cornerRadius=8;
      const colW=(cw-1)/2;
      const pl=control(stack(group,'Tonight plan / field task',colW,5,12),'plan',own.my);pl.minHeight=144;
      const ph=row(pl,'Plan icon and title',colW-24,24,7);ico(ph,'route',17,C.green);text(ph,'Utility title','今晚计划',colW-48,15,22,'medium');
      text(pl,'Plan place',fixture.plan.spotName,colW-24,14,21);text(pl,'Plan date',fixture.plan.date,colW-24,12,18,'regular',C.secondary);text(pl,'Plan detail',fixture.plan.detail,colW-24,13,20,'regular',C.secondary);
      rect(group,'Shared task divider',0,0,1,144,C.line);
      const contrib=control(stack(group,'Contribution / field task',colW,5,12),'contribution',own.my);contrib.minHeight=144;
      const ch=row(contrib,'Contribution icon',colW-24,24,0);ico(ch,'message-square-warning',17,C.sky);
      text(contrib,'Contribution heading','现场反馈与纠错',colW-24,15,22,'medium');text(contrib,'Draft state',fixture.account.drafts+' 条草稿',colW-24,13,20,'regular',C.secondary);text(contrib,'Moderation state',fixture.account.pending+' 条待审核',colW-24,13,20,'regular',C.secondary);
      frame(content,'Routine entries spacing',0,0,cw,16);
      routine(content,'profile-links','主页链接',fixture.account.profileLinks+' 条已保存','link',C.sky,C.skySoft);rule(content,cw);
      routine(content,'import','内容导入','导入自己的帖子并提交审核','file-up',C.gold,C.goldSoft);
    }
  }else throw Error('Unsupported page');
  navigation();
  return root;
}


