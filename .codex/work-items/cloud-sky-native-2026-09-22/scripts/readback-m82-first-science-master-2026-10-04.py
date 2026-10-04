"""Full saved coadd effect and exact three-level derivation, no reprojection."""
from pathlib import Path
import importlib.util
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
GEN = ROOT / 'output/sdss-m82-first-science-master-1004-r2'
OUT = ROOT / 'output/sdss-m82-first-science-readback-1004-r3'
spec = importlib.util.spec_from_file_location('pins', TASK / 'scripts/readback-m82-fpm-frame-intersection-2026-10-04.py')
pins = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pins)
np, bind = pins.np, pins.bind
from PIL import Image
from astropy.visualization import ManualInterval, LuptonAsinhStretch, make_lupton_rgb

def main():
    assert not OUT.exists()
    OUT.mkdir()
    (OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    result = json.loads((GEN / 'result.json').read_bytes())
    assert bind(GEN / 'candidate/candidate.json') == result['candidate']
    cp = json.loads((ROOT / result['checkpoint']['path']).read_bytes())
    for p in cp['currentSources'] + cp['protected'] + cp['evidence']:
        assert bind(ROOT / p['path']) == p
    candidate = GEN / 'candidate'
    c = json.loads((candidate / 'candidate.json').read_bytes())
    gi = json.loads((ROOT / result['griInputs']['path']).read_bytes())
    def array(meta):
        p = candidate / meta['file']
        assert p.stat().st_size == meta['bytes'] and bind(p)['sha256'] == meta['sha256']
        value = np.load(p, mmap_mode='r', allow_pickle=False)
        assert list(value.shape) == meta['shape'] and value.dtype.str == meta['dtype']
        return value
    bands = {b: array(c['arrays'][b + '-science']) for b in 'gri'}
    joint = array(c['arrays']['joint-availability'])
    assert joint.all() and joint.size == 4194304
    count = array(c['mosaic']['contributorCount'])
    fields = {}
    for f in c['mosaic']['fields']:
        key = f['fieldKey']
        d = c['mosaic']['diagnostics'][key]
        values = {b: array(d[b + '-science']) for b in 'gri'}
        weight = array(d['normalized-weight'])
        old = next(p for p in gi['fields'] if '/'.join(str(p['identity'][k]) for k in ('rerun', 'run', 'camcol', 'field')) == key)
        with np.load(ROOT / old['support']['path'], allow_pickle=False) as original:
            coherent = np.unpackbits(original['coherent_gri'], count=joint.size, bitorder='little').reshape(joint.shape).astype(bool)
            assert np.array_equal(weight > 0, coherent)
            for b in 'gri':
                for label, previous in [('footprint', 'footprint_' + b), ('finite-neighbors', 'finite_neighbors_' + b)]:
                    saved = array(d[b + '-' + label])
                    support = np.unpackbits(original[previous], count=joint.size, bitorder='little').reshape(joint.shape).astype(bool)
                    assert np.array_equal(saved, support)
        fields[key] = values, weight
    # r2 completed the full coadd/weight/single-contributor assertions before
    # failing at the first PNG due to reader float64 vs owner float32 means.
    # Retain that executed proof instead of replaying the completed matrix.
    partial = OUT.parent / 'sdss-m82-first-science-readback-1004-r2'
    assert (partial / 'coadd-passed-png-failed.json').exists()
    prior_coadd = bind(partial / 'executed-reader.py')
    recipe = c['display']['transfer']
    levels = []
    for level, meta in c['levels'].items():
        x0, y0, x1, y1 = meta['masterCrop']['boundsXYExclusive']
        factor = meta['masterCrop']['boxFactor']
        means = {b: bands[b][y0:y1, x0:x1].reshape(512, factor, 512, factor).mean(axis=(1, 3), dtype=np.float64).astype(np.float32) for b in 'gri'}
        rgb = make_lupton_rgb(means['i'], means['r'], means['g'], interval=ManualInterval(vmin=0, vmax=None),
            stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'], Q=recipe['Q']), output_dtype=np.uint8)
        image = np.array(Image.open(candidate / meta['file']))
        assert np.array_equal(image[:, :, :3], rgb) and np.all(image[:, :, 3] == 255)
        maximum = rgb.max(axis=2)
        straight = np.zeros(rgb.shape, dtype=np.float64)
        np.divide(rgb.astype(float) * 255, maximum[:, :, None], out=straight, where=maximum[:, :, None] > 0)
        alt = np.array(Image.open(candidate / meta['alternativeDisplay']['file']))
        assert np.array_equal(alt, np.dstack([np.rint(straight).astype(np.uint8), maximum]))
        levels.append({'level': level, 'scienceMeanToFrozenRgbExact': True, 'areaAlphaExact': True,
                       'displayContributionExact': True, 'pixels': 512 ** 2})
    with np.load(GEN / 'display-qualification.npz', allow_pickle=False) as q:
        qual = result['qualification']
        assert q['eligible'].sum() == qual['processablePixels']
        assert q['native_model_known'].sum() == qual['nativeConditionalModelKnownPixels']
        assert q['eligible'][992:1056, 992:1056].sum() == qual['central64Processable'] == 4096 - 79
        assert not np.any(q['eligible'] & ~q['native_model_known'])
    report = {'scope': __doc__, 'producerResult': bind(GEN / 'result.json'), 'reader': bind(Path(__file__)),
        'coaddScalarValuesReadBack': 3 * joint.size, 'savedPerFieldSupportExact': True,
        'priorExecutedFullCoaddReader': prior_coadd, 'fullCoaddPassedBeforePngReaderFailure': True,
        'weightAndFinalFloat32RoundoffOnly': True, 'coaddMatrixReplayed': False,
        'levels': levels, 'qualificationCountsAndCentralKnownInterpEffectExact': True,
        'oldSourcesProtectedEvidenceExact': True, 'newProjectionFilteringOrSourceRequests': 0,
        'scientificQuality': 'UNVERIFIED', 'ordinaryAdoption': False, 'independentReview': 'MISSING'}
    (OUT / 'result.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report))

if __name__ == '__main__':
    main()
