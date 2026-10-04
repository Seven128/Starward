import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateSkyStaticBundle,validSkyStaticRoute,skyStaticDeliveryFragment} from '../../../../tools/deployment/sky-static-bundle.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),file=p=>path.join(root,p),sha=v=>createHash('sha256').update(v).digest('hex');
const bind=p=>{const b=fs.readFileSync(file(p));return{path:p,bytes:b.length,sha256:sha(b)}};
const out=process.argv[2];assert.match(out??'',/^output\/[a-z0-9-]+$/);assert.ok(!fs.existsSync(file(out)));fs.mkdirSync(file(out));
const save=(p,v)=>fs.writeFileSync(file(out+'/'+p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
const fresh='output/selected-w3-server-publication-1002-r2/export/publication',sealed='output/sky-static-sealed-artifact-1002-r1/publication';
const allFiles=(p)=>fs.readdirSync(file(p),{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>bind(path.relative(root,path.join(e.parentPath,e.name)).replaceAll('\\','/')));
const baseline=JSON.parse(fs.readFileSync(file('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const b of baseline)assert.equal(bind(b.path).sha256,b.sha256);
const protectedFiles=[bind('tools/deployment/sky-static-bundle.mjs'),bind('workers/miniapp-api/src/sky-public-asset-export.ts'),bind('workers/miniapp-api/src/sky-public-asset-headers.ts'),
 bind('output/selected-w3-server-publication-1002-r2/result.json'),...allFiles(fresh),...allFiles(sealed),...allFiles('workers/miniapp-api/assets/deep-sky'),...baseline.map(b=>bind(b.path))];
const bundle=await validateSkyStaticBundle(file(fresh)),old=JSON.parse(fs.readFileSync(file(sealed+'/index.json'),'utf8'));
assert.equal(bundle.files,901);assert.equal(bundle.bytes,45251305);assert.equal(old.records.length,136);
const byRoute=new Map(bundle.records.map(r=>[r.route,r]));for(const record of old.records){assert.deepEqual(byRoute.get(record.route),record);const actual=fs.readFileSync(file(fresh+'/files'+record.route));assert.equal(sha(actual),record.sha256)}
const current=JSON.parse(fs.readFileSync(file('workers/miniapp-api/assets/deep-sky/manifest.json'),'utf8')),hashes=[sha(JSON.stringify(current)),...current.previousPublicationHashes],routes=new Set(),readbacks=[];
for(const hash of hashes){const raw=hash===hashes[0]?current:JSON.parse(fs.readFileSync(file('workers/miniapp-api/assets/deep-sky/publications/'+hash+'.json'),'utf8'));assert.equal(sha(JSON.stringify(raw)),hash);
 for(const entry of raw.entries)for(const [level,asset]of Object.entries(entry.levels)){
  const route=`/v2/sky/deep-sky/${hash}/${asset.file}`,record=byRoute.get(route);assert.ok(record,route);assert.ok(!routes.has(route));routes.add(route);
  assert.equal(record.bytes,asset.bytes);assert.equal(record.sha256,asset.sha256);const original=fs.readFileSync(file('workers/miniapp-api/assets/deep-sky/'+asset.file)),exported=fs.readFileSync(file(fresh+'/files'+route));assert.deepEqual(exported,original);
  assert.equal(record.headers['x-starward-image-publication-hash'],hash);assert.equal(record.headers['x-starward-image-source-id'],`imagery:${raw.publicationId}:${hash}`);
  assert.equal(record.headers['x-starward-image-field-degrees'],String(asset.fieldDegrees));assert.equal(record.headers['x-starward-image-pixels'],String(asset.pixels));
  assert.deepEqual(record.headers['x-starward-image-display-support']?JSON.parse(record.headers['x-starward-image-display-support']):undefined,asset.displaySupport);
  assert.equal(record.headers['x-starward-image-missing-pixels'],asset.sourceFiniteMask?String(asset.sourceFiniteMask.missingPixels):undefined);
  readbacks.push({route,level,bytes:exported.length,sha256:sha(exported),sourceId:record.headers['x-starward-image-source-id'],displaySupportHeaderSHA:record.headers['x-starward-image-display-support']?sha(record.headers['x-starward-image-display-support']):null});
 }}
assert.equal(routes.size,765);assert.equal(bundle.records.filter(r=>r.route.startsWith('/v2/sky/deep-sky/')).length,routes.size);
const fragment=fs.readFileSync(file(fresh+'/delivery.caddy'));assert.deepEqual(fragment,Buffer.from(skyStaticDeliveryFragment(bundle.records)));
const mismatch=`/v2/sky/deep-sky/${hashes[0]}/M-31/M-42-detail.jpg`;assert.equal(validSkyStaticRoute(mismatch),false);
const literalProof=JSON.parse(fs.readFileSync(file('output/selected-w3-static-header-independent-1002-r5/result.json'),'utf8'));
for(const m of literalProof.realMetadata){const route=`/v2/sky/deep-sky/${hashes[0]}/${m.file}`;assert.ok(routes.has(route));assert.equal(bundle.records.find(r=>r.route===route).headers['x-starward-image-display-support'],JSON.stringify(m.displaySupport))}
save('result.json',{status:'PASS',scope:'Independent full901 files/index/fragment readback against prior136 sealed records plus original five raw W3 manifests; no regenerated export/HTTP/Docker/TLS/image/deployment/native claim.',bundle:{files:bundle.files,bytes:bundle.bytes,publicationHash:bundle.publicationHash},oldRecordsPreserved:136,selectedRawOffers:readbacks.length,fragment:bind(fresh+'/delivery.caddy'),sources:protectedFiles.slice(0,3),routeMismatchRejected:mismatch,r5LiteralHeaderAgreement:true,readbacks});
const after=protectedFiles.map(b=>bind(b.path));save('binding.json',{script:bind(out+'/executed-script.mjs.txt'),inputsBefore:protectedFiles,inputsAfter:after,unchanged:JSON.stringify(after)===JSON.stringify(protectedFiles)});assert.deepEqual(after,protectedFiles);
console.log(JSON.stringify({result:bind(out+'/result.json'),binding:bind(out+'/binding.json'),inputs:protectedFiles.length}));
