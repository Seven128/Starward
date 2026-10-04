"""Task diagnostic of the actual recorded common-aperture display selection.

Radii/qualification/strong masks are fixed from the real input, never selected
again for the model. The f64 response is conditional on those branches and on
the supplied finite sampled model; it is not a nonlinear display/global PSF.
"""
from dataclasses import dataclass
import numpy as np

@dataclass(frozen=True)
class FixedRecordedResponse:
    actual_estimates: np.ndarray
    response: np.ndarray
    known: np.ndarray
    offsets: np.ndarray
    selected_sample_ids: np.ndarray

def fixed_recorded_response(raw, model, model_known, qualified, strong, targets_yx, radii):
    if (raw.ndim != 3 or raw.shape[0] != 3 or raw.dtype != np.float32 or
            model.shape != raw.shape or model.dtype != np.float64 or
            model_known.shape != raw.shape or model_known.dtype != np.bool_ or
            qualified.shape != raw.shape[1:] or qualified.dtype != np.bool_ or
            strong.shape != qualified.shape or strong.dtype != np.bool_ or
            targets_yx.ndim != 2 or targets_yx.shape[1] != 2 or targets_yx.dtype.kind not in 'iu' or
            radii.shape != (len(targets_yx),) or radii.dtype.kind not in 'iu' or
            not np.isin(radii,[-1,0,1,2,4,8]).all() or
            np.any(model_known & ~np.isfinite(model)) or np.any(strong & ~qualified)):
        raise RuntimeError('fixed_recorded_response_input_invalid')
    height,width=qualified.shape;actual=[];responses=[];known=[];ids=[];offsets=[0]
    for (y,x),radius in zip(targets_yx,radii,strict=True):
        y,x,radius=int(y),int(x),int(radius)
        if not (0<=y<height and 0<=x<width):raise RuntimeError('fixed_recorded_response_target_invalid')
        if radius>0:
            if (y-radius<0 or x-radius<0 or y+radius>=height or x+radius>=width or
                    not qualified[y,x] or strong[y,x]):
                raise RuntimeError('fixed_recorded_response_branch_invalid')
            dy,dx=np.mgrid[-radius:radius+1,-radius:radius+1];circle=dx*dx+dy*dy<=radius*radius
            yy,xx=y+dy[circle],x+dx[circle]
            # Original policy qualifies the entire circle before excluding
            # strong neighbours; excluded unknown data cannot bridge a hole.
            if not qualified[yy,xx].all():raise RuntimeError('fixed_recorded_response_circle_unqualified')
            take=~strong[yy,xx];yy,xx=yy[take],xx[take]
            assert len(yy)>0 and ((yy==y)&(xx==x)).any()
        else:
            if (radius==0)!=bool(strong[y,x]):raise RuntimeError('fixed_recorded_response_branch_invalid')
            yy,xx=np.asarray([y]),np.asarray([x])
        sample_ids=yy*width+xx;ids.extend(sample_ids.tolist());offsets.append(len(ids))
        actual.append(raw[:,yy,xx].astype(np.float64).mean(axis=1).astype(np.float32))
        k=model_known[:,yy,xx].all(axis=1);v=np.full(3,np.nan)
        v[k]=model[:,yy,xx][k].mean(axis=1)
        responses.append(v);known.append(k)
    arrays=(np.stack(actual,axis=1),np.stack(responses,axis=1),np.stack(known,axis=1),
        np.asarray(offsets,np.int64),np.asarray(ids,np.int64))
    for a in arrays:a.setflags(write=False)
    return FixedRecordedResponse(*arrays)
