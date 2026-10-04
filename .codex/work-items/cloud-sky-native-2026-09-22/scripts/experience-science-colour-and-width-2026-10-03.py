"""Bounded frozen-science/display diagnosis; no sky/colour/PSF correction.

Reuse the existing clean local diagnostic patch and four previously inspected
compact peaks. Widths are aperture-dependent residual moments, not fitted PSFs.
Sign reflection/permutation are estimator controls, never new sky measurements.
"""
from pathlib import Path
import hashlib
import importlib.util
import itertools
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode = True
sys.path[:0] = [str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),
                str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image, ImageDraw
import astropy
from astropy.visualization import ManualInterval, LuptonAsinhStretch, make_lupton_rgb
import sdss_gri_tan as owner

spec = importlib.util.spec_from_file_location('existing_local_diagnostic',
    TASK/'scripts/experience-sdss-local-overlap-diagnosis-2026-10-02.py')
local = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local)
bind, save, save_array = local.bound, local.save, local.save_array
OUT = ROOT/'output/science-colour-width-1003-r1'
assert not OUT.exists()
OUT.mkdir()
candidate_path = ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
overlap_path = ROOT/'output/sdss-local-overlap-diagnosis-1002-r1/result.json'
curated_path = ROOT/'output/hubble-m51-curated-registration-1002-r1/result.json'
quality_path = ROOT/'output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json'
publication_path = ROOT/'output/frozen-zscale-publication-1003-r1/manifest.json'
pins = [(candidate_path,'73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'),
        (overlap_path,'4611e2bf79b8e7bb3c31b0a022badcdff8d445c9ada3adaf9a3d36e25405bb6f'),
        (curated_path,'fdbd364dd867f9df92986ac5af59010cca339b15c45d4d0e20ccdf4bae5445cc'),
        (quality_path,'9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0'),
        (publication_path,'8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368')]
for path, pin in pins:
    assert bind(path)['sha256'] == pin
c, old, curated, quality, publication = [json.loads(path.read_bytes()) for path, _ in pins]
recipe = publication['master']['transfer']['recipe']
assert recipe['rgbBands'] == ['i','r','g'] and recipe['intervalMinimum'] == 0
patch_meta = next(p for pair in old['pairs'] for p in pair['backgroundPatches']
                  if p['targetColumnRow'] == [1968,2000])
assert patch_meta['entireRoiOutsideExpandedCatalogEllipse']
assert all(count == 0 for band in patch_meta['bands'].values()
           for field in ('301/3699/6/99','301/3699/6/100')
           for count in band[field]['flagCounts'].values())
paths = [Path(__file__),Path(local.__file__),Path(owner.__file__),
         ROOT/'data-pipelines/deep-sky/image_quality.py',
         Path(sys.modules['astropy.visualization.lupton_rgb'].__file__),
         *(p for p,_ in pins),
         *(ROOT/m['path'] for m in patch_meta['arrays'].values())]
science, flags = {}, {}
for band in owner.BANDS:
    meta = c['arrays'][band+'-science']; path = candidate_path.parent/meta['file']
    assert bind(path)['sha256'] == meta['sha256']; paths.append(path)
    science[band] = np.load(path,mmap_mode='r',allow_pickle=False)
    meta = quality['projectedFlagArrays'][band]; path = ROOT/meta['path']
    assert bind(path)['sha256'] == meta['sha256']; paths.append(path)
    flags[band] = np.load(path,mmap_mode='r',allow_pickle=False)
joint_path = candidate_path.parent/c['arrays']['joint-availability']['file']
assert bind(joint_path)['sha256'] == c['arrays']['joint-availability']['sha256']
joint = np.load(joint_path,mmap_mode='r',allow_pickle=False); paths.append(joint_path)
for level in owner.LEVELS:
    asset = publication['levels'][level]; path=publication_path.parent/asset['file']
    assert bind(path)['sha256'] == asset['sha256'];paths.append(path)
preserved=json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
for row in preserved:
    assert bind(ROOT/row['path'])['sha256'] == row['sha256']; paths.append(ROOT/row['path'])
before=[bind(p) for p in paths]
save(OUT/'inputs-before.json',before)
(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())

def display(bands):
    with np.errstate(invalid='ignore',divide='ignore'):
        return make_lupton_rgb(bands['i'],bands['r'],bands['g'],
            interval=ManualInterval(vmin=0,vmax=None),
            stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),
            output_dtype=np.uint8)

def display_stats(rgb):
    return {'meanRGB':rgb.mean(axis=(0,1)).tolist(),
            'nonblackPixels':int(np.any(rgb != 0,axis=2).sum()),
            'redDominantPixels':int(((rgb[:,:,0]>rgb[:,:,1]) & (rgb[:,:,0]>rgb[:,:,2])).sum()),
            'meanRedMinusBlue':float((rgb[:,:,0].astype(np.float64)-rgb[:,:,2]).mean()),
            'meaning':'Encoded display only; no photometric or natural-colour interpretation.'}

def plane_stats(values):
    return {'mean':float(values.mean(dtype=np.float64)),**local.stats(values)}

patch_arrays=np.load(ROOT/patch_meta['arrays']['science']['path'],allow_pickle=False)
patch_flags=np.load(ROOT/patch_meta['arrays']['flags']['path'],allow_pickle=False)
assert patch_arrays.shape == (6,33,33) and np.isfinite(patch_arrays).all() and not patch_flags.any()
background_records=[]; tiles=[]
for index,field in enumerate(('301/3699/6/99','301/3699/6/100')):
    bands={band:patch_arrays[2*at+index] for at,band in enumerate(owner.BANDS)}
    rgb=display(bands)
    reflected={band:-values for band,values in bands.items()}
    reverse_rgb=display(reflected)
    paired={band:np.concatenate([values,-values],axis=0) for band,values in bands.items()}
    assert all(np.array_equal(values[:33]+values[33:],np.zeros((33,33),np.float32)) for values in paired.values())
    paired_rgb=display(paired)
    assert np.array_equal(paired_rgb,np.concatenate([rgb,reverse_rgb],axis=0))
    assert any(paired_rgb.mean(axis=(0,1))>0), 'zero-mean signed control still has a display floor'
    permutations=[]
    source_channels=[bands['i'],bands['r'],bands['g']]
    for order in itertools.permutations(range(3)):
        control=display(dict(zip(('i','r','g'),[source_channels[at] for at in order])))
        # Only roundoff at an 8-bit boundary is tolerated; record exact error.
        error=int(np.abs(control.astype(np.int16)-rgb[:,:,order]).max())
        assert error<=1
        permutations.append({'sourceChannelOrder':list(order),'maxPermutationByteError':error,
                             'display':display_stats(control)})
    background_records.append({'field':field,'planeStatistics':{b:plane_stats(v) for b,v in bands.items()},
        'actualDisplay':display_stats(rgb),'signReflectedDisplay':display_stats(reverse_rgb),
        'zeroMeanSignPairedDisplay':display_stats(paired_rgb),'channelPermutationControls':permutations,
        'interpretation':'Sign pairing has exactly zero mean by construction; positive RGB and colour floor are display rectification, not a measured sky pedestal. This patch is not certified empty sky or a global noise model.'})
    tiles.append((field+' original / -original',rgb,reverse_rgb))

# Tie the diagnosis to actual new coarse publication bytes; no full reprocessing.
bounds=[1952,1984,1984,2016]
x0,y0,x1,y1=bounds
assert joint[y0:y1,x0:x1].all()
coarse_records=[]
for factor in (1,2,4):
    planes={b:science[b][y0:y1,x0:x1].reshape(32//factor,factor,32//factor,factor)
              .sum(axis=(1,3),dtype=np.float64).astype(np.float64)/(factor*factor) for b in owner.BANDS}
    planes={b:v.astype(np.float32) for b,v in planes.items()}
    rgb=display(planes)
    if factor==4:
        overview=np.asarray(Image.open(publication_path.parent/publication['levels']['OVERVIEW']['file']).convert('RGBA'))
        published=overview[y0//4:y1//4,x0//4:x1//4]
        assert np.array_equal(published[:,:,:3],rgb) and (published[:,:,3]==255).all()
    coarse_records.append({'factor':factor,'masterBoundsXYExclusive':bounds,
        'planeStatistics':{b:plane_stats(v) for b,v in planes.items()},'display':display_stats(rgb),
        'actualOverviewByteMatch':factor==4})
    Image.fromarray(rgb).resize((128,128),Image.Resampling.NEAREST).save(OUT/f'outer-factor-{factor}-diagnostic.png')

# Existing inspected compact-point identities only; no new catalogue claim.
star_records=[]
selected=[p for p in curated['proposals'] if p['id'] in ('foreground-1','foreground-2','foreground-3','foreground-5')]
assert len(selected)==4
yy,xx=np.mgrid[-16:17,-16:17]
core=xx*xx+yy*yy<=6**2
for point in selected:
    x,y=point['selectedHighestRPeak']['integerSdssPeakColumnRow']
    assert joint[y-16:y+17,x-16:x+17].all()
    bands={b:np.array(science[b][y-16:y+17,x-16:x+17]) for b in owner.BANDS}
    moments={b:{str(radius):local.centroid(values,radius) for radius in (4,6,8)} for b,values in bands.items()}
    assert all(value is not None for by_radius in moments.values() for value in by_radius.values())
    differences={str(radius):{b:(np.array(moments[b][str(radius)]['columnRow'])-
        np.array(moments['r'][str(radius)]['columnRow'])).tolist() for b in ('g','i')} for radius in (4,6,8)}
    actual_flags={b:{name:int(np.count_nonzero(flags[b][y-16:y+17,x-16:x+17][core]&(1<<bit)))
        for bit,name in enumerate(('INTERP','SATUR','NOTCHECKED','OBJECT','BRIGHTOBJECT','BINOBJECT','CATOBJECT','SUBTRACTED','GHOST','CR'))} for b in owner.BANDS}
    raw=save_array(OUT/(point['id']+'-gri-science.npy'),np.stack([bands[b] for b in owner.BANDS]))
    star_records.append({'id':point['id'],'integerColumnTopRow':[x,y],
        'identity':'Previously visually inspected compact SDSS counterpart; not a catalog-confirmed star',
        'science':raw,'coreFlags':actual_flags,'moments':moments,'bandMinusRCentroidsTargetPixels':differences,
        'meaning':'Annular diagnostic baseline and positive residual moment estimator only. Aperture-dependent radial RMS is neither measured FWHM, deconvolved shape nor physical PSF. No baseline/shift/gain applied to science.'})
    rgb=display(bands);Image.fromarray(rgb).resize((198,198),Image.Resampling.NEAREST).save(OUT/(point['id']+'-original-colour.png'))

# Boundary control ties useful faint signal to unchanged signed-science semantics.
control={b:np.full((8,8),.02,dtype=np.float32) for b in owner.BANDS}
weak=display(control);assert np.all(weak[:,:,0]==weak[:,:,1]) and np.all(weak[:,:,1]==weak[:,:,2]) and weak.max()>0
zero=display({b:np.zeros((8,8),dtype=np.float32) for b in owner.BANDS});assert not zero.any()
save(OUT/'weak-constant-control.json',{'inputNanomaggiesPerNativePixel':.02,'rgb':weak[0,0].tolist(),
    'unchangedZeroIsBlack':True,'meaning':'Analytic control, not measured recovery of all real weak structures.'})
sheet=Image.new('RGB',(560,260),'#101010');draw=ImageDraw.Draw(sheet)
for row,(label,a,b) in enumerate(tiles):
    draw.text((8,row*130+5),label,fill='white')
    sheet.paste(Image.fromarray(a).resize((99,99),Image.Resampling.NEAREST),(310,row*130+25))
    sheet.paste(Image.fromarray(b).resize((99,99),Image.Resampling.NEAREST),(420,row*130+25))
sheet.save(OUT/'real-and-sign-reflected-background.png')
after=[bind(p) for p in paths];assert after==before
save(OUT/'inputs-after.json',after)
result={'scope':'Cached actual source/coadd patches, frozen resolved display, actual new overview byte tie, current mature Astropy RGB and reused diagnostic moments. No source request, reproject/coadd/whole-master or LOD fit, source/display edit, new publication, correction or quality adoption.',
    'astropyVersion':astropy.__version__,'numpyVersion':np.__version__,'inputsExact':True,
    'sourcePatch':patch_meta,'recipe':recipe,'backgroundRecords':background_records,
    'coarsePatchRecords':coarse_records,'compactPeakRecords':star_records,
    'independentReview':'MISSING','limitations':['Only one previously clean diagnostic patch, not complete sky/noise confidence.',
        'Four compact peaks in field100 only; no cross-run/full-field/absolute astrometry or adopted PSF kernel.',
        'gri false-colour mapping is not natural visual colour; red galaxy light and noise floor must not be conflated.',
        'No denoising or colour gains authorized by this diagnostic; real weak-feature completeness remains unverified.']}
save(OUT/'result.json',result)
print(json.dumps(bind(OUT/'result.json')))
