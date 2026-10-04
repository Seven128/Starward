"""Reject unqualified second background subtraction on cached calibrated data.

Diagnostics only: no corrected image, source rewrite, source request or adoption.
"""
from pathlib import Path
import hashlib
import json
import sys
ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
import astropy
import astropy.stats.sigma_clipping as sigma_owner
from astropy.stats import sigma_clipped_stats

SOURCE = ROOT / 'output/sdss-m51-gri-mosaic-candidate-1002-r2'
OUT = ROOT / 'output/background-qualification-1003-r1'
def bind(p):
    h = hashlib.sha256()
    with p.open('rb') as stream:
        while block := stream.read(1024 * 1024): h.update(block)
    return {'path': str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p),
            'bytes': p.stat().st_size, 'sha256': h.hexdigest()}
candidate_file = SOURCE / 'candidate.json'
assert bind(candidate_file)['sha256'] == '73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
candidate = json.loads(candidate_file.read_bytes())
names = ['joint-availability'] + [f'{band}-science' for band in ('g','r','i')]
protection = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'
protected = json.loads(protection.read_bytes())
paths = [Path(__file__), candidate_file, protection, Path(np.__file__), Path(sigma_owner.__file__)]
paths += [SOURCE / candidate['arrays'][name]['file'] for name in names]
paths += [ROOT / row['path'] for row in protected]
before = [bind(p) for p in paths]
for row in protected: assert bind(ROOT / row['path'])['sha256'] == row['sha256']
arrays = {}
for name in names:
    meta = candidate['arrays'][name]; p = SOURCE / meta['file']; bound = bind(p)
    assert (bound['bytes'],bound['sha256']) == (meta['bytes'],meta['sha256'])
    arrays[name] = np.load(p, mmap_mode='r', allow_pickle=False)
    assert list(arrays[name].shape) == meta['shape'] and arrays[name].dtype.str == meta['dtype']
joint = arrays['joint-availability']
assert joint.dtype == np.bool_ and joint.shape == (2048,2048) and joint.all()
OUT.mkdir()
(OUT / 'inputs-before.json').write_text(json.dumps(before,indent=2)+'\n')
(OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
records=[]
for band in ('g','r','i'):
    original = arrays[f'{band}-science']; values = original[joint]
    assert np.isfinite(values).all()
    mean, median, std = map(float,sigma_clipped_stats(values,sigma=3,maxiters=5,
        cenfunc='median',stdfunc='std'))
    # Deliberately inadmissible interpretation: the median is NOT a sky model.
    would_cross_zero = (values > 0) & (values <= median)
    records.append({'band':band,'unit':'nanomaggies/pixel','skyAlreadySubtracted':True,
      'qualifiedSkySamples':'NOT_IDENTIFIED','samples':int(values.size),
      'sigmaClipDiagnostic':{'mean':mean,'median':median,'std':std,'sigma':3,'maxiters':5,
        'sourceMask':'NONE; not a valid sky estimate','coverage':'actual coherent science only'},
      'counterfactualSecondMedianSubtraction':{'positiveMeasurementsMadeNonpositive':int(would_cross_zero.sum()),
        'positiveFluxRemovedAtThoseSamples':float(values[would_cross_zero].astype(np.float64).sum()),
        'meaning':'Numerical risk only; positive samples may contain source flux/noise. No claim all are real faint structures; no subtraction is performed or accepted.'},
      'rawNegativeMeasurements':int((values<0).sum())})
assert any(row['counterfactualSecondMedianSubtraction']['positiveMeasurementsMadeNonpositive'] > 0 for row in records)
after=[bind(p) for p in paths]; assert after == before
(OUT / 'inputs-after.json').write_text(json.dumps(after,indent=2)+'\n')
result={'status':'UNQUALIFIED_BACKGROUND_RECIPE_REJECTED_NOT_IMAGE_QUALITY_PASS',
 'networkRequests':0,'inputsBeforeAfterExact':True,'library':{'astropy':astropy.__version__,
 'numpy':np.__version__,'method':'astropy.stats.sigma_clipped_stats'},'records':records,
 'decision':'Do not reinterpret a robust image statistic as sky or a brightness mask. Existing SDSS calibration remains unchanged. HST EXP contribution qualification supplies no source-free sky regions; sparse strips cannot justify a background model.',
 'scope':'Cached complete SDSS master counterexample, not a new HST sky estimate/adapter, corrected image, RGB/LOD/export, noise/PSF model or source quality/adoption certification.'}
(OUT / 'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'result':bind(OUT / 'result.json'),'records':records}))
