"""Common display data/recovery, covariance, chunk and actual-path regressions."""
import copy
import inspect
import io
from pathlib import Path
import tempfile
from types import MappingProxyType
import unittest
from unittest.mock import patch

import numpy as np
from PIL import Image

from sdss_corrected_frame import CorrectedFrame, FrameCalibrationSky
from sdss_frame_noise import FieldNoiseParameters
from sdss_frame_quality import PixelFlags, PLANE_NAMES
import sdss_gri_tan as gri
import sdss_noise_display as owner
from test_sdss_gri_tan import ENTRY, frame


def source_frames(n=32, second=False):
    target = gri.target_tan(ENTRY['center'], n, .1)
    target.wcs.crpix += [8, 8]
    y, x = np.mgrid[:n+16, :n+16]
    noise = np.where((x+y)%2, .03, -.03)
    data = (.06+noise).astype(np.float32)
    sources = {}; frames = []
    for field in ((1, 2) if second else (1,)):
        name = f'301/1/1/{field}'; sources[name] = {}
        for band in gri.BANDS:
            fake = frame(band, target, data)
            fake.receipt['identity']['field'] = field
            header = target.to_header(); header['PS_ID'] = 'test-processing'
            size = n+16
            metadata = FrameCalibrationSky(np.full(size, .02), np.full((4, 4), 5.),
                np.linspace(.5, 2.5, size), np.linspace(.5, 2.5, size))
            actual = CorrectedFrame(fake.data.copy(), target.deepcopy(), fake.receipt, header, metadata)
            identity = tuple(fake.receipt['identity'][k] for k in ('run', 'rerun', 'camcol', 'field', 'band'))
            camera = FieldNoiseParameters(identity, str(field), 1., .5, '0'*64, 10,
                'https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch')
            flags = PixelFlags(np.zeros(actual.data.shape, dtype=np.uint16),
                MappingProxyType({name: i for i, name in enumerate(PLANE_NAMES)}),
                {'expectedIdentity': copy.deepcopy(fake.receipt['identity']),
                 'actualPrimaryIdentity': {'PS_ID': 'test-processing'}})
            sources[name][band] = owner.NoiseDisplaySource(actual, camera, flags)
            frames.append(actual)
    return frames, sources


class NoiseDisplayTest(unittest.TestCase):
    def test_single_mosaic_and_chunks_share_actual_projection_processing(self):
        frames, sources = source_frames()
        single = gri.build_master(frames, ENTRY, 32, .1)
        mosaic = gri.build_mosaic_master(frames, ENTRY, 32, .1)
        original = {b: single.bands[b].data.copy() for b in gri.BANDS}
        a = owner.render_noise_display_candidate(single, sources, chunk_rows=5)
        b = owner.render_noise_display_candidate(mosaic, sources, chunk_rows=13)
        c = owner.render_noise_display_candidate(single, sources, chunk_rows=32)
        self.assertTrue(a.processable[2:-2,2:-2].all())
        for band in gri.BANDS:
            np.testing.assert_array_equal(a.estimates[band], b.estimates[band])
            np.testing.assert_array_equal(a.estimates[band], c.estimates[band])
            np.testing.assert_array_equal(single.bands[band].data, original[band])
            self.assertGreater(np.count_nonzero(a.estimates[band]!=original[band]), 100)
            self.assertFalse(a.estimates[band].flags.writeable)
        self.assertLess(a.report['maximumRetainedStencilArrayBytes'], c.report['maximumRetainedStencilArrayBytes'])

    def test_partial_missing_quality_camera_and_processing_flags_preserve_source(self):
        frames, sources = source_frames(second=True)
        # An actual missing source sample propagates through shared projection.
        frames[0].data[12:16,12:16] = np.nan
        master = gri.build_mosaic_master(frames, ENTRY, 32, .1)
        incomplete = {name: dict(values) for name, values in sources.items()}
        bad = incomplete['301/1/1/2']['g']
        incomplete['301/1/1/2']['g'] = owner.NoiseDisplaySource(bad.frame, None, bad.flags)
        result = owner.render_noise_display_candidate(master, incomplete)
        # Every interior pixel currently has positive field2 contribution.
        self.assertFalse(result.processable.any())
        for band in gri.BANDS: np.testing.assert_array_equal(result.estimates[band], master.bands[band].data)
        frames, sources = source_frames()
        master = gri.build_master(frames, ENTRY, 32, .1)
        sources['301/1/1/1']['r'].flags.flags[18:21,18:21] |= 1<<1
        result = owner.render_noise_display_candidate(master, sources)
        # Saved rows are north/top first, while native FITS y grows upward.
        self.assertFalse(result.processable[21,10])
        for band in gri.BANDS:
            np.testing.assert_array_equal(result.estimates[band][~result.processable], master.bands[band].data[~result.processable])
        sources['301/1/1/1']['r'].flags.flags[:] = 1<<2
        detection = owner.render_noise_display_candidate(master, sources)
        self.assertTrue(detection.processable[2:-2,2:-2].all(), 'NOTCHECKED is detection status')
        missing = sources['301/1/1/1']['i']
        sources['301/1/1/1']['i'] = owner.NoiseDisplaySource(missing.frame, missing.camera, None)
        self.assertFalse(owner.render_noise_display_candidate(master, sources).processable.any())

    def test_zero_contributor_unknown_is_neutral_partial_holes_never_filled(self):
        frames, sources = source_frames(second=True)
        # The second complete field is physically outside this target.
        for f in frames[3:]: f.wcs = f.wcs.deepcopy(); f.wcs.wcs.crpix += [1000,1000]
        master = gri.build_mosaic_master(frames, ENTRY, 32, .1)
        for band in gri.BANDS:
            s = sources['301/1/1/2'][band]
            sources['301/1/1/2'][band] = owner.NoiseDisplaySource(s.frame, None, None)
        result = owner.render_noise_display_candidate(master, sources)
        self.assertTrue(result.processable[2:-2,2:-2].all())
        frames, sources = source_frames()
        for f in frames: f.data[20:23,20:23] = np.nan
        partial = gri.build_master(frames, ENTRY, 32, .1)
        result = owner.render_noise_display_candidate(partial, sources)
        self.assertFalse(result.processable[~partial.joint_available].any())
        self.assertFalse(partial.joint_available.all())
        for band in gri.BANDS:
            self.assertTrue(np.isnan(result.estimates[band][~partial.joint_available]).all())
        # Geometry outside a frame differs from an in-frame nonfinite sample.
        frames, sources = source_frames()
        for f in frames: f.wcs.wcs.crpix -= [12, 12]
        partial = gri.build_master(frames, ENTRY, 32, .1)
        self.assertFalse(partial.joint_available.all())
        result = owner.render_noise_display_candidate(partial, sources)
        self.assertTrue(result.processable.any())
        self.assertFalse(result.processable[~partial.joint_available].any())

    def test_wrong_binding_weight_and_cancellation_reject_before_partial_output(self):
        frames, sources = source_frames()
        master = gri.build_master(frames, ENTRY, 32, .1)
        bad = source_frames()[1]
        bad['301/1/1/1']['r'].flags.receipt['actualPrimaryIdentity']['PS_ID'] = 'different'
        with self.assertRaisesRegex(RuntimeError, 'processing_mismatch'): owner.render_noise_display_candidate(master, bad)
        with self.assertRaisesRegex(RuntimeError, 'source_set'): owner.render_noise_display_candidate(master, {})
        bad = source_frames()[1]
        bad['301/1/1/1']['g'].frame.receipt['identity']['field'] = 99
        with self.assertRaisesRegex(RuntimeError, 'frame_binding'): owner.render_noise_display_candidate(master, bad)
        mosaic = gri.build_mosaic_master(frames, ENTRY, 32, .1)
        mosaic.mosaic_weights['301/1/1/1'][:] = .5
        with self.assertRaisesRegex(RuntimeError, 'weight_coherence'): owner.render_noise_display_candidate(mosaic, sources)
        changed = gri.build_mosaic_master(frames, ENTRY, 32, .1)
        changed.bands['r'].data[10,10] += .01
        with self.assertRaisesRegex(RuntimeError, 'coadd_value'): owner.render_noise_display_candidate(changed, sources)
        history = []; cancelled = lambda: bool(history)
        with self.assertRaisesRegex(RuntimeError, 'cancelled'):
            owner.render_noise_display_candidate(master, sources, chunk_rows=4, cancelled=cancelled, progress=history.append)
        self.assertEqual(len(history), 1)
        for b in gri.BANDS: self.assertTrue(np.isfinite(master.bands[b].data).all())

    def test_subset_geometry_mutation_reproduces_escaped_partial_rejection(self):
        frames, sources = source_frames()
        for f in frames: f.wcs.wcs.crpix -= [12,12]
        partial = gri.build_master(frames, ENTRY, 32, .1)
        code = inspect.getsource(owner._project_field)
        # Preserve indentation from the four-space function / loop body.
        code = code.replace('x0, y0 = np.full(sx.shape, -1, dtype=np.int64), np.full(sy.shape, -1, dtype=np.int64)',
                            'x0, y0 = stencil.x0.reshape(sx.shape), stencil.y0.reshape(sy.shape)')
        code = code.replace('        x0[stencil.geometry], y0[stencil.geometry] = stencil.x0, stencil.y0\n', '')
        namespace = dict(owner.__dict__);exec(code, namespace)
        with patch.object(owner, '_project_field', namespace['_project_field']):
            with self.assertRaises(ValueError): owner.render_noise_display_candidate(partial, sources)
        repaired = owner.render_noise_display_candidate(partial, sources)
        self.assertTrue(repaired.processable.any())
        self.assertFalse(repaired.processable[~partial.joint_available].any())

    def test_shared_native_difference_and_unknown_field_covariance_counterexamples(self):
        shape = (3,4,9,9)
        ids = np.zeros(shape,dtype=np.int64);weights = np.zeros(shape);weights[:,0] = 1
        variance = np.ones((3,9,9))*.2
        stencil = {'ids': ids, 'weights': weights, 'native_variance': np.ones(shape)*.2, 'variance': variance}
        actual = owner.pair_difference_variance(stencil,0,1)
        self.assertTrue((actual==0).all(), 'same native realization cancels')
        independent = .2+.2
        self.assertGreater(independent, float(actual.max()))
        upper = owner.conditional_variance_upper([np.array(.2),np.array(.4)])
        self.assertAlmostEqual(float(upper), .6+2*np.sqrt(.08))
        self.assertGreater(float(upper), .6, 'independent fields underestimate positive covariance')
        self.assertTrue(np.isnan(owner.conditional_variance_upper([np.array(.2),np.array(np.nan)])))
        values = np.zeros((3,9,9), dtype=np.float32); values[2,:,:4] = .2; values[0,:,4:] = .2
        result, _ = owner.filter_shared(values,np.ones((9,9),dtype=bool),lambda y,x: np.full((3,5,5),2*.005**2))
        np.testing.assert_array_equal(result,values[:,2:-2,2:-2])
        for constant in (0.,-.2,.2):
            values[:] = constant
            filtered,_ = owner.filter_shared(values,np.ones((9,9),dtype=bool),lambda y,x: np.ones((3,5,5)))
            np.testing.assert_array_equal(filtered,values[:,2:-2,2:-2])

    def test_explicit_estimate_pyramid_partial_area_black_and_changed_source(self):
        frames, sources = source_frames()
        for f in frames: f.data[:]=0; f.wcs.wcs.crpix -= [12,12]
        master = gri.build_master(frames, ENTRY, 32, .1)
        candidate = owner.render_noise_display_candidate(master, sources)
        products = owner.noise_display_pyramid(master,candidate,ENTRY,output_pixels=8)
        image = np.array(Image.open(io.BytesIO(products['OVERVIEW'][0])))
        self.assertTrue((image[:,:,:3]==0).all(),'available black is not absent')
        self.assertTrue((image[:,:,3]==255).any())
        self.assertTrue((image[:,:,3]==0).any())
        self.assertEqual(products['OVERVIEW'][1]['statisticalFitCalls'],0)
        self.assertIn('display-only',products['OVERVIEW'][1]['sampleMeaning'])
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'candidate'
            saved=owner.save_noise_display_candidate(path,master,candidate,ENTRY,output_pixels=8)
            self.assertEqual(saved['version'],owner.VERSION)
            self.assertEqual(saved['levels']['DETAIL']['sha256'],products['DETAIL'][1]['sha256'])
            self.assertNotIn('g-science',saved['arrays'])
            self.assertEqual(saved['arrays']['g']['file'],'g-display-estimates.npy')
            with self.assertRaises(FileExistsError):owner.save_noise_display_candidate(path,master,candidate,ENTRY,output_pixels=8)
        master.bands['g'].data[master.joint_available] += .01
        with self.assertRaisesRegex(RuntimeError,'source_changed'):owner.noise_display_pyramid(master,candidate,ENTRY,output_pixels=8)


if __name__ == '__main__': unittest.main()
