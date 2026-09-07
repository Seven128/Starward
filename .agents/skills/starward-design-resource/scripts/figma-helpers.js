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
