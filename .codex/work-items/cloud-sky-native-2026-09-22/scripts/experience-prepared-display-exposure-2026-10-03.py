"""Bound cached sRGB display-exposure candidate; no source/master processing."""
from pathlib import Path
import hashlib
import io
import json
import math
import sys
import numpy as np
from PIL import Image, ImageCms, ImageDraw

ROOT = Path(__file__).resolve().parents[4]
OUT = (ROOT / sys.argv[1]).resolve()
assert OUT.parent == ROOT / 'output' and OUT.name.startswith('prepared-display-exposure-')
OUT.mkdir()
PUB = ROOT / 'output/prepared-optical-publication-1003-r4/publication'
JPEG = ROOT / 'output/hubble-m51-source-quality-trial-1002-r1/heic0506a.jpg'
NOMINAL = ROOT / 'output/prepared-footprint-display-1003-r1/result.json'
PRIOR_TONE = ROOT / 'output/prepared-tone-comparison-1003-r1/result.json'
PROTECTION = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'

def bind(p):
    raw = p.read_bytes()
    return {'path': str(p), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

assert bind(PUB / 'manifest.json')['sha256'] == '23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1'
assert bind(NOMINAL)['sha256'] == '95f72b83ace5de05346f09a7e0414b3e8157f55f5593653d859f6468c6d77d83'
assert bind(PRIOR_TONE)['sha256'] == '8446ee5996d8bf2dd8b03d2d14baad51b9ee460251631fab55c48d1219756300'
assert bind(JPEG)['sha256'] == '7b13a932bcf54653c591d369e8d1c4cbdbeb693ecc468242facb239fde52e4c2'
publication = json.loads((PUB / 'manifest.json').read_bytes())
nominal = json.loads(NOMINAL.read_bytes())
prior = json.loads(PRIOR_TONE.read_bytes())
protected = json.loads(PROTECTION.read_bytes())
paths = [Path(__file__), PUB / 'manifest.json', JPEG, NOMINAL, PRIOR_TONE, PROTECTION,
         Path(sys.executable), Path(np.__file__), Path(Image.__file__), Path(ImageCms.__file__)]
paths += [PUB / asset['file'] for asset in publication['levels'].values()]
paths += [ROOT / row['path'] for row in protected]
before = [bind(p) for p in paths]
for row in protected: assert bind(ROOT / row['path'])['sha256'] == row['sha256']
(OUT / 'inputs-before.json').write_text(json.dumps(before, indent=2) + '\n')
(OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
with Image.open(JPEG) as source:
    # Header/ICC only. Never source.load(), source.tobytes() or reproject here.
    assert source.format == 'JPEG' and source.mode == 'RGB' and source.size == (4000, 2776)
    profile = source.info['icc_profile']
    assert hashlib.sha256(profile).hexdigest() == '2b3aa1645779a9e634744faf9b01e9102b0c9b88fd6deced7934df86b949af7e'
    profile_name = ImageCms.getProfileName(ImageCms.ImageCmsProfile(io.BytesIO(profile))).strip()
    assert profile_name == 'IEC 61966-2.1 Default RGB colour space - sRGB'

# In-gamut sRGB transfer, matching the reference equations already used by the
# atmosphere owner. This is display exposure, not calibrated astronomical flux.
def linear(rgb):
    return np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)

def encoded(rgb):
    return np.where(rgb <= .0031308, rgb * 12.92, 1.055 * np.maximum(rgb, 0) ** (1 / 2.4) - .055)

assert np.max(np.abs(encoded(linear(np.arange(256) / 255)) - np.arange(256) / 255)) < 3e-16
assert np.all(encoded(linear(np.zeros(3)) * .0625) == 0)
assert np.all(encoded(linear(np.ones(3) / 255) * .0625) > 0)
ra, dec = np.radians([publication['center']['raDeg'], publication['center']['decDeg']])
center = np.array([math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec)])
east = np.array([-math.sin(ra), math.cos(ra), 0])
north = np.array([-math.sin(dec) * math.cos(ra), -math.sin(dec) * math.sin(ra), math.cos(dec)])
yy, xx = np.mgrid[:512, :512]

def smooth(value):
    value = np.clip(value, 0, 1)
    return value * value * (3 - 2 * value)

def feather(rows, rays):
    hom = rays @ np.asarray(rows).T
    uv = hom[..., :2] / hom[..., 2:]
    return np.prod(smooth(np.minimum(uv, 1 - uv) / .08), axis=-1)

names = ['Original', 'Common edges only', 'Existing W3 gain', 'sRGB exposure -2 stops', 'sRGB exposure -4 stops']
backgrounds = [(3, 7, 16), (32, 40, 56)]
sheets = {bg: Image.new('RGB', (512 * len(names), 548 * 3), bg) for bg in backgrounds}
statistics = []
for row, (level, asset) in enumerate(publication['levels'].items()):
    raw = (PUB / asset['file']).read_bytes()
    assert len(raw) == asset['bytes'] and hashlib.sha256(raw).hexdigest() == asset['sha256']
    with Image.open(io.BytesIO(raw)) as image:
        assert image.mode == 'RGBA' and image.size == (512, 512)
        rgba = np.asarray(image)
    rgb = rgba[..., :3].astype(np.float64) / 255
    support = rgba[..., 3] == 255
    diameter = 2 * math.tan(math.radians(asset['fieldDegrees']) / 2)
    rays = center - diameter * (((xx + .5) / 512 - .5)[..., None] * east + ((yy + .5) / 512 - .5)[..., None] * north)
    edge = feather(nominal['nominalSourceRows'], rays) * feather(nominal['masterRows'], rays)
    luma = rgb @ np.array([.2126, .7152, .0722])
    weak = support & (luma > 0) & (luma <= prior['sharedPerimeterScaleCandidate'])
    interior = support & (edge == 1)
    source_linear = linear(rgb)
    candidates = [(rgb, np.ones_like(edge)), (rgb, edge), (rgb, edge * smooth(luma)),
                  (encoded(source_linear * .25), edge), (encoded(source_linear * .0625), edge)]
    for column, (display_rgb, weight) in enumerate(candidates):
        opacity = weight * rgba[..., 3] / 255
        contribution = display_rgb.max(axis=-1) * opacity
        # Same corrected straight-RGB denominator and encoded framebuffer
        # blend as the existing renderer, not a linear-light whole-scene claim.
        for bg in backgrounds:
            background = np.asarray(bg) / 255
            composite = display_rgb * opacity[..., None] + background * (1 - contribution)[..., None]
            pixels = np.rint(np.clip(composite, 0, 1) * 255).astype(np.uint8)
            sheet = sheets[bg]
            sheet.paste(Image.fromarray(pixels), (512 * column, 548 * row + 30))
            ImageDraw.Draw(sheet).text((512 * column + 6, 548 * row + 6), level + ': ' + names[column], fill=(240, 240, 240))
            relative = np.max(np.abs(pixels.astype(int) - np.asarray(bg)), axis=-1)
            statistics.append({'level': level, 'candidate': names[column], 'background': bg,
                'opaqueWeakEncodedPixels': int(weak.sum()), 'weakPixelsWithNonzeroQuantizedBackgroundDelta': int((weak & (relative > 0)).sum()),
                'weakQuantizedDeltaPercentiles': np.percentile(relative[weak], [0, 25, 50, 75, 95, 100]).tolist() if weak.any() else None,
                'sourceInteriorPixels': int(interior.sum()),
                'darkPositiveChannelsMadeZeroBeforeFramebuffer': int(((rgb > 0) & (display_rgb == 0)).sum())})
        if column >= 3:
            expected = source_linear * (.25 if column == 3 else .0625)
            assert np.max(np.abs(linear(display_rgb) - expected)) < 3e-16
    if level == 'OVERVIEW':
        for column, (display_rgb, weight) in enumerate(candidates):
            bg = np.array(backgrounds[0]) / 255
            contribution = display_rgb.max(axis=-1) * weight * rgba[..., 3] / 255
            composite = display_rgb * (weight * rgba[..., 3] / 255)[..., None] + bg * (1 - contribution)[..., None]
            Image.fromarray(np.rint(np.clip(composite, 0, 1) * 255).astype(np.uint8)).save(OUT / ('overview-' + str(column) + '.png'))
comparisons = []
for bg, sheet in sheets.items():
    p = OUT / ('comparison-' + '-'.join(map(str, bg)) + '.png')
    sheet.save(p); comparisons.append(bind(p))
after = [bind(p) for p in paths]
assert before == after
(OUT / 'inputs-after.json').write_text(json.dumps(after, indent=2) + '\n')
result = {'status': 'SRGB_DISPLAY_EXPOSURE_CANDIDATES_MEASURED_NOT_ADOPTED', 'inputsBeforeAfterExact': True,
          'sourceProfile': {'name': profile_name, 'bytes': len(profile), 'sha256': hashlib.sha256(profile).hexdigest(), 'sourceHeaderOnly': True},
          'transferReference': 'https://www.w3.org/TR/2026/CRD-css-color-4-20260930/#color-conversion-code',
          'commonEdgeWidth': .08, 'exposureTrials': [1, .25, .0625], 'statistics': statistics, 'comparisons': comparisons,
          'meaning': 'Cached PNG display comparison on declared flat backgrounds only. Exact original sRGB ICC checked from header; no original JPEG/master pixel decode or source/LOD rewrite. Display exposure preserves positive linear RGB/chromaticity before framebuffer quantization; it is not flux, a background estimate or science/coverage proof. Existing shared 8% edge and all exposure values remain unadopted. Current production RGB, alpha, shader, publication and default registry unchanged. CPU only, not native/full-scene/quality/registration/capacity or independent acceptance.'}
(OUT / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'output': str(OUT), 'result': bind(OUT / 'result.json'), 'profile': result['sourceProfile']}))
