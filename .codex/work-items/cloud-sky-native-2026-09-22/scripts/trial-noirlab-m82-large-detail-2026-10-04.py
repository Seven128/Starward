"""One newly required larger-source projection and the existing display recipe.

Reuse source admission, TAN/tiers and the previous task's sRGB functions.
No old RGB reprojection, parameter scan, deconvolution or ordinary publication.
"""
from pathlib import Path
from dataclasses import asdict
import hashlib
import importlib.util
import inspect
import json
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
PIPE = ROOT / 'data-pipelines/deep-sky'
SRC = ROOT / 'output/noirlab-m82-large-source-1004-r1'
OLD = ROOT / 'output/noirlab-prepared-wide-quality-1004-r1/noao-m81m82'
OLD_DISPLAY = ROOT / 'output/prepared-source-masked-background-1004-r1'
HUBBLE = ROOT / 'output/hubble-m82-prepared-coverage-1004-r1'
OUT = ROOT / 'output/noirlab-m82-large-detail-1004-r1'
sys.path[:0] = [str(PIPE), str(ROOT / 'output/sdss-psf-tools-1003-r1/python-deps'),
               str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'),
               str(ROOT / 'output/pyavm-metadata-trial-1002-r1/lib')]
import numpy as np
from astropy.stats import SigmaClip
from photutils.background import Background2D, MedianBackground
from photutils.segmentation import detect_threshold, detect_sources
from photutils.utils import circular_footprint
from PIL import Image, ImageDraw
from prepared_rgb_observation import ByteIdentity, PreparedRgbSource, load_prepared_rgb_observation
from prepared_rgb_tan import build_prepared_rgb_tan_master, prepared_rgb_tan_products
from sdss_gri_tan import premultiplied_rgba_box

spec = importlib.util.spec_from_file_location('existing_display_recipe', TASK / 'scripts/trial-prepared-source-masked-background-2026-10-04.py')
recipe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recipe)


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def save(name, value):
    with (OUT / name).open('x', encoding='utf-8') as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def png(path, rgba):
    Image.fromarray(rgba).save(path)
    with Image.open(path) as image:
        assert np.array_equal(np.array(image.convert('RGBA')), rgba)
    return bind(path)


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    protected = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    files = [Path(__file__), Path(recipe.__file__), SRC / 'result.json', SRC / 'noao-m81m82-large.jpg',
             SRC / 'embedded-xmp.xml', SRC / 'icc-profile.icc', OLD / 'master-rgba.npy', OLD / 'master.json',
             OLD_DISPLAY / 'result.json', OLD_DISPLAY / 'prototype-display-master.npy',
             HUBBLE / 'master-rgba.npy', HUBBLE / 'master.json']
    files += [PIPE / name for name in ['prepared_rgb_observation.py', 'prepared_rgb_tan.py', 'sdss_gri_tan.py', 'sdss_source_stencil.py']]
    files += [Path(inspect.getfile(unit)) for unit in [Background2D, MedianBackground, detect_threshold, detect_sources]]
    files += [ROOT / row['path'] for row in protected]
    files += [OLD_DISPLAY / (level + '-display-prototype.png') for level in ['overview', 'medium', 'detail']]
    before = [bind(p) for p in files]
    save('inputs-before.json', before)
    acquired = json.loads((SRC / 'result.json').read_bytes())
    assert acquired['dimensions'] == [8315, 4642] and acquired['xmpExactOld4k']
    assert acquired['icc']['sha256'] == '2b3aa1645779a9e634744faf9b01e9102b0c9b88fd6deced7934df86b949af7e'
    old_meta = json.loads((OLD / 'master.json').read_bytes())
    source_data = dict(old_meta['source'])
    source_data['jpeg'] = ByteIdentity(acquired['image']['bytes'], acquired['image']['sha256'])
    source_data['xmp'] = ByteIdentity(acquired['embeddedXmp']['bytes'], acquired['embeddedXmp']['sha256'])
    source_data['source_url'] = acquired['sourceUrl']
    source = PreparedRgbSource(**source_data)
    start, cpu = time.perf_counter(), time.process_time()
    obs = load_prepared_rgb_observation(SRC / 'noao-m81m82-large.jpg', SRC / 'embedded-xmp.xml', source,
                                       max_encoded_bytes=16 * 1024 * 1024, max_decoded_pixels=40 * 1024 * 1024)
    source_rgb_bytes = len(obs.rgb_bytes)
    save('source-admission.json', {'status': 'PASSED_CURRENT_BOUND_OBSERVATION_OWNER', 'source': asdict(source),
                                  'geometry': asdict(obs.geometry), 'sourceRgbBytes': source_rgb_bytes,
                                  'sourceRgbSha256': hashlib.sha256(obs.rgb_bytes).hexdigest(),
                                  'removedEmptySpectralNotes': obs.removed_empty_spectral_notes,
                                  'removedEmptySpatialNotes': obs.removed_empty_spatial_notes,
                                  'scientificAvailability': 'UNKNOWN', 'fullRgbDecodes': 1})
    master = build_prepared_rgb_tan_master(obs, object_ref='M:82', center=old_meta['center'], pixels=2048,
                                         field_degrees=old_meta['fieldDegrees'], chunk_rows=64)
    del obs
    raw_master = master.rgba_top_first
    assert raw_master.shape == (2048, 2048, 4) and (raw_master[:, :, 3] == 255).all()
    np.save(OUT / 'master-rgba.npy', raw_master, allow_pickle=False)
    save('master.json', master.metadata())
    projection_wall, projection_cpu = time.perf_counter() - start, time.process_time() - cpu
    products = prepared_rgb_tan_products(master)
    # Retain the same real sky/guard and chosen angular recipe. Only source
    # pixels have changed; do not copy a classification from the small JPEG.
    hubble = np.load(HUBBLE / 'master-rgba.npy', allow_pickle=False)
    hubble_meta = json.loads((HUBBLE / 'master.json').read_bytes())
    assert hubble_meta['center'] == old_meta['center'] and hubble_meta['fieldDegrees'] == old_meta['fieldDegrees']
    guard = hubble[:, :, 3] > 0
    del hubble
    clip = SigmaClip(sigma=3., maxiters=10)
    intensity = np.max(raw_master[:, :, :3], axis=2).astype(np.float64)
    threshold = detect_threshold(intensity, n_sigma=2., mask=guard, sigma_clip=clip)
    segment = detect_sources(intensity, threshold, n_pixels=10, mask=guard)
    assert segment is not None
    detected_mask = segment.make_source_mask(footprint=circular_footprint(radius=10))
    estimate_mask = guard | detected_mask
    assert (~estimate_mask).any()
    np.save(OUT / 'background-estimation-mask.npy', estimate_mask, allow_pickle=False)
    del intensity, threshold, segment
    background = np.empty((2048, 2048, 3), dtype=np.float64)
    meshes = []
    for channel in range(3):
        model = Background2D(raw_master[:, :, channel].astype(np.float64), (256, 256), filter_size=(3, 3),
                             mask=estimate_mask, sigma_clip=clip, bkg_estimator=MedianBackground())
        background[:, :, channel] = model.background
        meshes.append({'channel': 'RGB'[channel], 'backgroundMesh': model.background_mesh.tolist(),
                       'backgroundMedianEncodedBytes': float(model.background_median),
                       'remainingMeshPixelCounts': model.n_pixels_mesh.tolist(),
                       'fullEncodedBackgroundMinMax': [float(model.background.min()), float(model.background.max())]})
        del model
    assert np.isfinite(background).all() and (background >= 0).all() and (background < 255).all()
    # Lossless compression reduces retained offline diagnostics; it does not
    # reduce the live float64 model or claim an endpoint-memory improvement.
    np.savez_compressed(OUT / 'encoded-display-background.npz', background=background)
    signed = recipe.linear(raw_master[:, :, :3]) - recipe.linear(background)
    rgb = np.rint(np.clip(recipe.encoded(signed), 0, 255)).astype(np.uint8)
    clipped = (signed < 0).sum(axis=(0, 1)).tolist()
    del signed, background
    display = np.concatenate((rgb, raw_master[:, :, 3:4]), axis=2)
    assert np.array_equal(display[:, :, 3], raw_master[:, :, 3])
    np.save(OUT / 'prototype-display-master.npy', display, allow_pickle=False)
    rows = []
    for product in products:
        level = product.level.lower()
        original = product.rgba_top_first
        x0, y0, x1, y1 = product.bounds_xy_exclusive
        changed = premultiplied_rgba_box(display[y0:y1, x0:x1], product.box_factor)
        assert np.array_equal(original[:, :, 3], changed[:, :, 3])
        raw_info = png(OUT / (level + '-large-raw.png'), original)
        changed_info = png(OUT / (level + '-display-prototype.png'), changed)
        with Image.open(OLD_DISPLAY / (level + '-display-prototype.png')) as image:
            old = np.array(image.convert('RGBA'))
        assert old.shape == original.shape and np.array_equal(old[:, :, 3], original[:, :, 3])
        contact = Image.new('RGB', (1560, 564), (18, 18, 18))
        draw = ImageDraw.Draw(contact)
        for col, (label, array) in enumerate([('4K DISPLAY ESTIMATE', old), ('8315 RAW PHOTO SAMPLE', original), ('8315 SAME DISPLAY RECIPE', changed)]):
            draw.text((8 + col * 520, 6), 'M82 ' + product.level + ' ' + label, fill='white')
            contact.paste(Image.fromarray(array[:, :, :3]), (8 + col * 520, 27))
        draw.text((8, 545), 'Same nominal sky/crop/alpha; no sharpening, generated detail, colour fit or quality/source adoption.', fill='white')
        path = OUT / (level + '-matched-4k-large-raw-large-display.png')
        contact.save(path)
        rows.append({'level': product.level, 'fieldDegrees': product.field_degrees,
                     'approximateNativePixelsAcrossField': product.field_degrees / abs(master.source_geometry.cdelt[0]),
                     'geometrySupportFraction': product.geometric_source_master_support_pixels / product.total_source_master_crop_pixels,
                     'rawPng': raw_info, 'prototypePng': changed_info, 'contact': bind(path),
                     'originalProductMetadata': product.metadata(), 'geometricAlphaEqualOldAndNew': True,
                     'changedFrom4kDisplayPixels': int((changed[:, :, :3] != old[:, :, :3]).any(axis=2).sum()),
                     'samplingMeaning': 'Native sampling density, not telescope PSF, absolute astrometry or complete detail acceptance'})
    after = [bind(p) for p in files]
    assert before == after and all(bind(ROOT / row['path'])['sha256'] == row['sha256'] for row in protected)
    save('inputs-after.json', after)
    result = {'status': 'NEW_LARGER_SOURCE_AND_SHARED_DISPLAY_RECIPE_NOT_ADOPTED', 'objectRef': 'M:82',
              'sourceAdmission': bind(OUT / 'source-admission.json'), 'originalRgbMaster': bind(OUT / 'master-rgba.npy'),
              'prototypeDisplayMaster': bind(OUT / 'prototype-display-master.npy'),
              'displayBackground': bind(OUT / 'encoded-display-background.npz'),
              'estimationMask': bind(OUT / 'background-estimation-mask.npy'), 'maskPixels': int(estimate_mask.sum()),
              'hubbleFootprintGuardPixels': int(guard.sum()), 'detectedSourceOnlyMaskPixels': int((detected_mask & ~guard).sum()),
              'meshes': meshes, 'clippedNegativeLinearChannels': clipped, 'products': rows,
              'originalSourceRgbLogicalBytes': source_rgb_bytes, 'sourceRequestsInThisScript': 0,
              'fullRgbDecodes': 1, 'newSourceRgbReprojections': 1, 'oldSourceRgbReprojections': 0,
              'publicationWrites': 0, 'projectionWallSeconds': projection_wall, 'projectionCpuSeconds': projection_cpu,
              'wallSeconds': time.perf_counter() - start, 'cpuSeconds': time.process_time() - cpu,
              'method': {'recipe': bind(Path(recipe.__file__)), 'boxSize': [256, 256], 'meshFilterSize': [3, 3],
                         'sigmaClip': [3, 10], 'detectNSigma': 2, 'detectNPixels': 10, 'dilateRadiusTargetPixels': 10,
                         'backgroundEstimateCount': 1, 'parameterScans': 0,
                         'meaning': 'Single-source display floor estimate; original encoded/master and geometry retained, science UNKNOWN'},
              'limits': 'New real input resolves a sampling shortage only. No old JPEG decode/RGB reprojection, cross-source fit, generated detail, deconvolution, source-erasing alpha or ordinary Prepared v1 publication. Complete weak structure/background seams/absolute registration, full Scene/page/SourceBack/publication version, independent review, native/phones, memory/cost/capacity remain unverified.'}
    save('result.json', result)
    print(json.dumps({'status': result['status'], 'nativeDetailSpan': rows[-1]['approximateNativePixelsAcrossField'],
                      'rawPngBytes': sum(row['rawPng']['bytes'] for row in rows),
                      'prototypePngBytes': sum(row['prototypePng']['bytes'] for row in rows),
                      'backgroundStoredBytes': result['displayBackground']['bytes'], 'wallSeconds': result['wallSeconds']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
