"""Actual native Atlas support at saved HiPS core coordinates; no new mask."""
from pathlib import Path
import hashlib
import io
import json
import sys
import warnings

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
sys.path[:0] = [str(ROOT / 'data-pipelines/deep-sky'), str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from astropy.io import fits
from astropy.coordinates import SkyCoord
from astropy.wcs import WCS
from astropy.wcs.utils import skycoord_to_pixel, wcs_to_celestial_frame
from astropy.visualization import ManualInterval, AsinhStretch
from PIL import Image
from allwise_atlas_source import read_cached_atlas_triplet, SUPPORT_VERSION

ACQ = ROOT / 'output/allwise-w3-m82-atlas-native-1004-r2'
SCIENCE = ROOT / 'output/allwise-w3-m82-fresh-science-1002-r2'
CORE = ROOT / 'output/allwise-w3-m82-detail-display-1002-r1/core-pixel-diagnostics.json'
OUT = ROOT / 'output/allwise-w3-m82-atlas-core-support-1004-r2'
CHECKPOINT = TASK / 'evidence/current-execution-state-2026-10-04-r73.json'


def bind(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1048576):
            h.update(chunk)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': h.hexdigest()}


def verify(records):
    assert [bind(ROOT / item['path']) for item in records] == records


def save(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + '\n', encoding='utf-8')


def scalar(value):
    return {'state': 'FINITE', 'value': float(value)} if np.isfinite(value) else {
        'state': 'NAN' if np.isnan(value) else 'POSITIVE_INFINITY' if value > 0 else 'NEGATIVE_INFINITY', 'value': None}


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    acquisition = json.loads((ACQ / 'acquisition.json').read_bytes())
    binding = json.loads((ACQ / 'binding.json').read_bytes())
    verify(binding['outputs'])
    verify(binding['metadataBindings'])
    assert acquisition['fullCoreNativeTripletChecked']
    checkpoint = json.loads(CHECKPOINT.read_bytes())
    baseline = checkpoint['currentSources'] + checkpoint['protected'] + checkpoint['evidence']
    existing = [bind(ROOT / item['path']) for item in baseline]
    source_changes = [actual for prior, actual in zip(baseline, existing, strict=True) if prior != actual]
    assert [item['path'] for item in source_changes] == [Path(__file__).relative_to(ROOT).as_posix()]
    records, products = {}, {}
    for record in acquisition['sourceFiles']:
        operation = record['operation']
        records[operation] = record
        products[operation] = {**record['raw'],
            'state': 'CHECKED' if record['state'] == 'CHECKED_NATIVE_ARRAY' else record['state'],
            'receipt': {'completeArrayReceived': record.get('completeArrayReceived') is True}}
    native = read_cached_atlas_triplet(ROOT, products, coadd_id='1507p696_ac51')
    assert native.intensity.shape == (129, 129)
    arrays = {'int': native.intensity, 'cov': native.coverage, 'unc': native.uncertainty}
    canonical_wcs = dict(native.wcs_header)
    native_wcs = WCS(canonical_wcs)
    meta = json.loads((SCIENCE / 'detail-metadata.json').read_bytes())
    science = np.load(ROOT / meta['science']['path'], allow_pickle=False)
    availability = np.load(ROOT / meta['availability']['path'], allow_pickle=False)
    assert np.array_equal(availability, np.isfinite(science))
    core = json.loads(CORE.read_bytes())['pixels']
    assert len(core) == 17
    missing_y, missing_x = np.where(~availability)
    assert len(missing_x) == 19
    targets = [{'group': 'PRIOR_FINITE_DARK_CORE', 'xy': item['jpegXY']} for item in core]
    targets += [{'group': 'PRIOR_NONFINITE_HIPS', 'xy': [int(x), int(y)]} for x, y in zip(missing_x, missing_y, strict=True)]
    xy = np.asarray([item['xy'] for item in targets])
    target_wcs = WCS(meta['wcsHeader'])
    ra, dec = target_wcs.all_pix2world(xy[:, 0], meta['pixels'] - 1 - xy[:, 1], 0)
    sky = SkyCoord(ra, dec, unit='deg', frame='icrs')
    native_x, native_y = skycoord_to_pixel(sky, native_wcs, origin=0, mode='all')
    assert np.all(np.isfinite(native_x)) and np.all(np.isfinite(native_y))
    points = []
    for index, target in enumerate(targets):
        x, y = float(native_x[index]), float(native_y[index])
        nearest_x, nearest_y = int(np.floor(x + .5)), int(np.floor(y + .5))
        floor_x, floor_y = int(np.floor(x)), int(np.floor(y))
        assert 0 <= floor_x < 128 and 0 <= floor_y < 128
        neighbors = []
        for yy in (floor_y, floor_y + 1):
            for xx in (floor_x, floor_x + 1):
                neighbors.append({'xy': [xx, yy], 'geometricBilinearWeight': (1 - abs(x - xx)) * (1 - abs(y - yy)),
                    **{operation: scalar(data[yy, xx]) for operation, data in arrays.items()}})
        nearest = {operation: scalar(data[nearest_y, nearest_x]) for operation, data in arrays.items()}
        xx, yy = target['xy']
        points.append({**target, 'targetWorldICRS': [float(ra[index]), float(dec[index])],
            'originalHiPSScalar': scalar(science[yy, xx]), 'originalHiPSAvailable': bool(availability[yy, xx]),
            'nativeXY': [x, y], 'nearestNativeXY': [nearest_x, nearest_y], 'nearestNative': nearest,
            'fourNeighbors': neighbors, 'fourNeighborsAllFiniteIntensityUncertaintyPositiveCoverage': all(
                item['int']['state'] == item['unc']['state'] == item['cov']['state'] == 'FINITE' and item['cov']['value'] > 0
                for item in neighbors)})
    intensity, coverage, uncertainty = (arrays[key] for key in ('int', 'cov', 'unc'))
    native_nonfinite = ~np.isfinite(intensity)
    summaries = []
    for group in ('PRIOR_FINITE_DARK_CORE', 'PRIOR_NONFINITE_HIPS'):
        selected = [point for point in points if point['group'] == group]
        cov_values = [point['nearestNative']['cov']['value'] for point in selected]
        summaries.append({'group': group, 'targets': len(selected),
            'nearestFiniteIntensity': sum(point['nearestNative']['int']['state'] == 'FINITE' for point in selected),
            'nearestFiniteUncertainty': sum(point['nearestNative']['unc']['state'] == 'FINITE' for point in selected),
            'nearestZeroCoverage': sum(value == 0 for value in cov_values),
            'nearestCoverageRange': [min(cov_values), max(cov_values)],
            'allFourNeighborSupportCount': sum(point['fourNeighborsAllFiniteIntensityUncertaintyPositiveCoverage'] for point in selected)})
    save('mapped-core-points.json', {'points': points, 'summaries': summaries,
        'nativeFrameInterpretedByFITSWCS': repr(wcs_to_celestial_frame(native_wcs)),
        'targetFrame': 'ICRS', 'nativeWcsHeader': canonical_wcs, 'origin': 0,
        'rowConvention': 'Saved TAN image y down => WCS row=pixels-1-y; original native FITS row up',
        'limits': ['Nearest/four native neighbors at same WCS coordinates, not exact old CDS interpolation or validated absolute astrometry.',
                   'No interpolated science/output, mask replacement, coverage threshold admission or physical cause classification.']})
    # A source inspection image uses the already tested fixed recipe, without
    # fitting a new range or altering the scientific arrays. It is not a product.
    finite = np.isfinite(intensity)
    gray = np.zeros(intensity.shape, dtype=np.uint8)
    mapped = AsinhStretch(a=.1)(ManualInterval(260, 1000)(intensity[finite], clip=True), clip=True)
    gray[finite] = np.rint(mapped * 255).astype(np.uint8)
    rgba = np.repeat(gray[..., None], 4, axis=-1)
    rgba[:, :, 3] = finite.astype(np.uint8) * 255
    stream = io.BytesIO()
    Image.fromarray(rgba).save(stream, format='PNG')
    png = OUT / 'm82-native-core-fixed-range.inspection.png'
    png.write_bytes(stream.getvalue())
    with Image.open(png) as image:
        image.load()
        assert np.array_equal(np.asarray(image.convert('RGBA')), rgba)
    inputs = [bind(path) for path in [Path(__file__), CHECKPOINT, ACQ / 'acquisition.json', ACQ / 'binding.json',
        SCIENCE / 'detail-metadata.json', ROOT / meta['science']['path'], ROOT / meta['availability']['path'], CORE,
        ROOT / 'data-pipelines/deep-sky/allwise_atlas_source.py',
        ROOT / 'data-pipelines/deep-sky/test_allwise_atlas_source.py',
        *[ROOT / record['raw']['path'] for record in records.values()]]]
    verify(existing)
    verify(binding['outputs'])
    save('result.json', {'scope': '129square native core qualification only, not full DETAIL field/source-quality repair/adoption',
        'inputsBefore': inputs, 'inputsAfter': inputs, 'checkpointBindingsBefore': existing, 'checkpointBindingsAfter': existing,
        'checkpointSourceChanges': source_changes,
        'sharedSourceOwner': {'version': SUPPORT_VERSION, 'source': bind(ROOT / 'data-pipelines/deep-sky/allwise_atlas_source.py'),
            'supportedPixels': int(native.supported.sum()), 'positiveContributionPixels': int(native.positive_contribution.sum()),
            'intensityFinitePixels': int(native.intensity_finite.sum()), 'coverageKnownPixels': int(native.coverage_known.sum()),
            'uncertaintyKnownPixels': int(native.uncertainty_known.sum()), 'magnitudeZeroPoint': native.magnitude_zero_point,
            'quality': 'UNKNOWN_NOT_ALPHA_OR_CONFIDENCE', 'sourceReceipts': list(native.source_receipts)},
        'nativeArrays': {operation: {'raw': record['raw'], 'BUNIT': record['BUNIT'], 'FILETYPE': record['FILETYPE'],
                                    'nonfiniteScalars': record['nonfiniteScalars']} for operation, record in records.items()},
        'nativePatch': {'pixels': intensity.size, 'nonfiniteIntensity': int(native_nonfinite.sum()),
            'nonfiniteUncertainty': int((~np.isfinite(uncertainty)).sum()), 'zeroCoverage': int((coverage == 0).sum()),
            'nonfiniteIntensityWithPositiveCoverage': int((native_nonfinite & (coverage > 0)).sum()),
            'finiteIntensityWithZeroCoverage': int((finite & (coverage == 0)).sum())},
        'summaries': summaries, 'points': bind(OUT / 'mapped-core-points.json'), 'inspectionPNG': bind(png),
        'sourceUnits': 'Native intensity/uncertainty DN and coverage effective pixels, actual headers; HiPS BUNIT/transform units remain unknown',
        'independentReview': 'MISSING', 'productionChanges': [], 'quality': 'FAILED_OR_UNVERIFIED',
        'limits': ['Finite/positive coverage does not establish detector validity or repair weak structure/PSF/dark core.',
                   '19 HiPS nonfinite nearest Atlas intensities/uncertainties are nonfinite; only 14 nearest coverage exactly zero.',
                   'Five nonfinite native targets have small positive effective coverage; do not invent nonfinite iff coverage==0.',
                   'No direct uncertainty confidence/SNR, independent-noise assumption, background subtraction, inpainting or new scientific mask.']})
    save('binding.json', {'inputs': inputs, 'outputs': [bind(path) for path in sorted(OUT.rglob('*')) if path.is_file()]})
    print(json.dumps({'summaries': summaries, 'nativePatch': json.loads((OUT / 'result.json').read_bytes())['nativePatch'],
                      'allExistingBytesExact': True, 'sourceUnits': 'native DN/effective pixels, HiPS still unknown'}))


if __name__ == '__main__':
    main()
