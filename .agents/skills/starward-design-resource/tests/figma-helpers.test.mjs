import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../scripts/figma-helpers.js',import.meta.url),'utf8');
function runtime() {
  let next=0;const nodes=new Map();
  function frame() {
    const data=new Map();
    const node={id:String(++next),type:'FRAME',name:'Frame',x:0,y:0,width:100,height:100,visible:true,children:[],removed:false,
      getPluginData:k=>data.get(k)||'',setPluginData:(k,v)=>data.set(k,v),
      appendChild(child){if(child.parent){child.parent.children=child.parent.children.filter(n=>n!==child);}this.children.push(child);child.parent=this;},
      remove(){this.removed=true;this.parent.children=this.parent.children.filter(n=>n!==this);},
      resize(w,h){this.width=w;this.height=h;}};
    nodes.set(node.id,node);return node;
  }
  const page=frame();
  const figma={fileKey:'owned-file',getNodeByIdAsync:async id=>nodes.get(id),createFrame(){const node=frame();page.appendChild(node);return node;},listAvailableFontsAsync:async()=>[{fontName:{family:'Noto Sans SC',style:'Regular'}}],loadFontAsync:async()=>{}};
  const ctx=vm.createContext({figma});vm.runInContext(source,ctx);return {figma,page,helper:ctx.StarwardFigma};
}
test('wrong file fails before mutation; rerun replaces owned root only',async()=>{
  const {helper,page}=runtime();
  await assert.rejects(helper.beginCandidate({fileKey:'other',owner:'candidate'}),/file mismatch/);assert.equal(page.children.length,0);
  const first=await helper.beginCandidate({fileKey:'owned-file',owner:'candidate'}), original=helper.commitCandidate(first);
  const other=await helper.beginCandidate({fileKey:'owned-file',owner:'other'});helper.commitCandidate(other);
  const update=await helper.beginCandidate({fileKey:'owned-file',owner:'candidate',rootId:original.rootId,expectedFingerprint:original.fingerprint});
  helper.commitCandidate(update); assert.equal(page.children.length,2);assert.equal(other.stage.removed,false);
});
test('manual edits prevent replacing original; partial writes only remove owned stage',async()=>{
  const {helper,page}=runtime(), first=await helper.beginCandidate({fileKey:'owned-file',owner:'candidate'}), saved=helper.commitCandidate(first);
  const update=await helper.beginCandidate({fileKey:'owned-file',owner:'candidate',rootId:saved.rootId,expectedFingerprint:saved.fingerprint});
  first.stage.name='human edit';assert.throws(()=>helper.commitCandidate(update),/changed/);
  helper.discardStage(update);assert.equal(page.children.length,1);assert.equal(first.stage.name,'human edit');
  await assert.rejects(helper.beginCandidate({fileKey:'owned-file',owner:'candidate',rootId:saved.rootId,expectedFingerprint:saved.fingerprint}),/manually changed/);
});
test('unavailable Chinese font fails instead of falling back to Latin',async()=>{
  const {figma,helper}=runtime();figma.listAvailableFontsAsync=async()=>[{fontName:{family:'Inter',style:'Regular'}}];
  await assert.rejects(helper.resolveFont(),/Chinese font unavailable/);
});
test('public plugin requires fresh matching browser and document identity',async()=>{
  const {figma,helper,page}=runtime();figma.fileKey=undefined;figma.root={name:'Owned draft'};figma.currentPage=page;
  assert.throws(()=>helper.requireFile('OwnedKey'),/missing fresh/);
  assert.throws(()=>helper.attestBrowserFile({observedUrl:'https://www.figma.com/design/WrongKey/x',expectedFileKey:'OwnedKey',documentName:'Owned draft',pageId:page.id}),/identity/);
  helper.attestBrowserFile({observedUrl:'https://www.figma.com/design/OwnedKey/x',expectedFileKey:'OwnedKey',documentName:'Owned draft',pageId:page.id});
  helper.requireFile('OwnedKey');figma.root.name='Different';assert.throws(()=>helper.requireFile('OwnedKey'),/mismatch/);
});
