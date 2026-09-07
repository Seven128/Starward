/* Experiment 3, independent A. Public Figma Plugin API only. */
async function buildDesign({ root, page, direction, width, height, mode, state, fonts, icons, mapImageHash, fixture }) {
  if (!['map', 'my'].includes(page) || ![0, 1, 2].includes(direction)) throw Error('Unsupported page/direction');
  if (mode !== 'day') throw Error('This initial candidate covers day only');
  if (!fonts.regular || !fonts.medium) throw Error('Loaded Noto Sans SC Regular and Medium are required');
  const C = { ink:'#282b29', sub:'#5e655f', faint:'#6d746d', line:'#e2e5dd', edge:'#8a9088', white:'#ffffff', neutral:'#f6f7f5', sky:'#4859b8', skySoft:'#f5f6ff', skyLine:'#8799f6', green:'#1f6b45', greenSoft:'#e9f8ee', gold:'#6f5500', goldSoft:'#fff7d6' };
  const O = { map:'apps/wechat-miniapp/src/pages/map/index.tsx', panel:'apps/wechat-miniapp/src/pages/map/spot-panel.tsx', time:'apps/wechat-miniapp/src/pages/map/time-ruler.tsx', my:'apps/wechat-miniapp/src/features/my/my-library-page.tsx', nav:'apps/wechat-miniapp/src/components/custom-nav.tsx' };
  const names = ['清晰分区', '资料索引', '连续清单'];
  const inset = direction === 1 ? 18 : 16;
  const w = width - inset * 2;
  const rgb = hex => ({ r:parseInt(hex.slice(1,3),16)/255, g:parseInt(hex.slice(3,5),16)/255, b:parseInt(hex.slice(5,7),16)/255 });
  const fill = hex => [{type:'SOLID',color:rgb(hex)}];
  root.resize(width,height); root.layoutMode = 'NONE'; root.clipsContent = true; root.fills = fill(C.white);
  root.name = names[direction] + ' · ' + (page === 'map' ? '地图' : '我的');
  root.setPluginData('candidateScope','day; initial 390x844; medium/normal; not runtime validation');
  root.setPluginData('fixture',JSON.stringify(fixture));
  function box(p,name,ww,hh,bg=null,r=0) { const n=figma.createFrame(); p.appendChild(n); n.name=name; n.resize(ww,hh); n.fills=bg?fill(bg):[]; n.clipsContent=false; n.cornerRadius=r; return n; }
  function at(n,x,y) { n.x=x; n.y=y; return n; }
  function rect(p,name,ww,hh,bg,r=0) { const n=figma.createRectangle(); p.appendChild(n); n.name=name; n.resize(ww,hh); n.fills=fill(bg); n.cornerRadius=r; return n; }
  function text(p,str,ww,size=14,line=21,weight='regular',color=C.ink) { const n=figma.createText(); p.appendChild(n); n.name=str; n.fontName=fonts[weight]; n.fontSize=size; n.lineHeight={unit:'PIXELS',value:line}; n.letterSpacing={unit:'PIXELS',value:0}; n.characters=String(str); n.fills=fill(color); n.resize(Math.max(1,ww),line); n.textAutoResize='HEIGHT'; return n; }
  function stack(p,name,ww,gap=0,pad=0,bg=null,r=0) { const n=box(p,name,ww,1,bg,r); n.layoutMode='VERTICAL'; n.primaryAxisSizingMode='AUTO'; n.counterAxisSizingMode='FIXED'; n.itemSpacing=gap; n.paddingLeft=n.paddingRight=n.paddingTop=n.paddingBottom=pad; return n; }
  function row(p,name,ww,gap=8,pad=0,bg=null,r=0,min=0) { const n=box(p,name,ww,1,bg,r); n.layoutMode='HORIZONTAL'; n.primaryAxisSizingMode='FIXED'; n.counterAxisSizingMode='AUTO'; n.counterAxisAlignItems='CENTER'; n.itemSpacing=gap; n.paddingLeft=n.paddingRight=n.paddingTop=n.paddingBottom=pad; n.minHeight=min > 0 ? min : null; return n; }
  function line(p,ww) { return rect(p,'分隔线',ww,1,C.line); }
  function control(n,key,owner=O.panel,role='button') { StarwardFigma.control(n,key,owner); n.setPluginData('role',role); n.setPluginData('accessibleName',n.name); return n; }
  const library=at(box(root,'可编辑组件源',width,2000),width+80,0);
  const iconCache={}; let libY=0;
  function icon(p,key,size=18,color=C.ink) {
    const cacheKey=[key,size,color].join('/');
    if (!iconCache[cacheKey]) {
      const sourceKey=icons[key+'-day'] ? key+'-day' : key;
      if (!icons[sourceKey]) throw Error('Missing shared icon '+key);
      const comp=figma.createComponent(); library.appendChild(comp); comp.name='SemanticIcon / '+cacheKey; comp.resize(size,size); comp.fills=[]; comp.y=libY; libY+=size+8;
      const svg=icons[sourceKey].replace(/currentColor/g,color);
      const art=figma.createNodeFromSvg(svg); comp.appendChild(art); art.resize(size,size); art.name=sourceKey;
      comp.setPluginData('assetKey',sourceKey); iconCache[cacheKey]=comp;
    }
    const n=iconCache[cacheKey].createInstance(); p.appendChild(n); return n;
  }
  function iconButton(p,key,glyph,owner=O.map) { const n=control(box(p,key,44,44),key,owner); const v=at(box(n,'紧凑可视底板',32,32,C.white,direction===1?6:10),6,6); v.strokes=fill(C.line); v.strokeWeight=1; at(icon(v,glyph,18),7,7); return n; }
  function pill(p,key,label,glyph,ww,color=C.ink,bg=null,owner=O.panel) { const n=control(box(p,label,ww,44),key,owner); if(bg) at(box(n,'可视面',ww,32,bg,16),0,6); const content=row(n,'图文',ww,6); content.primaryAxisAlignItems='CENTER'; at(content,0,12); if(glyph) icon(content,glyph,18,color); text(content,label,label.length*14,14,20,'medium',color); return n; }
  function chevron(p) { return icon(p,'chevron-right',16,C.faint); }
  function fact(p,label,value,ww,color=C.ink) { const n=stack(p,label,ww,3); text(n,label,ww,12,18,'regular',C.sub); text(n,value,ww,14,21,'regular',color); return n; }

  // Platform reservation: 44 px status area, 44 px WeChat title area.
  function shell() {
    const top=at(box(root,'系统与微信顶部区域',width,88,C.white),0,0);
    at(text(top,'9:41',50,14,20,'medium'),24,13);
    for(let j=0;j<4;j++) at(rect(top,'系统信号',3,4+j*2,C.ink,1),width-73+j*5,24-j*2);
    const battery=at(box(top,'系统电池',23,11),width-42,17); battery.strokes=fill(C.ink); battery.strokeWeight=1; battery.cornerRadius=2; at(rect(battery,'电量',17,7,C.ink,1),2,2); at(rect(top,'电池端点',2,5,C.ink,1),width-17,20);
    at(text(top,page==='map'?'今晚去观星':'我的',width-124,16,24,'medium'),16,54);
    const capsule=at(box(top,'微信菜单胶囊',84,30,C.white,16),width-100,51); capsule.strokes=fill(C.line); capsule.strokeWeight=1;
    at(icon(capsule,'ellipsis',20),12,5); at(rect(capsule,'系统胶囊分隔',1,16,C.line),43,7); const dot=figma.createEllipse(); capsule.appendChild(dot); dot.resize(14,14); dot.fills=[]; dot.strokes=fill(C.ink); dot.strokeWeight=1.5; at(dot,57,8); const core=figma.createEllipse(); capsule.appendChild(core); core.resize(5,5); core.fills=fill(C.ink); at(core,61.5,12.5);
  }
  const navY=height-78;
  function navigation() {
    const n=at(box(root,'主导航',width,78,C.white),0,navY); at(rect(n,'导航上边界',width,1,C.line),0,0);
    ['地图','我的'].forEach((label,i)=>{ const active=(page==='map'?0:1)===i; const half=width/2; const hit=control(at(box(n,label,half,44),i*half,1),'nav-'+(i===0?'map':'my'),O.nav); const c=row(hit,'导航图文',half,8); c.primaryAxisAlignItems='CENTER'; at(c,0,12); icon(c,i===0?'map':'user-round',19,active?C.sky:C.sub); text(c,label,28,14,20,active?'medium':'regular',active?C.sky:C.sub); if(active) at(rect(hit,'当前位置指示',20,2,C.sky,1),(half-20)/2,40); hit.setPluginData('selected',String(active)); });
    at(rect(n,'底部系统指示',112,4,C.ink,2),(width-112)/2,64);
  }

  if(page==='map') {
    const map=at(rect(root,'OSM 公共参考 · 原图固定裁切',390,480,C.white),0,88); map.fills=[{type:'IMAGE',imageHash:mapImageHash,scaleMode:'FILL'}];
    map.setPluginData('source','https://www.openstreetmap.org/copyright'); map.setPluginData('license','ODbL; external map reference, not Tencent native map verification');
    const mapTop=88, pointX=195, pointY=209;
    const mark=at(box(root,'已选正式点位',24,30),pointX-12,mapTop+pointY-30);
    const core=figma.createEllipse(); mark.appendChild(core); core.resize(22,22); core.fills=fill(C.skySoft); core.strokes=fill(C.sky); core.strokeWeight=2; at(core,1,0); at(icon(mark,'map-pin',12,C.sky),6,5); at(rect(mark,'地点锚点',2,8,C.sky,1),11,22);
    mark.setPluginData('formalSpot',fixture.spot.id); mark.setPluginData('referenceAnchor','195,209');
    shell();
    const search=control(at(box(root,'搜索观星点',width-24,44),12,96),'search',O.map);
    const sv=at(box(search,'搜索可视面',width-24,36,C.white,direction===1?7:10),0,4); sv.strokes=fill(C.line); sv.strokeWeight=1; at(icon(sv,'search',18,C.sub),12,9); at(text(sv,'搜索观星点',width-80,14,20,'regular',C.sub),40,8);
    at(iconButton(root,'locate','locate-fixed'),width-56,157); at(iconButton(root,'layers','layers-3'),width-56,205);
    const panelY=navY-430;
    const attribution=at(box(root,'地图版权归属',192,18,C.white,3),12,panelY-24); at(text(attribution,'© OpenStreetMap 贡献者',188,12,18,'regular',C.sub),2,0);
    const panel=at(box(root,'地点信息面板 · 同一文档',width,430,C.white,direction===1?12:18),0,panelY); panel.clipsContent=true; panel.setPluginData('extent',state||'medium'); panel.setPluginData('presentationOwner','none | spot-panel | layer-sheet');
    const handle=control(at(box(panel,'拖动把手；轻点无动作',64,44),(width-64)/2,0),'handle',O.panel,'adjustable'); at(rect(handle,'把手',28,3,C.edge,2),18,14); handle.setPluginData('tap','no-op'); handle.setPluginData('gesture','handle-only drag; no body drag');
    const viewport=at(box(panel,'medium 文档裁切；large 唯一纵向滚动',width,328),0,44); viewport.clipsContent=true;
    const doc=stack(viewport,'地点连续文档',width,0); doc.setPluginData('extentInvariant','same identity and order for small/medium/large; clipping only');
    const identity=stack(doc,'地点身份',width,3); identity.paddingLeft=identity.paddingRight=inset; identity.paddingBottom=8;
    if(direction===1) { const idrow=row(identity,'身份同行',w,10); text(idrow,fixture.spot.name,w-88,20,28,'medium'); const region=text(idrow,fixture.spot.region,78,12,18,'regular',C.sub); region.textAlignHorizontal='RIGHT'; }
    else { text(identity,fixture.spot.name,w,20,28,'medium'); text(identity,fixture.spot.region,w,12,18,'regular',C.sub); }
    const tabs=row(doc,'同一文档章节定位',width,12); tabs.paddingLeft=tabs.paddingRight=inset;
    ['概览','天文'].forEach((s,i)=>{ const t=control(box(tabs,s,48,44),i===0?'overview':'astronomy'); at(text(t,s,48,14,20,i===0?'medium':'regular',i===0?C.ink:C.sub),0,10); if(!i) at(rect(t,'当前章节',22,2,C.sky,1),0,38); t.setPluginData('activation','resolve large, align section in same scroll owner'); });
    line(doc,width);
    const body=stack(doc,'概览',width,direction===2?5:8); body.paddingLeft=body.paddingRight=inset; body.paddingTop=8;
    const arrival=control(row(body,'路线与到达',w,10,0,null,0,44),'route',O.panel); icon(arrival,'navigation',18,C.green); const arrivalText=stack(arrival,'到达事实',w-116,0); text(arrivalText,'路线与到达',w-116,14,21,'medium'); text(arrivalText,'距离暂无数据',w-116,12,18,'regular',C.sub); text(arrival,'导航',44,14,20,'medium',C.green); chevron(arrival);
    if(direction===0) {
      const access=stack(body,'开放情况',w,3,10,C.neutral,7); text(access,'开放时间待核实',w-20,14,21,'medium'); text(access,'夜间能否进入暂无数据',w-20,14,21,'regular',C.sub);
      const facilities=row(body,'设施事实',w,20); fact(facilities,'停车',fixture.spot.facilities,(w-20)/2); fact(facilities,'厕所',fixture.spot.facilities,(w-20)/2);
    } else if(direction===1) {
      const access=row(body,'开放',w,12); text(access,'开放',52,12,18,'regular',C.sub); const val=stack(access,'开放详情',w-64,2); text(val,'开放时间待核实',w-64,14,21,'medium'); text(val,'夜间能否进入暂无数据',w-64,14,21,'regular',C.sub);
      const facilities=row(body,'设施',w,12); text(facilities,'设施',52,12,18,'regular',C.sub); text(facilities,'停车待核实 · 厕所待核实',w-64,14,21);
    } else {
      const access=row(body,'开放事实',w,10); icon(access,'clock-3',18,C.sub); const ac=stack(access,'开放详情',w-28,2); text(ac,'开放时间待核实',w-28,14,21,'medium'); text(ac,'夜间能否进入暂无数据',w-28,14,21,'regular',C.sub);
      const facilities=row(body,'设施事实',w,10); icon(facilities,'car-front',18,C.sub); text(facilities,'停车待核实',Math.floor((w-66)/2),14,21); icon(facilities,'toilet',18,C.sub); text(facilities,'厕所待核实',Math.floor((w-66)/2),14,21);
    }
    const support=row(body,'资料与纠错入口',w,0); const sw=w/3;
    [['地点资料','field'],['反馈纠错','spot-contribution'],['数据来源','source']].forEach(([s,k])=>pill(support,k,s,null,sw,C.sub));
    line(body,w);
    const astro=stack(body,'天文信息',w,8); astro.paddingTop=direction===1?0:8;
    text(astro,'天文信息',w,16,23,'medium');
    const time=control(stack(astro,'所选日期与时间',w,5),'time',O.time,'adjustable');
    text(time,fixture.date+' · '+fixture.time,w,16,24,'medium',C.sky);
    const ticks=row(time,'真实切片尚未提供',w,0); ticks.minHeight=20;
    text(ticks,'时间切片暂无数据',w,12,18,'regular',C.sub);
    time.setPluginData('timeline','No slices supplied by fixture; do not fabricate ruler ticks. Selected time supplied.');
    const metrics=row(astro,'同一时刻客观指标',w,10); const mw=(w-20)/3;
    fact(metrics,'总云量',fixture.spot.cloud+'%',mw); fact(metrics,'气温',fixture.spot.temperature+'°C',mw); fact(metrics,'风速',fixture.spot.wind+' m/s',mw);
    const moon=row(astro,'月光影响',w,8); icon(moon,'moon-star',18,C.sub); text(moon,'月光影响'+fixture.spot.moonImpact,w-26,14,21);
    text(astro,'透明度、视宁度、光污染暂无数据',w,14,21,'regular',C.sub);
    text(astro,'月相、日月升落、可见目标暂无数据',w,14,21,'regular',C.sub);
    text(astro,'更新于 '+fixture.updatedAt,w,12,18,'regular',C.sub);
    pill(astro,'astronomy-source','查看数据来源','file-search',w,C.sub);
    const lane=at(box(panel,'底部独立操作区',width,58,C.white),0,372);
    const actions=at(box(lane,'三项操作可视胶囊',width-40,32,direction===1?C.white:C.neutral,16),20,10); if(direction===1) { actions.strokes=fill(C.line); actions.strokeWeight=1; }
    const aw=(width-40)/3;
    [['favorite','想去','star'],['share','分享','send'],['sky','云观星','telescope']].forEach(([k,l,g],i)=>at(pill(lane,k,l,g,aw,k==='sky'?C.sky:C.ink,null),20+i*aw,4));
    root.setPluginData('coverage','medium shows identity, overview, access, facilities and document entries; astronomy and time retained below crop; layers closed; native drag and navigation unverified');
  } else {
    shell();
    const main=at(stack(root,'账户与内容',width,0),0,104); main.paddingLeft=main.paddingRight=inset;
    const account=row(main,'紧凑账户',w,10,0,null,0,60);
    const avatar=box(account,'账户头像',36,36,C.neutral,direction===1?9:18); at(icon(avatar,'user-round',20,C.sub),8,8);
    const accountCopy=stack(account,'账户身份',w-110,2); text(accountCopy,fixture.account.title,w-110,18,26,'medium'); text(accountCopy,fixture.account.identity,w-110,12,18,'regular',C.sub);
    const gear=control(box(account,'设置',44,44),'settings',O.my); at(icon(gear,'settings',20,C.ink),12,12);
    const gap=box(main,'账户与内容间距',w,direction===1?20:16);
    const planDate=fixture.plan.date;
    function tile(p,glyph,color,soft) { const n=box(p,'语义图标',28,28,soft,direction===1?6:9); at(icon(n,glyph,16,color),6,6); return n; }
    function routine(p,key,label,subtitle,glyph,color,soft,style=0) {
      const n=control(row(p,label,w,10,0,null,0,style===2?66:60),key,O.my); tile(n,glyph,color,soft); const copy=stack(n,'入口文字',w-64,3); text(copy,label,w-64,14,21,'medium'); text(copy,subtitle,w-64,12,18,'regular',C.sub); chevron(n); return n;
    }
    if(direction===0) {
      const utility=stack(main,'计划与反馈共享分区',w,0); line(utility,w);
      const plan=control(row(utility,'今晚计划',w,10,0,null,0,108),'plan',O.my); tile(plan,'calendar-days',C.sky,C.skySoft); const pc=stack(plan,'计划信息',w-64,4); const pr=row(pc,'日期行',w-64,6); text(pr,'今晚计划',80,14,21,'medium'); text(pr,planDate,w-150,12,18,'regular',C.sub); text(pc,fixture.plan.spotName,w-64,16,24,'medium'); text(pc,fixture.plan.detail,w-64,12,18,'regular',C.sub); chevron(plan);
      line(utility,w); routine(utility,'contribution','现场反馈与纠错',fixture.account.drafts+' 条草稿 · '+fixture.account.pending+' 条待审核','clipboard-check',C.green,C.greenSoft); line(utility,w);
      box(main,'内容组间距',w,22);
      routine(main,'profile-links','主页链接',fixture.account.profileLinks+' 条已保存','link',C.sky,C.skySoft); line(main,w);
      routine(main,'import','内容导入','导入自己的帖子并提交审核','file-up',C.gold,C.goldSoft); line(main,w);
    } else if(direction===1) {
      const shared=stack(main,'计划与贡献索引',w,0); line(shared,w);
      const plan=control(row(shared,'今晚计划',w,14,0,null,0,110),'plan',O.my);
      const label=stack(plan,'索引列',70,8); tile(label,'calendar-days',C.sky,C.skySoft); text(label,'今晚计划',70,14,21,'medium');
      const data=stack(plan,'计划正文',w-114,3); text(data,planDate,w-114,12,18,'regular',C.sub); text(data,fixture.plan.spotName,w-114,16,24,'medium'); text(data,fixture.plan.detail,w-114,12,18,'regular',C.sub); chevron(plan); line(shared,w);
      const contribution=control(row(shared,'现场反馈与纠错',w,14,0,null,0,90),'contribution',O.my); const label2=stack(contribution,'索引列',70,6); tile(label2,'clipboard-check',C.green,C.greenSoft); text(label2,'现场反馈\n与纠错',70,14,21,'medium'); const status=stack(contribution,'真实审核状态',w-114,4); text(status,fixture.account.drafts+' 条草稿',w-114,14,21); text(status,fixture.account.pending+' 条待审核',w-114,12,18,'regular',C.sub); chevron(contribution); line(shared,w);
      box(main,'内容组间距',w,20);
      [['profile-links','主页链接',fixture.account.profileLinks+' 条已保存','link',C.sky,C.skySoft],['import','内容导入','导入自己的帖子\n并提交审核','file-up',C.gold,C.goldSoft]].forEach(([k,l,s,g,c,b])=>{ const n=control(row(main,l,w,14,0,null,0,76),k,O.my); const lead=stack(n,'索引列',70,6); tile(lead,g,c,b); text(lead,l,70,14,21,'medium'); text(n,s,w-114,12,18,'regular',C.sub); chevron(n); line(main,w); });
    } else {
      const utilities=stack(main,'计划与反馈共享表面',w,0,12,C.neutral,10); const iw=w-24;
      const plan=control(row(utilities,'今晚计划',iw,10,0,null,0,94),'plan',O.my); const rail=box(plan,'计划文字组',iw-26,1); rail.layoutMode='VERTICAL'; rail.primaryAxisSizingMode='AUTO'; rail.counterAxisSizingMode='FIXED'; rail.itemSpacing=4; const pl=row(rail,'计划标签',iw-26,7); icon(pl,'calendar-days',16,C.sky); text(pl,'今晚计划 · '+planDate,iw-49,12,18,'medium',C.sub); text(rail,fixture.plan.spotName,iw-26,16,24,'medium'); text(rail,fixture.plan.detail,iw-26,12,18,'regular',C.sub); chevron(plan);
      line(utilities,iw);
      const contribution=control(row(utilities,'现场反馈与纠错',iw,10,0,null,0,68),'contribution',O.my); tile(contribution,'clipboard-check',C.green,C.greenSoft); const cc=stack(contribution,'反馈状态',iw-64,3); text(cc,'现场反馈与纠错',iw-64,14,21,'medium'); text(cc,fixture.account.drafts+' 条草稿 · '+fixture.account.pending+' 条待审核',iw-64,12,18,'regular',C.sub); chevron(contribution);
      box(main,'内容组间距',w,18);
      routine(main,'profile-links','主页链接',fixture.account.profileLinks+' 条已保存','link',C.sky,C.skySoft,2); line(main,w);
      routine(main,'import','内容导入','导入自己的帖子并提交审核','file-up',C.gold,C.goldSoft,2); line(main,w);
    }
    root.setPluginData('coverage','account/settings, plan, true fixture draft and review state, links, import; no duplicate settings or favorite browser');
  }
  navigation();
  return root;
}
