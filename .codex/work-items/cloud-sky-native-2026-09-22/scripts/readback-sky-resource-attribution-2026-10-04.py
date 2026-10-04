"""Saved whole-page resource and original SAO callback-boundary readback only."""
from pathlib import Path
from collections import Counter, defaultdict
import hashlib, json, re, sys

root=Path(__file__).resolve().parents[4]
full,sao,out=(root/p for p in sys.argv[1:]);out.mkdir(exist_ok=False)
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
    d=hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda:f.read(4*1024*1024),b''):d.update(block)
    return {'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':d.hexdigest()}
def inventory(rows):return {r['objectId']:r for r in rows}
def rgba(row):return row['width']*row['height']*4
def file_present(snapshot,asset):return any(r['sha256']==asset['sha256'] and r['bytes']==asset['bytes'] for r in snapshot['files'])
try:
    before=read(sao/'current-baseline-before.json');assert before==read(sao/'current-baseline-after.json')
    assert len(before['currentSources'])==328 and len(before['protected'])==6
    front=read(sao/'source-bindings-before.json');back=read(sao/'backend-source-bindings-before.json')
    assert front==read(sao/'source-bindings-after.json')==read(full/'source-bindings-before.json')==read(full/'source-bindings-after.json')
    assert back==read(sao/'backend-source-bindings-after.json')==read(full/'backend-source-bindings-before.json')==read(full/'backend-source-bindings-after.json')
    assert len(front)==506 and len(back)==162
    for row in front+back+before['currentSources']+before['protected']+read(sao/'public-asset-read-bindings.json')['unique']:
        assert bind(root/row['path'])==row,row['path']
    script=root/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sao-native-cancel-warm-2026-10-04.mts'
    assert script.read_bytes()==(sao/'executed-script.mts').read_bytes()
    assert read(sao/'result.json')['status']=='ORIGINAL_SAO_NATIVE_CANCEL_WARM_BOUNDARY_DEVELOPMENT' and not read(sao/'browser-errors.json')
    phases={p['name']:p for p in read(full/'phases.json')};whole=[]
    selected=['combined-cold-wide-galactic','combined-w3-all-current-wanted-ready','combined-full-sphere-down-0','combined-full-sphere-current-fade','combined-follow-source-before','combined-follow-source-back-held','combined-original-source-back','combined-family-ready-moon','combined-midnight-warm-show','combined-committed-time-source-back']
    for name in selected:
        p=phases[name];frame=p['frameResources'];sources=inventory(frame['sourceImages']);native=inventory(p['resources']['decodedSourceIdentities'])
        family=defaultdict(lambda:{'images':0,'rgbaEquivalent':0})
        for row in sources.values():family[row['family']]['images']+=1;family[row['family']]['rgbaEquivalent']+=rgba(row)
        assert all(k in native and native[k]['sha256']==row['sha256'] and rgba(native[k])==rgba(row) for k,row in sources.items())
        assert sum(rgba(row) for row in native.values())==p['resources']['sourceRgbaEquivalentBytes']
        whole.append({'phase':name,'sourceFamilies':dict(family),'sourceRgbaEquivalent':sum(rgba(row) for row in sources.values()),'nativeRegisteredRgbaEquivalent':p['resources']['sourceRgbaEquivalentBytes'],'textureAllocationModel':p['resources']['gpuTextureUploadModelBytes'],'nativeNotInSceneSourceList':[row for k,row in native.items() if k not in sources],'callCounts':{k:{field:v[field] for field in ['count','submitted'] if field in v} for k,v in frame['calls'].items()}})
    peak=next(r for r in whole if r['phase']=='combined-full-sphere-down-0')
    assert peak['sourceFamilies']=={'constellation-artwork':{'images':21,'rgbaEquivalent':16318464},'WIDE_FIELD_W3':{'images':4,'rgbaEquivalent':4194304},'landscape':{'images':1,'rgbaEquivalent':2097152}}
    assert peak['sourceRgbaEquivalent']==peak['nativeRegisteredRgbaEquivalent']==peak['textureAllocationModel']==22609920 and not peak['nativeNotInSceneSourceList']
    assert peak['callCounts']['artwork']['count']==21 and peak['callCounts']['skyImageMesh']['count']==4 and peak['callCounts']['landscape']['count']==1
    widest=next(r for r in whole if r['phase']=='combined-cold-wide-galactic');assert widest['sourceRgbaEquivalent']==25231360 and not widest['nativeNotInSceneSourceList']
    assert peak['textureAllocationModel']>16*1024*1024
    optical=next(r for r in whole if r['phase']=='combined-original-source-back');assert len(optical['nativeNotInSceneSourceList'])==1
    coarse=next(i for i in phases['combined-m51-medium-ready']['frameResources']['sourceImages'] if i['family']=='sdss-optical')
    retained=optical['nativeNotInSceneSourceList'][0];assert retained['sha256']==coarse['sha256'] and rgba(retained)==1048576
    # A positive image/draw reference is not an independently saved GL sampler
    # inventory. These frame identities do not fabricate per-copy transient bytes.
    summary=read(full/'resource-summary.json');assert summary['peakSamples']['gpuTextureUploadModelBytes']['phase']=='combined-full-sphere-down-0'
    full_requests=read(full/'requests.json');groups=defaultdict(lambda:{'requests':0,'bodyBytes':0,'status':Counter()})
    for row in full_requests:
        role='SAO-file' if row['binary'] and '/supplements/sao/' in row['route'] else 'image-file' if row['binary'] and re.search(r'\.(?:png|jpg)$',row['route']) else 'other-file' if row['binary'] else 'API-envelope'
        groups[role]['requests']+=1;groups[role]['bodyBytes']+=row['receivedBytes'];groups[role]['status'][str(row['status'])]+=1
    assert sum(r['bodyBytes'] for r in groups.values())==21150191
    repeated=Counter((r['route'],r['sha256']) for r in full_requests if r['binary']);dupes=[{'route':k[0],'sha256':k[1],'count':v} for k,v in repeated.items() if v>1]
    assert len(dupes)==1 and dupes[0]['count']==2 and dupes[0]['route'].endswith('/07-05-7-0')
    warm_names=['combined-follow-source-back-held','combined-original-source-back','combined-midnight-warm-show','combined-committed-time-source-back']
    warm_binary=[r for r in full_requests if r['binary'] and r['phase'] in warm_names];assert not warm_binary
    decoded_peak=max(p['nativeCounters']['decodedPendingPeak'] for p in phases.values());assert decoded_peak>0
    assert all(phases[n]['nativeCounters']['decodedPending']==0 for n in warm_names)
    asset=read(sao/'actual-asset.json')['asset'];assert asset['id']=='07-05-7-0' and asset['bytes']==7223 and asset['sha256']==dupes[0]['sha256']
    saved={n:read(sao/(n+'.json')) for n in ['normal-cold','normal-warm','normal-cleared','one-response-held','one-cancelled','one-late-native-reply-ignored','one-retried','one-retry-warm','two-response-held','two-one-cancelled','two-survivor-completed','two-warm','final-cleared']}
    for n in ['normal-cold','normal-warm','one-retried','one-retry-warm','two-survivor-completed','two-warm']:assert file_present(saved[n],asset),n
    assert saved['normal-cold']['outcomes']['0']==saved['normal-warm']['outcomes']['0'] and saved['normal-warm']['outcomes']['0']['rows']==49
    assert not file_present(saved['one-cancelled'],asset) and saved['one-cancelled']['outcomes']['0']['state']=='rejected'
    one=saved['one-response-held']['nativeTrace'][-1];cancel=saved['one-cancelled']['nativeTrace'][-1];late=saved['one-late-native-reply-ignored']['nativeTrace'][-1]
    assert not one['done'] and one['responseSeen']>=one['start'] and cancel['aborted'] and cancel['done'] and cancel['abortAt']>=one['responseSeen'] and late['lateIgnored']
    two=saved['two-response-held'];left=saved['two-one-cancelled'];survivor=saved['two-survivor-completed']
    assert two['pendingNative']==left['pendingNative']==1 and not left['nativeTrace'][-1]['aborted'] and not left['nativeTrace'][-1]['done']
    assert left['outcomes']['0']['state']=='rejected' and survivor['outcomes']['1']['state']=='fulfilled' and survivor['outcomes']['1']['rows']==49
    for n in ['normal-cleared','final-cleared']:
        p=saved[n];assert p['pendingNative']==0 and all(all(o[k]==0 for k in ['entries','leased','bytes','reserved','running','pending','retired']) for o in p['owners'])
        assert sum(r['bytes'] for r in p['files'])==26
    sao_requests=read(sao/'requests.json');binary=[r for r in sao_requests if r['binary']]
    assert len(binary)==4 and all(r['status']==200 and r['receivedBytes']==7223 and r['sha256']==asset['sha256'] for r in binary)
    assert [r['phase'] for r in binary]==['normal-cold','response-before-native-callback-cancel','retry-after-cancel','two-shared-consumers']
    # Keep failed task epochs separate from the successful protocol result.
    failed=[]
    for suffix,text in [('r1','saoCatalogClient'),('r2','digest')]:
        lane=sao.with_name(sao.name[:-2]+suffix);failure=read(lane/'failed.json');assert text in failure['error'] and not (lane/'current-baseline-after.json').exists()
        failed.append({'lane':lane.relative_to(root).as_posix(),'error':failure['error'],'requests':len(failure['requests'])})
    prior_reader=out.with_name('sky-resource-attribution-readback-1004-r1');assert read(prior_reader/'failed.json')['type']=='AssertionError'
    paths=[full/n for n in ['phases.json','resource-summary.json','requests.json','source-bindings-before.json','source-bindings-after.json','backend-source-bindings-before.json','backend-source-bindings-after.json']]
    paths.extend(sorted(sao.glob('*.json')));paths.append(sao/'executed-script.mts')
    paths.extend([prior_reader/'failed.json',prior_reader/'executed-reader.py']);pins=[bind(p) for p in paths]
    result={'status':'SAVED_RESOURCE_WORKING_SET_AND_SAO_CANCEL_WARM_DEVELOPMENT','originalSourcePins':{'frontend':506,'backend':162,'current':328,'protected':6},'selectedCompletedFrames':whole,'fullJourneyObservedMaxima':summary['maxima'],'requestRoleAccounting':dict(groups),'fullJourneyRepeatedBinary':dupes,'warmSourceHideShowBinaryRequests':0,'fullJourneyControlledDecodePendingPeak':decoded_peak,'boundedSaoNativeCase':{'binaryTransfers':4,'eachBytes':7223,'nativeCases':{'oneConsumerAbortAfterResponse':'reject/no published file/late callback ignored; retry transfers once then warm reads without transfer','twoConsumersOneAbort':'same transfer survives for remaining consumer; file published; later warm read without transfer'},'historicalDuplicateCause':'UNKNOWN: previous whole-page producer did not save native abort/reply trace; this controlled reachable boundary is not retrospective cause proof'},'taskBootstrapFailuresRetained':failed,'readerFailureRetained':'Initial reader incorrectly extrapolated early decodePendingPeak2 to whole journey; saved whole journey peak6, not a contractual global limit. Fixed saved-data classification only; no renderer/HTTP replay.','conclusion':'Completed wide working set, validated coarse-return bitmap and encoded warm files are not identified as unnecessary caches. No new queue/decode/warm cache framework or budget relaxation justified by these records. Only current logical working-set/failure protocol proved; native physical memory/latency/full visual quality and whole-product capacity remain open.','evidence':pins,'scope':'Root saved-byte/frame/callback readback, not independent review. No Scene or HTTP replay by this reader, producer had no Scene/UI replay for bounded SAO case. Positive source/call identities do not replace exact sampler input inventories; native-registration dimensions are RGBA equivalence, not physical decode heap. Request phase is start label, not native callback/caller timing or billable compressed transfer.'}
    (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (out/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    print(json.dumps({k:v for k,v in result.items() if k not in ['selectedCompletedFrames','evidence','taskBootstrapFailuresRetained']},ensure_ascii=False))
except Exception as e:
    (out/'failed.json').write_text(json.dumps({'error':str(e),'type':type(e).__name__},ensure_ascii=False)+'\n',encoding='utf-8');(out/'executed-reader.py').write_bytes(Path(__file__).read_bytes());raise
