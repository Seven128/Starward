"""Actual M82 primary-field r inputs and full optical target support discovery."""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import ssl
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
STOCK = ROOT / 'output/sdss-m82-stock-and-fields-1004-r1'
OUT = ROOT / 'output/sdss-m82-r-footprint-1004-r1'
CHECKPOINT = TASK / 'evidence/current-execution-state-2026-10-04-r75.json'
HELPER = TASK / 'scripts/experience-m82-detail-acquisition-2026-10-02.py'
spec = importlib.util.spec_from_file_location('prior_bounded_source', HELPER)
prior = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prior)


def bind(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        while block := stream.read(1048576):
            h.update(block)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': h.hexdigest()}


def child(index):
    item = json.loads((OUT / 'acquisition-plan.json').read_bytes())['sources'][index]
    started = time.monotonic()
    path = OUT / 'sources' / item['path']
    receipt_path = OUT / f'request-{index:02d}.json'
    record = {**item, 'state': 'REQUEST_STARTED', 'startedUtc': prior.now(),
              'attemptedRequests': 1, 'automaticRetries': 0, 'redirectsAllowed': False}
    prior.save(receipt_path, record)
    try:
        tls = ssl.create_default_context()
        assert tls.check_hostname and tls.verify_mode == ssl.CERT_REQUIRED
        opener = urllib.request.build_opener(prior.NoRedirect(), urllib.request.HTTPSHandler(context=tls))
        request = urllib.request.Request(item['sourceUrl'], headers={'User-Agent': 'Starward-offline-M82-source/1.0'})
        with opener.open(request, timeout=25) as response:
            assert response.status == 200 and response.geturl() == item['sourceUrl']
            record.update(httpStatus=response.status, actualFinalUrl=response.geturl())
            raw = response.read(16 * 1024 * 1024 + 1)
        path.write_bytes(raw)
        record.update(state='RAW_ACQUIRED_UNCHECKED', raw=bind(path))
        assert 16 <= len(raw) <= 16 * 1024 * 1024 and raw.startswith(b'BZh')
        sys.path[:0] = [str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'), str(ROOT / 'data-pipelines/deep-sky')]
        from sdss_corrected_frame import read_cached_frame
        frame = read_cached_frame(path, {**item['identity'], **record['raw'], 'sourceUrl': item['sourceUrl']},
                                  max_uncompressed_bytes=32 * 1024 * 1024)
        record.update(state='STRUCTURE_ACCEPTED_SCIENTIFIC_VALIDITY_UNVERIFIED', readerReceipt=frame.receipt)
    except Exception as error:
        record.update(errorKind=type(error).__name__, errorCode='source_acquisition_or_structure_unqualified')
        if record['state'] == 'REQUEST_STARTED':
            record['state'] = 'UNAVAILABLE'
    finally:
        record.update(finishedUtc=prior.now(), elapsedSeconds=time.monotonic() - started)
        prior.save(receipt_path, record)


def main():
    assert not OUT.exists()
    (OUT / 'sources').mkdir(parents=True)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    checkpoint = json.loads(CHECKPOINT.read_bytes())
    pins = checkpoint['currentSources'] + checkpoint['protected'] + checkpoint['evidence']
    assert [bind(ROOT / p['path']) for p in pins] == pins
    stock = json.loads((STOCK / 'result.json').read_bytes())
    stock_receipt = json.loads((STOCK / 'query-receipt.json').read_bytes())
    stock_plan = json.loads((STOCK / 'request-plan.json').read_bytes())
    assert stock['queryState'] == 'CHECKED_FIELD_METADATA_ONLY' and len(stock['fields']) == 8
    assert bind(STOCK / 'field-response.csv') == stock_receipt['raw']
    records = []
    for f in stock['fields']:
        assert not f['cachedFilenameMatchesUnqualified']['r']
        identity = {k: f['identity'][k] for k in ('run', 'rerun', 'camcol', 'field')}
        identity['band'] = 'r'
        name = f"frame-r-{identity['run']:06d}-{identity['camcol']}-{identity['field']:04d}.fits.bz2"
        # Inventory all current output caches again before this missing-source
        # batch; discovering a new copy requires receipt qualification, not GET.
        assert not list((ROOT / 'output').rglob(name)), 'new_cached_copy_requires_admission'
        url = f"https://data.sdss.org/sas/dr17/eboss/photoObj/frames/{identity['rerun']}/{identity['run']}/{identity['camcol']}/{name}"
        records.append({'identity': identity, 'fieldID': f['identity']['fieldID'], 'path': name, 'sourceUrl': url})
    prior.save(OUT / 'acquisition-plan.json', {'objectRef': 'M:82', 'stockReceipt': bind(STOCK / 'query-receipt.json'),
        'sources': records, 'scope': 'Missing r inputs for actual full optical target demand, not gri or artifact quality',
        'socketTimeoutSeconds': 25, 'wholeChildBudgetSeconds': 35, 'maximumCompressedBytes': 16 * 1024 * 1024,
        'maximumDecompressedBytes': 32 * 1024 * 1024, 'automaticRetries': 0})
    acquired = []
    for index in range(len(records)):
        process = subprocess.Popen([sys.executable, '-B', str(Path(__file__).resolve()), '--child', str(index)],
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            stdout, stderr = process.communicate(timeout=35)
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()
            receipt_path = OUT / f'request-{index:02d}.json'
            record = json.loads(receipt_path.read_bytes()) if receipt_path.exists() else records[index]
            record.update(state='UNAVAILABLE', errorKind='WHOLE_REQUEST_TIME_BUDGET_EXCEEDED')
            prior.save(receipt_path, record)
        if stderr:
            (OUT / f'child-{index:02d}-stderr.txt').write_bytes(stderr)
        record = json.loads((OUT / f'request-{index:02d}.json').read_bytes())
        acquired.append(record)
        prior.save(OUT / 'acquisition-progress.json', acquired)
        print(json.dumps({'field': record['identity'], 'state': record['state'], 'bytes': record.get('raw', {}).get('bytes')}), flush=True)
    sys.path[:0] = [str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'), str(ROOT / 'data-pipelines/deep-sky')]
    import numpy as np
    from sdss_corrected_frame import read_cached_frame
    from sdss_gri_tan import target_tan, project_frame_window
    pixels = stock_plan['pixels']
    target = target_tan(stock_plan['center'], pixels, stock_plan['fieldDegrees'])
    union_footprint = np.zeros((pixels, pixels), dtype=bool)
    union_finite = np.zeros_like(union_footprint)
    contributors = np.zeros((pixels, pixels), dtype=np.uint8)
    measured = []
    for index, record in enumerate(acquired):
        if record['state'] != 'STRUCTURE_ACCEPTED_SCIENTIFIC_VALIDITY_UNVERIFIED':
            measured.append({'identity': record['identity'], 'state': 'UNAVAILABLE_NOT_ZERO_COVERAGE'})
            continue
        frame = read_cached_frame(ROOT / record['raw']['path'], {**record['identity'], **record['raw'],
            'sourceUrl': record['sourceUrl']}, max_uncompressed_bytes=32 * 1024 * 1024)
        footprint, finite = np.zeros_like(union_footprint), np.zeros_like(union_footprint)
        for start in range(0, pixels, 128):
            stop = min(start + 128, pixels)
            projected = project_frame_window(frame, target, pixels, (slice(start, stop), slice(0, pixels)))
            footprint[start:stop], finite[start:stop] = projected.footprint, projected.finite_neighbors
        union_footprint |= footprint
        union_finite |= finite
        contributors += finite.astype(np.uint8)
        path = OUT / f'field-{index:02d}-support.npz'
        np.savez_compressed(path, footprint=np.packbits(footprint, bitorder='little'),
                            finite_neighbors=np.packbits(finite, bitorder='little'))
        core = slice(pixels // 2 - 32, pixels // 2 + 32)
        measured.append({'identity': record['identity'], 'state': 'R_GEOMETRY_MEASURED_QUALITY_UNKNOWN',
            'readerReceipt': record['readerReceipt'], 'sourceRaw': record['raw'], 'support': bind(path),
            'targetShape': [pixels, pixels], 'footprintPixels': int(footprint.sum()),
            'finiteStencilPixels': int(finite.sum()), 'central64SquareFinitePixels': int(finite[core, core].sum()),
            'participates': bool(finite.any()), 'actualScientificQuality': 'UNKNOWN'})
        print(json.dumps({'measuredField': record['identity'], 'finiteStencilPixels': int(finite.sum())}), flush=True)
        del frame, footprint, finite, projected
    union_path = OUT / 'union-support.npz'
    np.savez_compressed(union_path, footprint=np.packbits(union_footprint, bitorder='little'),
                        finite_neighbors=np.packbits(union_finite, bitorder='little'), contributor_count=contributors)
    assert [bind(ROOT / p['path']) for p in pins] == pins
    prior.save(OUT / 'result.json', {'scope': 'Actual r full-target source supply; no gri/scientific quality/absolute astrometry acceptance',
        'checkpoint': bind(CHECKPOINT), 'originalBytePinsUnchanged': True, 'producer': bind(Path(__file__)),
        'sourceOwners': [bind(ROOT / 'data-pipelines/deep-sky' / n) for n in ('sdss_corrected_frame.py', 'sdss_gri_tan.py', 'sdss_source_stencil.py')],
        'targetCenter': stock_plan['center'], 'targetWcs': dict(target.to_header()), 'targetShape': [pixels, pixels],
        'fieldDegrees': stock_plan['fieldDegrees'], 'fields': measured,
        'acquisitionComplete': all(f['state'] == 'STRUCTURE_ACCEPTED_SCIENTIFIC_VALIDITY_UNVERIFIED' for f in acquired),
        'newCompressedSourceBytes': sum(f.get('raw', {}).get('bytes', 0) for f in acquired),
        'unionFootprintPixels': int(union_footprint.sum()), 'unionFiniteStencilPixels': int(union_finite.sum()),
        'targetPixels': pixels * pixels, 'maximumFieldContributors': int(contributors.max()), 'unionSupport': bind(union_path),
        'missingInputsMean': 'Unavailable, not scientific zero/missing pixels', 'wcsMeaning': 'Actual linear TAN header approximation; retained full asTrans not applied',
        'newGriOrDisplayProcessing': False, 'ordinaryAdoption': False, 'quality': 'UNVERIFIED', 'independentReview': 'MISSING'})
    print(json.dumps({'newCompressedSourceBytes': sum(f.get('raw', {}).get('bytes', 0) for f in acquired),
        'rFiniteUnionPixels': int(union_finite.sum()), 'targetPixels': pixels * pixels, 'originalBytePinsUnchanged': True}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--child', type=int)
    args = parser.parse_args()
    if args.child is not None:
        child(args.child)
    else:
        main()
