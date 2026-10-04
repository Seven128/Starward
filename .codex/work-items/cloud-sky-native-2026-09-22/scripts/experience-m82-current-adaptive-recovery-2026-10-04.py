"""Current saved M82 adaptive parent through actual shared other-scan recovery."""
from pathlib import Path
import importlib.util
import json
import os
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
DISPLAY = ROOT / 'output/sdss-m82-shared-adaptive-display-1004-r1'
QUALIFICATION = ROOT / 'output/sdss-m82-boundary-other-scan-qualification-1004-r1'
OUT = ROOT / 'output/sdss-m82-current-adaptive-recovery-1004-r1'
spec = importlib.util.spec_from_file_location('previous', TASK / 'scripts/experience-m82-shared-adaptive-display-2026-10-04.py')
previous = importlib.util.module_from_spec(spec); spec.loader.exec_module(previous)
np, bind, save, memory = previous.np, previous.bind, previous.save, previous.memory
from sdss_adaptive_display import AdaptiveDisplayCandidate
from sdss_display_recovery import recover_other_scan_display, save_recovery_candidate


def load_saved_inputs(result, pin):
    """Rehydrate admitted saved arrays/sources; never produce a new coadd."""
    science_path = ROOT / result['scienceCandidate']['path']; pin(science_path, result['scienceCandidate'])
    current_path = ROOT / result['candidate']['path']; pin(current_path, result['candidate'])
    science, current = json.loads(science_path.read_bytes()), json.loads(current_path.read_bytes())
    def array(meta, directory):
        path = directory / meta['file']; actual = pin(path)
        assert (actual['bytes'], actual['sha256']) == (meta['bytes'], meta['sha256'])
        value = np.load(path, mmap_mode='r', allow_pickle=False)
        assert list(value.shape) == meta['shape'] and value.dtype.str == meta['dtype']
        return value
    bands = {b: previous.ProjectedBand(array(science['arrays'][b + '-science'], science_path.parent),
        array(science['arrays'][b + '-footprint'], science_path.parent),
        array(science['arrays'][b + '-finite-neighbors'], science_path.parent), science['science']['perBand'][b]) for b in 'gri'}
    joint = array(science['arrays']['joint-availability'], science_path.parent)
    rgb = array(science['arrays']['rgb-master'], science_path.parent)
    mask_path = ROOT / 'output/sdss-m82-fpm-frame-intersection-1004-r1/result-r2.json'; pin(mask_path)
    masks = json.loads(mask_path.read_bytes())
    camera_path = ROOT / 'output/sdss-m82-quality-inputs-1004-r1/camera-receipt.json'; pin(camera_path)
    camera_receipt = json.loads(camera_path.read_bytes()); camera_csv = ROOT / camera_receipt['raw']['path']
    pin(camera_csv, camera_receipt['raw'])
    fields, weights, sources = {}, {}, {}
    for field in science['mosaic']['fields']:
        name = field['fieldKey']; diagnostics = science['mosaic']['diagnostics'][name]
        fields[name] = {b: previous.ProjectedBand(array(diagnostics[b + '-science'], science_path.parent),
            array(diagnostics[b + '-footprint'], science_path.parent), array(diagnostics[b + '-finite-neighbors'], science_path.parent),
            field['perBand'][b]) for b in 'gri'}
        weights[name] = array(diagnostics['normalized-weight'], science_path.parent); sources[name] = {}
        for b in 'gri':
            original = field['perBand'][b]['sourceReceipt']; raw, identity = original['source'], original['identity']
            path = Path(raw['path']); actual = pin(path)
            assert (actual['bytes'], actual['sha256']) == (raw['bytes'], raw['sha256'])
            frame = previous.read_cached_frame(path, identity | {k: raw[k] for k in ('bytes', 'sha256', 'sourceUrl')},
                max_uncompressed_bytes=32 * 1024 * 1024)
            assert frame.receipt == original
            mask = next(value for value in masks['fpMInputs'] if value['identity'] == identity)
            admission_path, flags_path = ROOT / mask['currentAdmission']['path'], ROOT / mask['flags']['path']
            pin(admission_path, mask['currentAdmission']); pin(flags_path, mask['flags'])
            with np.load(flags_path, allow_pickle=False) as archive:
                flags = archive['flags']
            flags.setflags(write=False); admission = json.loads(admission_path.read_bytes())
            camera = previous.read_cached_field_noise(camera_csv, camera_receipt, identity)
            sources[name][b] = previous.NoiseDisplaySource(frame, camera, previous.PixelFlags(flags, None, admission))
    unions = {b: previous.BandSourceUnion(array(science['mosaic']['independentSourceUnions'][b]['footprint'], science_path.parent),
        array(science['mosaic']['independentSourceUnions'][b]['finite-neighbors'], science_path.parent)) for b in 'gri'}
    master = previous.GriMaster(previous.target_tan(science['center'], science['pixels'], science['fieldDegrees']), bands,
        joint, rgb, science, fields, weights, array(science['mosaic']['contributorCount'], science_path.parent), unions)
    estimates = {b: array(current['arrays'][b], current_path.parent) for b in 'gri'}
    maps = {k: array(current['arrays'][k], current_path.parent) for k in ('qualified', 'radius', 'reached', 'protected')}
    parent = AdaptiveDisplayCandidate(estimates, maps['qualified'], maps['radius'], maps['reached'], maps['protected'], current)
    return master, parent, sources


def main():
    assert not OUT.exists()
    OUT.mkdir(); (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    save(OUT / 'execution.json', {'pid': os.getpid(), 'scope': __doc__, 'sourceRequests': 0, 'wholeFilterOrCoaddRuns': 0})
    inputs = {}
    def pin(path, expected=None):
        actual = bind(path)
        if expected is not None: assert actual == expected
        existing = inputs.setdefault(actual['path'], actual); assert existing == actual
        return actual
    cp_path = TASK / 'evidence/current-execution-state-2026-10-04-r79.json'; pin(cp_path)
    cp = json.loads(cp_path.read_bytes())
    historical = []
    for item in cp['currentSources'] + cp['protected'] + cp['evidence']:
        path = ROOT / item['path']
        if item['path'] == 'data-pipelines/deep-sky/sdss_display_recovery.py':
            archive = QUALIFICATION / 'executed-sdss_display_recovery.py'
            old = bind(archive); assert (old['bytes'], old['sha256']) == (item['bytes'], item['sha256'])
            historical.append({'original': item, 'verifiedArchive': pin(archive)})
        else:
            assert bind(path) == item
    pin(Path(__file__)); pin(Path(previous.__file__))
    result_path = DISPLAY / 'result.json'; pin(result_path); result = json.loads(result_path.read_bytes())
    qualification_path = QUALIFICATION / 'result.json'; pin(qualification_path)
    qualification = json.loads(qualification_path.read_bytes()); assert qualification['parentResult'] == pin(result_path)
    for name in ('sdss_display_recovery.py', 'sdss_adaptive_display.py', 'sdss_noise_display.py', 'sdss_frame_noise.py',
                 'sdss_corrected_frame.py', 'sdss_frame_quality.py', 'sdss_source_stencil.py', 'sdss_gri_tan.py'):
        path = ROOT / 'data-pipelines/deep-sky' / name; pin(path)
        (OUT / ('executed-' + name)).write_bytes(path.read_bytes())
    master, parent, sources = load_saved_inputs(result, pin)
    before = list(inputs.values()); save(OUT / 'inputs-before.json', before)
    started, cpu_started = time.perf_counter(), time.process_time()
    recovered = recover_other_scan_display(master, parent, sources, chunk_rows=64)
    seconds, cpu_seconds = time.perf_counter() - started, time.process_time() - cpu_started
    # This complete run must realize the saved real patch qualification, and
    # not stop at an empty or merely compatible candidate.
    for patch in qualification['patches']:
        x0, y0, x1, y1 = patch['boundsXYExclusive']; region = slice(y0, y1), slice(x0, x1)
        path = QUALIFICATION / (patch['name'] + '-qualification.npz')
        with np.load(path, allow_pickle=False) as archive:
            chosen, values = archive['nativeQualifiedSupply'], archive['conditionalAlternativeGri']
        assert np.array_equal(recovered.alternative_supply[region], chosen)
        for index, band in enumerate('gri'):
            assert np.array_equal(recovered.estimates[band][region][chosen], values[index][chosen])
    entry = {k: master.report[k] for k in ('objectRef', 'center', 'orientation')}
    save_recovery_candidate(OUT / 'candidate', master, recovered, entry)
    after = [bind(ROOT / item['path']) for item in before]; assert after == before
    save(OUT / 'inputs-after.json', after)
    report = {'scope': __doc__, 'checkpoint': pin(cp_path), 'historicalCodeResolved': historical,
        'currentInputsExact': True, 'producer': bind(Path(__file__)),
        'scienceCandidate': result['scienceCandidate'], 'parentCandidate': result['candidate'],
        'candidate': bind(OUT / 'candidate/candidate.json'), 'patchQualificationExact': True,
        'recipe': recovered.report, 'recoverySeconds': seconds, 'recoveryCPUSeconds': cpu_seconds, 'memory': memory(),
        'newLogicalBytesBeforeResult': sum(path.stat().st_size for path in OUT.rglob('*') if path.is_file()),
        'sourceRequests': 0, 'nativeFlagMatrixRebuilds': 0, 'wholeFilterOrCoaddRuns': 0,
        'ordinaryAdoption': False, 'quality': 'UNVERIFIED', 'independentReview': 'MISSING'}
    save(OUT / 'result.json', report)
    print(json.dumps({'result': bind(OUT / 'result.json'), 'alternatives': recovered.report['alternativePixels'],
        'flagOnly': recovered.report['flagOnlyAlternativePixels'], 'seconds': seconds, 'cpuSeconds': cpu_seconds, 'memory': memory()}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        if OUT.exists(): save(OUT / 'failed.json', {'type': type(error).__name__, 'error': str(error)})
        raise
