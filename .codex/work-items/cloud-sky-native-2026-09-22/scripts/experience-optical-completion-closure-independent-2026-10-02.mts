import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {skySdssOpticalFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame';
import {resolvedSkyBodyReferences} from '../../../../apps/wechat-miniapp/src/features/sky/sky-body-label-presentation';
import {sdssOpticalPresentation} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection';

const ROOT=resolve(fileURLToPath(new URL('../../../../',import.meta.url))),OUT=join(ROOT,'output/optical-completion-consumer-independent-closure-1002-r1');
assert(!existsSync(OUT));mkdirSync(OUT);
const bind=(path:string)=>{const file=resolve(ROOT,path),b=readFileSync(file);return{path:relative(ROOT,file).replaceAll('\\','/'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
const own='output/optical-completion-consumer-independent-1002-r5',peer='output/science-optical-completion-consumer-1002-r2';
const priorBindings=JSON.parse(readFileSync(join(ROOT,own,'binding-before.json'),'utf8'));
assert.deepEqual(JSON.parse(readFileSync(join(ROOT,own,'binding-after.json'),'utf8')),priorBindings);
for(const r of priorBindings)assert.deepEqual(bind(r.path),r);
const peerBindings=JSON.parse(readFileSync(join(ROOT,peer,'bindings.json'),'utf8'));
for(const r of peerBindings.bindings){const b=bind(r.file);assert.equal(b.sha256,r.sha256);assert.equal(b.bytes,r.bytes);}
for(const r of peerBindings.preserved)assert.equal(bind(r.path).sha256,r.sha256);
const extra=['apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame.ts','apps/wechat-miniapp/src/features/sky/sky-body-label-presentation.ts','apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts',
  'apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-level-composition.ts',peer+'/checks.json',peer+'/bindings.json',
  'output/science-optical-completion-consumer-1002-r1/checks.json','output/science-optical-completion-consumer-1002-r1/bindings.json',own+'/result.json',own+'/executed-script.mts.txt'];
const all=new Set([...priorBindings.map((r:any)=>r.path),...peerBindings.bindings.map((r:any)=>r.file),...peerBindings.preserved.map((r:any)=>r.path),...extra,
  relative(ROOT,fileURLToPath(import.meta.url)).replaceAll('\\','/')]);
for(let n=1;n<=4;n++)for(const p of readdirSync(join(ROOT,`output/optical-completion-consumer-independent-1002-r${n}`)))all.add(`output/optical-completion-consumer-independent-1002-r${n}/${p}`);
const before=[...all].sort().map(bind);writeFileSync(join(OUT,'binding-before.json'),JSON.stringify(before,null,2));
writeFileSync(join(OUT,'executed-script.mts.txt'),readFileSync(fileURLToPath(import.meta.url)));
try{
  const page=readFileSync(join(ROOT,'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'),'utf8');
  function options(text:string){const source=ts.createSourceFile('page.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const calls:ts.CallExpression[]=[];
    function visit(n:ts.Node){if(ts.isCallExpression(n)&&n.expression.getText(source)==='createSkyGpuRenderer')calls.push(n);ts.forEachChild(n,visit);}visit(source);
    assert.equal(calls.length,1);const call=calls[0]!;assert.equal(call.arguments.length,3);assert(ts.isObjectLiteralExpression(call.arguments[2]));
    const keys=call.arguments[2].properties.map(p=>{assert(p.name);return p.name.getText(source);});return{source,call,value:call.arguments[2],keys,configured:keys.includes('artworkContributions')};
  }
  const actual=options(page);assert.equal(actual.configured,false);assert.deepEqual(actual.keys,['nativeNavigationHeightPx','imageFailed']);
  const inserted=ts.factory.createPropertyAssignment('artworkContributions',ts.factory.createObjectLiteralExpression([
    ts.factory.createPropertyAssignment('auxiliaryBytesLimit',ts.factory.createNumericLiteral(16*1024*1024)),ts.factory.createPropertyAssignment('maxGroups',ts.factory.createNumericLiteral(1))]));
  const mutated=ts.factory.updateCallExpression(actual.call,actual.call.expression,actual.call.typeArguments,[...actual.call.arguments.slice(0,2),ts.factory.updateObjectLiteralExpression(actual.value,[...actual.value.properties,inserted])]);
  const mutation=ts.createPrinter().printNode(ts.EmitHint.Expression,mutated,actual.source);assert.equal(options(mutation).configured,true);
  writeFileSync(join(OUT,'actual-gpu-constructor-call.txt'),actual.call.getText(actual.source));writeFileSync(join(OUT,'mutation-plural-option-call.txt'),mutation);
  const manifest=JSON.parse(readFileSync(join(ROOT,'output/sdss-science-optical-writer-1002-r1/publication/manifest.json'),'utf8'));
  const fine={},coarse={},frame=skySdssOpticalFrame({publication:manifest,image:fine,renderedLevel:'DETAIL',renderedAsset:manifest.levels.DETAIL,
    coarser:{image:coarse,level:'MEDIUM',asset:manifest.levels.MEDIUM}});assert(frame&&'sciencePublication' in frame);assert.strictEqual(frame.asset,manifest.levels.DETAIL);assert.strictEqual(frame.coarser!.asset,manifest.levels.MEDIUM);
  assert.equal(skySdssOpticalFrame({publication:manifest,image:fine,renderedLevel:'DETAIL',renderedAsset:{...manifest.levels.DETAIL},coarser:null}),null);
  assert.deepEqual(resolvedSkyBodyReferences({width:750,objects:[{reference:'PLANET:SATURN',hitDisc:{majorRadiusPx:12}},{reference:'SOLAR:MOON',hitDisc:{majorRadiusPx:11}},{reference:'M:51',hitDisc:{majorRadiusPx:20}}]} as any),['PLANET:SATURN']);
  assert.equal(sdssOpticalPresentation({requested:false,photoPresented:true,canvasVisible:true,failed:true,loading:true}),'CREDIT');assert.equal(sdssOpticalPresentation({requested:false,photoPresented:true,canvasVisible:false,failed:false,loading:false}),'NONE');
  const result={status:'passed',scope:'Static actual constructor option plus bounded extra pure-owner checks and read-only source/output closure; no repeat of ten completion controls or GPU.',
    correctedDefaultOracle:{actualOptionKeys:actual.keys,actualPluralConfigured:false,inMemoryCorrectPluralDetected:true,r5Limitation:'Historical r5 singular artworkContribution spelling cannot prove this assertion; this separate current AST check and mutation are the useful oracle.'},
    missingDirectImportBinding:{files:extra.slice(0,3),scope:'Current additive closure plus bounded frame/body/status function execution. These files were not separately prebound by historical r5 three-entry graph; this does not backdate its receipt.'},
    controls:{exactScienceDescriptors:true,foreignDescriptorRejected:true,bodyReferenceThresholdPreserved:true,statusCreditUsesPhotoPresented:true},
    peer:{bindingsExact:peerBindings.bindings.length,retainedFilesExact:peerBindings.preserved.length,receipts:'Peer r1 actual 43 checks/old-page failure and r2 dome/TSC are read-only author receipts, not this independent execution.'},
    inputs:before.length,priorFailedGenerations:['r1 multi-entry build missing outdir','r2 AST failed property matched unrelated data field','r3 failure observation setter no-op','r4 Error realm mismatched; page correctly used canvas_unavailable fallback'],
    acceptanceScope:'No science-group rendering, local readability, native callback timing, WEAPP pixels, total memory or image quality adoption.'};
  const after=before.map(r=>bind(r.path));assert.deepEqual(after,before);writeFileSync(join(OUT,'binding-after.json'),JSON.stringify(after,null,2));writeFileSync(join(OUT,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({result:bind(relative(ROOT,join(OUT,'result.json'))),binding:bind(relative(ROOT,join(OUT,'binding-before.json')))}));
}catch(error){writeFileSync(join(OUT,'failed.json'),JSON.stringify({error:String(error),stack:(error as Error).stack},null,2));throw error;}
