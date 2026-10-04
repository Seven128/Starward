"""Saved M82 common-display effect, fallback, real perimeter and exact LOD."""
from pathlib import Path
import importlib.util
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
GEN = ROOT / 'output/sdss-m82-shared-adaptive-display-1004-r1'
OUT = ROOT / 'output/sdss-m82-shared-adaptive-readback-1004-r1'
spec = importlib.util.spec_from_file_location('pins', TASK / 'scripts/readback-m82-fpm-frame-intersection-2026-10-04.py')
pins = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pins)
np, bind = pins.np, pins.bind
from PIL import Image, ImageDraw
from astropy.visualization import ManualInterval, LuptonAsinhStretch, make_lupton_rgb

def main():
    assert not OUT.exists() and (GEN / 'result.json').exists()
    OUT.mkdir()
    (OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    r = json.loads((GEN / 'result.json').read_bytes())
    for pin in (r['scienceCandidate'], r['parentCandidate'], r['candidate']):
        assert bind(ROOT / pin['path']) == pin
    science_path, parent_path, current_path = (ROOT / r[k]['path'] for k in ('scienceCandidate', 'parentCandidate', 'candidate'))
    science, parent, current = (json.loads(p.read_bytes()) for p in (science_path, parent_path, current_path))
    inputs = [bind(GEN / 'result.json'), bind(science_path), bind(parent_path), bind(current_path)]
    def array(meta, directory):
        path = directory / meta['file']; p = bind(path)
        assert p['bytes'] == meta['bytes'] and p['sha256'] == meta['sha256']
        value = np.load(path, mmap_mode='r', allow_pickle=False)
        assert list(value.shape) == meta['shape'] and value.dtype.str == meta['dtype']
        inputs.append(p)
        return value
    raw = {b: array(science['arrays'][b + '-science'], science_path.parent) for b in 'gri'}
    values = {b: array(current['arrays'][b], current_path.parent) for b in 'gri'}
    previous = {b: array(parent['arrays'][b], parent_path.parent) for b in 'gri'}
    joint = array(science['arrays']['joint-availability'], science_path.parent)
    reference = array(science['arrays']['rgb-master'], science_path.parent)
    maps = {k: array(current['arrays'][k], current_path.parent) for k in ('qualified', 'radius', 'reached', 'protected')}
    parent_maps = {k: array(parent['arrays'][k], parent_path.parent) for k in maps}
    radius, protected = maps['radius'], maps['protected']
    assert np.isin(radius, [-1, 0, 1, 2, 4, 8]).all()
    assert np.array_equal(protected, radius == 0)
    assert not np.any(maps['qualified'] & ~joint)
    assert not np.any((radius >= 0) & ~maps['qualified'])
    assert not np.any(maps['reached'] & (radius <= 0))
    assert current['wholeMasterFilterRuns'] == 0 and current['interiorExact']
    interior = slice(8, -8), slice(8, -8)
    changed = np.zeros(joint.shape, bool); edge_changed = np.zeros_like(changed)
    for b in 'gri':
        assert hashlib.sha256(raw[b].tobytes()).hexdigest() == current['sourceScienceCOrderSha256'][b]
        assert np.array_equal(values[b][radius <= 0], raw[b][radius <= 0], equal_nan=True)
        assert np.isfinite(values[b][joint]).all()
        assert np.array_equal(values[b][interior], previous[b][interior], equal_nan=True)
        changed |= ~((values[b] == raw[b]) | (np.isnan(values[b]) & np.isnan(raw[b])))
        edge_changed |= ~((values[b] == previous[b]) | (np.isnan(values[b]) & np.isnan(previous[b])))
    assert not edge_changed[interior].any()
    assert int(changed.sum()) == current['changedEstimatePixels']
    for k, value in maps.items():
        assert np.array_equal(value[interior], parent_maps[k][interior])
        assert hashlib.sha256(value.tobytes()).hexdigest() == current['diagnosticCOrderSha256'][k]
    assert int(maps['qualified'].sum()) == current['qualifiedCenters']
    assert int(protected.sum()) == current['protectedCenters']
    assert int(maps['reached'].sum()) == current['commonRatioReached']
    # The actual full-source qualification map predates smoothing. Unknown
    # and processing-excluded centres remain original; no new science mask.
    with np.load(science_path.parents[1] / 'display-qualification.npz', allow_pickle=False) as q:
        eligible = q['eligible']
    assert not np.any(maps['qualified'] & ~eligible)
    for b in 'gri':
        assert np.array_equal(values[b][~eligible], raw[b][~eligible])
    recipe = current['sourceResolvedRecipe']
    assert recipe == science['display']['transfer'] == parent['sourceResolvedRecipe']
    def rgb(samples):
        return make_lupton_rgb(samples['i'], samples['r'], samples['g'], interval=ManualInterval(vmin=0, vmax=None),
            stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'], Q=recipe['Q']), output_dtype=np.uint8)
    current_rgb = rgb(values)
    sheet = Image.new('RGB', (1024, 3 * 536), '#181818'); draw = ImageDraw.Draw(sheet)
    levels = []
    for index, (level, meta) in enumerate(current['levels'].items()):
        x0, y0, x1, y1 = meta['crop']['boundsXYExclusive']; factor = meta['crop']['boxFactor']
        region = slice(y0, y1), slice(x0, x1)
        counts = joint[region].reshape(512, factor, 512, factor).sum(axis=(1, 3))
        means = {}
        for b in 'gri':
            total = np.where(joint[region], values[b][region], 0).astype(np.float64).reshape(512, factor, 512, factor).sum(axis=(1, 3))
            means[b] = np.divide(total, counts, out=np.zeros_like(total), where=counts > 0).astype(np.float32)
        alpha = np.rint(counts.astype(float) * 255 / factor ** 2).astype(np.uint8)
        expected = np.dstack([rgb(means), alpha])
        path = current_path.parent / meta['file']; pin = bind(path)
        assert pin['sha256'] == meta['sha256'] and pin['bytes'] == meta['bytes']
        actual = np.array(Image.open(path)); assert np.array_equal(actual, expected)
        original_meta = science['levels'][level]; original_path = science_path.parent / original_meta['file']
        original = np.array(Image.open(original_path))
        assert np.array_equal(actual[:, :, 3], original[:, :, 3])
        for key in ('pixels', 'fieldDegrees', 'wcsHeader'):
            assert meta[key] == original_meta[key]
        for col, (label, pixels) in enumerate((('source science means', original), ('common display estimate', actual))):
            draw.text((col * 512 + 4, index * 536 + 4), level + ' / ' + label, fill='white')
            sheet.paste(Image.fromarray(pixels[:, :, :3]), (col * 512, index * 536 + 24))
        levels.append({'level': level, 'numericMeanThenFrozenRgbExact': True, 'areaAlphaAndWcsExact': True,
            'changedRgbPixels': int(np.any(actual[:, :, :3] != original[:, :, :3], axis=2).sum()),
            'current': pin, 'source': bind(original_path)})
    sheet.save(OUT / 'actual-full-lod-pairs.png')
    patches = [('core', [960, 960, 1088, 1088]), ('background', [64, 64, 192, 192]), ('diffuse', [700, 900, 828, 1028])]
    # Find a real field-preference transition and qualification edge; these
    # are descriptive anomaly inspection, not source/stellar identification.
    weights = np.stack([array(d['normalized-weight'], science_path.parent) for d in science['mosaic']['diagnostics'].values()])
    dominant = weights.argmax(axis=0)
    transition = np.zeros(joint.shape, bool); transition[1:] |= dominant[1:] != dominant[:-1]; transition[:, 1:] |= dominant[:, 1:] != dominant[:, :-1]
    boundary = np.zeros_like(transition); boundary[1:] |= eligible[1:] != eligible[:-1]; boundary[:, 1:] |= eligible[:, 1:] != eligible[:, :-1]
    delta = np.abs(current_rgb.astype(np.int16) - reference.astype(np.int16)).max(axis=2)
    inside = np.zeros_like(transition); inside[64:-64, 64:-64] = True
    for name, mask in (('field-transition', transition), ('qualification-edge', boundary)):
        allowed = mask & inside; assert allowed.any()
        y, x = np.unravel_index(np.where(allowed, delta, -1).argmax(), delta.shape)
        patches.append((name, [int(x - 64), int(y - 64), int(x + 64), int(y + 64)]))
    pairs = Image.new('RGB', (512, len(patches) * 280), '#181818'); draw = ImageDraw.Draw(pairs); patch_facts = []
    for index, (name, bounds) in enumerate(patches):
        x0, y0, x1, y1 = bounds; region = slice(y0, y1), slice(x0, x1)
        draw.text((4, index * 280 + 4), name + ' / original - display', fill='white')
        for col, pixels in enumerate((reference, current_rgb)):
            pairs.paste(Image.fromarray(pixels[region]).resize((256, 256), Image.Resampling.NEAREST), (col * 256, index * 280 + 24))
        patch_facts.append({'name': name, 'boundsXYExclusive': bounds, 'qualified': int(maps['qualified'][region].sum()),
            'protected': int(protected[region].sum()), 'changedRgbPixels': int(np.any(current_rgb[region] != reference[region], axis=2).sum())})
    pairs.save(OUT / 'actual-structure-and-boundary-pairs.png')
    cp = json.loads((ROOT / r['checkpoint']['path']).read_bytes())
    for pin in cp['currentSources'] + cp['protected'] + cp['evidence']:
        assert bind(ROOT / pin['path']) == pin
    report = {'scope': __doc__, 'producerResult': bind(GEN / 'result.json'), 'reader': bind(Path(__file__)),
        'wholeFallbackAndUnknownAndProtectedExact': True, 'perimeterOnlyInteriorExact': True,
        'edgeChangedEstimates': int(edge_changed.sum()), 'changedEstimates': int(changed.sum()),
        'levels': levels, 'patches': patch_facts, 'actualLevels': bind(OUT / 'actual-full-lod-pairs.png'),
        'actualStructurePairs': bind(OUT / 'actual-structure-and-boundary-pairs.png'),
        'actualInputPins': inputs, 'oldCheckpointSourcesProtectedEvidenceExact': True,
        'newFilterOrReprojectionOrSourceRequests': 0, 'qualityAcceptance': 'UNVERIFIED',
        'ordinaryAdoption': False, 'independentReview': 'MISSING'}
    (OUT / 'result.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'changed': int(changed.sum()), 'edgeChanged': int(edge_changed.sum()), 'levels': levels}))

if __name__ == '__main__':
    main()
