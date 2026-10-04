import unittest
from unittest.mock import patch
import numpy as np
from sdss_adaptive_display import adaptive_common_display,adaptive_common_display_batched

def model(n):
    ids=np.zeros((3,4,n,n),np.int64);ids[:,0]=np.arange(n*n).reshape(n,n)
    weights=np.zeros_like(ids,float);weights[:,0]=1
    native=np.ones_like(weights)
    return {'ids':ids,'weights':weights,'native_variance':native,'variance':np.ones((3,n,n))}

class AdaptiveDisplayTest(unittest.TestCase):
    def test_batch_partition_matches_scalar_for_shared_native_noise_masks_and_structure(self):
        n=25;rng=np.random.default_rng(30);v=rng.normal(.15,.2,(3,n,n)).astype(np.float32)
        v[0,12,12]=20;valid=np.ones((n,n),bool);valid[9,9]=False
        a=model(n);a['ids'][:,0]=np.arange(n*n).reshape(n,n)//2
        a['variance'][:,16,16]=np.nan
        b=model(n);b['weights']*=.3;b['variance']*=.09
        expected=adaptive_common_display(v,valid,[a,b])
        for size in (1,7,64):
            actual=adaptive_common_display_batched(v,valid,[a,b],batch_size=size)
            for key in ('estimates','radius','reached','protected'):
                np.testing.assert_array_equal(getattr(actual,key),getattr(expected,key))
                self.assertFalse(getattr(actual,key).flags.writeable)
        negative=adaptive_common_display_batched(-v,valid,[a,b])
        np.testing.assert_array_equal(negative.estimates,-expected.estimates)

    def test_batch_common_stop_boundary_and_cancellation(self):
        n=21;v=np.full((3,n,n),np.float32(3/np.sqrt(5)),np.float32);s=model(n)
        expected=adaptive_common_display(v,np.ones((n,n),bool),[s])
        actual=adaptive_common_display_batched(v,np.ones((n,n),bool),[s])
        np.testing.assert_array_equal(actual.radius,expected.radius)
        np.testing.assert_array_equal(actual.reached,expected.reached)
        # Exactly representable samples and a controlled ratio exercise the
        # scalar fallback itself, rather than merely comparing distant gates.
        import sdss_adaptive_display as owner
        with patch.object(owner,'RATIO',np.sqrt(5)),patch.object(owner,'aperture_variance_upper',wraps=owner.aperture_variance_upper) as fallback:
            ones=np.ones_like(v);expected=adaptive_common_display(ones,np.ones((n,n),bool),[s])
            fallback.reset_mock();actual=adaptive_common_display_batched(ones,np.ones((n,n),bool),[s])
            self.assertGreater(fallback.call_count,0)
            np.testing.assert_array_equal(actual.radius,expected.radius)
            np.testing.assert_array_equal(actual.reached,expected.reached)
        calls=0
        def cancel():
            nonlocal calls;calls+=1;return calls>3
        with self.assertRaisesRegex(RuntimeError,'cancelled'):adaptive_common_display_batched(v,np.ones((n,n),bool),[s],cancelled=cancel)
        for size in (0,257,True):
            with self.assertRaisesRegex(RuntimeError,'batch_size_invalid'):adaptive_common_display_batched(v,np.ones((n,n),bool),[s],batch_size=size)

    def test_strong_single_band_keeps_whole_colour_and_never_spreads(self):
        n=21;v=np.zeros((3,n,n),np.float32);v[0,10,10]=100
        s=model(n);result=adaptive_common_display(v,np.ones((n,n),bool),[s])
        np.testing.assert_array_equal(result.estimates,v)
        self.assertTrue(result.protected[10,10])
        self.assertEqual(result.radius[10,10],0)

    def test_shared_support_is_sign_neutral_and_unreached_does_not_become_missing(self):
        n=21;rng=np.random.default_rng(27);v=rng.normal(0,.2,(3,n,n)).astype(np.float32)
        s=model(n);a=adaptive_common_display(v,np.ones((n,n),bool),[s]);b=adaptive_common_display(-v,np.ones((n,n),bool),[s])
        np.testing.assert_array_equal(a.estimates,-b.estimates)
        np.testing.assert_array_equal(a.radius,b.radius)
        self.assertFalse(a.reached.any());self.assertEqual(a.radius[10,10],8)
        self.assertFalse(a.estimates.flags.writeable)

    def test_flagged_or_unknown_source_support_preserves_original(self):
        n=21;v=np.full((3,n,n),.2,np.float32);valid=np.ones((n,n),bool);valid[10,11]=False
        result=adaptive_common_display(v,valid,[model(n)])
        np.testing.assert_array_equal(result.estimates[:,10,10],v[:,10,10]);self.assertEqual(result.radius[10,10],-1)
        s=model(n);s['variance'][:,10,11]=np.nan
        unknown=adaptive_common_display(v,np.ones((n,n),bool),[s])
        np.testing.assert_array_equal(unknown.estimates[:,10,10],v[:,10,10])

    def test_outer_halo_stays_original_and_cancel_returns_no_partial(self):
        n=21;rng=np.random.default_rng(28);v=rng.normal(0,.2,(3,n,n)).astype(np.float32);s=model(n)
        result=adaptive_common_display(v,np.ones((n,n),bool),[s]);np.testing.assert_array_equal(result.estimates[:,:8],v[:,:8])
        calls=0
        def cancel():
            nonlocal calls;calls+=1;return calls>2
        with self.assertRaisesRegex(RuntimeError,'cancelled'):adaptive_common_display(v,np.ones((n,n),bool),[s],cancelled=cancel)
        self.assertTrue(v.flags.writeable)

    def test_weak_constant_preserved_and_common_ratio_selects_same_aperture(self):
        n=21;v=np.stack([np.full((n,n),x,np.float32) for x in (.8,1,1.2)])
        result=adaptive_common_display(v,np.ones((n,n),bool),[model(n)])
        np.testing.assert_array_equal(result.estimates,v)
        self.assertTrue(result.reached[10,10]);self.assertEqual(result.radius[10,10],4)

if __name__=='__main__':unittest.main()
