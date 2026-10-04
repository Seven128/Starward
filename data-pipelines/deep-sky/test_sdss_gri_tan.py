"""Behavior regressions for one-field WCS/availability and same-master display."""
import io
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import numpy as np
from PIL import Image

import sdss_gri_tan as owner

ENTRY = {"objectRef": "M:51", "center": {"raDeg": 202.469625, "decDeg": 47.1951666667,
                                         "frame": "ICRS J2000"}, "orientation": "north-up/east-left"}


def frame(band, source_wcs, data):
    return SimpleNamespace(data=np.asarray(data, dtype=np.float32), wcs=source_wcs,
        receipt={"identity": {"run": 1, "rerun": "301", "camcol": 1, "field": 1, "band": band},
            "scientificSamples": {"unit": "nanomaggies/pixel", "calibrationAlreadyApplied": True,
                                  "skyAlreadySubtracted": True},
            "decompressed": {"completeScientificArrays": True}})


class GriTanTest(unittest.TestCase):
    def display_bands(self, data):
        joint = np.ones(data.shape,dtype=np.bool_)
        return {band:owner.ProjectedBand((data*scale).astype(np.float32),joint,joint,{}) for band,scale in zip(owner.BANDS,(1,2,3))}

    def test_shared_transfer_default_matches_prior_formula_and_checks_fixed_parameters(self):
        data = np.linspace(-2,20,64*64,dtype=np.float32).reshape(64,64)
        bands = self.display_bands(data)
        joint = np.ones(data.shape,dtype=np.bool_)
        rgb,recipe = owner.make_rgb_display(bands,joint)
        legacy = owner.make_lupton_rgb(bands['i'].data,bands['r'].data,bands['g'].data,
            interval=owner.ManualInterval(vmin=0,vmax=None),stretch=5,Q=8,output_dtype=np.uint8)
        self.assertTrue(np.array_equal(rgb,legacy))
        self.assertEqual((recipe['kind'],recipe['stretch'],recipe['Q']),('fixed',5,8))
        for transfer in [owner.FixedDisplayTransfer(stretch=value) for value in (0,-1,True,float('nan'),float('inf'))]+[owner.FixedDisplayTransfer(Q=value) for value in (0,-1,False,float('nan'),float('inf'),1e11)]+[object()]:
            with self.assertRaisesRegex(RuntimeError,'display_transfer_invalid'):
                owner.make_rgb_display(bands,joint,transfer=transfer)
        _,small_q = owner.make_rgb_display(bands,joint,transfer=owner.FixedDisplayTransfer(Q=1e-20))
        self.assertEqual(small_q['Q'],.1,'report must record the library effective Q, not an ignored requested epsilon')

    def test_global_zscale_excludes_partial_unavailable_samples_instead_of_zero_fill_statistics(self):
        data = np.linspace(.01,2,64*64,dtype=np.float32).reshape(64,64)
        bands = self.display_bands(data)
        joint = np.zeros(data.shape,dtype=np.bool_)
        joint[24:40,24:40] = True
        before = [value.data.copy() for value in bands.values()]
        rgb,recipe = owner.make_rgb_display(bands,joint,transfer=owner.WholeMasterZscaleTransfer())
        for value in bands.values():
            value.data[~joint] = np.nan
        nan_rgb,nan_recipe = owner.make_rgb_display(bands,joint,transfer=owner.WholeMasterZscaleTransfer())
        self.assertTrue(np.array_equal(rgb,nan_rgb))
        self.assertEqual(recipe,nan_recipe)
        self.assertEqual(recipe['statisticalFit']['finiteIntensitySamples'],256)
        self.assertEqual(recipe['statisticalFit']['excludedIncoherentPixels'],3840)
        # A tempting zero-fill fit uses 3840 unavailable black samples and
        # changes global exposure; this counterfactual must be distinguishable.
        intensity = sum(before)/3
        with self.assertRaises(ZeroDivisionError):
            owner.LuptonAsinhZscaleStretch(np.where(joint,intensity,0),Q=8)
        self.assertTrue(np.all(rgb[~joint]==0))

    def test_transfer_preserves_science_zero_negative_and_rejects_nonfinite_empty_or_degenerate_fit(self):
        data = np.linspace(-2,2,64,dtype=np.float32).reshape(8,8)
        data[0,0] = 0
        bands = self.display_bands(data)
        joint = np.ones(data.shape,dtype=np.bool_)
        before = [value.data.copy() for value in bands.values()]
        _,recipe = owner.make_rgb_display(bands,joint,transfer=owner.WholeMasterZscaleTransfer())
        self.assertEqual(recipe['statisticalFit']['zeroIntensitySamples'],1)
        self.assertGreater(recipe['statisticalFit']['negativeIntensitySamples'],0)
        for value,expected in zip(bands.values(),before):
            self.assertTrue(np.array_equal(value.data,expected))
        with self.assertRaisesRegex(RuntimeError,'display_coherent_unavailable'):
            owner.make_rgb_display(bands,np.zeros(joint.shape,dtype=np.bool_),transfer=owner.WholeMasterZscaleTransfer())
        bands['g'].data[1,1] = np.nan
        with self.assertRaisesRegex(RuntimeError,'display_coherent_nonfinite'):
            owner.make_rgb_display(bands,joint,transfer=owner.WholeMasterZscaleTransfer())
        constant = self.display_bands(np.zeros((8,8),dtype=np.float32))
        black,_ = owner.make_rgb_display(constant,joint)
        self.assertTrue(np.all(black==0))
        self.assertTrue(joint.all(),'valid black is still science supply')
        with self.assertRaisesRegex(RuntimeError,'display_zscale_degenerate'):
            owner.make_rgb_display(constant,joint,transfer=owner.WholeMasterZscaleTransfer())

    def test_single_and_mosaic_use_the_same_actual_transfer_and_qc_recipe(self):
        n = 64
        source = owner.target_tan(ENTRY['center'],n,.22755555555555557)
        source.wcs.crpix += [8,8]
        data = np.linspace(.01,2,80*80,dtype=np.float32).reshape(80,80)
        frames = [frame(band,source,data*scale) for band,scale in zip(owner.BANDS,(1,2,3))]
        selected = owner.WholeMasterZscaleTransfer()
        single = owner.build_master(frames,ENTRY,n,.22755555555555557,display_transfer=selected)
        mosaic = owner.build_mosaic_master(frames,ENTRY,n,.22755555555555557,display_transfer=selected)
        self.assertTrue(np.array_equal(single.rgb,mosaic.rgb))
        self.assertEqual(single.report['display']['transfer'],mosaic.report['display']['transfer'])
        row = {'objectRef':ENTRY['objectRef'],'raDeg':ENTRY['center']['raDeg'],'decDeg':ENTRY['center']['decDeg']}
        original = owner.pyramid
        with tempfile.TemporaryDirectory() as directory, patch.object(owner,'pyramid',side_effect=lambda *args,**kwargs:original(*args,**kwargs,output_pixels=16)):
            target = Path(directory)/'candidate'
            report = owner.save_candidate(target,mosaic,ENTRY,row)
            quality = json.loads((target/'candidate-quality.json').read_bytes())
            for item in quality['reports']:
                self.assertEqual(item['processing']['transfer'],report['display']['transfer'])
                self.assertEqual(item['processing']['transfer']['kind'],'whole-master-zscale')
                self.assertNotEqual(item['processing']['transfer']['stretch'],5)

    def test_global_zscale_pyramid_uses_one_master_fit_and_detects_crop_refit(self):
        n = 64
        source = owner.target_tan(ENTRY['center'],n,.22755555555555557)
        source.wcs.crpix += [8,8]
        y,x = np.mgrid[0:80,0:80]
        data = (.01+x*.001+y*.002).astype(np.float32)
        data[:24] += 20
        frames = [frame(band,source,data*scale) for band,scale in zip(owner.BANDS,(1,2,3))]
        master = owner.build_master(frames,ENTRY,n,.22755555555555557,display_transfer=owner.WholeMasterZscaleTransfer())
        with patch.object(owner,'make_rgb_display',side_effect=AssertionError('no display refit in crop owner')):
            products = owner.pyramid(master,ENTRY,output_pixels=16)
        detail = np.asarray(Image.open(io.BytesIO(products['DETAIL'][0])))
        self.assertTrue(np.array_equal(detail[:,:,:3],master.rgb[24:40,24:40]))
        bands = {band:owner.ProjectedBand(value.data[24:40,24:40],value.footprint[24:40,24:40],value.finite_neighbors[24:40,24:40],{}) for band,value in master.bands.items()}
        wrong,wrong_recipe = owner.make_rgb_display(bands,master.joint_available[24:40,24:40],transfer=owner.WholeMasterZscaleTransfer())
        self.assertNotAlmostEqual(wrong_recipe['stretch'],master.report['display']['transfer']['stretch'])
        self.assertTrue(np.any(wrong!=detail[:,:,:3]),'per-crop refit must change the same object pixels and be detectable')

    def mosaic_frames(self, values=((-2, 0, 8), (-2, 0, 8))):
        target = owner.target_tan(ENTRY['center'], 64, .1)
        result = []
        for field, offset, signal in zip((1, 2), (-24, 24), values):
            for band, value, band_offset in zip(owner.BANDS, signal, (1.25, -1.5, .75)):
                source = owner.target_tan(ENTRY['center'], 64, .1)
                # Padding in y and two complementary x footprints. Individual
                # band origins differ, so direct-index stacking cannot pass.
                source.wcs.crpix += [8 + offset + band_offset, 8]
                item = frame(band, source, np.full((80, 80), value, dtype=np.float32))
                item.receipt['identity']['field'] = field
                result.append(item)
        return target, result

    def test_mosaic_complementary_real_wcs_stencils_fill_target_without_fading_zero_or_negative_measurements(self):
        _, frames = self.mosaic_frames()
        former_single = owner.build_master(frames[:3], ENTRY, 64, .1)
        self.assertFalse(former_single.joint_available.all(), 'old one-field path must miss the complementary side')
        actual = owner.build_mosaic_master(frames, ENTRY, 64, .1, require_complete=True)
        self.assertTrue(actual.joint_available.all())
        for band, value in zip(owner.BANDS, (-2, 0, 8)):
            self.assertTrue(np.all(actual.bands[band].data == value), 'geometric blending cannot fade a singly supplied edge or discard valid zero/negative flux')
        self.assertTrue(any(row['jointAvailablePixels'] < 64 * 64 for row in actual.report['mosaic']['fields']))

    def test_mosaic_same_field_weights_keep_band_ratios_and_input_order_stable(self):
        _, frames = self.mosaic_frames(((1, 2, 3), (4, 8, 12)))
        a = owner.build_mosaic_master(frames, ENTRY, 64, .1, require_complete=True)
        b = owner.build_mosaic_master(list(reversed(frames)), ENTRY, 64, .1, require_complete=True)
        for band in owner.BANDS:
            self.assertTrue(np.array_equal(a.bands[band].data, b.bands[band].data))
        self.assertTrue(np.array_equal(a.rgb, b.rgb))
        self.assertLess(np.max(np.abs(a.bands['r'].data - 2 * a.bands['g'].data)), 1e-6)
        self.assertLess(np.max(np.abs(a.bands['i'].data - 3 * a.bands['g'].data)), 1e-6)
        self.assertTrue((a.contributor_count == 2).any())

    def test_mosaic_nonfinite_one_band_retires_only_that_field_color_contribution_and_preserves_other_field(self):
        _, frames = self.mosaic_frames(((1, 2, 3), (4, 8, 12)))
        # The target center maps near column16/row39 of field1. A g hole
        # cannot be filled with zero or borrow unrelated r/i field weights.
        frames[0].data[:, 10:24] = np.nan
        result = owner.build_mosaic_master(frames, ENTRY, 64, .1, require_complete=True)
        self.assertEqual(result.bands['g'].data[31, 31], 4)
        self.assertEqual(result.bands['r'].data[31, 31], 8)
        self.assertEqual(result.bands['i'].data[31, 31], 12)
        self.assertEqual(result.mosaic_weights['301/1/1/1'][31, 31], 0)
        self.assertTrue(result.mosaic_fields['301/1/1/1']['r'].finite_neighbors[31, 31], 'independent known r measurements remain available in their own field sidecar')

    def test_mosaic_missing_band_duplicate_identity_and_incomplete_target_cannot_claim_complete_rgb(self):
        _, frames = self.mosaic_frames()
        with self.assertRaisesRegex(RuntimeError, 'mosaic_field_band_set_incomplete'):
            owner.build_mosaic_master(frames[:-1], ENTRY, 64, .1)
        with self.assertRaisesRegex(RuntimeError, 'mosaic_duplicate_frame_identity'):
            owner.build_mosaic_master(frames + [frames[0]], ENTRY, 64, .1)
        with self.assertRaisesRegex(RuntimeError, 'mosaic_target_incomplete'):
            owner.build_mosaic_master(frames[:3], ENTRY, 64, .1, require_complete=True)

    def test_independent_band_union_does_not_invent_same_field_color_support(self):
        _, frames = self.mosaic_frames(((1, 2, 3), (4, 8, 12)))
        frames[0].data[:, 10:24] = np.nan
        frames[5].data[:, 50:80] = np.nan
        result = owner.build_mosaic_master(frames, ENTRY, 64, .1)
        self.assertFalse(result.joint_available[31, 31])
        for band in owner.BANDS:
            self.assertTrue(result.independent_band_unions[band].finite_neighbors[31, 31])
            self.assertFalse(result.bands[band].finite_neighbors[31, 31])
            self.assertTrue(np.isnan(result.bands[band].data[31, 31]), 'independent known samples cannot fabricate a coherent same-field RGB measurement')
        self.assertEqual(result.mosaic_fields['301/1/1/1']['i'].data[31, 31], 3)
        self.assertEqual(result.mosaic_fields['301/1/1/2']['g'].data[31, 31], 4)
        with self.assertRaisesRegex(RuntimeError, 'mosaic_target_incomplete'):
            owner.build_mosaic_master(frames, ENTRY, 64, .1, require_complete=True)

    def test_full_independent_band_unions_can_have_partial_coherent_data_and_shared_masks_must_agree(self):
        frames = []
        for field in (1, 2):
            for band, value in zip(owner.BANDS, (-2, 0, 8)):
                source = owner.target_tan(ENTRY['center'], 64, .1)
                source.wcs.crpix += [8, 8]
                item = frame(band, source, np.full((80, 80), value, dtype=np.float32))
                item.receipt['identity']['field'] = field
                if (field, band) in ((1, 'g'), (2, 'i')):
                    item.data[:, 30:42] = np.nan
                frames.append(item)
        result = owner.build_mosaic_master(frames, ENTRY, 64, .1)
        self.assertFalse(result.joint_available.all())
        self.assertTrue(result.joint_available.any())
        for band in owner.BANDS:
            coadd = result.bands[band]
            self.assertTrue(np.array_equal(coadd.footprint & coadd.finite_neighbors, np.isfinite(coadd.data)))
            self.assertTrue(np.array_equal(coadd.finite_neighbors, result.joint_available))
            union = result.independent_band_unions[band]
            self.assertTrue((union.footprint & union.finite_neighbors).all())
        self.assertEqual(result.mosaic_fields['301/1/1/1']['i'].data[31, 31], 8)
        self.assertEqual(result.mosaic_fields['301/1/1/2']['g'].data[31, 31], -2)
        with self.assertRaisesRegex(RuntimeError, 'mosaic_target_incomplete'):
            owner.build_mosaic_master(frames, ENTRY, 64, .1, require_complete=True)

    def test_missing_neighbor_or_off_frame_is_not_zero_but_finite_zero_and_negative_remain_data(self):
        source = np.array([[0, -2, 8], [-2, -4, np.nan], [1, 3, 9]], dtype=np.float32)
        x = np.array([0., .5, 1.5, 2., np.nan])
        y = np.array([0., .5, .5, 1., 0.])
        data, geometric, finite = owner.bilinear_samples(source, x, y)
        self.assertTrue(np.array_equal(geometric, [True, True, True, False, False]))
        self.assertTrue(np.array_equal(finite, [True, True, False, False, False]))
        self.assertEqual(data[0], 0)
        self.assertEqual(data[1], -2)
        self.assertTrue(np.isnan(data[2:]).all())
        # The bad fourth neighbor cannot be waived merely because its weight
        # would be zero at an exact integer source pixel.
        data, geometric, finite = owner.bilinear_samples(source, np.array([1.]), np.array([0.]))
        self.assertTrue(geometric[0])
        self.assertFalse(finite[0])
        self.assertTrue(np.isnan(data[0]))

    def test_same_celestial_star_with_different_band_origins_aligns_after_wcs_not_direct_stack(self):
        n = 64
        target = owner.target_tan(ENTRY["center"], n, .1)
        yy, xx = np.mgrid[0:n, 0:n]
        frames = []
        target_star = (29.25, 27.75)
        for band, offset in zip(owner.BANDS, [(2.2, -1.5), (-2.1, 2.25), (0., 0.)]):
            source_wcs = owner.target_tan(ENTRY["center"], n, .1)
            source_wcs.wcs.crpix += offset
            data = np.exp(-((xx - target_star[0] - offset[0]) ** 2 +
                            (yy - target_star[1] - offset[1]) ** 2) / 8) * 50
            frames.append(frame(band, source_wcs, data))
        projected = [owner.reproject_band(value, target, n, chunk_rows=7).data for value in frames]
        def centroid(data):
            weights = np.nan_to_num(data, nan=0)
            return np.array([(xx * weights).sum(), (yy * weights).sum()]) / weights.sum()
        centers = np.array([centroid(data) for data in projected])
        expected = np.array([target_star[0], n - 1 - target_star[1]])
        self.assertLess(np.max(np.abs(centers - expected)), .03)
        direct = np.array([centroid(value.data) for value in frames])
        self.assertGreater(np.max(np.abs(direct[0] - direct[1])), 3,
                           "the former tempting direct-index gri stack must fail this celestial alignment")

    def test_north_is_top_east_is_left_and_center_is_between_even_pixels(self):
        target = owner.target_tan(ENTRY["center"], 64, .1)
        ra, dec = target.all_pix2world([31.5, 31.5, 0, 63], [31.5, 63, 31.5, 31.5], 0)
        self.assertAlmostEqual(ra[0], ENTRY["center"]["raDeg"], places=10)
        self.assertAlmostEqual(dec[0], ENTRY["center"]["decDeg"], places=10)
        self.assertGreater(dec[1], dec[0])
        self.assertGreater(ra[2], ra[0])
        self.assertLess(ra[3], ra[0])
        science = np.zeros((64, 64), dtype=np.float32)
        science[40, 25] = 10
        result = owner.reproject_band(frame("g", target, science), target, 64)
        self.assertEqual(np.unravel_index(np.nanargmax(result.data), result.data.shape), (23, 25))

    def test_premultiplied_boxes_preserve_available_black_and_do_not_mix_unavailable_red(self):
        rgb = np.array([[[0, 0, 255], [255, 0, 0]], [[0, 0, 255], [255, 0, 0]]], dtype=np.uint8)
        available = np.array([[True, False], [True, False]])
        self.assertTrue(np.array_equal(owner.premultiplied_box(rgb, available, 2), [[[0, 0, 255, 128]]]))
        black = np.zeros((2, 2, 3), dtype=np.uint8)
        self.assertTrue(np.array_equal(owner.premultiplied_box(black, np.ones((2, 2), dtype=bool), 2), [[[0, 0, 0, 255]]]))
        alternative = owner.encoded_contribution_rgba(black, np.ones((2, 2), dtype=bool))
        self.assertTrue(np.all(alternative[:, :, 3] == 0))
        self.assertTrue(available[0, 0], "display alpha is independent of scientific availability")

    def test_pyramid_reuses_master_color_and_exact_world_crop_instead_of_restretching_each_level(self):
        n = 64
        target = owner.target_tan(ENTRY["center"], n, .22755555555555557)
        yy, xx = np.mgrid[0:n, 0:n]
        # Fixed colored signal plus very bright exterior: a crop's independent
        # percentile or range would change its color/intensity result.
        source = (1 + xx * .01 + yy * .02).astype(np.float32)
        source[:8] = 200
        frames = [frame(band, target, source * scale) for band, scale in zip(owner.BANDS, [1, 2, 3])]
        master = owner.build_master(frames, ENTRY, n, .22755555555555557)
        products = owner.pyramid(master, ENTRY, output_pixels=16)
        for index, level in enumerate(owner.LEVELS):
            payload, metadata = products[level]
            rgba = np.asarray(Image.open(io.BytesIO(payload)))
            start, _, end, _ = metadata["masterCrop"]["boundsXYExclusive"]
            factor = metadata["masterCrop"]["boxFactor"]
            # Independent box expectation from the one already-colored master.
            patch = master.rgb[start + factor * 6:start + factor * 7,
                               start + factor * 5:start + factor * 6]
            self.assertTrue(np.array_equal(rgba[6, 5, :3], np.rint(patch.mean(axis=(0, 1))).astype(np.uint8)))
            wcs = owner.target_tan(ENTRY["center"], 16, metadata["fieldDegrees"])
            actual_world = wcs.all_pix2world([[5, 15 - 6]], 0)
            master_world = target.all_pix2world([[start + factor * (5 + .5) - .5,
                                                  n - 1 - (start + factor * (6 + .5) - .5)]], 0)
            self.assertLess(np.max(np.abs(actual_world - master_world)), 1e-9)
            self.assertEqual(metadata["crpixFitsOneBased"], 8.5)
        detail = np.asarray(Image.open(io.BytesIO(products["DETAIL"][0])))
        self.assertTrue(np.array_equal(detail[:, :, :3], master.rgb[24:40, 24:40]))

    def test_missing_band_and_cross_field_receipts_cannot_form_a_color_master(self):
        target = owner.target_tan(ENTRY["center"], 64, .1)
        frames = [frame(band, target, np.ones((64, 64))) for band in owner.BANDS]
        with self.assertRaisesRegex(RuntimeError, "band_set_incomplete"):
            owner.build_master(frames[:2], ENTRY, 64, .1)
        frames[1].receipt["identity"]["field"] = 2
        with self.assertRaisesRegex(RuntimeError, "one_field_identity_mismatch"):
            owner.build_master(frames, ENTRY, 64, .1)

    def test_other_reference_frame_cannot_be_passed_as_bare_icrs_coordinates(self):
        target = owner.target_tan(ENTRY["center"], 64, .1)
        fk4 = owner.target_tan(ENTRY["center"], 64, .1)
        fk4.wcs.radesys = "FK4"
        fk4.wcs.equinox = 1950
        with self.assertRaisesRegex(RuntimeError, "reference_frame_unsupported"):
            owner.reproject_band(frame("g", fk4, np.ones((64, 64))), target, 64)

    def test_display_contribution_decomposition_is_once_in_encoding_and_reconstructs_original_channel(self):
        rgb = np.array([[[23, 80, 140], [0, 0, 0]], [[255, 2, 0], [1, 2, 3]]], dtype=np.uint8)
        availability = np.ones((2, 2), dtype=bool)
        rgba = owner.encoded_contribution_rgba(rgb, availability)
        reconstructed = np.rint(rgba[:, :, :3].astype(float) * rgba[:, :, 3:4] / 255).astype(np.uint8)
        self.assertTrue(np.array_equal(reconstructed, rgb))
        box = owner.premultiplied_rgba_box(rgba, 2)[0, 0]
        box_contribution = box[:3] * (float(box[3]) / 255)
        self.assertLess(np.max(np.abs(box_contribution - rgb.mean(axis=(0, 1)))), 1.1)
        self.assertTrue(availability[0, 1])
        self.assertEqual(rgba[0, 1, 3], 0, "zero display contribution did not classify the available black sample as missing")


if __name__ == "__main__":
    unittest.main()
