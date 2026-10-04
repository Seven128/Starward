"""Saved real-v2 page pixels, HTTP identities and final resources; no adoption."""
from pathlib import Path
import hashlib
import io
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image

PAGE = ROOT / 'output/playwright/cloud-sky-prepared-progressive-page-1005-r1'
OUT = ROOT / 'output/prepared-progressive-readback-1005-r1'


def read(path):
    return json.loads(path.read_bytes())


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def delta(a, b):
    difference = np.abs(a[:, :, :3].astype(np.int16) - b[:, :, :3].astype(np.int16))
    return {'changedRgbChannels': int((difference != 0).sum()), 'changedPixels': int(np.any(difference != 0, axis=2).sum()),
            'maximumDelta': int(difference.max()), 'strict': 'EXACT' if not difference.any() else 'FAILED_STRICT_PIXEL_RESTORATION'}


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    runtime = read(PAGE / 'result.json')
    assert runtime['status'] == 'ACTUAL_TARO_PREPARED_PROGRESSIVE_PUBLICATION_PAGE_DEVELOPMENT'
    p = read(ROOT / 'output/prepared-progressive-publication-1005-r1/manifest.json')
    scope = read(PAGE / 'm82-scope-result.json')
    assert p['imageVersion'] == 'prepared-optical-v2' and scope['hash'] == p['publicationHash']
    assert scope['successfulPreparedBinaryTransfers'] == 3 and scope['injectedDetailFailures'] == 1
    assert scope['coarseFallback'] and scope['sourceBackWarmNoNewBinary'] and scope['hideShowWarmNoNewBinary']
    for stem in ('source-bindings', 'backend-source-bindings'):
        before, after = read(PAGE / (stem + '-before.json')), read(PAGE / (stem + '-after.json'))
        assert before == after
        for row in before:
            assert bind(ROOT / row['path']) == row
    assert read(PAGE / 'current-baseline-before.json') == read(PAGE / 'current-baseline-after.json')
    for row in read(PAGE / 'current-baseline-after.json')['protected']:
        assert bind(ROOT / row['path']) == row
    captures = []
    pixels = {}
    paints = {}
    for path in sorted(PAGE.glob('software-*.rgba')):
        if path.name.endswith('-after.rgba'):
            continue
        name = path.stem
        boundary = read(PAGE / (name + '-capture-boundaries.json'))
        assert boundary['beforeHash'] == boundary['afterHash'] == bind(path)['sha256']
        assert path.read_bytes() == (PAGE / (name + '-after.rgba')).read_bytes()
        meta = read(PAGE / (name + '-pixels.json'))
        rgba = np.frombuffer(path.read_bytes(), np.uint8).reshape(meta['height'], meta['width'], 4)[::-1]
        with Image.open(PAGE / (name + '.png')) as image:
            assert np.array_equal(np.array(image.convert('RGBA')), rgba), name
        pixels[name] = rgba
        paints[name] = read(PAGE / (name + '-paint.json'))
        captures.append({'name': name, 'rgba': bind(path), 'png': bind(PAGE / (name + '.png')), 'fullGlPngGlExact': True})
    assert len(captures) == 8
    restores = []
    for first, second in (('software-m82-source-before', 'software-m82-source-back'), ('software-m82-detail', 'software-m82-warm-show')):
        assert paints[first]['view'] == paints[second]['view']
        restores.append({'first': first, 'second': second, **delta(pixels[first], pixels[second])})
    current = read(PAGE / 'actual-progressive-detail.json')
    for level in ('MEDIUM', 'DETAIL'):
        asset = p['levels'][level]
        assert any(row['sha256'] == asset['sha256'] and row['width'] == row['height'] == 1024 for row in current['frameResources']['sourceImages'])
    assert current['completedSource']['kind'] == 'prepared' and current['completedSource']['publicationHash'] == p['publicationHash']
    assert any(row['level'] == 'DETAIL' and row['image']['width'] == 1024 for row in current['completedSource']['participatingFields'])
    requests = read(PAGE / 'requests.json')
    binary = [row for row in requests if row.get('binary') and row['route'].startswith('/v2/sky/prepared-optical/' + p['publicationHash'] + '/') and row.get('status') == 200]
    assert len(binary) == 3
    for level, asset in p['levels'].items():
        rows = [row for row in binary if row['route'] == asset['downloadUrl']]
        assert len(rows) == 1 and rows[0]['sha256'] == asset['sha256'] and rows[0]['receivedBytes'] == asset['bytes'], level
    assert sum(row['receivedBytes'] for row in binary) == 4357051
    final = read(PAGE / 'phases.json')[-1]
    assert final['name'] == 'unloaded-cleared'
    for owner in final['owners']:
        for key in ('entries', 'leased', 'bytes', 'reserved', 'running', 'pending', 'retired'):
            assert owner[key] == 0, (key, owner)
    assert all(value == 0 for value in final['gpu'].values())
    for key in ('activeDecodedImageHandles', 'sourceRgbaEquivalentBytes', 'gpuTextureUploadModelBytes', 'gpuBufferUploadModelBytes'):
        assert final['resources'][key] == 0, key
    old_failure = ROOT / 'output/playwright/cloud-sky-prepared-boundary-pairs-1004-r1/failed.json'
    assert bind(old_failure)['sha256'] == '65a039503d6b2b6fa5bcabcb94ba811f33931f58f5864859a4d4a77626343f5f'
    result = {'status': 'SAVED_REAL_V2_HTTP_PAGE_RESOURCE_AND_PIXEL_READBACK',
        'manifest': bind(ROOT / 'output/prepared-progressive-publication-1005-r1/manifest.json'), 'actualAt': current['at'],
        'actualView': current['view'], 'captures': captures, 'newEpochRestoration': restores,
        'originalBoundaryStrictFailureStillPreserved': bind(old_failure),
        'actualReadyFrame': current['frameResources'], 'actualReadyResources': current['resources'],
        'wholeJourneyResourceSummary': read(PAGE / 'resource-summary.json'),
        'finalActiveAndRetiredZero': True, 'requests': len(requests), 'receivedBodyBytes': sum(row.get('receivedBytes', 0) for row in requests),
        'preparedPngBodyBytesOnlyOnce': sum(row['receivedBytes'] for row in binary), 'ordinaryAdopted': False,
        'quality': 'UNVERIFIED_OR_FAILED; source rectangles/weak structures/day-twilight/absolute registration remain open.',
        'independentReview': 'MISSING', 'nativePhysicalCapacity': 'UNVERIFIED',
        'limits': 'Current 2026-10-05 actual page epoch, not prior 2026-10-04 boundary image/time restoration. Original qualifier and admitted v2 hashes; no task bitmap substitution/suppression. Saved logical resource models are not physical peaks or 200DAU capacity. HTTP loopback body/cache path is not proof of production Caddy/static/TLS/public wire.'}
    with (OUT / 'result.json').open('x', encoding='utf-8', newline='\n') as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2, allow_nan=False)
        handle.write('\n')
    print(json.dumps({'status': result['status'], 'actualAt': result['actualAt'], 'captures': len(captures),
        'restoration': restores, 'requests': result['requests'], 'bodyBytes': result['receivedBodyBytes'],
        'currentNativeRgbaEquivalent': current['resources']['sourceRgbaEquivalentBytes'],
        'preparedBytes': result['preparedPngBodyBytesOnlyOnce']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
