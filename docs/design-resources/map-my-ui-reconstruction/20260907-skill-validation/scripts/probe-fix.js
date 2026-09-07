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
    node.layoutMode=direction; node.resize(width,1); node.primaryAxisSizingMode='AUTO'; node.counterAxisSizingMode='FIXED';
    node.itemSpacing=gap; node.paddingTop=node.paddingBottom=node.paddingLeft=node.paddingRight=padding;
    node.fills=[]; return node;
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
        layoutMode:n.layoutMode,clipsContent:n.clipsContent,controlKey:n.getPluginData('controlKey') || undefined,codeOwner:n.getPluginData('codeOwner') || undefined};
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
const root=await figma.getNodeByIdAsync('1:58');
if(StarwardFigma.fingerprint(root)!=="{\"id\":\"1:58\",\"type\":\"FRAME\",\"name\":\"中文与组件探针\",\"x\":0,\"y\":0,\"width\":390,\"height\":400,\"visible\":true,\"fills\":[{\"type\":\"SOLID\",\"visible\":true,\"opacity\":1,\"blendMode\":\"NORMAL\",\"color\":{\"r\":1,\"g\":1,\"b\":1},\"boundVariables\":{}}],\"strokes\":[],\"effects\":[],\"cornerRadius\":0,\"opacity\":1,\"layoutMode\":\"NONE\",\"itemSpacing\":0,\"paddingTop\":0,\"paddingBottom\":0,\"paddingLeft\":0,\"paddingRight\":0,\"reactions\":[],\"children\":[{\"id\":\"1:59\",\"type\":\"FRAME\",\"name\":\"Auto Layout 内容\",\"x\":24,\"y\":24,\"width\":342,\"height\":1,\"visible\":true,\"fills\":[],\"strokes\":[],\"effects\":[],\"cornerRadius\":0,\"opacity\":1,\"layoutMode\":\"VERTICAL\",\"itemSpacing\":16,\"paddingTop\":0,\"paddingBottom\":0,\"paddingLeft\":0,\"paddingRight\":0,\"reactions\":[],\"children\":[{\"id\":\"1:60\",\"type\":\"TEXT\",\"name\":\"Text\",\"x\":0,\"y\":0,\"width\":342,\"height\":24,\"visible\":true,\"characters\":\"今晚去观星\",\"fontName\":{\"family\":\"Noto Sans SC\",\"style\":\"Regular\",\"variationSettings\":{\"wght\":400}},\"fontSize\":20,\"fills\":[{\"type\":\"SOLID\",\"visible\":true,\"opacity\":1,\"blendMode\":\"NORMAL\",\"color\":{\"r\":0.15700000524520874,\"g\":0.16899999976158142,\"b\":0.16099999845027924},\"boundVariables\":{}}],\"strokes\":[],\"effects\":[],\"opacity\":1,\"reactions\":[]},{\"id\":\"1:61\",\"type\":\"TEXT\",\"name\":\"可修改中文说明\",\"x\":0,\"y\":40,\"width\":342,\"height\":18,\"visible\":true,\"characters\":\"现场反馈与纠错\",\"fontName\":{\"family\":\"Noto Sans SC\",\"style\":\"Regular\",\"variationSettings\":{\"wght\":400}},\"fontSize\":15,\"fills\":[{\"type\":\"SOLID\",\"visible\":true,\"opacity\":1,\"blendMode\":\"NORMAL\",\"color\":{\"r\":0.15700000524520874,\"g\":0.16899999976158142,\"b\":0.16099999845027924},\"boundVariables\":{}}],\"strokes\":[],\"effects\":[],\"opacity\":1,\"reactions\":[]},{\"id\":\"1:66\",\"type\":\"INSTANCE\",\"name\":\"探针可复用控件\",\"x\":0,\"y\":74,\"width\":312,\"height\":44,\"visible\":true,\"fills\":[{\"type\":\"SOLID\",\"visible\":true,\"opacity\":1,\"blendMode\":\"NORMAL\",\"color\":{\"r\":0.9599999785423279,\"g\":0.9700000286102295,\"b\":0.9599999785423279},\"boundVariables\":{}}],\"strokes\":[],\"effects\":[],\"cornerRadius\":0,\"opacity\":1,\"layoutMode\":\"HORIZONTAL\",\"itemSpacing\":8,\"paddingTop\":0,\"paddingBottom\":0,\"paddingLeft\":12,\"paddingRight\":12,\"reactions\":[{\"action\":{\"type\":\"NODE\",\"destinationId\":\"1:71\",\"navigation\":\"NAVIGATE\",\"transition\":null,\"resetVideoPosition\":false,\"resetScrollPosition\":true},\"actions\":[{\"type\":\"NODE\",\"destinationId\":\"1:71\",\"navigation\":\"NAVIGATE\",\"transition\":null,\"resetVideoPosition\":false,\"resetScrollPosition\":true}],\"trigger\":{\"type\":\"ON_CLICK\"}}],\"children\":[{\"id\":\"I1:66;1:63\",\"type\":\"TEXT\",\"name\":\"Text\",\"x\":12,\"y\":13,\"width\":260,\"height\":18,\"visible\":true,\"characters\":\"打开下一页\",\"fontName\":{\"family\":\"Noto Sans SC\",\"style\":\"Regular\",\"variationSettings\":{\"wght\":400}},\"fontSize\":15,\"fills\":[{\"type\":\"SOLID\",\"visible\":true,\"opacity\":1,\"blendMode\":\"NORMAL\",\"color\":{\"r\":0.15700000524520874,\"g\":0.16899999976158142,\"b\":0.16099999845027924},\"boundVariables\":{}}],\"strokes\":[],\"effects\":[],\"opacity\":1,\"reactions\":[]},{\"id\":\"I1:66;1:64\",\"type\":\"FRAME\",\"name\":\"SemanticIcon\",\"x\":280,\"y\":12,\"width\":20,\"height\":20,\"visible\":true,\"fills\":[{\"type\":\"SOLID\",\"visible\":false,\"opacity\":1,\"blendMode\":\"NORMAL\",\"color\":{\"r\":1,\"g\":1,\"b\":1},\"boundVariables\":{}}],\"strokes\":[],\"effects\":[],\"cornerRadius\":0,\"opacity\":1,\"layoutMode\":\"NONE\",\"itemSpacing\":0,\"paddingTop\":0,\"paddingBottom\":0,\"paddingLeft\":0,\"paddingRight\":0,\"reactions\":[],\"children\":[{\"id\":\"I1:66;1:65\",\"type\":\"VECTOR\",\"name\":\"Vector\",\"x\":7.5,\"y\":5,\"width\":5,\"height\":10,\"visible\":true,\"fills\":[],\"strokes\":[{\"type\":\"SOLID\",\"visible\":true,\"opacity\":1,\"blendMode\":\"NORMAL\",\"color\":{\"r\":0.15700000524520874,\"g\":0.16899999976158142,\"b\":0.16099999845027924},\"boundVariables\":{}}],\"effects\":[],\"cornerRadius\":0,\"opacity\":1,\"reactions\":[]}]}]},{\"id\":\"1:70\",\"type\":\"RECTANGLE\",\"name\":\"许可自生成图片\",\"x\":0,\"y\":134,\"width\":120,\"height\":80,\"visible\":true,\"fills\":[{\"type\":\"IMAGE\",\"visible\":true,\"opacity\":1,\"blendMode\":\"NORMAL\",\"scaleMode\":\"FILL\",\"scalingFactor\":1,\"rotation\":0,\"filters\":{\"exposure\":0,\"contrast\":0,\"saturation\":0,\"temperature\":0,\"tint\":0,\"highlights\":0,\"shadows\":0},\"imageTransform\":[[1,0,0],[0,1,0]],\"imageHash\":\"6757808aa926a3fd8c090196910e4cf2993a73d5\"}],\"strokes\":[],\"effects\":[],\"cornerRadius\":0,\"opacity\":1,\"reactions\":[]}]},{\"id\":\"1:62\",\"type\":\"COMPONENT\",\"name\":\"探针可复用控件\",\"x\":420,\"y\":0,\"width\":312,\"height\":44,\"visible\":true,\"fills\":[{\"type\":\"SOLID\",\"visible\":true,\"opacity\":1,\"blendMode\":\"NORMAL\",\"color\":{\"r\":0.9599999785423279,\"g\":0.9700000286102295,\"b\":0.9599999785423279},\"boundVariables\":{}}],\"strokes\":[],\"effects\":[],\"cornerRadius\":0,\"opacity\":1,\"layoutMode\":\"HORIZONTAL\",\"itemSpacing\":8,\"paddingTop\":0,\"paddingBottom\":0,\"paddingLeft\":12,\"paddingRight\":12,\"reactions\":[],\"children\":[{\"id\":\"1:63\",\"type\":\"TEXT\",\"name\":\"Text\",\"x\":12,\"y\":13,\"width\":260,\"height\":18,\"visible\":true,\"characters\":\"打开下一页\",\"fontName\":{\"family\":\"Noto Sans SC\",\"style\":\"Regular\",\"variationSettings\":{\"wght\":400}},\"fontSize\":15,\"fills\":[{\"type\":\"SOLID\",\"visible\":true,\"opacity\":1,\"blendMode\":\"NORMAL\",\"color\":{\"r\":0.15700000524520874,\"g\":0.16899999976158142,\"b\":0.16099999845027924},\"boundVariables\":{}}],\"strokes\":[],\"effects\":[],\"opacity\":1,\"reactions\":[]},{\"id\":\"1:64\",\"type\":\"FRAME\",\"name\":\"SemanticIcon\",\"x\":280,\"y\":12,\"width\":20,\"height\":20,\"visible\":true,\"fills\":[{\"type\":\"SOLID\",\"visible\":false,\"opacity\":1,\"blendMode\":\"NORMAL\",\"color\":{\"r\":1,\"g\":1,\"b\":1},\"boundVariables\":{}}],\"strokes\":[],\"effects\":[],\"cornerRadius\":0,\"opacity\":1,\"layoutMode\":\"NONE\",\"itemSpacing\":0,\"paddingTop\":0,\"paddingBottom\":0,\"paddingLeft\":0,\"paddingRight\":0,\"reactions\":[],\"children\":[{\"id\":\"1:65\",\"type\":\"VECTOR\",\"name\":\"Vector\",\"x\":7.5,\"y\":5,\"width\":5,\"height\":10,\"visible\":true,\"fills\":[],\"strokes\":[{\"type\":\"SOLID\",\"visible\":true,\"opacity\":1,\"blendMode\":\"NORMAL\",\"color\":{\"r\":0.15700000524520874,\"g\":0.16899999976158142,\"b\":0.16099999845027924},\"boundVariables\":{}}],\"effects\":[],\"cornerRadius\":0,\"opacity\":1,\"reactions\":[]}]}]}]}")throw Error('probe changed');
const stack=await figma.getNodeByIdAsync('1:59');stack.primaryAxisSizingMode='AUTO';
const description=await figma.getNodeByIdAsync('1:61');await figma.loadFontAsync(description.fontName);description.characters='现场反馈与纠错 · 修改已保存';
const exported=await StarwardFigma.exportBoard(root,{fileKey:'tU01DsKBhSng9IHk1xlJQA',revision:'probe-technical-fix-1'});
print(JSON.stringify({rootId:root.id,stackHeight:stack.height,descriptionId:description.id,bytes:exported.png.length}));
await starwardDownload([{name:'probe-fixed.png',data:exported.png},{name:'probe-fixed.json',data:JSON.stringify(exported.structure)},{name:'probe-fixed-state.json',data:JSON.stringify({rootId:root.id,fingerprint:exported.fingerprint})}]);