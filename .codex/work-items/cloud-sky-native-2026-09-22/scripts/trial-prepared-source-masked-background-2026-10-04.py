"""One M82 display-background trial using an already saved encoded-RGB master.

This is a display estimate, not calibrated sky/flux or a new Prepared v1 source.
The original source/master/geometry/alpha/publication stay immutable. A mature
Photutils estimator is exercised once, with source-estimation masks separate
from geometry. No feather, replacement celestial detail or source mixing.
"""
from pathlib import Path
import hashlib
import inspect
import json
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
TOOLS = ROOT / 'output/sdss-psf-tools-1003-r1/python-deps'
PIPE = ROOT / 'data-pipelines/deep-sky'
NATIVE = ROOT / 'output/prepared-native-extent-1004-r1'
CURRENT = ROOT / 'output/noirlab-prepared-wide-quality-1004-r1/noao-m81m82'
HUBBLE = ROOT / 'output/hubble-m82-prepared-coverage-1004-r1'
OUT = ROOT / 'output/prepared-source-masked-background-1004-r1'
sys.path[:0] = [str(TOOLS), str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'), str(PIPE)]
import numpy as np
import astropy
import photutils
from astropy.stats import SigmaClip
from photutils.background import Background2D, MedianBackground
from photutils.segmentation import detect_threshold, detect_sources
from photutils.utils import circular_footprint
from PIL import Image, ImageDraw
from sdss_gri_tan import premultiplied_rgba_box


def bind(p):
    raw = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}


def save(name, value):
    with (OUT / name).open('x', encoding='utf-8') as f:
        f.write(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False)+'\n')


def linear(encoded):
    value = np.asarray(encoded, dtype=np.float64) / 255
    return np.where(value <= .04045, value/12.92, ((value+.055)/1.055)**2.4)


def encoded(value):
    value = np.maximum(value, 0)
    return np.where(value <= .0031308, value*12.92, 1.055*value**(1/2.4)-.055)*255


def plane_holdout(row):
    windows = row['edgeNativeWindows']
    design = np.asarray([[1., (w['targetPixelTopFirst'][0]-1023.5)/1024,
                          (w['targetPixelTopFirst'][1]-1023.5)/1024] for w in windows])
    values = np.asarray([w['encodedRgbMedian'] for w in windows])
    folds = []
    for side in ('north', 'east', 'south', 'west'):
        test = np.asarray([w['side'] == side for w in windows])
        train = ~test
        coefficient, _, rank, _ = np.linalg.lstsq(design[train], values[train], rcond=None)
        assert rank == 3 and int(test.sum()) == 3 and int(train.sum()) == 9
        plane = np.sqrt(np.mean((design[test]@coefficient-values[test])**2, axis=0))
        constant = np.sqrt(np.mean((np.median(values[train], axis=0)-values[test])**2, axis=0))
        folds.append({'heldoutSide': side, 'trainingWindows': 9, 'heldoutWindows': 3,
                      'planeRmseEncodedRgbBytes': plane.tolist(), 'constantRmseEncodedRgbBytes': constant.tolist(),
                      'planeWorseThanConstant': (plane > constant).tolist(),
                      'coefficientOffsetXNormalizedYNormalized': coefficient.tolist()})
    return {'meaning': 'Descriptive encoded window medians; not source-free sky, noise probability or a correction.',
            'folds': folds, 'planeWorseCases': sum(sum(f['planeWorseThanConstant']) for f in folds),
            'adopted': False}


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    files = [Path(__file__), NATIVE/'result.json', CURRENT/'master-rgba.npy', CURRENT/'master.json',
             HUBBLE/'master-rgba.npy', HUBBLE/'master.json',
             ROOT/'output/prepared-wide-display-inputs-1004-r1/result.json',
             ROOT/'output/noirlab-prepared-wide-source-1004-r1/noao-m81m82.jpg',
             ROOT/'output/noirlab-prepared-wide-source-1004-r1/noao-m81m82-embedded-xmp.xml',
             PIPE/'sdss_gri_tan.py', Path(inspect.getfile(Background2D)), Path(inspect.getfile(MedianBackground)),
             Path(inspect.getfile(detect_threshold)), Path(inspect.getfile(detect_sources)),
             TOOLS/'photutils-3.0.0.dist-info/METADATA', TOOLS/'photutils-3.0.0.dist-info/licenses/LICENSE.rst']
    files += [CURRENT/(level+'.png') for level in ('overview', 'medium', 'detail')]
    protected = json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    files += [ROOT/row['path'] for row in protected]
    before = [bind(p) for p in files]
    save('inputs-before.json', before)
    started, cpu = time.perf_counter(), time.process_time()
    master = np.load(CURRENT/'master-rgba.npy', allow_pickle=False)
    meta = json.loads((CURRENT/'master.json').read_bytes())
    assert master.shape == (2048, 2048, 4) and master.dtype == np.uint8 and (master[:, :, 3] == 255).all()
    assert hashlib.sha256(master.tobytes()).hexdigest() == meta['rgba']['sha256']
    hubble = np.load(HUBBLE/'master-rgba.npy', allow_pickle=False)
    hubble_meta = json.loads((HUBBLE/'master.json').read_bytes())
    assert hubble.shape == master.shape and hubble.dtype == master.dtype
    assert hubble_meta['center'] == meta['center'] and hubble_meta['fieldDegrees'] == meta['fieldDegrees']
    # This is an intentionally conservative estimation guard for the known
    # Hubble image footprint. Its geometry is not a complete faint-source mask.
    guard = hubble[:, :, 3] > 0
    del hubble
    clip = SigmaClip(sigma=3., maxiters=10)
    intensity = np.max(master[:, :, :3], axis=2).astype(np.float64)
    threshold = detect_threshold(intensity, n_sigma=2., mask=guard, sigma_clip=clip)
    segment = detect_sources(intensity, threshold, n_pixels=10, mask=guard)
    assert segment is not None
    # 10 target pixels = about 4.5 current native-photo pixels, larger than
    # visually compact stars in the native windows. No alpha or source erasure.
    detected_mask = segment.make_source_mask(footprint=circular_footprint(radius=10))
    estimate_mask = guard | detected_mask
    assert (~estimate_mask).any()
    np.save(OUT/'background-estimation-mask.npy', estimate_mask, allow_pickle=False)
    mask_rgb = np.zeros((2048, 2048, 3), dtype=np.uint8)
    mask_rgb[guard] = (220, 60, 120)
    mask_rgb[detected_mask & ~guard] = (40, 180, 240)
    Image.fromarray(mask_rgb).resize((512, 512), Image.Resampling.NEAREST).save(OUT/'mask-role-diagnostic.png')
    del mask_rgb, intensity, threshold, segment
    background = np.empty((2048, 2048, 3), dtype=np.float64)
    meshes = []
    for channel in range(3):
        # A 256-target-pixel mesh spans about 116 native-photo pixels, close
        # to the new 129-pixel neighborhoods. One mesh choice, no parameter scan.
        model = Background2D(master[:, :, channel].astype(np.float64), (256, 256),
                             filter_size=(3, 3), mask=estimate_mask,
                             sigma_clip=clip, bkg_estimator=MedianBackground())
        background[:, :, channel] = model.background
        meshes.append({'channel': 'RGB'[channel], 'backgroundMesh': model.background_mesh.tolist(),
                       'backgroundMedianEncodedBytes': float(model.background_median),
                       'remainingMeshPixelCounts': model.npixels_mesh.tolist(),
                       'fullEncodedBackgroundMinMax': [float(model.background.min()), float(model.background.max())]})
        del model
    assert np.isfinite(background).all() and (background >= 0).all() and (background < 255).all()
    np.save(OUT/'encoded-display-background.npy', background, allow_pickle=False)
    # sRGB is known for this original photo. This operation removes a *display*
    # floor; the encoded source is not calibrated astronomical flux.
    signed = linear(master[:, :, :3]) - linear(background)
    rgb = np.rint(np.clip(encoded(signed), 0, 255)).astype(np.uint8)
    display = np.concatenate((rgb, master[:, :, 3:4]), axis=2)
    assert np.array_equal(display[:, :, 3], master[:, :, 3])
    np.save(OUT/'prototype-display-master.npy', display, allow_pickle=False)
    clipped_counts = (signed < 0).sum(axis=(0, 1)).tolist()
    del signed
    native = json.loads((NATIVE/'result.json').read_bytes())['rows'][0]
    assert native['objectRef'] == 'M:82'
    plane = plane_holdout(native)
    tiers = [('OVERVIEW', (0, 0, 2048, 2048), 4),
             ('MEDIUM', (512, 512, 1536, 1536), 2),
             ('DETAIL', (768, 768, 1280, 1280), 1)]
    products = []
    for level, bounds, factor in tiers:
        x0, y0, x1, y1 = bounds
        original = premultiplied_rgba_box(master[y0:y1, x0:x1], factor)
        changed = premultiplied_rgba_box(display[y0:y1, x0:x1], factor)
        original_path = CURRENT/(level.lower()+'.png')
        with Image.open(original_path) as image:
            assert np.array_equal(np.array(image.convert('RGBA')), original)
        assert np.array_equal(original[:, :, 3], changed[:, :, 3])
        p = OUT/(level.lower()+'-display-prototype.png')
        Image.fromarray(changed).save(p)
        contact = Image.new('RGB', (1040, 562), (18, 18, 18))
        draw = ImageDraw.Draw(contact)
        draw.text((8, 5), 'M82 '+level+' ORIGINAL ENCODED SOURCE', fill='white')
        draw.text((528, 5), 'ONE SOURCE-MASKED DISPLAY ESTIMATE', fill='white')
        contact.paste(Image.fromarray(original[:, :, :3]), (8, 26))
        contact.paste(Image.fromarray(changed[:, :, :3]), (528, 26))
        draw.text((8, 542), 'Geometry alpha unchanged. No science/photometry/weak-structure acceptance; not Prepared v1 or published.', fill='white')
        pair = OUT/(level.lower()+'-original-vs-display-estimate.png')
        contact.save(pair)
        edges = {'north': (slice(0, 4), slice(None)), 'south': (slice(-4, None), slice(None)),
                 'west': (slice(None), slice(0, 4)), 'east': (slice(None), slice(-4, None))}
        products.append({'level': level, 'boundsXYExclusive': list(bounds), 'boxFactor': factor,
                         'png': bind(p), 'contact': bind(pair),
                         'originalPngExact': True, 'geometricAlphaExact': True,
                         'allBlackOriginal': int((original[:, :, :3] == 0).all(axis=2).sum()),
                         'allBlackPrototype': int((changed[:, :, :3] == 0).all(axis=2).sum()),
                         'changedRgbPixels': int((original[:, :, :3] != changed[:, :, :3]).any(axis=2).sum()),
                         'encodedEdgeMediansOriginalPrototype': {side: [np.median(original[index][:, :, :3], axis=(0, 1)).tolist(),
                                                                      np.median(changed[index][:, :, :3], axis=(0, 1)).tolist()]
                                                                      for side, index in edges.items()}})
    facts = json.loads((ROOT/'output/prepared-wide-display-inputs-1004-r1/result.json').read_bytes())
    anchors = next(r for r in facts['rows'] if r['id'] == 'm82-noirlab')['unchangedEncodedPatternAnchors']
    overview = premultiplied_rgba_box(display, 4)
    original_overview = premultiplied_rgba_box(master, 4)
    pattern_records = []
    for anchor in anchors:
        x0, y0, x1, y1 = anchor['overviewBoundsXYExclusive']
        old, new = original_overview[y0:y1, x0:x1], overview[y0:y1, x0:x1]
        with Image.open(ROOT/anchor['png']['path']) as im:
            assert np.array_equal(np.array(im), old)
        h, w = old.shape[:2]
        contact = Image.new('RGB', (2*w+24, 2*h+74), (18, 18, 18))
        draw = ImageDraw.Draw(contact)
        draw.text((6, 4), 'ORIGINAL | DISPLAY ESTIMATE', fill='white')
        for col, array in enumerate((old, new)):
            contact.paste(Image.fromarray(array[:, :, :3]), (6+col*(w+12), 24))
            gain = np.minimum(array[:, :, :3].astype(np.uint16)*8, 255).astype(np.uint8)
            contact.paste(Image.fromarray(gain), (6+col*(w+12), h+54))
        draw.text((6, h+35), 'DIAGNOSTIC 8x ENCODED - NOT SOURCE', fill='white')
        p = OUT/(anchor['label']+'-original-vs-display-estimate.png')
        contact.save(p)
        pattern_records.append({'label': anchor['label'], 'bounds': [x0, y0, x1, y1], 'contact': bind(p),
                                'originalNonblackPixels': int((old[:, :, :3] != 0).any(axis=2).sum()),
                                'prototypeNonblackPixels': int((new[:, :, :3] != 0).any(axis=2).sum()),
                                'meaning': 'Actual visible-pattern comparison, not a complete faint-structure or science mask.'})
    after = [bind(p) for p in files]
    assert before == after and all(bind(ROOT/p['path'])['sha256'] == p['sha256'] for p in protected)
    save('inputs-after.json', after)
    result = {'status': 'SINGLE_SOURCE_DISPLAY_BACKGROUND_PROTOTYPE_NOT_ADOPTED',
              'objectRef': 'M:82', 'originalRgbMaster': bind(CURRENT/'master-rgba.npy'),
              'prototypeDisplayMaster': bind(OUT/'prototype-display-master.npy'),
              'displayBackground': bind(OUT/'encoded-display-background.npy'),
              'estimationMask': bind(OUT/'background-estimation-mask.npy'), 'maskPixels': int(estimate_mask.sum()),
              'hubbleFootprintGuardPixels': int(guard.sum()), 'detectedSourceOnlyMaskPixels': int((detected_mask & ~guard).sum()),
              'planeNativeHoldouts': plane, 'meshes': meshes,
              'method': {'library': 'Photutils Background2D/MedianBackground', 'boxSize': [256, 256],
                         'meshFilterSize': [3, 3], 'sigmaClip': [3, 10], 'detectNSigma': 2, 'detectNPixels': 10,
                         'dilateRadiusTargetPixels': 10, 'noParameterScan': True,
                         'display': 'encoded sRGB -> linear; subtract linearized encoded display-background estimate; clamp negative only for display; sRGB encode; round; shared 3 tiers',
                         'rights': 'Cached Photutils 3.0.0 BSD-3-Clause package, source image CC BY 4.0; no borrowed Stellarium code/assets'},
              'clippedNegativeLinearChannels': clipped_counts, 'products': products, 'patternAnchors': pattern_records,
              'sourceRequests': 0, 'originalJpegDecodes': 0, 'rgbReprojections': 0, 'publicationWrites': 0,
              'wallSeconds': time.perf_counter()-started, 'cpuSeconds': time.process_time()-cpu,
              'versions': {'numpy': np.__version__, 'astropy': astropy.__version__, 'photutils': photutils.__version__},
              'limits': ['Estimation guard/source detection is not complete faint-structure, bad-pixel, exposure or science validity.',
                         'A photo display estimate is not calibrated detector/sky background or flux; original scientific UNKNOWN stays UNKNOWN.',
                         'Possible faint-content removal must be judged on actual outputs before any use; blackening/alpha success alone is not quality.',
                         'No mesh choice scan, no general feather, no source mixing, no original/ordinary registry or Prepared v1 identity changes.',
                         'No Scene/page, WEAPP, independent review, full publication, physical endpoint resource/cost or final quality claim.']}
    save('result.json', result)
    print(json.dumps({k: result[k] for k in ('status', 'maskPixels', 'hubbleFootprintGuardPixels',
                     'detectedSourceOnlyMaskPixels', 'clippedNegativeLinearChannels', 'wallSeconds', 'cpuSeconds')}))


if __name__ == '__main__':
    main()
