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
      lineHeight:n.type === 'TEXT' && typeof n.lineHeight !== 'symbol' ? n.lineHeight : undefined,
      letterSpacing:n.type === 'TEXT' && typeof n.letterSpacing !== 'symbol' ? n.letterSpacing : undefined,
      textAlignHorizontal:n.textAlignHorizontal,textAutoResize:n.textAutoResize,clipsContent:n.clipsContent,
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
        layoutMode:n.layoutMode,layoutPositioning:n.layoutPositioning,overflowDirection:n.overflowDirection,
        absoluteTransform:n.absoluteTransform,absoluteBoundingBox:n.absoluteBoundingBox,absoluteRenderBounds:n.absoluteRenderBounds,
        clipsContent:n.clipsContent,fills:typeof n.fills==='symbol'?undefined:n.fills,
        strokes:typeof n.strokes==='symbol'?undefined:n.strokes,paddingTop:n.paddingTop,paddingBottom:n.paddingBottom,paddingLeft:n.paddingLeft,paddingRight:n.paddingRight,itemSpacing:n.itemSpacing,
        controlKey:n.getPluginData('controlKey') || undefined,codeOwner:n.getPluginData('codeOwner') || undefined};
      if (n.type === 'TEXT') {
        data.characters=n.characters;
        data.lineHeight=typeof n.lineHeight==='symbol'?undefined:n.lineHeight;
        if (typeof n.fontName === 'symbol' || typeof n.fontSize === 'symbol') data.textRuns=n.getStyledTextSegments(['fontName','fontSize']);
        else { data.fontName=n.fontName; data.fontSize=n.fontSize; }
      }
      if ('reactions' in n) data.reactions=n.reactions;
      if (n.type === 'INSTANCE') {
        data.mainComponentId=(await n.getMainComponentAsync())?.id ?? null;
        data.componentProperties=n.componentProperties;
      }
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

StarwardFigma.attestBrowserFile({observedUrl:FRESH_OBSERVED_URL,expectedFileKey:'tU01DsKBhSng9IHk1xlJQA',documentName:'Starward 地图与我的 · 设计资源',pageId:'0:1'});
const boards=[{"id":"coverage-themes-map-day-medium-390","candidateId":"e1-B-2","purpose":"coverage","page":"map","mode":"day","state":"medium","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:5635","rootId":"1:5635","sourceBatch":"themes"},{"id":"coverage-themes-my-day-normal-390","candidateId":"e1-B-2","purpose":"coverage","page":"my","mode":"day","state":"normal","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:5824","rootId":"1:5824","sourceBatch":"themes"},{"id":"coverage-themes-map-night-medium-390","candidateId":"e1-B-2","purpose":"coverage","page":"map","mode":"night","state":"medium","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:5940","rootId":"1:5940","sourceBatch":"themes"},{"id":"coverage-themes-my-night-normal-390","candidateId":"e1-B-2","purpose":"coverage","page":"my","mode":"night","state":"normal","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:6129","rootId":"1:6129","sourceBatch":"themes"},{"id":"coverage-themes-map-observation-medium-390","candidateId":"e1-B-2","purpose":"coverage","page":"map","mode":"observation","state":"medium","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:6245","rootId":"1:6245","sourceBatch":"themes"},{"id":"coverage-themes-my-observation-normal-390","candidateId":"e1-B-2","purpose":"coverage","page":"my","mode":"observation","state":"normal","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:6434","rootId":"1:6434","sourceBatch":"themes"},{"id":"coverage-map-map-day-small-390","candidateId":"e1-B-2","purpose":"coverage","page":"map","mode":"day","state":"small","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:6550","rootId":"1:6550","sourceBatch":"map"},{"id":"coverage-map-map-day-large-no-photo-390","candidateId":"e1-B-2","purpose":"coverage","page":"map","mode":"day","state":"large-no-photo","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:6739","rootId":"1:6739","sourceBatch":"map"},{"id":"coverage-map-map-day-large-photo-390","candidateId":"e1-B-2","purpose":"coverage","page":"map","mode":"day","state":"large-photo","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:6928","rootId":"1:6928","sourceBatch":"map"},{"id":"coverage-map-map-day-layers-390","candidateId":"e1-B-2","purpose":"coverage","page":"map","mode":"day","state":"layers","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:7119","rootId":"1:7119","sourceBatch":"map"},{"id":"coverage-map-map-day-partial-stale-risk-390","candidateId":"e1-B-2","purpose":"coverage","page":"map","mode":"day","state":"partial-stale-risk","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:7330","rootId":"1:7330","sourceBatch":"map"},{"id":"coverage-my-my-day-empty-390","candidateId":"e1-B-2","purpose":"coverage","page":"my","mode":"day","state":"empty","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:7527","rootId":"1:7527","sourceBatch":"my"},{"id":"coverage-my-my-day-loading-390","candidateId":"e1-B-2","purpose":"coverage","page":"my","mode":"day","state":"loading","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:7642","rootId":"1:7642","sourceBatch":"my"},{"id":"coverage-my-my-day-offline-390","candidateId":"e1-B-2","purpose":"coverage","page":"my","mode":"day","state":"offline","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:7757","rootId":"1:7757","sourceBatch":"my"},{"id":"coverage-my-my-day-identity-recovery-390","candidateId":"e1-B-2","purpose":"coverage","page":"my","mode":"day","state":"identity-recovery","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:7880","rootId":"1:7880","sourceBatch":"my"},{"id":"coverage-sizes-map-day-long-text-320","candidateId":"e1-B-2","purpose":"coverage","page":"map","mode":"day","state":"long-text","width":320,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:8002","rootId":"1:8002","sourceBatch":"sizes"},{"id":"coverage-sizes-my-day-long-text-320","candidateId":"e1-B-2","purpose":"coverage","page":"my","mode":"day","state":"long-text","width":320,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:8191","rootId":"1:8191","sourceBatch":"sizes"},{"id":"coverage-sizes-map-day-medium-375","candidateId":"e1-B-2","purpose":"coverage","page":"map","mode":"day","state":"medium","width":375,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:8308","rootId":"1:8308","sourceBatch":"sizes"},{"id":"coverage-sizes-my-day-normal-375","candidateId":"e1-B-2","purpose":"coverage","page":"my","mode":"day","state":"normal","width":375,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:8497","rootId":"1:8497","sourceBatch":"sizes"},{"id":"coverage-sizes-map-day-medium-430","candidateId":"e1-B-2","purpose":"coverage","page":"map","mode":"day","state":"medium","width":430,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:8613","rootId":"1:8613","sourceBatch":"sizes"},{"id":"coverage-sizes-my-day-normal-430","candidateId":"e1-B-2","purpose":"coverage","page":"my","mode":"day","state":"normal","width":430,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:8802","rootId":"1:8802","sourceBatch":"sizes"},{"id":"coverage-components-components-day-component-states-390","candidateId":"e1-B-2","purpose":"coverage","page":"components","mode":"day","state":"component-states","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:8918","rootId":"1:8918","sourceBatch":"components"},{"id":"coverage-components-components-night-component-states-390","candidateId":"e1-B-2","purpose":"coverage","page":"components","mode":"night","state":"component-states","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:9000","rootId":"1:9000","sourceBatch":"components"},{"id":"coverage-components-components-observation-component-states-390","candidateId":"e1-B-2","purpose":"coverage","page":"components","mode":"observation","state":"component-states","width":390,"height":844,"scale":1,"round":0,"revision":"coverage-evidence-r1","fileKey":"tU01DsKBhSng9IHk1xlJQA","nodeId":"1:9082","rootId":"1:9082","sourceBatch":"components"}],files=[];
for(const board of boards){const root=await figma.getNodeByIdAsync(board.nodeId);if(root.parent!==figma.currentPage||root.getPluginData('starward-resource-owner')!==board.id)throw Error('coverage identity mismatch');for(const n of root.findAll(n=>Array.isArray(n.fills)))for(const f of n.fills)if(f.type==='IMAGE')await figma.getImageByHash(f.imageHash).getSizeAsync();const out=await StarwardFigma.exportBoard(root,{fileKey:board.fileKey,revision:board.revision});board.fingerprint=out.fingerprint;files.push({name:board.id+'.png',data:out.png},{name:board.id+'.json',data:JSON.stringify(out.structure)});print(JSON.stringify({id:board.id,bytes:out.png.length}));}
files.push({name:'boards.json',data:JSON.stringify(boards)});await starwardDownload(files);