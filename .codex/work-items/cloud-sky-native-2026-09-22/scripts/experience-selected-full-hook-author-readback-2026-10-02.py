"""Author-only frozen output readback. No browser/render, file editing, or independent review claim."""
from pathlib import Path
import base64, hashlib, json, os
from PIL import Image

ROOT=Path(__file__).resolve().parents[4]
BASE=ROOT/'output/playwright/cloud-sky-selected-full-hook-1002-r3'
OUT=ROOT/'output/selected-full-hook-author-readback-1002-r2'
OUT.mkdir(exist_ok=False)
(OUT/'executed-script.py.txt').write_bytes(Path(__file__).read_bytes())
def digest(data): return hashlib.sha256(data).hexdigest()
def bind(path):
    data=(ROOT/path).read_bytes()
    return {'path':str(path).replace('\\','/'),'bytes':len(data),'sha256':digest(data)}
def read(name): return json.loads((BASE/name).read_text(encoding='utf8'))
result=read('result.json')
assert digest((BASE/'result.json').read_bytes())=='10922aff9d1d6543f036709acc1705f9ce942472f301c9c282fe3ea4d78898cf'
before,after,meta=read('source-binding-before.json'),read('source-binding-after.json'),read('metafile.json')
def plain(v): return {k:v[k] for k in ['path','bytes','sha256']}
assert [plain(v) for v in before['sourceBindings']]==after['sourceBindings']
for v in before['sourceBindings']:
    assert bind(v['path'])==plain(v)
    assert digest((BASE/'source-inputs'/v['path']).read_bytes())==v['sha256']
virtual={v['inputKey'] for v in before['virtualInputs']}
real={v['metafileInput']:v for v in before['sourceBindings'] if 'metafileInput' in v}
assert set(meta['inputs'])==set(real)|virtual
assert virtual=={'task-page-images.ts','controlled:react','controlled:@tarojs/taro','controlled:@/hooks/use-resource-query','controlled:@/services/api-client'}
for key,v in real.items():
    assert os.path.normcase(str((ROOT/key).resolve()))==os.path.normcase(str(Path(v['resolvedAbsolute']).resolve()))
for v in before['inputs']:
    if 'path' in v: assert bind(v['path'])['sha256']==v['sha256']
for v in before['preserved']:
    assert bind(v['path'])['sha256']==v['sha256']
assert [{k:v[k] for k in ['path','sha256']} for v in after['preserved']]==before['preserved']
assert digest((BASE/'bundle.js').read_bytes())==result['compiledSha256']
assets=[v for v in result['inputs'] if v.get('transport')=='ACTUAL_LOCAL_PUBLISHED_BYTES_OFFER_ONLY']
asset_by_hash={v['sha256']:v for v in assets}
png_checks=[]
def check_png(stem,rgba_hash,png_hash):
    rgba=(BASE/(stem+'.rgba')).read_bytes()
    png=(BASE/(stem+'.png')).read_bytes()
    assert len(rgba)==390*844*4 and digest(rgba)==rgba_hash and digest(png)==png_hash
    with Image.open(BASE/(stem+'.png')) as im:
        assert im.size==(390,844)
        top=im.convert('RGBA').tobytes()
    bottom=b''.join(top[i*390*4:(i+1)*390*4] for i in range(843,-1,-1))
    assert bottom==rgba
    png_checks.append({'stem':stem,'rgbaSha256':rgba_hash,'pngSha256':png_hash,'allBytesEqual':True})
    return rgba
ledger_checks=[]
def ledger(row_name,scope,p):
    events=p['events']
    if events:
        first=events[0]
        initial=first['liveBytes']-(-first['bytes'] if first['operation']=='delete' else first['bytes'])
        live=initial;peak=initial
        for e in events:
            assert e['operation'] in ['delete','source-upload','gpu-copy']
            live+=-e['bytes'] if e['operation']=='delete' else e['bytes']
            assert live==e['liveBytes'] and live>=0
            peak=max(peak,live)
            if e['source']:
                assert e['source']['sha256'] in asset_by_hash
                a=asset_by_hash[e['source']['sha256']]
                assert e['source']['offeredId']==a['id']
                if e['operation']=='source-upload': assert e['bytes']==a['width']*a['height']*4
        assert live==p['liveBytes'] and peak==p['peakBytes']
    else: initial=p['liveBytes'];assert p['peakBytes']==initial
    for d in p['draws']:
        if d['source']: assert d['source']['sha256'] in asset_by_hash
    ledger_checks.append({'row':row_name,'scope':scope,'events':len(events),'initialBytes':initial,'finalBytes':p['liveBytes'],'peakBytes':p['peakBytes']})

conditions=read('conditions.json')
positions={conditions['deepSkyCatalog']['entries'][p[0]]['objectRef']:p for p in conditions['deepSkyFrame']['points']}
row_checks=[]
for row in result['rows']:
    name=row['condition']['name'];normal=check_png(name,row['rgbaSha256'],row['pngSha256'])
    actual=read(name+'.actual-observations.json')
    assert base64.b64decode(actual['rgba'])==normal
    assert actual['passes']==row['passes'] and actual['ready']==row['ready'] and actual['sdssState']==row['sdssState']
    for p in row['passes']:
        assert p['glError']==0
        ledger(name,'normal-'+str(p['pass']),p)
    if row['condition']['pageVisible']:
        c=row['contribution'];oracle=read(name+'.actual-oracle-observations.json')
        absent=check_png(name+'.source-absent',c['absentRgbaSha256'],c['absentPngSha256'])
        restored=(BASE/(name+'.restored.rgba')).read_bytes()
        assert restored==normal and digest(restored)==c['restoredRgbaSha256']
        assert base64.b64decode(oracle['rgba'])==absent and base64.b64decode(oracle['restoredRgba'])==restored
        changed=sum(any(a!=b for a,b in zip(normal[i:i+4],absent[i:i+4])) for i in range(0,len(normal),4))
        maximum=max(abs(a-b) for a,b in zip(normal,absent))
        assert changed==c['changedPixels']>0 and maximum==c['maxChannelDifference'] and c['restoreChangedBytes']==0
        assert c['absentSources']=={'sdss':None,'selected':None}
        assert c['absentCredit']['deepSkyImagePresented']==False and c['absentCredit']['sdssOpticalStatus']=='NONE'
        assert c['restoredSources']==row['passes'][1]['paintedSources'] and c['restoredCredit']==row['passes'][1]['sourceCredit']
        ledger(name,'oracle-absent',c['absentGpu']);ledger(name,'oracle-restored',c['restoredGpu'])
        assert not [e for e in row['passes'][1]['events'] if e['operation']=='source-upload']
    else:
        assert row['gpuAtBoundary']['liveBytes']==0 and row['gpuAtBoundary']['aliveTextures']==0
        assert row['ready']['decodedSourceRgbaModel']==0 and row['ready']['selected']['decoded']==None
        assert row['ready']['cache'][0]['leased']==1 and row['ready']['selected']['file']['leaseCurrent']
    for transfer in row['transfers']:
        if transfer['type']=='image':
            a=asset_by_hash[transfer['sha256']];assert transfer['bytes']==a['bytes'] and transfer['route']==a['url']
    row_checks.append({'name':name,'fov':row['condition']['fov'],'actualAltitudeDeg':positions[row['condition']['reference']][2],
                       'normalPasses':len(row['passes']),'actualNativeImageTransfers':len([t for t in row['transfers'] if t['type']=='image']),
                       'currentNativeObjects':len([i for i in row['nativeCurrent'] if i['current']]),'logicalCache':row['ready']['cache']})
assert result['rows'][3]['rgbaSha256']==result['rows'][5]['rgbaSha256']
old=result['rows'][3]['ready']['selected']['decoded'];new=result['rows'][5]['ready']['selected']['decoded']
assert old['objectId']!=new['objectId'] and old['sha256']==new['sha256'] and old['path']==new['path']
assert not [t for t in result['rows'][5]['transfers'] if t['type']=='image']
final=read('actual-final-owner.json')
assert final==result['final'] and final['gpu']['liveBytes']==0 and final['gpu']['aliveTextures']==0
assert final['cache'][0]['leased']==0 and not [i for i in final['nativeCurrent'] if i['current']]
after_bind=[bind(v['path']) for v in before['sourceBindings']]
assert after_bind==after['sourceBindings']
report={'status':'PASS_AUTHOR_READBACK','scope':'Author-only Pillow full PNG/raw observations and actual source/event ledger readback. No new rendering, independent review, WEAPP/platform, physical decode/native/driver/GC/performance, quality, cost or final acceptance claim.',
        'result':bind(str(BASE.relative_to(ROOT))+'/result.json'),'realMetafileInputs':len(real),'allSourcesBound':len(before['sourceBindings']),
        'explicitVirtualInputs':sorted(virtual),'actualByteOffers':len(assets),'pngFullReadback':png_checks,'ledgers':ledger_checks,'rows':row_checks,
        'finalOwnerRaw':bind(str(BASE.relative_to(ROOT))+'/actual-final-owner.json'),'finalLogicalCache':final['cache'],
        'limitations':['Same frozen report is serialized as a fresh browser object per condition: selected entry identity can change and cause a legal decode. This is not pure stable-query-object camera performance.',
                       'Pixel control removes both source consumers; actual catalogue cue suppression changes too. Difference is consumer path effect, not isolated photograph quality/causality.',
                       'M51 is below the horizon in the frozen context. Full-sphere view and centre landscape fade expose this direction; not field visibility.',
                       'Current M31/M51 v3 selected descriptors remain JPEG and NOT_MEASURED with validFraction null; no scientific finite-mask coverage claim.',
                       'Logical texture bytes omit native/driver overhead; Image references are deliberately strongly retained for diagnostics. Weak-current zero is not physical GC memory zero.']}
(OUT/'executed-script.py.txt').write_bytes(Path(__file__).read_bytes())
(OUT/'result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'result':bind(str(OUT.relative_to(ROOT))+'/result.json'),'png':len(png_checks),'ledgers':len(ledger_checks),'rows':len(row_checks)}))
