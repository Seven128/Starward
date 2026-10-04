"""Explicit retained-SKY model refresh of an existing complete display candidate.

Scientific coadd/coverage and old typed candidates stay untouched. Caller-bound
whole-source dependency evidence schedules only needed targets; actual sources,
RUN recovery, native coefficients and common apertures admit every new result.
"""
from dataclasses import dataclass,asdict
from pathlib import Path
import copy,re
import numpy as np
from image_quality import digest,write_report
from sdss_gri_tan import BANDS,_save_array
from sdss_frame_noise import SKY_RECONSTRUCTION_VERSION
from sdss_noise_display import (_qualified_sources,_project_display_region,
    _project_real_source_window,_display_estimate_products)
from sdss_adaptive_display import RADII,RATIO,_display_support,adaptive_common_display_batched
from sdss_display_recovery import (_scan_groups,_project_scan_samples,_select_scan_supply,
    _effective_recovery_samples,_supply_dependency,_validate_recovered_aperture_candidate,
    HALO_CANDIDATE_VERSION)
from sdss_noise_display_provenance import array_identity,canonical_bytes

VERSION='sdss-retained-sky-noise-model-increment-candidate-v1'
PREVIOUS_MODEL='sdss-retained-sky-complete-grid-stencil-v1'
CODE_FILES=('sdss_noise_model_increment.py','sdss_frame_noise.py','sdss_noise_display.py',
    'sdss_display_recovery.py','sdss_adaptive_display.py','sdss_noise_aperture.py',
    'sdss_source_stencil.py','sdss_gri_tan.py','sdss_corrected_frame.py','sdss_frame_quality.py')

@dataclass(frozen=True)
class NoiseModelDependencyPlan:
    extended_changed: np.ndarray
    requested: np.ndarray
    original_qualified: np.ndarray
    recovered_qualified: np.ndarray
    recovered_protected: np.ndarray
    binding: dict

@dataclass(frozen=True)
class NoiseModelIncrementCandidate:
    estimates: dict
    qualified: np.ndarray
    radius: np.ndarray
    reached: np.ndarray
    protected: np.ndarray
    requested: np.ndarray
    changed: np.ndarray
    report: dict


def plan_identity(plan):
    return {'binding':copy.deepcopy(plan.binding),'arrays':{k:array_identity(getattr(plan,k)) for k in
        ('extended_changed','requested','original_qualified','recovered_qualified','recovered_protected')}}


def _code_identity():
    return {n:digest((Path(__file__).parent/n).read_bytes()) for n in CODE_FILES}


def _source_identity(sources):
    result={}
    for name,bands in sorted(sources.items()):
        result[name]={}
        for band in BANDS:
            s=bands[band];m=s.frame.calibration_sky
            result[name][band]={'frameReceipt':copy.deepcopy(s.frame.receipt),
                'nativeScience':array_identity(s.frame.data),'wcsHeader':dict(s.frame.wcs.to_header()),
                'processingId':s.frame.header.get('PS_ID'),
                'camera':None if s.camera is None else asdict(s.camera),
                'retainedCalibrationSky':None if m is None else {k:array_identity(getattr(m,k)) for k in
                    ('calibration','allsky','xinterp','yinterp')},
                'flags':None if s.flags is None else {'receipt':copy.deepcopy(s.flags.receipt),'values':array_identity(s.flags.flags)}}
    return result


def _admit_plan(master,baseline,plan,expected_sha):
    if not isinstance(plan,NoiseModelDependencyPlan) or not isinstance(expected_sha,str) or re.fullmatch('[0-9a-f]{64}',expected_sha) is None:
        raise RuntimeError('sdss_noise_model_plan_invalid')
    n=master.joint_available.shape[0];halo=RADII[-1]
    for k in ('extended_changed','requested','original_qualified','recovered_qualified','recovered_protected'):
        a=getattr(plan,k);shape=(n+2*halo,n+2*halo) if k=='extended_changed' else (n,n)
        if not isinstance(a,np.ndarray) or a.dtype!=np.bool_ or a.shape!=shape:
            raise RuntimeError('sdss_noise_model_plan_geometry_invalid')
    if digest(canonical_bytes(plan_identity(plan)))!=expected_sha:
        raise RuntimeError('sdss_noise_model_plan_changed')
    binding=plan.binding
    if (binding.get('previousModel')!=PREVIOUS_MODEL or binding.get('currentModel')!=SKY_RECONSTRUCTION_VERSION or
            binding.get('parentReportCanonicalSha256')!=digest(canonical_bytes(baseline.report)) or
            binding.get('currentModelImplementationSha256')!=_code_identity()['sdss_frame_noise.py'] or
            any(re.fullmatch('[0-9a-f]{64}',str(binding.get(k,''))) is None for k in
                ('previousModelImplementationSha256','wholeCropEvidenceSha256','exteriorEvidenceSha256','readbackEvidenceSha256'))):
        raise RuntimeError('sdss_noise_model_plan_binding_invalid')
    actual=_supply_dependency(plan.extended_changed,halo)[halo:-halo,halo:-halo]
    if not np.array_equal(actual,plan.requested):
        raise RuntimeError('sdss_noise_model_plan_incomplete_halo')
    qchanged=(plan.recovered_qualified!=baseline.qualified)|(plan.recovered_protected!=baseline.protected)
    if (np.any(qchanged&~plan.extended_changed[halo:-halo,halo:-halo]) or
            np.any(plan.recovered_protected&~plan.recovered_qualified)):
        raise RuntimeError('sdss_noise_model_plan_qualification_invalid')


def _sample_current_model(master,sources,fields,weights,groups,dates,region,check):
    n=master.joint_available.shape[0];inside=all(0<=v.start<v.stop<=n for v in region)
    if inside:
        values,eligible,stencils=_project_display_region(master,sources,fields,weights,region,check)
        available=master.joint_available[region];local_fields,local_weights=fields,weights;select=region
        q,strong=_display_support(values,eligible,stencils)
    else:
        window=_project_real_source_window(master,sources,fields,weights,region,check)
        values,available=window.values,window.available
        local_fields,local_weights=window.fields,window.normalized_weights;select=(slice(0,values.shape[1]),slice(0,values.shape[2]))
        q,strong=_display_support(values,window.eligible,list(window.stencils.values()))
        # Original scientific projection is retained; old model stencils are
        # not used for a new raw cohort. Retire first noise arrays promptly.
        window.stencils.clear()
    y,x=np.mgrid[region];ra,dec=master.target.all_pix2world(x,n-1-y,0)
    observations,peak=_project_scan_samples(sources,local_fields,local_weights,groups,select,ra,dec,check)
    total,numerator,flagonly,chosen=_select_scan_supply(q,available,observations,dates)
    supply=total>0;raw=values.copy();raw[:,supply]=(numerator[:,supply]/total[supply]).astype(np.float32)
    del observations,numerator
    effective,coefficients,stencils=_effective_recovery_samples(sources,local_fields,local_weights,select,ra,dec,raw,available,total,chosen,check)
    rq,rp=_display_support(raw,effective,list(stencils.values()));check()
    return raw,effective,stencils,q,rq,rp,supply,{
        'actualSourceBoundsXYExclusive':[region[1].start,region[0].start,region[1].stop,region[0].stop],
        'realExteriorUsed':not inside,'originalQualified':int(q.sum()),'recoveredQualified':int(rq.sum()),
        'rawSupply':int(supply.sum()),'flagOnlyNativeRejected':int((flagonly&~supply).sum()),
        'chosenRunPixels':{str(run):int(v.sum()) for run,v in chosen.items()},
        'rawGriCOrderSha256':digest(raw.tobytes()),'effectiveCoefficientCOrderSha256':{k:digest(v.tobytes()) for k,v in coefficients.items()},
        'nativeStencilCOrderSha256':{k:{key:digest(a.tobytes()) for key,a in s.items()} for k,s in stencils.items()},
        'qualificationSingleFieldStencilBytes':peak,'retainedEffectiveStencilArrayBytes':sum(a.nbytes for s in stencils.values() for a in s.values())}


def refresh_retained_sky_model(master,baseline,sources,plan,*,expected_plan_sha256,
                               chunk_rows=64,batch_size=64,cancelled=None,progress=None):
    """Complete only measured source-model dependencies, no stale-type rebasing."""
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_noise_model_increment_cancelled')
    check()
    if (not isinstance(chunk_rows,int) or isinstance(chunk_rows,bool) or not 1<=chunk_rows<=256 or
            not isinstance(batch_size,int) or isinstance(batch_size,bool) or not 1<=batch_size<=256):
        raise RuntimeError('sdss_noise_model_increment_batch_invalid')
    _validate_recovered_aperture_candidate(master,baseline,master.report)
    if baseline.report['version']!=HALO_CANDIDATE_VERSION:
        raise RuntimeError('sdss_noise_model_increment_incomplete_parent')
    _admit_plan(master,baseline,plan,expected_plan_sha256)
    recipe,fields,weights=_qualified_sources(master,sources);groups,dates=_scan_groups(fields,sources)
    source_identity=_source_identity(sources);implementation=_code_identity();check()
    estimates={b:baseline.estimates[b].copy() for b in BANDS}
    maps={k:getattr(baseline,k).copy() for k in ('qualified','radius','reached','protected')}
    n=master.joint_available.shape[0];halo=RADII[-1];processed=np.zeros((n,n),bool);regions=[];peak=0
    for start in range(0,n,chunk_rows):
        check();end=min(n,start+chunk_rows);demand=plan.requested[start:end]
        if not demand.any():continue
        _,xx=np.nonzero(demand);x0,x1=int(xx.min()),int(xx.max()+1)
        target=(slice(start,end),slice(x0,x1));region=(slice(start-halo,end+halo),slice(x0-halo,x1+halo))
        raw,eligible,stencils,oq,rq,rp,supply,detail=_sample_current_model(master,sources,fields,weights,groups,dates,region,check)
        cached=(slice(max(0,region[0].start),min(n,region[0].stop)),slice(max(0,region[1].start),min(n,region[1].stop)))
        overlap=tuple(slice(v.start-r.start,v.stop-r.start) for v,r in zip(cached,region))
        if (not np.array_equal(oq[overlap],plan.original_qualified[cached]) or
                not np.array_equal(rq[overlap],plan.recovered_qualified[cached]) or
                not np.array_equal(rp[overlap],plan.recovered_protected[cached])):
            raise RuntimeError('sdss_noise_model_increment_actual_support_changed')
        local=(slice(halo,halo+end-start),slice(halo,halo+x1-x0))
        requested=np.zeros(eligible.shape,bool);requested[local]=plan.requested[target]
        result=adaptive_common_display_batched(raw,eligible,list(stencils.values()),targets=requested,batch_size=batch_size,cancelled=cancelled)
        keep=rp|~rq
        if not np.array_equal(result.estimates[:,keep],raw[:,keep],equal_nan=True):
            raise RuntimeError('sdss_noise_model_increment_raw_policy_invalid')
        chosen=requested[local];processed[target]|=chosen
        for at,b in enumerate(BANDS):estimates[b][target][chosen]=result.estimates[at][local][chosen]
        for k,v in (('qualified',rq),('protected',rp),('radius',result.radius),('reached',result.reached)):
            maps[k][target][chosen]=v[local][chosen]
        detail.update({'targetBoundsXYExclusive':[x0,start,x1,end],'requestedTargets':int(chosen.sum()),
            'requestedRawSupply':int((supply[local]&chosen).sum()),'requestedNewQualified':int((rq[local]&chosen).sum()),
            'requestedRadiusCounts':{str(k):int(v) for k,v in zip(*np.unique(result.radius[local][chosen],return_counts=True))}})
        regions.append(detail);peak=max(peak,detail['retainedEffectiveStencilArrayBytes'])
        if progress is not None:progress({'completedRows':end,'masterRows':n,'region':copy.deepcopy(detail)})
        del raw,eligible,stencils,oq,rq,rp,supply,result,requested
    check()
    if (not np.array_equal(processed,plan.requested) or not np.array_equal(maps['qualified'],plan.recovered_qualified) or
            not np.array_equal(maps['protected'],plan.recovered_protected)):
        raise RuntimeError('sdss_noise_model_increment_incomplete_demand')
    changed=np.zeros((n,n),bool);outside=~plan.requested
    for b in BANDS:
        same=(estimates[b]==baseline.estimates[b])|(np.isnan(estimates[b])&np.isnan(baseline.estimates[b]));changed|=~same
        if not same[outside].all() or not same[baseline.protected].all():
            raise RuntimeError('sdss_noise_model_increment_original_preservation_failed')
    _validate_recovered_aperture_candidate(master,baseline,master.report)
    _admit_plan(master,baseline,plan,expected_plan_sha256)
    if implementation!=_code_identity() or source_identity!=_source_identity(sources):
        raise RuntimeError('sdss_noise_model_increment_source_changed')
    levels,counts=np.unique(maps['radius'],return_counts=True)
    report={'version':VERSION,'scope':'Explicit offline source-noise-model dependency increment; not scientific correction or adoption',
        **{k:copy.deepcopy(master.report[k]) for k in ('objectRef','center','orientation')},
        'sourceResolvedRecipe':copy.deepcopy(recipe),'previousModel':PREVIOUS_MODEL,'currentModel':SKY_RECONSTRUCTION_VERSION,
        'parentProcessingVersion':baseline.report['version'],'parentReportCanonicalSha256':digest(canonical_bytes(baseline.report)),
        'parentDisplayEstimateCOrderSha256':copy.deepcopy(baseline.report['displayEstimatesCOrderSha256']),
        'parentDiagnosticCOrderSha256':copy.deepcopy(baseline.report['diagnosticCOrderSha256']),
        'planCanonicalSha256':expected_plan_sha256,'sourceModelDependencyPlan':plan_identity(plan),
        'currentSourceModelInputs':source_identity,'implementation':implementation,'scanMjdRanges':{str(k):list(v) for k,v in dates.items()},
        'sourceScienceCOrderSha256':copy.deepcopy(baseline.report['sourceScienceCOrderSha256']),
        'sourceAvailabilityCOrderSha256':baseline.report['sourceAvailabilityCOrderSha256'],
        'displayEstimatesCOrderSha256':{b:digest(a.tobytes()) for b,a in estimates.items()},
        'diagnosticCOrderSha256':{k:digest(v.tobytes()) for k,v in maps.items()},
        'requestedCOrderSha256':digest(plan.requested.tobytes()),'changedCOrderSha256':digest(changed.tobytes()),
        'outsideDemandEstimateCOrderSha256':{b:digest(a[outside].tobytes()) for b,a in baseline.estimates.items()},
        'requestedTargets':int(processed.sum()),'changedEstimatePixels':int(changed.sum()),
        'qualifiedCenters':int(maps['qualified'].sum()),'protectedCenters':int(maps['protected'].sum()),'commonRatioReached':int(maps['reached'].sum()),
        'radiusCounts':dict(zip(map(str,levels.tolist()),counts.tolist())),
        'radii':list(RADII),'absoluteConditionalRatio':RATIO,'sourceWindowHaloPixels':halo,
        'chunkRows':chunk_rows,'batchSize':batch_size,'regions':regions,'maximumRetainedEffectiveStencilBytes':peak,
        'allActualSupportMatchesPlan':True,'allDemandCompleted':True,'outsideDemandAndPreviousStrongExact':True,
        'noiseMeaning':'Repeated native IDs aggregated before squaring; conditional native diagonal model and cross-field Cauchy upper; sky/systematic/processing/PSF uncertainty not bounded.',
        'wholeMasterFilterRuns':0,'fitRuns':0,'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    for a in (*estimates.values(),*maps.values(),processed,changed):a.setflags(write=False)
    return NoiseModelIncrementCandidate(estimates,maps['qualified'],maps['radius'],maps['reached'],maps['protected'],processed,changed,report)


def _validate_increment(master,candidate,entry):
    r=candidate.report;n=master.joint_available.shape[0]
    if (not isinstance(candidate,NoiseModelIncrementCandidate) or r.get('version')!=VERSION or
            r.get('currentModel')!=SKY_RECONSTRUCTION_VERSION or r.get('previousModel')!=PREVIOUS_MODEL or
            r.get('parentProcessingVersion')!=HALO_CANDIDATE_VERSION or
            r.get('sourceResolvedRecipe')!=master.report.get('display',{}).get('transfer') or
            any(r.get(k)!=master.report.get(k) or r.get(k)!=entry.get(k) for k in ('objectRef','center','orientation')) or
            r.get('sourceWindowHaloPixels')!=RADII[-1] or r.get('radii')!=list(RADII) or r.get('absoluteConditionalRatio')!=RATIO or
            r.get('allActualSupportMatchesPlan') is not True or r.get('allDemandCompleted') is not True or
            r.get('outsideDemandAndPreviousStrongExact') is not True or r.get('wholeMasterFilterRuns')!=0 or r.get('fitRuns')!=0 or
            r.get('quality')!='UNVERIFIED' or r.get('adopted') is not False or r.get('independentReview')!='MISSING' or set(candidate.estimates)!=set(BANDS)):
        raise RuntimeError('sdss_noise_model_increment_candidate_binding_invalid')
    if digest(master.joint_available.tobytes())!=r['sourceAvailabilityCOrderSha256']:
        raise RuntimeError('sdss_noise_model_increment_science_changed')
    for k,dtype in (('qualified',np.bool_),('radius',np.int8),('reached',np.bool_),('protected',np.bool_),('requested',np.bool_),('changed',np.bool_)):
        a=getattr(candidate,k);expected=r[k+'COrderSha256'] if k in ('requested','changed') else r['diagnosticCOrderSha256'][k]
        if a.shape!=(n,n) or a.dtype!=dtype or digest(a.tobytes())!=expected:
            raise RuntimeError('sdss_noise_model_increment_diagnostic_changed')
    for b,a in candidate.estimates.items():
        if (a.shape!=(n,n) or a.dtype!=np.float32 or not np.isfinite(a[master.joint_available]).all() or
                digest(a.tobytes())!=r['displayEstimatesCOrderSha256'][b] or
                digest(master.bands[b].data.astype('<f4',copy=False).tobytes())!=r['sourceScienceCOrderSha256'][b] or
                digest(a[~candidate.requested].tobytes())!=r['outsideDemandEstimateCOrderSha256'][b]):
            raise RuntimeError('sdss_noise_model_increment_estimate_changed')
    if (np.any(candidate.changed&~candidate.requested) or np.any(candidate.protected&~candidate.qualified) or
            np.any(candidate.reached&(candidate.radius<=0)) or int(candidate.requested.sum())!=r['requestedTargets'] or
            int(candidate.changed.sum())!=r['changedEstimatePixels']):
        raise RuntimeError('sdss_noise_model_increment_candidate_policy_invalid')


def source_noise_increment_products(master,candidate,entry,*,output_pixels=512):
    _validate_increment(master,candidate,entry)
    return _display_estimate_products(master,candidate.estimates,entry,output_pixels,VERSION)


def save_source_noise_increment(output,master,candidate,entry,*,output_pixels=512):
    products=source_noise_increment_products(master,candidate,entry,output_pixels=output_pixels)
    output.mkdir(parents=True,exist_ok=False)
    arrays={b:_save_array(output/f'{b}-display-estimates.npy',a) for b,a in candidate.estimates.items()}
    arrays.update({k:_save_array(output/f'{k}.npy',getattr(candidate,k)) for k in ('qualified','radius','reached','protected','requested','changed')})
    levels={}
    for level,(encoded,meta) in products.items():
        name=f'{entry["objectRef"].replace(":","-")}-{level.lower()}.png';(output/name).write_bytes(encoded);levels[level]=meta|{'file':name}
    report=copy.deepcopy(candidate.report)|{'arrays':arrays,'levels':levels,'publication':'OFFLINE_CANDIDATE_ONLY'}
    write_report(output/'candidate.json',report);return report
