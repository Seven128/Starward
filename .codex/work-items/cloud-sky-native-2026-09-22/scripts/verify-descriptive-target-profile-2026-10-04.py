"""Actual responsibility boundaries for descriptive target profile diagnostics."""
from pathlib import Path
import importlib.util,sys,unittest
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
spec=importlib.util.spec_from_file_location('descriptive_target',Path(__file__).with_name('sdss-descriptive-target-profile-2026-10-04.py'))
m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m)

class ProfileBoundaries(unittest.TestCase):
    def test_recorded_mean_transforms_plane_after_asymmetric_exclusion(self):
        y,x=np.mgrid[:3,:3];chosen=np.array([0,1,3,4,5,6,7,8]);offsets=np.array([0,8,9]);chosen=np.r_[chosen,4]
        mapped=m.recorded_affine_basis(x,y,(1,1),offsets,chosen)
        np.testing.assert_array_equal(mapped[1],[1,0,0]);self.assertNotEqual(mapped[0,1],0)
        plane=m.affine_basis(x,y,(1,1))@np.array([2.,3.,-4.])
        np.testing.assert_allclose(mapped@np.array([2.,3.,-4.]),[plane.ravel()[chosen[:8]].mean(),plane[1,1]],rtol=0,atol=8*np.finfo(float).eps)
    def test_signed_nonpositive_amplitude_is_retained(self):
        x=np.tile(np.arange(3),3);y=np.repeat(np.arange(3),3);basis=m.affine_basis(x,y,(1,1));unit=np.array([0,1,0,1,4,1,0,1,0.],float)
        coeff=np.array([-2.,.2,.3,-.4]);data=np.column_stack((unit,basis))@coeff
        fit=m.descriptive_profile(data,unit,basis,np.ones(9,bool));self.assertLess(fit.coefficients[0],0)
        np.testing.assert_allclose(fit.prediction,data,rtol=0,atol=64*np.finfo(float).eps*abs(data).max())
    def test_rank_missing_and_nonfinite_do_not_become_valid(self):
        x=np.arange(8);basis=m.affine_basis(x,np.zeros(8),(0,0))
        self.assertIsNone(m.descriptive_profile(x,x,basis,np.ones(8,bool)))
        with self.assertRaisesRegex(ValueError,'nonfinite'):
            m.descriptive_profile(x,np.r_[np.nan,np.arange(7)],basis,np.ones(8,bool))
        with self.assertRaisesRegex(ValueError,'missing'):
            m.recorded_affine_basis(x,np.zeros(8),(0,0),np.array([0,0]),np.array([],int))

if __name__=='__main__':unittest.main()
