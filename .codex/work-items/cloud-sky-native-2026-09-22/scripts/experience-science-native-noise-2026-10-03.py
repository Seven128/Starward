"""One existing flag-clean patch, actual native noise and resampling correlation.

No new source requests, coadd/reprojection matrix, display edit or publication.
Block variance is conditional on diagonal native noise, never a coadd weight.
"""
from dataclasses import asdict
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode = True
sys.path[:0] = [str(ROOT/'output/allwise-w3-atlas-0929/python-deps'), str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from sdss_corrected_frame import read_cached_frame, MODEL_URL
from sdss_frame_noise import read_cached_field_noise, native_noise_samples
from sdss_source_stencil import source_pixel_stencil, bilinear_source_samples
from sdss_gri_tan import target_tan

spec = importlib.util.spec_from_file_location('existing_local_diagnostic',
    TASK/'scripts/experience-sdss-local-overlap-diagnosis-2026-10-02.py')
local = importlib.util.module_from_spec(spec); spec.loader.exec_module(local)
bound, save, save_array, stats = local.bound, local.save, local.save_array, local.stats
OUT = ROOT/'output/science-native-noise-1003-r1'
assert OUT.is_dir() and {p.name for p in OUT.iterdir()} == {'frame-model.html'}
html = (OUT/'frame-model.html').read_text(encoding='utf-8')
assert 'dn= img/cimg+simg' in html and 'dn_err= sqrt(dn/gain+darkVariance)' in html
candidate_path = ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
old_path = ROOT/'output/sdss-local-overlap-diagnosis-1002-r1/result.json'
field_dir = ROOT/'output/sdss-m51-field-quality-1002-r3'
assert bound(candidate_path)['sha256'] == '73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
assert bound(old_path)['sha256'] == '4611e2bf79b8e7bb3c31b0a022badcdff8d445c9ada3adaf9a3d36e25405bb6f'
c, old = json.loads(candidate_path.read_bytes()), json.loads(old_path.read_bytes())
meta = next(p for pair in old['pairs'] for p in pair['backgroundPatches'] if p['targetColumnRow']==[1968,2000])
assert meta['entireRoiOutsideExpandedCatalogEllipse']
assert all(v == 0 for byfield in meta['bands'].values() for field in ('301/3699/6/99','301/3699/6/100') for v in byfield[field]['flagCounts'].values())
paths = [Path(__file__), Path(local.__file__), candidate_path, old_path,
    *(ROOT/'data-pipelines/deep-sky'/name for name in ('sdss_frame_noise.py','sdss_corrected_frame.py','sdss_source_stencil.py','sdss_gri_tan.py','image_quality.py')),
    *(field_dir/name for name in ('receipt.json','response.csv','field-quality.json')),
    *(ROOT/v['path'] for v in meta['arrays'].values())]
for value in meta['arrays'].values():
    assert bound(ROOT/value['path'])['sha256'] == value['sha256']
cached = np.load(ROOT/meta['arrays']['science']['path'],allow_pickle=False)
assert cached.shape == (6,33,33)
assert not np.load(ROOT/meta['arrays']['flags']['path'],allow_pickle=False).any()
fields = [next(f for f in c['mosaic']['fields'] if f['fieldKey']==key) for key in ('301/3699/6/99','301/3699/6/100')]
for field in fields:
    for band in 'gri':
        source = field['perBand'][band]['sourceReceipt']['source']
        path = Path(source['path']); assert bound(path)['sha256']==source['sha256']; paths.append(path)
preserved = json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
for row in preserved:
    assert bound(ROOT/row['path'])['sha256']==row['sha256']; paths.append(ROOT/row['path'])
before = [bound(p) for p in paths]; save(OUT/'inputs-before.json',before)
(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
receipt = json.loads((field_dir/'receipt.json').read_bytes())
target = target_tan(c['center'],c['pixels'],c['fieldDegrees'])
yy,xx = np.mgrid[1984:2017,1952:1985]
ra,dec = target.all_pix2world(xx,c['pixels']-1-yy,0)
records, diagonals = [], {}
for index,field in enumerate(fields):
    for at,band in enumerate('gri'):
        old_receipt = field['perBand'][band]['sourceReceipt']; source = old_receipt['source']
        frame = read_cached_frame(Path(source['path']), old_receipt['identity'] | {k:source[k] for k in ('bytes','sha256','sourceUrl')}, max_uncompressed_bytes=32*1024*1024)
        # Metadata retention must not silently rewrite the old persisted contract.
        assert frame.receipt == old_receipt
        camera = read_cached_field_noise(field_dir/'response.csv', receipt, frame.receipt['identity'])
        sx,sy = frame.wcs.all_world2pix(ra,dec,0)
        projected,footprint,finite = bilinear_source_samples(frame.data,sx,sy)
        assert footprint.all() and finite.all() and np.array_equal(projected,cached[2*at+index])
        stencil = source_pixel_stencil(frame.data.shape,sx,sy)
        x0,y0 = stencil.x0.reshape(33,33),stencil.y0.reshape(33,33)
        nx = np.stack([x0,x0+1,x0,x0+1]); ny=np.stack([y0,y0,y0+1,y0+1])
        dx,dy=sx-x0,sy-y0
        weights=np.stack([(1-dx)*(1-dy),dx*(1-dy),(1-dx)*dy,dx*dy])
        noise=native_noise_samples(frame,camera,nx,ny)
        assert noise.available.all()
        predicted=(noise.variance_nmgy_squared*weights**2).sum(axis=0)
        wrong_linear=(noise.variance_nmgy_squared*weights).sum(axis=0)
        assert np.all(wrong_linear>=predicted) and np.any(wrong_linear>predicted*1.1)
        native_ids=ny*frame.data.shape[1]+nx
        ids,first=np.unique(native_ids.ravel(),return_index=True)
        unique_variance=noise.variance_nmgy_squared.ravel()[first]
        native_values=frame.data.ravel()[ids].astype(np.float64)
        block_ratios=[]; block_results=[]
        for by in range(0,32,4):
            for bx in range(0,32,4):
                block_ids=native_ids[:,by:by+4,bx:bx+4].ravel()
                block_coeff=weights[:,by:by+4,bx:bx+4].ravel()/16
                shared,inverse=np.unique(block_ids,return_inverse=True)
                coefficients=np.bincount(inverse,weights=block_coeff)
                variance=unique_variance[np.searchsorted(ids,shared)]
                full=float(np.dot(coefficients**2,variance))
                diagonal=float(predicted[by:by+4,bx:bx+4].sum()/16**2)
                assert full>=diagonal and full>0
                block_ratios.append(full/diagonal)
                block_results.append({'targetPatchTopLeftXY':[bx,by],'nativePixels':len(shared),
                    'conditionalMeanVariance':full,'incorrectIndependentTargetMeanVariance':diagonal})
        edge=native_noise_samples(frame,camera,np.array([0,64,-1,2048]),np.array([700]*4))
        assert edge.available.tolist()==[False,True,False,False]
        key=field['fieldKey']+'/'+band; diagonals[key]=predicted
        arrays={'nativeIDs':save_array(OUT/f'{index}-{band}-native-ids.npy',ids),
            'nativeVariance':save_array(OUT/f'{index}-{band}-native-variance.npy',unique_variance),
            'singleFrameTargetVariance':save_array(OUT/f'{index}-{band}-target-variance.npy',predicted)}
        records.append({'field':field['fieldKey'],'band':band,'camera':asdict(camera),
            'targetBoundsXYExclusive':[1952,1984,1985,2017],'cachedPatchByteExact':True,
            'nativePixels':len(ids),'retainedCalibrationSkyBytes':sum(v.nbytes for v in vars(frame.calibration_sky).values()),
            'nativeNoiseSigma':stats(np.sqrt(unique_variance)), 'nativeScienceScatter':stats(native_values),
            'singleFrameTargetSigma':stats(np.sqrt(predicted)),
            'actualProjectedScienceScatter':stats(projected),
            'linearVarianceMutationRatio':stats(wrong_linear/predicted),
            'independentTargetBlockMutationRatio':stats(np.array(block_ratios)),
            'conditionalBlockCalculations':block_results,'arrays':arrays,
            'edgeControlAvailable':edge.available.tolist(),
            'meaning':'Actual official native variance model and algebraic resampling correlation only. Native scatter may include faint structure; not a calibrated confidence/sky, full-field/coadd variance or quality pass.'})
        print('measured',key,'native',len(ids),'sigma',records[-1]['nativeNoiseSigma']['median'],
              'blockRatio',np.median(block_ratios),flush=True)
        del frame
pair=[]
for at,band in enumerate('gri'):
    a,b=cached[2*at],cached[2*at+1]
    pair.append({'band':band,'sameRun':True,'projectedPearsonCorrelation':float(np.corrcoef(a.ravel(),b.ravel())[0,1]),
        'differenceScatter':stats(a.astype(np.float64)-b),'sourceScatter99':stats(a),'sourceScatter100':stats(b),
        'interpretation':'Same-run overlapping reductions; their high local correlation cannot be counted as two independent exposures or justify sqrt(2) noise reduction.'})
assert [bound(p) for p in paths]==before
save(OUT/'inputs-after.json',[bound(p) for p in paths])
report={'scope':__doc__,'officialFrameModel':bound(OUT/'frame-model.html') | {'url':MODEL_URL,'acquisition':'curl HTTPS exit 0, document only; no new scientific data'},
    'inputBindingsUnchanged':True,'sourceRequests':0,'oldFrameReceiptsExact':True,
    'records':records,'sameRunPair':pair,
    'decisions':['Native noise can be supplied from the actual frame metadata and exact cached Field camera row.',
        'Linear interpolation of variance is wrong; squared coefficients reduce a single interpolated-pixel variance.',
        'Treating adjacent target pixels as independent then underestimates a mean because they reuse source pixels.',
        'Do not use same-run overlaps as independent exposures or write inverse-variance coadd weights.',
        'No image/display/recipe/publication/default change; noise-aware display design still requires real weak-structure/colour evidence.'],
    'independentReview':'MISSING','qualityAcceptance':'UNVERIFIED','nativeRuntimeAcceptance':'UNVERIFIED'}
save(OUT/'result.json',report)
print(json.dumps({'result':bound(OUT/'result.json'),'records':len(records),'sourceRequests':0,'bindingsUnchanged':True}))
