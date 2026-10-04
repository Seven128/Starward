"""Two original M82 levels via the unchanged scientific owner, without display."""
from pathlib import Path
import hashlib
import json
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
sys.path[:0] = [str(ROOT / 'data-pipelines/deep-sky'), str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from astropy.io import fits
import allwise_finite_tan as owner

BASE = ROOT / 'output/allwise-w3-m82-source-0930'
ACQ = ROOT / 'output/allwise-w3-m82-overview-medium-inputs-1004-r1'
OUT = ROOT / 'output/allwise-w3-m82-overview-medium-science-1004-r1'
CHECKPOINT = TASK / 'evidence/current-execution-state-2026-10-04-r70.json'


def bind(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': digest.hexdigest()}


def save(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + '\n', encoding='utf-8')


def verify(records):
    assert [bind(ROOT / item['path']) for item in records] == records


def main():
    started = time.perf_counter()
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    checkpoint = json.loads(CHECKPOINT.read_bytes())
    existing = checkpoint['currentSources'] + checkpoint['protected'] + checkpoint['evidence']
    verify(existing)
    acquisition = json.loads((ACQ / 'acquisition.json').read_bytes())
    assert acquisition['fullTwoLevelInputChecked'] and acquisition['checkedSourceCount'] == 9
    assert acquisition['attemptedRequests'] == 9 and acquisition['automaticRetries'] == 0
    acquisition_binding = json.loads((ACQ / 'binding.json').read_bytes())
    verify(acquisition_binding['outputs'])
    plan = json.loads((ACQ / 'two-level-plan.json').read_bytes())
    original = json.loads((BASE / 'candidate/candidate-plan.json').read_bytes())
    assert plan == {**original, 'profiles': [p for p in original['profiles'] if p['level'] in ('OVERVIEW', 'MEDIUM')]}
    manifest = ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json'
    entry = next(item for item in json.loads(manifest.read_bytes())['entries'] if item['objectRef'] == 'M:82')
    paths = {item['path']: item['raw']['path'] for item in acquisition['sourceFiles']}
    inputs = [bind(path) for path in [CHECKPOINT, manifest, BASE / 'properties',
              BASE / 'candidate/candidate-plan.json', ACQ / 'two-level-plan.json',
              ACQ / 'acquisition.json', ACQ / 'binding.json', *[ROOT / path for path in paths.values()]]]
    headers = []
    for item in acquisition['sourceFiles']:
        with fits.open(ROOT / item['raw']['path'], memmap=False) as hdus:
            headers.append({'canonicalPath': item['path'], 'BUNIT': hdus[0].header.get('BUNIT'),
                            'shape': list(hdus[0].data.shape), 'BITPIX': hdus[0].header['BITPIX']})
    assert all(item['BUNIT'] is None for item in headers), 'unit_metadata_requires_explicit_review'
    save(OUT / 'source-header-units.json', headers)
    # Observe the original sampler's actual geometry/lookup I/O only. No input,
    # return value, sampling rule or production file is changed.
    run = owner.subprocess.run
    calls = []

    def observe_run(command, **kwargs):
        result = run(command, **kwargs)
        if len(command) == 4 and Path(command[1]).name == 'hips_tan_lookup.mjs':
            index = len(calls)
            profile = plan['profiles'][index]
            assert (int(command[2]), int(command[3])) == (profile['sourceOrder'], profile['pixels'])
            world_path = OUT / f"{profile['level'].lower()}-world.bin"
            lookup_path = OUT / f"{profile['level'].lower()}-lookup.bin"
            world_path.write_bytes(kwargs['input'])
            lookup_path.write_bytes(result.stdout)
            calls.append({'level': profile['level'], 'world': bind(world_path), 'lookup': bind(lookup_path)})
        return result

    try:
        owner.subprocess.run = observe_run
        samples = owner.sample_cached_tan(plan, entry, source_directory=ROOT,
            source_files=acquisition['sourceFiles'], source_count=9,
            properties=(BASE / 'properties').read_bytes(),
            properties_sha256=acquisition['sourcePropertiesSha256'], source_paths=paths)
    finally:
        owner.subprocess.run = run
    assert set(samples) == {'OVERVIEW', 'MEDIUM'} and len(calls) == 2
    levels = []
    for profile in plan['profiles']:
        level = profile['level']
        result = samples[level]
        assert result.intensity.dtype == np.float32 and result.finite.dtype == np.bool_
        assert np.array_equal(result.finite, np.isfinite(result.intensity))
        science = OUT / f'{level.lower()}-science.npy'
        availability = OUT / f'{level.lower()}-availability.npy'
        np.save(science, result.intensity, allow_pickle=False)
        np.save(availability, result.finite, allow_pickle=False)
        selected = result.intensity[result.finite]
        metadata = {**result.metadata, 'science': bind(science), 'availability': bind(availability),
            'intensityUnit': 'UNKNOWN_NO_BUNIT_IN_CACHED_PRIMARY_HEADER',
            'finitePixels': int(result.finite.sum()), 'nonfinitePixels': int((~result.finite).sum()),
            'finiteZeroPixels': int((result.finite & (result.intensity == 0)).sum()),
            'finiteNegativePixels': int((result.finite & (result.intensity < 0)).sum()),
            'finitePercentiles': [float(value) for value in np.percentile(selected, [0, 1, 50, 99, 100])] if len(selected) else None,
            'availabilityMeaning': 'Exact selected scientific scalar is finite; not brightness, detector-quality, coverage of the whole survey, PSF or absolute registration acceptance.'}
        save(OUT / f'{level.lower()}-metadata.json', metadata)
        levels.append(metadata)
    verify(existing)
    verify(inputs)
    verify(acquisition_binding['outputs'])
    save(OUT / 'result.json', {'scope': 'Two original M82 OV/MED scientific grids only; no DETAIL, stretch, PNG, publication, adoption or quality repair',
        'script': bind(Path(__file__)), 'checkpoint': bind(CHECKPOINT), 'inputsBefore': inputs, 'inputsAfter': inputs,
        'checkpointBindingsBefore': existing, 'checkpointBindingsAfter': existing,
        'sourceAcquisitionUnchanged': True, 'lookupObservations': calls, 'levels': levels,
        'elapsedSeconds': time.perf_counter() - started, 'independentReview': 'MISSING'})
    save(OUT / 'binding.json', {'inputs': inputs,
        'outputs': [bind(path) for path in sorted(OUT.rglob('*')) if path.is_file()]})
    print(json.dumps({'scope': 'science only', 'levels': [{'level': item['level'],
          'finitePixels': item['finitePixels'], 'nonfinitePixels': item['nonfinitePixels']} for item in levels],
          'existingBytesUnchanged': True, 'elapsedSeconds': time.perf_counter() - started}))


if __name__ == '__main__':
    main()
