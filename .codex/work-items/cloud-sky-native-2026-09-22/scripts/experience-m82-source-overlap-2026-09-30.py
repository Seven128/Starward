"""Offline overlap of received scientific tiles and the current registered JPEG.

UNKNOWN tiles and actual NONFINITE samples remain different classes. This is
not a full old-JPEG mask, a new image, or an exact CDS sampler certification.
"""
from pathlib import Path
import json
import math
import subprocess
import sys
import io

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / 'output/allwise-w3-m82-source-0930'
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
sys.path.insert(0, str(ROOT / 'data-pipelines/deep-sky'))
import numpy as np
from astropy.wcs import WCS
from PIL import Image
from allwise_finite_tan import sha256, checked_fits

output = BASE / 'source-overlap.json'
assert not output.exists(), 'preserve_existing_analysis'
manifest = json.loads((ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json').read_text(encoding='utf-8'))
entry = next(row for row in manifest['entries'] if row['objectRef'] == 'M:82')
asset = entry['levels']['DETAIL']
plan = json.loads((BASE / 'candidate-detail/candidate-plan.json').read_text(encoding='utf-8'))
receipt = json.loads((BASE / 'candidate-detail/candidate-result.json').read_text(encoding='utf-8'))
assert plan['center'] == entry['center'] and plan['objectRef'] == 'M:82'
profile = plan['profiles'][0]
assert profile['pixels'] == asset['pixels'] and profile['fieldDegrees'] == asset['fieldDegrees']
n = profile['pixels']
wcs = WCS(naxis=2)
wcs.wcs.ctype = ['RA---TAN','DEC--TAN']
wcs.wcs.crval = [entry['center']['raDeg'],entry['center']['decDeg']]
wcs.wcs.crpix = [n/2,n/2]
wcs.wcs.cdelt = np.rad2deg([-2*math.tan(math.radians(asset['fieldDegrees'])/2)/n,
                           2*math.tan(math.radians(asset['fieldDegrees'])/2)/n])
y, x = np.mgrid[0:n,0:n]
ra, dec = wcs.all_pix2world(x, n-1-y, 0)
world = np.stack([ra,dec],axis=-1).astype('<f8').tobytes()
assert sha256(world) == profile['worldSha256']
lookup = subprocess.run(['node',str(ROOT/'data-pipelines/deep-sky/hips_tan_lookup.mjs'),
                         str(profile['sourceOrder']),str(n)],input=world,capture_output=True,check=True,timeout=30).stdout
assert sha256(lookup) == profile['lookupSha256']
samples = np.frombuffer(lookup,dtype='<u4').reshape(n,n,3)
state = np.zeros((n,n),dtype=np.uint8)  # 0 UNKNOWN, 1 FINITE, 2 NONFINITE.
for item in receipt['sourceFiles']:
    if item['state'] != 'CHECKED':
        continue
    raw = (BASE/'candidate-detail/sources'/item['path']).read_bytes()
    assert len(raw) == item['bytes'] and sha256(raw) == item['sha256']
    data,_ = checked_fits(raw)
    pixel = int(Path(item['path']).stem.removeprefix('Npix'))
    take = samples[:,:,0] == pixel
    values = data[samples[:,:,2][take],samples[:,:,1][take]]
    state[take] = np.where(np.isfinite(values),1,2)
old = (ROOT/'workers/miniapp-api/assets/deep-sky'/asset['file']).read_bytes()
assert sha256(old) == asset['sha256']
jpeg = np.asarray(Image.open(io.BytesIO(old)).convert('L'))
missing = state == 2
result = {'scope': 'Received tiles under the currently declared TAN geometry; source NONFINITE and unavailable tiles remain separate; not a full old CDS JPEG mask',
          'objectRef':'M:82','level':'DETAIL','jpegSha256':sha256(old),
          'profile':profile,'checkedTiles':sum(item['state']=='CHECKED' for item in receipt['sourceFiles']),
          'plannedTiles':receipt['sourceTileCount'],'knownFiniteSamples':int((state==1).sum()),
          'knownNonfiniteSamples':int(missing.sum()),'unknownSamples':int((state==0).sum()),
          'jpegAtSourceNonfinitePercentiles':np.percentile(jpeg[missing],[0,50,90,99,100]).tolist() if missing.any() else None,
          'limits':['No new request or product pixels; unavailable source regions are not called missing measurements.',
                    'Own registered TAN and nearest HiPS samples, not the unknown original CDS interpolation or FITS header.',
                    'Overlap is evidence about the observed dark area, not permission to derive a whole mask from JPEG darkness.']}
output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps({key:result[key] for key in ['checkedTiles','plannedTiles','knownFiniteSamples','knownNonfiniteSamples','unknownSamples','jpegAtSourceNonfinitePercentiles']}))
