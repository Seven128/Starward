"""Bounded wider-source geometry/colour trial, not production admission.

Reuse both Hubble masters unchanged. Only the two newly downloaded NOIRLab
observations are projected. Original JPEG/XMP are not repaired or masked.
"""
from pathlib import Path
from dataclasses import asdict
import hashlib
import importlib.util
import json
import math
import sys
import time
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
PIPE = ROOT / 'data-pipelines/deep-sky'
SRC = ROOT / 'output/noirlab-prepared-wide-source-1004-r1'
OUT = ROOT / 'output/noirlab-prepared-wide-quality-1004-r1'
sys.path[:0] = [str(PIPE), str(ROOT / 'output/pyavm-metadata-trial-1002-r1/lib'),
               str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image
import prepared_rgb_observation as owner
from prepared_rgb_tan import build_prepared_rgb_tan_master, prepared_rgb_tan_products
from sdss_gri_tan import target_tan

def bind(p):
    b = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}

def save(name, value):
    with (OUT / name).open('x', encoding='utf-8') as f:
        json.dump(value, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write('\n')

def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    # Browser read the actual related-release link first. Save that exact page
    # once to bind the otherwise absent M51 filter explanation.
    spec = importlib.util.spec_from_file_location('source_fetch', TASK / 'scripts/acquire-hubble-m82-prepared-2026-10-04.py')
    fetcher = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(fetcher)
    fetcher.OUT = SRC
    fetcher.fetch('noao1309-release.html', 'https://noirlab.edu/public/news/noao1309/', 1024 * 1024)
    rows = json.loads((SRC / 'source-identities-and-avm.json').read_bytes())
    cases = [
        (rows[0], 'M:82', ROOT / 'workers/miniapp-api/assets/deep-sky/sdss-m82/manifest.json',
         ROOT / 'output/hubble-m82-prepared-coverage-1004-r1', 'master-rgba.npy', 'overview.png'),
        (rows[1], 'M:51', ROOT / 'workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json',
         ROOT / 'output/hubble-m51-nominal-projection-trial-1002-r1', 'nominal-registered-display-master.npy', 'M-51-overview-nominal-avm.png'),
    ]
    inputs = [Path(__file__), SRC / 'source-identities-and-avm.json', SRC / 'rights-page.html', SRC / 'noao1309-release.html']
    inputs += [PIPE / n for n in ['prepared_rgb_observation.py', 'prepared_rgb_tan.py', 'sdss_source_stencil.py', 'sdss_gri_tan.py']]
    for row, _ref, descriptor, old, master_file, ov_file in cases:
        inputs += [ROOT / row['image']['path'], ROOT / row['embeddedXmp']['path'],
                   SRC / (row['resourceId'] + '-task-parser-xmp.xml'),
                   SRC / (row['resourceId'] + '-source-page.html'), descriptor, old / master_file, old / ov_file]
    protected = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    inputs += [ROOT / r['path'] for r in protected]
    before = [bind(p) for p in inputs]
    save('inputs-before.json', before)
    results = []
    for row, ref, descriptor, old, master_file, ov_file in cases:
        started, cpu = time.perf_counter(), time.process_time()
        rid = row['resourceId']
        image_path, raw_xmp = ROOT / row['image']['path'], ROOT / row['embeddedXmp']['path']
        parser_copy = (SRC / (rid + '-task-parser-xmp.xml')).read_bytes()
        raw = raw_xmp.read_bytes()
        colour = row['colourMeaning'] if ref == 'M:82' else (
            'WIYN 3.5m ODI May 2013 published blue/green/red-filter composite; exact filter names not supplied by the linked release or AVM. Encoded RGB, not SDSS gri or calibrated flux.')
        source = owner.PreparedRgbSource(rid,
            owner.ByteIdentity(row['image']['bytes'], row['image']['sha256']),
            owner.ByteIdentity(row['embeddedXmp']['bytes'], row['embeddedXmp']['sha256']),
            row['imageUrl'], row['metadata']['ReferenceURL'], row['pageCredit'], row['metadata']['Rights'],
            'https://creativecommons.org/licenses/by/4.0/', 'https://noirlab.edu/public/copyright/', colour)
        def task_parser(value):
            assert value == raw
            return parser_copy, True
        # This is the one explicitly declared adapter gap. All identity,
        # geometry, decode and source checks otherwise use the current owner.
        with patch.object(owner, '_parser_xml', task_parser):
            obs = owner.load_prepared_rgb_observation(image_path, raw_xmp, source,
                max_encoded_bytes=2 * 1024 * 1024, max_decoded_pixels=4000 * 4000)
        desc = json.loads(descriptor.read_bytes())
        field = desc['levels']['OVERVIEW']['fieldDegrees']
        center = desc['center']
        master = build_prepared_rgb_tan_master(obs, object_ref=ref, center=center,
            pixels=2048, field_degrees=field, chunk_rows=64)
        case_dir = OUT / rid
        case_dir.mkdir()
        np.save(case_dir / 'master-rgba.npy', master.rgba_top_first, allow_pickle=False)
        with (case_dir / 'master.json').open('x', encoding='utf-8') as f:
            json.dump(master.metadata(), f, ensure_ascii=False, indent=2, allow_nan=False)
        products = prepared_rgb_tan_products(master)
        levels = []
        for product in products:
            p = case_dir / (product.level.lower() + '.png')
            p.write_bytes(product.png_bytes)
            with Image.open(p) as decoded:
                assert decoded.convert('RGBA').tobytes() == product.rgba_bytes
            a = product.rgba_top_first
            meta = product.metadata()
            meta['file'] = p.relative_to(ROOT).as_posix()
            meta['geometricSupportFraction'] = product.geometric_source_master_support_pixels / product.total_source_master_crop_pixels
            edge = np.concatenate([a[0, :, :], a[-1, :, :], a[1:-1, 0, :], a[1:-1, -1, :]])
            meta['opaqueEdgeFraction'] = float(np.mean(edge[:, 3] == 255))
            meta['encodedEdgeRgbPercentiles'] = np.percentile(edge[:, :3], [5, 50, 95], axis=0).tolist()
            # Nominal native-pixel span is sampling density, not optical PSF.
            meta['approximateSourcePixelsAcrossField'] = product.field_degrees / np.abs(obs.geometry.cdelt).tolist()[0]
            levels.append(meta)
        wcs = obs.geometry.new_wcs()
        w, h = obs.geometry.decoded_shape_width_height
        catalogue_xy = wcs.all_world2pix([[center['raDeg'], center['decDeg']]], 0)[0]
        footprint = wcs.all_pix2world([[0, 0], [w-1, 0], [w-1, h-1], [0, h-1]], 0)
        target = target_tan(center, 2048, field)
        test_pixels = np.array([[0, 0], [2047, 0], [2047, 2047], [0, 2047], [1023.5, 1023.5]])
        worlds = target.all_pix2world(test_pixels, 0)
        source_pixels = wcs.all_world2pix(worlds, 0)
        errors = np.abs(wcs.all_pix2world(source_pixels, 0) - worlds)
        assert float(errors.max()) < 1e-10
        old_master = np.load(old / master_file, mmap_mode='r', allow_pickle=False)
        assert old_master.shape == master.rgba_top_first.shape
        current = master.rgba_top_first
        shared = (current[:, :, 3] == 255) & (old_master[:, :, 3] == 255)
        # Descriptive only: two differently published encoded colours are not
        # linear radiometry and this statistic is not a fusion calibration.
        delta = current[:, :, :3][shared].astype(np.int16) - old_master[:, :, :3][shared].astype(np.int16)
        comparison = {'commonOpaquePixels': int(shared.sum()),
                      'encodedRgbDifferencePercentiles': np.percentile(delta, [5, 50, 95], axis=0).tolist(),
                      'meaning': 'Descriptive encoded differences only; no colour correction or flux compatibility claimed.'}
        ov_new = np.array(Image.open(case_dir / 'overview.png').convert('RGBA'))
        ov_old = np.array(Image.open(old / ov_file).convert('RGBA'))
        assert ov_new.shape == ov_old.shape
        # Exact, separate labels live in result.json; comparison pixels have
        # no brightness adjustment. Transparent support is shown on black.
        comparison_png = np.concatenate([ov_old, ov_new], axis=1)
        Image.fromarray(comparison_png).save(case_dir / 'old-hubble-left-new-noirlab-right.png')
        results.append({'state': 'TASK_WCS_TRIAL_NOT_ADOPTED', 'objectRef': ref,
            'source': asdict(source), 'geometry': asdict(obs.geometry),
            'taskOnlyParserOverride': 'Exact empty Spatial.Notes removed in saved parser copy in addition to old empty Spectral.Notes; original bytes bound, production owner unchanged.',
            'sourceDimensions': [w, h], 'sourceNominalArcminutes': (np.array([w, h]) * np.abs(obs.geometry.cdelt) * 60).tolist(),
            'catalogueCentreSourceFitsXY': catalogue_xy.tolist(), 'sourceNominalFootprintRaDec': footprint.tolist(),
            'currentTargetFieldSourceFitsCornersAndCenter': source_pixels.tolist(),
            'nominalWcsRoundTripMaximumDegrees': float(errors.max()),
            'levels': levels, 'comparisonToUnchangedHubble': comparison,
            'jpegBytes': row['image']['bytes'], 'decodedSourceRgbBytes': len(obs.rgb_bytes),
            'elapsedSeconds': time.perf_counter()-started, 'cpuSeconds': time.process_time()-cpu,
            'registration': 'UNVERIFIED_APPROXIMATE_PUBLISHER_AVM',
            'scienceAvailability': 'UNKNOWN', 'scienceValidity': 'UNKNOWN',
            'imageQuality': 'UNVERIFIED', 'mixedSourcePublication': 'NOT_ATTEMPTED'})
    save('result.json', {'scope': __doc__, 'cases': results,
        'limits': ['Geometric support does not establish scientific coverage, blank pixels or astrometry.',
                  'No Hubble reprocessing; no generic feather, mask, additive blend or fusion.',
                  'No same-master identity claimed for different publications.',
                  'No registry adoption, Scene/native acceptance or deployment.']})
    after = [bind(p) for p in inputs]
    assert after == before
    assert all(bind(ROOT/r['path'])['sha256'] == r['sha256'] for r in protected)
    save('inputs-after.json', after)
    print(json.dumps([{'ref': c['objectRef'], 'centre': c['catalogueCentreSourceFitsXY'],
        'levels': [{'level': r['level'], 'coverage': r['geometricSupportFraction'], 'edgeOpaque': r['opaqueEdgeFraction'],
                    'nativeSpan': r['approximateSourcePixelsAcrossField'], 'bytes': r['bytes']} for r in c['levels']]} for c in results]))

if __name__ == '__main__':
    main()
