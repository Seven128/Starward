"""Actual complete necessary interior increment; exterior remains pending."""
from pathlib import Path
import importlib.util
import json
import os
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
GEN = ROOT / 'output/sdss-m82-current-adaptive-recovery-1004-r1'
GUARD = ROOT / 'output/sdss-m82-recovered-aperture-regions-guard-close-1004-r2'
OUT = ROOT / 'output/sdss-m82-recovered-aperture-interior-1004-r1'
spec = importlib.util.spec_from_file_location('loader', TASK / 'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py')
loader = importlib.util.module_from_spec(spec); spec.loader.exec_module(loader)
np, bind, save = loader.np, loader.bind, loader.save
from sdss_display_recovery import OtherScanDisplay, refine_current_recovery_interior, save_recovered_aperture_candidate


def main():
    assert not OUT.exists(); OUT.mkdir()
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    save(OUT / 'execution.json', {'pid': os.getpid(), 'scope': __doc__, 'sourceRequests': 0})
    inputs = {}
    def pin(path, expected=None):
        actual = bind(path)
        if expected is not None: assert actual == expected
        prior = inputs.setdefault(actual['path'], actual); assert prior == actual
        return actual
    cp_path = TASK / 'evidence/current-execution-state-2026-10-04-r82.json'; pin(cp_path)
    cp = json.loads(cp_path.read_bytes()); changes = []
    for item in cp['currentSources']:
        actual = bind(ROOT / item['path'])
        if actual != item:
            assert item['path'] == 'data-pipelines/deep-sky/sdss_display_recovery.py'
            archive = pin(GUARD / 'current-sdss_display_recovery.py')
            assert (archive['sha256'], archive['bytes']) == (item['sha256'], item['bytes'])
            changes.append({'previous': item, 'current': pin(ROOT / item['path']), 'previousExecutedArchive': archive})
    assert len(changes) == 1
    for item in cp['protected'] + cp['evidence']: assert bind(ROOT / item['path']) == item
    print(json.dumps({'checkpointContinuity': True, 'sources': len(cp['currentSources']),
        'protected': len(cp['protected']), 'evidence': len(cp['evidence'])}), flush=True)
    pin(Path(__file__)); pin(Path(loader.__file__))
    pin(ROOT / 'data-pipelines/deep-sky/test_sdss_recovered_interior.py')
    for name in ('sdss_display_recovery.py','sdss_adaptive_display.py','sdss_noise_aperture.py','sdss_noise_display.py',
                 'sdss_frame_noise.py','sdss_gri_tan.py','sdss_source_stencil.py','sdss_frame_quality.py','sdss_corrected_frame.py'):
        path = ROOT / 'data-pipelines/deep-sky' / name; pin(path)
        (OUT / ('executed-' + name)).write_bytes(path.read_bytes())
    path = loader.DISPLAY / 'result.json'; pin(path); display = json.loads(path.read_bytes())
    master, parent, sources = loader.load_saved_inputs(display, pin)
    path = GEN / 'result.json'; pin(path); recovery_result = json.loads(path.read_bytes())
    saved_path = ROOT / recovery_result['candidate']['path']; pin(saved_path, recovery_result['candidate'])
    saved = json.loads(saved_path.read_bytes())
    def array(meta):
        path = saved_path.parent / meta['file']; actual = pin(path)
        assert (actual['bytes'], actual['sha256']) == (meta['bytes'], meta['sha256'])
        value = np.load(path, mmap_mode='r', allow_pickle=False)
        assert list(value.shape) == meta['shape'] and value.dtype.str == meta['dtype']
        return value
    recovery = OtherScanDisplay({b: array(saved['arrays'][b]) for b in 'gri'}, array(saved['arrays']['alternative-supply']), saved)
    path = GUARD / 'dependency-demand.json'; pin(path); schedule = json.loads(path.read_bytes())
    save(OUT / 'inputs-before.json', list(inputs.values()))
    started, cpu = time.perf_counter(), time.process_time(); progress_rows = []
    def progress(value):
        row = {'completedRows': value['completedRows'], 'masterRows': value['masterRows'],
            'targetBoundsXYExclusive': value['region']['targetBoundsXYExclusive'],
            'demand': value['region']['dependencyDemandTargets'], 'affected': value['region']['affectedTargets'],
            'changed': value['region']['changedEstimatePixels'], 'secondsSinceStart': time.perf_counter()-started,
            'memory': loader.memory()}
        progress_rows.append(row); save(OUT / 'progress.json', progress_rows)
        print(json.dumps(row), flush=True)
    candidate = refine_current_recovery_interior(master, parent, recovery, sources, chunk_rows=64, batch_size=64, progress=progress)
    seconds, cpu_seconds = time.perf_counter()-started, time.process_time()-cpu
    assert candidate.report['dependencyDemandTargets'] == 96349
    assert candidate.report['exteriorDependencyPositions'] == 1202
    assert len(candidate.report['regions']) == 23
    # The saved demand is externally pinned scheduling evidence, never admission.
    assert schedule['insideDependencyDemandTargets'] == candidate.report['dependencyDemandTargets']
    for planned, actual in zip(schedule['blocks'], candidate.report['regions'], strict=True):
        assert planned['targetBoundsXYExclusive'] == actual['targetBoundsXYExclusive']
        assert planned['realInsideCropSupportBoundsXYExclusive'] == actual['sampling']['supportBoundsXYExclusive']
        assert planned['dependencyDemandTargets'] == actual['dependencyDemandTargets']
    entry = {key: master.report[key] for key in ('objectRef', 'center', 'orientation')}
    save_recovered_aperture_candidate(OUT / 'candidate', master, candidate, entry)
    before = list(inputs.values()); after = [bind(ROOT / item['path']) for item in before]; assert after == before
    save(OUT / 'inputs-after.json', after)
    for item in cp['protected'] + cp['evidence']: assert bind(ROOT / item['path']) == item
    outputs = [bind(path) for path in OUT.rglob('*') if path.is_file()]
    report = {'scope': __doc__, 'checkpoint': pin(cp_path), 'previousSourcesExplicitlyChanged': changes,
        'scienceCandidate': display['scienceCandidate'], 'parentCandidate': display['candidate'],
        'recoveryCandidate': recovery_result['candidate'], 'candidate': bind(OUT / 'candidate/candidate.json'),
        'inputsBeforeAfterExact': True, 'previousProtectedAndEvidenceExact': True,
        'interiorSeconds': seconds, 'interiorCpuSeconds': cpu_seconds, 'processMemory': loader.memory(),
        'dependencyDemandTargets': candidate.report['dependencyDemandTargets'], 'regions': len(candidate.report['regions']),
        'affectedTargets': candidate.report['affectedTargets'], 'changedEstimatePixels': candidate.report['changedEstimatePixels'],
        'exteriorDependencyPositionsPending': candidate.report['exteriorDependencyPositions'],
        'outputsBeforeResult': outputs, 'newLogicalBytesBeforeResult': sum(v['bytes'] for v in outputs),
        'sourceRequests': 0, 'wholeMasterFilterOrCoaddRuns': 0, 'ordinaryAdoption': False,
        'quality': 'UNVERIFIED', 'independentReview': 'MISSING'}
    save(OUT / 'result.json', report); print(json.dumps({'result': bind(OUT / 'result.json'), 'seconds': seconds,
        'affected': candidate.report['affectedTargets'], 'changed': candidate.report['changedEstimatePixels']}), flush=True)


if __name__ == '__main__':
    try: main()
    except Exception as error:
        if OUT.exists(): save(OUT / 'failed.json', {'type': type(error).__name__, 'error': str(error)})
        raise
