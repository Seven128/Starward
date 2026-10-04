"""Recovered raw source sampling, targeted common apertures and exact fallback."""
from dataclasses import replace
import copy
import unittest
from unittest.mock import patch
import numpy as np
import sdss_adaptive_display as adaptive
import sdss_display_recovery as owner
import sdss_gri_tan as gri
from image_quality import digest
from test_sdss_noise_display import source_frames
from test_sdss_gri_tan import ENTRY
from test_sdss_adaptive_display import model


def fixture(*, same_run=False, unknown_dates=False, unknown_model=False):
    frames, sources = source_frames(n=40, second=True)
    rng = np.random.default_rng(821)
    for name, bands in list(sources.items()):
        second = name.endswith('/2')
        for band, source in bands.items():
            source.frame.data[:] = rng.normal(dict(g=.004, r=-.006, i=.009)[band], .008, source.frame.data.shape)
            source.frame.wcs.wcs.crpix += [.23, .31]
            source.frame.receipt['asTrans'] = {'row': {} if unknown_dates else {'MJD': 20. if second else 10.}}
            if not second: source.flags.flags[28] = 1 << 1
            if second and not same_run:
                source.frame.receipt['identity']['run'] = 2
                source.flags.receipt['expectedIdentity']['run'] = 2
                bands[band] = replace(source, camera=replace(source.camera, identity=(2, '301', 1, 2, band)))
            if second and unknown_model: bands[band] = replace(bands[band], camera=None)
    # A real strong source in one signed channel must retain the whole colour.
    sources['301/1/1/1']['g'].frame.data[35:37, 20:22] = 3.
    if not same_run: sources['301/2/1/2'] = sources.pop('301/1/1/2')
    master = gri.build_mosaic_master(frames, ENTRY, 40, .1)
    parent = adaptive.refine_adaptive_real_halo(master, adaptive.render_adaptive_display_candidate(master, sources), sources)
    recovery = owner.recover_other_scan_display(master, parent, sources)
    return master, parent, recovery, sources


class RecoveredApertureTest(unittest.TestCase):
    def test_targeted_kernel_matches_full_policy_only_at_requested_centres(self):
        rng = np.random.default_rng(812); values = rng.normal(.1, .2, (3, 25, 25)).astype(np.float32)
        eligible = np.ones((25, 25), bool); stencil = model(25)
        targets = np.zeros((25, 25), bool); targets[10, 10] = targets[12, 13] = True
        full = adaptive.adaptive_common_display_batched(values, eligible, [stencil])
        targeted = adaptive.adaptive_common_display_batched(values, eligible, [stencil], targets=targets)
        np.testing.assert_array_equal(targeted.estimates[:, targets], full.estimates[:, targets])
        np.testing.assert_array_equal(targeted.radius[targets], full.radius[targets])
        np.testing.assert_array_equal(targeted.estimates[:, ~targets], values[:, ~targets])
        self.assertFalse(targeted.reached[~targets].any())
        for bad in (targets.astype(np.uint8), np.ones((25, 25), bool), np.zeros((24, 25), bool)):
            with self.assertRaisesRegex(RuntimeError, 'targets_invalid'):
                adaptive.adaptive_common_display_batched(values, eligible, [stencil], targets=bad)

    def test_actual_common_cohorts_coefficients_and_native_covariance(self):
        master, parent, recovery, sources = fixture()
        region = slice(0, 40), slice(0, 40)
        samples = owner.project_current_recovery_region(master, parent, recovery, sources, region)
        supply = samples.alternative_supply
        self.assertTrue(supply.any())
        raw = np.stack([master.bands[b].data for b in 'gri'])
        np.testing.assert_array_equal(samples.values[:, ~supply], raw[:, ~supply])
        np.testing.assert_array_equal(samples.values[:, supply], np.stack([recovery.estimates[b][supply] for b in 'gri']))
        self.assertFalse(samples.values.flags.writeable)
        reconstructed = sum(np.stack([master.mosaic_fields[name][b].data for b in 'gri']).astype(float) * w
            for name, w in samples.normalized_weights.items())
        np.testing.assert_allclose(reconstructed, samples.values, atol=2e-8, rtol=2e-7)
        self.assertGreater(np.count_nonzero(np.any(np.abs(raw - samples.values) > 1e-4, axis=0) & supply), 0)
        for name, stencil in samples.stencils.items():
            np.testing.assert_allclose(stencil['weights'].sum(axis=1), np.broadcast_to(samples.normalized_weights[name], (3,40,40)), rtol=1e-14, atol=1e-15)
        y, x = np.argwhere(supply & (np.indices(supply.shape)[0] >= 8) & (np.indices(supply.shape)[0] < 32)
            & (np.indices(supply.shape)[1] >= 8) & (np.indices(supply.shape)[1] < 32))[0]
        selected = np.zeros(supply.shape, bool); selected[y, x] = selected[y, x+1] = True
        from sdss_noise_aperture import aperture_variance_upper
        actual = aperture_variance_upper(list(samples.stencils.values()), selected)
        field_values = []
        for stencil in samples.stencils.values():
            variances = []
            for b in range(3):
                ids = stencil['ids'][b][:, selected].ravel(); c = stencil['weights'][b][:, selected].ravel()/2
                native = stencil['native_variance'][b][:, selected].ravel()
                variances.append(c @ np.where(ids[:, None] == ids[None, :], native[:, None], 0.) @ c)
            field_values.append(variances)
        expected = np.sqrt(field_values).sum(axis=0)**2
        np.testing.assert_allclose(actual, expected, atol=0, rtol=1e-14)

    def test_increment_uses_raw_samples_and_keeps_actual_unaffected_parent(self):
        master, parent, recovery, sources = fixture()
        original = {b: master.bands[b].data.copy() for b in 'gri'}
        target = slice(8, 32), slice(8, 32)
        result = owner.refine_current_recovery_display_region(master, parent, recovery, sources, target, batch_size=7)
        samples = owner.project_current_recovery_region(master, parent, recovery, sources, (slice(0,40),slice(0,40)))
        full = adaptive.adaptive_common_display_batched(samples.values, samples.eligible, list(samples.stencils.values()))
        self.assertGreater(int(result.affected.sum()), 0)
        self.assertGreater(result.report['changedEstimatePixels'], 0)
        for at, b in enumerate('gri'):
            np.testing.assert_array_equal(result.estimates[at][result.affected], full.estimates[at][target][result.affected])
            np.testing.assert_array_equal(result.estimates[at][~result.affected], recovery.estimates[b][target][~result.affected])
            np.testing.assert_array_equal(master.bands[b].data, original[b])
            np.testing.assert_array_equal(result.estimates[at][parent.protected[target]], recovery.estimates[b][target][parent.protected[target]])
        self.assertEqual(result.report['version'], owner.APERTURE_REGION_VERSION)
        # Taking already-filtered estimates as measurements changes this result.
        wrong = np.stack([recovery.estimates[b] for b in 'gri'])
        escaped = adaptive.adaptive_common_display_batched(wrong, samples.eligible, list(samples.stencils.values()))
        self.assertTrue(np.any(escaped.estimates[:,target[0],target[1]][:,result.affected] != result.estimates[:,result.affected]))

    def test_same_run_unknown_epoch_or_unavailable_model_has_no_increment(self):
        for options in ({'same_run': True}, {'unknown_dates': True}, {'unknown_model': True}):
            master, parent, recovery, sources = fixture(**options)
            result = owner.refine_current_recovery_display_region(master, parent, recovery, sources, (slice(8,32),slice(8,32)))
            self.assertFalse(result.affected.any())
            for at, band in enumerate('gri'):
                np.testing.assert_array_equal(result.estimates[at], recovery.estimates[band][8:32,8:32])

    def test_saved_supply_or_values_cannot_replace_actual_native_admission(self):
        for change in ('supply', 'mean', 'baseline', 'version'):
            master, parent, recovery, sources = fixture(); forged = copy.deepcopy(recovery)
            if change == 'supply':
                forged.alternative_supply.setflags(write=True); forged.alternative_supply[20,20] ^= True
                forged.report['alternativePixels'] = int(forged.alternative_supply.sum())
                forged.report['alternativeSupplyCOrderSha256'] = digest(forged.alternative_supply.tobytes())
            elif change == 'mean':
                forged.estimates['g'].setflags(write=True); forged.estimates['g'][forged.alternative_supply] += .005
                forged.report['displayEstimatesCOrderSha256']['g'] = digest(forged.estimates['g'].tobytes())
            elif change == 'baseline': forged.report['baselineEstimateCOrderSha256']['r'] = '0'*64
            else: forged.report['version'] = owner.VERSION
            with self.assertRaises(RuntimeError):
                owner.refine_current_recovery_display_region(master, parent, forged, sources, (slice(8,32),slice(8,32)))

    def test_parent_policy_and_processing_role_are_bound_before_projection(self):
        master,parent,recovery,sources=fixture()
        for key,value in (('adopted',True),('quality','ACCEPTED'),('independentReview','PASSED')):
            old=parent.report[key];parent.report[key]=value
            with patch.object(owner,'_project_field',side_effect=AssertionError('false parent role projected')):
                with self.assertRaisesRegex(RuntimeError,'parent_binding_invalid'):
                    owner.project_current_recovery_region(master,parent,recovery,sources,(slice(0,40),slice(0,40)))
            parent.report[key]=old
        recovery.report['baselineProcessingVersion']=adaptive.VERSION
        with patch.object(owner,'_project_field',side_effect=AssertionError('false processing version projected')):
            with self.assertRaisesRegex(RuntimeError,'parent_binding_invalid'):
                owner.project_current_recovery_region(master,parent,recovery,sources,(slice(0,40),slice(0,40)))

    def test_no_synthetic_crop_halo_and_cancelled_increment_has_no_partial(self):
        master, parent, recovery, sources = fixture()
        for target in ((slice(0,24),slice(8,32)), (slice(8,33),slice(8,32)), (slice(8,32,2),slice(8,32))):
            with patch.object(owner, '_project_field', side_effect=AssertionError('invalid crop admitted')):
                with self.assertRaisesRegex(RuntimeError, 'target_invalid'):
                    owner.refine_current_recovery_display_region(master, parent, recovery, sources, target)
        with self.assertRaisesRegex(RuntimeError, 'cancelled'):
            owner.refine_current_recovery_display_region(master, parent, recovery, sources, (slice(8,32),slice(8,32)), cancelled=lambda: True)


if __name__ == '__main__': unittest.main()
