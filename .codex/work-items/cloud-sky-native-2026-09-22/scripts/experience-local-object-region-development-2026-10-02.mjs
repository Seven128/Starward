import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),APP=path.join(ROOT,'apps/wechat-miniapp');
const OUT=path.join(ROOT,'output/local-object-region-development-1002-r1');
assert(fs.existsSync(path.join(OUT,'before-fixture.log')));
assert(!fs.existsSync(path.join(OUT,'inputs-before.json')));
const sky='apps/wechat-miniapp/src/features/sky/';
const tests=['sky-deep-sky-region.test.ts','sky-deep-auxiliary-page.test.ts','sky-sdss-science-scene.test.ts',
 'sky-sdss-science-registration.test.ts','sky-sdss-optical-completion.test.ts','sky-sdss-optical-page.test.ts',
 'sky-optical-page-acceptance.test.ts','sky-sdss-optical-scene.test.ts','sky-canvas-time.test.ts','sky-sdss-optical-frame.test.ts'];
const replay='.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-local-object-region-production-2026-10-02.mts';
const appRequire=createRequire(path.join(APP,'package.json')),external=new Map();
const graph=await build({absWorkingDir:ROOT,entryPoints:[...tests.map(p=>sky+p),sky+'spot-sky-page.tsx',replay],
 bundle:true,write:false,metafile:true,platform:'node',format:'esm',outdir:'unused-readonly-graph',
 tsconfig:path.join(APP,'tsconfig.json'),packages:'external',loader:{'.scss':'text','.svg':'text','.png':'dataurl'},
 logLevel:'silent',plugins:[{name:'actual-workspace-resolution',setup(b){
  b.onResolve({filter:/^@starward\//},args=>({path:appRequire.resolve(args.path)}));
  b.onResolve({filter:/^[^./]/},args=>{
   if(args.path.startsWith('@/'))return;
   if(args.path.startsWith('@starward/'))return;
   try{external.set(args.path,appRequire.resolve(args.path));}catch{external.set(args.path,null);}
   return {path:args.path,external:true};
  });
 }}]});
const read=p=>fs.readFileSync(path.join(ROOT,p)),sha=b=>createHash('sha256').update(b).digest('hex');
const rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const binding=p=>{const b=read(p);return{path:p,bytes:b.length,sha256:sha(b)};};
const save=(name,value)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const extra=['packages/astronomy-core/data/opengc-messier-deep-sky.v1.json',
 'packages/astronomy-core/data/opengc-messier-deep-sky.v1.manifest.json',
 '.codex/work-items/cloud-sky-native-2026-09-22/tmp/current-native-report-2026-10-01.json',
 'output/sdss-science-optical-writer-1002-r1/publication/manifest.json',
 'output/sdss-science-optical-writer-1002-r1/publication/M-51-overview.png',
 'output/sdss-science-optical-writer-1002-r1/publication/M-51-medium.png',
 'output/sdss-science-optical-writer-1002-r1/publication/M-51-detail.png',
 'output/contribution-fbo-independent-1002-r2/executed-script.mts.txt',
 'output/playwright/cloud-sky-science-scene-1002-r3/observations.json',
 'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json',
 'workers/miniapp-api/src/deep-sky-scene-provider.ts','packages/miniapp-contracts/src/types.ts',
 'apps/wechat-miniapp/src/features/sky/sky-sdss-science-registration.fixture.json',
 'workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json',
 'apps/wechat-miniapp/package.json','apps/wechat-miniapp/tsconfig.json','tools/run-node.cjs',
 'apps/wechat-miniapp/node_modules/typescript/package.json','apps/wechat-miniapp/node_modules/typescript/lib/typescript.js',
 'apps/wechat-miniapp/node_modules/typescript/lib/tsc.js','node_modules/typescript/package.json',
 'node_modules/typescript/lib/typescript.js','node_modules/tsx/package.json','node_modules/esbuild/package.json',
 rel(fileURLToPath(import.meta.url))];
const imported=Object.keys(graph.metafile.inputs).map(p=>p.replaceAll('\\','/'));
const externalFiles=[...external.values()].filter(p=>p&&path.isAbsolute(p)).map(rel);
const files=[...new Set([...imported,...extra,...externalFiles])].sort();
const before=files.map(binding);save('inputs-before.json',before);save('import-graph.json',{
 scope:'esbuild static internal graph for actual page, affected tests and actual region CPU replay; external package entry files bound, not full vendor/platform transitive reproduction',
 entryPoints:[...tests.map(p=>sky+p),sky+'spot-sky-page.tsx',replay],metafile:graph.metafile,
 external:[...external].map(([specifier,entry])=>({specifier,entry:entry?rel(entry):null})),
 resolver:'actual app createRequire resolves @starward workspace default exports; app tsconfig resolves @/; platform and other vendor imports external; no generated bundle executed'});
const copies=['sky-deep-sky-region.ts','sky-sdss-science-scene.ts','sky-scene-render.ts','spot-sky-page.tsx',
 'sky-deep-sky-region.test.ts','sky-canvas-time.test.ts','sky-sdss-science-scene.test.ts'];
for(const name of copies)fs.writeFileSync(path.join(OUT,name+'.txt'),read(sky+name),{flag:'wx'});
const run=(name,args,cwd=APP)=>new Promise(resolve=>{
 const log=fs.createWriteStream(path.join(OUT,name+'.log'),{flags:'wx'}),started=new Date().toISOString();
 const child=spawn(process.execPath,[path.join(ROOT,'tools/run-node.cjs'),...args],{cwd,
  env:{...process.env,CLOUD_SKY_SCIENCE_PUBLICATION_PATH:path.join(ROOT,'output/sdss-science-optical-writer-1002-r1/publication')}});
 child.stdout.on('data',chunk=>log.write(chunk));child.stderr.on('data',chunk=>log.write(chunk));
 child.on('close',(exit,signal)=>log.end(()=>resolve({name,args,cwd:rel(cwd),started,ended:new Date().toISOString(),exit,signal})));
});
const results=await Promise.all([
 run('checks',['--import','tsx','--test',...tests.map(p=>'src/features/sky/'+p)]),
 run('typecheck',['./node_modules/typescript/lib/tsc.js','--noEmit','-p','tsconfig.json']),
 run('production-replay',['--import','tsx',replay],ROOT),
]);
const after=files.map(binding);save('inputs-after.json',after);
const unchanged=JSON.stringify(before)===JSON.stringify(after);
save('check-results.json',{status:unchanged&&results.every(r=>r.exit===0)?'PASS_BOUNDED_REGION_DEVELOPMENT':'FAIL',
 at:new Date().toISOString(),node:process.version,typescriptApp:JSON.parse(read('apps/wechat-miniapp/node_modules/typescript/package.json')).version,
 typescriptReplayDecoder:JSON.parse(read('node_modules/typescript/package.json')).version,unchanged,results,
 branch:execFileSync('git',['branch','--show-current'],{cwd:ROOT,encoding:'utf8'}).trim(),
 head:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
 sourceCopies:copies.map(p=>({source:sky+p,copy:'output/local-object-region-development-1002-r1/'+p+'.txt',sha256:sha(read(sky+p))})),
 mutationScope:'actual-owner in-memory tests replace full-axis half-angle divisor and north-east major-axis sign; exact oblique ray witnesses expose wrong membership. Source files are never mutated.',
 claims:['catalog geometry and optional frozen exact-science-submission domain','shared raw-plane/report rotation/actual inverse CPU replay',
  'affected actual Scene/page accepted opacity and completion/retirement controls','continuous model preserves static center and missing old center'],
 excluded:['band segmentation','local readability decision or threshold','GPU pixels/native/WEAPP timing','science default adoption','new auxiliary budget','source quality repair','final Goal acceptance'],
 historical:'prior common-opacity Scene e11 and page522 source evidence retained; new Scene does not upgrade historical software-GPU evidence'});
assert(unchanged,'actual graph changed during checks');
console.log(JSON.stringify({status:results.every(r=>r.exit===0)?'PASS_BOUNDED_REGION_DEVELOPMENT':'FAIL',results,inputs:files.length,
 bindingSha256:sha(read('output/local-object-region-development-1002-r1/inputs-before.json'))}));
assert(results.every(r=>r.exit===0),'affected check failure; actual logs retained');
