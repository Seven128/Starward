"""Saved M82 descriptive projections: independent coordinate sums and QR solve.

No producer/profile helper/source processing imports. Different floating
arithmetic verifies the projection, not independent science/quality review.
"""
from pathlib import Path
import hashlib,json,math,sys,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
GEN=ROOT/'output/sdss-m82-target-profile-1004-r1';OUT=ROOT/'output/sdss-m82-target-profile-readback-1004-r1'

def bind(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def save(p,v):
    with p.open('x',encoding='utf-8',newline='\n') as f:json.dump(v,f,indent=2,allow_nan=False)
def solve(design,data):
    q,r=np.linalg.qr(design,mode='reduced');return np.linalg.solve(r,q.T@data)

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes());started=time.perf_counter()
    result=json.loads((GEN/'result.json').read_bytes());inputs=json.loads((GEN/'inputs-before.json').read_bytes())
    assert inputs==json.loads((GEN/'inputs-after.json').read_bytes())
    for v in inputs:assert bind(ROOT/v['path'])==v
    source=json.loads((ROOT/'output/sdss-m82-fixed-display-response-1004-r1/result.json').read_bytes())
    facts=[];worst_basis=worst_qr=worst_ratio=0.;wrong_plane=wrong_unit=fit_count=unknown=nonpositive=0
    eps=np.finfo(float).eps
    for row,original in zip(result['records'],source['records'],strict=True):
        assert row['index']==original['index'] and row['material']==original['material']
        path=ROOT/row['saved']['path'];assert bind(path)==row['saved']
        with np.load(path,allow_pickle=False) as z:a={k:z[k] for k in z.files}
        with np.load(ROOT/original['arrays']['path'],allow_pickle=False) as z:old={k:z[k] for k in z.files}
        gy,gx=old['target_global_yx'].T;cx,cy=row['anchorTargetXY']
        basis=np.array([[1.,(float(x)-cx)/12,(float(y)-cy)/12] for y,x in zip(gy,gx)])
        np.testing.assert_array_equal(basis,a['science_basis']);np.testing.assert_array_equal(old['target_global_yx'],a['global_targets_yx'])
        xs,ys=old['source_target_x'].ravel(),old['source_target_y'].ravel();offsets=old['selected_offsets'];ids=old['selected_sample_ids']
        mapped=np.array([[1.,math.fsum((float(xs[t])-cx)/12 for t in ids[start:end])/(end-start),
            math.fsum((float(ys[t])-cy)/12 for t in ids[start:end])/(end-start)] for start,end in zip(offsets[:-1],offsets[1:])])
        basis_delta=float(np.max(abs(mapped-a['current_recorded_basis'])));worst_basis=max(worst_basis,basis_delta)
        assert basis_delta<=64*eps*max(1.,float(np.max(abs(mapped))))
        valid=np.isfinite(old['target_saved_science_unit'])&old['fixed_unit_known']&old['current_qualified'][None]
        valid&=np.isfinite(old['target_science'])&np.isfinite(old['fixed_actual_estimates'])
        np.testing.assert_array_equal(valid,a['shared_fit_support']);unknown+=int((~valid).sum())
        for stage,old_data,old_unit,stored_basis in (('science','target_science','target_saved_science_unit',a['science_basis']),
                ('current','fixed_actual_estimates','fixed_unit_response',a['current_recorded_basis'])):
            np.testing.assert_array_equal(a[stage+'_data'],old[old_data]);np.testing.assert_array_equal(a[stage+'_unit'],old[old_unit])
            for at,b in enumerate('gri'):
                v=valid[at];data=a[stage+'_data'][at].astype(float);unit=a[stage+'_unit'][at].astype(float)
                design=np.column_stack((unit,stored_basis));x=design[v];y=data[v];m=row['bands'][b][stage]
                if m['state']=='UNAVAILABLE_SUPPORT_OR_RANK':assert len(y)<=4 or np.linalg.matrix_rank(x)<4;continue
                fit_count+=1;coef=a[stage+'_coefficients'][at];prediction=design@coef;residual=data-prediction
                np.testing.assert_array_equal(prediction,a[stage+'_prediction'][at]);np.testing.assert_array_equal(residual,a[stage+'_residual'][at])
                np.testing.assert_array_equal(coef,m['coefficientsUnitConstantDx12Dy12'])
                assert (coef[0]<=0)==(m['state']=='DESCRIPTIVE_NONPOSITIVE_AMPLITUDE');nonpositive+=int(coef[0]<=0)
                alternate=solve(x,y);q_prediction=x@alternate;difference=float(np.max(abs(q_prediction-prediction[v])));worst_qr=max(worst_qr,difference)
                condition=float(np.linalg.cond(x));bound=64*eps*condition*max(float(np.max(abs(y))),float(np.max(abs(prediction[v]))),np.finfo(float).tiny)
                assert difference<=bound,(row['index'],b,stage,difference,bound)
                worst_ratio=max(worst_ratio,difference/bound)
                rss=float(np.square(residual[v]).sum());assert rss==m['residualSumSquaresNmgySquared']
                assert float(np.sqrt(rss/v.sum()))==m['residualRmsNmgy']
                assert float(np.max(abs(residual[v])))==m['residualMaximumAbsoluteNmgy']
                plane=stored_basis@a[stage+'_plane_only_coefficients'][at]
                np.testing.assert_array_equal(plane,a[stage+'_plane_only_prediction'][at])
                plane_rss=float(np.square(data[v]-plane[v]).sum());assert plane_rss==m['planeOnlyResidualSumSquaresNmgySquared']
                assert rss<=plane_rss+64*eps*max(plane_rss,np.finfo(float).tiny)
                radius=np.hypot(gx-cx,gy-cy)
                for label,mask in (('core0to3',radius<=3),('annulus3to7',(radius>3)&(radius<=7)),('annulus7to12',(radius>7)&(radius<=12))):
                    use=mask&v;s=m['radialResiduals'][label];assert s['support']==int(use.sum())
                    assert s['residualRmsNmgy']==(float(np.sqrt(np.mean(residual[use]**2))) if use.any() else None)
                if stage=='current':
                    naive=np.column_stack((unit,basis));wrong=naive[v]@solve(naive[v],y)
                    wrong_plane+=int(float(np.max(abs(wrong-prediction[v])))>bound)
                    science_unit=np.column_stack((a['science_unit'][at].astype(float),stored_basis));wrong=science_unit[v]@solve(science_unit[v],y)
                    wrong_unit+=int(float(np.max(abs(wrong-prediction[v])))>bound)
        native=row['originalNativeDiagnostics']
        if native:
            for b,m in native.items():
                p=ROOT/m['saved']['path'];assert bind(p)==m['saved']
                with np.load(p,allow_pickle=False) as z:
                    if 'residual' in z:
                        r=z['residual'][z['fit_mask']];assert m['originalResidualRmsNmgy']==float(np.sqrt(np.mean(r*r)))
                    else:assert m['originalResidual']=='UNAVAILABLE_NO_SAVED_FITTED_RESIDUAL'
        else:assert row['material']['kind']=='DECLARED_GEOMETRY_NOT_DETECTED_SOURCE'
        facts.append({'index':row['index'],'savedInputsAndProjectionExact':True,'affineDifferentSumMaximumDifference':basis_delta})
    assert fit_count==876 and wrong_plane>0 and wrong_unit>0
    for v in inputs:assert bind(ROOT/v['path'])==v
    report={'scope':__doc__,'producerResult':bind(GEN/'result.json'),'records':facts,'actualLocations':len(facts),'descriptiveProjections':fit_count,
        'nonpositiveBandStageAmplitudesRetained':nonpositive,'diagnosticExcludedBandTargets':unknown,
        'maximumIndependentAffineSumDifference':worst_basis,'maximumQRVersusSVDPredictionDifferenceNmgy':worst_qr,
        'maximumQRMachineBoundFraction':worst_ratio,'wrongUnmappedPlaneDetectedBandStages':wrong_plane,'wrongScienceUnitForCurrentDetectedBandStages':wrong_unit,
        'allOriginalNativeResidualSummariesExact':True,'sourceInputPinsExact':len(inputs),'elapsedSeconds':time.perf_counter()-started,'readerProcessPeak':'UNMEASURED',
        'numericalMeaning':'64*machineEPS*actual design condition*actual data/prediction magnitude bounds alternative QR/SVD arithmetic only; no science correction, fit adequacy threshold or pixel/quality tolerance.',
        'sourceRequestsOrDetectionNativeFitVarianceReprojectionOrWholeFilterCoaddOrCorrections':False,
        'quality':'UNVERIFIED','independentReview':'MISSING','ordinaryAdoption':False}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k!='records'}),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as error:
        if OUT.exists():save(OUT/'failed.json',{'type':type(error).__name__,'error':str(error),'scientificCorrections':False})
        raise
