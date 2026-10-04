"""Independent actual cached gri source/target-stencil review; no network.

This task evidence uses primary-header linear TAN only. Finite interpolation
availability does not certify artifact flags, full asTrans or image quality.
"""
from pathlib import Path
import argparse
import bz2
import hashlib
import io
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / "output/allwise-w3-atlas-0929/python-deps"),
               str(ROOT / "data-pipelines/deep-sky")]
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
from sdss_corrected_frame import read_cached_frame

BANDS = ("g", "r", "i")
FIELDS = ((3699, 6, 99), (3699, 6, 100), (3699, 6, 101),
          (3716, 6, 116), (3716, 6, 117), (3716, 6, 118))


def binding(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest()}


def field_key(identity):
    return "/".join(str(identity[key]) for key in ("rerun", "run", "camcol", "field"))


def independent_stencil(source, x, y):
    geometric = (np.isfinite(x) & np.isfinite(y) & (x >= 0) & (y >= 0) &
                 (x < source.shape[1] - 1) & (y < source.shape[0] - 1))
    available = np.zeros(x.shape, dtype=bool)
    xx, yy = np.floor(x[geometric]).astype(int), np.floor(y[geometric]).astype(int)
    available[geometric] = (np.isfinite(source[yy, xx]) & np.isfinite(source[yy, xx + 1]) &
                            np.isfinite(source[yy + 1, xx]) & np.isfinite(source[yy + 1, xx + 1]))
    return geometric, available


def main():
    script_before = binding(Path(__file__))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise RuntimeError("preserve_existing_independent_review_generation")
    args.output.mkdir(parents=True)
    source_dir = ROOT / "output/sdss-corrected-m51-1002/sources"
    receipt_dir = source_dir.parent
    receipt_paths = [receipt_dir / name for name in
                     ("frame-acquisition.json", "field-r-acquisition.json", "field-gi-acquisition.json")]
    records = {}
    for path in receipt_paths:
        receipt = json.loads(path.read_bytes())
        for record in receipt["sourceFiles"]:
            identity = record["identity"]
            key = (identity["run"], identity["camcol"], identity["field"], identity["band"])
            if key in records:
                raise RuntimeError("duplicate_actual_acquisition_record")
            records[key] = record
    candidate_path = ROOT / "output/sdss-gri-tan-candidate-1002/candidate.json"
    candidate = json.loads(candidate_path.read_bytes())
    target = WCS(candidate["wcsHeader"])
    n = candidate["pixels"]
    if n != 2048 or target.wcs.radesys != "ICRS":
        raise RuntimeError("target_contract_changed")
    reader = ROOT / "data-pipelines/deep-sky/sdss_corrected_frame.py"
    reader_before = binding(reader)
    arrays, source_rows, summaries = {}, [], {}
    for band in BANDS:
        membership = np.zeros((n, n), dtype=np.uint8)
        geometry_union = np.zeros((n, n), dtype=bool)
        for index, (run, camcol, field) in enumerate(FIELDS):
            record = records[(run, camcol, field, band)]
            path = source_dir / record["path"]
            expected = {**record["identity"], "bytes": record["bytes"],
                        "sha256": record["sha256"], "sourceUrl": record["url"]}
            frame = read_cached_frame(path, expected, max_uncompressed_bytes=32 * 1024 * 1024)
            # Read the unchanged calibrated primary independently too: the
            # admitted array must not apply NMGY or sky again.
            with fits.open(io.BytesIO(bz2.decompress(path.read_bytes())), memmap=False) as hdus:
                primary_equal = np.array_equal(frame.data, hdus[0].data, equal_nan=True)
            if not primary_equal:
                raise RuntimeError("source_reader_changed_primary_measurements")
            geometric = np.zeros((n, n), dtype=bool)
            available = np.zeros((n, n), dtype=bool)
            for start in range(0, n, 64):
                end = min(n, start + 64)
                yy, xx = np.mgrid[start:end, 0:n]
                # Use the low-level linear WCS pair, independent of owner's
                # all_* calls. Actual admitted inputs have no distortion WCS.
                world = target.wcs_pix2world(xx, n - 1 - yy, 0)
                x, y = frame.wcs.wcs_world2pix(*world, 0)
                gg, aa = independent_stencil(frame.data, x, y)
                geometric[start:end], available[start:end] = gg, aa
            membership[available] |= 1 << index
            geometry_union |= geometric
            finite = np.isfinite(frame.data)
            source_rows.append({"identity": frame.receipt["identity"], "source": binding(path),
                "linearWcs": frame.receipt["wcs"]["celestialHeader"],
                "asTransHeaderSha256": frame.receipt["asTrans"]["headerSha256"],
                "admission": frame.receipt["admission"], "primarySamplesExactlyRetained": primary_equal,
                "unit": frame.receipt["scientificSamples"]["unit"],
                "bunit": frame.receipt["scientificSamples"]["actualBunit"],
                "nmgyAlreadyApplied": frame.receipt["scientificSamples"]["appliedNmgyPerCount"],
                "finiteSamples": int(finite.sum()), "nonfiniteSamples": int((~finite).sum()),
                "zeroSamples": int((finite & (frame.data == 0)).sum()),
                "negativeSamples": int((finite & (frame.data < 0)).sum()),
                "targetGeometricPixels": int(geometric.sum()), "targetAvailablePixels": int(available.sum()),
                "targetNonfiniteStencilPixels": int((geometric & ~available).sum())})
        output_path = args.output / (band + "-field-membership.npy")
        with output_path.open("xb") as output:
            np.save(output, membership, allow_pickle=False)
        arrays[band] = binding(output_path)
        multiplicity = np.zeros(membership.shape, dtype=np.uint8)
        unique_required = {}
        for index, identity in enumerate(FIELDS):
            multiplicity += (membership & (1 << index)) != 0
            unique_required["301/" + "/".join(str(item) for item in identity)] = int((membership == (1 << index)).sum())
        summary = {"availablePixels": int((membership > 0).sum()), "unavailablePixels": int((membership == 0).sum()),
                   "geometricPixels": int(geometry_union.sum()), "totalPixels": n * n,
                   "multiplicityPixels": {str(value): int((multiplicity == value).sum()) for value in range(7)},
                   "uniquePixelsLostIfFieldRemoved": unique_required,
                   "scientificValidity": "UNKNOWN", "fullAsTrans": "NOT_APPLIED", "artifactMask": "NOT_SUPPLIED"}
        summaries[band] = summary
    membership_arrays = [np.load(args.output / (band + "-field-membership.npy"), allow_pickle=False) for band in BANDS]
    joint = np.logical_and.reduce([value > 0 for value in membership_arrays])
    coherent_fields = np.bitwise_and.reduce(membership_arrays)
    coherent = coherent_fields > 0
    excluded = records[(3716, 5, 117, "r")]
    report = {"version": "sdss-m51-mosaic-source-independent-review-v1", "script": script_before,
              "sourceReader": reader_before, "inputs": [binding(path) for path in receipt_paths] + [binding(candidate_path)],
              "targetWcs": candidate["wcsHeader"], "targetPixels": n, "selectedFieldCount": 6,
              "selectedRawFrameCount": len(source_rows), "sources": source_rows, "perBand": summaries,
              "fieldMembershipArrays": arrays, "jointAvailablePixels": int(joint.sum()),
              "jointUnavailablePixels": int((~joint).sum()), "jointFullTargetStencilAvailable": bool(joint.all()),
              "coherentSameFieldGriAvailablePixels": int(coherent.sum()),
              "coherentSameFieldGriUnavailablePixels": int((~coherent).sum()),
              "coherentSameFieldGriFullTargetAvailable": bool(coherent.all()),
              "excludedCamcol5RawRInput": excluded["path"],
              "scope": "Actual all-target primary-linear-WCS four-finite-neighbor availability only; not full astrometry, artifact-free science, image quality, publication or runtime acceptance"}
    if reader_before != binding(reader):
        raise RuntimeError("source_reader_changed_during_review")
    if script_before != binding(Path(__file__)):
        raise RuntimeError("review_script_changed_during_run")
    (args.output / "review.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"review": str(args.output / "review.json"), "frames": len(source_rows),
                      "perBand": summaries, "jointAvailablePixels": int(joint.sum()),
                      "jointFullTargetStencilAvailable": bool(joint.all()),
                      "coherentSameFieldGriAvailablePixels": int(coherent.sum())}))


if __name__ == "__main__":
    main()
