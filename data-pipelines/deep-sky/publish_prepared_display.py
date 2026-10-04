"""Publish one byte-bound prepared sRGB display estimate, preserving raw v1.

This owner verifies saved processing, geometry and all pixels; it never refits
backgrounds, decodes the source JPEG RGB, reprojects or adopts image quality.
"""
from dataclasses import dataclass
from pathlib import Path
import hashlib
import io
import json
import zipfile
import numpy as np
from PIL import Image

from optical_publication_io import bound_file, bound_bytes, pinned_json, decode_bound_npy
from prepared_optical_levels import prepared_optical_levels
from publish_prepared_optical import (VerifiedPreparedGeneration, publication_payload,
                                     publish_prepared_candidate)

VERSION = "prepared-source-masked-background-display-v1"
SRGB_ICC_SHA256 = "2b3aa1645779a9e634744faf9b01e9102b0c9b88fd6deced7934df86b949af7e"
IDENTITY_KEYS = ("bytes", "sha256")


def content(row):
    return {key: row[key] for key in IDENTITY_KEYS}


def decode_background_npz(raw: bytes):
    """Exactly one bounded float64 NPY member; no path extraction or zip crawl."""
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        rows = archive.infolist()
        if (len(rows) != 1 or rows[0].filename != "background.npy" or rows[0].flag_bits & 1 or
                rows[0].compress_type != zipfile.ZIP_DEFLATED or
                not 2048 ** 2 * 3 * 8 < rows[0].file_size <= 2048 ** 2 * 3 * 8 + 16384):
            raise RuntimeError("prepared_display_background_container_invalid")
        with archive.open(rows[0]) as file:
            encoded = file.read(2048 ** 2 * 3 * 8 + 16385)
        if len(encoded) != rows[0].file_size:
            raise RuntimeError("prepared_display_background_container_invalid")
    return decode_bound_npy(encoded, shape=(2048, 2048, 3), dtype='f8')


def verify_display_pixels(raw, display, background, *, chunk_rows=128):
    """Complete formula and unchanged binary alpha, in bounded float chunks.

    Counts describe discarded negative display estimates, not missing data.
    Opaque black remains valid geometry and unsupported RGB must stay zero.
    """
    if (raw.dtype != np.uint8 or display.dtype != np.uint8 or raw.shape != display.shape or
            raw.ndim != 3 or raw.shape[2] != 4 or background.shape != raw.shape[:2] + (3,) or
            background.dtype != np.float64 or type(chunk_rows) is not int or not 1 <= chunk_rows <= 256):
        raise RuntimeError("prepared_display_pixel_shape_invalid")
    negative = np.zeros(3, dtype=np.int64)
    support = black = 0
    for start in range(0, raw.shape[0], chunk_rows):
        original = raw[start:start + chunk_rows]
        changed = display[start:start + chunk_rows]
        model = background[start:start + chunk_rows]
        alpha = original[:, :, 3]; supplied = alpha == 255
        if (not ((alpha == 0) | supplied).all() or not np.array_equal(alpha, changed[:, :, 3]) or
                np.any(original[:, :, :3][~supplied] != 0) or np.any(changed[:, :, :3][~supplied] != 0) or
                not np.isfinite(model).all() or np.any(model < 0) or np.any(model >= 255)):
            raise RuntimeError("prepared_display_geometry_or_background_invalid")
        source = original[:, :, :3].astype(np.float64) / 255
        model = model / 255
        linear = np.where(source <= .04045, source / 12.92, ((source + .055) / 1.055) ** 2.4)
        linear -= np.where(model <= .04045, model / 12.92, ((model + .055) / 1.055) ** 2.4)
        negative += ((linear < 0) & supplied[:, :, None]).sum(axis=(0, 1))
        linear = np.maximum(linear, 0)
        encoded = np.where(linear <= .0031308, linear * 12.92, 1.055 * linear ** (1 / 2.4) - .055) * 255
        expected = np.rint(np.clip(encoded, 0, 255)).astype(np.uint8)
        expected[~supplied] = 0
        if not np.array_equal(expected, changed[:, :, :3]):
            raise RuntimeError("prepared_display_formula_pixels_invalid")
        support += int(supplied.sum())
        black += int((supplied & (changed[:, :, :3] == 0).all(axis=2)).sum())
    return tuple(int(value) for value in negative), support, black


@dataclass(frozen=True)
class VerifiedPreparedDisplay:
    directory: Path
    parent_bytes: bytes
    processing_bytes: bytes
    report_bytes: bytes
    rgba_bytes: bytes
    npy_identity_items: tuple
    products: tuple
    binding_items: tuple

    @property
    def report(self):
        return json.loads(self.report_bytes)

    @property
    def bindings(self):
        return tuple(dict(row) for row in self.binding_items)


def verify_cached_prepared_display(directory: Path, *, root: Path, result_sha256: str,
                                  raw: VerifiedPreparedGeneration, parent_manifest: Path,
                                  parent_manifest_sha256: str, guard_manifest: Path,
                                  guard_manifest_sha256: str) -> VerifiedPreparedDisplay:
    directory, root = directory.resolve(), root.resolve()
    if not directory.is_relative_to(root) or not isinstance(raw, VerifiedPreparedGeneration):
        raise RuntimeError("prepared_display_input_invalid")
    generation, generation_pin = pinned_json(directory / 'result.json', result_sha256, root=root)
    bindings = list(raw.bindings) + [generation_pin]
    parent, parent_pin = pinned_json(parent_manifest, parent_manifest_sha256, root=root)
    parent_hash = parent.pop('publicationHash')
    for asset in parent['levels'].values():
        asset.pop('downloadUrl')
    if parent != publication_payload(raw, parent['publicationId']):
        raise RuntimeError("prepared_display_raw_parent_join_invalid")
    bindings.append(parent_pin)
    original_record = generation['originalRgbMaster']
    if any(original_record[key] != raw.receipt['master'][key] for key in IDENTITY_KEYS):
        raise RuntimeError("prepared_display_original_master_join_invalid")
    if generation['sourceAdmission'] != raw.receipt['cachedObservation']['admission']:
        raise RuntimeError("prepared_display_observation_join_invalid")

    def read(row, maximum):
        encoded, pin = bound_bytes(root / row['path'], root=root, expected=row, max_bytes=maximum)
        bindings.append(pin)
        return encoded

    encoded = read(generation['prototypeDisplayMaster'], 2048 ** 2 * 4 + 16384)
    display = decode_bound_npy(encoded, shape=(2048, 2048, 4), dtype='u1')
    mask = decode_bound_npy(read(generation['estimationMask'], 2048 ** 2 + 16384), shape=(2048, 2048), dtype='bool')
    background = decode_background_npz(read(generation['displayBackground'], 128 * 1024 * 1024))
    guard_manifest_value, guard_manifest_pin = pinned_json(guard_manifest, guard_manifest_sha256, root=root)
    bindings.append(guard_manifest_pin)
    inventories = raw.receipt['cachedObservation']
    upstream = json.loads(read(inventories['before'], 8 * 1024 * 1024))
    guard_array = next(row for row in upstream if content(row) == content(guard_manifest_value['master']['rgbaNpy']))
    guard_metadata = next(row for row in upstream if row['path'] == Path(guard_array['path']).with_name('master.json').as_posix())
    metadata = json.loads(read(guard_metadata, 8 * 1024 * 1024))
    geometry = decode_bound_npy(read(guard_array, 2048 ** 2 * 4 + 16384), shape=(2048, 2048, 4), dtype='u1')
    if (metadata['center'] != parent['center'] or metadata['fieldDegrees'] != parent['master']['fieldDegrees'] or
            content(metadata['rgba']) != content(guard_manifest_value['master']['rgba']) or
            hashlib.sha256(geometry.tobytes()).hexdigest() != guard_manifest_value['master']['rgba']['sha256'] or
            content(guard_array) != content(guard_manifest_value['master']['rgbaNpy']) or
            metadata['source']['credit'] != guard_manifest_value['source']['credit']):
        raise RuntimeError("prepared_display_geometry_guard_join_invalid")
    guard = geometry[:, :, 3] > 0
    if (np.any(guard & ~mask) or int(mask.sum()) != generation['maskPixels'] or
            int(guard.sum()) != generation['hubbleFootprintGuardPixels'] or
            int((mask & ~guard).sum()) != generation['detectedSourceOnlyMaskPixels']):
        raise RuntimeError("prepared_display_estimation_mask_invalid")
    negative, support, black = verify_display_pixels(raw.master.rgba_top_first, display, background)
    if list(negative) != generation['clippedNegativeLinearChannels'] or support != raw.master.geometric_support_pixels:
        raise RuntimeError("prepared_display_formula_counts_invalid")
    products = prepared_optical_levels(display, raw.master.field_degrees)
    for product, row in zip(products, generation['products'], strict=True):
        if row['level'] != product.level or read(row['prototypePng'], 2 * 1024 * 1024) != product.png_bytes:
            raise RuntimeError("prepared_display_level_derivation_invalid")
    method = generation['method']
    if (method['boxSize'] != [256, 256] or method['meshFilterSize'] != [3, 3] or method['sigmaClip'] != [3, 10] or
            method['detectNSigma'] != 2 or method['detectNPixels'] != 10 or method['dilateRadiusTargetPixels'] != 10 or
            method['backgroundEstimateCount'] != 1 or method['parameterScans'] != 0):
        raise RuntimeError("prepared_display_recipe_invalid")
    import photutils
    import photutils.version
    if photutils.__version__ != '3.0.0':
        raise RuntimeError("prepared_display_estimator_version_invalid")
    bindings.extend(bound_file(Path(module.__file__), root=root) for module in (photutils, photutils.version))
    script = next(row for row in upstream if row['path'].endswith('/trial-noirlab-m82-large-detail-2026-10-04.py'))
    execution_bytes, execution_pin = bound_bytes(directory / 'executed-script.py', root=root, expected=script, max_bytes=1024 * 1024)
    bindings.append(execution_pin)
    recipe = method['recipe']; read(recipe, 1024 * 1024)
    icc = next(row for row in upstream if row['path'].endswith('/icc-profile.icc'))
    profile = read(icc, 1024 * 1024)
    jpeg = raw.admission['source']['jpeg']
    source_path = next(row for row in upstream if content(row) == jpeg)
    source_encoded = read(source_path, 16 * 1024 * 1024)
    with Image.open(io.BytesIO(source_encoded)) as image:
        if image.format != 'JPEG' or image.info.get('icc_profile') != profile or icc['sha256'] != SRGB_ICC_SHA256:
            raise RuntimeError("prepared_display_srgb_source_invalid")
    # Header/ICC only; do not call Image.load(), convert() or read source RGB.
    processing = {'runtimeNetwork': 'forbidden', 'producerVersion': VERSION,
        'generationReceipt': content(generation_pin), 'generationScript': content(execution_pin),
        'colourTransferImplementation': content(recipe), 'sourceIcc': content(icc) | {'colourSpace': 'sRGB'},
        'background': content(generation['displayBackground']) | {'format': 'npz', 'member': 'background.npy',
            'shape': [2048, 2048, 3], 'dtype': 'float64', 'rowOrder': 'top-first',
            'payload': {'bytes': background.nbytes, 'sha256': hashlib.sha256(background.tobytes()).hexdigest()}},
        'estimationMask': content(generation['estimationMask']) | {'format': 'npy', 'shape': [2048, 2048],
            'dtype': 'bool', 'rowOrder': 'top-first', 'pixels': int(mask.sum()), 'detectedOnlyPixels': int((mask & ~guard).sum()),
            'role': 'background-estimation-exclusion-not-geometry-or-science'},
        'geometryExclusion': {'metadata': content(guard_metadata), 'rgbaNpy': content(guard_array),
            'rgba': content(guard_manifest_value['master']['rgba']), 'metadataReferenceUrl': guard_manifest_value['source']['metadataReferenceUrl'],
            'credit': guard_manifest_value['source']['credit'], 'license': 'CC BY 4.0',
            'licenseUrl': guard_manifest_value['source']['licenseUrl'], 'pixels': 2048, 'center': metadata['center'],
            'fieldDegrees': metadata['fieldDegrees'], 'supportPixels': int(guard.sum()),
            'role': 'background-estimation-exclusion-only-no-RGB'},
        'estimate': {'method': 'photutils-background2d-median-source-mask-v1', 'photutilsVersion': '3.0.0',
            'domain': 'prepared-encoded-sRGB-byte-values', 'boxSize': method['boxSize'], 'meshFilterSize': method['meshFilterSize'],
            'sigmaClip': {'sigma': 3, 'maxiters': 10}, 'detectNSigma': 2, 'detectNPixels': 10, 'dilateRadiusTargetPixels': 10},
        'subtraction': 'sRGB-to-linear-subtract-linearized-estimate-clamp-negative-to-zero-encode-sRGB-round',
        'negativeChannelPixels': list(negative), 'alpha': 'unchanged-parent-geometric-support',
        'levelResampling': 'geometry-premultiplied-integer-box-round-to-nearest',
        'validation': 'BOUND_PARENT_FORMULA_ALPHA_AND_LEVELS_CHECKED',
        'modification': 'Starward retains the original historical JPEG, XMP and unmodified encoded-RGB TAN parent. A source-excluded Photutils display background estimate is subtracted after sRGB linearization; negative display estimates are clamped to zero, encoded to sRGB and rounded. The separately credited Hubble footprint only excludes background-estimation cells; none of its RGB is mixed in. Geometric alpha is unchanged, including valid black. No calibrated sky/flux, astrometric correction, PSF correction, sharpening or synthetic detail is supplied.',
        'coverage': 'Original approximate publisher AVM and binary geometric support remain. The estimation exclusion mask is neither science validity nor a complete faint-structure mask. Clamping discards negative display estimates. Only three same-master crops are supplied; complete weak structure, edges/seams, registration and image quality remain unadopted.'}
    report = {'status': 'BOUND_PARENT_FORMULA_ALPHA_AND_LEVELS_CHECKED', 'imageVersion': 'prepared-display-optical-v1',
        'parentHash': parent_hash, 'negativeChannelPixels': list(negative), 'geometricSupportPixels': support,
        'geometricBlackPixels': black, 'displayMaster': generation['prototypeDisplayMaster'],
        'displayRgba': {'bytes': display.nbytes, 'sha256': hashlib.sha256(display.tobytes()).hexdigest()},
        'geometryAlphaUnchanged': True, 'allPixelsAndThreePngsExact': True, 'processing': processing,
        'bindings': bindings, 'sourceRgbDecodes': 0, 'reprojections': 0, 'backgroundFits': 0,
        'qualityAdopted': False, 'runtimeRegistered': False}
    serialize = lambda value: json.dumps(value, ensure_ascii=False, allow_nan=False).encode('utf-8')
    return VerifiedPreparedDisplay(directory, serialize({'publicationHash': parent_hash, 'publication': parent}),
        serialize(processing), serialize(report), display.tobytes(), tuple(generation['prototypeDisplayMaster'].items()),
        products, tuple(tuple(row.items()) for row in bindings))


def publish_verified_prepared_display(verified: VerifiedPreparedDisplay, output: Path, *, root: Path,
                                     publication_id: str, verification_receipt: Path, verification_sha256: str):
    receipt, receipt_pin = pinned_json(verification_receipt, verification_sha256, root=root)
    if receipt != verified.report:
        raise RuntimeError("prepared_display_verification_receipt_changed")
    parent = json.loads(verified.parent_bytes)
    processing = json.loads(verified.processing_bytes) | {'producerReceipt': content(receipt_pin)}
    rgba_sha = hashlib.sha256(verified.rgba_bytes).hexdigest()
    levels = {}
    for product in verified.products:
        rgba = np.frombuffer(product.rgba_bytes, dtype=np.uint8).reshape(512, 512, 4)
        levels[product.level] = {'file': parent['publication']['objectRef'].replace(':', '-') + '-' + product.level.lower() + '.png',
            'bytes': len(product.png_bytes), 'sha256': hashlib.sha256(product.png_bytes).hexdigest(), 'format': 'png', 'pixels': 512,
            'fieldDegrees': product.field_degrees, 'crpixFitsOneBased': 256.5, 'displayAlpha': 'geometric-source-area',
            'scientificAvailability': 'UNKNOWN', 'masterRgbaSha256': rgba_sha,
            'masterCrop': {'boundsXYExclusive': list(product.bounds_xy_exclusive), 'boxFactor': product.box_factor},
            'geometricMasterSupportPixels': product.geometric_source_master_support_pixels,
            'alphaPixels': {'opaque': int((rgba[:, :, 3] == 255).sum()), 'partial': int(((rgba[:, :, 3] > 0) & (rgba[:, :, 3] < 255)).sum()),
                'zero': int((rgba[:, :, 3] == 0).sum())}}
    master = parent['publication']['master'] | {'rgba': receipt['displayRgba'],
        'rgbaNpy': content(dict(verified.npy_identity_items)) | {'format': 'npy', 'shape': [2048, 2048, 4], 'dtype': 'uint8', 'rowOrder': 'top-first'},
        'geometricBlackPixels': receipt['geometricBlackPixels'], 'unit': 'background-subtracted-display-sRGB'}
    payload = {key: parent['publication'][key] for key in ('objectRef', 'center', 'orientation', 'source')}
    payload |= {'schemaVersion': 'prepared-observation-display-optical-publication-v1', 'imageVersion': 'prepared-display-optical-v1',
        'publicationId': publication_id, 'parent': parent, 'processing': processing, 'master': master, 'levels': levels}
    return publish_prepared_candidate(payload, verified.products, (*verified.bindings, receipt_pin),
        verified.directory, output, root=root, additional_owners=(Path(__file__),))
