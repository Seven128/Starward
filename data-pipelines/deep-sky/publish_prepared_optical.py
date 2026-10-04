"""Package pinned cached prepared-RGB geometry products, without reprojection.

Source/processing provenance stays separate from calibrated science. The single
TypeScript owner admits and hashes the content; this writer validates saved
master/PNG bytes and current shared geometric products before exclusive output.
"""
from __future__ import annotations

from dataclasses import dataclass
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import sys

import numpy as np
from PIL import Image

from prepared_rgb_observation import ByteIdentity, PreparedRgbSource, NominalAvmGeometry
from prepared_rgb_tan import PreparedRgbTanMaster, prepared_rgb_tan_products
from optical_publication_io import bound_file,bound_bytes,pinned_json,decode_bound_npy


def json_form(value):
    return json.loads(json.dumps(value, allow_nan=False))


@dataclass(frozen=True)
class VerifiedPreparedGeneration:
    directory: Path
    receipt_bytes: bytes
    receipt_identity_items: tuple[tuple[str, object], ...]
    admission_bytes: bytes
    master: PreparedRgbTanMaster
    products: tuple
    binding_items: tuple[tuple[tuple[str, object], ...], ...]

    @property
    def receipt(self) -> dict:
        return json.loads(self.receipt_bytes)

    @property
    def receipt_identity(self) -> dict:
        return dict(self.receipt_identity_items)

    @property
    def admission(self) -> dict:
        return json.loads(self.admission_bytes)

    @property
    def bindings(self) -> tuple[dict, ...]:
        return tuple(dict(items) for items in self.binding_items)


def verify_cached_prepared_generation(directory: Path, *, root: Path, result_sha256: str,
                                     before_sha256: str, after_sha256: str) -> VerifiedPreparedGeneration:
    directory, root = directory.resolve(), root.resolve()
    if not directory.is_relative_to(root):
        raise RuntimeError("prepared_optical_generation_outside_root")
    receipt, receipt_identity = pinned_json(directory / "result.json", result_sha256, root=root)
    before, before_identity = pinned_json(directory / "inputs-before.json", before_sha256, root=root)
    after, after_identity = pinned_json(directory / "inputs-after.json", after_sha256, root=root)
    if before != after or receipt.get("status") not in (
            "PASSED_BOUNDED_PREPARED_TAN_GENERATION", "PASSED_BOUNDED_CACHED_MASTER_VALIDATION") or receipt.get("requests") != 0:
        raise RuntimeError("prepared_optical_generation_not_verified")
    bindings = [receipt_identity, before_identity, after_identity]
    executed_script = directory / "executed-script.py"
    script_identity = bound_file(executed_script, root=root) if executed_script.is_file() else None
    # Historical executed owners are validated against their saved copies,
    # rather than requiring later repaired working sources to become old bytes.
    # Other actual inputs (including package/runtime bytes) remain exact.
    for category in ("files", "source", "historicalNominal", "allPublishedAssets"):
        if not isinstance(before.get(category), list):
            raise RuntimeError("prepared_optical_generation_inventory_invalid")
        if category in ("files", "source") and not before[category]:
            raise RuntimeError("prepared_optical_generation_inventory_invalid")
        for row in before[category]:
            original = Path(row["path"])
            original = original if original.is_absolute() else root / original
            copies = (directory / "executed-owners").resolve()
            executed = (copies / row["path"]).resolve()
            if executed.is_relative_to(copies) and executed.is_file():
                path = executed
            elif script_identity is not None and all(script_identity[key] == row[key] for key in ("bytes", "sha256")):
                path = executed_script
            else:
                path = original
            bindings.append(bound_file(path, root=root, expected=row))
    if "cachedGeneration" in receipt:
        record = receipt["cachedGeneration"]
        upstream, upstream_identity = pinned_json(root / record["path"], record["sha256"], root=root)
        if upstream_identity["bytes"] != record["bytes"] or upstream.get("status") != "PASSED_BOUNDED_PREPARED_TAN_GENERATION" or any(
                receipt[key] != upstream[key] for key in ("source", "sourceAdmission", "masterMetadata")) or any(
                receipt["master"][key] != upstream["master"][key] for key in ("bytes", "sha256", "rawArraySha256")):
            raise RuntimeError("prepared_optical_cached_generation_join_invalid")
        bindings.append(upstream_identity)
    admission_record = receipt["sourceAdmission"]
    admission, admission_identity = pinned_json(root / admission_record["path"], admission_record["sha256"], root=root)
    if admission_identity["bytes"] != admission_record["bytes"]:
        raise RuntimeError("prepared_optical_source_admission_identity_invalid")
    bindings.append(admission_identity)
    metadata = receipt["masterMetadata"]
    if (metadata.get("source") != admission.get("source") or receipt.get("source") != admission.get("source") or
            metadata.get("sourceGeometry") != admission.get("geometry") or
            metadata.get("sourceRgbSha256") != admission["decodedRgb"]["sha256"] or
            metadata.get("sourceRawXmpSha256") != admission["source"]["xmp"]["sha256"] or
            metadata.get("sourceParserXmpSha256") != admission["normalization"]["parserXml"]["sha256"] or
            admission.get("scientificAvailability") != "UNKNOWN"):
        raise RuntimeError("prepared_optical_source_join_invalid")
    for source_identity in (admission["source"]["jpeg"], admission["source"]["xmp"]):
        if not any(all(row[key] == source_identity[key] for key in ("bytes", "sha256")) for row in before["source"]):
            raise RuntimeError("prepared_optical_original_source_inventory_missing")
    # A completed byte-bound observation can be reused without decoding the
    # original JPEG again. Preserve and join its actual trace, never infer a
    # successful decode from a header or a newly invented status label.
    if "cachedObservation" in receipt:
        upstream = {}
        for key in ("admission", "generation", "before", "after"):
            row = receipt["cachedObservation"][key]
            raw, pin = bound_bytes(root / row["path"], root=root, expected=row, max_bytes=8 * 1024 * 1024)
            upstream[key] = json.loads(raw)
            bindings.append(pin)
        old, generation = upstream["admission"], upstream["generation"]
        inventories = before["files"] + before["source"] + before["historicalNominal"] + before["allPublishedAssets"]
        if (old.get("status") != "PASSED_CURRENT_BOUND_OBSERVATION_OWNER" or old.get("fullRgbDecodes") != 1 or
                old.get("source") != admission["source"] or old.get("geometry") != admission["geometry"] or
                old.get("sourceRgbSha256") != admission["decodedRgb"]["sha256"] or
                old.get("sourceRgbBytes") != admission["decodedRgb"]["bytes"] or
                old.get("scientificAvailability") != "UNKNOWN" or
                any(old.get(key) != admission["normalization"][key] for key in
                    ("removedEmptySpectralNotes", "removedEmptySpatialNotes")) or
                generation.get("sourceAdmission") != receipt["cachedObservation"]["admission"] or
                generation.get("fullRgbDecodes") != 1 or generation.get("newSourceRgbReprojections") != 1 or
                any(generation["originalRgbMaster"][key] != receipt["master"][key] for key in ("bytes", "sha256")) or
                not isinstance(upstream["before"], list) or upstream["before"] != upstream["after"] or
                any(row not in inventories for row in upstream["before"])):
            raise RuntimeError("prepared_optical_cached_observation_join_invalid")
    source = dict(metadata["source"])
    source["jpeg"], source["xmp"] = ByteIdentity(**source["jpeg"]), ByteIdentity(**source["xmp"])
    source = PreparedRgbSource(**source)
    geometry = dict(metadata["sourceGeometry"])
    for key in ("reference_dimension", "reference_pixel", "reference_value", "scale", "decoded_shape_width_height", "crpix", "cdelt"):
        geometry[key] = tuple(geometry[key])
    geometry = NominalAvmGeometry(**geometry)
    record = receipt["master"]
    array_path = (root / record["path"]).resolve()
    if not array_path.is_relative_to(directory) or record["bytes"] > 2048 ** 2 * 4 + 16384:
        raise RuntimeError("prepared_optical_master_locator_invalid")
    encoded_array, array_identity = bound_bytes(array_path, root=root, expected=record, max_bytes=2048 ** 2 * 4 + 16384)
    bindings.append(array_identity)
    # Common byte-bound header/size admission, preserving this producer's
    # existing public errors and fixed RGBA geometry.
    try:
        array = decode_bound_npy(encoded_array,shape=(2048,2048,4),dtype='u1')
    except RuntimeError as error:
        names={'optical_publication_array_version_invalid':'prepared_optical_master_container_invalid',
            'optical_publication_array_shape_invalid':'prepared_optical_master_shape_invalid',
            'optical_publication_array_payload_invalid':'prepared_optical_master_trailing_or_missing_bytes'}
        if str(error) not in names:raise
        raise RuntimeError(names[str(error)]) from error
    rgba_bytes = array.tobytes(order="C")
    if hashlib.sha256(rgba_bytes).hexdigest() != metadata["rgba"]["sha256"]:
        raise RuntimeError("prepared_optical_master_array_identity_invalid")
    master = PreparedRgbTanMaster(metadata["objectRef"], metadata["center"]["raDeg"], metadata["center"]["decDeg"],
        metadata["pixels"], metadata["fieldDegrees"], rgba_bytes, source, geometry,
        metadata["sourceRgbSha256"], metadata["sourceRawXmpSha256"], metadata["sourceParserXmpSha256"],
        tuple(metadata["sourceLibraryVersions"].items()), metadata["geometricSupportPixels"], metadata["supportedBlackPixels"],
        metadata["sampling"]["chunkRows"])
    if json_form(master.metadata()) != metadata:
        raise RuntimeError("prepared_optical_master_metadata_invalid")
    products = prepared_rgb_tan_products(master, output_pixels=512)
    for product in products:
        row = receipt["levels"][product.level]
        path = (root / row["file"]["path"]).resolve()
        if not path.is_relative_to(directory):
            raise RuntimeError("prepared_optical_level_locator_invalid")
        encoded, image_identity = bound_bytes(path, root=root, expected=row["file"], max_bytes=len(product.png_bytes))
        bindings.append(image_identity)
        with Image.open(io.BytesIO(encoded)) as image:
            image.load()
            if image.format != "PNG" or image.mode != "RGBA" or image.size != (512, 512) or image.tobytes() != product.rgba_bytes:
                raise RuntimeError("prepared_optical_level_pixels_invalid")
        if encoded != product.png_bytes or json_form(product.metadata()) != row["metadata"]:
            raise RuntimeError("prepared_optical_level_derivation_invalid")
    return VerifiedPreparedGeneration(directory, json.dumps(receipt, allow_nan=False).encode("utf8"), tuple(receipt_identity.items()),
        json.dumps(admission, allow_nan=False).encode("utf8"), master, products, tuple(tuple(row.items()) for row in bindings))


def publication_payload(verified: VerifiedPreparedGeneration, publication_id: str) -> dict:
    master, source, geometry = verified.master, verified.master.source, verified.master.source_geometry
    if source.license_url != "https://creativecommons.org/licenses/by/4.0/":
        raise RuntimeError("prepared_optical_supported_license_invalid")
    identity = lambda row: {key: row[key] for key in ("bytes", "sha256")}
    levels = {}
    for product in verified.products:
        row = verified.receipt["levels"][product.level]
        levels[product.level] = identity(row["file"]) | {
            "file": master.object_ref.replace(":", "-") + "-" + product.level.lower() + ".png",
            "format": "png", "pixels": product.pixels, "fieldDegrees": product.field_degrees,
            "crpixFitsOneBased": 256.5, "displayAlpha": "geometric-source-area", "scientificAvailability": "UNKNOWN",
            "masterRgbaSha256": hashlib.sha256(master.rgba_bytes).hexdigest(),
            "masterCrop": {"boundsXYExclusive": list(product.bounds_xy_exclusive), "boxFactor": product.box_factor},
            "geometricMasterSupportPixels": product.geometric_source_master_support_pixels,
            "alphaPixels": product.metadata()["alphaPixels"]}
    return {"schemaVersion": "prepared-observation-optical-publication-v1", "imageVersion": "prepared-optical-v1",
        "publicationId": publication_id, "objectRef": master.object_ref, "center": master.center, "orientation": "north-up/east-left",
        "source": {"resourceId": source.resource_id, "sourceUrl": source.source_url, "metadataReferenceUrl": source.metadata_reference_url,
            "credit": source.credit, "license": "CC BY 4.0", "licenseUrl": source.license_url, "policyUrl": source.policy_url,
            "colourMeaning": source.colour_meaning, "encodedJpeg": identity(verified.admission["source"]["jpeg"]),
            "rawXmp": identity(verified.admission["source"]["xmp"]), "parserXmp": identity(verified.admission["normalization"]["parserXml"]),
            "decodedRgb": identity(verified.admission["decodedRgb"]) | {"shape": verified.admission["decodedRgb"]["shape"], "rowOrder": "top-first"},
            "nominalAvm": {"referenceDimension": list(geometry.reference_dimension), "referencePixel": list(geometry.reference_pixel),
                "referenceValue": list(geometry.reference_value), "scale": list(geometry.scale), "rotation": geometry.rotation,
                "decodedShapeWidthHeight": list(geometry.decoded_shape_width_height), "resizeCommonXFactor": geometry.resize_common_x_factor,
                "resizeYFactor": geometry.resize_y_factor, "crpixFitsOneBased": list(geometry.crpix), "cdeltDegrees": list(geometry.cdelt),
                "spatialNotes": geometry.spatial_notes, "spatialQuality": geometry.spatial_quality, "accuracy": geometry.accuracy}},
        "processing": {"runtimeNetwork": "forbidden", "sourceAdapterVersion": "prepared-rgb-observation-avm-v1",
            "producerVersion": "prepared-rgb-tan-master-v1", "producerReceipt": identity(verified.receipt_identity),
            "sampleOffsetsDyDx": [[-.25, -.25], [-.25, .25], [.25, -.25], [.25, .25]],
            "sampling": "encoded-RGB-bilinear-all-four-neighbours", "levelResampling": "geometry-premultiplied-integer-box-round-to-nearest",
            "validation": "BOUND_MASTER_AND_LEVELS_CHECKED",
            "modification": "Starward projects one byte-bound historical prepared RGB observation with its uncorrected publisher AVM into one north-up TAN master using four target-pixel bilinear samples and common complete source stencils. Same-master centered crops use geometric-alpha-premultiplied integer boxes. Encoded colour is retained; no calibrated flux, astrometric fit, sky subtraction, source sharpening, PSF correction or synthetic detail is supplied.",
            "coverage": "PNG alpha is box-averaged binary master-cell geometric support, not continuous source-footprint area, science/exposure coverage or an artifact mask. Approximate publisher AVM and original colour meaning remain; rectangular edges and full image quality are unadopted. Only these three target crops are provided."},
        "master": {"pixels": master.pixels, "fieldDegrees": master.field_degrees, "crpixFitsOneBased": (master.pixels + 1) / 2,
            "rgba": {"bytes": len(master.rgba_bytes), "sha256": hashlib.sha256(master.rgba_bytes).hexdigest()},
            "rgbaNpy": identity(verified.receipt["master"]) | {"format": "npy", "shape": [master.pixels, master.pixels, 4],
                "dtype": "uint8", "rowOrder": "top-first"}, "geometricSupportPixels": master.geometric_support_pixels,
            "geometricBlackPixels": master.supported_black_pixels, "scientificAvailability": "UNKNOWN", "scientificValidity": "UNKNOWN",
            "unit": "published-encoded-RGB"}, "levels": levels}


def publish_verified_prepared_generation(verified: VerifiedPreparedGeneration, output: Path, *, root: Path,
                                        publication_id: str) -> dict:
    return publish_prepared_candidate(publication_payload(verified, publication_id), verified.products,
        verified.bindings, verified.directory, output, root=root)


def publish_prepared_candidate(payload: dict, products: tuple, bindings: tuple[dict, ...],
                               generation_directory: Path, output: Path, *, root: Path,
                               additional_owners: tuple[Path, ...] = ()) -> dict:
    """One exclusive Prepared publication boundary for raw and display producers.

    Each producer has already verified its own pixels/units/provenance. Shared
    packing retains the full typed payload and writes only its three PNGs.
    """
    root, output = root.resolve(), output.resolve()
    if not output.is_relative_to(root) or output == root or output.is_relative_to(generation_directory) or any(
            output.is_relative_to((root / row["path"]).resolve().parent) for row in bindings):
        raise RuntimeError("prepared_optical_output_overlaps_preserved_input")
    output.mkdir(parents=True, exist_ok=False)
    command = ["node", str(root / "tools/run-node.cjs"), "--import", "tsx", str(root / "data-pipelines/deep-sky/pack_prepared_rendered_optical_publication.mts")]
    owners = [Path(__file__), root / "data-pipelines/deep-sky/prepared_rgb_tan.py", root / "data-pipelines/deep-sky/prepared_rgb_observation.py",
              root / "data-pipelines/deep-sky/sdss_gri_tan.py", root / "data-pipelines/deep-sky/sdss_source_stencil.py",
              root / "packages/miniapp-contracts/src/optical-publication-content.ts", root / "packages/miniapp-contracts/src/prepared-optical-publication.ts",
              root / "data-pipelines/deep-sky/pack_prepared_rendered_optical_publication.mts", root / "tools/run-node.cjs"]
    owners += [root / "data-pipelines/deep-sky/prepared_optical_levels.py",
        root / "data-pipelines/deep-sky/optical_publication_io.py",
        root / "packages/miniapp-contracts/src/prepared-optical-common.ts",
        root / "packages/miniapp-contracts/src/prepared-display-optical-publication.ts",
        root / "packages/miniapp-contracts/src/prepared-rendered-optical-publication.ts", *additional_owners]
    try:
        implementation_before = [bound_file(path, root=root) for path in owners]
        for row in bindings:
            bound_file(root / row["path"], root=root, expected=row)
        with (output / "publication-input.json").open("x", encoding="utf8") as file:
            json.dump(payload, file, ensure_ascii=False, allow_nan=False, indent=2); file.write("\n")
        process = subprocess.run(command, input=json.dumps(payload, ensure_ascii=False, allow_nan=False).encode("utf8"),
                                 cwd=root, capture_output=True, timeout=60, check=False)
        (output / "node-cli-stdout.txt").write_bytes(process.stdout)
        (output / "node-cli-stderr.txt").write_bytes(process.stderr)
        if process.returncode:
            raise RuntimeError("prepared_optical_shared_packaging_rejected:" + str(process.returncode))
        manifest = json.loads(process.stdout)
        content = {key: value for key, value in manifest.items() if key != "publicationHash"}
        content["levels"] = {level: {key: value for key, value in asset.items() if key != "downloadUrl"} for level, asset in manifest["levels"].items()}
        if content != json_form(payload):
            raise RuntimeError("prepared_optical_shared_payload_changed")
        for product in products:
            destination = (output / payload["levels"][product.level]["file"]).resolve()
            if not destination.is_relative_to(output):
                raise RuntimeError("prepared_optical_output_locator_invalid")
            with destination.open("xb") as file:
                file.write(product.png_bytes)
        implementation_after = [bound_file(path, root=root) for path in owners]
        for row in bindings:
            bound_file(root / row["path"], root=root, expected=row)
        if implementation_before != implementation_after:
            raise RuntimeError("prepared_optical_owner_changed_during_packaging")
        (output / "manifest.json").write_bytes(process.stdout)
        receipt = {"status": "OFFLINE_PREPARED_OPTICAL_CANDIDATE_PACKAGED", "publicationHash": manifest["publicationHash"], "imageVersion": manifest["imageVersion"],
            "nodeCommand": command, "nodeExitCode": process.returncode, "inputs": list(bindings),
            "implementationBefore": implementation_before, "implementationAfter": implementation_after,
            "files": [bound_file(path, root=root) for path in sorted(output.iterdir()) if path.is_file()],
            "qualityAdopted": False, "runtimeRegistered": False, "sourceDecodesAndMasterReprojections": 0,
            "scope": "Pinned cached Prepared pixels and geometric tiers; producer-specific processing and provenance stay in the typed manifest. No quality/source adoption, calibrated science, acquisition/reprojection, visible attribution or native acceptance."}
        with (output / "writer-receipt.json").open("x", encoding="utf8") as file:
            json.dump(receipt, file, ensure_ascii=False, allow_nan=False, indent=2); file.write("\n")
        return receipt
    except Exception as error:
        with (output / "failed.json").open("x", encoding="utf8") as file:
            json.dump({"status": "OFFLINE_PREPARED_WRITER_FAILED", "error": repr(error), "nodeCommand": command}, file, indent=2); file.write("\n")
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--generation", type=Path, required=True)
    parser.add_argument("--result-sha256", required=True)
    parser.add_argument("--before-sha256", required=True)
    parser.add_argument("--after-sha256", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--publication-id", required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    verified = verify_cached_prepared_generation(args.generation, root=root, result_sha256=args.result_sha256,
                                               before_sha256=args.before_sha256, after_sha256=args.after_sha256)
    receipt = publish_verified_prepared_generation(verified, args.output, root=root, publication_id=args.publication_id)
    print(json.dumps({"publicationHash": receipt["publicationHash"], "output": str(args.output), "qualityAdopted": False, "runtimeRegistered": False}))


if __name__ == "__main__":
    main()
