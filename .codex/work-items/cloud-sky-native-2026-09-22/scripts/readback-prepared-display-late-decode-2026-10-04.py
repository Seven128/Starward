"""Verify saved real-page cancellation and native-callback timing evidence."""
from pathlib import Path
import hashlib
import json
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
LANE = ROOT / 'output/playwright/cloud-sky-prepared-display-late-decode-1004-r1'
OUT = ROOT / 'output/prepared-display-late-decode-readback-1004-r1'


def read(path):
    return json.loads(path.read_bytes())


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}


def save(name, value):
    with (OUT / name).open('x', encoding='utf-8') as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def retired(phase):
    assert not phase['gpu']
    assert phase['pendingNativeRequests'] == 0
    assert all(phase['resources'][k] == 0 for k in ['gpuTextureUploadModelBytes',
        'gpuBufferUploadModelBytes', 'activeDecodedImageHandles', 'sourceRgbaEquivalentBytes'])
    assert all(o['leased'] == o['running'] == o['pending'] == 0 for o in phase['owners'])


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    try:
        for name in ['source-bindings', 'backend-source-bindings', 'current-baseline']:
            assert read(LANE / (name + '-before.json')) == read(LANE / (name + '-after.json'))
        for name in ['source-bindings-before.json', 'backend-source-bindings-before.json', 'public-asset-read-bindings.json']:
            rows = read(LANE / name)
            rows = rows['unique'] if isinstance(rows, dict) else rows
            for row in rows:
                assert bind(ROOT / row['path']) == row, row['path']
        for pair in read(LANE / 'reused-current-build.json')['files']:
            assert bind(ROOT / pair['before']['path']) == pair['before']
            assert bind(ROOT / pair['after']['path']) == pair['after']
            assert (pair['before']['bytes'], pair['before']['sha256']) == (pair['after']['bytes'], pair['after']['sha256'])
        pin = read(LANE / 'explicit-publication-input.json')
        manifest = ROOT / pin['manifest']['path']
        assert bind(manifest) == pin['manifest'] and not pin['ordinaryRegistry']
        publication = read(manifest)
        assert publication['imageVersion'] == 'prepared-display-optical-v1'
        assert publication['publicationHash'] == pin['hash']
        phases = {row['name']: row for row in read(LANE / 'phases.json')}
        for name in ['prepared-late-cold-detail-painted', 'prepared-late-final-detail-painted']:
            p = phases[name]
            assert p['sdssHook']['imageVersion'] == 'prepared-display-optical-v1'
            assert p['completedSources']['optical']['publicationHash'] == pin['hash']
            assert p['completedSources']['optical']['field']['level'] == 'DETAIL'
            assert p['completedSources']['optical']['field']['image']['sha256'] == publication['levels']['DETAIL']['sha256']
            assert p['frameResources']['calls']['artworkLevels']['count'] > 0
        held = phases['prepared-late-held-detail-coarse-painted']
        assert held['nativeCounters']['decodedPending'] == 0
        assert held['sdssHook']['loading'] and not held['sdssHook']['updateFailed']
        assert held['completedSources']['optical']['field']['level'] == 'MEDIUM'
        assert held['completedSources']['optical']['field']['image']['sha256'] == publication['levels']['MEDIUM']['sha256']
        assert len(held['lateDecode']['held']) == 1
        held_image = held['lateDecode']['held'][0]
        assert held_image['sha256'] == publication['levels']['DETAIL']['sha256']
        assert held_image['rgbaEquivalentBytes'] == 1048576 and not held_image['callbackDetached']
        canceled = phases['prepared-late-cancel-hidden-retired']
        assert len(canceled['lateDecode']['held']) == 1 and canceled['lateDecode']['held'][0]['callbackDetached']
        delivery = read(LANE / 'prepared-display-late-callback-delivery.json')
        assert delivery['delivered'] == 1 and delivery['before'] == delivery['after']
        assert [e['event'] for e in delivery['events']] == ['held', 'late-delivered']
        assert delivery['events'][-1]['callbackDetached']
        late = phases['prepared-late-delivered-stays-retired']
        assert late['sceneCalls'] == canceled['sceneCalls'] and not late['lateDecode']['held']
        for name in ['prepared-late-first-hidden-retired', 'prepared-late-cancel-hidden-retired',
                     'prepared-late-delivered-stays-retired', 'prepared-late-return-original-map', 'unloaded-cleared']:
            retired(phases[name])
        first, warm = phases['prepared-late-cold-detail-painted'], phases['prepared-late-final-detail-painted']
        assert first['scene']['at'] == warm['scene']['at']
        assert json.loads(first['canvas']['data-sky-presented-view']) == json.loads(warm['canvas']['data-sky-presented-view'])
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
        left = (LANE / 'software-prepared-late-cold-detail.rgba').read_bytes()
        right = (LANE / 'software-prepared-late-final-detail.rgba').read_bytes()
        assert len(left) == len(right)
        comparison = {'status': 'PASSED' if left == right else 'FAILED',
            'differentChannels': sum(a != b for a, b in zip(left, right)),
            'maxChannelDelta': max(abs(a-b) for a, b in zip(left, right))}
        requests = read(LANE / 'requests.json')
        good = [r for r in requests if r['binary'] and pin['hash'] in r['route'] and r['status'] == 200]
        assert len(good) == 3
        for wanted in publication['levels'].values():
            got = next(r for r in good if r['route'].endswith('/' + wanted['file']))
            assert (got['receivedBytes'], got['sha256']) == (wanted['bytes'], wanted['sha256'])
        final = phases['unloaded-cleared']
        assert all(final['owners'][0][k] == 0 for k in ['entries', 'leased', 'bytes', 'reserved', 'running', 'pending', 'retired'])
        assert not read(LANE / 'browser-errors.json')
        summary = read(LANE / 'resource-summary.json')
        assert not summary['droppedHistory']
        result = {'status': 'SAVED_ACTUAL_PREPARED_DISPLAY_LATE_DECODE_DEVELOPMENT_READBACK',
            'frontendInputs': len(read(LANE / 'source-bindings-before.json')),
            'backendInputs': len(read(LANE / 'backend-source-bindings-before.json')),
            'publicReadBindings': len(read(LANE / 'public-asset-read-bindings.json')['unique']),
            'requests': len(requests), 'receivedBodyBytes': sum(r.get('receivedBytes', 0) for r in requests),
            'successfulPreparedBytes': sum(r['receivedBytes'] for r in good),
            'heldNativeCallback': held_image, 'canceledCallback': canceled['lateDecode']['held'][0],
            'delivery': delivery, 'newNativeRegistrationsAfterLateDelivery': 0, 'newSceneCallsAfterLateDelivery': 0,
            'capturesGlPngGl': captures, 'coldFineWarmFinePixels': comparison,
            'resourceSummary': summary, 'finalActivity': 'native/GL/leases/queue/encoded zero; held callback list empty',
            'quality': 'UNADOPTED; no new source processing or quality acceptance',
            'scope': 'Actual original full page/real saved PNG decode and renderer. One controlled native load callback delayed with actual callback captured before cancellation; original callback invoked after detach. 1MiB held RGBA equivalent is separate transient port ownership, not registered native budget or physical peak. Self readback, not WEAPP/WXML/phone/independent review/capacity.'}
        save('result.json', result)
        print(json.dumps({k: v for k, v in result.items() if k not in ['resourceSummary', 'capturesGlPngGl', 'delivery']}, ensure_ascii=False))
    except Exception as error:
        save('failed.json', {'type': type(error).__name__, 'error': str(error)})
        raise


if __name__ == '__main__':
    main()
