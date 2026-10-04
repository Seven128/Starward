"""Root independent readback of the peer's frozen boundary run; no GPU rerun."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
RUN = ROOT / 'output/playwright/cloud-sky-active-retention-boundary-1002-r5'
OUT = ROOT / 'output/active-retention-boundary-root-readback-1002-r1'
assert not OUT.exists(), 'immutable generation already exists'
OUT.mkdir(parents=True)

def receipt(path):
    p = ROOT / path
    b = p.read_bytes()
    return dict(path=path, bytes=len(b), sha256=hashlib.sha256(b).hexdigest())

r = json.loads((RUN / 'result.json').read_text())
assert r['inputsUnchanged'] and not r['errors']
assert r['inputsBefore'] == r['inputsAfter']
bindings = r['inputsBefore'] + r['artifacts'] + [receipt(str((RUN / 'result.json').relative_to(ROOT))), receipt(str(Path(__file__).relative_to(ROOT)))]
for entry in bindings:
    assert receipt(entry['path']) == entry, entry['path']

pixels = {}
frames = []
ledgers = []
for row in r['rows']:
    live = {}
    for e in row['events']:
        op = e['operation']
        if op == 'texture-create':
            assert e['texture'] not in live
            live[e['texture']] = 0
        elif op in ('source-upload', 'window-copy'):
            assert e['texture'] in live and live[e['texture']] == 0
            live[e['texture']] = e['bytes']
        elif op == 'texture-delete':
            assert live.pop(e['texture']) == e['bytes']
        elif op == 'draw':
            for sampler in ('texture0', 'texture1'):
                if sampler in e and e[sampler] is not None:
                    assert live.get(e[sampler], 0) > 0, (row['name'], sampler)
        assert sum(live.values()) == e['liveBytes'], (row['variant'], row['name'], e)
    assert not live and all(v == 0 for v in row['disposed'].values())
    if row['variant'] != 'retirementMutant':
        assert all(not x['current'] for x in row['lifetimesAfterOwnerRetirement'])
        assert all(x['texture'] is None and x['bytes'] == 0 for x in row['afterRetirementBeforeDispose'])
    if row['empty'] is not None:
        assert row['empty'] == dict(liveBytes=0, ownedTextures=0)
    depth = 0
    for call in row['calls']:
        if call['method'] == 'pin-enter': depth += 1
        if call['method'] == 'pin-exit': depth -= 1
        assert depth >= 0
    assert depth == 0
    if row['name'] == 'fine-failure':
        assert row['failures'] == ['DETAIL'] and row['failAttempts'] == 1
        for f in row['frames'][:3]:
            assert f['prepared']['coarsePrepared'] and not f['prepared']['finePrepared']
    elif row['name'] == 'copy-failure':
        assert row['copyAttempts'] == 1 and not row['failures']
        for call in row['calls']:
            if call['method'] == 'getWindow' and call['texture'] is not None:
                width = 256 if call['source'] == 'OVERVIEW' else 512
                assert call['window'] == dict(x=0, y=0, width=width, height=width)
    elif row['name'] == 'context-loss':
        assert row['contextError'] == 'Error: sky_gpu_context_lost' and not row['failures']
        assert any(e['operation'] == 'actual-context-loss' and e['lost'] for e in row['events'])
    ledgers.append(dict(variant=row['variant'], name=row['name'], events=len(row['events']), balancedPins=True, disposed=row['disposed']))
    for f in row['frames']:
        name = f"{row['variant']}-{row['name']}-{f['label']}"
        raw = (RUN / (name + '.rgba')).read_bytes()
        png = RUN / (name + '.png')
        a = np.asarray(Image.open(png).convert('RGBA'))
        actual = np.frombuffer(raw, dtype=np.uint8).reshape(a.shape)[::-1]
        assert np.array_equal(actual, a), name
        assert hashlib.sha256(raw).hexdigest() == f['rgbaSha256']
        assert hashlib.sha256(png.read_bytes()).hexdigest() == f['pngSha256']
        assert f['glError'] == 0 and f['framebufferRestored']
        pixels[name] = actual
        frames.append(dict(name=name, pixels=a.shape[0] * a.shape[1], exactPngRgba=True))

comparisons = []
for expected in r['comparisons']:
    a, b = pixels[expected['a']], pixels[expected['b']]
    delta = np.abs(a.astype(np.int16) - b.astype(np.int16))
    changed = int(np.any(delta, axis=2).sum())
    max_delta = int(delta.max())
    assert changed == expected['changedPixels'] and max_delta == expected['maxDelta']
    assert (changed == 0) == expected['expectedEqual']
    comparisons.append(dict(a=expected['a'], b=expected['b'], changedPixels=changed, maxDelta=max_delta))

result = dict(status='INDEPENDENT_BOUNDARY_READBACK_PASS_DEVELOPMENT_ONLY', frames=frames,
              comparisons=comparisons, ledgers=ledgers, bindingCount=len(bindings),
              limits=['Peer boundary author; root readback used independent Pillow/numpy and identity ledger, no new GPU run.',
                      'Task one-byte pressure goal; not a production memory ceiling or WEAPP/phone performance result.',
                      'Actual desktop context loss, isolated owner retirement; no complete Taro/Canvas public-cache clear journey.',
                      'No pixel interpretation after context loss; no image quality or 200DAU acceptance.'])
(OUT / 'binding.json').write_text(json.dumps(bindings, indent=2) + '\n')
(OUT / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(dict(status=result['status'], frames=len(frames), comparisons=len(comparisons), rows=len(ledgers),
                      result=receipt(str((OUT / 'result.json').relative_to(ROOT))), binding=receipt(str((OUT / 'binding.json').relative_to(ROOT))))))
