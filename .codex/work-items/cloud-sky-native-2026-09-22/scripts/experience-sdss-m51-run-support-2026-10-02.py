"""Read frozen coherent field support by run, without changing pixels/weights.

Field PSF metadata suggests a quality question, not a new source selection.
This answers coverage only; it does not measure seeing or manufacture detail.
"""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np

SOURCE = ROOT / 'output/sdss-m51-gri-mosaic-candidate-1002-r2'
OUTPUT = ROOT / 'output/sdss-m51-run-support-1002-r1'


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}


def main():
    assert not OUTPUT.exists(), 'frozen generations must not be overwritten'
    candidate_binding = bind(SOURCE / 'candidate.json')
    assert candidate_binding['sha256'] == '73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
    candidate = json.loads((SOURCE / 'candidate.json').read_text('utf8'))
    shape = (candidate['pixels'], candidate['pixels'])
    bindings = [candidate_binding, bind(Path(__file__).resolve())]
    by_run = {}
    fields = []
    for key, entries in candidate['mosaic']['diagnostics'].items():
        run = key.split('/')[1]
        joint = np.ones(shape, dtype=bool)
        for band in ('g', 'r', 'i'):
            for role in ('footprint', 'finite-neighbors'):
                declaration = entries[f'{band}-{role}']
                path = SOURCE / declaration['file']
                actual = bind(path)
                assert (actual['bytes'], actual['sha256']) == (declaration['bytes'], declaration['sha256'])
                bindings.append(actual)
                value = np.load(path, mmap_mode='r', allow_pickle=False)
                assert value.shape == shape and value.dtype == np.bool_
                joint &= value
        declaration = entries['normalized-weight']
        path = SOURCE / declaration['file']
        actual = bind(path)
        assert (actual['bytes'], actual['sha256']) == (declaration['bytes'], declaration['sha256'])
        bindings.append(actual)
        weight = np.load(path, mmap_mode='r', allow_pickle=False)
        assert weight.shape == shape and np.isfinite(weight).all()
        assert np.array_equal(weight > 0, joint)
        fields.append({'fieldKey': key, 'coherentPixels': int(joint.sum())})
        by_run.setdefault(run, np.zeros(shape, dtype=bool))[:] |= joint
    all_runs = np.logical_or.reduce(list(by_run.values()))
    assert all_runs.all() and int(all_runs.sum()) == candidate['science']['jointAvailablePixels']
    regions = {}
    for level, declaration in candidate['levels'].items():
        x0, y0, x1, y1 = declaration['masterCrop']['boundsXYExclusive']
        region = np.s_[y0:y1, x0:x1]
        total = (x1-x0)*(y1-y0)
        regions[level] = {'masterBoundsXYExclusive': [x0, y0, x1, y1], 'masterPixels': total,
            'runs': {run: {'coherentPixels': int(mask[region].sum()),
                'unavailablePixels': int(total-mask[region].sum()), 'complete': bool(mask[region].all())}
                for run, mask in sorted(by_run.items())}}
    result = {'inputs': bindings, 'fields': fields, 'regions': regions,
        'scope': 'Actual existing same-field gri four-neighbor support by run only. No new source, source WCS, RGB, weight, image, publication or runtime change. A complete run is not artifact-free, precise astrometry, spatial PSF or quality acceptance; scalar field PSF does not adopt a new weight/selection.'}
    assert all(bind(ROOT / item['path']) == item for item in bindings)
    OUTPUT.mkdir()
    (OUTPUT / 'result.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf8')
    print(json.dumps({'result': bind(OUTPUT / 'result.json'), 'regions': regions}))


if __name__ == '__main__':
    main()
