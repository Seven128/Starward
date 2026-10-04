import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fingerprintBundle} from '../../../../tools/miniapp/release-bundle-artifact.mjs';
const root=process.cwd(), evidence=path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22/evidence');
const output=path.join(evidence,'experience-optical-boundary-baseline-2026-09-29.json');
await assert.rejects(fs.access(output),{code:'ENOENT'});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const candidate=JSON.parse(await fs.readFile(path.join(evidence,'experience-combined-clean-v29-candidate-2026-09-29.json'),'utf8'));
assert.equal((await fingerprintBundle(path.join(root,candidate.bundle))).sha256,candidate.fingerprint.sha256);
for(const input of candidate.sourceInputs)assert.equal(digest(await fs.readFile(path.join(root,input.file))),input.sha256,input.file);
const owners=['use-sky-sdss-optical.ts','sky-scene-render.ts','spot-sky-page.tsx'];
const sourceCopies=[];
for(const name of owners){
 const original='apps/wechat-miniapp/src/features/sky/'+name,bytes=await fs.readFile(path.join(root,original));
 const copy='experience-optical-boundary-baseline-source/'+name;
 await fs.mkdir(path.dirname(path.join(evidence,copy)),{recursive:true});
 await fs.writeFile(path.join(evidence,copy),bytes,{flag:'wx'});
 sourceCopies.push({original,copy,sha256:digest(bytes)});
}
const traceFile='experience-optical-boundary-native-2026-09-29.jsonl',traceBytes=await fs.readFile(path.join(evidence,traceFile));
const events=traceBytes.toString().trim().split(/\r?\n/).map(line=>JSON.parse(line));
const captures=events.filter(row=>row.value.path?.endsWith('.png')).map(row=>({stage:row.stage,...row.value}));
assert.equal(captures.length,2);for(const image of captures)assert.equal(digest(await fs.readFile(image.path)),image.sha256);
const probe=async relative=>(await fetch('http://127.0.0.1:8791'+relative,{headers:{'x-starward-measurement-probe':'1'},signal:AbortSignal.timeout(10000)})).json();
const traffic=await probe('/__sky_test/traffic-status');assert.equal(traffic.heldResourceCount,0);assert.equal(traffic.active.length,0);assert.equal(traffic.resourceMode,'pass');
const reference='experience-optical-boundary-reference-m63-settled-2026-09-29.png';
const record={scope:'Frozen v29 native development baseline before any progressive optical composition source change. Native original captures actually viewed; no phone, final quality or target performance acceptance.',
 candidate:{bundle:candidate.bundle,sha256:candidate.fingerprint.sha256,sourceInputsVerified:candidate.sourceInputs.length},sourceCopies,
 trace:{file:traceFile,sha256:digest(traceBytes),events:events.length,frozen:true},captures,
 native:{objectRef:'M:63',spot:'spot:test-published',latitude:22.4826799,longitude:114.5557147,timezone:'Asia/Shanghai',at:'2026-09-29T11:00:00.000Z',civil:'2026-09-29 19:00',observationNight:'2026-09-29',revision:3,contextIdSha256:'c5c224f706fa553f9a3ea0be061a4fd00fc3d77fabc841d78db1b0ac8c35eb4d',contextFingerprint:'c197391ccb77d36ef51b359dc8a4908db8b51a703626d8cc1070cbf1b87fad12',mode:'DAY',largeText:false,logicalViewport:{width:390.3999938964844,height:844},captureViewport:{width:427,height:919},SDKVersion:'3.17.4',fields:'Native aria labels round vertical FOV to 0.15 and 0.28 degrees. Exact unrounded pose/FOV is not asserted.',currentRoundedVerticalFovDeg:.28},
 runtime:{epochStartedAt:traffic.epochStartedAt,phase:traffic.phase,totalObserved:traffic.totalObserved,heldResourceCount:traffic.heldResourceCount,activeCount:traffic.active.length,resourceMode:traffic.resourceMode},
 reference:{file:reference,sha256:digest(await fs.readFile(path.join(evidence,reference))),browser:'IAB',URL:'https://stellarium-web.org/skysource/M63?fov=0.06931280399240136&date=2026-09-29T11%3A00%3A00Z&lat=22.4826799&lng=114.5557147&elev=0',civil:'2026-09-29 19:00:08',paused:true,displayedFovDeg:.0693,cssViewport:{width:390.3999938964844,height:844},backingViewport:{width:390,height:844},intendedVerticalFovDeg:.15,
  limitations:'Public URL and prior public information panel denote M63; final raster has another RX J1518.5+4201 label. Camera/registration equivalence is NOT certified. Different historical optical dataset and display response, plus 8 seconds and native rounded FOV; no pixel comparison or source adoption. Earlier live-clock/arrow/setValue trials and provisional raster are not matched evidence. Viewport reset after capture.'},
 finding:'The real M63 MEDIUM source contains structure through its finite edges; OVERVIEW includes a larger outer field. The single selected field currently removes that independently valid outer structure. A display taper is not missing-data coverage. Planned coarse/fine composition uses the same publication, exact registration and existing bounded native owner; no cross-spectrum W3 composition.'};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,sourceInputsVerified:candidate.sourceInputs.length,events:events.length,captures:captures.length,referenceCameraEquivalence:'unverified',totalObserved:traffic.totalObserved}));
