"""Boundary regressions for the shared diagnostic, not scientific quality tests."""
from pathlib import Path
import importlib.util, sys, unittest
ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),
    str(ROOT/'output/allwise-w3-atlas-0929/python-deps'), str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
spec = importlib.util.spec_from_file_location('native_response', Path(__file__).with_name('sdss-native-unit-response-2026-10-04.py'))
shared = importlib.util.module_from_spec(spec); sys.modules[spec.name] = shared; spec.loader.exec_module(shared)

class IdentityWcs:
    def all_world2pix(self, x, y, origin):
        assert origin == 0
        return x, y

class SignedPsf:
    def reconstruct(self, band, x, y):
        a = np.zeros((51, 51)); a[25, 25] = 1.25; a[25, 24] = -.25
        return a

class NativeResponseTest(unittest.TestCase):
    def sample(self, x, y, anchor=(50.,50.), shape=(100,100), psf=None):
        return shared.native_unit_response(psf or SignedPsf(), 'r', IdentityWcs(), shape,
            anchor, np.asarray(x,float), np.asarray(y,float))

    def test_integer_signed_kernel_and_subpixel_science_sampling(self):
        got = self.sample([49,49.25,50], [50,50,50])
        np.testing.assert_allclose(got.response, [-.25, .125, 1.25], rtol=0, atol=2e-7)
        self.assertTrue(got.support.all())
        self.assertLess(got.response[0],0)
        self.assertEqual(got.native_bounds,(49,50,52,52))

    def test_finite_domain_includes_unknown_zero_weight_neighbor(self):
        got = self.sample([74,75,76], [50,50,50])
        np.testing.assert_array_equal(got.support,[True,False,False])
        self.assertTrue(np.isnan(got.response[1:]).all())
        # Replacing unavailable support with zero falsely admits both pixels.
        self.assertEqual(int((np.isfinite(np.nan_to_num(got.response)) & ~got.support).sum()),2)

    def test_clipped_ccd_and_nonfinite_queries_keep_unknown(self):
        got = self.sample([0,78,79,-1,np.inf], [2,2,2,2,2], anchor=(5,2), shape=(80,80))
        self.assertEqual(got.native_bounds,(0,2,80,4))
        np.testing.assert_array_equal(got.support,[True,False,False,False,False])
        self.assertTrue(np.isnan(got.response[1:]).all())

    def test_empty_stencil_or_outside_anchor_has_no_invented_kernel(self):
        for got in (self.sample([100],[0]), self.sample([1],[1],anchor=(-1,1)),
                    self.sample([0],[0],shape=(1,1))):
            self.assertIsNone(got.kernel); self.assertIsNone(got.native_model)
            self.assertFalse(got.support.any()); self.assertTrue(np.isnan(got.response).all())

    def test_invalid_signed_unit_model_is_rejected(self):
        class Bad:
            def reconstruct(self,*args): return np.zeros((51,51))
        with self.assertRaisesRegex(RuntimeError,'kernel_invalid'):
            self.sample([50],[50],psf=Bad())

if __name__ == '__main__': unittest.main()
