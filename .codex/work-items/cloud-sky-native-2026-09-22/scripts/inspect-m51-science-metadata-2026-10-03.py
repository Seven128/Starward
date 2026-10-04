"""Bound official source metadata/primary FITS headers, never complete imagery."""
from pathlib import Path
import datetime
import hashlib
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
from astropy.io import fits

OUT = (ROOT / sys.argv[1]).resolve()
assert OUT.parent == ROOT / 'output' and OUT.name.startswith('m51-science-metadata-')
OUT.mkdir()
MAX_HEADER = 28800
TEXTS = [
    ('readme.txt', 'https://archive.stsci.edu/pub/hlsp/m51/h_m51_v1_rdm.txt'),
    ('data-use.html', 'https://archive.stsci.edu/publishing/data-use'),
    ('m51-products.html', 'https://archive.stsci.edu/prepds/m51/datalist.html'),
]
PROTECTION = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'
protected = json.loads(PROTECTION.read_bytes())

def bind(p):
    raw = p.read_bytes()
    return {'path': str(p), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

paths = [Path(__file__), PROTECTION, Path(sys.executable), Path(fits.__file__), *[ROOT / row['path'] for row in protected]]
before = [bind(p) for p in paths]
for row in protected: assert bind(ROOT / row['path'])['sha256'] == row['sha256']
(OUT / 'inputs-before.json').write_text(json.dumps(before, indent=2) + '\n')
(OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
records = []

def fetch(url, maximum, headers):
    request = urllib.request.Request(url, headers={'User-Agent': 'Starward-source-metadata-review/1.0', 'Accept-Encoding': 'identity', **headers})
    start = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            final = response.url
            assert urllib.parse.urlsplit(final).scheme == 'https' and urllib.parse.urlsplit(final).hostname == 'archive.stsci.edu'
            if 'Range' in headers:
                chunks = []
                for _ in range(maximum // 2880):
                    block = response.read(2880)
                    chunks.append(block)
                    if len(block) != 2880 or any(block[i:i + 80] == b'END' + b' ' * 77 for i in range(0, len(block), 80)): break
                raw = b''.join(chunks)
            else: raw = response.read(maximum)
            # Header range endpoints may ignore Range and return 200. Close
            # after this read; no data-array read or complete-download claim.
            record = {'url': url, 'finalUrl': final, 'status': response.status, 'retrievedAt': start,
                      'requestedRange': headers.get('Range'), 'receivedBytes': len(raw),
                      'contentRange': response.headers.get('Content-Range'), 'contentLength': response.headers.get('Content-Length'),
                      'contentType': response.headers.get('Content-Type'), 'etag': response.headers.get('ETag'),
                      'lastModified': response.headers.get('Last-Modified'), 'sha256': hashlib.sha256(raw).hexdigest()}
            return raw, record
    except urllib.error.HTTPError as error:
        return None, {'url': url, 'retrievedAt': start, 'status': error.code, 'failure': 'HTTP_ERROR_NO_SOURCE_BYTES_ACCEPTED'}
    except Exception as error:
        return None, {'url': url, 'retrievedAt': start, 'status': None, 'failure': type(error).__name__}

for name, url in TEXTS:
    raw, record = fetch(url, 524289, {})
    if raw is not None:
        if len(raw) > 524288: record['failure'] = 'TEXT_BODY_BOUND_EXCEEDED'
        else:
            (OUT / name).write_bytes(raw)
            record['artifact'] = bind(OUT / name)
    records.append(record)
    print(json.dumps({'metadata': name, 'status': record['status'], 'bytes': record.get('receivedBytes'), 'failure': record.get('failure')}), flush=True)

for band in ('b', 'v', 'i'):
    for kind in ('sci', 'weight'):
        name = f'h_m51_{band}_s05_drz_{kind}.fits'
        url = 'https://archive.stsci.edu/pub/hlsp/m51/version1/' + name
        raw, record = fetch(url, MAX_HEADER, {'Range': f'bytes=0-{MAX_HEADER - 1}'})
        if raw is not None:
            (OUT / (name + '.prefix')).write_bytes(raw)
            record['artifact'] = bind(OUT / (name + '.prefix'))
            try:
                end = next(i + 80 for i in range(0, len(raw) - 79, 80) if raw[i:i + 80] == b'END' + b' ' * 77)
                header = fits.Header.fromstring(raw[:end].decode('ascii'), sep='')
                assert header['SIMPLE'] is True and header['NAXIS'] == 2
                keys = ['BITPIX', 'NAXIS', 'NAXIS1', 'NAXIS2', 'BUNIT', 'FILTER1', 'FILTER2', 'EXPTIME', 'EXPOSURE', 'INSTRUME', 'TELESCOP',
                        'CTYPE1', 'CTYPE2', 'CRPIX1', 'CRPIX2', 'CRVAL1', 'CRVAL2', 'CD1_1', 'CD1_2', 'CD2_1', 'CD2_2', 'ORIENTAT',
                        'PHOTFLAM', 'PHOTPLAM', 'PHOTBW', 'PHOTZPT', 'DRIZCORR', 'DRIZSCAL', 'D001SCAL', 'D001PIXF', 'SKYSUB', 'D001SCAL']
                record['primaryHeader'] = {key: header[key] for key in dict.fromkeys(keys) if key in header}
                record['primaryHeaderBytesThroughEnd'] = end
                record['history'] = list(header.get('HISTORY', []))
                record['fullFileIntegrity'] = 'UNVERIFIED_PREFIX_ONLY'
                record['arrays'] = 'NOT_DECODED_NO_COMPLETE_ARRAY_DOWNLOAD'
            except Exception as error:
                record['headerFailure'] = type(error).__name__
        records.append(record)
        print(json.dumps({'header': name, 'status': record['status'], 'bytes': record.get('receivedBytes'),
                          'dimensions': record.get('primaryHeader', {}).get('NAXIS1'), 'failure': record.get('failure', record.get('headerFailure'))}), flush=True)

after = [bind(p) for p in paths]
assert before == after
(OUT / 'inputs-after.json').write_text(json.dumps(after, indent=2) + '\n')
result = {'status': 'OFFICIAL_METADATA_AND_BOUNDED_PRIMARY_HEADERS_ONLY', 'inputsBeforeAfterExact': True,
          'records': records, 'completeArrayDownloads': 0, 'arrayDecodes': 0,
          'meaning': 'Public explanatory material and bounded FITS prefixes only. Prefix receipts are not complete scientific source identities or rights/adoption. No source array decode, master/LOD rewrite, acquisition of full FITS files, data publication, model correction, service restart, deployment, phone, or default registry change. Receipt byte count is application payload read, not total transport/billing.'}
(OUT / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'result': bind(OUT / 'result.json')}))
