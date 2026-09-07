/* Experiment 1 / B / round 2. Only fixture wording corrected from round 1.
 * The caller owns file attestation, staging, export and navigation wiring.
 * Deliberately no imports, browser calls, page deletion, or outside-root writes. */
async function buildDesign({ root, page, direction, width = 390, height = 844, mode = 'day', state, fonts, icons, mapImageHash, fixture = {} }) {
  if (![0, 1, 2].includes(direction) || !['map', 'my'].includes(page)) throw Error('Unsupported B direction/page');
  if (mode !== 'day') throw Error('B round-0 is day only; do not imply unreviewed theme support');
  const OWNER = {
    map: 'apps/wechat-miniapp/src/pages/map/index.tsx',
    panel: 'apps/wechat-miniapp/src/pages/map/spot-panel.tsx',
    time: 'apps/wechat-miniapp/src/pages/map/time-ruler.tsx',
    my: 'apps/wechat-miniapp/src/features/my/my-library-page.tsx',
    nav: 'apps/wechat-miniapp/src/app.config.ts'
  };
  const C = { paper:'#ffffff', subtle:'#f6f7f5', ink:'#282b29', secondary:'#5e655f', muted:'#6d746d', line:'#e2e5dd', strong:'#8a9088', sky:'#8799f6', blue:'#4859b8', skySoft:'#f5f6ff', green:'#1f6b45', greenSoft:'#e9f8ee', gold:'#f2c94c', goldSoft:'#fff7d6' };
  const rgb = h => ({ r:parseInt(h.slice(1,3),16)/255, g:parseInt(h.slice(3,5),16)/255, b:parseInt(h.slice(5,7),16)/255 });
  const paint = h => [{ type:'SOLID', color:rgb(h) }];
  const W = width - 32;
  const controls = {};
  root.resize(width,height); root.fills=paint(C.paper); root.clipsContent=true;
  root.name=`B${direction+1}/${page}/${state || (page==='map'?'medium':'normal')}`;
  root.setPluginData('designDirection', String(direction));
  root.setPluginData('designRound','2');
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
    const svg=icons[`${source}-day`] || icons[source] || icons[`${key}-day`] || icons[key];
    if (!svg) throw Error(`Missing shared existing semantic icon: ${key}-day`);
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
  if(page==='my'){
    const body=stack(root,'My content',W,direction===1?20:18);at(body,16,108);
    const account=rect(body,'Account header',0,0,W,64,null);
    const avatar=fixed(account,'Neutral account avatar',40,40,C.subtle,20);at(avatar,0,6);icon(avatar,'user',22);
    const accountCopy=stack(account,'Account copy',W-108,3);at(accountCopy,52,3);
    text(accountCopy,'Account title','账户与内容',W-108,18,25,C.ink,true);
    text(accountCopy,'Identity status','当前微信身份',W-108,14,21,C.secondary);
    at(button(account,'Settings','', 'settings',44,{icon:'settings'}),W-44,4);
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
      text(plan,'Plan label','今晚计划',W-32,16,23,C.ink,true);text(plan,'Plan date','2026-09-07',W-32,14,21,C.secondary);
      const identity=stack(plan,'Plan destination',W-32,4);text(identity,'Place','深圳市天文台',W-32,20,28,C.ink,true);text(identity,'Preparation','地点与出发准备',W-32,14,21,C.secondary);mark(plan,'plan',OWNER.my);
      const planArrow=icon(plan,'chevron-right',18);planArrow.layoutPositioning='ABSOLUTE';at(planArrow,W-34,19);
      line(utility,W);
      const contribution=stack(utility,'Contribution',W,8);contribution.paddingTop=contribution.paddingBottom=14;contribution.paddingLeft=contribution.paddingRight=16;
      const lead=fixed(contribution,'Contribution heading',W-32,24);lead.primaryAxisAlignItems='MIN';icon(lead,'images',20);text(lead,'Title','现场反馈与纠错',W-62,16,23,C.ink,true);
      const status=stack(contribution,'Draft and review status',W-32,20,true);miniFact(status,'草稿','1 条',(W-52)/2);miniFact(status,'待审核','2 条',(W-52)/2);mark(contribution,'contribution',OWNER.my);
      const contributionArrow=icon(contribution,'chevron-right',18);contributionArrow.layoutPositioning='ABSOLUTE';at(contributionArrow,W-34,17);
      const routine=stack(body,'Routine content entries',W,0);
      actionRow(routine,'Profile links','主页链接','profile-links','2 条已保存','horizon',C.skySoft);line(routine,W);
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
    const map=rect(root,'External OSM reference / fixed 390 x 480 crop',0,88,390,480,null);map.fills=[{type:'IMAGE',imageHash:mapImageHash,scaleMode:'FILL'}];
    const marker=fixed(root,'Selected formal spot marker',26,30,C.skySoft,13);at(marker,182,88+209-30);marker.strokes=paint(C.blue);marker.strokeWeight=2;icon(marker,'location',18);
    const search=button(root,'Search entry','搜索观星点','search',width-24,{icon:'search',align:'MIN',fill:C.paper,pad:12,labelWidth:width-78});at(search,12,100);search.strokes=paint(C.line);search.strokeWeight=1;
    const locate=button(root,'Locate','', 'locate',44,{icon:'location',fill:C.paper});at(locate,width-56,164);
    const layers=button(root,'Layers','', 'layers',44,{icon:'layers',fill:C.paper});at(layers,width-56,216);
    const panelTop=330;
    const navTop=height-90;
    const panel=rect(root,'Spot information panel / medium crop',0,panelTop,width,navTop-panelTop,C.paper,18);panel.clipsContent=true;
    const attribution=rect(root,'Map attribution',10,panelTop-24,226,20,C.paper,3);at(text(attribution,'Attribution','© OpenStreetMap 贡献者',220,12,18,C.secondary),3,1);
    // Only this 76 x 44 hit rectangle starts panel extent manipulation.
    const handle=mark(rect(panel,'Handle / drag only / tap is no-op',width/2-38,0,76,44,null),'handle',OWNER.panel);
    rect(handle,'Handle visible bar',23,10,30,3,C.strong,2);
    // One retained document, cropped at medium. All later content is native and
    // can be revealed by resizing the viewport and enabling scroll at large.
    const viewport=rect(panel,'Document viewport / medium clips / large scrolls',16,38,W,navTop-panelTop-100,null);viewport.clipsContent=true;
    const doc=stack(viewport,'Retained spot document',W,12);
    const identity=stack(doc,'Place identity',W,3);
    text(identity,'Place name',fixture.spotName || '深圳市天文台',W,20,28,C.ink,true);
    text(identity,'Place location','深圳 · 大鹏',W,14,21,C.secondary);
    const tabs=fixed(doc,'Sticky document section navigation',W,44);tabs.primaryAxisAlignItems='MIN';tabs.itemSpacing=12;
    const ov=button(tabs,'Overview section','概览','overview',52,{color:C.blue,owner:OWNER.panel,labelWidth:28});
    button(tabs,'Astronomy section','天文','astronomy',52,{owner:OWNER.panel,labelWidth:28});
    const under=rect(tabs,'Selected underline',12,40,28,2,C.blue,1);under.layoutPositioning='ABSOLUTE';under.x=12;under.y=40;
    const basic=stack(doc,'Overview / access and facilities',W,10);
    if(direction===0){
      const access=stack(basic,'Access facts',W,5);text(access,'Open hours','开放时间  待核实',W,15,22);text(access,'Night access','夜间进入条件待核实',W,14,21,C.secondary);
      const facilities=fixed(basic,'Shared facility line',W,26);facilities.primaryAxisAlignItems='MIN';facilities.itemSpacing=16;text(facilities,'Parking','停车  待核实',(W-16)/2,14,21,C.secondary);text(facilities,'Toilet','厕所  待核实',(W-16)/2,14,21,C.secondary);
      line(basic,W);
    } else if(direction===1){
      const facts=stack(basic,'Access matrix',W,8);facts.fills=paint(C.subtle);facts.cornerRadius=8;facts.paddingTop=facts.paddingBottom=10;facts.paddingLeft=facts.paddingRight=12;
      text(facts,'Open hours','开放时间  待核实',W-24,15,22);line(facts,W-24);
      const pair=stack(facts,'Facility pair',W-24,16,true);miniFact(pair,'停车','待核实',(W-40)/2);miniFact(pair,'厕所','待核实',(W-40)/2);
      text(basic,'Night access','夜间进入条件待核实',W,14,21,C.secondary);
    } else {
      const access=stack(basic,'Access label band',W,14,true);text(access,'Label','到达',56,14,21,C.secondary);
      const facts=stack(access,'Access values',W-70,5);text(facts,'Open hours','开放时间  待核实',W-70,15,22);text(facts,'Night access','夜间进入条件待核实',W-70,14,21,C.secondary);
      line(basic,W);
      const facilities=stack(basic,'Facility label band',W,14,true);text(facilities,'Label','设施',56,14,21,C.secondary);text(facilities,'Values','停车、厕所待核实',W-70,15,22);
    }
    const support=fixed(doc,'Place navigation and evidence',W,44);support.primaryAxisAlignItems='MIN';support.itemSpacing=10;
    button(support,'Route handoff','路线导航','route',100,{icon:'location',fill:C.greenSoft,color:C.green,owner:OWNER.panel,labelWidth:56});
    button(support,'Place evidence','场地资料','field',100,{owner:OWNER.panel,labelWidth:56});
    button(support,'Data sources','数据来源','sources',100,{owner:OWNER.panel,labelWidth:56});
    line(doc,W);
    const astro=stack(doc,'Astronomy / continuous document',W,10);
    const astronomyHeading=fixed(astro,'Astronomy heading and selected context',W,25);astronomyHeading.primaryAxisAlignItems='SPACE_BETWEEN';
    text(astronomyHeading,'Astronomy heading','天文信息',112,16,23,C.ink,true);
    const selectedTime=text(astronomyHeading,'Selected date and time','09-07 21:00',140,18,25,C.blue,true);selectedTime.textAlignHorizontal='RIGHT';
    const ruler=mark(rect(astro,'Curved time ruler / real-slice fixture',0,0,W,44,null),'time',OWNER.time);
    for(let i=-4;i<=4;i++){
      const d=Math.abs(i);const tickH=i===0?20:(d%2===0?12:7);const tickY=5+d*1.5;
      rect(ruler,`Real slice tick ${i}`,W/2+i*34,tickY,i===0?2:1,tickH,i===0?C.blue:C.strong);
    }
    at(text(ruler,'Earlier tick','19:00',46,12,18,C.secondary),W/2-151,26);at(text(ruler,'Later tick','23:00',46,12,18,C.secondary),W/2+109,26);
    const metrics=stack(astro,'Selected-time objective metrics',W,12,true);miniFact(metrics,'总云量','24%',(W-24)/3);miniFact(metrics,'气温','26°C',(W-24)/3);miniFact(metrics,'风速','2.4 m/s',(W-24)/3);
    text(astro,'Moonlight','月光影响较弱',W,15,22);text(astro,'Freshness','20:40 更新',W,12,18,C.secondary);
    const action=rect(panel,'Fixed spot action lane',16,navTop-panelTop-56,W,48,C.paper,24);action.strokes=paint(C.line);action.strokeWeight=1;
    const aw=W/3;
    at(button(action,'Favorite','想去','favorite',aw,{icon:'star',owner:OWNER.panel,labelWidth:28}),0,2);
    at(button(action,'Share','分享','share',aw,{icon:'share',owner:OWNER.panel,labelWidth:28}),aw,2);
    at(button(action,'Cloud stargazing','云观星','sky',aw,{icon:'compass',owner:OWNER.panel,labelWidth:42}),aw*2,2);
    root.setPluginData('documentSemantics','One retained ordered document. Medium clips; large alone scrolls. Section activation expands to large then anchors. Handle tap does nothing.');
  }
  shell();
  return { root, controls, componentMasters:masters, direction, page };
}
