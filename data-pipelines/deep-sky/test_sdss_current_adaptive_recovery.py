"""Current adaptive parents require actual recovery, not an invented old run."""
import copy
import io
import unittest
from unittest.mock import patch

import numpy as np
from PIL import Image
import sdss_adaptive_display as adaptive
import sdss_display_recovery as owner
import sdss_gri_tan as gri
from test_sdss_display_recovery import pair
from test_sdss_gri_tan import ENTRY


def fixture(**options):
    master, _, sources = pair(**options)
    for source in sources['301/1/1/1'].values():
        source.flags.flags[12:] = 0
    parent = adaptive.render_adaptive_display_candidate(master, sources)
    return master, adaptive.refine_adaptive_real_halo(master, parent, sources), sources


class CurrentAdaptiveRecoveryTest(unittest.TestCase):
    def test_real_supply_keeps_current_valid_structure_and_signed_channels(self):
        master, parent, sources = fixture()
        original = {b: master.bands[b].data.copy() for b in gri.BANDS}
        with (patch.object(owner, 'noise_display_pyramid', side_effect=AssertionError('invented fixed-noise execution')),
              patch.object(adaptive, 'adaptive_common_display_batched', side_effect=AssertionError('filter repeated'))):
            candidate = owner.recover_other_scan_display(master, parent, sources, chunk_rows=5)
        self.assertTrue(candidate.alternative_supply.any())
        self.assertFalse(candidate.alternative_supply[parent.qualified].any())
        self.assertEqual(candidate.report['version'], owner.CURRENT_ADAPTIVE_VERSION)
        self.assertEqual(candidate.report['baselineProcessingVersion'], adaptive.HALO_VERSION)
        self.assertEqual(candidate.report['baselineDiagnosticCOrderSha256'], parent.report['diagnosticCOrderSha256'])
        self.assertNotIn('savedSupplyProcessingVersion', candidate.report)
        for band, value in dict(g=0., r=-.02, i=.06).items():
            np.testing.assert_allclose(candidate.estimates[band][candidate.alternative_supply], value, atol=1e-8, rtol=0)
            np.testing.assert_array_equal(candidate.estimates[band][~candidate.alternative_supply], parent.estimates[band][~candidate.alternative_supply])
            np.testing.assert_array_equal(master.bands[band].data, original[band])
        products = owner.recovery_products(master, candidate, ENTRY, output_pixels=8)
        baseline = adaptive.adaptive_display_pyramid(master, parent, ENTRY, output_pixels=8)
        for level, (raw, meta) in products.items():
            np.testing.assert_array_equal(np.array(Image.open(io.BytesIO(raw)))[:, :, 3],
                np.array(Image.open(io.BytesIO(baseline[level][0])))[:, :, 3])
            self.assertEqual(meta['processingVersion'], owner.CURRENT_ADAPTIVE_VERSION)

    def test_same_run_unknown_dates_and_native_noise_keep_exact_parent(self):
        for options in ({'same_run': True}, {'unknown_dates': True}, {}):
            master, parent, sources = fixture(**options)
            if not options:
                for source in sources['301/2/1/2'].values():
                    source.frame.calibration_sky.allsky[:] = np.nan
            candidate = owner.recover_other_scan_display(master, parent, sources)
            self.assertFalse(candidate.alternative_supply.any())
            for band in gri.BANDS:
                np.testing.assert_array_equal(candidate.estimates[band], parent.estimates[band])

    def test_parent_hash_diagnostics_recipe_and_identity_reject_before_source_projection(self):
        for change in ('estimate', 'diagnostic', 'recipe', 'target'):
            master, parent, sources = fixture()
            if change == 'estimate':
                parent.estimates['g'].setflags(write=True); parent.estimates['g'][10, 10] += .1
            elif change == 'diagnostic':
                parent.qualified.setflags(write=True); parent.qualified[10, 10] ^= True
            elif change == 'recipe':
                parent.report['sourceResolvedRecipe']['stretch'] *= 2
            else:
                parent.report['objectRef'] = 'M:82'
            with patch.object(owner, '_project_field', side_effect=AssertionError('invalid parent consumed')):
                with self.assertRaises(RuntimeError):
                    owner.recover_other_scan_display(master, parent, sources)

    def test_qualified_parent_fallback_cannot_be_rewritten_with_new_estimate_hash(self):
        master, parent, sources = fixture()
        from image_quality import digest
        y, x = np.argwhere(~parent.qualified)[0]
        parent.estimates['g'].setflags(write=True); parent.estimates['g'][y, x] += .1
        parent.report['displayEstimatesCOrderSha256']['g'] = digest(parent.estimates['g'].tobytes())
        with self.assertRaisesRegex(RuntimeError, 'fallback_invalid'):
            owner.recover_other_scan_display(master, parent, sources)

    def test_cancelled_current_run_returns_no_partial_candidate(self):
        master, parent, sources = fixture(); calls = []
        def stop():
            calls.append(1); return len(calls) > 4
        with self.assertRaisesRegex(RuntimeError, 'cancelled'):
            owner.recover_other_scan_display(master, parent, sources, chunk_rows=4, cancelled=stop)

    def test_overlapping_scan_epochs_do_not_supply_independent_recovery(self):
        master, parent, sources = fixture()
        for source in sources['301/2/1/2'].values():
            source.frame.receipt['asTrans']['row']['MJD'] = 10.
        candidate = owner.recover_other_scan_display(master, parent, sources)
        self.assertFalse(candidate.alternative_supply.any())
        for band in gri.BANDS:
            np.testing.assert_array_equal(candidate.estimates[band], parent.estimates[band])

    def test_current_processing_cannot_be_exported_as_saved_historical_supply(self):
        master, parent, sources = fixture()
        candidate = owner.recover_other_scan_display(master, parent, sources)
        for field, value in (('savedSupplyProcessingVersion', owner.VERSION),
                             ('baselineQualifiedCOrderSha256', '0' * 64),
                             ('baselineProcessingVersion', 'invented-fixed-noise-parent'),
                             ('recoveryExecutionKind', 'SAVED_SUPPLY_REUSED')):
            changed = copy.deepcopy(candidate); changed.report[field] = value
            with self.assertRaisesRegex(RuntimeError, 'current_adaptive_policy_invalid'):
                owner.recovery_products(master, changed, ENTRY, output_pixels=8)


if __name__ == '__main__':
    unittest.main()
