/** Cached standard-export accounting only; no server, HTTP, download or deletion. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const trial=path.join(root,'output/prepared-static-egress-1003-r1');
const output=path.join(root,'output/prepared-static-inventory-1003-r1');
const sha=value=>createHash('sha256').update(value).digest('hex');
const files=[fileURLToPath(import.meta.url),path.join(trial,'standard-export/publication/index.json'),
  path.join(trial,'result.json'),path.join(trial,'standard-export/publication/image-artifact.json'),
  path.join(root,'workers/miniapp-api/assets/deep-sky/manifest.json'),
  path.join(root,'workers/miniapp-api/src/deep-sky-imagery.ts')];
const bind=file=>{const value=fs.readFileSync(file);return {path:path.relative(root,file).replaceAll('\\','/'),bytes:value.length,sha256:sha(value)};};
const before=files.map(bind);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const index=read(files[1]),measured=read(files[2]),current=read(files[4]);
assert.equal(index.publicationHash,measured.standardExport.publicationHash);
assert.equal(index.records.length,904);
const sum=rows=>rows.reduce((total,row)=>total+row.bytes,0);
assert.equal(sum(index.records),measured.standardExport.payloadBytes);
const families=new Map(),content=new Map(),deepSky=new Map();
for(const row of index.records){
  const parts=row.route.split('/'),family=parts[3];
  assert.equal(parts.slice(0,3).join('/'),'/v2/sky');
  if(!families.has(family))families.set(family,[]);
  families.get(family).push(row);
  if(!content.has(row.sha256))content.set(row.sha256,[]);
  content.get(row.sha256).push(row);
  assert.equal(content.get(row.sha256)[0].bytes,row.bytes);
  if(family==='deep-sky'){
    const hash=parts[4];if(!deepSky.has(hash))deepSky.set(hash,[]);
    deepSky.get(hash).push(row);
  }
}
const currentHash=sha(JSON.stringify(current));
assert.deepEqual([...deepSky.keys()].sort(),[currentHash,...current.previousPublicationHashes].sort());
const prepared=families.get('prepared-optical');
assert.equal(prepared.length,3);
const result={status:'CACHED_STANDARD_EXPORT_INVENTORY_NOT_RETENTION_OR_CAPACITY_ACCEPTANCE',
  publicationHash:index.publicationHash,routeRecords:index.records.length,logicalRoutePayloadBytes:sum(index.records),
  distinctPayloadSha256:content.size,uniqueContentBytes:sum([...content.values()].map(rows=>rows[0])),
  largestSamePayloadRouteCount:Math.max(...[...content.values()].map(rows=>rows.length)),
  families:[...families].map(([family,rows])=>({family,routes:rows.length,payloadBytes:sum(rows)})),
  deepSkyPublications:[...deepSky].map(([publicationHash,rows])=>({publicationHash,
    relation:publicationHash===currentHash?'CURRENT':'EXPLICITLY_ALLOWED_PREVIOUS',routes:rows.length,payloadBytes:sum(rows)})),
  preparedCohortRequestOrder:prepared.map(row=>row.route.split('/').at(-1)),
  defaultWithoutExplicitPrepared:{routes:index.records.length-prepared.length,payloadBytes:sum(index.records)-sum(prepared),
    meaning:'Arithmetic subtraction from the explicit development export; not a separate default export run.'},
  bandwidthIllustration:{peakBitsPerSecond:12000000,bodyBytesPerSecondUpperBound:1500000,
    cohort:measured.phases.filter(row=>row.delivery==='static').map(row=>({clients:row.clients,
      imageAndMetadataBodyBytes:row.imageBodyBytes+row.metadataBodyBytes,
      idealBodySerializationSecondsLowerBound:(row.imageBodyBytes+row.metadataBodyBytes)/1500000})),
    meaning:'Conditional single unadopted object model: all three PNGs per client, no file cache. Mathematical body-only lower bound, not observed 12Mbps latency, first usable frame, full-page transfer, monthly egress or mixed-business capacity.'},
  meaning:'Routes include current and explicitly admitted previous publications and download offers. Unique SHA lengths are theoretical content deduplication, not physical allocation or deletion permission. Client demand, versions pinned by real mounts/receipts/backups, filesystem blocks, OCI/DB/log/backup and whole host capacity remain separate.'};
assert.deepEqual(files.map(bind),before);
fs.mkdirSync(output);
fs.writeFileSync(path.join(output,'inputs-before-after.json'),JSON.stringify(before,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:bind(path.join(output,'result.json')),routeRecords:result.routeRecords,
  deepSkyPublications:result.deepSkyPublications,distinctPayloadSha256:result.distinctPayloadSha256,
  largestSamePayloadRouteCount:result.largestSamePayloadRouteCount,preparedCohortRequestOrder:result.preparedCohortRequestOrder}));
