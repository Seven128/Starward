"""Read saved native coefficients directly against frames and dense covariance.

No regional projection/filter or candidate modification. This is root readback,
not independent review, PSF matching, scientific uncertainty or visual quality.
"""
from pathlib import Path
import importlib.util
import json
import math

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
GEN = ROOT / 'output/sdss-m82-recovered-native-apertures-1004-r1'
OUT = ROOT / 'output/sdss-m82-recovered-native-apertures-readback-1004-r2'
spec = importlib.util.spec_from_file_location('loader', TASK / 'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py')
loader = importlib.util.module_from_spec(spec); spec.loader.exec_module(loader)
np, bind, save = loader.np, loader.bind, loader.save
from sdss_frame_noise import native_noise_samples


def main():
    assert not OUT.exists(); OUT.mkdir()
    (OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    inputs = {}
    def pin(path, expected=None):
        actual = bind(path)
        if expected is not None: assert actual == expected
        prior = inputs.setdefault(actual['path'], actual); assert prior == actual
        return actual
    path = GEN / 'result.json'; pin(path); result = json.loads(path.read_bytes())
    for item in result['inputs'] + result['outputsBeforeResult']: pin(ROOT / item['path'], item)
    pin(Path(__file__)); pin(Path(loader.__file__))
    path = loader.DISPLAY / 'result.json'; pin(path)
    master, parent, sources = loader.load_saved_inputs(json.loads(path.read_bytes()), pin)
    records = []; maximum_source_residual = 0.
    for patch in result['patches']:
        x0, y0, x1, y1 = patch['boundsXYExclusive']; region = slice(y0, y1), slice(x0, x1)
        path = GEN / (patch['name'] + '-samples.npz'); pin(path)
        with np.load(path, allow_pickle=False) as archive: maps = {k: archive[k] for k in archive.files}
        q = maps['sourceQualified']; full = np.zeros(q.shape, bool)
        full[1:-1, 1:-1] = q[1:-1, 1:-1] & q[:-2, 1:-1] & q[2:, 1:-1] & q[1:-1, :-2] & q[1:-1, 2:]
        np.testing.assert_array_equal(full, maps['completeRadius1'])
        interior = np.zeros(q.shape, bool); interior[8:-8, 8:-8] = True
        old_blocked = parent.qualified[region] & (parent.radius[region] < 0) & interior
        np.testing.assert_array_equal(maps['previouslyBlockedNowComplete'], old_blocked & full)
        assert int((old_blocked & full).sum()) == patch['previouslyBlockedNowCompleteRadius1']
        for at, witness in enumerate(patch['witnesses']):
            path = GEN / (patch['name'] + f'-witness-{at}.npz'); pin(path)
            with np.load(path, allow_pickle=False) as archive: saved = {k: archive[k] for k in archive.files}
            selected = saved['selected']; count = int(selected.sum()); assert count == witness['selected'] == 5
            gx, gy = witness['globalXY']; assert maps['previouslyBlockedNowComplete'][gy-y0, gx-x0]
            ys, xs = np.where(selected); ra, dec = master.target.all_pix2world(xs+x0, master.joint_available.shape[0]-1-ys-y0, 0)
            field_variances = []; raw_sum = np.zeros(3); absolute = np.zeros(3)
            for name in master.mosaic_fields:
                prefix = name.replace('/', '-')
                if prefix + '-ids' not in saved: continue
                field_var = []
                for band_at, band in enumerate('gri'):
                    source = sources[name][band]; frame = source.frame
                    ids = saved[prefix + '-ids'][band_at]; coeff = saved[prefix + '-weights'][band_at]; native = saved[prefix + '-native_variance'][band_at]
                    sx, sy = frame.wcs.all_world2pix(ra, dec, 0)
                    geometry = np.isfinite(sx) & np.isfinite(sy) & (sx >= 0) & (sy >= 0) & (sx < frame.data.shape[1]-1) & (sy < frame.data.shape[0]-1)
                    nx, ny = np.full(sx.shape, -1, np.int64), np.full(sy.shape, -1, np.int64)
                    nx[geometry], ny[geometry] = np.floor(sx[geometry]).astype(np.int64), np.floor(sy[geometry]).astype(np.int64)
                    xx, yy = np.stack([nx,nx+1,nx,nx+1]), np.stack([ny,ny,ny+1,ny+1])
                    np.testing.assert_array_equal(ids, yy*frame.data.shape[1]+xx)
                    fx, fy = np.where(geometry, sx-nx, 0), np.where(geometry, sy-ny, 0)
                    effective = maps[prefix + '-weight'][selected]
                    expected = np.stack([(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy])*effective
                    np.testing.assert_array_equal(coeff, expected)
                    active = coeff > 0
                    noise = native_noise_samples(frame, source.camera, xx, yy)
                    assert noise.available[active].all()
                    np.testing.assert_array_equal(native[active], noise.variance_nmgy_squared[active])
                    np.testing.assert_array_equal(native[~active], np.zeros(int((~active).sum())))
                    # Independent full pair matrix: same native IDs share noise.
                    flat_coeff = coeff.ravel()/count; flat_ids = ids.ravel(); flat_noise = native.ravel()
                    a = flat_coeff > 0; c, i, v = flat_coeff[a], flat_ids[a], flat_noise[a]
                    covariance = np.where(i[:,None] == i[None,:], v[:,None], 0.)
                    field_var.append(float(c @ covariance @ c))
                    raw = np.zeros(coeff.shape)
                    raw[active] = frame.data.ravel()[ids[active]]
                    terms = raw * coeff / count
                    raw_sum[band_at] += math.fsum(terms.ravel()); absolute[band_at] += math.fsum(np.abs(terms).ravel())
                field_variances.append(field_var)
            dense = np.array([math.fsum(math.sqrt(v[b]) for v in field_variances)**2 for b in range(3)])
            np.testing.assert_allclose(dense, witness['actualConditionalVarianceUpper'], rtol=np.finfo(np.float64).eps*32, atol=0)
            mean = maps['rawDisplaySamplingGri'][:, selected].astype(np.float64).mean(axis=1)
            np.testing.assert_array_equal(mean, witness['rawSourceMeanGri'])
            bound = (len(field_variances)+8)*np.finfo(np.float32).eps*absolute + len(field_variances)*np.finfo(np.float32).smallest_subnormal
            residual = np.abs(raw_sum-mean); assert (residual <= bound).all()
            maximum_source_residual = max(maximum_source_residual, float(residual.max()))
            assert not np.array_equal(mean, witness['alreadyFilteredParentMeanGri'])
            records.append({'globalXY': witness['globalXY'], 'nativePairCovarianceUpper': dense.tolist(),
                'originalFrameRawMeanGri': raw_sum.tolist(), 'sampleMeanGri': mean.tolist(),
                'rawMeanResidualGri': residual.tolist(), 'derivedFloat32RoundoffBoundGri': bound.tolist()})
    for item in inputs.values(): assert bind(ROOT / item['path']) == item
    assert len(records) == 10
    save(OUT / 'result.json', {'scope': __doc__, 'producerResult': pin(GEN / 'result.json'), 'inputs': list(inputs.values()),
        'inputsAfterExact': True, 'actualNativeFrameSamplesAndCoefficientsExact': True, 'directNativeNoiseExact': True,
        'pairMatrixCovarianceMatches': True, 'witnesses': records, 'maximumRawMeanResidual': maximum_source_residual,
        'actualNewCompleteInteriorCentres': sum(p['previouslyBlockedNowCompleteRadius1'] for p in result['patches']),
        'originalCoefficientsFailActualRecovery': sum(p['originalCoefficientsWouldMismatchActualRecoveredSamples'] for p in result['patches']),
        'candidateChanges': 0, 'filterOrCoaddRuns': 0, 'sourceRequests': 0, 'independentReview': 'MISSING', 'ordinaryAdoption': False})
    print(json.dumps({'result': bind(OUT / 'result.json'), 'witnesses': len(records), 'maximumRawMeanResidual': maximum_source_residual}))


if __name__ == '__main__':
    try: main()
    except Exception as error:
        if OUT.exists(): save(OUT / 'failed.json', {'type': type(error).__name__, 'error': str(error)})
        raise
