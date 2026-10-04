"""Verify saved larger-source pixels and actual Scene; no reprocessing or draw."""
from pathlib import Path
import hashlib
import importlib.util
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
TRIAL = ROOT / 'output/noirlab-m82-large-detail-1004-r1'
OLD = ROOT / 'output/prepared-source-masked-background-1004-r1'
SCENE = ROOT / 'output/playwright/cloud-sky-noirlab-m82-large-detail-1004-r2'
PUBLICATION = ROOT / 'output/noirlab-prepared-wide-publication-1004-r1/noao-m81m82'
OUT = ROOT / 'output/noirlab-m82-large-detail-readback-1004-r2'
sys.path[:0] = [str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location('saved_scene_model', TASK / 'scripts/readback-prepared-display-background-pairs-2026-10-04.py')
model = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def check(row):
    raw = (ROOT / row['path']).resolve().read_bytes()
    return len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']


def png(path):
    with Image.open(path) as image:
        return np.array(image.convert('RGBA'))


def save(name, value):
    with (OUT / name).open('x', encoding='utf-8') as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def independent_formula(raw, background):
    # Direct sRGB constants, separate from the reused task conversion helpers.
    e = np.arange(256, dtype=np.float64) / 255
    lut = np.where(e <= .04045, e / 12.92, ((e + .055) / 1.055) ** 2.4)
    result = np.empty(raw.shape, dtype=np.uint8)
    clipped = np.zeros(3, dtype=np.int64)
    for start in range(0, raw.shape[0], 128):
        end = min(start + 128, raw.shape[0])
        b = background[start:end] / 255
        b_linear = np.where(b <= .04045, b / 12.92, ((b + .055) / 1.055) ** 2.4)
        signed = lut[raw[start:end]] - b_linear
        clipped += (signed < 0).sum(axis=(0, 1))
        nonnegative = np.maximum(signed, 0)
        encoded = np.where(nonnegative <= .0031308, nonnegative * 12.92,
                           1.055 * nonnegative ** (1 / 2.4) - .055)
        result[start:end] = np.rint(np.clip(encoded * 255, 0, 255)).astype(np.uint8)
    return result, clipped.tolist()


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    bindings = []
    for folder in [TRIAL, SCENE]:
        before = json.loads((folder / 'inputs-before.json').read_bytes())
        assert before == json.loads((folder / 'inputs-after.json').read_bytes())
        assert all(check(row) for row in before)
        bindings.extend(before)
    parsed = json.loads((SCENE / 'parsed-inputs.json').read_bytes())
    assert parsed == json.loads((SCENE / 'parsed-inputs-after.json').read_bytes()) and all(check(row) for row in parsed)
    scene = json.loads((SCENE / 'result.json').read_bytes())
    trial = json.loads((TRIAL / 'result.json').read_bytes())
    publication = json.loads((PUBLICATION / 'manifest.json').read_bytes())
    assert scene['status'] == 'EXECUTED_NEW_LARGER_SOURCE_DISPLAY_ESTIMATE_SCENE' and len(scene['rows']) == 3
    assert scene['newBaselineFrames'] == scene['newMatchedOriginalFrames'] == 0
    raw = np.load(TRIAL / 'master-rgba.npy', mmap_mode='r', allow_pickle=False)
    display = np.load(TRIAL / 'prototype-display-master.npy', mmap_mode='r', allow_pickle=False)
    assert raw.shape == display.shape == (2048, 2048, 4) and raw.dtype == display.dtype == np.uint8
    assert (raw[:, :, 3] == 255).all() and np.array_equal(raw[:, :, 3], display[:, :, 3])
    assert check(trial['displayBackground'])
    with np.load(TRIAL / 'encoded-display-background.npz', allow_pickle=False) as data:
        background = data['background']
    expected, clipped = independent_formula(raw[:, :, :3], background)
    assert np.array_equal(expected, display[:, :, :3]) and clipped == trial['clippedNegativeLinearChannels']
    del expected, background
    tiers = {}
    for row in trial['products']:
        assert check(row['rawPng']) and check(row['prototypePng'])
        original, derived = png(ROOT / row['rawPng']['path']), png(ROOT / row['prototypePng']['path'])
        crop = row['originalProductMetadata']['masterCrop']
        x0, y0, x1, y1 = crop['boundsXYExclusive']; factor = crop['boxFactor']
        # These fully opaque products require an arithmetic area mean. This
        # independent check does not bypass partial-alpha support generally.
        for master, product in [(raw, original), (display, derived)]:
            area = master[y0:y1, x0:x1]
            mean = area.reshape(512, factor, 512, factor, 4).mean(axis=(1, 3), dtype=np.float64)
            assert np.array_equal(np.rint(mean).astype(np.uint8), product)
        assert (derived[:, :, 3] == 255).all() and np.array_equal(derived[:, :, 3], original[:, :, 3])
        small = png(OLD / (row['level'].lower() + '-display-prototype.png'))
        tiers[row['level']] = derived, small
    comparisons = []
    for row in scene['rows']:
        c = row['condition']; name, level, parent = c['name'], c['level'], c['coarser']
        actual = model.rgba(SCENE / (name + '.rgba'))
        assert bind(SCENE / (name + '.rgba'))['sha256'] == row['rgba']['sha256']
        assert np.array_equal(png(SCENE / (name + '.png')), actual)
        for kind in ['baseline', 'reference']:
            assert check({k: row[kind][k] for k in ['path', 'bytes', 'sha256']}) and check(row[kind]['png'])
        baseline, previous = model.rgba(ROOT / row['baseline']['path']), model.rgba(ROOT / row['reference']['path'])
        assert np.array_equal(png(ROOT / row['baseline']['png']['path']), baseline)
        assert np.array_equal(png(ROOT / row['reference']['png']['path']), previous)
        assert row['completion'] is None and row['substitutions'] == (2 if parent else 1)
        assert row['textureObjects']['created'] == row['textureObjects']['deleted'] and row['liveTextureObjects'] == 0
        fine, fine_inside = model.sample(tiers[level][0], publication['levels'][level]['fieldDegrees'], c['viewFieldDegrees'], c['cameraNorthOffsetDegrees'])
        previous_fine, _ = model.sample(tiers[level][1], publication['levels'][level]['fieldDegrees'], c['viewFieldDegrees'], c['cameraNorthOffsetDegrees'])
        source, previous_source = np.zeros_like(fine), np.zeros_like(fine)
        source[fine_inside] = fine[fine_inside]; previous_source[fine_inside] = previous_fine[fine_inside]
        parent_selected = np.zeros_like(fine_inside)
        if parent:
            coarse, coarse_inside = model.sample(tiers[parent][0], publication['levels'][parent]['fieldDegrees'], c['viewFieldDegrees'], c['cameraNorthOffsetDegrees'])
            previous_coarse, _ = model.sample(tiers[parent][1], publication['levels'][parent]['fieldDegrees'], c['viewFieldDegrees'], c['cameraNorthOffsetDegrees'])
            parent_selected = ~fine_inside & coarse_inside
            assert parent_selected.any()
            source[parent_selected] = coarse[parent_selected]; previous_source[parent_selected] = previous_coarse[parent_selected]
            padded = np.pad(fine_inside, 4); interior = fine_inside.copy()
            for dy, dx in [(-4, 0), (4, 0), (0, -4), (0, 4)]:
                interior &= padded[4 + dy:848 + dy, 4 + dx:394 + dx]
            seam = fine_inside & ~interior & coarse_inside
            mismatch = np.abs(fine[seam] - coarse[seam]) * 255
            seam_metrics = {'pixels': int(seam.sum()), 'medianAbsRgbBytes': np.median(mismatch, axis=0).tolist(),
                            'p90MaxRgbBytes': float(np.percentile(np.max(mismatch, axis=1), 90)),
                            'meaning': 'Same-sky LOD sampling differences include stars/structure; not instrument or quality classification'}
        else:
            seam_metrics = {'pixels': 0, 'meaning': 'No parent in overview'}
        available = fine_inside | parent_selected
        bg = baseline[:, :, :3].astype(np.float64) / 255
        def predicted(colour):
            return np.rint(np.clip((colour + bg * (1 - np.max(colour, axis=2)[:, :, None])) * 255, 0, 255)).astype(np.uint8)
        delta = np.abs(actual[:, :, :3].astype(np.int16) - predicted(source).astype(np.int16))[available]
        wrong = np.abs(actual[:, :, :3].astype(np.int16) - predicted(previous_source).astype(np.int16))[available]
        assert delta.mean() < wrong.mean()
        outside = ~available
        if outside.any(): assert np.array_equal(actual[outside], baseline[outside])
        changed = int((actual[:, :, :3] != previous[:, :, :3]).any(axis=2).sum())
        assert changed == row['changedFromReference'] and changed > 1000
        sheet = Image.new('RGB', (800, 892), (18, 18, 18)); draw = ImageDraw.Draw(sheet)
        draw.text((10, 5), level + ' PREVIOUS 4K DISPLAY', fill='white')
        draw.text((410, 5), '8315 SOURCE / SAME DISPLAY RECIPE', fill='white')
        sheet.paste(Image.fromarray(previous[:, :, :3]), (10, 26)); sheet.paste(Image.fromarray(actual[:, :, :3]), (410, 26))
        draw.text((10, 874), 'Same Scene/policy/pan. Coarse present. Final source UNKNOWN. Not page/native/publication/quality acceptance.', fill='white')
        path = OUT / (name + '-4k-vs-large-scene.png'); sheet.save(path)
        comparisons.append({'condition': c, 'actualAndReusedControlPngRgbaExact': True,
                            'fineGeometricPixels': int(fine_inside.sum()), 'coarseSelectedGeometricPixels': int(parent_selected.sum()),
                            'outsidePixels': int(outside.sum()), 'outsideComparison': 'EXACT' if outside.any() else 'NOT_APPLICABLE_NO_OUTSIDE_PIXELS',
                            'analyticMeanAbsBytes': float(delta.mean()), 'analyticP99MaxChannelBytes': float(np.percentile(np.max(delta, axis=1), 99)),
                            'analyticMaxChannelBytes': int(delta.max()), 'wrongPreviousRasterMeanAbsBytes': float(wrong.mean()),
                            'changedFromPreviousScenePixels': changed, 'fineCoarseBoundary': seam_metrics, 'contact': bind(path)})
    assert all(check(row) for row in bindings + parsed)
    result = {'status': 'FULL_NEW_LARGER_SOURCE_DISPLAY_AND_ACTUAL_SCENE_READ_BACK',
              'fullDisplayRgbFormulaExact': True, 'fullGeometryAlphaExact': True, 'sixRawAndDerivedPngsExact': True,
              'clippedNegativeLinearChannels': clipped, 'comparisons': comparisons, 'sourceRequests': 0,
              'originalJpegDecodes': 0, 'rgbReprojections': 0, 'backgroundFits': 0, 'sceneReruns': 0, 'publicationWrites': 0,
              'limits': 'Full saved pixel/formula and current nominal Scene validation only. Higher sampling does not supply telescope PSF, absolute registration, complete weak-content/background quality, processing publication identity, actual Hook/page/SourceBack, independent/native/phone, physical memory/cost/capacity or final acceptance.'}
    save('result.json', result)
    print(json.dumps({'status': result['status'], 'rows': [{'level': row['condition']['level'], 'analyticP99': row['analyticP99MaxChannelBytes'],
                      'analyticMax': row['analyticMaxChannelBytes'], 'boundaryP90': row['fineCoarseBoundary'].get('p90MaxRgbBytes')} for row in comparisons]}, ensure_ascii=False))


if __name__ == '__main__':
    main()
