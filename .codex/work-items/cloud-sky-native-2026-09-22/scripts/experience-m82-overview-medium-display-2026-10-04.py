"""Existing finite-display diagnostics for the two newly available levels only."""
from pathlib import Path
import hashlib
import io
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / 'data-pipelines/deep-sky'), str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image
from allwise_finite_tan import finite_rgba
from image_quality import inspect_image

TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
SCIENCE = ROOT / 'output/allwise-w3-m82-overview-medium-science-1004-r1'
OUT = ROOT / 'output/allwise-w3-m82-overview-medium-display-1004-r1'


def bind(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': digest.hexdigest()}


def save(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    report = json.loads((SCIENCE / 'result.json').read_bytes())
    sources = report['checkpointBindingsAfter']
    assert [bind(ROOT / item['path']) for item in sources] == sources
    inputs = [bind(path) for path in [Path(__file__), SCIENCE / 'result.json',
        ROOT / 'data-pipelines/deep-sky/allwise_finite_tan.py', ROOT / 'data-pipelines/deep-sky/image_quality.py',
        ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json',
        ROOT / 'output/allwise-w3-m82-detail-display-1002-r1/M-82-detail-source-finite.diagnostic.png',
        ROOT / 'output/allwise-w3-m82-detail-display-1002-r1/result.json',
        *[ROOT / level[key]['path'] for level in report['levels'] for key in ('science', 'availability')]]]
    manifest = json.loads((ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json').read_bytes())
    entry = next(item for item in manifest['entries'] if item['objectRef'] == 'M:82')
    outputs = []
    for level in report['levels']:
        science = np.load(ROOT / level['science']['path'], allow_pickle=False)
        available = np.load(ROOT / level['availability']['path'], allow_pickle=False)
        assert np.array_equal(available, np.isfinite(science))
        rgba, transfer = finite_rgba(science)
        assert np.array_equal(rgba[:, :, 3], available.astype(np.uint8) * 255)
        stream = io.BytesIO()
        Image.fromarray(rgba).save(stream, format='PNG')
        raw = stream.getvalue()
        name = f"M-82-{level['level'].lower()}-source-finite.diagnostic.png"
        (OUT / name).write_bytes(raw)
        with Image.open(OUT / name) as image:
            image.verify()
        with Image.open(OUT / name) as image:
            image.load()
            decoded = np.asarray(image.convert('RGBA'))
        assert np.array_equal(decoded, rgba)
        metadata = {'file': name, 'imageFormat': 'png', 'fieldDegrees': level['fieldDegrees'],
            'pixels': level['pixels'], 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw),
            'validFraction': None, 'coverageState': 'NOT_MEASURED',
            'sourceFiniteMask': {'kind': 'NONFINITE_HIPS_SAMPLES', 'missingPixels': level['nonfinitePixels'],
                                'finitePixels': level['finitePixels']},
            'wcsHeader': level['wcsHeader'], 'source': level['source'], 'stretch': transfer}
        qc = inspect_image(raw, entry, level['level'], metadata, source=metadata['source'],
            processing={'stretch': transfer, 'sampling': level['source']['sampling']}, expected_finite=available)
        save(f"{level['level'].lower()}-metadata.json", metadata)
        save(f"{level['level'].lower()}-quality.json", qc)
        outputs.append({'level': level['level'], 'png': bind(OUT / name), 'transfer': transfer,
            'transferIntensityUnit': 'UNKNOWN_NO_BUNIT; existing finiteCutsDN key does not establish physical units',
            'opaqueFiniteRgbZeroPixels': int((available & np.all(decoded[:, :, :3] == 0, axis=-1)).sum()),
            'nonfiniteTransparentPixels': int((decoded[:, :, 3] == 0).sum()),
            'decodedRGBABytesSha256': hashlib.sha256(decoded.tobytes()).hexdigest(),
            'allSavedRGBAEqualsSharedTransfer': True, 'allAlphaEqualsScientificAvailability': True})
    assert [bind(ROOT / item['path']) for item in inputs] == inputs
    assert [bind(ROOT / item['path']) for item in sources] == sources
    save('result.json', {'scope': 'Two new complete-field diagnostic PNGs only. Existing DETAIL PNG reused for viewing, never regenerated.',
        'inputsBefore': inputs, 'inputsAfter': inputs, 'levels': outputs,
        'displayRule': 'Existing whole-level finite 1/99.7-percentile asinh grayscale, once per newly available field. These separate cuts are not an adopted common three-level recipe.',
        'scienceAndAvailabilityUnchanged': True, 'historicalCheckpointUnchanged': True,
        'limits': ['No optical colour, new resolution, PSF, artifact repair, absolute registration or quality certification.',
                   'No brightness alpha, guessed sky subtraction, inpainting, parameter sweep or publication/adoption.',
                   'Missing science and finite display black remain separate.'], 'independentReview': 'MISSING'})
    save('binding.json', {'inputs': inputs, 'outputs': [bind(path) for path in sorted(OUT.rglob('*')) if path.is_file()]})
    print(json.dumps({'levels': outputs, 'existingBytesUnchanged': True}))


if __name__ == '__main__':
    main()
