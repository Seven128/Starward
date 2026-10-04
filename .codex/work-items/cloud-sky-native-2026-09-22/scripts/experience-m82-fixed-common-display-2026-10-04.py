"""One source-declared fixed-range trial over three saved scientific levels."""
from pathlib import Path
import hashlib
import inspect
import io
import json
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
sys.path[:0] = [str(ROOT / 'data-pipelines/deep-sky'), str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
import astropy
from astropy.visualization import AsinhStretch, ManualInterval
from PIL import Image
from image_quality import inspect_image

OUT = ROOT / 'output/allwise-w3-m82-fixed-common-display-1004-r1'
BASE = ROOT / 'output/allwise-w3-m82-source-0930'
NEW = ROOT / 'output/allwise-w3-m82-overview-medium-science-1004-r1'
DETAIL = ROOT / 'output/allwise-w3-m82-fresh-science-1002-r2'
OLD_DISPLAY = ROOT / 'output/allwise-w3-m82-overview-medium-display-1004-r1'
OLD_DETAIL = ROOT / 'output/allwise-w3-m82-detail-display-1002-r1'
CHECKPOINT = TASK / 'evidence/current-execution-state-2026-10-04-r71.json'


def bind(path):
    path = path.resolve()
    h = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1048576):
            h.update(chunk)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': h.hexdigest()}


def verify(records):
    assert [bind(ROOT / record['path']) for record in records] == records


def save(name, data):
    (OUT / name).write_text(json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + '\n', encoding='utf-8')


def main():
    started = time.perf_counter()
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    checkpoint = json.loads(CHECKPOINT.read_bytes())
    existing = checkpoint['currentSources'] + checkpoint['protected'] + checkpoint['evidence']
    verify(existing)
    properties_path = BASE / 'properties'
    properties = properties_path.read_bytes()
    descriptor = {key.strip(): value.strip() for line in properties.decode('utf-8').splitlines()
                  if '=' in line and not line.lstrip().startswith('#') for key, value in [line.split('=', 1)]}
    cuts = [float(value) for value in descriptor['hips_pixel_cut'].split()]
    assert cuts == [260.0, 1000.0] and descriptor['hips_hierarchy'] == 'mean'
    levels = [json.loads((NEW / f'{level.lower()}-metadata.json').read_bytes()) for level in ('OVERVIEW', 'MEDIUM')]
    levels.append(json.loads((DETAIL / 'detail-metadata.json').read_bytes()))
    prior = json.loads((OLD_DISPLAY / 'result.json').read_bytes())['levels']
    old_detail = json.loads((OLD_DETAIL / 'result.json').read_bytes())
    old_pngs = {item['level']: item['png'] for item in prior}
    old_pngs['DETAIL'] = old_detail['png']
    diagnostics_path = OLD_DETAIL / 'core-pixel-diagnostics.json'
    core = json.loads(diagnostics_path.read_bytes())['pixels']
    libraries = [Path(inspect.getfile(cls)) for cls in (ManualInterval, AsinhStretch)]
    inputs = [bind(path) for path in [Path(__file__), CHECKPOINT, properties_path, diagnostics_path,
        ROOT / 'data-pipelines/deep-sky/allwise_finite_tan.py', ROOT / 'data-pipelines/deep-sky/image_quality.py',
        ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json', *libraries,
        *[ROOT / item[key]['path'] for item in levels for key in ('science', 'availability')],
        *[ROOT / item['path'] for item in old_pngs.values()]]]
    recipe = {'kind': 'UNADOPTED_SOURCE_FIXED_RANGE_ASINH_GRAYSCALE_TRIAL_V1',
        'sourceProperties': bind(properties_path), 'sourceDescriptorKey': 'hips_pixel_cut',
        'fixedLimits': cuts, 'fixedAsinhScale': .1, 'asinhScaleBasis': 'Existing W3 finite display scale .1, unchanged',
        'method': 'Astropy ManualInterval then AsinhStretch; round clipped unit interval to uint8',
        'alpha': '255 iff saved actual source scalar is finite, otherwise zero',
        'intensityUnit': 'UNKNOWN_NO_BUNIT; source display cuts are not physical calibration',
        'perFieldFitting': False, 'scientificResampling': False, 'adopted': False,
        'astropyVersion': astropy.__version__, 'librarySources': [bind(path) for path in libraries]}
    save('recipe.json', recipe)
    recipe_binding = bind(OUT / 'recipe.json')
    manifest = json.loads((ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json').read_bytes())
    entry = next(item for item in manifest['entries'] if item['objectRef'] == 'M:82')
    observations = []
    for metadata in levels:
        level = metadata['level']
        assert metadata['source']['propertiesSha256'] == bind(properties_path)['sha256']
        science = np.load(ROOT / metadata['science']['path'], allow_pickle=False)
        available = np.load(ROOT / metadata['availability']['path'], allow_pickle=False)
        assert np.array_equal(available, np.isfinite(science))
        # Work on a private finite-only array; no guess or replacement for NaN.
        gray = np.zeros(science.shape, dtype=np.uint8)
        unit = ManualInterval(*cuts)(science[available], clip=True)
        mapped = AsinhStretch(a=.1)(unit, clip=True)
        gray[available] = np.rint(mapped * 255).astype(np.uint8)
        rgba = np.repeat(gray[..., None], 4, axis=-1)
        rgba[:, :, 3] = available.astype(np.uint8) * 255
        stream = io.BytesIO()
        Image.fromarray(rgba).save(stream, format='PNG')
        payload = stream.getvalue()
        name = f'M-82-{level.lower()}-source-fixed-range.diagnostic.png'
        (OUT / name).write_bytes(payload)
        with Image.open(OUT / name) as image:
            image.verify()
        with Image.open(OUT / name) as image:
            image.load()
            decoded = np.array(image.convert('RGBA'))
        assert np.array_equal(decoded, rgba)
        assert np.array_equal(decoded[:, :, 3] > 0, available)
        with Image.open(ROOT / old_pngs[level]['path']) as image:
            old = np.array(image.convert('RGBA'))
        assert np.array_equal(old[:, :, 3], decoded[:, :, 3])
        asset = {'file': name, 'imageFormat': 'png', 'pixels': metadata['pixels'],
            'fieldDegrees': metadata['fieldDegrees'], 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest(),
            'source': metadata['source'], 'wcsHeader': metadata['wcsHeader'],
            'validFraction': None, 'coverageState': 'NOT_MEASURED', 'stretch': recipe,
            'sourceFiniteMask': {'kind': 'NONFINITE_HIPS_SAMPLES', 'finitePixels': int(available.sum()),
                                'missingPixels': int((~available).sum())}}
        qc = inspect_image(payload, entry, level, asset, source=metadata['source'],
            processing={'recipe': recipe_binding, 'sampling': metadata['source']['sampling']}, expected_finite=available)
        save(f'{level.lower()}-metadata.json', asset)
        save(f'{level.lower()}-quality.json', qc)
        core_readback = []
        if level == 'DETAIL':
            assert len(core) == 17
            for pixel in core:
                x, y = pixel['jpegXY']
                assert available[y, x] and float(science[y, x]) == pixel['source']['intensityUnknownUnit']
                core_readback.append({'xy': [x, y], 'actualSourceScalar': float(science[y, x]),
                                      'rgba': decoded[y, x].tolist(), 'finiteOpaque': True})
        observations.append({'level': level, 'science': metadata['science'], 'availability': metadata['availability'],
            'png': bind(OUT / name), 'oldDiagnostic': old_pngs[level], 'sharedRecipe': recipe_binding,
            'finitePixels': int(available.sum()), 'nonfiniteTransparentPixels': int((~available).sum()),
            'finiteOpaqueBlackPixels': int((available & (gray == 0)).sum()),
            'finiteWhitePixels': int((available & (gray == 255)).sum()),
            'changedRGBPixelsAgainstOldIndependentCuts': int(np.any(old[:, :, :3] != decoded[:, :, :3], axis=-1).sum()),
            'finiteDisplayGrayPercentiles': np.percentile(gray[available], [0, 1, 50, 99, 100]).tolist(),
            'alphaUnchanged': True, 'decodedRGBABytesSha256': hashlib.sha256(decoded.tobytes()).hexdigest(),
            'prior17FiniteCore': core_readback})
    verify(inputs)
    verify(existing)
    save('result.json', {'scope': 'One fixed source-declared display comparison across three unchanged scientific grids; not publication/adoption or quality acceptance',
        'recipe': recipe_binding, 'levels': observations, 'inputsBefore': inputs, 'inputsAfter': inputs,
        'checkpointBindingsBefore': existing, 'checkpointBindingsAfter': existing,
        'elapsedSeconds': time.perf_counter() - started, 'productionChanges': [],
        'independentReview': 'MISSING', 'DETAILScienceNotResampled': True,
        'limits': ['Source hierarchy mean is not a photometric calibration or proof of absolute registration/PSF/artifact validity.',
                   'No sky subtraction, brightness alpha, inpainting, parameter sweep or source acquisition.',
                   'Actual visual/scene quality remains to inspect; finite black is not absence.']})
    save('binding.json', {'inputs': inputs, 'outputs': [bind(path) for path in sorted(OUT.rglob('*')) if path.is_file()]})
    print(json.dumps({'levels': [{key: item[key] for key in ('level', 'png', 'finiteOpaqueBlackPixels',
        'finiteWhitePixels', 'changedRGBPixelsAgainstOldIndependentCuts', 'finiteDisplayGrayPercentiles')} for item in observations],
        'oldInputsExact': True, 'elapsedSeconds': time.perf_counter() - started}))


if __name__ == '__main__':
    main()
