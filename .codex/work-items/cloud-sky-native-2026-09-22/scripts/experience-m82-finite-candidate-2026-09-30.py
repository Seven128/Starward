"""Bounded M82 candidate through existing WCS/HiPS/finite-display owners.

Only planned source FITS files are acquired, once each; checked inputs are reused.
This does not publish, replace JPEGs, fill holes or infer validity from brightness.
"""
from pathlib import Path
import io
import json
import math
import shutil
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / 'output/allwise-w3-m82-source-0930'
DETAIL_ONLY = sys.argv[1:] == ['detail']
OUTPUT = BASE / ('candidate-detail' if DETAIL_ONLY else 'candidate')
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
sys.path.insert(0, str(ROOT / 'data-pipelines/deep-sky'))
import numpy as np
from astropy.wcs import WCS
from PIL import Image
from allwise_finite_tan import (IRSA_HIPS, LEVELS, sha256, checked_fits,
                                finite_rgba, render_cached_candidate, encoded_rgb_support)

def save(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')

def main():
    assert not OUTPUT.exists(), 'preserve_existing_candidate; no implicit retry'
    OUTPUT.mkdir(parents=True)
    manifest = json.loads((ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json').read_text(encoding='utf-8'))
    entry = next(row for row in manifest['entries'] if row['objectRef'] == 'M:82')
    trial = json.loads((BASE / 'source-result.json').read_text(encoding='utf-8'))
    assert trial['center'] == entry['center']
    properties = (ROOT / 'output/allwise-w3-hips-0929/properties').read_bytes()
    assert sha256(properties) == trial['sourcePropertiesSha256']
    (BASE / 'properties').write_bytes(properties)
    profiles, lookups, tiles = [], {}, {}
    for level in ('DETAIL',) if DETAIL_ONLY else LEVELS:
        asset = entry['levels'][level]
        n, field = asset['pixels'], asset['fieldDegrees']
        wcs = WCS(naxis=2)
        wcs.wcs.ctype = ['RA---TAN', 'DEC--TAN']
        wcs.wcs.crval = [entry['center']['raDeg'], entry['center']['decDeg']]
        wcs.wcs.crpix = [n / 2, n / 2]
        step = 2 * math.tan(math.radians(field) / 2) / n
        wcs.wcs.cdelt = np.rad2deg([-step, step])
        order = min(8, max(0, math.ceil(math.log2(math.sqrt(math.pi / 3) / (512 * step)))))
        y, x = np.mgrid[0:n, 0:n]
        ra, dec = wcs.all_pix2world(x, n - 1 - y, 0)
        world = np.stack([ra, dec], axis=-1).astype('<f8').tobytes()
        lookup = subprocess.run(['node', str(ROOT / 'data-pipelines/deep-sky/hips_tan_lookup.mjs'), str(order), str(n)],
                                input=world, capture_output=True, check=True, timeout=30).stdout
        assert len(lookup) == n*n*12
        samples = np.frombuffer(lookup, dtype='<u4').reshape(n, n, 3)
        lookups[level] = samples
        paths = []
        for pixel in np.unique(samples[:, :, 0]):
            path = f'Norder{order}/Dir{int(pixel)//10000*10000}/Npix{int(pixel)}.fits'
            paths.append(path)
            tiles[path] = {'path': path, 'url': IRSA_HIPS + '/' + path}
        profiles.append({'level': level, 'pixels': n, 'fieldDegrees': field,
                         'sourceOrder': order, 'wcsHeader': dict(wcs.to_header()),
                         'worldSha256': sha256(world), 'lookupSha256': sha256(lookup), 'tiles': paths})
    assert 0 < len(tiles) <= 32, 'same bounded input-set limit as production candidate owner'
    plan = {'scope': 'One M82 local finite-source candidate, not adopted or published',
            'objectRef': entry['objectRef'], 'center': entry['center'], 'source': IRSA_HIPS,
            'tileWidth': 512, 'profiles': profiles}
    save(OUTPUT / 'candidate-plan.json', plan)
    result = {'scope': plan['scope'], 'sourcePropertiesSha256': sha256(properties),
              'sourceTileCount': len(tiles), 'sourceBytes': 0, 'sourceFiles': [], 'levels': []}
    receipt_path = OUTPUT / 'candidate-result.json'
    save(receipt_path, result)
    print(json.dumps({'phase': 'plan', 'tiles': len(tiles), 'profiles': [
        {'level': p['level'], 'order': p['sourceOrder'], 'tiles': len(p['tiles'])} for p in profiles]}), flush=True)
    data_tiles = {}
    for tile in tiles.values():
        record = dict(tile)
        target = OUTPUT / 'sources' / tile['path']
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            earlier = next((item for item in trial['files'] if item['url'] == tile['url'] and item['state'] == 'RECEIVED'), None)
            if earlier:
                raw = (BASE / earlier['file']).read_bytes()
                assert len(raw) == earlier['bytes'] and sha256(raw) == earlier['sha256']
                record['acquisition'] = 'REUSED'
            else:
                print('One source request: ' + tile['path'], flush=True)
                with urllib.request.urlopen(urllib.request.Request(tile['url'], headers={'User-Agent': 'Starward-bounded-finite-candidate/1.0'}), timeout=25) as response:
                    assert response.status == 200
                    raw = response.read(1_100_001)
                    assert 0 < len(raw) <= 1_100_000
                record['acquisition'] = 'RECEIVED'
            data, receipt = checked_fits(raw)
            target.write_bytes(raw)
            data_tiles[tile['path']] = data
            record.update(state='CHECKED', bytes=len(raw), sha256=sha256(raw), receipt=receipt,
                          nonfinite=int((~np.isfinite(data)).sum()))
            result['sourceBytes'] += len(raw)
        except Exception as error:
            record.update(state='UNAVAILABLE', error=f'{type(error).__name__}: {error}')
        result['sourceFiles'].append(record)
        save(receipt_path, result)
        assert record['state'] == 'CHECKED', 'required input unavailable; no source filling or automatic retry'
    for profile in profiles:
        level, n = profile['level'], profile['pixels']
        samples = lookups[level]
        intensity = np.full((n,n), np.nan, dtype=np.float32)
        for pixel in np.unique(samples[:, :, 0]):
            path = f'Norder{profile["sourceOrder"]}/Dir{int(pixel)//10000*10000}/Npix{int(pixel)}.fits'
            take = samples[:, :, 0] == pixel
            data = data_tiles[path]
            intensity[take] = data[samples[:, :, 2][take], samples[:, :, 1][take]]
        rgba, stretch = finite_rgba(intensity)
        filename = 'm82-' + level.lower() + '-finite.png'
        Image.fromarray(rgba).save(OUTPUT / filename)
        payload = (OUTPUT / filename).read_bytes()
        decoded = np.asarray(Image.open(io.BytesIO(payload)).convert('RGBA'))
        finite = np.isfinite(intensity)
        assert np.array_equal(decoded[:, :, 3] > 0, finite)
        assert np.array_equal(decoded, rgba)
        support = encoded_rgb_support(payload, n)
        result['levels'].append({'level': level, 'pixels': n, 'fieldDegrees': profile['fieldDegrees'],
            'file': filename, 'sha256': sha256(payload), 'bytes': len(payload),
            'missingPixels': int((~finite).sum()), 'finitePixels': int(finite.sum()),
            'finiteButBlackPixels': int(((rgba[:, :, 0] == 0) & finite).sum()),
            'displaySupportBytes': len(json.dumps(support, separators=(',', ':')).encode('ascii')),
            'wcsHeader': profile['wcsHeader'], 'stretch': stretch,
            'limits': 'Own complete TAN WCS and nearest HiPS samples; no old JPEG mask or artifact-free scientific coverage'})
        save(receipt_path, result)
    # Run the actual production owner over the independently prepared receipt.
    if not DETAIL_ONLY:
        rendered = render_cached_candidate(OUTPUT, entry)
        assert all(sha256(payload) == next(row for row in result['levels'] if row['level'] == level)['sha256']
                   for level, (payload, _) in rendered.items())
    else:
        result['publicationDependency'] = 'Existing publisher requires three-level v2 migration; one ready fine level needs a version-preserving partial refinement before product adoption'
        save(receipt_path, result)
    print(json.dumps({'phase': 'checked-candidate', 'tiles': len(tiles), 'sourceBytes': result['sourceBytes'], 'levels': result['levels']}), flush=True)

if __name__ == '__main__':
    assert sys.argv[1:] in [[], ['detail']]
    main()
