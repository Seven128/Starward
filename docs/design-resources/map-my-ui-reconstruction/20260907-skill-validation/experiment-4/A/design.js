/* Independent candidate. Public Figma Plugin API; no transport or external reads. */
async function buildDesign({root,page,direction,width,height,mode,state,fonts,icons,mapImageHash,fixture}) {
  if (![0,1,2].includes(direction)) throw Error('Unknown direction');
  if (mode !== 'day') throw Error('This round is scoped to day; other modes require separate review');
  const F = StarwardFigma;
  const C = {white:'#ffffff', ink:'#282b29', secondary:'#5e655f', muted:'#6d746d', line:'#e2e5dd', strong:'#8a9088', soft:'#f6f7f5', sky:'#4859b8', skySoft:'#f5f6ff', skyEdge:'#8799f6', green:'#1f6b45', greenSoft:'#e9f8ee', gold:'#6f5500', goldSoft:'#fff7d6', coral:'#973d37', coralSoft:'#fff0ed'};
  const O = {map:'apps/wechat-miniapp/src/pages/map/index.tsx', panel:'apps/wechat-miniapp/src/pages/map/spot-panel.tsx', time:'apps/wechat-miniapp/src/pages/map/time-ruler.tsx', my:'apps/wechat-miniapp/src/features/my/my-library-page.tsx', nav:'apps/wechat-miniapp/src/components/custom-nav.tsx'};
  const names=['清线','并置','行册'];
  const inset=16, inner=width-inset*2, navY=height-78;
  const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
  const fill=h=>h?[{type:'SOLID',color:rgb(h)}]:[];
  root.resize(width,height); root.fills=fill(C.white); root.clipsContent=true;
  root.setPluginData('candidateDirection',names[direction]);
  root.setPluginData('fixtureContext',JSON.stringify({date:fixture.date,time:fixture.time,spot:fixture.spot.id,nonLive:true}));
  root.setPluginData('scope','Editable static day resource; runtime interaction, devices and other states unverified');
  function frame(parent,name,w,h,x=0,y=0,bg=null,r=0,type='FRAME') {
    const n=type==='COMPONENT'?figma.createComponent():figma.createFrame(); parent.appendChild(n); n.name=name;
    n.resize(w,h); n.x=x; n.y=y; n.fills=fill(bg); n.cornerRadius=r; n.clipsContent=false; return n;
  }
  function auto(n,axis,gap=0,pad=0,hug=false) {
    n.layoutMode=axis; n.primaryAxisSizingMode=hug?'AUTO':'FIXED'; n.counterAxisSizingMode='FIXED';
    n.itemSpacing=gap; n.paddingLeft=n.paddingRight=n.paddingTop=n.paddingBottom=pad;
    n.primaryAxisAlignItems='MIN'; n.counterAxisAlignItems='MIN'; return n;
  }
  function text(parent,s,w,size=14,line=20,color=C.ink,weight='regular',name=s) {
    const n=figma.createText(); parent.appendChild(n); n.name=name; n.fontName=fonts[weight];
    n.fontSize=size; n.lineHeight={unit:'PIXELS',value:line}; n.letterSpacing={unit:'PIXELS',value:0};
    n.characters=String(s); n.fills=fill(color); n.resize(Math.max(1,w),line); n.textAutoResize='HEIGHT'; return n;
  }
  function atText(parent,s,x,y,w,size=14,line=20,color=C.ink,weight='regular') {
    const n=text(parent,s,w,size,line,color,weight); n.x=x;n.y=y;return n;
  }
  function rect(parent,name,x,y,w,h,color,r=0) {
    const n=figma.createRectangle();parent.appendChild(n);n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=fill(color);n.cornerRadius=r;return n;
  }
  function rule(parent,w=inner) {return frame(parent,'Shared divider',w,1,0,0,C.line);}
  const masters=frame(root,'Editable component originals — clipped outside product',1000,1600,width+80,0);
  let masterY=0;
  const iconCache=new Map();
  function icon(parent,key,size=18,color=C.ink) {
    const ck=key+'/'+size+'/'+color;
    if(!iconCache.has(ck)) {
      const svg=icons[key+'-day'] || icons[key];
      if(!svg) throw Error('Missing shared SVG '+key);
      const m=frame(masters,'SemanticIcon / '+key,size,size,0,masterY,null,0,'COMPONENT');masterY+=size+8;
      F.icon(m,svg.replace(/currentColor/g,color),{size,name:key});iconCache.set(ck,m);
    }
    const n=iconCache.get(ck).createInstance();parent.appendChild(n);return n;
  }
  function control(parent,key,w,h,label,glyph,{bg=null,color=C.ink,owner=O.panel,vertical=false,r=8,size=14}={}) {
    if(w<44 || h<44) throw Error('Target too small: '+key);
    const m=frame(masters,'Control / '+key,w,h,160,masterY,null,0,'COMPONENT');masterY+=h+8;
    if(bg) rect(m,'Visible surface',2,(h-32)/2,w-4,32,bg,r);
    const content=frame(m,'Icon and label',w,h);
    auto(content,vertical?'VERTICAL':'HORIZONTAL',vertical?2:6);content.primaryAxisAlignItems='CENTER';content.counterAxisAlignItems='CENTER';
    if(glyph)icon(content,glyph,18,color);
    if(label){const t=text(content,label,Math.max(1,w-(glyph&&!vertical?28:12)),size,size+6,color,'medium');t.textAlignHorizontal=vertical?'CENTER':'LEFT';t.textAutoResize='WIDTH_AND_HEIGHT';}
    const n=m.createInstance();parent.appendChild(n);n.name=label||key;F.control(n,key,owner);
    n.setPluginData('accessibleName',label||({locate:'定位当前位置',layers:'图层',settings:'设置'}[key])||key);
    n.setPluginData('interactionState','default; press-in feedback; valid release commits; cancel retains state');return n;
  }
  function flow(parent,name,w,gap=0) {return auto(frame(parent,name,w,1),'VERTICAL',gap,0,true);}
  function lineRow(parent,name,w,h,gap=8){return auto(frame(parent,name,w,h),'HORIZONTAL',gap);}
  function cell(parent,label,value,w,{stacked=true,color=C.ink,size=14}={}) {
    const n=flow(parent,label,w,2);
    if(stacked){text(n,label,w,12,18,C.secondary);text(n,value,w,size,20,color,'medium');}
    else {const r=lineRow(n,label,w,22,6);text(r,label,32,14,20,C.secondary);text(r,value,w-38,14,20,color);}
    return n;
  }
  // Two protected top regions: native system and WeChat chrome.
  const sys=frame(root,'System safe area',width,44,0,0,C.white);
  atText(sys,'9:41',24,13,64,14,20,C.ink,'medium');
  const battery=rect(sys,'System battery',width-44,17,22,10,C.white,2);battery.strokes=fill(C.ink);battery.strokeWeight=1;
  rect(sys,'System battery fill',width-42,19,16,6,C.ink,1);rect(sys,'System battery terminal',width-20,20,2,4,C.ink,1);
  const top=frame(root,'WeChat title and capsule safe area',width,44,0,44,C.white);
  atText(top,page==='map'?'今晚去观星':'我的',inset,9,width-128,16,24,C.ink,'medium');
  const capsule=frame(top,'Native WeChat capsule reference',86,30,width-98,7,C.white,15);capsule.strokes=fill(C.line);capsule.strokeWeight=1;
  icon(capsule,'ellipsis',20,C.ink).x=13;capsule.children[0].y=5;
  rect(capsule,'Capsule separator',44,7,1,16,C.line);
  const ring=figma.createEllipse();capsule.appendChild(ring);ring.resize(14,14);ring.x=58;ring.y=8;ring.fills=[];ring.strokes=fill(C.ink);ring.strokeWeight=1.5;
  const dot=figma.createEllipse();capsule.appendChild(dot);dot.resize(5,5);dot.x=62.5;dot.y=12.5;dot.fills=fill(C.ink);
  function navigation() {
    const bar=frame(root,'Map and My primary navigation',width,44,0,navY,C.white);
    rect(bar,'Navigation divider',0,0,width,1,C.line);
    const lane=auto(frame(bar,'Two destinations',width,44),'HORIZONTAL');
    for(const [key,label,glyph] of [['map','地图','map'],['my','我的','user-round']]) {
      const active=page===key;
      const n=control(lane,'nav-'+key,width/2,44,label,glyph,{owner:O.nav,color:active?C.sky:C.secondary,bg:active&&direction===1?C.skySoft:null});
      n.setPluginData('selected',String(active));
      if(active&&direction!==1)rect(bar,'Selected navigation indicator',key==='map'?width/4-12:width*3/4-12,0,24,2,C.sky,1);
    }
    const safe=frame(root,'Bottom safe area',width,34,0,height-34,C.white);rect(safe,'Home indicator',(width-120)/2,22,120,4,C.ink,2);
  }
  if(page==='map') {
    if(state!=='medium')throw Error('This initial round renders the requested medium state only');
    const map=frame(root,'Unmodified OSM reference',390,480,(width-390)/2,88);
    map.fills=[{type:'IMAGE',imageHash:mapImageHash,scaleMode:'FILL'}];map.clipsContent=true;
    map.setPluginData('source','https://www.openstreetmap.org/copyright');map.setPluginData('license','ODbL; external reference, not WEAPP or Tencent native-map evidence');
    const search=control(root,'search',width-24,44,'搜索观星点','search',{owner:O.map,color:C.secondary});search.x=12;search.y=98;
    const searchSurface=rect(root,'Search visible 40px surface',12,100,width-24,40,C.white,10);searchSurface.strokes=fill(C.line);searchSurface.strokeWeight=1;root.insertChild(root.children.indexOf(search),searchSurface);
    const locate=control(root,'locate',44,44,null,'locate-fixed',{owner:O.map,bg:C.white});locate.x=width-56;locate.y=156;
    const layers=control(root,'layers',44,44,null,'layers-3',{owner:O.map,bg:C.white});layers.x=width-56;layers.y=208;
    layers.setPluginData('transition','none | spot-panel | layer-sheet; opens exclusive three-choice layer sheet; LIGHT static');
    const marker=frame(root,'Selected formal marker',44,44,(width-390)/2+195-22,88+209-22);
    F.control(marker,'marker',O.map);marker.setPluginData('formalSpotId',fixture.spot.id);
    const pin=icon(marker,'map-pin',25,C.sky);pin.x=9.5;pin.y=7;
    const core=figma.createEllipse();marker.insertChild(0,core);core.resize(17,17);core.x=13.5;core.y=7;core.fills=fill(C.white);
    const attribution=frame(root,'OSM attribution',178,20,8,300,C.white,3);
    atText(attribution,'© OpenStreetMap 贡献者',5,1,168,12,18,C.secondary);
    const panelTop=322,panel=frame(root,'One retained spot document viewport',width,navY-panelTop,0,panelTop,C.white,16);panel.clipsContent=true;
    panel.setPluginData('extent','medium');panel.setPluginData('documentPolicy','Same ordered document in small, medium, large; only large scrolls; no media node for missing photo');
    const handle=frame(panel,'Handle-only drag target',80,44,(width-80)/2,0);
    F.control(handle,'handle',O.panel);handle.setPluginData('gesture','vertical drag threshold; tap is no-op; interrupt from live position');
    rect(handle,'Handle visible grip',27,10,26,3,C.strong,1.5);
    const viewport=frame(panel,'Document crop; large enables scroll',width,navY-60-panelTop-44,0,44);viewport.clipsContent=true;
    const doc=flow(viewport,'Single ordered objective document',inner,0);doc.x=inset;
    const identity=frame(doc,'Place identity',inner,direction===1?32:44);
    atText(identity,fixture.spot.name,0,0,direction===1?inner-94:inner,19,26,C.ink,'medium');
    atText(identity,fixture.spot.region,direction===1?inner-88:0,direction===1?7:27,direction===1?88:inner,12,18,C.secondary);
    if(direction===2)rect(identity,'Identity side rule',-8,3,2,20,C.skyEdge,1);
    const tabs=lineRow(doc,'Sticky section anchors',inner,44,10);
    for(const [key,label] of [['overview','概览'],['astronomy','天文']]) {
      const n=control(tabs,key,54,44,label,null,{color:key==='overview'?C.ink:C.secondary});
      n.setPluginData('transition','Resolve to large then align section in this same document; no content switching');
      if(key==='overview') {const underline=rect(tabs,'Selected overview underline',0,41,26,2,C.sky,1);underline.layoutPositioning='ABSOLUTE';underline.x=14;underline.y=41;}
    }
    const access=lineRow(doc,'Access and one route handoff',inner,44,8);access.counterAxisAlignItems='CENTER';
    const accessText=flow(access,'Opening fact',inner-90,0);
    if(direction===1) {text(accessText,'开放时间',inner-90,12,18,C.secondary);text(accessText,'待核实',inner-90,14,20,C.ink);}
    else {text(accessText,'开放时间待核实',inner-90,14,20,C.ink);}
    control(access,'route',82,44,'路线','navigation',{color:C.green});
    const facilities=lineRow(doc,'Facilities share one factual band',inner,36,12);
    if(direction===1)facilities.fills=fill(C.soft);
    for(const [label,glyph] of [['停车','car-front'],['厕所','toilet']]) {
      const col=lineRow(facilities,label,(inner-12)/2,36,6);col.counterAxisAlignItems='CENTER';
      if(direction!==1)icon(col,glyph,16,C.secondary);
      text(col,label+'待核实',(inner-12)/2-(direction===1?0:22),14,20,C.secondary);
    }
    const evidence=lineRow(doc,'Field and provenance drilldowns',inner,44,0);
    for(const [key,label] of [['field','场地资料'],['guides','观星攻略'],['source','数据来源']])control(evidence,key,inner/3,44,label,null,{color:C.secondary,size:14});
    rule(doc);
    const astronomy=frame(doc,'Astronomy section heading',inner,25);
    atText(astronomy,'天文信息',0,3,130,15,22,C.ink,'medium');atText(astronomy,fixture.updatedAt+' 更新',inner-92,5,92,12,18,C.secondary);
    const time=frame(doc,'One real discrete time slice',inner,44);
    F.control(time,'time',O.time);time.setPluginData('value',fixture.date+'T'+fixture.time);time.setPluginData('realSlices',JSON.stringify([fixture.time]));
    time.setPluginData('gesture','One supplied slice: min=max=current; no fabricated neighboring ticks; shared discrete ScrollView owner');
    atText(time,fixture.date,0,12,108,12,18,C.secondary);
    const timeLabel=atText(time,fixture.time,(inner-80)/2,1,80,17,24,C.sky,'medium');timeLabel.textAlignHorizontal='CENTER';
    rect(time,'Only real selected tick',inner/2-1,28,2,12,C.sky,1);
    const metrics=lineRow(doc,'Four related objective measures',inner,54,8);
    const values=[['总云量',fixture.spot.cloud+'%'],['气温',fixture.spot.temperature+'°C'],['风速',fixture.spot.wind+' m/s'],['月光影响',fixture.spot.moonImpact]];
    for(const [label,value] of values)cell(metrics,label,value,(inner-24)/4,{size:direction===2?15:16});
    // These remain in the same document below the medium crop, not another tab tree.
    const more=flow(doc,'Remaining astronomy evidence',inner,8);
    rule(more);text(more,'透明度、视宁度、光污染：暂无数据',inner,14,21,C.secondary);
    text(more,'日月升落、可见目标：暂无数据',inner,14,21,C.secondary);
    control(more,'astronomy-source',inner,44,'查看天文数据来源','info',{color:C.secondary});
    const actionLane=frame(panel,'Separate compact three-action pill',width-40,44,20,navY-panelTop-52);
    rect(actionLane,'Visible pill',0,6,width-40,32,C.soft,16);
    const actionFlow=lineRow(actionLane,'Three nonoverlapping action targets',width-40,44,0);
    for(const [key,label,glyph] of [['favorite','想去','star'],['share','分享','upload'],['sky','云观星','telescope']])control(actionFlow,key,(width-40)/3,44,label,glyph,{color:key==='sky'?C.sky:C.ink});
  } else if(page==='my') {
    if(state!=='normal')throw Error('This initial round renders the requested normal state only');
    const content=flow(root,'My account and existing responsibilities',inner,direction===1?16:12);content.x=inset;content.y=104;
    const account=frame(content,'Compact account header',inner,64);
    const avatar=icon(account,'neutral-avatar',36);avatar.x=0;avatar.y=8;
    atText(account,fixture.account.title,48,6,inner-100,18,25,C.ink,'medium');
    atText(account,fixture.account.identity,48,34,inner-100,12,18,C.secondary);
    const settings=control(account,'settings',44,44,null,'settings',{owner:O.my,color:C.secondary});settings.x=inner-44;settings.y=8;
    const utility=flow(content,'Plan and contribution shared utility group',inner,0);
    if(direction===1){utility.fills=fill(C.soft);utility.cornerRadius=12;utility.paddingLeft=utility.paddingRight=12;utility.paddingTop=utility.paddingBottom=8;}
    const uw=inner-(direction===1?24:0);
    function entry(key,label,glyph,color,bg,h,build) {
      const n=frame(utility,key,uw,h);F.control(n,key,O.my);n.setPluginData('accessibleName',label);n.setPluginData('interactionState','Opens existing recoverable child; back restores opener focus and scroll');
      if(direction===2)rect(n,'Section side rule',0,12,2,h-24,C.line,1);
      const tile=frame(n,'Role icon tile',28,28,direction===2?10:0,12,bg,8);const ic=icon(tile,glyph,17,color);ic.x=5.5;ic.y=5.5;
      const x=direction===2?48:40;
      atText(n,label,x,9,uw-x-24,15,22,C.ink,'medium');const arrow=icon(n,'chevron-right',16,C.secondary);arrow.x=uw-18;arrow.y=15;
      build(n,x,uw-x-24);return n;
    }
    if(direction===1) {
      utility.layoutMode='HORIZONTAL';utility.resize(inner,174);utility.primaryAxisSizingMode='FIXED';utility.counterAxisSizingMode='FIXED';utility.itemSpacing=20;
      const cw=(uw-20)/2;
      for(const [key,title,glyph,color,bg] of [['plan','今晚计划','calendar-days',C.green,C.greenSoft],['contribution','现场反馈与纠错','message-square-warning',C.gold,C.goldSoft]]) {
        const n=frame(utility,title,cw,158);F.control(n,key,O.my);n.setPluginData('accessibleName',title);
        const tile=frame(n,'Role icon tile',28,28,0,2,bg,8);const ic=icon(tile,glyph,17,color);ic.x=5.5;ic.y=5.5;
        atText(n,title,0,38,cw,15,22,C.ink,'medium');
        if(key==='plan') {
          atText(n,fixture.plan.date,0,66,cw,12,18,C.secondary);
          atText(n,fixture.plan.spotName,0,90,cw,14,21,C.ink);
          atText(n,fixture.plan.detail,0,115,cw,12,18,C.secondary);
        } else {
          atText(n,fixture.account.drafts+' 条草稿',0,67,cw,14,21,C.ink);
          atText(n,fixture.account.pending+' 条待审核',0,93,cw,14,21,C.secondary);
        }
      }
    } else {
    entry('plan','今晚计划','calendar-days',C.green,C.greenSoft,112,(n,x,w)=>{
      atText(n,fixture.plan.date,x,35,w,12,18,C.secondary);
      atText(n,fixture.plan.spotName,x,57,w,14,21,C.ink);
      atText(n,fixture.plan.detail,x,81,w,12,18,C.secondary);
    });
    rule(utility,uw);
    entry('contribution','现场反馈与纠错','message-square-warning',C.gold,C.goldSoft,80,(n,x,w)=>{
      if(direction===1){atText(n,fixture.account.drafts+' 条草稿',x,43,w/2,14,20,C.ink);atText(n,fixture.account.pending+' 条待审核',x+w/2,43,w/2,14,20,C.secondary);}
      else atText(n,fixture.account.drafts+' 条草稿  ·  '+fixture.account.pending+' 条待审核',x,42,w,14,21,C.secondary);
    });
    }
    const list=flow(content,'Routine content entries',inner,0);
    if(direction!==1)rule(list);
    function routine(key,label,summary,glyph,color,bg) {
      const n=frame(list,label,inner,76);F.control(n,key,O.my);n.setPluginData('accessibleName',label);n.setPluginData('interactionState','Opens existing recoverable child; no fabricated counters');
      const tile=frame(n,'Role icon tile',28,28,0,18,bg,8);const ic=icon(tile,glyph,17,color);ic.x=5.5;ic.y=5.5;
      atText(n,label,40,12,inner-64,15,22,C.ink,'medium');atText(n,summary,40,39,inner-64,14,21,C.secondary);
      const arrow=icon(n,'chevron-right',16,C.secondary);arrow.x=inner-18;arrow.y=28;
    }
    routine('profile-links','主页链接',fixture.account.profileLinks+' 条已保存','link',C.sky,C.skySoft);rule(list);
    routine('import','内容导入','导入自己的帖子并提交审核','file-up',C.secondary,C.soft);
    // No fabricated account statistics, duplicate gear row or Favorites destination.
  } else throw Error('Unknown page');
  navigation();
  root.setPluginData('round','round-0; awaiting actual PNG review');
  return root;
}
