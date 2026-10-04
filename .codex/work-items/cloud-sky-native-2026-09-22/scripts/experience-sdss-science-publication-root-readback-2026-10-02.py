"""Read existing writer output only; no source processing, publication or GPU."""
from pathlib import Path
import hashlib
import json
import math
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
GEN = ROOT/'output/sdss-science-optical-writer-1002-r1'
CACHE = ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
OUT = ROOT/'output/sdss-science-publication-root-readback-1002-r1'
OUT.mkdir(exist_ok=False)
bindings = {}

def bound(path, expected=None):
    path=path.resolve();raw=path.read_bytes()
    row={'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
    if expected is not None:
        assert all(row[k]==expected[k] for k in ('bytes','sha256')),row['path']
    bindings[row['path']]=row
    return raw

def read_json(path, expected=None): return json.loads(bound(path,expected).decode('utf8'))

manifest=read_json(GEN/'publication/manifest.json',{'bytes':18078,'sha256':'3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5'})
result=read_json(GEN/'result.json')
receipt=read_json(GEN/'publication/writer-receipt.json',result['writerReceipt'])
payload=read_json(GEN/'publication/publication-input.json')
unwrapped={k:v for k,v in manifest.items() if k!='publicationHash'}
unwrapped['levels']={k:{a:b for a,b in v.items() if a!='downloadUrl'} for k,v in manifest['levels'].items()}
assert unwrapped==payload
assert manifest['publicationHash']=='34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0'
assert not receipt['qualityAdopted'] and not receipt['runtimeRegistered'] and receipt['nodeExitCode']==0
assert receipt['inputsBefore']==receipt['inputsAfter'] and receipt['implementationBefore']==receipt['implementationAfter']
before=read_json(GEN/'binding-before.json');after=read_json(GEN/'binding-after.json');assert before==after
for group in before.values():
    for row in group: bound(ROOT/row['path'],row)
for group in (receipt['inputsAfter'],receipt['implementationAfter'],receipt['outputFiles']):
    for row in group: bound(ROOT/row['path'],row)
candidate=read_json(CACHE/'candidate.json');upstream=read_json(CACHE/'binding.json')
master=manifest['master'];counts={}
for band in ('g','r','i'):
    a=candidate['arrays'][band+'-science'];p=CACHE/a['file'];bound(p,master['science'][band]);v=np.load(p,allow_pickle=False)
    counts[band]={'shape':list(v.shape),'finite':int(np.isfinite(v).sum()),'zero':int((v==0).sum()),'negative':int((v<0).sum())}
joint=np.load(CACHE/candidate['arrays']['joint-availability']['file'],allow_pickle=False)
rgb=np.load(CACHE/candidate['arrays']['rgb-master']['file'],allow_pickle=False)
assert joint.dtype==np.bool_ and joint.shape==(2048,2048) and int(joint.sum())==master['jointAvailability']['availablePixels']==4194304
assert rgb.dtype==np.uint8 and rgb.shape==(2048,2048,3)
source_map={tuple(r['identity'][k] for k in ('rerun','run','camcol','field','band')):r for r in upstream['sourceFrameReceipts']}
assert len(source_map)==len(master['sourceFrames'])==18
for frame in master['sourceFrames']:
    identity=frame['identity'];key=tuple(identity[k] for k in ('rerun','run','camcol','field','band'))
    name='-'.join(map(str,key))+'.json';source=read_json(GEN/'publication/admission-receipts'/name,frame['admissionReceipt'])
    assert source==source_map[key] and source['source']['sha256']==frame['sha256'] and source['source']['bytes']==frame['bytes']
    assert hashlib.sha256(source['wcs']['primaryHeaderFitsCards'].encode('utf8')).hexdigest()==frame['primaryHeaderSha256']
levels=[]
for index,level in enumerate(('OVERVIEW','MEDIUM','DETAIL')):
    asset=manifest['levels'][level];path=GEN/'publication'/asset['file'];bound(path,asset)
    assert path.read_bytes()==(CACHE/candidate['levels'][level]['file']).read_bytes()
    extent=2048//2**index;start=(2048-extent)//2;factor=extent//512
    assert asset['masterCrop']=={'boundsXYExclusive':[start,start,start+extent,start+extent],'boxFactor':factor}
    exact=math.degrees(2*math.atan(math.tan(math.radians(master['fieldDegrees'])/2)*extent/2048))
    assert asset['fieldDegrees']==exact and asset['crpixFitsOneBased']==256.5 and asset['sampleAvailability']=='joint-area-alpha'
    # Actual r2 is complete: each independent integer box reduces to an RGB
    # arithmetic mean. This readback does not claim real partial-alpha coverage.
    block=rgb[start:start+extent,start:start+extent].reshape(512,factor,512,factor,3)
    color=np.rint(block.sum(axis=(1,3),dtype=np.uint64)/(factor*factor)).astype(np.uint8)
    expected=np.dstack([color,np.full((512,512),255,dtype=np.uint8)])
    with Image.open(path) as image:
        image.load();assert image.mode=='RGBA' and image.size==(512,512);actual=np.asarray(image)
        assert np.array_equal(actual,expected),level
    levels.append({'level':level,'bytes':asset['bytes'],'allRgbaBytesEqualIndependentBox':True,'fieldDegrees':exact,'boxFactor':factor})
read_json(ROOT/'output/sdss-science-worker-typecheck-boundary-1002-r1/result.json')
final={'scope':'Root artifact readback only. Exact saved metadata/source receipts/preserved bytes and complete actual-r2 PNG box derivation; no repeated producer/GPU, quality/native/partial-real-sample or publication adoption.',
       'publicationHash':manifest['publicationHash'],'masterScienceCounts':counts,'levels':levels,
       'preservedGroups':{k:len(v) for k,v in before.items()},'currentOwnersAndInputsRead':len(bindings),
       'qualityAdopted':False,'runtimeRegistered':False,'sharedHashIndependentlyReviewedElsewhere':True}
bound(Path(__file__))
(OUT/'executed-script.py.txt').write_bytes(Path(__file__).read_bytes())
(OUT/'result.json').write_text(json.dumps(final,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(OUT/'binding.json').write_text(json.dumps({'inputs':list(bindings.values())},indent=2)+'\n',encoding='utf8')
print(json.dumps({'output':str(OUT.relative_to(ROOT)),'publicationHash':manifest['publicationHash'],'read':len(bindings),'allThreeFullRgbaMatch':True}))
