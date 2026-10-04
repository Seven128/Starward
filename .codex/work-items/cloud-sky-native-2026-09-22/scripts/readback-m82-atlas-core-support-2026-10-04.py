"""Independent calculation path for saved native support, root self-review."""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from astropy.io import fits
from astropy.coordinates import SkyCoord
from astropy.wcs import WCS
from astropy.wcs.utils import wcs_to_celestial_frame
from PIL import Image

GEN = ROOT / 'output/allwise-w3-m82-atlas-core-support-1004-r1'
OUT = ROOT / 'output/allwise-w3-m82-atlas-core-readback-1004-r1'


def bind(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1048576):
            h.update(chunk)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': h.hexdigest()}


def verify(records):
    assert [bind(ROOT / item['path']) for item in records] == records


def scalar(value):
    return {'state': 'FINITE', 'value': float(value)} if np.isfinite(value) else {
        'state': 'NAN' if np.isnan(value) else 'POSITIVE_INFINITY' if value > 0 else 'NEGATIVE_INFINITY', 'value': None}


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    binding = json.loads((GEN / 'binding.json').read_bytes())
    verify(binding['inputs'])
    verify(binding['outputs'])
    report = json.loads((GEN / 'result.json').read_bytes())
    verify(report['checkpointBindingsAfter'])
    assert report['checkpointBindingsBefore'] == report['checkpointBindingsAfter']
    assert report['inputsBefore'] == report['inputsAfter']
    points = json.loads((GEN / 'mapped-core-points.json').read_bytes())
    data, headers = {}, {}
    for key, record in report['nativeArrays'].items():
        with fits.open(ROOT / record['raw']['path'], memmap=False) as hdus:
            data[key] = np.array(hdus[0].data)
            headers[key] = hdus[0].header.copy()
            assert headers[key]['COADDID'] == '1507p696_ac51' and headers[key]['BAND'] == 3
            assert int((~np.isfinite(data[key])).sum()) == record['nonfiniteScalars']
    native_wcs = WCS(headers['int'])
    assert all(dict(WCS(header).to_header(relax=True)) == points['nativeWcsHeader'] for header in headers.values())
    meta_path = ROOT / 'output/allwise-w3-m82-fresh-science-1002-r2/detail-metadata.json'
    meta = json.loads(meta_path.read_bytes())
    target_wcs = WCS(meta['wcsHeader'])
    science = np.load(ROOT / meta['science']['path'], allow_pickle=False)
    available = np.load(ROOT / meta['availability']['path'], allow_pickle=False)
    differences = []
    group_rows = {'PRIOR_FINITE_DARK_CORE': [], 'PRIOR_NONFINITE_HIPS': []}
    for point in points['points']:
        x, y = point['xy']
        assert point['originalHiPSScalar'] == scalar(science[y, x])
        assert point['originalHiPSAvailable'] == bool(available[y, x])
        # FITS one-based coordinates and explicit native frame transformation;
        # producer's skycoord_to_pixel/origin=0 helper is not used here.
        ra, dec = target_wcs.all_pix2world(x + 1, meta['pixels'] - y, 1)
        sky = SkyCoord(float(ra), float(dec), unit='deg', frame='icrs').transform_to(wcs_to_celestial_frame(native_wcs))
        nx, ny = native_wcs.all_world2pix(sky.spherical.lon.deg, sky.spherical.lat.deg, 1)
        nx, ny = float(nx - 1), float(ny - 1)
        differences.append(max(abs(nx - point['nativeXY'][0]), abs(ny - point['nativeXY'][1])))
        ix, iy = int(np.floor(nx + .5)), int(np.floor(ny + .5))
        assert [ix, iy] == point['nearestNativeXY']
        assert point['nearestNative'] == {key: scalar(array[iy, ix]) for key, array in data.items()}
        floor_x, floor_y = int(np.floor(nx)), int(np.floor(ny))
        addresses = [[xx, yy] for yy in (floor_y, floor_y + 1) for xx in (floor_x, floor_x + 1)]
        assert addresses == [item['xy'] for item in point['fourNeighbors']]
        for item in point['fourNeighbors']:
            xx, yy = item['xy']
            assert all(item[key] == scalar(array[yy, xx]) for key, array in data.items())
        good = all(np.isfinite(data['int'][yy, xx]) and np.isfinite(data['unc'][yy, xx])
                   and np.isfinite(data['cov'][yy, xx]) and data['cov'][yy, xx] > 0 for xx, yy in addresses)
        assert good == point['fourNeighborsAllFiniteIntensityUncertaintyPositiveCoverage']
        group_rows[point['group']].append((data['int'][iy, ix], data['cov'][iy, ix], data['unc'][iy, ix], good))
    observed = []
    for group, rows in group_rows.items():
        intensity, coverage, uncertainty, good = np.asarray(rows).T
        observed.append({'group': group, 'targets': len(rows), 'nearestFiniteIntensity': int(np.isfinite(intensity).sum()),
            'nearestFiniteUncertainty': int(np.isfinite(uncertainty).sum()), 'nearestZeroCoverage': int((coverage == 0).sum()),
            'nearestCoverageRange': [float(coverage.min()), float(coverage.max())], 'allFourNeighborSupportCount': int(good.sum())})
    assert observed == report['summaries'] == points['summaries']
    assert [row['targets'] for row in observed] == [17, 19]
    # The real positive-COV/nonfinite-I pixels directly contradict a COV-only
    # validity mask; no synthetic zero or guessed missing observation is needed.
    nonfinite_with_positive = (~np.isfinite(data['int'])) & (data['cov'] > 0)
    assert int(nonfinite_with_positive.sum()) == report['nativePatch']['nonfiniteIntensityWithPositiveCoverage'] == 25
    with Image.open(ROOT / report['inspectionPNG']['path']) as image:
        image.load()
        rgba = np.array(image.convert('RGBA'))
    assert np.array_equal(rgba[:, :, 3], np.isfinite(data['int']).astype(np.uint8) * 255)
    verify(report['checkpointBindingsAfter'])
    result = {'scope': 'Root independent calculation/data readback; self-review, not independent reviewer or final acceptance',
        'producer': bind(GEN / 'result.json'), 'reader': bind(Path(__file__)), 'summaries': observed,
        'all36NearestAndFourNeighborScalarAddressesExact': True, 'maxNativeXYCalculationDifference': max(differences),
        'nativeFrame': repr(wcs_to_celestial_frame(native_wcs)), 'savedSourceAlphaExact': True,
        'realCovOnlyValidityCounterexamplePixels': 25, 'allExistingPinsExact': True,
        'quality': 'FAILED_OR_UNVERIFIED', 'cause': 'UNRESOLVED_NO_PIXEL_REPAIR_OR_MASK_ADOPTION',
        'limits': ['Effective pixels are not frame counts/confidence; no threshold-based scientific validity or independence claim.',
                   'Nearest/four addresses match under declared WCS; unknown old HiPS/Atlas interpolation lineage and absolute registration remain.',
                   'Only a core patch, not complete DETAIL/OV/MED scientific coverage or product output.']}
    (OUT / 'result.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'pass': True, 'summaries': observed, 'realCovOnlyCounterexamplePixels': 25,
                      'maxNativeXYCalculationDifference': max(differences), 'existingPinsExact': True}))


if __name__ == '__main__':
    main()
