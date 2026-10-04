"""Pinned real single-field partial input through the current opt-in v3 writer."""
from pathlib import Path
import hashlib
import io
import json
import sys
import types

ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image
import publish_sdss_science as publisher
import sdss_gri_tan as owner

OUT=ROOT/'output/partial-science-publication-1003-r1'
CACHED=ROOT/'output/sdss-gri-tan-candidate-1002'
PINS={'candidate_sha256':'86596c0d7e4fa0709ec516ae96a37e07b2d41fd981dc46488ca57bdf48d315e4',
      'binding_sha256':'344cb3392d104ed65dca2a77e723b249f2eba83fa098d2a798a6aac5286a3c02'}

def bind(path):
    raw=path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}

# A bounded rollback of format recognition reproduces the old real-input
# rejection. No source file is changed, no acquisition/render matrix repeats.
source=Path(publisher.__file__).read_text(encoding='utf8')
needle="single_evidence = (candidate['version'] == gri.VERSION"
assert source.count(needle)==1
old=types.ModuleType('bounded_old_single_evidence');sys.modules[old.__name__]=old
old.__file__=publisher.__file__
exec(compile(source.replace(needle,"single_evidence = (False and candidate['version'] == gri.VERSION"),publisher.__file__,'exec'),old.__dict__)
try:
    old.verify_cached_candidate(CACHED,root=ROOT,**PINS)
    raise AssertionError('old boundary unexpectedly admitted original single-field binding')
except KeyError as error:
    assert error.args==('candidateOutputs',)
    before_failure={'kind':'KeyError','field':error.args[0],'productionFilesMutated':False}

verified=publisher.verify_cached_candidate(CACHED,root=ROOT,**PINS)
receipt=publisher.publish_verified_candidate(verified,OUT,root=ROOT,
    publication_id='sdss-dr17-m51-single-partial-signed-mean-candidate-20261003',
    legacy_manifest=ROOT/'workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json',
    pyramid_kind=owner.SCIENCE_PYRAMID_KIND)
manifest=json.loads((OUT/'manifest.json').read_bytes())
assert manifest['master']['rgb']=={key:verified.candidate['arrays']['rgb-master'][key] for key in ('bytes','sha256')}
assert manifest['master']['transfer']['recipe']==verified.transfer
assert not (OUT/'reference-rgb-master.npy').exists()
records=[]
for level,asset in manifest['levels'].items():
    factor=asset['masterCrop']['boxFactor'];x0,y0,x1,y1=asset['masterCrop']['boundsXYExclusive']
    joint=verified.master.joint_available[y0:y1,x0:x1]
    counts=joint.reshape(512,factor,512,factor).sum(axis=(1,3),dtype=np.uint64)
    present=counts>0
    rgba=np.asarray(Image.open(OUT/asset['file']))
    expected_alpha=np.rint(counts.astype(np.float64)*255/(factor*factor)).astype(np.uint8)
    assert np.array_equal(rgba[:,:,3],expected_alpha)
    assert np.all(rgba[~present]==0),'missing area cannot receive celestial color or opacity'
    metadata=asset['scienceMean']
    assert metadata['availableMasterSamples']==int(joint.sum())
    assert metadata['availablePixels']==int(present.sum())
    assert metadata['emptyPixels']==int((counts==0).sum())
    assert metadata['partialPixels']==int(((counts>0)&(counts<factor*factor)).sum())
    # Independent sample gathering/mean, rather than the owner's reshape/sum.
    # Select each nonempty occupancy class and the first all-black valid bin.
    selected=[]
    classes=np.unique(counts)
    black=present & np.all(rgba[:,:,:3]==0,axis=2)
    for count in classes:
        if count:
            y,x=np.argwhere(counts==count)[0];selected.append((int(y),int(x)))
    if black.any():
        y,x=np.argwhere(black)[0];selected.append((int(y),int(x)))
    samples=[]
    for y,x in selected:
        support=joint[y*factor:(y+1)*factor,x*factor:(x+1)*factor]
        projected={}
        values={}
        for band in owner.BANDS:
            data=verified.master.bands[band].data[y0+y*factor:y0+(y+1)*factor,x0+x*factor:x0+(x+1)*factor]
            mean=np.asarray([[data[support].astype(np.float64).mean()]],dtype=np.float32)
            values[band]=float(mean[0,0])
            projected[band]=owner.ProjectedBand(mean,np.ones((1,1),dtype=bool),np.ones((1,1),dtype=bool),{})
        expected,_=owner.make_rgb_display(projected,np.ones((1,1),dtype=bool),
            transfer=owner.FixedDisplayTransfer(stretch=verified.transfer['stretch'],Q=verified.transfer['Q']))
        assert np.array_equal(rgba[y,x,:3],expected[0,0])
        samples.append({'xy':[x,y],'count':int(counts[y,x]),'meansNanomaggiesPerSourcePixel':values,
            'rgba':rgba[y,x].tolist()})
    records.append({'level':level,'png':bind(OUT/asset['file']),'availableMasterSamples':int(joint.sum()),
        'availablePixels':int(present.sum()),'emptyPixels':int((counts==0).sum()),
        'partialPixels':int(((counts>0)&(counts<factor*factor)).sum()),
        'validBlackPixels':int(black.sum()),'sampleOccupancyClasses':classes.tolist(),
        'independentGatheredMeanSamples':samples,'alphaExactArea':True,'missingRGBAZero':True})
assert records[0]['partialPixels']>0 and records[0]['emptyPixels']>0
assert sum(row['validBlackPixels'] for row in records)>0
assert receipt['inputsBefore']==receipt['inputsAfter']
assert receipt['implementationBefore']==receipt['implementationAfter']
result={'status':'REAL_PARTIAL_LOCAL_V3_NOT_QUALITY_ADOPTED','oldBoundaryFailure':before_failure,
    'manifest':bind(OUT/'manifest.json'),'writerReceipt':bind(OUT/'writer-receipt.json'),
    'publicationHash':receipt['publicationHash'],'levels':records,
    'originalReferenceRgbAndResolvedRecipePreserved':True,'inputsUnchanged':True,
    'sourceFrameCount':len(verified.sources),'defaultRegistered':False,'script':bind(Path(__file__)),
    'scope':'Actual pinned single-field science and native 2048/512 TAN crops; no source read/reprojection/download, scientific validity/color/PSF/weak structure/native/independent review acceptance.'}
(OUT/'result.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
print(json.dumps({key:value for key,value in result.items() if key!='levels'}))
print(json.dumps([ {key:value for key,value in row.items() if key not in ('independentGatheredMeanSamples','png')} for row in records]))
