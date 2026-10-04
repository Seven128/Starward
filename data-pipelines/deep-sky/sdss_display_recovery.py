"""Explicit known-flag recovery from another actual scan, display only.

Original scientific samples/weights and old noise candidates are unchanged.
Different scans do not imply independent systematics or matching temporal/PSF
behaviour. Same-run copies, unknown qualification and absent supply keep original.
"""
from dataclasses import dataclass
import copy
import math
from pathlib import Path

import numpy as np

from image_quality import digest,write_report
from sdss_gri_tan import BANDS,_save_array
from sdss_noise_display import (_qualified_sources,_project_field,noise_display_pyramid,
    _display_estimate_products,REJECT_PROCESSING_BITS)

VERSION='sdss-other-scan-flag-display-recovery-candidate-v1'
REBASE_VERSION='sdss-adaptive-other-scan-flag-display-recovery-candidate-v2'
CURRENT_ADAPTIVE_VERSION='sdss-current-adaptive-other-scan-flag-display-recovery-candidate-v3'
APERTURE_REGION_VERSION='sdss-current-recovered-source-aperture-display-region-v1'
INTERIOR_CANDIDATE_VERSION='sdss-current-recovered-source-aperture-interior-candidate-v1'
HALO_CANDIDATE_VERSION='sdss-current-recovered-source-aperture-real-halo-candidate-v2'


@dataclass(frozen=True)
class OtherScanDisplay:
    estimates: dict
    alternative_supply: np.ndarray
    report: dict


@dataclass(frozen=True)
class RecoveredSourceRegion:
    values: np.ndarray
    eligible: np.ndarray
    alternative_supply: np.ndarray
    normalized_weights: dict
    stencils: dict
    report: dict


@dataclass(frozen=True)
class RecoveredApertureRegion:
    estimates: np.ndarray
    qualified: np.ndarray
    radius: np.ndarray
    reached: np.ndarray
    protected: np.ndarray
    affected: np.ndarray
    report: dict


@dataclass(frozen=True)
class RecoveredApertureCandidate:
    estimates: dict
    qualified: np.ndarray
    radius: np.ndarray
    reached: np.ndarray
    protected: np.ndarray
    affected: np.ndarray
    report: dict


def _scan_groups(fields,sources):
    dates={};groups={}
    for name in fields:
        run=sources[name][BANDS[0]].frame.receipt['identity']['run']
        groups.setdefault(run,[]).append(name);dates.setdefault(run,[])
        for b in BANDS:
            date=sources[name][b].frame.receipt.get('asTrans',{}).get('row',{}).get('MJD')
            dates[run].append(date if isinstance(date,(int,float)) and not isinstance(date,bool) and math.isfinite(date) else None)
    usable_dates={run:(min(v),max(v)) for run,v in dates.items() if None not in v}
    return groups,usable_dates


def _project_scan_samples(sources,fields,weights,groups,region,ra,dec,check):
    maximum_stencils=0
    observations={}
    for run,names in groups.items():
        weight=np.zeros(ra.shape,dtype=float);numerator=np.zeros((3,*ra.shape),dtype=float)
        known=np.ones(ra.shape,dtype=bool);bad=np.zeros(ra.shape,dtype=bool)
        for name in names:
            check();w=weights[name][region]
            if not w.any():continue
            stencil,qualified=_project_field(sources[name],fields[name],w,region,ra,dec)
            maximum_stencils=max(maximum_stencils,sum(v.nbytes for v in stencil.values()));del stencil
            known&=qualified;weight+=w
            for at,b in enumerate(BANDS):
                numerator[at]+=np.where(w>0,fields[name][b].data[region],0).astype(np.float64)*w
                source=sources[name][b]
                if (source.flags is not None and source.frame.header.get('PS_ID') is not None and
                    source.flags.receipt['actualPrimaryIdentity'].get('PS_ID') is not None):
                    sx,sy=source.frame.wcs.all_world2pix(ra,dec,0);flag=source.flags.stencil(sx,sy)
                    bad|=(w>0)&flag.geometry&((flag.flags&REJECT_PROCESSING_BITS)!=0)
        observations[run]={'weight':weight,'numerator':numerator,'known':known&(weight>0),'bad':bad}
    return observations,maximum_stencils


def _project_scan_region(master,sources,fields,weights,groups,region,check):
    n=master.joint_available.shape[0];y,x=np.mgrid[region]
    ra,dec=master.target.all_pix2world(x,n-1-y,0)
    return _project_scan_samples(sources,fields,weights,groups,region,ra,dec,check)


def _effective_recovery_samples(sources,fields,weights,region,ra,dec,values,available,total,chosen,check):
    """One raw sample/coefficient/noise owner for cached and real halo views."""
    supply=total>0;eligible=available.copy();effective_weights={};stencils={}
    reconstructed=np.zeros_like(values,dtype=np.float64);absolute=np.zeros_like(reconstructed)
    for name,projected in fields.items():
        check();weight=weights[name][region].astype(np.float64)
        if not weight.any():continue
        run=sources[name][BANDS[0]].frame.receipt['identity']['run']
        alternate=np.divide(weight,total,out=np.zeros_like(weight),where=chosen[run]&supply)
        effective=np.where(supply,alternate,weight)
        stencil,qualified=_project_field(sources[name],projected,effective,region,ra,dec)
        eligible &= qualified;stencils[name]=stencil;effective_weights[name]=effective
        raw=np.stack([np.where(weight>0,projected[b].data[region],0) for b in BANDS]).astype(np.float64)
        contribution=raw*effective;reconstructed+=contribution;absolute+=np.abs(contribution)
    tolerance=(len(fields)+2)*np.finfo(np.float32).eps*absolute+len(fields)*np.finfo(np.float32).smallest_subnormal
    if np.any((np.abs(reconstructed-values)>tolerance)[:,available]):
        raise RuntimeError('sdss_recovered_aperture_coefficient_mean_mismatch')
    return eligible,effective_weights,stencils


def _select_scan_supply(processable,joint,observations,usable_dates):
    distinct=lambda a,b: a!=b and a in usable_dates and b in usable_dates and (
        usable_dates[a][1]<usable_dates[b][0] or usable_dates[b][1]<usable_dates[a][0])
    flag_only_supply=np.zeros(processable.shape,bool);selected={}
    total=np.zeros(processable.shape,dtype=float);values=np.zeros((3,*processable.shape),dtype=float)
    for run,o in observations.items():
        has_bad_other=np.zeros(processable.shape,dtype=bool)
        for other,z in observations.items():
            if distinct(run,other):has_bad_other|=z['bad']
        flag_only=(~processable)&joint&(o['weight']>0)&~o['bad']&has_bad_other
        flag_only_supply|=flag_only
        chosen=flag_only&o['known']
        selected[run]=chosen;total+=np.where(chosen,o['weight'],0)
        values+=np.where(chosen[None],o['numerator'],0)
    return total,values,flag_only_supply,selected


def recover_other_scan_display(master, initial, sources, *, chunk_rows=64, cancelled=None):
    """Use actual unflagged other-scan means, never fill from same-run copies."""
    if not isinstance(chunk_rows,int) or isinstance(chunk_rows,bool) or not 1<=chunk_rows<=256:
        raise RuntimeError('sdss_display_recovery_chunk_invalid')
    if cancelled is not None and cancelled():raise RuntimeError('sdss_display_recovery_cancelled')
    recipe,fields,weights=_qualified_sources(master,sources)
    n=master.joint_available.shape[0]
    # Admit the actual parent at its owner. A current adaptive parent has no
    # historical fixed-noise/saved-supply execution to reuse or relabel.
    from sdss_adaptive_display import AdaptiveDisplayCandidate,_validate_adaptive_candidate
    adaptive_parent=isinstance(initial,AdaptiveDisplayCandidate)
    if adaptive_parent:
        _validate_adaptive_candidate(master,initial,master.report)
        if (initial.report.get('adopted') is not False or initial.report.get('quality')!='UNVERIFIED' or
                initial.report.get('independentReview')!='MISSING'):
            raise RuntimeError('sdss_display_recovery_adaptive_parent_policy_invalid')
        processable=initial.qualified
    else:
        noise_display_pyramid(master,initial,master.report,output_pixels=n//4)
        processable=initial.processable
    for b in BANDS:
        if not np.array_equal(initial.estimates[b][~processable],master.bands[b].data[~processable],equal_nan=True):
            raise RuntimeError('sdss_display_recovery_baseline_fallback_invalid')
    groups,usable_dates=_scan_groups(fields,sources)
    estimates={b:initial.estimates[b].copy() for b in BANDS};supply=np.zeros((n,n),dtype=bool);flag_only_supply=np.zeros((n,n),dtype=bool)
    used={run:0 for run in groups};chunks=0;maximum_stencils=0
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_display_recovery_cancelled')
    check()
    for start in range(0,n,chunk_rows):
        check();end=min(n,start+chunk_rows);region=(slice(start,end),slice(0,n))
        observations,maximum=_project_scan_region(master,sources,fields,weights,groups,region,check)
        maximum_stencils=max(maximum_stencils,maximum)
        total,values,flag_only,selected=_select_scan_supply(processable[region],master.joint_available[region],observations,usable_dates)
        flag_only_supply[region]|=flag_only
        for run,chosen in selected.items():used[run]+=int(chosen.sum())
        chosen=total>0;supply[region]=chosen
        for at,b in enumerate(BANDS):
            tile=estimates[b][region];tile[chosen]=(values[at,chosen]/total[chosen]).astype(np.float32)
            if not np.isfinite(tile[chosen]).all():raise RuntimeError('sdss_display_recovery_nonfinite')
        chunks+=1
    check()
    for b in BANDS:
        if not np.array_equal(estimates[b][~supply],initial.estimates[b][~supply],equal_nan=True):
            raise RuntimeError('sdss_display_recovery_unrelated_changed')
        estimates[b].setflags(write=False)
    supply.setflags(write=False)
    report={'version':CURRENT_ADAPTIVE_VERSION if adaptive_parent else VERSION,'scope':__doc__,'sourceResolvedRecipe':copy.deepcopy(recipe),
        'baselineProcessingVersion':initial.report['version'],
        'baselineEstimateCOrderSha256':copy.deepcopy(initial.report['displayEstimatesCOrderSha256']),
        'baselineProcessableCOrderSha256':digest(processable.tobytes()),
        'sourceScienceCOrderSha256':copy.deepcopy(initial.report['sourceScienceCOrderSha256']),
        'sourceAvailabilityCOrderSha256':initial.report['sourceAvailabilityCOrderSha256'],
        'displayEstimatesCOrderSha256':{b:digest(v.astype('<f4',copy=False).tobytes()) for b,v in estimates.items()},
        'alternativeSupplyCOrderSha256':digest(supply.tobytes()),'alternativePixels':int(supply.sum()),
        'flagOnlyAlternativePixels':int(flag_only_supply.sum()),
        'flagOnlyAlternativeSupplyCOrderSha256':digest(flag_only_supply.tobytes()),
        'flagOnlyRejectedByNativeQualification':int((flag_only_supply&~supply).sum()),
        'scanMjdRanges':{str(run):list(v) for run,v in usable_dates.items()},'scanContributionPixels':{str(k):v for k,v in used.items()},
        'unknownScanDates':[run for run in groups if run not in usable_dates],
        'qualification':'Known bad positive contributor plus a temporally disjoint other RUN with all positive contributors coherent/camera-noise/processing-qualified. Same-run or unknown supply cannot recover.',
        'coaddition':'Original geometric weights renormalized over admitted alternative scans, common gri; raw alternate samples, no new filter or inverse-variance confidence.',
        'sourceMeaning':'Display alternatives in original source nMgy/native-pixel units, not new scientific measurements.',
        'chunks':chunks,'maximumSingleFieldStencilArrayBytes':maximum_stencils,'filterRuns':0,'fitRuns':0,
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    if adaptive_parent:
        report.pop('baselineProcessableCOrderSha256')
        report.update({k:copy.deepcopy(initial.report[k]) for k in ('objectRef','center','orientation')})
        report.update({'baselineDiagnosticCOrderSha256':copy.deepcopy(initial.report['diagnosticCOrderSha256']),
            'baselineQualifiedCOrderSha256':digest(processable.tobytes()),
            'recoveryExecutionKind':'CURRENT_NATIVE_SUPPLY_ON_CURRENT_ADAPTIVE_PARENT',
            'qualificationReuse':'None; actual current native source/flags/noise/scan epochs are projected once for this recovery. No historical supply or fixed-noise execution claimed.'})
    return OtherScanDisplay(estimates,supply,report)


def _bounded_region(region,n,halo=0):
    if (not isinstance(region,tuple) or len(region)!=2 or any(not isinstance(v,slice) or
            v.step not in (None,1) or any(not isinstance(p,int) or isinstance(p,bool) for p in (v.start,v.stop)) or
            not halo<=v.start<v.stop<=n-halo for v in region)):
        raise RuntimeError('sdss_recovered_aperture_target_invalid')


def _admit_current_recovery_parent(master,parent,recovery):
    from sdss_adaptive_display import AdaptiveDisplayCandidate,_validate_adaptive_candidate
    if (not isinstance(parent,AdaptiveDisplayCandidate) or recovery.report.get('version')!=CURRENT_ADAPTIVE_VERSION or
            recovery.report.get('baselineProcessingVersion')!=parent.report.get('version') or
            recovery.report.get('baselineEstimateCOrderSha256')!=parent.report.get('displayEstimatesCOrderSha256') or
            recovery.report.get('baselineDiagnosticCOrderSha256')!=parent.report.get('diagnosticCOrderSha256') or
            parent.report.get('adopted') is not False or parent.report.get('quality')!='UNVERIFIED' or
            parent.report.get('independentReview')!='MISSING'):
        raise RuntimeError('sdss_recovered_aperture_parent_binding_invalid')
    _validate_adaptive_candidate(master,parent,master.report)
    _validate_recovery_candidate(master,recovery,master.report)
    for band in BANDS:
        if (not np.array_equal(parent.estimates[band][~parent.qualified],master.bands[band].data[~parent.qualified],equal_nan=True) or
                not np.array_equal(recovery.estimates[band][~recovery.alternative_supply],parent.estimates[band][~recovery.alternative_supply],equal_nan=True)):
            raise RuntimeError('sdss_recovered_aperture_fallback_invalid')


def project_current_recovery_region(master,parent,recovery,sources,region,*,cancelled=None):
    """Actual raw sampling view and native coefficients, not filtered inputs.

    Regions are inside the original scientific crop. Exterior requires actual
    source-window admission and is deliberately not guessed here. This current
    projection rechecks supply/cohorts against saved v3; no old fixed-noise run
    or historical reuse is invented. Source files/receipts remain caller-owned.
    """
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_recovered_aperture_cancelled')
    check();n=master.joint_available.shape[0];_bounded_region(region,n)
    _admit_current_recovery_parent(master,parent,recovery)
    recipe,fields,weights=_qualified_sources(master,sources)
    groups,dates=_scan_groups(fields,sources)
    if {str(run):list(v) for run,v in dates.items()}!=recovery.report.get('scanMjdRanges'):
        raise RuntimeError('sdss_recovered_aperture_epoch_changed')
    observations,maximum=_project_scan_region(master,sources,fields,weights,groups,region,check)
    total,numerator,_,chosen=_select_scan_supply(parent.qualified[region],master.joint_available[region],observations,dates)
    supply=total>0
    if not np.array_equal(supply,recovery.alternative_supply[region]):
        raise RuntimeError('sdss_recovered_aperture_supply_changed')
    values=np.stack([master.bands[b].data[region] for b in BANDS])
    values[:,supply]=(numerator[:,supply]/total[supply]).astype(np.float32)
    for at,band in enumerate(BANDS):
        if not np.array_equal(values[at,supply],recovery.estimates[band][region][supply]):
            raise RuntimeError('sdss_recovered_aperture_raw_supply_changed')
    del observations,numerator
    y,x=np.mgrid[region];ra,dec=master.target.all_pix2world(x,n-1-y,0)
    eligible,effective_weights,stencils=_effective_recovery_samples(sources,fields,weights,region,ra,dec,
        values,master.joint_available[region],total,chosen,check)
    check()
    arrays={key:digest(value.tobytes()) for key,value in (('rawSamplingGri',values),('sourceEligible',eligible),('alternativeSupply',supply))}
    report={'samplingKind':'ACTUAL_RAW_OR_CURRENT_NATIVE_ALTERNATIVE_DISPLAY_SAMPLES',
        'supportBoundsXYExclusive':[region[1].start,region[0].start,region[1].stop,region[0].stop],
        'sourceResolvedRecipe':copy.deepcopy(recipe),'sourceScienceCOrderSha256':copy.deepcopy(recovery.report['sourceScienceCOrderSha256']),
        'sourceAvailabilityCOrderSha256':recovery.report['sourceAvailabilityCOrderSha256'],
        'baselineRecoveryVersion':CURRENT_ADAPTIVE_VERSION,'baselineRecoveryEstimateCOrderSha256':copy.deepcopy(recovery.report['displayEstimatesCOrderSha256']),
        'baselineSupplyCOrderSha256':recovery.report['alternativeSupplyCOrderSha256'],
        'baselineAdaptiveEstimateCOrderSha256':copy.deepcopy(parent.report['displayEstimatesCOrderSha256']),
        'baselineAdaptiveDiagnosticCOrderSha256':copy.deepcopy(parent.report['diagnosticCOrderSha256']),
        'scanMjdRanges':{str(run):list(v) for run,v in dates.items()},'chosenRunPixels':{str(run):int(v.sum()) for run,v in chosen.items()},
        'samplingCOrderSha256':arrays,'commonFieldWeightCOrderSha256':{name:digest(w.tobytes()) for name,w in effective_weights.items()},
        'nativeStencilCOrderSha256':{name:{key:digest(v.tobytes()) for key,v in s.items()} for name,s in stencils.items()},
        'alternativePixels':int(supply.sum()),'qualificationSingleFieldStencilArrayBytes':maximum,
        'retainedEffectiveStencilArrayBytes':sum(v.nbytes for s in stencils.values() for v in s.values()),
        'meaning':'Actual current per-target RUN/common coefficients and native noise, raw values only. Not modified scientific coadd, independent target pixels, PSF equivalence or full source publication provenance.'}
    for value in (values,eligible,supply,*effective_weights.values()):value.setflags(write=False)
    for stencil in stencils.values():
        for value in stencil.values():value.setflags(write=False)
    return RecoveredSourceRegion(values,eligible,supply,effective_weights,stencils,report)


def project_current_recovery_halo_region(master,parent,recovery,sources,region,*,cancelled=None):
    """Actual out-of-crop raw recovery, never padded or published science.

    Common geometry and cached overlap belong to the existing real source
    window owner. Original native support, full RUN/cohort/MJD/flags and final
    effective coefficients share the same owners as cached regional recovery.
    This supplies measurements only; it does not filter or update a candidate.
    """
    from sdss_noise_display import _project_real_source_window
    from sdss_adaptive_display import RADII,_display_support
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_recovered_aperture_cancelled')
    check();n=master.joint_available.shape[0];halo=RADII[-1]
    if (not isinstance(region,tuple) or len(region)!=2 or any(not isinstance(v,slice) or
            v.step not in (None,1) or any(not isinstance(p,int) or isinstance(p,bool) for p in (v.start,v.stop)) or
            not -halo<=v.start<v.stop<=n+halo or v.start>=n or v.stop<=0 for v in region) or
            min(v.stop-v.start for v in region)<=2*halo):
        raise RuntimeError('sdss_recovered_halo_region_invalid')
    _admit_current_recovery_parent(master,parent,recovery);recipe,fields,weights=_qualified_sources(master,sources)
    groups,dates=_scan_groups(fields,sources)
    if {str(run):list(v) for run,v in dates.items()}!=recovery.report.get('scanMjdRanges'):
        raise RuntimeError('sdss_recovered_aperture_epoch_changed')
    window=_project_real_source_window(master,sources,fields,weights,region,check)
    shape=window.available.shape;local=slice(0,shape[0]),slice(0,shape[1])
    if window.stencils:
        original_q,original_strong=_display_support(window.values,window.eligible,list(window.stencils.values()))
    else:original_q=np.zeros(shape,bool);original_strong=np.zeros(shape,bool)
    inside=tuple(slice(max(0,v.start),min(n,v.stop)) for v in region)
    overlap=tuple(slice(v.start-r.start,v.stop-r.start) for v,r in zip(inside,region))
    if (not np.array_equal(original_q[overlap],parent.qualified[inside]) or
            not np.array_equal(original_strong[overlap],parent.protected[inside])):
        raise RuntimeError('sdss_recovered_halo_original_support_changed')
    y,x=np.mgrid[region];ra,dec=master.target.all_pix2world(x,n-1-y,0)
    observations,maximum=_project_scan_samples(sources,window.fields,window.normalized_weights,groups,local,ra,dec,check)
    total,numerator,flag_only,chosen=_select_scan_supply(original_q,window.available,observations,dates)
    supply=total>0;values=window.values.copy();values[:,supply]=(numerator[:,supply]/total[supply]).astype(np.float32)
    if not np.array_equal(supply[overlap],recovery.alternative_supply[inside]):
        raise RuntimeError('sdss_recovered_aperture_supply_changed')
    inside_supply=supply[overlap]
    for at,b in enumerate(BANDS):
        if not np.array_equal(values[at][overlap][inside_supply],recovery.estimates[b][inside][inside_supply]):
            raise RuntimeError('sdss_recovered_aperture_raw_supply_changed')
    # Original-coadd stencils no longer participate after source support/cohort
    # admission. Keep only actual fields/weights and new effective stencils.
    del observations,numerator;window.stencils.clear()
    eligible,effective,stencils=_effective_recovery_samples(sources,window.fields,window.normalized_weights,
        local,ra,dec,values,window.available,total,chosen,check)
    outside=np.ones(shape,bool);outside[overlap]=False;check()
    report={'samplingKind':'ACTUAL_REAL_HALO_RAW_OR_CURRENT_NATIVE_ALTERNATIVE_DISPLAY_SAMPLES',
        'supportBoundsXYExclusive':[region[1].start,region[0].start,region[1].stop,region[0].stop],
        'sourceResolvedRecipe':copy.deepcopy(recipe),'sourceScienceCOrderSha256':copy.deepcopy(recovery.report['sourceScienceCOrderSha256']),
        'sourceAvailabilityCOrderSha256':recovery.report['sourceAvailabilityCOrderSha256'],
        'baselineRecoveryVersion':CURRENT_ADAPTIVE_VERSION,'baselineRecoveryEstimateCOrderSha256':copy.deepcopy(recovery.report['displayEstimatesCOrderSha256']),
        'baselineSupplyCOrderSha256':recovery.report['alternativeSupplyCOrderSha256'],
        'baselineAdaptiveEstimateCOrderSha256':copy.deepcopy(parent.report['displayEstimatesCOrderSha256']),
        'baselineAdaptiveDiagnosticCOrderSha256':copy.deepcopy(parent.report['diagnosticCOrderSha256']),
        'scanMjdRanges':{str(run):list(v) for run,v in dates.items()},'chosenRunPixels':{str(run):int(v.sum()) for run,v in chosen.items()},
        'samplingCOrderSha256':{key:digest(v.tobytes()) for key,v in (('rawSamplingGri',values),('sourceEligible',eligible),('alternativeSupply',supply),
            ('sourceAvailable',window.available),('originalQualified',original_q),('originalProtected',original_strong))},
        'commonFieldWeightCOrderSha256':{name:digest(w.tobytes()) for name,w in effective.items()},
        'nativeStencilCOrderSha256':{name:{key:digest(v.tobytes()) for key,v in s.items()} for name,s in stencils.items()},
        'originalSourceWindow':window.report,'alternativePixels':int(supply.sum()),
        'outsideCropAlternativePixels':int((outside&supply).sum()),'outsideCropOriginalQualifiedPixels':int((outside&original_q).sum()),
        'flagOnlyRejectedByNativeQualification':int((flag_only&~supply).sum()),
        'qualificationSingleFieldStencilArrayBytes':maximum,
        'retainedEffectiveStencilArrayBytes':sum(v.nbytes for s in stencils.values() for v in s.values()),
        'cachedOverlapSupplyRawAndOriginalSupportExact':True,
        'meaning':'Real native source coefficients/noise outside the scientific crop. Raw display support only, not new published science/coverage, full PSF/quality/rights or independent review.'}
    for value in (values,eligible,supply,*effective.values()):value.setflags(write=False)
    for stencil in stencils.values():
        for value in stencil.values():value.setflags(write=False)
    return RecoveredSourceRegion(values,eligible,supply,effective,stencils,report)


def _supply_dependency(supply,halo):
    shape=supply.shape;influence=np.zeros(shape,bool)
    # Every permitted aperture lies inside the largest circle. No target can
    # depend on changed coefficients/samples outside this actual support.
    for dy in range(-halo,halo+1):
        for dx in range(-halo,halo+1):
            if dy*dy+dx*dx>halo*halo:continue
            ys=slice(max(0,-dy),min(shape[0],shape[0]-dy));xs=slice(max(0,-dx),min(shape[1],shape[1]-dx))
            influence[ys,xs] |= supply[slice(ys.start+dy,ys.stop+dy),slice(xs.start+dx,xs.stop+dx)]
    return influence


def _refine_recovered_aperture_samples(samples,local,baseline,baseline_maps,*,batch_size,cancelled):
    """Cached and real-halo targets share actual raw/native aperture policy."""
    from sdss_adaptive_display import RADII,_display_support,adaptive_common_display_batched
    shape=samples.eligible.shape;influence=_supply_dependency(samples.alternative_supply,RADII[-1])
    if samples.stencils:
        usable,protected=_display_support(samples.values,samples.eligible,list(samples.stencils.values()))
    else:usable=np.zeros(shape,bool);protected=np.zeros(shape,bool)
    original=~samples.alternative_supply[local]
    if (not np.array_equal(usable[local][original],baseline_maps['qualified'][original]) or
            not np.array_equal(protected[local][original],baseline_maps['protected'][original])):
        raise RuntimeError('sdss_recovered_aperture_original_support_changed')
    requested=np.zeros(shape,bool);requested[local]=influence[local]&usable[local]&~protected[local]
    estimates=baseline.copy();maps={key:value.copy() for key,value in baseline_maps.items()}
    maps['qualified']=usable[local].copy();maps['protected']=protected[local].copy()
    strong=samples.alternative_supply[local]&protected[local];maps['radius'][strong]=0;maps['reached'][strong]=False
    affected=requested[local].copy()
    if requested.any():
        result=adaptive_common_display_batched(samples.values,samples.eligible,list(samples.stencils.values()),
            batch_size=batch_size,cancelled=cancelled,targets=requested)
        estimates[:,affected]=result.estimates[:,local[0],local[1]][:,affected]
        for key in ('radius','reached'):maps[key][affected]=getattr(result,key)[local][affected]
    if not np.array_equal(estimates[:,~affected],baseline[:,~affected],equal_nan=True):
        raise RuntimeError('sdss_recovered_aperture_unaffected_changed')
    return estimates,maps,affected,influence[local].copy()


def refine_current_recovery_display_region(master,parent,recovery,sources,target,*,batch_size=64,cancelled=None):
    """Increment actual dependency changes only, with a full real source halo.

    Uses the existing common-aperture policy on raw source values/native
    coefficients. The caller owns full candidate assembly and publication;
    this typed regional result preserves all truly unaffected current values.
    """
    from sdss_adaptive_display import RADII,RATIO
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_recovered_aperture_cancelled')
    check();halo=RADII[-1];_bounded_region(target,master.joint_available.shape[0],halo)
    if not isinstance(batch_size,int) or isinstance(batch_size,bool) or not 1<=batch_size<=256:
        raise RuntimeError('sdss_adaptive_batch_size_invalid')
    support=tuple(slice(v.start-halo,v.stop+halo) for v in target)
    samples=project_current_recovery_region(master,parent,recovery,sources,support,cancelled=cancelled)
    local=tuple(slice(halo,v.stop-v.start+halo) for v in target)
    baseline=np.stack([recovery.estimates[b][target] for b in BANDS])
    baseline_maps={key:getattr(parent,key)[target] for key in ('qualified','radius','reached','protected')}
    estimates,maps,affected,_=_refine_recovered_aperture_samples(samples,local,baseline,baseline_maps,
        batch_size=batch_size,cancelled=cancelled)
    check()
    changed=np.any(~((estimates==baseline)|(np.isnan(estimates)&np.isnan(baseline))),axis=0)
    report={'version':APERTURE_REGION_VERSION,'scope':'Bounded current recovered-source common-aperture display region, offline only',
        'objectRef':master.report['objectRef'],'center':copy.deepcopy(master.report['center']),'orientation':master.report['orientation'],
        'targetBoundsXYExclusive':[target[1].start,target[0].start,target[1].stop,target[0].stop],
        'sampling':samples.report,'radii':list(RADII),'absoluteConditionalRatio':RATIO,'realSourceHaloPixels':halo,
        'affectedTargets':int(affected.sum()),'affectedCOrderSha256':digest(affected.tobytes()),
        'changedEstimatePixels':int(changed.sum()),'unaffectedEstimatesExact':True,'filterTargetCount':int(affected.sum()),
        'displayEstimatesCOrderSha256':{b:digest(estimates[at].tobytes()) for at,b in enumerate(BANDS)},
        'diagnosticCOrderSha256':{key:digest(value.tobytes()) for key,value in maps.items()},
        'wholeMasterFilterRuns':0,'fitRuns':0,'batchSize':batch_size,
        'noiseMeaning':'Repeated native ID coefficients aggregated before squaring; diagonal native conditional model/Cauchy across fields, omitted sky/systematic/processing/PSF uncertainty not bounded.',
        'samplingMeaning':'Original science or admitted raw alternate means; saved filtered estimates are fallback only, never new aperture measurements.',
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    for value in (estimates,affected,*maps.values()):value.setflags(write=False)
    return RecoveredApertureRegion(estimates,maps['qualified'],maps['radius'],maps['reached'],maps['protected'],affected,report)


def refine_current_recovery_interior(master,parent,recovery,sources,*,chunk_rows=64,batch_size=64,cancelled=None,progress=None):
    """All actual interior dependencies, bounded windows, saved exterior exact.

    Source/parent admission stays with the regional owner. The demand derived
    from supply is scheduling only, never qualification. Each result retires
    its native stencils before the next region; no whole image is refiltered.
    Exterior real-halo recovery is a distinct unfinished responsibility.
    """
    from sdss_adaptive_display import RADII,RATIO
    if not isinstance(chunk_rows,int) or isinstance(chunk_rows,bool) or not 1<=chunk_rows<=256:
        raise RuntimeError('sdss_recovered_interior_chunk_invalid')
    if not isinstance(batch_size,int) or isinstance(batch_size,bool) or not 1<=batch_size<=256:
        raise RuntimeError('sdss_adaptive_batch_size_invalid')
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_recovered_aperture_cancelled')
    check();_admit_current_recovery_parent(master,parent,recovery)
    _qualified_sources(master,sources);n=master.joint_available.shape[0];halo=RADII[-1]
    if n<=2*halo:raise RuntimeError('sdss_recovered_interior_master_too_small')
    influence=_supply_dependency(recovery.alternative_supply,halo)
    exterior=influence.copy();exterior[halo:-halo,halo:-halo]=False
    demand=influence&~parent.protected&master.joint_available
    demand[:halo]=False;demand[-halo:]=False;demand[:,:halo]=False;demand[:,-halo:]=False
    estimates={b:recovery.estimates[b].copy() for b in BANDS}
    maps={key:getattr(parent,key).copy() for key in ('qualified','radius','reached','protected')}
    affected=np.zeros((n,n),bool);regions=[];visited=0;peak=0
    for start in range(halo,n-halo,chunk_rows):
        check();end=min(n-halo,start+chunk_rows);_,xs=np.where(demand[start:end])
        if not len(xs):continue
        left,right=int(xs.min()),int(xs.max()+1);target=(slice(start,end),slice(left,right))
        result=refine_current_recovery_display_region(master,parent,recovery,sources,target,batch_size=batch_size,cancelled=cancelled)
        if np.any(result.affected&~demand[target]):raise RuntimeError('sdss_recovered_interior_unscheduled_target')
        for at,b in enumerate(BANDS):estimates[b][target]=result.estimates[at]
        for key in maps:maps[key][target]=getattr(result,key)
        affected[target]=result.affected;visited+=int(demand[target].sum())
        report=copy.deepcopy(result.report)|{'dependencyDemandTargets':int(demand[target].sum())}
        regions.append(report);peak=max(peak,report['sampling']['retainedEffectiveStencilArrayBytes'])
        if progress is not None:progress({'completedRows':end,'masterRows':n,'region':report})
        del result
    check()
    if visited!=int(demand.sum()):raise RuntimeError('sdss_recovered_interior_dependency_incomplete')
    perimeter=np.ones((n,n),bool);perimeter[halo:-halo,halo:-halo]=False
    changed=np.zeros((n,n),bool)
    for b in BANDS:
        if (not np.array_equal(estimates[b][~affected],recovery.estimates[b][~affected],equal_nan=True) or
                not np.array_equal(estimates[b][parent.protected],recovery.estimates[b][parent.protected],equal_nan=True)):
            raise RuntimeError('sdss_recovered_interior_unaffected_changed')
        changed|=~((estimates[b]==recovery.estimates[b])|(np.isnan(estimates[b])&np.isnan(recovery.estimates[b])))
        estimates[b].setflags(write=False)
    for key,value in maps.items():
        if not np.array_equal(value[perimeter],getattr(parent,key)[perimeter]):
            raise RuntimeError('sdss_recovered_interior_exterior_changed')
        value.setflags(write=False)
    affected.setflags(write=False);radii,counts=np.unique(maps['radius'],return_counts=True)
    report={'version':INTERIOR_CANDIDATE_VERSION,'scope':'Complete necessary recovered-source interior aperture increment only; exterior pending, offline candidate',
        'objectRef':master.report['objectRef'],'center':copy.deepcopy(master.report['center']),'orientation':master.report['orientation'],
        'sourceResolvedRecipe':copy.deepcopy(recovery.report['sourceResolvedRecipe']),
        'sourceScienceCOrderSha256':copy.deepcopy(recovery.report['sourceScienceCOrderSha256']),
        'sourceAvailabilityCOrderSha256':recovery.report['sourceAvailabilityCOrderSha256'],
        'baselineRecoveryVersion':CURRENT_ADAPTIVE_VERSION,'baselineRecoveryEstimateCOrderSha256':copy.deepcopy(recovery.report['displayEstimatesCOrderSha256']),
        'baselineSupplyCOrderSha256':recovery.report['alternativeSupplyCOrderSha256'],
        'baselineAdaptiveVersion':parent.report['version'],'baselineAdaptiveDiagnosticCOrderSha256':copy.deepcopy(parent.report['diagnosticCOrderSha256']),
        'scanMjdRanges':copy.deepcopy(recovery.report['scanMjdRanges']),
        'radii':list(RADII),'absoluteConditionalRatio':RATIO,'dependencyDemandTargets':int(demand.sum()),
        'affectedTargets':int(affected.sum()),'affectedCOrderSha256':digest(affected.tobytes()),'changedEstimatePixels':int(changed.sum()),
        'displayEstimatesCOrderSha256':{b:digest(v.tobytes()) for b,v in estimates.items()},
        'diagnosticCOrderSha256':{key:digest(value.tobytes()) for key,value in maps.items()},
        'qualifiedCenters':int(maps['qualified'].sum()),'protectedCenters':int(maps['protected'].sum()),
        'commonRatioReached':int(maps['reached'].sum()),'radiusCounts':dict(zip(map(str,radii.tolist()),counts.tolist())),
        'interiorDependenciesCompleted':True,'exteriorApertureProcessing':'PENDING_REAL_SOURCE_WINDOW',
        'exteriorDependencyPositions':int(exterior.sum()),'exteriorEstimatesAndAdaptiveDiagnosticsExact':True,
        'unaffectedEstimatesExact':True,'chunkRows':chunk_rows,'batchSize':batch_size,'regions':regions,
        'maximumRetainedEffectiveStencilArrayBytes':peak,'resourceMeaning':'Per-region effective stencils only, not process/native/GPU memory or projection/batch temporaries.',
        'samplingMeaning':'Original source values and actual raw alternate common coefficients/native IDs; filtered parent values are fallback, not new measurements.',
        'diagnosticMeaning':'Recomputed in the necessary interior windows. Exterior diagnostics remain original adaptive history, not new recovered-aperture qualification.',
        'noiseMeaning':'Conditional diagonal native model with repeated IDs and cross-field Cauchy upper; omitted sky/systematic/processing/PSF terms unbounded.',
        'wholeMasterFilterRuns':0,'fitRuns':0,'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    return RecoveredApertureCandidate(estimates,maps['qualified'],maps['radius'],maps['reached'],maps['protected'],affected,report)


def refine_current_recovery_real_halo(master,parent,recovery,interior,sources,*,batch_size=64,cancelled=None,progress=None):
    """Complete real perimeter dependencies; saved interior stays byte exact.

    No whole/master/interior filtering, fit, source acquisition or publication.
    Every source window supplies actual outside raw coefficients/native noise;
    only qualified weak changed dependencies use the shared targeted policy.
    """
    from sdss_adaptive_display import RADII,RATIO
    from sdss_noise_display import _real_halo_regions
    if not isinstance(batch_size,int) or isinstance(batch_size,bool) or not 1<=batch_size<=256:
        raise RuntimeError('sdss_adaptive_batch_size_invalid')
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_recovered_aperture_cancelled')
    check();_admit_current_recovery_parent(master,parent,recovery)
    _validate_recovered_aperture_candidate(master,interior,master.report)
    expected={'version':INTERIOR_CANDIDATE_VERSION,'baselineRecoveryVersion':CURRENT_ADAPTIVE_VERSION,
        'baselineRecoveryEstimateCOrderSha256':recovery.report['displayEstimatesCOrderSha256'],
        'baselineSupplyCOrderSha256':recovery.report['alternativeSupplyCOrderSha256'],
        'baselineAdaptiveVersion':parent.report['version'],
        'baselineAdaptiveDiagnosticCOrderSha256':parent.report['diagnosticCOrderSha256'],
        'scanMjdRanges':recovery.report['scanMjdRanges']}
    if any(interior.report.get(key)!=value for key,value in expected.items()):
        raise RuntimeError('sdss_recovered_halo_interior_parent_invalid')
    n=master.joint_available.shape[0];halo=RADII[-1]
    internal=slice(halo,n-halo),slice(halo,n-halo);perimeter=np.ones((n,n),bool);perimeter[internal]=False
    for key in ('qualified','radius','reached','protected'):
        if not np.array_equal(getattr(interior,key)[perimeter],getattr(parent,key)[perimeter]):
            raise RuntimeError('sdss_recovered_halo_interior_parent_invalid')
    for b in BANDS:
        if not np.array_equal(interior.estimates[b][~interior.affected],recovery.estimates[b][~interior.affected],equal_nan=True):
            raise RuntimeError('sdss_recovered_halo_interior_parent_invalid')
    estimates={b:interior.estimates[b].copy() for b in BANDS}
    maps={key:getattr(interior,key).copy() for key in ('qualified','radius','reached','protected')}
    affected=interior.affected.copy();edges=[];peak=0;external_supply=set();visited=0
    for name,region,target in _real_halo_regions(n,halo):
        check();samples=project_current_recovery_halo_region(master,parent,recovery,sources,region,cancelled=cancelled)
        local=tuple(slice(v.start-r.start,v.stop-r.start) for v,r in zip(target,region))
        baseline=np.stack([interior.estimates[b][target] for b in BANDS])
        baseline_maps={key:getattr(interior,key)[target] for key in maps}
        tile,diagnostics,chosen,influence=_refine_recovered_aperture_samples(samples,local,baseline,baseline_maps,
            batch_size=batch_size,cancelled=cancelled)
        if np.any(chosen&parent.protected[target]):raise RuntimeError('sdss_recovered_halo_original_strong_changed')
        for at,b in enumerate(BANDS):estimates[b][target]=tile[at]
        for key in maps:maps[key][target]=diagnostics[key]
        affected[target]=chosen;visited+=int(chosen.size)
        for y,x in np.argwhere(samples.alternative_supply):
            gx,gy=int(x+region[1].start),int(y+region[0].start)
            if not 0<=gx<n or not 0<=gy<n:external_supply.add((gx,gy))
        changed=np.any(~((tile==baseline)|(np.isnan(tile)&np.isnan(baseline))),axis=0)
        edge={'edge':name,'targetBoundsXYExclusive':[target[1].start,target[0].start,target[1].stop,target[0].stop],
            'sampling':samples.report,'dependencyPositions':int(influence.sum()),'affectedTargets':int(chosen.sum()),
            'changedFromInteriorEstimatePixels':int(changed.sum()),'affectedCOrderSha256':digest(chosen.tobytes()),
            'displayEstimatesCOrderSha256':{b:digest(tile[at].tobytes()) for at,b in enumerate(BANDS)},
            'diagnosticCOrderSha256':{key:digest(value.tobytes()) for key,value in diagnostics.items()}}
        edges.append(edge);peak=max(peak,samples.report['retainedEffectiveStencilArrayBytes'])
        if progress is not None:progress(copy.deepcopy(edge))
        del samples,tile,diagnostics,chosen,influence,baseline,baseline_maps
    check();changed=np.zeros((n,n),bool);from_interior=np.zeros((n,n),bool)
    if visited!=int(perimeter.sum()):raise RuntimeError('sdss_recovered_halo_targets_incomplete')
    for b in BANDS:
        if (not np.array_equal(estimates[b][internal],interior.estimates[b][internal],equal_nan=True) or
                not np.array_equal(estimates[b][~affected],recovery.estimates[b][~affected],equal_nan=True) or
                not np.array_equal(estimates[b][parent.protected],interior.estimates[b][parent.protected],equal_nan=True)):
            raise RuntimeError('sdss_recovered_halo_unaffected_changed')
        changed|=~((estimates[b]==recovery.estimates[b])|(np.isnan(estimates[b])&np.isnan(recovery.estimates[b])))
        from_interior|=~((estimates[b]==interior.estimates[b])|(np.isnan(estimates[b])&np.isnan(interior.estimates[b])))
        estimates[b].setflags(write=False)
    for key,value in maps.items():
        if not np.array_equal(value[internal],getattr(interior,key)[internal]):raise RuntimeError('sdss_recovered_halo_interior_changed')
        value.setflags(write=False)
    affected.setflags(write=False);radii,counts=np.unique(maps['radius'],return_counts=True)
    report=copy.deepcopy(interior.report)
    for key in ('arrays','levels','publication','exteriorEstimatesAndAdaptiveDiagnosticsExact'):report.pop(key,None)
    report.update({'version':HALO_CANDIDATE_VERSION,'scope':'Complete saved-master recovered-source apertures with actual native real halo, offline candidate only',
        'parentInteriorVersion':INTERIOR_CANDIDATE_VERSION,'parentInteriorEstimateCOrderSha256':copy.deepcopy(interior.report['displayEstimatesCOrderSha256']),
        'parentInteriorDiagnosticCOrderSha256':copy.deepcopy(interior.report['diagnosticCOrderSha256']),
        'parentInteriorAffectedCOrderSha256':interior.report['affectedCOrderSha256'],'interiorExact':True,
        'exteriorApertureProcessing':'COMPLETE_REAL_SOURCE_WINDOW','sourceWindowHaloPixels':halo,
        'edgeTargetPixels':visited,'edgeRegions':edges,'exteriorDependencyPositions':sum(v['dependencyPositions'] for v in edges),
        'edgeAffectedTargets':sum(v['affectedTargets'] for v in edges),'outsideCropUniqueSupplyPixels':len(external_supply),
        'affectedTargets':int(affected.sum()),'affectedCOrderSha256':digest(affected.tobytes()),
        'changedEstimatePixels':int(changed.sum()),'changedFromInteriorEstimatePixels':int(from_interior.sum()),
        'displayEstimatesCOrderSha256':{b:digest(v.tobytes()) for b,v in estimates.items()},
        'diagnosticCOrderSha256':{key:digest(value.tobytes()) for key,value in maps.items()},
        'qualifiedCenters':int(maps['qualified'].sum()),'protectedCenters':int(maps['protected'].sum()),
        'commonRatioReached':int(maps['reached'].sum()),'radiusCounts':dict(zip(map(str,radii.tolist()),counts.tolist())),
        'maximumRetainedEffectiveStencilArrayBytes':peak,'batchSize':batch_size,'wholeMasterFilterRuns':0,'fitRuns':0,
        'diagnosticMeaning':'Saved internal diagnostics exact; perimeter uses actual raw native halo/alternate cohort support. Outside source support is not new published science/coverage.',
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False})
    return RecoveredApertureCandidate(estimates,maps['qualified'],maps['radius'],maps['reached'],maps['protected'],affected,report)


def _validate_recovered_aperture_candidate(master,candidate,entry):
    from sdss_adaptive_display import RADII,RATIO
    from sdss_gri_tan import _qualified_science_pyramid
    report=candidate.report;n=master.joint_available.shape[0]
    interior_mode=(report.get('version')==INTERIOR_CANDIDATE_VERSION and
        report.get('exteriorApertureProcessing')=='PENDING_REAL_SOURCE_WINDOW' and
        report.get('exteriorEstimatesAndAdaptiveDiagnosticsExact') is True)
    halo_mode=(report.get('version')==HALO_CANDIDATE_VERSION and
        report.get('exteriorApertureProcessing')=='COMPLETE_REAL_SOURCE_WINDOW' and report.get('interiorExact') is True and
        report.get('parentInteriorVersion')==INTERIOR_CANDIDATE_VERSION and report.get('sourceWindowHaloPixels')==RADII[-1] and
        report.get('edgeTargetPixels')==n*n-(n-2*RADII[-1])**2 and len(report.get('edgeRegions',[]))==4)
    if (not (interior_mode or halo_mode) or
            report.get('sourceResolvedRecipe')!=_qualified_science_pyramid(master) or
            report.get('baselineRecoveryVersion')!=CURRENT_ADAPTIVE_VERSION or
            report.get('interiorDependenciesCompleted') is not True or
            report.get('unaffectedEstimatesExact') is not True or
            report.get('radii')!=list(RADII) or report.get('absoluteConditionalRatio')!=RATIO or
            report.get('wholeMasterFilterRuns')!=0 or report.get('fitRuns')!=0 or
            report.get('adopted') is not False or report.get('quality')!='UNVERIFIED' or report.get('independentReview')!='MISSING' or
            any(report.get(key)!=master.report.get(key) or report.get(key)!=entry.get(key) for key in ('objectRef','center','orientation')) or
            set(candidate.estimates)!=set(BANDS)):
        raise RuntimeError('sdss_recovered_aperture_candidate_binding_invalid')
    if digest(master.joint_available.tobytes())!=report['sourceAvailabilityCOrderSha256']:
        raise RuntimeError('sdss_recovered_aperture_candidate_source_changed')
    for b,value in candidate.estimates.items():
        if (value.shape!=(n,n) or value.dtype!=np.float32 or not np.isfinite(value[master.joint_available]).all() or
                digest(value.tobytes())!=report['displayEstimatesCOrderSha256'][b] or
                digest(master.bands[b].data.astype('<f4',copy=False).tobytes())!=report['sourceScienceCOrderSha256'][b]):
            raise RuntimeError('sdss_recovered_aperture_candidate_samples_changed')
    for key,dtype in (('qualified',np.bool_),('radius',np.int8),('reached',np.bool_),('protected',np.bool_),('affected',np.bool_)):
        value=getattr(candidate,key);expected=report['affectedCOrderSha256'] if key=='affected' else report['diagnosticCOrderSha256'][key]
        if value.shape!=(n,n) or value.dtype!=dtype or digest(value.tobytes())!=expected:
            raise RuntimeError('sdss_recovered_aperture_candidate_diagnostic_changed')
    affected=candidate.affected;halo=RADII[-1]
    edge_count=int(affected[:halo].sum()+affected[-halo:].sum()+affected[halo:-halo,:halo].sum()+affected[halo:-halo,-halo:].sum())
    if (int(affected.sum())!=report['affectedTargets'] or (interior_mode and edge_count!=0) or
            (halo_mode and edge_count!=report.get('edgeAffectedTargets')) or np.any(affected&(~candidate.qualified|candidate.protected)) or
            np.any(candidate.reached&(candidate.radius<=0))):
        raise RuntimeError('sdss_recovered_aperture_candidate_policy_invalid')


def recovered_aperture_products(master,candidate,entry,*,output_pixels=512):
    _validate_recovered_aperture_candidate(master,candidate,entry)
    return _display_estimate_products(master,candidate.estimates,entry,output_pixels,candidate.report['version'])


def save_recovered_aperture_candidate(output,master,candidate,entry,*,output_pixels=512):
    products=recovered_aperture_products(master,candidate,entry,output_pixels=output_pixels)
    output.mkdir(parents=True,exist_ok=False)
    arrays={b:_save_array(output/f'{b}-display-estimates.npy',value) for b,value in candidate.estimates.items()}
    arrays.update({key:_save_array(output/f'{key}.npy',getattr(candidate,key)) for key in ('qualified','radius','reached','protected','affected')})
    levels={}
    for level,(encoded,metadata) in products.items():
        name=f'{entry["objectRef"].replace(":","-")}-{level.lower()}.png';(output/name).write_bytes(encoded)
        levels[level]=metadata|{'file':name}
    report=copy.deepcopy(candidate.report)|{'arrays':arrays,'levels':levels,'publication':'OFFLINE_CANDIDATE_ONLY'}
    write_report(output/'candidate.json',report);return report


def _validate_recovery_candidate(master,candidate,entry):
    """Bind existing estimates/supply without rendering their old PNGs."""
    if candidate.report.get('sourceResolvedRecipe')!=master.report.get('display',{}).get('transfer'):
        raise RuntimeError('sdss_display_recovery_recipe_changed')
    if (candidate.report.get('version') not in (VERSION,REBASE_VERSION,CURRENT_ADAPTIVE_VERSION) or candidate.alternative_supply.shape!=master.joint_available.shape or
        candidate.alternative_supply.dtype!=np.bool_ or np.any(candidate.alternative_supply&~master.joint_available) or
        digest(candidate.alternative_supply.tobytes())!=candidate.report['alternativeSupplyCOrderSha256'] or
        master.report.get('objectRef')!=entry.get('objectRef') or master.report.get('center')!=entry.get('center')):
        raise RuntimeError('sdss_display_recovery_identity_invalid')
    if digest(master.joint_available.tobytes())!=candidate.report['sourceAvailabilityCOrderSha256']:
        raise RuntimeError('sdss_display_recovery_parent_changed')
    for b in BANDS:
        if (digest(master.bands[b].data.astype('<f4',copy=False).tobytes())!=candidate.report['sourceScienceCOrderSha256'][b] or
            digest(candidate.estimates[b].astype('<f4',copy=False).tobytes())!=candidate.report['displayEstimatesCOrderSha256'][b]):
            raise RuntimeError('sdss_display_recovery_parent_changed')
    if (set(candidate.estimates)!=set(BANDS) or
        int(candidate.alternative_supply.sum())!=candidate.report.get('alternativePixels') or
        any(v.shape!=master.joint_available.shape or v.dtype!=np.float32 or
            not np.isfinite(v[master.joint_available]).all() for v in candidate.estimates.values())):
        raise RuntimeError('sdss_display_recovery_samples_invalid')
    if candidate.report['version']==REBASE_VERSION and (
        candidate.report.get('baselineProcessingVersion')!='sdss-common-adaptive-real-halo-display-candidate-v2' or
        candidate.report.get('savedSupplyProcessingVersion')!=VERSION or
        candidate.report.get('sourceInputsExact') is not True or candidate.report.get('supplyProjectionRuns')!=0):
        raise RuntimeError('sdss_display_recovery_rebase_policy_invalid')
    if candidate.report['version']==CURRENT_ADAPTIVE_VERSION:
        from sdss_adaptive_display import VERSION as adaptive_version,HALO_VERSION
        report=candidate.report;diagnostics=report.get('baselineDiagnosticCOrderSha256',{})
        if (report.get('baselineProcessingVersion') not in (adaptive_version,HALO_VERSION) or
                report.get('recoveryExecutionKind')!='CURRENT_NATIVE_SUPPLY_ON_CURRENT_ADAPTIVE_PARENT' or
                set(diagnostics)!= {'qualified','radius','reached','protected'} or
                report.get('baselineQualifiedCOrderSha256')!=diagnostics['qualified'] or
                any(report.get(k)!=master.report.get(k) or report.get(k)!=entry.get(k)
                    for k in ('objectRef','center','orientation')) or
                any(k in report for k in ('savedSupplyProcessingVersion','savedExecutionCanonicalSha256','baselineProcessableCOrderSha256')) or
                report.get('filterRuns')!=0 or report.get('fitRuns')!=0 or
                report.get('adopted') is not False or report.get('quality')!='UNVERIFIED' or report.get('independentReview')!='MISSING'):
            raise RuntimeError('sdss_display_recovery_current_adaptive_policy_invalid')


def rebase_saved_other_scan_display(master,initial,sources,saved,provenance,*,
        expected_saved_report_sha256,expected_provenance_sha256,chunk_rows=64,cancelled=None):
    """Reuse externally pinned, already qualified alternatives on a new parent.

    Exact native input/model, epoch, projected science and geometry weights must
    match the old execution. Code changes are recorded separately, not assigned
    to that historical run. Only saved supply on currently unqualified centers
    can replace values; current qualified/strong structure and all other values
    retain the new adaptive parent. No recovery projection or filter is rerun.
    Caller pins are trusted execution evidence, not source-rights admission.
    """
    from sdss_adaptive_display import _validate_adaptive_candidate,HALO_VERSION
    from sdss_noise_display_provenance import build_noise_display_provenance,canonical_bytes,_pin
    if not isinstance(chunk_rows,int) or isinstance(chunk_rows,bool) or not 1<=chunk_rows<=256:
        raise RuntimeError('sdss_display_recovery_chunk_invalid')
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_display_recovery_cancelled')
    check()
    for value in (expected_saved_report_sha256,expected_provenance_sha256):_pin(value)
    if (digest(canonical_bytes(saved.report))!=expected_saved_report_sha256 or
        digest(canonical_bytes(provenance))!=expected_provenance_sha256):
        raise RuntimeError('sdss_display_recovery_saved_execution_changed')
    if (saved.report.get('version')!=VERSION or
        provenance.get('kind')!='CURRENT_RECOVERY_EXECUTION_WITH_PINNED_OLD_NOISE_PARENT' or
        any(saved.report.get(k)!=v for k,v in provenance.get('recoveryReport',{}).items()) or
        provenance.get('recoveryReport',{}).get('version')!=VERSION):
        raise RuntimeError('sdss_display_recovery_saved_execution_invalid')
    _validate_recovery_candidate(master,saved,master.report)
    _validate_adaptive_candidate(master,initial,master.report)
    if initial.report['version']!=HALO_VERSION:
        raise RuntimeError('sdss_display_recovery_adaptive_parent_invalid')
    check();current=build_noise_display_provenance(master,sources);old=provenance.get('currentInputSnapshot',{})
    if any(canonical_bytes(current[k])!=canonical_bytes(old.get(k)) for k in ('schemaVersion','master','fields')):
        raise RuntimeError('sdss_display_recovery_source_inputs_changed')
    check()
    estimates={b:initial.estimates[b].copy() for b in BANDS}
    supply=saved.alternative_supply&~initial.qualified
    n=supply.shape[0];chunks=0
    for start in range(0,n,chunk_rows):
        check();region=(slice(start,min(start+chunk_rows,n)),slice(None));chosen=supply[region]
        for b in BANDS:estimates[b][region][chosen]=saved.estimates[b][region][chosen]
        chunks+=1
    check()
    for b in BANDS:
        if not np.array_equal(estimates[b][~supply],initial.estimates[b][~supply],equal_nan=True):
            raise RuntimeError('sdss_display_recovery_unrelated_changed')
        estimates[b].setflags(write=False)
    supply.setflags(write=False)
    report=copy.deepcopy(saved.report)
    for k in ('arrays','levels','publication','baselineProcessableCOrderSha256',
        'scanContributionPixels','maximumSingleFieldStencilArrayBytes','flagOnlyAlternativePixels',
        'flagOnlyAlternativeSupplyCOrderSha256','flagOnlyRejectedByNativeQualification'):report.pop(k,None)
    report.update({'version':REBASE_VERSION,'baselineProcessingVersion':initial.report['version'],
        'baselineEstimateCOrderSha256':copy.deepcopy(initial.report['displayEstimatesCOrderSha256']),
        'baselineDiagnosticCOrderSha256':copy.deepcopy(initial.report['diagnosticCOrderSha256']),
        'baselineQualifiedCOrderSha256':digest(initial.qualified.tobytes()),
        'displayEstimatesCOrderSha256':{b:digest(v.astype('<f4',copy=False).tobytes()) for b,v in estimates.items()},
        'alternativeSupplyCOrderSha256':digest(supply.tobytes()),'alternativePixels':int(supply.sum()),
        'savedSupplyProcessingVersion':VERSION,'savedSupplyReportCanonicalSha256':expected_saved_report_sha256,
        'savedExecutionCanonicalSha256':expected_provenance_sha256,'sourceInputsExact':True,
        'currentSourceInputs':{'schemaVersion':current['schemaVersion'],
          'masterAndFieldsCanonicalSha256':digest(canonical_bytes({k:current[k] for k in ('master','fields')})),
          'implementation':current['implementation'],'libraries':current['libraries']},
        'savedAlternativePixels':int(saved.alternative_supply.sum()),
        'savedScanContributionPixels':copy.deepcopy(saved.report['scanContributionPixels']),
        'savedFlagOnlyRejectedByNativeQualification':saved.report['flagOnlyRejectedByNativeQualification'],
        'savedSupplyKeptCurrentQualifiedPixels':int((saved.alternative_supply&initial.qualified).sum()),
        'qualificationReuse':'Exact pinned old execution inputs/native model/epochs/flags/geometry. Only old admitted supply and currently unqualified centers; valid current samples retain new adaptive parent.',
        'chunks':chunks,'supplyProjectionRuns':0,'filterRuns':0,'fitRuns':0,
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False})
    return OtherScanDisplay(estimates,supply,report)


def recovery_products(master,candidate,entry,*,output_pixels=512):
    _validate_recovery_candidate(master,candidate,entry)
    return _display_estimate_products(master,candidate.estimates,entry,output_pixels,candidate.report['version'])


def save_recovery_candidate(output:Path,master,candidate,entry,*,output_pixels=512):
    products=recovery_products(master,candidate,entry,output_pixels=output_pixels)
    output.mkdir(parents=True,exist_ok=False)
    arrays={b:_save_array(output/f'{b}-display-estimates.npy',v) for b,v in candidate.estimates.items()}
    arrays['alternative-supply']=_save_array(output/'alternative-supply.npy',candidate.alternative_supply)
    levels={}
    for level,(payload,metadata) in products.items():
        name=f'{entry["objectRef"].replace(":","-")}-{level.lower()}.png';(output/name).write_bytes(payload)
        levels[level]=metadata|{'file':name}
    report=copy.deepcopy(candidate.report)|{'arrays':arrays,'levels':levels,'objectRef':entry['objectRef'],
        'center':entry['center'],'orientation':'north-up/east-left','publication':'OFFLINE_CANDIDATE_ONLY'}
    write_report(output/'candidate.json',report);return report
