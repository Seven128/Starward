"""Read saved complete Taro page/Scene outputs without replaying HTTP or UI."""
from pathlib import Path
import json, hashlib, re, sys
from collections import Counter
from datetime import datetime
from PIL import Image
ROOT = Path(__file__).resolve().parents[4]
LANE = ROOT / 'output/playwright/cloud-sky-real-taro-page-1004-r11'
OUT = ROOT / 'output/sky-real-taro-page-readback-1004-r2'
OUT.mkdir(exist_ok=False)
read = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
    b = p.read_bytes()
    return dict(path=p.relative_to(ROOT).as_posix(), bytes=len(b), sha256=hashlib.sha256(b).hexdigest())
def instant(v): return datetime.fromisoformat(v.replace('Z', '+00:00'))
try:
    before, after = [read(LANE / f'source-bindings-{s}.json') for s in ['before', 'after']]
    assert before == after and len(before) == 398
    for row in before: assert bind(ROOT / row['path']) == row, row['path']
    baseline = read(LANE / 'current-baseline-before.json')
    assert baseline == read(LANE / 'current-baseline-after.json')
    assert len(baseline['currentSources']) == 274 and len(baseline['protected']) == 6
    for row in baseline['currentSources'] + baseline['protected']: assert bind(ROOT / row['path']) == row, row['path']
    paths = {v['path'] for v in before}
    for p in ['apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx',
              'apps/wechat-miniapp/src/features/sky/sky-object-picking.ts',
              'apps/wechat-miniapp/src/hooks/use-forecast-query.ts',
              'apps/wechat-miniapp/src/hooks/use-resource-query.ts',
              'apps/wechat-miniapp/src/services/query-client.ts',
              'apps/wechat-miniapp/src/services/api-client.ts']:
        assert p in paths, p
    assert not any(p.startswith(('node_modules/react/', 'node_modules/@tanstack/')) for p in paths)
    observed = read(LANE / 'observed-boundaries.json')
    for row in observed: assert bind(ROOT / row['path'])['sha256'] == row['originalSha256']
    phases = read(LANE / 'phases.json')
    by = {p['name']: p for p in phases}
    cold = by['complete-jsx-cold-painted']
    partial = by['complete-jsx-return-partial-coarse-preserved']
    returned = by['complete-jsx-public-retry-painted']
    selected = by['actual-canvas-pick-label-selection']
    hidden = by['complete-page-hidden-clear']
    final = by['unloaded-cleared']
    assert cold['scene']['supplement'] == returned['scene']['supplement'] == 943
    assert 0 < partial['scene']['supplement'] < 943
    assert cold['scene']['identity'] != returned['scene']['identity']
    assert cold['scene']['hash'] == partial['scene']['hash'] == returned['scene']['hash']
    for p in [cold, partial, returned, selected]:
        scene, canvas = p['scene'], p['canvas']
        assert scene['baseState'] == 'AVAILABLE' and scene['width'] == 390 and scene['height'] == 844
        assert scene['fov'] == 45 and scene['mode'] == 'DAY'
        assert canvas['data-sky-scene-state'] == 'READY' and canvas['data-sky-star-count'] == 8404
        view = json.loads(canvas['data-sky-presented-view'])
        assert instant(view['frameAt']) == instant(scene['at']) == instant(canvas['data-sky-scene-frame-at'])
        assert view['width'] == scene['width'] and view['height'] == scene['height']
        assert scene['reportContext']['contextId'] == read(LANE / 'bootstrap.json')['context']['contextId']
        assert p['gpuDraws'] > 0 and p['bridgeOutputs'] > 0 and p['pendingNativeRequests'] == 0
    assert partial['canvas']['data-sky-star-state'] == 'AVAILABLE' and '重试暗星' in partial['text']
    assert '重试暗星' not in returned['text'] and returned['gpuDraws'] > partial['gpuDraws']
    for name in ['manual-action', 'retry-action']:
        action = read(LANE / f'{name}.json')
        assert action['dispatched'] is True and action['event'] == 'tap' and action['listeners'] > 0
    image_evidence = []
    for name in ['software-cold', 'software-return']:
        facts = read(LANE / f'{name}-pixels.json')
        raw = (LANE / f'{name}.rgba').read_bytes()
        assert hashlib.sha256(raw).hexdigest() == facts['sha256'] and len(raw) == facts['bytes'] == 1316640
        image = Image.open(LANE / f'{name}.png').convert('RGBA')
        assert image.size == (facts['width'], facts['height']) == (390, 844)
        assert image.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes() == raw
        assert len(set(raw)) > 8
        snapshot = read(LANE / f'{name}-paint.json')
        phase = cold if name.endswith('cold') else returned
        assert instant(snapshot['frameAt']) == instant(phase['scene']['at'])
        assert phase['scene']['hash'] in snapshot['catalogHash']
        for label in phase['labels']:
            objects = [o for o in snapshot['objects'] if o['displayName'] == label['text']]
            assert len(objects) == 1
            assert abs(float(label['left'][:-2]) - objects[0]['x']) < 1e-6
            assert abs(float(label['top'][:-2]) - objects[0]['y']) < 1e-6
        image_evidence.append(dict(pixels=bind(LANE / f'{name}.rgba'), png=bind(LANE / f'{name}.png'), objects=len(snapshot['objects']), labels=len(phase['labels'])))
    assert (LANE / 'software-cold.rgba').read_bytes() == (LANE / 'software-return.rgba').read_bytes()
    pick = read(LANE / 'public-pick-action.json')
    choice = read(LANE / 'public-pick-choice.json')
    assert pick['events'] == ['touchstart', 'touchend'] and pick['object']['reference'] == 'HR:8162'
    assert len(pick['choices']) == len(choice['rows']) == 2 and choice['dispatched'] is True
    assert {o['reference'] for o in pick['choices']} == {'HR:8162', 'SAO:19309'}
    assert selected['modal']['data-object-reference'] == pick['object']['reference']
    assert len(selected['selection']) == 1 and selected['selection'][0]['text'] == 'Alderamin'
    assert not any(l['text'] == 'Alderamin' for l in selected['labels'])
    for p in [hidden, final]:
        assert len(p['owners']) == 1
        for key in ['entries', 'leased', 'bytes', 'reserved', 'running', 'pending', 'retired']: assert p['owners'][0][key] == 0, key
    assert final['logicalNodes'] == 0 and final['gpu'] == {} and final['queries'] == [] and final['pendingNativeRequests'] == 0
    assert len(final['files']) == 1 and final['files'][0]['bytes'] == 26
    requests = read(LANE / 'requests.json')
    injected = [r for r in requests if r.get('injected')]
    assert len(injected) == 1 and injected[0]['status'] == 503
    failed_route = injected[0]['route']
    assert [r['status'] for r in requests if r['route'] == failed_route] == [200, 503, 200]
    index = read(ROOT / 'workers/miniapp-api/assets/sao-v2/index.json')
    publication = bind(ROOT / 'workers/miniapp-api/assets/sao-v2/index.json')['sha256']
    assert publication == cold['scene']['hash']
    tiles = {t['id']: t for t in index['tiles']}
    counts = Counter()
    for r in requests:
        m = re.fullmatch(r'/v2/sky/supplements/sao/v2/([0-9a-f]{64})/assets/([^/]+)', r['route'])
        if m and r['status'] == 200:
            assert m[1] == publication
            tile = tiles[m[2]]
            b = bind(ROOT / 'workers/miniapp-api/assets/sao-v2' / tile['file'])
            assert r['sha256'] == tile['sha256'] == b['sha256'] and r['receivedBytes'] == tile['bytes'] == b['bytes']
            counts[m[2]] += 1
    assert all(n == 2 for n in counts.values())
    assert read(LANE / 'browser-errors.json') == []
    result = dict(status='SAVED_COMPLETE_TARO_PAGE_SCENE_ROOT_READBACK', sourceBindings=len(before), baselineSources=274, protectedExact=6,
        points=[cold['scene']['supplement'], partial['scene']['supplement'], returned['scene']['supplement']], images=image_evidence,
        requests=len(requests), receivedBodyBytes=sum(r['receivedBytes'] for r in requests), saoTiles=len(counts),
        sceneCalls=final['sceneCalls'], logicalNodesFinal=0, encodedOwnerFinal=final['owners'][0], gpuFinal=final['gpu'],
        encodedBytesCold=cold['owners'][0]['bytes'], mapFSBytesCold=sum(f['bytes'] for f in cold['files']),
        scope='Root saved-byte/JSON/PNG-RGBA readback is self-review. Controlled native APIs, logical DOM/setData bridge and software GPU only; stylesheet composition, native decoded-image retirement/physical total, full journey, backend transitive source epoch and capacity remain unverified.')
    (OUT / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(dict(result=bind(OUT / 'result.json'), requests=result['requests'], points=result['points'], protectedExact=6)))
except Exception as e:
    (OUT / 'failed.json').write_text(json.dumps(dict(error=str(e)), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    raise
