"""Read cached core-field quality in the actual M51 DETAIL/source coordinates.

No acquisition, source correction, mosaic weight, display or publication change.
The flags diagnose a single field; they are not sample availability or a policy
for accepting/rejecting measurements. Kernel summaries are not measured FWHM.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
sys.path[:0] = [str(ROOT / "data-pipelines/deep-sky"),
               str(ROOT / "output/allwise-w3-atlas-0929/python-deps")]

import numpy as np
from astropy.wcs import WCS

from sdss_corrected_frame import read_cached_frame
from sdss_frame_quality import check_frame_quality, read_cached_fpm, read_cached_psfield
from sdss_gri_tan import bilinear_samples, reproject_band

BANDS = ("g", "r", "i")
CORE = {"run": 3699, "rerun": "301", "camcol": 6, "field": 100}
SOURCE_LIMIT = 32 * 1024 * 1024
QUALITY_LIMIT = 16 * 1024 * 1024


def bound(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest()}


def save(path, value):
    with path.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n")


def inventory(directory):
    return [bound(path) for path in sorted(directory.rglob("*")) if path.is_file()]


def array_identity(value):
    return {"shape": list(value.shape), "dtype": value.dtype.str,
            "sha256COrder": hashlib.sha256(value.tobytes(order="C")).hexdigest()}


def flag_counts(flags, selected, enum):
    return {name: int(np.count_nonzero(selected & ((flags & (1 << bit)) != 0)))
            for name, bit in enum.items() if 0 <= bit < 10}


def save_array(path, value):
    with path.open("xb") as stream:
        np.save(stream, value, allow_pickle=False)
    decoded = np.load(path, allow_pickle=False)
    assert decoded.dtype == value.dtype and decoded.shape == value.shape
    assert decoded.tobytes() == value.tobytes()
    return {**bound(path), **array_identity(value)}


def kernel_summary(kernel):
    assert kernel.ndim == 2 and kernel.dtype == np.float64 and np.isfinite(kernel).all()
    total, squared = float(kernel.sum(dtype=np.float64)), float(np.sum(kernel * kernel))
    assert total > 0 and squared > 0
    yy, xx = np.indices(kernel.shape)
    return {**array_identity(kernel), "sumSignedRelative": total,
            "negativePixels": int(np.count_nonzero(kernel < 0)),
            "minimumSignedRelative": float(kernel.min()), "maximumSignedRelative": float(kernel.max()),
            "relativeKernelCentroidColumnRow": [float(np.sum(kernel * xx) / total),
                                                 float(np.sum(kernel * yy) / total)],
            "noiseEquivalentAreaSourcePixels": total * total / squared,
            "meaning": "Relative reconstructed source kernel; signed values retained. NEA is neither FWHM nor a mosaic/target resolution measurement."}


def previous_bilinear(source, x, y):
    """Task-only e319aca1 geometry/formula before the shared-stencil extraction.

    This is a byte-compatibility reference, not independent scientific truth.
    It never calls the newly extracted geometry owner.
    """
    rows, columns = source.shape
    footprint = (np.isfinite(x) & np.isfinite(y) & (x >= 0) & (y >= 0) &
                 (x < columns - 1) & (y < rows - 1))
    output = np.full(x.shape, np.nan, dtype=np.float32)
    finite_neighbors = np.zeros(x.shape, dtype=np.bool_)
    if not footprint.any():
        return output, footprint, finite_neighbors
    xx, yy = x[footprint], y[footprint]
    x0, y0 = np.floor(xx).astype(np.intp), np.floor(yy).astype(np.intp)
    neighbours = np.stack([source[y0, x0], source[y0, x0 + 1],
                           source[y0 + 1, x0], source[y0 + 1, x0 + 1]])
    finite = np.isfinite(neighbours).all(axis=0)
    finite_neighbors[footprint] = finite
    dx, dy = xx[finite] - x0[finite], yy[finite] - y0[finite]
    values = neighbours[:, finite].astype(np.float64)
    output[finite_neighbors] = (values[0] * (1 - dx) * (1 - dy) + values[1] * dx * (1 - dy) +
                               values[2] * (1 - dx) * dy + values[3] * dx * dy).astype(np.float32)
    return output, footprint, finite_neighbors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    assert output.is_relative_to((ROOT / "output").resolve()) and not output.exists()
    candidate_path = ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json"
    assert bound(candidate_path)["sha256"] == "73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52"
    acquisition_path = ROOT / "output/sdss-m51-core-quality-inputs-1002-r1/acquisition.json"
    assert bound(acquisition_path)["sha256"] == "5b4d5e73c52bf1613412ba948ae5d2046a38f7991bd54dc353298fe9e1686eb8"
    candidate = json.loads(candidate_path.read_bytes())
    acquisition = json.loads(acquisition_path.read_bytes())
    field = next(item for item in candidate["mosaic"]["fields"] if item["identity"] == CORE)
    inputs = {item["filename"]: item for item in acquisition["sourceFiles"]}
    target = WCS(candidate["levels"]["DETAIL"]["wcsHeader"])
    pixels = 512
    center = candidate["center"]
    assert target.wcs.radesys == "ICRS"
    owners = [ROOT / "data-pipelines/deep-sky" / name for name in (
        "sdss_frame_quality.py", "sdss_source_stencil.py", "sdss_corrected_frame.py",
        "sdss_gri_tan.py", "image_quality.py")]
    owner_before = [bound(path) for path in owners]
    old_assets = inventory(ROOT / "workers/miniapp-api/assets/deep-sky")
    assert len(old_assets) == 201
    preserved = json.loads((TASK / "tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    assert all(bound(ROOT / item["path"])["sha256"] == item["sha256"] for item in preserved)
    source_before = inventory(ROOT / "output/sdss-m51-core-quality-inputs-1002-r1")
    candidate_before = inventory(candidate_path.parent)
    output.mkdir(parents=True)
    script_snapshot = output / "executed-script.py"
    script_snapshot.write_bytes(Path(__file__).read_bytes())
    save(output / "started.json", {"scope": __doc__, "script": bound(script_snapshot),
                                  "owners": owner_before, "candidate": bound(candidate_path),
                                  "acquisition": bound(acquisition_path), "requests": 0})

    def source_binding(filename, band=None):
        record = inputs[filename]
        expected = {**CORE, "bytes": record["bytes"], "sha256": record["sha256"],
                    "sourceUrl": record["url"]}
        if band is not None:
            expected["band"] = band
        path = ROOT / record["raw"]["path"]
        assert bound(path) == record["raw"]
        return path, expected

    ps_path, ps_expected = source_binding("psField-003699-6-0100.fit")
    psf = read_cached_psfield(ps_path, ps_expected, max_uncompressed_bytes=QUALITY_LIMIT)
    yy, xx = np.mgrid[0:pixels, 0:pixels]
    ra, dec = target.all_pix2world(xx, pixels - 1 - yy, 0)
    bands = {}
    # A single target and the same north/top row convention as the renderer.
    for band in BANDS:
        frame_receipt = field["perBand"][band]["sourceReceipt"]
        identity, source = frame_receipt["identity"], frame_receipt["source"]
        assert {key: identity[key] for key in CORE} == CORE and identity["band"] == band
        expected_frame = {**identity, "bytes": source["bytes"], "sha256": source["sha256"],
                          "sourceUrl": source["sourceUrl"]}
        frame_path = Path(source["path"])
        frame = read_cached_frame(frame_path, expected_frame, max_uncompressed_bytes=SOURCE_LIMIT)
        frame_before = array_identity(frame.data)
        mask_path, mask_expected = source_binding(f"fpM-003699-{band}6-0100.fit.gz", band)
        mask = read_cached_fpm(mask_path, mask_expected, max_uncompressed_bytes=QUALITY_LIMIT)
        association = check_frame_quality(frame, psf, mask)
        sx, sy = frame.wcs.all_world2pix(ra, dec, 0)
        sampled, geometric, finite = bilinear_samples(frame.data, sx, sy)
        previous = previous_bilinear(frame.data, sx, sy)
        assert sampled.tobytes() == previous[0].tobytes()
        assert np.array_equal(geometric, previous[1]) and np.array_equal(finite, previous[2])
        flags = mask.stencil(sx, sy)
        assert np.array_equal(flags.geometry, geometric)
        # The real projection consumer uses the same geometry, finite-neighbor
        # rule, WCS and float32 result; diagnostics cannot change its samples.
        projected = reproject_band(frame, target, pixels)
        assert sampled.tobytes() == projected.data.tobytes()
        assert np.array_equal(finite, projected.finite_neighbors)
        assert np.array_equal(geometric, projected.footprint)
        available = geometric & finite
        # Independent source coordinate for the catalog centre, not the
        # rounded centre of an even-sized target image.
        cx, cy = frame.wcs.all_world2pix(center["raDeg"], center["decDeg"], 0)
        cx, cy = float(cx), float(cy)
        center_flags = mask.stencil(np.asarray(cx), np.asarray(cy))
        assert center_flags.geometry
        x0, y0 = int(np.floor(cx)), int(np.floor(cy))
        kernel = psf.reconstruct(band, cx, cy)
        psf_samples = []
        for ty, tx in ((0, 0), (0, pixels - 1), (pixels - 1, 0), (pixels - 1, pixels - 1)):
            if geometric[ty, tx]:
                local = psf.reconstruct(band, float(sx[ty, tx]), float(sy[ty, tx]))
                psf_samples.append({"targetColumnRow": [tx, ty],
                                    "sourceColumnRow": [float(sx[ty, tx]), float(sy[ty, tx])],
                                    **kernel_summary(local)})
        bands[band] = {"correctedSource": bound(frame_path), "correctedReceipt": frame.receipt,
            "qualityReceipt": mask.receipt, "sourceAssociation": association,
            "nativeFlagArray": array_identity(mask.flags),
            "nativePlanePixels": flag_counts(mask.flags, np.ones(mask.flags.shape, dtype=np.bool_), mask.enum),
            "detail": {"totalPixels": pixels * pixels, "geometryPixels": int(geometric.sum()),
                "availablePixels": int(available.sum()),
                "nonfiniteNeighborInsidePixels": int(np.count_nonzero(geometric & ~finite)),
                "allGeometryPlanePixels": flag_counts(flags.flags, geometric, mask.enum),
                "finiteAvailablePlanePixels": flag_counts(flags.flags, available, mask.enum),
                "flags": save_array(output / f"detail-{band}-flags.npy", flags.flags),
                "availability": save_array(output / f"detail-{band}-availability.npy", available),
                "science": array_identity(sampled), "matchesRealProjectionConsumer": True,
                "matchesPreviousBilinearBytesAndMasks": True},
            "center": {"sourceColumnRowZeroIndexed": [cx, cy], "lowerLeftColumnRow": [x0, y0],
                "fourNativeFluxSamples": [float(frame.data[y, x]) for y, x in
                    ((y0, x0), (y0, x0 + 1), (y0 + 1, x0), (y0 + 1, x0 + 1))],
                "fourNativeFlags": [int(mask.flags[y, x]) for y, x in
                    ((y0, x0), (y0, x0 + 1), (y0 + 1, x0), (y0 + 1, x0 + 1))],
                "stencilFlags": int(center_flags.flags),
                "namedStencilFlags": [name for name, bit in mask.enum.items()
                    if 0 <= bit < 10 and int(center_flags.flags) & (1 << bit)],
                "psfKernel": save_array(output / f"center-{band}-relative-psf.npy", kernel),
                "psfSummary": kernel_summary(kernel)},
            "spatialPsfAtDetailCorners": psf_samples,
            "scienceArrayUnchangedAfterQualityReadback": array_identity(frame.data) == frame_before}
        assert bands[band]["scienceArrayUnchangedAfterQualityReadback"]
    assert owner_before == [bound(path) for path in owners]
    assert source_before == inventory(ROOT / "output/sdss-m51-core-quality-inputs-1002-r1")
    assert candidate_before == inventory(candidate_path.parent)
    assert old_assets == inventory(ROOT / "workers/miniapp-api/assets/deep-sky")
    assert all(bound(ROOT / item["path"])["sha256"] == item["sha256"] for item in preserved)
    result = {"scope": "Actual M51 DETAIL and native centre; only one of six mosaic fields has quality inputs",
        "coreIdentity": CORE, "candidate": bound(candidate_path), "acquisition": bound(acquisition_path),
        "psfReceipt": psf.receipt, "target": {"pixels": pixels, "wcsHeader": dict(target.to_header()),
            "orientation": "north-up/east-left", "sourceAstrometry": "Retained primary TAN approximation; not full asTrans or absolute registration"},
        "bands": bands, "requests": 0, "sourceScienceChanged": False,
        "mosaicWeightsDisplayPublicationChanged": False, "old201AssetsUnchanged": True,
        "sixPreservedUnchanged": True, "scientificQuality": "UNKNOWN", "wholeImageQuality": "UNVERIFIED",
        "limitations": ["Flags and interpolation locate source processing; they do not classify astronomical missingness or certify corrected science.",
            "Only field 3699/301/6/100 was read. Five other mosaic fields have no admitted fpM/PSF input here.",
            "A reconstructed relative PSF and its NEA are not measured image sharpness or a deconvolution/noise/weight prescription.",
            "No calibration, masking, correction, RGB, PNG, source adoption, HTTP or native runtime change."]}
    save(output / "result.json", result)
    save(output / "binding.json", {"script": bound(script_snapshot), "owners": owner_before,
        "inputQualityGeneration": source_before, "oldAssets": old_assets, "sixPreserved": preserved,
        "outputs": inventory(output)})
    print(json.dumps({"result": bound(output / "result.json"), "binding": bound(output / "binding.json"),
        "bands": {band: {"centerFlags": bands[band]["center"]["namedStencilFlags"],
            "detailFlaggedPixels": bands[band]["detail"]["finiteAvailablePlanePixels"],
            "relativePsfNEA": bands[band]["center"]["psfSummary"]["noiseEquivalentAreaSourcePixels"]}
            for band in BANDS}, "quality": "UNVERIFIED"}))


if __name__ == "__main__":
    main()
