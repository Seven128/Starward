"""Bounded M82 prepared-source acquisition. No publication or default adoption."""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import ssl
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OUT = ROOT / 'output/hubble-m82-prepared-source-1004-r1'
spec = importlib.util.spec_from_file_location('old_bounded_fetch', TASK / 'scripts/experience-sdss-core-quality-inputs-2026-10-02.py')
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
SOURCE = 'https://esahubble.org/images/heic0604a/'
POLICY = 'https://esahubble.org/copyright/'
IMAGE = 'https://cdn.esahubble.org/archives/images/publicationjpg/heic0604a.jpg'

def fetch(name, url, limit):
    receipt_path = OUT / (name + '.request.json')
    if receipt_path.exists():
        receipt = json.loads(receipt_path.read_bytes())
        if receipt['state'] != 'RAW_COMPLETE_UNADOPTED':
            raise RuntimeError('previous attempt retained; no automatic retry')
        assert receipt['raw'] == common.bind(OUT / name)
        print(json.dumps({'file': name, 'state': 'REUSED_EXACT', 'bytes': receipt['raw']['bytes']}), flush=True)
        return receipt
    start = time.monotonic()
    receipt = {'url': url, 'state': 'REQUEST_STARTED', 'maxBytes': limit,
               'socketTimeoutSeconds': 25, 'retries': 0, 'redirects': False, 'startedUtc': common.now()}
    common.save(receipt_path, receipt)
    context = ssl.create_default_context()
    opener = urllib.request.build_opener(common.NoRedirect(), urllib.request.HTTPSHandler(context=context))
    path = OUT / name
    try:
        with opener.open(urllib.request.Request(url, headers={'Accept-Encoding': 'identity', 'User-Agent': 'Starward-bounded-prepared-source/1.0'}), timeout=25) as response:
            assert response.status == 200 and response.geturl() == url
            declared = response.headers.get('Content-Length')
            if declared is not None and int(declared) > limit:
                raise RuntimeError('declared size exceeds acquisition bound')
            receipt.update(status=response.status, contentType=response.headers.get('Content-Type'), declaredLength=declared)
            with path.open('xb') as handle:
                total = 0
                while True:
                    block = response.read(min(65536, limit + 1 - total))
                    if not block:
                        break
                    total += len(block)
                    if total > limit:
                        raise RuntimeError('source exceeds acquisition bound')
                    handle.write(block)
                    if time.monotonic() - start > 90:
                        raise RuntimeError('bounded total acquisition time exceeded')
            if declared is not None:
                assert total == int(declared)
        receipt.update(state='RAW_COMPLETE_UNADOPTED', raw=common.bind(path))
    except Exception as error:
        receipt.update(state='FAILED_OR_INCOMPLETE', errorType=type(error).__name__)
        if path.exists():
            receipt['partial'] = common.bind(path)
    receipt.update(elapsedSeconds=time.monotonic()-start, finishedUtc=common.now())
    common.save(receipt_path, receipt)
    print(json.dumps(receipt), flush=True)
    if receipt['state'] != 'RAW_COMPLETE_UNADOPTED':
        raise RuntimeError('acquisition unavailable; keep failure and do not retry')
    return receipt

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('stage', choices=['metadata', 'image'])
    stage = parser.parse_args().stage
    protected = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    assert all(common.bind(ROOT/r['path'])['sha256'] == r['sha256'] for r in protected)
    OUT.mkdir(exist_ok=True)
    snapshot = OUT / 'executed-acquisition.py'
    if snapshot.exists():
        assert snapshot.read_bytes() == Path(__file__).read_bytes()
    else:
        snapshot.write_bytes(Path(__file__).read_bytes())
    if stage == 'metadata':
        fetch('source-page.html', SOURCE, 1024*1024)
        fetch('rights-page.html', POLICY, 1024*1024)
    else:
        # Run only after the saved source and policy have actually been reviewed.
        for name in ['source-page.html', 'rights-page.html']:
            receipt=json.loads((OUT/(name+'.request.json')).read_bytes())
            assert receipt['state']=='RAW_COMPLETE_UNADOPTED' and receipt['raw']==common.bind(OUT/name)
        assert IMAGE in (OUT/'source-page.html').read_text(encoding='utf-8')
        assert 'creativecommons.org/licenses/by/4.0' in (OUT/'rights-page.html').read_text(encoding='utf-8')
        # Existing M51 source and raw science are not requested again.
        fetch('heic0604a.jpg', IMAGE, 12*1024*1024)
    assert all(common.bind(ROOT/r['path'])['sha256'] == r['sha256'] for r in protected)

if __name__ == '__main__':
    main()
