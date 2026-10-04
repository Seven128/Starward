"""Bounded independent risk/readback review of the shared transfer owner."""
from pathlib import Path
import hashlib
import importlib.util
import json
import sys
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT/'output/allwise-w3-atlas-0929/python-deps'), str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image
import sdss_gri_tan as owner

def bind(path):
    raw = path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(), 'bytes':len(raw), 'sha256':hashlib.sha256(raw).hexdigest()}

def verify(item):
    actual=bind(ROOT/item['path'])
    assert actual=={key:item[key] for key in ('path','bytes','sha256')}, item['path']
    return actual

def bands(data, joint):
    return {band:owner.ProjectedBand((data*scale).astype(np.float32),joint,joint,{}) for band,scale in zip('gri',(1,2,3))}

def rejected(values,joint,config,expected):
    try:
        owner.make_rgb_display(values,joint,transfer=config)
    except RuntimeError as error:
        assert str(error)==expected, (str(error),expected)
        return str(error)
    raise AssertionError('unexpected transfer acceptance')

def main():
    output=ROOT/'output/sdss-m51-shared-transfer-independent-1002-r1'
    output.mkdir(exist_ok=False)
    actual=ROOT/'output/sdss-m51-shared-transfer-1002'
    receipt=json.loads((actual/'binding.json').read_bytes())
    report=json.loads((actual/'result.json').read_bytes())
    checked={}
    for item in [receipt['script'],*receipt['sourceBefore'],*receipt['sourceAfter'],*receipt['inputs'],*receipt['outputs'],*report['frozenMosaicAfter'],*report['frozenTransferAfter']]:
        if item['path'] not in checked:
            checked[item['path']]=verify(item)
    assert report['sharedOwnerBefore']==report['sharedOwnerAfter']==receipt['sourceBefore']==receipt['sourceAfter']
    assert report['frozenMosaicBefore']==report['frozenMosaicAfter'] and report['frozenTransferBefore']==report['frozenTransferAfter']
    spec=importlib.util.spec_from_file_location('independent_formula',Path(__file__).with_name('experience-sdss-global-transfer-independent-2026-10-02.py'))
    formula=importlib.util.module_from_spec(spec);spec.loader.exec_module(formula)
    source=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
    science={band:np.load(source/f'{band}-science.npy',mmap_mode='r',allow_pickle=False) for band in 'gri'}
    joint=np.load(source/'joint-availability.npy',mmap_mode='r',allow_pickle=False)
    variants={}
    for name, variant in report['variants'].items():
        master=np.load(ROOT/variant['rgbMaster']['path'],mmap_mode='r',allow_pickle=False)
        recipe=variant['transfer']
        mismatches=0
        for start in range(0,2048,128):
            expected=formula.manual_lupton(science,recipe['stretch'],recipe['Q'],start,start+128)
            mismatches+=int(np.count_nonzero(expected!=master[start:start+128]))
        assert mismatches==0
        quality=json.loads((actual/name/'quality.json').read_bytes())
        assert quality['transfer']==recipe
        for item in quality['reports']:
            assert item['processing']['transfer']==recipe
        for level, metadata in variant['levels'].items():
            rgba=np.asarray(Image.open(ROOT/metadata['actualFile']['path']).convert('RGBA'))
            expected=formula.independent_box(master,joint,metadata['masterCrop']['boundsXYExclusive'],metadata['masterCrop']['boxFactor'])
            assert np.array_equal(expected,rgba)
            assert (ROOT/metadata['actualFile']['path']).read_bytes()==(ROOT/'output/sdss-m51-global-transfer-1002'/name/f'{level.lower()}.png').read_bytes()
        variants[name]={'masterChannelMismatches':mismatches,'allThreeLevelRgbaAndFrozenTrialBytesEqual':True,'qualityUsesActualRecipe':True}
    data=np.linspace(-3,12,64*64,dtype=np.float32).reshape(64,64);data[30,30]=0
    partial=np.zeros(data.shape,dtype=np.bool_);partial[24:40,24:40]=True
    values=bands(data,partial)
    before={band:value.data.copy() for band,value in values.items()}
    rgb,recipe=owner.make_rgb_display(values,partial,transfer=owner.WholeMasterZscaleTransfer())
    intensity=sum(before[band].astype(np.float64) for band in 'gri')/3
    eligible=intensity[partial]
    fit=recipe['statisticalFit']
    assert fit['finiteIntensitySamples']==256 and fit['excludedIncoherentPixels']==3840
    assert fit['zeroIntensitySamples']==1 and fit['negativeIntensitySamples']==int((eligible<0).sum())
    assert fit['sampleFloat64Sha256']==hashlib.sha256(eligible.astype('<f8').tobytes()).hexdigest()
    for band in 'gri':
        assert np.array_equal(before[band],values[band].data)
        values[band].data[~partial]=np.nan
    nan_rgb,nan_recipe=owner.make_rgb_display(values,partial,transfer=owner.WholeMasterZscaleTransfer())
    assert np.array_equal(rgb,nan_rgb) and recipe==nan_recipe and not rgb[~partial].any()
    # Real bounded mutation of the owner: zero-fill statistical inputs instead
    # of excluding incoherent support. The same boundary no longer reproduces
    # the eligible recipe/usable global transfer, rather than a no-effect test.
    mutated=Path(output/'zero-filled-statistical-owner.py')
    original=(ROOT/'data-pipelines/deep-sky/sdss_gri_tan.py').read_text(encoding='utf-8')
    needle='intensity[~joint] = np.nan'
    assert original.count(needle)==1
    mutated.write_text(original.replace(needle,'intensity[~joint] = 0'),encoding='utf-8')
    spec=importlib.util.spec_from_file_location('mutated_transfer',mutated)
    changed=importlib.util.module_from_spec(spec);sys.modules[spec.name]=changed;spec.loader.exec_module(changed)
    mutated_detected=False
    try:
        bad_rgb,bad_recipe=changed.make_rgb_display(values,partial,transfer=changed.WholeMasterZscaleTransfer())
        mutated_detected=bad_recipe['stretch']!=recipe['stretch'] or not np.array_equal(rgb,bad_rgb)
    except RuntimeError:
        mutated_detected=True
    assert mutated_detected
    failures=[]
    for value in (0,-1,True,False,float('nan'),float('inf'),-float('inf'),1e11):
        for kind in (owner.FixedDisplayTransfer,owner.WholeMasterZscaleTransfer):
            failures.append(rejected(values,partial,kind(Q=value),'sdss_display_transfer_invalid'))
    for value in (0,-1,True,float('nan'),float('inf')):
        failures.append(rejected(values,partial,owner.FixedDisplayTransfer(stretch=value),'sdss_display_transfer_invalid'))
    _,tiny=owner.make_rgb_display(values,partial,transfer=owner.FixedDisplayTransfer(Q=1e-20))
    assert tiny['Q']==.1 and tiny['requestedParameters']['Q']==1e-20
    empty=np.zeros_like(partial)
    failures.append(rejected(values,empty,owner.WholeMasterZscaleTransfer(),'sdss_display_coherent_unavailable'))
    constant=bands(np.zeros(data.shape,dtype=np.float32),partial)
    black,black_recipe=owner.make_rgb_display(constant,partial)
    assert not black.any() and black_recipe['availableSciencePixels']==256
    failures.append(rejected(constant,partial,owner.WholeMasterZscaleTransfer(),'sdss_display_zscale_degenerate'))
    values['g'].data[30,30]=np.nan
    failures.append(rejected(values,partial,owner.FixedDisplayTransfer(),'sdss_display_coherent_nonfinite'))
    # Pyramid owner is not allowed to re-enter the display/fit helper.
    candidate=json.loads((source/'candidate.json').read_bytes())
    from astropy.wcs import WCS
    master=owner.GriMaster(WCS(candidate['wcsHeader']),{},joint,np.load(actual/'global-zscale-q8/rgb-master.npy'),{'fieldDegrees':candidate['fieldDegrees']})
    with patch.object(owner,'make_rgb_display',side_effect=AssertionError('crop refit')):
        pyramid=owner.pyramid(master,{'center':candidate['center']})
    assert len(pyramid)==3
    result={'script':bind(Path(__file__)),'actualResult':bind(actual/'result.json'),'actualBinding':bind(actual/'binding.json'),'reviewedOwner':verify(receipt['sourceBefore'][0]),'checkedBindings':list(checked.values()),'variants':variants,'partial':{'knownZeroIncluded':True,'negativeIncluded':True,'unknownOutsideNotFit':True,'sciencePreserved':True,'zeroFilledOwnerMutationDetected':mutated_detected,'mutation':bind(mutated)},'invalidOrDegenerateExplicitRejections':len(failures),'effectiveTinyQActualRecipe':tiny,'pyramidCannotRefit':True,'scope':'bounded processing contract/readback only; not source/PSF/natural color/adoption/publication/native acceptance'}
    (output/'review.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'review':bind(output/'review.json'),'owner':result['reviewedOwner'],'variants':variants,'boundedMutationDetected':mutated_detected,'scope':result['scope']}))

if __name__=='__main__':main()
