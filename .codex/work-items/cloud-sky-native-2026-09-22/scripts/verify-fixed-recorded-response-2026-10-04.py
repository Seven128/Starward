"""Recorded-branch regressions, not threshold re-selection or quality tests."""
from pathlib import Path
import importlib.util,sys,unittest
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
spec=importlib.util.spec_from_file_location('fixed_response',Path(__file__).with_name('sdss-fixed-recorded-display-response-2026-10-04.py'))
m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m)

class FixedResponseTest(unittest.TestCase):
    def inputs(self):
        raw=np.broadcast_to(np.arange(25,dtype=np.float32).reshape(1,5,5),(3,5,5)).copy()
        model=raw.astype(float)-13;known=np.ones(raw.shape,bool);q=np.ones((5,5),bool);strong=np.zeros((5,5),bool)
        return raw,model,known,q,strong

    def test_actual_circle_excludes_strong_and_preserves_signed_model(self):
        raw,model,known,q,strong=self.inputs();strong[1,2]=True;raw[:,1,2]=1000;model[:,1,2]=500
        r=m.fixed_recorded_response(raw,model,known,q,strong,np.array([[2,2]]),np.array([1]))
        np.testing.assert_array_equal(r.actual_estimates[:,0],[13.25]*3)
        np.testing.assert_array_equal(r.response[:,0],[.25]*3)
        np.testing.assert_array_equal(r.selected_sample_ids,[11,12,13,17])
        self.assertTrue(r.known.all());self.assertFalse(np.isclose(model[:,1:4,2].mean(),r.response[0,0]))

    def test_known_excluded_model_unknown_does_not_contaminate_but_selected_does(self):
        raw,model,known,q,strong=self.inputs();strong[1,2]=True;known[:,1,2]=False;model[:,1,2]=np.nan
        r=m.fixed_recorded_response(raw,model,known,q,strong,np.array([[2,2]]),np.array([1]));self.assertTrue(r.known.all())
        known[1,2,1]=False;model[1,2,1]=np.nan
        r=m.fixed_recorded_response(raw,model,known,q,strong,np.array([[2,2]]),np.array([1]))
        np.testing.assert_array_equal(r.known[:,0],[True,False,True]);self.assertTrue(np.isnan(r.response[1,0]))

    def test_full_circle_unknown_cannot_be_hidden_by_strong_exclusion(self):
        raw,model,known,q,strong=self.inputs();q[1,2]=False
        with self.assertRaisesRegex(RuntimeError,'circle_unqualified'):
            m.fixed_recorded_response(raw,model,known,q,strong,np.array([[2,2]]),np.array([1]))

    def test_raw_and_strong_fallback_do_not_apply_an_aperture(self):
        raw,model,known,q,strong=self.inputs();strong[2,2]=True
        r=m.fixed_recorded_response(raw,model,known,q,strong,np.array([[2,2],[0,0]]),np.array([0,-1]))
        np.testing.assert_array_equal(r.actual_estimates[:,0],[12]*3)
        np.testing.assert_array_equal(r.response[:,0],[-1]*3);np.testing.assert_array_equal(r.response[:,1],[-13]*3)
        np.testing.assert_array_equal(r.offsets,[0,1,2])

    def test_wrong_branch_or_missing_real_halo_is_rejected(self):
        raw,model,known,q,strong=self.inputs()
        for coords,radius in [([[0,0]],[1]),([[2,2]],[0]),([[2,2]],[3])]:
            with self.assertRaises(RuntimeError):
                m.fixed_recorded_response(raw,model,known,q,strong,np.array(coords),np.array(radius))

if __name__=='__main__':unittest.main()
