/* Independent baseline A. Native Figma Plugin API; no production mutation. */
async function buildDesign({root,page,direction,width=390,height=844,mode='day',state,fonts,icons,mapImageHash,fixture}) {
  const C={white:'#ffffff',ink:'#282b29',secondary:'#5e655f',muted:'#6d746d',line:'#e2e5dd',soft:'#f6f7f5',violet:'#4859b8',vsoft:'#f5f6ff',green:'#1f6b45',gsoft:'#e9f8ee',gold:'#6f5500',goldsoft:'#fff7d6'};
  const OWN={map:'apps/wechat-miniapp/src/pages/map/index.tsx',panel:'apps/wechat-miniapp/src/pages/map/spot-panel.tsx',time:'apps/wechat-miniapp/src/pages/map/time-ruler.tsx',my:'apps/wechat-miniapp/src/features/my/my-library-page.tsx',nav:'apps/wechat-miniapp/src/components/custom-nav.tsx'};
  const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
  const fill=h=>[{type:'SOLID',color:rgb(h)}];
  let componentCount=0;
  root.resize(width,height); root.layoutMode='NONE'; root.clipsContent=true; root.fills=fill(C.white);
  root.setPluginData('baseline','A'); root.setPluginData('direction',String(direction));
  root.setPluginData('fixture','2026-09-07 / Shenzhen Observatory / non-live, non-personal');
  function frame(parent,name,w,h,bg=null,r=0,x=0,y=0){const n=figma.createFrame();parent.appendChild(n);n.name=name;n.resize(w,h);n.x=x;n.y=y;n.fills=bg?fill(bg):[];n.cornerRadius=r;n.clipsContent=false;return n;}
  function stack(parent,name,w,gap=0,bg=null,pad=0){const n=frame(parent,name,w,1,bg);n.layoutMode='VERTICAL';n.primaryAxisSizingMode='AUTO';n.counterAxisSizingMode='FIXED';n.itemSpacing=gap;n.paddingTop=n.paddingBottom=n.paddingLeft=n.paddingRight=pad;return n;}
  function row(parent,name,w,gap=8){const n=frame(parent,name,w,1);n.layoutMode='HORIZONTAL';n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='AUTO';n.itemSpacing=gap;n.counterAxisAlignItems='CENTER';return n;}
  function text(parent,s,w,size=15,line=22,color=C.ink,medium=false){const n=figma.createText();parent.appendChild(n);n.name=s;n.fontName=medium?fonts.medium:fonts.regular;n.fontSize=size;n.lineHeight={unit:'PIXELS',value:line};n.fills=fill(color);n.characters=s;n.resize(Math.max(1,w),line);n.textAutoResize='HEIGHT';return n;}
  function line(parent,w){return frame(parent,'分隔线',w,1,C.line);}
  function icon(parent,name,size=20){const source=({location:'map-pin',layers:'layers-3',calendar:'calendar-days',share:'send'})[name]||name;const svg=icons[`${source}-${mode}`]||icons[`${source}-day`]||icons[source];if(!svg)throw Error(`Missing shared icon ${source}-${mode}`);const n=figma.createNodeFromSvg(svg);parent.appendChild(n);n.name=`SemanticIcon / ${name}`;n.resize(size,size);return n;}
  function control(n,key,owner=OWN[page]){StarwardFigma.control(n,key,owner);return n;}
  function button(parent,key,label,glyph,w=80,{bg=null,color=C.ink,vertical=false,owner=OWN[page]}={}){
    const master=figma.createComponent();root.appendChild(master);master.name=`组件 / ${label||key}`;master.resize(w,44);master.x=width+64;master.y=componentCount++*70;master.fills=bg?fill(bg):[];master.cornerRadius=8;master.layoutMode=vertical?'VERTICAL':'HORIZONTAL';master.primaryAxisSizingMode='FIXED';master.counterAxisSizingMode='FIXED';master.primaryAxisAlignItems='CENTER';master.counterAxisAlignItems='CENTER';master.itemSpacing=vertical?1:7;
    if(glyph)icon(master,glyph,vertical?18:20);
    if(label){const labelWidth=Math.min(Math.max(28,label.length*14),Math.max(28,w-(glyph&&!vertical?36:8)));const t=text(master,label,labelWidth,key==='search'?16:14,key==='search'?23:20,color,key!=='search');t.textAlignHorizontal='CENTER';if(key==='search'){master.primaryAxisAlignItems='MIN';master.paddingLeft=12;master.paddingRight=12;t.resize(w-56,23);t.textAutoResize='HEIGHT';t.textAlignHorizontal='LEFT';}}
    if(key==='overview'){const selected=frame(master,'当前章节',24,2,C.violet,1);selected.layoutPositioning='ABSOLUTE';selected.x=(w-24)/2;selected.y=40;}
    const n=master.createInstance();parent.appendChild(n);control(n,key,owner);return n;
  }
  function at(n,x,y){n.x=x;n.y=y;return n;}
  function tinyTile(parent,glyph,bg){const n=frame(parent,glyph,32,32,bg,8);at(icon(n,glyph,20),6,6);return n;}
  // The OS and WeChat zones are outside the product information hierarchy.
  const sys=frame(root,'系统安全区',width,44,C.white);at(text(sys,'9:41',56,14,20,C.ink,true),22,12);
  const battery=frame(sys,'系统电量',23,11,null,3,width-43,17);battery.strokes=fill(C.ink);at(frame(battery,'电量',17,7,C.ink,1),2,2);frame(sys,'电量端点',2,5,C.ink,1,width-19,20);
  const shell=frame(root,'微信标题与胶囊',width,44,C.white,0,0,44);at(text(shell,page==='map'?'今晚去观星':'我的',200,18,25,C.ink,true),16,9);
  const capsule=frame(shell,'微信胶囊',86,30,null,15,width-98,7);capsule.strokes=fill(C.line);at(text(capsule,'•••',29,14,20,C.ink,true),10,3);frame(capsule,'胶囊分隔',1,16,C.line,0,45,7);const circle=figma.createEllipse();capsule.appendChild(circle);circle.resize(13,13);circle.x=59;circle.y=8;circle.fills=[];circle.strokes=fill(C.ink);circle.strokeWeight=2;
  const navY=height-78;
  function navigation(){const n=frame(root,'主导航 / 地图 · 我的',width,78,C.white,0,0,navY);line(n,width);const layout=direction===1?'HORIZONTAL':'VERTICAL';const w=(width-48)/2;const a=button(n,'nav-map','地图','map',w,{color:page==='map'?C.violet:C.secondary,vertical:layout==='VERTICAL',owner:OWN.nav});const b=button(n,'nav-my','我的','user',w,{color:page==='my'?C.violet:C.secondary,vertical:layout==='VERTICAL',owner:OWN.nav});at(a,24,2);at(b,width/2,2);frame(n,'当前页面指示',20,2,C.violet,1,(page==='map'?24:width/2)+(w-20)/2,47);frame(n,'底部系统指示',120,4,C.ink,2,(width-120)/2,65);}
  if(page==='map'){
    const image=frame(root,'公开 OSM 固定截图 · 未调色',390,480,null,0,(width-390)/2,88);image.fills=[{type:'IMAGE',imageHash:mapImageHash,scaleMode:'FILL'}];
    const search=button(root,'search','搜索观星点','search',width-24,{bg:C.white,owner:OWN.map});at(search,12,96);search.cornerRadius=12;search.strokes=fill(C.line);
    const marker=frame(root,'深圳市天文台 / 已选正式点',24,28,C.vsoft,12,width/2-12,88+209-28);marker.strokes=fill('#8799f6');marker.strokeWeight=2;at(icon(marker,'location',16),4,4);
    const panelH=Math.max(320,Math.min(480,(navY-88)*.56));const panelY=Math.round(navY-panelH);
    const locate=button(root,'locate','','locate-fixed',44,{bg:C.white,owner:OWN.map});at(locate,width-56,panelY-142);
    const layers=button(root,'layers','','layers',44,{bg:C.white,owner:OWN.map});at(layers,width-56,panelY-92);
    const legal=frame(root,'地图版权',190,20,C.white,3,12,panelY-25);at(text(legal,'© OpenStreetMap 贡献者',182,12,18,C.secondary),4,1);legal.setPluginData('license','ODbL; https://www.openstreetmap.org/copyright');
    const panel=frame(root,'地点面板 / 同一文档 viewport',width,panelH,C.white,18,0,panelY);panel.bottomLeftRadius=0;panel.bottomRightRadius=0;panel.clipsContent=true;
    const handle=frame(panel,'仅把手拖拽；tap 无操作',60,44,null,0,(width-60)/2,0);control(handle,'handle',OWN.panel);frame(handle,'把手',28,3,'#8a9088',2,16,11);
    const contentViewport=frame(panel,'medium 裁切 · large 才可滚动',width,panelH-106,null,0,0,44);contentViewport.clipsContent=true;contentViewport.setPluginData('scroll','medium=disabled; large=vertical; retained-document');
    const doc=stack(contentViewport,'地点连续文档',width,0);const inset=16,inner=width-32;
    const identity=stack(doc,'地点身份',width,3,null,inset);identity.paddingTop=0;identity.paddingBottom=0;
    if(direction===2){const ir=row(identity,'地点身份并列',inner,10);tinyTile(ir,'location',C.gsoft);const copy=stack(ir,'身份文字',inner-42,2);text(copy,'深圳市天文台',inner-42,20,28,C.ink,true);text(copy,'深圳 · 大鹏',inner-42,14,21,C.secondary);}else{text(identity,'深圳市天文台',inner,20,28,C.ink,true);text(identity,'深圳 · 大鹏',inner,14,21,C.secondary);}
    const rail=row(doc,'同一文档的章节定位',width,0);rail.paddingLeft=16;rail.paddingRight=16;
    const ov=button(rail,'overview','概览',null,60,{owner:OWN.panel});const astro=button(rail,'astronomy','天文',null,60,{color:C.secondary,owner:OWN.panel});
    const basics=stack(doc,'基本信息',width,direction===1?0:10,null,16);basics.paddingTop=0;basics.paddingBottom=12;
    if(direction===0){
      const access=row(basics,'开放与路线',inner,8);const cp=stack(access,'开放说明',inner-84,1);text(cp,'开放时间待核实',inner-84,15,22,C.ink,true);text(cp,'夜间进入条件暂无数据',inner-84,14,21,C.secondary);button(access,'route','路线','navigation',76,{color:C.green,owner:OWN.panel});
      line(basics,inner);const fac=row(basics,'设施事实',inner,12);for(const s of ['停车待核实','厕所待核实']){const c=stack(fac,s,(inner-12)/2,1);text(c,s,(inner-12)/2,15,22);text(c,'暂无数据',(inner-12)/2,14,21,C.secondary);}
    }else if(direction===1){
      for(const [l,v] of [['开放时间','待核实'],['停车 / 厕所','待核实']]){const r=row(basics,l,inner,8);r.paddingTop=6;r.paddingBottom=6;text(r,l,110,15,22,C.secondary);text(r,v,inner-118,15,22);line(basics,inner);}
      const r=row(basics,'夜间进入与路线',inner,8);text(r,'夜间进入条件暂无数据',inner-84,14,21,C.secondary);button(r,'route','路线','navigation',76,{color:C.green,owner:OWN.panel});
    }else{
      const r=row(basics,'到达与路线',inner,8);text(r,'到达与开放',inner-84,16,23,C.ink,true);button(r,'route','路线','navigation',76,{color:C.green,owner:OWN.panel});
      text(basics,'开放时间待核实，夜间进入条件暂无数据。',inner,15,22);const r2=row(basics,'设施并列',inner,16);text(r2,'停车待核实',(inner-16)/2,15,22,C.secondary);text(r2,'厕所待核实',(inner-16)/2,15,22,C.secondary);
    }
    const evidence=row(basics,'场地资料与来源',inner,8);button(evidence,'field','场地资料',null,100,{owner:OWN.panel});button(evidence,'source','数据来源',null,100,{owner:OWN.panel});
    const astronomy=stack(doc,'天文信息',width,8,null,16);text(astronomy,'天文信息',inner,16,23,C.ink,true);
    const ruler=frame(astronomy,'弧形时间尺 / 真实离散切片',inner,82);control(ruler,'time',OWN.time);at(text(ruler,'9月7日 · 21:00',inner,18,25,C.violet,true),0,0).textAlignHorizontal='CENTER';
    for(let i=-8;i<=8;i++){const u=Math.abs(i)/8;frame(ruler,`${21+i*.5} 时切片`,i===0?2:1,16-10*u,i===0?C.violet:'#8a9088',1,inner/2+i*17,35+10*Math.pow(u,1.5));}
    at(text(ruler,'19:00',50,12,18,C.secondary),inner/2-85,62);at(text(ruler,'23:00',50,12,18,C.secondary),inner/2+50,62);
    const metrics=row(astronomy,'天气共享指标',inner,12);for(const [l,v] of [['总云量','24%'],['气温','26°C'],['风速','2.4m/s']]){const c=stack(metrics,l,(inner-24)/3,2);text(c,l,(inner-24)/3,14,21,C.secondary);text(c,v,(inner-24)/3,18,25,C.ink,true);}
    text(astronomy,'月光影响较弱',inner,15,22);text(astronomy,'20:40 更新',inner,12,18,C.secondary);text(astronomy,'透明度、视宁度与光污染暂无数据',inner,14,21,C.secondary);
    const actions=frame(panel,'固定行动栏',width,46,C.white,0,0,panelH-46);const actionRow=row(actions,'想去 · 分享 · 云观星',width-40,0);at(actionRow,20,0);actionRow.fills=fill(C.soft);actionRow.cornerRadius=22;for(const [key,label,glyph] of [['favorite','想去','star'],['share','分享','share'],['sky','云观星','compass']])button(actionRow,key,label,glyph,(width-40)/3,{color:key==='sky'?C.violet:C.ink,owner:OWN.panel});
  }else{
    const content=stack(root,'账户与内容',width,18,null,16);at(content,0,108);content.paddingTop=0;
    const account=row(content,'紧凑账户 / 单一设置',width-32,12);const av=frame(account,'当前身份头像',40,40,C.vsoft,20);at(icon(av,'user',22),9,9);const cp=stack(account,'账户信息',width-32-52-56,2);text(cp,'账户与内容',cp.width,18,25,C.ink,true);text(cp,'当前微信身份',cp.width,14,21,C.secondary);button(account,'settings','','settings',44);
    function entry(parent,key,title,sub,glyph,{bg=null,compact=false}={}){const n=stack(parent,title,parent.width-(parent.paddingLeft||0)-(parent.paddingRight||0),compact?5:9,bg,bg?12:0);n.cornerRadius=12;control(n,key,OWN.my);n.minHeight=44;const inside=n.width-(bg?24:0);const r=row(n,title+'入口',inside,10);tinyTile(r,glyph,key==='plan'?C.gsoft:C.vsoft);const titleW=inside-68;text(r,title,titleW,16,23,C.ink,true);icon(r,'chevron-right',16);text(n,sub,inside,14,21,C.secondary);return n;}
    if(direction===0){
      const group=stack(content,'计划与反馈共享区域',width-32,12,C.soft,12);group.cornerRadius=12;
      const plan=entry(group,'plan','今晚计划','2026-09-07 · 深圳市天文台\n地点与出发准备','calendar');
      line(group,group.width-24);entry(group,'contribution','现场反馈与纠错','1条草稿 · 2条待审核','images',{compact:true});
      const routine=stack(content,'内容管理',width-32,12);entry(routine,'profile-links','主页链接','2条已保存','link',{compact:true});line(routine,width-32);entry(routine,'import','内容导入','导入自己的帖子并提交审核','download',{compact:true});
    }else if(direction===1){
      const group=stack(content,'计划与反馈共享区域',width-32,12,C.soft,12);group.cornerRadius=12;
      const duo=row(group,'计划与反馈双栏',width-56,12);duo.counterAxisAlignItems='MIN';
      const left=stack(duo,'今晚计划',Math.floor((width-81)/2),7);control(left,'plan',OWN.my);tinyTile(left,'calendar',C.gsoft);text(left,'今晚计划',left.width,16,23,C.ink,true);text(left,'2026-09-07',left.width,12,18,C.secondary);text(left,'深圳市天文台',left.width,15,22);text(left,'地点与出发准备',left.width,14,21,C.secondary);
      frame(duo,'共享区域分隔',1,145,C.line);const right=stack(duo,'现场反馈与纠错',Math.floor((width-81)/2),7);control(right,'contribution',OWN.my);tinyTile(right,'images',C.vsoft);text(right,'现场反馈与纠错',right.width,16,23,C.ink,true);text(right,'1条草稿',right.width,15,22);text(right,'2条待审核',right.width,15,22,C.secondary);
      for(const [key,label,sub,glyph] of [['profile-links','主页链接','2条已保存','link'],['import','内容导入','导入自己的帖子并提交审核','download']]){const n=entry(content,key,label,sub,glyph,{compact:true});line(n,n.width);}
    }else{
      const group=stack(content,'计划与内容连续清单',width-32,0);
      for(const [key,title,sub,glyph] of [['plan','今晚计划','2026-09-07 · 深圳市天文台\n地点与出发准备','calendar'],['contribution','现场反馈与纠错','1条草稿 · 2条待审核','images'],['profile-links','主页链接','2条已保存','link'],['import','内容导入','导入自己的帖子并提交审核','download']]){const n=row(group,title,group.width,12);n.paddingTop=n.paddingBottom=14;control(n,key,OWN.my);tinyTile(n,glyph,key==='plan'?C.gsoft:C.vsoft);const c=stack(n,title+'信息',group.width-72,4);text(c,title,c.width,16,23,C.ink,true);text(c,sub,c.width,14,21,C.secondary);icon(n,'chevron-right',16);line(group,group.width);}
    }
  }
  navigation();
  return {rootId:root.id,direction,page,visibleTime:page!=='map',state:state|| (page==='map'?'medium':'normal')};
}
