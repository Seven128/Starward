"""Current offline owner readback; no acquisition, reproject, fit or adoption."""
from pathlib import Path
import hashlib
import io
import json
import sys
import unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
import sdss_gri_tan as owner
import publish_sdss_science as publisher
from test_sdss_science_pyramid import SciencePyramidTest
OUT=ROOT/'output/science-pyramid-development-1003-r1/readback-r2'
def bind(path):
    h=hashlib.sha256()
    with path.open('rb') as stream:
        while block:=stream.read(1024*1024):h.update(block)
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':h.hexdigest()}
source=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
verified=publisher.verify_cached_candidate(source,root=ROOT,
    candidate_sha256='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52',
    binding_sha256='bc2af0aafc316986c6e55ae75a144074421b930dad2273c001809803585c087d')
previous=ROOT/'output/signed-science-lod-1003-r1/result.json'
assert bind(previous)['sha256']=='178dc73b819ea1600eabbc6532c403fade534a0f2f8c148363de115e3e57d293'
pilot=json.loads(previous.read_bytes())
master=verified.master
rgb,recipe=owner.make_rgb_display(master.bands,master.joint_available,
    transfer=owner.FixedDisplayTransfer(stretch=.5,Q=10))
reference=ROOT/'output/sdss-m51-global-transfer-1002/docs-05-q10/rgb-master.npy'
assert bind(reference)['sha256']=='70a3fb129a8dc536e9a7e2c13d34bfb3c23cb9dbcca5ba5c02252e34cebc7515'
assert np.array_equal(rgb,np.load(reference,mmap_mode='r',allow_pickle=False))
master.rgb=rgb;master.report['display']['transfer']=recipe
entry={key:verified.candidate[key] for key in ('objectRef','center','orientation')}
# Disallow statistical fitting in all new crops, including this actual mother.
with patch.object(owner,'ZScaleInterval',side_effect=AssertionError('crop fit')), \
     patch.object(owner,'LuptonAsinhZscaleStretch',side_effect=AssertionError('crop fit')):
    products=owner.science_mean_pyramid(master,entry)
records=[]
OUT.mkdir()
for row in pilot['records']:
    level=row['level'];payload,metadata=products[level]
    original=ROOT/row['png']['path'];actual=bind(original)
    assert (actual['bytes'],actual['sha256'])==(row['png']['bytes'],row['png']['sha256'])
    assert payload==original.read_bytes(),level+' differs from saved signed-science pilot'
    for key in ('fieldDegrees','wcsHeader'):
        assert metadata[key]==row[key],key
    assert metadata['masterCrop']['boundsXYExclusive']==row['crop']['boundsXYExclusive']
    assert metadata['displayRecipe']['statisticalFitCalls']==0
    path=OUT/(level.lower()+'.png');path.write_bytes(payload)
    records.append({'level':level,'png':bind(path),'exactPilotBytes':True,'metadata':metadata})
normal=io.StringIO()
suite=unittest.TestSuite([SciencePyramidTest('test_signed_noise_cancels_before_display_and_weak_positive_signal_remains')])
normal_result=unittest.TextTestRunner(stream=normal).run(suite)
assert normal_result.wasSuccessful()
mutation=io.StringIO()
with patch.object(owner,'science_mean_pyramid',side_effect=lambda master,entry,**kwargs:owner.pyramid(master,entry,**kwargs)):
    suite=unittest.TestSuite([SciencePyramidTest('test_signed_noise_cancels_before_display_and_weak_positive_signal_remains')])
    changed=unittest.TextTestRunner(stream=mutation).run(suite)
assert len(changed.failures)==1 and not changed.errors
assert '(actual[:,:,:3]==0).all()' in mutation.getvalue()
(OUT/'normal-regression.log').write_text(normal.getvalue())
(OUT/'rgb-first-mutation.log').write_text(mutation.getvalue())
inputs=[Path(__file__),Path(owner.__file__),Path(publisher.__file__),previous,reference]
result={'status':'CURRENT_OFFLINE_OWNER_SELF_READBACK_NOT_INDEPENDENT_OR_NATIVE_ACCEPTANCE',
    'legacyPublicationReadback':{'pinnedCandidate':bind(source/'candidate.json'),
        'pinnedBinding':bind(source/'binding.json'),'admittedSourceReceipts':len(verified.sources),
        'verifiedFileBindings':len(verified.bindings),'threeOriginalEncodedPngsExactlyReproduced':True},
    'currentScienceLevels':records,'wholeMasterTransfer':recipe,
    'boundedMutation':{'normalPass':True,'rgbFirstMutationFailures':len(changed.failures),
        'errors':len(changed.errors),'normalLog':bind(OUT/'normal-regression.log'),
        'mutatedLog':bind(OUT/'rgb-first-mutation.log'),'productionFilesMutated':False},
    'currentCodeAndCachedInputs':[bind(path) for path in inputs],
    'meaning':'Existing calibrated mother reused without acquisition/reprojection/sky correction. Same fixed transfer, partial semantics tested separately. No new v2 publication, source/color/PSF or complete quality acceptance.'}
(OUT/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'result':bind(OUT/'result.json'),'legacy':result['legacyPublicationReadback'],
    'currentLevels':[{'level':row['level'],'png':row['png']} for row in records],
    'mutationFailures':len(changed.failures)}))
