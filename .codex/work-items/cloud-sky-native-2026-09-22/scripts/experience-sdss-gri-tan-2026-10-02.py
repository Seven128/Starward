"""Render one actual cached field through the shared TAN candidate owner."""
from pathlib import Path
import argparse
import csv
import io
import json
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / "output/allwise-w3-atlas-0929/python-deps"), str(ROOT / "data-pipelines/deep-sky")]
import astropy
import numpy as np
from PIL import Image
import sdss_gri_tan as owner
from sdss_corrected_frame import read_cached_band_set
from image_quality import digest, write_report


def binding(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": digest(raw)}


def inventory(directory):
    return [binding(path) for path in sorted(directory.rglob("*")) if path.is_file()]


def projected_stars(path, frames, master, report, output):
    text = path.read_text(encoding="utf-8")
    stars = list(csv.DictReader(io.StringIO("\n".join(line for line in text.splitlines() if not line.startswith("#")))))
    results = []
    counts = {"sourceBandFourNeighbor": {band: 0 for band in owner.BANDS}, "jointSourceFourNeighbor": 0,
              "masterJointAvailable": 0, "levelAvailableDisplayPixels": {level: 0 for level in owner.LEVELS}}
    encoded = {level: np.asarray(Image.open(output / metadata["file"])) for level, metadata in report["levels"].items()}
    n = master.joint_available.shape[0]
    for star in stars:
        world = [float(star["ra"]), float(star["dec"])]
        by_band = {}
        for frame in frames:
            band = frame.receipt["identity"]["band"]
            x, y = frame.wcs.all_world2pix([world], 0)[0]
            sampled, geometric, finite = owner.bilinear_samples(frame.data, np.array([x]), np.array([y]))
            usable = bool(geometric[0] and finite[0])
            counts["sourceBandFourNeighbor"][band] += int(usable)
            by_band[band] = {"sourceFitsPixelXYZeroBased": [float(x), float(y)], "fourNeighborAvailable": usable,
                             "sampleNanomaggiesPerPixel": float(sampled[0]) if usable else None}
        joint_source = all(value["fourNeighborAvailable"] for value in by_band.values())
        counts["jointSourceFourNeighbor"] += int(joint_source)
        x, y_fits = master.target.all_world2pix([world], 0)[0]
        y = n - 1 - y_fits
        ix, iy = int(round(x)), int(round(y))
        available = 0 <= ix < n and 0 <= iy < n and bool(master.joint_available[iy, ix])
        counts["masterJointAvailable"] += int(available)
        levels = {}
        for level, metadata in report["levels"].items():
            wcs = owner.target_tan(report["center"], metadata["pixels"], metadata["fieldDegrees"])
            px, py_fits = wcs.all_world2pix([world], 0)[0]
            py = metadata["pixels"] - 1 - py_fits
            lx, ly = int(round(px)), int(round(py))
            display_available = (0 <= lx < metadata["pixels"] and 0 <= ly < metadata["pixels"] and
                                 encoded[level][ly, lx, 3] > 0)
            counts["levelAvailableDisplayPixels"][level] += int(display_available)
            levels[level] = {"imagePixelXYZeroBased": [float(px), float(py)],
                             "nearestPixelAvailabilityAlphaPositive": bool(display_available)}
        results.append({"objID": star["objID"], "raDeg": world[0], "decDeg": world[1], "rMagnitude": float(star["r"]),
                        "sourceBands": by_band, "jointSourceFourNeighbor": joint_source,
                        "masterImagePixelXYZeroBased": [float(x), float(y)], "masterNearestJointAvailable": available,
                        "levels": levels})
    write_report(output / "catalog-star-projections.json", {"source": binding(path), "rows": len(stars),
        "counts": counts, "stars": results,
        "meaning": "Independent previously acquired SDSS PhotoPrimary coordinate inputs projected by actual raw/target WCS. Predictions and availability only, no centroid fitting or absolute-astrometry certification."})
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--acquisition", type=Path, required=True)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--catalog", type=Path, default=ROOT / "packages/astronomy-core/data/opengc-messier-deep-sky.v1.json")
    parser.add_argument("--stars", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--master-pixels", type=int, default=2048)
    parser.add_argument("--max-uncompressed-bytes", type=int, default=32 * 1024 * 1024)
    args = parser.parse_args()
    if args.output.exists():
        raise RuntimeError("preserve_existing_generation_choose_new_output")
    acquisition = json.loads(args.acquisition.read_bytes())
    entry = json.loads(args.manifest.read_bytes())
    row = next(row for row in json.loads(args.catalog.read_bytes())["rows"] if row["objectRef"] == acquisition["objectRef"])
    if entry["objectRef"] != acquisition["objectRef"]:
        raise RuntimeError("candidate_catalog_identity_mismatch")
    if astropy.__version__ != owner.TRANSFER["version"]:
        raise RuntimeError("candidate_astropy_version_changed")
    previous = inventory(ROOT / "workers/miniapp-api/assets/deep-sky")
    records = [{**item["identity"], "path": item["path"], "sha256": item["sha256"], "bytes": item["bytes"],
                "sourceUrl": item["url"]} for item in acquisition["sourceFiles"]]
    started = time.monotonic()
    frames = read_cached_band_set(args.source_dir, records, owner.BANDS,
                                 max_uncompressed_bytes=args.max_uncompressed_bytes)
    master = owner.build_master(frames, entry, args.master_pixels, entry["levels"]["OVERVIEW"]["fieldDegrees"])
    report = owner.save_candidate(args.output, master, entry, row)
    elapsed = time.monotonic() - started
    star_counts = projected_stars(args.stars, frames, master, report, args.output) if args.stars else None
    after = inventory(ROOT / "workers/miniapp-api/assets/deep-sky")
    if previous != after:
        raise RuntimeError("existing_publication_assets_changed")
    source_paths = [ROOT / "data-pipelines/deep-sky" / file for file in
        ("sdss_gri_tan.py", "sdss_corrected_frame.py", "image_quality.py", "test_sdss_gri_tan.py", "requirements.txt")]
    task_binding = {"version": owner.VERSION, "scope": "Actual cached single-field input, saved arrays and six PNGs; no publication/runtime adoption or quality acceptance",
        "script": binding(Path(__file__)), "sourceFiles": [binding(path) for path in source_paths],
        "inputs": [binding(args.acquisition), binding(args.manifest), binding(args.catalog),
                   *[binding(args.source_dir / record["path"]) for record in records]],
        "astropyLuptonSource": binding(ROOT / "output/allwise-w3-atlas-0929/python-deps/astropy/visualization/lupton_rgb.py"),
        "outputs": inventory(args.output), "oldAssetsBefore": previous, "oldAssetsAfter": after,
        "elapsedSecondsReadAndRender": elapsed, "fullTargetFieldAvailable": report["science"]["fullTargetFieldAvailable"],
        "jointAvailablePixels": report["science"]["jointAvailablePixels"], "masterPixels": args.master_pixels,
        "starCounts": star_counts, "qualityAcceptance": "UNVERIFIED"}
    write_report(args.output / "binding.json", task_binding)
    print(json.dumps({"candidate": str(args.output / "candidate.json"), "elapsedSeconds": elapsed,
        "masterPixels": args.master_pixels, "jointAvailablePixels": report["science"]["jointAvailablePixels"],
        "fullTargetFieldAvailable": report["science"]["fullTargetFieldAvailable"], "starCounts": star_counts,
        "levelScienceCrop": {level: value["scienceCrop"] for level, value in report["levels"].items()},
        "qualityAcceptance": "UNVERIFIED"}))


if __name__ == "__main__":
    main()
