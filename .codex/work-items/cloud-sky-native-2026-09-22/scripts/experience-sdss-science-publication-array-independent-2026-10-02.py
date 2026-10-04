"""Independent cached science, receipt and PNG readback; no producer RGB/pyramid."""
from pathlib import Path
import hashlib
import importlib.util
import json
import sys
import copy
from types import SimpleNamespace

ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image

SOURCE=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
source_name,out_name=sys.argv[1:3]
assert source_name.startswith('output/sdss-science-optical-writer-1002-r') and source_name.endswith('/publication')
assert out_name.startswith('output/sdss-science-publication-array-independent-1002-r')
publication=ROOT/source_name;output=ROOT/out_name;output.mkdir(exist_ok=False)
checked={}
def bind(p):
    p=p.resolve();raw=p.read_bytes()
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def admit(p,expected=None):
    b=bind(p)
    if expected:
        for key in ('bytes','sha256'):
            if key in expected:assert b[key]==expected[key],(b,expected)
    if b['path'] in checked:assert checked[b['path']]==b
    checked[b['path']]=b;return b
def save(name,value):
    with (output/name).open('x',encoding='utf8') as f:json.dump(value,f,ensure_ascii=False,allow_nan=False,indent=2);f.write('\n')

try:
    (output/'executed-script.py.txt').write_bytes(Path(__file__).read_bytes())
    candidate_path=SOURCE/'candidate.json'
    admit(candidate_path,{'sha256':'73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'})
    candidate=json.loads(candidate_path.read_bytes())
    receipt=json.loads((publication/'writer-receipt.json').read_bytes());admit(publication/'writer-receipt.json')
    for entry in [*receipt['inputsBefore'],*receipt['implementationBefore'],*receipt['outputFiles']]:admit(ROOT/entry['path'],entry)
    assert receipt['inputsBefore']==receipt['inputsAfter'] and receipt['implementationBefore']==receipt['implementationAfter']
    manifest=json.loads((publication/'manifest.json').read_bytes());admit(publication/'manifest.json')
    admit(publication/'manifest.json',{'bytes':18078,'sha256':'3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5'})
    master=manifest['master'];assert master['pixels']==2048 and master['unit']=='nanomaggies/pixel'
    assert master['scientificValidity']=='UNKNOWN' and master['astrometry']=='source-primary-linear-TAN-approximation'
    assert manifest['source']['landingUrl']=='https://www.sdss4.org/dr17/imaging/images/'
    assert 'no pixel edits' not in manifest['processing']['modification']
    assert 'SkyServer' not in manifest['processing']['modification']
    assert 'UNKNOWN' in manifest['processing']['coverage']
    assert manifest['source']['dataset'].startswith('SDSS DR17 calibrated corrected-frame g/r/i imaging')
    assert manifest['center']==candidate['center'] and manifest['orientation']==candidate['orientation']
    assert master['fieldDegrees']==candidate['fieldDegrees']
    science={};counts={};before_arrays=[]
    for band in 'gri':
        m=candidate['arrays'][band+'-science'];p=SOURCE/m['file'];b=admit(p,m);before_arrays.append(b)
        assert master['science'][band]=={k:b[k] for k in ('bytes','sha256')}
        value=np.load(p,mmap_mode='r',allow_pickle=False);assert value.dtype==np.float32 and value.shape==(2048,2048)
        science[band]=value
        counts[band]={'finiteSamples':int(np.isfinite(value).sum()),'zeroSamples':int((value==0).sum()),'negativeSamples':int((value<0).sum()),'minimum':float(np.nanmin(value)),'maximum':float(np.nanmax(value))}
    m=candidate['arrays']['joint-availability'];p=SOURCE/m['file'];b=admit(p,m);before_arrays.append(b)
    assert {k:master['jointAvailability'][k] for k in ('bytes','sha256')}=={k:b[k] for k in ('bytes','sha256')}
    joint=np.load(p,mmap_mode='r',allow_pickle=False);assert joint.dtype==np.bool_ and joint.shape==(2048,2048)
    assert int(joint.sum())==master['jointAvailability']['availablePixels']==4194304
    coherent=np.ones(joint.shape,dtype=np.bool_)
    for band in 'gri':
        for suffix in ['footprint','finite-neighbors']:
            entry=candidate['arrays'][band+'-'+suffix];p=SOURCE/entry['file'];admit(p,entry)
            value=np.load(p,mmap_mode='r',allow_pickle=False);assert value.dtype==np.bool_ and value.shape==joint.shape;coherent &= value
        assert np.isfinite(science[band][joint]).all()
    assert np.array_equal(coherent,joint)
    m=candidate['arrays']['rgb-master'];p=SOURCE/m['file'];b=admit(p,m);before_arrays.append(b)
    assert master['rgb']=={k:b[k] for k in ('bytes','sha256')}
    rgb=np.load(p,mmap_mode='r',allow_pickle=False);assert rgb.dtype==np.uint8 and rgb.shape==(2048,2048,3)
    # Reuse this reviewer's previously independent NumPy formula, not production code.
    formula_path=Path(__file__).with_name('experience-sdss-global-transfer-independent-2026-10-02.py');admit(formula_path)
    spec=importlib.util.spec_from_file_location('independent_cached_lupton',formula_path)
    formula=importlib.util.module_from_spec(spec);spec.loader.exec_module(formula)
    recipe=master['transfer']['recipe'];assert recipe['kind']=='fixed' and recipe['stretch']==5 and recipe['Q']==8
    assert recipe['availableSciencePixels']==int(joint.sum()) and recipe['totalMasterPixels']==joint.size
    assert recipe['statisticalFit'] is None and recipe['requestedParameters']=={'stretch':5,'Q':8}
    changed=0;maximum=0
    for y in range(0,2048,128):
        expected=formula.manual_lupton(science,recipe['stretch'],recipe['Q'],y,y+128)
        delta=np.abs(expected.astype(np.int16)-rgb[y:y+128].astype(np.int16))
        changed+=int(np.any(delta,axis=2).sum());maximum=max(maximum,int(delta.max()))
    assert changed==maximum==0
    expected_receipts={tuple(v['identity'][k] for k in ['rerun','run','camcol','field','band']):v for band in 'gri' for v in candidate['science']['perBand'][band]['sourceReceipts']}
    actual_receipts=[];seen=set()
    for frame in master['sourceFrames']:
        ident=tuple(frame['identity'][k] for k in ['rerun','run','camcol','field','band']);assert ident not in seen;seen.add(ident)
        name='-'.join(str(v) for v in ident)+'.json';p=publication/'admission-receipts'/name;rb=admit(p,frame['admissionReceipt'])
        record=json.loads(p.read_bytes());assert record==expected_receipts[ident]
        assert record['identity']==frame['identity'];raw=record['source'];admit(Path(raw['path']),raw)
        for key in ('bytes','sha256','sourceUrl'):assert frame[key]==raw[key]
        header=record['wcs']['primaryHeaderFitsCards'];assert hashlib.sha256(header.encode('utf8')).hexdigest()==record['wcs']['primaryHeaderSha256']==frame['primaryHeaderSha256']
        assert record['scientificSamples']['unit']=='nanomaggies/pixel'
        assert record['scientificSamples']['calibrationAlreadyApplied'] and record['scientificSamples']['skyAlreadySubtracted']
        assert record['decompressed']['completeScientificArrays']
        actual_receipts.append({'identity':frame['identity'],'rawSource':{k:raw[k] for k in ('bytes','sha256')},'admissionReceipt':rb,'primaryHeaderSha256':frame['primaryHeaderSha256']})
    assert seen==set(expected_receipts) and len(seen)==18
    levels=[]
    for level,bounds,factor in [('OVERVIEW',[0,0,2048,2048],4),('MEDIUM',[512,512,1536,1536],2),('DETAIL',[768,768,1280,1280],1)]:
        a=manifest['levels'][level];original=candidate['levels'][level]
        p=publication/a['file'];admit(p,a);admit(SOURCE/original['file'],original)
        assert p.read_bytes()==(SOURCE/original['file']).read_bytes()
        assert a['format']=='png' and a['sampleAvailability']=='joint-area-alpha' and a['pixels']==512
        assert a['masterCrop']=={'boundsXYExclusive':bounds,'boxFactor':factor}
        assert a['masterRgbSha256']==master['rgb']['sha256'] and a['masterAvailabilitySha256']==master['jointAvailability']['sha256']
        assert a['fieldDegrees']==original['fieldDegrees'] and a['crpixFitsOneBased']==256.5
        with Image.open(p) as opened:
            opened.load();assert opened.mode=='RGBA' and opened.size==(512,512);rgba=np.asarray(opened)
        expected=formula.independent_box(rgb,joint,bounds,factor);assert np.array_equal(rgba,expected)
        assert np.all(rgba[:,:,3]==255)
        levels.append({'level':level,'file':bind(p),'decodedRgbaSha256':hashlib.sha256(rgba.tobytes()).hexdigest(),'pixelsSameIndependentBox':True,'pixelsSameR2':True,'bytesSameR2':True,'opaquePixels':int((rgba[:,:,3]==255).sum()),'validBlackPixels':int(((rgba[:,:,:3]==0).all(axis=2)&(rgba[:,:,3]==255)).sum())})
    # Bounded independent availability arithmetic: only these integer box factors
    # certify byte-255 means every supplied source pixel is available.
    partial=[]
    for factor in (1,2,4):
        known=np.ones((factor,factor),dtype=np.bool_);black=np.zeros((factor,factor,3),dtype=np.uint8)
        valid=formula.independent_box(black,known,[0,0,factor,factor],factor)
        assert list(valid[0,0])==[0,0,0,255]
        known[0,0]=False;missing=formula.independent_box(black,known,[0,0,factor,factor],factor)
        expected_alpha=int(np.rint((factor*factor-1)*255/(factor*factor)))
        assert int(missing[0,0,3])==expected_alpha<255
        # A deliberate brightness mask destroys the independently known black sample.
        assert int(black.max(axis=2).sum())==0 and np.count_nonzero(np.ones_like(known))==factor*factor
        partial.append({'factor':factor,'knownValidBlackRgba':valid[0,0].tolist(),'oneMissingRgba':missing[0,0].tolist(),'oneMissingCannotQuantizeComplete':True})
    # Exercise the real Python output boundary, separately from the independent
    # science/PNG oracle. These altered identities are controls, never sources.
    sys.path.insert(0,str(ROOT/'data-pipelines/deep-sky'))
    import publish_sdss_science as writer
    admit(ROOT/'data-pipelines/deep-sky/publish_sdss_science.py')
    output_controls=[]
    for case in ['object-reference-parent','receipt-rerun-parent']:
        case_output=output/('bounded-'+case);case_output.mkdir()
        verified=SimpleNamespace(candidate=copy.deepcopy(candidate),candidate_directory=SOURCE,
            master=SimpleNamespace(joint_available=joint),transfer=copy.deepcopy(recipe),
            sources=[copy.deepcopy(expected_receipts[tuple(f['identity'][k] for k in ['rerun','run','camcol','field','band'])]) for f in master['sourceFrames']],
            levels={level:((publication/a['file']).read_bytes(),candidate['levels'][level]) for level,a in manifest['levels'].items()})
        if case=='object-reference-parent':verified.candidate['objectRef']='../independent-escaped-image'
        else:verified.sources[0]['identity']['rerun']='../../independent-escaped-receipt'
        failure=''
        try:writer.publication_payload(verified,case_output,publication_id='independent-rejected-locator',legacy_source=manifest['source'])
        except RuntimeError as error:failure=str(error)
        assert failure=='sdss_science_candidate_path_invalid',(case,failure)
        escaped=list(output.glob('independent-escaped*'));assert not escaped,(case,escaped)
        output_controls.append({'case':case,'error':failure,'escapedOutputs':0,'retainedPartialFiles':[p.relative_to(output).as_posix() for p in sorted(case_output.rglob('*')) if p.is_file()]})
    after_arrays=[bind(ROOT/b['path']) for b in before_arrays];assert after_arrays==before_arrays
    before=list(checked.values());after=[bind(ROOT/b['path']) for b in before];assert after==before
    result={'status':'INDEPENDENT_SCIENCE_OPTICAL_ARRAY_READBACK_PASS','manifest':bind(publication/'manifest.json'),'publicationHash':manifest['publicationHash'],
            'trueSourceFrames':actual_receipts,'sourceReceipts':18,'fullJointAvailablePixels':int(joint.sum()),'scientificCounts':counts,
            'independentSharedFormula':{'changedPixels':changed,'maximumByteError':maximum},'levels':levels,'availabilityQuantizationControls':partial,'realWriterOutputContainmentControls':output_controls,
            'scientificArraysBeforeAfter':{'before':before_arrays,'after':after_arrays,'same':True},
            'limits':['Only frozen cached admitted arrays/receipt bytes; no new FITS scientific-reader run, WCS reprojection, PSF/artifact correction, source acquisition or GPU.',
                      'Independent current fixed5/Q8 formula and integer box decode verification are not source-quality/natural-color/absolute-astrometry, whole-sky coverage, runtime registration or target WEAPP acceptance. Actual all-full M51 does not itself exercise missing-source behavior; the small independent quantization controls declare that scope.']}
    save('result.json',result);save('binding.json',{'inputsBefore':before,'inputsAfter':after,'unchanged':True})
    print(json.dumps({'result':bind(output/'result.json'),'binding':bind(output/'binding.json'),'publicationHash':manifest['publicationHash'],'fullJointPixels':int(joint.sum()),'rgbDifferencePixels':changed,'levels':len(levels)}))
except Exception as error:
    save('failed.json',{'status':'FAILED_INDEPENDENT_ARRAY_REVIEW','error':repr(error),'inputs':list(checked.values())});raise
