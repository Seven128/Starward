"""Author readback of one frozen journey. No rendering or independent acceptance claim."""
from pathlib import Path
import base64, hashlib, json, os
from PIL import Image

ROOT=Path(__file__).resolve().parents[4]
BASE=ROOT/'output/playwright/cloud-sky-continuous-camera-resource-1002-r1'
OUT=ROOT/'output/continuous-camera-author-readback-1002-r2'
OUT.mkdir(exist_ok=False)
(OUT/'executed-script.py.txt').write_bytes(Path(__file__).read_bytes())
def digest(b): return hashlib.sha256(b).hexdigest()
def read(n): return json.loads((BASE/n).read_text(encoding='utf8'))
def plain(v): return {k:v[k] for k in ['path','bytes','sha256']}
def bind(p):
    b=(ROOT/p).read_bytes()
    return {'path':str(p).replace('\\','/'),'bytes':len(b),'sha256':digest(b)}

try:
    r=read('result.json')
    assert digest((BASE/'result.json').read_bytes())=='5c9aa0fd01e6ec24a94168b8183f08ef40f4a30e0df3e28e7dab1aca9f250cdc'
    before,after=read('source-binding-before.json'),read('source-binding-after.json')
    assert [plain(v) for v in before['sourceBindings']]==after['sourceBindings']
    assert [plain(v) for v in before['inputs'] if v.get('path')]==after['inputs']
    for v in before['sourceBindings']:
        assert bind(v['path'])==plain(v)
        assert digest((BASE/'source-inputs'/v['path']).read_bytes())==v['sha256']
    for v in before['inputs']:
        if v.get('path'): assert bind(v['path'])==plain(v)
    for v in before['nodePreparationBindings']:
        assert bind(v['path'])==plain(v)
        assert digest((BASE/v['snapshot']).read_bytes())==v['sha256']
        relative=(ROOT/v['path']).resolve().relative_to(ROOT.resolve())
        assert relative and os.path.normcase(str((ROOT/v['nodeMetafileInput']).resolve()))==os.path.normcase(v['resolvedAbsolute'])
    for v in before['preserved']: assert bind(v['path'])['sha256']==v['sha256']
    assert [{'path':v['path'],'sha256':v['sha256']} for v in after['preserved']]==before['preserved']
    meta=read('metafile.json');virtual={v['inputKey'] for v in before['virtualInputs']}
    real={v['metafileInput'] for v in before['sourceBindings'] if 'metafileInput' in v}
    assert set(meta['inputs'])==real|virtual
    nodeMeta=read('node-preparation-metafile.json')
    assert set(nodeMeta['inputs'])=={v['nodeMetafileInput'] for v in before['nodePreparationBindings']}|{'task-node-preparation.ts'}
    assert digest((BASE/'bundle.js').read_bytes())==r['compiledSha256']
    seed=(BASE/'prepared-browser-context.json').read_text(encoding='utf8').removesuffix('\n')
    seedrow=next(v for v in before['inputs'] if v.get('transport')=='ACTUAL_PROJECT_ATTACH_PRESENT_OUTPUT_SEEDED_ONCE')
    assert digest(seed.encode())==seedrow['canonicalBodySha256']
    assert (BASE/'executed-script.mts.txt').read_bytes()==(ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-continuous-camera-resource-journey-2026-10-02.mts').read_bytes()
    assets={v['sha256']:v for v in r['inputs'] if v.get('transport')=='ACTUAL_LOCAL_PUBLISHED_BYTES_OFFER_ONLY'}
    textures={};live=0;ledger=[];rows=[];frames={};reference=r['rows'][0]['referenceIdentity']
    def gpu(name,p):
        global live
        initial=live;peak=live
        for e in p['events']:
            ident=e['textureId'];op=e['operation'];amount=e['bytes']
            if e.get('source'):
                a=assets[e['source']['sha256']]
                assert a['id']==e['source']['offeredId']
                if op=='source-upload': assert amount==a['width']*a['height']*4
            if op=='delete':
                old=textures.pop(ident)
                assert old['bytes']==amount and old['source']==e['source']
                live-=amount
            else:
                assert op in ['source-upload','gpu-copy'] and ident not in textures
                textures[ident]={'bytes':amount,'source':e['source']};live+=amount
            assert live==e['liveBytes'] and live>=0
            peak=max(peak,live)
        assert live==p['liveBytes'] and peak==p['peakBytes']
        assert sum(t['bytes'] for t in textures.values())==live
        assert {t['textureId']: {'bytes':t['bytes'],'source':t['source']} for t in p['retained']}==textures
        assert p['aliveTextures']==len(textures)
        for d in p['draws']:
            if d.get('source'): assert d['source']['sha256'] in assets
        ledger.append({'state':name,'initialBytes':initial,'endBytes':live,'peakBytes':peak,'events':len(p['events']),
                       'uploadBytes':sum(e['bytes'] for e in p['events'] if e['operation']=='source-upload'),
                       'copyBytes':sum(e['bytes'] for e in p['events'] if e['operation']=='gpu-copy')})
    for x in r['rows']:
        name=x['condition']['name'];raw=(BASE/(name+'.rgba')).read_bytes();png=(BASE/(name+'.png')).read_bytes()
        assert len(raw)==390*844*4 and digest(raw)==x['rgbaSha256'] and digest(png)==x['pngSha256']
        with Image.open(BASE/(name+'.png')) as im:
            assert im.size==(390,844);top=im.convert('RGBA').tobytes()
        assert b''.join(top[y*390*4:(y+1)*390*4] for y in range(843,-1,-1))==raw
        actual=read(name+'.actual-observations.json')
        assert base64.b64decode(actual['rgba'])==raw
        assert base64.b64decode(actual['capture'].split(',')[1])==png
        expected={k:v for k,v in actual.items() if k not in ['rgba','capture']}
        assert expected=={k:v for k,v in x.items() if k not in ['rgbaSha256','pngSha256']}
        assert read(name+'.json')==x
        assert x['referenceIdentity']==reference and reference['stableCanonicalUnchanged']
        assert len(x['ready']['hooks'])==13 and len(x['passes'])==2
        for p in x['passes']:
            assert p['glError']==0;gpu(name+':'+str(p['pass']),p)
        assert x['gpuAtBoundary']=={k:v for k,v in x['passes'][-1].items() if k in x['gpuAtBoundary']}
        for t in x['transfers']:
            if t['type']=='image':
                a=assets[t['sha256']];assert t['bytes']==a['bytes'] and t['route']==a['url']
        for d in x['newDecodes']:
            a=assets[d['sha256']];assert (d['offeredId'],d['width'],d['height'])==(a['id'],a['width'],a['height'])
        p=x['passes'][0];frames[name]=raw
        rows.append({'name':name,'fov':x['condition']['fov'],'cameraPhase':x['condition']['camera']['phase'],
                     'pngRgbaExact':True,'canonicalAndReferencesSame':True,'settlementObservations':len(x['states']),
                     'decodedSourceRgbaPeak':max(s['decodedSourceRgbaModel'] for s in x['states']),
                     'readyDecodedSourceRgba':x['ready']['decodedSourceRgbaModel'],'coldFileOwnerEntries':x['ready']['coldFileOwnerEntries'],
                     'newDecodes':len(x['newDecodes']),'imageTransferBytes':sum(t['bytes'] for t in x['transfers'] if t['type']=='image'),
                     'metadataTransferBytes':sum(t['bytes'] for t in x['transfers'] if t['type']=='metadata'),
                     'fsOperationCounts':{op:sum(f['operation']==op for f in x['fsOperations']) for op in sorted({f['operation'] for f in x['fsOperations']})},
                     'groundViewOpacity':x['groundView']['viewOpacity'],'landscapeReadiness':p['landscapeFacts']['readiness'],
                     'maskOpacity':(p['landscapeFacts']['paintedMask']or{}).get('opacity'),
                     'w3PageEnabled':x['surveySources']['w3']['pageEnabled'],'w3OfferedTiles':len(x['surveySources']['w3']['offeredTiles']),
                     'galaxyPageEligible':x['surveySources']['galactic']['pageEligible'],
                     'sourceCredit':p['sourceCredit'],'gpuEndBytes':p['liveBytes'],'gpuPeakBytes':p['peakBytes']})
    assert read('actual-final-owner.json')==r['final']
    final=r['final'];gpu('final-exit',final['gpu'])
    assert not textures and live==0 and final['stableCanonicalUnchanged'] and final['sameRuntimeOwners']
    assert not [v for v in final['nativeCurrent'] if v['current']]
    for c in final['cache']:
        for f in ['leased','running','pending','reserved']: assert c[f]==0
    assert final['counters']['decodedPending']==0 and final['counters']['nativeRunning']==0
    comparisons=[]
    for name in ['anchor-settled-45','anchor-warm-45']:
        a,b=frames['anchor-north-45'],frames[name];changed=sum(v!=w for v,w in zip(a,b))
        pixels=sum(a[i:i+4]!=b[i:i+4] for i in range(0,len(a),4));maximum=max(abs(v-w) for v,w in zip(a,b))
        comparisons.append({'name':name,'changedBytes':changed,'changedPixels':pixels,'maxChannelDifference':maximum,'fullBytesExact':changed==0})
    assert comparisons==r['returnComparisons'] and read('actual-return-observations.json')['comparisons']==comparisons
    assert not r['contractFailures'] and not r['errors']
    report={'status':'AUTHOR_FROZEN_READBACK_PASSED','input':bind('output/playwright/cloud-sky-continuous-camera-resource-1002-r1/result.json'),
            'sourceCounts':{'browser':len(before['sourceBindings']),'nodeMetadata':len(before['nodePreparationBindings']),'inputs':len(before['inputs']),'preserved':len(before['preserved'])},
            'rows':rows,'ledgers':ledger,'returnComparisons':comparisons,'finalCache':final['cache'],'finalCounters':final['counters'],
            'finalWeakCurrent':0,'finalGpuBytes':0,
            'scope':'Author-only raw/PNG/source/texture-ID ledger readback, no new GPU run, independent or native acceptance. GL-bound draw sources do not establish fragment/photo contribution. Strong diagnostic references and modeled source RGBA do not establish physical GC/native memory. Node metadata is not a loaded-module trace.'}
    (OUT/'result.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
    print(json.dumps({'output':str(OUT.relative_to(ROOT)),'result':bind(str(OUT.relative_to(ROOT))+'/result.json')}))
except Exception as e:
    (OUT/'failed.json').write_text(json.dumps({'status':'AUTHOR_READBACK_FAILED','error':repr(e)},indent=2)+'\n',encoding='utf8')
    raise
