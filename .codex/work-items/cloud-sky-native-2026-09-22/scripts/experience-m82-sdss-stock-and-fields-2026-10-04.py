"""Reuse M82 optical publications/cache; one official field query, no images."""
from pathlib import Path
import argparse
import csv
import hashlib
import importlib.util
import io
import json
import ssl
import subprocess
import sys
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OUT = ROOT / 'output/sdss-m82-stock-and-fields-1004-r1'
CHECKPOINT = TASK / 'evidence/current-execution-state-2026-10-04-r74.json'
HELPER = TASK / 'scripts/experience-m82-detail-acquisition-2026-10-02.py'
spec = importlib.util.spec_from_file_location('existing_source_io', HELPER)
prior = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prior)


def bind(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        while block := stream.read(1048576):
            h.update(block)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': h.hexdigest()}


def child():
    plan = json.loads((OUT / 'request-plan.json').read_bytes())
    receipt = {'state': 'REQUEST_STARTED', 'startedUtc': prior.now(), 'requestUrl': plan['requestUrl'],
               'attemptedRequests': 1, 'automaticRetries': 0, 'redirectsAllowed': False}
    prior.save(OUT / 'query-receipt.json', receipt)
    started = time.monotonic()
    try:
        tls = ssl.create_default_context()
        assert tls.check_hostname and tls.verify_mode == ssl.CERT_REQUIRED
        opener = urllib.request.build_opener(prior.NoRedirect(), urllib.request.HTTPSHandler(context=tls))
        request = urllib.request.Request(plan['requestUrl'], headers={'User-Agent': 'Starward-offline-M82-fields/1.0'})
        with opener.open(request, timeout=25) as response:
            assert response.status == 200 and response.geturl() == plan['requestUrl']
            receipt.update(httpStatus=response.status, actualFinalUrl=response.geturl())
            raw = response.read(500001)
        path = OUT / 'field-response.csv'
        path.write_bytes(raw)
        receipt.update(state='RAW_ACQUIRED_UNCHECKED', raw=bind(path))
        prior.save(OUT / 'query-receipt.json', receipt)
        assert 0 < len(raw) <= 500000
        # SkyServer CSV includes a #Table1 marker. FieldID remains an integer,
        # not a float64 round trip, and an empty result remains no field supply.
        lines = [line for line in raw.decode('utf-8-sig').splitlines() if not line.startswith('#')]
        reader = csv.DictReader(io.StringIO('\n'.join(lines)))
        assert set(reader.fieldnames or []) == {'fieldID', 'rerun', 'run', 'camcol', 'field'}
        rows = list(reader)
        assert len(rows) <= 128
        fields = []
        for row in rows:
            item = {'fieldID': int(row['fieldID']), 'rerun': str(int(row['rerun'])),
                    'run': int(row['run']), 'camcol': int(row['camcol']), 'field': int(row['field'])}
            assert item['fieldID'] > 0 and 1 <= item['camcol'] <= 6 and 0 <= item['field'] <= 9999
            fields.append(item)
        receipt.update(state='CHECKED_FIELD_METADATA_ONLY', fields=fields,
                       rowCount=len(fields), scientificCoverage='UNKNOWN_REQUIRES_ACTUAL_ARRAYS_WCS')
    except Exception as error:
        receipt.update(errorKind=type(error).__name__, errorCode='source_field_metadata_unavailable_or_unchecked')
        if receipt['state'] == 'REQUEST_STARTED':
            receipt['state'] = 'UNAVAILABLE'
    finally:
        receipt.update(finishedUtc=prior.now(), elapsedSeconds=time.monotonic() - started)
        prior.save(OUT / 'query-receipt.json', receipt)


def main():
    assert not OUT.exists()
    OUT.mkdir()
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    checkpoint = json.loads(CHECKPOINT.read_bytes())
    pins = checkpoint['currentSources'] + checkpoint['protected'] + checkpoint['evidence']
    assert [bind(ROOT / item['path']) for item in pins] == pins
    directory = ROOT / 'workers/miniapp-api/assets/deep-sky/sdss-m82'
    manifest_path = directory / 'manifest.json'
    manifest = json.loads(manifest_path.read_bytes())
    assert manifest['objectRef'] == 'M:82' and manifest['source']['license'] == 'CC BY 4.0'
    sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
    sys.path.insert(0, str(ROOT / 'data-pipelines/deep-sky'))
    from PIL import Image
    import numpy as np
    from sdss_gri_tan import target_tan
    published = []
    for level, item in manifest['levels'].items():
        path = directory / item['file']
        record = bind(path)
        assert record['bytes'] == item['bytes'] and record['sha256'] == item['sha256']
        with Image.open(path) as image:
            image.load()
            assert image.size == (item['pixels'], item['pixels']) and image.format == 'JPEG'
        published.append({'level': level, 'binding': record, 'fieldDegrees': item['fieldDegrees']})
    # Filename inventory is only cache discovery. It never qualifies a scientific
    # source or proves that a different target's cached frame covers M82.
    cached = sorted(path.as_posix() for path in (ROOT / 'output').rglob('frame-*.fits.bz2'))
    prior.save(OUT / 'inventory.json', {'manifest': bind(manifest_path), 'published': published,
        'cachedCorrectedFramePaths': [str(Path(p).relative_to(ROOT).as_posix()) for p in cached],
        'cacheMeaning': 'Discovery only; actual header/WCS/receipt/bytes must qualify requested identity',
        'newImageDownloads': 0, 'newProcessing': 0})
    # Same established primary-field query as M51, over the complete current
    # optical overview footprint, not a central subset or assumed full coverage.
    pixels = 2048
    field = manifest['levels']['OVERVIEW']['fieldDegrees']
    wcs = target_tan(manifest['center'], pixels, field)
    axis = np.linspace(0, pixels - 1, 5)
    samples = [{'x': float(x), 'y': float(y), 'raDeg': float(ra), 'decDeg': float(dec)}
        for y in axis for x in axis for ra, dec in [wcs.all_pix2world(x, y, 0)]]
    values = ','.join(f"({p['raDeg']:.12f},{p['decDeg']:.12f})" for p in samples)
    query = ('SELECT DISTINCT f.fieldID, f.rerun, f.run, f.camcol, f.field FROM (VALUES ' + values +
        ') AS t(ra,dec) CROSS APPLY dbo.fPolygonsContainingPointEq(t.ra,t.dec,0.01) AS p '
        'JOIN Region AS r ON r.regionID=p.regionID JOIN sdssPolygons AS s ON r.id=s.sdssPolygonID '
        'JOIN Field AS f ON f.fieldID=s.primaryFieldID ORDER BY f.fieldID')
    url = 'https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch?' + urllib.parse.urlencode({'cmd': query, 'format': 'csv'})
    prior.save(OUT / 'request-plan.json', {'objectRef': 'M:82', 'center': manifest['center'],
        'targetWcs': dict(wcs.to_header()), 'pixels': pixels, 'fieldDegrees': field, 'samples': samples,
        'query': query, 'requestUrl': url, 'scope': '25 target points locate primary fields; not full scientific/per-band/quality coverage',
        'socketTimeoutSeconds': 25, 'wholeChildBudgetSeconds': 35, 'readLimitBytes': 500001})
    process = subprocess.Popen([sys.executable, '-B', str(Path(__file__).resolve()), '--child'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        process.communicate(timeout=35)
    except subprocess.TimeoutExpired:
        process.kill()
        process.communicate()
        receipt = json.loads((OUT / 'query-receipt.json').read_bytes())
        receipt.update(state='UNAVAILABLE', errorKind='WHOLE_REQUEST_TIME_BUDGET_EXCEEDED')
        prior.save(OUT / 'query-receipt.json', receipt)
    receipt = json.loads((OUT / 'query-receipt.json').read_bytes())
    field_stock = []
    for item in receipt.get('fields', []):
        copies = {band: [str(Path(p).relative_to(ROOT).as_posix()) for p in cached
            if Path(p).name == f"frame-{band}-{item['run']:06d}-{item['camcol']}-{item['field']:04d}.fits.bz2"]
            for band in ('g', 'r', 'i')}
        field_stock.append({'identity': item, 'cachedFilenameMatchesUnqualified': copies})
    assert [bind(ROOT / item['path']) for item in pins] == pins
    prior.save(OUT / 'result.json', {'scope': 'Existing optical inventory and one official source field query only',
        'checkpoint': bind(CHECKPOINT), 'sourceScript': bind(Path(__file__)), 'helper': bind(HELPER),
        'originalBytePinsUnchanged': True, 'publishedImageBytes': sum(p['binding']['bytes'] for p in published),
        'queryState': receipt['state'], 'fields': field_stock, 'newImageDownloads': 0,
        'imagesModified': False, 'quality': 'UNVERIFIED_NOT_ADOPTED', 'independentReview': 'MISSING',
        'outputs': [bind(p) for p in sorted(OUT.iterdir()) if p.is_file()]})
    print(json.dumps({'queryState': receipt['state'], 'fieldCount': len(field_stock),
        'cachedCorrectedFrameCopies': sum(len(ps) for f in field_stock for ps in f['cachedFilenameMatchesUnqualified'].values()),
        'originalBytePinsUnchanged': True, 'newImageDownloads': 0}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--child', action='store_true')
    if parser.parse_args().child:
        child()
    else:
        main()
