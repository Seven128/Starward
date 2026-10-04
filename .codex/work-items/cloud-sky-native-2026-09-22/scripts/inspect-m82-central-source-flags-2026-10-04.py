"""Read real central source flags/flux, without interpreting display colour."""
from pathlib import Path
import importlib.util
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OUT = ROOT / 'output/sdss-m82-fpm-frame-intersection-1004-r1'
spec = importlib.util.spec_from_file_location('saved', TASK / 'scripts/readback-m82-fpm-frame-intersection-2026-10-04.py')
saved = importlib.util.module_from_spec(spec)
spec.loader.exec_module(saved)
np, bind = saved.np, saved.bind
from sdss_corrected_frame import read_cached_band_set
from sdss_frame_quality import PixelFlags
from sdss_gri_tan import target_tan
from sdss_source_stencil import bilinear_source_samples


def main():
    assert not (OUT / 'central-source-flags.json').exists()
    gi = json.loads((ROOT / 'output/sdss-m82-gi-support-1004-r1/result.json').read_bytes())
    masks = json.loads((OUT / 'result-r2.json').read_bytes())
    field = next(f for f in gi['fields'] if f['identity']['run'] == 4264 and f['identity']['field'] == 261)
    frames = read_cached_band_set(ROOT, field['sourceRecords'], ('g', 'r', 'i'), max_uncompressed_bytes=32 * 1024 * 1024)
    n = gi['targetShape'][0]
    yy, xx = np.mgrid[992:1056, 992:1056]
    target = target_tan(gi['targetCenter'], n, gi['fieldDegrees'])
    world = target.all_pix2world(np.stack([xx.ravel(), n - 1 - yy.ravel()], axis=1), 0)
    arrays, report = {}, []
    for record, frame in zip(field['sourceRecords'], frames):
        band = record['band']
        mask = next(p for p in masks['fpMInputs'] if p['identity'] == {**field['identity'], 'band': band})
        for pin in [mask['flags'], mask['currentAdmission']]:
            assert bind(ROOT / pin['path']) == pin
        receipt = json.loads((ROOT / mask['currentAdmission']['path']).read_bytes())
        with np.load(ROOT / mask['flags']['path'], allow_pickle=False) as f:
            flags = f['flags']
        source_xy = frame.wcs.all_world2pix(world, 0)
        sx, sy = source_xy[:, 0], source_xy[:, 1]
        flux, geometry, finite = bilinear_source_samples(frame.data, sx, sy)
        flag = PixelFlags(flags, None, {}).stencil(sx, sy)
        assert geometry.all() and finite.all() and flag.geometry.all()
        # Direct source address OR verifies the actual consumer's four-pixel effect.
        x0, y0 = np.floor(sx).astype(int), np.floor(sy).astype(int)
        direct = flags[y0, x0] | flags[y0, x0 + 1] | flags[y0 + 1, x0] | flags[y0 + 1, x0 + 1]
        assert np.array_equal(direct, flag.flags)
        arrays.update({band + '_flux': flux.reshape(64, 64), band + '_flags': flag.flags.reshape(64, 64),
                       band + '_native_xy': source_xy})
        report.append({'band': band, 'source': record, 'mask': mask['currentAdmission'],
            'finiteFullFourNeighbourPixels': int(finite.sum()), 'unit': 'nMgy/pixel',
            'minimum': float(flux.min()), 'maximum': float(flux.max()), 'median': float(np.median(flux)),
            'fourNeighbourFlags': {p['name']: int(np.count_nonzero(flag.flags & (1 << p['plane']))) for p in receipt['pixelFlags']['planes']},
            'directFlagAddressOrExact': True})
    np.savez_compressed(OUT / 'central-source-flags.npz', **arrays)
    (OUT / 'executed-central-inspection.py').write_bytes(Path(__file__).read_bytes())
    result = {'scope': 'Central 64x64 only, linear-TAN approximation; source flags are not complete quality or absolute astrometry',
        'field': field['identity'], 'bands': report, 'savedSamples': bind(OUT / 'central-source-flags.npz'),
        'producer': bind(Path(__file__)), 'ordinaryAdoption': False, 'scientificQuality': 'UNVERIFIED',
        'independentReview': 'MISSING', 'newScienceOrDisplayProcessing': False}
    (OUT / 'central-source-flags.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
