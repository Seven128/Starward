/* Readback fixes only. Do not call buildDesign or replace roots.
 * Caller must freshly attest the same browser/file, load StarwardFigma, then
 * pass the ORIGINAL fingerprint strings from the listed local boards.json.
 * A fresh live fingerprint is not an authorized substitute for these records.
 * No self-execution, downloads, cleanup, deletion, or core A/B access. */
async function fixCoverageReadback({fileKey, expectedFingerprints, revision='coverage-readback-r1', exportChanged=false}) {
  if(fileKey!=='tU01DsKBhSng9IHk1xlJQA')throw Error('Unexpected file for coverage readback fixes');
  StarwardFigma.requireFile(fileKey);
  const targets=[
    {id:'coverage-sizes-map-day-medium-430',rootId:'1:8613',fingerprintLength:86844,
      nodes:{mapViewport:'1:8615',mapImage:'1:8616',marker:'1:8617'},source:'sizes/boards.json'},
    {id:'coverage-sizes-map-day-long-text-320',rootId:'1:8002',fingerprintLength:86581,
      nodes:{viewport:'1:8055',document:'1:8056',support:'1:8082'},source:'sizes/boards.json'},
    {id:'coverage-map-map-day-partial-stale-risk-390',rootId:'1:7330',fingerprintLength:91561,
      nodes:{viewport:'1:7383',restrictionDetail:'1:7401',temperatureLabel:'1:7442',windLabel:'1:7445'},source:'map/boards.json'},
    {id:'coverage-themes-my-observation-normal-390',rootId:'1:6434',fingerprintLength:50465,
      nodes:{observationGrayVector:'1:6469'},source:'themes/boards.json'},
    {id:'coverage-components-components-day-component-states-390',rootId:'1:8918',fingerprintLength:36609,
      nodes:{selectedMaster:'1:8966',selectedMasterStar:'1:8968',selectedInstance:'1:8970',selectedInstanceStar:'I1:8970;1:8968'},source:'components/boards.json',favoriteFill:'#f2c94c',favoriteStroke:'#6f5500'},
    {id:'coverage-components-components-night-component-states-390',rootId:'1:9000',fingerprintLength:36688,
      nodes:{selectedMaster:'1:9048',selectedMasterStar:'1:9050',selectedInstance:'1:9052',selectedInstanceStar:'I1:9052;1:9050'},source:'components/boards.json',favoriteFill:'#f6d56f',favoriteStroke:'#ffe5a0'},
    {id:'coverage-components-components-observation-component-states-390',rootId:'1:9082',fingerprintLength:35913,
      nodes:{selectedMaster:'1:9130',selectedMasterStar:'1:9132',selectedInstance:'1:9134',selectedInstanceStar:'I1:9134;1:9132'},source:'components/boards.json',favoriteFill:'#d84a3c',favoriteStroke:'#ff6b58'}
  ];
  const prepared=[];
  const inRoot=(n,root)=>{let p=n;while(p){if(p===root)return true;p=p.parent;}return false;};
  const absolute=n=>({x:n.absoluteTransform[0][2],y:n.absoluteTransform[1][2]});
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  const color=hex=>({r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255});
  const paint=hex=>[{type:'SOLID',color:color(hex)}];
  // Validate every target and load fonts before the first edit. Standard Plugin
  // API is not transactional; an export failure can leave valid edits in place.
  for(const spec of targets){
    const expected=expectedFingerprints && expectedFingerprints[spec.id];
    assert(typeof expected==='string' && expected.length===spec.fingerprintLength,`Supply original ${spec.source} fingerprint for ${spec.id}`);
    const root=await figma.getNodeByIdAsync(spec.rootId);
    assert(root && root.type==='FRAME' && root.getPluginData('starward-resource-owner')===spec.id,`Missing/foreign coverage root ${spec.rootId}`);
    assert(StarwardFigma.fingerprint(root)===expected,`Coverage changed since original readback: ${spec.id}; do not overwrite`);
    const nodes={};
    for(const [key,id] of Object.entries(spec.nodes)){
      const n=await figma.getNodeByIdAsync(id);assert(n && inRoot(n,root),`Missing/foreign node ${id}`);nodes[key]=n;
      if(n.type==='TEXT'){
        if(typeof n.fontName==='symbol')throw Error(`Unexpected mixed font ${id}`);
        await figma.loadFontAsync(n.fontName);
      }
    }
    const untouchedStates=[];
    if(nodes.selectedMaster){
      assert(nodes.selectedMaster.type==='COMPONENT' && nodes.selectedMaster.name==='Control/Favorite selected','Unexpected selected master');
      assert(nodes.selectedInstance.type==='INSTANCE' && (await nodes.selectedInstance.getMainComponentAsync()).id===nodes.selectedMaster.id,'Selected instance binding mismatch');
      assert(nodes.selectedMasterStar.type==='VECTOR' && nodes.selectedMasterStar.fills.length===0 && nodes.selectedInstanceStar.fills.length===0,'Selected star source is not the observed empty outline');
      for(const n of root.findAll(n=>['COMPONENT','INSTANCE'].includes(n.type) && /^(Control\/)?Favorite (default|pressed|disabled|loading)$/.test(n.name)))untouchedStates.push({node:n,fingerprint:StarwardFigma.fingerprint(n)});
    }
    prepared.push({spec,root,nodes,expected,untouchedStates});
  }
  for(const {spec,root,nodes,expected} of prepared){
    assert(StarwardFigma.fingerprint(root)===expected,`Concurrent change before mutation: ${spec.id}`);
    if(nodes.viewport){
      const expectedScroll=spec.id.includes('partial-stale-risk')?'VERTICAL':'NONE';
      assert(nodes.viewport.overflowDirection===expectedScroll,`Unexpected scroll ownership at ${nodes.viewport.id}`);
    }
  }
  const readbacks=[];
  for(const {spec,root,nodes,untouchedStates} of prepared){
    const changes=[];
    if(nodes.mapImage){
      const {mapViewport:vp,mapImage:img,marker}=nodes;
      assert(img.type==='FRAME' && img.width===390 && img.height===480 && vp.width===430 && vp.height===666,'Unexpected original map geometry');
      const paints=JSON.stringify(img.fills);
      assert(Array.isArray(img.fills) && img.fills.length===1 && img.fills[0].type==='IMAGE','Expected original single IMAGE paint');
      const origin=absolute(vp),markerOrigin=absolute(marker);
      const fixedAnchor={x:markerOrigin.x+marker.width/2-origin.x,y:markerOrigin.y+marker.height-origin.y};
      // Actual visible map rectangle: top 88 to panel top 330. Cover with a
      // uniform scale, preserving the source point (195,209) as the focal anchor.
      const visibleHeight=242,scale=Math.max(vp.width/390,visibleHeight/480);
      vp.resize(vp.width,visibleHeight);img.resize(390*scale,480*scale);
      img.x=fixedAnchor.x-195*scale;img.y=fixedAnchor.y-209*scale;
      const mapped={x:origin.x+img.x+195*scale,y:origin.y+img.y+209*scale};
      const mp=absolute(marker.parent);marker.x=mapped.x-mp.x-marker.width/2;marker.y=mapped.y-mp.y-marker.height;
      assert(img.x<=0.01 && img.y<=0.01 && img.x+img.width>=vp.width-0.01 && img.y+img.height>=vp.height-0.01,'Cover failed');
      assert(JSON.stringify(img.fills)===paints,'Image paint changed unexpectedly');
      img.setPluginData('coverageImageMapping',JSON.stringify({sourceWidth:390,sourceHeight:480,scale,sourcePoint:[195,209],mappedAnchor:[mapped.x,mapped.y],tinted:false}));
      changes.push({kind:'uniform-map-cover',nodeId:img.id,viewportId:vp.id,scale,width:img.width,height:img.height,x:img.x,y:img.y,markerId:marker.id});
    }
    if(nodes.support){
      const {viewport:vp,support,document}=nodes;
      assert(vp.width===288 && vp.height===324 && vp.clipsContent && document.parent===vp,'Unexpected medium crop');
      const cropEnd=absolute(support).y-absolute(vp).y;
      assert(Math.abs(cropEnd-316)<0.01,'Expected the observed 8px control fragment');
      vp.resize(vp.width,cropEnd);
      assert(vp.overflowDirection==='NONE','Medium must not scroll');
      changes.push({kind:'end-crop-before-whole-control-row',nodeId:vp.id,height:vp.height,documentId:document.id,retainedControlRow:support.id});
    }
    if(nodes.restrictionDetail){
      const edits=[
        [nodes.restrictionDetail,'暂不能进入该地点，请先核实开放情况。','暂不能进入。天气为20:40缓存，请核实。'],
        [nodes.temperatureLabel,'气温','气温 · 缓存'],
        [nodes.windLabel,'风速','风速 · 缓存']
      ];
      for(const [n,before,after] of edits){
        assert(n.type==='TEXT' && n.characters===before,`Unexpected source text ${n.id}`);
        const h=n.height;n.characters=after;
        assert(n.height<=h+0.01,`Text unexpectedly wrapped at ${n.id}`);
        changes.push({kind:'cache-identity-copy',nodeId:n.id,before,after});
      }
      assert(nodes.viewport.overflowDirection==='VERTICAL','Large must retain its scroll owner');
    }
    if(nodes.observationGrayVector){
      const n=nodes.observationGrayVector;
      assert(n.type==='VECTOR' && Array.isArray(n.fills) && n.fills.length===1 && n.fills[0].type==='SOLID','Unexpected observation vector paint');
      const c=n.fills[0].color;
      assert(Math.round(c.r*255)===40 && Math.round(c.g*255)===43 && Math.round(c.b*255)===41,'Not the observed #282b29 vector');
      n.fills=n.fills.map(p=>({...p,color:color('#ff6b58')}));
      changes.push({kind:'observation-owned-vector-palette',nodeId:n.id,before:'#282b29',after:'#ff6b58'});
    }
    if(nodes.selectedMasterStar){
      // This master is unique to the selected specimen, not a shared default.
      for(const n of [nodes.selectedMasterStar,nodes.selectedInstanceStar]){n.fills=paint(spec.favoriteFill);n.strokes=paint(spec.favoriteStroke);}
      for(const prior of untouchedStates)assert(StarwardFigma.fingerprint(prior.node)===prior.fingerprint,`Non-selected state changed: ${prior.node.id}`);
      changes.push({kind:'selected-star-fill',masterId:nodes.selectedMaster.id,masterVectorId:nodes.selectedMasterStar.id,instanceId:nodes.selectedInstance.id,instanceVectorId:nodes.selectedInstanceStar.id,fill:spec.favoriteFill,stroke:spec.favoriteStroke,unchangedStateNodes:untouchedStates.map(s=>s.node.id)});
    }
    const metadata=JSON.parse(root.getPluginData('coverageMetadata') || '{}');
    metadata.readbackFix={revision,changes};
    metadata.controlVisibility={};
    for(const n of root.findAll(n=>Boolean(n.getPluginData('controlKey')))){
      const key=n.getPluginData('controlKey'),o=absolute(n);let left=o.x,top=o.y,right=o.x+n.width,bottom=o.y+n.height,hidden=!n.visible;
      for(let p=n.parent;p && p.type!=='PAGE' && p.type!=='DOCUMENT';p=p.parent){
        if(!p.visible)hidden=true;if(p.clipsContent){const po=absolute(p);left=Math.max(left,po.x);top=Math.max(top,po.y);right=Math.min(right,po.x+p.width);bottom=Math.min(bottom,po.y+p.height);}
      }
      const area=hidden?0:Math.max(0,right-left)*Math.max(0,bottom-top);
      metadata.controlVisibility[key]={visible:area>0,fullyVisible:area>=n.width*n.height-0.01,clipped:!hidden&&area<n.width*n.height-0.01,width:n.width,height:n.height};
    }
    metadata.notFullyVisibleControls=Object.keys(metadata.controlVisibility).filter(k=>!metadata.controlVisibility[k].fullyVisible);
    root.setPluginData('coverageMetadata',JSON.stringify(metadata));
    const scrollOwners=root.findAll(n=>n.name==='Document viewport / only large scrolls').map(n=>({id:n.id,clipsContent:n.clipsContent,overflowDirection:n.overflowDirection,width:n.width,height:n.height}));
    // Caller saves these real bytes and same-round snapshots under new filenames.
    const evidence=exportChanged?await StarwardFigma.exportBoard(root,{fileKey,revision}):null;
    readbacks.push({id:spec.id,rootId:root.id,revision,changes,scrollOwners,metadata,fingerprint:StarwardFigma.fingerprint(root),evidence});
  }
  return {revision,readbacks,unchangedPhoto:'1:6928',coreAB:'untouched'};
}
