"""Explicit common-scale signed display estimates from original coadd samples.

The noise ratio is model-conditional, not calibrated detection/confidence. This
is a bounded mathematical adaptation, not the ADAPTSMOOTH program or median
mode. Sign-neutral gates avoid adding its positive-only stopping preference.
"""
from dataclasses import dataclass
import copy
from pathlib import Path
from typing import Callable
import numpy as np
from sdss_noise_aperture import aperture_variance_upper,batch_field_aperture_variance
from sdss_noise_display import conditional_variance_upper
from sdss_noise_display import _qualified_sources,_project_display_region,_display_estimate_products,_project_real_halo_window
from sdss_gri_tan import BANDS,_qualified_science_pyramid,_save_array
from image_quality import digest,write_report

RADII=(1,2,4,8)
RATIO=3.0
VERSION='sdss-common-adaptive-display-candidate-v1'
HALO_VERSION='sdss-common-adaptive-real-halo-display-candidate-v2'

@dataclass(frozen=True)
class AdaptiveDisplayRegion:
    estimates: np.ndarray
    radius: np.ndarray
    reached: np.ndarray
    protected: np.ndarray

@dataclass(frozen=True)
class AdaptiveDisplayCandidate:
    estimates: dict
    qualified: np.ndarray
    radius: np.ndarray
    reached: np.ndarray
    protected: np.ndarray
    report: dict


def _display_support(values,eligible,stencils):
    if (values.ndim!=3 or values.shape[0]!=3 or values.dtype!=np.float32 or
        min(values.shape[1:])<=2*RADII[-1] or eligible.shape!=values.shape[1:] or
        eligible.dtype!=np.bool_ or not stencils or
        np.any(eligible&~np.isfinite(values).all(axis=0))):
        raise RuntimeError('sdss_adaptive_samples_invalid')
    for s in stencils:
        if s['variance'].shape!=values.shape:
            raise RuntimeError('sdss_adaptive_noise_shape_invalid')
    marginal=conditional_variance_upper([s['variance'] for s in stencils])
    usable=eligible&np.isfinite(marginal).all(axis=0)&(marginal>0).all(axis=0)
    with np.errstate(invalid='ignore',divide='ignore'):
        protected=usable&(np.abs(values)/np.sqrt(marginal)>=RATIO).any(axis=0)
    return usable,protected


def adaptive_common_display(values,eligible,stencils,*,cancelled: Callable[[],bool]|None=None):
    """One common support for gri, no repeated filtering or synthetic halo.

    Source/processing/coadd admission is caller-owned. Bright/strong signed
    structure in any band retains all bands and cannot leak into faint kernels.
    A whole geometric aperture must have admitted support; unknown/flagged
    neighbors never silently become zero or get bridged by larger apertures.
    The largest valid aperture is used when no common ratio is reached; reached
    stays false, science availability/alpha do not change. Outer8 stays original.
    """
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_adaptive_display_cancelled')
    check()
    usable,protected=_display_support(values,eligible,stencils)
    result=values.copy();radius=np.full(eligible.shape,-1,dtype=np.int8);reached=np.zeros(eligible.shape,bool)
    radius[protected]=0
    height,width=eligible.shape;max_radius=RADII[-1]
    for y in range(max_radius,height-max_radius):
        check()
        for x in range(max_radius,width-max_radius):
            if not usable[y,x] or protected[y,x]:continue
            for r in RADII:
                region=(slice(y-r,y+r+1),slice(x-r,x+r+1))
                dy,dx=np.mgrid[-r:r+1,-r:r+1];circle=dx**2+dy**2<=r*r
                if not usable[region][circle].all():break
                selected=circle&~protected[region]
                assert selected[r,r] # weak qualified centre always included
                local=[{k:v[:,:,region[0],region[1]] for k,v in s.items() if k in ('ids','weights','native_variance')} for s in stencils]
                upper=aperture_variance_upper(local,selected)
                if not np.isfinite(upper).all() or (upper<=0).any():break
                mean=values[:,region[0],region[1]][:,selected].astype(np.float64).mean(axis=1)
                result[:,y,x]=mean;radius[y,x]=r
                if (np.abs(mean)/np.sqrt(upper)>=RATIO).all():
                    reached[y,x]=True;break
    check()
    for v in (result,radius,reached,protected):v.setflags(write=False)
    return AdaptiveDisplayRegion(result,radius,reached,protected)


def adaptive_common_display_batched(values,eligible,stencils,*,batch_size=64,cancelled=None,targets=None):
    """Same policy, bounded native-ID sorting per field/band and target batch.

    Ratios close to a floating comparison boundary use the scalar arithmetic;
    grouping roundoff must not silently select a different smoothing radius.
    A supplied target mask requests only those centres; its full real halo must
    be present. Unrequested output values retain the raw input for the caller
    to composite against its owned saved parent, not to relabel as filtered.
    """
    if not isinstance(batch_size,int) or isinstance(batch_size,bool) or not 1<=batch_size<=256:
        raise RuntimeError('sdss_adaptive_batch_size_invalid')
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_adaptive_display_cancelled')
    check();usable,protected=_display_support(values,eligible,stencils)
    if targets is not None:
        if (not isinstance(targets,np.ndarray) or targets.shape!=eligible.shape or targets.dtype!=np.bool_ or
                targets[:8].any() or targets[-8:].any() or targets[:,:8].any() or targets[:,-8:].any()):
            raise RuntimeError('sdss_adaptive_targets_invalid')
    result=values.copy();radius=np.full(eligible.shape,-1,dtype=np.int8);radius[protected]=0
    reached=np.zeros(eligible.shape,bool)
    candidates=usable&~protected;candidates[:8]=False;candidates[-8:]=False;candidates[:,:8]=False;candidates[:,-8:]=False
    if targets is not None:candidates &= targets
    coordinates=np.argwhere(candidates)
    for start in range(0,len(coordinates),batch_size):
        check();centres=coordinates[start:start+batch_size];alive=np.ones(len(centres),bool)
        for r in RADII:
            check();positions=np.flatnonzero(alive)
            if not len(positions):break
            centre=centres[positions];dy,dx=np.mgrid[-r:r+1,-r:r+1];circle=dx**2+dy**2<=r*r
            ys=centre[:,0,None]+dy[circle];xs=centre[:,1,None]+dx[circle]
            qualified=usable[ys,xs].all(axis=1);alive[positions[~qualified]]=False
            positions=positions[qualified];ys=ys[qualified];xs=xs[qualified]
            if not len(positions):continue
            selected=~protected[ys,xs];count=selected.sum(axis=1)
            means=np.where(selected[None],values[:,ys,xs].astype(np.float64),0).sum(axis=2)/count[None]
            fields=[]
            for s in stencils:
                check();bands=[]
                for band in range(3):
                    ids=s['ids'][band][:,ys,xs].transpose(1,0,2)
                    weights=s['weights'][band][:,ys,xs].transpose(1,0,2)
                    native=s['native_variance'][band][:,ys,xs].transpose(1,0,2)
                    bands.append(batch_field_aperture_variance(ids,weights,native,selected))
                fields.append(np.stack(bands))
            upper=conditional_variance_upper(fields)
            finite=np.isfinite(upper).all(axis=0)&(upper>0).all(axis=0)
            alive[positions[~finite]]=False
            positions=positions[finite];means=means[:,finite];upper=upper[:,finite]
            if not len(positions):continue
            ratios=np.abs(means)/np.sqrt(upper)
            near=np.any(np.abs(ratios-RATIO)<=1e-11*np.maximum(ratios,RATIO),axis=0)
            for index in np.flatnonzero(near):
                y,x=centres[positions[index]];region=(slice(y-r,y+r+1),slice(x-r,x+r+1));chosen=circle&~protected[region]
                local=[{k:v[:,:,region[0],region[1]] for k,v in s.items() if k in ('ids','weights','native_variance')} for s in stencils]
                upper[:,index]=aperture_variance_upper(local,chosen)
                means[:,index]=values[:,region[0],region[1]][:,chosen].astype(np.float64).mean(axis=1)
            target=centres[positions];y,x=target[:,0],target[:,1]
            result[:,y,x]=means;radius[y,x]=r
            passed=(np.abs(means)/np.sqrt(upper)>=RATIO).all(axis=0)
            reached[y[passed],x[passed]]=True;alive[positions[passed]]=False
    check()
    for v in (result,radius,reached,protected):v.setflags(write=False)
    return AdaptiveDisplayRegion(result,radius,reached,protected)


def render_adaptive_display_candidate(master,sources,*,chunk_rows=32,batch_size=64,cancelled=None,progress=None):
    """Original single/mosaic/partial coadd with real eight-pixel chunk halo.

    Outer eight pixels stay original. Source frames and master are caller-owned;
    chunks retire their projected native stencils. No downloads or partial
    candidate return on cancellation. This is explicit offline display only.
    """
    if not isinstance(chunk_rows,int) or isinstance(chunk_rows,bool) or not 1<=chunk_rows<=256:
        raise RuntimeError('sdss_adaptive_chunk_rows_invalid')
    if not isinstance(batch_size,int) or isinstance(batch_size,bool) or not 1<=batch_size<=256:
        raise RuntimeError('sdss_adaptive_batch_size_invalid')
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_adaptive_display_cancelled')
    check();recipe,fields,weights=_qualified_sources(master,sources)
    n=master.joint_available.shape[0];halo=RADII[-1]
    if n<=2*halo:raise RuntimeError('sdss_adaptive_master_too_small')
    estimates={b:master.bands[b].data.copy() for b in BANDS}
    qualified=np.zeros((n,n),bool);radius=np.full((n,n),-1,np.int8)
    reached=np.zeros((n,n),bool);protected=np.zeros((n,n),bool)
    chunks=0;peak_stencil=0
    for start in range(halo,n-halo,chunk_rows):
        check();end=min(n-halo,start+chunk_rows)
        region=(slice(start-halo,end+halo),slice(0,n))
        values,eligible,stencils=_project_display_region(master,sources,fields,weights,region,check)
        if stencils:
            result=adaptive_common_display_batched(values,eligible,stencils,batch_size=batch_size,cancelled=cancelled)
            usable,_=_display_support(values,eligible,stencils)
            local=(slice(halo,halo+end-start),slice(halo,n-halo));target=(slice(start,end),slice(halo,n-halo))
            for at,band in enumerate(BANDS):estimates[band][target]=result.estimates[at][local]
            qualified[target]=usable[local];radius[target]=result.radius[local]
            reached[target]=result.reached[local];protected[target]=result.protected[local]
        check();chunks+=1;retained=sum(v.nbytes for s in stencils for v in s.values());peak_stencil=max(peak_stencil,retained)
        if progress is not None:progress({'completedRows':end,'masterRows':n,'activeFields':len(stencils),'retainedStencilArrayBytes':retained})
        # Loop locals must not retain the preceding native stencil/result while
        # the next chunk is being projected.
        del values,eligible,stencils
        if 'result' in locals():del result,usable
    check();hashes={};changed=np.zeros((n,n),bool)
    for b in BANDS:
        same=(estimates[b]==master.bands[b].data)|(np.isnan(estimates[b])&np.isnan(master.bands[b].data))
        if not same[radius<=0].all():raise RuntimeError('sdss_adaptive_fallback_changed')
        changed|=~same;estimates[b].setflags(write=False)
        hashes[b]=digest(estimates[b].astype('<f4',copy=False).tobytes())
    maps={'qualified':qualified,'radius':radius,'reached':reached,'protected':protected}
    for value in maps.values():value.setflags(write=False)
    levels,counts=np.unique(radius,return_counts=True)
    report={'version':VERSION,'scope':'Explicit offline adaptive display estimates, not scientific correction/publication/adoption',
      'sourceResolvedRecipe':copy.deepcopy(recipe),'radii':list(RADII),'absoluteConditionalRatio':RATIO,
      'objectRef':master.report['objectRef'],'center':copy.deepcopy(master.report['center']),'orientation':master.report['orientation'],
      'sourceScienceCOrderSha256':{b:digest(master.bands[b].data.astype('<f4',copy=False).tobytes()) for b in BANDS},
      'sourceAvailabilityCOrderSha256':digest(master.joint_available.tobytes()),'displayEstimatesCOrderSha256':hashes,
      'diagnosticCOrderSha256':{k:digest(v.tobytes()) for k,v in maps.items()},
      'qualifiedCenters':int(qualified.sum()),'protectedCenters':int(protected.sum()),'commonRatioReached':int(reached.sum()),
      'changedEstimatePixels':int(changed.sum()),'originalKeptPixels':int((~changed).sum()),'radiusCounts':dict(zip(map(str,levels.tolist()),counts.tolist())),
      'outerHaloPixels':halo,'chunkRows':chunk_rows,'batchSize':batch_size,'chunks':chunks,'maximumRetainedStencilArrayBytes':peak_stencil,
      'resourceMeaning':'Retained stencil arrays only; excludes sources/master/outputs, projection/batch/library temporaries and process RSS.',
      'noiseModel':'Repeated native IDs combined before squaring, diagonal within-field model and Cauchy upper across fields; omitted sky/systematic/processing uncertainty not bounded.',
      'qualification':'All positive source contributors, coherent finite gri, camera/SKY and processing-associated fpM, reject bits0/1/8/9. Full geometric aperture support; strong signed structure excluded across all bands.',
      'reachedMeaning':'Conditional absolute mean/noise ratio in all three bands, not calibrated confidence or photometry. Unreached remains false and last valid common mean can be used; science validity/alpha unchanged.',
      'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    return AdaptiveDisplayCandidate(estimates,qualified,radius,reached,protected,report)


def _validate_adaptive_candidate(master,candidate,entry):
    """Shared saved-candidate admission, without rerendering old levels."""
    recipe=_qualified_science_pyramid(master);n=master.joint_available.shape[0];report=candidate.report
    if (report.get('version') not in (VERSION,HALO_VERSION) or report.get('sourceResolvedRecipe')!=recipe or
        report.get('radii')!=list(RADII) or report.get('absoluteConditionalRatio')!=RATIO or
        any(report.get(k)!=master.report.get(k) or report.get(k)!=entry.get(k) for k in ('objectRef','center','orientation')) or
        set(candidate.estimates)!=set(BANDS)):
        raise RuntimeError('sdss_adaptive_candidate_binding_invalid')
    if (report['version']==VERSION and report.get('outerHaloPixels')!=RADII[-1]) or (
        report['version']==HALO_VERSION and (report.get('outerHaloPixels')!=0 or report.get('sourceWindowHaloPixels')!=RADII[-1] or
          report.get('parentProcessingVersion')!=VERSION or report.get('interiorExact') is not True or report.get('wholeMasterFilterRuns')!=0)):
        raise RuntimeError('sdss_adaptive_candidate_policy_invalid')
    if digest(master.joint_available.tobytes())!=report['sourceAvailabilityCOrderSha256']:
        raise RuntimeError('sdss_adaptive_source_changed')
    for b in BANDS:
        value=candidate.estimates[b]
        if (value.shape!=(n,n) or value.dtype!=np.float32 or
          digest(master.bands[b].data.astype('<f4',copy=False).tobytes())!=report['sourceScienceCOrderSha256'][b] or
          digest(value.astype('<f4',copy=False).tobytes())!=report['displayEstimatesCOrderSha256'][b]):
            raise RuntimeError('sdss_adaptive_source_changed')
    for k,dtype in (('qualified',np.bool_),('radius',np.int8),('reached',np.bool_),('protected',np.bool_)):
        value=getattr(candidate,k)
        if value.shape!=(n,n) or value.dtype!=dtype or digest(value.tobytes())!=report['diagnosticCOrderSha256'][k]:
            raise RuntimeError('sdss_adaptive_diagnostic_changed')


def adaptive_display_pyramid(master,candidate,entry,*,output_pixels=512):
    """Frozen shared numeric display-estimate LOD, binding identity and source."""
    _validate_adaptive_candidate(master,candidate,entry)
    return _display_estimate_products(master,candidate.estimates,entry,output_pixels,candidate.report['version'])


def refine_adaptive_real_halo(master,initial,sources,*,batch_size=64,cancelled=None,progress=None):
    """Update only crop perimeter using real CCD-supported full apertures.

    Original v1 interior and science/coverage remain exact. Each four-window
    update uses original target WCS and common physical source-edge weights;
    unavailable/flagged outside support prevents unsupported smoothing. No
    whole-master filtering, padding or alpha changes. Cancellation returns no
    partial candidate. Callers retain raw sources/master and parent candidate.
    """
    if not isinstance(batch_size,int) or isinstance(batch_size,bool) or not 1<=batch_size<=256:
        raise RuntimeError('sdss_adaptive_batch_size_invalid')
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_adaptive_display_cancelled')
    check();_validate_adaptive_candidate(master,initial,master.report)
    if initial.report['version']!=VERSION:raise RuntimeError('sdss_adaptive_halo_parent_version_invalid')
    _,fields,weights=_qualified_sources(master,sources);n=master.joint_available.shape[0];halo=RADII[-1]
    if n<=2*halo:raise RuntimeError('sdss_adaptive_master_too_small')
    estimates={b:initial.estimates[b].copy() for b in BANDS}
    maps={k:getattr(initial,k).copy() for k in ('qualified','radius','reached','protected')}
    # Top/bottom include corners; side windows exclude them. Every target in
    # the outer ring is visited once, and no cached interior is filtered again.
    from sdss_noise_display import _real_halo_regions
    definitions=_real_halo_regions(n,halo)
    facts=[];peak=0
    for name,region,target in definitions:
        check();values,eligible,stencils,detail=_project_real_halo_window(master,sources,fields,weights,region,check)
        retained=sum(v.nbytes for s in stencils for v in s.values());peak=max(peak,retained)
        if stencils:
            result=adaptive_common_display_batched(values,eligible,stencils,batch_size=batch_size,cancelled=cancelled)
            usable,_=_display_support(values,eligible,stencils)
            local=(slice(halo,values.shape[1]-halo),slice(halo,values.shape[2]-halo))
            for at,b in enumerate(BANDS):estimates[b][target]=result.estimates[at][local]
            maps['qualified'][target]=usable[local]
            for k in ('radius','reached','protected'):maps[k][target]=getattr(result,k)[local]
            del result,usable
        check();detail=detail|{'edge':name,'targetBoundsXYExclusive':[target[1].start,target[0].start,target[1].stop,target[0].stop],
          'supportBoundsXYExclusive':[region[1].start,region[0].start,region[1].stop,region[0].stop],'retainedStencilArrayBytes':retained}
        facts.append(detail)
        if progress is not None:progress(detail)
        del values,eligible,stencils
    check();internal=(slice(halo,n-halo),slice(halo,n-halo));changed=np.zeros((n,n),bool);hashes={}
    for b in BANDS:
        if not np.array_equal(estimates[b][internal],initial.estimates[b][internal],equal_nan=True):
            raise RuntimeError('sdss_adaptive_halo_interior_changed')
        same=(estimates[b]==master.bands[b].data)|(np.isnan(estimates[b])&np.isnan(master.bands[b].data))
        if not same[maps['radius']<=0].all():raise RuntimeError('sdss_adaptive_fallback_changed')
        changed|=~same;estimates[b].setflags(write=False);hashes[b]=digest(estimates[b].astype('<f4',copy=False).tobytes())
    for k,value in maps.items():
        if not np.array_equal(value[internal],getattr(initial,k)[internal]):raise RuntimeError('sdss_adaptive_halo_interior_changed')
        value.setflags(write=False)
    levels,counts=np.unique(maps['radius'],return_counts=True)
    report=copy.deepcopy(initial.report)|{'version':HALO_VERSION,'outerHaloPixels':0,'sourceWindowHaloPixels':halo,
      'edgeProcessing':'Original target WCS with real frame-supported full common apertures; unknown/flags preserve original. No synthetic padding or alpha changes.',
      'parentProcessingVersion':VERSION,'parentDisplayEstimatesCOrderSha256':copy.deepcopy(initial.report['displayEstimatesCOrderSha256']),
      'parentDiagnosticCOrderSha256':copy.deepcopy(initial.report['diagnosticCOrderSha256']),
      'displayEstimatesCOrderSha256':hashes,'diagnosticCOrderSha256':{k:digest(v.tobytes()) for k,v in maps.items()},
      'qualifiedCenters':int(maps['qualified'].sum()),'protectedCenters':int(maps['protected'].sum()),'commonRatioReached':int(maps['reached'].sum()),
      'changedEstimatePixels':int(changed.sum()),'originalKeptPixels':int((~changed).sum()),'radiusCounts':dict(zip(map(str,levels.tolist()),counts.tolist())),
      'edgeTargetPixels':n*n-(n-2*halo)**2,'interiorExact':True,'wholeMasterFilterRuns':0,'edgeProjections':facts,
      'chunks':4,'chunkRows':None,'batchSize':batch_size,'maximumRetainedStencilArrayBytes':peak,
      'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    return AdaptiveDisplayCandidate(estimates,maps['qualified'],maps['radius'],maps['reached'],maps['protected'],report)


def save_adaptive_display_candidate(output: Path,master,candidate,entry,*,output_pixels=512):
    """Exclusive candidate output only; no registry or old publication writes."""
    products=adaptive_display_pyramid(master,candidate,entry,output_pixels=output_pixels)
    output.mkdir(parents=True,exist_ok=False)
    arrays={b:_save_array(output/f'{b}-display-estimates.npy',candidate.estimates[b]) for b in BANDS}
    arrays.update({k:_save_array(output/f'{k}.npy',getattr(candidate,k)) for k in ('qualified','radius','reached','protected')})
    levels={}
    for level,(payload,metadata) in products.items():
        filename=f'{entry["objectRef"].replace(":","-")}-{level.lower()}.png'
        (output/filename).write_bytes(payload);levels[level]=metadata|{'file':filename}
    report=copy.deepcopy(candidate.report)|{'arrays':arrays,'levels':levels,'originalScience':'Referenced by hashes, never overwritten; all estimates remain display-only.'}
    write_report(output/'candidate.json',report)
    return report
