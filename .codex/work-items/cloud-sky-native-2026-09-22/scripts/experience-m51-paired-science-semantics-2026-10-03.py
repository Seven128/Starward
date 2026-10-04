"""Offline paired-input semantics pilot, not complete FITS admission or RGB."""
from pathlib import Path
import hashlib
import json
import re
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
sys.path.insert(0, str(ROOT / 'data-pipelines/deep-sky'))
from astropy.io import fits
from astropy.wcs import WCS
from astropy.wcs.utils import wcs_to_celestial_frame
from astropy.coordinates import SkyCoord
import astropy.units as u
import sdss_source_stencil as stencil_owner

STRIPS = ROOT / 'output/m51-science-strips-1003-r2/result.json'
HEADS = ROOT / 'output/m51-science-headers-1003-r1/records.json'
PROTECTION = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'
OUT = (ROOT / sys.argv[1]).resolve()
assert OUT.parent == ROOT / 'output' and OUT.name.startswith('m51-paired-science-')

def bind(p):
    raw = p.read_bytes()
    return {'path': str(p), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

assert bind(STRIPS)['sha256'] == '3f99e67d8819a138f128a1ba76e6c78a2b57618ab832a44a909e8cc22c4bb744'
samples = json.loads(STRIPS.read_bytes())
heads = json.loads(HEADS.read_bytes())
protected = json.loads(PROTECTION.read_bytes())
paths = [Path(__file__), STRIPS, HEADS, PROTECTION, Path(sys.executable), Path(np.__file__),
         Path(fits.__file__), Path(stencil_owner.__file__)]
paths += [Path(row['headerArtifact']['path']) for row in heads]
paths += [Path(row['artifact']['path']) for row in samples['receipts']]
paths += [ROOT / row['path'] for row in protected]
before = [bind(p) for p in paths]
for row in heads: assert bind(Path(row['headerArtifact']['path'])) == row['headerArtifact']
for row in samples['receipts']: assert bind(Path(row['artifact']['path'])) == row['artifact']
for row in protected: assert bind(ROOT / row['path'])['sha256'] == row['sha256']
OUT.mkdir()
(OUT / 'inputs-before.json').write_text(json.dumps(before, indent=2) + '\n')
(OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
header_by_name = {Path(row['headerArtifact']['path']).name.removesuffix('.header'):
                  fits.Header.fromstring(Path(row['headerArtifact']['path']).read_bytes().decode('ascii')) for row in heads}
sample_by_key = {(row['source'], row['sampleStartRowZeroBased']): row for row in samples['receipts']}

def processing(header):
    return {key: header[key] for key in header if re.fullmatch(r'D\d{3}\w{4}', key)}

def paired_metadata(science, weight, band):
    """Pair by full recorded drizzle outputs; never by the stale weight WCS."""
    for header in (science, weight):
        assert header['SIMPLE'] is True and header['BITPIX'] == -32 and header['NAXIS'] == 2
        assert (header['NAXIS1'], header['NAXIS2']) == (8600, 12200)
        assert header.get('BSCALE', 1) == 1 and header.get('BZERO', 0) == 0 and 'BLANK' not in header
        assert header.get('NEXTEND', 0) == 0
    left, right = processing(science), processing(weight)
    assert left == right and len(left) == 1152, 'DRIZZLE_PAIR_PROVENANCE_MISMATCH'
    ids = sorted({key[1:4] for key in left})
    assert ids == [f'{index:03}' for index in range(1, 49)]
    for record in ids:
        prefix = 'D' + record
        assert left[prefix + 'OUDA'] == f'h_m51_{band}_s05_drz_sci.fits'
        assert left[prefix + 'OUWE'] == f'h_m51_{band}_s05_drz_weight.fits'
        assert left[prefix + 'OUUN'] == 'cps' and left[prefix + 'INUN'] == 'counts'
        assert left[prefix + 'FVAL'] == 'INDEF' and left[prefix + 'KERN'] == 'gaussian'
        assert left[prefix + 'OUXC'] == 4300.5 and left[prefix + 'OUYC'] == 6100.5
        assert left[prefix + 'DEXP'] == left[prefix + 'WTSC'] > 0
    assert science['MDRIZSKY'] == 0 and science['SKYSUM'] == 0
    return left

def accepted_weight_stencil(weight, x, y):
    """Accepted contribution qualification, not confidence or display alpha."""
    st = stencil_owner.source_pixel_stencil(weight.shape, x, y)
    positive = np.zeros(x.shape, dtype=np.bool_)
    x0, y0 = st.x0, st.y0
    neighbors = np.stack([weight[y0, x0], weight[y0, x0 + 1], weight[y0 + 1, x0], weight[y0 + 1, x0 + 1]])
    positive[st.geometry] = (np.isfinite(neighbors) & (neighbors > 0)).all(axis=0)
    return positive

records = []
for band, filter_name in (('b', 'F435W'), ('v', 'F555W'), ('i', 'F814W')):
    science_header = header_by_name[f'h_m51_{band}_s05_drz_sci.fits']
    weight_header = header_by_name[f'h_m51_{band}_s05_drz_weight.fits']
    drizzle = paired_metadata(science_header, weight_header, band)
    filters = [science_header['FILTER1'], science_header['FILTER2']]
    assert filter_name in filters and len(set(filters) & {'CLEAR1L', 'CLEAR2L'}) == 1
    assert science_header['DRIZCORR'] == 'COMPLETE'
    assert science_header['PHOTFLAM'] > 0 and science_header['PHOTPLAM'] > 0
    # Calibration follows the actual cps output record/ACS source definition,
    # not inherited BUNIT. No second EXPTIME or CCDGAIN division.
    flam_per_cps = science_header['PHOTFLAM'] * u.erg / (u.cm ** 2 * u.s * u.AA)
    pivot = science_header['PHOTPLAM'] * u.AA
    ujy_per_cps = flam_per_cps.to_value(u.uJy, equivalencies=u.spectral_density(pivot))
    assert np.isfinite(ujy_per_cps) and ujy_per_cps > 0
    # Drizzled products are already distortion-corrected. This remains a
    # diagnostic in-memory copy; original headers and arrays are unchanged.
    clean = science_header.copy()
    sip_keys = [key for key in clean if re.fullmatch(r'(A|B|AP|BP)_(ORDER|\d+_\d+)', key)]
    for key in sip_keys: del clean[key]
    wcs = WCS(clean).celestial
    source_frame = wcs_to_celestial_frame(wcs)
    world = wcs.all_pix2world([[4299.5, 6099.5]], 0)[0]
    sky = SkyCoord(world[0] * u.deg, world[1] * u.deg, frame=source_frame)
    icrs = sky.icrs
    separation_if_mislabeled = icrs.separation(SkyCoord(world[0] * u.deg, world[1] * u.deg, frame='icrs')).arcsec
    pair_rows = []
    for y_start in (1536, 6092, 10648):
        def read(kind):
            receipt = sample_by_key[(f'h_m51_{band}_s05_drz_{kind}.fits', y_start)]
            raw = Path(receipt['artifact']['path']).read_bytes()
            assert len(raw) == 16 * 8600 * 4
            return np.frombuffer(raw, dtype='>f4').reshape(16, 8600)
        science, weight = read('sci'), read('weight')
        qualified = np.isfinite(science) & np.isfinite(weight) & (weight > 0)
        converted = science.astype(np.float64) * ujy_per_cps
        assert np.array_equal(science[qualified] == 0, converted[qualified] == 0)
        assert np.array_equal(science[qualified] < 0, converted[qualified] < 0)
        candidates = np.argwhere(np.isfinite(science) & (science != 0) & (weight == 0))
        usable = candidates[(candidates[:, 0] < 15) & (candidates[:, 1] < 8599)]
        yy, xx = usable[0]
        x, y = np.array([float(xx)]), np.array([float(yy)])
        naive_data, footprint, finite = stencil_owner.bilinear_source_samples(science, x, y)
        positive_stencil = accepted_weight_stencil(weight, x, y)
        qualified_stencil = footprint & finite & positive_stencil
        assert footprint[0] and finite[0] and naive_data[0] != 0
        assert not qualified_stencil[0], 'FINITE_ONLY_PAINTED_UNACCEPTED_FILL'
        pair_rows.append({'startRow': y_start, 'acceptedContributionSamples': int(qualified.sum()),
                          'negativeAcceptedContributionSamples': int(((science < 0) & qualified).sum()),
                          'zeroAcceptedContributionSamples': int(((science == 0) & qualified).sum()),
                          'nonzeroFiniteAtZeroWeight': int((np.isfinite(science) & (science != 0) & (weight == 0)).sum()),
                          'finiteOnlyCounterexample': {'sourcePixelZeroBased': [int(xx), int(yy) + y_start],
                                                      'rawScienceCps': float(science[yy, xx]), 'rawWeight': float(weight[yy, xx]),
                                                      'finiteOnlyWouldSupplyData': True, 'acceptedContributionStencil': False},
                          'qualifiedFluxDensityUjyPerNativePixelQuantiles5_50_95': np.percentile(converted[qualified], [5, 50, 95]).tolist()})
    # A real provenance mutation is rejected instead of pairing by dimensions.
    changed_weight = weight_header.copy()
    changed_weight['D001OUDA'] = 'different_science.fits'
    try:
        paired_metadata(science_header, changed_weight, band)
    except AssertionError:
        pass
    else:
        raise AssertionError('MISMATCHED_OUTPUT_PAIR_ACCEPTED')
    records.append({'band': band, 'filter': filter_name, 'actualFilterWheelValues': filters, 'pairedDrizzleRecords': 48, 'pairedProcessingCards': 1152,
                    'pairedProcessingSha256': hashlib.sha256(json.dumps(drizzle, sort_keys=True).encode()).hexdigest(),
                    'inheritedScienceBunit': science_header['BUNIT'], 'recordedOutputUnit': 'electrons/second',
                    'photflam': science_header['PHOTFLAM'], 'pivotAngstrom': science_header['PHOTPLAM'],
                    'ujyPerNativePixelPerCps': ujy_per_cps, 'sourceFrame': source_frame.name,
                    'sourceEquinox': str(getattr(source_frame, 'equinox', None)),
                    'centerDeclaredFrameRaDecDeg': world.tolist(), 'centerConvertedIcrsRaDecDeg': [icrs.ra.deg, icrs.dec.deg],
                    'centerErrorIfCoordinatesMislabeledIcrsArcsec': float(separation_if_mislabeled),
                    'nominalCentralPixelAreaArcsecSquared': float(abs(np.linalg.det(wcs.pixel_scale_matrix)) * 3600 ** 2),
                    'removedSipKeysInDiagnosticCopy': sip_keys, 'samples': pair_rows,
                    'mismatchedProcessingOutputMutationRejected': True})

# Qualification must preserve genuine available black/negative values. Even
# an integer query requires all four accepted neighbours, including +1.
fixture = np.array([[0., -2.], [3., 4.]], dtype=np.float32)
weight_fixture = np.ones_like(fixture)
x, y = np.array([0.]), np.array([0.])
data, footprint, finite = stencil_owner.bilinear_source_samples(fixture, x, y)
assert data[0] == 0 and (footprint & finite & accepted_weight_stencil(weight_fixture, x, y))[0]
weight_fixture[1, 1] = 0
assert not accepted_weight_stencil(weight_fixture, x, y)[0]
after = [bind(p) for p in paths]
assert before == after
(OUT / 'inputs-after.json').write_text(json.dumps(after, indent=2) + '\n')
result = {'status': 'PAIRED_METADATA_UNITS_AND_CONTRIBUTION_SEMANTICS_PILOT_NOT_ADOPTED',
          'inputsBeforeAfterExact': True, 'networkRequests': 0, 'records': records,
          'sourceProcessing': 'No source correction/sky subtraction/EXPTIME or gain division. Raw sampled values preserved.',
          'qualification': 'Strict finite science plus positive finite same-index paired EXP weights for all four source neighbours; no absolute scientific-validity or confidence claim.',
          'meaning': 'No complete-array admission, new production adapter/RGB/master/LOD/publication/default or photometric accuracy certification. Flux density is per native pixel and filter; different pixel areas/PSFs/passbands require explicit treatment before comparison/coadd. Source-frame conversion does not improve telescope astrometry. Modern official fill semantics support the observed legacy behavior but do not certify every legacy implementation detail.'}
(OUT / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'result': bind(OUT / 'result.json'), 'bands': [{key: row[key] for key in ('band', 'sourceFrame', 'ujyPerNativePixelPerCps', 'centerErrorIfCoordinatesMislabeledIcrsArcsec')} for row in records]}))
