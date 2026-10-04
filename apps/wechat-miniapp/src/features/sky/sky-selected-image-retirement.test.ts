import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.createSourceFile('spot-sky-page.tsx',readFileSync(new URL('./spot-sky-page.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const callbacks=new Map<string,string>();let decodeEffect:string|undefined;
function visit(node:ts.Node){
 if(ts.isVariableDeclaration(node)&&['setDeepSkyImageAsset','setCanvasDeepSkyImage','retireDeepSkyDecode'].includes(node.name.getText(source)))
  callbacks.set(node.name.getText(source),(node.initializer as ts.CallExpression).arguments[0]!.getText(source));
 if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&node.arguments[0]?.getText(source).includes('const image = node.createImage()'))decodeEffect=node.arguments[0].getText(source);
 ts.forEachChild(node,visit);
}visit(source);assert.equal(callbacks.size,3);assert(decodeEffect);
function world(separate:boolean){
 const releases:number[]=[];
 const file=(id:number)=>({reference:'M:51',level:'DETAIL',release:()=>releases.push(id)});
 const recovery=file(1),requested=separate?file(2):recovery,image={onload:()=>{},onerror:()=>{}};
 const env:any={pageVisible:true,selectedDeepSkyEntry:{objectRef:'M:51'},desiredDeepSkyImageLevel:'DETAIL',
  canvasNodeRef:{current:null},deepSkyImageFileRef:{current:requested},deepSkyRecoveryFileRef:{current:recovery},
  canvasDeepSkyImageRef:{current:{...recovery,image,canvasGeneration:1}},deepSkyImageAsset:requested,deepSkyImageState:'READY'};
 env.storeDeepSkyImageAsset=(value:any)=>{env.deepSkyImageAsset=value;};env.storeCanvasDeepSkyImage=(value:any)=>{env.canvasDeepSkyImage=value;};
 env.setDeepSkyImageState=(value:any)=>{env.deepSkyImageState=value;};
 const context=vm.createContext(env),evaluate=(s:string)=>vm.runInContext(ts.transpileModule('('+s+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 for(const [name,code]of callbacks)env[name]=evaluate(code);
 return {env,releases,image,run:evaluate(decodeEffect!)};
}
test('page hide releases both selected file roles once, including a shared lease',()=>{
 for(const separate of [false,true]){const w=world(separate);w.env.pageVisible=false;w.run();
  assert.equal(w.env.deepSkyImageFileRef.current,null);assert.equal(w.env.deepSkyRecoveryFileRef.current,null);
  assert.equal(w.env.canvasDeepSkyImageRef.current,null);assert.equal(w.env.deepSkyImageState,'IDLE');
  assert.deepEqual(w.releases,separate?[2,1]:[1]);assert.equal(w.image.onload,null);assert.equal(w.image.onerror,null);
  w.run();assert.deepEqual(w.releases,separate?[2,1]:[1],'repeated hidden effect cannot release again');}
});
test('visible native reconstruction gap retains selected file recovery until the new Canvas exists',()=>{
 const w=world(true);w.run();assert.deepEqual(w.releases,[]);
 assert(w.env.deepSkyImageFileRef.current);assert(w.env.deepSkyRecoveryFileRef.current);
});
