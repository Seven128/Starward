"""Close saved successful native comparisons without replaying the matrix."""
from pathlib import Path
import importlib.util
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OUT = ROOT / 'output/sdss-m82-fpm-frame-intersection-1004-r1'
spec = importlib.util.spec_from_file_location('previous', TASK / 'scripts/readback-m82-fpm-frame-intersection-2026-10-04.py')
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)
np, bind = previous.np, previous.bind


def main():
    assert not (OUT / 'result-r2.json').exists()
    source = json.loads((previous.GEN / 'result.json').read_bytes())
    cp = json.loads((ROOT / source['checkpoint']['path']).read_bytes())
    changed = [p['path'] for p in cp['currentSources'] if bind(ROOT / p['path']) != p]
    assert changed == []
    new_owners = ['data-pipelines/deep-sky/sdss_frame_quality.py', 'data-pipelines/deep-sky/test_sdss_frame_quality.py']
    assert not set(new_owners) & {p['path'] for p in cp['currentSources']}
    for pin in cp['protected'] + cp['evidence'] + source['griInputs']:
        assert bind(ROOT / pin['path']) == pin
    (OUT / 'root-closeout-r1-failed.json').write_text(json.dumps({
        'failedReader': bind(OUT / 'executed-reader.py'),
        'failure': 'assert set(changed)==allowed at line 79',
        'actualCheckpointChanges': changed,
        'reason': 'Both changed offline owner/test were absent from r76 currentSources; expected equality was invalid.',
        'priorExecutedComparisons': 'All 18 raw-source vector masks exact; all 6 psField rereads completed before the assertion.',
        'replay': False,
    }, indent=2) + '\n', encoding='utf-8')
    checked, recovered, psfs = [], [], []
    for record in source['sourceRecords']:
        assert bind(ROOT / record['raw']['path']) == record['raw']
        if record['filename'].startswith('psField'):
            psfs.append({'source': record['raw'], 'scientificQuality': 'UNKNOWN'})
            continue
        admission = OUT / (record['filename'] + '.current-admission.json')
        flags_file = OUT / (record['filename'] + '.flags.npz')
        receipt = json.loads(admission.read_bytes())
        assert receipt['source']['sha256'] == record['raw']['sha256']
        assert receipt['pixelFlags']['frameIntersection'] == 'fpM-native-frame-span-intersection-v1'
        with np.load(flags_file, allow_pickle=False) as saved:
            flags = saved['flags']
            assert flags.shape == (1489, 2048) and flags.dtype == np.uint16
            for i, plane in enumerate(receipt['pixelFlags']['planes']):
                assert np.count_nonzero(flags & (1 << i)) == plane['unionPixels']
        outside = sum(p['sourceSpanPixelsOutsideFrame'] for p in receipt['pixelFlags']['planes'])
        if record.get('qualityAdmissionError'):
            assert record['qualityAdmissionError'] == 'sdss_quality_fpm_span_coordinate_invalid'
            assert outside > 0
            recovered.append(record['filename'])
        else:
            old = json.loads((ROOT / record['qualityAdmission']['path']).read_bytes())
            assert outside == 0
            assert [p['unionPixels'] for p in old['pixelFlags']['planes']] == [p['unionPixels'] for p in receipt['pixelFlags']['planes']]
        checked.append({'source': record['raw'], 'identity': record['identity'],
            'originalAcquisitionState': record['state'], 'outsideSourcePixels': outside,
            'currentAdmission': bind(admission), 'flags': bind(flags_file),
            'nativeFlagPixelsIndependentlyComparedInPriorExecution': 1489 * 2048,
            'savedAllPlaneCountsExact': True, 'scientificQuality': 'UNKNOWN'})
    assert len(checked) == 18 and len(recovered) == 3 and len(psfs) == 6
    report = {'scope': 'Root self-readback; saved native comparisons completed before original closeout failure, no matrix replay',
        'producerResult': bind(previous.GEN / 'result.json'), 'failedExecutedReader': bind(OUT / 'executed-reader.py'),
        'closeoutReader': bind(Path(__file__)), 'currentOfflineOwners': [bind(ROOT / p) for p in new_owners],
        'fpMInputs': checked, 'psFieldInputs': psfs, 'previouslyUnqualifiedInputsRecovered': recovered,
        'priorExecutedAllNativeMasksExact': True, 'nativePixelsCompared': 18 * 1489 * 2048,
        'oldCheckpointSourcesProtectedEvidenceAndGriInputsExact': True,
        'sourceCaptureGap': new_owners, 'scienceOrDisplayEdited': False,
        'ordinaryAdoption': False, 'scientificQuality': 'UNVERIFIED', 'independentReview': 'MISSING'}
    (OUT / 'executed-closeout.py').write_bytes(Path(__file__).read_bytes())
    (OUT / 'result-r2.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'savedMasks': len(checked), 'recovered': recovered,
        'oldEvidenceExact': len(cp['evidence']), 'sourceCaptureGap': new_owners}))


if __name__ == '__main__':
    main()
