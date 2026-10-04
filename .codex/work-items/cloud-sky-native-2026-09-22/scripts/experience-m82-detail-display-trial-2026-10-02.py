"""One shared-transfer diagnostic PNG from independently reviewed cached science.

No source resampling, historical expected PNG, asset/publication change or repair.
"""
from pathlib import Path
import hashlib
import io
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / 'data-pipelines/deep-sky'), str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
import PIL
from PIL import Image
import allwise_finite_tan as owner
from image_quality import inspect_image

OUT = ROOT / 'output/allwise-w3-m82-detail-display-1002-r1'
FRESH = ROOT / 'output/allwise-w3-m82-fresh-science-1002-r2'
REVIEW = ROOT / 'output/allwise-w3-m82-fresh-sampler-independent-1002-r1'
inputs = {}


def binding(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}


def admit(path, expected=None):
    actual = binding(path)
    if expected is not None:
        assert actual == expected
    inputs[actual['path']] = actual
    return path


def load(path):
    return json.loads(admit(path).read_text(encoding='utf8'))


def write(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=2, allow_nan=False) + '\n', encoding='utf8')


def main():
    assert not OUT.exists()
    source = admit(ROOT / 'data-pipelines/deep-sky/allwise_finite_tan.py')
    assert binding(source)['sha256'] == 'd917e04227ce6b0faefdf7780bb144f040c3049eaae8f4cb629603411c5b25c4'
    admit(ROOT / 'data-pipelines/deep-sky/image_quality.py')
    source_binding = load(FRESH / 'binding.json')
    review_binding = load(REVIEW / 'binding.json')
    for record in source_binding['inputs'] + source_binding['outputs'] + review_binding['inputs'] + review_binding['outputs']:
        admit(ROOT / record['path'], record)
    report = load(REVIEW / 'review.json')
    assert binding(REVIEW / 'review.json')['sha256'] == '6cc6e278cf94274d4734493f75e1b797c8b46fd566059b8ce6e5779ea2acd99d'
    meta = load(FRESH / 'detail-metadata.json')
    science = np.load(admit(FRESH / 'detail-science.npy', meta['science']), allow_pickle=False)
    available = np.load(admit(FRESH / 'detail-availability.npy', meta['availability']), allow_pickle=False)
    assert science.tobytes() == np.load(REVIEW / 'independent-detail-science.npy', allow_pickle=False).tobytes()
    assert available.tobytes() == np.load(REVIEW / 'independent-detail-availability.npy', allow_pickle=False).tobytes()
    assert available.dtype == np.bool_ and np.array_equal(available, np.isfinite(science))
    science_before, availability_before = science.tobytes(), available.tobytes()
    rgba, transfer = owner.finite_rgba(science)
    assert science.tobytes() == science_before and available.tobytes() == availability_before
    assert np.array_equal(rgba[:, :, 3], available.astype(np.uint8) * 255)
    assert int((rgba[:, :, 3] == 0).sum()) == 19
    assert int((rgba[:, :, 3] == 255).sum()) == 262125
    # This is one whole-image shared transfer, not an object/region-specific fix.
    encoded = io.BytesIO()
    Image.fromarray(rgba).save(encoded, format='PNG')
    payload = encoded.getvalue()
    with Image.open(io.BytesIO(payload)) as image:
        image.verify()
    with Image.open(io.BytesIO(payload)) as image:
        image.load()
        assert image.format == 'PNG' and image.size == (512, 512)
        decoded = np.array(image.convert('RGBA'))
    assert decoded.tobytes() == rgba.tobytes()
    assert np.array_equal(decoded[:, :, 3] > 0, available)
    finite_black = available & np.all(decoded[:, :, :3] == 0, axis=-1)
    assert finite_black.any() and np.all(decoded[:, :, 3][finite_black] == 255)
    manifest = load(ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json')
    entry = next(x for x in manifest['entries'] if x['objectRef'] == 'M:82')
    diagnostics = load(REVIEW / 'dark-region-diagnostics.json')
    old_jpeg = admit(ROOT / diagnostics['jpeg']['path'], diagnostics['jpeg'])
    with Image.open(old_jpeg) as image:
        old_rgb = np.array(image.convert('RGB'))
    y, x = np.mgrid[0:512, 0:512]
    old_luma = old_rgb.astype(np.float64) @ np.array([.2126, .7152, .0722])
    peripheral = ((x-255.5)**2 + (y-255.5)**2 >= 80**2) & (old_luma <= 8)
    assert int(peripheral.sum()) == report['peripheralNearBlack']['pixels'] == 216359
    core_pixels = []
    for sample in diagnostics['coreNearBlackLuminanceAtMost8']['pixelsXYSource']:
        xx, yy = sample['jpegXY']
        assert available[yy, xx] and float(science[yy, xx]) == sample['source']['intensityUnknownUnit']
        core_pixels.append({**sample, 'diagnosticPngRGBA': decoded[yy, xx].tolist(),
                            'scienceStillFiniteAndOpaque': bool(available[yy, xx] and decoded[yy, xx, 3] == 255)})
    assert len(core_pixels) == 17
    png_name = 'M-82-detail-source-finite.diagnostic.png'
    metadata = {'file': png_name, 'imageFormat': 'png', 'fieldDegrees': .25, 'pixels': 512,
                'sha256': hashlib.sha256(payload).hexdigest(), 'bytes': len(payload),
                'validFraction': None, 'coverageState': 'NOT_MEASURED',
                'sourceFiniteMask': {'kind': 'NONFINITE_HIPS_SAMPLES', 'missingPixels': 19, 'finitePixels': 262125},
                'wcsHeader': meta['wcsHeader'], 'source': meta['source'], 'stretch': transfer}
    qc = inspect_image(payload, entry, 'DETAIL', metadata, source=metadata['source'],
                       processing={'stretch': transfer, 'sampling': meta['source']['sampling']}, expected_finite=available)
    admit(Path(__file__).resolve())
    assert all(binding(ROOT / key) == value for key, value in inputs.items())
    OUT.mkdir()
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    (OUT / png_name).write_bytes(payload)
    write('metadata.json', metadata)
    write('quality.json', qc)
    write('core-pixel-diagnostics.json', {'pixels': core_pixels,
        'note': 'Coordinates only locate the prior actual JPEG near-black pixels. No JPEG-derived alpha or science mask.'})
    gray = decoded[:, :, 0]
    output = {'scope': 'One actual diagnostic M82 DETAIL PNG via existing shared finite_rgba; not adopted/published or a historical expected PNG.',
              'owner': binding(source), 'review': binding(REVIEW / 'review.json'), 'science': meta['science'], 'availability': meta['availability'],
              'png': binding(OUT / png_name), 'decodedRGBABytesSha256': hashlib.sha256(decoded.tobytes()).hexdigest(),
              'libraryVersions': {'numpy': np.__version__, 'Pillow': PIL.__version__},
              'transfer': transfer, 'transferScope': 'One 1/99.7 percentile calculation over all actual finite DETAIL intensity values, shared asinh scale .1 grayscale; no region fit or source/science change.',
              'transferIntensityUnit': 'UNKNOWN_NO_BUNIT; finiteCutsDN is the existing recipe key, not a newly verified DN unit.',
              'wcsHeader': meta['wcsHeader'], 'sourceWorldSha256': meta['worldSha256'], 'sourceLookupSha256': meta['lookupSha256'],
              'finitePixels': 262125, 'nonfiniteTransparentPixels': 19, 'allDecodedAlphaExactlyEqualsAvailability': True,
              'allActualDecodedRGBAExactlyEqualsSharedTransferOutput': True, 'scienceAndAvailabilityBytesUnchanged': True,
              'finiteOpaqueRgbZeroPixels': int(finite_black.sum()),
              'prior17CoreNearBlack': {'allFiniteOpaque': all(p['scienceStillFiniteAndOpaque'] for p in core_pixels),
                  'newRgbZeroPixels': sum(p['diagnosticPngRGBA'][:3] == [0, 0, 0] for p in core_pixels),
                  'newGrayValues': [p['diagnosticPngRGBA'][0] for p in core_pixels]},
              'peripheral216359PriorNearBlack': {'allFiniteOpaque': bool(np.all(decoded[:, :, 3][peripheral] == 255)),
                  'newRgbZeroPixels': int((peripheral & finite_black).sum()),
                  'newGrayPercentiles0_1_50_99_100': np.percentile(gray[peripheral], [0, 1, 50, 99, 100]).tolist()},
              'inputsUnchanged': True, 'retained201AssetsAndSixPreservedBound': True,
              'limits': ['Actual rendering still requires visual review; pixel facts do not certify appearance.',
                  'Core finite low values are retained; unmasked source saturation/artifacts are possible causes, not diagnosed here.',
                  'No old JPEG missing-data mask, interpolation equivalence, absolute WCS, source PSF/quality or natural optical-color certification.',
                  'Nine unacquired OVERVIEW/MEDIUM inputs remain unverified; no native/runtime/server/performance/publication scope.']}
    write('result.json', output)
    assert all(binding(ROOT / key) == value for key, value in inputs.items())
    write('binding.json', {'inputs': list(inputs.values()),
                           'outputs': [binding(p) for p in sorted(OUT.rglob('*')) if p.is_file()]})
    print(json.dumps({'result': binding(OUT / 'result.json'), 'binding': binding(OUT / 'binding.json'),
                      'png': output['png'], 'transfer': transfer, 'core': output['prior17CoreNearBlack'],
                      'peripheral': output['peripheral216359PriorNearBlack'], 'finiteOpaqueBlack': int(finite_black.sum())}))


if __name__ == '__main__':
    main()
