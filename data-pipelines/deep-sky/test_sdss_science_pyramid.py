"""Signed scientific means, supply and frozen display ordering regressions."""
import copy
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
from PIL import Image
import sdss_gri_tan as owner
from test_sdss_gri_tan import ENTRY, frame


class SciencePyramidTest(unittest.TestCase):
    def master(self, data, joint=None, transfer=owner.FixedDisplayTransfer(stretch=.5, Q=10)):
        n=data.shape[0];target=owner.target_tan(ENTRY['center'],n,.1)
        joint=np.ones(data.shape,dtype=np.bool_) if joint is None else joint.copy()
        bands={}
        for band in owner.BANDS:
            receipt=frame(band,target,data).receipt
            bands[band]=owner.ProjectedBand(data.astype(np.float32).copy(),np.ones(data.shape,dtype=np.bool_),
                joint.copy(),{'sourceReceipt':receipt})
        rgb,recipe=owner.make_rgb_display(bands,joint,transfer=transfer)
        return owner.GriMaster(target,bands,joint,rgb,{'version':owner.VERSION,'fieldDegrees':.1,
            'display':{'transfer':recipe}})

    def pixels(self, product): return np.array(Image.open(io.BytesIO(product[0])))

    def test_signed_noise_cancels_before_display_and_weak_positive_signal_remains(self):
        noise=np.tile(np.array([[-.03,.03],[.03,-.03]],dtype=np.float32),(16,16))
        master=self.master(noise)
        legacy=self.pixels(owner.pyramid(master,ENTRY,output_pixels=8)['OVERVIEW'])
        actual=self.pixels(owner.science_mean_pyramid(master,ENTRY,output_pixels=8)['OVERVIEW'])
        self.assertGreater(legacy[:,:,:3].max(),0,'counterfactual RGB-first order leaves a positive display pedestal')
        self.assertTrue((actual[:,:,:3]==0).all())
        self.assertTrue((actual[:,:,3]==255).all(),'zero mean remains available science')
        weak=self.master(noise+.02)
        weak_rgb=self.pixels(owner.science_mean_pyramid(weak,ENTRY,output_pixels=8)['OVERVIEW'])[:,:,:3]
        expected=self.master(np.full((32,32),.02,dtype=np.float32)).rgb[0,0]
        self.assertTrue(np.all(weak_rgb==expected))
        self.assertGreater(weak_rgb.min(),0)

    def test_partial_area_ignores_unavailable_nonfinite_or_bright_values_and_keeps_valid_black(self):
        joint=np.zeros((32,32),dtype=np.bool_);joint[0,:2]=True
        data=np.full(joint.shape,np.nan,dtype=np.float32);data[0,:2]=[-.02,.02]
        master=self.master(data,joint);before=[v.data.copy() for v in master.bands.values()]
        products=owner.science_mean_pyramid(master,ENTRY,output_pixels=8)
        ov=self.pixels(products['OVERVIEW']);meta=products['OVERVIEW'][1]
        self.assertEqual(ov[0,0].tolist(),[0,0,0,32],'two signed valid samples average to available black, area 2/16')
        self.assertEqual(meta['scienceMeans']['availablePixels'],1)
        self.assertEqual(meta['scienceMeans']['partialPixels'],1)
        self.assertTrue((self.pixels(products['DETAIL'])==0).all(),'an empty fine crop is unavailable, not opaque black')
        for band,value in master.bands.items(): value.data[~joint]=np.inf if band=='g' else 1e30
        changed=owner.science_mean_pyramid(master,ENTRY,output_pixels=8)
        self.assertTrue(all(products[level][0]==changed[level][0] for level in owner.LEVELS))
        for value,original in zip(master.bands.values(),before):
            self.assertTrue(np.array_equal(value.data[joint],original[joint]))

    def test_available_negative_mean_is_not_reclassified_as_missing(self):
        master=self.master(np.full((32,32),-.02,dtype=np.float32))
        products=owner.science_mean_pyramid(master,ENTRY,output_pixels=8)
        rgba=self.pixels(products['OVERVIEW'])
        self.assertTrue((rgba[:,:,:3]==0).all() and (rgba[:,:,3]==255).all())
        self.assertEqual(products['OVERVIEW'][1]['scienceMeans']['perBand']['g']['availableNegativeMeans'],64)
        self.assertTrue((master.bands['g'].data<0).all())

    def test_whole_master_fit_is_frozen_and_geometry_and_fine_pixels_match_old_path(self):
        y,x=np.mgrid[:64,:64];data=(.01+x*.003+y*.007).astype(np.float32);data[:8]+=20
        master=self.master(data,transfer=owner.WholeMasterZscaleTransfer())
        before=copy.deepcopy(master.report);old=owner.pyramid(master,ENTRY,output_pixels=16)
        with patch.object(owner,'LuptonAsinhZscaleStretch',side_effect=AssertionError('crop fit')), \
             patch.object(owner,'ZScaleInterval',side_effect=AssertionError('crop statistics')):
            products=owner.science_mean_pyramid(master,ENTRY,output_pixels=16)
        self.assertEqual(old['DETAIL'][0],products['DETAIL'][0])
        for level in owner.LEVELS:
            for key in ('fieldDegrees','wcsHeader','crpixFitsOneBased','scienceCrop'):
                self.assertEqual(old[level][1][key],products[level][1][key])
            self.assertEqual(products[level][1]['displayRecipe']['sourceWholeMasterRecipe'],before['display']['transfer'])
            self.assertEqual(products[level][1]['displayRecipe']['statisticalFitCalls'],0)
        products['OVERVIEW'][1]['displayRecipe']['sourceWholeMasterRecipe']['stretch']=100
        self.assertEqual(master.report,before)

    def test_invalid_unit_coherence_nonfinite_recipe_and_empty_source_fail_at_owner(self):
        def bad_unit(m): m.bands['g'].report['sourceReceipt']['scientificSamples']['unit']='ELECTRONS'
        def bad_calibration(m): m.bands['g'].report['sourceReceipt']['scientificSamples']['skyAlreadySubtracted']=False
        def bad_mask(m): m.bands['g'].finite_neighbors[0,0]=False
        def bad_data(m): m.bands['g'].data[0,0]=np.inf
        def bad_recipe(m): m.report['display']['transfer']['Q']=True
        def bad_geometry(m): m.target.wcs.crval[0]+=1
        for mutate,reason in ((bad_unit,'source_admission'),(bad_calibration,'source_admission'),
            (bad_mask,'coherent_mismatch'),(bad_data,'coherent_nonfinite'),(bad_recipe,'resolved_recipe'),
            (bad_geometry,'master_geometry')):
            master=self.master(np.ones((32,32),dtype=np.float32));mutate(master)
            with self.assertRaisesRegex(RuntimeError,reason):owner.science_mean_pyramid(master,ENTRY,output_pixels=8)
        master=self.master(np.zeros((32,32),dtype=np.float32));master.joint_available[:]=False
        for value in master.bands.values():value.finite_neighbors[:]=False
        with self.assertRaisesRegex(RuntimeError,'coherent_unavailable'):owner.science_mean_pyramid(master,ENTRY,output_pixels=8)

    def test_frozen_zscale_requires_actual_sample_identity_resolved_stretch_and_rgb(self):
        y,x=np.mgrid[:64,:64];data=(-.03+x*.003+y*.007).astype(np.float32)
        joint=np.ones(data.shape,dtype=bool);joint[:5,:9]=False;data[~joint]=np.nan
        master=self.master(data,joint,transfer=owner.WholeMasterZscaleTransfer())
        before=copy.deepcopy(master.report)
        with patch.object(owner,'LuptonAsinhZscaleStretch',side_effect=AssertionError('full fit prohibited')):
            validation=owner.verify_frozen_zscale_reference(master)
        self.assertEqual(validation['verificationSampleFitCalls'],1)
        self.assertEqual(validation['fullMasterFitCalls'],0)
        self.assertEqual(master.report,before)
        for key,value in (('sampleFloat64Sha256','0'*64),('sampleRasterIndicesInt64Sha256','0'*64),
                          ('negativeIntensitySamples',0),('contrast',.5)):
            changed=copy.deepcopy(master);changed.report['display']['transfer']['statisticalFit'][key]=value
            with self.assertRaisesRegex(RuntimeError,'sample_receipt_mismatch'):owner.verify_frozen_zscale_reference(changed)
        changed=copy.deepcopy(master);changed.report['display']['transfer']['stretch']*=2
        with self.assertRaisesRegex(RuntimeError,'resolved_stretch_mismatch'):owner.verify_frozen_zscale_reference(changed)
        changed=copy.deepcopy(master);changed.rgb[20,20,0]^=np.uint8(1)
        with self.assertRaisesRegex(RuntimeError,'rgb_recipe_mismatch'):owner.verify_frozen_zscale_reference(changed)

    def test_real_single_and_mosaic_consumers_save_explicit_version_and_quality_recipe(self):
        n=64;target=owner.target_tan(ENTRY['center'],n,.1);target.wcs.crpix += [8,8]
        y,x=np.mgrid[:80,:80];data=(.01+x*.003+y*.007).astype(np.float32)
        frames=[frame(band,target,data) for band in owner.BANDS]
        masters=[owner.build_master(frames,ENTRY,n,.1),owner.build_mosaic_master(frames,ENTRY,n,.1)]
        products=[owner.science_mean_pyramid(m,ENTRY,output_pixels=16) for m in masters]
        self.assertTrue(all(products[0][level][0]==products[1][level][0] for level in owner.LEVELS))
        row={'objectRef':ENTRY['objectRef'],'raDeg':ENTRY['center']['raDeg'],'decDeg':ENTRY['center']['decDeg']}
        original=owner.science_mean_pyramid
        with tempfile.TemporaryDirectory() as directory, patch.object(owner,'science_mean_pyramid',
            side_effect=lambda *args,**kwargs:original(*args,**kwargs,output_pixels=16)):
            for i,master in enumerate(masters):
                report=owner.save_candidate(Path(directory)/str(i),master,ENTRY,row,pyramid_kind=owner.SCIENCE_PYRAMID_KIND)
                self.assertEqual(report['version'],owner.SCIENCE_PYRAMID_VERSION)
                self.assertEqual(report['sourceMasterVersion'],master.report['version'])
                self.assertNotIn('display-contribution-master',report['arrays'])
                quality=json.loads((Path(directory)/str(i)/'candidate-quality.json').read_bytes())
                self.assertEqual(len(quality['reports']),6)
                self.assertEqual(quality['version'],owner.SCIENCE_PYRAMID_VERSION)
                self.assertIn('signed science master',report['display']['sourceMaster'])
                self.assertNotEqual(report['display']['sourceMaster'],master.report['display']['sourceMaster'])
                for item in quality['reports']:
                    self.assertEqual(item['source']['scienceMaster'],report['pyramidRecipe']['sourceScience'])
                    self.assertNotIn('master',item['source'])
                for level in owner.LEVELS:
                    self.assertEqual(report['levels'][level]['masterCrop']['method'],owner.SCIENCE_PYRAMID_KIND)
                    self.assertEqual(report['levels'][level]['displayRecipe']['sourceWholeMasterRecipe'],master.report['display']['transfer'])
                    self.assertEqual(report['levels'][level]['alternativeDisplay']['scienceMeans'],report['levels'][level]['scienceMeans'])


if __name__=='__main__':unittest.main()
