#!/usr/bin/env python3
"""Build bounded, self-hosted AllWISE W3 imagery for Starward."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from PIL import Image

IRSA_HIPS = "https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/W3"
HIPS2FITS = "https://alasky.cds.unistra.fr/hips-image-services/hips2fits"
CATALOG_DEFAULT = Path("packages/astronomy-core/data/opengc-messier-deep-sky.v1.json")
OUTPUT_DEFAULT = Path("workers/miniapp-api/assets/deep-sky")
CACHE_DEFAULT = Path("output/allwise-w3-source-cache")
LEVELS = ("OVERVIEW", "MEDIUM", "DETAIL")
USER_AGENT = "Starward-AllWISE-publication/1.0 (bounded derived astronomy assets)"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def level_profile(level: str, major_axis_arcmin: float | None) -> tuple[float, int]:
    object_degrees = max(major_axis_arcmin or 10.0, 1.0) / 60.0
    if level == "OVERVIEW":
        multiplier, minimum, maximum, pixels = 3.0, 2.0, 4.0, 256
    elif level == "MEDIUM":
        multiplier, minimum, maximum, pixels = 1.5, 0.75, 4.0, 512
    elif level == "DETAIL":
        multiplier, minimum, maximum, pixels = 0.6, 0.25, 2.0, 512
    else:
        raise ValueError("deep_sky_image_level_invalid")
    return round(min(maximum, max(minimum, object_degrees * multiplier)), 3), pixels


def request_url(ra_deg: float, dec_deg: float, field_deg: float, pixels: int) -> str:
    query = urllib.parse.urlencode({
        "hips": IRSA_HIPS,
        "width": pixels,
        "height": pixels,
        "projection": "TAN",
        "ra": f"{ra_deg:.12f}",
        "dec": f"{dec_deg:.12f}",
        "fov": f"{field_deg:.6f}",
        "coordsys": "icrs",
        "rotation_angle": "0",
        "format": "jpg",
        "min_cut": "1%",
        "max_cut": "99.7%",
        "stretch": "asinh",
        "cmap": "gray",
    })
    return f"{HIPS2FITS}?{query}"


def request_bytes(url: str, *, attempts: int = 4) -> bytes:
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/jpeg"})
            with urllib.request.urlopen(request, timeout=180) as response:
                payload = response.read()
            if not payload:
                raise RuntimeError("allwise_empty_response")
            return payload
        except Exception as error:  # network errors vary by platform
            last_error = error
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"allwise_request_failed:{url}") from last_error


def checked_image(payload: bytes, pixels: int) -> None:
    with Image.open(io.BytesIO(payload)) as image:
        if image.format != "JPEG" or image.size != (pixels, pixels):
            raise RuntimeError("allwise_derived_image_invalid")
        extrema = image.convert("L").getextrema()
        if extrema is None or extrema[1] <= extrema[0]:
            raise RuntimeError("allwise_derived_image_empty")


def cached_image(cache: Path, reference: str, level: str, ra_deg: float, dec_deg: float,
                 field_deg: float, pixels: int) -> tuple[bytes, dict[str, Any]]:
    url = request_url(ra_deg, dec_deg, field_deg, pixels)
    key = sha256(url.encode("utf-8"))[:16]
    path = cache / reference.replace(":", "-") / f"{level.lower()}-{key}.jpg"
    if not path.exists():
        payload = request_bytes(url)
        checked_image(payload, pixels)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
        time.sleep(0.75)
    payload = path.read_bytes()
    checked_image(payload, pixels)
    return payload, {
        "dataSurvey": "IRSA AllWISE W3 HiPS",
        "dataSurveyUrl": IRSA_HIPS,
        "processingService": "CDS hips2fits",
        "processingServiceUrl": HIPS2FITS,
        "requestUrl": url,
        "responseSha256": sha256(payload),
        "responseBytes": len(payload),
    }


def build_object(row: dict[str, Any], cache: Path, output: Path) -> dict[str, Any]:
    object_dir = output / row["objectRef"].replace(":", "-")
    object_dir.mkdir(parents=True, exist_ok=True)
    levels: dict[str, Any] = {}
    for level in LEVELS:
        field_deg, pixels = level_profile(level, row.get("majorAxisArcmin"))
        jpeg, source = cached_image(cache, row["objectRef"], level, row["raDeg"], row["decDeg"], field_deg, pixels)
        filename = f"{row['objectRef'].replace(':', '-')}-{level.lower()}.jpg"
        relative = f"{row['objectRef'].replace(':', '-')}/{filename}"
        (object_dir / filename).write_bytes(jpeg)
        levels[level] = {
            "file": relative,
            "fieldDegrees": field_deg,
            "pixels": pixels,
            "sha256": sha256(jpeg),
            "bytes": len(jpeg),
            "validFraction": 1,
            "source": source,
            "stretch": {"method": "1-99.7 percentile asinh", "colorMap": "gray"},
        }
    return {
        "objectRef": row["objectRef"],
        "center": {"raDeg": row["raDeg"], "decDeg": row["decDeg"], "frame": "ICRS J2000"},
        "orientation": "north-up/east-left",
        "levels": levels,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, default=CATALOG_DEFAULT)
    parser.add_argument("--cache", type=Path, default=CACHE_DEFAULT)
    parser.add_argument("--output", type=Path, default=OUTPUT_DEFAULT)
    parser.add_argument("--objects", default="")
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()
    if not args.all and not args.objects:
        parser.error("choose --all or --objects")
    catalog_bytes = args.catalog.read_bytes()
    catalog = json.loads(catalog_bytes)
    requested = {value.strip() for value in args.objects.split(",") if value.strip()}
    rows = catalog["rows"] if args.all else [row for row in catalog["rows"] if row["objectRef"] in requested]
    if not rows or (requested and {row["objectRef"] for row in rows} != requested):
        raise RuntimeError("allwise_requested_object_not_found")
    args.output.mkdir(parents=True, exist_ok=True)
    entries = []
    for index, row in enumerate(rows, start=1):
        print(f"[{index}/{len(rows)}] {row['objectRef']}", flush=True)
        entries.append(build_object(row, args.cache, args.output))
    manifest = {
        "schemaVersion": "allwise-w3-deep-sky-publication-v1",
        "publicationId": "allwise-w3-messier.v20260501",
        "catalogVersion": catalog["catalogVersion"],
        "catalogSha256": sha256(catalog_bytes),
        "source": {
            "provider": "NASA/IPAC Infrared Science Archive (IRSA)",
            "dataset": "AllWISE W3 HiPS from raw Atlas Images",
            "band": "W3", "wavelengthMicrometers": 12,
            "landingUrl": IRSA_HIPS,
            "documentationUrl": "https://irsa.ipac.caltech.edu/ibe/docs/wise/allwise/p3am_cdd/",
            "doi": "10.26131/IRSA153",
            "acknowledgmentUrl": "https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec1_6b.html",
            "acknowledgment": "This publication makes use of data products from the Wide-field Infrared Survey Explorer, which is a joint project of the University of California, Los Angeles, and the Jet Propulsion Laboratory/California Institute of Technology, and NEOWISE, which is a project of the Jet Propulsion Laboratory/California Institute of Technology. WISE and NEOWISE are funded by the National Aeronautics and Space Administration.",
            "copyright": "IPAC/NASA",
            "hipsCopyright": "CNRS/Unistra",
            "hipsProvider": "CDS/Aladin — Thomas Boch",
            "hipsDoi": "10.26093/cds/aladin/na1n-03",
            "hipsRecordUrl": "https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FallWISE%2FW3&fmt=html&get=record",
            "hipsLicense": "ODbL-1.0",
            "hipsLicenseUrl": "https://opendatacommons.org/licenses/odbl/1-0/",
        },
        "distribution": {
            "databaseLicense": "ODbL-1.0",
            "databaseLicenseUrl": "https://opendatacommons.org/licenses/odbl/1-0/",
            "notice": "Contains information from AllWISE W3 HiPS (CDS/Aladin; CNRS/Unistra), made available under the Open Database License (ODbL). Starward offers its imagery selection and arrangement under ODbL; individual AllWISE images retain their separate WISE/NEOWISE acknowledgment and IPAC/NASA rights.",
            "catalogNotice": "Target identities and coordinates are adapted from OpenNGC v20260501, Mattia Verga and contributors, under CC BY-SA 4.0. Starward selected Messier galaxies/nebulae and converted coordinates to decimal degrees; these catalog fields remain CC BY-SA 4.0, separately from the imagery database.",
            "catalogUrl": "https://github.com/mattiaverga/OpenNGC/tree/36cb178a0f69dba8bfc03a99c10512831edf1c6b",
            "catalogLicenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
        },
        "processing": {
            "service": "CDS hips2fits", "serviceUrl": HIPS2FITS,
            "frame": "ICRS J2000", "projection": "TAN", "orientation": "north-up/east-left",
            "stretch": "1-99.7 percentile asinh", "runtimeNetwork": "forbidden",
            "modification": f"Starward selected {len(entries)} Messier galaxy/nebula targets and published three north-up ICRS TAN JPEG cutouts per target through CDS hips2fits, with 1-99.7 percentile asinh grayscale stretch; these are processed 12 micrometer survey images, not visible-light photographs.",
            "limitations": [
                "Historical 12 micrometer survey imagery; it is neither naked-eye appearance nor realtime sky data.",
                "Source-survey saturation and detector artifacts may remain after bounded stretch and resampling.",
            ],
        },
        "entryCount": len(entries), "entries": entries,
    }
    (args.output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"publicationId": manifest["publicationId"], "entryCount": len(entries)}))


if __name__ == "__main__":
    main()
