import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const read=async(file:string)=>JSON.parse(await fs.readFile(file,'utf8'));
const basePath=task+'/evidence/experience-area-display-support-binding-2026-09-30.json';
const base=await read(basePath);
for(const source of base.sourceHashes)assert.equal(sha(await fs.readFile(source.path)),source.sha256,source.path);
const representativePath='output/playwright/cloud-sky-current-deep-field-effect-0930/result.json';
const representative=await read(representativePath);
const pointPath='output/playwright/cloud-sky-current-point-submission-0930/result.json';
const points=await read(pointPath);
assert.equal(points.reportSha256,representative.reportSha256);
assert.equal(points.productionBundleSha256,representative.productionBundleSha256);
for(const input of [...representative.sourceHashes,...points.sourceHashes])assert.equal(sha(await fs.readFile(input.path)),input.sha256,input.path);
assert.equal(sha(await fs.readFile(task+'/tmp/v49-current-public-report.json')),representative.reportSha256);
const captures=[];
for(const [result,directory] of [[representative,path.dirname(representativePath)],[points,path.dirname(pointPath)]] as const){
  assert.deepEqual(result.errors,[]);
  for(const row of result.rows){
    assert.equal(row.glError,0);
    const file=path.join(directory,row.image).replaceAll('\\','/');
    assert.equal(sha(await fs.readFile(file)),row.imageSha256,file);
    captures.push({path:file,sha256:row.imageSha256});
  }
}
assert.equal(representative.rows.length,30);
for(const reference of ['M:81','M:82','M:101','M:63','M:27','M:57']){
  const rows=representative.rows.filter((row:any)=>row.reference===reference);
  assert.equal(rows.length,5);
  assert.deepEqual(rows.map((row:any)=>row.level),['OVERVIEW','MEDIUM','DETAIL','DETAIL','OVERVIEW']);
  assert(rows.every((row:any)=>row.changed>0&&row.paintedDeepSky&&row.references.includes(reference)&&row.frameAt===row.at));
  assert.equal(rows[0].rgbaSha256,rows[4].rgbaSha256);
}
assert.deepEqual(representative.retired,{resources:{created:60,deleted:60},files:{writes:18,removes:18,failed:0},failures:[]});
assert.equal(points.rows.find((row:any)=>row.condition.name==='common').counters.pointDraws,1);
assert.equal(points.rows.find((row:any)=>row.condition.name==='dome').counters.pointDraws,2);
const bounds=await read(task+'/tmp/current-artwork-alpha-bounds.json');
assert.equal(bounds.length,85);
assert(bounds.every((image:any)=>image.alphaBox.every((value:number,index:number)=>value===[0,0,image.width,image.height][index])));
const possibleCropSavings=bounds.reduce((sum:number,image:any)=>sum+image.decodedBytes-image.rgbBoundBytes,0);
assert.equal(possibleCropSavings,4600428);
assert(possibleCropSavings<22806528-16*1024*1024);
const sourcePath='output/allwise-w3-m82-source-0930/candidate-detail/candidate-result.json';
const science=await read(sourcePath);
assert.equal(science.sourceTileCount,6);assert.equal(science.levels.length,0);
const checked=science.sourceFiles.filter((file:any)=>file.state==='CHECKED');
assert.equal(checked.length,3);assert.equal(science.sourceBytes,3154368);
for(const source of checked)assert.equal(sha(await fs.readFile(path.join(path.dirname(sourcePath),'sources',source.path))),source.sha256);
const overlap=await read('output/allwise-w3-m82-source-0930/source-overlap.json');
assert.equal(overlap.knownFiniteSamples+overlap.knownNonfiniteSamples+overlap.unknownSamples,512*512);
assert.equal(overlap.knownNonfiniteSamples,19);assert(overlap.jpegAtSourceNonfinitePercentiles[0]>240);
const scienceLog=await fs.readFile(task+'/tmp/current-deep-source-python-check.log','utf8');
assert.match(scienceLog,/Ran 7 tests/);assert.match(scienceLog,/\bOK\s*$/);
const candidate=await read(task+'/tmp/v49-candidate-fingerprint.json');
const candidateRoot='apps/wechat-miniapp/dist/weapp-check-sky-scene-v49-final';
const walk=async(directory:string):Promise<string[]>=>{
  const entries=await fs.readdir(directory,{withFileTypes:true});
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):Promise.resolve([path.join(directory,entry.name)])))).flat();
};
assert.equal((await walk(candidateRoot)).length,candidate.after.fileCount);
for(const file of candidate.after.files){const bytes=await fs.readFile(path.join(candidateRoot,file.path));assert.equal(bytes.length,file.bytes);assert.equal(sha(bytes),file.sha256,file.path);}
const inputFiles=[basePath,representativePath,pointPath,sourcePath,
  'output/playwright/cloud-sky-current-deep-field-0930/result.json',
  'output/allwise-w3-m82-source-0930/source-result.json','output/allwise-w3-m82-source-0930/source-analysis.json',
  'output/allwise-w3-m82-source-0930/source-overlap.json','output/allwise-w3-m82-source-0930/candidate/candidate-result.json',
  task+'/tmp/current-artwork-alpha-bounds.json',task+'/tmp/current-deep-source-python-check.log',
  task+'/scripts/experience-current-deep-field-2026-09-30.mts',task+'/scripts/experience-current-point-submission-2026-09-30.mts',
  task+'/scripts/experience-m82-source-2026-09-30.py',task+'/scripts/experience-m82-finite-candidate-2026-09-30.py',
  task+'/scripts/experience-m82-source-overlap-2026-09-30.py',task+'/scripts/experience-current-quality-checkpoint-2026-09-30.mts',
  task+'/evidence/experience-current-representative-quality-2026-09-30.md',task+'/PLAN.md',task+'/STATE.md',task+'/INDEX.md'];
const inputs=await Promise.all(inputFiles.map(async(file)=>({path:file,sha256:sha(await fs.readFile(file))})));
const binding={recordedAtUtc:new Date().toISOString(),goal:{status:'active',budget:null},
  scope:'Current representative HTTP/LOD/color-control output, shared point submissions and partial M82 science inputs; no production/candidate changes or native/device/whole-experience acceptance',
  baseBinding:{path:basePath,sha256:inputs[0]!.sha256},inputs,captures,
  sourceHashes:base.sourceHashes,candidate:{directory:candidateRoot,sha256:candidate.after.sha256,fileCount:candidate.after.fileCount,totalBytes:candidate.after.totalBytes,allFilesUnchanged:true,opened:false,phonePushed:false},
  representative:{objects:6,conditions:30,allColorEffectsNonzero:true,allReturnsIdentical:true,retired:representative.retired,ordinaryComposition:false},
  science:{checkedTiles:3,plannedDetailTiles:6,sourceBytes:science.sourceBytes,nonfiniteSamples:19,unknownSamples:overlap.unknownSamples,newPng:false,published:false,failedRequestsRetried:false,darkPatchCause:'UNKNOWN',oldCdsMaskCertified:false},
  resources:{pointMeasurements:points.rows.map((row:any)=>({name:row.condition.name,starObjects:row.starObjects,counters:row.counters})),possibleWholeCollectionCropSavings:possibleCropSavings,commonFrameExcessBytes:22806528-16*1024*1024,targetPerformance:'UNVERIFIED'},
  runtime:{lastNative:'v47/s8 welcome, not re-read this round',currentNativeContext:'UNKNOWN',sdkConnected:'UNVERIFIED',phone:'USER_UNAVAILABLE',matchingTwilightReference:'UNVERIFIED',temporaryBrowserViewportReset:'UNCONFIRMED'},
  remaining:['whole scene quality/reference','M82 and other source/registration quality','common image uploads and full native/driver/GC peak','ordinary Canvas+WXML/breathing and complete journey','SAO/clock/orientation/lifecycle combinations','official package and costs','final necessary independent review','current Moon and Android/iOS device acceptance'],
  actions:{productionEdited:false,sourceImagesEdited:false,newPublishedData:false,newIdeWindows:false,sdkStartupRepeated:false,phoneActions:false,cloudDeployment:false,committed:false,pushed:false,otherModulesEdited:false}};
const target=task+'/evidence/experience-current-representative-quality-binding-2026-09-30.json';
await fs.writeFile(target,JSON.stringify(binding,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({target,sourceOwnersUnchanged:base.sourceHashes.length,captures:captures.length,candidate:binding.candidate,science:binding.science}));
