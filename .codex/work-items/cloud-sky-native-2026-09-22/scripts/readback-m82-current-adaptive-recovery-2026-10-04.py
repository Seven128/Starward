"""Saved M82 recovery/fallback/LOD readback and actual parent-output comparison."""
from pathlib import Path
import importlib.util
import hashlib
import json

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
GEN = ROOT / 'output/sdss-m82-current-adaptive-recovery-1004-r1'
QUAL = ROOT / 'output/sdss-m82-boundary-other-scan-qualification-1004-r1'
OUT = ROOT / 'output/sdss-m82-current-adaptive-recovery-readback-1004-r1'
spec = importlib.util.spec_from_file_location('producer', TASK / 'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py')
producer = importlib.util.module_from_spec(spec); spec.loader.exec_module(producer)
np, bind = producer.np, producer.bind
from PIL import Image, ImageDraw
from astropy.visualization import make_lupton_rgb, ManualInterval, LuptonAsinhStretch


def main():
    assert not OUT.exists()
    OUT.mkdir(); (OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    result_path = GEN / 'result.json'
    assert bind(result_path)['sha256'] == 'c66c353fe2b0504fc87bbd5c02e846d0e664097d2654bc10918a24a1975f509a'
    result = json.loads(result_path.read_bytes()); inputs = [bind(result_path), bind(Path(__file__))]
    documents = {}; directories = {}
    for key in ('scienceCandidate', 'parentCandidate', 'candidate'):
        path = ROOT / result[key]['path']; assert bind(path) == result[key]
        inputs.append(bind(path)); documents[key] = json.loads(path.read_bytes()); directories[key] = path.parent
    science, parent, current = (documents[key] for key in ('scienceCandidate', 'parentCandidate', 'candidate'))
    def array(meta, directory):
        path = directory / meta['file']; actual = bind(path)
        assert (actual['sha256'], actual['bytes']) == (meta['sha256'], meta['bytes'])
        value = np.load(path, mmap_mode='r', allow_pickle=False)
        assert list(value.shape) == meta['shape'] and value.dtype.str == meta['dtype']
        inputs.append(actual); return value
    raw = {b: array(science['arrays'][b + '-science'], directories['scienceCandidate']) for b in 'gri'}
    baseline = {b: array(parent['arrays'][b], directories['parentCandidate']) for b in 'gri'}
    recovered = {b: array(current['arrays'][b], directories['candidate']) for b in 'gri'}
    supply = array(current['arrays']['alternative-supply'], directories['candidate'])
    qualified = array(parent['arrays']['qualified'], directories['parentCandidate'])
    joint = array(science['arrays']['joint-availability'], directories['scienceCandidate'])
    assert not np.any(supply & (~joint | qualified))
    assert int(supply.sum()) == current['alternativePixels'] == 13096
    assert hashlib.sha256(supply.tobytes()).hexdigest() == current['alternativeSupplyCOrderSha256']
    assert current['baselineDiagnosticCOrderSha256'] == parent['diagnosticCOrderSha256']
    assert current['baselineQualifiedCOrderSha256'] == parent['diagnosticCOrderSha256']['qualified']
    assert current['baselineEstimateCOrderSha256'] == parent['displayEstimatesCOrderSha256']
    assert current['baselineProcessingVersion'] == parent['version']
    assert current['recoveryExecutionKind'] == 'CURRENT_NATIVE_SUPPLY_ON_CURRENT_ADAPTIVE_PARENT'
    assert 'savedSupplyProcessingVersion' not in current and current['filterRuns'] == current['fitRuns'] == 0
    changed = np.zeros(joint.shape, bool)
    for band in 'gri':
        assert hashlib.sha256(raw[band].tobytes()).hexdigest() == current['sourceScienceCOrderSha256'][band]
        assert hashlib.sha256(recovered[band].tobytes()).hexdigest() == current['displayEstimatesCOrderSha256'][band]
        assert np.array_equal(recovered[band][~supply], baseline[band][~supply], equal_nan=True)
        assert np.array_equal(recovered[band][qualified], baseline[band][qualified])
        assert np.isfinite(recovered[band][joint]).all()
        changed |= recovered[band] != baseline[band]
    recipe = current['sourceResolvedRecipe']; assert recipe == parent['sourceResolvedRecipe'] == science['display']['transfer']
    def rgb(values):
        return make_lupton_rgb(values['i'], values['r'], values['g'], interval=ManualInterval(vmin=0, vmax=None),
            stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'], Q=recipe['Q']), output_dtype=np.uint8)
    sheet = Image.new('RGB', (1024, 1608), '#181818'); draw = ImageDraw.Draw(sheet); levels = []
    for index, (level, meta) in enumerate(current['levels'].items()):
        x0, y0, x1, y1 = meta['crop']['boundsXYExclusive']; factor = meta['crop']['boxFactor']
        region = slice(y0, y1), slice(x0, x1)
        count = joint[region].reshape(512, factor, 512, factor).sum(axis=(1, 3)); means = {}
        for band in 'gri':
            total = np.where(joint[region], recovered[band][region], 0).astype(np.float64).reshape(512, factor, 512, factor).sum(axis=(1, 3))
            means[band] = np.divide(total, count, out=np.zeros_like(total), where=count > 0).astype(np.float32)
        alpha = np.rint(count.astype(float) * 255 / factor ** 2).astype(np.uint8)
        path = directories['candidate'] / meta['file']; actual_pin = bind(path)
        assert (actual_pin['sha256'], actual_pin['bytes']) == (meta['sha256'], meta['bytes'])
        actual = np.array(Image.open(path)); assert np.array_equal(actual, np.dstack([rgb(means), alpha]))
        parent_meta = parent['levels'][level]; old_path = directories['parentCandidate'] / parent_meta['file']
        old = np.array(Image.open(old_path)); old_pin = bind(old_path)
        assert (old_pin['sha256'], old_pin['bytes']) == (parent_meta['sha256'], parent_meta['bytes'])
        assert np.array_equal(actual[:, :, 3], old[:, :, 3])
        for key in ('pixels', 'fieldDegrees', 'wcsHeader'): assert meta[key] == parent_meta[key]
        for column, (label, values) in enumerate((('adaptive parent', old), ('actual other-scan recovery', actual))):
            draw.text((column * 512 + 4, index * 536 + 4), level + ' / ' + label, fill='white')
            sheet.paste(Image.fromarray(values[:, :, :3]), (column * 512, index * 536 + 24))
        levels.append({'level': level, 'numericDerivationExact': True, 'originalAlphaAndWcsExact': True,
            'changedRgbPixels': int(np.any(actual[:, :, :3] != old[:, :, :3], axis=2).sum()), 'png': actual_pin, 'parentPng': old_pin})
    sheet.save(OUT / 'actual-full-lod-pairs.png')
    qualification_path = QUAL / 'result.json'; qualification = json.loads(qualification_path.read_bytes()); inputs.append(bind(qualification_path))
    parent_rgb, current_rgb = rgb(baseline), rgb(recovered)
    patches = Image.new('RGB', (512, 1400), '#181818'); draw = ImageDraw.Draw(patches); patch_results = []
    for index, patch in enumerate(qualification['patches']):
        x0, y0, x1, y1 = patch['boundsXYExclusive']; region = slice(y0, y1), slice(x0, x1)
        path = QUAL / (patch['name'] + '-qualification.npz'); inputs.append(bind(path))
        with np.load(path, allow_pickle=False) as archive:
            expected, values = archive['nativeQualifiedSupply'], archive['conditionalAlternativeGri']
        assert np.array_equal(supply[region], expected)
        for band_index, band in enumerate('gri'): assert np.array_equal(recovered[band][region][expected], values[band_index][expected])
        draw.text((4, index * 280 + 4), patch['name'] + ' / parent - recovery', fill='white')
        for column, image in enumerate((parent_rgb, current_rgb)):
            patches.paste(Image.fromarray(image[region]).resize((256, 256), Image.Resampling.NEAREST), (column * 256, index * 280 + 24))
        patch_results.append({'name': patch['name'], 'boundsXYExclusive': patch['boundsXYExclusive'], 'supply': int(expected.sum()),
            'changedRgbPixels': int(np.any(parent_rgb[region] != current_rgb[region], axis=2).sum())})
    patches.save(OUT / 'actual-boundary-recovery-pairs.png')
    before = json.loads((GEN / 'inputs-before.json').read_bytes()); after = json.loads((GEN / 'inputs-after.json').read_bytes())
    assert before == after
    for actual in before: assert bind(ROOT / actual['path']) == actual
    for actual in inputs: assert bind(ROOT / actual['path']) == actual
    report = {'scope': __doc__, 'producerResult': bind(result_path), 'candidate': result['candidate'],
        'actualSavedInputs': inputs, 'producerInputsBeforeAfterExact': True, 'supply': int(supply.sum()),
        'changedEstimatePixels': int(changed.sum()), 'outsideSupplyLatestParentExact': True,
        'currentQualifiedParentExact': True, 'originalScienceAndRecipeBound': True, 'actualPatchQualificationExact': True,
        'levels': levels, 'patches': patch_results, 'sourceRequests': 0, 'projectionOrFilterOrCoaddRuns': 0,
        'quality': 'UNVERIFIED', 'ordinaryAdoption': False, 'independentReview': 'MISSING'}
    producer.save(OUT / 'result.json', report)
    print(json.dumps({'supply': int(supply.sum()), 'changedEstimates': int(changed.sum()), 'levels': levels, 'patches': patch_results}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        if OUT.exists(): producer.save(OUT / 'failed.json', {'type': type(error).__name__, 'error': str(error)})
        raise
