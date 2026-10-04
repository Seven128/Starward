"""Explicit offline common-gri display estimates; never scientific correction.

Native variance is conditional on the admitted frame/CAS model. Within-field
samples share native noise; cross-field covariance is unknown, so differences
use a Cauchy upper. Omitted sky/systematic/processing uncertainty stays omitted.
This module does not admit sources, choose confidence weights or publish data.
"""
from __future__ import annotations

from dataclasses import dataclass
import copy
import io
import math
from pathlib import Path
from typing import Callable

import numpy as np
from PIL import Image

from sdss_corrected_frame import CorrectedFrame, IDENTITY_KEYS, _identity
from sdss_frame_noise import FieldNoiseParameters, native_noise_samples
from sdss_frame_quality import PixelFlags
from sdss_source_stencil import source_pixel_stencil, bilinear_source_samples
from sdss_gri_tan import (BANDS, LEVELS, GriMaster, ProjectedBand, FixedDisplayTransfer,
    _qualified_science_pyramid, coherent_box_means, make_rgb_display, target_tan, _save_array,
    project_frame_window,geometric_field_weight)
from image_quality import digest, write_report

VERSION = 'sdss-common-noise-display-candidate-v1'
RADIUS = 2
# Detection/OBJECT/BRIGHTOBJECT/SUBTRACTED are not bad or missing measurements.
REJECT_PROCESSING_BITS = sum(1 << bit for bit in (0, 1, 8, 9))


@dataclass(frozen=True)
class NoiseDisplaySource:
    frame: CorrectedFrame
    camera: FieldNoiseParameters | None
    flags: PixelFlags | None


@dataclass(frozen=True)
class NoiseDisplayCandidate:
    estimates: dict[str, np.ndarray]
    processable: np.ndarray
    report: dict


@dataclass(frozen=True)
class RealSourceWindow:
    values: np.ndarray
    available: np.ndarray
    eligible: np.ndarray
    fields: dict
    normalized_weights: dict
    stencils: dict
    report: dict


def pair_difference_variance(stencils, dy, dx):
    """Var of weighted A-B from one frame's diagonal native noise model."""
    radius = RADIUS
    ids, coefficients, native = (stencils[key] for key in ('ids', 'weights', 'native_variance'))
    marginal = stencils['variance']
    if (ids.ndim != 4 or ids.shape[:2] != (3, 4) or ids.dtype.kind not in 'iu' or
            coefficients.shape != ids.shape or native.shape != ids.shape or
            marginal.shape != (3, *ids.shape[2:]) or min(ids.shape[2:]) <= 2*radius or
            any(not isinstance(value, int) or isinstance(value, bool) or abs(value)>radius for value in (dy, dx))):
        raise RuntimeError('sdss_noise_display_stencil_invalid')
    rows, columns = marginal.shape[1]-2*radius, marginal.shape[2]-2*radius
    a = (slice(None), slice(radius, radius+rows), slice(radius, radius+columns))
    b = (slice(None), slice(radius+dy, radius+dy+rows), slice(radius+dx, radius+dx+columns))
    covariance = np.zeros((3, rows, columns), dtype=np.float64)
    for i in range(4):
        for j in range(4):
            match = (ids[:, i][a] >= 0) & (ids[:, i][a] == ids[:, j][b])
            contribution = coefficients[:, i][a]*coefficients[:, j][b]*native[:, i][a]
            covariance += np.where(match & np.isfinite(contribution), contribution, 0)
    va, vb = marginal[a], marginal[b]
    result = va+vb-2*covariance
    tolerance = np.finfo(np.float64).eps*16*np.maximum(va+vb, 1e-100)
    return np.where((result<0) & (result>=-tolerance), 0, result)


def conditional_variance_upper(variances):
    """Model-conditional Var(sum D_f) upper, with no field independence claim."""
    if not variances:
        raise RuntimeError('sdss_noise_display_marginals_missing')
    values = np.stack(variances)
    with np.errstate(invalid='ignore'):
        return np.sqrt(values).sum(axis=0)**2


def filter_shared(values, eligible, difference):
    """One fixed 5x5 spatial/range sigma1 pass, common to signed gri values."""
    if (values.ndim != 3 or values.shape[0] != 3 or values.dtype.kind != 'f' or
            min(values.shape[1:]) <= 2*RADIUS or eligible.shape != values.shape[1:] or eligible.dtype != np.bool_):
        raise RuntimeError('sdss_noise_display_samples_invalid')
    if np.any(eligible & ~np.isfinite(values).all(axis=0)):
        raise RuntimeError('sdss_noise_display_eligibility_nonfinite')
    center = values[:, RADIUS:-RADIUS, RADIUS:-RADIUS].astype(np.float64)
    available = eligible[RADIUS:-RADIUS, RADIUS:-RADIUS]
    rows, columns = available.shape
    numerator = np.zeros_like(center)
    denominator = np.zeros(available.shape, dtype=np.float64)
    excluded = np.zeros(available.shape, dtype=np.uint16)
    for dy in range(-RADIUS, RADIUS+1):
        for dx in range(-RADIUS, RADIUS+1):
            neighbor = values[:, RADIUS+dy:RADIUS+dy+rows, RADIUS+dx:RADIUS+dx+columns].astype(np.float64)
            usable = available & eligible[RADIUS+dy:RADIUS+dy+rows, RADIUS+dx:RADIUS+dx+columns]
            if dy == dx == 0:
                distance = np.zeros(available.shape)
            else:
                variance = difference(dy, dx)
                if variance.shape != center.shape:
                    raise RuntimeError('sdss_noise_display_difference_shape_invalid')
                usable &= np.all(np.isfinite(variance) & (variance>0), axis=0)
                with np.errstate(divide='ignore', invalid='ignore', over='ignore'):
                    distance = ((neighbor-center)**2/variance).sum(axis=0)
            weight = np.where(usable, np.exp(-.5*(dy*dy+dx*dx+distance)), 0)
            numerator += np.where(usable[None], neighbor, 0)*weight[None]
            denominator += weight
            excluded += (~usable).astype(np.uint16)
    result = center.copy()
    used = available & (denominator>0)
    result[:, used] = numerator[:, used]/denominator[used]
    if not np.isfinite(result[:, available]).all():
        raise RuntimeError('sdss_noise_display_estimate_nonfinite')
    return result.astype(np.float32), {'centerProcessable': available,
        'weightSum': denominator, 'excludedNeighborCount': excluded}


def _field_name(identity):
    return '/'.join(str(identity[k]) for k in ('rerun', 'run', 'camcol', 'field'))


def _qualified_sources(master, sources):
    recipe = _qualified_science_pyramid(master)
    n = master.joint_available.shape[0]
    if master.mosaic_fields is None:
        expected = {BANDS[0]: master.bands[BANDS[0]].report['sourceReceipt']}
        name = _field_name(expected[BANDS[0]]['identity'])
        fields = {name: master.bands}
        weights = {name: master.joint_available.astype(np.float32)}
    else:
        fields, weights = master.mosaic_fields, master.mosaic_weights
        if weights is None or set(weights) != set(fields):
            raise RuntimeError('sdss_noise_display_weight_set_invalid')
    if set(sources) != set(fields):
        raise RuntimeError('sdss_noise_display_source_set_mismatch')
    receipts = master.bands[BANDS[0]].report.get('sourceReceipts')
    if receipts is None:
        receipts = [master.bands[BANDS[0]].report['sourceReceipt']]
    if set(fields) != {_field_name(r['identity']) for r in receipts}:
        raise RuntimeError('sdss_noise_display_master_source_set_mismatch')
    total = np.zeros((n, n), dtype=np.float64)
    for name, projected in fields.items():
        weight = weights[name]
        if (weight.shape != (n, n) or weight.dtype.kind != 'f' or
                not np.isfinite(weight).all() or (weight<0).any() or (weight>1).any() or
                set(projected) != set(BANDS) or set(sources[name]) != set(BANDS)):
            raise RuntimeError('sdss_noise_display_weights_invalid')
        total += weight
        for band in BANDS:
            source = sources[name][band]
            value = projected[band]
            if (value.data.shape != (n,n) or value.data.dtype != np.float32 or
                    value.footprint.shape != (n,n) or value.finite_neighbors.shape != (n,n) or
                    np.any((weight>0) & ~(value.footprint & value.finite_neighbors))):
                raise RuntimeError('sdss_noise_display_field_support_mismatch')
            identity = _identity(source.frame.receipt['identity'])
            if (_field_name(identity) != name or identity['band'] != band or
                    source.frame.receipt != projected[band].report['sourceReceipt']):
                raise RuntimeError('sdss_noise_display_frame_binding_mismatch')
            if source.camera is not None and source.camera.identity != tuple(identity[k] for k in IDENTITY_KEYS):
                raise RuntimeError('sdss_noise_display_camera_mismatch')
            if source.flags is not None:
                flag_identity = _identity(source.flags.receipt['expectedIdentity'])
                if flag_identity != identity or source.flags.flags.shape != source.frame.data.shape:
                    raise RuntimeError('sdss_noise_display_flags_mismatch')
                ps_id = source.frame.header.get('PS_ID')
                mask_ps_id = source.flags.receipt['actualPrimaryIdentity'].get('PS_ID')
                if ps_id is not None and mask_ps_id is not None and ps_id != mask_ps_id:
                    raise RuntimeError('sdss_noise_display_processing_mismatch')
    tolerance = np.finfo(np.float32).eps*len(fields)
    if (not np.array_equal(total>0, master.joint_available) or
            not np.allclose(total[master.joint_available], 1, rtol=0, atol=tolerance)):
        raise RuntimeError('sdss_noise_display_weight_coherence_mismatch')
    return recipe, fields, weights


def _project_field(source_set, projected, weight, region, ra, dec):
    ids, coefficients, native_variances, marginal_variances = [], [], [], []
    usable = np.ones(weight.shape, dtype=bool)
    active = weight>0
    for band in BANDS:
        source = source_set[band]
        frame = source.frame
        sx, sy = frame.wcs.all_world2pix(ra, dec, 0)
        sampled, geometry, finite = bilinear_source_samples(frame.data, sx, sy)
        if not np.array_equal(sampled[active], projected[band].data[region][active]):
            raise RuntimeError('sdss_noise_display_projected_science_mismatch')
        stencil = source_pixel_stencil(frame.data.shape, sx, sy)
        # SourceStencil indices contain only its in-geometry subset. Keep the
        # full target shape; absent source geometry never becomes a real ID.
        x0, y0 = np.full(sx.shape, -1, dtype=np.int64), np.full(sy.shape, -1, dtype=np.int64)
        x0[stencil.geometry], y0[stencil.geometry] = stencil.x0, stencil.y0
        fx, fy = np.where(stencil.geometry, sx-x0, 0), np.where(stencil.geometry, sy-y0, 0)
        x = np.stack([x0, x0+1, x0, x0+1])
        y = np.stack([y0, y0, y0+1, y0+1])
        coeff = np.stack([(1-fx)*(1-fy), fx*(1-fy), (1-fx)*fy, fx*fy])*weight[None]
        coeff = np.where(active[None], coeff, 0)
        if source.camera is None or frame.calibration_sky is None:
            native = np.where(active[None], np.full(x.shape, np.nan), 0)
            known = ~active
        else:
            noise = native_noise_samples(frame, source.camera, x, y)
            native = np.where(active[None], noise.variance_nmgy_squared, 0)
            known = (~active) | (geometry & finite & noise.available.all(axis=0))
        if source.flags is None or frame.header.get('PS_ID') is None or source.flags.receipt['actualPrimaryIdentity'].get('PS_ID') is None:
            quality = ~active
        else:
            flags = source.flags.stencil(sx, sy)
            quality = (~active) | (flags.geometry & ((flags.flags & REJECT_PROCESSING_BITS)==0))
        usable &= known & quality
        ids.append(y*frame.data.shape[1]+x)
        coefficients.append(coeff)
        native_variances.append(native)
        marginal_variances.append((coeff**2*native).sum(axis=0))
    return {'ids': np.stack(ids), 'weights': np.stack(coefficients),
        'native_variance': np.stack(native_variances), 'variance': np.stack(marginal_variances)}, usable


def _project_display_region(master,sources,fields,weights,region,check_cancelled):
    """One actual source/flags/coadd admission path for display consumers."""
    n=master.joint_available.shape[0]
    y,x=np.mgrid[region[0],region[1]]
    ra,dec=master.target.all_pix2world(x,n-1-y,0)
    values=np.stack([master.bands[band].data[region] for band in BANDS])
    eligible=master.joint_available[region].copy();stencils=[]
    reconstructed=np.zeros_like(values,dtype=np.float64)
    absolute_contributions=np.zeros_like(values,dtype=np.float64)
    for name,projected in fields.items():
        check_cancelled();weight=weights[name][region]
        if not weight.any():continue
        stencil,known=_project_field(sources[name],projected,weight,region,ra,dec)
        stencils.append(stencil);eligible &= known
        contribution=np.stack([np.where(weight>0,projected[b].data[region],0)*weight for b in BANDS]).astype(np.float64)
        reconstructed+=contribution;absolute_contributions+=np.abs(contribution)
    tolerance=(len(fields)+2)*np.finfo(np.float32).eps*absolute_contributions+len(fields)*np.finfo(np.float32).smallest_subnormal
    mismatch=np.abs(reconstructed-values.astype(np.float64))>tolerance
    if np.any(mismatch[:,master.joint_available[region]]):
        raise RuntimeError('sdss_noise_display_coadd_value_mismatch')
    return values,eligible,stencils


def _real_halo_regions(n,halo):
    """Each crop-perimeter target once, real full support, corners on top/bottom."""
    return [('top',(slice(-halo,2*halo),slice(-halo,n+halo)),(slice(0,halo),slice(0,n))),
      ('bottom',(slice(n-2*halo,n+halo),slice(-halo,n+halo)),(slice(n-halo,n),slice(0,n))),
      ('left',(slice(0,n),slice(-halo,2*halo)),(slice(halo,n-halo),slice(0,halo))),
      ('right',(slice(0,n),slice(n-2*halo,n+halo)),(slice(halo,n-halo),slice(n-halo,n)))]


def _project_real_source_window(master,sources,fields,weights,region,check_cancelled):
    """Same CCD geometry/coadd rule beyond crop, verify every cached overlap.

    Internal scientific arrays/weights are kept exactly. New outside values are
    actual admitted frame interpolations and never become published science.
    Caller has already passed _qualified_sources; cancellation checks are shared.
    """
    n=master.joint_available.shape[0];shape=(region[0].stop-region[0].start,region[1].stop-region[1].start)
    projected={};raw_weights={};total=np.zeros(shape,np.float64);numerator=np.zeros((3,*shape),np.float64)
    ys=slice(max(0,region[0].start),min(n,region[0].stop));xs=slice(max(0,region[1].start),min(n,region[1].stop))
    if ys.start>=ys.stop or xs.start>=xs.stop:raise RuntimeError('sdss_noise_halo_overlap_missing')
    overlap=(slice(ys.start-region[0].start,ys.stop-region[0].start),slice(xs.start-region[1].start,xs.stop-region[1].start))
    for name,old in fields.items():
        check_cancelled()
        current={b:project_frame_window(sources[name][b].frame,master.target,n,region,with_edge_distance=True) for b in BANDS}
        for b in BANDS:
            for key in ('data','footprint','finite_neighbors'):
                if not np.array_equal(getattr(current[b],key)[overlap],getattr(old[b],key)[ys,xs],equal_nan=True):
                    raise RuntimeError('sdss_noise_halo_projected_overlap_mismatch')
        if master.mosaic_fields is None:
            valid=np.logical_and.reduce([p.footprint&p.finite_neighbors for p in current.values()]);w=valid.astype(np.float32)
        else:w,valid=geometric_field_weight(current)
        total+=w
        for at,b in enumerate(BANDS):
            numerator[at]+=np.where(valid,current[b].data,0).astype(np.float64)*w
            current[b].edge_distance=None
        projected[name]=current;raw_weights[name]=w
    available=total>0;values=np.full((3,*shape),np.nan,np.float32)
    for at in range(3):values[at,available]=(numerator[at,available]/total[available]).astype(np.float32)
    if master.mosaic_fields is None:
        # Single masters retain independent-band samples even where another
        # band is absent. Common eligibility still forbids incomplete colour.
        only=next(iter(projected.values()))
        values=np.stack([only[b].data for b in BANDS])
    if not np.array_equal(available[overlap],master.joint_available[ys,xs]):
        raise RuntimeError('sdss_noise_halo_availability_overlap_mismatch')
    for at,b in enumerate(BANDS):
        if not np.array_equal(values[at][overlap],master.bands[b].data[ys,xs],equal_nan=True):
            raise RuntimeError('sdss_noise_halo_science_overlap_mismatch')
    y,x=np.mgrid[region[0],region[1]];ra,dec=master.target.all_pix2world(x,n-1-y,0)
    eligible=available.copy();stencils={};local=(slice(0,shape[0]),slice(0,shape[1]));active_names=[]
    for name,w in raw_weights.items():
        check_cancelled();np.divide(w,total,out=w,where=available)
        if not np.array_equal(w[overlap],weights[name][ys,xs]):
            raise RuntimeError('sdss_noise_halo_weight_overlap_mismatch')
        if not w.any():continue
        stencil,known=_project_field(sources[name],projected[name],w,local,ra,dec)
        stencils[name]=stencil;eligible &= known;active_names.append(name)
    # Display filtering uses exact original coadd in the cached overlap.
    report={'activeFields':active_names,'sourceAvailablePixels':int(available.sum()),
      'outsideCropAvailablePixels':int(available.sum()-available[overlap].sum()),'cachedOverlapExact':True}
    for value in (values,available,eligible,*raw_weights.values()):value.setflags(write=False)
    for current in projected.values():
        for band in current.values():
            for value in (band.data,band.footprint,band.finite_neighbors):value.setflags(write=False)
    for stencil in stencils.values():
        for value in stencil.values():value.setflags(write=False)
    return RealSourceWindow(values,available,eligible,projected,raw_weights,stencils,report)


def _project_real_halo_window(master,sources,fields,weights,region,check_cancelled):
    """Existing adaptive consumer retains its tuple and exact coadd contract."""
    window=_project_real_source_window(master,sources,fields,weights,region,check_cancelled)
    return window.values,window.eligible,list(window.stencils.values()),window.report


def render_noise_display_candidate(master: GriMaster, sources: dict, *, chunk_rows=32,
                                   cancelled: Callable[[], bool] | None = None,
                                   progress: Callable[[dict], None] | None = None) -> NoiseDisplayCandidate:
    """Single/mosaic/partial share one qualified coadd pass; real halo only.

    Caller owns admitted sources and raw master. Cancellation returns no partial
    candidate. Chunk edges use real parent samples; outer two rows/columns keep
    the original. No callback downloads, synthetic edge extension or retries.
    """
    if not isinstance(chunk_rows, int) or isinstance(chunk_rows, bool) or not 1 <= chunk_rows <= 256:
        raise RuntimeError('sdss_noise_display_chunk_rows_invalid')
    recipe, fields, weights = _qualified_sources(master, sources)
    n = master.joint_available.shape[0]
    estimates = {band: master.bands[band].data.copy() for band in BANDS}
    processable = np.zeros((n, n), dtype=bool)
    chunks, maximum_stencil_bytes = 0, 0
    def check_cancelled():
        if cancelled is not None and cancelled():
            raise RuntimeError('sdss_noise_display_cancelled')
    check_cancelled()
    for start in range(RADIUS, n-RADIUS, chunk_rows):
        check_cancelled()
        end = min(n-RADIUS, start+chunk_rows)
        region = (slice(start-RADIUS, end+RADIUS), slice(0, n))
        values,eligible,stencils=_project_display_region(master,sources,fields,weights,region,check_cancelled)
        if not stencils:
            continue
        def difference(dy, dx):
            return conditional_variance_upper([pair_difference_variance(s, dy, dx) for s in stencils])
        filtered, diagnostic = filter_shared(values, eligible, difference)
        check_cancelled()
        for at, band in enumerate(BANDS):
            estimates[band][start:end, RADIUS:n-RADIUS] = filtered[at]
        processable[start:end, RADIUS:n-RADIUS] = diagnostic['centerProcessable']
        chunks += 1
        stencil_bytes = sum(v.nbytes for s in stencils for v in s.values())
        maximum_stencil_bytes = max(maximum_stencil_bytes, stencil_bytes)
        if progress is not None:
            progress({'completedRows': end, 'masterRows': n, 'activeFields': len(stencils),
                'retainedStencilArrayBytes': stencil_bytes})
        del stencils
    check_cancelled()
    for band in BANDS:
        if not np.array_equal(estimates[band][~processable], master.bands[band].data[~processable], equal_nan=True):
            raise RuntimeError('sdss_noise_display_fallback_changed')
        estimates[band].setflags(write=False)
    processable.setflags(write=False)
    report = {'version': VERSION, 'scope': 'Explicit offline display estimates only, not science correction/publication/adoption',
        'sourceResolvedRecipe': copy.deepcopy(recipe), 'radius': RADIUS, 'spatialSigma': 1, 'rangeSigma': 1, 'passes': 1,
        'noiseModel': 'Conditional diagonal-native field difference models with shared-native covariance; Cauchy upper across unknown field covariance. Omitted sky/systematic/processing uncertainty is not bounded.',
        'qualification': 'All positive contributors, finite coherent gri, admitted camera/SKY and processing-associated fpM; reject bits0/1/8/9, not detection bits.',
        'processablePixels': int(processable.sum()), 'originalKeptPixels': int((~processable).sum()),
        'chunks': chunks, 'maximumRetainedStencilArrayBytes': maximum_stencil_bytes,
        'resourceMeaning': 'Owned stencil arrays only, excludes caller sources/master/output, sampling temporaries, library allocations and process RSS.',
        'sourceScienceCOrderSha256': {b:digest(master.bands[b].data.astype('<f4',copy=False).tobytes()) for b in BANDS},
        'sourceAvailabilityCOrderSha256': digest(master.joint_available.tobytes()),
        'displayEstimatesCOrderSha256': {b:digest(estimates[b].astype('<f4',copy=False).tobytes()) for b in BANDS},
        'quality': 'UNVERIFIED', 'independentReview': 'MISSING', 'adopted': False}
    return NoiseDisplayCandidate(estimates, processable, report)


def noise_display_pyramid(master, candidate, entry, *, output_pixels=512):
    """Frozen map of display-estimate means, never relabelled scientific means."""
    recipe = _qualified_science_pyramid(master)
    n = master.joint_available.shape[0]
    if (candidate.report.get('version')!=VERSION or candidate.report.get('sourceResolvedRecipe')!=recipe or
            set(candidate.estimates)!=set(BANDS) or candidate.processable.shape!=(n,n) or
            candidate.processable.dtype!=np.bool_ or np.any(candidate.processable & ~master.joint_available)):
        raise RuntimeError('sdss_noise_display_candidate_binding_invalid')
    if (not isinstance(output_pixels,int) or isinstance(output_pixels,bool) or output_pixels<1 or
            n<output_pixels*4 or n%(output_pixels*4)):
        raise RuntimeError('sdss_noise_display_level_geometry_invalid')
    field = master.report['fieldDegrees']
    if dict(master.target.to_header())!=dict(target_tan(entry['center'],n,field).to_header()):
        raise RuntimeError('sdss_noise_display_master_geometry_mismatch')
    if digest(master.joint_available.tobytes())!=candidate.report['sourceAvailabilityCOrderSha256']:
        raise RuntimeError('sdss_noise_display_source_changed')
    for band in BANDS:
        value = candidate.estimates[band]
        if (value.shape!=(n,n) or value.dtype!=np.float32 or
                digest(master.bands[band].data.astype('<f4',copy=False).tobytes())!=candidate.report['sourceScienceCOrderSha256'][band] or
                digest(value.astype('<f4',copy=False).tobytes())!=candidate.report['displayEstimatesCOrderSha256'][band]):
            raise RuntimeError('sdss_noise_display_source_changed')
    return _display_estimate_products(master,candidate.estimates,entry,output_pixels,VERSION)


def _display_estimate_products(master, estimates, entry, output_pixels, processing_version):
    """Shared numeric display-estimate levels; consumers own policy admission."""
    recipe = _qualified_science_pyramid(master)
    n = master.joint_available.shape[0]
    field = master.report['fieldDegrees']
    if (not isinstance(output_pixels,int) or isinstance(output_pixels,bool) or output_pixels<1 or
            n<output_pixels*4 or n%(output_pixels*4)):
        raise RuntimeError('sdss_noise_display_level_geometry_invalid')
    if dict(master.target.to_header())!=dict(target_tan(entry['center'],n,field).to_header()):
        raise RuntimeError('sdss_noise_display_master_geometry_mismatch')
    if (set(estimates)!=set(BANDS) or any(v.shape!=(n,n) or v.dtype!=np.float32 or
            not np.isfinite(v[master.joint_available]).all() for v in estimates.values())):
        raise RuntimeError('sdss_noise_display_estimate_shape_invalid')
    products = {}
    for at,level in enumerate(LEVELS):
        extent = n//2**at;start = (n-extent)//2;crop = (slice(start,start+extent),slice(start,start+extent))
        factor = extent//output_pixels;joint = master.joint_available[crop]
        means,counts = coherent_box_means({b:estimates[b][crop] for b in BANDS},joint,factor)
        available = counts>0
        bands = {b:ProjectedBand(means[b].astype(np.float32),available,available,{}) for b in BANDS}
        if available.any():
            rgb,_ = make_rgb_display(bands,available,transfer=FixedDisplayTransfer(stretch=recipe['stretch'],Q=recipe['Q']))
        else:rgb = np.zeros((*counts.shape,3),dtype=np.uint8)
        alpha = np.rint(counts.astype(np.float64)*255/(factor*factor)).astype(np.uint8)
        buffer = io.BytesIO();Image.fromarray(np.dstack([rgb,alpha])).save(buffer,format='PNG')
        payload = buffer.getvalue();exact_field = math.degrees(2*math.atan(math.tan(math.radians(field)/2)*extent/n))
        products[level] = (payload, {'pixels':output_pixels,'fieldDegrees':exact_field,'bytes':len(payload),'sha256':digest(payload),
            'wcsHeader':dict(target_tan(entry['center'],output_pixels,exact_field).to_header()),
            'crop':{'boundsXYExclusive':[start,start,start+extent,start+extent],'boxFactor':factor},
            'sampleMeaning':'Means of display-only estimates in source nMgy/native-pixel units; not new scientific measurements or photometry.',
            'displayAlpha':'Original coherent sample area fraction; processing qualification never changes availability.',
            'emptyPixels':int((~available).sum()),'partialPixels':int(((counts>0)&(counts<factor*factor)).sum()),
            'sourceResolvedRecipe':copy.deepcopy(recipe),'statisticalFitCalls':0,'processingVersion':processing_version})
    return products


def save_noise_display_candidate(output: Path, master, candidate, entry, *, output_pixels=512):
    """Exclusive explicit candidate serializer; old publisher/default not used."""
    products = noise_display_pyramid(master,candidate,entry,output_pixels=output_pixels)
    output.mkdir(parents=True,exist_ok=False)
    arrays = {b:_save_array(output/f'{b}-display-estimates.npy',candidate.estimates[b]) for b in BANDS}
    arrays['processable'] = _save_array(output/'processable.npy',candidate.processable)
    levels = {}
    for level,(payload,metadata) in products.items():
        filename = f'{entry["objectRef"].replace(":","-")}-{level.lower()}.png'
        (output/filename).write_bytes(payload);levels[level] = metadata | {'file':filename}
    report = copy.deepcopy(candidate.report) | {'arrays':arrays,'levels':levels,
        'objectRef':entry['objectRef'],'center':entry['center'],'orientation':'north-up/east-left',
        'originalScience':'Referenced by C-order hashes; caller source arrays remain unchanged and are not overwritten or republished.'}
    write_report(output/'candidate.json',report)
    return report
