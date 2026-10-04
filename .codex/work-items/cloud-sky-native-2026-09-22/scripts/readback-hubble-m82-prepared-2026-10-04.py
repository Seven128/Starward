"""Read saved Prepared pixels after the producer's final-report failure; no reprocessing."""
from pathlib import Path
import hashlib
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image

OUT = ROOT / 'output/hubble-m82-prepared-coverage-1004-r1'

def identity(path):
    data = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest()}

def main():
    before = json.loads((OUT / 'inputs-before.json').read_bytes())
    checked = []
    for old in before:
        path = ROOT / old['path']
        if path.name == 'experience-hubble-m82-prepared-coverage-2026-10-04.py':
            path = OUT / 'executed-script.py'
        actual = identity(path)
        assert (actual['bytes'], actual['sha256']) == (old['bytes'], old['sha256']), old['path']
        checked.append({'original': old, 'readback': actual})
    meta = json.loads((OUT / 'master.json').read_bytes())
    master = np.load(OUT / 'master-rgba.npy', allow_pickle=False)
    assert master.shape == (2048, 2048, 4) and master.dtype == np.uint8
    assert hashlib.sha256(master.tobytes()).hexdigest() == meta['rgba']['sha256']
    rows = []
    for name, extent, factor in [('overview', 2048, 4), ('medium', 1024, 2), ('detail', 512, 1)]:
        start = (2048 - extent) // 2
        crop = master[start:start+extent, start:start+extent]
        weights = np.zeros((512, 512), dtype=np.uint64)
        weighted = np.zeros((512, 512, 3), dtype=np.uint64)
        for dy in range(factor):
            for dx in range(factor):
                sub = crop[dy::factor, dx::factor].astype(np.uint64)
                weights += sub[:, :, 3]
                weighted += sub[:, :, :3] * sub[:, :, 3:4]
        rgb = np.zeros((512, 512, 3), dtype=np.float64)
        np.divide(weighted, weights[:, :, None], out=rgb, where=weights[:, :, None] > 0)
        expected = np.dstack((np.rint(rgb).astype(np.uint8),
                             np.rint(weights / (factor * factor)).astype(np.uint8)))
        with Image.open(OUT / (name + '.png')) as image:
            actual = np.array(image.convert('RGBA'))
        assert np.array_equal(actual, expected), name
        alpha = actual[:, :, 3]
        rows.append({'level': name.upper(), 'file': identity(OUT / (name + '.png')),
            'fieldDegrees': math.degrees(2 * math.atan(math.tan(math.radians(meta['fieldDegrees'])/2) * extent/2048)),
            'sourceCropPixels': extent * extent,
            'geometricSupportedFraction': float(np.mean(crop[:, :, 3] == 255)),
            'outputOpaquePixels': int(np.sum(alpha == 255)),
            'outputPartialPixels': int(np.sum((alpha > 0) & (alpha < 255))),
            'outputTransparentPixels': int(np.sum(alpha == 0)),
            'edgeAlphaNonzero': {k: int(np.count_nonzero(v)) for k,v in
                {'top': alpha[0], 'bottom': alpha[-1], 'left': alpha[:,0], 'right': alpha[:,-1]}.items()},
            'rgbaDecodedBytes': actual.nbytes, 'savedPixelReadback': 'EXACT'})
    result = {'state': 'SAVED_OUTPUT_READBACK_ONLY_NOT_PUBLICATION_OR_ADOPTION',
        'producerStatus': 'FAILED_AFTER_PNG_SAVE_AT_REPORT_ATTRIBUTE',
        'producerElapsedSeconds': None, 'producerPeakMemoryBytes': None,
        'source': meta['source'], 'geometry': meta['sourceGeometry'],
        'registration': meta['registration'], 'scientificAvailability': 'UNKNOWN',
        'sourceDecodedRgbBytes': 4000*3116*3, 'sourceRgbaEquivalentBytes': 4000*3116*4,
        'master': identity(OUT/'master-rgba.npy'), 'levels': rows,
        'inputsReadback': checked,
        'currentProducer': identity(ROOT / before[-1]['path']),
        'reader': identity(Path(__file__)),
        'limits': ['readback is after failure, not an original successful after-receipt',
                   'rectangular geometric support is not scientific validity',
                   'no re-download, source projection, PNG encoding or runtime execution',
                   'registration, complete visual quality, shared blending and target runtime unverified']}
    with (OUT/'saved-output-readback.json').open('x', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write('\n')
    print(json.dumps({'state': result['state'], 'levels': rows}, ensure_ascii=False))

if __name__ == '__main__':
    main()
