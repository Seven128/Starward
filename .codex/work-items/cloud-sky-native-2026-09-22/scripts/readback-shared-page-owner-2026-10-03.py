"""Read completed r12 outputs; preserve failed aggregate accounting and no replay."""
from pathlib import Path
import json, hashlib, collections, math
from PIL import Image

ROOT=Path(__file__).resolve().parents[4]
SOURCE=ROOT/'output/playwright/cloud-sky-live-mixed-1003-r12'
OUT=ROOT/'output/playwright/cloud-sky-shared-page-readback-1003-r2'
OUT.mkdir(exist_ok=False)
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(b): return hashlib.sha256(b).hexdigest()
def bind(p):
    b=p.read_bytes()
    return dict(path=p.relative_to(ROOT).as_posix(), bytes=len(b), sha256=sha(b))

failure=read(SOURCE/'live-failure.json')
assert '+ 6338325' in failure['error'] and '- 6311671' in failure['error']
before=read(SOURCE/'inputs-before.json')
for v in before: assert bind(ROOT/v['path'])==v
pins={}
for name in ['source-binding-before.json','api-inputs.json']:
    for v in read(SOURCE/name)['sourceBindings']:
        assert bind(ROOT/v['path'])=={k:v[k] for k in ('path','bytes','sha256')}
        pins[v['path']]=v
forward=read(SOURCE/'shared-runtime-forwarding.json')
assert forward['originalSha256']==pins[forward['path']]['sha256']
assert sha((SOURCE/'shared-runtime-forwarding.ts.txt').read_bytes())==forward['forwardingSha256']
assert all(('globalThis.liveApi.'+n+'(...args)') in (SOURCE/'shared-runtime-forwarding.ts.txt').read_text() for n in forward['exports'])
assert (SOURCE/'api-file-cache.original.ts').read_bytes()==(ROOT/'apps/wechat-miniapp/src/services/sky-public-image-cache.ts').read_bytes()
assert 'caches.push(owner)' in (SOURCE/'api-file-cache.observed.ts').read_text()

wire=failure['wire']; success=[v for v in wire if v['completed'] and not v['aborted']]
aborted=[v for v in wire if v['aborted']]
access=[]
for line in (SOURCE/'caddy.log').read_text(encoding='utf-8').splitlines():
    try: v=json.loads(line)
    except json.JSONDecodeError: continue
    if v.get('logger','').startswith('http.log.access.'):
        assert 'request' not in v and 'resp_headers' not in v and v.get('user_id') in (None,'')
        access.append(v)
assert len(access)==len(wire)==76 and len(aborted)==3
assert all(v['encodedBodyBytes']==0 and v['status'] is None for v in aborted)
# First three serialized contract requests have no competing client traffic.
contract=read(SOURCE/'static-json-contract.json')
assert [(v['method'],v['status'],v['decodedBodyBytes']) for v in wire[:3]]==[('GET',200,19433),('HEAD',200,0),('GET',304,0)]
assert all(v['sky_delivery']=='static' and v['sky_resource_class']=='catalog' for v in access[:3])
assert access[0]['size']==wire[0]['encodedBodyBytes']==8574
assert access[1]['size']==20 and wire[1]['encodedBodyBytes']==0
assert access[2]['size']==wire[2]['encodedBodyBytes']==0
assert contract['sourceSha256']==wire[0]['decodedSha256']
source=ROOT/'workers/miniapp-api/assets/sao-v2'
index=read(source/'index.json'); tile=next(t for t in index['tiles'] if t['id']==contract['tileId'])
assert tile['sha256']==contract['sourceSha256'] and tile['bytes']==19433
assert contract['get']['delivery']=='static' and contract['head']['bytes']==contract['conditional']['bytes']==0
# Exclude serialized HEAD bookkeeping; actual cancelled-response receipt is unknown.
actual=collections.Counter((v['status'],v['size']) for v in access[3:])
received=collections.Counter((v['status'],v['encodedBodyBytes']) for v in success[3:])
assert not (received-actual)
unmatched=actual-received
assert unmatched==collections.Counter({(200,8878):3})
assert sum(v['size'] for v in access)==6338325
assert sum(v['encodedBodyBytes'] for v in success)==6311671
warm=[v for v in success if v['phase']=='live-warm-entry']
assert len(warm)==3 and all(v['status']==304 and v['encodedBodyBytes']==0 for v in warm)

rows={}; frames=[]; summaries=[]
for condition in read(SOURCE/'conditions.json')['conditions']:
    name=condition['name']; row=read(SOURCE/(name+'.json')); rows[name]=row
    assert row['gpuFailures']==[] and row['jointOwner']['owners']==1
    resource=row['jointOwner']['resources']; cache=row['jointOwner']['cache']
    assert resource['publicEncodedOwners']==1 and len(resource['cache'])==1
    assert resource['cache'][0]==cache and cache['bytes']<=32*1024*1024
    assert cache['reserved']==cache['running']==cache['pending']==0
    assert resource['stellarJsObjectBytes'] is None
    assert resource['stellarTuples']==sum(t['tuples'] for l in resource['stellar'] for t in l['loaded'])
    assert resource['stellarNumericPayloadModel']==resource['stellarTuples']*7*8
    assert resource['stellarPublicationJsonBytes']==sum(t['decodedPublicationJsonBytes'] for l in resource['stellar'] for t in l['loaded'])
    assert all(l['viewEncodedByteBudget']==6291456 and l['requestSlots']==3 for l in resource['stellar'])
    for p in row['passes']:
        raw=SOURCE/(name+'-'+p['label']+'.rgba'); png=SOURCE/(name+'-'+p['label']+'.png'); pixels=raw.read_bytes()
        assert sha(pixels)==p['rgbaSha256'] and sha(png.read_bytes())==p['pngSha256']
        im=Image.open(png).convert('RGBA'); assert im.size==(390,844)
        assert im.tobytes()==b''.join(pixels[y*1560:(y+1)*1560] for y in range(843,-1,-1))
        assert p['glError']==0 and p['publication']['stagedSnapshotId']==p['publication']['publishedSnapshotId']
        assert p['presented']['frameAt']==row['ready']['at']
        frames.extend([bind(raw),bind(png)])
    summaries.append(dict(name=name,cache=cache,jsonSourceEncodedBytes=resource['jsonSourceEncodedBytes'],
        stellarTuples=resource['stellarTuples'],stellarNumericPayloadModel=resource['stellarNumericPayloadModel'],
        stellarPublicationJsonBytes=resource['stellarPublicationJsonBytes'],jsObjectBytes=None,
        ownerRgbaModel=resource['ownerRgbaModel'],retiredDiagnosticImages=resource['retired'],
        participatingHooks=[v['name'] for v in resource['owners'] if v['entries']],selected=row['ready']['selected']['state'],
        saoSceneObservation=row['passes'][-1]['saoSceneObservation']))

dome=rows['joint-full-sphere']; assert abs(dome['passes'][-1]['actualPaintCamera']['fov']-720/math.pi*math.atan(844/(390*.92)))<1e-10
for name in ['joint-cold-wide','joint-full-sphere','joint-hide-wide-warm']:
    assert rows[name]['passes'][-1]['saoSceneObservation']['paintedIdentity']>0
for name in ['joint-selected-fine','joint-source-back-warm']:
    assert rows[name]['passes'][-1]['state']['sdss']['renderedLevel']=='DETAIL'
    assert rows[name]['ready']['selected']['state']=='READY'
for a,b in [('joint-cold-wide','joint-hide-wide-warm'),('joint-selected-fine','joint-source-back-warm')]:
    assert rows[a]['passes'][-1]['rgbaSha256']==rows[b]['passes'][-1]['rgbaSha256']
for name in ['joint-source-back-warm','joint-hide-wide-warm']:
    hidden=read(SOURCE/(name+'-hidden.json'))
    assert hidden['current']==[] and hidden['presented'] is None and hidden['cache']['leased']==0
    assert not any(h['alive'] for h in hidden['gpu']['handles'])
hidden=read(SOURCE/'joint-source-back-warm-hidden.json')
assert hidden['navigation'][-1]['url']==hidden['credit']['sourceRoute']
assert hidden['credit']['publicationHash']==rows['joint-selected-fine']['passes'][-1]['sourceCredit']['opticalImageCredit']['publicationHash']
final=read(SOURCE/'final-owner.json'); clear=final['afterClear']
assert not any(h['alive'] for h in clear['gpu']['handles'])
assert clear['counters']['nativeRunning']==clear['counters']['decodedPending']==0
assert final['afterHide']['presented'] is None and not any(v['membership']=='CURRENT' for v in final['afterHide']['nativeCurrent'])
assert len(clear['cache'])==1
for key in ['entries','leased','bytes','reserved','running','pending','retired']: assert clear['cache'][0][key]==0
assert all(l['disposed'] and not l['loaded'] and not l['pending'] for l in clear['sao'])
assert clear['files']==[dict(path='/controlled/sky-public-images-v1/index-v2.json',bytes=26)]
assert final['resourcePeaks']==dict(ownerRgbaModel=14680064,registeredRgbaModel=14680064,pendingRgbaModel=8388608,filesBytes=5598741,leases=24)
for key in final['resourcePeaks']: assert max(e[key] for e in final['resourceEvents'])==final['resourcePeaks'][key]

summary=dict(status='SAVED_FINAL_SHARED_PAGE_OWNER_DEVELOPMENT_READBACK',sourcePinsCurrentExact=len(pins),
    executionInputsCurrentExact=len(before),conditions=summaries,frames=frames,warmStatuses=[v['status'] for v in warm],
    encodedSuccessfulReceivedBodyBytes=6311671,successfulResponses=len(success),abortedResponses=len(aborted),
    caddyLoggedSize=6338325,headLoggedSize=20,headReceivedBytes=0,
    cancelledUnmatchedLogSizes=[8878]*3,cancelledPhysicalReceiptBytes=None,
    staticContract=contract,resources=dict(eventPeaks=final['resourcePeaks'],gpuHandleModelPeaks=final['before']['gpu']['totalPeak'],
    physicalTotal=None,physicalReclamation=None,parsedJsObjectBytes=None,clearLeavesInventoryBytes=26),
    scope='Completed saved five-condition real isolated HTTP/fullAPI/extractedpage/effects/Scene with one encoded owner. React/Taro/MapFS/native/clock/softwareGL and report/testastronomy fixtures controlled; no full JSX/native route/gesture/device/quality/capacity or independent review. No Replay. Earlier task aggregate size failed because HEAD logged20 despite receipt0 and three cancelled responses logged8878 with client receipts unknown; partitioned status-size readback holds without claiming cancelled wire zero. Solar hooks wanted but no loaded images here; their complete participation remains open.',
    runnerAggregateAssertion='FAILED_RETAINED',buildConsoleAssertion='FAILED_TASK_FINAL_CONSOLE_RETAINED',
    productionSourceChanged=False,otherBusinessLogicChanged=False,independentReview='MISSING',
    origins=[bind(SOURCE/n) for n in ['live-failure.json','final-owner.json','executed-script.mts','static-json-contract.json','caddy.log','reused-build.json','shared-runtime-forwarding.json']])
(OUT/'result.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'result':bind(OUT/'result.json'),'sourcePins':len(pins),'frames':len(frames)//2,'warm':[304]*3,'sharedOwners':1}))
