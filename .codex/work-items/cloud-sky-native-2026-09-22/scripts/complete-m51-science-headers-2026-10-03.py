"""Continue pinned cached FITS prefixes, stopping before any image array."""
from pathlib import Path
import hashlib
import json
import re
import sys
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
from astropy.io import fits
from astropy.wcs import WCS
import numpy as np

PRIOR = ROOT / 'output/m51-science-metadata-1003-r1'
OUT = (ROOT / sys.argv[1]).resolve()
assert OUT.parent == ROOT / 'output' and OUT.name.startswith('m51-science-headers-')
LIMIT = 230400  # 80 FITS blocks, not a source-array acquisition allowance.
END = b'END' + b' ' * 77
PROTECTION = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'

def bind(p):
    raw = p.read_bytes()
    return {'path': str(p), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

assert bind(PRIOR / 'result.json')['sha256'] == '076cdb4adf7d53d686c9bd1aae5235babf716267bfef796f31433612d87c7e8b'
previous = json.loads((PRIOR / 'result.json').read_bytes())
protected = json.loads(PROTECTION.read_bytes())
sources = [row for row in previous['records'] if row.get('headerFailure') == 'StopIteration']
assert len(sources) == 6
paths = [Path(__file__), PRIOR / 'result.json', PROTECTION, Path(sys.executable), Path(fits.__file__), Path(np.__file__)]
paths += [Path(row['artifact']['path']) for row in previous['records'] if 'artifact' in row]
paths += [ROOT / row['path'] for row in protected]
before = [bind(p) for p in paths]
for row in previous['records']:
    if 'artifact' in row: assert bind(Path(row['artifact']['path'])) == row['artifact']
for row in protected: assert bind(ROOT / row['path'])['sha256'] == row['sha256']
OUT.mkdir()
(OUT / 'inputs-before.json').write_text(json.dumps(before, indent=2) + '\n')
(OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
records = []
headers = {}
for source in sources:
    cached = Path(source['artifact']['path'])
    prefix = cached.read_bytes()
    start = len(prefix)
    assert source['status'] == 206 and start == 28800 and not any(prefix[i:i + 80] == END for i in range(0, start, 80))
    total = int(re.fullmatch(r'bytes 0-28799/(\d+)', source['contentRange']).group(1))
    etag = source['etag']
    assert etag and not etag.startswith('W/')
    request = urllib.request.Request(source['url'], headers={
        'User-Agent': 'Starward-source-metadata-review/1.0', 'Accept-Encoding': 'identity',
        'Range': f'bytes={start}-{LIMIT - 1}', 'If-Range': etag})
    row = {'url': source['url'], 'cachedPrefix': source['artifact'], 'requestedRange': request.headers['Range'],
           'expectedEtag': etag, 'sourceTotalBytes': total, 'bodyBytesRead': 0}
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            assert urllib.parse.urlsplit(response.url).hostname == 'archive.stsci.edu' and urllib.parse.urlsplit(response.url).scheme == 'https'
            row.update(status=response.status, contentRange=response.headers.get('Content-Range'), etag=response.headers.get('ETag'))
            assert response.status == 206 and row['etag'] == etag, 'SOURCE_IDENTITY_CHANGED_OR_RANGE_IGNORED'
            assert row['contentRange'] == f'bytes {start}-{LIMIT - 1}/{total}', 'UNEXPECTED_CONTENT_RANGE'
            while len(prefix) < LIMIT:
                block = response.read(2880)
                row['bodyBytesRead'] += len(block)
                assert len(block) == 2880, 'INCOMPLETE_FITS_BLOCK'
                prefix += block
                if any(block[i:i + 80] == END for i in range(0, 2880, 80)): break
        end = next(i + 80 for i in range(0, len(prefix), 80) if prefix[i:i + 80] == END)
        header = fits.Header.fromstring(prefix[:end].decode('ascii'), sep='')
        assert header['SIMPLE'] is True and header['NAXIS'] == 2 and header['BITPIX'] == -32
        name = cached.name.removesuffix('.prefix')
        saved = OUT / (name + '.header')
        saved.write_bytes(prefix)
        row.update(headerArtifact=bind(saved), bytesThroughEnd=end, headerBlocksBytes=len(prefix),
                   fullSourceSha256=None, sourceArray='NOT_DOWNLOADED_OR_DECODED')
        keys = ['BITPIX', 'NAXIS1', 'NAXIS2', 'BUNIT', 'FILETYPE', 'FILTER1', 'FILTER2', 'EXPTIME', 'EXPOSURE',
                'CTYPE1', 'CTYPE2', 'CRPIX1', 'CRPIX2', 'CRVAL1', 'CRVAL2', 'CD1_1', 'CD1_2', 'CD2_1', 'CD2_2',
                'PHOTFLAM', 'PHOTPLAM', 'PHOTBW', 'PHOTZPT', 'WHTTYPE', 'SKYSUB', 'MDRIZSKY']
        row['primaryHeader'] = {key: header[key] for key in keys if key in header}
        row['processingCards'] = [str(card) for card in header.cards if any(word in str(card).upper() for word in ('SKY', 'WHT', 'WEIGHT'))]
        headers[name] = header
    except Exception as error:
        row['failure'] = type(error).__name__ + ': ' + str(error)
    records.append(row)
    print(json.dumps({key: row.get(key) for key in ('url', 'bodyBytesRead', 'bytesThroughEnd', 'failure')}), flush=True)

(OUT / 'records.json').write_text(json.dumps(records, indent=2) + '\n')
assert len(headers) == 6, 'FULL_PRIMARY_HEADERS_NOT_ESTABLISHED'
wcs_keys = ['CTYPE1', 'CTYPE2', 'CRPIX1', 'CRPIX2', 'CRVAL1', 'CRVAL2', 'CD1_1', 'CD1_2', 'CD2_1', 'CD2_2']
baseline = headers['h_m51_b_s05_drz_sci.fits']
wcs = WCS(baseline).celestial
corners = np.array([[0, 0], [8599, 0], [8599, 12199], [0, 12199], [4299.5, 6099.5]])
world = wcs.all_pix2world(corners, 0)
assert np.all(np.isfinite(world))
matching = all(all(header[key] == baseline[key] for key in wcs_keys) and header['NAXIS1'] == 8600 and header['NAXIS2'] == 12200 for header in headers.values())
assert matching, 'BAND_OR_WEIGHT_GEOMETRY_MISMATCH'
matrix = wcs.pixel_scale_matrix
scales = np.linalg.norm(matrix, axis=0) * 3600
after = [bind(p) for p in paths]
assert before == after
(OUT / 'inputs-after.json').write_text(json.dumps(after, indent=2) + '\n')
result = {'status': 'PINNED_PRIMARY_HEADERS_COMPLETE_ARRAYS_UNACQUIRED', 'inputsBeforeAfterExact': True,
          'records': records, 'sameDimensionsAndWcsAcrossSixHeaders': matching,
          'pixelScaleArcsec': scales.tolist(), 'wcsSampleOrigin': 0,
          'wcsSamplePixels': corners.tolist(), 'wcsSampleRaDecDeg': world.tolist(),
          'sourceBytesForSixFullFiles': sum(row['sourceTotalBytes'] for row in records),
          'additionalHeaderPayloadReadBytes': sum(row['bodyBytesRead'] for row in records),
          'completeArrayDownloads': 0, 'arrayDecodes': 0,
          'meaning': 'Header geometry agreement is not empirical astrometric registration, pixel validity, background correction, source-array integrity, rights admission or quality acceptance. Metadata text was reused, no source image/master/LOD processing. Byte reads are application payload, not transport billing.'}
(OUT / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'result': bind(OUT / 'result.json')}))
