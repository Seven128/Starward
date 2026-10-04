"""Complete actual recovered apertures without repeating the saved interior."""
import copy
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
from PIL import Image
import sdss_display_recovery as owner
import sdss_adaptive_display as adaptive
from test_sdss_recovered_apertures import fixture
from test_sdss_recovered_halo import outside_flags
from test_sdss_gri_tan import ENTRY


def inputs(**options):
    master,parent,recovery,sources=fixture(**options)
    interior=owner.refine_current_recovery_interior(master,parent,recovery,sources)
    outside_flags(sources)
    return master,parent,recovery,interior,sources


class RecoveredCompleteTest(unittest.TestCase):
    def test_new_external_dependencies_change_only_perimeter_and_saved_internal_is_exact(self):
        master,parent,recovery,interior,sources=inputs()
        with patch.object(owner,'refine_current_recovery_interior',side_effect=AssertionError('interior rerun')):
            full=owner.refine_current_recovery_real_halo(master,parent,recovery,interior,sources,batch_size=5)
        perimeter=np.ones((40,40),bool);perimeter[8:-8,8:-8]=False
        new=full.affected&perimeter;self.assertTrue(new.any())
        self.assertTrue(any(np.any(full.estimates[b][perimeter]!=interior.estimates[b][perimeter]) for b in 'gri'))
        for b in 'gri':
            np.testing.assert_array_equal(full.estimates[b][~perimeter],interior.estimates[b][~perimeter])
            np.testing.assert_array_equal(full.estimates[b][~new],interior.estimates[b][~new])
            np.testing.assert_array_equal(full.estimates[b][parent.protected],interior.estimates[b][parent.protected])
        for key in ('qualified','radius','reached','protected','affected'):
            np.testing.assert_array_equal(getattr(full,key)[~perimeter],getattr(interior,key)[~perimeter])
        self.assertEqual(full.report['version'],owner.HALO_CANDIDATE_VERSION)
        self.assertEqual(full.report['exteriorApertureProcessing'],'COMPLETE_REAL_SOURCE_WINDOW')
        self.assertEqual(full.report['wholeMasterFilterRuns'],0)

    def test_saved_new_targets_match_existing_raw_native_common_policy(self):
        master,parent,recovery,interior,sources=inputs()
        result=owner.refine_current_recovery_real_halo(master,parent,recovery,interior,sources)
        checked=0
        for edge in result.report['edgeRegions']:
            x0,y0,x1,y1=edge['sampling']['supportBoundsXYExclusive'];tx0,ty0,tx1,ty1=edge['targetBoundsXYExclusive']
            source=owner.project_current_recovery_halo_region(master,parent,recovery,sources,(slice(y0,y1),slice(x0,x1)))
            actual=adaptive.adaptive_common_display_batched(source.values,source.eligible,list(source.stencils.values()))
            local=slice(ty0-y0,ty1-y0),slice(tx0-x0,tx1-x0);target=slice(ty0,ty1),slice(tx0,tx1)
            chosen=result.affected[target];checked+=int(chosen.sum())
            for at,b in enumerate('gri'):
                np.testing.assert_array_equal(result.estimates[b][target][chosen],actual.estimates[at][local][chosen])
            np.testing.assert_array_equal(result.radius[target][chosen],actual.radius[local][chosen])
            np.testing.assert_array_equal(result.reached[target][chosen],actual.reached[local][chosen])
        self.assertGreater(checked,0)

    def test_same_run_unknown_date_or_model_keep_current_candidate_estimates(self):
        for options in ({'same_run':True},{'unknown_dates':True},{'unknown_model':True}):
            master,parent,recovery,interior,sources=inputs(**options)
            full=owner.refine_current_recovery_real_halo(master,parent,recovery,interior,sources)
            self.assertEqual(full.report['edgeAffectedTargets'],0)
            for b in 'gri':np.testing.assert_array_equal(full.estimates[b],interior.estimates[b])

    def test_parent_processing_lineage_and_policy_are_admitted_before_projection(self):
        master,parent,recovery,interior,sources=inputs()
        for key,value in (('baselineSupplyCOrderSha256','0'*64),('baselineAdaptiveVersion','wrong'),
            ('baselineRecoveryEstimateCOrderSha256',{}),('adopted',True),('version','wrong')):
            forged=copy.deepcopy(interior);forged.report[key]=value
            with patch.object(owner,'project_current_recovery_halo_region',side_effect=AssertionError('forged parent projected')):
                with self.assertRaises(RuntimeError):owner.refine_current_recovery_real_halo(master,parent,recovery,forged,sources)

    def test_cancel_and_frozen_lod_export_do_not_publish_or_rewrite_parent(self):
        master,parent,recovery,interior,sources=inputs();calls=[]
        def stop():calls.append(1);return len(calls)>14
        with self.assertRaisesRegex(RuntimeError,'cancelled'):
            owner.refine_current_recovery_real_halo(master,parent,recovery,interior,sources,cancelled=stop)
        full=owner.refine_current_recovery_real_halo(master,parent,recovery,interior,sources)
        products=owner.recovered_aperture_products(master,full,ENTRY,output_pixels=10)
        old=owner.recovered_aperture_products(master,interior,ENTRY,output_pixels=10)
        for level,(encoded,metadata) in products.items():
            np.testing.assert_array_equal(np.array(Image.open(io.BytesIO(encoded)))[:,:,3],np.array(Image.open(io.BytesIO(old[level][0])))[:,:,3])
            self.assertEqual(metadata['processingVersion'],owner.HALO_CANDIDATE_VERSION)
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'candidate';report=owner.save_recovered_aperture_candidate(path,master,full,ENTRY,output_pixels=10)
            self.assertFalse(report['adopted']);self.assertEqual(report['publication'],'OFFLINE_CANDIDATE_ONLY')
            with self.assertRaises(FileExistsError):owner.save_recovered_aperture_candidate(path,master,full,ENTRY,output_pixels=10)
        for key,value in (('exteriorApertureProcessing','PENDING_REAL_SOURCE_WINDOW'),('interiorExact',False),('sourceResolvedRecipe',{})):
            forged=copy.deepcopy(full);forged.report[key]=value
            with self.assertRaises(RuntimeError):owner.recovered_aperture_products(master,forged,ENTRY,output_pixels=10)


if __name__=='__main__':unittest.main()
