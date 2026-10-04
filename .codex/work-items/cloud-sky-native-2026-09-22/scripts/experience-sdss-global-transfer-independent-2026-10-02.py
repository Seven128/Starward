"""Independent cached-output checks of the bounded three-transfer trial."""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image
from astropy.visualization import ZScaleInterval

TRIAL = ROOT / 'output/sdss-m51-global-transfer-1002'
SOURCE = ROOT / 'output/sdss-m51-gri-mosaic-candidate-1002-r2'

def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

def verify(item):
    actual = bind(ROOT / item['path'])
    assert actual == {name: item[name] for name in ('path', 'bytes', 'sha256')}, item['path']
    return actual

def manual_lupton(science, stretch, q, start, end):
    # Independent NumPy expression of the documented shared-intensity mapping.
    # Match the actual declared float32 display inputs and truncating uint8
    # conversion, without calling the owner's RGB, pyramid or make_lupton_rgb.
    channels = np.stack([science[band][start:end] for band in ('i', 'r', 'g')]).copy()
    intensity = (channels[0] + channels[1] + channels[2]) / 3.0
    transformed = intensity.copy()
    np.multiply(transformed, q / float(stretch), out=transformed)
    np.arcsinh(transformed, out=transformed)
    np.multiply(transformed, 0.1 / np.arcsinh(0.1 * q), out=transformed)
    scale = np.zeros_like(intensity)
    np.divide(transformed, intensity, out=scale, where=intensity > 0)
    np.multiply(channels, scale, out=channels)
    channels = np.maximum(channels, 0)
    maximum = channels.max(axis=0)
    norm = np.maximum(maximum, 1)
    channels /= norm
    channels *= 255.0
    return np.moveaxis(channels.astype(np.uint8), 0, 2)

def independent_box(rgb, joint, bounds, factor):
    x0, y0, x1, y1 = bounds
    crop = rgb[y0:y1, x0:x1]
    available = joint[y0:y1, x0:x1]
    out = (x1 - x0) // factor
    # Scientific sample qualification, not darkness-derived support.
    count = available.reshape(out, factor, out, factor).sum((1, 3), dtype=np.uint64)
    sums = (crop.astype(np.uint32) * available[..., None]).reshape(out, factor, out, factor, 3).sum((1, 3), dtype=np.uint64)
    color = np.zeros((out, out, 3), dtype=np.float64)
    np.divide(sums, count[..., None], out=color, where=count[..., None] > 0)
    return np.dstack([np.rint(color).astype(np.uint8), np.rint(count * 255.0 / factor ** 2).astype(np.uint8)])

def main():
    output = ROOT / 'output/sdss-m51-global-transfer-independent-1002-r1'
    output.mkdir(exist_ok=False)
    report = json.loads((TRIAL / 'result.json').read_bytes())
    binding = json.loads((TRIAL / 'binding.json').read_bytes())
    candidate = json.loads((SOURCE / 'candidate.json').read_bytes())
    checked = {}
    for item in [binding['script'], *binding['inputs'], *binding['ownerBefore'], *binding['outputs'], *report['sourceBefore']]:
        if item['path'] not in checked:
            checked[item['path']] = verify(item)
    assert report['sourceBefore'] == report['sourceAfter']
    assert report['ownerBefore'] == report['ownerAfter'] == binding['ownerBefore'] == binding['ownerAfter']
    science = {band: np.load(SOURCE / f'{band}-science.npy', mmap_mode='r', allow_pickle=False) for band in 'gri'}
    joint = np.load(SOURCE / 'joint-availability.npy', mmap_mode='r', allow_pickle=False)
    assert joint.dtype == np.bool_ and joint.shape == (2048, 2048) and joint.all()
    actual_counts = {}
    for band, data in science.items():
        assert data.dtype == np.float32 and np.isfinite(data).all()
        expected = report['actualScientificCounts'][band]
        counts = {'totalSamples': int(data.size), 'finiteSamples': int(np.isfinite(data).sum()),
                  'negativeSamples': int((data < 0).sum()), 'zeroSamples': int((data == 0).sum()),
                  'min': float(data.min()), 'max': float(data.max())}
        assert all(expected[key] == value for key, value in counts.items())
        actual_counts[band] = counts
    # LuptonAsinhZscaleStretch intentionally converts the scientific stack to
    # float64 before computing a naive shared intensity. Display inputs below
    # remain float32. Do not substitute three per-band fits or crop statistics.
    mean64 = (science['i'].astype(np.float64) + science['r'].astype(np.float64) + science['g'].astype(np.float64)) / 3.0
    stride = int(max(1, mean64.size / 1000))
    indices = np.arange(0, mean64.size, stride, dtype=np.int64)[:1000]
    samples = mean64.ravel()[indices]
    statistics = report['variants']['global-zscale-q8']['selection']['statistics']
    actual_indices = np.load(ROOT / statistics['sampleRasterIndices']['path'], allow_pickle=False)
    actual_samples = np.load(ROOT / statistics['sampleIntensityValues']['path'], allow_pickle=False)
    assert report['globalZscaleDeterminationCalls'] == 1
    assert stride == statistics['deterministicRasterStride'] == 4194
    assert samples.size == statistics['actualStatisticalSamples'] == statistics['nSamples'] == 1000
    assert mean64.size == statistics['finiteIntensitySamples'] == 4194304
    assert np.array_equal(indices, actual_indices) and np.array_equal(samples, actual_samples)
    assert (samples < 0).any()
    limits = ZScaleInterval().get_limits(mean64)
    assert list(limits) == [statistics['z1'], statistics['z2']]
    selected_stretch = limits[1] - limits[0]
    assert selected_stretch == report['variants']['global-zscale-q8']['stretch']
    # Recomputing one official reference fit here checks its recorded limits.
    # It is an independent readback, not another trial fitting or new parameter.
    variant_checks = []
    all_decoded = {}
    for name, stretch, q in [('fixed-5-q8', 5.0, 8.0), ('docs-05-q10', .5, 10.0), ('global-zscale-q8', selected_stretch, 8.0)]:
        variant = report['variants'][name]
        assert variant['stretch'] == stretch and variant['Q'] == q
        assert variant['interval'] == {'class': 'ManualInterval', 'vmin': 0, 'vmax': None}
        rgb = np.load(ROOT / variant['rgbMaster']['path'], mmap_mode='r', allow_pickle=False)
        assert rgb.dtype == np.uint8 and rgb.shape == (2048, 2048, 3)
        maximum = 0
        differences = 0
        for start in range(0, 2048, 128):
            expected = manual_lupton(science, stretch, q, start, start + 128)
            delta = np.abs(expected.astype(np.int16) - rgb[start:start+128].astype(np.int16))
            maximum = max(maximum, int(delta.max()))
            differences += int(np.any(delta, axis=2).sum())
        assert maximum == 0 and differences == 0, (name, maximum, differences)
        level_checks = []
        for level, bounds, factor in [('OVERVIEW', [0, 0, 2048, 2048], 4), ('MEDIUM', [512, 512, 1536, 1536], 2), ('DETAIL', [768, 768, 1280, 1280], 1)]:
            meta = variant['levels'][level]
            assert meta['masterCrop']['boundsXYExclusive'] == bounds and meta['masterCrop']['boxFactor'] == factor
            path = ROOT / meta['actualFile']['path']
            with Image.open(path) as opened:
                assert opened.mode == 'RGBA' and opened.size == (512, 512)
                rgba = np.asarray(opened.convert('RGBA'))
            expected = independent_box(rgb, joint, bounds, factor)
            assert np.array_equal(rgba, expected)
            assert np.all(rgba[:, :, 3] == 255)
            assert hashlib.sha256(rgba.tobytes()).hexdigest() == meta['actualDecoded']['rgbaSha256']
            with Image.open(SOURCE / candidate['levels'][level]['file']) as old:
                old_rgba = np.asarray(old.convert('RGBA'))
            assert np.array_equal(rgba[:, :, 3], old_rgba[:, :, 3])
            default_equal = np.array_equal(rgba, old_rgba)
            default_bytes_equal = path.read_bytes() == (SOURCE / candidate['levels'][level]['file']).read_bytes()
            if name == 'fixed-5-q8':
                assert default_equal and default_bytes_equal
            delta = np.abs(rgba[:, :, :3].astype(np.int16) - old_rgba[:, :, :3].astype(np.int16))
            changed = int(np.any(delta, axis=2).sum())
            assert changed == meta['differenceToFixed5Q8']['changedPixels'] and int(delta.max()) == meta['differenceToFixed5Q8']['maxAbsoluteChannelDelta']
            level_checks.append({'level': level, 'cropBounds': bounds, 'boxFactor': factor, 'sameGlobalMasterPixels': True,
                                 'sameScientificAlpha': True, 'defaultR2PixelsEqual': default_equal,
                                 'defaultR2BytesEqual': default_bytes_equal, 'differencePixelsToDefault': changed,
                                 'maxByteDifferenceToDefault': int(delta.max())})
            all_decoded[(name, level)] = rgba
        actual_family_bytes = sum((ROOT / value['actualFile']['path']).stat().st_size for value in variant['levels'].values())
        assert actual_family_bytes == variant['pngFamilyBytes']
        variant_checks.append({'name': name, 'stretch': stretch, 'Q': q, 'globalFormulaMaxByteError': maximum,
                               'globalFormulaChangedPixels': differences, 'pngFamilyBytes': actual_family_bytes, 'levels': level_checks})
    with Image.open(ROOT / report['contactSheet']['path']) as image:
        assert image.size == (1560, 1632)
        sheet = np.asarray(image.convert('RGB'))
    for col, name in enumerate(report['variants']):
        for row, level in enumerate(('OVERVIEW', 'MEDIUM', 'DETAIL')):
            x, y = col * 520 + 4, row * 544 + 28
            assert np.array_equal(sheet[y:y+512, x:x+512], all_decoded[(name, level)][:, :, :3])
    preserved_checks = []
    for item in json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_text('utf-8-sig')):
        actual = bind(ROOT / item['path'])
        assert actual['sha256'] == item['sha256']
        preserved_checks.append(actual)
    for item in checked.values():
        verify(item)
    result = {'scope': 'Bounded independent actual cached-data/readback review of existing three global transfers; no new source, rendering, parameter or adoption.',
              'reviewScript': bind(Path(__file__).resolve()), 'trialResult': bind(TRIAL / 'result.json'), 'trialBinding': bind(TRIAL / 'binding.json'),
              'inputsAndOutputBindingsChecked': len(checked), 'verifiedBindings': list(checked.values()),
              'allPriorSourceFilesByteUnchanged': True, 'sourceFiles': len(report['sourceBefore']), 'productionOwnerByteUnchanged': True,
              'actualScienceCounts': actual_counts,
              'globalSampleReadback': {'sharedIntensity': '(i+r+g)/3 after float64 conversion, no pedestal', 'wholeFiniteCount': int(mean64.size),
                                       'wholeNegativeIntensityCount': int((mean64 < 0).sum()), 'rasterStride': stride, 'actualSamples': int(samples.size),
                                       'negativeActualSamples': int((samples < 0).sum()), 'zeroActualSamples': int((samples == 0).sum()),
                                       'rasterIndicesAndIntensityBytesMatch': True, 'sameOfficialLimits': [float(value) for value in limits],
                                       'oneTrialFitSourceConfirmed': True, 'independentReadbackDoesNotRefitDisplayLevels': True},
              'variants': variant_checks, 'contactSheetAllNineActualDecodedPanelsEqual': True, 'preservedFiles': preserved_checks,
              'limits': ['Display stretching cannot restore PSF/resampling-lost resolution or validate natural color.',
                         'Nine actual PNG and contact sheet viewed; detail remains soft, bright variants strengthen brown/orange and green points/noise.',
                         'Pixel/source binding does not establish target-runtime blend, native composition/resource/experience acceptance; candidates remain unadopted.']}
    target = output / 'review.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(json.dumps({'review': bind(target), 'variants': variant_checks, 'samples': result['globalSampleReadback']}, ensure_ascii=False))

if __name__ == '__main__':
    main()
