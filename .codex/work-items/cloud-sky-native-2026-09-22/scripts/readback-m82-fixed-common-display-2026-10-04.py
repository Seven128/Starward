"""Saved fixed-display consumers: real alpha, source clipping and old core facts."""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image

GEN = ROOT / 'output/allwise-w3-m82-fixed-common-display-1004-r1'
OUT = ROOT / 'output/allwise-w3-m82-fixed-common-readback-1004-r1'


def bind(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1048576):
            h.update(chunk)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': h.hexdigest()}


def verify(records):
    assert [bind(ROOT / record['path']) for record in records] == records


def rgba(path):
    with Image.open(path) as image:
        image.verify()
    with Image.open(path) as image:
        image.load()
        return np.array(image.convert('RGBA'))


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    binding = json.loads((GEN / 'binding.json').read_bytes())
    verify(binding['inputs'])
    verify(binding['outputs'])
    report = json.loads((GEN / 'result.json').read_bytes())
    assert report['inputsBefore'] == report['inputsAfter']
    verify(report['checkpointBindingsAfter'])
    assert report['checkpointBindingsBefore'] == report['checkpointBindingsAfter']
    recipe = json.loads((GEN / 'recipe.json').read_bytes())
    assert recipe['fixedLimits'] == [260.0, 1000.0] and recipe['fixedAsinhScale'] == .1
    assert recipe['scientificResampling'] is False and recipe['perFieldFitting'] is False and recipe['adopted'] is False
    assert all(level['sharedRecipe'] == report['recipe'] for level in report['levels'])
    summaries = []
    for level in report['levels']:
        science = np.load(ROOT / level['science']['path'], allow_pickle=False)
        available = np.load(ROOT / level['availability']['path'], allow_pickle=False)
        current = rgba(ROOT / level['png']['path'])
        old = rgba(ROOT / level['oldDiagnostic']['path'])
        assert np.array_equal(available, np.isfinite(science))
        assert np.array_equal(current[:, :, 3], available.astype(np.uint8) * 255)
        assert np.array_equal(current[:, :, 3], old[:, :, 3])
        assert hashlib.sha256(current.tobytes()).hexdigest() == level['decodedRGBABytesSha256']
        black = available & np.all(current[:, :, :3] == 0, axis=-1)
        white = available & np.all(current[:, :, :3] == 255, axis=-1)
        below = available & (science <= 260)
        above = available & (science >= 1000)
        assert np.all(black[below]) and np.all(white[above])
        assert int(black.sum()) == level['finiteOpaqueBlackPixels']
        assert int(white.sum()) == level['finiteWhitePixels']
        assert int(np.any(current[:, :, :3] != old[:, :, :3], axis=-1).sum()) == level['changedRGBPixelsAgainstOldIndependentCuts']
        assert np.all(current[:, :, 3][black] == 255)
        metadata = json.loads((GEN / f"{level['level'].lower()}-metadata.json").read_bytes())
        assert metadata['stretch'] == recipe
        assert metadata['sourceFiniteMask']['missingPixels'] == int((~available).sum())
        core = level['prior17FiniteCore']
        for pixel in core:
            x, y = pixel['xy']
            assert available[y, x] and pixel['actualSourceScalar'] == float(science[y, x])
            assert pixel['rgba'] == current[y, x].tolist() and current[y, x, 3] == 255
        summaries.append({'level': level['level'], 'finiteOpaqueBlack': int(black.sum()),
            'oldFiniteOpaqueBlack': int((available & np.all(old[:, :, :3] == 0, axis=-1)).sum()),
            'finiteWhite': int(white.sum()), 'oldFiniteWhite': int((available & np.all(old[:, :, :3] == 255, axis=-1)).sum()),
            'actualSourceAtOrBelow260': int(below.sum()), 'actualSourceAtOrAbove1000': int(above.sum()),
            'actualSourceRangeAboveDisplayUpper': [float(science[above].min()), float(science[above].max())] if above.any() else None,
            'sourceDistinctValuesAbove1000': int(len(np.unique(science[above]))),
            'nonfiniteAlphaZero': int((~available).sum()), 'savedAlphaAndRGBAHashExact': True,
            'prior17CoreAllFiniteOpaque': len(core) == 17 if core else None,
            'prior17CoreBlackCount': sum(pixel['rgba'][:3] == [0, 0, 0] for pixel in core) if core else None})
    verify(report['checkpointBindingsAfter'])
    result = {'scope': 'Root readback of actual saved PNG and unchanged science; no transfer/sampler replay or independent review',
        'producer': bind(GEN / 'result.json'), 'recipe': report['recipe'], 'reader': bind(Path(__file__)),
        'levels': summaries, 'sameFixedRecipeAllLevels': True, 'inputsExact': True,
        'quality': 'FAILED_OR_UNVERIFIED', 'decision': 'NOT_ADOPTED_FIXED_RANGE_DOES_NOT_REPAIR_SOURCE_CORE_OR_FULL_QUALITY',
        'limits': ['Source samples above display upper are distinct scientific values but map to white; not evidence of detector saturation.',
                   'Black/white counts and broad median similarity do not qualify spatial seams, resolution, weak structure or registration.',
                   'BUNIT/physical units, source PSF and physical dark-core cause remain unknown; no further parameter sweep.']}
    (OUT / 'result.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'pass': True, 'levels': summaries, 'decision': result['decision']}))


if __name__ == '__main__':
    main()
