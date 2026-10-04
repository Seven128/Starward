"""Diagnose cached science/weight metadata conflicts without network or arrays."""
from pathlib import Path
import hashlib
import json
import re
import sys
import warnings

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
from astropy.coordinates import SkyCoord
import astropy.units as u

PRIOR = ROOT / 'output/m51-science-headers-1003-r1'
OUT = (ROOT / sys.argv[1]).resolve()
assert OUT.parent == ROOT / 'output' and OUT.name.startswith('m51-science-headers-')
PROTECTION = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'

def bind(p):
    raw = p.read_bytes()
    return {'path': str(p), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

receipts = json.loads((PRIOR / 'records.json').read_bytes())
protected = json.loads(PROTECTION.read_bytes())
paths = [Path(__file__), PRIOR / 'records.json', PROTECTION, Path(sys.executable), Path(fits.__file__), Path(np.__file__)]
paths += [Path(row['headerArtifact']['path']) for row in receipts]
paths += [ROOT / row['path'] for row in protected]
before = [bind(p) for p in paths]
for row in receipts: assert bind(Path(row['headerArtifact']['path'])) == row['headerArtifact']
for row in protected: assert bind(ROOT / row['path'])['sha256'] == row['sha256']
OUT.mkdir()
(OUT / 'inputs-before.json').write_text(json.dumps(before, indent=2) + '\n')
(OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
samples = np.array([[0, 0], [8599, 0], [8599, 12199], [0, 12199], [4299.5, 6099.5]])
rows = []
models = {}
for receipt in receipts:
    path = Path(receipt['headerArtifact']['path'])
    header = fits.Header.fromstring(path.read_bytes().decode('ascii'))
    sip_keys = [key for key in header if re.fullmatch(r'(A|B|AP|BP)_(ORDER|\d+_\d+)', key)]
    no_sip = header.copy()
    for key in sip_keys: del no_sip[key]
    with warnings.catch_warnings(record=True) as captured:
        warnings.simplefilter('always')
        original = WCS(header).celestial
        tan = WCS(no_sip).celestial
    world = tan.all_pix2world(samples, 0)
    assert np.all(np.isfinite(world))
    uncorrected_world = original.all_pix2world(samples, 0)
    differences = SkyCoord(world[:, 0] * u.deg, world[:, 1] * u.deg).separation(
        SkyCoord(uncorrected_world[:, 0] * u.deg, uncorrected_world[:, 1] * u.deg)).arcsec
    assert np.all(np.isfinite(differences))
    name = path.name.removesuffix('.header')
    models[name] = tan
    fields = ['BUNIT', 'FILETYPE', 'FILTER1', 'FILTER2', 'EXPTIME', 'CTYPE1', 'CTYPE2', 'CRPIX1', 'CRPIX2',
              'CRVAL1', 'CRVAL2', 'CD1_1', 'CD1_2', 'CD2_1', 'CD2_2', 'D001OUUN', 'D001INUN', 'D001WTSC',
              'D001FVAL', 'SKYSUB', 'MDRIZSKY', 'SKYSUM']
    row = {'file': name, 'header': {key: header[key] for key in fields if key in header},
           'dimensions': [header['NAXIS1'], header['NAXIS2']], 'sipKeys': sip_keys,
           'sipSuffixPresent': any('-SIP' in header[key] for key in ('CTYPE1', 'CTYPE2')),
           'naiveSipVersusTanSampleSeparationArcsec': differences.tolist(),
           'tanOnlySampleRaDecDeg': world.tolist(),
           'pixelScaleArcsec': (np.linalg.norm(tan.pixel_scale_matrix, axis=0) * 3600).tolist(),
           'warnings': [str(warning.message) for warning in captured],
           'processing': {suffix: sorted(set(header[key] for key in header if re.fullmatch(r'D\d{3}' + suffix, key)))
                          for suffix in ('OUUN', 'INUN', 'WTSC', 'FVAL', 'OUDA', 'OUWE')}}
    rows.append(row)

baseline = models['h_m51_b_s05_drz_sci.fits']
baseline_world = baseline.all_pix2world(samples, 0)
baseline_sky = SkyCoord(baseline_world[:, 0] * u.deg, baseline_world[:, 1] * u.deg)
for row in rows:
    model = models[row['file']]
    world = model.all_pix2world(samples, 0)
    row['samePixelSkySeparationFromBScienceArcsec'] = baseline_sky.separation(SkyCoord(world[:, 0] * u.deg, world[:, 1] * u.deg)).arcsec.tolist()
    row['bScienceSkyInThisHeaderPixelOffset'] = (model.all_world2pix(baseline_world, 0) - samples).tolist()
after = [bind(p) for p in paths]
assert before == after
(OUT / 'inputs-after.json').write_text(json.dumps(after, indent=2) + '\n')
result = {'status': 'METADATA_CONFLICTS_MEASURED_NO_SOURCE_ADOPTION', 'inputsBeforeAfterExact': True,
          'completeHeaders': 6, 'records': rows, 'pixelSamples': samples.tolist(), 'pixelOrigin': 0,
          'sourceBytesForSixFullFiles': sum(row['sourceTotalBytes'] for row in receipts),
          'additionalHeaderPayloadReadBytes': sum(row['bodyBytesRead'] for row in receipts),
          'completeArrayDownloads': 0, 'arrayDecodes': 0, 'networkRequestsThisAnalysis': 0,
          'meaning': 'SIP removal is an in-memory diagnostic for distortion-corrected drizzled data, not an adopted correction. Discrepant weight headers may be inherited; do not independently resample weights by that WCS or assume array alignment without empirical evidence. Header positions do not establish empirical registration or absolute accuracy. BUNIT alone conflicts with documented output cps; EXP weighting is not an inverse-variance or binary validity contract. Source arrays, complete hashes, masks, background, RGB recipe, rights and cost admission remain separate.'}
(OUT / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'result': bind(OUT / 'result.json'), 'summary': [{'file': row['file'], 'maxSipDifferenceArcsec': max(row['naiveSipVersusTanSampleSeparationArcsec']), 'maxOffsetFromBArcsec': max(row['samePixelSkySeparationFromBScienceArcsec'])} for row in rows]}))
