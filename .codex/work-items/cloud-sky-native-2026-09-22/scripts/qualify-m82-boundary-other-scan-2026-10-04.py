"""Actual M82 native-noise/full-RUN/epoch qualification at saved boundary patches.

Reuse current projection/noise/flags admission. No filtering, coadd rebuilding,
new acquisition or application of possible supply to a saved display candidate.
"""
from pathlib import Path
import importlib.util
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
SCIENCE = ROOT / 'output/sdss-m82-first-science-master-1004-r2'
DISPLAY = ROOT / 'output/sdss-m82-shared-adaptive-display-1004-r1'
DIAG = ROOT / 'output/sdss-m82-display-boundary-flags-1004-r1'
OUT = ROOT / 'output/sdss-m82-boundary-other-scan-qualification-1004-r1'
spec = importlib.util.spec_from_file_location('producer', TASK / 'scripts/experience-m82-shared-adaptive-display-2026-10-04.py')
producer = importlib.util.module_from_spec(spec); spec.loader.exec_module(producer)
np, bind, save = producer.np, producer.bind, producer.save
from sdss_noise_display import _project_field, REJECT_PROCESSING_BITS


def main():
    assert not OUT.exists()
    OUT.mkdir(); (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    inputs = {}
    def pin(path, expected=None):
        actual = bind(path)
        if expected is not None:
            assert actual == expected
        prior = inputs.setdefault(actual['path'], actual); assert prior == actual
        return actual
    def document(path, expected=None):
        pin(path, expected); return json.loads(path.read_bytes())
    result = document(DISPLAY / 'result.json')
    science_path = ROOT / result['scienceCandidate']['path']
    science = document(science_path, result['scienceCandidate'])
    candidate_path = ROOT / result['candidate']['path']
    candidate = document(candidate_path, result['candidate'])
    diagnosis = document(DIAG / 'result.json')
    assert diagnosis['producerResult'] == pin(DISPLAY / 'result.json')
    for path in (Path(__file__), Path(producer.__file__), Path(producer.previous.__file__)):
        pin(path)
    for name in ('sdss_noise_display.py', 'sdss_frame_noise.py', 'sdss_corrected_frame.py',
                 'sdss_frame_quality.py', 'sdss_source_stencil.py', 'sdss_gri_tan.py', 'sdss_display_recovery.py'):
        path = ROOT / 'data-pipelines/deep-sky' / name
        pin(path); (OUT / ('executed-' + name)).write_bytes(path.read_bytes())
    def array(meta, directory):
        path = directory / meta['file']; actual = pin(path)
        assert (actual['bytes'], actual['sha256']) == (meta['bytes'], meta['sha256'])
        value = np.load(path, mmap_mode='r', allow_pickle=False)
        assert list(value.shape) == meta['shape'] and value.dtype.str == meta['dtype']
        return value
    qualified = array(candidate['arrays']['qualified'], candidate_path.parent)
    joint = array(science['arrays']['joint-availability'], science_path.parent)
    masks = document(ROOT / 'output/sdss-m82-fpm-frame-intersection-1004-r1/result-r2.json')
    camera_receipt = document(ROOT / 'output/sdss-m82-quality-inputs-1004-r1/camera-receipt.json')
    camera_csv = ROOT / camera_receipt['raw']['path']; pin(camera_csv, camera_receipt['raw'])
    fields, weights, sources, dates, groups = {}, {}, {}, {}, {}
    for field in science['mosaic']['fields']:
        key = field['fieldKey']; diagnostic = science['mosaic']['diagnostics'][key]
        weights[key] = array(diagnostic['normalized-weight'], science_path.parent)
        fields[key] = {band: producer.ProjectedBand(array(diagnostic[band + '-science'], science_path.parent),
            array(diagnostic[band + '-footprint'], science_path.parent),
            array(diagnostic[band + '-finite-neighbors'], science_path.parent), field['perBand'][band]) for band in 'gri'}
        sources[key] = {}
        run = field['perBand']['g']['sourceReceipt']['identity']['run']
        groups.setdefault(run, []).append(key); dates.setdefault(run, [])
        for band in 'gri':
            receipt = field['perBand'][band]['sourceReceipt']; raw, identity = receipt['source'], receipt['identity']
            path = Path(raw['path']); actual = pin(path)
            assert (actual['sha256'], actual['bytes']) == (raw['sha256'], raw['bytes'])
            frame = producer.read_cached_frame(path, identity | {name: raw[name] for name in ('bytes', 'sha256', 'sourceUrl')},
                max_uncompressed_bytes=32 * 1024 * 1024)
            assert frame.receipt == receipt and identity['run'] == run
            mask = next(value for value in masks['fpMInputs'] if value['identity'] == identity)
            admitted = document(ROOT / mask['currentAdmission']['path'], mask['currentAdmission'])
            pin(ROOT / mask['flags']['path'], mask['flags'])
            with np.load(ROOT / mask['flags']['path'], allow_pickle=False) as archive:
                native_flags = archive['flags']
            native_flags.setflags(write=False)
            camera = producer.read_cached_field_noise(camera_csv, camera_receipt, identity)
            sources[key][band] = producer.NoiseDisplaySource(frame, camera, producer.PixelFlags(native_flags, None, admitted))
            date = frame.receipt.get('asTrans', {}).get('row', {}).get('MJD')
            dates[run].append(date if isinstance(date, (int, float)) and not isinstance(date, bool) and math.isfinite(date) else None)
    ranges = {run: (min(values), max(values)) for run, values in dates.items() if None not in values}
    def distinct(a, b):
        return a != b and a in ranges and b in ranges and (ranges[a][1] < ranges[b][0] or ranges[b][1] < ranges[a][0])
    target = producer.target_tan(science['center'], science['pixels'], science['fieldDegrees'])
    records = []
    for patch in diagnosis['patches']:
        x0, y0, x1, y1 = patch['boundsXYExclusive']; region = slice(y0, y1), slice(x0, x1)
        y, x = np.mgrid[region]; ra, dec = target.all_pix2world(x, science['pixels'] - 1 - y, 0)
        old_path = DIAG / (patch['name'] + '-diagnostics.npz'); pin(old_path)
        with np.load(old_path, allow_pickle=False) as archive:
            original_possible = archive['otherRunFlagCleanPossible']; source_eligible = archive['sourceEligible']
        assert np.array_equal(source_eligible, qualified[region])
        observations = {}; per_field = []
        for run, names in groups.items():
            weight = np.zeros(x.shape, np.float64); numerator = np.zeros((3, *x.shape), np.float64)
            known = np.ones(x.shape, bool); bad = np.zeros(x.shape, bool)
            for name in names:
                w = weights[name][region]
                if not w.any():
                    continue
                stencil, actual_qualified = _project_field(sources[name], fields[name], w, region, ra, dec)
                del stencil
                known &= actual_qualified; weight += w
                actual_bad = np.zeros(x.shape, bool)
                for index, band in enumerate('gri'):
                    source = sources[name][band]
                    numerator[index] += np.where(w > 0, fields[name][band].data[region], 0).astype(np.float64) * w
                    assert source.frame.header['PS_ID'] == source.flags.receipt['actualPrimaryIdentity']['PS_ID']
                    sx, sy = source.frame.wcs.all_world2pix(ra, dec, 0); flag = source.flags.stencil(sx, sy)
                    actual_bad |= (w > 0) & flag.geometry & ((flag.flags & REJECT_PROCESSING_BITS) != 0)
                bad |= actual_bad
                per_field.append({'fieldKey': name, 'run': run, 'positive': int((w > 0).sum()),
                    'knownQualified': int(((w > 0) & actual_qualified).sum()), 'knownBadFlags': int(actual_bad.sum())})
            observations[run] = {'weight': weight, 'numerator': numerator, 'known': known & (weight > 0), 'bad': bad}
        possible = np.zeros(x.shape, bool); supply = np.zeros(x.shape, bool)
        total = np.zeros(x.shape, np.float64); numerator = np.zeros((3, *x.shape), np.float64); run_counts = {}
        for run, observation in observations.items():
            bad_other = np.zeros(x.shape, bool)
            for other, value in observations.items():
                if distinct(run, other): bad_other |= value['bad']
            flag_only = ~qualified[region] & joint[region] & (observation['weight'] > 0) & ~observation['bad'] & bad_other
            chosen = flag_only & observation['known']; possible |= flag_only; supply |= chosen
            total += np.where(chosen, observation['weight'], 0)
            numerator += np.where(chosen[None], observation['numerator'], 0)
            run_counts[str(run)] = int(chosen.sum())
        assert not np.any(possible & ~original_possible) and not np.any(supply & qualified[region])
        values = np.divide(numerator, total[None], out=np.full_like(numerator, np.nan), where=total[None] > 0).astype(np.float32)
        assert np.isfinite(values[:, supply]).all()
        np.savez_compressed(OUT / (patch['name'] + '-qualification.npz'),
            flagOnlyFullRunAndDisjointEpoch=possible, nativeQualifiedSupply=supply, conditionalAlternativeGri=values)
        records.append({'name': patch['name'], 'boundsXYExclusive': patch['boundsXYExclusive'],
            'previousPerFieldFlagCleanPossible': int(original_possible.sum()),
            'wholeRunFlagsAndDisjointEpochPossible': int(possible.sum()), 'nativeQualifiedSupply': int(supply.sum()),
            'flagOnlyRejectedByNativeQualification': int((possible & ~supply).sum()),
            'chosenByRun': run_counts, 'actualFields': per_field,
            'meaning': 'Signed alternative raw-source common-weight means only where this diagnostic admits complete per-target gri source/noise/flags. Not filtered aperture noise/confidence or applied recovery.'})
    before = list(inputs.values()); after = [bind(ROOT / value['path']) for value in before]; assert before == after
    report = {'scope': __doc__, 'parentResult': pin(DISPLAY / 'result.json'), 'diagnosis': pin(DIAG / 'result.json'),
        'actualScanMjdValues': {str(run): values for run, values in dates.items()},
        'actualScanMjdRanges': {str(run): list(values) for run, values in ranges.items()},
        'unknownScanDates': [run for run in groups if run not in ranges], 'patches': records,
        'inputsBefore': before, 'inputsAfterExact': True,
        'sharedProjectionMeaning': 'Actual four-neighbour raw science equality, calibrated SKY/camera native variance availability and associated native flags; all positive contributors within a RUN required. No PSF/absolute astrometry/full quality certification.',
        'sourceRequests': 0, 'nativeFlagMatrixRebuilds': 0, 'wholeProjectionOrFilterOrCoaddRuns': 0,
        'savedCandidateChanges': 0, 'ordinaryAdoption': False, 'quality': 'UNVERIFIED', 'independentReview': 'MISSING'}
    save(OUT / 'result.json', report)
    print(json.dumps({'mjdRanges': report['actualScanMjdRanges'], 'patches': [{k: v for k, v in item.items() if k != 'actualFields'} for item in records]}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        if OUT.exists():
            save(OUT / 'failed.json', {'type': type(error).__name__, 'error': str(error)})
        raise
