"""Conditional native-noise variance of a common uniform target aperture.

Source/processing/geometry admission belongs to the existing display source
owners. This linear arithmetic-mean variance is not a median estimator, filtered
image uncertainty, PSF match, significance certification or source detection.
"""
import numpy as np
from sdss_noise_display import conditional_variance_upper


def field_aperture_variance(stencil, selected):
    """Aggregate repeated native IDs BEFORE squaring aperture coefficients.

    The supplied per-target coefficients already contain the actual field's
    spatially varying coadd weights. Zero coefficients contribute no unknown
    variance. Positive unknown support stays unknown. Native model remains
    diagonal within this field; no independent target-pixel assumption is made.
    """
    ids=stencil['ids'];weights=stencil['weights'];native=stencil['native_variance']
    if (ids.ndim!=4 or ids.shape[:2]!=(3,4) or ids.dtype.kind not in 'iu' or
        weights.shape!=ids.shape or native.shape!=ids.shape or
        selected.shape!=ids.shape[2:] or selected.dtype!=np.bool_ or not selected.any() or
        weights.dtype.kind!='f' or native.dtype.kind!='f' or
        not np.isfinite(weights).all() or (weights<0).any()):
        raise RuntimeError('sdss_aperture_stencil_invalid')
    count=int(selected.sum());result=np.empty(3,dtype=np.float64)
    for band in range(3):
        coefficient=weights[band][:,selected].ravel().astype(np.float64)/count
        index=ids[band][:,selected].ravel();variance=native[band][:,selected].ravel()
        active=coefficient>0
        if not active.any():result[band]=0;continue
        if ((index[active]<0).any() or not np.isfinite(variance[active]).all() or (variance[active]<0).any()):
            result[band]=np.nan;continue
        index=index[active];coefficient=coefficient[active];variance=variance[active]
        unique,inverse=np.unique(index,return_inverse=True)
        # One native ID under one admitted model must have one variance. Using
        # min/max avoids silently selecting whichever repeat happened first.
        minimum=np.full(len(unique),np.inf);maximum=np.full(len(unique),-np.inf)
        np.minimum.at(minimum,inverse,variance);np.maximum.at(maximum,inverse,variance)
        if not np.array_equal(minimum,maximum):
            raise RuntimeError('sdss_aperture_native_variance_incoherent')
        combined=np.bincount(inverse,weights=coefficient,minlength=len(unique))
        result[band]=np.sum(combined**2*minimum)
    return result


def aperture_variance_upper(stencils, selected):
    """Cauchy upper across fields, conditional on their native noise models."""
    return conditional_variance_upper([field_aperture_variance(s,selected) for s in stencils])


def batch_field_aperture_variance(ids,weights,native,selected):
    """Independent rows of one field/band, each with4 source neighbors/sample.

    Sorting groups actual native identities in each row; no target covariance
    cutoff, FFT, Poisson shortcut or change in the marginal noise model.
    """
    if (ids.ndim!=3 or ids.shape[1]!=4 or ids.dtype.kind not in 'iu' or
        weights.shape!=ids.shape or native.shape!=ids.shape or
        selected.shape!=(ids.shape[0],ids.shape[2]) or selected.dtype!=np.bool_ or
        not selected.any(axis=1).all() or weights.dtype.kind!='f' or native.dtype.kind!='f' or
        not np.isfinite(weights).all() or (weights<0).any()):
        raise RuntimeError('sdss_aperture_batch_invalid')
    count=selected.sum(axis=1);coefficient=np.where(selected[:,None],weights,0).reshape(ids.shape[0],-1).astype(np.float64)
    coefficient/=count[:,None]
    index=ids.reshape(ids.shape[0],-1);variance=native.reshape(ids.shape[0],-1)
    active=coefficient>0;sentinel=np.iinfo(ids.dtype).max
    unknown=(active&((index<0)|~np.isfinite(variance)|(variance<0))).any(axis=1)
    index=np.where(active,index,sentinel)
    variance=np.where(active,variance,0)
    order=np.lexsort((~active,index),axis=1)
    index=np.take_along_axis(index,order,axis=1)
    coefficient=np.take_along_axis(coefficient,order,axis=1)
    variance=np.take_along_axis(variance,order,axis=1)
    active=np.take_along_axis(active,order,axis=1)
    duplicate=(index[:,1:]==index[:,:-1])&active[:,1:]&active[:,:-1]
    incoherent=(duplicate&(variance[:,1:]!=variance[:,:-1])).any(axis=1)
    if (incoherent&~unknown).any():raise RuntimeError('sdss_aperture_native_variance_incoherent')
    start=np.ones(index.shape,dtype=bool)
    start[:,1:]=(index[:,:-1]!=index[:,1:])|(active[:,:-1]!=active[:,1:])
    offsets=np.flatnonzero(start)
    # Direct grouped sums avoid subtracting large cumulative totals, which
    # could erase a tiny coefficient with a material native variance.
    combined=np.add.reduceat(coefficient.ravel(),offsets)
    result=np.bincount(offsets//index.shape[1],weights=combined**2*variance.ravel()[offsets],minlength=ids.shape[0])
    result[unknown]=np.nan
    return result
