"""Attribute saved M82 boundary patches to actual contributing native flags.

Flag-clean alternatives here are possibilities only: native noise, full common
apertures, epoch and recovery must be admitted before any display replacement.
"""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
SCIENCE = ROOT / 'output/sdss-m82-first-science-master-1004-r2'
DISPLAY = ROOT / 'output/sdss-m82-shared-adaptive-display-1004-r1'
READBACK = ROOT / 'output/sdss-m82-shared-adaptive-readback-1004-r1'
OUT = ROOT / 'output/sdss-m82-display-boundary-flags-1004-r1'
sys.path[:0] = [str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'), str(ROOT / 'data-pipelines/deep-sky')]
import numpy as np
from astropy.io.fits import Header
from astropy.wcs import WCS
from sdss_gri_tan import target_tan
from sdss_frame_quality import PixelFlags
from sdss_noise_display import REJECT_PROCESSING_BITS


def bind(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': h.hexdigest()}


def main():
    assert not OUT.exists()
    OUT.mkdir(); (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    result_path = DISPLAY / 'result.json'
    result = json.loads(result_path.read_bytes())
    paths = [Path(__file__), result_path, READBACK / 'result.json', SCIENCE / 'display-qualification.npz',
             ROOT / 'output/sdss-m82-fpm-frame-intersection-1004-r1/result-r2.json']
    for name in ('scienceCandidate', 'candidate'):
        path = ROOT / result[name]['path']; assert bind(path) == result[name]; paths.append(path)
    bindings = {path: bind(path) for path in paths}
    science = json.loads((ROOT / result['scienceCandidate']['path']).read_bytes())
    display = json.loads((ROOT / result['candidate']['path']).read_bytes())
    readback = json.loads((READBACK / 'result.json').read_bytes())
    assert readback['producerResult'] == bind(result_path)
    with np.load(SCIENCE / 'display-qualification.npz', allow_pickle=False) as archive:
        eligible = archive['eligible']
    def array(meta, directory):
        path = directory / meta['file']; p = bind(path)
        assert (p['bytes'], p['sha256']) == (meta['bytes'], meta['sha256'])
        paths.append(path); bindings[path] = p
        return np.load(path, mmap_mode='r', allow_pickle=False)
    radius = array(display['arrays']['radius'], DISPLAY / 'candidate')
    masks = json.loads(paths[4].read_bytes())
    target = target_tan(science['center'], science['pixels'], science['fieldDegrees'])
    patches = readback['patches']; working = []; facts = []
    for patch in patches:
        x0, y0, x1, y1 = patch['boundsXYExclusive']; region = slice(y0, y1), slice(x0, x1)
        y, x = np.mgrid[region]; ra, dec = target.all_pix2world(x, science['pixels'] - 1 - y, 0)
        working.append({'ra': ra, 'dec': dec, 'region': region, 'badByField': {}, 'cleanByField': {}, 'details': []})
    runs = {}
    for field in science['mosaic']['fields']:
        key = field['fieldKey']; runs[key] = field['identity']['run'] if 'identity' in field else field['perBand']['g']['sourceReceipt']['identity']['run']
        meta = science['mosaic']['diagnostics'][key]
        weight = array(meta['normalized-weight'], SCIENCE / 'candidate')
        active = [weight[patch['region']] > 0 for patch in working]
        bad = [np.zeros(a.shape, bool) for a in active]
        for band in 'gri':
            receipt = field['perBand'][band]['sourceReceipt']; identity = receipt['identity']
            mask = next(value for value in masks['fpMInputs'] if value['identity'] == identity)
            admission_path = ROOT / mask['currentAdmission']['path']; flag_path = ROOT / mask['flags']['path']
            assert bind(admission_path) == mask['currentAdmission'] and bind(flag_path) == mask['flags']
            paths.extend([admission_path, flag_path])
            bindings[admission_path] = mask['currentAdmission']; bindings[flag_path] = mask['flags']
            admitted = json.loads(admission_path.read_bytes())
            header = Header.fromstring(receipt['wcs']['primaryHeaderFitsCards'], sep='\n')
            assert admitted['expectedIdentity'] == identity and admitted['actualPrimaryIdentity']['PS_ID'] == header['PS_ID']
            with np.load(flag_path, allow_pickle=False) as archive:
                native = archive['flags']
            flags = PixelFlags(native, None, admitted); wcs = WCS(header, naxis=2)
            for index, patch in enumerate(working):
                sx, sy = wcs.all_world2pix(patch['ra'], patch['dec'], 0)
                sampled = flags.stencil(sx, sy)
                rejected = active[index] & (~sampled.geometry | ((sampled.flags & REJECT_PROCESSING_BITS) != 0))
                bad[index] |= rejected
                plane_counts = {p['name']: int(np.count_nonzero(active[index] & ((sampled.flags & (1 << p['plane'])) != 0)))
                                for p in admitted['pixelFlags']['planes'] if REJECT_PROCESSING_BITS & (1 << p['plane'])}
                patch['details'].append({'fieldKey': key, 'run': runs[key], 'band': band,
                    'activeContributors': int(active[index].sum()), 'rejectedContributors': int(rejected.sum()), 'rejectPlanePixels': plane_counts})
        for index, patch in enumerate(working):
            patch['badByField'][key] = bad[index]
            patch['cleanByField'][key] = active[index] & ~bad[index]
    before = [bindings[path] for path in dict.fromkeys(paths)]
    for saved, patch in zip(patches, working):
        region = patch['region']; failed_flags = np.logical_or.reduce(list(patch['badByField'].values()))
        assert not np.any(eligible[region] & failed_flags)
        possible = np.zeros(failed_flags.shape, bool)
        for bad_key, rejected in patch['badByField'].items():
            for clean_key, clean in patch['cleanByField'].items():
                if runs[bad_key] != runs[clean_key]:
                    possible |= rejected & clean
        np.savez_compressed(OUT / (saved['name'] + '-diagnostics.npz'),
            sourceEligible=eligible[region], rejectedNativeFlags=failed_flags,
            otherRunFlagCleanPossible=possible, savedRadius=radius[region])
        facts.append({'name': saved['name'], 'boundsXYExclusive': saved['boundsXYExclusive'],
            'centers': int(failed_flags.size), 'sourceUnqualified': int((~eligible[region]).sum()),
            'unqualifiedWithRejectedContributingNativeFlags': int(failed_flags.sum()),
            'unqualifiedWithoutRejectFlagReasonUnresolved': int((~eligible[region] & ~failed_flags).sum()),
            'radiusNegativeOriginal': int((radius[region] < 0).sum()),
            'flagRejectedWithDifferentRunFlagCleanPossible': int(possible.sum()), 'fieldsAndBands': patch['details']})
    after = [bind(ROOT / pin['path']) for pin in before]; assert after == before
    report = {'scope': __doc__, 'producerResult': bind(result_path), 'savedReadback': bind(READBACK / 'result.json'),
        'inputsBefore': before, 'inputsAfterExact': True, 'patches': facts,
        'alternativeMeaning': 'Actual positive common-weight different-RUN contributions with clean gri reject flags only; not noise/common-aperture/epoch/recovery admission or independent exposure/systematics.',
        'sourceRequests': 0, 'nativeFlagMatrixRebuilds': 0, 'wholeProjectionOrFilterOrCoaddRuns': 0,
        'candidateChanges': 0, 'quality': 'FAILED_VISIBLE_QUALIFICATION_GRAIN_STRIPES_FULL_QUALITY_OPEN',
        'ordinaryAdoption': False, 'independentReview': 'MISSING'}
    (OUT / 'result.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'patches': [{k: v for k, v in p.items() if k != 'fieldsAndBands'} for p in facts]}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        if OUT.exists():
            (OUT / 'failed.json').write_text(json.dumps({'type': type(error).__name__, 'error': str(error)}) + '\n')
        raise
