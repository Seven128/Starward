"""Saved-output checks and descriptive color/edge diagnostics, no Scene rerun."""
from pathlib import Path
import hashlib
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
TIES = ROOT / 'output/prepared-wide-tie-proposals-1004-r3'
MEASURES = ROOT / 'output/prepared-wide-compatibility-1004-r1'
FACTS = ROOT / 'output/prepared-wide-display-inputs-1004-r1'
PRIOR = ROOT / 'output/playwright/cloud-sky-noirlab-wide-quality-1004-r1'
SCENE = ROOT / 'output/playwright/cloud-sky-prepared-linear-composition-1004-r2'
OUT = ROOT / 'output/prepared-wide-compatibility-readback-1004-r2'
sys.path[:0] = [str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image

def bind(p):
    raw = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}

def check(row):
    # Executable/runtime bindings can legitimately resolve outside workspace.
    raw = (ROOT / row['path']).resolve().read_bytes()
    return len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']

def save(name, value):
    raw = json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n'
    with (OUT / name).open('x', encoding='utf-8') as f:
        f.write(raw)

def linear(values):
    values = np.asarray(values, dtype=np.float64)
    return np.where(values <= .04045, values / 12.92, ((values + .055) / 1.055) ** 2.4)

def encoded(values):
    return np.where(values <= .0031308, values * 12.92,
                    1.055 * np.maximum(values, 0) ** (1 / 2.4) - .055)

def source_at_pixels(image, field):
    # Independent analytic simplification for this identity-observation,
    # centered north-up/east-left camera only. Not a new product projection.
    yy, xx = np.mgrid[:844, :390]
    scale = 844 / (2 * math.tan(.60 * math.pi / 720))
    px, py = (xx + .5 - 195) / scale, (422 - yy - .5) / scale
    half = math.tan(math.radians(field) / 2)
    denominator = (1 - px * px - py * py) * half
    u, v = .5 + px / denominator, .5 - py / denominator
    inside = (u >= 0) & (u <= 1) & (v >= 0) & (v <= 1)
    sx, sy = u * 512 - .5, v * 512 - .5
    x0, y0 = np.floor(sx).astype(int), np.floor(sy).astype(int)
    wx, wy = sx - x0, sy - y0
    rgb = image[:, :, :3].astype(np.float64) / 255
    sample = np.zeros((844, 390, 3), dtype=np.float64)
    for dx, dy, weight in ((0, 0, (1-wx)*(1-wy)), (1, 0, wx*(1-wy)),
                           (0, 1, (1-wx)*wy), (1, 1, wx*wy)):
        sample += rgb[np.clip(y0+dy, 0, 511), np.clip(x0+dx, 0, 511)] * weight[:, :, None]
    return sample, inside, u, v

def metrics(values):
    return {'pixels': len(values), 'medianAbsRgb': np.median(np.abs(values), axis=0).tolist(),
            'p90MaxAbsChannel': float(np.percentile(np.max(np.abs(values), axis=1), 90))}

def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    inputs = [Path(__file__), TIES / 'result.json', MEASURES / 'result.json', FACTS / 'result.json', SCENE / 'result.json']
    for folder in (TIES, MEASURES, FACTS, SCENE):
        before = json.loads((folder / 'inputs-before.json').read_bytes())
        assert before == json.loads((folder / 'inputs-after.json').read_bytes())
        assert all(check(row) for row in before)
        inputs += [folder / 'inputs-before.json', folder / 'inputs-after.json']
    original = json.loads((SCENE / 'parsed-inputs.json').read_bytes())
    assert original == json.loads((SCENE / 'parsed-inputs-after.json').read_bytes())
    assert all(check(row) for row in original)
    inputs += [SCENE / 'parsed-inputs.json', SCENE / 'parsed-inputs-after.json', SCENE / 'task-variants.json']
    variants = json.loads((SCENE / 'task-variants.json').read_bytes())
    assert len(variants) == 2 and all(check(row['original']) and check(row['variant']) for row in variants)
    protected = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    inputs += [ROOT / row['path'] for row in protected]
    before = [bind(p) for p in inputs]
    save('inputs-before.json', before)

    ties = json.loads((TIES / 'result.json').read_bytes())
    measurements = json.loads((MEASURES / 'result.json').read_bytes())
    geometry = []
    scale_arcsec = .2275555555555556 * 3600 / 2048
    for group in measurements['geometricDiagnostics']:
        pair_rows = [p for p in ties['proposals'] if p['objectRef'] == group['objectRef']
                     and p['hint']['id'] in ('foreground-1', 'foreground-2', 'foreground-3', 'foreground-5',
                                             'visible-spike-southeast', 'visible-blue-west')]
        variants_checked = []
        for variant in group['variants']:
            radius = str(variant['apertureRadiusMasterPixels'])
            a = np.array([p['pair'][0]['centroidTargetColumnTopRow'][radius] for p in pair_rows])
            b = np.array([p['pair'][1]['centroidTargetColumnTopRow'][radius] for p in pair_rows])
            assert np.array_equal(a, variant['hstPoints']) and np.array_equal(b, variant['noirlabPoints'])
            offsets = b - a
            null = np.linalg.norm(offsets, axis=1) * scale_arcsec
            assert np.allclose(null, variant['noCorrectionNormArcsec'], rtol=0, atol=1e-12)
            cv = []
            for i, row in enumerate(variant['translationLeaveOneOut']):
                held_out_delta = offsets[i] - np.mean(np.delete(offsets, i, axis=0), axis=0)
                assert np.allclose(held_out_delta, row['residualTargetPixels'], rtol=0, atol=2e-13)
                cv.append(np.linalg.norm(held_out_delta) * scale_arcsec)
            assert np.allclose(cv, [p['normArcsec'] for p in variant['translationLeaveOneOut']], rtol=0, atol=2e-13)
            sim = [p['normArcsec'] for p in variant['similarityLeaveOneOut']]
            variants_checked.append({'radius': int(radius), 'nullNormArcsec': null.tolist(),
                                     'translationCVNormArcsec': cv,
                                     'translationImprovedPoints': int((np.array(cv) < null).sum()),
                                     'similarityCVNormArcsec': sim,
                                     'similarityImprovedPoints': int((np.array(sim) < null).sum()) if sim else None,
                                     'coverageHullPixelsSquared': variant['hullAreaMasterPixelsSquared']})
        geometry.append({'objectRef': group['objectRef'], 'variants': variants_checked})
    assert all(g['similarityImprovedPoints'] == 0 for g in geometry[0]['variants'])
    assert [g['translationImprovedPoints'] for g in geometry[1]['variants']] == [0, 1, 1]

    # No exposure applied: over true black, standard display encode/decode
    # returns every original byte. This does not guarantee weak output over sky.
    ramp = np.arange(256, dtype=np.float64) / 255
    assert np.array_equal(np.rint(encoded(linear(ramp))*255).astype(np.uint8), np.arange(256, dtype=np.uint8))
    scene = json.loads((SCENE / 'result.json').read_bytes())
    assert scene['status'] == 'EXECUTED_BOUNDED_LINEAR_COMPOSITION_PROTOTYPE' and len(scene['rows']) == 6
    assert scene['beforeAfterExact'] and scene['errors'] == []
    facts = json.loads((FACTS / 'result.json').read_bytes())
    comparisons = []
    for row in scene['rows']:
        name = row['condition']['name']
        raw = (SCENE / (name + '.rgba')).read_bytes()
        pre = (SCENE / (name + '-preblend.rgba')).read_bytes()
        old = (PRIOR / (name + '.rgba')).read_bytes()
        bg = (PRIOR / (name + '-baseline.rgba')).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == row['rgba']['sha256'] and len(raw) == row['rgba']['bytes']
        assert hashlib.sha256(pre).hexdigest() == row['preBlendRgbaSha256'] and pre == bg
        assert hashlib.sha256(old).hexdigest() == row['referenceRgbaSha256']
        png_file = SCENE / (name + '.png')
        assert bind(png_file)['sha256'] == row['png']['sha256']
        current = np.frombuffer(raw, dtype=np.uint8).reshape(844,390,4)[::-1]
        previous = np.frombuffer(old, dtype=np.uint8).reshape(844,390,4)[::-1]
        backdrop = np.frombuffer(bg, dtype=np.uint8).reshape(844,390,4)[::-1]
        with Image.open(png_file) as image:
            assert np.array_equal(np.array(image.convert('RGBA')), current)
        delta = current[:, :, :3].astype(np.int16) - backdrop[:, :, :3].astype(np.int16)
        old_delta = previous[:, :, :3].astype(np.int16) - backdrop[:, :, :3].astype(np.int16)
        assert int(np.any(delta != 0, axis=2).sum()) == row['differentFromBaseline']
        assert int(np.any(old_delta != 0, axis=2).sum()) == row['referenceDifferentFromBaseline']
        changed = np.any(current[:, :, :3] != previous[:, :, :3], axis=2)
        assert int(changed.sum()) == row['changedPixels']
        # Common modeled crop bounds were observed in the earlier exact Scene.
        x0,y0,x1,y1 = 35,262,355,582
        edge = np.zeros((844,390),dtype=bool)
        edge[y0:y0+4,x0:x1] = True; edge[y1-4:y1,x0:x1] = True
        edge[y0:y1,x0:x0+4] = True; edge[y0:y1,x1-4:x1] = True
        exterior = np.ones((844,390),dtype=bool);exterior[y0:y1,x0:x1]=False
        assert np.array_equal(current[exterior],backdrop[exterior])
        base = ROOT / ('output/noirlab-prepared-wide-publication-1004-r1/noao-m81m82'
                       if name.startswith('m82') else 'output/noirlab-prepared-wide-publication-1004-r1/noao1309a')
        publication = json.loads((base / 'manifest.json').read_bytes())
        with Image.open(base / publication['levels']['OVERVIEW']['file']) as image:
            source_image = np.array(image.convert('RGBA'))
        source, inside, u, v = source_at_pixels(source_image, publication['levels']['OVERVIEW']['fieldDegrees'])
        lin = linear(source);alpha = np.max(lin,axis=2)[:, :, None]
        predicted = np.rint(encoded(lin + linear(backdrop[:, :, :3]/255)*(1-alpha))*255)
        error = np.abs(predicted[inside] - current[:, :, :3][inside])
        hypothetical_flipped = np.rint(encoded(lin + linear(backdrop[::-1, :, :3]/255)*(1-alpha))*255)
        flip_error = np.abs(hypothetical_flipped[inside] - current[:, :, :3][inside])
        # Analytical double versus actual GPU highp/texture precision is kept
        # explicit. Scores are descriptive, not a quality/astrometry threshold.
        analytic = {'insidePixels': int(inside.sum()), 'medianAbsByteError': float(np.median(error)),
                    'p99AbsByteError': float(np.percentile(error,99)), 'maxAbsByteError': float(error.max()),
                    'backdropYFlipCounterfactualMeanError': float(flip_error.mean()),
                    'actualAnalyticMeanError': float(error.mean()),
                    'backdropYFlipCounterfactualSeparated': bool(flip_error.mean() > error.mean()),
                    'scope': 'Independent centered-camera double-precision model vs software GPU; not full production shader or physical color validation.'}
        if name == 'm82-noirlab-day':
            assert flip_error.mean() > error.mean(), 'wrong-y backdrop must measurably worsen the saved day result'
        region_rows = []
        fact = next(f for f in facts['rows'] if f['id'] == row['condition']['id'])
        for anchor in fact['unchangedEncodedPatternAnchors']:
            a,b,c,d = anchor['overviewBoundsXYExclusive']
            region = inside & (u*512>=a) & (u*512<c) & (v*512>=b) & (v*512<d)
            new_signal, old_signal = np.any(delta[region]!=0,axis=1), np.any(old_delta[region]!=0,axis=1)
            region_rows.append({'label': anchor['label'], 'pixels': int(region.sum()),
                                'previousQuantizedDifferencePixels': int(old_signal.sum()),
                                'newQuantizedDifferencePixels': int(new_signal.sum()),
                                'newVersusBackdrop': metrics(delta[region]),
                                'previousVersusBackdrop': metrics(old_delta[region]),
                                'meaning': 'Recognizable raw display-pattern region, not individual scientific weak-feature preservation or pass.'})
        assert row['error'] == 0 and row['failed'] == [] and row['liveTextureObjects'] == 0
        assert row['textureObjects']['created'] == row['textureObjects']['deleted'] == 8
        assert row['copyStats']['copiesCreated'] == row['copyStats']['copiesDeleted'] == 1
        comparisons.append({'name': name, 'glToPngExact': True, 'preBlendToPreviousBaselineExact': True,
                            'outsideCropExact': True, 'edgeOld': metrics(old_delta[edge]), 'edgeNew': metrics(delta[edge]),
                            'analyticLinearComposition': analytic, 'patternAnchors': region_rows,
                            'retiredTextureObjects': 0, 'copyModelRgbaBytes': row['copyStats']['copyLogicalRgbaBytes'],
                            'quality': 'FAILED_NOT_ADOPTED: complete frames still show photo rectangle at night; day seam reduction is not complete shared fusion.'})
    after = [bind(p) for p in inputs]
    assert after == before and all(bind(ROOT / p['path'])['sha256'] == p['sha256'] for p in protected)
    save('inputs-after.json',after)
    result = {'status': 'READBACK_SAVED_COMPATIBILITY_AND_SIX_PROTOTYPE_FRAMES', 'geometry': geometry,
              'comparisons': comparisons, 'rampRoundtripAll256Exact': True, 'sourceTransforms': 0,
              'sourceRequests': 0, 'sceneReruns': 0,
              'priorReaderFailure': 'R1 incorrectly required every day photo footprint to distinguish a vertically flipped background. Saved M51 day has the same background inside that footprint, so it cannot provide this counterfactual proof. R1 retained; M82 day separates, M51 keeps this gap.',
              'limits': ['Root readback is not independent review.', 'No correction/mixed-source master/registry or default renderer change.',
                         'The display-only contribution derivation is not calibrated astronomical flux.',
                         'Unchanged encoded source bytes/geometry and visible raw anchors do not certify all scientific faint structure.',
                         'The RGB backdrop copy is an extra temporary RGBA-equivalent 1316640 bytes; logical texture counts are not physical GPU/RSS or capacity.',
                         'Sources auxiliary contribution shader remains encoded; its old receipt does not validate new final-color participation.',
                         'Target WEAPP/WXML/phone, final quality, full inventory/cost/capacity remain unverified or failed.']}
    save('result.json',result)
    print(json.dumps({'status':result['status'],'frames':len(comparisons),
                      'edges':[(r['name'],r['edgeOld']['medianAbsRgb'],r['edgeNew']['medianAbsRgb']) for r in comparisons],
                      'analytic':[(r['name'],r['analyticLinearComposition']['p99AbsByteError'],r['analyticLinearComposition']['maxAbsByteError']) for r in comparisons]}))

if __name__ == '__main__':
    main()
