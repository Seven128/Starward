"""Actual source projection consumers, whole-master halo and saved LOD binding."""
import copy,io,tempfile,unittest
from pathlib import Path
import numpy as np
from PIL import Image
import sdss_adaptive_display as owner
import sdss_gri_tan as gri
from sdss_noise_display import NoiseDisplaySource
from test_sdss_noise_display import source_frames
from test_sdss_gri_tan import ENTRY

class AdaptiveMasterTest(unittest.TestCase):
    def test_single_mosaic_chunk_and_batch_partitions_use_same_real_halo(self):
        frames,sources=source_frames();single=gri.build_master(frames,ENTRY,32,.1);mosaic=gri.build_mosaic_master(frames,ENTRY,32,.1)
        a=owner.render_adaptive_display_candidate(single,sources,chunk_rows=5,batch_size=7)
        b=owner.render_adaptive_display_candidate(mosaic,sources,chunk_rows=13,batch_size=64)
        c=owner.render_adaptive_display_candidate(single,sources,chunk_rows=32,batch_size=1)
        self.assertGreater(a.report['changedEstimatePixels'],0)
        for key in ('qualified','radius','reached','protected'):
            np.testing.assert_array_equal(getattr(a,key),getattr(b,key));np.testing.assert_array_equal(getattr(a,key),getattr(c,key))
        for band in gri.BANDS:
            np.testing.assert_array_equal(a.estimates[band],b.estimates[band]);np.testing.assert_array_equal(a.estimates[band],c.estimates[band])
            np.testing.assert_array_equal(a.estimates[band][a.radius<=0],single.bands[band].data[a.radius<=0])
            self.assertFalse(a.estimates[band].flags.writeable)
        self.assertTrue((a.radius[:8]==-1).all());self.assertTrue((a.radius[:,-8:]==-1).all())
        self.assertLess(a.report['maximumRetainedStencilArrayBytes'],c.report['maximumRetainedStencilArrayBytes'])

    def test_partial_zero_contributor_unknown_and_missing_active_model_preserve_original(self):
        frames,sources=source_frames(second=True)
        for f in frames[3:]:f.wcs.wcs.crpix += [1000,1000]
        for b in gri.BANDS:
            s=sources['301/1/1/2'][b];sources['301/1/1/2'][b]=NoiseDisplaySource(s.frame,None,None)
        frames[0].data[20:23,20:23]=np.nan
        master=gri.build_mosaic_master(frames,ENTRY,32,.1)
        result=owner.render_adaptive_display_candidate(master,sources,chunk_rows=4)
        self.assertGreater(result.report['changedEstimatePixels'],0)
        self.assertFalse(result.qualified[~master.joint_available].any())
        for b in gri.BANDS:
            np.testing.assert_array_equal(result.estimates[b][result.radius<=0],master.bands[b].data[result.radius<=0])
        s=sources['301/1/1/1']['r'];sources['301/1/1/1']['r']=NoiseDisplaySource(s.frame,None,s.flags)
        unknown=owner.render_adaptive_display_candidate(master,sources)
        self.assertFalse(unknown.qualified.any())
        for b in gri.BANDS:np.testing.assert_array_equal(unknown.estimates[b],master.bands[b].data)

    def test_cancel_and_coadd_processing_identity_failure_do_not_return_candidate(self):
        frames,sources=source_frames();master=gri.build_mosaic_master(frames,ENTRY,32,.1);events=[]
        with self.assertRaisesRegex(RuntimeError,'cancelled'):
            owner.render_adaptive_display_candidate(master,sources,chunk_rows=4,cancelled=lambda:bool(events),progress=events.append)
        self.assertEqual(len(events),1)
        master.bands['g'].data[10,10]+=.1
        with self.assertRaisesRegex(RuntimeError,'coadd_value'):owner.render_adaptive_display_candidate(master,sources)
        frames,sources=source_frames();master=gri.build_master(frames,ENTRY,32,.1)
        sources['301/1/1/1']['g'].flags.receipt['actualPrimaryIdentity']['PS_ID']='other'
        with self.assertRaisesRegex(RuntimeError,'processing_mismatch'):owner.render_adaptive_display_candidate(master,sources)

    def test_numeric_lod_original_alpha_black_and_exclusive_identity_bound_save(self):
        frames,sources=source_frames()
        for f in frames:f.data[:]=0;f.wcs.wcs.crpix -= [12,12]
        master=gri.build_master(frames,ENTRY,32,.1);candidate=owner.render_adaptive_display_candidate(master,sources)
        products=owner.adaptive_display_pyramid(master,candidate,ENTRY,output_pixels=8)
        original=gri.science_mean_pyramid(master,ENTRY,output_pixels=8)
        for level in products:
            rgba=np.asarray(Image.open(io.BytesIO(products[level][0])));raw=np.asarray(Image.open(io.BytesIO(original[level][0])))
            np.testing.assert_array_equal(rgba,raw)
            self.assertEqual(products[level][1]['statisticalFitCalls'],0)
        alpha=np.asarray(Image.open(io.BytesIO(products['OVERVIEW'][0])))[:,:,3]
        self.assertTrue((alpha==0).any());self.assertTrue((alpha==255).any());self.assertTrue(((alpha>0)&(alpha<255)).any())
        wrong=copy.deepcopy(ENTRY);wrong['objectRef']='M:82'
        with self.assertRaisesRegex(RuntimeError,'binding_invalid'):owner.adaptive_display_pyramid(master,candidate,wrong,output_pixels=8)
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/'candidate';saved=owner.save_adaptive_display_candidate(p,master,candidate,ENTRY,output_pixels=8)
            self.assertEqual(saved['levels']['OVERVIEW']['sha256'],products['OVERVIEW'][1]['sha256'])
            with self.assertRaises(FileExistsError):owner.save_adaptive_display_candidate(p,master,candidate,ENTRY,output_pixels=8)
        candidate.radius.setflags(write=True);old_radius=candidate.radius[10,10];candidate.radius[10,10]=99
        with self.assertRaisesRegex(RuntimeError,'diagnostic_changed'):owner.adaptive_display_pyramid(master,candidate,ENTRY,output_pixels=8)
        candidate.radius[10,10]=old_radius
        master.bands['g'].data[master.joint_available]+=.01
        with self.assertRaisesRegex(RuntimeError,'source_changed'):owner.adaptive_display_pyramid(master,candidate,ENTRY,output_pixels=8)

if __name__=='__main__':unittest.main()
