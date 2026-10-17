"""Offline image structure admission and byte-bound review diagnostics.

Display statistics never establish scientific coverage or a quality pass. The
same owner serves survey JPEGs and source-bound PNGs; source adapters retain
their own rights, registration, sampling and immutable-publication contracts.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import html
import os
from pathlib import Path
from typing import Any

from PIL import Image

QUALITY_VERSION = "sky-image-quality-review-v2"
LEVELS = ("OVERVIEW", "MEDIUM", "DETAIL")


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def checked_image(raw: bytes, pixels: int, image_format: str):
    """Decode the complete image, including paths that otherwise inspect a header."""
    if not isinstance(pixels, int) or isinstance(pixels, bool) or pixels <= 0:
        raise RuntimeError("image_quality_pixels_invalid")
    if image_format.upper() == "PNG":
        # Keep the encoded 8-bit RGBA contract required by the serving owner.
        # Pillow can load all pixels even when a PNG's IEND is missing.
        if (len(raw) < 45 or raw[:8] != b"\x89PNG\r\n\x1a\n" or raw[12:16] != b"IHDR" or
                raw[24:26] != b"\x08\x06" or raw[-12:] != b"\x00\x00\x00\x00IEND\xaeB\x60\x82"):
            raise RuntimeError("image_quality_encoded_container_invalid")
    elif image_format.upper() == "JPEG" and (raw[:2] != b"\xff\xd8" or raw[-2:] != b"\xff\xd9"):
        raise RuntimeError("image_quality_encoded_container_invalid")
    try:
        with Image.open(io.BytesIO(raw)) as image:
            if image.format != image_format.upper() or image.size != (pixels, pixels):
                raise RuntimeError("image_quality_encoded_geometry_invalid")
            image.verify()
        # verify() checks the PNG chunk checksums, but decoding is a separate
        # operation; both are needed before trusting the display bytes.
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            return image.convert("RGBA")
    except (OSError, SyntaxError) as error:
        raise RuntimeError("image_quality_encoded_container_invalid") from error


def checked_source_files(directory: Path, records: list[dict], expected_paths: set[str],
                         expected_count: int) -> list[dict]:
    """A missing acquisition is UNKNOWN, never a source NONFINITE sample.

    Require the complete planned set before any scientific mask can be made.
    A source-specific reader must still verify the actual scientific array.
    """
    directory = directory.resolve()
    if not expected_paths or expected_count != len(expected_paths) or len(records) != expected_count:
        raise RuntimeError("image_quality_source_set_incomplete")
    paths = [record.get("path") for record in records]
    if len(set(paths)) != len(paths) or set(paths) != expected_paths:
        raise RuntimeError("image_quality_source_set_incomplete")
    result = []
    for record in records:
        if record.get("state") != "CHECKED" or record.get("receipt", {}).get("completeArrayReceived") is not True:
            raise RuntimeError("image_quality_source_input_unavailable")
        path = (directory / record["path"]).resolve()
        if not path.is_relative_to(directory):
            raise RuntimeError("image_quality_source_path_invalid")
        raw = path.read_bytes()
        if len(raw) != record.get("bytes") or digest(raw) != record.get("sha256"):
            raise RuntimeError("image_quality_source_bytes_changed")
        result.append({**record, "sha256": digest(raw), "bytes": len(raw)})
    return result


def checked_geometry(entry: dict, asset: dict, row: dict | None, level: str) -> dict:
    center = entry.get("center", {})
    ra, dec, field, pixels = center.get("raDeg"), center.get("decDeg"), asset.get("fieldDegrees"), asset.get("pixels")
    if (center.get("frame") != "ICRS J2000" or not number(ra) or not 0 <= ra < 360 or
            not number(dec) or not -90 <= dec <= 90 or not number(field) or not 0 < field < 180 or
            not isinstance(pixels, int) or isinstance(pixels, bool) or pixels <= 0 or
            entry.get("orientation") != "north-up/east-left"):
        raise RuntimeError("image_quality_registration_invalid")
    if row is not None and (entry.get("objectRef") != row.get("objectRef") or
            not number(row.get("raDeg")) or not number(row.get("decDeg")) or
            abs(ra - row["raDeg"]) > 1e-7 or abs(dec - row["decDeg"]) > 1e-7):
        raise RuntimeError("image_quality_catalog_identity_mismatch")
    extent = None
    wcs = asset.get("wcsHeader")
    if wcs is not None:
        expected_step = math.degrees(2 * math.tan(math.radians(field) / 2) / pixels)
        if (not isinstance(wcs, dict) or wcs.get("CTYPE1") != "RA---TAN" or wcs.get("CTYPE2") != "DEC--TAN" or
                wcs.get("RADESYS") != "ICRS" or
                any(not number(wcs.get(key)) for key in ("CRPIX1", "CRPIX2", "CRVAL1", "CRVAL2", "CDELT1", "CDELT2")) or
                abs(wcs["CRVAL1"] - ra) > 1e-7 or abs(wcs["CRVAL2"] - dec) > 1e-7 or
                abs(wcs["CDELT1"] + expected_step) > 1e-12 or abs(wcs["CDELT2"] - expected_step) > 1e-12):
            raise RuntimeError("image_quality_wcs_geometry_mismatch")
        if (any(wcs.get(key, "deg") != "deg" for key in ("CUNIT1", "CUNIT2")) or
                any(key in wcs and (not number(wcs[key]) or abs(wcs[key] - expected) > 1e-12)
                    for key, expected in (("PC1_1", 1), ("PC1_2", 0), ("PC2_1", 0), ("PC2_2", 1),
                                          ("CD1_1", -expected_step), ("CD1_2", 0), ("CD2_1", 0), ("CD2_2", expected_step),
                                          ("CROTA1", 0), ("CROTA2", 0), ("WCSAXES", 2),
                                          ("LONPOLE", 180), ("LATPOLE", dec))) or
                any(key.startswith(("PC", "CD")) and key not in (
                    "PC1_1", "PC1_2", "PC2_1", "PC2_2", "CD1_1", "CD1_2", "CD2_1", "CD2_2", "CDELT1", "CDELT2") for key in wcs) or
                any(key.startswith(("A_", "B_", "AP_", "BP_", "PV", "CPDIS", "DP", "D2IM")) for key in wcs)):
            raise RuntimeError("image_quality_wcs_transform_unsupported")
        if asset.get("source", {}).get("processingService") == "Starward HiPS TAN" and (
                wcs["CRPIX1"] != pixels / 2 or wcs["CRPIX2"] != pixels / 2):
            raise RuntimeError("image_quality_wcs_geometry_mismatch")
    if row is not None:
        major, minor, angle = row.get("majorAxisArcmin"), row.get("minorAxisArcmin"), row.get("positionAngleDeg")
        if any(value is not None and (not number(value) or value <= 0) for value in (major, minor)):
            raise RuntimeError("image_quality_catalog_extent_invalid")
        if angle is not None and not number(angle):
            raise RuntimeError("image_quality_catalog_extent_invalid")
        if major is not None:
            if minor is not None and angle is not None:
                theta = math.radians(angle)
                width = math.hypot(major * math.sin(theta), minor * math.cos(theta))
                height = math.hypot(major * math.cos(theta), minor * math.sin(theta))
                method = "catalog-isophotal-ellipse-axis-bound"
            else:
                width = height = major
                method = "catalog-major-axis-conservative-bound"
            fits = max(width, height) <= field * 60
            extent = {"meaning": method, "widthArcmin": width, "heightArcmin": height,
                      "fullFieldContainsBound": fits,
                      "limits": "Catalog extent is not a measured footprint in this survey band or a pixel-quality mask."}
            # Overview must geometrically contain the declared target bound;
            # narrower refinements are intentionally crops and remain allowed.
            if level == "OVERVIEW" and not fits:
                raise RuntimeError("image_quality_overview_target_cropped")
    return {"center": center, "orientation": entry["orientation"], "fieldDegrees": field,
            "pixels": pixels, "displaySampleArcsec": field * 3600 / pixels,
            "wcsHeader": wcs, "catalogExtent": extent,
            "registrationEvidence": "PUBLISHED_HEADER_GEOMETRY_CHECKED_ABSOLUTE_ASTROMETRY_UNVERIFIED" if wcs else "PUBLISHED_CENTER_FIELD_ONLY_PRECISE_WCS_UNVERIFIED"}


def _region_statistics(rgb, alpha, bounds):
    import numpy as np
    x0, y0, x1, y1 = bounds
    color, a = rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1]
    luma = color @ np.array([.2126, .7152, .0722])
    supported = a > 0
    return {"bounds": list(bounds), "pixels": int(a.size), "supportedPixels": int(supported.sum()),
            "supportedLuminancePercentiles": [float(v) for v in np.percentile(luma[supported], [0, 1, 25, 50, 75, 99, 100])] if supported.any() else None,
            "luminancePercentiles": [float(v) for v in np.percentile(luma, [0, 1, 25, 50, 75, 99, 100])],
            "rgbZeroPixels": int(np.all(color == 0, axis=2).sum()),
            "anyChannel255Pixels": int(np.any(color == 255, axis=2).sum()),
            "alphaZeroPixels": int((a == 0).sum()),
            "opaqueRgbZeroPixels": int(((a == 255) & np.all(color == 0, axis=2)).sum())}


def support_boundary_diagnostics(rgba) -> dict:
    """Locate displayed-source edges inside a raster, never infer science from RGB.

    Raster crop edges and internal alpha boundaries are separate. Eight pixel
    bands are diagnostic distances, not a proposed feather/black-point policy.
    """
    import numpy as np
    alpha = rgba[:, :, 3]
    support = alpha > 0
    luma = rgba[:, :, :3].astype(np.float64) @ np.array([.2126, .7152, .0722])
    contribution = luma * (alpha.astype(np.float64) / 255)
    boundary = np.zeros_like(support)
    boundary[1:] |= support[1:] & ~support[:-1]
    boundary[:-1] |= support[:-1] & ~support[1:]
    boundary[:, 1:] |= support[:, 1:] & ~support[:, :-1]
    boundary[:, :-1] |= support[:, :-1] & ~support[:, 1:]
    crop = np.zeros_like(support)
    crop[0] = support[0]; crop[-1] = support[-1]
    crop[:, 0] |= support[:, 0]; crop[:, -1] |= support[:, -1]
    def percentiles(values):
        return [float(v) for v in np.percentile(values, [0, 25, 50, 75, 95, 100])] if values.size else None
    visited = boundary.copy()
    band = boundary.copy()
    bands = []
    for distance in range(8):
        bands.append({"distancePixels": distance, "pixels": int(band.sum()),
                      "encodedLumaPercentiles": percentiles(luma[band]),
                      "alphaWeightedContributionPercentiles": percentiles(contribution[band])})
        adjacent = band.copy()
        adjacent[1:] |= band[:-1]; adjacent[:-1] |= band[1:]
        adjacent[:, 1:] |= band[:, :-1]; adjacent[:, :-1] |= band[:, 1:]
        band = adjacent & support & ~visited
        visited |= band
    return {"supportedPixels": int(support.sum()), "internalBoundaryPixels": int(boundary.sum()),
            "internalBoundaryContributionPercentiles": percentiles(contribution[boundary]),
            "rasterCropSupportedPixels": int(crop.sum()), "rasterCropContributionPercentiles": percentiles(contribution[crop]),
            "interiorBands": bands,
            "meaning": "Encoded display contribution at alpha support/crop edges. Neither brightness nor alpha proves physical sky, scientific sample supply, a seam defect or a background-removal recipe."}


def inspect_image(raw: bytes, entry: dict, level: str, asset: dict, *, source: dict,
                  processing: dict, row: dict | None = None, expected_finite=None) -> dict:
    """Admission rejects objective mismatch; image appearance goes to review."""
    import numpy as np
    if len(raw) != asset.get("bytes") or digest(raw) != asset.get("sha256"):
        raise RuntimeError("image_quality_asset_bytes_changed")
    direct_source = asset.get("source", {})
    if direct_source.get("processingService") == "CDS hips2fits" and (
            ("responseSha256" in direct_source and direct_source["responseSha256"] != digest(raw)) or
            ("responseBytes" in direct_source and direct_source["responseBytes"] != len(raw))):
        # This adapter stores the JPEG response without edits. Derived PNG
        # source-tile receipts are a different identity and are not compared.
        raise RuntimeError("image_quality_response_receipt_mismatch")
    geometry = checked_geometry(entry, asset, row, level)
    image_format = asset.get("imageFormat", asset.get("format", "jpeg"))
    rgba = np.asarray(checked_image(raw, asset["pixels"], image_format))
    rgb, alpha = rgba[:, :, :3], rgba[:, :, 3]
    coverage = {"scientificValidity": "UNKNOWN", "sampleAvailability": "UNKNOWN",
                "meaning": "Encoded brightness and JPEG extrema do not measure scientific coverage."}
    declared = asset.get("sourceFiniteMask")
    if expected_finite is not None:
        finite = np.asarray(expected_finite)
        if image_format != "png" or finite.dtype != np.bool_ or finite.shape != alpha.shape:
            raise RuntimeError("image_quality_scientific_mask_invalid")
        if not np.array_equal(alpha, finite.astype(np.uint8) * 255):
            raise RuntimeError("image_quality_scientific_mask_changed")
        if not declared or declared.get("kind") != "NONFINITE_HIPS_SAMPLES" or (
                declared.get("finitePixels") != int(finite.sum()) or
                declared.get("missingPixels") != int((~finite).sum())):
            raise RuntimeError("image_quality_scientific_mask_count_changed")
        coverage = {"scientificValidity": "UNKNOWN", "sampleAvailability": "SOURCE_NONFINITE_SAMPLES_VERIFIED",
                    "finiteSamples": int(finite.sum()), "nonfiniteSamples": int((~finite).sum()),
                    "meaning": "Only complete source-selected finite/nonfinite samples; artifacts, depth and confidence remain unmeasured."}
    elif declared is not None:
        if image_format != "png" or declared.get("kind") != "NONFINITE_HIPS_SAMPLES" or (
                declared.get("finitePixels") != int((alpha == 255).sum()) or
                declared.get("missingPixels") != int((alpha == 0).sum()) or np.any((alpha != 0) & (alpha != 255))):
            raise RuntimeError("image_quality_declared_mask_changed")
        coverage = {"scientificValidity": "UNKNOWN", "sampleAvailability": "DECLARED_NONFINITE_SAMPLES_ONLY",
                    "declaredFiniteSamples": declared["finitePixels"], "declaredNonfiniteSamples": declared["missingPixels"],
                    "meaning": "Published alpha/count correspondence checked; source arrays were not reconstructed in this batch."}
    elif expected_finite is None and image_format == "png":
        coverage["meaning"] = "Image alpha has no supplied scientific-sample provenance; it is not a coverage certificate."

    if entry.get("schemaVersion") == "prepared-observation-optical-publication-v1":
        actual_counts = {"opaque": int((alpha == 255).sum()), "partial": int(((alpha > 0) & (alpha < 255)).sum()), "zero": int((alpha == 0).sum())}
        if (image_format != "png" or asset.get("displayAlpha") != "geometric-source-area" or
                asset.get("alphaPixels") != actual_counts or np.any(rgb[alpha == 0] != 0)):
            raise RuntimeError("image_quality_geometric_alpha_count_mismatch")
        coverage.update(displayAlpha="DECLARED_GEOMETRIC_ALPHA_COUNTS_CHECKED",
                        meaning="Byte-bound level alpha counts/display role only; raw/master reprojection and scientific coverage are not verified by this review.")

    n = asset["pixels"]
    luma = rgb.astype(np.float64) @ np.array([.2126, .7152, .0722])
    quarter = n // 4
    regions = {"full": _region_statistics(rgb, alpha, (0, 0, n, n)),
               "centralHalf": _region_statistics(rgb, alpha, (quarter, quarter, n - quarter, n - quarter))}
    row_medians = np.median(luma, axis=1)
    col_medians = np.median(luma, axis=0)
    def jumps(values):
        delta = np.abs(np.diff(values))
        indices = np.argsort(delta, kind="stable")[-min(5, len(delta)):][::-1]
        return [{"between": [int(i), int(i + 1)], "medianDifference": float(delta[i])} for i in indices]
    def edge_statistics(values):
        return {"median": float(np.median(values)), "mean": float(np.mean(values))}
    edges = {"top": edge_statistics(luma[0]), "bottom": edge_statistics(luma[-1]),
             "left": edge_statistics(luma[:, 0]), "right": edge_statistics(luma[:, -1])}
    laplacian = luma[1:-1, :-2] + luma[1:-1, 2:] + luma[:-2, 1:-1] + luma[2:, 1:-1] - 4 * luma[1:-1, 1:-1]
    # The chroma profile can locate a stripe for inspection. It neither removes
    # astronomical colour nor labels a survey artifact without source evidence.
    red_excess = rgb[:, :, 0].astype(np.float64) - (rgb[:, :, 1].astype(np.float64) + rgb[:, :, 2]) / 2
    red_row = np.median(red_excess, axis=1)
    red_col = np.median(red_excess, axis=0)
    boundaries = np.linspace(0, n, min(8, n) + 1, dtype=int)
    cells = []
    for y0, y1 in zip(boundaries[:-1], boundaries[1:]):
        for x0, x1 in zip(boundaries[:-1], boundaries[1:]):
            color = rgb[y0:y1, x0:x1]
            cells.append({"bounds": [int(x0), int(y0), int(x1), int(y1)],
                          "luminanceMean": float(np.mean(luma[y0:y1, x0:x1])),
                          "redChromaMean": float(np.mean(red_excess[y0:y1, x0:x1])),
                          "rgbZeroPixels": int(np.all(color == 0, axis=2).sum()),
                          "anyChannel255Pixels": int(np.any(color == 255, axis=2).sum())})
    review = ["DISPLAY_METRICS_REQUIRE_REVIEW"]
    support_edges = support_boundary_diagnostics(rgba)
    if support_edges["internalBoundaryPixels"]:
        review.append("INTERNAL_DISPLAY_SUPPORT_BOUNDARY_REQUIRES_REVIEW")
    if coverage["sampleAvailability"] == "UNKNOWN":
        review.append("SOURCE_SAMPLE_AVAILABILITY_UNKNOWN")
    elif coverage["sampleAvailability"] == "DECLARED_NONFINITE_SAMPLES_ONLY":
        review.append("SOURCE_ARRAY_RECONSTRUCTION_NOT_PERFORMED")
    extent = geometry["catalogExtent"]
    if extent is not None and not extent["fullFieldContainsBound"]:
        review.append("REFINEMENT_FIELD_CROPS_CATALOG_EXTENT")
    return {"version": QUALITY_VERSION, "objectRef": entry["objectRef"], "level": level,
            "admission": "STRUCTURE_ACCEPTED_QUALITY_UNVERIFIED", "asset": {
                "file": asset.get("file"), "sha256": digest(raw), "bytes": len(raw),
                "format": image_format, "requestUrl": asset.get("requestUrl")},
            "geometry": geometry, "source": source, "processing": processing,
            "coverage": coverage, "regions": regions,
            "displayDiagnostics": {"meaning": "Statistics of encoded display bytes, not photometry, science validity or a resolution pass.",
                "edges": edges, "supportBoundary": support_edges, "rowMedianJumps": jumps(row_medians), "columnMedianJumps": jumps(col_medians),
                "laplacianVariance": float(np.var(laplacian)) if laplacian.size else None,
                "cells": cells,
                "redChromaRowPeak": {"index": int(np.argmax(red_row)), "median": float(np.max(red_row))},
                "redChromaColumnPeak": {"index": int(np.argmax(red_col)), "median": float(np.max(red_col))}},
            "review": review}


def publication_report(manifest_path: Path, catalog_rows: list[dict]) -> dict:
    """Read-only AllWISE, SDSS and Prepared display review, not source admission."""
    raw = manifest_path.read_bytes()
    manifest = json.loads(raw)
    rows = {row["objectRef"]: row for row in catalog_rows}
    entries = manifest.get("entries")
    if entries is None and manifest.get("schemaVersion") in (
            "sdss-dr17-m51-optical-publication-v1", "sdss-dr17-target-optical-publication-v1", "prepared-observation-optical-publication-v1"):
        entries = [manifest]
    if not isinstance(entries, list) or not entries:
        raise RuntimeError("image_quality_publication_shape_invalid")
    if "entryCount" in manifest and manifest["entryCount"] != len(entries):
        raise RuntimeError("image_quality_publication_count_invalid")
    reports = []
    directory = manifest_path.resolve().parent
    seen = set()
    for entry in entries:
        reference = entry.get("objectRef")
        if reference in seen or reference not in rows or set(entry.get("levels", {})) != set(LEVELS):
            raise RuntimeError("image_quality_publication_identity_invalid")
        seen.add(reference)
        previous_sample = None
        for level in LEVELS:
            asset = entry["levels"][level]
            path = (directory / asset["file"]).resolve()
            if not path.is_relative_to(directory):
                raise RuntimeError("image_quality_asset_path_invalid")
            report = inspect_image(path.read_bytes(), entry, level, asset, row=rows[reference],
                                   source={"publication": manifest["source"], "asset": asset.get("source")},
                                   processing={"publication": manifest["processing"], "stretch": asset.get("stretch")})
            sample = report["geometry"]["displaySampleArcsec"]
            if previous_sample is not None and sample > previous_sample + 1e-12:
                raise RuntimeError("image_quality_refinement_resolution_reversed")
            previous_sample = sample
            reports.append(report)
    return {"version": QUALITY_VERSION, "scope": "Offline structure and display review only; no pixels changed or quality/target acceptance.",
            "manifest": {"path": str(manifest_path), "sha256": digest(raw), "bytes": len(raw),
                         "publicationId": manifest.get("publicationId"), "schemaVersion": manifest.get("schemaVersion")},
            "reports": reports}


def write_report(path: Path, result: dict) -> None:
    """Reports are task/build artifacts, separate from immutable publications."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as output:
        output.write(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n")


def saved_display_review(processing, processing_binding, decisions_path, directory, *, root,
                         schema, key_for_row, outputs_for_row, verify_row, meaning):
    """Shared saved-display quality decisions and independent exception queue.

    The pixel owner supplies its key/output mapping and hard verifier. This
    owner seals review state, evidence, per-row failure and retained readback.
    It never decides visual quality from a metric or executes processing.
    """
    from optical_publication_io import bound_bytes, bound_file
    rows = processing.get('rows')
    if not rows: raise ValueError('saved_display_empty_processing')
    raw, decision_binding = bound_bytes(decisions_path, root=root, max_bytes=8 * 1024 * 1024) if decisions_path else (None, None)
    saved = json.loads(raw) if raw else {'processingReceipt': processing_binding, 'decisions': []}
    ids = [r['id'] for r in rows]
    if (saved['processingReceipt'] != processing_binding or len(ids) != len(set(ids)) or
            any(d['id'] not in ids for d in saved['decisions']) or
            len({d['id'] for d in saved['decisions']}) != len(saved['decisions'])):
        raise ValueError('saved_display_review_identity_invalid')
    directory.mkdir(parents=True, exist_ok=False)
    reviewed_rows, retained = [], [processing_binding] + ([decision_binding] if decision_binding else [])
    for row in rows:
        reviewed = {'id': row['id'], 'status': 'HARD_CHECK_FAILED', 'outputs': outputs_for_row(row),
            'processingKeySha256': key_for_row(row), 'sceneAcceptance': 'MISSING', 'ordinaryAdoption': False}
        reviewed_rows.append(reviewed)
        try:
            retained.extend(verify_row(row)); reviewed['status'] = 'PENDING_FILE_REVIEW'
            decision = next((d for d in saved['decisions'] if d['id'] == row['id']), None)
            if decision:
                if (decision['processingKeySha256'] != reviewed['processingKeySha256'] or
                        decision['outputs'] != reviewed['outputs'] or not decision['reason'].strip() or
                        not decision.get('evidence') or
                        decision['status'] not in ('FILE_REVIEW_PASSED_SCENE_PENDING', 'NEEDS_REPAIR')):
                    raise ValueError('saved_display_review_decision_invalid')
                retained.extend(bound_file(root / b['path'], root=root, expected=b) for b in decision['evidence'])
                reviewed.update(status=decision['status'], reason=decision['reason'])
        except (ValueError, RuntimeError, OSError, KeyError, TypeError) as error:
            reviewed.update(status='HARD_CHECK_FAILED', error=str(error))
    for b in retained: bound_file(root / b['path'], root=root, expected=b)
    result = {'schemaVersion': schema, 'processingReceipt': processing_binding, 'decisionReceipt': decision_binding,
        'rows': reviewed_rows, 'inputs': retained, 'ordinaryAdoption': False, 'meaning': meaning}
    write_report(directory / 'review.json', result)
    return result


def processing_review(processing_path: Path, directory: Path, *, root: Path,
                      decisions_path: Path | None = None) -> dict:
    """One review/exception queue for a whole SXT batch, including failed rows.

    File checks and display-change statistics do not decide structural fidelity.
    Explicit review decisions bind the exact row key and complete outputs; a
    passed file remains pending actual Scene acceptance and publication.
    """
    import numpy as np
    from PIL import ImageDraw
    from optical_publication_io import bound_bytes, bound_file
    from sxt_processing import validate_job, checked_work_image
    root, directory = root.resolve(), directory.resolve()
    if directory.exists() or directory == root or not directory.is_relative_to(root):
        raise ValueError('image_review_output_must_be_new_directory_under_root')
    raw, processing_binding = bound_bytes(processing_path, root=root, max_bytes=8 * 1024 * 1024)
    processing = json.loads(raw)
    if processing.get('schemaVersion') == 'optical-display-background-batch-result-v1':
        from reviewed_background_display import review_background_batch
        return review_background_batch(processing, processing_binding, decisions_path, directory, root=root)
    if processing.get('schemaVersion') == 'background-display-nxt-trial-result-v1':
        from reviewed_denoised_display import review_denoise_batch
        return review_denoise_batch(processing, processing_binding, decisions_path, directory, root=root)
    nxt_trial=processing.get('status')=='NATIVE_NXT_GRAIN_TRIAL_PIXELS_VERIFIED_VISUAL_PENDING'
    if nxt_trial:
        from nxt_review import review_processing
        processing=review_processing(processing,processing_binding,root=root)
    if (processing.get('schema')!='sxt-processing-v1' and not(nxt_trial and processing.get('schema')=='nxt-processing-v1')) or not processing.get('rows'):
        raise ValueError('image_review_processing_receipt_invalid')
    if len({r['id'] for r in processing['rows']}) != len(processing['rows']):
        raise ValueError('image_review_duplicate_id')
    decisions, decision_binding = {}, None
    if decisions_path:
        decision_raw, decision_binding = bound_bytes(decisions_path, root=root, max_bytes=8 * 1024 * 1024)
        saved = json.loads(decision_raw)
        if saved.get('processingReceipt') != processing_binding:
            raise ValueError('image_review_decisions_for_different_receipt')
        for decision in saved['decisions']:
            if decision['id'] in decisions or decision['id'] not in {r['id'] for r in processing['rows']}:
                raise ValueError('image_review_decision_id_invalid')
            decisions[decision['id']] = decision
    directory.mkdir(parents=True, exist_ok=False)
    rows, cards = [], []
    for processed in processing['rows']:
        sid = processed['id']
        row = {'id': sid, 'processingStatus': processed['status'], 'status': 'HARD_CHECK_FAILED',
               'processingKeySha256': digest(json.dumps(processed['key'], sort_keys=True).encode()),
               'outputs': processed.get('outputs'), 'sceneAcceptance': 'MISSING',
               'scientificValidity': 'UNKNOWN', 'absoluteRegistration': 'UNVERIFIED'}
        rows.append(row)
        try:
            if processed['status'] != 'PROCESSED_PENDING_REVIEW':
                raise RuntimeError(processed.get('error', 'image_processing_incomplete'))
            job = processed['key']['job']
            size = tuple(job['outputSize'])
            factor = 2 if processed['key']['method'] == 'sxt-upsample' else 1
            validate_job(job, root=root, factor=factor)
            for binding in processed['outputs'].values():
                bound_file(root / binding['path'], root=root, expected=binding)
            layers = processed['outputs']
            checked_work_image(root / layers['starless']['path'], layers['starless'], size, root=root)
            for layer in ('vendorStarless', 'vendorStars'):
                encoded, _ = bound_bytes(root / layers[layer]['path'], root=root,
                    expected=layers[layer], max_bytes=layers[layer]['bytes'])
                with Image.open(io.BytesIO(encoded)) as image:
                    image.verify()
                with Image.open(io.BytesIO(encoded)) as image:
                    image.load()
                    if image.mode != 'RGB' or image.size != tuple(v * factor for v in size):
                        raise ValueError('image_review_vendor_geometry_changed')
            def load(binding, target_size):
                encoded, _ = bound_bytes(root / binding['path'], root=root,
                    expected=binding, max_bytes=binding['bytes'])
                with Image.open(io.BytesIO(encoded)) as image:
                    image.load()
                    if image.mode != 'RGB':
                        raise ValueError('image_review_rgb_contract_changed')
                    return image.copy() if image.size == target_size else image.resize(target_size, Image.Resampling.LANCZOS)
            original = load(job['input'], size)
            starless = load(layers['starless'], size)
            stars = load(layers['vendorStars'], size)
            if original.info.get('icc_profile') != starless.info.get('icc_profile'):
                raise ValueError('image_review_icc_changed')
            if 'restoration' in job:
                from photoshop_original_restore import validate_restoration_output
                proof=validate_restoration_output(job,layers,root)
                if processed.get('restorationProof')!=proof:
                    raise ValueError('image_review_restoration_proof_changed')
                row['restorationProof']=proof
                row['localRestoration']=job['restoration']
            if 'denoising' in job:
                from nxt_review import validate_review_row
                proof=validate_review_row(job,layers,root=root)
                if proof!=processed.get('denoisingProof'):
                    raise ValueError('image_review_denoising_proof_changed')
                row['denoisingProof']=proof
                row['localDenoising']=job['denoising']
                row['publicationContract']=processed['publicationContract']
            rgb, after = np.asarray(original), np.asarray(starless)
            opaque = np.full((size[1], size[0]), 255, dtype='uint8')
            if 'coverage' in job:
                from covered_rgb_display import validate_covered_output, covered_source, image_from_binding, covered_pixels
                validate_covered_output(job, layers, root)
                if processed.get('coverageProof') != covered_pixels(job,layers['starless'],root)[2]:
                    raise ValueError('image_review_coverage_proof_changed')
                _, source_pixels, _ = covered_source(job['coverage'], size, root)
                covered = image_from_binding(layers['coveredStarless'], root)
                opaque = source_pixels[:,:,3]
                # Review actual source support, not the opaque model canvas.
                # Hidden original RGB remains in its immutable source file.
                rgb = source_pixels[:,:,:3].copy()
                rgb[opaque==0] = 0
                after = np.asarray(covered)[:,:,:3]
                original = Image.fromarray(np.dstack((rgb,opaque)))
                starless = covered
                stars = Image.fromarray(np.dstack((np.asarray(stars),opaque)))
                row['coverageProof'] = processed.get('coverageProof')
                row['originalCoveredSource'] = job['coverage']['originalRgba']
                row['modelCanvasMeaning'] = 'Opaque working zero padding outside alpha is not source coverage or observed black.'
            delta = np.abs(after.astype('int16') - rgb.astype('int16'))
            bounds = [(0, 0, *size)]
            for roi in job.get('reviewRois', []):
                if (not isinstance(roi, list) or len(roi) != 4 or any(type(v) is not int for v in roi) or
                        not 0 <= roi[0] < roi[2] <= size[0] or not 0 <= roi[1] < roi[3] <= size[1]):
                    raise ValueError('image_review_roi_invalid')
                bounds.append(tuple(roi))
            warnings = ['STRUCTURAL_FIDELITY_REQUIRES_VISUAL_REVIEW', 'BACKGROUND_AND_SEAMS_REQUIRE_SCENE_REVIEW',
                        *processed.get('processingWarnings', [])]
            if not np.any(delta):
                warnings.append('NO_RGB_EFFECT_REQUIRES_REVIEW')
            row.update(status='PENDING_REVIEW', warnings=warnings, sourceContext=job['sourceContext'],
                displayDiagnostics={'changedPixels': int(np.any(delta != 0, axis=2).sum()),
                    'meanAbsoluteRGB': float(delta.mean()), 'maxAbsoluteRGB': int(delta.max()),
                    'meaning': 'Encoded display differences locate review work; not photometry or quality scores.',
                    'regions': [{'original': _region_statistics(rgb, opaque, b),
                                 'starless': _region_statistics(after, opaque, b)} for b in bounds]})
            images = []
            for index, bounds_ in enumerate(bounds):
                # Bounded preview only; full resolution originals remain linked.
                crops = [image.crop(bounds_) for image in (original, starless, stars)]
                for crop in crops:
                    crop.thumbnail((640, 640), Image.Resampling.LANCZOS)
                width, height = crops[0].size
                contact = Image.new('RGB', (width * 3, height + 28), '#202020')
                draw = ImageDraw.Draw(contact)
                labels=('Original','Locally restored display','SXT stars before restoration') if 'restoration' in job else ('Original','SXT starless','Vendor stars (display)')
                if 'denoising'in job:labels=('Original','SXT + NXT display','SXT stars before NXT')
                for column, (label, crop) in enumerate(zip(labels, crops)):
                    draw.text((column * width + 6, 6), label, fill='white')
                    contact.paste(crop, (column * width, 28), crop.getchannel('A') if crop.mode=='RGBA' else None)
                name = f'{sid}-{index}.png'
                with (directory / name).open('xb') as stream:
                    contact.save(stream, format='PNG', icc_profile=starless.info.get('icc_profile'))
                images.append(bound_file(directory / name, root=root))
            row['comparisons'] = images
            decision = decisions.get(sid)
            if decision:
                if (decision.get('processingKeySha256') != row['processingKeySha256'] or
                        decision.get('outputs') != row['outputs'] or not decision.get('reason') or
                        decision.get('status') not in ('NEEDS_REPAIR', 'REPLACE_SOURCE', 'FILE_REVIEW_PASSED_SCENE_PENDING')):
                    raise ValueError('image_review_decision_identity_or_status_invalid')
                if processed.get('processingWarnings') and decision['status'] == 'FILE_REVIEW_PASSED_SCENE_PENDING':
                    raise ValueError('image_review_incomplete_processing_cannot_pass')
                row.update(status=decision['status'], reason=decision['reason'], categories=decision.get('categories', []))
            links = [('Original work image', job['input']), *layers.items()]
            if 'coverage' in job:
                links.extend([('Original RGBA source',job['coverage']['originalRgba']),
                              ('Independent supplied mask',job['coverage']['suppliedMask'])])
            link_html = ' '.join(f'<a href="{html.escape(Path(os.path.relpath(root / b["path"], directory)).as_posix(), quote=True)}">{html.escape(label)}</a>' for label, b in links)
            cards.append(f'<article><h2>{html.escape(sid)}: {html.escape(row["status"])}</h2><p>{html.escape(row.get("reason", "Visual review pending"))}</p>{link_html}' +
                         ''.join(f'<img src="{html.escape(Path(b["path"]).name, quote=True)}" alt="Original, starless and stars comparison">' for b in images) + '</article>')
        except (ValueError, RuntimeError, OSError, KeyError) as error:
            row.update(status='HARD_CHECK_FAILED', error=str(error))
            cards.append(f'<article><h2>{html.escape(str(sid))}: HARD_CHECK_FAILED</h2><p>{html.escape(str(error))}</p></article>')
    # Fence all bytes again before sealing the review. Rows whose sources changed
    # during a long batch cannot retain an earlier file pass.
    bound_file(processing_path, root=root, expected=processing_binding)
    if decision_binding:
        bound_file(decisions_path, root=root, expected=decision_binding)
    for processed, row in zip(processing['rows'], rows):
        if row['status'] != 'HARD_CHECK_FAILED':
            try:
                job = processed['key']['job']
                validate_job(job, root=root, factor=2 if processed['key']['method'] == 'sxt-upsample' else 1)
                for binding in row['outputs'].values():
                    bound_file(root / binding['path'], root=root, expected=binding)
            except (ValueError, RuntimeError, OSError, KeyError) as error:
                row.update(status='HARD_CHECK_FAILED', error=str(error))
    # Render final statuses after the last integrity fence, so a rejected late
    # change cannot leave the HTML saying that an earlier file review passed.
    for index, row in enumerate(rows):
        if row['status'] == 'HARD_CHECK_FAILED':
            cards[index] = f'<article><h2>{html.escape(str(row["id"]))}: HARD_CHECK_FAILED</h2><p>{html.escape(row["error"])}</p></article>'
    result = {'schema': 'nxt-review-queue-v1' if nxt_trial else 'sxt-review-queue-v1', 'processingReceipt': processing_binding,
        'qualityOwner': bound_file(Path(__file__), root=root), 'decisionReceipt': decision_binding,
        'rows': rows, 'counts': {status: sum(r['status'] == status for r in rows) for status in
            ('PENDING_REVIEW', 'HARD_CHECK_FAILED', 'NEEDS_REPAIR', 'REPLACE_SOURCE', 'FILE_REVIEW_PASSED_SCENE_PENDING')},
        'ordinaryAdoption': False, 'reviewSeconds': 'UNKNOWN'}
    if nxt_trial:result['processingValidator']=processing['importValidator']
    write_report(directory / 'review.json', result)
    with (directory / 'index.html').open('x', encoding='utf8') as stream:
        stream.write('<!doctype html><meta charset="utf-8"><title>SXT batch review</title><style>body{background:#16191e;color:#eee;font:16px sans-serif;margin:24px}a{color:#9cceff;margin-right:12px}article{border-bottom:1px solid #556;padding:16px 0}img{display:block;max-width:100%;margin-top:16px}</style><h1>SXT batch review</h1><p>File review and Scene acceptance remain separate. Comparisons are bounded previews; links retain full pixels.</p>' + ''.join(cards))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, action="append", required=True)
    parser.add_argument("--catalog", type=Path, default=Path("packages/astronomy-core/data/opengc-messier-deep-sky.v1.json"))
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    catalog_raw = args.catalog.read_bytes()
    catalog = json.loads(catalog_raw)
    result = {"version": QUALITY_VERSION, "catalog": {"path": str(args.catalog), "sha256": digest(catalog_raw)},
              "publications": [publication_report(path, catalog["rows"]) for path in args.manifest]}
    # Exclusive write preserves the identity and outcome of earlier reports.
    write_report(args.report, result)
    print(json.dumps({"report": str(args.report), "publications": len(result["publications"]),
                      "images": sum(len(p["reports"]) for p in result["publications"]),
                      "qualityAcceptance": "UNVERIFIED"}))


if __name__ == "__main__":
    main()
