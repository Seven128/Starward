"""Finite weak interval, core gradation, shared color and admission boundaries."""
import unittest
import numpy as np
from optical_display_highlights import compress_display_highlights,KNEE

class DisplayHighlightTests(unittest.TestCase):
    def test_finite_interval_exact_including_weak_colors_and_no_mutation(self):
        v=np.array([[[0,.01,.2,.5,KNEE]],[[0,.006,.13,.2,.4]],[[0,0,.04,.05,.1]]],dtype='f4')
        original=v.copy();result=compress_display_highlights(v)
        # Float32 .76 is slightly below the mathematical knee, still untouched.
        self.assertTrue(np.array_equal(result,v.astype('f8')))
        self.assertTrue(np.array_equal(v,original));self.assertFalse(np.shares_memory(result,v))

    def test_old_bright_plateau_is_replaced_with_strict_same_color_order(self):
        v=np.array([[[1.25,2.5]],[[.5,1.]],[[.25,.5]]],dtype='f8')
        old=v/np.maximum(1,v.max(axis=0));self.assertTrue(np.array_equal(old[:,0,0],old[:,0,1]))
        new=compress_display_highlights(v)
        self.assertGreater(new[:,0,1].max(),new[:,0,0].max())
        self.assertTrue((new>=0).all() and (new<1).all())
        self.assertTrue(np.allclose(new[0]*v[1],new[1]*v[0],rtol=4*np.finfo('f8').eps,atol=0))

    def test_original_source_shoulder_equation_and_continuous_unit_derivative(self):
        v=np.array([[[1.,KNEE-1e-6,KNEE,KNEE+1e-6]],[[.5,0,0,0]],[[.25,0,0,0]]])
        result=compress_display_highlights(v)
        self.assertTrue(np.allclose(result[:,0,0],[.88,.44,.22],rtol=2*np.finfo('f8').eps,atol=0))
        self.assertAlmostEqual((result[0,0,3]-result[0,0,2])/1e-6,1,places=4)
        self.assertEqual(result[0,0,1],v[0,0,1]);self.assertEqual(result[0,0,2],KNEE)

    def test_invalid_science_shapes_types_and_nonfinite_are_rejected(self):
        valid=np.zeros((3,2,2),dtype='f4')
        for value in (valid-1,valid+np.nan,valid+np.inf,valid.astype('i4'),valid.astype('f2'),
                      valid[0],np.zeros((4,2,2)),np.zeros((3,0,2)),[[[0]]]*3):
            with self.subTest(valueType=type(value).__name__):
                with self.assertRaises(ValueError):compress_display_highlights(value)

    def test_finite_extremes_keep_bounds_without_material_offset_or_white_mix(self):
        v=np.array([[[1e300,.5]],[[1e299,.2]],[[0,.1]]],dtype='f8')
        result=compress_display_highlights(v)
        self.assertTrue(np.isfinite(result).all() and (result>=0).all() and (result<=1).all())
        self.assertEqual(result[2,0,0],0);self.assertEqual(result[1,0,1],.2)

if __name__=='__main__':unittest.main()
