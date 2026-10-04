"""Reuse the saved-source calculation reader and check the new owner's effects."""
from pathlib import Path
import hashlib
import importlib.util
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from astropy.io import fits

GEN = ROOT / 'output/allwise-w3-m82-atlas-core-support-1004-r2'
OLD = ROOT / 'output/allwise-w3-m82-atlas-core-support-1004-r1'
OUT = ROOT / 'output/allwise-w3-shared-atlas-source-readback-1004-r1'


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def main():
    reader_path = TASK / 'scripts/readback-m82-atlas-core-support-2026-10-04.py'
    spec = importlib.util.spec_from_file_location('original_native_scalar_reader', reader_path)
    reader = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(reader)
    reader.GEN, reader.OUT = GEN, OUT
    reader.main()
    (OUT / 'executed-wrapper.py').write_bytes(Path(__file__).read_bytes())
    report = json.loads((GEN / 'result.json').read_bytes())
    old = json.loads((OLD / 'result.json').read_bytes())
    data = {}
    for key, item in report['nativeArrays'].items():
        with fits.open(ROOT / item['raw']['path'], memmap=False) as hdus:
            data[key] = np.array(hdus[0].data)
    expected = (np.isfinite(data['int']) & np.isfinite(data['unc']) & (data['unc'] >= 0) &
                np.isfinite(data['cov']) & (data['cov'] > 0))
    shared = report['sharedSourceOwner']
    assert shared['supportedPixels'] == int(expected.sum()) == 16591
    assert shared['positiveContributionPixels'] == int((data['cov'] > 0).sum()) == 16616
    assert shared['intensityFinitePixels'] == 16591
    assert shared['coverageKnownPixels'] == 16641 and shared['uncertaintyKnownPixels'] == 16591
    assert shared['quality'] == 'UNKNOWN_NOT_ALPHA_OR_CONFIDENCE'
    assert report['nativePatch'] == old['nativePatch'] and report['summaries'] == old['summaries']
    assert report['inspectionPNG']['sha256'] == old['inspectionPNG']['sha256']
    current_points = json.loads((GEN / 'mapped-core-points.json').read_bytes())
    old_points = json.loads((OLD / 'mapped-core-points.json').read_bytes())
    assert current_points == old_points
    result = {'scope': 'Root current-owner real consumer effect readback, not independent review or quality acceptance',
        'reader': bind(Path(__file__)), 'producer': bind(GEN / 'result.json'), 'sharedOwner': shared,
        'actualSupportGuardRejects25CoverageOnlyFalseAvailability': True,
        'all36CoordinatesAndNearestFourNeighborFactsByteEquivalent': True,
        'sourceInspectionPNGByteIdenticalToPriorConsumer': True,
        'quality': 'FAILED_OR_UNVERIFIED', 'adopted': False, 'oldRawScienceAndImageUnchanged': True}
    (OUT / 'shared-owner-effects.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'sharedOwnerActualEffectPass': True, 'supportedPixels': 16591,
                      'coverageOnlyFalseAvailabilityRejected': 25, 'oldCoordinatesAndImageExact': True}))


if __name__ == '__main__':
    main()
