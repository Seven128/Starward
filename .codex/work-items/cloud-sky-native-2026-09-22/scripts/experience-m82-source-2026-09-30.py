"""One source-tile check for the observed M82 dark core, not a JPEG mask.

Reuse the acquired HiPS properties and existing cached Astropy runtime.
Two bounded new requests, no retry, source/published image bytes unchanged.
"""
from pathlib import Path
import hashlib
import io
import json
import sys
import urllib.request
import warnings

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
from astropy.io import fits
import numpy as np
from PIL import Image

SOURCE = 'https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/W3'
OUTPUT = ROOT / 'output/allwise-w3-m82-source-0930'
TILE = 'Norder8/Dir120000/Npix121707'
FIT_PIXEL = (267, 70)

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    receipt_path = OUTPUT / 'source-result.json'
    assert not receipt_path.exists(), 'preserve_existing_trial'
    original = json.loads((ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json').read_text(encoding='utf-8'))
    entry = next(row for row in original['entries'] if row['objectRef'] == 'M:82')
    assert entry['center'] == {'raDeg': 148.96970833333333, 'decDeg': 69.6793888888889, 'frame': 'ICRS J2000'}
    properties = (ROOT / 'output/allwise-w3-hips-0929/properties').read_bytes()
    earlier = json.loads((ROOT / 'output/allwise-w3-hips-0929/candidate-axes-corrected/candidate-result.json').read_text(encoding='utf-8'))
    assert sha(properties) == earlier['sourcePropertiesSha256']
    result = {'scope': 'One actual source tile at M82 center; not old-cutout mask or full scientific quality',
              'objectRef': entry['objectRef'], 'center': entry['center'], 'tile': TILE,
              'fitsPixel': list(FIT_PIXEL), 'sourcePropertiesSha256': sha(properties), 'files': []}
    for name, suffix, maximum in [('m82-tile.fits', '.fits', 1_200_000), ('m82-tile.jpg', '.jpg', 400_000)]:
        url = SOURCE + '/' + TILE + suffix
        record = {'file': name, 'url': url}
        try:
            print('M82 source: one ' + name + ' request', flush=True)
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Starward-bounded-source-quality/1.0'}), timeout=25) as response:
                assert response.status == 200
                raw = response.read(maximum + 1)
                assert 0 < len(raw) <= maximum
            (OUTPUT / name).write_bytes(raw)
            record.update(state='RECEIVED', bytes=len(raw), sha256=sha(raw))
        except Exception as error:
            record.update(state='UNAVAILABLE', error=f'{type(error).__name__}: {error}')
        result['files'].append(record)
        receipt_path.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    analyze()

def analyze():
    # A failed optional JPEG must not strand a complete independent FITS array.
    # Analyze the received immutable files only; never repeat acquisition.
    receipt_path = OUTPUT / 'source-result.json'
    analysis_path = OUTPUT / 'source-analysis.json'
    assert not analysis_path.exists(), 'preserve_existing_analysis'
    result = json.loads(receipt_path.read_text(encoding='utf-8'))
    original = json.loads((ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json').read_text(encoding='utf-8'))
    entry = next(row for row in original['entries'] if row['objectRef'] == 'M:82')
    assert entry['center'] == result['center'] and result['fitsPixel'] == list(FIT_PIXEL) and result['tile'] == TILE
    fits_receipt = next(row for row in result['files'] if row['file'] == 'm82-tile.fits')
    assert fits_receipt['state'] == 'RECEIVED', 'independent_fits_unavailable'
    raw = (OUTPUT / 'm82-tile.fits').read_bytes()
    assert len(raw) == fits_receipt['bytes'] and sha(raw) == fits_receipt['sha256']
    with warnings.catch_warnings(record=True) as notices:
        warnings.simplefilter('always')
        with fits.open(io.BytesIO(raw), memmap=False) as hdus:
            hdus.verify('exception')
            data = np.array(hdus[0].data, copy=True)
            offset = hdus[0].fileinfo()['datLoc']
            assert hdus[0].header['BITPIX'] == -32 and data.shape == (512, 512)
            assert len(raw) >= offset + data.nbytes, 'truncated_scientific_array'
    jpeg_receipt = next(row for row in result['files'] if row['file'] == 'm82-tile.jpg')
    jpeg = None
    if jpeg_receipt['state'] == 'RECEIVED':
        jpeg_raw = (OUTPUT / 'm82-tile.jpg').read_bytes()
        assert len(jpeg_raw) == jpeg_receipt['bytes'] and sha(jpeg_raw) == jpeg_receipt['sha256']
        jpeg = np.asarray(Image.open(io.BytesIO(jpeg_raw)).convert('L'))
        assert jpeg.shape == data.shape
    x, y = FIT_PIXEL
    missing = ~np.isfinite(data[::-1])
    jpeg_y = 511 - y
    old_path = ROOT / 'workers/miniapp-api/assets/deep-sky' / entry['levels']['DETAIL']['file']
    old = old_path.read_bytes()
    assert sha(old) == entry['levels']['DETAIL']['sha256']
    old_pixels = np.asarray(Image.open(io.BytesIO(old)).convert('L'))
    result.update(completeArrayReceived=True, sourceNonfiniteSamples=int(missing.sum()),
        centerSourceFinite=bool(np.isfinite(data[y, x])), centerSourceJpeg=int(jpeg[jpeg_y, x]) if jpeg is not None else None,
        nearbySourceNonfinite=int((~np.isfinite(data[max(0,y-15):y+16,max(0,x-15):x+16])).sum()),
        missingJpegPercentiles=np.percentile(jpeg[missing], [0,50,90,99,100]).tolist() if jpeg is not None and missing.any() else None,
        missingEndPaddingBytes=max(0,(offset+data.nbytes+2879)//2880*2880-len(raw)),
        readerWarnings=sorted(set(str(notice.message) for notice in notices)),
        currentDetailSha256=sha(old), currentDetailCenterRgb=int(old_pixels[256,256]),
        limitation='Exact source center and one whole HiPS tile only; no old CDS resampling/header or full TAN validity is certified. No saturation cause inferred solely from the low value.')
    analysis_path.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result))

if __name__ == '__main__':
    assert sys.argv[1:] in [[], ['analyze']]
    analyze() if sys.argv[1:] else main()
