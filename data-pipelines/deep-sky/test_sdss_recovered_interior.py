"""Complete interior dependency increment and honest unfinished exterior."""
import copy
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
from PIL import Image
import sdss_display_recovery as owner
from test_sdss_recovered_apertures import fixture
from test_sdss_gri_tan import ENTRY


class RecoveredInteriorTest(unittest.TestCase):
    def test_partitioned_dependency_increment_keeps_unaffected_and_exterior_exact(self):
        master,parent,recovery,sources=fixture()
        a=owner.refine_current_recovery_interior(master,parent,recovery,sources,chunk_rows=7,batch_size=5)
        b=owner.refine_current_recovery_interior(master,parent,recovery,sources,chunk_rows=64)
        self.assertTrue(a.affected.any())
        for band in 'gri':
            np.testing.assert_array_equal(a.estimates[band],b.estimates[band])
            np.testing.assert_array_equal(a.estimates[band][~a.affected],recovery.estimates[band][~a.affected])
            np.testing.assert_array_equal(a.estimates[band][:8],recovery.estimates[band][:8])
            np.testing.assert_array_equal(a.estimates[band][parent.protected],recovery.estimates[band][parent.protected])
        for key in ('qualified','radius','reached','protected','affected'):
            np.testing.assert_array_equal(getattr(a,key),getattr(b,key))
            self.assertFalse(getattr(a,key).flags.writeable)
        self.assertEqual(a.report['version'],owner.INTERIOR_CANDIDATE_VERSION)
        self.assertEqual(a.report['exteriorApertureProcessing'],'PENDING_REAL_SOURCE_WINDOW')
        self.assertTrue(a.report['interiorDependenciesCompleted'])
        self.assertEqual(a.report['wholeMasterFilterRuns'],0)

    def test_empty_unknown_or_same_run_supply_never_filters_or_rewrites_current(self):
        for options in ({'same_run':True},{'unknown_model':True},{'unknown_dates':True}):
            master,parent,recovery,sources=fixture(**options)
            with patch.object(owner,'refine_current_recovery_display_region',side_effect=AssertionError('empty dependency filtered')):
                result=owner.refine_current_recovery_interior(master,parent,recovery,sources)
            self.assertFalse(result.affected.any());self.assertEqual(result.report['dependencyDemandTargets'],0)
            for band in 'gri':np.testing.assert_array_equal(result.estimates[band],recovery.estimates[band])

    def test_frozen_lod_alpha_and_exclusive_candidate_do_not_claim_completed_exterior(self):
        master,parent,recovery,sources=fixture()
        result=owner.refine_current_recovery_interior(master,parent,recovery,sources)
        products=owner.recovered_aperture_products(master,result,ENTRY,output_pixels=10)
        baseline=owner.recovery_products(master,recovery,ENTRY,output_pixels=10)
        for level,(encoded,metadata) in products.items():
            np.testing.assert_array_equal(np.array(Image.open(io.BytesIO(encoded)))[:,:,3],np.array(Image.open(io.BytesIO(baseline[level][0])))[:,:,3])
            self.assertEqual(metadata['processingVersion'],owner.INTERIOR_CANDIDATE_VERSION)
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'candidate'
            report=owner.save_recovered_aperture_candidate(path,master,result,ENTRY,output_pixels=10)
            self.assertEqual(report['publication'],'OFFLINE_CANDIDATE_ONLY')
            self.assertFalse(report['adopted'])
            with self.assertRaises(FileExistsError):owner.save_recovered_aperture_candidate(path,master,result,ENTRY,output_pixels=10)
        for field,value in (('exteriorApertureProcessing','COMPLETE'),('sourceResolvedRecipe',{}),('interiorDependenciesCompleted',False)):
            forged=copy.deepcopy(result);forged.report[field]=value
            with self.assertRaises(RuntimeError):owner.recovered_aperture_products(master,forged,ENTRY,output_pixels=10)

    def test_cancellation_during_regions_returns_no_partial_candidate_and_invalid_chunks_reject(self):
        master,parent,recovery,sources=fixture();calls=[]
        def stop():calls.append(1);return len(calls)>12
        with self.assertRaisesRegex(RuntimeError,'cancelled'):
            owner.refine_current_recovery_interior(master,parent,recovery,sources,chunk_rows=7,cancelled=stop)
        for value in (0,257,True):
            with self.assertRaisesRegex(RuntimeError,'chunk'):
                owner.refine_current_recovery_interior(master,parent,recovery,sources,chunk_rows=value)


if __name__=='__main__':unittest.main()
