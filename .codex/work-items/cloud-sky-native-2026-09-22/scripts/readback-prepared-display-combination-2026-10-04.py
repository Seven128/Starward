"""Validate saved Prepared combinations and report strict pixel differences honestly."""
from pathlib import Path
from datetime import datetime
import hashlib
import json
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
LANE = ROOT / 'output/playwright/cloud-sky-prepared-display-combination-1004-r1'
OUT = ROOT / (sys.argv[1] if len(sys.argv) > 1 else 'output/prepared-display-combination-readback-1004-r1')
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

def at(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))

def difference(first, second):
    left = (LANE / (first + '.rgba')).read_bytes()
    right = (LANE / (second + '.rgba')).read_bytes()
    assert len(left) == len(right)
    differences = [abs(a-b) for a, b in zip(left, right)]
    return {'first': first, 'second': second, 'status': 'PASSED' if left == right else 'FAILED',
            'differentChannels': sum(v != 0 for v in differences), 'maxChannelDelta': max(differences)}

(OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
try:
    for name in ['source-bindings', 'backend-source-bindings', 'current-baseline']:
        assert read(LANE / (name + '-before.json')) == read(LANE / (name + '-after.json')), name
    for name in ['source-bindings-before.json', 'backend-source-bindings-before.json', 'public-asset-read-bindings.json']:
        rows = read(LANE / name)
        rows = rows['unique'] if isinstance(rows, dict) else rows
        for row in rows:
            assert bind(ROOT / row['path']) == row, row['path']
    reuse = read(LANE / 'reused-current-build.json')
    for row in reuse['files']:
        assert bind(ROOT / row['before']['path']) == row['before']
        assert bind(ROOT / row['after']['path']) == row['after']
        assert (row['before']['bytes'], row['before']['sha256']) == (row['after']['bytes'], row['after']['sha256'])
    pin = read(LANE / 'explicit-publication-input.json')
    manifest = ROOT / pin['manifest']['path']
    publication = read(manifest)
    assert bind(manifest) == pin['manifest'] and publication['publicationHash'] == pin['hash']
    assert not pin['ordinaryRegistry']
    assert publication['imageVersion'] == 'prepared-display-optical-v1'
    assert publication['parent']['publication']['imageVersion'] == 'prepared-optical-v1'
    phases = {r['name']: r for r in read(LANE / 'phases.json')}
    for name in ['prepared-fine-before-layers', 'prepared-grids-on', 'prepared-grids-off-art-off',
                 'prepared-layers-restored', 'prepared-tracked', 'prepared-time-paused',
                 'prepared-time-cancelled', 'prepared-time-committed', 'prepared-committed-before-source',
                 'prepared-committed-source-back', 'prepared-committed-warm-show', 'prepared-after-full-sphere-fine']:
        phase = phases[name]
        packet = phase['completedSources']['optical']
        assert packet['kind'] == 'prepared' and packet['publicationHash'] == pin['hash']
        assert packet['field']['level'] == 'DETAIL'
        assert packet['field']['image']['sha256'] == publication['levels']['DETAIL']['sha256']
        assert phase['frameResources']['calls']['artworkLevels']['count'] > 0
        assert any(i['family'] == 'prepared-optical' and i['sha256'] == publication['levels']['DETAIL']['sha256']
                   for i in phase['frameResources']['sourceImages'])
    assert phases['prepared-grids-on']['frameResources']['grids'] == {'horizontal': True, 'equatorial': True}
    assert phases['prepared-grids-off-art-off']['frameResources']['grids'] == {'horizontal': False, 'equatorial': False}
    assert not phases['prepared-grids-off-art-off']['frameResources']['constellationEnabled']
    assert phases['prepared-layers-restored']['frameResources']['constellationEnabled']
    start = at(phases['prepared-tracked']['scene']['at'])
    paused = at(phases['prepared-time-paused']['scene']['at'])
    assert (paused - start).total_seconds() > 1
    assert at(phases['prepared-time-cancelled']['scene']['at']) == start
    committed = at(phases['prepared-time-committed']['scene']['at'])
    for name in ['prepared-time-committed', 'prepared-committed-source-back', 'prepared-committed-warm-show', 'prepared-after-full-sphere-fine']:
        phase = phases[name]
        assert at(phase['scene']['at']) == committed == at(phase['observationContext']['selectedAtUtc'])
    before = phases['prepared-committed-before-source']['canvas']['data-sky-presented-view']
    assert json.loads(before) == json.loads(phases['prepared-committed-source-back']['canvas']['data-sky-presented-view'])
    assert publication['source']['credit'] in phases['prepared-committed-source-retired']['activeText']
    assert publication['processing']['geometryExclusion']['credit'] in phases['prepared-committed-source-retired']['activeText']
    assert '显示估计' in phases['prepared-committed-source-retired']['activeText'] and '负值显示截零' in phases['prepared-committed-source-retired']['activeText']
    for name in ['prepared-committed-source-retired', 'prepared-committed-hidden', 'prepared-return-original-map', 'unloaded-cleared']:
        phase = phases[name]
        assert not phase['gpu']
        assert all(phase['resources'][k] == 0 for k in ['gpuTextureUploadModelBytes', 'gpuBufferUploadModelBytes', 'activeDecodedImageHandles', 'sourceRgbaEquivalentBytes'])
        assert all(o['leased'] == o['running'] == o['pending'] == 0 for o in phase['owners'])
    wide = phases['prepared-wide-current']
    assert not wide['sdssHook']['requested'] and wide['completedSources']['optical'] is None
    assert not any(i['family'] == 'prepared-optical' for i in wide['frameResources']['sourceImages'])
    w3 = phases['prepared-full-sphere-w3']
    assert w3['scene']['fov'] > 180 and w3['frameResources']['landscapeReadiness'] == 1
    assert len(w3['w3Hook']['loaded']) == len(w3['w3Hook']['wanted']) == 12
    assert not w3['w3Hook']['loading'] and not w3['w3Hook']['failed']
    assert w3['frameResources']['calls']['skyImageMesh']['submitted'] == 12
    assert sum(i['family'] == 'WIDE_FIELD_W3' for i in w3['frameResources']['sourceImages']) == 12
    assert not any(i['family'] == 'galactic' for i in w3['frameResources']['sourceImages'])
    traversal = read(LANE / 'prepared-landscape-traversed.json')
    assert any(0 < r['landscape']['opacity'] < 1 for r in traversal)
    assert traversal[-1]['landscape']['opacity'] == 0
    picking = read(LANE / 'prepared-below-horizon-painted-pick.json')
    assert picking['objects'] and all(r['reference'] in r['choices'] for r in picking['objects'])
    daylight = read(LANE / 'prepared-display-daylight-results.json')
    assert [row['name'] for row in daylight] == ['day', 'twilight', 'night']
    assert daylight[0]['sunAltitudeDeg'] > 5 and -12 < daylight[1]['sunAltitudeDeg'] < 0 and daylight[2]['sunAltitudeDeg'] < -18
    for row in daylight:
        phase = phases['prepared-display-' + row['name']]
        assert phase['scene']['at'] == row['at'] and phase['frameResources']['geometry']['sunAltitudeDeg'] == row['sunAltitudeDeg']
        assert phase['completedSources']['optical']['publicationHash'] == pin['hash']
        assert phase['completedSources']['optical']['field']['level'] == 'DETAIL'
        assert phase['frameResources']['calls']['solarLight']['submitted'] == 1
    captures = []
    for file in sorted(LANE.glob('software-*-pixels.json')):
        name = file.name.removesuffix('-pixels.json')
        raw = (LANE / (name + '.rgba')).read_bytes()
        post = (LANE / (name + '-after.rgba')).read_bytes()
        png = Image.open(LANE / (name + '.png')).convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()
        assert raw == post == png, name
        boundary = read(LANE / (name + '-capture-boundaries.json'))
        assert boundary['beforeHash'] == boundary['afterHash'] == hashlib.sha256(raw).hexdigest()
        captures.append({'name': name, 'rgba': bind(LANE / (name + '.rgba'))})
    comparisons = [difference('software-prepared-fine', 'software-prepared-layer-return'),
                   difference('software-prepared-committed-before-source', 'software-prepared-committed-source-back'),
                   difference('software-prepared-committed-source-back', 'software-prepared-committed-warm-show'),
                   difference('software-prepared-full-sphere', 'software-prepared-full-sphere-return')]
    requests = read(LANE / 'requests.json')
    good = [r for r in requests if r['binary'] and pin['hash'] in r['route'] and r['status'] == 200]
    assert len(good) == 3
    for wanted in publication['levels'].values():
        got = next(r for r in good if r['route'].endswith('/' + wanted['file']))
        assert (got['receivedBytes'], got['sha256']) == (wanted['bytes'], wanted['sha256'])
    final = phases['unloaded-cleared']
    assert all(final['owners'][0][k] == 0 for k in ['entries', 'leased', 'bytes', 'reserved', 'running', 'pending', 'retired'])
    assert final['pendingNativeRequests'] == 0 and not read(LANE / 'browser-errors.json')
    families = sorted({i['family'] for row in read(LANE / 'frame-resources.json') for i in row['sourceImages']})
    assert families == ['WIDE_FIELD_W3', 'constellation-artwork', 'deep-sky-image', 'galactic', 'landscape', 'prepared-optical']
    summary = read(LANE / 'resource-summary.json')
    assert not summary['droppedHistory']
    result = {'status': 'SAVED_ACTUAL_PREPARED_DISPLAY_COMBINATIONS_DEVELOPMENT_READBACK',
              'frontendInputs': len(read(LANE / 'source-bindings-before.json')),
              'backendInputs': len(read(LANE / 'backend-source-bindings-before.json')),
              'publicReadBindings': len(read(LANE / 'public-asset-read-bindings.json')['unique']),
              'requests': len(requests), 'receivedBodyBytes': sum(r.get('receivedBytes', 0) for r in requests),
              'successfulPreparedBytes': sum(r['receivedBytes'] for r in good),
              'pausedPlaybackSeconds': (paused-start).total_seconds(), 'committedAt': committed.isoformat(),
              'actualDayTwilightNight': daylight, 'allW3TilesReadyAndSubmitted': 12, 'actualPaintedPickableObjects': len(picking['objects']),
              'capturesGlPngGl': captures, 'pixelComparisons': comparisons, 'actualSourceFamilies': families,
              'resourceSummary': summary, 'finalActivity': 'active native/GL/leases/queue/encoded inventory zero',
              'quality': 'Soft detail/grain, complete weak structure/edge/seam/registration unadopted; ordinary registry empty',
              'scope': 'Reused unchanged current full page build, actual React/Query/Taro/HTTP with controlled native ports and software WebGL. Self readback, not WXML/native/phone, independent review, physical total memory or 200DAU capacity. Old failures remain unchanged.'}
    save('result.json', result)
    print(json.dumps({k: v for k, v in result.items() if k not in ['resourceSummary', 'capturesGlPngGl', 'actualDayTwilightNight']}, ensure_ascii=True), flush=True)
except Exception as error:
    save('failed.json', {'type': type(error).__name__, 'error': str(error)})
    raise
