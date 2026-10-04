"""Read saved current Prepared page outputs, without replaying page/source processing."""
from pathlib import Path
import hashlib
import json
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
LANE = ROOT / 'output/playwright/cloud-sky-prepared-m82-page-1004-r2'
OUT = ROOT / (sys.argv[1] if len(sys.argv) > 1 else 'output/hubble-m82-prepared-page-readback-1004-r2')
OUT.mkdir(exist_ok=False)

def read(path):
    return json.loads(Path(path).read_bytes())

def bind(path):
    path = Path(path)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

def save(name, value):
    with (OUT / name).open('x', encoding='utf-8') as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def difference(first, second):
    left = (LANE / (first + '.rgba')).read_bytes()
    right = (LANE / (second + '.rgba')).read_bytes()
    assert len(left) == len(right)
    delta = [abs(a-b) for a, b in zip(left, right)]
    return {'first': first, 'second': second, 'status': 'PASSED' if left == right else 'FAILED',
            'differentChannels': sum(v != 0 for v in delta), 'maxChannelDelta': max(delta),
            'firstSha256': hashlib.sha256(left).hexdigest(),
            'secondSha256': hashlib.sha256(right).hexdigest()}

(OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
try:
    pin = read(LANE / 'explicit-publication-input.json')
    manifest = ROOT / pin['manifest']['path']
    publication = read(manifest)
    assert bind(manifest) == pin['manifest']
    assert publication['publicationHash'] == pin['hash'] and not pin['ordinaryRegistry']
    for name in ['source-bindings', 'backend-source-bindings', 'current-baseline']:
        assert read(LANE / (name + '-before.json')) == read(LANE / (name + '-after.json')), name
    for name in ['source-bindings-before.json', 'backend-source-bindings-before.json', 'public-asset-read-bindings.json']:
        rows = read(LANE / name)
        rows = rows['unique'] if isinstance(rows, dict) else rows
        for row in rows:
            assert bind(ROOT / row['path']) == row, row['path']
    page_path = 'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'
    page_binding = next(r for r in read(LANE / 'source-bindings-before.json') if r['path'] == page_path)
    boundary = next(r for r in read(LANE / 'observed-boundaries.json') if r['path'] == page_path)
    assert boundary['originalSha256'] == page_binding['sha256'] == bind(ROOT / page_path)['sha256']
    phases = {r['name']: r for r in read(LANE / 'phases.json')}
    expected = {'m82-overview-actual-painted': 'OVERVIEW', 'm82-medium-actual-painted': 'MEDIUM',
                'm82-detail-outage-parent-painted': 'MEDIUM', 'm82-detail-retry-actual-painted': 'DETAIL',
                'm82-source-back-actual-painted': 'DETAIL', 'm82-warm-show-actual-painted': 'DETAIL',
                'm82-warm-overview-actual-painted': 'OVERVIEW'}
    for name, level in expected.items():
        phase = phases[name]
        packet = phase['completedSources']['optical']
        wanted = publication['levels'][level]
        assert packet['kind'] == 'prepared' and packet['publicationHash'] == pin['hash']
        assert any(f['level'] == level and f['sha256'] == wanted['sha256']
                   and f['image']['sha256'] == wanted['sha256'] and f['image']['status'] == 'decoded'
                   for f in packet['participatingFields'])
        assert any(i['family'] == 'prepared-optical' and i['sha256'] == wanted['sha256']
                   for i in phase['frameResources']['sourceImages'])
        assert any(i['reference'] == 'M:82' for i in phase['paintedObjects'])
    failure = phases['m82-detail-outage-parent-painted']
    assert failure['sdssHook']['updateFailed'] and failure['sdssHook']['renderedLevel'] == 'MEDIUM'
    assert '影像更新失败，保留已载图' in failure['text']
    requests = read(LANE / 'requests.json')
    optical = [r for r in requests if r['binary'] and pin['hash'] in r['route']]
    good = [r for r in optical if r['status'] == 200]
    assert len(good) == 3 and sum(r['status'] == 503 for r in optical) == 1
    for level, wanted in publication['levels'].items():
        got = next(r for r in good if r['route'].endswith('/' + wanted['file']))
        assert (got['receivedBytes'], got['sha256']) == (wanted['bytes'], wanted['sha256'])
        fact = bind(manifest.parent / wanted['file'])
        assert (fact['bytes'], fact['sha256']) == (wanted['bytes'], wanted['sha256'])
    captures = []
    for file in sorted(LANE.glob('software-*-pixels.json')):
        name = file.name.removesuffix('-pixels.json')
        raw = (LANE / (name + '.rgba')).read_bytes()
        post = (LANE / (name + '-after.rgba')).read_bytes()
        png = Image.open(LANE / (name + '.png')).convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()
        assert raw == post == png, name
        boundary = read(LANE / (name + '-capture-boundaries.json'))
        assert boundary['beforeHash'] == boundary['afterHash'] == hashlib.sha256(raw).hexdigest()
        assert len(raw) == 390 * 844 * 4
        captures.append({'name': name, 'rgba': bind(LANE / (name + '.rgba'))})
    comparisons = [difference('software-m82-source-before', 'software-m82-source-back'),
                   difference('software-m82-source-back', 'software-m82-warm-show')]
    source = read(LANE / 'm82-actual-source-page.json')
    assert pin['hash'] in source['navigation']['url'] and publication['source']['credit'] in source['text']
    for name in ['m82-actual-source-page-retired', 'm82-hidden-all-active-retired', 'm82-return-original-map', 'unloaded-cleared']:
        phase = phases[name]
        assert not phase['gpu']
        assert all(phase['resources'][k] == 0 for k in ['gpuTextureUploadModelBytes', 'gpuBufferUploadModelBytes', 'activeDecodedImageHandles', 'sourceRgbaEquivalentBytes'])
        assert all(o['leased'] == o['running'] == o['pending'] == 0 for o in phase['owners'])
    final = phases['unloaded-cleared']
    assert all(final['owners'][0][k] == 0 for k in ['entries', 'leased', 'bytes', 'reserved', 'running', 'pending', 'retired'])
    assert final['pendingNativeRequests'] == 0 and final['activeRoute'] == 'pages/map/index'
    families = sorted({i['family'] for r in read(LANE / 'frame-resources.json') for i in r['sourceImages']})
    assert families == ['constellation-artwork', 'deep-sky-image', 'galactic', 'prepared-optical']
    assert not read(LANE / 'browser-errors.json')
    result = {'status': 'SAVED_ACTUAL_PREPARED_PAGE_DEVELOPMENT_READBACK',
              'frontendInputs': len(read(LANE / 'source-bindings-before.json')),
              'backendInputs': len(read(LANE / 'backend-source-bindings-before.json')),
              'publicReadBindings': len(read(LANE / 'public-asset-read-bindings.json')['unique']),
              'requests': len(requests), 'receivedBodyBytes': sum(r.get('receivedBytes', 0) for r in requests),
              'successfulPreparedBytes': sum(r['receivedBytes'] for r in good),
              'actualPaintedPhases': expected, 'capturesGlPngGl': captures,
              'pixelComparisons': comparisons, 'actualSourceFamilies': families,
              'resourceSummary': read(LANE / 'resource-summary.json'),
              'finalActivity': 'active native registrations, GL, leases, queue and encoded inventory zero',
              'quality': 'Overview rectangular boundary remains FAILED; real fine structure inspected; NOT_ADOPTED',
              'scope': 'Current actual JSX/React/Query/Taro/controllers, controlled native ports and software WebGL. Styles pinned, not composed. Self readback, not independent review, WEAPP/WXML/phone, physical total memory, full journey or 200DAU capacity. Historical failures remain unchanged.'}
    save('result.json', result)
    print(json.dumps({k: v for k, v in result.items() if k not in ['resourceSummary', 'capturesGlPngGl', 'actualPaintedPhases']}, ensure_ascii=True), flush=True)
except Exception as error:
    save('failed.json', {'type': type(error).__name__, 'error': str(error)})
    raise
