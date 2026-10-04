"""Bounded mutation checks for positive-COV false availability and stale input."""
from pathlib import Path
import dataclasses
import hashlib
import io
import json
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / 'data-pipelines/deep-sky'), str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
import allwise_atlas_source as owner
from test_allwise_atlas_source import AtlasSourceTests

OUT = ROOT / 'output/allwise-w3-shared-atlas-source-mutation-1004-r1'
ACQ = ROOT / 'output/allwise-w3-m82-atlas-native-1004-r2'


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def run_target(name):
    stream = io.StringIO()
    suite = unittest.TestSuite([AtlasSourceTests(name)])
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
    return {'test': name, 'failures': len(result.failures), 'errors': len(result.errors), 'passed': result.wasSuccessful()}, stream.getvalue()


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    source_paths = [ROOT / 'data-pipelines/deep-sky' / name for name in ('allwise_atlas_source.py', 'test_allwise_atlas_source.py')]
    before = [bind(path) for path in source_paths]
    read = owner.read_cached_atlas_triplet
    def coverage_only(*args, **kwargs):
        value = read(*args, **kwargs)
        return dataclasses.replace(value, supported=value.positive_contribution)
    with patch.object(owner, 'read_cached_atlas_triplet', coverage_only):
        coverage_failure, log = run_target('test_preserves_science_and_separates_support_without_quality_threshold')
    (OUT / 'coverage-only-mutant.txt').write_text(log, encoding='utf-8')
    assert coverage_failure['failures'] == 1 and coverage_failure['errors'] == 0
    gate = owner.checked_source_files
    calls = [0]
    def skip_final(*args):
        calls[0] += 1
        return gate(*args) if calls[0] == 1 else []
    with patch.object(owner, 'checked_source_files', skip_final):
        change_failure, log = run_target('test_source_change_after_parse_cannot_escape_as_a_bundle')
    (OUT / 'final-guard-mutant.txt').write_text(log, encoding='utf-8')
    assert change_failure['failures'] == 1 and change_failure['errors'] == 0
    # Re-run only the two affected checks with the original implementation.
    restored = []
    for name in ('test_preserves_science_and_separates_support_without_quality_threshold',
                 'test_source_change_after_parse_cannot_escape_as_a_bundle'):
        result, log = run_target(name)
        assert result['passed']
        restored.append(result)
        (OUT / (name + '.txt')).write_text(log, encoding='utf-8')
    acquisition = json.loads((ACQ / 'acquisition.json').read_bytes())
    products = {item['operation']: {**item['raw'], 'state': 'CHECKED' if item['state'] == 'CHECKED_NATIVE_ARRAY' else item['state'],
                'receipt': {'completeArrayReceived': item.get('completeArrayReceived') is True}} for item in acquisition['sourceFiles']}
    real = owner.read_cached_atlas_triplet(ROOT, products, coadd_id='1507p696_ac51')
    wrong = dataclasses.replace(real, supported=real.positive_contribution)
    false_available = wrong.supported & ~real.supported
    assert int(false_available.sum()) == 25
    assert np.all(~real.intensity_finite[false_available]) and np.all(~real.uncertainty_known[false_available])
    assert [bind(path) for path in source_paths] == before
    result = {'scope': 'Bounded in-memory owner/guard mutations, no production file or source data mutation',
        'sourceBindingsBefore': before, 'sourceBindingsAfter': before,
        'coverageOnlyMutation': coverage_failure, 'skipFinalGuardMutation': change_failure,
        'restoredAffectedChecks': restored, 'real129SquareCoverageOnlyFalseAvailablePixels': 25,
        'mutationsDetected': True, 'adopted': False, 'quality': 'FAILED_OR_UNVERIFIED'}
    (OUT / 'result.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'mutationsDetected': True, 'restoredAffectedChecksPassed': True,
                      'actualCoverageOnlyFalseAvailablePixels': 25, 'productionFilesUnchangedByMutation': True}))


if __name__ == '__main__':
    main()
