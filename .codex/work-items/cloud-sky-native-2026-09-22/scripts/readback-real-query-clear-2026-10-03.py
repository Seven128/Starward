"""Read saved actual-query clear journey; no HTTP, builds or matrix replay."""
from pathlib import Path
import json, hashlib, collections
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
LANE = ROOT / 'output/playwright/cloud-sky-live-mixed-1003-r16'
UNIT = ROOT / 'output/sky-clear-query-recovery-1003-r1'
OUT = ROOT / 'output/playwright/cloud-sky-real-query-clear-readback-1003-r2'
OUT.mkdir()
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
    b = p.read_bytes()
    return dict(path=p.relative_to(ROOT).as_posix(), bytes=len(b), sha256=hashlib.sha256(b).hexdigest())
def pinned(v): return {k:v[k] for k in ('path', 'bytes', 'sha256')}

try:
    checkpoint = read(TASK/'evidence/current-execution-state-2026-10-03-r48.json')
    for v in checkpoint['protected']: assert bind(ROOT/v['path']) == v
    sources = {}
    for n in ['source-binding-before.json', 'api-inputs.json']:
        for v in read(LANE/n)['sourceBindings']:
            assert bind(ROOT/v['path']) == pinned(v)
            sources[v['path']] = pinned(v)
    assert len(sources) == 272
    assert read(LANE/'inputs-before.json') == read(LANE/'inputs-after.json')
    for v in read(LANE/'inputs-before.json'): assert bind(ROOT/v['path']) == v
    transitions = read(LANE/'authorised-input-transitions.json')
    assert {v['after']['path'] for v in transitions} == {'apps/wechat-miniapp/src/services/cache-policy.ts'}
    # r48 did not pin the stellar Hook/tests; their actual pre-fix source is
    # separately archived, rather than falsely attributing them to that pin set.
    before = read(UNIT/'inputs-before.json')
    for i, v in enumerate(before):
        archived = UNIT/f'source-before-{i}.txt'
        assert bind(archived)['sha256'] == v['sha256']
    policy_path = 'apps/wechat-miniapp/src/services/cache-policy.ts'
    assert transitions[0]['before'] == pinned(before[0])
    policy = (ROOT/policy_path).read_text(encoding='utf-8')
    old_policy = (UNIT/'source-before-0.txt').read_text(encoding='utf-8')
    addition = ('  // This immutable index also carries the Sky file owner\'s generation. Keeping\n'
                '  // it after file clear would strand returning observers on a retired capability.\n'
                '  "sao-index",\n')
    assert policy.replace(addition, '') == old_policy
    hook_path = 'apps/wechat-miniapp/src/features/sky/use-sky-stellar-supplement.ts'
    hook = (ROOT/hook_path).read_text(encoding='utf-8')
    old_hook = (UNIT/'source-before-1.txt').read_text(encoding='utf-8')
    comment = ('  // Same source bytes may arrive with a new file-generation capability after\n'
               '  // clear/refetch. Retire the loader bound to the previous delivered index.\n')
    assert hook.replace(comment,'').replace('},[publication,active]);','},[publication?.publicationHash,active]);').replace(
        'state?.publication===publication','state?.publication.publicationHash===publication?.publicationHash') == old_hook
    api = read(LANE/'api-inputs.json')
    assert './apps/wechat-miniapp/node_modules/@tanstack/react-query/build/modern/index.js' in api['entry']
    assert not any(k.startswith('node_modules/@tanstack/') for k in read(LANE/'api-metafile.json')['inputs'])
    page_sources = {v['path'] for v in read(LANE/'source-binding-before.json')['sourceBindings']}
    assert 'apps/wechat-miniapp/src/hooks/use-resource-query.ts' in page_sources
    executor = (LANE/'executed-script.mts').read_text(encoding='utf-8')
    for marker in ['getOptimisticResult', 'defaultQueryOptions', 'observer.subscribe', 'observer.setOptions', 'clearTemporaryApiCache']:
        assert marker in executor
    assert read(UNIT/'failed-before.json')['failed'] == 2
    unit = read(UNIT/'clear-query-trace.json')
    assert unit['indexRequests'] == unit['encodedDownloads'] == 2
    assert all(unit[k] for k in ['oldCapabilityRejected','newCapabilityIdentity','retainedPlan','retainedDraft'])
    index = read(ROOT/'workers/miniapp-api/assets/sao-v2/index.json')
    tile = next(v for v in index['tiles'] if v['id'] == unit['tileId'])
    b = bind(ROOT/f"workers/miniapp-api/assets/sao-v2/{tile['file']}")
    assert b['sha256'] == tile['sha256'] == unit['sourceSha256']
    assert b['bytes'] == tile['bytes'] == unit['cache']['bytes'] == 19433
    assert unit['rows'] == tile['rowCount'] == 133
    clear = read(LANE/'actual-api-clear.json')
    sao_key = '["sao-index","v2"]'
    assert next(q for q in clear['before']['query']['queries'] if q['key'] == sao_key)['hasData']
    assert not any(q['key'] == sao_key for q in clear['after']['query']['queries'])
    empty_file = [dict(path='/controlled/sky-public-images-v1/index-v2.json',bytes=26)]
    assert clear['after']['resources']['files'] == empty_file
    cache = clear['after']['resources']['cache'][0]
    assert cache['epoch'] == 1
    for k in ['entries','leased','bytes','reserved','running','pending','retired']: assert cache[k] == 0
    rows = [read(LANE/(n+'.json')) for n in ['query-cold-wide','query-clear-wide-return']]
    frames=[]
    for row in rows:
        assert row['ready']['sao']['points'] == 324 and not row['ready']['sao']['failed']
        assert row['actualFacts']['readiness'] == 1 and row['gpuFailures'] == []
        resource = row['jointOwner']['resources']
        assert row['jointOwner']['owners'] == resource['publicEncodedOwners'] == 1
        assert resource['stellarNumericPayloadModel'] == resource['stellarTuples']*7*8
        assert resource['stellarJsObjectBytes'] is None
        for q in row['passes']:
            stem = row['condition']['name']+'-'+q['label']
            raw, png = LANE/(stem+'.rgba'), LANE/(stem+'.png')
            pixels = raw.read_bytes();im = Image.open(png).convert('RGBA')
            assert bind(raw)['sha256'] == q['rgbaSha256'] and bind(png)['sha256'] == q['pngSha256']
            assert im.size == (390,844) and im.tobytes() == b''.join(pixels[y*1560:(y+1)*1560] for y in range(843,-1,-1))
            assert q['glError'] == 0 and q['publication']['stagedSnapshotId'] == q['publication']['publishedSnapshotId']
            assert q['presented']['frameAt'] == q['snapshot']['frameAt'] == row['ready']['at']
            frames += [bind(raw), bind(png)]
        assert row['passes'][-1]['saoSceneObservation']['paintedIdentity'] > 0
    assert rows[0]['ready']['sao']['publicationHash'] == rows[1]['ready']['sao']['publicationHash']
    identities = [r['query']['observers'][0]['dataIdentity'] for r in rows]
    assert identities[0] != identities[1] and all(v is not None for v in identities)
    assert rows[0]['passes'][-1]['rgbaSha256'] == rows[1]['passes'][-1]['rgbaSha256']
    old_loader = rows[0]['ready']['sao']['loader']['ownerId']
    assert rows[1]['ready']['sao']['loader']['ownerId'] != old_loader
    assert next(l for l in rows[1]['ready']['sao']['allLoaders'] if l['ownerId'] == old_loader)['disposed']
    old_images = {v['sha256']:v['objectId'] for v in rows[0]['jointOwner']['resources']['references']}
    new_images = {v['sha256']:v['objectId'] for v in rows[1]['jointOwner']['resources']['references']}
    assert old_images.keys() == new_images.keys() and all(new_images[k] != old_images[k] for k in old_images)
    wire = read(LANE/'wire-requests.json')
    logs=[]
    for line in (LANE/'caddy.log').read_text(encoding='utf-8').splitlines():
        try: v=json.loads(line)
        except json.JSONDecodeError: continue
        if v.get('logger','').startswith('http.log.access.'):
            assert 'request' not in v and 'resp_headers' not in v and v.get('user_id') in (None,'')
            logs.append(v)
    success=[v for v in wire if v['completed'] and not v['aborted']]
    aborted=[v for v in wire if v['aborted']]
    received=collections.Counter((v['status'],v['encodedBodyBytes']) for v in success)
    logged=collections.Counter((v['status'],v['size']) for v in logs)
    assert not (received-logged)
    extra=logged-received
    assert len(success)==62 and len(aborted)==1 and len(logs)==len(wire)==63
    assert extra == collections.Counter({(200,8878):1})
    warm=[v for v in success if v['phase']=='live-warm-entry']
    assert [v['status'] for v in warm] == [200,304,304]
    assert [v['encodedBodyBytes'] for v in warm] == [225858,0,0]
    accounting=read(LANE/'delivery-accounting.json')
    assert sum(v['encodedBodyBytes'] for v in success)==accounting['receivedSuccessfulBytes']==3971662
    assert sum(v['size'] for v in logs)==accounting['loggedSize']==3980540
    assert accounting['cancelledPhysicalReceiptBytes'] is None
    final=read(LANE/'final-owner.json');after=final['afterClear']
    assert not any(h['alive'] for h in after['gpu']['handles'])
    assert after['gpu']['live'] == dict(texture=0,buffer=0,renderbuffer=0)
    assert after['counters']['nativeRunning']==after['counters']['decodedPending']==0
    assert final['afterHide']['presented'] is None
    assert not any(v['membership']=='CURRENT' for v in final['afterHide']['nativeCurrent'])
    assert after['files']==empty_file and after['cache'][0]['epoch']==2
    for k in ['entries','leased','bytes','reserved','running','pending','retired']: assert after['cache'][0][k]==0
    assert all(l['disposed'] and not l['loaded'] and not l['pending'] for l in after['sao'])
    for k,v in final['resourcePeaks'].items(): assert max(e[k] for e in final['resourceEvents'])==v
    result=dict(status='REAL_QUERY_CLEAR_PAGE_SAVED_DEVELOPMENT_READBACK',currentSourcePinsExact=len(sources),
        sourceBindings=list(sources.values()),protectedExact=6,frames=frames,queryIdentities=identities,
        samePublicationHash=rows[0]['ready']['sao']['publicationHash'],resolvedSaoPoints=[324,324],
        paintedSaoIdentities=[r['passes'][-1]['saoSceneObservation']['paintedIdentity'] for r in rows],
        finalRgba=rows[0]['passes'][-1]['rgbaSha256'],clearEpochs=[1,2],unit=unit,
        successfulResponses=62,cancelledResponses=1,successfulEncodedBytes=3971662,caddyLoggedSize=3980540,
        unmatchedCancelledLog=[dict(status=200,size=8878)],cancelledPhysicalReceiptBytes=None,
        warmStatuses=[200,304,304],warmMeaning='Report deliberately cleared and refreshed; catalog/figures retain conditional 304.',
        layerModelPeaks=final['resourcePeaks'],gpuHandleModelPeaks=final['before']['gpu']['totalPeak'],physicalTotal=None,
        beforeFixFailures=2,otherBusinessLogicChanged=False,independentReview='MISSING',
        origins=[bind(LANE/n) for n in ['result.json','actual-api-clear.json','inputs-before.json','api-inputs.json','executed-script.mts','final-owner.json','caddy.log']],
        scope='Actual full API/useResourceQuery/QueryClient/QueryObserver and page Hook/lifecycle/software Scene with installed app Query library. Controlled React effect/notification port, Taro/native/MapFS/clock/GL; not full useQuery/provider/JSX/report Hook/Settings UI/WEAPP/physical/quality/rollback/200DAU capacity. Root saved readback is self-review. No replay/rebuild/export/download/deploy.')
    (OUT/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(result=bind(OUT/'result.json'),sourcePins=272,frames=len(frames)//2,queryIdentities=identities,otherBusinessLogicChanged=False)))
except Exception as e:
    (OUT/'failed.json').write_text(json.dumps(dict(error=repr(e)),indent=2)+'\n',encoding='utf-8')
    raise
