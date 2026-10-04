"""Publish cached same-source wide/fine TAN grids through the existing writer.

The measured 512/1024/1024 profile reuses the immutable wide v1 publication,
its exact 1024 crop and one already generated fine grid. It does not decode
source JPEG, reproject pixels, fit colour/background or adopt image quality.
"""
from dataclasses import dataclass
from pathlib import Path
import hashlib
import io
import json

import numpy as np
from PIL import Image

from optical_publication_io import bound_bytes, bound_file, decode_bound_npy
from prepared_optical_levels import PreparedOpticalLevel
from prepared_rgb_observation import ByteIdentity, NominalAvmGeometry, PreparedRgbSource
from prepared_rgb_tan import PreparedRgbTanMaster
from publish_prepared_optical import publish_prepared_candidate


@dataclass(frozen=True)
class VerifiedPreparedProgressive:
    payload_json: bytes
    products: tuple[PreparedOpticalLevel, ...]
    receipt_bytes: bytes
    bindings_json: bytes


def _identity(row):
    return {key: row[key] for key in ('bytes', 'sha256')}


def _json_form(value):
    return json.loads(json.dumps(value, allow_nan=False))


def verify_cached_prepared_progressive(*, root: Path, parent: dict, parent_hash: str,
                                      wide_metadata: dict, wide_npy: dict, fine_result: dict,
                                      fine_before: dict, fine_after: dict, medium_result: dict,
                                      medium_before: dict, medium_after: dict,
                                      publication_id: str) -> VerifiedPreparedProgressive:
    """Join caller-pinned completed receipts, exact containers and original source.

    The existing cached fine receipt is supported as an immutable historical
    format; this reader never fills its missing facts or declares new sampling.
    The common TS writer still validates the complete embedded v1 and v2 hash.
    """
    root = root.resolve()
    bindings = []

    def raw(row, maximum):
        value, pin = bound_bytes(root / row['path'], root=root, expected=row, max_bytes=maximum)
        bindings.append(pin)
        return value

    def read(row):
        return json.loads(raw(row, 8 * 1024 * 1024))

    parent_manifest = read(parent)
    if parent_manifest.get('publicationHash') != parent_hash or parent_manifest.get('imageVersion') != 'prepared-optical-v1':
        raise RuntimeError('prepared_progressive_parent_identity_invalid')
    original = {key: value for key, value in parent_manifest.items() if key != 'publicationHash'}
    original['levels'] = {level: {key: value for key, value in asset.items() if key != 'downloadUrl'}
                          for level, asset in original['levels'].items()}
    wide = read(wide_metadata)
    f = read(fine_result)
    before, after = read(fine_before), read(fine_after)
    if (not isinstance(before, list) or before != after or wide_metadata not in before or parent not in before or
            f.get('status') != 'NEW_SOURCE_SAMPLED_1024_FINE_FOOTPRINT_NOT_PUBLISHED_OR_ADOPTED' or
            f.get('sourceRgbDecodes') != 1 or f.get('newFineReprojections') != 1 or f.get('oldMothersOrTiersRecomputed') != 0 or
            f.get('oldPublicationHash') != parent_hash or f.get('sourceNetworkRequests') != 0):
        raise RuntimeError('prepared_progressive_fine_receipt_invalid')
    for row in before:
        bindings.append(bound_file(root / row['path'], root=root, expected=row))
    m = read(medium_result)
    mb, ma = read(medium_before), read(medium_after)
    if (not isinstance(mb, list) or mb != ma or wide_npy not in mb or parent not in mb or
            m.get('status') != 'EXACT_CACHED_MOTHER_1024_MEDIUM_CROP_NOT_PUBLISHED' or
            m.get('newSourceRgbDecodesProjectionsFits') != 0 or m.get('sourceNetworkRequests') != 0):
        raise RuntimeError('prepared_progressive_medium_receipt_invalid')
    for row in mb:
        bindings.append(bound_file(root / row['path'], root=root, expected=row))
    fine = read(f['metadata'])
    med = read(m['metadata'])
    # Full source AVM (including header/notes) is joined before converting to
    # the wire subset. A matching object name or JPEG hash alone is insufficient.
    if (fine['source'] != wide['source'] or fine['sourceGeometry'] != wide['sourceGeometry'] or
            fine['center'] != original['center'] or fine['objectRef'] != original['objectRef'] or
            wide['pixels'] != 2048 or fine['pixels'] != 1024 or med['pixels'] != 1024 or
            fine['fieldDegrees'] != original['levels']['DETAIL']['fieldDegrees'] or
            med['fieldDegrees'] != original['levels']['MEDIUM']['fieldDegrees'] or
            med['center'] != original['center'] or med['parentPublicationHash'] != parent_hash or
            med['parentMasterNpy'] != wide_npy or med['cropBoundsXYExclusive'] != [512, 512, 1536, 1536] or med['boxFactor'] != 1 or
            _identity(wide_npy) != _identity(original['master']['rgbaNpy']) or
            wide['rgba']['sha256'] != original['master']['rgba']['sha256']):
        raise RuntimeError('prepared_progressive_grid_join_invalid')
    source = original['source']
    for key, identity in (('sourceRgbSha256', source['decodedRgb']), ('sourceRawXmpSha256', source['rawXmp']),
                          ('sourceParserXmpSha256', source['parserXmp'])):
        if fine[key] != identity['sha256'] or wide[key] != identity['sha256']:
            raise RuntimeError('prepared_progressive_source_join_invalid')
    if (_identity(fine['source']['jpeg']) != source['encodedJpeg'] or _identity(fine['source']['xmp']) != source['rawXmp'] or
            fine['source']['credit'] != source['credit'] or fine['source']['colour_meaning'] != source['colourMeaning']):
        raise RuntimeError('prepared_progressive_source_join_invalid')
    arrays = [decode_bound_npy(raw(row, n ** 2 * 4 + 16384), shape=(n, n, 4), dtype='u1')
              for row, n in ((wide_npy, 2048), (f['rgba'], 1024), (m['npy'], 1024))]
    wide_rgba, fine_rgba, med_rgba = arrays
    for rgba, metadata in ((wide_rgba, wide), (fine_rgba, fine)):
        supported = rgba[:, :, 3] == 255
        if (not np.isin(rgba[:, :, 3], [0, 255]).all() or np.any(rgba[:, :, :3][~supported]) or
                int(supported.sum()) != metadata['geometricSupportPixels'] or
                int((supported & np.all(rgba[:, :, :3] == 0, axis=2)).sum()) != metadata['supportedBlackPixels'] or
                hashlib.sha256(rgba.tobytes()).hexdigest() != metadata['rgba']['sha256']):
            raise RuntimeError('prepared_progressive_grid_pixels_invalid')
    if not np.array_equal(med_rgba, wide_rgba[512:1536, 512:1536]) or hashlib.sha256(med_rgba.tobytes()).hexdigest() != med['rgbaPayloadSha256']:
        raise RuntimeError('prepared_progressive_medium_pixels_invalid')
    # Use the existing metadata owner, never a competing WCS/sampling formula.
    src = dict(fine['source'])
    src['jpeg'], src['xmp'] = ByteIdentity(**src['jpeg']), ByteIdentity(**src['xmp'])
    geom = dict(fine['sourceGeometry'])
    for key in ('reference_dimension', 'reference_pixel', 'reference_value', 'scale', 'decoded_shape_width_height', 'crpix', 'cdelt'):
        geom[key] = tuple(geom[key])
    grid = PreparedRgbTanMaster(fine['objectRef'], fine['center']['raDeg'], fine['center']['decDeg'], 1024,
        fine['fieldDegrees'], fine_rgba.tobytes(), PreparedRgbSource(**src), NominalAvmGeometry(**geom),
        fine['sourceRgbSha256'], fine['sourceRawXmpSha256'], fine['sourceParserXmpSha256'],
        tuple(fine['sourceLibraryVersions'].items()), fine['geometricSupportPixels'], fine['supportedBlackPixels'], fine['sampling']['chunkRows'])
    if _json_form(grid.metadata()) != fine:
        raise RuntimeError('prepared_progressive_fine_metadata_invalid')
    products = []
    assets = {}
    parent_dir = (root / parent['path']).parent
    for level in ('OVERVIEW', 'MEDIUM', 'DETAIL'):
        old = original['levels'][level]
        row = dict(old) | {'path': (parent_dir / old['file']).relative_to(root).as_posix()} if level == 'OVERVIEW' else m['png'] if level == 'MEDIUM' else f['png']
        pixels = 512 if level == 'OVERVIEW' else 1024
        png = raw(row, pixels ** 2 * 4 + 65536)
        with Image.open(io.BytesIO(png)) as image:
            image.load()
            if image.format != 'PNG' or image.mode != 'RGBA' or image.size != (pixels, pixels):
                raise RuntimeError('prepared_progressive_png_container_invalid')
            rgba = np.array(image)
        expected = None if level == 'OVERVIEW' else med_rgba if level == 'MEDIUM' else fine_rgba
        if expected is not None and not np.array_equal(rgba, expected):
            raise RuntimeError('prepared_progressive_png_pixels_invalid')
        counts = {'opaque': int((rgba[:, :, 3] == 255).sum()), 'partial': int(((rgba[:, :, 3] > 0) & (rgba[:, :, 3] < 255)).sum()), 'zero': int((rgba[:, :, 3] == 0).sum())}
        if level == 'OVERVIEW' and counts != old['alphaPixels']:
            raise RuntimeError('prepared_progressive_overview_pixels_invalid')
        is_fine = level == 'DETAIL'
        bounds = (0, 0, 2048, 2048) if level == 'OVERVIEW' else (0, 0, 1024, 1024) if is_fine else (512, 512, 1536, 1536)
        factor = 4 if level == 'OVERVIEW' else 1
        support = old['geometricMasterSupportPixels'] if level == 'OVERVIEW' else int((expected[:, :, 3] == 255).sum())
        if level == 'MEDIUM' and support != med['geometricSupportPixels']:
            raise RuntimeError('prepared_progressive_medium_support_invalid')
        assets[level] = {**old, **_identity(row), 'pixels': pixels, 'crpixFitsOneBased': (pixels + 1) / 2,
            'samplingGrid': 'fine' if is_fine else 'master',
            'masterRgbaSha256': fine['rgba']['sha256'] if is_fine else original['master']['rgba']['sha256'],
            'masterCrop': {'boundsXYExclusive': list(bounds), 'boxFactor': factor},
            'geometricMasterSupportPixels': support, 'alphaPixels': counts}
        products.append(PreparedOpticalLevel(level, pixels, old['fieldDegrees'], bounds, factor, png, rgba.tobytes(), support, (pixels * factor) ** 2))
    receipt = {'status': 'BOUND_SAME_SOURCE_GRIDS_AND_LEVELS_CHECKED',
        'parentPublicationHash': parent_hash, 'inputs': bindings,
        'sourceRgbDecodes': 0, 'pixelReprojections': 0, 'oldTiersRecomputed': 0, 'backgroundOrColourFits': 0,
        'wholeMediumCropAndFinePngExact': True, 'oldOverviewBytesReused': True,
        'geometricAlphaBlackAndHiddenRgbChecked': True,
        'scope': 'Cached original encoded observation in two admitted grids, not one 4096 mother, scientific validity, complete quality, independent review or adoption.'}
    receipt_bytes = json.dumps(receipt, ensure_ascii=False, indent=2, allow_nan=False).encode('utf-8') + b'\n'
    payload = {**original, 'publicationId': publication_id, 'schemaVersion': 'prepared-observation-optical-publication-v2',
        'imageVersion': 'prepared-optical-v2', 'parent': {'publicationHash': parent_hash, 'publication': original}, 'levels': assets,
        'fineGrid': {'pixels': 1024, 'fieldDegrees': fine['fieldDegrees'], 'crpixFitsOneBased': 512.5,
            'rgba': _identity(fine['rgba']), 'rgbaNpy': _identity(f['rgba']) | {'format': 'npy', 'shape': [1024, 1024, 4], 'dtype': 'uint8', 'rowOrder': 'top-first'},
            'producerMetadata': _identity(f['metadata']), 'producerReceipt': _identity(fine_result),
            'sourceRgbSha256': fine['sourceRgbSha256'], 'sourceAvmHash': None,
            'geometricSupportPixels': fine['geometricSupportPixels'], 'geometricBlackPixels': fine['supportedBlackPixels'],
            'scientificAvailability': 'UNKNOWN', 'scientificValidity': 'UNKNOWN', 'unit': 'published-encoded-RGB'},
        'processing': {**original['processing'], 'producerVersion': 'prepared-rgb-tan-progressive-v2',
            'validation': receipt['status'], 'producerReceipt': {'bytes': len(receipt_bytes), 'sha256': hashlib.sha256(receipt_bytes).hexdigest()},
            'modification': 'Starward reuses the original byte-bound encoded RGB wide TAN grid and one separately sampled finer TAN grid from exactly the same JPEG, decoded RGB and uncorrected publisher AVM. Overview PNG bytes are unchanged; medium is an exact 1024 wide-grid crop; detail uses the verified 1024 fine grid. No sky subtraction, colour fit, feathering, sharpening or synthetic detail.',
            'coverage': 'Alpha retains complete source-stencil geometric support from the declared sampling grid, independent of science validity. The two grids are not one higher-resolution mother. Full boundary/weak-structure/absolute registration/quality and target-runtime adoption remain unverified or failed.'}}
    # Same canonical JSON primitive as the TS content owner: sorted keys,
    # compact JSON and scalar source AVM. Python float spelling may differ from
    # JS, so use the existing TS owner for this small content identity below.
    import subprocess
    js = "import {opticalPublicationContentHash} from './packages/miniapp-contracts/src/optical-publication-content.ts';import{readFileSync}from'node:fs';process.stdout.write(opticalPublicationContentHash(JSON.parse(readFileSync(0,'utf8'))));"
    process = subprocess.run(['node', str(root / 'tools/run-node.cjs'), '--import', 'tsx', '--input-type=module', '-e', js],
        cwd=root, input=json.dumps(source['nominalAvm'], allow_nan=False).encode(), capture_output=True, timeout=60, check=True)
    payload['fineGrid']['sourceAvmHash'] = process.stdout.decode('ascii')
    for row in bindings:
        bound_file(root / row['path'], root=root, expected=row)
    return VerifiedPreparedProgressive(json.dumps(payload, ensure_ascii=False, allow_nan=False).encode(), tuple(products),
        receipt_bytes, json.dumps(bindings, ensure_ascii=False, allow_nan=False).encode())


def publish_verified_prepared_progressive(verified: VerifiedPreparedProgressive, verification_directory: Path,
                                         output: Path, *, root: Path):
    """Persist the actual verification receipt, then use the common exclusive writer."""
    root = root.resolve()
    directory = verification_directory.resolve()
    bindings = json.loads(verified.bindings_json)
    if (not directory.is_relative_to(root) or directory == root or
            any(directory.is_relative_to((root / row['path']).resolve().parent) for row in bindings)):
        raise RuntimeError('prepared_progressive_verification_output_overlaps_input')
    directory.mkdir(parents=True, exist_ok=False)
    receipt_path = directory / 'verification-receipt.json'
    with receipt_path.open('xb') as handle:
        handle.write(verified.receipt_bytes)
    bindings.append(bound_file(receipt_path, root=root))
    return publish_prepared_candidate(json.loads(verified.payload_json), verified.products, tuple(bindings), directory,
        output, root=root, additional_owners=(Path(__file__), root / 'packages/miniapp-contracts/src/prepared-progressive-optical-publication.ts'))
