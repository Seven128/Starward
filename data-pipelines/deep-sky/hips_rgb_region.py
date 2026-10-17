"""Bounded continuous RGB/coverage preparation from cached native HiPS cells.

This creates one region before model processing or LOD generation. It neither
downloads nor fills absent data. Native alpha, absent tiles, valid black and
UNKNOWN science remain separate; incomplete RGB cannot enter the SXT boundary.
Astropy owns caller-supplied TAN, the shared healpix-ts adapter owns cell lookup.
"""
from dataclasses import dataclass
from collections import OrderedDict
import io
from pathlib import Path
import subprocess
import numpy as np
from PIL import Image, ImageCms
from optical_publication_io import bound_bytes, bound_file

VERSION = 'cached-hips-continuous-rgb-region-v1'
CHUNK_SAMPLES = 65536  # Existing bounded raster exchange, independent of region size.


def nominal_region_tan(preparation):
    """Describe the saved work plane without borrowing original-photo WCS.

    This only interprets the existing Astropy header; it does not project,
    fill source coverage, assess source astrometry or create a science mask.
    """
    from astropy.io import fits
    from astropy.wcs import WCS
    if preparation.get('schemaVersion')!=VERSION or preparation.get('rowOrder')!='top-first':
        raise ValueError('hips_region_saved_plane_contract_invalid')
    width,height=preparation.get('width'),preparation.get('height')
    if any(type(v)is not int or v<2 for v in (width,height)):
        raise ValueError('hips_region_saved_plane_size_invalid')
    target=WCS(fits.Header.fromstring(preparation['targetFitsHeader']))
    if (target.has_distortion or target.pixel_n_dim!=2 or target.world_n_dim!=2 or
        list(target.wcs.ctype)!=['RA---TAN','DEC--TAN'] or target.wcs.radesys!='ICRS' or
        target.wcs.lonpole!=180 or not np.isfinite(target.wcs.crval).all() or
        not 0<=target.wcs.crval[0]<360 or abs(target.wcs.crval[1])>90 or
        not np.isfinite(target.wcs.crpix).all() or not np.isfinite(target.pixel_scale_matrix).all() or
        np.linalg.det(target.pixel_scale_matrix)==0):
        raise ValueError('hips_region_saved_plane_unsupported')
    return {'projection':'TAN','frame':'ICRS','sourceWidth':width,'sourceHeight':height,
            'referenceValue':target.wcs.crval.tolist(),'referencePixelFitsOneBased':target.wcs.crpix.tolist(),
            'cdDegreesPerPixel':target.pixel_scale_matrix.tolist(),'rowOrder':'top-first',
            'accuracy':'UNVERIFIED_DERIVED_HIPS_NATIVE_CELL_TAN'}


@dataclass(frozen=True)
class HipsRgbRegion:
    rgba: np.ndarray
    supplied: np.ndarray
    png_bytes: bytes
    report: dict


def native_cell_step_degrees(order):
    if type(order) is not int or not 0 <= order <= 8:
        raise ValueError('hips_region_order_invalid')
    # Mean HEALPix cell area determines a nominal sampling grid, not source PSF.
    return float(np.degrees(np.sqrt(4 * np.pi / (12 * (2 ** (order + 9)) ** 2))))


def lookup_world(world, order, root):
    raw = np.asarray(world, dtype='<f8').reshape(-1, 2).tobytes()
    result = subprocess.run(['node', 'tools/run-node.cjs', 'data-pipelines/deep-sky/hips_tan_lookup.mjs',
        str(order), '--samples'], input=raw, capture_output=True, cwd=root, timeout=30, check=True)
    if len(result.stdout) != len(raw) // 16 * 12:
        raise RuntimeError('hips_region_lookup_shape_invalid')
    return np.frombuffer(result.stdout, dtype='<u4').reshape(-1, 3)


def build_cached_hips_region(*, root, source, tiles, target, width, height, order,
                             max_output_pixels, max_cached_tile_bytes, colour_interpretation, lookup=lookup_world,
                             cancelled=lambda: False):
    root = Path(root).resolve()
    if (any(type(v) is not int or v <= 0 for v in (width, height, max_output_pixels)) or
            width * height > max_output_pixels or target.wcs.radesys != 'ICRS' or
            list(target.wcs.ctype) != ['RA---TAN', 'DEC--TAN'] or
            type(max_cached_tile_bytes) is not int or max_cached_tile_bytes < 512 * 512 * 4):
        raise ValueError('hips_region_target_or_budget_invalid')
    native_cell_step_degrees(order)
    if colour_interpretation != 'sRGB-web-display' or not isinstance(source, dict) or not source.get('sourceId'):
        raise ValueError('hips_region_source_meaning_invalid')
    retained = []
    for binding in source.get('inputs', []):
        retained.append(bound_file(root / binding['path'], root=root, expected=binding))
    if not retained:
        raise ValueError('hips_region_source_inputs_missing')
    supplied = np.zeros((height, width), dtype=bool)
    rgba = np.zeros((height, width, 4), dtype=np.uint8)
    cache, source_profiles, used, missing = OrderedDict(), [], set(), set()
    peak_cache_bytes, tile_decodes = 0, 0
    bindings = {}
    for item in tiles:
        pixel = item['pixel']
        if type(pixel) is not int or not 0 <= pixel < 12 * 4 ** order or pixel in bindings:
            raise ValueError('hips_region_tile_identity_invalid')
        bindings[pixel] = item['raw']
    for offset in range(0, width * height, CHUNK_SAMPLES):
        if cancelled():
            raise RuntimeError('hips_region_cancelled')
        flat = np.arange(offset, min(offset + CHUNK_SAMPLES, width * height))
        yy, xx = np.divmod(flat, width)
        ra, dec = target.all_pix2world(xx, height - 1 - yy, 0)
        world = np.stack((ra % 360, dec), axis=-1)
        addresses = lookup(world, order, root)
        if addresses.shape != (len(flat), 3) or addresses.dtype.kind != 'u' or np.any(addresses[:, 1:] >= 512):
            raise RuntimeError('hips_region_lookup_address_invalid')
        if np.any(addresses[:, 0] >= 12 * 4 ** order):
            raise RuntimeError('hips_region_lookup_tile_invalid')
        for pixel in np.unique(addresses[:, 0]):
            pixel = int(pixel)
            if pixel not in bindings:
                missing.add(pixel)
                continue
            if pixel not in cache:
                # Reserve space before the decoder is opened, including its
                # retained uint8 tile; caller owns the explicit offline budget.
                while (len(cache) + 1) * 512 * 512 * 4 > max_cached_tile_bytes:
                    cache.popitem(last=False)
                binding = bindings[pixel]
                raw, pin = bound_bytes(root / binding['path'], root=root, expected=binding, max_bytes=8 * 1024 * 1024)
                with Image.open(io.BytesIO(raw)) as image:
                    image.load()
                    if image.format != 'PNG' or image.mode not in ('RGB', 'RGBA') or image.size != (512, 512) or image.getexif().get(274, 1) != 1:
                        raise ValueError('hips_region_native_tile_invalid')
                    profile = image.info.get('icc_profile')
                    if profile:
                        if 'sRGB' not in ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(profile))):
                            raise ValueError('hips_region_non_srgb_tile')
                        source_profiles.append(profile)
                    cache[pixel] = np.asarray(image.convert('RGBA')).copy()
                tile_decodes += 1
                peak_cache_bytes = max(peak_cache_bytes, len(cache) * 512 * 512 * 4)
                retained.append(pin)
            cache.move_to_end(pixel)
            selected = addresses[:, 0] == pixel
            sx, sy = addresses[selected, 1], 511 - addresses[selected, 2]
            rgba[yy[selected], xx[selected]] = cache[pixel][sy, sx]
            supplied[yy[selected], xx[selected]] = True
            used.add(pixel)
        # No tile-sized float conversion, no complete world/lookup buffer.
    if cancelled():
        raise RuntimeError('hips_region_cancelled')
    if source_profiles and any(profile != source_profiles[0] for profile in source_profiles):
        raise ValueError('hips_region_inconsistent_srgb_profiles')
    profile = source_profiles[0] if source_profiles else ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
    buffer = io.BytesIO()
    Image.fromarray(rgba).save(buffer, format='PNG', icc_profile=profile)
    for binding in retained:
        bound_file(root / binding['path'], root=root, expected=binding)
    alpha = rgba[:, :, 3]
    counts = {'samples': width * height, 'missingTileSamples': int(np.count_nonzero(~supplied)),
        'sourceTransparentSamples': int(np.count_nonzero(supplied & (alpha == 0))),
        'sourcePartialAlphaSamples': int(np.count_nonzero(supplied & (alpha > 0) & (alpha < 255))),
        'opaqueSamples': int(np.count_nonzero(supplied & (alpha == 255))),
        'opaqueBlackSamples': int(np.count_nonzero(supplied & (alpha == 255) & np.all(rgba[:, :, :3] == 0, axis=-1)))}
    report = {'schemaVersion': VERSION, 'source': source, 'order': order, 'width': width, 'height': height,
        'targetFitsHeader': target.to_header(relax=True).tostring(), 'rowOrder': 'top-first',
        'sampling': 'nearest native HEALPix cell centre; no interpolation or new detail',
        'nominalCellStepDegrees': native_cell_step_degrees(order), 'sourceResolution': 'UNKNOWN',
        'alphaMeaning': 'native source display alpha unchanged; absent tiles separately recorded',
        'scientificAvailability': 'UNKNOWN', 'colourMeaning': 'sRGB web-display interpretation, not calibrated RGB',
        'iccOrigin': 'exact common native tag' if source_profiles else 'explicit interpretation of untagged display',
        'inputs': retained, 'usedTiles': sorted(used), 'missingTiles': sorted(missing), 'counts': counts,
        'decodedTileCache': {'limitBytes': max_cached_tile_bytes, 'peakRetainedRgbaBytes': peak_cache_bytes,
            'tileDecodes': tile_decodes, 'meaning': 'Retained uint8 arrays only, not physical process peak'},
        'completeOpaqueRgb': counts['opaqueSamples'] == width * height,
        'sxtAdmission': 'COMPLETE_RGB_ONLY' if counts['opaqueSamples'] == width * height else 'COVERAGE_ADAPTER_REQUIRED',
        'ordinaryAdoption': False, 'sceneAcceptance': 'MISSING'}
    rgba.setflags(write=False)
    supplied.setflags(write=False)
    return HipsRgbRegion(rgba, supplied, buffer.getvalue(), report)
