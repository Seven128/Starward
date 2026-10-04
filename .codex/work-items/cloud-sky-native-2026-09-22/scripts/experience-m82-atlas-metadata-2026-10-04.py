"""One same-survey M82 Atlas metadata request; no image acquisition or repair."""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import ssl
import subprocess
import sys
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
CHECKPOINT = TASK / 'evidence/current-execution-state-2026-10-04-r71.json'
HELPER = TASK / 'scripts/experience-m82-detail-acquisition-2026-10-02.py'
spec = importlib.util.spec_from_file_location('prior_bounded_source', HELPER)
prior = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prior)


def bind(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1048576):
            h.update(chunk)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': h.hexdigest()}


def child(output):
    manifest = json.loads((ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json').read_bytes())
    entry = next(item for item in manifest['entries'] if item['objectRef'] == 'M:82')
    center = entry['center']
    pos = f"{center['raDeg']:.12f},{center['decDeg']:.12f}"
    url = 'https://irsa.ipac.caltech.edu/ibe/search/wise/allwise/p3am_cdd?' + urllib.parse.urlencode({'POS': pos, 'WHERE': 'band=3'})
    record = {'scope': 'One same-survey M82 AllWISE W3 Atlas metadata query only', 'objectRef': 'M:82',
        'center': center, 'url': url, 'startedUtc': prior.now(), 'state': 'REQUEST_STARTED',
        'attemptedRequests': 1, 'automaticRetries': 0, 'redirectsAllowed': False,
        'readLimitBytes': 500001, 'socketTimeoutSeconds': 25, 'wholeChildBudgetSeconds': 35}
    receipt = output / 'query-result.json'
    prior.save(receipt, record)
    raw_path = output / 'atlas-metadata.tbl'
    started = time.monotonic()
    try:
        tls = ssl.create_default_context()
        assert tls.check_hostname and tls.verify_mode == ssl.CERT_REQUIRED
        opener = urllib.request.build_opener(prior.NoRedirect(), urllib.request.HTTPSHandler(context=tls))
        request = urllib.request.Request(url, headers={'User-Agent': 'Starward-bounded-M82-Atlas-metadata/1.0'})
        with opener.open(request, timeout=25) as response:
            assert response.status == 200 and response.geturl() == url
            record.update(httpStatus=response.status, actualFinalUrl=response.geturl())
            raw = response.read(500001)
        raw_path.write_bytes(raw)
        record.update(state='RAW_ACQUIRED_UNCHECKED', raw=bind(raw_path), bytes=len(raw))
        prior.save(receipt, record)
        assert 0 < len(raw) <= 500000
        sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
        from astropy.table import Table
        import numpy as np
        table = Table.read(raw_path, format='ascii.ipac')
        assert 0 < len(table) <= 8 and all(int(row['band']) == 3 for row in table)
        rows = []
        for row in table:
            decoded = {}
            for key in table.colnames:
                value = row[key]
                decoded[key] = None if np.ma.is_masked(value) else value.item() if isinstance(value, np.generic) else value
            rows.append(decoded)
        record.update(state='CHECKED_METADATA_ONLY', columns=list(table.colnames), rows=rows, rowCount=len(rows))
    except Exception as error:
        record.update(errorKind=type(error).__name__, errorCode='source_metadata_unavailable_or_unchecked')
        if raw_path.exists():
            record.update(state='RAW_ACQUIRED_UNCHECKED', raw=bind(raw_path), bytes=raw_path.stat().st_size)
        else:
            record['state'] = 'UNAVAILABLE'
    finally:
        record.update(finishedUtc=prior.now(), elapsedSeconds=time.monotonic() - started)
        prior.save(receipt, record)


def parent(output):
    assert output.is_relative_to(ROOT / 'output') and not output.exists()
    output.mkdir(parents=True)
    (output / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    checkpoint = json.loads(CHECKPOINT.read_bytes())
    existing = checkpoint['currentSources'] + checkpoint['protected'] + checkpoint['evidence']
    assert [bind(ROOT / item['path']) for item in existing] == existing
    process = subprocess.Popen([sys.executable, '-B', str(Path(__file__).resolve()), '--output', str(output), '--child'],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    timed_out = False
    try:
        process.communicate(timeout=35)
    except subprocess.TimeoutExpired:
        timed_out = True
        process.kill()
        process.communicate()
    receipt = output / 'query-result.json'
    record = json.loads(receipt.read_bytes()) if receipt.exists() else {'state': 'UNAVAILABLE'}
    if timed_out:
        record.update(errorKind='WHOLE_REQUEST_TIME_BUDGET_EXCEEDED', finishedUtc=prior.now())
        prior.save(receipt, record)
    assert [bind(ROOT / item['path']) for item in existing] == existing
    prior.save(output / 'binding.json', {'checkpoint': bind(CHECKPOINT), 'historicalCheckpointUnchanged': True,
        'scope': 'Only one metadata query; no Atlas FITS, masks, source processing or publication',
        'script': bind(Path(__file__)), 'helper': bind(HELPER),
        'outputs': [bind(path) for path in sorted(output.rglob('*')) if path.is_file()]})
    print(json.dumps({'state': record['state'], 'bytes': record.get('bytes'), 'rowCount': record.get('rowCount'),
                      'coaddIds': [row['coadd_id'] for row in record.get('rows', [])], 'existingBytesExact': True}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--child', action='store_true')
    args = parser.parse_args()
    if args.child:
        child(args.output.resolve())
    else:
        parent(args.output.resolve())
