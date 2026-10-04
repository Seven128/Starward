"""Real out-of-crop recovered sources, shared geometry and exact saved overlap."""
import copy
import unittest
import numpy as np
import sdss_display_recovery as owner
import sdss_noise_display as noise
from sdss_adaptive_display import _display_support
from test_sdss_recovered_apertures import fixture


def outside_flags(sources):
    # Target rows 41..44 are beyond the crop and map to these real native rows.
    # No cached scientific/parent target row uses these flagged native samples.
    for name,bands in sources.items():
        if name.endswith('/1'):
            for source in bands.values(): source.flags.flags[4:7] = 1 << 1


class RecoveredHaloTest(unittest.TestCase):
    def test_real_external_cohort_keeps_cached_supply_and_actual_coefficients(self):
        master,parent,recovery,sources = fixture(); outside_flags(sources)
        region = slice(24,48),slice(-8,48)
        samples = owner.project_current_recovery_halo_region(master,parent,recovery,sources,region)
        local = slice(0,16),slice(8,48)
        np.testing.assert_array_equal(samples.alternative_supply[local],recovery.alternative_supply[24:40])
        raw = np.stack([master.bands[b].data[24:40] for b in 'gri'])
        expected = raw.copy(); old_supply = recovery.alternative_supply[24:40]
        expected[:,old_supply] = np.stack([recovery.estimates[b][24:40][old_supply] for b in 'gri'])
        np.testing.assert_array_equal(samples.values[:,local[0],local[1]],expected)
        outside = np.ones(samples.eligible.shape,bool); outside[local] = False
        self.assertTrue((samples.alternative_supply & outside).any())
        self.assertGreater(samples.report['outsideCropAlternativePixels'],0)
        q,_ = _display_support(samples.values,samples.eligible,list(samples.stencils.values()))
        self.assertTrue(q[samples.alternative_supply].all())
        for name,stencil in samples.stencils.items():
            active = stencil['weights'] > 0
            self.assertTrue((stencil['ids'][active] >= 0).all())
            np.testing.assert_allclose(stencil['weights'].sum(axis=1),
                np.broadcast_to(samples.normalized_weights[name],(3,*q.shape)),rtol=1e-14,atol=1e-15)
        self.assertFalse(samples.values.flags.writeable)
        self.assertEqual(samples.report['baselineRecoveryVersion'],owner.CURRENT_ADAPTIVE_VERSION)

    def test_existing_halo_tuple_uses_same_owned_real_window(self):
        master,parent,recovery,sources = fixture(); _,fields,weights = noise._qualified_sources(master,sources)
        region = slice(-8,16),slice(-8,48)
        view = noise._project_real_source_window(master,sources,fields,weights,region,lambda:None)
        values,eligible,stencils,detail = noise._project_real_halo_window(master,sources,fields,weights,region,lambda:None)
        np.testing.assert_array_equal(view.values,values); np.testing.assert_array_equal(view.eligible,eligible)
        self.assertEqual(view.report,detail); self.assertTrue(view.available.any())
        for a,b in zip(view.stencils.values(),stencils,strict=True):
            for key in a: np.testing.assert_array_equal(a[key],b[key])
        self.assertTrue((~view.available).any())

    def test_same_run_unknown_epoch_and_native_model_do_not_supply_exterior(self):
        for options in ({'same_run':True},{'unknown_dates':True},{'unknown_model':True}):
            master,parent,recovery,sources = fixture(**options); outside_flags(sources)
            samples = owner.project_current_recovery_halo_region(master,parent,recovery,sources,(slice(24,48),slice(-8,48)))
            self.assertFalse(samples.alternative_supply.any())

    def test_saved_overlap_science_and_weights_guard_actual_source_views(self):
        for mode in ('science','weight'):
            master,parent,recovery,sources = fixture()
            forged = copy.deepcopy(master)
            if mode == 'science': forged.mosaic_fields[next(iter(sources))]['g'].data[2,2] += .01
            else:
                names = list(sources); forged.mosaic_weights[names[0]][2,2] = .75; forged.mosaic_weights[names[1]][2,2] = .25
            _,fields,weights = noise._qualified_sources(forged,sources)
            with self.assertRaisesRegex(RuntimeError,'overlap_mismatch'):
                noise._project_real_source_window(forged,sources,fields,weights,(slice(-8,16),slice(-8,48)),lambda:None)

    def test_cancel_and_unbounded_or_nonoverlapping_windows_reject(self):
        master,parent,recovery,sources = fixture()
        with self.assertRaisesRegex(RuntimeError,'cancelled'):
            owner.project_current_recovery_halo_region(master,parent,recovery,sources,(slice(-8,16),slice(-8,48)),cancelled=lambda:True)
        for region in ((slice(-9,16),slice(-8,48)),(slice(-8,0),slice(-8,48)),(slice(-8,16),slice(0,49))):
            with self.assertRaisesRegex(RuntimeError,'halo_region_invalid'):
                owner.project_current_recovery_halo_region(master,parent,recovery,sources,region)


if __name__=='__main__': unittest.main()
