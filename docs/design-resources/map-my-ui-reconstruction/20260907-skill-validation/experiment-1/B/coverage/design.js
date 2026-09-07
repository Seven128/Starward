/* B2 coverage. Native Figma Plugin API. Baseline: ../round-1/design.js.
 * The caller owns file attestation, staging, export and navigation wiring.
 * Deliberately no imports, browser calls, page deletion, or outside-root writes. */
async function buildDesign({ root, page, direction, width = 390, height = 844, mode = 'day', state, fonts, icons, mapImageHash, fixture = {} }) {
  if (direction !== 1 || !['map', 'my', 'components'].includes(page)) throw Error('Coverage is B2 only');
  if (!['day','night','observation'].includes(mode)) throw Error('Unsupported mode');
  state=state || (page==='map'?'medium':'normal');
  const isPhoto=state==='large-photo';
  if(isPhoto && !fixture.photoImageHash)throw Error('large-photo requires the separately licensed site-photo image hash');
  const longText=state==='long-text';
  const risk=state==='partial-stale-risk';
  const isLarge=state==='large-no-photo' || isPhoto || risk;
  const isSmall=state==='small';
  const isLayers=state==='layers';
  const myLoading=page==='my' && state==='loading';
  const myEmpty=page==='my' && state==='empty';
  const myOffline=page==='my' && state==='offline';
  const myIdentity=page==='my' && state==='identity-recovery';
  const OWNER = {
    map: 'apps/wechat-miniapp/src/pages/map/index.tsx',
    panel: 'apps/wechat-miniapp/src/pages/map/spot-panel.tsx',
    time: 'apps/wechat-miniapp/src/pages/map/time-ruler.tsx',
    my: 'apps/wechat-miniapp/src/features/my/my-library-page.tsx',
    nav: 'apps/wechat-miniapp/src/app.config.ts'
  };
  // Exact role projections from DESIGN.md miniapp-tokens JSON, no basemap tint.
  const palettes={
    day:{paper:'#ffffff',subtle:'#f6f7f5',ink:'#282b29',secondary:'#5e655f',muted:'#6d746d',line:'#e2e5dd',strong:'#8a9088',sky:'#8799f6',blue:'#4859b8',skySoft:'#f5f6ff',green:'#1f6b45',greenSoft:'#e9f8ee',gold:'#f2c94c',goldSoft:'#fff7d6',danger:'#973d37',riskSoft:'#fff0ed'},
    night:{paper:'#181a17',subtle:'#242720',ink:'#f5f3ec',secondary:'#bec2b8',muted:'#989e94',line:'#343830',strong:'#666d62',sky:'#a9b6ff',blue:'#d1d7ff',skySoft:'#292d45',green:'#b7eacb',greenSoft:'#1b3426',gold:'#f6d56f',goldSoft:'#3a3118',danger:'#ffc0ba',riskSoft:'#452724'},
    observation:{paper:'#110000',subtle:'#190000',ink:'#ff6b58',secondary:'#d84a3c',muted:'#d84a3c',line:'#7a1e18',strong:'#a83229',sky:'#d84a3c',blue:'#ff6b58',skySoft:'#190000',green:'#ff6b58',greenSoft:'#190000',gold:'#ff6b58',goldSoft:'#190000',danger:'#ff6b58',riskSoft:'#240000'}
  };
  const C=palettes[mode];
  const rgb = h => ({ r:parseInt(h.slice(1,3),16)/255, g:parseInt(h.slice(3,5),16)/255, b:parseInt(h.slice(5,7),16)/255 });
  const paint = h => [{ type:'SOLID', color:rgb(h) }];
  const W = width - 32;
  const controls = {};
  root.resize(width,height); root.fills=paint(mode==='day'?C.paper:mode==='night'?'#11120f':'#000000'); root.clipsContent=true;
  root.name=`B${direction+1}/${page}/${state || (page==='map'?'medium':'normal')}`;
  root.setPluginData('designDirection', String(direction));
  root.setPluginData('designRound','coverage');
  const rect=(p,name,x,y,w,h,fill=C.paper,r=0)=>{
    const n=figma.createFrame();p.appendChild(n);n.name=name;n.resize(w,h);n.x=x;n.y=y;
    n.fills=fill?paint(fill):[];n.cornerRadius=r;n.clipsContent=false;return n;
  };
  const text=(p,name,copy,w,size=15,line=22,color=C.ink,medium=false)=>{
    const n=figma.createText();p.appendChild(n);n.name=name;n.fontName=medium?fonts.medium:fonts.regular;
    n.fontSize=size;n.lineHeight={unit:'PIXELS',value:line};n.characters=copy;n.fills=paint(color);
    n.resize(Math.max(1,w),line);n.textAutoResize='HEIGHT';return n;
  };
  const at=(n,x,y)=>{n.x=x;n.y=y;return n;};
  const line=(p,w)=>rect(p,'Divider',0,0,w,1,C.line);
  const stack=(p,name,w,gap=8,horizontal=false)=>{
    const n=rect(p,name,0,0,w,1,null);n.layoutMode=horizontal?'HORIZONTAL':'VERTICAL';
    n.primaryAxisSizingMode=horizontal?'FIXED':'AUTO';n.counterAxisSizingMode=horizontal?'AUTO':'FIXED';n.itemSpacing=gap;return n;
  };
  const fixed=(p,name,w,h,fill=null,r=0)=>{
    const n=rect(p,name,0,0,w,h,fill,r);n.layoutMode='HORIZONTAL';
    n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='FIXED';
    n.primaryAxisAlignItems='CENTER';n.counterAxisAlignItems='CENTER';n.itemSpacing=8;return n;
  };
  const icon=(p,key,size=20)=>{
    const aliases={location:'locate-fixed',layers:'layers-3',user:'user-round',conditions:'clock-3',horizon:'link',share:'send'};
    const source=aliases[key] || key;
    const svg=icons[`${source}-${mode}`] || icons[`${key}-${mode}`] || (mode==='day'?(icons[source] || icons[key]):null);
    if (!svg) throw Error(`Missing shared existing semantic icon: ${source}-${mode}`);
    return StarwardFigma.icon(p,svg,{size,name:`Icon/${key}`});
  };
  const mark=(n,key,owner)=>{StarwardFigma.control(n,key,owner);controls[key]=n;return n;};
  // Masters are children of this owned root, beyond its clipping boundary.
  // The visible product contains only editable component instances.
  const masters=rect(root,'Component masters / outside export',width+80,0,500,1200,null);
  let masterY=0;
  const button=(p,name,label,key,w=44,opts={})=>{
    const m=figma.createComponent();masters.appendChild(m);m.name=`Control/${name}`;m.x=0;m.y=masterY;masterY+=68;
    m.resize(w,44);m.layoutMode='HORIZONTAL';m.primaryAxisSizingMode='FIXED';m.counterAxisSizingMode='FIXED';
    m.primaryAxisAlignItems=opts.align || 'CENTER';m.counterAxisAlignItems='CENTER';m.itemSpacing=6;
    m.fills=opts.fill?paint(opts.fill):[];m.cornerRadius=opts.radius===undefined?8:opts.radius;
    m.paddingLeft=m.paddingRight=opts.pad || 0;
    if(opts.icon)icon(m,opts.icon,opts.iconSize || 20);
    if(label)text(m,'Label',label,opts.labelWidth || (w-(opts.icon?26:0)-(opts.pad||0)*2),14,20,opts.color || C.ink,true);
    const instance=m.createInstance();p.appendChild(instance);instance.name=name;
    return key?mark(instance,key,opts.owner || (page==='map'?OWNER.map:OWNER.my)):instance;
  };
  const shell=()=>{
    const s=rect(root,'System status area',0,0,width,44,C.paper);
    at(text(s,'System time','9:41',54,14,20,C.ink,true),24,13);
    for(let i=0;i<4;i++)rect(s,`System signal ${i}`,width-79+i*4,25-(i+1)*2,2,(i+1)*2,C.ink,1);
    const battery=rect(s,'System battery',width-41,18,20,10,null,2);battery.strokes=paint(C.ink);battery.strokeWeight=1;
    rect(battery,'Battery fill',2,2,14,6,C.ink,1);rect(s,'Battery cap',width-20,21,2,4,C.ink,1);
    const top=rect(root,'WeChat title and capsule area',0,44,width,44,C.paper);
    at(text(top,'Page title',page==='map'?'今晚去观星':'我的',width-130,16,23,C.ink,true),16,10);
    const cap=rect(top,'WeChat capsule',width-98,7,82,30,C.paper,16);cap.strokes=paint(C.line);cap.strokeWeight=1;
    for(let i=0;i<3;i++)rect(cap,`Menu dot ${i}`,14+i*8,13,3,3,C.ink,1.5);
    rect(cap,'Capsule divider',47,8,1,14,C.line);
    const close=rect(cap,'System close circle',58,9,12,12,null,6);close.strokes=paint(C.ink);close.strokeWeight=1.5;
    rect(close,'System close core',3,3,6,6,C.ink,3);
    const nav=rect(root,'Primary navigation',0,height-90,width,56,C.paper);
    rect(nav,'Top divider',0,0,width,1,C.line);
    const a=button(nav,'Map navigation','地图','nav-map',width/2,{icon:'map',fill:page==='map'?C.skySoft:null,color:page==='map'?C.blue:C.secondary,owner:OWNER.nav,radius:0,labelWidth:30});at(a,0,6);
    const b=button(nav,'My navigation','我的','nav-my',width/2,{icon:'user',fill:page==='my'?C.skySoft:null,color:page==='my'?C.blue:C.secondary,owner:OWNER.nav,radius:0,labelWidth:30});at(b,width/2,6);
    rect(root,'Bottom safe area',0,height-34,width,34,C.paper);
    rect(root,'Home indicator',width/2-62,height-13,124,4,C.ink,2);
  };
  const miniFact=(p,label,value,w)=>{
    const col=stack(p,`Fact/${label}`,w,2);text(col,'Label',label,w,14,21,C.secondary);text(col,'Value',value,w,15,22);return col;
  };
  const actionRow=(p,name,label,key,detail,iconName,fill)=>{
    const n=stack(p,name,W,0);const row=rect(n,'Row',0,0,W,detail?76:52,null);
    const tile=fixed(row,'Semantic icon tile',32,32,fill,8);at(tile,0,detail?18:10);icon(tile,iconName,20);
    const copy=stack(row,'Copy',W-68,3);at(copy,44,detail?12:14);text(copy,'Title',label,W-68,16,23,C.ink,true);
    if(detail)text(copy,'Description',detail,W-68,14,21,C.secondary);
    row.resize(W,Math.max(detail?76:52,copy.height+24));
    at(icon(row,'chevron-right',18),W-18,(row.height-18)/2);mark(row,key,OWNER.my);return n;
  };
  const frames=Array.isArray(fixture.timeFrames)?fixture.timeFrames.filter(f=>f && typeof f.atUtc==='string' && !isNaN(Date.parse(f.atUtc))):[];
  const selectedAt=fixture.selectedAt || '2026-09-07T13:00:00.000Z';
  const localTime=iso=>{const d=new Date(iso);return `${String((d.getUTCHours()+8)%24).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;};
  const selectedIndex=frames.findIndex(f=>f.atUtc===selectedAt);
  const actualFrames=frames.length?frames:[{atUtc:selectedAt}];
  const drawRuler=(p,w,showValue)=>{
    const h=showValue?76:48;
    const n=mark(rect(p,'Curved time ruler / explicit frame entries only',0,0,w,h,null),'time',OWNER.time);
    n.setPluginData('timeFrames',JSON.stringify(actualFrames.map(f=>f.atUtc)));n.setPluginData('selectedAt',selectedAt);
    n.setPluginData('readOnly',String(frames.length<2));
    if(showValue)at(text(n,'Selected date and time',`09-07 ${localTime(selectedAt)}`,w,18,25,C.blue,true),0,0).textAlignHorizontal='CENTER';
    const top=showValue?31:3;const center=selectedIndex>=0?selectedIndex:0;
    actualFrames.forEach((frame,i)=>{
      const offset=i-center;const x=w/2+offset*64;if(x<20 || x>w-20)return;
      const selected=frame.atUtc===selectedAt;const tickY=top+(selected?0:4);
      rect(n,`Frame ${frame.atUtc}`,x,tickY,selected?2:1,selected?20:12,selected?C.blue:C.strong);
      if(!selected){const t=text(n,`Frame label ${frame.atUtc}`,localTime(frame.atUtc),48,12,18,C.secondary);at(t,x-24,top+23);t.textAlignHorizontal='CENTER';}
    });return n;
  };
  if(page==='components'){
    const content=stack(root,'B2 component state specimens',W,18);at(content,16,20);
    text(content,'Specimen title','B2 组件状态',W,20,28,C.ink,true);
    text(content,'Specimen note','设计资源状态板 · 静态示例',W,14,21,C.secondary);
    for(const [value,label] of [['default','默认'],['pressed','按下'],['selected','已选'],['disabled','不可用'],['loading','处理中']]){
      const row=stack(content,`State ${value}`,W,8);text(row,'State name',label,W,16,23,C.ink,true);
      const group=fixed(row,'Controls',W,48);group.primaryAxisAlignItems='MIN';group.itemSpacing=12;
      const target=button(group,`Favorite ${value}`,value==='selected'?'已想去':value==='loading'?'处理中':'想去',`specimen-favorite-${value}`,144,{icon:'star',fill:value==='selected'?C.goldSoft:value==='pressed'?C.skySoft:null,color:value==='disabled'?C.secondary:C.ink,owner:OWNER.panel,labelWidth:70});target.setPluginData('componentState',value);target.setPluginData('disabled',String(value==='disabled'||value==='loading'));
      if(value==='default' || value==='pressed'){const gear=button(group,`Settings ${value}`,'',`specimen-settings-${value}`,44,{icon:'settings',fill:value==='pressed'?C.skySoft:null,owner:OWNER.my});gear.setPluginData('componentState',value);}
      if(value==='selected'){target.strokes=paint(C.strong);target.strokeWeight=1;}
      line(row,W);
    }
    text(content,'State limitations','按下、取消、等待与完成的真实时序仍需运行验证。',W,14,21,C.secondary);
  } else if(page==='my'){
    const myViewport=rect(root,'My scroll viewport',16,108,W,height-108-90,null);myViewport.clipsContent=true;myViewport.overflowDirection='VERTICAL';
    const body=stack(myViewport,'My content',W,20);
    const account=rect(body,'Account header',0,0,W,64,null);
    const avatar=fixed(account,'Neutral account avatar',40,40,C.subtle,20);at(avatar,0,6);icon(avatar,'user',22);
    const accountCopy=stack(account,'Account copy',W-108,3);at(accountCopy,52,3);
    text(accountCopy,'Account title','账户与内容',W-108,18,25,C.ink,true);
    text(accountCopy,'Identity status',myIdentity?'微信身份待确认':'当前微信身份',W-108,14,21,C.secondary);
    at(button(account,'Settings','', 'settings',44,{icon:'settings'}),W-44,4);
    if(myOffline || myIdentity){
      const notice=stack(body,'Account recovery',W,6);notice.fills=paint(C.subtle);notice.cornerRadius=8;notice.paddingTop=notice.paddingBottom=12;notice.paddingLeft=notice.paddingRight=12;
      text(notice,'Recovery title',myOffline?'暂时离线':'请确认微信身份',W-24,16,23,C.ink,true);
      text(notice,'Recovery detail',myOffline?'当前显示上次同步记录，审核状态可能有变化。':'确认后可同步计划、反馈和主页链接。',W-24,14,21,C.secondary);
      button(notice,'Account recovery action',myOffline?'重试同步':'确认微信身份','recovery',132,{fill:C.skySoft,color:C.blue,labelWidth:112});
    }
    if(direction===0){
      line(body,W);
      const group=stack(body,'Plan and contribution / shared surface',W,0);
      actionRow(group,'Tonight plan','今晚计划','plan','2026-09-07 · 深圳市天文台\n地点与出发准备','conditions',C.greenSoft);
      line(group,W);
      actionRow(group,'Contribution','现场反馈与纠错','contribution','1 条草稿 · 2 条待审核','images',C.goldSoft);
      const routine=stack(body,'Routine content entries',W,0);
      actionRow(routine,'Profile links','主页链接','profile-links','2 条已保存','horizon',C.skySoft);line(routine,W);
      actionRow(routine,'Import','内容导入','import','导入自己的帖子并提交审核','download',C.skySoft);
    } else if(direction===1){
      const utility=stack(body,'Plan and contribution / divided utility surface',W,0);utility.fills=paint(C.subtle);utility.cornerRadius=12;
      const plan=stack(utility,'Tonight plan',W,8);plan.paddingTop=plan.paddingBottom=16;plan.paddingLeft=plan.paddingRight=16;
      text(plan,'Plan label','今晚计划',W-54,16,23,C.ink,true);
      text(plan,'Plan date',myLoading?'正在加载':myIdentity?'身份确认后同步':myEmpty?'还没有今晚计划':`${myOffline?'上次记录 · ':''}2026-09-07`,W-32,14,21,C.secondary);
      const identity=stack(plan,'Plan destination',W-32,4);
      if(!myLoading && !myIdentity && !myEmpty)text(identity,'Place',longText?'深圳市天文台及周边正式观星地点的出发准备':'深圳市天文台',W-32,20,28,C.ink,true);
      text(identity,'Preparation',myLoading?'计划内容正在同步':myIdentity?'确认身份后查看已保存内容':'地点与出发准备',W-32,14,21,C.secondary);mark(plan,'plan',OWNER.my);
      const planArrow=icon(plan,'chevron-right',18);planArrow.layoutPositioning='ABSOLUTE';at(planArrow,W-34,19);
      line(utility,W);
      const contribution=stack(utility,'Contribution',W,8);contribution.paddingTop=contribution.paddingBottom=14;contribution.paddingLeft=contribution.paddingRight=16;
      const lead=fixed(contribution,'Contribution heading',W-32,24);lead.primaryAxisAlignItems='MIN';icon(lead,'images',20);text(lead,'Title','现场反馈与纠错',W-84,16,23,C.ink,true);
      if(longText)text(contribution,'Contribution description','补充现场设施变化、夜间进入限制，或继续编辑尚未提交的反馈内容。',W-32,14,21,C.secondary);
      const status=stack(contribution,'Draft and review status',W-32,20,true);
      const stat=myLoading?'正在加载':myIdentity?'待身份确认':null;
      miniFact(status,`${myOffline?'上次':' '}草稿`.trim(),stat || '1 条',(W-52)/2);miniFact(status,`${myOffline?'上次':' '}待审核`.trim(),stat || '2 条',(W-52)/2);mark(contribution,'contribution',OWNER.my);
      const contributionArrow=icon(contribution,'chevron-right',18);contributionArrow.layoutPositioning='ABSOLUTE';at(contributionArrow,W-34,17);
      const routine=stack(body,'Routine content entries',W,0);
      actionRow(routine,'Profile links','主页链接','profile-links',myLoading?'正在加载':myIdentity?'确认身份后同步':myOffline?'上次记录 · 2 条已保存':'2 条已保存','horizon',C.skySoft);line(routine,W);
      actionRow(routine,'Import','内容导入','import','导入自己的帖子并提交审核','download',C.skySoft);
    } else {
      line(body,W);
      const utility=stack(body,'Plan and contribution / editorial bands',W,0);
      const plan=rect(utility,'Tonight plan',0,0,W,112,null);
      at(text(plan,'Date year','2026',70,14,21,C.secondary),0,9);at(text(plan,'Date month and day','09.07',70,18,25,C.ink,true),0,33);
      const cp=stack(plan,'Plan information',W-92,6);at(cp,84,6);
      text(cp,'Title','今晚计划',W-112,16,23,C.ink,true);text(cp,'Place','深圳市天文台',W-112,18,25,C.ink,true);text(cp,'Preparation','地点与出发准备',W-112,14,21,C.secondary);mark(plan,'plan',OWNER.my);
      at(icon(plan,'chevron-right',18),W-18,38);
      line(utility,W);
      const con=rect(utility,'Contribution',0,0,W,84,null);at(text(con,'Label','反馈',64,14,21,C.secondary),0,17);
      const cc=stack(con,'Contribution information',W-92,5);at(cc,84,14);text(cc,'Title','现场反馈与纠错',W-92,16,23,C.ink,true);text(cc,'State','1 条草稿 · 2 条待审核',W-92,14,21,C.secondary);mark(con,'contribution',OWNER.my);
      at(icon(con,'chevron-right',18),W-18,30);
      const routine=stack(body,'Routine content entries',W,0);
      actionRow(routine,'Profile links','主页链接','profile-links','2 条已保存','horizon',C.skySoft);line(routine,W);
      actionRow(routine,'Import','内容导入','import','导入自己的帖子并提交审核','download',C.skySoft);
    }
  } else {
    if(!mapImageHash)throw Error('Missing shared unmodified OSM reference image');
    const mapViewport=rect(root,'External map viewport',0,88,width,height-178,null);mapViewport.clipsContent=true;
    const map=rect(mapViewport,'External OSM reference / fixed 390 x 480 crop',(width-390)/2,0,390,480,null);map.fills=[{type:'IMAGE',imageHash:mapImageHash,scaleMode:'FILL'}];
    const marker=fixed(root,'Selected formal spot marker',26,30,C.skySoft,13);at(marker,width/2-13,88+209-30);marker.strokes=paint(C.blue);marker.strokeWeight=2;icon(marker,'location',18);
    const search=button(root,'Search entry','搜索观星点','search',width-24,{icon:'search',align:'MIN',fill:C.paper,pad:12,labelWidth:width-78});at(search,12,100);search.strokes=paint(C.line);search.strokeWeight=1;
    const locate=button(root,'Locate','', 'locate',44,{icon:'location',fill:C.paper});at(locate,width-56,164);
    const layers=button(root,'Layers','', 'layers',44,{icon:'layers',fill:C.paper});at(layers,width-56,216);
    const panelTop=isLarge?88:isSmall?height-90-164:330;
    const navTop=height-90;
    const panel=rect(root,`Spot information panel / ${isLarge?'large':isSmall?'small':'medium'} crop`,0,panelTop,width,navTop-panelTop,C.paper,isLarge?0:18);panel.clipsContent=true;
    const attribution=rect(root,'Map attribution',10,panelTop-24,226,20,C.paper,3);at(text(attribution,'Attribution','© OpenStreetMap 贡献者',220,12,18,C.secondary),3,1);
    // Only this 76 x 44 hit rectangle starts panel extent manipulation.
    const handle=mark(rect(panel,'Handle / drag only / tap is no-op',width/2-38,0,76,44,null),'handle',OWNER.panel);
    rect(handle,'Handle visible bar',23,10,30,3,C.strong,2);
    // One retained document, cropped at medium. All later content is native and
    // can be revealed by resizing the viewport and enabling scroll at large.
    const viewport=rect(panel,'Document viewport / only large scrolls',16,isPhoto?0:38,W,navTop-panelTop-(isPhoto?62:100),null);viewport.clipsContent=true;if(isLarge)viewport.overflowDirection='VERTICAL';
    const doc=stack(viewport,'Retained spot document',W,12);
    if(isPhoto){
      const photo=rect(doc,'Licensed site photograph / Shenzhen Observatory 2021',0,0,W,W*2/3,null);photo.fills=[{type:'IMAGE',imageHash:fixture.photoImageHash,scaleMode:'FILL'}];
      photo.setPluginData('attribution','Charlie fong / Shenzhen Observatory 2021 / Wikimedia Commons / CC BY-SA 4.0; full source in assets/ATTRIBUTION.md');
      // Media is the sole presentation exception and precedes identity. The
      // overlay handle remains outside the scrolling content and owns no band.
      const backplate=rect(handle,'Handle contrast backing',16,5,44,14,C.paper,7);handle.insertChild(0,backplate);
      panel.appendChild(handle);
    }
    const identity=stack(doc,'Place identity',W,3);
    text(identity,'Place name',longText?'深圳市天文台及周边正式观星地点资料':fixture.spotName || fixture.spot?.name || '深圳市天文台',W,20,28,C.ink,true);
    text(identity,'Place location','深圳 · 大鹏',W,14,21,C.secondary);
    const tabs=fixed(doc,'Sticky document section navigation',W,44);tabs.primaryAxisAlignItems='MIN';tabs.itemSpacing=12;
    const ov=button(tabs,'Overview section','概览','overview',52,{color:C.blue,owner:OWNER.panel,labelWidth:28});
    button(tabs,'Astronomy section','天文','astronomy',52,{owner:OWNER.panel,labelWidth:28});
    const under=rect(tabs,'Selected underline',12,40,28,2,C.blue,1);under.layoutPositioning='ABSOLUTE';under.x=12;under.y=40;
    const basic=stack(doc,'Overview / access and facilities',W,10);
    if(risk){
      const riskNotice=stack(basic,'Access restriction / coverage fixture',W,5);riskNotice.fills=paint(C.riskSoft);riskNotice.cornerRadius=8; riskNotice.paddingLeft=riskNotice.paddingRight=12;riskNotice.paddingTop=riskNotice.paddingBottom=10;
      text(riskNotice,'Restriction','入口暂时关闭',W-24,16,23,C.danger,true);
      text(riskNotice,'Restriction detail','暂不能进入该地点，请先核实开放情况。',W-24,14,21,C.danger);
    }
    if(direction===0){
      const access=stack(basic,'Access facts',W,5);text(access,'Open hours','开放时间  待核实',W,15,22);text(access,'Night access','夜间进入条件待核实',W,14,21,C.secondary);
      const facilities=fixed(basic,'Shared facility line',W,26);facilities.primaryAxisAlignItems='MIN';facilities.itemSpacing=16;text(facilities,'Parking','停车  待核实',(W-16)/2,14,21,C.secondary);text(facilities,'Toilet','厕所  待核实',(W-16)/2,14,21,C.secondary);
      line(basic,W);
    } else if(direction===1){
      const facts=stack(basic,'Access matrix',W,8);facts.fills=paint(C.subtle);facts.cornerRadius=8;facts.paddingTop=facts.paddingBottom=10;facts.paddingLeft=facts.paddingRight=12;
      text(facts,'Open hours','开放时间  待核实',W-24,15,22);line(facts,W-24);
      const pair=stack(facts,'Facility pair',W-24,16,true);miniFact(pair,'停车','待核实',(W-40)/2);miniFact(pair,'厕所','待核实',(W-40)/2);
      text(basic,'Night access',longText?'夜间进入条件与末段道路通行情况待核实，现场安排以场地管理方说明为准。':'夜间进入条件待核实',W,14,21,C.secondary);
    } else {
      const access=stack(basic,'Access label band',W,14,true);text(access,'Label','到达',56,14,21,C.secondary);
      const facts=stack(access,'Access values',W-70,5);text(facts,'Open hours','开放时间  待核实',W-70,15,22);text(facts,'Night access','夜间进入条件待核实',W-70,14,21,C.secondary);
      line(basic,W);
      const facilities=stack(basic,'Facility label band',W,14,true);text(facilities,'Label','设施',56,14,21,C.secondary);text(facilities,'Values','停车、厕所待核实',W-70,15,22);
    }
    const support=fixed(doc,'Place navigation and evidence',W,44);support.primaryAxisAlignItems='MIN';support.itemSpacing=10;
    const supportWidth=(W-20)/3;
    const route=button(support,'Route handoff',risk?'暂不可前往':'路线导航','route',supportWidth,{fill:risk?C.subtle:C.greenSoft,color:risk?C.secondary:C.green,owner:OWNER.panel,labelWidth:supportWidth-8});route.setPluginData('disabled',String(risk));
    button(support,'Place evidence','场地资料','field',supportWidth,{owner:OWNER.panel,labelWidth:56});
    button(support,'Data sources','数据来源','sources',supportWidth,{owner:OWNER.panel,labelWidth:56});
    line(doc,W);
    const astro=stack(doc,'Astronomy / continuous document',W,10);
    const astronomyHeading=fixed(astro,'Astronomy heading and selected context',W,25);astronomyHeading.primaryAxisAlignItems='SPACE_BETWEEN';
    text(astronomyHeading,'Astronomy heading','天文信息',112,16,23,C.ink,true);
    const selectedTime=text(astronomyHeading,'Selected date and time',`09-07 ${localTime(selectedAt)}`,140,18,25,C.blue,true);selectedTime.textAlignHorizontal='RIGHT';
    drawRuler(astro,W,false);
    const metrics=stack(astro,'Selected-time objective metrics',W,12,true);miniFact(metrics,'总云量',risk?'暂无数据':'24%',(W-24)/3);miniFact(metrics,'气温','26°C',(W-24)/3);miniFact(metrics,'风速','2.4 m/s',(W-24)/3);
    text(astro,'Moonlight','月光影响较弱',W,15,22);text(astro,'Freshness',risk?'天气数据较旧 · 上次更新 20:40':'20:40 更新',W,12,18,C.secondary);
    if(risk){text(astro,'Missing cloud impact','云量暂不可用，其他数值保留上次记录。',W,14,21,C.secondary);button(astro,'Weather recovery','重试天气','weather-recovery',120,{fill:C.skySoft,color:C.blue,labelWidth:96,owner:OWNER.panel});}
    const action=rect(panel,'Fixed spot action lane',16,navTop-panelTop-56,W,48,C.paper,24);action.strokes=paint(C.line);action.strokeWeight=1;
    const aw=W/3;
    at(button(action,'Favorite','想去','favorite',aw,{icon:'star',owner:OWNER.panel,labelWidth:28}),0,2);
    at(button(action,'Share','分享','share',aw,{icon:'share',owner:OWNER.panel,labelWidth:28}),aw,2);
    at(button(action,'Cloud stargazing','云观星','sky',aw,{icon:'compass',owner:OWNER.panel,labelWidth:42}),aw*2,2);
    if(isLarge){search.visible=false;locate.visible=false;layers.visible=false;attribution.visible=false;marker.visible=false;}
    if(isLayers){
      // The single presentation owner is layers, so panel nodes have no active
      // semantics. It is removed as a whole, never co-visible with the sheet.
      panel.remove();['handle','overview','astronomy','route','field','sources','time','favorite','share','sky'].forEach(k=>delete controls[k]);
      const layerHeight=320;const sheetTop=navTop-layerHeight;attribution.y=sheetTop-24;
      const sheet=rect(root,'Exclusive layer sheet',0,sheetTop,width,layerHeight,C.paper,18);
      const content=stack(sheet,'Layer content',W,12);at(content,16,16);
      text(content,'Title','地图分析',W,16,23,C.ink,true);
      text(content,'Objective layer summary','总云量 24% · 图层范围暂无数据',W,14,21,C.secondary);
      const choices=fixed(content,'Three existing layer choices',W,104);choices.itemSpacing=8;choices.primaryAxisAlignItems='MIN';
      const layerData=[['LIGHT','光害','静态夜光估算'],['TOTAL_CLOUD','总云量','当前观测时刻'],['OPPORTUNITY','今晚观测条件','暂无数据']];
      layerData.forEach(([key,label,detail])=>{
        const choice=stack(choices,`Layer choice ${key}`,(W-16)/3,5);choice.fills=paint(key==='TOTAL_CLOUD'?C.skySoft:C.subtle);choice.cornerRadius=8;choice.paddingTop=choice.paddingBottom=12;choice.paddingLeft=choice.paddingRight=8;
        text(choice,'Label',label,(W-16)/3-16,14,20,key==='TOTAL_CLOUD'?C.blue:C.ink,true);text(choice,'Description',detail,(W-16)/3-16,12,18,C.secondary);
        if(key==='TOTAL_CLOUD')text(choice,'Selected','已选',(W-16)/3-16,12,18,C.blue,true);
        choice.minHeight=88;mark(choice,`layer-${key}`,OWNER.map);choice.setPluginData('selected',String(key==='TOTAL_CLOUD'));
      });
      drawRuler(content,W,true);
      layers.fills=paint(C.skySoft);root.setPluginData('bottomPresentation','layer-sheet');
    } else root.setPluginData('bottomPresentation','spot-panel');
    root.setPluginData('documentSemantics','One retained ordered document. Medium clips; large alone scrolls. Section activation expands to large then anchors. Handle tap does nothing.');
  }
  if(page!=='components')shell();
  const controlVisibility={};
  for(const [key,node] of Object.entries(controls)){
    const tr=node.absoluteTransform;const box={x:tr[0][2],y:tr[1][2],width:node.width,height:node.height};
    let left=box.x,top=box.y,right=box.x+box.width,bottom=box.y+box.height;let hidden=!node.visible;let parent=node.parent;
    while(parent && parent.type!=='PAGE' && parent.type!=='DOCUMENT'){
      if(parent.visible===false)hidden=true;
      if(parent.clipsContent){const pt=parent.absoluteTransform;left=Math.max(left,pt[0][2]);top=Math.max(top,pt[1][2]);right=Math.min(right,pt[0][2]+parent.width);bottom=Math.min(bottom,pt[1][2]+parent.height);}
      parent=parent.parent;
    }
    const visibleArea=hidden?0:Math.max(0,right-left)*Math.max(0,bottom-top);
    controlVisibility[key]={visible:visibleArea>0,fullyVisible:visibleArea>=box.width*box.height-0.01,clipped:!hidden&&visibleArea<box.width*box.height-0.01,width:box.width,height:box.height};
  }
  const metadata={candidate:'B2',page,direction,mode,state,width,height,visualReview:'pending',timeline:{source:fixture.provenance?.kind || 'unverified',entries:actualFrames.map(f=>f.atUtc),selectedAt,dynamicLayerAvailable:frames.some(f=>f.dynamicLayer!==null && f.dynamicLayer!==undefined),light:'static'},externalMap:{source:'shared OSM 390x480 reference',tinted:false,nativeVerification:'unverified',observationProtection:'unverified'},photo:isPhoto?'Charlie fong / 2021 / Wikimedia Commons / CC BY-SA 4.0 / not current site evidence':'not-present',largeText200:'paused',longTextFixture:longText?'task-local-content-length-test':null,riskFixture:risk?'task-local-synthetic-closed-entry-and-stale-weather':null};
  metadata.controlVisibility=controlVisibility;metadata.notFullyVisibleControls=Object.keys(controlVisibility).filter(k=>!controlVisibility[k].fullyVisible);
  root.setPluginData('coverageMetadata',JSON.stringify(metadata));
  return { root, controls, componentMasters:masters, direction, page, metadata };
}
