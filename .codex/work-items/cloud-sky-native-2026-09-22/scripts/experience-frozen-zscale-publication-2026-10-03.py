"""Reuse pinned real resolved zscale/reference RGB; bounded sample verification."""
from pathlib import Path
import copy
import hashlib
import json
import sys
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import publish_sdss_science as publisher
import sdss_gri_tan as owner

def bind(path):
    raw=path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}

OUT=ROOT/'output/frozen-zscale-publication-1003-r1'
REPORT=ROOT/'output/sdss-m51-shared-transfer-1002/result.json'
BINDING=ROOT/'output/sdss-m51-shared-transfer-1002/binding.json'
report_binding=bind(REPORT);binding_binding=bind(BINDING)
assert report_binding['sha256']=='6eb66308827aa35c1114f66689452354616da73ee1d5320d15778763b3821d8d'
assert binding_binding['sha256']=='0ecb0c72357dc019b792436678fe7d7344e23e9bcaa783532907e0c9d2b5c784'
report=json.loads(REPORT.read_bytes());binding=json.loads(BINDING.read_bytes())
variant=report['variants']['global-zscale-q8']
for value in (report_binding,variant['rgbMaster']):
    assert {key:value[key] for key in ('path','bytes','sha256')} in binding['outputs']
verified=publisher.verify_cached_candidate(ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2',root=ROOT,
    candidate_sha256='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52',
    binding_sha256='bc2af0aafc316986c6e55ae75a144074421b930dad2273c001809803585c087d')
for key in [*(band+'-science' for band in owner.BANDS),'joint-availability']:
    metadata=verified.candidate['arrays'][key]
    value=bind(verified.candidate_directory/metadata['file'])
    assert value in report['actualInputs']
original_identity=verified.candidate['arrays']['rgb-master']['sha256']
fit_calls=[]
original_get_limits=owner.ZScaleInterval.get_limits
def verify_limits(instance,values):
    fit_calls.append(int(values.size))
    return original_get_limits(instance,values)
with patch.object(owner,'LuptonAsinhZscaleStretch',side_effect=AssertionError('new full-master fit')), \
     patch.object(owner.ZScaleInterval,'get_limits',verify_limits):
    frozen=publisher.reuse_frozen_zscale_reference(verified,root=ROOT,
        rgb_path=ROOT/variant['rgbMaster']['path'],rgb_binding=variant['rgbMaster'],
        recipe=variant['transfer'],evidence_bindings=(report_binding,binding_binding))
    # Old publication cannot accidentally copy its legacy products while
    # claiming this newly admitted transfer/RGB identity.
    forbidden=ROOT/'output/frozen-zscale-legacy-forbidden-1003-r1'
    try:
        publisher.publish_verified_candidate(frozen,forbidden,root=ROOT,publication_id='forbidden',
            legacy_manifest=ROOT/'workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json')
        raise AssertionError('frozen reference entered legacy v2')
    except RuntimeError as error:
        assert str(error)=='sdss_science_frozen_reference_requires_unmodified_v3'
        assert not forbidden.exists()
    receipt=publisher.publish_verified_candidate(frozen,OUT,root=ROOT,
        publication_id='sdss-dr17-m51-frozen-global-zscale-signed-mean-candidate-20261003',
        legacy_manifest=ROOT/'workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json',
        pyramid_kind=owner.SCIENCE_PYRAMID_KIND)
assert fit_calls==[1000],'one original bounded verification sample, no LOD/full-master fits'
manifest=json.loads((OUT/'manifest.json').read_bytes())
assert manifest['master']['transfer']['recipe']==variant['transfer']
assert manifest['master']['rgb']=={key:variant['rgbMaster'][key] for key in ('bytes','sha256')}
assert verified.candidate['arrays']['rgb-master']['sha256']==original_identity
assert not (OUT/'reference-rgb-master.npy').exists()
records=[]
for level,asset in manifest['levels'].items():
    saved=bind(OUT/asset['file'])
    original=variant['levels'][level]['actualFile']
    if level=='DETAIL':assert saved['sha256']==original['sha256']
    else:assert saved['sha256']!=original['sha256']
    records.append({'level':level,'png':saved,'oldEncodedPng':original,
        'fineSameBytes':level=='DETAIL','scienceMean':asset['scienceMean']})

# The earlier in-memory pyramid qualifier checked only fit counts/class. A
# false sample identity passed it; new frozen admission rejects the same input.
bad_recipe=copy.deepcopy(variant['transfer']);bad_recipe['statisticalFit']['sampleFloat64Sha256']='0'*64
bad_master=owner.GriMaster(frozen.master.target,frozen.master.bands,frozen.master.joint_available,
    frozen.master.rgb,{'fieldDegrees':frozen.candidate['fieldDegrees'],'display':{'transfer':bad_recipe}})
assert owner._qualified_science_pyramid(bad_master)==bad_recipe
try:
    publisher.reuse_frozen_zscale_reference(verified,root=ROOT,rgb_path=ROOT/variant['rgbMaster']['path'],
        rgb_binding=variant['rgbMaster'],recipe=bad_recipe,evidence_bindings=(report_binding,binding_binding))
    raise AssertionError('false sample identity admitted')
except RuntimeError as error:
    assert str(error)=='sdss_frozen_zscale_sample_receipt_mismatch'
    rejection=str(error)
assert receipt['inputsBefore']==receipt['inputsAfter']
assert receipt['implementationBefore']==receipt['implementationAfter']
result={'status':'PINNED_FROZEN_ZSCALE_LOCAL_V3_NOT_QUALITY_ADOPTED',
    'manifest':bind(OUT/'manifest.json'),'writerReceipt':bind(OUT/'writer-receipt.json'),
    'publicationHash':receipt['publicationHash'],'producerEvidence':[report_binding,binding_binding],
    'referenceRgb':variant['rgbMaster'],'recipeUnchanged':True,'noReferenceRewritten':True,
    'verification':frozen.frozen_display_validation,'measuredSampleFitSizes':fit_calls,
    'legacyV2RejectedBeforeWriting':True,'falseSampleIdentityRejected':rejection,
    'oldInMemoryQualifierAcceptedFalseSampleIdentity':True,'levels':records,
    'inputsUnchanged':True,'defaultRegistered':False,'script':bind(Path(__file__)),
    'scope':'Existing resolved whole-master recipe/reference RGB and calibrated science reused; one 1000-sample receipt verification, zero full-master and LOD fits. No FITS reads/reprojection/download, new display choice, source-quality/native/independent review acceptance.'}
(OUT/'result.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
print(json.dumps({key:value for key,value in result.items() if key not in ('levels','producerEvidence','referenceRgb')}))
