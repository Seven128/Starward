"""Missing M82 OV/MED inputs through the prior bounded acquisition path.

No DETAIL resampling, display, publication or adoption. Existing bytes stay put.
"""
from pathlib import Path
import argparse
import copy
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
BASE = ROOT / 'output/allwise-w3-m82-source-0930'
HELPER = TASK / 'scripts/experience-m82-detail-acquisition-2026-10-02.py'
CHECKPOINT = TASK / 'evidence/current-execution-state-2026-10-04-r70.json'
PATHS = ['Norder4/Dir0/Npix475.fits', *[
    f'Norder7/Dir30000/Npix{pixel}.fits'
    for pixel in (30415, 30424, 30425, 30426, 30427, 30448, 30449, 30450)]]
BY_PIXEL = {int(Path(path).stem[4:]): path for path in PATHS}
spec = importlib.util.spec_from_file_location('prior_bounded_acquisition', HELPER)
prior = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prior)
# Only the canonical identity mapping varies; TLS, quotas, admission, durable
# partial outputs and cancellation/time budgets remain the already used path.
prior.tile_path = lambda pixel: BY_PIXEL[pixel]


def bind(path):
    path = path.resolve()
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size,
            'sha256': digest.hexdigest()}


def pins_exact(records):
    actual = [bind(ROOT / record['path']) for record in records]
    assert actual == records, 'bound_existing_bytes_changed'
    return actual


def cache_inventory():
    names = {Path(path).name for path in PATHS}
    matches = []
    # Include ignored files: rg's usual ignore policy is insufficient for data.
    for directory, _, files in os.walk(ROOT / 'output'):
        for name in names.intersection(files):
            matches.append(bind(Path(directory) / name))
    return sorted(matches, key=lambda record: record['path'])


def parent(output):
    assert output.is_relative_to(ROOT / 'output') and not output.exists()
    output.mkdir(parents=True)
    for name, source in [('executed-script.py', Path(__file__)), ('bounded-helper.py', HELPER)]:
        (output / name).write_bytes(source.read_bytes())
    checkpoint = json.loads(CHECKPOINT.read_bytes())
    assert checkpoint['branch'] == 'codex/remote-main-20260908'
    assert checkpoint['head'] == '72e65cf309d700cb7d40c5b7afd53660fd39fa35'
    records = checkpoint['currentSources'] + checkpoint['protected'] + checkpoint['evidence']
    before = pins_exact(records)
    original_plan = json.loads((BASE / 'candidate/candidate-plan.json').read_bytes())
    plan = copy.deepcopy(original_plan)
    plan['profiles'] = [profile for profile in plan['profiles'] if profile['level'] in ('OVERVIEW', 'MEDIUM')]
    assert [profile['level'] for profile in plan['profiles']] == ['OVERVIEW', 'MEDIUM']
    assert sorted(path for profile in plan['profiles'] for path in profile['tiles']) == sorted(PATHS)
    assert plan['source'] == prior.ORIGIN and plan['objectRef'] == 'M:82'
    manifest_path = ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json'
    entry = next(item for item in json.loads(manifest_path.read_bytes())['entries'] if item['objectRef'] == 'M:82')
    assert plan['center'] == entry['center']
    for profile in plan['profiles']:
        original = entry['levels'][profile['level']]
        assert (profile['pixels'], profile['fieldDegrees']) == (original['pixels'], original['fieldDegrees'])
    old_receipt = json.loads((BASE / 'candidate/candidate-result.json').read_bytes())
    assert bind(BASE / 'properties')['sha256'] == old_receipt['sourcePropertiesSha256']
    inputs = [bind(path) for path in [HELPER, CHECKPOINT, manifest_path,
              BASE / 'candidate/candidate-plan.json', BASE / 'candidate/candidate-result.json',
              BASE / 'properties']]
    inventory = cache_inventory()
    prior.save(output / 'live-cache-inventory.json', {
        'scope': 'All output scientific caches, including ignored files; exact nine canonical FITS basenames',
        'canonicalPaths': PATHS, 'matches': inventory, 'missing': PATHS if not inventory else None,
        'observedUtc': prior.now()})
    # An unexpected same-named cache requires identity/receipt qualification;
    # never overwrite or automatically fetch its duplicate based on a filename.
    assert not inventory, 'existing_cache_requires_identity_qualification_before_any_request'
    prior.save(output / 'two-level-plan.json', plan)
    result = {'scope': 'Only nine missing OV/MED scientific inputs; no DETAIL/science/display/publication or quality acceptance',
              'script': bind(Path(__file__)), 'helper': bind(HELPER), 'checkpoint': bind(CHECKPOINT),
              'sourcePropertiesSha256': old_receipt['sourcePropertiesSha256'], 'inputBindingsBefore': inputs,
              'checkpointBindingsBefore': before, 'sourceFiles': [], 'attemptedRequests': 0,
              'automaticRetries': 0, 'missingRequests': PATHS, 'startedUtc': prior.now()}
    prior.save(output / 'acquisition.json', result)
    for pixel, canonical in BY_PIXEL.items():
        print(json.dumps({'phase': 'one_canonical_request', 'path': canonical}), flush=True)
        started = time.monotonic()
        process = subprocess.Popen([sys.executable, '-B', str(Path(__file__).resolve()),
                                    '--child', str(pixel), '--output', str(output)],
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        timed_out = False
        try:
            _, stderr = process.communicate(timeout=38)
        except subprocess.TimeoutExpired:
            timed_out = True
            process.kill()
            _, stderr = process.communicate()
        record_path = output / f'request-{pixel}.json'
        record = json.loads(record_path.read_bytes()) if record_path.exists() else {
            'path': canonical, 'url': prior.ORIGIN + '/' + canonical, 'state': 'UNAVAILABLE',
            'bytes': None, 'sha256': None, 'errorKind': 'CHILD_DID_NOT_SAVE_RECORD'}
        if timed_out and record['state'] != 'CHECKED':
            record.update(errorKind='WHOLE_REQUEST_TIME_BUDGET_EXCEEDED', finishedUtc=prior.now(),
                          elapsedSeconds=time.monotonic() - started, wholeChildBudgetSeconds=38)
            raw = output / 'sources' / canonical
            if raw.exists():
                actual = bind(raw)
                record.update(state='RAW_ACQUIRED_UNCHECKED', raw=actual, bytes=actual['bytes'],
                              sha256=actual['sha256'], rawTransferCompleted=False)
            else:
                record['state'] = 'UNAVAILABLE'
            prior.save(record_path, record)
        assert record['path'] == canonical and record['url'] == prior.ORIGIN + '/' + canonical
        result['sourceFiles'].append(record)
        result['attemptedRequests'] += 1
        result.update(checkedSourceCount=sum(item['state'] == 'CHECKED' for item in result['sourceFiles']),
                      checkedSourceBytes=sum(item['bytes'] for item in result['sourceFiles'] if item['state'] == 'CHECKED'),
                      fullTwoLevelInputChecked=len(result['sourceFiles']) == 9 and all(
                          item['state'] == 'CHECKED' for item in result['sourceFiles']))
        prior.save(output / 'acquisition.json', result)
        print(json.dumps({'phase': 'saved', 'path': canonical, 'state': record['state'],
                          'httpStatus': record.get('httpStatus'), 'bytes': record.get('bytes'),
                          'elapsedSeconds': record.get('elapsedSeconds')}), flush=True)
    result.update(checkpointBindingsAfter=pins_exact(records),
                  inputBindingsAfter=pins_exact(inputs), existingBytesUnchanged=True, finishedUtc=prior.now())
    prior.save(output / 'acquisition.json', result)
    prior.save(output / 'binding.json', {'inputs': inputs, 'checkpoint': bind(CHECKPOINT),
              'outputs': [bind(path) for path in sorted(output.rglob('*')) if path.is_file()],
              'scope': result['scope']})
    print(json.dumps({'phase': 'done', 'checkedSourceCount': result['checkedSourceCount'],
                      'fullTwoLevelInputChecked': result['fullTwoLevelInputChecked'],
                      'existingBytesUnchanged': True}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--child', type=int, choices=list(BY_PIXEL))
    args = parser.parse_args()
    if args.child is None:
        parent(args.output.resolve())
    else:
        prior.child(args.output.resolve(), args.child)
