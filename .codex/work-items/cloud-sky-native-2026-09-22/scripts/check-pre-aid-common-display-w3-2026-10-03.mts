/** Existing Scene qualified-EMPTY/W3 consumer, before/after virtual candidates.
 * CPU command surface only; no GPU/view matrix or production source edits. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath,pathToFileURL} from 'node:url';import {spawnSync} from 'node:child_process';import {createRequire} from 'node:module';
import {build} from 'esbuild';import {createCandidates,sky} from './pre-aid-common-display-candidate-sources-2026-10-03.mts';
const root=process.cwd(),task='.codex/work-items/cloud-sky-native-2026-09-22/',relative='output/pre-aid-common-display-w3-consumer-1003-r2',output=path.join(root,relative);
assert(!fs.existsSync(output));fs.mkdirSync(output,{recursive:true});
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const absolute=fs.realpathSync(path.resolve(root,p)),b=fs.readFileSync(absolute);return{path:path.relative(root,absolute).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};};
const save=(name:string,value:any)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const self=fileURLToPath(import.meta.url);fs.copyFileSync(self,path.join(output,'executed-script.mts.txt'));
const testPath=sky+'sky-sdss-science-scene.test.ts',original=fs.readFileSync(path.join(root,testPath),'utf8');
const originalCatalogue='packages/astronomy-core/data/opengc-messier-deep-sky.v1.json',reportPath=task+'tmp/current-native-report-2026-10-01.json';
const center=JSON.parse(fs.readFileSync(path.join(root,originalCatalogue),'utf8')).rows.find((row:any)=>row.objectRef==='M:51');
const entry=JSON.parse(fs.readFileSync(path.join(root,reportPath),'utf8')).data.skyScene.deepSky.catalog.entries.find((row:any)=>row.objectRef==='M:51');
let source=original.replaceAll('\r\n','\n');const changes:any[]=[];
const replace=(before:string,after:string,label:string)=>{assert.equal(source.split(before).length-1,1,label);changes.push({label,before,after});source=source.replace(before,after);};
replace('import type { SkyArtworkLevels,','import {unknownSkyArtworkLocalObservation} from "./sky-artwork-level-composition";\nimport type { SkyArtworkLevels,','bind actual UNKNOWN singleton; not fake local-positive facts');
replace('catalog: { catalogVersion: "controlled-deep",','catalog: { frame:"ICRS J2000", catalogVersion: "controlled-deep",','actual Scene ICRS-domain entry caller enabled');
replace('majorAxisArcmin: 11',`majorAxisArcmin: ${entry.majorAxisArcmin}, minorAxisArcmin:${entry.minorAxisArcmin}, positionAngleDeg:${entry.positionAngleDeg},icrsCenter:{raDeg:${center.raDeg},decDeg:${center.decDeg}}`,'real cached catalog shape/center, controlled identity observation retained');
replace('receipt?: SkyArtworkLevelsContribution; throwAt?:','receipt?: SkyArtworkLevelsContribution; w3Painted?:boolean; throwAt?:','controlled W3 actual artwork outcome');
replace('const discs: number[] = [], meshOpacities: number[] = []; let finished = false;','const discs: number[] = [], meshOpacities: number[] = []; let finished = false,localCalls=0;','actual local observer call counter');
replace('images.push(image); return true;','images.push(image); return options.w3Painted!==false;','painted versus attempted W3 kept distinct');
replace('    resetArtworkContributions() {},','    artworkLevelsObserveRegion(){localCalls++;return unknownSkyArtworkLocalObservation;},\n    resetArtworkContributions() {},','local getter yields actual UNKNOWN, count only');
replace('discs, meshOpacities };','discs, meshOpacities,getLocalCalls:()=>localCalls };','expose counter without new production API');
replace('const result = paint(s, w.frame);\n    assert.equal(result.snapshot?',`const result = paint(s, w.frame);
    console.log("W3_CONSUMER",JSON.stringify({qualification:q,opacity:result.snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity,localGetterCalls:s.getLocalCalls(),W3Painted:result.sources?.deepSkyImage===infrared.image}));
    assert.equal(result.snapshot?`,'observe actual scalar/source/getter outcome before the escaped failure');
replace('assert.equal(s.images.includes(infrared.image), q === empty);',`assert.equal(s.images.includes(infrared.image), q === empty);
    assert.equal(s.getLocalCalls(),q===empty?0:1,"whole alternative must skip the new science-local observer; HAS/UNKNOWN still use model guard");`,'useful whole alternative no-readback assertion');
replace('assert.equal(paint(s, w.frame).sources?.deepSkyImage, infrared.image, "absent parent adds no expected obligation");',`assert.equal(paint(s, w.frame).sources?.deepSkyImage, infrared.image, "absent parent adds no expected obligation");
  assert.equal(s.getLocalCalls(),0);
  const rejected=surface({qualification:empty,receipt:receipt(empty,"unknown","unknown"),w3Painted:false});
  const noPaint=paint(rejected,world().frame);
  assert.equal(noPaint.sources?.deepSkyImage,null,"an attempted W3 is not an actual painted source");
  assert.equal(noPaint.snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity,1);
  assert.equal(rejected.getLocalCalls(),0);`,'failed W3 retains legacy missing-image scalar1 without unnecessary local observation');
fs.writeFileSync(path.join(output,'original-actual-test.ts.txt'),original,{flag:'wx'});fs.writeFileSync(path.join(output,'controlled-consumer.ts'),source,{flag:'wx'});save('fixture-delta.json',{changes,scope:'Only one existing actual Scene consumer test is executed. Catalog geometry is supplied from already bound actual data so observer call omission is detectable; observation matrix and native command surface remain controlled.'});
const proposed=createCandidates(root),prior=jsonRead('output/pre-aid-common-display-candidate-1003-r3/result.json');
function jsonRead(p:string){return JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));}
const oldOwners=new Map<string,string>(prior.replacements.map((record:any)=>[record.original.path,fs.readFileSync(path.join(root,record.candidate.path),'utf8')]));
const files=new Set<string>([self,testPath,originalCatalogue,reportPath,task+'scripts/pre-aid-common-display-candidate-sources-2026-10-03.mts',task+'scripts/pre-aid-local-candidate-sources-2026-10-03.mts',process.execPath,'apps/wechat-miniapp/tsconfig.json','tools/run-node.cjs','output/pre-aid-common-display-candidate-1003-r3/result.json']);
for(const record of prior.replacements)files.add(record.candidate.path);
const branchOnly=new Map(oldOwners),sceneName=sky+'sky-scene-render.ts';
const beforeBranch='scienceSubmission?.frame.reference===entry.objectRef',afterBranch='scienceSubmission && !scienceSubmission.allowInfrared && scienceSubmission.frame.reference===entry.objectRef';
assert.equal(branchOnly.get(sceneName)!.split(beforeBranch).length-1,1);
branchOnly.set(sceneName,branchOnly.get(sceneName)!.replace(beforeBranch,afterBranch));
const tsPath=path.join(root,'apps/wechat-miniapp/node_modules/typescript/lib/typescript.js'),artifacts:any[]=[];
for(const [name,owners]of [['before',oldOwners],['branch-only-mutant',branchOnly],['after',proposed.candidates]] as const){
 for(const [p,text]of owners){const file=path.join(output,name+'-owners',p);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text,{flag:'wx'});}
 const bundle=await build({stdin:{contents:source,sourcefile:'controlled-science-scene-consumer.ts',resolveDir:path.join(root,path.dirname(testPath)),loader:'ts'},absWorkingDir:root,
   bundle:true,write:false,metafile:true,platform:'node',format:'esm',target:'es2022',tsconfig:path.join(root,'apps/wechat-miniapp/tsconfig.json'),banner:{js:'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);'},
   plugins:[{name:'exact-task-candidate-owners',setup(api){api.onResolve({filter:/^typescript$/},()=>({path:pathToFileURL(tsPath).href,external:true}));
     api.onLoad({filter:/\.ts$/},args=>{const p=path.relative(root,args.path).replaceAll('\\','/'),text=owners.get(p);return text===undefined?undefined:{contents:text,loader:'ts',resolveDir:path.dirname(args.path)};});}}]});
 const file=path.join(output,name+'.mjs');fs.writeFileSync(file,bundle.outputFiles[0]!.text,{flag:'wx'});save(name+'-metafile.json',bundle.metafile);
 for(const p of Object.keys(bundle.metafile!.inputs))if(!p.endsWith('controlled-science-scene-consumer.ts'))files.add(path.resolve(root,p));
 artifacts.push({name,file});
}
const require=createRequire(path.join(root,'package.json'));
for(const p of [tsPath,require.resolve('esbuild'),require.resolve('esbuild/package.json'),require.resolve('@esbuild/win32-x64/esbuild.exe'),require.resolve('tsx'),require.resolve('tsx/package.json')])files.add(p);
const publicationDirectory='output/sdss-science-optical-writer-1002-r1/publication';files.add(publicationDirectory+'/manifest.json');
const before=[...files].sort().map(bind);save('inputs-before.json',before);
const outcomes=artifacts.map(({name,file})=>{const result=spawnSync(process.execPath,['--test','--test-name-pattern=HAS including valid black',file],{cwd:root,env:{...process.env,CLOUD_SKY_SCIENCE_PUBLICATION_PATH:path.join(root,publicationDirectory)},encoding:'utf8'});
 fs.writeFileSync(path.join(output,name+'.log'),(result.stdout??'')+(result.stderr??''),{flag:'wx'});return{name,exitCode:result.status,error:result.error?String(result.error):null,log:bind(path.join(output,name+'.log'))};});
const after=before.map(row=>bind(row.path));assert.deepEqual(after,before);save('inputs-after.json',after);
const passed=outcomes[0].exitCode===1&&outcomes[1].exitCode===1&&outcomes[2].exitCode===0;save('result.json',{status:passed?'BOUNDED_EXISTING_W3_CONSUMER_REGRESSION_PASS':'FAILED',outcomes,before,after,
 sourceReplacements:[...proposed.candidates].map(([p,text])=>({path:p,candidateSha256:sha(text),priorSha256:sha(oldOwners.get(p)!)})),
 scope:'Before frozen R3 and after task-only Scene fork. Existing actual Scene EMPTY/W3 consumer, known cached catalog geometry, controlled command surface/identity observation/native image objects. No GL, no nine-image rerun or threshold adoption.'});
console.log(JSON.stringify({passed,outcomes,result:bind(path.join(output,'result.json'))}));assert(passed);
