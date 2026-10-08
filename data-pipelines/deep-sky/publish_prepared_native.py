"""Whole-source candidate tiers, using existing source/byte/packaging owners.

Only linear nominal TAN is supported. No target-centered crop, WCS resampling,
PSF fit, brightness mask, retouching, generated detail or runtime source access.
The explicit recipe supplies source/rights facts; this writer cannot adopt them.
"""
from __future__ import annotations
import argparse
from dataclasses import dataclass
import hashlib
import io
import json
from pathlib import Path
import re
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
from publish_prepared_optical import publish_prepared_candidate


def identity(value: dict) -> dict:
    return {key: value[key] for key in ("bytes", "sha256")}


def buffer_identity(value: bytes) -> dict:
    return {"bytes": len(value), "sha256": hashlib.sha256(value).hexdigest()}


@dataclass(frozen=True)
class NativeEncodedLevel:
    level: str
    encoded_bytes: bytes


def publish_native_recipe(recipe_file: Path, pin: str, output: Path, *, root: Path) -> dict:
    started = time.perf_counter()
    root, output = root.resolve(), output.resolve()
    owners = [Path(__file__), root / "data-pipelines/deep-sky/prepared_rgb_observation.py",
        root / "data-pipelines/deep-sky/optical_publication_io.py", root / "data-pipelines/deep-sky/requirements.txt",
        root / "packages/miniapp-contracts/src/prepared-native-optical-publication.ts",
        root / "packages/miniapp-contracts/src/celestial-identity.ts"]
    owner_before = [bound_file(path, root=root) for path in owners]
    recipe, recipe_binding = pinned_json(recipe_file, pin, root=root)
    if (not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", recipe.get("publicationId", "")) or
            recipe.get("format") not in ("jpeg", "png") or recipe.get("adapter") not in ("publisher-avm", "companion-fits")):
        raise RuntimeError("prepared_native_recipe_invalid")
    if not output.is_relative_to(root) or output.exists():
        raise RuntimeError("prepared_native_output_invalid")
    receipt_dir = output.with_name(output.name + "-generation")
    if receipt_dir.exists():
        raise RuntimeError("prepared_native_generation_exists")
    bindings = [recipe_binding]
    def read(record: dict) -> bytes:
        raw, binding = bound_bytes(root / record["path"], root=root, expected=record, max_bytes=record["bytes"])
        bindings.append(binding)
        return raw
    source_raw = read(recipe["encoded"])
    metadata_raw = read(recipe["metadata"])
    evidence_raw = read(recipe["registrationEvidence"])
    evidence = json.loads(evidence_raw)
    s = recipe["source"]
    with Image.open(io.BytesIO(source_raw)) as source_image:
        if source_image.format != "JPEG" or source_image.mode != "RGB":
            raise RuntimeError("prepared_native_rgb_source_invalid")
        width, height = source_image.size
        icc = source_image.info.get("icc_profile")
        source_rgb = source_image.tobytes() if recipe["adapter"] == "companion-fits" else None
    if recipe["adapter"] == "publisher-avm":
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
    rgb = Image.frombytes("RGB", (width, height), source_rgb)
    widths = recipe["levelWidths"]
    if (not isinstance(widths, list) or len(widths) != 3 or any(type(v) is not int or v <= 1 or v > width for v in widths) or
            not widths[0] < widths[1] < widths[2]):
        raise RuntimeError("prepared_native_level_widths_invalid")
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
        if level == "DETAIL" and reused_raw is not None:
            encoded = reused_raw
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
    receipt = {"version": "prepared-native-full-source-v1", "inputs": bindings, "nominalTan": geometry,
        "levels": assets, "reusedDetail": reused is not None, "sourceFullDecodes": 1,
        "masterReprojections": 0, "downloads": 0, "libraries": {"Pillow": pillow_version, "astropy": astropy.__version__, "numpy": np.__version__},
        "owners": owner_before, "elapsedSeconds": time.perf_counter() - started,
        "scientificAvailability": "UNKNOWN", "qualityAdopted": False}
    receipt_dir.mkdir(parents=True, exist_ok=False)
    receipt_file = receipt_dir / "producer-receipt.json"
    receipt_file.write_text(json.dumps(receipt, indent=2, allow_nan=False) + "\n", encoding="utf8")
    receipt_binding = bound_file(receipt_file, root=root)
    bindings.append(receipt_binding)
    payload = {"schemaVersion": "prepared-native-optical-publication-v1", "imageVersion": "prepared-native-optical-v1",
        "publicationId": recipe["publicationId"], "reference": recipe["subject"]["reference"], "subject": recipe["subject"], "nominalTan": geometry,
        "source": {key: s[key] for key in ("resourceId", "sourceUrl", "metadataReferenceUrl", "credit", "license", "licenseUrl", "policyUrl", "colourMeaning")},
        "processing": {"runtimeNetwork": "forbidden", "producerVersion": "prepared-native-full-source-v1", "producerReceipt": identity(receipt_binding),
            "resampling": "whole-source-LANCZOS", "colourUnit": "published-encoded-RGB", "alphaMeaning": "opaque-full-source-rectangle",
            "scientificAvailability": "UNKNOWN", "sourceResolution": "UNKNOWN",
            "modification": "Starward retains the complete published RGB rectangle and nominal linear TAN. Tiers use whole-source LANCZOS downsampling. " +
                ("The bound existing finest encoded product is reused. " if reused else "") +
                "No crop, brightness mask, retouching, PSF correction, generated detail or new calibrated science is supplied.",
            "coverage": recipe["coverage"]}, "levels": assets}
    payload["source"].update(encoded=identity(recipe["encoded"]) | {"format": "jpeg"},
        decodedRgb=buffer_identity(source_rgb) | {"width": width, "height": height, "rowOrder": "top-first"},
        metadata=identity(recipe["metadata"]) | {"kind": recipe["adapter"], "sourceUrl": recipe["metadataSourceUrl"]},
        registrationEvidence=identity(recipe["registrationEvidence"]), iccProfile=buffer_identity(icc) if icc else None)
    for binding in bindings:
        bound_file(root / binding["path"], root=root, expected=binding)
    if [bound_file(path, root=root) for path in owners] != owner_before:
        raise RuntimeError("prepared_native_owner_changed")
    return publish_prepared_candidate(payload, tuple(products), tuple(bindings), receipt_dir, output, root=root,
        additional_owners=tuple(owners))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--recipe", type=Path, required=True)
    parser.add_argument("--recipe-sha256", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = publish_native_recipe(args.recipe, args.recipe_sha256, args.output, root=Path(__file__).resolve().parents[2])
    print(json.dumps({"publicationHash": result["publicationHash"], "output": str(args.output), "qualityAdopted": False, "runtimeRegistered": False}))
