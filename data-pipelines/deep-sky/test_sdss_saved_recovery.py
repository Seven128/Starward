"""Pinned alternative supply must preserve the latest valid display parent."""
import copy,inspect,io,json,unittest
from unittest.mock import patch
import numpy as np
from PIL import Image
import sdss_display_recovery as owner
import sdss_adaptive_display as adaptive
import sdss_noise_display as noise
import sdss_gri_tan as gri
from sdss_noise_display_provenance import build_noise_display_provenance,canonical_bytes
from image_quality import digest
from test_sdss_display_recovery import pair
from test_sdss_gri_tan import ENTRY


def fixture():
    master,old,sources=pair()
    # Real known bad area plus an independently valid area on the same master.
    for z in sources['301/1/1/1'].values():z.flags.flags[12:]=0
    old=noise.render_noise_display_candidate(master,sources)
    saved=owner.recover_other_scan_display(master,old,sources)
    parent=adaptive.render_adaptive_display_candidate(master,sources)
    parent=adaptive.refine_adaptive_real_halo(master,parent,sources)
    provenance={'kind':'CURRENT_RECOVERY_EXECUTION_WITH_PINNED_OLD_NOISE_PARENT',
        'recoveryReport':copy.deepcopy(saved.report),'currentInputSnapshot':build_noise_display_provenance(master,sources)}
    # The original evidence is persisted JSON, including tuple -> list values.
    provenance=json.loads(canonical_bytes(provenance))
    return master,parent,sources,saved,provenance


def rebase(master,parent,sources,saved,provenance,**options):
    return owner.rebase_saved_other_scan_display(master,parent,sources,saved,provenance,
        expected_saved_report_sha256=digest(canonical_bytes(saved.report)),
        expected_provenance_sha256=digest(canonical_bytes(provenance)),**options)


class SavedRecoveryTest(unittest.TestCase):
    def test_signed_supply_and_current_valid_values_without_reprojection_or_filter(self):
        m,parent,sources,saved,provenance=fixture()
        before={b:parent.estimates[b].copy() for b in gri.BANDS}
        with (patch.object(owner,'_project_field',side_effect=AssertionError('old recovery rerun')),
             patch.object(adaptive,'adaptive_common_display_batched',side_effect=AssertionError('filter rerun'))):
            a=rebase(m,parent,sources,saved,provenance,chunk_rows=5)
            z=rebase(m,parent,sources,saved,provenance,chunk_rows=13)
        self.assertTrue(a.alternative_supply.any());self.assertTrue(parent.qualified.any())
        self.assertFalse(a.alternative_supply[parent.qualified].any())
        for b in gri.BANDS:
            np.testing.assert_array_equal(a.estimates[b][a.alternative_supply],saved.estimates[b][a.alternative_supply])
            np.testing.assert_array_equal(a.estimates[b][~a.alternative_supply],before[b][~a.alternative_supply])
            np.testing.assert_array_equal(a.estimates[b],z.estimates[b]);np.testing.assert_array_equal(parent.estimates[b],before[b])
        for b,value in dict(g=0.,r=-.02,i=.06).items():
            np.testing.assert_allclose(a.estimates[b][a.alternative_supply],value,rtol=0,atol=1e-8)
        products=owner.recovery_products(m,a,ENTRY,output_pixels=8)
        original=adaptive.adaptive_display_pyramid(m,parent,ENTRY,output_pixels=8)
        for level,(raw,meta) in products.items():
            np.testing.assert_array_equal(np.asarray(Image.open(io.BytesIO(raw)))[:,:,3],
                np.asarray(Image.open(io.BytesIO(original[level][0])))[:,:,3])
            self.assertEqual(meta['processingVersion'],owner.REBASE_VERSION)
        self.assertEqual(a.report['baselineDiagnosticCOrderSha256'],parent.report['diagnosticCOrderSha256'])

    def test_input_epoch_flags_and_native_model_changes_reject_saved_supply(self):
        for change in ('date','flags','model','weight'):
            m,parent,sources,saved,provenance=fixture()
            source=sources['301/2/1/2']['g']
            if change=='date':source.frame.receipt['asTrans']['row']['MJD']+=1
            elif change=='flags':source.flags.flags[10,10]=1<<9
            elif change=='model':source.frame.calibration_sky.allsky[0,0]+=.01
            else:
                m.mosaic_weights['301/2/1/2'][10,10]+=.01
                m.mosaic_weights['301/1/1/1'][10,10]-=.01
            with self.assertRaisesRegex(RuntimeError,'source_inputs_changed'):
                rebase(m,parent,sources,saved,provenance)

    def test_pins_supply_parent_and_policy_changes_reject(self):
        m,parent,sources,saved,provenance=fixture()
        with self.assertRaisesRegex(RuntimeError,'saved_execution_changed'):
            owner.rebase_saved_other_scan_display(m,parent,sources,saved,provenance,
                expected_saved_report_sha256='0'*64,expected_provenance_sha256=digest(canonical_bytes(provenance)))
        saved.alternative_supply.setflags(write=True);saved.alternative_supply[0,0]=~saved.alternative_supply[0,0]
        with self.assertRaisesRegex(RuntimeError,'identity_invalid'):rebase(m,parent,sources,saved,provenance)
        m,parent,sources,saved,provenance=fixture();parent.qualified.setflags(write=True);parent.qualified[0,0]=~parent.qualified[0,0]
        with self.assertRaisesRegex(RuntimeError,'diagnostic_changed'):rebase(m,parent,sources,saved,provenance)
        m,parent,sources,saved,provenance=fixture();a=rebase(m,parent,sources,saved,provenance)
        a.report['supplyProjectionRuns']=1
        with self.assertRaisesRegex(RuntimeError,'rebase_policy_invalid'):owner.recovery_products(m,a,ENTRY,output_pixels=8)

    def test_removing_source_guard_reuses_stale_epoch_supply(self):
        m,parent,sources,saved,provenance=fixture()
        sources['301/2/1/2']['g'].frame.receipt['asTrans']['row']['MJD']+=1
        with self.assertRaisesRegex(RuntimeError,'source_inputs_changed'):
            rebase(m,parent,sources,saved,provenance)
        code=inspect.getsource(owner.rebase_saved_other_scan_display)
        guard="    if any(canonical_bytes(current[k])!=canonical_bytes(old.get(k)) for k in ('schemaVersion','master','fields')):\n        raise RuntimeError('sdss_display_recovery_source_inputs_changed')\n"
        self.assertIn(guard,code);namespace=dict(owner.__dict__);exec(code.replace(guard,''),namespace)
        with patch.object(owner,'rebase_saved_other_scan_display',namespace['rebase_saved_other_scan_display']):
            escaped=rebase(m,parent,sources,saved,provenance)
        self.assertTrue(escaped.alternative_supply.any())

    def test_cancel_between_chunks_returns_no_partial_candidate_or_parent_mutation(self):
        m,parent,sources,saved,provenance=fixture();before={b:parent.estimates[b].copy() for b in gri.BANDS}
        calls=[]
        def stop():calls.append(1);return len(calls)>6
        with self.assertRaisesRegex(RuntimeError,'cancelled'):
            rebase(m,parent,sources,saved,provenance,chunk_rows=4,cancelled=stop)
        self.assertGreater(len(calls),6)
        for b in gri.BANDS:np.testing.assert_array_equal(parent.estimates[b],before[b])


if __name__=='__main__':unittest.main()
