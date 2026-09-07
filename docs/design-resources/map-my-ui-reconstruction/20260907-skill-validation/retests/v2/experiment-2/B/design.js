/* Native, independent B-group candidate builder. Figma Plugin API only. */
async function buildDesign({root, page, direction, width, height, mode, state, fonts, icons, mapImageHash, fixture}) {
  if (mode !== 'day') throw new Error('This first-round builder is scoped to day.');
  const d = Number(direction), W = width, H = height;
  if (![0,1,2].includes(d)) throw new Error('Unknown direction');
  const P = {
    ink:'#282b29', secondary:'#5e655f', muted:'#626a63', line:'#e2e5dd', paper:'#ffffff',
    soft:'#f6f7f5', violet:'#4859b8', pale:'#f5f6ff', green:'#1f6b45', greenSoft:'#e9f8ee',
    amber:'#6f5500', gold:'#fff7d6'
  };
  const accent = d === 1 ? P.green : P.violet;
  const tint = d === 1 ? P.greenSoft : P.pale;
  const OWN = {
    map:'apps/wechat-miniapp/src/pages/map/index.tsx',
    panel:'apps/wechat-miniapp/src/pages/map/spot-panel.tsx',
    time:'apps/wechat-miniapp/src/pages/map/time-ruler.tsx',
    my:'apps/wechat-miniapp/src/features/my/my-library-page.tsx',
    nav:'apps/wechat-miniapp/src/components/custom-nav.tsx'
  };
  const rgb = hex => ({r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255});
  const fill = hex => [{type:'SOLID',color:rgb(hex)}];
  function box(parent,name,w,h,color=null,r=0,x=0,y=0) {
    const n=figma.createFrame(); n.name=name; n.resize(w,h); n.fills=color?fill(color):[];
    n.clipsContent=false; n.cornerRadius=r; parent.appendChild(n); n.x=x; n.y=y; return n;
  }
  function textNode(parent,name,content,size=14,line=20,color=P.ink,medium=false,w=null) {
    const n=figma.createText(); n.name=name; n.fontName=medium?fonts.medium:fonts.regular;
    n.fontSize=size; n.lineHeight={unit:'PIXELS',value:line}; n.fills=fill(color); n.characters=String(content);
    parent.appendChild(n);
    if(w!==null){n.resize(w,line); n.textAutoResize='HEIGHT';} else n.textAutoResize='WIDTH_AND_HEIGHT';
    return n;
  }
  function atText(parent,name,content,x,y,size=14,line=20,color=P.ink,medium=false,w=null) {
    const n=textNode(parent,name,content,size,line,color,medium,w); n.x=x;n.y=y;return n;
  }
  function flow(parent,name,w,axis='VERTICAL',gap=0,padding=0,bg=null,r=0) {
    const n=box(parent,name,w,1,bg,r); n.layoutMode=axis; n.itemSpacing=gap;
    n.paddingTop=padding;n.paddingBottom=padding;n.paddingLeft=padding;n.paddingRight=padding;
    n.primaryAxisSizingMode=axis==='VERTICAL'?'AUTO':'FIXED';
    n.counterAxisSizingMode=axis==='VERTICAL'?'FIXED':'AUTO'; return n;
  }
  function line(parent,w,color=P.line) { const n=figma.createRectangle();n.name='Quiet divider';n.resize(w,1);n.fills=fill(color);parent.appendChild(n);return n; }
  function icon(parent,name,color=accent,size=18) {
    const source=icons[name+'-'+mode]||icons[name];
    if(!source)throw new Error('Missing supplied icon '+name);
    let svg=source.replace(/currentColor/g,color);
    const n=figma.createNodeFromSvg(svg);n.name='Icon / '+name;n.resize(size,size);parent.appendChild(n);
    const recolor=node=>{if(node.type!=='GROUP'&&node.type!=='FRAME')for(const prop of ['fills','strokes']){if(Array.isArray(node[prop]))node[prop]=node[prop].map(p=>p.type==='SOLID'?{...p,color:rgb(color)}:p);}if('children'in node)node.children.forEach(recolor);};
    recolor(n);return n;
  }
  root.resize(W,H);root.clipsContent=true;root.fills=fill(P.paper);
  root.setPluginData('designDirection',['Field record','Tonight object','Content desk'][d]);
  root.setPluginData('fixtureDate',fixture.date);
  root.setPluginData('scope','Independent B v2 trial 1 / round-0; candidate values; no production adoption');
  const masterArea=box(root,'Native component masters / clipped outside viewport',460,2000,null,0,W+80,0);
  let masterY=0;
  function control(parent,key,label,{w=44,h=44,glyph=null,color=accent,bg=null,outline=false,vertical=false,size=13,owner=OWN.map,showLabel=true}={}) {
    const c=figma.createComponent();c.name='Control / '+key+' / '+label;c.resize(w,h);c.fills=bg?fill(bg):[];c.cornerRadius=8;
    c.layoutMode=vertical?'VERTICAL':'HORIZONTAL';c.primaryAxisSizingMode='FIXED';c.counterAxisSizingMode='FIXED';c.primaryAxisAlignItems='CENTER';c.counterAxisAlignItems='CENTER';c.itemSpacing=vertical?2:7;
    if(outline){c.strokes=fill(P.line);c.strokeWeight=1;}
    masterArea.appendChild(c);c.y=masterY;masterY+=h+12;
    if(glyph)icon(c,glyph,color,vertical?19:18);
    if(showLabel)textNode(c,'Label',label,size,vertical?16:20,color,true);
    const n=c.createInstance();n.name=label+' / hit '+w+'×'+h;parent.appendChild(n);
    StarwardFigma.control(n,key,owner);n.setPluginData('accessibleName',label);n.setPluginData('role','button');
    return n;
  }
  function iconTarget(parent,key,label,glyph,x,y,bg=P.paper){const n=control(parent,key,label,{glyph,showLabel:false,bg});n.x=x;n.y=y;return n;}
  function shell(){
    const sys=box(root,'System reserved / 44',W,44,P.paper);atText(sys,'Clock','9:41',24,12,13,20,P.ink,true);
    const battery=box(sys,'System battery',23,11,null,3,W-45,17);battery.strokes=fill(P.ink);battery.strokeWeight=1;
    box(battery,'Battery fill',17,7,P.ink,1,2,2);box(sys,'Battery cap',2,5,P.ink,1,W-21,20);
    const top=box(root,'WeChat title / capsule reserved / 44',W,44,P.paper,0,0,44);
    atText(top,'App title','今晚去观星',16,11,14,21,P.ink,true);
    const cap=box(top,'WeChat capsule',86,30,P.paper,16,W-99,7);cap.strokes=fill(P.line);cap.strokeWeight=1;
    const ell=icon(cap,'ellipsis',P.ink,20);ell.x=11;ell.y=5;
    const dl=line(cap,14);dl.rotation=90;dl.x=44;dl.y=8;
    const dot=icon(cap,'circle-dot',P.ink,17);dot.x=57;dot.y=6;
  }
  function nav(){
    const bar=box(root,'Primary navigation',W,56,P.paper,0,0,H-90);line(bar,W);
    for(let i=0;i<2;i++){
      const selected=(page==='map')===(i===0),n=control(bar,i===0?'nav-map':'nav-my',i===0?'地图':'我的',{
        w:W/2,h:55,glyph:i===0?'map':'user-round',color:selected?accent:P.secondary,vertical:true,size:11,owner:OWN.nav
      });n.x=i*W/2;n.y=1;n.setPluginData('selected',String(selected));
      if(selected){const a=box(bar,'Active destination indicator',20,2,accent,1,i*W/2+(W/2-20)/2,1);}
    }
    const safe=box(root,'Bottom safe area / 34',W,34,P.paper,0,0,H-34);box(safe,'System home indicator',134,4,P.ink,2,(W-134)/2,21);
  }
  function rowEntry(parent,key,title,meta,glyph,{w=W-32,h=66,bg=null,color=accent,small=false}={}){
    const c=figma.createComponent();c.name='Entry / '+key;c.resize(w,h);c.fills=bg?fill(bg):[];c.cornerRadius=10;
    c.layoutMode='HORIZONTAL';c.primaryAxisSizingMode='FIXED';c.counterAxisSizingMode='FIXED';c.counterAxisAlignItems='CENTER';c.itemSpacing=12;c.paddingLeft=bg?12:0;c.paddingRight=bg?12:0;
    const tile=box(c,'Semantic icon tile',30,30,d===1?P.greenSoft:P.pale,8);const ic=icon(tile,glyph,color,18);ic.x=6;ic.y=6;
    const copy=flow(c,'Entry copy',w-88,'VERTICAL',3);copy.layoutGrow=1;
    textNode(copy,'Entry title',title,small?13:14,20,P.ink,true,w-90);
    textNode(copy,'Entry status',meta,12,18,P.secondary,false,w-90);
    icon(c,'chevron-right',P.secondary,16);
    masterArea.appendChild(c);c.y=masterY;masterY+=h+12;
    const ins=c.createInstance();ins.name=title;parent.appendChild(ins);StarwardFigma.control(ins,key,OWN.my);ins.setPluginData('accessibleName',title+'，'+meta);return ins;
  }
  shell();
  if(page==='map'){
    const map=box(root,'Shared OpenStreetMap reference / original crop',390,480,null,0,(W-390)/2,88);map.clipsContent=true;
    const image=figma.createRectangle();image.name='Unmodified OSM raster / 390×480';image.resize(390,480);image.fills=[{type:'IMAGE',imageHash:mapImageHash,scaleMode:'FILL'}];map.appendChild(image);
    const marker=box(map,'Selected formal spot / fixed reference coordinate',44,44,null,0,195-22,209-22);
    const markerFace=box(marker,'Selected marker visible face',32,32,P.paper,16,6,6);markerFace.strokes=fill(accent);markerFace.strokeWeight=2;
    const mi=icon(markerFace,'map-pin',accent,21);mi.x=5.5;mi.y=5;
    StarwardFigma.control(marker,'marker',OWN.map);
    marker.setPluginData('formalSpotId',fixture.spot.id);marker.setPluginData('markerReference','195,209');
    const search=control(root,'search','搜索观星点',{w:W-32,h:44,glyph:'search',bg:P.paper,color:P.secondary,outline:true,size:14});search.x=16;search.y=100;
    iconTarget(root,'locate','定位','locate-fixed',W-60,318);
    iconTarget(root,'layers','图层','layers-3',W-60,370);
    const credit=box(root,'OSM attribution',184,20,P.paper,3,12,402);atText(credit,'Attribution','© OpenStreetMap 贡献者',6,1,11,18,P.secondary);
    credit.setPluginData('copyrightUrl','https://www.openstreetmap.org/copyright');credit.setPluginData('license','ODbL; external map reference; not WEAPP/native-map verification');
    const panelY=430, navY=H-90, actionY=navY-48;
    const panel=box(root,'One spot information panel',W,navY-panelY,P.paper,18,0,panelY);panel.topLeftRadius=18;panel.topRightRadius=18;panel.bottomLeftRadius=0;panel.bottomRightRadius=0;
    panel.setPluginData('extent',state||'medium');panel.setPluginData('scrollPolicy','Only large enables document scroll; extents crop this one tree.');
    const handle=control(panel,'handle','调整地点面板高度',{w:80,h:44,showLabel:false,owner:OWN.panel});handle.x=(W-80)/2;handle.y=0;
    // Handle is a true native instance; visible bar is a noninteractive sibling.
    box(panel,'Handle visible bar',30,3,P.muted,2,(W-30)/2,17);handle.setPluginData('tap','no-op; drag only after threshold');
    const vp=box(panel,'Retained document viewport',W,actionY-panelY-44-6,null,0,0,44);vp.clipsContent=true;vp.overflowDirection='NONE';
    const doc=flow(vp,'One continuous overview and astronomy document',W,'VERTICAL',0);
    const identity=box(doc,'Spot identity',W,52);
    if(d===0){box(identity,'Identity accent',2,37,accent,1,16,2);atText(identity,'Spot name',fixture.spot.name,27,0,19,27,P.ink,true,W-43);atText(identity,'Region',fixture.spot.region,27,29,12,18,P.secondary);}
    if(d===1){atText(identity,'Region',fixture.spot.region,16,0,12,18,P.secondary);atText(identity,'Spot name',fixture.spot.name,16,20,20,28,P.ink,true,W-32);}
    if(d===2){atText(identity,'Spot name',fixture.spot.name,16,0,19,27,P.ink,true,W-32);atText(identity,'Region',fixture.spot.region,16,29,12,18,P.secondary);}
    const sections=box(doc,'Sticky document section positions',W,44);
    const ov=control(sections,'overview','概览',{w:52,h:44,color:accent,size:13,owner:OWN.panel});ov.x=8;
    const ast=control(sections,'astronomy','天文',{w:52,h:44,color:P.secondary,size:13,owner:OWN.panel});ast.x=64;
    box(sections,'Overview underline',21,2,accent,1,24,40);line(sections,W).y=43;
    sections.setPluginData('behavior','Sticky left-aligned anchors; either activation expands large then aligns the same document.');
    const basic=box(doc,'Basic access and facility evidence',W,86,d===2?P.soft:null);
    const route=box(basic,'Coordinates and route',W-32,44,null,0,16,0);
    const coords=flow(route,'Coordinates',W-126,'VERTICAL',0);coords.y=3;
    textNode(coords,'Coordinates label','位置',11,16,P.secondary);
    textNode(coords,'Coordinates value','22.482680, 114.555715',12,18,P.ink);
    const go=control(route,'navigate','导航',{w:70,h:44,glyph:'navigation',color:accent,size:13,owner:OWN.panel});go.x=W-102;
    if(d===0){
      atText(basic,'Access','开放时间待核实',16,45,13,19,P.amber);
      atText(basic,'Facilities','停车、厕所待核实',16,65,12,18,P.secondary);
    }else if(d===1){
      const note=box(basic,'Unverified facilities strip',W-32,38,P.gold,6,16,46);
      atText(note,'Access','开放时间待核实',9,1,13,19,P.amber);
      atText(note,'Facilities','停车、厕所待核实',9,20,12,17,P.secondary);
    }else{
      atText(basic,'Access label','开放时间',16,47,12,18,P.secondary);atText(basic,'Access value','待核实',87,47,13,19,P.amber);
      atText(basic,'Facility label','停车 · 厕所',181,47,12,18,P.secondary);atText(basic,'Facility value','待核实',269,47,13,19,P.secondary);
    }
    const links=box(doc,'Supporting place evidence entries',W,44);
    const labels=['场地资料','观星攻略','数据来源'];
    const keys=['field','guides','source'];
    for(let i=0;i<3;i++){const e=control(links,keys[i],labels[i],{w:(W-32)/3,h:44,size:12,color:P.secondary,owner:OWN.panel});e.x=16+i*(W-32)/3;}
    const astro=flow(doc,'Astronomy facts / below medium crop',W,'VERTICAL',10,16);textNode(astro,'Astronomy heading','天文信息',15,22,P.ink,true,W-32);
    textNode(astro,'Selected date',fixture.date,12,18,P.secondary);
    const ruler=box(astro,'Borderless curved time ruler',W-32,66);StarwardFigma.control(ruler,'time',OWN.time);ruler.setPluginData('selectedAt',fixture.date+'T'+fixture.time);ruler.setPluginData('timelineAvailability','Fixture supplies one committed slice; no invented adjacent times.');
    // One supplied discrete slice only: do not invent hours or changing weather.
    atText(ruler,'Committed time',fixture.time,(W-32)/2-24,4,17,24,accent,true);
    box(ruler,'Committed center tick',2,24,accent,1,(W-32)/2,32);
    const metrics=flow(astro,'Objective selected-time metrics',W-32,'HORIZONTAL',0);
    for(const [label,value] of [['总云量',fixture.spot.cloud+'%'],['气温',fixture.spot.temperature+'°C'],['风速',fixture.spot.wind+'m/s']]){
      const c=flow(metrics,label,(W-32)/3,'VERTICAL',2);textNode(c,'Metric label',label,12,18,P.secondary);textNode(c,'Metric value',value,16,23,P.ink,true);
    }
    textNode(astro,'Moon influence','月光影响'+fixture.spot.moonImpact,13,20,P.ink);
    textNode(astro,'Data updated','更新于 '+fixture.updatedAt,12,18,P.secondary);
    textNode(astro,'Missing astronomical evidence','透明度、视宁度、光污染与目标资料暂无数据',13,20,P.secondary,false,W-32);
    const actions=box(root,'Spot action pill',W-24,44,P.soft,22,12,actionY);
    for(const [i,key,label,glyph] of [[0,'favorite','想去','star'],[1,'share','分享','send'],[2,'sky','云观星','telescope']]){
      const a=control(actions,key,label,{w:(W-24)/3,h:44,glyph,color:i===2?accent:P.ink,size:13,owner:OWN.panel});a.x=i*(W-24)/3;
    }
  } else if(page==='my') {
    const content=flow(root,'My compact account and existing content',W-32,'VERTICAL',0);content.x=16;content.y=104;
    const head=box(content,'Compact account header',W-32,d===1?66:74);
    const av=box(head,'Account avatar',36,36,tint,12,0,0);const ai=icon(av,'user-round',accent,21);ai.x=7.5;ai.y=7.5;
    atText(head,'Page identity',fixture.account.title,48,-2,20,28,P.ink,true,W-132);
    atText(head,'Account state',fixture.account.identity,48,30,12,18,P.secondary);
    const gear=control(head,'settings','设置',{glyph:'settings',showLabel:false,color:P.secondary,owner:OWN.my});gear.x=W-76;gear.y=-3;
    if(d===0){
      const utilities=flow(content,'Plan and contribution / shared utility surface',W-32,'VERTICAL',0,12,P.soft,10);
      const plan=box(utilities,'Tonight plan',W-56,96);StarwardFigma.control(plan,'plan',OWN.my);
      const pi=icon(plan,'calendar-days',accent,17);pi.x=0;pi.y=2;
      atText(plan,'Plan section label','今晚计划',25,0,12,18,P.secondary,true);
      atText(plan,'Plan date',fixture.plan.date,W-56-90,0,12,18,P.secondary);
      atText(plan,'Plan object',fixture.plan.spotName,0,27,15,22,P.ink,true,W-82);
      atText(plan,'Plan detail',fixture.plan.detail,0,55,13,20,P.secondary);
      const ch=icon(plan,'chevron-right',P.secondary,17);ch.x=W-76;ch.y=40;
      line(utilities,W-56);
      rowEntry(utilities,'contribution','现场反馈与纠错',fixture.account.drafts+' 条草稿 · '+fixture.account.pending+' 条待审核','message-square-warning',{w:W-56,h:66,small:true});
      const routines=flow(content,'Routine content entries',W-32,'VERTICAL',0);routines.paddingTop=18;
      rowEntry(routines,'profile-links','主页链接',fixture.account.profileLinks+' 条已保存','link',{h:64});line(routines,W-32);
      rowEntry(routines,'import','内容导入','导入自己的帖子并提交审核','file-up',{h:70});
    }
    if(d===1){
      const utility=flow(content,'Tonight plan and contribution',W-32,'VERTICAL',0,0);
      const plan=box(utility,'Tonight object / plan entry',W-32,129,P.greenSoft,12);StarwardFigma.control(plan,'plan',OWN.my);
      atText(plan,'Plan label','今晚计划',14,12,12,18,P.green,true);
      atText(plan,'Date',fixture.plan.date,W-32-106,12,12,18,P.green);
      atText(plan,'Plan destination',fixture.plan.spotName,14,43,17,25,P.ink,true,W-80);
      atText(plan,'Preparation detail',fixture.plan.detail,14,76,13,20,P.secondary);
      const arrow=icon(plan,'chevron-right',P.green,18);arrow.x=W-68;arrow.y=75;
      const c=rowEntry(utility,'contribution','现场反馈与纠错',fixture.account.drafts+' 条草稿 · '+fixture.account.pending+' 条待审核','message-square-warning',{h:77});
      line(content,W-32);
      const links=flow(content,'Content tools',W-32,'VERTICAL',0);links.paddingTop=16;
      rowEntry(links,'profile-links','主页链接',fixture.account.profileLinks+' 条已保存','link',{h:64});
      rowEntry(links,'import','内容导入','导入自己的帖子并提交审核','file-up',{h:64});
    }
    if(d===2){
      const utility=flow(content,'Planning and contribution desk',W-32,'VERTICAL',0,12,P.soft,10);
      const plan=box(utility,'Compact planning record',W-56,81);StarwardFigma.control(plan,'plan',OWN.my);
      atText(plan,'Plan label','今晚计划',0,0,12,18,P.secondary,true);atText(plan,'Plan date',fixture.plan.date,W-56-90,0,12,18,P.secondary);
      atText(plan,'Plan object',fixture.plan.spotName,0,26,14,21,P.ink,true,W-96);
      atText(plan,'Plan detail',fixture.plan.detail,0,49,12,18,P.secondary);
      const ar=icon(plan,'chevron-right',P.secondary,16);ar.x=W-74;ar.y=35;
      line(utility,W-56);
      const pending=box(utility,'Contribution status / one entry',W-56,107);StarwardFigma.control(pending,'contribution',OWN.my);
      atText(pending,'Contribution label','现场反馈与纠错',0,13,13,20,P.ink,true,W-78);
      const status=flow(pending,'Draft and moderation counts',W-56,'HORIZONTAL',0);status.y=43;
      for(const [label,value] of [['草稿',fixture.account.drafts],['待审核',fixture.account.pending]]){
        const cell=flow(status,label,(W-56)/2,'HORIZONTAL',8);textNode(cell,'Actual count',value,18,26,accent,true);textNode(cell,'Status label',label,12,26,P.secondary);
      }
      const ar2=icon(pending,'chevron-right',P.secondary,16);ar2.x=W-74;ar2.y=15;
      const routines=flow(content,'Existing content / quiet rows',W-32,'VERTICAL',0);routines.paddingTop=18;
      rowEntry(routines,'profile-links','主页链接',fixture.account.profileLinks+' 条已保存','link',{h:61});line(routines,W-32);
      rowEntry(routines,'import','内容导入','导入自己的帖子并提交审核','file-up',{h:65});
    }
  } else throw new Error('Unknown page');
  nav();
  root.setPluginData('visualReview','Awaiting actual exported PNG; not self-certified.');
  return {direction:d,page,rootId:root.id,controls:root.findAll(n=>n.getPluginData('controlKey')).map(n=>n.getPluginData('controlKey'))};
}
