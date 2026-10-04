"""Alternate scan semantics, source qualification and saved consumer checks."""
import copy
from dataclasses import replace
import inspect
import io
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

import numpy as np
from PIL import Image
import sdss_gri_tan as gri
import sdss_noise_display as noise
import sdss_display_recovery as owner
from test_sdss_noise_display import source_frames
from test_sdss_gri_tan import ENTRY


def pair(*,same_run=False,unknown_dates=False):
    frames,sources=source_frames(second=True)
    # First observation carries known artifacts, second has real black/negative
    # values that must not be mistaken for missing alternate supply.
    for b in gri.BANDS:
        a=sources['301/1/1/1'][b];a.frame.data[:]=.8;a.flags.flags[:]=1<<1
        a.frame.receipt['asTrans']={'row':{'MJD':10.}}
        z=sources['301/1/1/2'][b];z.frame.data[:]=dict(g=0.,r=-.02,i=.06)[b]
        z.frame.receipt['asTrans']={'row':{} if unknown_dates else {'MJD':20.}}
        if not same_run:
            z.frame.receipt['identity']['run']=2;z.flags.receipt['expectedIdentity']['run']=2
            z=sources['301/1/1/2'][b]=noise.NoiseDisplaySource(z.frame,replace(z.camera,identity=(2,'301',1,2,b)),z.flags)
    if not same_run:sources['301/2/1/2']=sources.pop('301/1/1/2')
    master=gri.build_mosaic_master(frames,ENTRY,32,.1)
    initial=noise.render_noise_display_candidate(master,sources)
    return master,initial,sources


class RecoveryTest(unittest.TestCase):
    def test_real_other_scan_renormalizes_common_signed_channels_and_preserves_parents(self):
        master,initial,sources=pair();before={b:master.bands[b].data.copy() for b in gri.BANDS}
        a=owner.recover_other_scan_display(master,initial,sources,chunk_rows=5)
        z=owner.recover_other_scan_display(master,initial,sources,chunk_rows=13)
        self.assertTrue(a.alternative_supply.any());self.assertFalse(initial.processable.any())
        for b,value in dict(g=0.,r=-.02,i=.06).items():
            np.testing.assert_allclose(a.estimates[b][a.alternative_supply],value,rtol=0,atol=1e-8)
            np.testing.assert_array_equal(a.estimates[b],z.estimates[b]);np.testing.assert_array_equal(master.bands[b].data,before[b])
            self.assertFalse(a.estimates[b].flags.writeable)
        products=owner.recovery_products(master,a,ENTRY,output_pixels=8)
        original=noise.noise_display_pyramid(master,initial,ENTRY,output_pixels=8)
        for level,(raw,meta) in products.items():
            image=np.asarray(Image.open(io.BytesIO(raw)));old=np.asarray(Image.open(io.BytesIO(original[level][0])))
            np.testing.assert_array_equal(image[:,:,3],old[:,:,3]);self.assertEqual(meta['processingVersion'],owner.VERSION)
            self.assertEqual(meta['statisticalFitCalls'],0)
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/'candidate';r=owner.save_recovery_candidate(out,master,a,ENTRY,output_pixels=8)
            self.assertEqual(r['publication'],'OFFLINE_CANDIDATE_ONLY')
            with self.assertRaises(FileExistsError):owner.save_recovery_candidate(out,master,a,ENTRY,output_pixels=8)

    def test_same_run_unknown_dates_and_unknown_or_all_flagged_sources_keep_original(self):
        for option in ({'same_run':True},{'unknown_dates':True},{}):
            master,initial,sources=pair(**option)
            if not option:
                z=sources['301/2/1/2']['g'];sources['301/2/1/2']['g']=noise.NoiseDisplaySource(z.frame,None,z.flags)
            a=owner.recover_other_scan_display(master,initial,sources)
            self.assertFalse(a.alternative_supply.any())
            for b in gri.BANDS:np.testing.assert_array_equal(a.estimates[b],initial.estimates[b])
        master,initial,sources=pair()
        for z in sources['301/2/1/2'].values():z.flags.flags[:]=1<<9
        a=owner.recover_other_scan_display(master,initial,sources);self.assertFalse(a.alternative_supply.any())

    def test_partial_missing_samples_and_zero_unknown_contributor_keep_meaning(self):
        _,_,sources=pair()
        for group in sources.values():
            for z in group.values():
                z.frame.wcs.wcs.crpix-=[12,12]
                z.frame.data[10:13,10:13]=np.nan
        outside={}
        for b,z in sources['301/2/1/2'].items():
            f=copy.deepcopy(z.frame);f.wcs.wcs.crpix+=[1000,1000]
            f.receipt['identity']['field']=3
            outside[b]=noise.NoiseDisplaySource(f,None,None)
        sources['301/2/1/3']=outside
        frames=[z.frame for group in sources.values() for z in group.values()]
        master=gri.build_mosaic_master(frames,ENTRY,32,.1)
        initial=noise.render_noise_display_candidate(master,sources)
        recovered=owner.recover_other_scan_display(master,initial,sources,chunk_rows=7)
        self.assertTrue(recovered.alternative_supply.any())
        self.assertFalse(master.joint_available.all())
        self.assertFalse(recovered.alternative_supply[~master.joint_available].any())
        for b in gri.BANDS:
            self.assertTrue(np.isnan(recovered.estimates[b][~master.joint_available]).all())
        original=noise.noise_display_pyramid(master,initial,ENTRY,output_pixels=8)
        for level,(raw,_) in owner.recovery_products(master,recovered,ENTRY,output_pixels=8).items():
            image=np.asarray(Image.open(io.BytesIO(raw)))
            old=np.asarray(Image.open(io.BytesIO(original[level][0])))
            np.testing.assert_array_equal(image[:,:,3],old[:,:,3])
            self.assertTrue((image[:,:,3]<255).any())

    def test_flag_clean_but_nonfinite_native_sky_coordinates_remain_unknown(self):
        master,initial,sources=pair()
        for z in sources['301/2/1/2'].values():
            x=z.frame.calibration_sky.xinterp.copy();x[:20]=np.nan
            z.frame.calibration_sky=replace(z.frame.calibration_sky,xinterp=x)
        recovered=owner.recover_other_scan_display(master,initial,sources)
        self.assertTrue(recovered.alternative_supply.any())
        self.assertGreater(recovered.report['flagOnlyRejectedByNativeQualification'],0)
        self.assertGreater(recovered.report['flagOnlyAlternativePixels'],recovered.report['alternativePixels'])
        for b in gri.BANDS:
            np.testing.assert_array_equal(recovered.estimates[b][~recovered.alternative_supply],initial.estimates[b][~recovered.alternative_supply])

    def test_provider_constant_sky_edge_is_qualified_without_science_changes(self):
        master,initial,sources=pair()
        baseline=owner.recover_other_scan_display(master,initial,sources)
        parents={b:master.bands[b].data.copy() for b in gri.BANDS}
        for z in sources['301/2/1/2'].values():
            # The fixture has constant retained SKY; finite edge coordinates
            # therefore reconstruct exactly the same sky and native variance.
            x=z.frame.calibration_sky.xinterp.copy();x[:20]=10.
            z.frame.calibration_sky=replace(z.frame.calibration_sky,xinterp=x)
        recovered=owner.recover_other_scan_display(master,initial,sources)
        np.testing.assert_array_equal(recovered.alternative_supply,baseline.alternative_supply)
        self.assertEqual(recovered.report['flagOnlyRejectedByNativeQualification'],0)
        for b in gri.BANDS:
            np.testing.assert_array_equal(recovered.estimates[b],baseline.estimates[b])
            np.testing.assert_array_equal(master.bands[b].data,parents[b])

    def test_unknown_bad_scan_processing_id_cannot_authorize_recovery(self):
        master,initial,sources=pair()
        for z in sources['301/1/1/1'].values():
            z.flags.receipt['actualPrimaryIdentity']['PS_ID']=None
        repaired=owner.recover_other_scan_display(master,initial,sources)
        self.assertFalse(repaired.alternative_supply.any())
        code=inspect.getsource(owner._project_scan_samples)
        guard=" and\n                    source.flags.receipt['actualPrimaryIdentity'].get('PS_ID') is not None"
        self.assertIn(guard,code);code=code.replace(guard,'')
        namespace=dict(owner.__dict__);exec(code,namespace)
        with patch.object(owner,'_project_scan_samples',namespace['_project_scan_samples']):
            escaped=owner.recover_other_scan_display(master,initial,sources)
        self.assertTrue(escaped.alternative_supply.any())

    def test_changed_frozen_recipe_cannot_relabel_saved_estimates(self):
        master,initial,sources=pair();candidate=owner.recover_other_scan_display(master,initial,sources)
        original=owner.recovery_products(master,candidate,ENTRY,output_pixels=8)
        recipe=master.report['display']['transfer']
        recipe['stretch']*=2;recipe['requestedParameters']['stretch']=recipe['stretch']
        with self.assertRaisesRegex(RuntimeError,'recipe_changed'):
            owner.recovery_products(master,candidate,ENTRY,output_pixels=8)
        code=inspect.getsource(owner._validate_recovery_candidate)
        code=code.replace("    if candidate.report.get('sourceResolvedRecipe')!=master.report.get('display',{}).get('transfer'):\n        raise RuntimeError('sdss_display_recovery_recipe_changed')\n",'')
        namespace=dict(owner.__dict__);exec(code,namespace)
        with patch.object(owner,'_validate_recovery_candidate',namespace['_validate_recovery_candidate']):
            escaped=owner.recovery_products(master,candidate,ENTRY,output_pixels=8)
        self.assertNotEqual(original['OVERVIEW'][0],escaped['OVERVIEW'][0])

    def test_changed_identity_parent_and_cancellation_reject(self):
        master,initial,sources=pair();a=owner.recover_other_scan_display(master,initial,sources)
        bad=copy.deepcopy(ENTRY);bad['objectRef']='M:82'
        with self.assertRaisesRegex(RuntimeError,'identity'):owner.recovery_products(master,a,bad,output_pixels=8)
        master.bands['g'].data[0,0]+=.1
        with self.assertRaisesRegex(RuntimeError,'parent_changed'):owner.recovery_products(master,a,ENTRY,output_pixels=8)
        master,initial,sources=pair()
        with self.assertRaisesRegex(RuntimeError,'cancelled'):owner.recover_other_scan_display(master,initial,sources,cancelled=lambda:True)
        calls=[]
        def stop():calls.append(1);return len(calls)>5
        with self.assertRaisesRegex(RuntimeError,'cancelled'):owner.recover_other_scan_display(master,initial,sources,cancelled=stop,chunk_rows=4)

    def test_missing_distinct_scan_guard_mutation_recovers_same_observation_incorrectly(self):
        master,initial,sources=pair(same_run=True)
        # Without separating actual RUN, two repeated field copies can become a
        # false alternate exposure. Mutate grouping and temporal identity checks.
        code=inspect.getsource(owner._scan_groups)
        code=code.replace("run=sources[name][BANDS[0]].frame.receipt['identity']['run']", "run=int(name.split('/')[-1])")
        namespace=dict(owner.__dict__);exec(code,namespace)
        with patch.object(owner,'_scan_groups',namespace['_scan_groups']):
            incorrect=owner.recover_other_scan_display(master,initial,sources)
        self.assertTrue(incorrect.alternative_supply.any())
        self.assertFalse(owner.recover_other_scan_display(master,initial,sources).alternative_supply.any())


if __name__=='__main__':unittest.main()
