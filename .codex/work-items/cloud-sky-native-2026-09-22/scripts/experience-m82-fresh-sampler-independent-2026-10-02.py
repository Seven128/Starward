"""Independent cached M82 science review; no production sampler or image creation.

The bounded north-polar NESTED formula is independent of healpix-ts lookup.
The direct inverse TAN is independently checked against Astropy and old hashes.
JPEG luminance only locates diagnostics, never supplies scientific availability.
"""
from pathlib import Path
import hashlib
import io
import json
import math
import os
import subprocess
import sys
import warnings

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
from PIL import Image

OUT = ROOT / 'output/allwise-w3-m82-fresh-sampler-independent-1002-r1'
FRESH = ROOT / 'output/allwise-w3-m82-fresh-science-1002-r2'
COMPAT = ROOT / 'output/allwise-w3-fresh-sampler-compatibility-1002-r1'
BASE = ROOT / 'output/allwise-w3-m82-source-0930'
ACQ = ROOT / 'output/allwise-w3-m82-detail-acquisition-1002-r1'
OWNER_SHA = 'd917e04227ce6b0faefdf7780bb144f040c3049eaae8f4cb629603411c5b25c4'
inputs = {}


def binding(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}


def admit(path, expected=None):
    actual = binding(path)
    if expected is not None:
        assert actual == expected, (actual, expected)
    inputs[actual['path']] = actual
    return path


def load(path):
    return json.loads(admit(path).read_text(encoding='utf8'))


def write(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2, allow_nan=False) + '\n', encoding='utf8')


def direct_world(plan, crpix=256):
    n = plan['profiles'][0]['pixels']
    y, x = np.mgrid[0:n, 0:n]
    step = 2 * math.tan(math.radians(plan['profiles'][0]['fieldDegrees']) / 2) / n
    # FITS is one-based and its increasing row is opposite encoded image row.
    xi = (x + 1 - crpix) * (-step)
    eta = (n - y - crpix) * step
    a0, d0 = np.deg2rad([plan['center']['raDeg'], plan['center']['decDeg']])
    q = np.cos(d0) - eta * np.sin(d0)
    ra = np.rad2deg(a0 + np.arctan2(xi, q)) % 360
    dec = np.rad2deg(np.arctan2(np.sin(d0) + eta * np.cos(d0), np.hypot(xi, q)))
    return ra, dec


def polar_nested(ra, dec):
    # M82 DETAIL is entirely in the northern cap; do not silently generalize.
    z = np.sin(np.deg2rad(dec))
    assert np.all(z > 2/3) and np.all((ra >= 0) & (ra < 360))
    tt = ra / 90
    face = np.floor(tt).astype(np.uint64)
    tp = tt - face
    tmp = 2**17 * np.sqrt(3 * (1-z))
    jp = np.floor(tp * tmp).astype(np.uint64)
    jm = np.floor((1-tp) * tmp).astype(np.uint64)
    ix, iy = 2**17 - jm - 1, 2**17 - jp - 1
    cell = face * 2**34
    for bit in range(17):
        cell |= ((ix >> bit) & 1) << (2*bit)
        cell |= ((iy >> bit) & 1) << (2*bit + 1)
    return np.stack([cell // 512**2, iy % 512, 511 - (ix % 512)], -1).astype('<u4')


def main():
    assert not OUT.exists()
    owner = admit(ROOT / 'data-pipelines/deep-sky/allwise_finite_tan.py')
    assert binding(owner)['sha256'] == OWNER_SHA
    tests = admit(ROOT / 'data-pipelines/deep-sky/test_publish_allwise_w3.py')
    assert binding(tests)['sha256'] == '8109e6037ad465d17f0411ef0197a626f8c8d33d598ca25198930c0b3c0da5a2'
    for name in ('image_quality.py', 'hips_tan_lookup.mjs'):
        admit(ROOT / 'data-pipelines/deep-sky' / name)
    fresh_binding = load(FRESH / 'binding.json')
    assert binding(FRESH / 'binding.json')['sha256'] == '16db2ae831bd889b454b14f36735efae9f2e9fb0517a1d2d58e28ce68f67150c'
    for record in fresh_binding['sourceFiles'] + fresh_binding['inputs'] + fresh_binding['outputs']:
        admit(ROOT / record['path'], record)
    result = load(FRESH / 'result.json')
    assert binding(FRESH / 'result.json')['sha256'] == '87cf424defdf7621577095a6c4f29720ed7683e780747a3d364ffc3bae4acdb4'
    meta = load(FRESH / 'detail-metadata.json')
    prep = load(ROOT / 'output/allwise-w3-m82-source-independent-1002-r1/review.json')
    assert binding(ROOT / 'output/allwise-w3-m82-source-independent-1002-r1/review.json')['sha256'] == '06ec40e7b3a4d9f1a71955f75044181fc93172d87aba9f8de01ce7e237954846'
    plan = load(BASE / 'candidate-detail/candidate-plan.json')
    all_plan = load(BASE / 'candidate/candidate-plan.json')
    acquisition = load(ACQ / 'acquisition.json')
    profile = plan['profiles'][0]
    assert profile == acquisition['detailProfile'] == prep['profile']
    source_arrays = {}
    raw_bindings = []
    for record in acquisition['sourceFiles']:
        path = admit(ROOT / record['raw']['path'], record['raw'])
        raw = path.read_bytes()
        # Full raw big-endian scalar decode; never obtain source data from owner.
        assert raw[:80].startswith(b'SIMPLE  =                    T')
        assert len(raw) == 1051456 and raw[400:480].startswith(b'END')
        data = np.frombuffer(raw[2880:2880+512**2*4], '>f4').reshape(512, 512)
        with warnings.catch_warnings(record=True):
            with fits.open(io.BytesIO(raw), memmap=False) as hdus:
                assert len(hdus) == 1 and hdus[0].header['BITPIX'] == -32
                assert data.tobytes() == hdus[0].data.tobytes()
        tile = int(Path(record['path']).stem.removeprefix('Npix'))
        source_arrays[tile] = data
        raw_bindings.append(binding(path))
    assert len(source_arrays) == 6 and sum(x['bytes'] for x in raw_bindings) == 6308736
    ra, dec = direct_world(plan)
    direct_lookup = polar_nested(ra, dec)
    lookup_hash = hashlib.sha256(direct_lookup.tobytes()).hexdigest()
    assert lookup_hash == profile['lookupSha256'] == meta['lookupSha256']
    n = profile['pixels']
    y, x = np.mgrid[0:n, 0:n]
    target = WCS(naxis=2)
    target.wcs.ctype = ['RA---TAN', 'DEC--TAN']
    target.wcs.crval = [plan['center']['raDeg'], plan['center']['decDeg']]
    target.wcs.crpix = [n/2, n/2]
    step = 2 * math.tan(math.radians(profile['fieldDegrees'])/2)/n
    target.wcs.cdelt = np.rad2deg([-step, step])
    astropy_ra, astropy_dec = target.all_pix2world(x, n-1-y, 0)
    astropy_world = np.stack([astropy_ra, astropy_dec], -1).astype('<f8')
    world_hash = hashlib.sha256(astropy_world.tobytes()).hexdigest()
    assert world_hash == profile['worldSha256'] == meta['worldSha256']
    world_error = max(float(np.abs(ra-astropy_ra).max()), float(np.abs(dec-astropy_dec).max()))
    assert world_error < 1e-10 and dict(target.to_header()) == meta['wcsHeader']
    assert polar_nested(astropy_ra, astropy_dec).tobytes() == direct_lookup.tobytes()
    independently_sampled = np.empty((n, n), dtype=np.float32)
    contributions = []
    for tile, data in source_arrays.items():
        take = direct_lookup[:, :, 0] == tile
        independently_sampled[take] = data[direct_lookup[:, :, 2][take], direct_lookup[:, :, 1][take]]
        selected = independently_sampled[take]
        contributions.append({'tile': tile, 'targetPixels': int(take.sum()),
                              'finitePixels': int(np.isfinite(selected).sum()),
                              'nonfinitePixels': int((~np.isfinite(selected)).sum())})
    assert set(np.unique(direct_lookup[:, :, 0]).tolist()) == set(source_arrays)
    science = np.load(FRESH / 'detail-science.npy', allow_pickle=False)
    availability = np.load(FRESH / 'detail-availability.npy', allow_pickle=False)
    independent_finite = np.isfinite(independently_sampled)
    assert science.dtype == np.float32 and availability.dtype == np.bool_
    # Bit equality includes actual selected NaN payload, not only equal_nan.
    assert independently_sampled.tobytes() == science.tobytes()
    assert independent_finite.tobytes() == availability.tobytes()
    assert int(independent_finite.sum()) == meta['finitePixels'] == 262125
    assert int((~independent_finite).sum()) == meta['nonfinitePixels'] == 19
    assert np.percentile(science[availability], [0, 1, 50, 99, 100]).tolist() == meta['finitePercentiles']
    manifest = load(ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json')
    entry = next(a for a in manifest['entries'] if a['objectRef'] == 'M:82')
    jpeg_path = admit(ROOT / 'workers/miniapp-api/assets/deep-sky' / entry['levels']['DETAIL']['file'])
    assert binding(jpeg_path)['sha256'] == '91a9220c505c1521ec5cc14c1312721ef1afdd653297a86ef892452a4172b699'
    assert binding(jpeg_path)['bytes'] == 9569
    with Image.open(jpeg_path) as image:
        image.load()
        assert image.format == 'JPEG' and image.size == (512, 512)
        rgb = np.array(image.convert('RGB'))
    luma = rgb.astype(np.float64) @ np.array([.2126, .7152, .0722])
    # Explicit fixed regions derive from viewing this frozen old JPEG.
    core_box = (x >= 248) & (x < 272) & (y >= 245) & (y < 270)
    core_dark = core_box & (luma <= 8)
    radius2 = (x-255.5)**2 + (y-255.5)**2
    peripheral_dark = (radius2 >= 80**2) & (luma <= 8)
    core_bright_ring = (radius2 >= 12**2) & (radius2 < 30**2) & (luma >= 200)
    def pixel_records(take):
        records = []
        for yy, xx in np.argwhere(take):
            tile, col, row = [int(v) for v in direct_lookup[yy, xx]]
            value = science[yy, xx]
            records.append({'jpegXY': [int(xx), int(yy)], 'jpegRgb': rgb[yy, xx].tolist(),
                            'jpegLuminance': float(luma[yy, xx]), 'independentWorldICRS': [float(ra[yy, xx]), float(dec[yy, xx])],
                            'source': {'tile': tile, 'fitsColumn': col, 'fitsRow': row,
                                       'finite': bool(np.isfinite(value)), 'intensityUnknownUnit': float(value) if np.isfinite(value) else None}})
        return records
    def region_stats(take):
        vals = science[take & availability]
        return {'pixels': int(take.sum()), 'finiteSourceSamples': int((take & availability).sum()),
                'nonfiniteSourceSamples': int((take & ~availability).sum()),
                'finiteIntensityPercentiles0_1_50_99_100': np.percentile(vals, [0, 1, 50, 99, 100]).tolist(),
                'sourceTileCounts': {str(tile): int((take & (direct_lookup[:, :, 0] == tile)).sum()) for tile in source_arrays}}
    assert int(core_dark.sum()) == 17 and not np.any(core_dark & ~availability)
    diagnostics = {'jpeg': binding(jpeg_path), 'coreBoxXYExclusive': [248, 245, 272, 270],
                   'coreNearBlackLuminanceAtMost8': {**region_stats(core_dark), 'pixelsXYSource': pixel_records(core_dark)},
                   'peripheralNearBlackRadiusAtLeast80LuminanceAtMost8': region_stats(peripheral_dark),
                   'brightCoreRingRadius12to30LuminanceAtLeast200': region_stats(core_bright_ring),
                   'allActualNonfiniteTargetPixels': pixel_records(~availability),
                   'limits': 'JPEG thresholds only locate these diagnostics. They neither generate science masks nor infer missing data. Coordinates are conditional on old declared center/field, CRPIX256 TAN and our nearest order+9 lookup; original CDS interpolation and precise old pixel-origin/absolute registration remain unknown. Core finite low values could contain source artifacts; no inpainting or quality acceptance.'}
    # Bounded controls prove this oracle rejects brightness-as-availability and
    # a silently normalized half-pixel WCS, without mutating source or owner.
    wrong_availability = availability.copy()
    wrong_availability[core_dark] = False
    assert not np.array_equal(wrong_availability, independent_finite)
    shifted_lookup = polar_nested(*direct_world(plan, crpix=256.5))
    origin_changed = np.any(shifted_lookup != direct_lookup, axis=-1)
    assert origin_changed.any()
    mutations = {'jpegNearBlackToMissingFalsePositives': int((availability & ~wrong_availability).sum()),
                 'blackAsMissingDetected': True, 'silentCRPIX256p5ChangedTargetLookups': int(origin_changed.sum()),
                 'halfPixelContractMutationDetected': True, 'scope': 'In-memory independent controls; no production or frozen files altered.'}
    compat_binding = load(COMPAT / 'binding.json')
    for record in compat_binding['inputs'] + compat_binding['outputs']:
        admit(ROOT / record['path'], record)
    compat_result = load(COMPAT / 'result.json')
    assert binding(COMPAT / 'result.json')['sha256'] == '9aa01e93b7ad5c92cd1eba896f589e1374cb1ed92536e0423b103b2d3111e3cc'
    for stem in ('render-metadata', 'quality'):
        assert (COMPAT / f'old-{stem}.json').read_bytes() == (COMPAT / f'new-{stem}.json').read_bytes()
    m42 = next(a for a in manifest['entries'] if a['objectRef'] == 'M:42')
    png_review = []
    for level, asset in m42['levels'].items():
        path = admit(ROOT / 'workers/miniapp-api/assets/deep-sky' / asset['file'])
        assert binding(path)['sha256'] == asset['sha256'] and binding(path)['bytes'] == asset['bytes']
        with Image.open(path) as image:
            image.load()
            assert image.format == 'PNG' and image.size == (asset['pixels'], asset['pixels'])
            alpha = np.array(image.convert('RGBA'))[:, :, 3]
            assert int((alpha == 0).sum()) == asset['sourceFiniteMask']['missingPixels']
            assert int((alpha == 255).sum()) == asset['sourceFiniteMask']['finitePixels']
        png_review.append({'level': level, 'binding': binding(path), 'actualDecodeMaskCountsMatch': True})
    # Recheck actual retained assets/previous generations using frozen receipts.
    for record in result['oldAssetsBefore'] + result['preservedBefore']:
        admit(ROOT / record['path'], record)
    unknown_profiles = [{'level': p['level'], 'sourceOrder': p['sourceOrder'], 'tiles': p['tiles']}
                        for p in all_plan['profiles'] if p['level'] != 'DETAIL']
    assert sum(len(p['tiles']) for p in unknown_profiles) == 9
    admit(Path(__file__).resolve())
    OUT.mkdir()
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    np.save(OUT / 'independent-detail-science.npy', independently_sampled, allow_pickle=False)
    np.save(OUT / 'independent-detail-availability.npy', independent_finite, allow_pickle=False)
    np.save(OUT / 'independent-detail-lookup.npy', direct_lookup, allow_pickle=False)
    write('dark-region-diagnostics.json', diagnostics)
    write('bounded-mutations.json', mutations)
    selected_tests = [
        'test_fresh_sampling_needs_no_display_receipt_and_preserves_actual_zero_negative_and_nonfinite',
        'test_fresh_sampling_checks_entire_actual_demand_before_any_scientific_array_is_read',
        'test_fresh_sampling_rejects_wrong_receipt_bytes_and_canonical_identity',
        'test_fresh_sampling_rejects_properties_lookup_and_geometry_mismatch',
        'test_fresh_sampling_locator_cannot_escape_the_declared_cache_root']
    tested = subprocess.run([sys.executable, '-m', 'unittest', *[
        'test_publish_allwise_w3.PublicationCoverageTest.' + name for name in selected_tests]],
        cwd=ROOT / 'data-pipelines/deep-sky', capture_output=True, text=True, timeout=30,
        env={**os.environ, 'PYTHONPATH': str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')})
    (OUT / 'focused-tests.txt').write_text(tested.stdout + tested.stderr, encoding='utf8')
    assert tested.returncode == 0
    assert all(binding(ROOT / path) == expected for path, expected in inputs.items())
    report = {'scope': 'Independent real M82 DETAIL raw-source scientific/finite sampling review; no display PNG, runtime, adoption or source request.',
              'frozenOwner': binding(owner), 'freshResult': binding(FRESH / 'result.json'),
              'freshBinding': binding(FRESH / 'binding.json'), 'allInputsBoundAndUnchanged': True,
              'independentMechanisms': ['Raw big-endian FITS scalar decode plus full Astropy primary byte comparison',
                  'Analytic inverse TAN, one-based CRPIX256 with FITS-row reversal',
                  'Bounded north-polar HEALPix NESTED closed formula, independent bit interleave',
                  'Every target scalar and availability bit compared with actual frozen outputs'],
              'lookupSha256': lookup_hash, 'astropyWorldSha256': world_hash, 'directTANMaxComponentErrorDegrees': world_error,
              'allScalarBytesEqualIncludingSelectedNaNPayload': True, 'allAvailabilityBitsEqual': True,
              'finitePixels': int(availability.sum()), 'nonfinitePixels': int((~availability).sum()),
              'zeroPixels': int((availability & (science == 0)).sum()), 'negativeFinitePixels': int((availability & (science < 0)).sum()),
              'contributions': contributions, 'scienceUnit': 'UNKNOWN_NO_BUNIT',
              'scientificQuality': 'UNVERIFIED_NO_ARTIFACT_MASK', 'rawSourceBytes': sum(a['bytes'] for a in raw_bindings),
              'coreNearBlack': region_stats(core_dark), 'peripheralNearBlack': region_stats(peripheral_dark),
              'compatibilitySavedOldNewMetadataAndQCBytesEqual': True, 'm42ActualPublishedPNGDecode': png_review,
              'compatibilityScope': 'Read actual old/new saved M42 full metadata/QC and author bindings; no repeat owner source rendering. The saved author outputs are not independent generation.',
              'focusedTests': selected_tests, 'focusedTestExit': tested.returncode,
              'focusedTestScope': 'Five affected production regressions, real FITS fixture with mocked coordinate lookup. Actual six sources contain no finite zero/negative; general semantics are covered only by controlled fixture.',
              'boundedMutations': mutations, 'retainedAssetsRechecked': len(result['oldAssetsBefore']),
              'sixPreservedFilesUnchanged': True, 'unacquiredOtherLevelInputs': unknown_profiles,
              'limits': ['Whole DETAIL complete required source admission is distinct from missing selected nonfinite samples.',
                         'Finite intensity is not scientific validity or artifact-free/depth/PSF quality.',
                         'Old JPEG core black pixels are finite here, not the 19 NaN targets; original CDS interpolation and precise pixel origin remain unknown.',
                         'Nearest selected cells and the declared WCS are verified; no absolute astrometry or optical/natural-color acceptance.',
                         'No expected/repaired PNG, publication, native/mobile/server capacity or performance claims.']}
    write('review.json', report)
    outputs = [binding(p) for p in sorted(OUT.rglob('*')) if p.is_file()]
    write('binding.json', {'inputs': list(inputs.values()), 'outputs': outputs})
    print(json.dumps({'review': binding(OUT / 'review.json'), 'binding': binding(OUT / 'binding.json'),
                      'finite': report['finitePixels'], 'nonfinite': report['nonfinitePixels'],
                      'core': report['coreNearBlack'], 'peripheral': report['peripheralNearBlack'],
                      'mutation': mutations, 'testExit': tested.returncode}))


if __name__ == '__main__':
    main()
