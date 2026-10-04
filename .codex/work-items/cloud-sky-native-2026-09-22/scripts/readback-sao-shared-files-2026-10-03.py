"""Read exact static bytes, pressure/late-read owners and preserve final fix epoch."""
from pathlib import Path
import json,hashlib,collections,difflib
ROOT=Path(__file__).resolve().parents[4];SOURCE=ROOT/'output/playwright/cloud-sky-live-mixed-1003-r10'
OUT=ROOT/'output/sky-sao-public-files-1003-r1'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(b):return hashlib.sha256(b).hexdigest()
def bind(p):
 b=p.read_bytes();return dict(path=p.relative_to(ROOT).as_posix(),bytes=len(b),sha256=sha(b))
client='apps/wechat-miniapp/src/services/sao-catalog-client.ts';old_client=OUT/'sao-client-before-generation-fix.ts'
before=read(SOURCE/'inputs-before.json');assert before==read(SOURCE/'inputs-after.json')
for v in before:
 b=old_client.read_bytes()if v['path']==client else(ROOT/v['path']).read_bytes();assert len(b)==v['bytes']and sha(b)==v['sha256'],v['path']
pins=read(SOURCE/'api-inputs.json')['sourceBindings'];assert len(pins)==150
for v in pins:
 b=old_client.read_bytes()if v['path']==client else(ROOT/v['path']).read_bytes();assert len(b)==v['bytes']and sha(b)==v['sha256'],v['path']
original=(SOURCE/'file-cache.original.ts').read_bytes();assert original==(ROOT/'apps/wechat-miniapp/src/services/sky-public-image-cache.ts').read_bytes()
expected=original.decode().replace('export function createSkyPublicImageCache(','function createActualSkyPublicImageCache(')+"\nexport function createSkyPublicImageCache(deps:any){const owner=createActualSkyPublicImageCache(deps);((globalThis as any).__controlled.publicFileOwners??=[]).push(owner);return owner;}\n"
assert expected.encode()==(SOURCE/'file-cache.observed.ts').read_bytes()
patch=read(SOURCE/'cache-observation-patches.json');data=(SOURCE/'response-cache.original.ts').read_bytes();assert data==(ROOT/patch['owner']).read_bytes()and sha(data)==patch['originalSha256']
observed=data.decode()
for p in patch['patches']:assert observed.count(p['before'])==1;observed=observed.replace(p['before'],p['after'],1)
assert observed.encode()==(SOURCE/'response-cache.observed.ts').read_bytes()
native=read(SOURCE/'native-port-patch.json');assert sha((SOURCE/'runtime-executor.original.js.txt').read_bytes())==native['originalSha256'];assert sha((SOURCE/'runtime-executor.js.txt').read_bytes())==native['observedSha256']
saved=OUT/'standard-export/publication';index=read(saved/'index.json');artifact=read(saved/'image-artifact.json')
assert sha((saved/'index.json').read_bytes())==artifact['indexSha256']and sha((saved/'delivery.caddy').read_bytes())==artifact['fragmentSha256']
assert len(index['records'])==1727
sao=ROOT/'workers/miniapp-api/assets/sao-v2';publication=read(sao/'publication.json');source_index=read(sao/'index.json')
assert sha((sao/'index.json').read_bytes())==publication['publicationHash']
records={v['route']:v for v in index['records']if v['route'].startswith('/v2/sky/supplements/sao/')};assert len(records)==len(source_index['tiles'])==826
for tile in source_index['tiles']:
 route=f"/v2/sky/supplements/sao/v2/{publication['publicationHash']}/assets/{tile['id']}";r=records[route];b=(saved/'files'/route.lstrip('/')).read_bytes()
 assert b==(sao/tile['file']).read_bytes()and len(b)==r['bytes']==tile['bytes']and sha(b)==r['sha256']==tile['sha256']
 assert r['headers']['content-type']=='application/json; charset=utf-8'and r['headers']['cache-control']=='public, max-age=31536000, immutable'
 assert 'SAO'in r['headers']['x-starward-data-source']
assert sum(v['bytes']for v in records.values())==35314828
d=read(SOURCE/'result.json');o=read(SOURCE/'cache-owner-observation.json');assert d['measured']==o and d['status']=='LIVE_SAO_SHARED_FILE_PRESSURE_AND_LATE_READ_DEVELOPMENT'
wire=read(SOURCE/'wire-requests.json');assert wire==d['wire'];success=[v for v in wire if v['completed']and not v['aborted']];access=[]
for line in(SOURCE/'caddy.log').read_text().splitlines():
 try:v=json.loads(line)
 except json.JSONDecodeError:continue
 if v.get('logger','').startswith('http.log.access.'):
  assert 'request'not in v and 'resp_headers'not in v and v.get('user_id')in(None,'');access.append(v)
assert collections.Counter((v['status'],v['size'])for v in access)==collections.Counter((v['status'],v['encodedBodyBytes'])for v in success)
assert len(access)==len(wire)
for name in ['cache-baseline-warm','cache-after-pressure-warm']:
 rows=[v for v in wire if v['phase']==name];assert len(rows)==3 and all(v['status']==304 and v['encodedBodyBytes']==0 for v in rows)
families={'spot-sky','stellar-catalog','constellation-catalog'}
assert not any('EVICT'in v['kind']for v in o['events'])
for tier in ['memory','disk']:assert len(o['beforeWarm'][tier])==5 and {v['family']for v in o['beforeWarm'][tier]}>=families
origin=read(SOURCE/'pressure-origin.json');wanted=origin['tileIds'][:22];tiles={t['id']:t for t in source_index['tiles']}
static=[v for v in wire if v['phase']=='cache-sao-pressure'and v['skyDelivery']=='static'];assert len(static)==22
assert collections.Counter((v['decodedSha256'],v['decodedBodyBytes'])for v in static)==collections.Counter((tiles[t]['sha256'],tiles[t]['bytes'])for t in wanted)
assert all('SAO'in v['publicDataSource']for v in static)
static_logs=[v for v in access if v.get('sky_delivery')=='static'];assert len(static_logs)==23 and all(v['sky_resource_class']=='catalog'for v in static_logs)
f=o['files'];assert f['afterColdFiles']['entries']==22 and f['afterColdFiles']['bytes']==sum(tiles[t]['bytes']for t in wanted)==122453
assert f['afterColdFiles']==f['afterWarmFiles']and f['warmHttpRequests']==0
assert not f['abortResult']['accepted']and f['abortHeld']['leased']==1 and f['afterAbort']['leased']==0
assert not f['clearRejected']['accepted']and f['clearResult']=={'status':'partial','files':1}and f['clearHeld']['leased']==f['clearHeld']['retired']==1
for k in ['entries','leased','bytes','reserved','running','pending','retired']:assert f['afterClearFiles'][k]==0
assert f['retiredIndexRejected']and f['recoveredFiles']['entries']==1 and f['recoveredFiles']['leased']==0
failure=read(OUT/'generation-failing-before.json');assert failure['sourceBinding']['sha256']==sha(old_client.read_bytes())
current=(ROOT/client).read_text(encoding='utf-8');old=old_client.read_text(encoding='utf-8')
fix='''      // Response-cache may return the same immutable object to two observers.
      // A new delivery must not overwrite the originating generation of a
      // retired observer's capability. Share the full immutable index, but give
      // each admitted delivery its own small publication/envelope wrapper.
      const admitted=freeze({...result,data:{...result.data}});
      known.set(admitted.data,{envelope:admitted,generation});return admitted;'''
assert old.replace('      freeze(result);known.set(result.data,{envelope:result,generation});return result;',fix)==current
archives=read(OUT/'inputs-before.json')
for v in archives:assert sha((OUT/v['archive']).read_bytes())==v['sha256']and (OUT/v['archive']).stat().st_size==v['bytes']
old_api=(OUT/'source-before-6.txt').read_text(encoding='utf-8');current_api=(ROOT/'apps/wechat-miniapp/src/services/api-client.ts').read_text(encoding='utf-8')
api_expected=old_api.replace('import { clearSkyPublicImageCache } from "./sky-public-image-runtime";',
 'import { clearSkyPublicImageCache, capturePublishedSkyImageGeneration, readPublishedSkyJson } from "./sky-public-image-runtime";')
added='''  generation: capturePublishedSkyImageGeneration,
  fileTile: (publication, tile, signal) => readPublishedSkyJson({format:'json',sha256:tile.sha256,bytes:tile.bytes},
    `${__MINIAPP_API_BASE__.replace(/\\/+$/, '')}/v2/sky/supplements/sao/v2/${publication.publicationHash}/assets/${tile.id}`,
    publication.publicationHash, signal),
'''
anchor="  invalidateTile: (publicationHash, tileId) => invalidateApiCache(`sao-tile:${publicationHash}:${tileId}:`),\n";assert api_expected.count(anchor)==1;api_expected=api_expected.replace(anchor,anchor+added)
assert api_expected==current_api,'api-client changes outside authorised Sky imports/SAO consumer'
receipt=dict(status='SAO_STATIC_SHARED_FILE_PRESSURE_AND_LATE_READ_DEVELOPMENT_READBACK',
 static=dict(files=len(index['records']),saoFiles=826,saoEncodedBytes=35314828,allSaoBytesExact=True,publicationHash=index['publicationHash'],actualStaticResponses=23,classification='catalog/static'),
 pressure=dict(tileIds=wanted,beforeStatuses=[304]*3,afterStatuses=[304]*3,responseCacheEntries=5,responseCachePolicyUnchanged=True,files=f),
 sourceEpoch=dict(fullApiSources=150,currentExact=149,subsequentFix=client,archivedOldBinding=failure['sourceBinding'],fix='Exact shallow admitted wrapper change; failing-before generation test retained and actual current consumer tests/type passed separately. No full pressure replay or retroactive current150 claim.'),
 totalEncodedSuccessfulBytes=d['encodedSuccessfulBodyBytes'],totalDecodedSuccessfulBytes=d['decodedSuccessfulBodyBytes'],
 scope='Full current-at-execution API/static/resource owner with controlled Taro native ports, fixture/test-astronomy domain. No actual page/Scene combined image+SAO, physical peak/native device/deployment/capacity certification. Final generation wrapper delta uses actual consumer regression, not this historical HTTP epoch.',
 otherBusinessLogicChanged=False,apiChangesOnlySky=True,genericCacheBudgetChanged=False,independentReview='MISSING',nativeAcceptance=False,
 origins=[bind(SOURCE/n)for n in ['result.json','executed-script.mts','api-inputs.json','cache-owner-observation.json','wire-requests.json','caddy.log']],
 next='Integrate final API/file consumer into actual page/Scene with exactly one encoded owner across task modules; bounded warm-return/hide/clear/cancel-late with all participating image+SAO families. Keep full UI/native/quality/physical/cost obligations.')
(OUT/'readback-result.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'result':bind(OUT/'readback-result.json'),'staticSao':826,'pressureAfter':[304]*3,'filesBytes':122453,'apiChangesOnlySky':True}))
