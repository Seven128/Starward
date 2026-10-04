"""Independent cached GPU readback and direct ray/TAN sampling oracle.

No browser, shader/registration helper, production edit or source request.
"""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image

SOURCE = ROOT/'output/playwright/cloud-sky-sdss-level-composition-1002-r3'
OUTPUT = ROOT/'output/sdss-level-composition-independent-1002-r1'
generation = 1
while OUTPUT.exists():
    generation += 1
    OUTPUT = ROOT/f'output/sdss-level-composition-independent-1002-r{generation}'
OUTPUT.mkdir()
inputs = []
def binding(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),
            'sha256':hashlib.sha256(raw).hexdigest()}
def admit(path,declaration=None):
    actual = binding(path)
    if declaration:
        assert (actual['bytes'],actual['sha256']) == (declaration['bytes'],declaration['sha256'])
    inputs.append(actual)
    return path.resolve()
def load_json(path,declaration=None):
    return json.loads(admit(path,declaration).read_text(encoding='utf8'))
result = load_json(SOURCE/'result.json')
assert inputs[-1]['sha256'] == '47f2c8e4a1cf868a7ec3db4a90c2f7b8f2a35b87189432b2c18e33a76ccbc832'
for item in result['sourceHashes']+result['inputs']+result['artifacts']:
    admit(Path(item['path']) if Path(item['path']).is_absolute()else ROOT/item['path'],item)
assert binding(SOURCE/'production.js')['sha256'] == result['productionBundleSha256']
assert binding(SOURCE/'mutation.js')['sha256'] == result['mutationBundleSha256']
assert (SOURCE/'executed-script.mts').read_bytes() == (ROOT/result['script']['path']).read_bytes()
for name in ['sky-artwork-level-composition.ts','sky-gpu-renderer.ts','sky-gpu-textures.ts']:
    assert (SOURCE/'source-snapshots'/name).read_bytes() == (ROOT/'apps/wechat-miniapp/src/features/sky'/name).read_bytes()

readbacks = {}
decoded_rows = []
for row in result['rows']:
    name = row['name']
    encoded = admit(SOURCE/(name+'.png'))
    raw = admit(SOURCE/(name+'.rgba'))
    assert binding(encoded)['sha256'] == row['pngSha256']
    assert binding(raw)['sha256'] == row['rgbaSha256']
    pixels = np.frombuffer(raw.read_bytes(),dtype=np.uint8).reshape(844,390,4)[::-1]
    with Image.open(encoded)as image:
        image.load()
        assert image.size == (390,844)
        png = np.array(image.convert('RGBA'))
    assert np.array_equal(png,pixels)
    readbacks[name] = pixels
    assert row['glError'] == 0 and row['drawError'] is None
    assert row['releasedTextures'] == row['releasedLogicalBytes'] == 0
    assert row['sceneSourceCredit'] is None
    assert row['groupPasses'] == (0 if 'baseline' in name else 1)
    decoded_rows.append({'name':name,'actualPngRgbaExact':True,'actualPixels':844*390,
        'sceneSourceCredit':None,'groupPasses':row['groupPasses'],'logicalTexturePeak':row['peakLogicalBytes']})
assert len(readbacks) == 14
for a,b in [('night-real-pair','night-low-budget-pair'),('night-real-pair','night-recovered-fresh-image'),
            ('night-coarse-only','night-fine-upload-failure'),('night-coarse-only','night-invalid-fine-registration'),
            ('night-partial','night-missing'),('night-coarse-only','night-black-availability-mutation')]:
    assert np.array_equal(readbacks[a],readbacks[b])
cold = np.frombuffer(admit(SOURCE/'night-real-pair-cold.rgba').read_bytes(),dtype=np.uint8).reshape(844,390,4)[::-1]
assert np.array_equal(cold,readbacks['night-real-pair'])
pair = next(row for row in result['rows'] if row['name']=='night-real-pair')
assert pair['warmChangedPixels'] == 0 and len(pair['uploads']) == 3
assert [x['id']for x in pair['uploads']] == ['OVERVIEW','gpu-window-copy','MEDIUM']
shared = next(row for row in result['rows']if row['name']=='night-shared-bitmap')
assert [x['id']for x in shared['uploads']] == ['OVERVIEW']

report = load_json(ROOT/result['inputs'][0]['path'])['data']
deep = report['skyScene']['deepSky']
index = next(i for i,e in enumerate(deep['catalog']['entries'])if e['objectRef']=='M:51')
candidate = load_json(ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json')
images = {}
for level in ['OVERVIEW','MEDIUM']:
    asset = candidate['harnessInput']['levels'][level]
    with Image.open(admit(ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'/asset['file'],asset))as image:
        image.load();images[level] = np.array(image.convert('RGBA'))
        assert image.size == (512,512)and np.all(images[level][...,3] == 255)

def horizontal(az,alt):
    az,alt = np.deg2rad([az,alt])
    return np.array([np.sin(az)*np.cos(alt),np.cos(az)*np.cos(alt),np.sin(alt)])

# Direct tangent coordinate formula from the actual observed center and north
# sample. This avoids registerSkySurvey/registerSkyArtwork and inverse rows.
def coordinates(row,level):
    frame = next(f for f in deep['frames']if f['at']==row['at'])
    point = next(p for p in frame['points']if p[0]==index)
    center = horizontal(point[1],point[2])
    north = horizontal(point[3],point[4])
    north = north - np.dot(north,center)*center
    north /= np.linalg.norm(north)
    east = np.cross(north,center)
    basis = row['basis']
    assert np.max(np.abs(np.array(basis['forward'])-center)) < 1e-12
    yy,xx = np.mgrid[0:844,0:390]
    scale = 844/(2*np.tan(np.deg2rad(row['fov'])/4))
    u = (xx+.5-195)/scale
    v = (422-yy-.5)/scale
    square = u*u+v*v
    ray = (2*u[...,None]*np.array(basis['right'])+2*v[...,None]*np.array(basis['up'])+
           (1-square)[...,None]*np.array(basis['forward']))/(1+square)[...,None]
    denominator = np.einsum('ijk,k->ij',ray,center)
    half = np.tan(np.deg2rad(candidate['harnessInput']['levels'][level]['fieldDegrees'])/2)
    uv = np.stack([.5-np.einsum('ijk,k->ij',ray,east)/(2*half*denominator),
                   .5-np.einsum('ijk,k->ij',ray,north)/(2*half*denominator)],axis=-1)
    return uv,denominator > 0

def sample(image,uv,front):
    x,y = uv[...,0]*512-.5,uv[...,1]*512-.5
    left,top = np.floor(x).astype(int),np.floor(y).astype(int)
    dx,dy = x-left,y-top
    q = np.array([image[np.clip(top,0,511),np.clip(left,0,511)],
        image[np.clip(top,0,511),np.clip(left+1,0,511)],
        image[np.clip(top+1,0,511),np.clip(left,0,511)],
        image[np.clip(top+1,0,511),np.clip(left+1,0,511)]],dtype=np.float64)
    eligible = front & np.all((uv>=0)&(uv<=1),axis=-1)&np.all(q[...,3]==255,axis=0)
    rgba = (q[0]*(1-dx)[...,None]*(1-dy)[...,None]+q[1]*dx[...,None]*(1-dy)[...,None]+
            q[2]*(1-dx)[...,None]*dy[...,None]+q[3]*dx[...,None]*dy[...,None])
    return rgba[...,:3],eligible

cpu_rows = []
selections = {}
yy,xx = np.mgrid[0:844,0:390]
# Actual later M51 disc: radius3.2/stroke1, point-fragment radius +1 logical
# pixel. Its complete raster bounding disc is independently identified from
# source order, the exact centered M51 ray and the point-size owner (8.4px).
foreground = (xx+.5-195)**2 + (yy+.5-422)**2 <= (3.2+1)**2
assert int(foreground.sum()) == 52
foreground_records = []
for row in result['rows']:
    name = row['name']
    if 'baseline' in name: continue
    coarse_uv,coarse_front = coordinates(row,'OVERVIEW')
    fine_uv,fine_front = coordinates(row,'MEDIUM')
    coarse_rgb,coarse_available = sample(images['OVERVIEW'],coarse_uv,coarse_front)
    fine_image = images['OVERVIEW']if row['condition'].get('sameImage')else images['MEDIUM'].copy()
    kind = row['condition']['kind']
    if kind == 'valid-black': fine_image[...,:3] = 0
    if kind in ('partial','missing'):fine_image[224:288,224:288,3] = 128 if kind=='partial'else 0
    fine_rgb,fine_available = sample(fine_image,fine_uv,fine_front)
    if kind=='coarse-only' or row['condition'].get('fail')or row['condition'].get('invalidFine'):
        fine_available[:] = False
    if row['condition'].get('mutated'):fine_available &= np.max(fine_rgb,axis=-1)>0
    selected = np.where(fine_available[...,None],fine_rgb,coarse_rgb)
    available = fine_available | coarse_available
    background = readbacks['day-baseline'if row['condition']['period']==1 else 'night-baseline'][...,:3].astype(float)
    contribution = np.max(selected,axis=-1)/255
    expected = np.where(available[...,None],selected+background*(1-contribution)[...,None],background)
    actual = readbacks[name][...,:3].astype(float)
    differences = np.abs(expected-actual)
    residual = np.any(differences>4,axis=-1)
    # The post-image auxiliary ring is not part of the pre-image background:
    # the baseline has already composited that ring. Never call its 52px a
    # pure-background reference. All other pixels remain in the CPU audit.
    assert not np.any(residual & ~foreground)
    if np.any(residual):
        coordinates_xy = np.stack([xx[residual],yy[residual]],axis=-1).tolist()
        assert len(coordinates_xy) == 32
        foreground_records.append({'name':name,'residualPixelsOver4':32,
            'allInsideIndependentlyOwnedLaterDisc':True,'coordinatesXY':coordinates_xy,
            'baselineRgba':readbacks['day-baseline'if row['condition']['period']==1 else 'night-baseline'][residual].tolist(),
            'actualRgba':readbacks[name][residual].tolist()})
    cpu_rows.append({'name':name,'fineSelectedPixels':int(fine_available.sum()),
        'coarseSelectedPixels':int((~fine_available & coarse_available).sum()),
        'neitherSourcePixels':int((~available).sum()),'maxFloatChannelDifference':float(differences.max()),
        'pixelsDifferenceOver1':int(np.any(differences>1,axis=-1).sum()),
        'pixelsDifferenceOver2':int(np.any(differences>2,axis=-1).sum()),
        'pixelsDifferenceOver4':int(np.any(differences>4,axis=-1).sum()),
        'foregroundExcludedPixels':52,'auditedOutsideForegroundPixels':int((~foreground).sum()),
        'maximumFloatChannelDifferenceOutsideForeground':float(differences[~foreground].max()),
        'noDifferenceOver4OutsideForeground':True})
    selections[name] = (fine_uv,fine_available)

# Pixel-exact semantic checks use independently computed regions well away
# from finite precision interpolation/patch boundaries.
uv = selections['night-real-pair'][0]
interior = np.all((uv>.2)&(uv<.8),axis=-1)
patch = np.all((uv>.46)&(uv<.54),axis=-1)
outside = np.any((uv<-.01)|(uv>1.01),axis=-1)
boundary_checks = []
for name,reference,mask in [('night-valid-black','night-baseline',interior),
    ('night-partial','night-coarse-only',patch),('night-missing','night-coarse-only',patch),
    ('night-valid-black','night-coarse-only',outside)]:
    assert np.array_equal(readbacks[name][mask],readbacks[reference][mask])
    boundary_checks.append({'name':name,'reference':reference,'checkedPixels':int(mask.sum()),'changedPixels':0})
mutated_changed = np.any(readbacks['night-black-availability-mutation']!=readbacks['night-baseline'],axis=-1)&interior
assert int(mutated_changed.sum()) == int(interior.sum()) == 188962
admit(Path(__file__).resolve())
preserved = load_json(ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json')
assert all(binding(ROOT/item['path'])['sha256']==item['sha256']for item in preserved)
assert all(binding(ROOT/item['path'])==item for item in inputs)
review = {'inputs':inputs,'sourceBindingsCurrentMatchFrozen':True,'readbackRows':decoded_rows,
    'cpuSamplingOracle':cpu_rows,'boundaryChecks':boundary_checks,'brightnessMutationChangedInteriorPixels':int(mutated_changed.sum()),
    'directOracle':'Independent float64 stereographic rays and observed center/north TAN tangents; clamped four neighbors, exact source-alpha eligibility, fine priority including valid black, single encoded-display source-over. No shader/registration/source-process helper invoked.',
    'laterForeground':{'owner':'sky-scene-render.ts optical insertion before deep-sky auxiliary disc; adapter returns false/source credit null, so imagePainted=false.',
        'centerLogicalXY':[195,422],'discRadius':3.2,'strokeWidth':1,'pointSize':8.4,'color':'#A9BDD6','opacity':.9,
        'independentCompletePointRasterBoundaryPixels':52,'coordinateResidualRecords':foreground_records,
        'limitation':'52 later-foreground pixels are actual saved full-scene pixels but are not treated as a pure-photo CPU background oracle. Finite-precision interpolation/color outside this boundary is numerically audited, not bit-exact shader or quality certification.'},
    'preservedSixUnchanged':True,
    'scope':'Cached actual software-GPU readbacks and independent CPU semantics only. No native, driver memory, source credit/migration, precise astrometry, PSF, natural color or final quality certification.'}
(OUTPUT/'review.json').write_text(json.dumps(review,indent=2)+'\n',encoding='utf8')
print(json.dumps({'binding':binding(OUTPUT/'review.json'),'cpuRows':cpu_rows,'boundaryChecks':boundary_checks}))
