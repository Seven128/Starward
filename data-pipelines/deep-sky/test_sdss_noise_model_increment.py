"""Actual model-change success, real halo, source/parent/cancel/export boundaries."""
from dataclasses import replace
from pathlib import Path
import copy,io,tempfile,unittest,inspect
from unittest.mock import patch
import numpy as np
from PIL import Image
import sdss_noise_display as noise
import sdss_display_recovery as recovery
import sdss_adaptive_display as adaptive
import sdss_noise_model_increment as owner
from image_quality import digest
from sdss_noise_display_provenance import canonical_bytes
from test_sdss_recovered_apertures import fixture
from test_sdss_gri_tan import ENTRY

NATIVE=noise.native_noise_samples

def legacy_complete_grid(frame,camera,x,y):
    # Exact rejected-grid behaviour for this controlled constant-SKY fixture;
    # not relabelled as an archived real production execution.
    a=NATIVE(frame,camera,x,y);available=a.available&a.sky_geometry
    return replace(a,available=available,variance_nmgy_squared=np.where(available,a.variance_nmgy_squared,np.nan))

def prepared():
    master,_,_,sources=fixture()
    for bands in sources.values():
        for source in bands.values():source.frame.calibration_sky.xinterp[20:24]=4.2
    with patch.object(noise,'native_noise_samples',legacy_complete_grid):
        parent=adaptive.refine_adaptive_real_halo(master,adaptive.render_adaptive_display_candidate(master,sources),sources)
        raw=recovery.recover_other_scan_display(master,parent,sources)
        interior=recovery.refine_current_recovery_interior(master,parent,raw,sources)
        baseline=recovery.refine_current_recovery_real_halo(master,parent,raw,interior,sources)
        _,fields,weights=noise._qualified_sources(master,sources);groups,dates=recovery._scan_groups(fields,sources)
        before=owner._sample_current_model(master,sources,fields,weights,groups,dates,(slice(-8,48),slice(-8,48)),lambda:None)
    after=owner._sample_current_model(master,sources,fields,weights,groups,dates,(slice(-8,48),slice(-8,48)),lambda:None)
    changed=(before[4]!=after[4])|(before[5]!=after[5])|(before[6]!=after[6])
    changed|=~((before[0]==after[0])|(np.isnan(before[0])&np.isnan(after[0]))).all(axis=0)
    demand=recovery._supply_dependency(changed,8)[8:-8,8:-8]
    plan=owner.NoiseModelDependencyPlan(changed,demand,after[3][8:-8,8:-8].copy(),after[4][8:-8,8:-8].copy(),after[5][8:-8,8:-8].copy(),{
        'previousModel':owner.PREVIOUS_MODEL,'currentModel':owner.SKY_RECONSTRUCTION_VERSION,
        'parentReportCanonicalSha256':digest(canonical_bytes(baseline.report)),
        'currentModelImplementationSha256':owner._code_identity()['sdss_frame_noise.py'],
        'previousModelImplementationSha256':'0'*64,'wholeCropEvidenceSha256':'1'*64,'exteriorEvidenceSha256':'2'*64,'readbackEvidenceSha256':'3'*64})
    return master,baseline,sources,plan,after

def identity(plan):return digest(canonical_bytes(owner.plan_identity(plan)))

class ModelIncrementTest(unittest.TestCase):
    def test_real_changed_qualification_matches_common_policy_and_preserves_unrequested(self):
        master,baseline,sources,plan,after=prepared();original={b:master.bands[b].data.copy() for b in 'gri'}
        self.assertTrue(plan.requested.any());self.assertTrue((plan.recovered_qualified&~baseline.qualified).any())
        result=owner.refresh_retained_sky_model(master,baseline,sources,plan,expected_plan_sha256=identity(plan),chunk_rows=7,batch_size=5)
        reference=adaptive.adaptive_common_display_batched(after[0],after[1],list(after[2].values()),batch_size=5)
        self.assertGreater(result.changed.sum(),0);self.assertEqual(result.report['version'],owner.VERSION)
        np.testing.assert_array_equal(result.requested,plan.requested)
        for at,b in enumerate('gri'):
            np.testing.assert_array_equal(result.estimates[b][plan.requested],reference.estimates[at,8:-8,8:-8][plan.requested])
            np.testing.assert_array_equal(result.estimates[b][~plan.requested],baseline.estimates[b][~plan.requested])
            np.testing.assert_array_equal(result.estimates[b][baseline.protected],baseline.estimates[b][baseline.protected])
            np.testing.assert_array_equal(master.bands[b].data,original[b])
        np.testing.assert_array_equal(result.radius[plan.requested],reference.radius[8:-8,8:-8][plan.requested])
        self.assertTrue(any(r['realExteriorUsed'] for r in result.report['regions']))

    def test_parent_model_hash_and_incomplete_external_demand_reject_before_projection(self):
        master,baseline,sources,plan,_=prepared()
        cases=[]
        wrong=copy.deepcopy(plan);wrong.binding['currentModel']='old';cases.append((baseline,wrong,identity(wrong)))
        wrong=copy.deepcopy(plan);wrong.requested[np.argwhere(wrong.requested)[0].tolist()[0],np.argwhere(wrong.requested)[0].tolist()[1]]=False;cases.append((baseline,wrong,identity(wrong)))
        forged=copy.deepcopy(baseline);forged.report['version']='fake';cases.append((forged,plan,identity(plan)))
        for parent,pin,sha in cases:
            with patch.object(owner,'_sample_current_model',side_effect=AssertionError('forged evidence consumed')):
                with self.assertRaises(RuntimeError):owner.refresh_retained_sky_model(master,parent,sources,pin,expected_plan_sha256=sha)
        changed=copy.deepcopy(plan);changed.requested[0,0]^=True
        with self.assertRaisesRegex(RuntimeError,'plan_changed'):
            owner.refresh_retained_sky_model(master,baseline,sources,changed,expected_plan_sha256=identity(plan))

    def test_actual_qualification_cannot_be_supplied_by_a_relabelled_diagnostic(self):
        master,baseline,sources,plan,_=prepared();bad=copy.deepcopy(plan)
        y,x=np.argwhere(plan.requested&plan.recovered_qualified&~plan.recovered_protected)[0]
        bad.recovered_protected[y,x]=True;bad.extended_changed[y+8,x+8]=True
        # Keep a complete schedule after the forged extra role dependency.
        bad.requested[:]=recovery._supply_dependency(bad.extended_changed,8)[8:-8,8:-8]
        with self.assertRaisesRegex(RuntimeError,'actual_support_changed'):
            owner.refresh_retained_sky_model(master,baseline,sources,bad,expected_plan_sha256=identity(bad))

    def test_late_cancellation_and_source_changes_return_no_partial_candidate(self):
        master,baseline,sources,plan,_=prepared();sha=identity(plan);calls=[]
        def stop():calls.append(1);return len(calls)>18
        with self.assertRaisesRegex(RuntimeError,'cancelled'):
            owner.refresh_retained_sky_model(master,baseline,sources,plan,expected_plan_sha256=sha,chunk_rows=7,cancelled=stop)
        original={b:baseline.estimates[b].copy() for b in 'gri'};did=[]
        def change(_):
            if not did:sources[next(iter(sources))]['g'].frame.calibration_sky.allsky[:]*=2;did.append(1)
        with self.assertRaisesRegex(RuntimeError,'source_changed|actual_support_changed'):
            owner.refresh_retained_sky_model(master,baseline,sources,plan,expected_plan_sha256=sha,chunk_rows=7,progress=change)
        for b in 'gri':np.testing.assert_array_equal(baseline.estimates[b],original[b])

    def test_missing_complete_circle_guard_escapes_one_changed_weak_consumer(self):
        master,baseline,sources,plan,_=prepared()
        complete=owner.refresh_retained_sky_model(master,baseline,sources,plan,expected_plan_sha256=identity(plan))
        y,x=np.argwhere(complete.changed&baseline.qualified&~baseline.protected&
            (plan.recovered_protected==baseline.protected))[0]
        omitted=copy.deepcopy(plan);omitted.requested[y,x]=False
        with self.assertRaisesRegex(RuntimeError,'incomplete_halo'):
            owner.refresh_retained_sky_model(master,baseline,sources,omitted,expected_plan_sha256=identity(omitted))
        code=inspect.getsource(owner._admit_plan)
        guard="    if not np.array_equal(actual,plan.requested):\n        raise RuntimeError('sdss_noise_model_plan_incomplete_halo')\n"
        self.assertIn(guard,code);namespace=dict(owner.__dict__);exec(code.replace(guard,''),namespace)
        with patch.object(owner,'_admit_plan',namespace['_admit_plan']):
            escaped=owner.refresh_retained_sky_model(master,baseline,sources,omitted,expected_plan_sha256=identity(omitted))
        self.assertFalse(escaped.requested[y,x])
        self.assertTrue(any(escaped.estimates[b][y,x]!=complete.estimates[b][y,x] for b in 'gri'))
        for b in 'gri':self.assertEqual(escaped.estimates[b][y,x],baseline.estimates[b][y,x])

    def test_new_typed_export_keeps_science_alpha_and_old_types_reject_new_model(self):
        master,baseline,sources,plan,_=prepared();result=owner.refresh_retained_sky_model(master,baseline,sources,plan,expected_plan_sha256=identity(plan))
        products=owner.source_noise_increment_products(master,result,ENTRY,output_pixels=10)
        old=recovery.recovered_aperture_products(master,baseline,ENTRY,output_pixels=10)
        for level,(raw,meta) in products.items():
            np.testing.assert_array_equal(np.asarray(Image.open(io.BytesIO(raw)))[:,:,3],np.asarray(Image.open(io.BytesIO(old[level][0])))[:,:,3])
            self.assertEqual(meta['processingVersion'],owner.VERSION)
        with self.assertRaises(RuntimeError):recovery.recovered_aperture_products(master,result,ENTRY,output_pixels=10)
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/'candidate';report=owner.save_source_noise_increment(out,master,result,ENTRY,output_pixels=10)
            self.assertFalse(report['adopted']);self.assertEqual(report['currentModel'],owner.SKY_RECONSTRUCTION_VERSION)
            with self.assertRaises(FileExistsError):owner.save_source_noise_increment(out,master,result,ENTRY,output_pixels=10)
        bad=copy.deepcopy(result);bad.report['currentModel']='old'
        with self.assertRaises(RuntimeError):owner.source_noise_increment_products(master,bad,ENTRY,output_pixels=10)
        master.bands['g'].data[0,0]+=.001
        with self.assertRaisesRegex(RuntimeError,'estimate_changed'):
            owner.source_noise_increment_products(master,result,ENTRY,output_pixels=10)

if __name__=='__main__':unittest.main()
