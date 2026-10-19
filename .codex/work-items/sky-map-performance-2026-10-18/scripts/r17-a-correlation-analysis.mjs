// Reuse the preserved gen25 receipt. No new runtime capture, CPU pass or I/O
// beyond these existing task evidence files and the optional task summary.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { validateR17PhoneProbeMetrics } from './r17-phone-probe-v3-protocol.mjs';
const task=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file='E:/Dev/Starward-data/verification/sky-map-20261018/probe-metrics/baseline-r17-1-kld3md55q3.json';
const raw=await fs.readFile(file),sha256=crypto.createHash('sha256').update(raw).digest('hex');
assert.equal(sha256,'31046ac272dfc30e662672f5651727e3017b0c98a85f2d1b605c5edccf73dcf1');
const receipt=JSON.parse(raw);assert.equal(validateR17PhoneProbeMetrics(receipt),true);
assert.equal(receipt.binding.buildGeneration,25);assert.equal(receipt.binding.mode,'normal');
assert.equal(receipt.binding.buildSourceSha256,'10236f0e034ae96d9e31ed5e081a837a53f4cdd128e3f9ac34da6d588f151a4c');
assert.equal(receipt.clock.backwardReads,0);assert.equal(receipt.clock.invalidReads,0);
const consumed=receipt.linkage.links.filter(value=>value.consumed && value.firstAcceptedObserved);
function phase(from,to) {
  const values=[],unknown={missingEndpoint:0,belowResolution:0,invalidOrder:0};
  for(const value of consumed){const start=value[from],end=value[to];
    if(start===null||end===null)unknown.missingEndpoint++;
    else if(end<start)unknown.invalidOrder++;
    else if(end===start)unknown.belowResolution++;
    else values.push(end-start);
  }
  values.sort((a,b)=>a-b);
  return{sampledLinks:consumed.length,validCalls:values.length,unknown,knownSubtotalMs:values.reduce((s,v)=>s+v,0),
    minMs:values[0]??null,maxMs:values.at(-1)??null,p50Ms:values[Math.floor(values.length*.5)]??null,p95Ms:values[Math.floor(values.length*.95)]??null};
}
const {links:_links,...linkage}=receipt.linkage;
const result={schemaVersion:'starward-r17-a-correlation-analysis-v1',status:'GEN25_REUSED_REQUEST_BOUNDARY_MISSING_NEW_EXTENSION_SOFTWARE_READY',
  source:{file:'probe-metrics/baseline-r17-1-kld3md55q3.json',bytes:raw.length,compactBytes:Buffer.byteLength(JSON.stringify(receipt)),sha256},
  binding:receipt.binding,clock:receipt.clock,window:receipt.window,controls:receipt.controls,
  linkage,stageElapsed:receipt.stageElapsed,
  selectedLinks:{selection:'original first 16 and last 16 preparations; not a random sample',exported:receipt.linkage.links.length,consumedAndAccepted:consumed.length,
    intentToPreparation:phase('intentRelativeMs','startedRelativeMs'),preparationToPaint:phase('finishedRelativeMs','firstConsumedRelativeMs'),
    paintToFirstAccepted:phase('firstConsumedRelativeMs','firstAcceptedRelativeMs')},
  page:receipt.observations.page,
  nextObservation:{required:'first request boundary between finished presentation preparation and first paint, with Page counter positions',
    producer:'optional starward-r17-a-correlation-v1 in normal v3 receipt',candidateBuilt:false,phoneRun:false,
    keeps:'normal math/memo/accepted-state/publication/renderer/copy/caption/resource owners and original product Pause',
    limitation:'Page counter positions establish temporal overlap only, not payload identity, React render time, callback elapsed CPU or physical presentation'},
  acceptance:{A:'UNVERIFIED',B:'UNVERIFIED'},
};
if(process.argv.includes('--write'))await fs.writeFile(path.join(task,'R17-A-CORRELATION.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({source:result.source,binding:result.binding,window:result.window,
  firstAccepted:linkage.latency.intentToFirstAcceptedMs,supersededAccepted:linkage.firstAcceptedAfterSuperseded,
  consumedPreparations:linkage.consumedPreparations,unconsumedPreparations:linkage.unconsumedPreparations,costs:linkage.costs,
  selectedLinks:result.selectedLinks,nextObservation:result.nextObservation},null,2));
