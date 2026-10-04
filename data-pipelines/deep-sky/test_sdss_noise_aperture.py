import unittest
import numpy as np
from sdss_noise_aperture import field_aperture_variance,aperture_variance_upper,batch_field_aperture_variance


def stencil(ids,weights,variance):
    result={key:np.zeros((3,4,1,len(ids)),dtype=dtype) for key,dtype in
      [('ids',np.int64),('weights',float),('native_variance',float)]}
    result['ids'][:,0,0]=ids;result['weights'][:,0,0]=weights
    result['native_variance'][:,0,0]=variance
    return result


class ApertureVarianceTest(unittest.TestCase):
    def test_batch_does_not_lose_small_independent_coefficients_after_large_groups(self):
        s=stencil([1,2],[1,1e-16],[1,1e32]);selected=np.ones((1,2),bool)
        expected=field_aperture_variance(s,selected)[0]
        actual=batch_field_aperture_variance(s['ids'][0].reshape(1,4,2),s['weights'][0].reshape(1,4,2),s['native_variance'][0].reshape(1,4,2),selected)
        np.testing.assert_allclose(actual,[expected],rtol=2e-13,atol=0)

    def test_batch_matches_scalar_with_repeated_native_ids_and_inactive_unknowns(self):
        rng=np.random.default_rng(29);ids=rng.integers(0,11,(9,4,23));weights=rng.random(ids.shape)
        native=(ids+1).astype(float);selected=rng.random((9,23))>.3
        weights[:,3]=0;ids[:,3]=-1;native[:,3]=np.nan
        actual=batch_field_aperture_variance(ids,weights,native,selected)
        expected=[]
        for row in range(9):
            s={k:np.repeat(v[row][None,:,None,:],3,axis=0) for k,v in [('ids',ids),('weights',weights),('native_variance',native)]}
            expected.append(field_aperture_variance(s,selected[row][None])[0])
        np.testing.assert_allclose(actual,expected,rtol=2e-13,atol=0)
        weights[1,3,0]=1;selected[1,0]=True
        self.assertTrue(np.isnan(batch_field_aperture_variance(ids,weights,native,selected)[1]))

    def test_batch_retains_unsigned_native_identity_and_rejects_incoherence(self):
        ids=np.full((1,4,2),np.iinfo(np.uint64).max,np.uint64);weights=np.zeros(ids.shape);weights[:,0]=1
        native=np.ones(ids.shape)*4;selected=np.ones((1,2),bool)
        np.testing.assert_array_equal(batch_field_aperture_variance(ids,weights,native,selected),[4])
        native[0,0,1]=5
        with self.assertRaisesRegex(RuntimeError,'native_variance_incoherent'):batch_field_aperture_variance(ids,weights,native,selected)
        with self.assertRaisesRegex(RuntimeError,'batch_invalid'):batch_field_aperture_variance(ids,weights,native,np.zeros((1,2),bool))

    def test_two_target_samples_of_same_native_pixel_do_not_gain_sqrt_two(self):
        value=field_aperture_variance(stencil([7,7],[1,1],[4,4]),np.ones((1,2),bool))
        np.testing.assert_array_equal(value,[4,4,4])
        # A wrong independent-target computation would return variance2.
        self.assertFalse(np.array_equal(value,[2,2,2]))

    def test_distinct_native_pixels_and_spatial_field_weights(self):
        value=field_aperture_variance(stencil([7,8],[.25,.75],[4,4]),np.ones((1,2),bool))
        np.testing.assert_array_equal(value,[.625]*3)

    def test_zero_contribution_unknown_is_neutral_but_positive_unknown_stays_unknown(self):
        mask=np.ones((1,2),bool)
        np.testing.assert_array_equal(field_aperture_variance(stencil([7,-1],[1,0],[4,np.nan]),mask),[1]*3)
        self.assertTrue(np.isnan(field_aperture_variance(stencil([7,-1],[1,.1],[4,np.nan]),mask)).all())

    def test_repeated_native_id_cannot_borrow_a_different_variance(self):
        with self.assertRaisesRegex(RuntimeError,'native_variance_incoherent'):
            field_aperture_variance(stencil([7,7],[1,1],[4,5]),np.ones((1,2),bool))

    def test_fields_are_not_assumed_independent_and_missing_is_not_zero(self):
        mask=np.ones((1,1),bool);a=stencil([7],[.5],[4]);b=stencil([7],[.5],[4])
        np.testing.assert_array_equal(aperture_variance_upper([a,b],mask),[4]*3)
        unknown=stencil([-1],[.5],[np.nan])
        self.assertTrue(np.isnan(aperture_variance_upper([a,unknown],mask)).all())

    def test_empty_aperture_and_negative_coadd_weight_rejected(self):
        s=stencil([7],[1],[4])
        with self.assertRaisesRegex(RuntimeError,'stencil_invalid'):field_aperture_variance(s,np.zeros((1,1),bool))
        s['weights'][:,0,0]=-.1
        with self.assertRaisesRegex(RuntimeError,'stencil_invalid'):field_aperture_variance(s,np.ones((1,1),bool))


if __name__=='__main__':unittest.main()
