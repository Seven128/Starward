"""Pin bounded raw-array strips to cached official headers; no mosaic recipe."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import datetime
import hashlib
import json
import sys
import urllib.parse
import urllib.request
import numpy as np

ROOT = Path(__file__).resolve().parents[4]
PRIOR = ROOT / 'output/m51-science-headers-1003-r1'
DIAGNOSTIC = ROOT / 'output/m51-science-headers-1003-r2/result.json'
OUT = (ROOT / sys.argv[1]).resolve()
assert OUT.parent == ROOT / 'output' and OUT.name.startswith('m51-science-strips-')
PROTECTION = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'
WIDTH, HEIGHT, STRIP_HEIGHT = 8600, 12200, 16
START_ROWS = (0, 1536, 6092, 10648, 12184)
BYTE_COUNT = WIDTH * STRIP_HEIGHT * 4

def bind(p):
    raw = p.read_bytes()
    return {'path': str(p), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

assert bind(DIAGNOSTIC)['sha256'] == '8f8a9ca6d5ec22776be2f4e1f929d357225b608f2a247471774d891b8109d244'
previous = json.loads((PRIOR / 'records.json').read_bytes())
protected = json.loads(PROTECTION.read_bytes())
paths = [Path(__file__), PRIOR / 'records.json', DIAGNOSTIC, PROTECTION, Path(sys.executable), Path(np.__file__)]
paths += [Path(row['headerArtifact']['path']) for row in previous]
paths += [ROOT / row['path'] for row in protected]
reused = {}
if len(sys.argv) > 2:
    reuse_dir = (ROOT / sys.argv[2]).resolve()
    assert reuse_dir.parent == ROOT / 'output' and reuse_dir.name.startswith('m51-science-strips-') and reuse_dir != OUT
    reuse_receipts = reuse_dir / 'receipts.json'
    paths += [reuse_receipts, reuse_dir / 'executed-script.py']
    for row in json.loads(reuse_receipts.read_bytes()):
        if 'failure' in row: continue
        name, y = row['source'], row['sampleStartRowZeroBased']
        source = next(item for item in previous if item['url'].rsplit('/', 1)[1] == name)
        start = source['headerBlocksBytes'] + WIDTH * y * 4
        assert y in START_ROWS and row['url'] == source['url'] and row['expectedEtag'] == source['etag'] == row['etag']
        assert row['status'] == 206 and row['receivedBytes'] == BYTE_COUNT
        assert row['requestedRange'] == f'bytes={start}-{start + BYTE_COUNT - 1}'
        assert row['contentRange'] == f'bytes {start}-{start + BYTE_COUNT - 1}/{source["sourceTotalBytes"]}'
        file = Path(row['artifact']['path'])
        assert file.parent == reuse_dir and bind(file) == row['artifact']
        assert (name, y) not in reused
        paths.append(file)
        reused[name, y] = {**row, 'reusedFromReceipts': str(reuse_receipts)}
before = [bind(p) for p in paths]
for row in previous:
    assert bind(Path(row['headerArtifact']['path'])) == row['headerArtifact']
    assert row['primaryHeader']['BITPIX'] == -32 and row['primaryHeader']['NAXIS1'] == WIDTH and row['primaryHeader']['NAXIS2'] == HEIGHT
    assert row['headerBlocksBytes'] == ((row['bytesThroughEnd'] + 2879) // 2880) * 2880
for row in protected: assert bind(ROOT / row['path'])['sha256'] == row['sha256']
OUT.mkdir()
(OUT / 'inputs-before.json').write_text(json.dumps(before, indent=2) + '\n')
(OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())

def acquire(source, y):
    name = source['url'].rsplit('/', 1)[1]
    start = source['headerBlocksBytes'] + WIDTH * y * 4
    end = start + BYTE_COUNT - 1
    assert 0 <= y and y + STRIP_HEIGHT <= HEIGHT and end < source['sourceTotalBytes']
    etag = source['etag']
    request = urllib.request.Request(source['url'], headers={
        'User-Agent': 'Starward-source-quality-bounded-trial/1.0', 'Accept-Encoding': 'identity',
        'Range': f'bytes={start}-{end}', 'If-Range': etag})
    receipt = {'source': name, 'url': source['url'], 'sampleStartRowZeroBased': y,
               'sampleHeight': STRIP_HEIGHT, 'width': WIDTH, 'dtype': '>f4', 'requestedRange': request.headers['Range'],
               'expectedEtag': etag, 'sourceTotalBytes': source['sourceTotalBytes'],
               'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'receivedBytes': 0}
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            parsed = urllib.parse.urlsplit(response.url)
            assert parsed.scheme == 'https' and parsed.hostname == 'archive.stsci.edu'
            receipt.update(status=response.status, etag=response.headers.get('ETag'), contentRange=response.headers.get('Content-Range'))
            assert response.status == 206 and receipt['etag'] == etag, 'SOURCE_CHANGED_OR_RANGE_IGNORED'
            assert receipt['contentRange'] == f'bytes {start}-{end}/{source["sourceTotalBytes"]}', 'UNEXPECTED_RANGE'
            assert int(response.headers['Content-Length']) == BYTE_COUNT
            raw = response.read(BYTE_COUNT + 1)
            receipt['receivedBytes'] = len(raw)
            assert len(raw) == BYTE_COUNT, 'INCOMPLETE_OR_EXCESS_RANGE_BODY'
        file = OUT / f'{name}.row-{y}-height-{STRIP_HEIGHT}.bin'
        file.write_bytes(raw)
        receipt['artifact'] = bind(file)
    except Exception as error:
        receipt['failure'] = type(error).__name__ + ': ' + str(error)
    return receipt

receipts = list(reused.values())
with ThreadPoolExecutor(max_workers=2) as executor:
    pending = [executor.submit(acquire, source, y) for source in previous for y in START_ROWS
               if (source['url'].rsplit('/', 1)[1], y) not in reused]
    for future in as_completed(pending):
        row = future.result()
        receipts.append(row)
        (OUT / 'receipts.json').write_text(json.dumps(sorted(receipts, key=lambda item: (item['source'], item['sampleStartRowZeroBased'])), indent=2) + '\n')
        print(json.dumps({key: row.get(key) for key in ('source', 'sampleStartRowZeroBased', 'receivedBytes', 'failure')}), flush=True)
assert len(receipts) == 30 and not any('failure' in row for row in receipts), 'BOUNDED_SAMPLE_ACQUISITION_INCOMPLETE'
index = {(row['source'], row['sampleStartRowZeroBased']): row for row in receipts}

def distribution(values):
    finite = np.isfinite(values)
    data = values[finite].astype(np.float64)
    return {'total': values.size, 'finite': int(finite.sum()), 'nan': int(np.isnan(values).sum()),
            'infinity': int(np.isinf(values).sum()), 'negativeFinite': int((data < 0).sum()),
            'zeroFinite': int((data == 0).sum()), 'positiveFinite': int((data > 0).sum()),
            'finiteQuantiles0_5_50_95_100': np.percentile(data, [0, 5, 50, 95, 100]).tolist() if data.size else None}

pairs = []
for band in ('b', 'v', 'i'):
    for y in START_ROWS:
        science_row = index[(f'h_m51_{band}_s05_drz_sci.fits', y)]
        weight_row = index[(f'h_m51_{band}_s05_drz_weight.fits', y)]
        science = np.frombuffer(Path(science_row['artifact']['path']).read_bytes(), dtype='>f4').reshape(STRIP_HEIGHT, WIDTH)
        weight = np.frombuffer(Path(weight_row['artifact']['path']).read_bytes(), dtype='>f4').reshape(STRIP_HEIGHT, WIDTH)
        positive_weight = np.isfinite(weight) & (weight > 0)
        zero_weight = np.isfinite(weight) & (weight == 0)
        pair = {'band': band, 'sampleStartRowZeroBased': y,
                'scienceAll': distribution(science), 'weightAll': distribution(weight),
                'scienceAtPositiveWeight': distribution(science[positive_weight]),
                'scienceAtZeroWeight': distribution(science[zero_weight]),
                'weightPositiveXBoundsByRow': [([int(xs[0]), int(xs[-1])] if (xs := np.flatnonzero(row)).size else None) for row in positive_weight],
                'nonfiniteScienceAtPositiveWeight': int((~np.isfinite(science) & positive_weight).sum()),
                'nonzeroFiniteScienceAtZeroWeight': int((np.isfinite(science) & (science != 0) & zero_weight).sum()),
                'zeroFiniteScienceAtPositiveWeight': int((np.isfinite(science) & (science == 0) & positive_weight).sum())}
        # Strip boundary values help determine whether a future full-input
        # background/coverage trial is justified; they do not estimate sky.
        boundary_science, boundary_weight = [], []
        for line in range(STRIP_HEIGHT):
            xs = np.flatnonzero(positive_weight[line])
            if xs.size:
                for edge in sorted(set(xs[:8].tolist() + xs[-8:].tolist())):
                    boundary_science.append(science[line, edge])
                    boundary_weight.append(weight[line, edge])
        pair['scienceAtSampledPositiveWeightEdges'] = distribution(np.asarray(boundary_science))
        pair['weightAtSampledPositiveWeightEdges'] = distribution(np.asarray(boundary_weight))
        pairs.append(pair)
after = [bind(p) for p in paths]
assert before == after
(OUT / 'inputs-after.json').write_text(json.dumps(after, indent=2) + '\n')
result = {'status': 'BOUNDED_ORIGINAL_SCIENCE_WEIGHT_SAMPLES_NO_RECIPE_ADOPTION', 'inputsBeforeAfterExact': True,
          'receipts': sorted(receipts, key=lambda row: (row['source'], row['sampleStartRowZeroBased'])), 'pairs': pairs,
          'sampledRowsPerFile': len(START_ROWS) * STRIP_HEIGHT, 'totalRowsPerFile': HEIGHT,
          'acceptedArrayPayloadBytes': sum(row['receivedBytes'] for row in receipts),
          'reusedAcceptedRanges': len(reused), 'networkRequestsThisRun': 30 - len(reused),
          'newArrayPayloadBytesThisRun': sum(row['receivedBytes'] for row in receipts if 'reusedFromReceipts' not in row),
          'completeSourceFilesAcquired': 0, 'completeSourceHashes': None,
          'meaning': 'Same-index pairs are sampled observations, not verified full-array registration or validity-mask semantics. EXP weights are not inverse variance. Statistics retain finite negative and genuine zero science values; no background subtraction, RGB conversion, interpolation, mother/LOD processing, source correction, publication or adoption. No rectangular-image quality acceptance. Payload reads exclude transport overhead/billing.'}
(OUT / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'result': bind(OUT / 'result.json')}))
