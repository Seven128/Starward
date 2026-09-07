/* Standard Figma Plugin API. Paste this source before a task-specific script.
 * No page renderer, transport, remote-tool extensions, or transaction claim. */
var StarwardFigma = (() => {
  const ownerKey = 'starward-resource-owner';
  let uiIdentity = null;
  // Public plugins cannot read figma.fileKey. The browser executor must freshly
  // inspect its URL and document name, then pass that observation before each run.
  function attestBrowserFile({observedUrl,expectedFileKey,documentName,pageId}) {
    const match=/^https:\/\/(?:www\.)?figma\.com\/design\/([a-zA-Z0-9]+)(?:\/|\?|$)/.exec(observedUrl || '');
    if (!match || match[1] !== expectedFileKey || figma.root.name !== documentName || figma.currentPage.id !== pageId) throw Error('browser/document identity mismatch');
    uiIdentity={fileKey:expectedFileKey,documentName,pageId};
  }
  function requireFile(expected) {
    if (!expected || typeof expected !== 'string') throw Error('Figma file mismatch or unavailable identity');
    if (figma.fileKey) { if(figma.fileKey !== expected) throw Error('Figma file mismatch'); return; }
    if (!uiIdentity || uiIdentity.fileKey !== expected || figma.root.name !== uiIdentity.documentName || figma.currentPage.id !== uiIdentity.pageId) throw Error('Figma file mismatch or missing fresh browser attestation');
  }
  function fingerprint(node) {
    // Intentionally includes editable text/layout/style, not selection or viewport.
    const walk = n => ({id:n.id,type:n.type,name:n.name,x:n.x,y:n.y,width:n.width,height:n.height,visible:n.visible,
      characters:n.type === 'TEXT' ? n.characters : undefined,
      fontName:n.type === 'TEXT' && typeof n.fontName !== 'symbol' ? n.fontName : undefined,
      fontSize:n.type === 'TEXT' && typeof n.fontSize !== 'symbol' ? n.fontSize : undefined,
      fills:typeof n.fills !== 'symbol' ? n.fills : undefined,strokes:typeof n.strokes !== 'symbol' ? n.strokes : undefined,
      effects:n.effects,cornerRadius:typeof n.cornerRadius !== 'symbol' ? n.cornerRadius : undefined,
      opacity:n.opacity,layoutMode:n.layoutMode,itemSpacing:n.itemSpacing,paddingTop:n.paddingTop,paddingBottom:n.paddingBottom,paddingLeft:n.paddingLeft,paddingRight:n.paddingRight,
      reactions:n.reactions,children:'children' in n ? n.children.map(walk) : undefined});
    return JSON.stringify(walk(node));
  }
  async function beginCandidate({fileKey,owner,rootId,expectedFingerprint}) {
    requireFile(fileKey);
    if (!owner || typeof owner !== 'string') throw Error('missing owner');
    let previous = null;
    if (rootId) {
      previous = await figma.getNodeByIdAsync(rootId);
      if (!previous || previous.getPluginData(ownerKey) !== owner || !expectedFingerprint || fingerprint(previous) !== expectedFingerprint) throw Error('target missing, foreign or manually changed');
    }
    const stage = figma.createFrame();
    stage.name = `staging ${owner}`;
    stage.setPluginData(ownerKey, owner);
    stage.setPluginData('starward-staging','true');
    if (previous) previous.parent.appendChild(stage);
    return {fileKey,owner,previous,stage,expectedFingerprint};
  }
  function commitCandidate(transaction) {
    const {fileKey,owner,previous,stage,expectedFingerprint} = transaction;
    requireFile(fileKey);
    if (stage.removed || stage.getPluginData(ownerKey) !== owner || stage.getPluginData('starward-staging') !== 'true') throw Error('invalid staging ownership');
    if (previous && (previous.removed || previous.getPluginData(ownerKey) !== owner || fingerprint(previous) !== expectedFingerprint)) throw Error('target changed before commit');
    if (previous) { stage.x=previous.x; stage.y=previous.y; }
    stage.setPluginData('starward-staging','');
    if (previous) previous.remove();
    return {rootId:stage.id,fingerprint:fingerprint(stage)};
  }
  function discardStage(transaction) {
    requireFile(transaction.fileKey);
    const stage=transaction.stage;
    if (!stage.removed && stage.getPluginData(ownerKey) === transaction.owner && stage.getPluginData('starward-staging') === 'true') stage.remove();
  }
  async function resolveFont(families=['Noto Sans SC','Microsoft YaHei','PingFang SC'],style='Regular') {
    const fonts = await figma.listAvailableFontsAsync();
    const found = families.map(family=>fonts.find(f=>f.fontName.family === family && f.fontName.style === style)).find(Boolean);
    if (!found) throw Error(`required Chinese font unavailable (${style})`);
    await figma.loadFontAsync(found.fontName);
    return found.fontName;
  }
  async function text(parent,characters,{fontName,size=15,width=240,name='Text',color={r:0.157,g:0.169,b:0.161}}) {
    await figma.loadFontAsync(fontName);
    const node=figma.createText();
    parent.appendChild(node); node.name=name; node.fontName=fontName; node.fontSize=size;
    node.characters=characters; node.fills=[{type:'SOLID',color}];
    node.resize(width,Math.max(size,1)); node.textAutoResize='HEIGHT';
    return node;
  }
  function stack(parent,{name='Stack',width=240,direction='VERTICAL',gap=8,padding=0}={}) {
    const node=figma.createFrame(); parent.appendChild(node); node.name=name;
    node.layoutMode=direction; node.primaryAxisSizingMode='AUTO'; node.counterAxisSizingMode='FIXED';
    node.itemSpacing=gap; node.paddingTop=node.paddingBottom=node.paddingLeft=node.paddingRight=padding;
    node.fills=[]; node.resize(width,1); return node;
  }
  function control(node,key,codeOwner) { node.setPluginData('controlKey',key); node.setPluginData('codeOwner',codeOwner); return node; }
  function icon(parent,svg,{size=20,name='SemanticIcon'}={}) {
    if (typeof svg !== 'string' || !/<svg\b/.test(svg) || /<(?:script|foreignObject)\b|\son\w+\s*=/i.test(svg)) throw Error('expected safe existing SVG asset');
    const node=figma.createNodeFromSvg(svg); parent.appendChild(node); node.name=name; node.resize(size,size); return node;
  }
  async function snapshot(root,{fileKey,revision}) {
    requireFile(fileKey);
    const walk = async n => {
      const data={id:n.id,type:n.type,name:n.name,x:n.x,y:n.y,width:n.width,height:n.height,visible:n.visible,opacity:n.opacity,
        layoutMode:n.layoutMode,controlKey:n.getPluginData('controlKey') || undefined,codeOwner:n.getPluginData('codeOwner') || undefined};
      if (n.type === 'TEXT') {
        data.characters=n.characters;
        if (typeof n.fontName === 'symbol' || typeof n.fontSize === 'symbol') data.textRuns=n.getStyledTextSegments(['fontName','fontSize']);
        else { data.fontName=n.fontName; data.fontSize=n.fontSize; }
      }
      if ('reactions' in n) data.reactions=n.reactions;
      if ('children' in n) data.children=await Promise.all(n.children.map(walk));
      return data;
    };
    return {schema:1,origin:'figma-plugin-api',fileKey,revision,capturedAt:new Date().toISOString(),root:await walk(root)};
  }
  async function exportBoard(root,{fileKey,revision,scale=1}) {
    requireFile(fileKey);
    if (![1,2].includes(scale) || !revision) throw Error('invalid export scale/revision');
    const before=fingerprint(root);
    const structure=await snapshot(root,{fileKey,revision});
    const png=await root.exportAsync({format:'PNG',constraint:{type:'SCALE',value:scale}});
    if (fingerprint(root) !== before) throw Error('canvas changed during export; evidence discarded');
    return {structure,png,fingerprint:before};
  }
  return {attestBrowserFile,requireFile,fingerprint,beginCandidate,commitCandidate,discardStage,resolveFont,text,stack,control,icon,snapshot,exportBoard};
})();

/* Scripter-specific download UI. Input files are actual exportAsync bytes or
 * actual snapshot JSON. No external service, renderer or browser hidden API. */
async function starwardDownload(files) {
  const output = createWindow({width:420,height:240}, async (self) => {
    const message=await self.recv();
    const encode=s=>new TextEncoder().encode(s);
    const crc=bytes=>{let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return(n^0xffffffff)>>>0;};
    const blocks=[],central=[];let offset=0;
    for(const file of message.files) {
      const name=encode(file.name), bytes=typeof file.data==='string'?encode(file.data):new Uint8Array(file.data), checksum=crc(bytes);
      const header=new Uint8Array(30+name.length), view=new DataView(header.buffer);
      view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x800,true);view.setUint32(14,checksum,true);view.setUint32(18,bytes.length,true);view.setUint32(22,bytes.length,true);view.setUint16(26,name.length,true);header.set(name,30);
      const entry=new Uint8Array(46+name.length), e=new DataView(entry.buffer);
      e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x800,true);e.setUint32(16,checksum,true);e.setUint32(20,bytes.length,true);e.setUint32(24,bytes.length,true);e.setUint16(28,name.length,true);e.setUint32(42,offset,true);entry.set(name,46);
      blocks.push(header,bytes);central.push(entry);offset+=header.length+bytes.length;
    }
    const size=central.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);
    v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);
    const blob=new Blob([...blocks,...central,end],{type:'application/zip'});
    const a=document.createElement('a');a.textContent='下载本轮 Figma 原生导出';a.href=URL.createObjectURL(blob);a.download='starward-figma-export.zip';document.body.appendChild(a);
    const p=document.createElement('p');p.textContent=message.files.length+' 个文件；来源为当前画布的 PNG 和节点快照。';document.body.appendChild(p);
    document.body.style.cssText='font:16px/1.6 system-ui;padding:20px;background:white;color:#222';
  });
  output.send({files:files.map(file=>({name:file.name,data:typeof file.data==='string'?file.data:Array.from(file.data)}))});
  await output;
}


StarwardFigma.attestBrowserFile({observedUrl:'https://www.figma.com/design/tU01DsKBhSng9IHk1xlJQA/',expectedFileKey:'tU01DsKBhSng9IHk1xlJQA',documentName:'Starward 地图与我的 · 设计资源',pageId:'0:1'});
const fileKey='tU01DsKBhSng9IHk1xlJQA';
if(figma.currentPage.children.some(n=>n.getPluginData('starward-resource-owner')==='probe')) throw Error('probe already exists; read back before updating');
const fontName=await StarwardFigma.resolveFont();
const tx=await StarwardFigma.beginCandidate({fileKey,owner:'probe'});
let target=null;
try {
  const root=tx.stage;root.name='中文与组件探针';root.resize(390,400);root.fills=[{type:'SOLID',color:{r:1,g:1,b:1}}];
  const stack=StarwardFigma.stack(root,{name:'Auto Layout 内容',width:342,gap:16});stack.x=24;stack.y=24;
  await StarwardFigma.text(stack,'今晚去观星',{fontName,size:20,width:342});
  const description=await StarwardFigma.text(stack,'现场反馈与纠错',{fontName,size:15,width:342,name:'可修改中文说明'});
  const component=figma.createComponent();root.appendChild(component);component.name='探针可复用控件';component.resize(342,44);component.layoutMode='HORIZONTAL';component.itemSpacing=8;component.paddingLeft=12;component.paddingRight=12;component.counterAxisAlignItems='CENTER';component.fills=[{type:'SOLID',color:{r:.96,g:.97,b:.96}}];
  await StarwardFigma.text(component,'打开下一页',{fontName,width:260});StarwardFigma.icon(component,"<!-- @license lucide-static v1.33.0 - ISC -->\r\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#282b29\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\r\n  <path d=\"m9 18 6-6-6-6\" />\r\n</svg>\r\n");
  root.appendChild(component);component.x=420;component.y=0;
  const instance=component.createInstance();stack.appendChild(instance);StarwardFigma.control(instance,'probe-next','apps/wechat-miniapp/src/components/semantic-asset.tsx');
  const picture=figma.createRectangle();stack.appendChild(picture);picture.name='许可自生成图片';picture.resize(120,80);picture.fills=[{type:'IMAGE',imageHash:figma.createImage(new Uint8Array([255,216,255,224,0,16,74,70,73,70,0,1,1,1,0,96,0,96,0,0,255,219,0,67,0,3,2,2,3,2,2,3,3,3,3,4,3,3,4,5,8,5,5,4,4,5,10,7,7,6,8,12,10,12,12,11,10,11,11,13,14,18,16,13,14,17,14,11,11,16,22,16,17,19,20,21,21,21,12,15,23,24,22,20,24,18,20,21,20,255,219,0,67,1,3,4,4,5,4,5,9,5,5,9,20,13,11,13,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,255,192,0,17,8,0,24,0,32,3,1,34,0,2,17,1,3,17,1,255,196,0,31,0,0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,255,196,0,181,16,0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,125,1,2,3,0,4,17,5,18,33,49,65,6,19,81,97,7,34,113,20,50,129,145,161,8,35,66,177,193,21,82,209,240,36,51,98,114,130,9,10,22,23,24,25,26,37,38,39,40,41,42,52,53,54,55,56,57,58,67,68,69,70,71,72,73,74,83,84,85,86,87,88,89,90,99,100,101,102,103,104,105,106,115,116,117,118,119,120,121,122,131,132,133,134,135,136,137,138,146,147,148,149,150,151,152,153,154,162,163,164,165,166,167,168,169,170,178,179,180,181,182,183,184,185,186,194,195,196,197,198,199,200,201,202,210,211,212,213,214,215,216,217,218,225,226,227,228,229,230,231,232,233,234,241,242,243,244,245,246,247,248,249,250,255,196,0,31,1,0,3,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,255,196,0,181,17,0,2,1,2,4,4,3,4,7,5,4,4,0,1,2,119,0,1,2,3,17,4,5,33,49,6,18,65,81,7,97,113,19,34,50,129,8,20,66,145,161,177,193,9,35,51,82,240,21,98,114,209,10,22,36,52,225,37,241,23,24,25,26,38,39,40,41,42,53,54,55,56,57,58,67,68,69,70,71,72,73,74,83,84,85,86,87,88,89,90,99,100,101,102,103,104,105,106,115,116,117,118,119,120,121,122,130,131,132,133,134,135,136,137,138,146,147,148,149,150,151,152,153,154,162,163,164,165,166,167,168,169,170,178,179,180,181,182,183,184,185,186,194,195,196,197,198,199,200,201,202,210,211,212,213,214,215,216,217,218,226,227,228,229,230,231,232,233,234,242,243,244,245,246,247,248,249,250,255,218,0,12,3,1,0,2,17,3,17,0,63,0,251,22,190,42,255,0,130,145,127,205,59,255,0,184,143,254,218,215,197,84,87,243,62,69,192,63,216,185,141,44,127,214,185,249,47,167,37,175,120,184,239,204,251,223,99,250,99,11,148,253,90,180,106,243,222,222,94,86,238,20,81,69,126,182,125,0,81,69,20,0,81,69,20,1,255,217])).hash,scaleMode:'FILL'}];
  const next=figma.createFrame();target=next;next.setPluginData('starward-resource-owner','probe-target');next.setPluginData('starward-staging','true');next.name='探针跳转目标';next.resize(390,400);next.x=850;await StarwardFigma.text(next,'已到达第二页',{fontName,size:20,width:342});
  instance.reactions=[{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:next.id,navigation:'NAVIGATE',transition:null,preserveScrollPosition:false}]}];
  const saved=StarwardFigma.commitCandidate(tx);next.setPluginData('starward-staging','');figma.currentPage.selection=[root];figma.viewport.scrollAndZoomIntoView([root]);
  const exported=await StarwardFigma.exportBoard(root,{fileKey,revision:'probe-r0'});
  print(JSON.stringify({probeRoot:root.id,descriptionId:description.id,componentId:component.id,instanceId:instance.id,targetId:next.id,fontName,bytes:exported.png.length}));
  await starwardDownload([{name:'probe-round-0.png',data:exported.png},{name:'probe-round-0.json',data:JSON.stringify(exported.structure)},{name:'probe-state.json',data:JSON.stringify({...saved,descriptionId:description.id,componentId:component.id,instanceId:instance.id,targetId:next.id})}]);
} catch(error) { StarwardFigma.discardStage(tx);if(target&&!target.removed&&target.getPluginData('starward-staging')==='true')target.remove();throw error; }
