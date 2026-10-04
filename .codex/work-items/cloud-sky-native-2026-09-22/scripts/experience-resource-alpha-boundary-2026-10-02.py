"""Offline bounded alpha geometry and actual r4 trace readback; no image editing/publication/runtime."""
from pathlib import Path
import hashlib,json,sys
import numpy as np
from PIL import Image
import PIL

ROOT=Path(__file__).resolve().parents[4]
SOURCE=ROOT/'output/playwright/cloud-sky-full-hook-resource-1002-r4'
outbase=ROOT/'output/playwright/cloud-sky-resource-alpha-boundary-1002-r1'
number=2
while outbase.exists():
    outbase=ROOT/f'output/playwright/cloud-sky-resource-alpha-boundary-1002-r{number}'
    number+=1
outbase.mkdir(parents=True)
def binding(p):
    p=Path(p).resolve();body=p.read_bytes()
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()}
result_body=(SOURCE/'result.json').read_bytes()
assert hashlib.sha256(result_body).hexdigest()=='548b96c4dd399fcc88ff24cb3d73a18a09d884463890bb2a67eb24a4661ba20b'
result=json.loads(result_body)
for b in result['sourceBindings']:
    assert binding(ROOT/b['path'])==b
protected=json.loads((ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json').read_text())
for b in protected: assert binding(ROOT/b['path'])['sha256']==b['sha256']
old=json.loads((ROOT/'output/sky-artwork-public-retirement-1002-r3/result.json').read_text())['oldAssetsUnchanged']
assert len(old)==201
for b in old: assert binding(ROOT/b['path'])==b

frames=[];last_live=0
for row in result['rows']:
    name=row['condition']['name'];raw=(SOURCE/(name+'.rgba')).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==row['rgbaSha256']
    assert len(raw)==390*844*4
    with Image.open(SOURCE/(name+'.png')) as im:
        assert im.size==(390,844)
        rgba=np.asarray(im.convert('RGBA'))
    assert np.array_equal(rgba[::-1],np.frombuffer(raw,np.uint8).reshape(844,390,4))
    assert np.count_nonzero(rgba[:,:,:3])>390*844
    traces=[]
    for p in row['passes']:
        initial=last_live;peak=initial
        for event in p['events']:
            if event['operation']=='delete': last_live-=event['bytes']
            else: last_live+=event['bytes']
            assert last_live==event['liveBytes']
            peak=max(peak,last_live)
            info=event['source']
            if info is not None:
                assert info['status']=='decoded'
                expected=next(i for i in result['inputs'] if i.get('id')==info['offeredId'])
                assert info['sha256']==expected['sha256']
                assert [info['width'],info['height']]==[expected['width'],expected['height']]
                assert expected['sha256'] in info['path']
        assert last_live==p['liveBytes'] and peak==p['peakBytes']
        assert sum(i['bytes'] for i in p['retained'])==last_live
        traces.append({'pass':p['pass'],'initialBytes':initial,'peakBytes':peak,'endBytes':last_live,
         'sourceUploadBytes':sum(e['bytes'] for e in p['events'] if e['operation']=='source-upload'),
         'copyBytes':sum(e['bytes'] for e in p['events'] if e['operation']=='gpu-copy'),
         'deletionBytes':sum(e['bytes'] for e in p['events'] if e['operation']=='delete')})
    frames.append({'name':name,'rgbaSha256':row['rgbaSha256'],'pngDecodedExactBottomUpRgba':True,'passes':traces,
     'decodedOwnerRgbaModel':row['ready']['decodedSourceRgbaModel'],
     'sampledDecodedOwnerPeak':max(s['decodedSourceRgbaModel'] for s in row['states']),
     'coldFileOwnerEntries':row['ready']['coldFileOwnerEntries'],'cache':row['ready']['cache']})
assert result['rows'][0]['rgbaSha256']==result['rows'][4]['rgbaSha256']
target=result['rows'][2]
art=next(h for h in target['ready']['hooks'] if h['name']=='artwork')
assert len(art['wanted'])==28
alpha=[]
for a in art['wanted']:
    source=ROOT/'workers/miniapp-api/assets/constellations'/next(i['path'].split('/')[-1] for i in result['inputs'] if i.get('id')==a['id'])
    source_binding=binding(source)
    assert source_binding['sha256']==a['sha256'] and source_binding['bytes']==a['bytes']
    with Image.open(source) as im:
        rgba=np.asarray(im.convert('RGBA'));mode=im.mode
    h,w=rgba.shape[:2];assert [w,h]==[a['width'],a['height']]
    ys,xs=np.nonzero(rgba[:,:,3]>0)
    assert len(xs)>0 # No empty sources in this actual 28-image set.
    raw=[int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1]
    pad=3
    rect=[max(0,raw[0]-pad),max(0,raw[1]-pad),min(w,raw[2]+pad),min(h,raw[3]+pad)]
    rectangle_mask=np.zeros((h,w),bool);rectangle_mask[rect[1]:rect[3],rect[0]:rect[2]]=True
    assert not np.any(rgba[:,:,3][~rectangle_mask])
    # Each cropped internal boundary has exact alpha zero; original edges keep original CLAMP/discard rules.
    for internal,values in [(rect[0]>0,rgba[rect[1]:rect[3],rect[0],3]),(rect[2]<w,rgba[rect[1]:rect[3],rect[2]-1,3]),
                            (rect[1]>0,rgba[rect[1],rect[0]:rect[2],3]),(rect[3]<h,rgba[rect[3]-1,rect[0]:rect[2],3])]:
        if internal: assert not np.any(values)
    full=w*h*4;cropped=(rect[2]-rect[0])*(rect[3]-rect[1])*4
    alpha.append({'id':a['id'],'source':source_binding,'encodedMode':mode,'width':w,'height':h,
     'nonzeroAlphaPixels':int(len(xs)),'zeroAlphaNonzeroRgbPixels':int(np.count_nonzero((rgba[:,:,3]==0)&np.any(rgba[:,:,:3]>0,axis=2))),
     'finiteBlackNonzeroAlphaPixels':int(np.count_nonzero((rgba[:,:,3]>0)&np.all(rgba[:,:,:3]==0,axis=2))),
     'rawAlphaBoundsExclusive':raw,'linearNeighborPadding':pad,
     'paddedRectangle':{'x':rect[0],'y':rect[1],'width':rect[2]-rect[0],'height':rect[3]-rect[1]},
     'fullRgbaBytes':full,'paddedRgbaBytes':cropped,'savedBytes':full-cropped,
     'allOmittedAlphaExactlyZero':True,'internalClampEdgesAlphaExactlyZero':True})
full=sum(a['fullRgbaBytes'] for a in alpha);padded=sum(a['paddedRgbaBytes'] for a in alpha)
resident_other=sum(r['bytes'] for r in target['passes'][2]['retained'] if r['source']['offeredId'] not in {a['id'] for a in alpha})
warm=target['passes'][2]
uploads=[e for e in warm['events'] if e['operation']=='source-upload']
deletes=[e for e in warm['events'] if e['operation']=='delete']
assert len(uploads)==18 and len(deletes)==18
assert [(e['source']['objectId'],e['bytes']) for e in uploads]==[(e['source']['objectId'],e['bytes']) for e in deletes]
assert warm['events'][:18]==uploads and warm['events'][18:]==deletes
assert all(e['source']['offeredId'] in {a['id'] for a in alpha} for e in uploads)
report={'status':'READBACK_AND_ALPHA_GEOMETRY_PASS','input':binding(SOURCE/'result.json'),
 'versions':{'python':sys.version,'Pillow':PIL.__version__,'numpy':np.__version__},'frames':frames,'alphaRows':alpha,
 'aggregate':{'fullArtworkBytes':full,'paddedAlphaRectangleBytes':padded,'savedBytes':full-padded,
  'savingsFraction':(full-padded)/full,'otherActualWarmResidentBytes':resident_other,
  'hypotheticalPaddedArtworkPlusCurrentOtherResidentBytes':padded+resident_other,'gpuFrameEndBudget':16*1024*1024,
  'withinCurrentFrameEndBudget':padded+resident_other<=16*1024*1024},
 'cause':{'warmThirdPeakBytes':warm['peakBytes'],'warmEndBytes':warm['liveBytes'],'uploadedAndThenDeletedSame18Objects':True,
  'warmFullSourceUploadBytes':sum(e['bytes'] for e in uploads),'uploadedIds':[e['source']['offeredId'] for e in uploads],
  'actualCurrentArtworkWanted':28,'actualArtworkOwnerRgbaBytes':full,
  'codeCause':'Current getWindow marks each image used. Current begin protects prior used identities during preparation, including prior-used identities absent from the retained map. Actual third pass first reuploads 18 wanted full images, then all 18 are deleted after uploads. Their current-used qualification excludes finish unused eviction; whole-source sizes and over-budget total match finish whole-first retention trimming. Existing trace has no private remove-reason field, so callsite cause is derived against frozen production control flow, not independently instrumented stack.'},
 'preserved':{'six':protected,'old201':old},
 'limits':['No new GPU render or sampler comparison; alpha geometry is a candidate, not adopted residency or exact GL pixels.',
  'Omitted alpha zero proves no contribution, not scientific absence. RGB may be nonzero under alpha zero; RGB black does not supply a mask.',
  'Original encoded bytes, original source texels and image dimensions unchanged. Full decoded sources stay unchanged even if texture windows could reduce residency.',
  'Current shared GPU getWindow still uploads the full native source before an optional copy; alpha cropping cannot remove this cold full-upload peak.',
  'Task controls Map FS, query scheduling, Taro transport and desktop decode. Reference/encoded/logical texture counts do not establish physical native/driver/GC/OS memory or 200DAU capacity.',
  'draws.source in original trace is a raw bound texture at draw time; it does not certify every primitive used that sampler or has photo source credit.']}
(outbase/'executed-script.py.txt').write_bytes(Path(__file__).read_bytes())
(outbase/'result.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps({'output':str(outbase.relative_to(ROOT)),'result':binding(outbase/'result.json'),'aggregate':report['aggregate']},indent=2))
