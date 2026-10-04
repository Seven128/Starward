"""Read actual saved packaging outputs, identities and source joins, without generation."""
from pathlib import Path
import hashlib, importlib.util, json, sys
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
decoder=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/readback-prepared-rgb-tan-independent-2026-10-03.py'
spec=importlib.util.spec_from_file_location('independent_saved_png_decoder',decoder);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
OUT=ROOT/'output/prepared-optical-independent-1003-r1'
def load(p):return json.loads(Path(p).read_bytes())
def bind(p):
    p=Path(p).resolve();b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix() if p.is_relative_to(ROOT) else p.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def actual(row):
    p=Path(row['path']);return p if p.is_absolute() else ROOT/p
paths={Path(__file__),decoder}
generations=[]
for r in (2,3,4):
    d=ROOT/f'output/prepared-optical-publication-1003-r{r}'
    a,b=load(d/'owners-before.json'),load(d/'owners-after.json');assert a==b
    differences=[]
    for row in a:
        p=actual(row);paths.add(p);copy=d/'executed-owners'/row['path']
        if copy.is_file():
            paths.add(copy);c=bind(copy);assert c['bytes']==row['bytes'] and c['sha256']==row['sha256']
        now=bind(p)
        if now!=row:differences.append({'executed':row,'current':now})
    result=load(d/'result.json');writer=load(d/'publication/writer-receipt.json');manifest=load(d/'publication/manifest.json')
    assert len(writer['inputs'])==2904 and writer['implementationBefore']==writer['implementationAfter']
    for row in writer['inputs']+writer['files']:
        p=actual(row);paths.add(p);assert bind(p)==row
    for p in d.rglob('*'):
        if p.is_file():paths.add(p)
    assert writer['nodeExitCode']==0 and writer['publicationHash']==manifest['publicationHash']==result['publicationHash']
    assert bind(d/'publication/manifest.json')==result['manifest'] and bind(d/'publication/writer-receipt.json')==result['writerReceipt']
    assert (d/'publication/manifest.json').read_bytes()==(d/'publication/node-cli-stdout.txt').read_bytes()
    assert (d/'publication/node-cli-stderr.txt').read_bytes()==b''
    raw=load(d/'publication/publication-input.json');content=dict(manifest);content.pop('publicationHash');content['levels']={l:{k:v for k,v in v.items() if k!='downloadUrl'} for l,v in manifest['levels'].items()};assert raw==content
    assert result['sourceDecodes']==result['masterReprojections']==result['networkRequests']==0
    assert not result['runtimeRegistered'] and not result['qualityAdopted']
    generations.append({'generation':r,'result':bind(d/'result.json'),'writerReceipt':bind(d/'publication/writer-receipt.json'),'manifest':bind(d/'publication/manifest.json'),'actualNodeExitCode':writer['nodeExitCode'],'ownersBeforeAfterExact':True,'currentDifferences':differences,'boundInputRows':len(writer['inputs'])})
assert not generations[-1]['currentDifferences']
r1=ROOT/'output/prepared-optical-publication-1003-r1'
assert load(r1/'result.json')['status']=='FAILED'
paths.update(p for p in r1.rglob('*') if p.is_file())
cached=load(ROOT/'output/prepared-rgb-tan-cached-validation-1003-r1/result.json')
md=cached['masterMetadata'];admission=load(ROOT/cached['sourceAdmission']['path'])
current=load(ROOT/'output/prepared-optical-publication-1003-r4/publication/manifest.json')
assert current['processing']['producerReceipt']=={k:bind(ROOT/'output/prepared-rgb-tan-cached-validation-1003-r1/result.json')[k] for k in ('bytes','sha256')}
assert current['master']['rgba']=={'bytes':md['rgba']['bytes'],'sha256':md['rgba']['sha256']}
assert current['master']['rgbaNpy']=={k:cached['master'][k] for k in ('bytes','sha256')}|{'format':'npy','shape':[2048,2048,4],'dtype':'uint8','rowOrder':'top-first'}
assert current['source']['credit']==admission['source']['credit'] and current['source']['colourMeaning']==admission['source']['colour_meaning']
for name,key in [('encodedJpeg','jpeg'),('rawXmp','xmp')]:assert current['source'][name]==admission['source'][key]
assert current['source']['parserXmp']=={k:admission['normalization']['parserXml'][k] for k in ('bytes','sha256')}
assert current['source']['decodedRgb']=={k:admission['decodedRgb'][k] for k in ('bytes','sha256','shape')}|{'rowOrder':'top-first'}
assert current['source']['nominalAvm']['spatialNotes']==admission['geometry']['spatial_notes']
assert current['source']['nominalAvm']['accuracy']=='UNVERIFIED_APPROXIMATE_PUBLISHER_AVM'
assert current['master']['scientificAvailability']==current['master']['scientificValidity']=='UNKNOWN'
levels=[]
for l,v in current['levels'].items():
    filename=v['file'];pub=ROOT/'output/prepared-optical-publication-1003-r4/publication'/filename
    original=ROOT/cached['levels'][l]['file']['path'];rgba,filters,chunks=module.png(pub)
    assert pub.read_bytes()==original.read_bytes()
    for r in (2,3):assert pub.read_bytes()==(ROOT/f'output/prepared-optical-publication-1003-r{r}/publication'/filename).read_bytes()
    assert len(pub.read_bytes())==v['bytes'] and hashlib.sha256(pub.read_bytes()).hexdigest()==v['sha256']
    m=cached['levels'][l]['metadata'];assert hashlib.sha256(rgba.tobytes()).hexdigest()==m['rgba']['sha256']
    assert v['fieldDegrees']==m['fieldDegrees'] and v['masterCrop']=={k:m['masterCrop'][k] for k in ('boundsXYExclusive','boxFactor')}
    assert v['alphaPixels']==m['alphaPixels'] and v['geometricMasterSupportPixels']==m['geometricSourceMasterSupportPixels']
    assert v['masterRgbaSha256']==current['master']['rgba']['sha256'] and v['displayAlpha']=='geometric-source-area' and v['scientificAvailability']=='UNKNOWN'
    assert v['downloadUrl']==f"/v2/sky/prepared-optical/{current['publicationHash']}/{filename}"
    levels.append({'level':l,'file':bind(pub),'wholeBytesExactCachedAndR2R3':True,'wholeRgbaHashExactCached':True,'rgbaSha256':m['rgba']['sha256'],'alphaCounts':m['alphaPixels'],'pngFilters':filters})
protected=load(ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json')
for row in protected:paths.add(actual(row));assert bind(actual(row))['sha256']==row['sha256']
paths.update(p for p in OUT.rglob('*') if p.is_file())
before=[bind(p) for p in sorted(paths)];after=[bind(p) for p in sorted(paths)];assert before==after
record={'status':'PASS_BOUNDED_CURRENT_PREPARED_PUBLICATION_READBACK','generations':generations,'r1RemainsFailed':True,'levels':levels,'fullSourceCreditColourNotesAndByteIdentitiesJoin':True,'rawPayloadAndNpyContainerJoinSeparate':True,'protectedSixExact':True,'boundFiles':len(before),'currentImplementation':bind(ROOT/'data-pipelines/deep-sky/publish_prepared_optical.py'),'beforeAfterExact':True,'scope':'Saved actual R2/R3/R4 packaging outputs and current complete identity/source/PNG readback, preserving old generations and independently repaired pin race. No writer reexecution, source JPEG decode, master/LOD generation, HTTP/runtime registration or GPU; no rights/quality/native/5arcsec approval.'}
(OUT/'readback.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf8')
(OUT/'bindings.json').write_text(json.dumps({'before':before,'after':after},indent=2)+'\n',encoding='utf8')
(OUT/'executed-readback-script.py').write_bytes(Path(__file__).read_bytes())
print(json.dumps({'result':bind(OUT/'readback.json'),'bindings':bind(OUT/'bindings.json'),'files':len(before),'currentHash':current['publicationHash'],'generationsCurrentChanges':[{'r':g['generation'],'paths':[d['executed']['path'] for d in g['currentDifferences']]} for g in generations]}))
