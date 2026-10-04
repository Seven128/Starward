/** Existing release/static artifacts read-only; no Docker/HTTP/remote changes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),file=p=>path.join(ROOT,p);
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const bound=p=>{const raw=fs.readFileSync(file(p));return{path:p,bytes:raw.length,sha256:sha(raw)}};
const text=p=>fs.readFileSync(file(p),'utf8'),json=p=>JSON.parse(text(p));
const sources=['infrastructure/deployment/Caddyfile','infrastructure/deployment/Caddyfile.operator-preview',
  'infrastructure/deployment/compose.yml','infrastructure/deployment/compose.operator-preview.yml',
  'infrastructure/deployment/sky-resource-logging.caddy','infrastructure/deployment/env/deploy.env.example',
  'infrastructure/deployment/miniapp-api.Dockerfile','infrastructure/deployment/run-remote-promotion.sh',
  'tools/deployment/release.mjs','tools/deployment/operator-preview.mjs','tools/deployment/operator-preview-checks.mjs',
  'tools/deployment/compose-runtime.mjs','tools/deployment/validate-release-environment.mjs',
  'tools/deployment/prepare-release-candidate.mjs','tools/deployment/promote-release-candidate.mjs',
  'tools/deployment/promotion-request.mjs','tools/deployment/public-readiness.mjs',
  '.github/workflows/backend-staging.yml','.github/workflows/backend-production.yml',
  'workers/miniapp-api/src/sky-public-asset-export.ts','workers/miniapp-api/src/sky-public-asset-headers.ts',
  'workers/miniapp-api/tsconfig.build.json','workers/miniapp-api/package.json'];
const before=sources.map(bound),original=new Map(sources.map(p=>[p,text(p)]));
const protectedPaths=new Set(sources);
function inventory(p){for(const entry of fs.readdirSync(file(p),{withFileTypes:true})){
  const name=p+'/'+entry.name;if(entry.isDirectory())inventory(name);else if(entry.isFile())protectedPaths.add(name);
}}
const bundle='output/sky-static-approved-export-1002-r3/publication';
inventory(bundle);inventory('workers/miniapp-api/assets/deep-sky');
const baseline='.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json';
protectedPaths.add(baseline);for(const item of json(baseline)){assert.equal(bound(item.path).sha256,item.sha256);protectedPaths.add(item.path)}
const allBefore=[...protectedPaths].sort().map(bound);
const index=json(bundle+'/index.json');assert.equal(index.schemaVersion,'starward-sky-static-export-v1');
assert.equal(sha(JSON.stringify(index.records)),index.publicationHash);assert.equal(index.records.length,136);
const records=index.records.map(record=>{
  assert.ok(record.route.startsWith('/v2/sky/'));assert.ok(!record.route.includes('//'));
  assert.ok(record.route.split('/').every(p=>p!=='.'&&p!=='..'));
  const p=bundle+'/files'+record.route;assert.ok(fs.lstatSync(file(p)).isFile());assert.ok(!fs.lstatSync(file(p)).isSymbolicLink());
  const actual=bound(p);assert.equal(actual.bytes,record.bytes);assert.equal(actual.sha256,record.sha256);
  assert.ok(fs.realpathSync(file(p)).startsWith(fs.realpathSync(file(bundle+'/files'))+path.sep));
  return{route:record.route,actual,headers:record.headers};
});
const fragment=text(bundle+'/delivery.caddy');
const paths=[...fragment.matchAll(/^\tpath (.+)$/gm)].flatMap(m=>m[1].trim().split(' '));
assert.equal(new Set(paths).size,136);assert.deepEqual([...paths].sort(),index.records.map(r=>r.route).sort());
assert.equal(fragment.match(/\tmethod GET HEAD/g)?.length,fragment.match(/\tfile \{/g)?.length);
assert.ok(!fragment.includes('*'));assert.ok(fragment.includes('root /srv/sky-public/files'));
for(const p of ['infrastructure/deployment/Caddyfile','infrastructure/deployment/Caddyfile.operator-preview']){
  assert.ok(original.get(p).includes('reverse_proxy api:8787'));assert.ok(!original.get(p).includes('delivery.caddy'));
}
assert.ok(!original.get('infrastructure/deployment/compose.yml').includes('/srv/sky-public'));
assert.ok(!original.get('infrastructure/deployment/compose.operator-preview.yml').includes('/srv/sky-public'));
assert.ok(original.get('infrastructure/deployment/compose.operator-preview.yml').includes('volumes: !override'));
assert.ok(original.get('tools/deployment/promotion-request.mjs').includes('release_request_fields_invalid'));
assert.ok(!original.get('tools/deployment/prepare-release-candidate.mjs').includes('SKY_PUBLIC'));
assert.ok(!original.get('tools/deployment/validate-release-environment.mjs').includes('SKY_PUBLIC'));
assert.ok(!original.get('infrastructure/deployment/sky-resource-logging.caddy').includes('/v2/sky/landscape/'));
const exportedInputs={index:bound(bundle+'/index.json'),fragment:bound(bundle+'/delivery.caddy'),
  publicationHash:index.publicationHash,files:records.length,bytes:records.reduce((n,r)=>n+r.actual.bytes,0),
  imageAndSourceIdentityInIndex:['revision','imageDigest','environment'].filter(k=>k in index),
  history:'fresh current publication owners plus one explicit legacy Moon alias; no all-version union or release identity'};
assert.equal(exportedInputs.bytes,22954411);
const output=process.argv[2];assert.ok(output?.startsWith('output/'));assert.ok(!fs.existsSync(file(output)));fs.mkdirSync(file(output));
fs.copyFileSync(fileURLToPath(import.meta.url),file(output+'/executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
for(let n=0;n<sources.length;n++)fs.writeFileSync(file(output+`/source-${String(n).padStart(2,'0')}.txt`),original.get(sources[n]),{flag:'wx'});
const save=(name,value)=>fs.writeFileSync(file(output+'/'+name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
save('review.json',{scope:'Read-only current release consumer boundary and physical approved bundle readback; not integration/deployment/HTTP/performance acceptance',
  status:'RELEASE_INTEGRATION_PENDING',sources:before,exportedInputs,records,
  observed:{formalAndPreviewStaticImport:false,composeReadOnlyBundleMount:false,previewUsesVolumeOverride:true,
    candidateAndValidatorBundleIdentity:false,requestUsesStrictV1Fields:true,stagingQualificationChecksImageOnly:true,
    apiHealthIsNotStaticQualification:true,landscapeEgressClassMissing:true},
  sixPreservedAnd201DeepSkyUnchanged:true});
const allAfter=[...protectedPaths].sort().map(bound);assert.deepEqual(allAfter,allBefore);
save('binding.json',{script:bound(output+'/executed-script.mjs.txt'),review:bound(output+'/review.json'),inputsBefore:allBefore,inputsAfter:allAfter,unchanged:true});
console.log(JSON.stringify({review:bound(output+'/review.json'),binding:bound(output+'/binding.json'),protectedInputs:allBefore.length,exportedInputs}));
