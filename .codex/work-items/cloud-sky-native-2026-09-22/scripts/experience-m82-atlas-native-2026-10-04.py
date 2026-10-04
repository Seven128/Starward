"""Once-only native Atlas core inputs, with actual directory filenames."""
from pathlib import Path
from html.parser import HTMLParser
import argparse
import hashlib
import importlib.util
import io
import json
import re
import ssl
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import warnings

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
META = ROOT / 'output/allwise-w3-m82-atlas-metadata-1004-r1'
CHECKPOINT = TASK / 'evidence/current-execution-state-2026-10-04-r72.json'
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


def verify(records):
    assert [bind(ROOT / record['path']) for record in records] == records


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.links.extend(value for key, value in attrs if key == 'href')


def child(output, operation):
    plan = json.loads((output / 'request-plan.json').read_bytes())
    request_plan = plan['requests'][operation]
    url, maximum = request_plan['url'], request_plan['maximumBytes']
    record = {'operation': operation, 'url': url, 'state': 'REQUEST_STARTED', 'startedUtc': prior.now(),
              'automaticRetries': 0, 'redirectsAllowed': False, 'socketTimeoutSeconds': 25,
              'wholeChildBudgetSeconds': 35, 'readLimitBytes': maximum + 1}
    receipt = output / f'{operation}-request.json'
    raw_path = output / ('atlas-directory.html' if operation == 'directory' else f'm82-{operation}-native.fits')
    prior.save(receipt, record)
    started = time.monotonic()
    try:
        tls = ssl.create_default_context()
        assert tls.check_hostname and tls.verify_mode == ssl.CERT_REQUIRED
        opener = urllib.request.build_opener(prior.NoRedirect(), urllib.request.HTTPSHandler(context=tls))
        request = urllib.request.Request(url, headers={'User-Agent': 'Starward-bounded-M82-Atlas-core/1.0'})
        with opener.open(request, timeout=25) as response:
            assert response.status == 200 and response.geturl() == url
            record.update(httpStatus=response.status, actualFinalUrl=response.geturl(),
                          contentLengthHeader=response.headers.get('Content-Length'))
            with raw_path.open('xb') as target:
                remaining = maximum + 1
                while remaining:
                    chunk = response.read(min(65536, remaining))
                    if not chunk:
                        break
                    target.write(chunk)
                    target.flush()
                    remaining -= len(chunk)
        raw = bind(raw_path)
        record.update(state='RAW_ACQUIRED_UNCHECKED', raw=raw, bytes=raw['bytes'], sha256=raw['sha256'],
                      rawTransferCompleted=True)
        prior.save(receipt, record)
        assert 0 < raw['bytes'] <= maximum
        if operation == 'directory':
            html = raw_path.read_text(encoding='utf-8')
            assert plan['coadd'] in html
            parser = Links()
            parser.feed(html)
            record.update(state='CHECKED_DIRECTORY_ONLY', links=parser.links)
        else:
            sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
            import numpy as np
            from astropy.io import fits
            from astropy.wcs import WCS
            with warnings.catch_warnings(record=True) as notices:
                warnings.simplefilter('always')
                with fits.open(io.BytesIO(raw_path.read_bytes()), memmap=False) as hdus:
                    hdus.verify('exception')
                    hdu = hdus[0]
                    assert hdu.header['COADDID'] == plan['coadd'] and hdu.header['BAND'] == 3
                    assert hdu.header['BITPIX'] == -32 and hdu.data.ndim == 2
                    assert all(0 < side <= 129 for side in hdu.data.shape)
                    offset = hdu.fileinfo()['datLoc']
                    assert raw['bytes'] >= offset + hdu.data.nbytes
                    data = np.array(hdu.data, copy=True)
                    header = hdu.header.copy()
                    wcs_header = dict(WCS(header).to_header(relax=True))
            record.update(state='CHECKED_NATIVE_ARRAY', completeArrayReceived=True, shape=list(data.shape),
                scalarCount=int(data.size), nonfiniteScalars=int((~np.isfinite(data)).sum()),
                finiteRange=[float(np.min(data[np.isfinite(data)])), float(np.max(data[np.isfinite(data)]))],
                BUNIT=header.get('BUNIT'), FILETYPE=header.get('FILETYPE'), MAGZP=header.get('MAGZP'),
                wcsHeader=wcs_header, header={key: header[key] for key in header if key not in ('', 'COMMENT', 'HISTORY')},
                missingEndPaddingBytes=max(0, (offset + data.nbytes + 2879) // 2880 * 2880 - raw['bytes']),
                readerWarnings=sorted(set(str(notice.message) for notice in notices)))
    except Exception as error:
        record.update(errorKind=type(error).__name__, errorCode='source_unavailable_or_unchecked')
        if raw_path.exists():
            raw = bind(raw_path)
            record.update(state='RAW_ACQUIRED_UNCHECKED', raw=raw, bytes=raw['bytes'], sha256=raw['sha256'])
        else:
            record['state'] = 'UNAVAILABLE'
    finally:
        record.update(finishedUtc=prior.now(), elapsedSeconds=time.monotonic() - started)
        prior.save(receipt, record)


def execute_one(output, operation):
    process = subprocess.Popen([sys.executable, '-B', str(Path(__file__).resolve()), '--output', str(output),
                                '--child', operation], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    timed_out = False
    try:
        process.communicate(timeout=35)
    except subprocess.TimeoutExpired:
        timed_out = True
        process.kill()
        process.communicate()
    receipt = output / f'{operation}-request.json'
    record = json.loads(receipt.read_bytes()) if receipt.exists() else {'operation': operation, 'state': 'UNAVAILABLE'}
    if timed_out:
        record.update(errorKind='WHOLE_REQUEST_TIME_BUDGET_EXCEEDED', finishedUtc=prior.now())
        if record['state'] not in ('CHECKED_DIRECTORY_ONLY', 'CHECKED_NATIVE_ARRAY'):
            raw_path = output / ('atlas-directory.html' if operation == 'directory' else f'm82-{operation}-native.fits')
            if raw_path.exists():
                raw = bind(raw_path)
                record.update(state='RAW_ACQUIRED_UNCHECKED', raw=raw, bytes=raw['bytes'], rawTransferCompleted=False)
        prior.save(receipt, record)
    print(json.dumps({'operation': operation, 'state': record['state'], 'httpStatus': record.get('httpStatus'),
                      'bytes': record.get('bytes'), 'shape': record.get('shape'), 'BUNIT': record.get('BUNIT')}), flush=True)
    return record


def parent(output):
    assert output.is_relative_to(ROOT / 'output') and not output.exists()
    output.mkdir(parents=True)
    (output / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    checkpoint = json.loads(CHECKPOINT.read_bytes())
    existing = checkpoint['currentSources'] + checkpoint['protected'] + checkpoint['evidence']
    verify(existing)
    meta_binding = json.loads((META / 'binding.json').read_bytes())
    verify(meta_binding['outputs'])
    meta = json.loads((META / 'query-result.json').read_bytes())
    assert meta['state'] == 'CHECKED_METADATA_ONLY' and meta['rowCount'] == 1
    row = meta['rows'][0]
    coadd = row['coadd_id']
    assert coadd == '1507p696_ac51' and row['band'] == 3
    center = meta['center']
    directory = f'https://irsa.ipac.caltech.edu/ibe/data/wise/allwise/p3am_cdd/{coadd[:2]}/{coadd[:4]}/{coadd}/'
    plan = {'coadd': coadd, 'center': center, 'scope': '128 native-pixel core patch only; not the full DETAIL field',
            'requests': {'directory': {'url': directory, 'maximumBytes': 128000}}}
    prior.save(output / 'request-plan.json', plan)
    result = {'scope': plan['scope'], 'metadata': bind(META / 'query-result.json'), 'sourceFiles': [],
              'checkpoint': bind(CHECKPOINT), 'checkpointBindingsBefore': existing, 'automaticRetries': 0}
    inventory = [bind(path) for pattern in ('*1507p696*', 'm82-*-native.fits')
                 for path in (ROOT / 'output').rglob(pattern) if path.is_file()]
    result['coaddFilenameInventoryBefore'] = inventory
    # Any unexpected prior coadd raw data needs qualification before fetching.
    assert not inventory, 'existing_coadd_cache_requires_qualification'
    saved_directory = ROOT / 'output/allwise-w3-m82-atlas-native-1004-r1'
    if output != saved_directory and (saved_directory / 'directory-request.json').exists():
        listing = json.loads((saved_directory / 'directory-request.json').read_bytes())
        assert listing['state'] == 'CHECKED_DIRECTORY_ONLY' and listing['httpStatus'] == 200
        assert listing['url'] == listing['actualFinalUrl'] == directory
        assert bind(ROOT / listing['raw']['path']) == listing['raw']
        parser = Links()
        parser.feed((ROOT / listing['raw']['path']).read_text(encoding='utf-8'))
        assert parser.links == listing['links']
        listing = {**listing, 'acquisition': 'REUSED_VERIFIED_DIRECTORY_FROM_PRIOR_TASK_FAILURE'}
    else:
        listing = execute_one(output, 'directory')
    result['directory'] = listing
    prior.save(output / 'acquisition.json', result)
    if listing['state'] == 'CHECKED_DIRECTORY_ONLY':
        for product in ('int', 'cov', 'unc'):
            stem = f'{coadd}-w3-{product}-3.fits'
            names = set(listing['links']) & {stem, stem + '.gz'}
            assert names, 'actual_directory_product_identity_required'
            # Both intensity variants can legitimately be listed. Select the
            # actual uncompressed variant when present; never infer a sibling.
            selected = stem if stem in names else stem + '.gz'
            query = urllib.parse.urlencode({'center': f"{center['raDeg']:.12f},{center['decDeg']:.12f}deg",
                                           'size': '128pix', 'gzip': 'false'})
            plan['requests'][product] = {'url': directory + selected + '?' + query, 'maximumBytes': 250000,
                                         'listedFileName': selected, 'listedVariants': sorted(names), 'requestedNativePixels': 128}
        prior.save(output / 'request-plan.json', plan)
        for product in ('int', 'cov', 'unc'):
            result['sourceFiles'].append(execute_one(output, product))
            prior.save(output / 'acquisition.json', result)
    result.update(fullCoreNativeTripletChecked=len(result['sourceFiles']) == 3 and all(
        item['state'] == 'CHECKED_NATIVE_ARRAY' for item in result['sourceFiles']),
        checkpointBindingsAfter=existing, finishedUtc=prior.now())
    verify(existing)
    verify(meta_binding['outputs'])
    prior.save(output / 'acquisition.json', result)
    prior.save(output / 'binding.json', {'script': bind(Path(__file__)), 'helper': bind(HELPER),
        'metadataBindings': meta_binding['outputs'], 'checkpoint': bind(CHECKPOINT),
        'outputs': [bind(path) for path in sorted(output.rglob('*')) if path.is_file()]})
    print(json.dumps({'fullCoreNativeTripletChecked': result['fullCoreNativeTripletChecked'],
                      'existingBytesExact': True, 'scope': plan['scope']}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--child', choices=('directory', 'int', 'cov', 'unc'))
    args = parser.parse_args()
    if args.child:
        child(args.output.resolve(), args.child)
    else:
        parent(args.output.resolve())
