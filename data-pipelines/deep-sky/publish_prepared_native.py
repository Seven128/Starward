"""Whole-source candidate tiers, using existing source/byte/packaging owners.

Only linear nominal TAN is supported. No target-centered crop, WCS resampling,
PSF fit, brightness mask or runtime source access. An explicit file-reviewed SXT
variant preserves the same full rectangle with distinct display-estimate meaning.
The explicit recipe supplies source/rights facts; this writer cannot adopt them.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import time

import astropy
from astropy.io import fits
from astropy.wcs import WCS
from astropy.coordinates import SkyCoord
import astropy.units as u
import numpy as np
from PIL import Image, __version__ as pillow_version

from optical_publication_io import bound_bytes, bound_file, pinned_json
from prepared_rgb_observation import ByteIdentity, PreparedRgbSource, load_prepared_rgb_observation
from publish_prepared_optical import publish_prepared_candidate, PreparedEncodedLevel, validate_publication_output
from reviewed_sxt_display import admit_reviewed_sxt, reviewed_sxt_row
from reviewed_restored_display import admit_reviewed_restored, reviewed_restored_row
from reviewed_background_display import admit_reviewed_background, reviewed_background_row
from reviewed_denoised_display import admit_reviewed_denoised, reviewed_denoised_row
from prepared_display_registration import admit_display_registration
from prepared_publisher_corners import stellarium_corner_geometry


def identity(value: dict) -> dict:
    return {key: value[key] for key in ("bytes", "sha256")}


def buffer_identity(value: bytes) -> dict:
    return {"bytes": len(value), "sha256": hashlib.sha256(value).hexdigest()}


NativeEncodedLevel = PreparedEncodedLevel  # Compatibility for existing callers.


def publish_native_recipe(recipe_file: Path, pin: str, output: Path, *, root: Path) -> dict:
    started = time.perf_counter()
    root, output = root.resolve(), output.resolve()
    owners = [Path(__file__), root / "data-pipelines/deep-sky/prepared_rgb_observation.py",
        root / "data-pipelines/deep-sky/optical_publication_io.py", root / "data-pipelines/deep-sky/requirements.txt",
        root / "packages/miniapp-contracts/src/prepared-native-optical-publication.ts",
        root / "packages/miniapp-contracts/src/celestial-identity.ts"]
    owner_before = [bound_file(path, root=root) for path in owners]
    recipe, recipe_binding = pinned_json(recipe_file, pin, root=root)
    ready_texture = recipe.get('adapter') == 'stellarium-corners'
    if ready_texture:
        owners.append(root / 'data-pipelines/deep-sky/prepared_publisher_corners.py')
        owner_before = [bound_file(path, root=root) for path in owners]
    if recipe.get('displayRegistration'):
        return publish_registered_native_recipe(recipe, recipe_binding, output, root=root)
    sxt_display = recipe.get('sxtDisplay')
    restored_display = recipe.get('restoredDisplay')
    background_display = recipe.get('backgroundDisplay')
    denoised_display = recipe.get('denoisedDisplay')
    if sum(bool(v) for v in (sxt_display, restored_display, background_display, denoised_display)) > 1:
        raise RuntimeError('prepared_native_processing_selection_ambiguous')
    if sxt_display or restored_display or background_display or denoised_display:
        owners += [root / 'data-pipelines/deep-sky/reviewed_sxt_display.py',
            root / 'data-pipelines/deep-sky/normalized_rgb_source.py',
            root / 'data-pipelines/deep-sky/sxt_processing.py']
        owner_before = [bound_file(path, root=root) for path in owners]
        if recipe.get('reuseDetail') or recipe.get('format') != 'png':
            raise RuntimeError('prepared_native_sxt_requires_lossless_exact_detail')
        if restored_display or background_display or denoised_display:
            owners += [root/'data-pipelines/deep-sky/reviewed_restored_display.py',
                root/'data-pipelines/deep-sky/photoshop_original_restore.py']
            owner_before = [bound_file(path, root=root) for path in owners]
        if background_display or denoised_display:
            owners += [root/'data-pipelines/deep-sky/reviewed_background_display.py',
                root/'data-pipelines/deep-sky/optical_display_background.py',
                root/'data-pipelines/deep-sky/publish_prepared_display.py']
            owner_before = [bound_file(path, root=root) for path in owners]
        if denoised_display or background_display:
            owners += [root/'data-pipelines/deep-sky/reviewed_denoised_display.py']
            owner_before = [bound_file(path, root=root) for path in owners]
    if (not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", recipe.get("publicationId", "")) or
            recipe.get("format") not in ("jpeg", "png") or recipe.get("adapter") not in ("publisher-avm", "companion-fits", "stellarium-corners")):
        raise RuntimeError("prepared_native_recipe_invalid")
    if ready_texture and (sxt_display or restored_display or background_display or denoised_display or recipe['format'] != 'png'):
        raise RuntimeError('prepared_native_ready_texture_processing_unsupported')
    if not output.is_relative_to(root) or output.exists():
        raise RuntimeError("prepared_native_output_invalid")
    receipt_dir = output.with_name(output.name + "-generation")
    if receipt_dir.exists():
        raise RuntimeError("prepared_native_generation_exists")
    bindings = [recipe_binding]
    validate_publication_output(output, receipt_dir, bindings, root=root)
    def read(record: dict) -> bytes:
        raw, binding = bound_bytes(root / record["path"], root=root, expected=record, max_bytes=record["bytes"])
        bindings.append(binding)
        return raw
    source_raw = read(recipe["encoded"])
    metadata_raw = read(recipe["metadata"])
    evidence_raw = read(recipe["registrationEvidence"])
    evidence = json.loads(evidence_raw)
    for dependency in recipe.get('sourceDependencies', []):
        read(dependency)
    s = recipe["source"]
    corner_conversion = None
    with Image.open(io.BytesIO(source_raw)) as source_image:
        source_format = source_image.format.lower()
        if ready_texture:
            if (source_image.format != 'PNG' or source_image.mode not in ('RGB', 'P') or
                    source_image.convert('RGBA').getchannel('A').getextrema() != (255, 255)):
                raise RuntimeError('prepared_native_ready_texture_must_be_opaque_rgb')
        elif source_image.format != "JPEG" or source_image.mode != "RGB":
            raise RuntimeError("prepared_native_rgb_source_invalid")
        width, height = source_image.size
        icc = source_image.info.get("icc_profile")
        source_rgb = source_image.convert('RGB').tobytes() if recipe["adapter"] != "publisher-avm" else None
    if ready_texture:
        wcs, corner_conversion = stellarium_corner_geometry(recipe, metadata_raw, evidence, width, height)
        accuracy = 'UNVERIFIED_APPROXIMATE_PUBLISHER_CORNERS'
    elif recipe["adapter"] == "publisher-avm":
        source = PreparedRgbSource(s["resourceId"], ByteIdentity(**identity(recipe["encoded"])),
            ByteIdentity(**identity(recipe["metadata"])), s["sourceUrl"], s["metadataReferenceUrl"], s["credit"],
            s["rightsLabel"], s["licenseUrl"], s["policyUrl"], s["colourMeaning"])
        observation = load_prepared_rgb_observation(root / recipe["encoded"]["path"], root / recipe["metadata"]["path"],
            source, max_encoded_bytes=len(source_raw), max_decoded_pixels=width * height)
        source_rgb = observation.rgb_bytes
        wcs = observation.geometry.new_wcs()
        accuracy = observation.geometry.accuracy
        if evidence.get("source", {}).get("sha256") != recipe["encoded"]["sha256"]:
            raise RuntimeError("prepared_native_registration_source_mismatch")
    else:
        with fits.open(io.BytesIO(metadata_raw), memmap=False) as hdus:
            header = hdus[0].header
            if (header.get("NAXIS1") != width or header.get("NAXIS2") != height or
                    header.get("CTYPE1") != "RA---TAN" or header.get("CTYPE2") != "DEC--TAN" or
                    header.get("RADESYS") is not None or header.get("EQUINOX") is not None):
                raise RuntimeError("prepared_native_companion_geometry_invalid")
            wcs = WCS(header)
        # This bounded source has no declared frame; keep that assumption in
        # the versioned wire contract instead of inventing absolute accuracy.
        accuracy = "UNVERIFIED_COMPANION_FITS_ASSUMED_ICRS"
        if (evidence.get("sources", [])[:2] != [recipe["encoded"], recipe["metadata"]] or
                evidence.get("scientificAvailability") != "UNKNOWN" or
                max(evidence.get("orientationScores", {}), key=evidence["orientationScores"].get) != "fits-bottom-to-jpeg-top"):
            raise RuntimeError("prepared_native_companion_orientation_unverified")
    matrix = np.asarray(wcs.pixel_scale_matrix)
    if (wcs.has_distortion or list(wcs.wcs.ctype) != ["RA---TAN", "DEC--TAN"] or
            matrix.shape != (2, 2) or not np.isfinite(matrix).all() or np.linalg.det(matrix) == 0):
        raise RuntimeError("prepared_native_linear_tan_required")
    geometry = {"projection": "TAN", "frame": "ICRS J2000", "sourceWidth": width, "sourceHeight": height,
        "referenceValue": wcs.wcs.crval.tolist(), "referencePixelFitsOneBased": wcs.wcs.crpix.tolist(),
        "cdDegreesPerPixel": matrix.tolist(), "rowOrder": "top-first", "accuracy": accuracy}
    ends = wcs.all_pix2world([[-.5, (height - 1) / 2], [width - .5, (height - 1) / 2]], 0)
    field_degrees = float(SkyCoord(ends[0][0] * u.deg, ends[0][1] * u.deg).separation(
        SkyCoord(ends[1][0] * u.deg, ends[1][1] * u.deg)).deg)
    source_icc = icc
    rgb = Image.frombytes("RGB", (width, height), source_rgb)
    separation, restoration, background, denoising, reviewed_detail = None, None, None, None, None
    if sxt_display or restored_display or background_display or denoised_display:
        if icc:
            rgb.info['icc_profile'] = icc
        if denoised_display:
            rgb, reviewed_detail, separation, restoration, background, denoising, reviewed_bindings = admit_reviewed_denoised(
                denoised_display, recipe['encoded'], rgb, root=root)
            if background is None:
                raise ValueError('prepared_native_denoised_display_requires_background_parent')
        elif background_display:
            rgb, reviewed_detail, separation, restoration, background, denoising, reviewed_bindings = admit_reviewed_background(
                background_display, recipe['encoded'], rgb, root=root)
        elif restored_display:
            rgb, reviewed_detail, separation, restoration, reviewed_bindings = admit_reviewed_restored(
                restored_display, recipe['encoded'], rgb, root=root)
        else:
            rgb, reviewed_detail, separation, reviewed_bindings = admit_reviewed_sxt(
                sxt_display, recipe['encoded'], rgb, root=root)
        bindings.extend(reviewed_bindings)
        icc = rgb.info.get('icc_profile')
    validate_publication_output(output, receipt_dir, bindings, root=root)
    widths = recipe["levelWidths"]
    if (not isinstance(widths, list) or len(widths) != 3 or any(type(v) is not int or v <= 1 or v > width for v in widths) or
            not widths[0] < widths[1] < widths[2]):
        raise RuntimeError("prepared_native_level_widths_invalid")
    if separation and (widths[-1] != rgb.width or any(v > rgb.width for v in widths)):
        raise RuntimeError('prepared_native_sxt_levels_exceed_reviewed_display')
    reused = recipe.get("reuseDetail")
    reused_raw = None
    if reused:
        prior_raw = read(reused["receipt"])
        prior = json.loads(prior_raw)
        previous_file = prior.get(reused["recordKey"])
        if previous_file != reused["asset"]:
            raise RuntimeError("prepared_native_reused_detail_identity_invalid")
        if reused["recordKey"] in ("png", "jpegQ92"):
            if prior.get("jpeg") != recipe["encoded"] or prior.get("displaySize") != [widths[-1], round(height * widths[-1] / width)]:
                raise RuntimeError("prepared_native_reused_detail_source_invalid")
        elif reused["recordKey"] != "raw" or previous_file != recipe["encoded"]:
            raise RuntimeError("prepared_native_reused_detail_source_invalid")
        reused_raw = read(reused["asset"])
    assets, products = {}, []
    for level, target_width in zip(("OVERVIEW", "MEDIUM", "DETAIL"), widths):
        size = (target_width, round(height * target_width / width))
        if level == "DETAIL" and (reused_raw is not None or reviewed_detail is not None):
            encoded = reviewed_detail if reviewed_detail is not None else reused_raw
        else:
            output_image = rgb.resize(size, Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            kwargs = {"icc_profile": icc} if icc else {}
            if recipe["format"] == "jpeg":
                kwargs.update(quality=92, subsampling=0)
            output_image.save(buffer, format="JPEG" if recipe["format"] == "jpeg" else "PNG", **kwargs)
            encoded = buffer.getvalue()
        with Image.open(io.BytesIO(encoded)) as decoded:
            decoded.load()
            if decoded.size != size or decoded.mode != "RGB" or decoded.format != ("JPEG" if recipe["format"] == "jpeg" else "PNG"):
                raise RuntimeError("prepared_native_encoded_level_invalid")
            decoded_rgb = decoded.tobytes()
        assets[level] = {"file": f'{recipe["publicationId"]}-{level.lower()}.{"jpg" if recipe["format"] == "jpeg" else "png"}',
            **buffer_identity(encoded), "format": recipe["format"], "width": size[0], "height": size[1],
            "fieldDegrees": field_degrees, "sourceUvBounds": [0, 0, 1, 1], "displayAlpha": "geometric-source-area",
            "scientificAvailability": "UNKNOWN", "decodedRgb": buffer_identity(decoded_rgb)}
        products.append(NativeEncodedLevel(level, encoded))
    # One small receipt binds generated and reused products, recipe, geometry
    # and owners. This avoids a second processing path or re-encoding warm data.
    denoised_before_background = bool(denoising and denoising['method'] == 'nxt-srgb-source-display-denoise-v1')
    producer_version = 'prepared-native-ready-texture-v1' if ready_texture else 'prepared-native-source-denoised-background-display-v1' if denoised_before_background else 'prepared-native-source-background-denoised-display-v1' if denoising else 'prepared-native-source-background-display-v1' if background else 'prepared-native-sxt-ps-restored-display-v1' if restoration else 'prepared-native-sxt-display-v1' if separation else 'prepared-native-full-source-v1'
    receipt = {"version": producer_version, "inputs": bindings, "nominalTan": geometry,
        "levels": assets, "reusedDetail": reused is not None, "sourceFullDecodes": 1,
        "masterReprojections": 0, "downloads": 0, "libraries": {"Pillow": pillow_version, "astropy": astropy.__version__, "numpy": np.__version__},
        "owners": owner_before, "elapsedSeconds": time.perf_counter() - started,
        "scientificAvailability": "UNKNOWN", "qualityAdopted": False}
    if corner_conversion:
        receipt['publisherCornerConversion'] = corner_conversion
    if separation:
        receipt.update(separation=separation, modelInferenceCalls=0, exactReviewedDetailReused=True,
            normalizationMeaning='Current shared whole-source normalization equals the bound existing model input byte-for-byte; no crop or alpha erasure')
    if restoration:
        receipt.update(restoration=restoration,photoshopCalls=0)
    if background:
        receipt.update(background=background, backgroundFits=0)
    if denoising:
        receipt.update(denoising=denoising, denoisingCalls=0)
    receipt_dir.mkdir(parents=True, exist_ok=False)
    receipt_file = receipt_dir / "producer-receipt.json"
    receipt_file.write_text(json.dumps(receipt, indent=2, allow_nan=False) + "\n", encoding="utf8")
    receipt_binding = bound_file(receipt_file, root=root)
    bindings.append(receipt_binding)
    payload = {"schemaVersion": "prepared-native-optical-publication-v1", "imageVersion": "prepared-native-optical-v1",
        "publicationId": recipe["publicationId"], "reference": recipe["subject"]["reference"], "subject": recipe["subject"], "nominalTan": geometry,
        "source": {key: s[key] for key in ("resourceId", "sourceUrl", "metadataReferenceUrl", "credit", "license", "licenseUrl", "policyUrl", "colourMeaning")},
        "processing": {"runtimeNetwork": "forbidden", "producerVersion": producer_version, "producerReceipt": identity(receipt_binding),
            "resampling": "whole-source-LANCZOS", "colourUnit": 'source-excluded-denoised-srgb-background-display-estimate' if denoised_before_background else 'source-excluded-srgb-background-denoised-display-estimate' if denoising else 'source-excluded-srgb-background-display-estimate' if background else 'sxt-original-restored-display-estimate' if restoration else 'sxt-starless-display-estimate' if separation else "published-encoded-RGB", "alphaMeaning": "opaque-full-source-rectangle",
            "scientificAvailability": "UNKNOWN", "sourceResolution": "UNKNOWN",
            "modification": "Starward retains the complete published RGB rectangle and nominal linear TAN. Tiers use whole-source LANCZOS downsampling. " +
                ("The bound existing finest encoded product is reused. " if reused else "") +
                "No crop, brightness mask, retouching, PSF correction, generated detail or new calibrated science is supplied.",
            "coverage": recipe["coverage"]}, "levels": assets}
    if separation:
        payload['processing'].update(separation=separation,
            modification='Starward uses the exact file-reviewed SXT ML11 starless display estimate of the complete source rectangle. '
                'The original photograph, nominal TAN and ICC provenance remain bound. Coarse tiers downsample this one processed image; '
                'the finest reviewed PNG is reused exactly. Star separation can alter real astronomical structures; file review does not '
                'establish Scene quality, absolute registration or calibrated science. No crop, brightness mask or added coverage is supplied.')
    if restoration:
        payload['processing'].update(restoration=restoration,
            modification='Starward uses the bound SXT ML11 display estimate with reviewed Photoshop local restoration of real structures '
                'from the exact normalized original photograph. Frozen mask cores preserve original RGB; the exterior retains SXT, '
                'with at most one encoded code of feather rounding. The baseline SXT file still required repair; only the combined '
                'file passed review. The complete rectangle, nominal TAN and ICC remain bound, and the finest combined PNG is reused exactly. '
                'No generated fill, crop, brightness mask, new coverage, calibrated science or Scene acceptance is supplied.')
    if background:
        payload['processing'].update(background=background,
            modification='Starward applies a bound source-excluded Photutils sRGB display-background estimate to the file-reviewed '
                'SXT/original-restored complete image. Source exclusion and detected-source masks affect fitting samples only. '
                'The saved estimated background is subtracted in linearized sRGB and negative display differences are clamped to zero. '
                'This changes the final RGB across the complete image, including restored original cores; parent pixel proofs apply '
                'only before this step. All final pixels and ICC are read back against that formula. The finest separately reviewed PNG '
                'is reused exactly; two coarse tiers downsample it. Valid black remains opaque supplied geometry. The original photograph '
                'and all parent reviews remain bound. No brightness alpha, crop, new coverage, calibrated science, absolute registration '
                'or Scene acceptance is supplied.')
    if denoising:
        payload['processing'].update(denoising=denoising,
            modification='The preceding source-excluded background display is separately byte-bound and file-reviewed. '
                'Starward then applies the selected NXT ML3.1 denoising model to that exact complete sRGB RGB8 display. '
                'Vendor and final RGB are identical; the bound input ICC is retained and all full-image/ROI comparisons are reviewed. '
                'The final NXT PNG is reused exactly for DETAIL; coarse tiers downsample it. Background subtraction and Photoshop '
                'core/exterior formula proofs apply only to their respective pre-denoising stages. Learning-based denoising can alter '
                'real weak structures or texture and is not new observational detail. The complete source rectangle and nominal TAN '
                'remain unchanged. No brightness alpha, crop, new coverage, calibrated science, absolute registration or Scene acceptance is supplied.')
        if denoised_before_background:
            payload['processing']['modification'] = ('Starward applies the selected NXT ML3.1 denoising model to the exact separately '
                'reviewed complete SXT/original-restored sRGB RGB8 image, then estimates the display background on that denoised full source. '
                'The source exclusion limits fitting samples only; saved linear-sRGB subtraction and negative clamp are verified across '
                'all final pixels. Each intermediate stage keeps its distinct input/output proof and file review. Photoshop core/exterior '
                'proofs apply before NXT; NXT vendor equality applies before background subtraction. The finest final background PNG is reused '
                'exactly and coarse levels downsample it. Learning-based denoising may alter real weak structure or texture; it supplies no '
                'new observational detail. Complete geometry, nominal TAN and ICC stay bound; no brightness alpha, crop, new coverage, '
                'calibrated science, absolute registration or Scene acceptance is supplied.')
    if separation:
        payload['processing']['modification'] += ' SXT star separation uses an AI model.'
    if denoising:
        payload['processing']['modification'] += ' NXT denoising uses an AI model.'
    if ready_texture:
        payload['processing']['modification'] = ('Starward retains the complete published Stellarium display texture. '
            'The upstream texture is a prepared derivative of the credited observation; its detailed processing is unknown. '
            'Original encoded bytes and all decoded RGB pixels remain bound. Three tiers use whole-source LANCZOS; '
            'a palette is expanded losslessly when needed. No additional star removal, crop, background subtraction, '
            'retouching or generated detail is applied. Published corner positions are approximated by a nominal TAN '
            'within half a source pixel at the four corners; this does not establish independent astrometry or interior accuracy. '
            'Original texture resolution, scientific validity and Scene acceptance are not improved by resampling.')
    payload["source"].update(encoded=identity(recipe["encoded"]) | {"format": source_format},
        decodedRgb=buffer_identity(source_rgb) | {"width": width, "height": height, "rowOrder": "top-first"},
        metadata=identity(recipe["metadata"]) | {"kind": recipe["adapter"], "sourceUrl": recipe["metadataSourceUrl"]},
        registrationEvidence=identity(recipe["registrationEvidence"]), iccProfile=buffer_identity(source_icc) if source_icc else None)
    for binding in bindings:
        bound_file(root / binding["path"], root=root, expected=binding)
    if [bound_file(path, root=root) for path in owners] != owner_before:
        raise RuntimeError("prepared_native_owner_changed")
    return publish_prepared_candidate(payload, tuple(products), tuple(bindings), receipt_dir, output, root=root,
        additional_owners=tuple(owners))


def verify_native_candidate(recipe, recipe_binding, existing, *, root):
    """Reuse a sealed local candidate, never rerun unchanged decoding/inference.

    Producer provenance is historical; current guards validate current bytes.
    This cannot turn an old generation into a new execution or Scene adoption.
    """
    bindings = [recipe_binding]
    def read(binding):
        raw, current = bound_bytes(root / binding['path'], root=root, expected=binding, max_bytes=binding['bytes'])
        bindings.append(current)
        return raw
    writer = json.loads(read(existing['writerReceipt']))
    publication_raw = read(existing['manifest'])
    manifest = json.loads(publication_raw)
    if (writer.get('status') != 'OFFLINE_PREPARED_OPTICAL_CANDIDATE_PACKAGED' or
            manifest.get('publicationHash') != writer.get('publicationHash') or
            existing['manifest'] not in writer.get('files', []) or recipe_binding not in writer.get('inputs', [])):
        raise ValueError('prepared_native_cache_writer_join_invalid')
    receipt_identity = manifest['processing']['producerReceipt']
    producer_binding = next((b for b in writer['inputs'] if identity(b) == receipt_identity), None)
    if producer_binding is None:
        raise ValueError('prepared_native_cache_producer_receipt_missing')
    producer = json.loads(read(producer_binding))
    if (recipe_binding not in producer['inputs'] or manifest['publicationId'] != recipe['publicationId'] or
            manifest['nominalTan'] != producer['nominalTan'] or
            any(identity(manifest['source'][k]) != identity(recipe[k]) for k in ('encoded', 'metadata', 'registrationEvidence'))):
        raise ValueError('prepared_native_cache_source_or_recipe_join_invalid')
    registration_spec = recipe.get('displayRegistration')
    if registration_spec:
        parent = json.loads(read(registration_spec['parentCandidate']['manifest']))
        registration, _, measured_bindings = admit_display_registration(registration_spec, recipe['encoded'],
            recipe['metadata'], manifest['nominalTan'], parent['publicationHash'], root=root)
        bindings.extend(measured_bindings)
        if manifest.get('registration') != registration or producer.get('registration') != registration:
            raise ValueError('prepared_native_cache_registration_join_invalid')
    elif 'registration' in manifest:
        raise ValueError('prepared_native_cache_undeclared_registration')
    display=recipe.get('denoisedDisplay')or recipe.get('backgroundDisplay')or recipe.get('restoredDisplay')or recipe['sxtDisplay']
    denoised=bool(recipe.get('denoisedDisplay'))
    background=bool(recipe.get('backgroundDisplay')) or denoised
    restored=bool(recipe.get('restoredDisplay'))
    row, reviewed_bindings = (reviewed_denoised_row if denoised else reviewed_background_row if background else reviewed_restored_row if restored else reviewed_sxt_row)(display, recipe['encoded'], root=root)
    bindings.extend(reviewed_bindings)
    separation = manifest['processing'].get('separation')
    before = bool(background and not denoised and manifest['processing'].get('denoising'))
    version='prepared-native-source-denoised-background-display-v1' if before else 'prepared-native-source-background-denoised-display-v1' if denoised else 'prepared-native-source-background-display-v1' if background else 'prepared-native-sxt-ps-restored-display-v1'if restored else 'prepared-native-sxt-display-v1'
    reviewed=manifest['processing'].get('denoising') if denoised else manifest['processing'].get('background') if background else manifest['processing'].get('restoration')if restored else separation
    if (manifest['processing']['producerVersion'] != version or
            producer.get('version') != version or
            separation != producer.get('separation') or
            not reviewed or (restored and reviewed!=producer.get('restoration')) or
            (background and (manifest['processing'].get('background') != producer.get('background') or manifest['processing'].get('restoration') != producer.get('restoration'))) or
            (manifest['processing'].get('denoising') != producer.get('denoising')) or
            reviewed['processingReceipt'] != identity(display['processingReceipt']) or
            reviewed['reviewReceipt'] != identity(display['reviewReceipt']) or
            identity(reviewed['display' if background else 'restored'if restored else 'starless']) != identity(row['outputs']['display.png' if background else 'starless'])):
        raise ValueError('prepared_native_cache_review_join_invalid')
    # Reuse the same current canonical packer instead of a Python hash/contract.
    command = ['node', str(root / 'tools/run-node.cjs'), '--import', 'tsx',
               str(root / 'data-pipelines/deep-sky/pack_prepared_rendered_optical_publication.mts')]
    packed = subprocess.run(command, input=publication_raw, capture_output=True, cwd=root, timeout=60, check=True)
    if json.loads(packed.stdout) != manifest:
        raise ValueError('prepared_native_cache_canonical_manifest_changed')
    with Image.open(io.BytesIO(read(row['input'] if background else row['key']['job']['input']))) as working:
        work_icc = working.info.get('icc_profile')
    for level, asset in manifest['levels'].items():
        binding = next((b for b in writer['files'] if Path(b['path']).name == asset['file'] and identity(b) == identity(asset)), None)
        if binding is None or asset != {k: v for k, v in producer['levels'][level].items()} | {'downloadUrl': asset['downloadUrl']}:
            raise ValueError('prepared_native_cache_level_receipt_invalid')
        raw = read(binding)
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            if (image.mode != 'RGB' or image.format != 'PNG' or image.size != (asset['width'], asset['height']) or
                    image.info.get('icc_profile') != work_icc or buffer_identity(image.tobytes()) != asset['decodedRgb']):
                raise ValueError('prepared_native_cache_encoded_level_invalid')
        if level == 'DETAIL' and raw != read(row['outputs']['display.png' if background else 'starless']):
            raise ValueError('prepared_native_cache_finest_review_pixels_changed')
    for binding in writer['inputs']:
        bindings.append(bound_file(root / binding['path'], root=root, expected=binding))
    for binding in bindings:
        bound_file(root / binding['path'], root=root, expected=binding)
    return manifest, tuple(bindings)


def publish_registered_native_recipe(recipe, recipe_binding, output, *, root):
    """New placement metadata over a verified, unchanged pixel publication."""
    spec = recipe['displayRegistration']
    parent_recipe, parent_recipe_binding = pinned_json(root / spec['parentRecipe']['path'],
        spec['parentRecipe']['sha256'], root=root)
    if (parent_recipe_binding != spec['parentRecipe'] or 'displayRegistration' in parent_recipe or
            {k: v for k, v in recipe.items() if k != 'displayRegistration'} != parent_recipe):
        raise ValueError('prepared_registration_parent_recipe_invalid')
    manifest, parent_bindings = verify_native_candidate(parent_recipe, parent_recipe_binding,
                                                       spec['parentCandidate'], root=root)
    registration, wcs, measured_bindings = admit_display_registration(spec, recipe['encoded'],
        recipe['metadata'], manifest['nominalTan'], manifest['publicationHash'], root=root)
    bindings = [recipe_binding, *parent_bindings, *measured_bindings]
    generation = output.with_name(output.name+'-generation')
    validate_publication_output(output, generation, bindings, root=root)
    if output.exists() or generation.exists():
        raise ValueError('prepared_registration_output_exists')
    owners = [Path(__file__), root/'data-pipelines/deep-sky/prepared_display_registration.py',
              root/'packages/miniapp-contracts/src/prepared-native-optical-publication.ts']
    before = [bound_file(p, root=root) for p in owners]
    payload = {k: v for k, v in manifest.items() if k != 'publicationHash'}
    payload['schemaVersion'] = 'prepared-native-optical-publication-v2'
    payload['registration'] = registration
    payload['levels'] = {name: {k: v for k, v in asset.items() if k != 'downloadUrl'}
                         for name, asset in manifest['levels'].items()}
    width, height = registration['geometry']['sourceWidth'], registration['geometry']['sourceHeight']
    ends = wcs.pixel_to_world([-.5, width-.5], [(height-1)/2]*2)
    field_degrees = float(ends[0].separation(ends[1]).deg)
    products = []
    for level, asset in payload['levels'].items():
        path = (root/spec['parentCandidate']['manifest']['path']).parent/asset['file']
        raw, binding = bound_bytes(path, root=root, expected=asset, max_bytes=asset['bytes'])
        bindings.append(binding)
        products.append(NativeEncodedLevel(level, raw))
        asset['fieldDegrees'] = field_degrees
    # The pixel producer keeps its version/meaning; a new receipt explicitly
    # binds placement and its immutable parent instead of rewriting old facts.
    receipt = {'version': manifest['processing']['producerVersion'], 'inputs': bindings,
               'nominalTan': manifest['nominalTan'], 'registration': registration,
               'levels': payload['levels'], 'parentPublicationHash': manifest['publicationHash'],
               'sourceFullDecodes': 0, 'imageEncodes': 0, 'modelInferenceCalls': 0,
               'downloads': 0, 'masterReprojections': 0, 'astrometricFits': 0,
               'owners': before, 'qualityAdopted': False,
               **{key: manifest['processing'][key] for key in ('separation', 'restoration', 'background', 'denoising')
                  if key in manifest['processing']}}
    generation.mkdir(parents=True, exist_ok=False)
    target = generation/'producer-receipt.json'
    target.write_text(json.dumps(receipt, indent=2, allow_nan=False)+'\n', encoding='utf8')
    receipt_binding = bound_file(target, root=root)
    bindings.append(receipt_binding)
    payload['processing'] = {**manifest['processing'], 'producerReceipt': identity(receipt_binding),
        'modification': manifest['processing']['modification'] +
            ' A separately measured reference TAN now controls display placement; all encoded tiers are reused byte-for-byte. '
            'Original publisher metadata/nominal geometry remain recorded, not silently corrected. This adds no calibrated science or Scene acceptance.'}
    if 'separation' in payload['processing'] and 'SXT star separation uses an AI model.' not in payload['processing']['modification']:
        payload['processing']['modification'] += ' SXT star separation uses an AI model.'
    if 'denoising' in payload['processing'] and 'NXT denoising uses an AI model.' not in payload['processing']['modification']:
        payload['processing']['modification'] += ' NXT denoising uses an AI model.'
    if [bound_file(p, root=root) for p in owners] != before:
        raise ValueError('prepared_registration_owner_changed')
    return publish_prepared_candidate(payload, tuple(products), tuple(bindings), generation, output,
                                      root=root, additional_owners=tuple(owners))


def publish_full_source_batch(batch, manifest_binding, output, *, root):
    """Cheap whole-observation candidates; visual review remains a separate step."""
    entries = batch.get('recipes', [])
    ids = [entry.get('id') for entry in entries]
    if (not entries or any(not isinstance(v, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', v) for v in ids)
            or len(set(ids)) != len(ids)):
        raise ValueError('prepared_native_full_source_batch_ids_invalid')
    if output == root or not output.is_relative_to(root) or output.exists():
        raise ValueError('prepared_native_batch_output_invalid')
    output.mkdir(parents=True, exist_ok=False)
    started = time.perf_counter()
    owner = bound_file(Path(__file__), root=root)
    rows, candidates = [], []
    for entry in entries:
        row = {'id': entry['id'], 'fileReview': 'PENDING_REVIEW', 'sceneAcceptance': 'UNVERIFIED',
               'ordinaryAdoption': False}
        rows.append(row)
        try:
            recipe_file = root / entry['recipe']['path']
            recipe, binding = pinned_json(recipe_file, entry['recipe']['sha256'], root=root)
            if (binding != entry['recipe'] or any(key in recipe for key in
                    ('sxtDisplay', 'restoredDisplay', 'backgroundDisplay', 'denoisedDisplay', 'displayRegistration'))):
                raise ValueError('prepared_native_full_source_recipe_invalid')
            destination = output / entry['id']
            receipt = publish_native_recipe(recipe_file, binding['sha256'], destination, root=root)
            candidate = {'id': entry['id'], 'manifest': bound_file(destination / 'manifest.json', root=root),
                         'writerReceipt': bound_file(destination / 'writer-receipt.json', root=root)}
            candidates.append(candidate)
            row.update(candidate, status='LOCAL_CANDIDATE_PACKAGED', publicationHash=receipt['publicationHash'],
                       newModelInferenceCalls=0, downloads=0, reusedDetail=bool(recipe.get('reuseDetail')))
        except (ValueError, RuntimeError, OSError, KeyError, subprocess.SubprocessError) as error:
            row.update(status='FAILED', error=str(error))
    bound_file(root / manifest_binding['path'], root=root, expected=manifest_binding)
    bound_file(Path(__file__), root=root, expected=owner)
    result = {'schema': 'prepared-native-full-source-batch-result-v1', 'batchReceipt': manifest_binding,
              'implementation': owner, 'rows': rows, 'elapsedSeconds': time.perf_counter() - started,
              'ordinaryAdoption': False, 'meaning': 'Unprocessed local candidates only; no file, Scene, rights or registration acceptance.'}
    inventory = {'schemaVersion': 'prepared-optical-inventory-input-v1', 'candidates': candidates,
                 'decisions': [], 'staticIndexes': []}
    for name, value in (('result.json', result), ('inventory-input.json', inventory)):
        with (output / name).open('x', encoding='utf8') as file:
            json.dump(value, file, indent=2, allow_nan=False); file.write('\n')
    return result


def publish_native_batch(manifest_file, pin, output, *, root):
    """File-reviewed subset into the original publisher; exceptions stay queued."""
    root, output = root.resolve(), output.resolve()
    batch, manifest_binding = pinned_json(manifest_file, pin, root=root)
    if batch.get('schema') == 'prepared-native-full-source-batch-v1':
        return publish_full_source_batch(batch, manifest_binding, output, root=root)
    if batch.get('schema') != 'prepared-native-reviewed-batch-v1':
        raise ValueError('prepared_native_batch_invalid')
    shared = batch['review']
    review, review_binding = pinned_json(root / shared['reviewReceipt']['path'], shared['reviewReceipt']['sha256'], root=root)
    if (review_binding != shared['reviewReceipt'] or not (review.get('schema') == 'sxt-review-queue-v1' or
            review.get('schemaVersion') in ('optical-display-background-review-v1', 'optical-display-denoise-review-v1')) or
            not review.get('rows') or review.get('processingReceipt') != shared['processingReceipt']):
        raise ValueError('prepared_native_batch_review_join_invalid')
    recipes = batch.get('recipes', [])
    by_id = {r['id']: r for r in recipes}
    ids = [r['id'] for r in review['rows']]
    if len(by_id) != len(recipes) or len(set(ids)) != len(ids) or not set(by_id).issubset(ids):
        raise ValueError('prepared_native_batch_duplicate_or_unknown_id')
    if output == root or not output.is_relative_to(root) or output.exists():
        raise ValueError('prepared_native_batch_output_invalid')
    output.mkdir(parents=True, exist_ok=False)
    owners = [Path(__file__), root / 'data-pipelines/deep-sky/reviewed_sxt_display.py',
        root / 'packages/miniapp-contracts/src/prepared-native-optical-publication.ts',
        root / 'data-pipelines/deep-sky/pack_prepared_rendered_optical_publication.mts']
    before = [bound_file(p, root=root) for p in owners]
    bindings, rows = [manifest_binding, review_binding], []
    for selected in review['rows']:
        row = {'id': selected['id'], 'fileReview': selected['status'], 'sceneAcceptance': 'UNVERIFIED',
               'ordinaryAdoption': False}
        rows.append(row)
        if selected['status'] != 'FILE_REVIEW_PASSED_SCENE_PENDING':
            row.update(status='QUEUED_REVIEW_EXCEPTION', reason=selected.get('reason', selected.get('error')))
            continue
        if selected['id'] not in by_id:
            row.update(status='SOURCE_RECIPE_MISSING')
            continue
        entry = by_id[selected['id']]
        try:
            recipe_file = root / entry['recipe']['path']
            recipe, recipe_binding = pinned_json(recipe_file, entry['recipe']['sha256'], root=root)
            bindings.append(recipe_binding)
            if recipe_binding != entry['recipe'] or (recipe.get('denoisedDisplay')or recipe.get('backgroundDisplay')or recipe.get('restoredDisplay')or recipe.get('sxtDisplay')) != shared | {'id': selected['id']}:
                raise ValueError('prepared_native_batch_recipe_review_join_invalid')
            if entry.get('existing'):
                publication, reused_bindings = verify_native_candidate(recipe, recipe_binding, entry['existing'], root=root)
                bindings.extend(reused_bindings)
                row.update(status='REUSED_VERIFIED_LOCAL_CANDIDATE', publicationHash=publication['publicationHash'],
                    manifest=entry['existing']['manifest'], writerReceipt=entry['existing']['writerReceipt'],
                    newSourceDecodes=0, newModelInferenceCalls=0, newImageEncodes=0)
            else:
                destination = output / selected['id']
                receipt = publish_native_recipe(recipe_file, recipe_binding['sha256'], destination, root=root)
                row.update(status='LOCAL_CANDIDATE_PACKAGED', publicationHash=receipt['publicationHash'],
                    manifest=bound_file(destination / 'manifest.json', root=root),
                    writerReceipt=bound_file(destination / 'writer-receipt.json', root=root),
                    newSourceDecodes=0 if recipe.get('displayRegistration') else 1, newModelInferenceCalls=0,
                    **({'newImageEncodes': 0, 'newAstrometricFits': 0} if recipe.get('displayRegistration') else {}))
        except (ValueError, RuntimeError, OSError, KeyError, subprocess.SubprocessError) as error:
            row.update(status='FAILED', error=str(error))
    for binding in bindings:
        bound_file(root / binding['path'], root=root, expected=binding)
    if [bound_file(p, root=root) for p in owners] != before:
        raise RuntimeError('prepared_native_batch_owner_changed')
    result = {'schema': 'prepared-native-reviewed-batch-result-v1', 'batchReceipt': manifest_binding,
        'reviewReceipt': review_binding, 'rows': rows, 'inputs': bindings,
        'implementationBefore': before, 'implementationAfter': before, 'ordinaryAdoption': False,
        'meaning': 'Local candidate creation/reuse only. File review cannot establish Scene quality, source adoption or public deployment.'}
    with (output / 'result.json').open('x', encoding='utf8') as file:
        json.dump(result, file, indent=2, allow_nan=False); file.write('\n')
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--recipe", type=Path)
    parser.add_argument("--recipe-sha256")
    parser.add_argument("--batch", type=Path)
    parser.add_argument("--batch-sha256")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    if args.batch and args.batch_sha256 and not args.recipe and not args.recipe_sha256:
        result = publish_native_batch(args.batch, args.batch_sha256, args.output, root=root)
        failed = sum(row['status'] in ('FAILED', 'SOURCE_RECIPE_MISSING') for row in result['rows'])
        print(json.dumps({'rows': len(result['rows']), 'failed': failed, 'output': str(args.output), 'ordinaryAdoption': False}))
        if failed: raise SystemExit(2)
    elif args.recipe and args.recipe_sha256 and not args.batch and not args.batch_sha256:
        result = publish_native_recipe(args.recipe, args.recipe_sha256, args.output, root=root)
        print(json.dumps({"publicationHash": result["publicationHash"], "output": str(args.output), "qualityAdopted": False, "runtimeRegistered": False}))
    else:
        parser.error('Supply either recipe and pin or batch and pin')
