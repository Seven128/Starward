import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),output=join(root,'output/common-preaid-opacity-owner-1002-r1');
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const sky='apps/wechat-miniapp/src/features/sky/';
const copied=['sky-deep-auxiliary-visibility.ts','sky-object-picking.ts','sky-scene-render.ts','spot-sky-page.tsx',
 'sky-deep-auxiliary-page.test.ts','sky-optical-page-test-support.ts','sky-optical-page-acceptance.test.ts',
 'sky-dome-integration.test.ts','sky-named-star-labels.test.ts','sky-sdss-optical-page.test.ts','sky-sdss-science-scene.test.ts',
 'use-sky-artwork.ts','use-sky-sdss-optical.ts','sky-artwork-loader.ts','sky-artwork-request.ts'];
const bindings=copied.map(file=>{
 const live=join(root,sky,file),copy=join(output,file+'.txt');
 if(sha(live)!==sha(copy))throw Error('execution copy no longer matches '+file);
 return {path:sky+file,sha256:sha(live),bytes:readFileSync(live).length,executionCopy:relative(root,copy).replaceAll('\\','/')};
});
const extras=['sky-deep-auxiliary-visibility.test.ts','sky-sdss-optical-scene.test.ts','sky-target-page-labels.test.ts',
 'sky-canvas-lifecycle.ts','sky-sdss-optical-completion.ts','sky-sdss-optical-frame.ts','sky-sdss-optical-selection.ts',
 'sky-sdss-science-scene.ts','sky-view-projection.ts','sky-scene-projection.ts','sky-stellar-scene.ts','sky-fixed-image-status.ts',
 'sky-render-surface.ts','sky-body-label-presentation.ts'].map(file=>sky+file);
const tooling=['apps/wechat-miniapp/tsconfig.json','apps/wechat-miniapp/package.json','tools/run-node.cjs',
 'apps/wechat-miniapp/node_modules/typescript/package.json',
 'workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json',
 'output/sdss-science-optical-writer-1002-r1/publication/manifest.json'];
for(const path of [...extras,...tooling])bindings.push({path,sha256:sha(join(root,path)),bytes:readFileSync(join(root,path)).length,
 executionCopy:null});
const old=join(output,'old-page-source.tsx.txt'),original=join(root,'output/optical-completion-consumer-independent-1002-r5/page-source.tsx.txt');
if(sha(old)!=='d8234b9d160513f0754bc7d37e5e49a18c97fcbad8c69381fe5353143ad2831d'||sha(old)!==sha(original))throw Error('historical old page mismatch');
const result={status:'PASS_BOUNDED_DEVELOPMENT',at:new Date().toISOString(),node:process.version,
 typescript:JSON.parse(readFileSync(join(root,'apps/wechat-miniapp/node_modules/typescript/package.json'),'utf8')).version,
 branch:execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),
 head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),bindings,
 oldPage:{sha256:sha(old),originalSnapshot:relative(root,original).replaceAll('\\','/'),
  copy:'output/common-preaid-opacity-owner-1002-r1/old-page-source.tsx.txt',qualification:'exact existing saved production source; copied before this bounded check, not retrospectively reconstructed'},
 generations:{oldScene:'2d9ca9e04c62291a7224b3c78e02d6c8aec4a0ad5cace98ac79e33c37bcacf57',
  oldSceneBinding:'experience-science-scene-development-2026-10-02.md',newScene:sha(join(root,sky,'sky-scene-render.ts')),
  newPage:sha(join(root,sky,'spot-sky-page.tsx'))},
 checks:{affectedTests:{files:9,pass:59,fail:0,skip:0,log:'checks.log'},typecheck:{exit:0,result:'typecheck-result.json',rawOutput:''},
  equalityMutation:{expectedExit:1,log:'equality-mutant.log',sha256:sha(join(output,'page-equality-mutant.tsx.txt')),
   effect:'ignoring common-record equality retains previous DOM state when same sources/frame change FOV; actual test fails'},
  beforeFix:{effect:'exact old page final-source initializer computes 1 after finish retires source; actual new Scene ring scalar is between 0 and 1; new actual DOM matches ring',condition:'controlled render surface + actual source retirement after pre-aid draw'}},
 claims:['actual Scene disc scalar and immutable projected records','actual page staged/accepted publication and record equality',
  'actual DOM initializer reads accepted records','actual request lease retirement and loader emit feed full Native/SDSS Hooks then actual page draw dependency/effect request',
  'new Canvas result must be accepted before labels restore; hide/resize/remount/throw reject stale state'],
 controlledInputs:{catalogMajorAxisArcmin:11,azimuthAltitude:[20,20],nativeLease:'controlled validated lease, actual request decode/retire owner; no encoded-byte validation',
  metadata:'raw existing legacy manifest with admitted registry publicationHash assigned in Hook fixture; not original raw manifest admission',
  realReportDifference:'existing cached report actual axis13.71 is independent input evidence, not the controlled11-arcmin test geometry'},
 excluded:['GPU pixel/framebuffer verification of new Scene','WEAPP/native timing or driver races','public network/cache byte validation in the new retirement test',
  'local scientific readability certificate','new curve or science default adoption','native resource/performance budget','candidate image quality','full experience or final Goal acceptance'],
 captureScope:'15 source copies saved before final test batch; extra bindings are post-execution current files. Full transitive historical build reproduction is not certified.',
 initialAuthorErrors:{savedRawLogs:false,details:['first controlled membership fixture azimuth 35 fell outside width390; repaired to28',
  'raw legacy manifest lacked admitted publicationHash, so no Hook decode; added existing admitted hash',
  'TS null flow narrowing around opaque callback needed explicit controlled-state cast']}};
for(const name of ['checks.log','typecheck-result.json','equality-mutant.log'])if(!existsSync(join(output,name)))throw Error('missing '+name);
writeFileSync(join(output,'source-bindings.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,typescript:result.typescript,sourceBindings:bindings.length,
 sha256:sha(join(output,'source-bindings.json'))}));
