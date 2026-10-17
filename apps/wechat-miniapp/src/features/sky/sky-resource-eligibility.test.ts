import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Actual page eligibility and consumer arguments. Hook effects, native
// presentation and target quality are checked separately at their owners.
const source=ts.createSourceFile('page.tsx',readFileSync(new URL('./spot-sky-page.tsx',import.meta.url),'utf8'),
  ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['resourcePageVisible','skyResourcesActive','skyImageryActive','skyResourcesPaused'];
const declarations=new Map<string,ts.Expression>(),calls=new Map<string,ts.CallExpression>();
const consumers=[['useSkyOpticalHips',7],['useSkyTargetOptical',5],['useSkyWideFieldW3',7],['useSkyBodyImages',7],
  ['useSkyDeepSkyImage',4],['useSkyGalacticImage',5],['useSkyArtwork',3],['useSkyLandscape',2]] as const;
function visit(node:ts.Node){
  if(ts.isVariableDeclaration(node)&&node.initializer&&names.includes(node.name.getText(source)))
    declarations.set(node.name.getText(source),node.initializer);
  if(ts.isCallExpression(node)&&consumers.some(([name])=>name===node.expression.getText(source)))calls.set(node.expression.getText(source),node);
  ts.forEachChild(node,visit);
}
visit(source);assert.equal(declarations.size,names.length);assert.equal(calls.size,consumers.length);
const compile=(text:string)=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function eligibility(input:object){
  const context=vm.createContext({pageVisible:true,sourceReturn:false,rawReportData:{},mode:'NIGHT',
    report:{isError:false,data:{dataState:'FRESH'}},nativeFieldPublication:undefined,deepSkyRegistrationReady:true,
    wideFieldEnabled:true,presentedFov:45,constellationsEnabled:true,landscapeEnabled:true,...input});
  vm.runInContext(compile(names.map(name=>`const ${name}=${declarations.get(name)!.getText(source)};`).join('\n')),context);
  return consumers.map(([name,index])=>{
    const call=calls.get(name)!;
    return {name,active:vm.runInContext(compile(call.arguments[index]!.getText(source)),context),
      paused:vm.runInContext(compile(call.arguments.at(-1)!.getText(source)),context)};
  });
}
test('all image families retain only the paused Sources owner; normal hide and invalid reports retire demand',()=>{
  assert(eligibility({}).every(row=>row.active&&!row.paused));
  assert(eligibility({pageVisible:false,sourceReturn:true}).every(row=>row.active&&row.paused));
  for(const input of [{pageVisible:false},{rawReportData:undefined},{report:{isError:true,data:{dataState:'FRESH'}}},
    {report:{isError:false,data:{dataState:'EXPIRED'}}},{report:{isError:false,data:{dataState:'UNAVAILABLE'}}}])
    assert(eligibility(input).every(row=>!row.active),JSON.stringify(input));
});
test('shared eligibility keeps the actual mode and family differences',()=>{
  const red=eligibility({mode:'OBSERVATION'});
  assert.deepEqual(red.filter(row=>row.active).map(row=>row.name),['useSkyArtwork','useSkyLandscape']);
  const disabled=eligibility({wideFieldEnabled:false,constellationsEnabled:false,landscapeEnabled:false,deepSkyRegistrationReady:false});
  assert.deepEqual(disabled.filter(row=>!row.active).map(row=>row.name),['useSkyTargetOptical','useSkyWideFieldW3','useSkyArtwork','useSkyLandscape']);
  assert(eligibility({nativeFieldPublication:{},deepSkyRegistrationReady:false}).find(row=>row.name==='useSkyTargetOptical')!.active);
  assert(!eligibility({presentedFov:90}).find(row=>row.name==='useSkyGalacticImage')!.active,
    'wide-field ownership suppresses the independently declared galactic image');
});
