"""Bounded actual recovered-source coefficients and aperture covariance readback.

This diagnostic never filters a candidate or changes science/coverage. It uses
raw original samples plus actual admitted alternative samples, not estimates
already filtered by the adaptive parent. Cross-field uncertainty stays Cauchy
bounded and omitted sky/systematic/PSF terms remain omitted.
"""
from pathlib import Path
import importlib.util
import json
import math
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
GEN = ROOT / 'output/sdss-m82-current-adaptive-recovery-1004-r1'
QUAL = ROOT / 'output/sdss-m82-boundary-other-scan-qualification-1004-r1'
OUT = ROOT / 'output/sdss-m82-recovered-native-apertures-1004-r1'
spec = importlib.util.spec_from_file_location('previous', TASK / 'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py')
previous = importlib.util.module_from_spec(spec); spec.loader.exec_module(previous)
np, bind, save = previous.np, previous.bind, previous.save
from sdss_noise_display import _project_field, REJECT_PROCESSING_BITS, conditional_variance_upper
from sdss_noise_aperture import aperture_variance_upper
from sdss_adaptive_display import _display_support, _validate_adaptive_candidate
from sdss_display_recovery import OtherScanDisplay, _validate_recovery_candidate
from PIL import Image, ImageDraw


def dense_native_variance(stencils, selected):
    """Independent dictionary aggregation of physical native IDs, per field."""
    count = int(selected.sum()); field_values = []; records = []
    for name, stencil in stencils.items():
        values = []; repeated = []
        for band in range(3):
            ids = stencil['ids'][band][:, selected].ravel()
            coeff = stencil['weights'][band][:, selected].ravel() / count
            noise = stencil['native_variance'][band][:, selected].ravel()
            native = {}; active_count = 0
            for index, coefficient, variance in zip(ids, coeff, noise):
                if coefficient == 0: continue
                assert index >= 0 and math.isfinite(variance) and variance >= 0
                active_count += 1
                if int(index) not in native: native[int(index)] = [0., float(variance)]
                assert native[int(index)][1] == variance
                native[int(index)][0] += float(coefficient)
            values.append(math.fsum(coefficient ** 2 * variance for coefficient, variance in native.values()))
            repeated.append(active_count - len(native))
        field_values.append(values); records.append({'field': name, 'variance': values, 'repeatedNativeContributions': repeated})
    upper = [math.fsum(math.sqrt(row[band]) for row in field_values) ** 2 for band in range(3)]
    return np.array(upper), records


def full_cross(qualified):
    result = np.zeros(qualified.shape, bool)
    result[1:-1, 1:-1] = (qualified[1:-1, 1:-1] & qualified[:-2, 1:-1] & qualified[2:, 1:-1]
        & qualified[1:-1, :-2] & qualified[1:-1, 2:])
    return result


def main():
    assert not OUT.exists(); OUT.mkdir()
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    inputs = {}
    def pin(path, expected=None):
        actual = bind(path)
        if expected is not None: assert actual == expected
        prior = inputs.setdefault(actual['path'], actual); assert prior == actual
        return actual
    checkpoint_path = TASK / 'evidence/current-execution-state-2026-10-04-r80.json'
    pin(checkpoint_path); cp = json.loads(checkpoint_path.read_bytes())
    for item in cp['currentSources'] + cp['protected'] + cp['evidence']:
        assert bind(ROOT / item['path']) == item
    pin(Path(__file__)); pin(Path(previous.__file__))
    for name in ('sdss_display_recovery.py', 'sdss_adaptive_display.py', 'sdss_noise_display.py', 'sdss_noise_aperture.py',
                 'sdss_frame_noise.py', 'sdss_corrected_frame.py', 'sdss_frame_quality.py', 'sdss_source_stencil.py', 'sdss_gri_tan.py'):
        path = ROOT / 'data-pipelines/deep-sky' / name; pin(path)
        (OUT / ('executed-' + name)).write_bytes(path.read_bytes())
    current_path = GEN / 'result.json'; pin(current_path)
    current_result = json.loads(current_path.read_bytes())
    assert pin(current_path)['sha256'] == 'c66c353fe2b0504fc87bbd5c02e846d0e664097d2654bc10918a24a1975f509a'
    display_path = previous.DISPLAY / 'result.json'; pin(display_path)
    master, parent, sources = previous.load_saved_inputs(json.loads(display_path.read_bytes()), pin)
    saved_path = ROOT / current_result['candidate']['path']; pin(saved_path, current_result['candidate'])
    saved = json.loads(saved_path.read_bytes())
    def array(meta):
        path = saved_path.parent / meta['file']; actual = pin(path)
        assert (actual['bytes'], actual['sha256']) == (meta['bytes'], meta['sha256'])
        return np.load(path, mmap_mode='r', allow_pickle=False)
    recovery = OtherScanDisplay({b: array(saved['arrays'][b]) for b in 'gri'}, array(saved['arrays']['alternative-supply']), saved)
    _validate_adaptive_candidate(master, parent, master.report)
    _validate_recovery_candidate(master, recovery, master.report)
    assert saved['baselineDiagnosticCOrderSha256'] == parent.report['diagnosticCOrderSha256']
    assert saved['baselineEstimateCOrderSha256'] == parent.report['displayEstimatesCOrderSha256']
    qualification_path = QUAL / 'result.json'; pin(qualification_path)
    qualification = json.loads(qualification_path.read_bytes())
    fields, weights = master.mosaic_fields, master.mosaic_weights
    groups, dates = {}, {}
    for name in fields:
        run = sources[name]['g'].frame.receipt['identity']['run']; groups.setdefault(run, []).append(name); dates.setdefault(run, [])
        for source in sources[name].values():
            date = source.frame.receipt.get('asTrans', {}).get('row', {}).get('MJD')
            dates[run].append(date if isinstance(date, (int, float)) and not isinstance(date, bool) and math.isfinite(date) else None)
    ranges = {run: (min(values), max(values)) for run, values in dates.items() if None not in values}
    assert {str(k): list(v) for k, v in ranges.items()} == saved['scanMjdRanges']
    def distinct(a, b):
        return a != b and a in ranges and b in ranges and (ranges[a][1] < ranges[b][0] or ranges[b][1] < ranges[a][0])
    facts = []; max_arrays = 0; started = time.perf_counter(); cpu_started = time.process_time()
    sheet = Image.new('RGB', (768, 1450), '#181818'); draw = ImageDraw.Draw(sheet)
    draw.text((4, 4), 'Raw native support: BLUE strong / RED unavailable / YELLOW blocked / GREEN complete radius1', fill='white')
    for at, patch in enumerate(qualification['patches']):
        x0, y0, x1, y1 = patch['boundsXYExclusive']; region = slice(y0, y1), slice(x0, x1)
        y, x = np.mgrid[region]; ra, dec = master.target.all_pix2world(x, master.joint_available.shape[0] - 1 - y, 0)
        observations = {}; original_stencils = {}
        for run, names in groups.items():
            weight = np.zeros(x.shape, np.float64); numerator = np.zeros((3, *x.shape), np.float64)
            known = np.ones(x.shape, bool); bad = np.zeros(x.shape, bool)
            for name in names:
                w = weights[name][region]
                if not w.any(): continue
                stencil, qualified = _project_field(sources[name], fields[name], w, region, ra, dec)
                original_stencils[name] = stencil; known &= qualified; weight += w
                for band_at, band in enumerate('gri'):
                    source = sources[name][band]
                    numerator[band_at] += np.where(w > 0, fields[name][band].data[region], 0).astype(np.float64) * w
                    if (source.flags is not None and source.frame.header.get('PS_ID') is not None
                            and source.flags.receipt['actualPrimaryIdentity'].get('PS_ID') is not None):
                        sx, sy = source.frame.wcs.all_world2pix(ra, dec, 0); flags = source.flags.stencil(sx, sy)
                        bad |= (w > 0) & flags.geometry & ((flags.flags & REJECT_PROCESSING_BITS) != 0)
            observations[run] = {'weight': weight, 'numerator': numerator, 'known': known & (weight > 0), 'bad': bad}
        chosen = {}; total = np.zeros(x.shape, np.float64); numerator = np.zeros((3, *x.shape), np.float64)
        for run, observation in observations.items():
            bad_other = np.logical_or.reduce([z['bad'] for other, z in observations.items() if distinct(run, other)]) if any(distinct(run, other) for other in observations) else np.zeros(x.shape, bool)
            chosen[run] = (~parent.qualified[region] & master.joint_available[region] & (observation['weight'] > 0)
                & ~observation['bad'] & bad_other & observation['known'])
            total += np.where(chosen[run], observation['weight'], 0)
            numerator += np.where(chosen[run][None], observation['numerator'], 0)
        supply = total > 0; assert np.array_equal(supply, recovery.alternative_supply[region])
        values = np.stack([master.bands[b].data[region] for b in 'gri'])
        values[:, supply] = (numerator[:, supply] / total[supply]).astype(np.float32)
        assert np.array_equal(values[:, supply], np.stack([recovery.estimates[b][region][supply] for b in 'gri']))
        effective_weights = {}; stencils = {}; eligible = master.joint_available[region].copy()
        reconstructed = np.zeros_like(values, dtype=np.float64); absolute = np.zeros_like(reconstructed)
        wrong_original = np.zeros_like(reconstructed)
        for name, original in original_stencils.items():
            run = sources[name]['g'].frame.receipt['identity']['run']; w = weights[name][region].astype(np.float64)
            alternative = np.divide(w, total, out=np.zeros_like(w), where=chosen[run] & supply)
            effective = np.where(supply, alternative, w); effective_weights[name] = effective
            stencil, qualified = _project_field(sources[name], fields[name], effective, region, ra, dec)
            assert np.array_equal(stencil['ids'], original['ids'])
            active = effective > 0
            assert np.array_equal(stencil['native_variance'][:, :, active], original['native_variance'][:, :, active], equal_nan=True)
            assert not stencil['weights'][:, :, ~active].any() and not stencil['native_variance'][:, :, ~active].any()
            stencils[name] = stencil; eligible &= qualified
            raw = np.stack([np.where(w > 0, fields[name][b].data[region], 0) for b in 'gri']).astype(np.float64)
            contribution = raw * effective; reconstructed += contribution; absolute += np.abs(contribution)
            wrong_original += raw * w
        tolerance = (len(fields) + 2) * np.finfo(np.float32).eps * absolute + len(fields) * np.finfo(np.float32).smallest_subnormal
        assert not (np.abs(reconstructed - values)[:, master.joint_available[region]] > tolerance[:, master.joint_available[region]]).any()
        wrong_count = int((np.any(np.abs(wrong_original - values) > tolerance, axis=0) & supply).sum())
        usable, protected = _display_support(values, eligible, list(stencils.values()))
        assert np.array_equal(usable[~supply], parent.qualified[region][~supply])
        assert np.array_equal(protected[~supply], parent.protected[region][~supply])
        full = full_cross(usable); old_full = full_cross(parent.qualified[region])
        interior = np.zeros(x.shape, bool); interior[8:-8, 8:-8] = True
        was_blocked = parent.qualified[region] & (parent.radius[region] < 0) & interior
        newly_complete = was_blocked & full
        targets = newly_complete & ~protected
        witnesses = []
        marginal = conditional_variance_upper([s['variance'] for s in stencils.values()])
        for witness_at, (cy, cx) in enumerate(np.argwhere(targets)[:5]):
            selected = np.zeros(x.shape, bool)
            for dy, dx in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
                if not protected[cy + dy, cx + dx] or dy == dx == 0: selected[cy + dy, cx + dx] = True
            actual = aperture_variance_upper(list(stencils.values()), selected)
            dense, native = dense_native_variance(stencils, selected)
            assert np.allclose(actual, dense, rtol=np.finfo(np.float64).eps * 32, atol=0)
            assert np.isfinite(actual).all() and (actual > 0).all()
            naive = marginal[:, selected].sum(axis=1) / int(selected.sum()) ** 2
            raw_mean = values[:, selected].astype(np.float64).mean(axis=1)
            parent_mean = np.stack([recovery.estimates[b][region][selected] for b in 'gri']).astype(np.float64).mean(axis=1)
            witnesses.append({'globalXY': [int(cx + x0), int(cy + y0)], 'selected': int(selected.sum()),
                'actualConditionalVarianceUpper': actual.tolist(), 'independentDenseNativeVarianceUpper': dense.tolist(),
                'incorrectIndependentTargetVariance': naive.tolist(), 'nativeToNaiveRatio': (actual / naive).tolist(),
                'rawSourceMeanGri': raw_mean.tolist(), 'alreadyFilteredParentMeanGri': parent_mean.tolist(), 'native': native})
            np.savez_compressed(OUT / (patch['name'] + f'-witness-{witness_at}.npz'), selected=selected,
                **{name.replace('/', '-') + '-' + key: value[:, :, selected] for name, stencil in stencils.items()
                    for key, value in stencil.items() if key in ('ids', 'weights', 'native_variance')})
        np.savez_compressed(OUT / (patch['name'] + '-samples.npz'), rawDisplaySamplingGri=values, sourceQualified=usable,
            strongSigned=protected, completeRadius1=full, previouslyBlockedNowComplete=newly_complete,
            **{name.replace('/', '-') + '-weight': value for name, value in effective_weights.items()})
        max_arrays = max(max_arrays, sum(value.nbytes for s in original_stencils.values() for value in s.values())
            + sum(value.nbytes for s in stencils.values() for value in s.values()) + sum(value.nbytes for value in effective_weights.values()))
        facts.append({'name': patch['name'], 'boundsXYExclusive': patch['boundsXYExclusive'], 'recoveredSamples': int(supply.sum()),
            'recomputedNativeQualified': int(usable.sum()), 'supplyWithoutPositiveConditionalNoise': int((supply & ~usable).sum()),
            'previouslyBlockedInterior': int(was_blocked.sum()), 'previouslyBlockedNowCompleteRadius1': int(newly_complete.sum()),
            'previouslyBlockedStillIncomplete': int((was_blocked & ~full).sum()), 'weakNewCompleteTargets': int(targets.sum()),
            'originalCoefficientsWouldMismatchActualRecoveredSamples': wrong_count,
            'runChosenCounts': {str(run): int(v.sum()) for run, v in chosen.items()}, 'witnesses': witnesses})
        draw.text((4, 38 + at * 280), patch['name'] + ': original qualification / recomputed native qualification / newly complete targets', fill='white')
        for column, (q, p, circle) in enumerate(((parent.qualified[region], parent.protected[region], old_full), (usable, protected, full), (usable, protected, newly_complete))):
            pixels = np.full((*q.shape, 3), 28, np.uint8); pixels[~q] = [220, 60, 60]; pixels[q & ~circle] = [235, 185, 45]
            pixels[circle] = [55, 195, 95]; pixels[p] = [65, 115, 220]
            sheet.paste(Image.fromarray(pixels).resize((256, 256), Image.Resampling.NEAREST), (column * 256, 62 + at * 280))
    sheet.save(OUT / 'actual-native-support-roles.png')
    before = list(inputs.values()); after = [bind(ROOT / item['path']) for item in before]; assert after == before
    for item in cp['currentSources'] + cp['protected'] + cp['evidence']: assert bind(ROOT / item['path']) == item
    assert sum(p['previouslyBlockedNowCompleteRadius1'] for p in facts) > 0
    assert sum(p['originalCoefficientsWouldMismatchActualRecoveredSamples'] for p in facts) > 0
    outputs = [bind(path) for path in OUT.rglob('*') if path.is_file()]
    report = {'scope': __doc__, 'checkpoint': pin(checkpoint_path), 'inputs': before, 'inputsAfterExact': True,
        'allPriorCheckpointBytesExact': True, 'actualScanMjdRanges': {str(k): list(v) for k, v in ranges.items()},
        'patches': facts, 'outputsBeforeResult': outputs, 'newLogicalBytesBeforeResult': sum(p['bytes'] for p in outputs),
        'seconds': time.perf_counter() - started, 'cpuSeconds': time.process_time() - cpu_started,
        'maximumSimultaneouslyAccountedStencilAndWeightArrayBytes': max_arrays, 'processMemory': previous.memory(),
        'meaning': 'Raw display sampling view with actual target-dependent alternate RUN coefficients/native covariance. Original science is unchanged. Complete radius1 and conditional variance are development prerequisites only; no new aperture estimate/candidate/filter/PSF/quality/independence/adoption claim.',
        'regionProjectionRuns': len(facts), 'sourceRequests': 0, 'wholeFilterCoaddOrHaloRuns': 0, 'candidateChanges': 0,
        'ordinaryAdoption': False, 'quality': 'UNVERIFIED', 'independentReview': 'MISSING'}
    save(OUT / 'result.json', report)
    print(json.dumps({k: v for k, v in report.items() if k not in ('inputs', 'outputsBeforeResult', 'scope', 'meaning')}))


if __name__ == '__main__':
    try: main()
    except Exception as error:
        if OUT.exists(): save(OUT / 'failed.json', {'type': type(error).__name__, 'error': str(error)})
        raise
