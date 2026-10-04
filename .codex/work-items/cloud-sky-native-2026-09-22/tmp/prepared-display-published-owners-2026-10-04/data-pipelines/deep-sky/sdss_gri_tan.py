"""Offline SDSS gri TAN single-field and mosaic candidates; no publication.

Scientific arrays and sample availability are independent of RGB/alpha. The
corrected-frame reader owns source admission and its linear-WCS limitations.
"""
from __future__ import annotations

from dataclasses import dataclass
import copy
import io
import math
from pathlib import Path

import numpy as np
import astropy
from astropy.wcs import WCS
from astropy.visualization import ManualInterval, LuptonAsinhStretch, LuptonAsinhZscaleStretch, ZScaleInterval, make_lupton_rgb
from PIL import Image

from image_quality import digest, inspect_image, number, write_report
from sdss_corrected_frame import CorrectedFrame, _identity
from sdss_source_stencil import bilinear_source_samples

VERSION = "sdss-single-field-gri-tan-candidate-v1"
MOSAIC_VERSION = "sdss-multi-field-gri-tan-candidate-v1"
SCIENCE_PYRAMID_VERSION = "sdss-signed-science-pyramid-candidate-v1"
SCIENCE_PYRAMID_KIND = "signed-coherent-science-mean-before-fixed-lupton-v1"
BANDS = ("g", "r", "i")
LEVELS = ("OVERVIEW", "MEDIUM", "DETAIL")
# Legacy default descriptor retained for the original task's library pin.
# Actual candidate/QC evidence comes only from make_rgb_display's recipe.
TRANSFER = {"method": "Astropy make_lupton_rgb", "version": "8.0.1",
            "rgbBands": ["i", "r", "g"], "intervalMinimum": 0, "stretch": 5, "Q": 8,
            "selection": "Astropy documented default parameters, fixed once for the entire RGB master; not a quality or natural-color pass."}


@dataclass(frozen=True)
class FixedDisplayTransfer:
    stretch: float = 5
    Q: float = 8


@dataclass(frozen=True)
class WholeMasterZscaleTransfer:
    Q: float = 8


DisplayTransfer = FixedDisplayTransfer | WholeMasterZscaleTransfer


@dataclass
class ProjectedBand:
    data: np.ndarray
    footprint: np.ndarray
    finite_neighbors: np.ndarray
    report: dict
    edge_distance: np.ndarray | None = None


@dataclass
class BandSourceUnion:
    """Independent source supply, with no aggregate color-coadd measurement.

    Measurements belong to the per-field ProjectedBands. These masks cannot
    be substituted for a coadd ProjectedBand's finite-data qualification.
    """
    footprint: np.ndarray
    finite_neighbors: np.ndarray


@dataclass
class GriMaster:
    target: WCS
    bands: dict[str, ProjectedBand]
    joint_available: np.ndarray
    rgb: np.ndarray
    report: dict
    mosaic_fields: dict[str, dict[str, ProjectedBand]] | None = None
    mosaic_weights: dict[str, np.ndarray] | None = None
    contributor_count: np.ndarray | None = None
    independent_band_unions: dict[str, BandSourceUnion] | None = None


def target_tan(center: dict, pixels: int, field_degrees: float) -> WCS:
    if (center.get("frame") != "ICRS J2000" or not number(center.get("raDeg")) or
            not 0 <= center["raDeg"] < 360 or not number(center.get("decDeg")) or
            not -90 <= center["decDeg"] <= 90 or not isinstance(pixels, int) or isinstance(pixels, bool) or
            pixels <= 0 or pixels > 4096 or not number(field_degrees) or not 0 < field_degrees <= 4):
        raise RuntimeError("sdss_tan_target_invalid")
    target = WCS(naxis=2)
    target.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    target.wcs.cunit = ["deg", "deg"]
    target.wcs.radesys = "ICRS"
    target.wcs.crval = [center["raDeg"], center["decDeg"]]
    target.wcs.crpix = [(pixels + 1) / 2, (pixels + 1) / 2]
    step = math.degrees(2 * math.tan(math.radians(field_degrees) / 2) / pixels)
    target.wcs.cdelt = [-step, step]
    return target


def bilinear_samples(source: np.ndarray, x: np.ndarray, y: np.ndarray):
    """Require all four finite neighbors, even at a zero-weight boundary.

    Footprint means the interpolation stencil is wholly inside the supplied
    frame. An unavailable neighboring source sample never becomes a zero flux.
    """
    if source.ndim != 2 or source.dtype.kind != "f" or x.shape != y.shape:
        raise RuntimeError("sdss_tan_sampling_shape_invalid")
    try:
        return bilinear_source_samples(source, x, y)
    except RuntimeError as error:
        if str(error) == "source_bilinear_finite_interpolation_overflow":
            raise RuntimeError("sdss_tan_finite_interpolation_overflow") from error
        raise


def project_frame_window(frame: CorrectedFrame,target: WCS,pixels: int,region: tuple[slice,slice],*,with_edge_distance=False):
    """Actual native samples at original target coordinates, including outside crop.

    Negative/beyond-crop target coordinates are valid WCS queries, never mirror,
    wrap or zero-padding. Missing source stencil remains missing. Saved target
    rows still reverse FITS y using the original master size.
    """
    if frame.wcs.wcs.radesys!='ICRS' or target.wcs.radesys!='ICRS':
        raise RuntimeError('sdss_tan_reference_frame_unsupported')
    if (not isinstance(pixels,int) or isinstance(pixels,bool) or pixels<1 or len(region)!=2 or
      any(not isinstance(s,slice) or not isinstance(s.start,int) or not isinstance(s.stop,int) or
          s.start>=s.stop or s.step not in (None,1) for s in region)):
        raise RuntimeError('sdss_tan_window_invalid')
    y,x=np.mgrid[region[0],region[1]]
    ra,dec=target.all_pix2world(x,pixels-1-y,0)
    sx,sy=frame.wcs.all_world2pix(ra,dec,0)
    data,footprint,finite=bilinear_samples(frame.data,sx,sy)
    edge=None
    if with_edge_distance:
        rows,columns=frame.data.shape
        distance=np.minimum.reduce([sx,sy,columns-1-sx,rows-1-sy])
        edge=np.where(finite,np.maximum(distance,0),0).astype(np.float32)
    return ProjectedBand(data,footprint,finite,{'sourceReceipt':frame.receipt},edge)


def geometric_field_weight(projected):
    """Shared common-gri preference from physical source CCD edges only."""
    if set(projected)!=set(BANDS) or any(p.edge_distance is None for p in projected.values()):
        raise RuntimeError('sdss_mosaic_edge_distance_missing')
    joint=np.logical_and.reduce([projected[b].footprint&projected[b].finite_neighbors for b in BANDS])
    distance=np.minimum.reduce([projected[b].edge_distance for b in BANDS])
    return np.where(joint,distance+1,0).astype(np.float32),joint


def reproject_band(frame: CorrectedFrame, target: WCS, pixels: int, *, chunk_rows: int = 128,
                   with_edge_distance: bool = False) -> ProjectedBand:
    if not isinstance(chunk_rows, int) or isinstance(chunk_rows, bool) or not 1 <= chunk_rows <= 256:
        raise RuntimeError("sdss_tan_chunk_rows_invalid")
    if frame.wcs.wcs.radesys != "ICRS" or target.wcs.radesys != "ICRS":
        raise RuntimeError("sdss_tan_reference_frame_unsupported")
    data = np.full((pixels, pixels), np.nan, dtype=np.float32)
    footprint = np.zeros((pixels, pixels), dtype=np.bool_)
    finite_neighbors = np.zeros((pixels, pixels), dtype=np.bool_)
    edge_distance = np.zeros((pixels, pixels), dtype=np.float32) if with_edge_distance else None
    for start in range(0, pixels, chunk_rows):
        end = min(pixels, start + chunk_rows)
        window=project_frame_window(frame,target,pixels,(slice(start,end),slice(0,pixels)),with_edge_distance=with_edge_distance)
        data[start:end], footprint[start:end], finite_neighbors[start:end] = window.data,window.footprint,window.finite_neighbors
        if edge_distance is not None:
            edge_distance[start:end] = window.edge_distance
    available = footprint & finite_neighbors
    counts = {"totalPixels": pixels * pixels, "footprintPixels": int(footprint.sum()),
              "outsideFrameStencilPixels": int((~footprint).sum()),
              "inFootprintNonfiniteNeighborPixels": int((footprint & ~finite_neighbors).sum()),
              "availablePixels": int(available.sum()),
              "availableZeroPixels": int((available & (data == 0)).sum()),
              "availableNegativePixels": int((available & (data < 0)).sum())}
    report = {"sourceReceipt": frame.receipt, "sampling": "bilinear; all four neighboring source samples required finite",
              "resampling": "display reprojection of calibrated nanomaggies/pixel; not flux-conserving aperture photometry",
              "rowOrder": "north/top first, reverse of target FITS y rows", "counts": counts,
              "sampleAvailability": "ACTUAL_FRAME_STENCIL_AND_FINITE_NEIGHBORS",
              "scientificValidity": "UNKNOWN", "artifactMask": "NOT_SUPPLIED"}
    return ProjectedBand(data, footprint, finite_neighbors, report, edge_distance)


def _whole_master_zscale_samples(bands: dict[str, ProjectedBand], joint: np.ndarray):
    """One sample/receipt definition for original fitting and frozen admission."""
    intensity = (bands['i'].data.astype(np.float64) + bands['r'].data.astype(np.float64) + bands['g'].data.astype(np.float64)) / 3
    intensity[~joint] = np.nan
    finite_indices = np.flatnonzero(joint.ravel())
    values = intensity[joint]
    if not values.size or not np.isfinite(values).all() or values.min() == values.max():
        raise RuntimeError('sdss_display_zscale_degenerate')
    interval = ZScaleInterval()
    stride = int(max(1.0, values.size / interval.n_samples))
    samples = values[::stride][:interval.n_samples]
    if samples.min() == samples.max():
        raise RuntimeError('sdss_display_zscale_degenerate')
    receipt = {'method':'Astropy ZScaleInterval through LuptonAsinhZscaleStretch',
        'scope':'all coherent master samples; never individual crop/level',
        'intensity':'float64 arithmetic mean of i/r/g; no pedestal or background subtraction',
        'excludedIncoherentPixels':int((~joint).sum()),'finiteIntensitySamples':int(values.size),
        'negativeIntensitySamples':int((values<0).sum()),'zeroIntensitySamples':int((values==0).sum()),
        'nSamples':interval.n_samples,'contrast':interval.contrast,'maxReject':interval.max_reject,
        'minNpixels':interval.min_npixels,'krej':interval.krej,'maxIterations':interval.max_iterations,
        'deterministicRasterStride':stride,'actualStatisticalSamples':int(samples.size),
        'actualSampleNegativeCount':int((samples<0).sum()),'actualSampleZeroCount':int((samples==0).sum()),
        'sampleFloat64Sha256':digest(samples.astype('<f8').tobytes()),
        'sampleRasterIndicesInt64Sha256':digest(finite_indices[::stride][:interval.n_samples].astype('<i8').tobytes()),
        'libraryFitCalls':1,'derivedStretch':'library z2 - z1, not a fitted black level'}
    return intensity, samples, receipt


def make_rgb_display(bands: dict[str, ProjectedBand], joint: np.ndarray, *,
                     transfer: DisplayTransfer = FixedDisplayTransfer()) -> tuple[np.ndarray, dict]:
    """One shared display transfer, with actual recipe, before any level crop.

    Coherent science eligibility is supplied by the science owner. Statistics
    never invent eligibility and display clipping never changes science data.
    """
    if (not isinstance(transfer, (FixedDisplayTransfer, WholeMasterZscaleTransfer)) or
            not number(transfer.Q) or transfer.Q <= 0 or transfer.Q > 1e10 or
            isinstance(transfer, FixedDisplayTransfer) and (not number(transfer.stretch) or transfer.stretch <= 0)):
        raise RuntimeError('sdss_display_transfer_invalid')
    if (not isinstance(joint,np.ndarray) or joint.dtype!=np.bool_ or joint.ndim!=2 or
            set(bands)!=set(BANDS) or any(value.data.shape!=joint.shape or value.data.dtype.kind!='f' for value in bands.values())):
        raise RuntimeError('sdss_display_science_shape_invalid')
    if not joint.any():
        raise RuntimeError('sdss_display_coherent_unavailable')
    if any(not np.isfinite(value.data[joint]).all() for value in bands.values()):
        raise RuntimeError('sdss_display_coherent_nonfinite')
    # Array filling is only input sanitation for the *display* transform.
    # It is never input to the whole-master statistical fit.
    display = {band: np.where(joint, bands[band].data, 0).astype(np.float32) for band in BANDS}
    with np.errstate(over='ignore',invalid='ignore'):
        mapped_intensity = (display['i'] + display['r'] + display['g']) / 3
    if not np.isfinite(mapped_intensity[joint]).all():
        raise RuntimeError('sdss_display_intensity_overflow')
    recipe = {'method':'Astropy make_lupton_rgb','version':astropy.__version__,
              'rgbBands':['i','r','g'],'intervalMinimum':0,
              'scope':'one complete coherent science master before any level crop',
              'availableSciencePixels':int(joint.sum()),'totalMasterPixels':int(joint.size),
              'scienceCorrection':'NONE; calibrated samples/eligibility unchanged',
              'displayClipping':'nonpositive intensity/negative channels clip only in display; never science absence'}
    arguments = {}
    if isinstance(transfer,FixedDisplayTransfer):
        stretch = LuptonAsinhStretch(stretch=transfer.stretch,Q=transfer.Q)
        arguments = {'stretch_object':stretch}
        recipe.update({'kind':'fixed','stretchClass':'LuptonAsinhStretch',
                       'stretch':float(stretch.stretch),'Q':float(stretch.Q),
                       'requestedParameters':{'stretch':transfer.stretch,'Q':transfer.Q},'statisticalFit':None})
    else:
        # Match LuptonAsinhZscaleStretch's float64 common-intensity semantics.
        # NaN outside coherent support is excluded by the library, unlike a
        # zero-filled black sky which would contaminate statistical exposure.
        intensity, _, fit_receipt = _whole_master_zscale_samples(bands, joint)
        try:
            stretch = LuptonAsinhZscaleStretch(intensity,Q=transfer.Q,pedestal=None)
        except (ValueError,ZeroDivisionError) as error:
            raise RuntimeError('sdss_display_zscale_degenerate') from error
        if not number(stretch.stretch) or stretch.stretch<=0:
            raise RuntimeError('sdss_display_zscale_degenerate')
        arguments = {'stretch_object':stretch}
        recipe.update({'kind':'whole-master-zscale','stretchClass':'LuptonAsinhZscaleStretch',
            'stretch':float(stretch.stretch),'Q':float(stretch.Q),
            'requestedParameters':{'Q':transfer.Q},
            'statisticalFit':fit_receipt})
    with np.errstate(invalid="ignore", divide="ignore"):
        rgb = make_lupton_rgb(display["i"], display["r"], display["g"],
            interval=ManualInterval(vmin=0, vmax=None), **arguments,
            output_dtype=np.uint8)
    rgb[~joint] = 0
    return rgb, recipe


def build_master(frames: list[CorrectedFrame], entry: dict, pixels: int, field_degrees: float, *,
                 chunk_rows: int = 128, display_transfer: DisplayTransfer = FixedDisplayTransfer()) -> GriMaster:
    if len(frames) != 3 or {frame.receipt["identity"]["band"] for frame in frames} != set(BANDS):
        raise RuntimeError("sdss_tan_band_set_incomplete")
    identities = [frame.receipt["identity"] for frame in frames]
    if len({tuple(identity[key] for key in ("run", "rerun", "camcol", "field")) for identity in identities}) != 1:
        raise RuntimeError("sdss_tan_one_field_identity_mismatch")
    for frame in frames:
        science = frame.receipt["scientificSamples"]
        if (science["unit"] != "nanomaggies/pixel" or science["calibrationAlreadyApplied"] is not True or
                science["skyAlreadySubtracted"] is not True or
                frame.receipt["decompressed"]["completeScientificArrays"] is not True):
            raise RuntimeError("sdss_tan_source_admission_invalid")
    target = target_tan(entry["center"], pixels, field_degrees)
    bands = {frame.receipt["identity"]["band"]:
             reproject_band(frame, target, pixels, chunk_rows=chunk_rows) for frame in frames}
    joint = np.logical_and.reduce([bands[band].footprint & bands[band].finite_neighbors for band in BANDS])
    if not joint.any():
        raise RuntimeError("sdss_tan_joint_display_unavailable")
    rgb, transfer = make_rgb_display(bands, joint, transfer=display_transfer)
    report = {"version": VERSION, "scope": "Offline single-field candidate, not immutable publication or runtime acceptance",
              "objectRef": entry["objectRef"], "center": entry["center"], "orientation": "north-up/east-left",
              "pixels": pixels, "fieldDegrees": field_degrees, "wcsHeader": dict(target.to_header()),
              "science": {"perBand": {band: bands[band].report for band in BANDS},
                          "jointAvailablePixels": int(joint.sum()), "jointUnavailablePixels": int((~joint).sum()),
                          "jointAvailableFraction": float(joint.mean()),
                          "fullTargetFieldAvailable": bool(joint.all()), "scientificValidity": "UNKNOWN",
                          "meaning": "Complete acquired arrays do not establish complete target footprint, artifact-free data, depth or confidence."},
              "display": {"transfer": transfer, "sourceMaster": "one float science master and one shared RGB transfer before all crops",
                          "alpha": "joint actual sample availability only; no brightness-derived mask or background-opacity choice"},
              "limitations": ["Single field only; outside footprint remains unavailable without mosaic/inpainting.",
                              "Source primary-header linear TAN approximation only; retained asTrans polynomial/DCR solution is not applied.",
                              "Bilinear reprojection is not flux conserving; RGB is historical display, not photometry or natural true color.",
                              "Selected shared Lupton transfer is not adopted quality; saturation, faint extent and color remain to review."]}
    return GriMaster(target, bands, joint, rgb, report)


def build_mosaic_master(frames: list[CorrectedFrame], entry: dict, pixels: int, field_degrees: float, *,
                        chunk_rows: int = 128, require_complete: bool = False,
                        display_transfer: DisplayTransfer = FixedDisplayTransfer()) -> GriMaster:
    """Co-add calibrated flux using one geometric weight per complete gri field.

    Independent per-band source measurements remain in field sidecars. A field
    contributes RGB only where all three actual stencils are finite. Weights
    are not brightness masks, confidence, noise weights or background offsets.
    """
    groups = {}
    for frame in frames:
        identity = frame.receipt['identity']
        group_key = (int(identity['rerun']), identity['run'], identity['camcol'], identity['field'])
        band = identity['band']
        group = groups.setdefault(group_key, {})
        if band not in BANDS or band in group:
            raise RuntimeError('sdss_mosaic_duplicate_frame_identity')
        group[band] = frame
        science = frame.receipt['scientificSamples']
        if (science['unit'] != 'nanomaggies/pixel' or science['calibrationAlreadyApplied'] is not True or
                science['skyAlreadySubtracted'] is not True or frame.receipt['decompressed']['completeScientificArrays'] is not True):
            raise RuntimeError('sdss_tan_source_admission_invalid')
    if not groups or any(set(group) != set(BANDS) for group in groups.values()):
        raise RuntimeError('sdss_mosaic_field_band_set_incomplete')
    target = target_tan(entry['center'], pixels, field_degrees)
    projected_fields, weights, field_reports = {}, {}, []
    weight_sum = np.zeros((pixels,pixels), dtype=np.float64)
    numerators = {band:np.zeros((pixels,pixels),dtype=np.float64) for band in BANDS}
    contributors = np.zeros((pixels,pixels), dtype=np.uint32)
    for group_key, group in sorted(groups.items()):
        name = '/'.join(str(value) for value in group_key)
        projected = {band:reproject_band(group[band],target,pixels,chunk_rows=chunk_rows,with_edge_distance=True) for band in BANDS}
        raw_weight,joint_field=geometric_field_weight(projected)
        weight_sum += raw_weight
        contributors += joint_field.astype(np.uint32)
        for band in BANDS:
            numerators[band][joint_field] += projected[band].data[joint_field].astype(np.float64) * raw_weight[joint_field]
            # Only the common weight is retained. Holding all three full edge
            # distance arrays would add memory without an independent meaning.
            projected[band].edge_distance = None
        projected_fields[name], weights[name] = projected, raw_weight
        field_reports.append({'fieldKey':name,'identity':{key:group[BANDS[0]].receipt['identity'][key] for key in ('rerun','run','camcol','field')},
                              'jointAvailablePixels':int(joint_field.sum()),'perBand':{band:projected[band].report for band in BANDS}})
    joint = weight_sum > 0
    if not joint.any():
        raise RuntimeError('sdss_tan_joint_display_unavailable')
    if require_complete and not joint.all():
        raise RuntimeError('sdss_mosaic_target_incomplete')
    for value in weights.values():
        np.divide(value, weight_sum, out=value, where=joint)
    bands, independent_unions = {}, {}
    coherent_geometry = np.logical_or.reduce([
        np.logical_and.reduce([field[band].footprint for band in BANDS])
        for field in projected_fields.values()])
    for band in BANDS:
        geometric_union = np.logical_or.reduce([field[band].footprint for field in projected_fields.values()])
        finite_union = np.logical_or.reduce([field[band].finite_neighbors for field in projected_fields.values()])
        independent_unions[band] = BandSourceUnion(geometric_union, finite_union)
        data = np.full((pixels,pixels),np.nan,dtype=np.float32)
        data[joint] = (numerators[band][joint] / weight_sum[joint]).astype(np.float32)
        if not np.isfinite(data[joint]).all():
            raise RuntimeError('sdss_mosaic_finite_coadd_overflow')
        report = {'sourceReceipts':[field[band].report['sourceReceipt'] for field in projected_fields.values()],
                  'sampling':'each field independently bilinear with all four finite neighbors; common field-gri weights',
                  'rowOrder':'north/top first, reverse of target FITS y rows',
                  'resampling':'calibrated nanomaggies/pixel display coadd, not flux-conserving aperture photometry',
                  'counts':{'totalPixels':pixels*pixels,'footprintPixels':int(coherent_geometry.sum()),
                            'inFootprintNonfiniteNeighborPixels':int((coherent_geometry & ~joint).sum()),
                            'availablePixels':int(joint.sum()),
                            'independentBandFootprintPixels':int(geometric_union.sum()),
                            'independentBandAvailablePixels':int(finite_union.sum()),'coherentDataPixels':int(joint.sum()),
                            'coherentAvailableZeroPixels':int((joint & (data==0)).sum()),
                            'coherentAvailableNegativePixels':int((joint & (data<0)).sum())},
                  'dataMeaning':'common-field coherent gri science coadd; NaN outside coherent support, independent known band measurements preserved in field sidecars',
                  'sampleAvailability':'COHERENT_SAME_FIELD_GRI_COADD_DATA; independent source unions are a separate no-data API',
                  'scientificValidity':'UNKNOWN','artifactMask':'NOT_SUPPLIED'}
        bands[band] = ProjectedBand(data,coherent_geometry,joint,report)
    rgb, transfer = make_rgb_display(bands,joint,transfer=display_transfer)
    report = {'version':MOSAIC_VERSION,'scope':'Offline multi-field display coadd candidate, not publication/runtime/quality acceptance',
              'objectRef':entry['objectRef'],'center':entry['center'],'orientation':'north-up/east-left',
              'pixels':pixels,'fieldDegrees':field_degrees,'wcsHeader':dict(target.to_header()),
              'science':{'perBand':{band:bands[band].report for band in BANDS},
                         'jointAvailablePixels':int(joint.sum()),'jointUnavailablePixels':int((~joint).sum()),
                         'jointAvailableFraction':float(joint.mean()),'fullTargetFieldAvailable':bool(joint.all()),
                         'scientificValidity':'UNKNOWN','meaning':'Independent band unions and complete same-field gri color support are separately measured; finite data do not certify artifact-free science'},
              'mosaic':{'fieldCount':len(groups),'fields':field_reports,
                        'overlapRule':'normalized common-field weight = min(g/r/i distance to source stencil boundary) + 1; zero only outside common finite support',
                        'weightMeaning':'geometric interpolation preference, not confidence/PSF/noise/exposure or display-alpha masking',
                        'backgroundCorrections':'NONE; corrected-frame sky/calibration already applied, no second subtraction',
                        'inputOrder':'stable numeric rerun/run/camcol/field order',
                        'singleContributorPixels':int((contributors==1).sum()),'overlapPixels':int((contributors>1).sum()),
                        'maximumContributors':int(contributors.max()),'coherentCoverageRequired':require_complete},
              'display':{'transfer':transfer,'sourceMaster':'one coherent science coadd and one shared RGB transfer before all crops',
                         'alpha':'joint coherent sample availability only; independent display-contribution alternative remains separate'},
              'limitations':['Actual primary-header linear TAN only; asTrans polynomial/DCR retained but not applied.',
                             'Coadd weights do not estimate PSF/noise or match background; cross-run residuals, color and seams require actual review.',
                             'Finite sampling and full finite target grid do not certify source artifacts, depth, astrometry or quality.',
                             'Bilinear display resampling is not flux-conserving photometry; selected shared Lupton color/exposure is not adopted quality.']}
    return GriMaster(target,bands,joint,rgb,report,projected_fields,weights,contributors,independent_unions)


def encoded_contribution_rgba(rgb: np.ndarray, availability: np.ndarray) -> np.ndarray:
    """Display-encoded contribution decomposition, not linear radiance.

    Science availability remains independent: an available pure black sample
    has no display contribution in this alternative, without becoming missing.
    """
    if rgb.dtype != np.uint8 or rgb.shape != (*availability.shape, 3) or availability.dtype != np.bool_:
        raise RuntimeError("sdss_tan_display_decomposition_shape_invalid")
    maximum = rgb.max(axis=2)
    alpha = maximum * availability.astype(np.uint8)
    straight = np.zeros(rgb.shape, dtype=np.float64)
    np.divide(rgb.astype(np.float64) * 255, maximum[..., None], out=straight, where=maximum[..., None] > 0)
    straight[~availability] = 0
    return np.dstack([np.rint(straight).astype(np.uint8), alpha])


def premultiplied_rgba_box(rgba: np.ndarray, factor: int) -> np.ndarray:
    """Exact integer box filter of premultiplied display values and alpha."""
    n = rgba.shape[0]
    if (rgba.shape != (n, n, 4) or rgba.dtype != np.uint8 or
            not isinstance(factor, int) or isinstance(factor, bool) or factor <= 0 or n % factor):
        raise RuntimeError("sdss_tan_pyramid_shape_invalid")
    size = n // factor
    if factor == 1:
        return np.array(rgba, copy=True)
    a = rgba[:, :, 3].reshape(size, factor, size, factor).sum(axis=(1, 3), dtype=np.uint64)
    premult = rgba[:, :, :3].astype(np.uint32) * rgba[:, :, 3:4]
    sums = premult.reshape(size, factor, size, factor, 3).sum(axis=(1, 3), dtype=np.uint64)
    mean = np.zeros((size, size, 3), dtype=np.float64)
    np.divide(sums, a[..., None], out=mean, where=a[..., None] > 0)
    color = np.rint(mean).astype(np.uint8)
    alpha = np.rint(a.astype(np.float64) / (factor * factor)).astype(np.uint8)
    return np.dstack([color, alpha])


def premultiplied_box(rgb: np.ndarray, availability: np.ndarray, factor: int) -> np.ndarray:
    if availability.dtype != np.bool_ or rgb.shape != (*availability.shape, 3):
        raise RuntimeError("sdss_tan_pyramid_shape_invalid")
    return premultiplied_rgba_box(np.dstack([rgb, availability.astype(np.uint8) * 255]), factor)


def pyramid(master: GriMaster, entry: dict, *, output_pixels: int = 512,
            display_rgba: np.ndarray | None = None) -> dict[str, tuple[bytes, dict]]:
    n = master.joint_available.shape[0]
    if (not isinstance(output_pixels, int) or isinstance(output_pixels, bool) or output_pixels <= 0 or
            n < output_pixels * 4 or n % (output_pixels * 4)):
        raise RuntimeError("sdss_tan_three_levels_require_integer_crops")
    field = master.report["fieldDegrees"]
    products = {}
    for index, level in enumerate(LEVELS):
        extent = n // (2 ** index)
        start, end = (n - extent) // 2, (n + extent) // 2
        factor = extent // output_pixels
        crop = (slice(start, end), slice(start, end))
        rgba = (premultiplied_box(master.rgb[crop], master.joint_available[crop], factor) if display_rgba is None
                else premultiplied_rgba_box(display_rgba[crop], factor))
        buffer = io.BytesIO()
        Image.fromarray(rgba).save(buffer, format="PNG")
        payload = buffer.getvalue()
        exact_field = math.degrees(2 * math.atan(math.tan(math.radians(field) / 2) * extent / n))
        wcs = target_tan(entry["center"], output_pixels, exact_field)
        metadata = {"imageFormat": "png", "pixels": output_pixels, "fieldDegrees": exact_field,
                    "bytes": len(payload), "sha256": digest(payload), "wcsHeader": dict(wcs.to_header()),
                    "crpixFitsOneBased": (output_pixels + 1) / 2,
                    "masterCrop": {"boundsXYExclusive": [start, start, end, end], "boxFactor": factor,
                                   "method": "availability-premultiplied integer box mean, round-to-nearest"},
                    "scienceCrop": {"jointAvailablePixels": int(master.joint_available[crop].sum()),
                                    "totalMasterPixels": extent ** 2,
                                    "jointAvailableFraction": float(master.joint_available[crop].mean()),
                                    "fullCropAvailable": bool(master.joint_available[crop].all())},
                    "displayAlpha": {"meaning": ("area fraction of joint available master samples; not a binary science mask" if display_rgba is None
                                                 else "box-averaged encoded-display contribution alpha; not radiance or a scientific mask"),
                                     "zeroPixels": int((rgba[:, :, 3] == 0).sum()),
                                     "partialPixels": int(((rgba[:, :, 3] > 0) & (rgba[:, :, 3] < 255)).sum()),
                                     "opaquePixels": int((rgba[:, :, 3] == 255).sum())}}
        products[level] = payload, metadata
    return products


def _qualified_science_pyramid(master: GriMaster) -> dict:
    """Check the calibrated source/data boundary, without fitting or correcting it."""
    joint = master.joint_available
    if (not isinstance(joint, np.ndarray) or joint.dtype != np.bool_ or joint.ndim != 2 or
            joint.shape[0] != joint.shape[1] or not 0 < joint.shape[0] <= 4096 or
            set(master.bands) != set(BANDS)):
        raise RuntimeError('sdss_science_pyramid_shape_invalid')
    coherent = np.ones(joint.shape, dtype=np.bool_)
    identities = []
    for band in BANDS:
        value = master.bands[band]
        if (value.data.shape != joint.shape or value.data.dtype != np.dtype('float32') or
                value.footprint.shape != joint.shape or value.finite_neighbors.shape != joint.shape or
                value.footprint.dtype != np.bool_ or value.finite_neighbors.dtype != np.bool_):
            raise RuntimeError('sdss_science_pyramid_shape_invalid')
        coherent &= value.footprint & value.finite_neighbors
        receipts = value.report.get('sourceReceipts')
        if receipts is None:
            receipts = [value.report.get('sourceReceipt')]
        if not isinstance(receipts, list) or not receipts:
            raise RuntimeError('sdss_science_pyramid_source_admission_invalid')
        band_ids = []
        for receipt in receipts:
            if not isinstance(receipt, dict):
                raise RuntimeError('sdss_science_pyramid_source_admission_invalid')
            science = receipt.get('scientificSamples', {})
            try:
                identity = _identity(receipt.get('identity'))
            except RuntimeError as error:
                raise RuntimeError('sdss_science_pyramid_source_admission_invalid') from error
            if (science.get('unit') != 'nanomaggies/pixel' or science.get('calibrationAlreadyApplied') is not True or
                    science.get('skyAlreadySubtracted') is not True or
                    receipt.get('decompressed', {}).get('completeScientificArrays') is not True or
                    identity.get('band') != band or any(key not in identity for key in ('rerun', 'run', 'camcol', 'field'))):
                raise RuntimeError('sdss_science_pyramid_source_admission_invalid')
            band_ids.append(tuple(identity[key] for key in ('rerun', 'run', 'camcol', 'field')))
        if len(set(band_ids)) != len(band_ids):
            raise RuntimeError('sdss_science_pyramid_source_admission_invalid')
        identities.append(set(band_ids))
        if not np.isfinite(value.data[joint]).all():
            raise RuntimeError('sdss_science_pyramid_coherent_nonfinite')
    if not np.array_equal(coherent, joint) or any(value != identities[0] for value in identities[1:]):
        raise RuntimeError('sdss_science_pyramid_coherent_mismatch')
    if not joint.any():
        raise RuntimeError('sdss_science_pyramid_coherent_unavailable')
    recipe = master.report.get('display', {}).get('transfer')
    if (not isinstance(recipe, dict) or recipe.get('method') != 'Astropy make_lupton_rgb' or
            recipe.get('version') != astropy.__version__ or recipe.get('rgbBands') != ['i', 'r', 'g'] or
            recipe.get('intervalMinimum') != 0 or recipe.get('kind') not in ('fixed', 'whole-master-zscale') or
            recipe.get('scope') != 'one complete coherent science master before any level crop' or
            recipe.get('scienceCorrection') != 'NONE; calibrated samples/eligibility unchanged' or
            recipe.get('displayClipping') != 'nonpositive intensity/negative channels clip only in display; never science absence' or
            recipe.get('availableSciencePixels') != int(joint.sum()) or recipe.get('totalMasterPixels') != joint.size or
            not number(recipe.get('stretch')) or recipe['stretch'] <= 0 or
            not number(recipe.get('Q')) or not 0 < recipe['Q'] <= 1e10):
        raise RuntimeError('sdss_science_pyramid_resolved_recipe_invalid')
    requested = recipe.get('requestedParameters', {})
    if (not isinstance(requested, dict) or not number(requested.get('Q')) or not 0 < requested['Q'] <= 1e10 or
            recipe['Q'] != (.1 if requested['Q'] < 1 / 2 ** 23 else requested['Q'])):
        raise RuntimeError('sdss_science_pyramid_resolved_recipe_invalid')
    if recipe['kind'] == 'fixed':
        if (recipe.get('stretchClass') != 'LuptonAsinhStretch' or recipe.get('statisticalFit') is not None or
                requested.get('stretch') != recipe['stretch']):
            raise RuntimeError('sdss_science_pyramid_resolved_recipe_invalid')
    else:
        fit = recipe.get('statisticalFit')
        if (recipe.get('stretchClass') != 'LuptonAsinhZscaleStretch' or not isinstance(fit, dict) or
                fit.get('libraryFitCalls') != 1 or fit.get('finiteIntensitySamples') != int(joint.sum()) or
                fit.get('excludedIncoherentPixels') != int((~joint).sum())):
            raise RuntimeError('sdss_science_pyramid_resolved_recipe_invalid')
    # The source owner resolves the whole-master fit once. Only its already
    # resolved stretch/Q are reused below; no crop gets a ZScale fit or pedestal.
    return recipe


def verify_frozen_zscale_reference(master: GriMaster) -> dict:
    """Admit a resolved whole-master recipe and cached RGB without new choices.

    Replay the original bounded statistical sample once for *verification*.
    This is not a new full-master/crop fit or a quality decision. LOD creation
    subsequently uses only the admitted numeric stretch/Q and performs no fit.
    """
    recipe = _qualified_science_pyramid(master)
    if recipe['kind'] != 'whole-master-zscale':
        raise RuntimeError('sdss_frozen_zscale_kind_invalid')
    if master.rgb.shape != (*master.joint_available.shape, 3) or master.rgb.dtype != np.uint8:
        raise RuntimeError('sdss_frozen_zscale_rgb_shape_invalid')
    _, samples, expected_fit = _whole_master_zscale_samples(master.bands, master.joint_available)
    if recipe['statisticalFit'] != expected_fit:
        raise RuntimeError('sdss_frozen_zscale_sample_receipt_mismatch')
    z1, z2 = ZScaleInterval().get_limits(samples)
    if float(z2-z1) != recipe['stretch']:
        raise RuntimeError('sdss_frozen_zscale_resolved_stretch_mismatch')
    expected_rgb, _ = make_rgb_display(master.bands, master.joint_available,
        transfer=FixedDisplayTransfer(stretch=recipe['stretch'], Q=recipe['Q']))
    if not np.array_equal(master.rgb, expected_rgb):
        raise RuntimeError('sdss_frozen_zscale_rgb_recipe_mismatch')
    return {'status':'FROZEN_WHOLE_MASTER_REPRODUCED','verificationSampleFitCalls':1,
        'verificationSamples':int(samples.size),'fullMasterFitCalls':0,'levelFitCalls':0,
        'referenceRgbReproduced':True,'resolvedRecipeChanged':False,
        'scope':'Bounded original sample/parameter and complete cached RGB verification; no science correction or quality acceptance.'}


def coherent_box_means(samples: dict[str, np.ndarray], joint: np.ndarray, factor: int):
    """Common equal-area numerical means; caller owns measurement/estimate meaning."""
    if (joint.ndim != 2 or joint.dtype != np.bool_ or set(samples) != set(BANDS) or
            not isinstance(factor,int) or isinstance(factor,bool) or factor<1 or
            any(size % factor for size in joint.shape) or
            any(value.shape!=joint.shape or value.dtype.kind!='f' for value in samples.values())):
        raise RuntimeError('sdss_coherent_box_shape_invalid')
    if any(not np.isfinite(value[joint]).all() for value in samples.values()):
        raise RuntimeError('sdss_coherent_box_known_nonfinite')
    rows, columns = joint.shape
    shape = (rows//factor, factor, columns//factor, factor)
    counts = joint.reshape(shape).sum(axis=(1,3),dtype=np.uint64)
    means = {}
    for band,value in samples.items():
        sums = np.where(joint,value,0).reshape(shape).sum(axis=(1,3),dtype=np.float64)
        result = np.full(counts.shape,np.nan,dtype=np.float64)
        np.divide(sums,counts,out=result,where=counts>0)
        means[band] = result
    return means, counts


def science_mean_pyramid(master: GriMaster, entry: dict, *, output_pixels: int = 512) -> dict[str, tuple[bytes, dict]]:
    """Explicit candidate: signed coherent means precede a frozen display map.

    Both one-field and mosaic masters use this owner. Scientific eligibility,
    mean quantity and area alpha remain separate; RGB never determines supply.
    The old encoded-RGB pyramid and immutable publication contract are unchanged.
    """
    recipe = _qualified_science_pyramid(master)
    n = master.joint_available.shape[0]
    if (not isinstance(output_pixels, int) or isinstance(output_pixels, bool) or output_pixels <= 0 or
            n < output_pixels * 4 or n % (output_pixels * 4)):
        raise RuntimeError('sdss_tan_three_levels_require_integer_crops')
    field = master.report['fieldDegrees']
    if dict(master.target.to_header()) != dict(target_tan(entry['center'], n, field).to_header()):
        raise RuntimeError('sdss_science_pyramid_master_geometry_mismatch')
    products = {}
    for index, level in enumerate(LEVELS):
        extent = n // 2 ** index
        start, end = (n - extent) // 2, (n + extent) // 2
        factor = extent // output_pixels
        crop = (slice(start, end), slice(start, end))
        joint = master.joint_available[crop]
        all_means, counts = coherent_box_means({band:master.bands[band].data[crop] for band in BANDS},joint,factor)
        available = counts > 0
        bands, summaries = {}, {}
        for band in BANDS:
            means = all_means[band]
            values = means.astype(np.float32)
            bands[band] = ProjectedBand(values, available, available, {})
            summaries[band] = {'availableNegativeMeans': int((available & (means < 0)).sum()),
                               'availableZeroMeans': int((available & (means == 0)).sum())}
        if available.any():
            rgb, _ = make_rgb_display(bands, available,
                transfer=FixedDisplayTransfer(stretch=recipe['stretch'], Q=recipe['Q']))
        else:
            rgb = np.zeros((*counts.shape, 3), dtype=np.uint8)
        alpha = np.rint(counts.astype(np.float64) * 255 / (factor * factor)).astype(np.uint8)
        rgba = np.dstack([rgb, alpha])
        buffer = io.BytesIO(); Image.fromarray(rgba).save(buffer, format='PNG')
        payload = buffer.getvalue()
        exact_field = math.degrees(2 * math.atan(math.tan(math.radians(field) / 2) * extent / n))
        metadata = {'imageFormat': 'png', 'pixels': output_pixels, 'fieldDegrees': exact_field,
            'bytes': len(payload), 'sha256': digest(payload),
            'wcsHeader': dict(target_tan(entry['center'], output_pixels, exact_field).to_header()),
            'crpixFitsOneBased': (output_pixels + 1) / 2,
            'masterCrop': {'boundsXYExclusive': [start, start, end, end], 'boxFactor': factor,
                'method': SCIENCE_PYRAMID_KIND},
            'scienceCrop': {'jointAvailablePixels': int(joint.sum()), 'totalMasterPixels': extent ** 2,
                'jointAvailableFraction': float(joint.mean()), 'fullCropAvailable': bool(joint.all())},
            'scienceMeans': {'unit': 'mean source nanomaggies/native-pixel',
                'meaning': 'equal-area target sample mean of coherent calibrated source quantities; not flux summed per coarse pixel or new calibration',
                'availablePixels': int(available.sum()), 'emptyPixels': int((~available).sum()),
                'partialPixels': int(((counts > 0) & (counts < factor * factor)).sum()), 'perBand': summaries,
                'scientificValidity': 'UNKNOWN'},
            'displayRecipe': {'sourceWholeMasterRecipe': copy.deepcopy(recipe), 'resolvedStretch': recipe['stretch'], 'resolvedQ': recipe['Q'],
                'statisticalFitCalls': 0, 'scienceCorrections': 'NONE; signed means only, no sky/calibration/PSF correction'},
            'displayAlpha': {'meaning': 'coherent sample area fraction, independently rounded; brightness is not availability',
                'zeroPixels': int((alpha == 0).sum()), 'partialPixels': int(((alpha > 0) & (alpha < 255)).sum()),
                'opaquePixels': int((alpha == 255).sum())}}
        products[level] = payload, metadata
    return products


def _save_array(path: Path, array: np.ndarray) -> dict:
    with path.open("xb") as output:
        np.save(output, array, allow_pickle=False)
    raw = path.read_bytes()
    return {"file": path.name, "bytes": len(raw), "sha256": digest(raw),
            "shape": list(array.shape), "dtype": array.dtype.str, "format": "npy", "pickle": False}


def save_candidate(output: Path, master: GriMaster, entry: dict, row: dict, *,
                   pyramid_kind: str = 'encoded-rgb-box') -> dict:
    """Exclusive task-only output. Partial failed generations are never replaced."""
    transfer = master.report.get('display',{}).get('transfer')
    if not isinstance(transfer,dict):
        raise RuntimeError('sdss_display_recipe_missing')
    if pyramid_kind not in ('encoded-rgb-box', SCIENCE_PYRAMID_KIND):
        raise RuntimeError('sdss_science_pyramid_kind_unsupported')
    science_products = science_mean_pyramid(master, entry) if pyramid_kind == SCIENCE_PYRAMID_KIND else None
    output.mkdir(parents=True, exist_ok=False)
    arrays = {}
    for band in BANDS:
        value = master.bands[band]
        for label, array in (("science", value.data), ("footprint", value.footprint),
                             ("finite-neighbors", value.finite_neighbors)):
            name = f"{band}-{label}"
            arrays[name] = _save_array(output / (name + ".npy"), array)
    arrays["joint-availability"] = _save_array(output / "joint-availability.npy", master.joint_available)
    arrays["rgb-master"] = _save_array(output / "rgb-master.npy", master.rgb)
    alternative_master = None
    if science_products is None:
        alternative_master = encoded_contribution_rgba(master.rgb, master.joint_available)
        arrays["display-contribution-master"] = _save_array(output / "display-contribution-master.npy", alternative_master)
    report = dict(master.report)
    report["arrays"] = arrays
    if science_products is not None:
        report['sourceMasterVersion'] = master.report['version']
        report['version'] = SCIENCE_PYRAMID_VERSION
        report['pyramidKind'] = SCIENCE_PYRAMID_KIND
        report['display'] = copy.deepcopy(master.report['display'])
        report['display']['sourceMaster'] = 'one coherent signed science master; means before one frozen resolved RGB transfer at each level'
        report['pyramidRecipe'] = {'method': SCIENCE_PYRAMID_KIND,
            'sourceScience': {band: arrays[f'{band}-science']['sha256'] for band in BANDS},
            'jointAvailability': arrays['joint-availability']['sha256'],
            'resolvedWholeMasterTransfer': copy.deepcopy(transfer),
            'statisticalFitCallsInPyramid': 0, 'quantity': 'mean source nanomaggies/native-pixel',
            'meaning': 'Signed coherent science means before frozen display; old RGB master remains reference, not the parent image of these levels.'}
    source_kind = "cached single-field SDSS corrected-frame candidate"
    if master.mosaic_fields is not None:
        source_kind = "cached multi-field SDSS corrected-frame display coadd candidate"
        diagnostics = {}
        field_directory = output / 'mosaic-fields'
        field_directory.mkdir()
        for name, fields in master.mosaic_fields.items():
            prefix = name.replace('/', '-')
            field_arrays = {}
            for band in BANDS:
                projected = fields[band]
                for label, value in (('science',projected.data),('footprint',projected.footprint),
                                     ('finite-neighbors',projected.finite_neighbors)):
                    path = field_directory / f'{prefix}-{band}-{label}.npy'
                    field_arrays[f'{band}-{label}'] = _save_array(path,value) | {'file':path.relative_to(output).as_posix()}
            path = field_directory / f'{prefix}-normalized-weight.npy'
            field_arrays['normalized-weight'] = _save_array(path,master.mosaic_weights[name]) | {'file':path.relative_to(output).as_posix()}
            diagnostics[name] = field_arrays
        path = output / 'mosaic-contributor-count.npy'
        report['mosaic'] = dict(master.report['mosaic']) | {'diagnostics':diagnostics,
            'contributorCount':_save_array(path,master.contributor_count),
            'diagnosticMeaning':'independent per-field science/stencils and common normalized weights; count/weight are geometric supply, not source confidence'}
        independent_arrays = {}
        for band, union in master.independent_band_unions.items():
            independent_arrays[band] = {}
            for label, value in (('footprint',union.footprint),('finite-neighbors',union.finite_neighbors)):
                path = output / f'{band}-independent-source-{label}.npy'
                independent_arrays[band][label] = _save_array(path,value)
        report['mosaic']['independentSourceUnions'] = independent_arrays
        report['mosaic']['independentSourceUnionMeaning'] = 'Source supply only, with measurements retained per field; not the aggregate coherent coadd-data mask. Aggregate finite-neighbors equals finite coadd data.'
    report["levels"] = {}
    quality_source = {"kind": source_kind, "master": arrays["rgb-master"]["sha256"]}
    if science_products is not None:
        quality_source = {"kind": source_kind, "pyramidKind": SCIENCE_PYRAMID_KIND,
            "scienceMaster": report['pyramidRecipe']['sourceScience'],
            "jointAvailability": arrays['joint-availability']['sha256'],
            "referenceRgbMaster": arrays['rgb-master']['sha256']}
    quality_reports = []
    if science_products is None:
        reconstruction = np.rint(alternative_master[:, :, :3].astype(np.float64) * alternative_master[:, :, 3:4] / 255).astype(np.uint8)
        report["displayAlternative"] = {"kind": "encoded-display-contribution-v1",
            "method": "alpha=max(encoded RGB)/255 times availability; straight RGB=encoded RGB/max; computed once at master then premultiplied box",
            "maximumMasterChannelReconstructionErrorBytes": int(np.max(np.abs(reconstruction.astype(np.int16) - master.rgb.astype(np.int16)))),
            "meaning": "Task-only background-composition alternative using current display encoding/mixing; not physical linear radiance, source validity or adopted quality."}
        products = pyramid(master, entry)
        alternatives = pyramid(master, entry, display_rgba=alternative_master)
    else:
        products = science_products
        alternatives = {}
        report['displayAlternative'] = {'kind': 'signed-science-encoded-contribution-v1',
            'method': 'after each signed science mean/frozen RGB map, encoded contribution alpha multiplied by quantized coherent area alpha',
            'meaning': 'Encoded display decomposition, not linear radiance or scientific validity; no second science average or fit.'}
        for level, (payload, metadata) in products.items():
            rgba = np.array(Image.open(io.BytesIO(payload)))
            alternative = encoded_contribution_rgba(rgba[:, :, :3], rgba[:, :, 3] > 0)
            alternative[:, :, 3] = np.rint(alternative[:, :, 3].astype(np.float64) * rgba[:, :, 3] / 255).astype(np.uint8)
            buffer = io.BytesIO(); Image.fromarray(alternative).save(buffer, format='PNG')
            alt_payload = buffer.getvalue(); alt_metadata = copy.deepcopy(metadata)
            alpha = alternative[:, :, 3]
            alt_metadata.update({'bytes': len(alt_payload), 'sha256': digest(alt_payload),
                'displayAlpha': {'meaning': 'encoded display contribution times coherent area alpha; not science availability',
                    'zeroPixels': int((alpha == 0).sum()), 'partialPixels': int(((alpha > 0) & (alpha < 255)).sum()),
                    'opaquePixels': int((alpha == 255).sum())}})
            alternatives[level] = alt_payload, alt_metadata
    for level, (payload, metadata) in products.items():
        file = f"{entry['objectRef'].replace(':', '-')}-{level.lower()}.png"
        metadata["file"] = file
        quality = inspect_image(payload, entry, level, metadata, row=row,
            source=quality_source,
            processing={"transfer": dict(transfer), "crop": metadata["masterCrop"],
                        "alpha": metadata["displayAlpha"]["meaning"]})
        with (output / file).open("xb") as image:
            image.write(payload)
        metadata["sourceMasterHashes"] = {key: value["sha256"] for key, value in arrays.items()}
        alt_payload, alt_meta = alternatives[level]
        alt_file = f"{entry['objectRef'].replace(':', '-')}-{level.lower()}-display-contribution.png"
        alt_meta["file"] = alt_file
        alt_meta["sourceMasterHashes"] = metadata["sourceMasterHashes"]
        alt_quality = inspect_image(alt_payload, entry, level, alt_meta, row=row,
            source=quality_source,
            processing={"transfer": dict(transfer), "crop": alt_meta["masterCrop"],
                        "displayAlternative": report["displayAlternative"]})
        with (output / alt_file).open("xb") as image:
            image.write(alt_payload)
        metadata["alternativeDisplay"] = alt_meta
        report["levels"][level] = metadata
        quality_reports.append(quality)
        quality_reports.append(alt_quality)
    write_report(output / "candidate-quality.json", {"version": report['version'], "reports": quality_reports,
        "meaning": "Encoded/geometry review only. Independent science arrays/sidecar own sample availability; PNG alpha is not a HIPS finite mask."})
    report["harnessInput"] = {"reference": entry["objectRef"], "orientation": entry["orientation"],
        "center": entry["center"], "candidateOnly": True,
        "levels": {level: {key: metadata[key] for key in
            ("file", "bytes", "sha256", "pixels", "fieldDegrees", "crpixFitsOneBased")} |
            {"displayContribution": {key: metadata["alternativeDisplay"][key] for key in ("file", "bytes", "sha256")}}
            for level, metadata in report["levels"].items()}}
    write_report(output / "candidate.json", report)
    return report
