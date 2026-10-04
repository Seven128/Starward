"""First M82 common adaptive display from saved science, then real halo only."""
from pathlib import Path
import importlib.util
import json
import os
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OUT = ROOT / 'output/sdss-m82-shared-adaptive-display-1004-r1'
SCIENCE = ROOT / 'output/sdss-m82-first-science-master-1004-r2'
sys.path[:0] = [str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'), str(ROOT / 'data-pipelines/deep-sky')]
import numpy as np
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import read_cached_field_noise
from sdss_frame_quality import PixelFlags
from sdss_gri_tan import BANDS, GriMaster, ProjectedBand, BandSourceUnion, target_tan
from sdss_noise_display import NoiseDisplaySource, _qualified_sources
from sdss_adaptive_display import render_adaptive_display_candidate, refine_adaptive_real_halo, save_adaptive_display_candidate

def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, TASK / 'scripts' / filename)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value

previous = module('first_science', 'experience-m82-first-science-master-2026-10-04.py')
bind, save, memory = previous.bind, previous.save, previous.resource.memory

def main():
    assert not OUT.exists()
    OUT.mkdir()
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    save(OUT / 'execution.json', {'pid': os.getpid(), 'startedUtc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'scope': __doc__, 'rerenderOriginalScience': False, 'sourceRequests': 0})
    cp_path = TASK / 'evidence/current-execution-state-2026-10-04-r78.json'
    cp = json.loads(cp_path.read_bytes())
    pins = cp['currentSources'] + cp['protected'] + cp['evidence']
    for p in pins:
        assert bind(ROOT / p['path']) == p
    science_result = json.loads((SCIENCE / 'result.json').read_bytes())
    candidate_path = SCIENCE / 'candidate/candidate.json'
    assert bind(candidate_path) == science_result['candidate']
    c = json.loads(candidate_path.read_bytes())
    paths = [Path(__file__), cp_path, SCIENCE / 'result.json', candidate_path]
    def array(meta):
        path = candidate_path.parent / meta['file']
        current = bind(path)
        assert current['bytes'] == meta['bytes'] and current['sha256'] == meta['sha256']
        value = np.load(path, mmap_mode='r', allow_pickle=False)
        assert list(value.shape) == meta['shape'] and value.dtype.str == meta['dtype']
        paths.append(path)
        return value
    joint, rgb = array(c['arrays']['joint-availability']), array(c['arrays']['rgb-master'])
    bands = {b: ProjectedBand(array(c['arrays'][b + '-science']), array(c['arrays'][b + '-footprint']),
        array(c['arrays'][b + '-finite-neighbors']), c['science']['perBand'][b]) for b in BANDS}
    fields, weights, sources = {}, {}, {}
    mask_path = ROOT / 'output/sdss-m82-fpm-frame-intersection-1004-r1/result-r2.json'
    masks = json.loads(mask_path.read_bytes()); paths.append(mask_path)
    camera_path = ROOT / 'output/sdss-m82-quality-inputs-1004-r1/camera-receipt.json'
    camera_receipt = json.loads(camera_path.read_bytes())
    camera_csv = ROOT / camera_receipt['raw']['path']
    assert bind(camera_csv) == camera_receipt['raw']
    paths.extend([camera_path, camera_csv])
    for field in c['mosaic']['fields']:
        key = field['fieldKey']; d = c['mosaic']['diagnostics'][key]
        fields[key] = {b: ProjectedBand(array(d[b + '-science']), array(d[b + '-footprint']),
            array(d[b + '-finite-neighbors']), field['perBand'][b]) for b in BANDS}
        weights[key] = array(d['normalized-weight']); sources[key] = {}
        for b in BANDS:
            original = field['perBand'][b]['sourceReceipt']; src = original['source']; identity = original['identity']
            source_file = Path(src['path']); paths.append(source_file)
            frame = read_cached_frame(source_file, identity | {k: src[k] for k in ('bytes', 'sha256', 'sourceUrl')},
                max_uncompressed_bytes=32 * 1024 * 1024)
            assert frame.receipt == original
            mask = next(p for p in masks['fpMInputs'] if p['identity'] == identity)
            for pin in (mask['currentAdmission'], mask['flags']):
                assert bind(ROOT / pin['path']) == pin; paths.append(ROOT / pin['path'])
            with np.load(ROOT / mask['flags']['path'], allow_pickle=False) as data:
                flags = data['flags']
            flags.setflags(write=False)
            receipt = json.loads((ROOT / mask['currentAdmission']['path']).read_bytes())
            camera = read_cached_field_noise(camera_csv, camera_receipt, identity)
            sources[key][b] = NoiseDisplaySource(frame, camera, PixelFlags(flags, None, receipt))
    unions = {b: BandSourceUnion(array(c['mosaic']['independentSourceUnions'][b]['footprint']),
        array(c['mosaic']['independentSourceUnions'][b]['finite-neighbors'])) for b in BANDS}
    master = GriMaster(target_tan(c['center'], c['pixels'], c['fieldDegrees']), bands, joint, rgb,
        c, fields, weights, array(c['mosaic']['contributorCount']), unions)
    _qualified_sources(master, sources)
    owners = ['sdss_adaptive_display.py', 'sdss_noise_aperture.py', 'sdss_noise_display.py',
        'sdss_frame_noise.py', 'sdss_frame_quality.py', 'sdss_corrected_frame.py', 'sdss_gri_tan.py', 'sdss_source_stencil.py']
    for name in owners:
        path = ROOT / 'data-pipelines/deep-sky' / name; paths.append(path)
        (OUT / ('executed-' + name)).write_bytes(path.read_bytes())
    before = [bind(p) for p in dict.fromkeys(paths)]
    save(OUT / 'inputs-before.json', before)
    entry = {k: c[k] for k in ('objectRef', 'center', 'orientation')}
    initial_memory = memory(); started = time.perf_counter(); cpu_started = time.process_time()
    stage = 'full-original-coadd-display'
    def observe(event):
        row = event | {'stage': stage, 'elapsedSeconds': time.perf_counter() - started, 'memory': memory()}
        with (OUT / 'progress.ndjson').open('a', encoding='utf-8') as stream:
            stream.write(json.dumps(row) + '\n')
        print(json.dumps(row), flush=True)
    initial = render_adaptive_display_candidate(master, sources, chunk_rows=32, batch_size=64, progress=observe)
    full_seconds, full_cpu = time.perf_counter() - started, time.process_time() - cpu_started
    save_adaptive_display_candidate(OUT / 'initial-candidate', master, initial, entry)
    save(OUT / 'initial-result.json', {'candidate': bind(OUT / 'initial-candidate/candidate.json'),
        'seconds': full_seconds, 'cpuSeconds': full_cpu, 'recipe': initial.report, 'memory': memory(),
        'scope': 'Saved parent before edge refinement; reuse if later stage fails, never repeat full filter.'})
    stage = 'real-supported-perimeter-only'; edge_started = time.perf_counter(); edge_cpu = time.process_time()
    final = refine_adaptive_real_halo(master, initial, sources, batch_size=64, progress=observe)
    edge_seconds, edge_cpu_seconds = time.perf_counter() - edge_started, time.process_time() - edge_cpu
    save_adaptive_display_candidate(OUT / 'candidate', master, final, entry)
    after = [bind(ROOT / p['path']) for p in before]
    assert after == before
    save(OUT / 'inputs-after.json', after)
    for p in pins:
        assert bind(ROOT / p['path']) == p
    result = {'scope': __doc__, 'checkpoint': bind(cp_path), 'producer': bind(Path(__file__)),
        'scienceCandidate': bind(candidate_path), 'parentCandidate': bind(OUT / 'initial-candidate/candidate.json'),
        'candidate': bind(OUT / 'candidate/candidate.json'), 'recipe': final.report,
        'fullFilterSeconds': full_seconds, 'fullFilterCPUSeconds': full_cpu,
        'edgeOnlySeconds': edge_seconds, 'edgeOnlyCPUSeconds': edge_cpu_seconds,
        'elapsedWithSavingSeconds': time.perf_counter() - started, 'initialMemory': initial_memory, 'finalMemory': memory(),
        'newFilesLogicalBytesBeforeResult': sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file()),
        'previousSourcesProtectedEvidenceAndActualInputsExact': True, 'sourceRequests': 0,
        'scienceReprojectionOrCoaddRuns': 0, 'ordinaryAdoption': False, 'fullQuality': 'UNVERIFIED', 'independentReview': 'MISSING'}
    save(OUT / 'result.json', result)
    print(json.dumps({'result': bind(OUT / 'result.json'), 'changedPixels': final.report['changedEstimatePixels'],
        'radiusCounts': final.report['radiusCounts'], 'fullSeconds': full_seconds, 'edgeSeconds': edge_seconds}), flush=True)

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        if OUT.exists():
            save(OUT / 'failed.json', {'type': type(error).__name__, 'error': str(error),
                'existingParentPreserved': (OUT / 'initial-result.json').exists()})
        raise
