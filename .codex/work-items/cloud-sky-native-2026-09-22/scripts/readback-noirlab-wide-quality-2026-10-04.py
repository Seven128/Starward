"""Read saved source/master/writer/Scene outputs, without replaying runtime."""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
SRC = ROOT / 'output/noirlab-prepared-wide-source-1004-r1'
QUALITY = ROOT / 'output/noirlab-prepared-wide-quality-1004-r1'
VALID = ROOT / 'output/noirlab-prepared-wide-validation-1004-r1'
SCENE = ROOT / 'output/playwright/cloud-sky-noirlab-wide-quality-1004-r1'
OUT = ROOT / 'output/noirlab-prepared-wide-readback-1004-r2'
sys.path[:0] = [str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image

def digest(b):
    return hashlib.sha256(b).hexdigest()

def bound(p):
    b = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix() if p.is_relative_to(ROOT) else p.as_posix(), 'bytes': len(b), 'sha256': digest(b)}

def check(row):
    return bound(ROOT / row['path']) == row

def save(name, value):
    with (OUT / name).open('x', encoding='utf-8') as f:
        json.dump(value, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write('\n')

def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    sources = json.loads((SRC / 'source-identities-and-avm.json').read_bytes())
    q = json.loads((QUALITY / 'result.json').read_bytes())
    assert json.loads((QUALITY / 'inputs-before.json').read_bytes()) == json.loads((QUALITY / 'inputs-after.json').read_bytes())
    # Original quality trial bindings contain the pre-fix owner. Its earlier
    # receipts remain historical, not a claim that current owner equals them.
    pre_owner = TASK / 'tmp/noirlab-empty-spatial-before-2026-10-04/prepared_rgb_observation.py'
    for row in json.loads((QUALITY / 'inputs-before.json').read_bytes()):
        if row['path'] == 'data-pipelines/deep-sky/prepared_rgb_observation.py':
            assert bound(pre_owner)['sha256'] == row['sha256']
        else:
            assert check(row), row['path']
    packages = json.loads((VALID / 'result.json').read_bytes())
    for candidate in packages:
        assert check(candidate['manifest']) and check(candidate['sourceAdmission'])
        rid = 'noao-m81m82' if candidate['objectRef'] == 'M:82' else 'noao1309a'
        admission = json.loads((ROOT / candidate['sourceAdmission']['path']).read_bytes())
        assert admission['normalization']['removedEmptySpatialNotes'] is True
        assert admission['normalization']['removedEmptySpectralNotes'] is True
        assert check(admission['normalization']['parserXml'])
        current_before = json.loads((VALID / rid / 'inputs-before.json').read_bytes())
        assert current_before == json.loads((VALID / rid / 'inputs-after.json').read_bytes())
        for category in ('files', 'source', 'historicalNominal', 'allPublishedAssets'):
            assert all(check(row) for row in current_before[category])
        manifest = json.loads((ROOT / candidate['manifest']['path']).read_bytes())
        assert candidate['publicationHash'] == manifest['publicationHash']
        base = (ROOT / candidate['manifest']['path']).parent
        for level in manifest['levels'].values():
            asset = bound(base / level['file'])
            assert asset['bytes'] == level['bytes'] and asset['sha256'] == level['sha256']
        assert bound(VALID / rid / 'master-rgba.npy')['sha256'] == bound(QUALITY / rid / 'master-rgba.npy')['sha256']
    actual = json.loads((SCENE / 'result.json').read_bytes())
    assert actual['status'] == 'PASSED_BOUNDED_WIDE_SOURCE_SOFTWARE_SCENE' and len(actual['rows']) == 8
    assert actual['beforeAfterExact'] and actual['errors'] == []
    for before_name, after_name in [('inputs-before.json', 'inputs-after.json'), ('parsed-inputs.json', 'parsed-inputs-after.json')]:
        rows = json.loads((SCENE / before_name).read_bytes())
        assert rows == json.loads((SCENE / after_name).read_bytes())
        assert all(check(row) for row in rows)
    readbacks = []
    for row in actual['rows']:
        name = row['condition']['name']
        rgba_raw, bg_raw = (SCENE / (name + '.rgba')).read_bytes(), (SCENE / (name + '-baseline.rgba')).read_bytes()
        assert digest(rgba_raw) == row['rgba']['sha256'] and len(rgba_raw) == row['rgba']['bytes']
        assert digest(bg_raw) == row['baselineRgbaSha256']
        image = np.array(Image.open(SCENE / (name + '.png')).convert('RGBA'))
        rgba = np.frombuffer(rgba_raw, dtype=np.uint8).reshape(844, 390, 4)[::-1]
        bg = np.frombuffer(bg_raw, dtype=np.uint8).reshape(844, 390, 4)[::-1]
        assert np.array_equal(image, rgba)
        assert bound(SCENE / (name + '.png'))['sha256'] == row['png']['sha256']
        changed = np.any(rgba[:, :, :3] != bg[:, :, :3], axis=-1)
        assert int(changed.sum()) == row['differentPixels']
        ys, xs = np.nonzero(changed)
        bounds = [int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1]
        # Saved actual image delta at its four participating outer edges,
        # with duplicate corners removed. Descriptive, not a pass threshold.
        delta = np.abs(rgba[:, :, :3].astype(np.int16) - bg[:, :, :3].astype(np.int16))
        x0,y0,x1,y1 = bounds
        edge = np.concatenate([delta[y0, x0:x1], delta[y1-1, x0:x1], delta[y0+1:y1-1, x0], delta[y0+1:y1-1, x1-1]])
        assert row['liveTextureObjects'] == 0 and row['failed'] == [] and row['error'] == 0
        assert row['completion']['kind'] == 'prepared' and row['completion']['fields'] == [{'slot':'fine','level':'OVERVIEW'}]
        readbacks.append({'name': name, 'glToPngExact': True, 'changedPixels': int(changed.sum()),
                         'changedBoundsXYExclusive': bounds,
                         'encodedBoundaryDeltaPercentiles': np.percentile(edge, [5,50,95], axis=0).tolist()})
    protected = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    assert all(bound(ROOT / r['path'])['sha256'] == r['sha256'] for r in protected)
    groups = [SRC, QUALITY, VALID, ROOT / 'output/noirlab-prepared-wide-publication-1004-r1', SCENE]
    disk = [{'path': p.relative_to(ROOT).as_posix(), 'files': sum(1 for x in p.rglob('*') if x.is_file()),
             'logicalBytes': sum(x.stat().st_size for x in p.rglob('*') if x.is_file())} for p in groups]
    result = {'status': 'PASSED_SAVED_WIDE_SOURCE_OUTPUT_READBACK', 'sources': sources,
        'cases': [{'objectRef': c['objectRef'], 'catalogueCentreSourceFitsXY': c['catalogueCentreSourceFitsXY'],
                   'levels': [{'level': r['level'], 'geometricSupportFraction': r['geometricSupportFraction'],
                               'approximateSourcePixelsAcrossField': r['approximateSourcePixelsAcrossField'], 'bytes': r['bytes']} for r in c['levels']]} for c in q['cases']],
        'packages': packages, 'sceneRows': readbacks, 'diskRetentionLogical': disk,
        'limits': ['Root saved-output review, not independent review or target runtime.',
                   'All eight actual captures viewed: wider sources restore surrounding observations but current crop background rectangles remain FAILED.',
                   'Fine NOIRLab publication samples are softer/differently coloured than Hubble; no mixed-source publication or fusion is adopted.',
                   'Geometric 100 percent is not science coverage; publisher Full is not independent astrometry.',
                   'Logical retained files are not full machine disk/RSS/wire/capacity and exclude this reader folder.']}
    save('result.json', result)
    print(json.dumps({'status': result['status'], 'readbacks': len(readbacks), 'logicalRetainedBytes': sum(r['logicalBytes'] for r in disk), 'sourcesNotAdopted': 2}))

if __name__ == '__main__':
    main()
