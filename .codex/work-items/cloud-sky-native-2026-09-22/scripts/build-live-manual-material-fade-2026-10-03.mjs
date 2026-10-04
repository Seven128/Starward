/** Deliver manual pan to the existing browsing owner; captured follow alone is static. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));let s=fs.readFileSync(path.join(dir,'experience-live-material-fade-2026-10-03.mts'),'utf8');
const before="journeySource.replace(pendingReadiness,'w.counters().decodedPending === 0 && (!result.landscapeImage.panorama || result.landscapeImage.opacity >= 1)')";
assert.equal(s.split(before).length,2);
s=s.replace(before,before+".replace('const input = {', 'if(requested.manualPan){w.browsingCamera.pan(queuedBasis,condition.requestedCamera.progress);w.manualBasisRef.current=queuedBasis;} const input = {')");
const marker="const currentJourneyExecutor=Function";assert.equal(s.split(marker).length,2);s=s.replace(marker,"if(journeySource.split('const input = {').length!==2)throw Error('task manual command insertion mismatch');\n"+marker);
for(const name of ['upper','centre','below','return'])s=s.replace("name:'live-material-"+name+"'","name:'live-manual-material-"+name+"',manualPan:true");
s=s.replace("status:'LIVE_INTERSECTING_MATERIAL_FADE_RETURN_DEVELOPMENT'","status:'LIVE_MANUAL_INTERSECTING_MATERIAL_FADE_RETURN_DEVELOPMENT'");
fs.writeFileSync(path.join(dir,'experience-live-manual-material-fade-2026-10-03.mts'),s,{flag:'wx'});
console.log(JSON.stringify({generated:'experience-live-manual-material-fade-2026-10-03.mts',productionChanged:false}));
