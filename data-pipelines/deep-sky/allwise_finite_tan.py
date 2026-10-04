"""Offline source-bound TAN rendering and immutable publication migration.

Only verified cached inputs are used. Nonfinite selected FITS samples become
transparent; finite low brightness and detector artifacts are not edited away.
"""
from __future__ import annotations

import copy
import hashlib
import io
import json
import math
import re
import subprocess
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image
from image_quality import checked_geometry, checked_source_files, inspect_image

IRSA_HIPS = "https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/W3"
LEVELS = ("OVERVIEW", "MEDIUM", "DETAIL")


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def publication_hash(raw: bytes) -> str:
    # Published BFF identities use JSON.stringify, including its number spelling.
    process = subprocess.run(["node", "--input-type=module", "-e",
                              'import{readFileSync}from"node:fs";import{createHash}from"node:crypto";'
                              'process.stdout.write(createHash("sha256").update(JSON.stringify(JSON.parse(readFileSync(0,"utf8")))).digest("hex"));'],
                             input=raw, capture_output=True, check=True, timeout=30)
    digest = process.stdout.decode("ascii")
    if not re.fullmatch(r"[a-f0-9]{64}", digest):
        raise RuntimeError("allwise_publication_hash_invalid")
    return digest


def checked_fits(raw: bytes):
    from astropy.io import fits
    import numpy as np
    with warnings.catch_warnings(record=True) as notices:
        warnings.simplefilter("always")
        with fits.open(io.BytesIO(raw), memmap=False) as hdus:
            hdus.verify("exception")
            hdu = hdus[0]
            if hdu.header["BITPIX"] != -32 or hdu.data.shape != (512, 512):
                raise RuntimeError("allwise_fits_array_invalid")
            offset = hdu.fileinfo()["datLoc"]
            if len(raw) < offset + hdu.data.nbytes:
                raise RuntimeError("allwise_fits_array_truncated")
            data = np.array(hdu.data, copy=True)
    return data, {"completeArrayReceived": True,
                  "missingEndPaddingBytes": max(0, (offset + data.nbytes + 2879) // 2880 * 2880 - len(raw)),
                  "readerWarnings": sorted(set(str(n.message) for n in notices))}


def finite_rgba(intensity):
    import numpy as np
    finite = np.isfinite(intensity)
    if not finite.any():
        raise RuntimeError("allwise_finite_display_unavailable")
    lo, hi = np.percentile(intensity[finite], [1, 99.7])
    if not hi > lo:
        raise RuntimeError("allwise_finite_display_empty")
    gray = np.zeros(intensity.shape, dtype=np.uint8)
    scale = np.maximum(intensity[finite] - lo, 0) / (hi - lo)
    gray[finite] = np.rint(np.clip(np.arcsinh(scale * 10) / np.arcsinh(10), 0, 1) * 255).astype(np.uint8)
    rgba = np.repeat(gray[..., None], 4, axis=-1)
    rgba[:, :, 3] = finite.astype(np.uint8) * 255
    return rgba, {"method": "1-99.7 percentile asinh", "colorMap": "gray", "asinhScale": .1,
                  "finiteCutsDN": [float(lo), float(hi)]}


@dataclass(frozen=True)
class TanSamples:
    intensity: Any
    finite: Any
    metadata: dict[str, Any]


def sample_cached_tan(plan: dict, entry: dict, *, source_directory: Path,
                      source_files: list[dict], source_count: int, properties: bytes,
                      properties_sha256: str,
                      source_paths: dict[str, str] | None = None) -> dict[str, TanSamples]:
    """Sample the complete checked offline input set without a display receipt.

    Canonical HiPS identities come from actual TAN demand. Optional source_paths
    only locates those same immutable files within source_directory; it does not
    supply coverage or permit missing required tiles.
    """
    from astropy.wcs import WCS
    import numpy as np
    if plan["objectRef"] != entry["objectRef"] or plan["source"] != IRSA_HIPS or plan["tileWidth"] != 512:
        raise RuntimeError("allwise_candidate_identity_invalid")
    if plan["center"].get("frame") != "ICRS J2000" or any(
            not isinstance(plan["center"][key], (int, float)) or
            not math.isfinite(plan["center"][key]) or
            abs(plan["center"][key] - entry["center"][key]) > 1e-10 for key in ("raDeg", "decDeg")):
        raise RuntimeError("allwise_candidate_center_invalid")
    if sha256(properties) != properties_sha256:
        raise RuntimeError("allwise_source_properties_changed")
    descriptor = dict(line.split("=", 1) for line in properties.decode("utf-8").splitlines()
                      if "=" in line and not line.lstrip().startswith("#"))
    descriptor = {key.strip(): value.strip() for key, value in descriptor.items()}
    if (descriptor.get("creator_did") != "ivo://CDS/P/allWISE/W3" or
            descriptor.get("hips_frame") != "equatorial" or descriptor.get("hips_tile_width") != "512" or
            descriptor.get("hips_order") != "8" or descriptor.get("hips_pixel_bitpix") != "-32" or
            "fits" not in descriptor.get("hips_tile_format", "").split()):
        raise RuntimeError("allwise_source_properties_invalid")
    inputs = {item["path"]: item for item in source_files}
    if (not isinstance(source_count, int) or isinstance(source_count, bool) or not 0 < source_count <= 32 or
            len(inputs) != len(source_files) or len(inputs) != source_count):
        raise RuntimeError("allwise_candidate_input_set_invalid")
    properties_url = IRSA_HIPS + "/properties"
    prepared = {}
    planned_paths = set()
    profiles = plan["profiles"]
    levels = [profile.get("level") for profile in profiles]
    if not levels or len(levels) != len(set(levels)) or any(level not in LEVELS for level in levels):
        raise RuntimeError("allwise_candidate_profile_invalid")
    for profile in profiles:
        level = profile["level"]
        original = entry["levels"][level]
        n, field = original["pixels"], original["fieldDegrees"]
        if n not in (256, 512) or n != profile["pixels"] or field != profile["fieldDegrees"]:
            raise RuntimeError("allwise_candidate_profile_invalid")
        checked_geometry(entry, {**original, "wcsHeader": None}, None, level)
        target = WCS(naxis=2)
        target.wcs.ctype = ["RA---TAN", "DEC--TAN"]
        target.wcs.crval = [entry["center"]["raDeg"], entry["center"]["decDeg"]]
        target.wcs.crpix = [n / 2, n / 2]
        step = 2 * math.tan(math.radians(field) / 2) / n
        target.wcs.cdelt = np.rad2deg([-step, step])
        order = min(8, max(0, math.ceil(math.log2(math.sqrt(math.pi / 3) / (512 * step)))))
        if profile["sourceOrder"] != order:
            raise RuntimeError("allwise_candidate_source_order_invalid")
        y, x = np.mgrid[0:n, 0:n]
        ra, dec = target.all_pix2world(x, n - 1 - y, 0)
        world = np.stack([ra, dec], axis=-1).astype("<f8").tobytes()
        if "worldSha256" in profile and sha256(world) != profile["worldSha256"]:
            raise RuntimeError("allwise_candidate_world_changed")
        if "wcsHeader" in profile:
            checked_geometry(entry, {**original, "wcsHeader": profile["wcsHeader"],
                                      "source": {"processingService": "Starward HiPS TAN"}}, None, level)
        lookup = subprocess.run(["node", str(Path(__file__).with_name("hips_tan_lookup.mjs")), str(order), str(n)],
                                input=world, capture_output=True, check=True, timeout=30).stdout
        if len(lookup) != n * n * 12:
            raise RuntimeError("allwise_lookup_samples_invalid")
        if "lookupSha256" in profile and sha256(lookup) != profile["lookupSha256"]:
            raise RuntimeError("allwise_candidate_lookup_changed")
        samples = np.frombuffer(lookup, dtype="<u4").reshape(n, n, 3)
        if np.any(samples[:, :, 1:] >= 512) or np.any(samples[:, :, 0] >= 12 * 4 ** order):
            raise RuntimeError("allwise_lookup_samples_invalid")
        paths = {f"Norder{order}/Dir{int(pixel) // 10000 * 10000}/Npix{int(pixel)}.fits"
                 for pixel in np.unique(samples[:, :, 0])}
        if "tiles" in profile and (len(profile["tiles"]) != len(paths) or set(profile["tiles"]) != paths):
            raise RuntimeError("allwise_candidate_planned_tiles_changed")
        prepared[level] = (n, field, order, target, samples, sha256(world), sha256(lookup))
        planned_paths.update(paths)
    # Compute the entire actual sampling demand before any mask is made. Older
    # candidate plans intentionally store lookups separately; no descriptive
    # plan field or receipt is substituted for the real geometry's source set.
    if set(inputs) != planned_paths:
        raise RuntimeError("image_quality_source_set_incomplete")
    if any(item.get("url") != IRSA_HIPS + "/" + path for path, item in inputs.items()):
        raise RuntimeError("allwise_candidate_input_missing")
    locations = {path: path for path in inputs} if source_paths is None else source_paths
    if set(locations) != planned_paths or any(not isinstance(path, str) or not path for path in locations.values()):
        raise RuntimeError("allwise_source_locations_invalid")
    resolved = {(source_directory / path).resolve() for path in locations.values()}
    if len(resolved) != len(planned_paths):
        raise RuntimeError("allwise_source_locations_invalid")
    checked_source_files(source_directory, [{**item, "path": locations[path]} for path, item in inputs.items()],
                         set(locations.values()), source_count)
    sampled = {}
    used_inputs = set()
    for level, (n, field, order, target, samples, world_hash, lookup_hash) in prepared.items():
        intensity = np.full((n, n), np.nan, dtype=np.float32)
        source_tiles = []
        for pixel in np.unique(samples[:, :, 0]):
            path = f"Norder{order}/Dir{int(pixel) // 10000 * 10000}/Npix{int(pixel)}.fits"
            item = inputs.get(path)
            if not item or item["state"] != "CHECKED" or item["url"] != IRSA_HIPS + "/" + path:
                raise RuntimeError("allwise_candidate_input_missing")
            raw = (source_directory / locations[path]).read_bytes()
            if len(raw) != item["bytes"] or sha256(raw) != item["sha256"]:
                raise RuntimeError("allwise_source_tile_changed")
            data, fits_receipt = checked_fits(raw)
            take = samples[:, :, 0] == pixel
            intensity[take] = data[samples[:, :, 2][take], samples[:, :, 1][take]]
            source_tiles.append({"path": path, "url": item["url"], "sha256": item["sha256"],
                                 "bytes": len(raw), "receipt": fits_receipt})
            used_inputs.add(path)
        finite = np.isfinite(intensity)
        sampled[level] = TanSamples(intensity, finite, {
            "level": level, "fieldDegrees": field, "pixels": n, "wcsHeader": dict(target.to_header()),
            "worldSha256": world_hash, "lookupSha256": lookup_hash,
            "source": {"dataSurvey": "IRSA AllWISE W3 HiPS", "dataSurveyUrl": IRSA_HIPS,
                       "processingService": "Starward HiPS TAN", "propertiesUrl": properties_url,
                       "propertiesSha256": sha256(properties), "sourceOrder": order, "tileWidth": 512,
                       "sampling": "nearest NESTED cell at order+9; FITS column=NW,row=511-NE",
                       "tiles": source_tiles}})
    if used_inputs != set(inputs):
        raise RuntimeError("allwise_candidate_input_set_changed")
    return sampled


def render_cached_candidate(candidate: Path, entry: dict[str, Any],
                            quality_reports: list[dict] | None = None,
                            catalog_row: dict | None = None) -> dict[str, tuple[bytes, dict[str, Any]]]:
    import numpy as np
    plan = json.loads((candidate / "candidate-plan.json").read_text(encoding="utf-8"))
    receipt = json.loads((candidate / "candidate-result.json").read_text(encoding="utf-8"))
    sampled = sample_cached_tan(plan, entry, source_directory=candidate / "sources",
                               source_files=receipt["sourceFiles"], source_count=receipt["sourceTileCount"],
                               properties=(candidate.parent / "properties").read_bytes(),
                               properties_sha256=receipt["sourcePropertiesSha256"])
    if set(sampled) != set(LEVELS):
        raise RuntimeError("allwise_candidate_profile_invalid")
    rendered = {}
    for level in LEVELS:
        result = sampled[level]
        intensity, finite, science_metadata = result.intensity, result.finite, result.metadata
        n, field = science_metadata["pixels"], science_metadata["fieldDegrees"]
        expected = next(item for item in receipt["levels"] if item["level"] == level)
        rgba, stretch = finite_rgba(intensity)
        encoded = io.BytesIO()
        Image.fromarray(rgba).save(encoded, format="PNG")
        payload = encoded.getvalue()
        missing = int((~finite).sum())
        if sha256(payload) != expected["sha256"] or missing != expected["missingPixels"]:
            raise RuntimeError("allwise_candidate_pixels_changed")
        # Re-read the encoded output, not only the source array or mask counters.
        decoded = np.asarray(Image.open(io.BytesIO(payload)).convert("RGBA"))
        if not np.array_equal(decoded[:, :, 3] > 0, finite):
            raise RuntimeError("allwise_png_mask_changed")
        stem = entry["objectRef"].replace(":", "-")
        digest = sha256(payload)
        metadata = {
            "file": f"{stem}/{stem}-{level.lower()}.{digest}.png", "imageFormat": "png",
            "fieldDegrees": field, "pixels": n, "sha256": digest, "bytes": len(payload),
            "validFraction": None, "coverageState": "NOT_MEASURED",
            "sourceFiniteMask": {"kind": "NONFINITE_HIPS_SAMPLES", "missingPixels": missing,
                                 "finitePixels": n * n - missing},
            "wcsHeader": science_metadata["wcsHeader"], "stretch": stretch,
            "source": science_metadata["source"],
        }
        quality = inspect_image(payload, entry, level, metadata,
            source=metadata["source"], processing={"stretch": stretch, "sampling": metadata["source"]["sampling"]},
            row=catalog_row,
            expected_finite=finite)
        if quality_reports is not None:
            quality_reports.append(quality)
        rendered[level] = (payload, metadata)
    return rendered


def publish_finite_candidate(output: Path, candidate: Path, reference: str,
                             quality_reports: list[dict] | None = None,
                             catalog_row: dict | None = None) -> dict[str, Any]:
    manifest_path = output / "manifest.json"
    previous_raw = manifest_path.read_bytes()
    previous = json.loads(previous_raw)
    if previous["schemaVersion"] != "allwise-w3-deep-sky-publication-v2":
        raise RuntimeError("allwise_finite_migration_requires_v2")
    entry = next((item for item in previous["entries"] if item["objectRef"] == reference), None)
    if not entry:
        raise RuntimeError("allwise_candidate_not_published")
    rendered = render_cached_candidate(candidate, entry, quality_reports, catalog_row)
    v2_hash = publication_hash(previous_raw)
    v1_hash = previous.get("previousPublicationHash")
    if not re.fullmatch(r"[a-f0-9]{64}", v1_hash or ""):
        raise RuntimeError("allwise_previous_publication_missing")
    archive = output / "publications"
    if publication_hash((archive / f"{v1_hash}.json").read_bytes()) != v1_hash:
        raise RuntimeError("allwise_previous_publication_changed")
    # Verify every retained image, including those the new renderer did not use.
    for item in previous["entries"]:
        for level, asset in item["levels"].items():
            stem = item["objectRef"].replace(":", "-")
            if asset["file"] != f"{stem}/{stem}-{level.lower()}.jpg":
                raise RuntimeError("allwise_previous_asset_path_invalid")
            raw = (output / asset["file"]).read_bytes()
            if len(raw) != asset["bytes"] or sha256(raw) != asset["sha256"]:
                raise RuntimeError("allwise_previous_asset_changed")
    current = copy.deepcopy(previous)
    current.pop("previousPublicationHash", None)
    current.update(schemaVersion="allwise-w3-deep-sky-publication-v3",
                   publicationId="allwise-w3-messier.source-finite.v20260929",
                   legacyPublicationHash=v2_hash, previousPublicationHashes=[v2_hash, v1_hash])
    next(item for item in current["entries"] if item["objectRef"] == reference)["levels"] = {
        level: metadata for level, (_, metadata) in rendered.items()}
    current["processing"].update(
        service="CDS hips2fits and Starward HiPS TAN",
        modification=f"Starward retains the previously published CDS hips2fits JPEG cutouts and supplies three source-bound PNG TAN levels for {reference}. The PNGs use nearest HiPS FITS sampling, north-up/east-left ICRS TAN geometry and 1-99.7 percentile asinh grayscale. Only nonfinite selected source samples have zero alpha; finite dark pixels remain data. These are historical 12 micrometer infrared images, not visible-light photographs.",
        limitations=[
            "Historical 12 micrometer survey imagery; neither naked-eye appearance nor realtime sky data.",
            "Source-survey saturation and detector artifacts remain; finite samples are not a measurement of artifact-free scientific validity.",
            "Unmasked JPEGs have unknown source-data coverage. PNG alpha marks only nonfinite nearest HiPS samples, not Atlas exposure depth or confidence; no inpainting is used.",
            "Cached HiPS FITS inputs contain complete scientific arrays but omit 2624 bytes of FITS end padding; the input receipt preserves this standards limitation.",
        ])
    # Immutable assets and the old offer precede the atomic metadata switch.
    archived_v2 = archive / f"{v2_hash}.json"
    if archived_v2.exists() and archived_v2.read_bytes() != previous_raw:
        raise RuntimeError("allwise_archive_changed")
    archived_v2.write_bytes(previous_raw)
    for payload, metadata in rendered.values():
        asset_path = output / metadata["file"]
        if asset_path.exists() and asset_path.read_bytes() != payload:
            raise RuntimeError("allwise_versioned_asset_changed")
        asset_path.write_bytes(payload)
    encoded = json.dumps(current, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if manifest_path.read_bytes() != previous_raw:
        raise RuntimeError("allwise_current_publication_changed_during_migration")
    temporary = output / "manifest.finite-v3.tmp"
    temporary.write_bytes(encoded)
    temporary.replace(manifest_path)
    return {"publicationId": current["publicationId"], "publicationHash": publication_hash(encoded),
            "legacyPublicationHash": v2_hash, "pngBytes": sum(len(raw) for raw, _ in rendered.values())}


def encoded_rgb_support(raw: bytes, pixels: int) -> dict[str, Any]:
    """Conservative display eligibility, independent of source alpha/validity.

    Straight-alpha LINEAR filtering can mix color from a transparent neighbor,
    so even that color stays eligible. No pixels or scientific metadata change.
    """
    import numpy as np
    with Image.open(io.BytesIO(raw)) as image:
        if image.format != "PNG" or image.mode != "RGBA" or image.size != (pixels, pixels) or pixels not in (256, 512):
            raise RuntimeError("allwise_display_support_requires_published_rgba")
        rgba = np.asarray(image)
        colors = np.any(rgba[:, :, :3] != 0, axis=2)
    empty = ~colors.flatten()
    edges = np.diff(np.concatenate(([False], empty, [False])).astype(np.int8))
    starts, ends = np.flatnonzero(edges == 1), np.flatnonzero(edges == -1)
    runs, cursor = [], 0
    for start, end in zip(starts, ends):
        runs.extend([int(start) - cursor, int(end - start)])
        cursor = int(end)
    return {"version": "encoded-rgb-runs-v1", "sourceSha256": sha256(raw),
            "pixels": pixels, "emptyRuns": runs}


def publish_display_support(output: Path) -> dict[str, Any]:
    """Refine existing v3 metadata only; never re-render or fetch source data."""
    output = output.resolve()
    manifest_path = output / "manifest.json"
    previous_raw = manifest_path.read_bytes()
    previous = json.loads(previous_raw)
    if previous["schemaVersion"] != "allwise-w3-deep-sky-publication-v3":
        raise RuntimeError("allwise_display_support_requires_v3")
    previous_hash = publication_hash(previous_raw)
    current = copy.deepcopy(previous)
    changed = False
    support_bytes = 0
    for entry in current["entries"]:
        for asset in entry["levels"].values():
            source = (output / asset["file"]).resolve()
            if not source.is_relative_to(output):
                raise RuntimeError("allwise_display_support_asset_path_invalid")
            raw = source.read_bytes()
            if len(raw) != asset["bytes"] or sha256(raw) != asset["sha256"]:
                raise RuntimeError("allwise_display_support_asset_changed")
            if asset.get("imageFormat") == "png":
                support = encoded_rgb_support(raw, asset["pixels"])
                if asset.get("displaySupport") != support:
                    changed = True
                asset["displaySupport"] = support
                support_bytes += len(json.dumps(support, separators=(",", ":")).encode("ascii"))
    if not changed:
        return {"publicationHash": previous_hash, "changed": False, "supportBytes": support_bytes}
    archive = output / "publications"
    for digest in previous["previousPublicationHashes"]:
        if not re.fullmatch(r"[a-f0-9]{64}", digest) or publication_hash((archive / f"{digest}.json").read_bytes()) != digest:
            raise RuntimeError("allwise_previous_publication_changed")
    current["previousPublicationHashes"] = list(dict.fromkeys([previous_hash, *previous["previousPublicationHashes"]]))
    current["publicationId"] = re.sub(r"\.display-support\.v\d+$", "", previous["publicationId"]) + ".display-support.v2"
    old_note = " Byte-bound 8-pixel encoded-color support grids allow the additive display to retain catalog identification in a color-empty viewport. They do not alter images, alpha, source coverage or scientific validity."
    note = " Byte-bound lossless encoded-color empty runs allow the additive display to retain catalog identification in a color-empty viewport. They do not alter images, alpha, source coverage or scientific validity."
    current["processing"]["modification"] = current["processing"]["modification"].removesuffix(old_note).removesuffix(note) + note
    encoded = json.dumps(current, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    next_hash = publication_hash(encoded)
    archived = archive / f"{previous_hash}.json"
    if archived.exists():
        if archived.read_bytes() != previous_raw:
            raise RuntimeError("allwise_archive_changed")
    else:
        with archived.open("xb") as target:
            target.write(previous_raw)
    temporary = output / "manifest.display-support.tmp"
    with temporary.open("xb") as target:
        target.write(encoded)
    if manifest_path.read_bytes() != previous_raw:
        raise RuntimeError("allwise_current_publication_changed_during_migration")
    temporary.replace(manifest_path)
    return {"publicationHash": next_hash, "previousPublicationHash": previous_hash,
            "changed": True, "supportBytes": support_bytes}
