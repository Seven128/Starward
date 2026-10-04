"""Read existing normal frames/identity/GL records; never execute owners or GPU."""
from pathlib import Path
import hashlib
import json
import io
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
RUN = ROOT / 'output/playwright/cloud-sky-continuous-camera-resource-1002-r1'
OUT = ROOT / 'output/continuous-camera-root-readback-1002-r2'
OUT.mkdir(exist_ok=False)
(OUT / 'executed-script.py.txt').write_bytes(Path(__file__).read_bytes())
reads = {}


def read(path):
    path = path.resolve()
    assert path.is_relative_to(ROOT)
    raw = path.read_bytes()
    reads[str(path.relative_to(ROOT)).replace('\\', '/')] = {
        'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
    return raw


def checked(row):
    raw = read(ROOT / row['path'])
    assert ('bytes' not in row or len(raw) == row['bytes']) and hashlib.sha256(raw).hexdigest() == row['sha256'], row['path']


try:
    raw_result = read(RUN / 'result.json')
    assert hashlib.sha256(raw_result).hexdigest() == '5c9aa0fd01e6ec24a94168b8183f08ef40f4a30e0df3e28e7dab1aca9f250cdc'
    result = json.loads(raw_result)
    before = json.loads(read(RUN / 'source-binding-before.json'))
    after = json.loads(read(RUN / 'source-binding-after.json'))
    assert result['sourceBindings'] == before['sourceBindings']
    for row in before['sourceBindings'] + before['inputs'] + before['preserved']:
        checked(row)
    for row in after['sourceBindings'] + after['inputs'] + after['preserved']:
        checked(row)
    for row in before['sourceBindings']:
        assert read(RUN / 'source-inputs' / row['path']) == read(ROOT / row['path'])
    for row in before['nodePreparationBindings']:
        assert read(RUN / row['snapshot']) == read(ROOT / row['path'])
    assert not result['errors'] and not result['contractFailures']
    final = json.loads(read(RUN / 'actual-final-owner.json'))
    assert final == result['final']
    refs = result['rows'][0]['referenceIdentity']
    assert len(result['rows']) == 12
    textures, summaries, pixels = {}, [], []
    source_total = copy_total = global_peak = 0
    for row in result['rows']:
        name = row['condition']['name']
        assert row['referenceIdentity'] == refs
        rgba = read(RUN / (name + '.rgba'))
        png = read(RUN / (name + '.png'))
        assert hashlib.sha256(rgba).hexdigest() == row['rgbaSha256']
        assert hashlib.sha256(png).hexdigest() == row['pngSha256']
        with Image.open(io.BytesIO(png)) as image:
            image.load()
            assert image.size == (390, 844) and image.mode == 'RGBA'
            top = image.tobytes()
        assert top == b''.join(rgba[i*1560:(i+1)*1560] for i in range(843, -1, -1))
        pixels.append(rgba)
        costs = []
        for p in row['passes']:
            peak = sum(textures.values())
            source = copy = 0
            for e in p['events']:
                key, operation = e['textureId'], e['operation']
                if operation == 'delete':
                    assert textures.pop(key) == e['bytes']
                else:
                    assert operation in ('source-upload', 'gpu-copy')
                    assert key not in textures
                    textures[key] = e['bytes']
                    if operation == 'source-upload':
                        source += e['bytes']
                    else:
                        copy += e['bytes']
                live = sum(textures.values())
                assert live == e['liveBytes']
                peak = max(peak, live)
            assert sum(textures.values()) == p['liveBytes'] and len(textures) == p['aliveTextures']
            assert peak == p['peakBytes'] and p['glError'] == 0
            source_total += source
            copy_total += copy
            global_peak = max(global_peak, peak)
            costs.append({'sourceUploadBytes': source, 'copyBytes': copy,
                          'liveBytes': p['liveBytes'], 'peakBytes': peak})
        summaries.append({'state': name, 'cameraPhase': row['condition']['camera']['phase'],
            'visualCenterAltitudeDeg': row['groundView']['visualCenterAltitudeDeg'],
            'groundViewOpacity': row['groundView']['viewOpacity'], 'passes': costs,
            'imageBytes': sum(t['bytes'] for t in row['transfers'] if t['type'] == 'image'),
            'metadataBytes': sum(t['bytes'] for t in row['transfers'] if t['type'] != 'image'),
            'newDecodes': len(row['newDecodes']),
            'settledSourceRgbaModel': row['ready']['decodedSourceRgbaModel']})
    for e in final['gpu']['events']:
        assert e['operation'] == 'delete' and textures.pop(e['textureId']) == e['bytes']
        assert sum(textures.values()) == e['liveBytes']
    assert not textures and final['gpu']['liveBytes'] == final['gpu']['aliveTextures'] == 0
    assert final['stableCanonicalUnchanged'] and final['sameRuntimeOwners']
    assert not any(i['current'] for i in final['nativeCurrent'])
    assert final['counters']['nativeRunning'] == final['counters']['decodedPending'] == 0
    for cache in final['cache']:
        assert all(cache[k] == 0 for k in ('leased', 'running', 'pending', 'reserved'))
    assert pixels[0] == pixels[10] == pixels[11]
    outcome = {'status': 'BOUNDED_EXISTING_ARTIFACTS_READ_BACK', 'rows': summaries,
        'sourceUploadBytes': source_total, 'windowCopyBytes': copy_total,
        'logicalGpuPeakBytes': global_peak, 'returnWholeRgbaExact': True,
        'finalCache': final['cache'], 'finalCounters': final['counters'],
        'scope': 'Root readback of frozen PNG/raw bytes, identity, source/input snapshots and GL texture-id ledger; no owner/GPU rerun, native/GC/FPS/HTTP/capacity or quality acceptance.'}
    (OUT / 'result.json').write_text(json.dumps(outcome, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    script_raw = read(Path(__file__))
    (OUT / 'executed-script.py.txt').write_bytes(script_raw)
    for path, identity in list(reads.items()):
        checked({'path': path, **identity})
    (OUT / 'binding.json').write_text(json.dumps({'reads': reads, 'unchangedAfterReadback': True}, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'output': str(OUT.relative_to(ROOT)), 'frames': len(summaries),
        'sourceUploadBytes': source_total, 'copyBytes': copy_total, 'logicalGpuPeakBytes': global_peak,
        'wholeReturnExact': True, 'boundReads': len(reads)}))
except Exception as error:
    (OUT / 'failed.json').write_text(json.dumps({'status':'FAILED_READBACK', 'error':repr(error),
        'reads':reads}, indent=2)+'\n', encoding='utf-8')
    raise
