"""Actual frame WCS outside crop, common weights and unknown support."""
import unittest
from dataclasses import replace
import numpy as np
import sdss_gri_tan as gri
import sdss_noise_display as display
from sdss_adaptive_display import adaptive_common_display_batched,render_adaptive_display_candidate,refine_adaptive_real_halo,adaptive_display_pyramid,HALO_VERSION
from test_sdss_noise_display import source_frames
from test_sdss_gri_tan import ENTRY

def window(master,sources,region):
    _,fields,weights=display._qualified_sources(master,sources)
    return display._project_real_halo_window(master,sources,fields,weights,region,lambda:None)

class RealHaloTest(unittest.TestCase):
    def test_edge_only_refinement_preserves_parent_interior_and_source_coverage(self):
        frames,sources=source_frames();master=gri.build_mosaic_master(frames,ENTRY,32,.1)
        parent=render_adaptive_display_candidate(master,sources);new=refine_adaptive_real_halo(master,parent,sources,batch_size=7)
        self.assertEqual(new.report['version'],HALO_VERSION);self.assertEqual(new.report['wholeMasterFilterRuns'],0)
        self.assertEqual(new.report['edgeTargetPixels'],32*32-16*16)
        self.assertTrue((new.radius[:8]>=0).any())
        self.assertGreater(new.report['changedEstimatePixels'],parent.report['changedEstimatePixels'])
        for b in gri.BANDS:np.testing.assert_array_equal(new.estimates[b][8:-8,8:-8],parent.estimates[b][8:-8,8:-8])
        a=adaptive_display_pyramid(master,parent,ENTRY,output_pixels=8);b=adaptive_display_pyramid(master,new,ENTRY,output_pixels=8)
        import io
        from PIL import Image
        for level in a:
            np.testing.assert_array_equal(np.asarray(Image.open(io.BytesIO(a[level][0])))[:,:,3],np.asarray(Image.open(io.BytesIO(b[level][0])))[:,:,3])
            self.assertEqual(b[level][1]['processingVersion'],HALO_VERSION)
        fake=replace(parent,report=parent.report|{'version':HALO_VERSION})
        with self.assertRaisesRegex(RuntimeError,'policy_invalid'):adaptive_display_pyramid(master,fake,ENTRY,output_pixels=8)
        with self.assertRaisesRegex(RuntimeError,'parent_version_invalid'):refine_adaptive_real_halo(master,new,sources)

    def test_refinement_cancel_has_no_partial_and_real_bad_exterior_never_bridged(self):
        frames,sources=source_frames();master=gri.build_master(frames,ENTRY,32,.1);parent=render_adaptive_display_candidate(master,sources)
        events=[]
        with self.assertRaisesRegex(RuntimeError,'cancelled'):
            refine_adaptive_real_halo(master,parent,sources,cancelled=lambda:bool(events),progress=events.append)
        self.assertEqual(len(events),1);self.assertTrue((parent.radius[:8]==-1).all())
        sources['301/1/1/1']['g'].flags.flags[40:]|=1<<8
        new=refine_adaptive_real_halo(master,parent,sources)
        self.assertEqual(new.radius[0,10],-1)
        for b in gri.BANDS:np.testing.assert_array_equal(new.estimates[b][0,10],master.bands[b].data[0,10])

    def test_single_mosaic_real_outside_samples_and_cached_overlap_match(self):
        frames,sources=source_frames();single=gri.build_master(frames,ENTRY,32,.1);mosaic=gri.build_mosaic_master(frames,ENTRY,32,.1)
        region=(slice(-8,24),slice(-8,24))
        a=window(single,sources,region);b=window(mosaic,sources,region)
        np.testing.assert_array_equal(a[0],b[0]);np.testing.assert_array_equal(a[1],b[1])
        np.testing.assert_array_equal(a[0][:,8:,8:],np.stack([single.bands[k].data[:24,:24] for k in gri.BANDS]))
        self.assertGreater(a[3]['outsideCropAvailablePixels'],0)
        result=adaptive_common_display_batched(a[0],a[1],a[2])
        self.assertTrue(np.any(result.estimates[:,8:16,8:16]!=a[0][:,8:16,8:16]))

    def test_single_partial_preserves_independent_band_samples_without_admitting_missing_colour(self):
        frames,sources=source_frames();frames[0].data[20:23,20:23]=np.nan
        master=gri.build_master(frames,ENTRY,32,.1)
        values,eligible,stencils,_=window(master,sources,(slice(-8,32),slice(-8,32)))
        np.testing.assert_array_equal(values[:,8:,8:],np.stack([master.bands[b].data for b in gri.BANDS]))
        self.assertFalse(eligible[8:,8:][~master.joint_available].any())

    def test_source_exterior_is_not_mirrored_and_unknown_flags_remain_unusable(self):
        frames,sources=source_frames()
        # Native data varies physically outside crop; no copied target border.
        for f in frames:f.data[40:]=.123
        master=gri.build_mosaic_master(frames,ENTRY,32,.1)
        values,eligible,stencils,_=window(master,sources,(slice(-8,24),slice(-8,24)))
        self.assertFalse(np.array_equal(values[:,1:8,8:24],np.broadcast_to(values[:,8:9,8:24],(3,7,16))))
        bad=sources['301/1/1/1']['g'];bad.flags.flags[40:]|=1<<8
        values,eligible,stencils,_=window(master,sources,(slice(-8,24),slice(-8,24)))
        self.assertFalse(eligible[:7,8:24].any())
        result=adaptive_common_display_batched(values,eligible,stencils)
        np.testing.assert_array_equal(result.estimates[:,8,8:16],values[:,8,8:16])
        master.mosaic_weights['301/1/1/1'][2,2]=.5
        with self.assertRaisesRegex(RuntimeError,'weight_coherence'):window(master,sources,(slice(-8,24),slice(-8,24)))

if __name__=='__main__':unittest.main()
