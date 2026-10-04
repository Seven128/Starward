"""Independent actual mosaic arrays, source sampling, pyramid and mutation.

Task-only evidence. No download, publication, runtime or quality adoption.
"""
from pathlib import Path
import argparse
import copy
import hashlib
import io
import json
import math
import sys
from types import ModuleType, SimpleNamespace

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / "output/allwise-w3-atlas-0929/python-deps"),
               str(ROOT / "data-pipelines/deep-sky")]
import numpy as np
from astropy.wcs import WCS
from PIL import Image
from sdss_corrected_frame import read_cached_frame

BANDS = ("g", "r", "i")
FIELD_KEYS = ("301/3699/6/99", "301/3699/6/100", "301/3699/6/101",
              "301/3716/6/116", "301/3716/6/117", "301/3716/6/118")


def binding(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest()}


def checked_array(directory, descriptor):
    path = (directory / descriptor["file"]).resolve()
    if not path.is_relative_to(directory.resolve()):
        raise RuntimeError("array_path_outside_generation")
    actual = binding(path)
    if (actual["bytes"], actual["sha256"]) != (descriptor["bytes"], descriptor["sha256"]):
        raise RuntimeError("array_binding_mismatch")
    value = np.load(path, allow_pickle=False, mmap_mode="r")
    if list(value.shape) != descriptor["shape"] or value.dtype.str != descriptor["dtype"]:
        raise RuntimeError("array_shape_dtype_mismatch")
    return value


def independent_sample(data, x, y):
    inside = (np.isfinite(x) & np.isfinite(y) & (x >= 0) & (y >= 0) &
              (x < data.shape[1] - 1) & (y < data.shape[0] - 1))
    value = np.full(x.shape, np.nan, dtype=np.float32)
    xx, yy = np.floor(x[inside]).astype(int), np.floor(y[inside]).astype(int)
    q = np.array([data[yy, xx], data[yy, xx + 1], data[yy + 1, xx], data[yy + 1, xx + 1]], dtype=np.float64)
    finite = np.isfinite(q).all(axis=0)
    dx, dy = x[inside] - xx, y[inside] - yy
    v = q[0] * (1 - dx) * (1 - dy) + q[1] * dx * (1 - dy) + q[2] * (1 - dx) * dy + q[3] * dx * dy
    available = inside.copy()
    available[inside] = finite
    value[available] = v[finite]
    return value, available


def load_owner(source, name):
    module = ModuleType(name)
    module.__file__ = str(ROOT / "data-pipelines/deep-sky/sdss_gri_tan.py")
    sys.modules[name] = module
    exec(compile(source, module.__file__, "exec"), module.__dict__)
    return module


def black_measurement_fixture(owner):
    entry = {"objectRef": "M:51", "center": {"frame": "ICRS J2000", "raDeg": 202.469625,
             "decDeg": 47.1951666667}, "orientation": "north-up/east-left"}
    target = owner.target_tan(entry["center"], 32, .1)
    frames = []
    for field, shift in ((1, (8, 8)), (2, (12, 10))):
        for band, value, delta in zip(BANDS, (0, -2, -4), ((.2, .3), (-.5, .1), (.1, -.3))):
            source = copy.deepcopy(target)
            source.wcs.crpix += np.array(shift) + np.array(delta)
            frames.append(SimpleNamespace(data=np.full((64, 64), value, dtype=np.float32), wcs=source,
                receipt={"identity": {"run": 1, "rerun": "301", "camcol": 1, "field": field, "band": band},
                    "scientificSamples": {"unit": "nanomaggies/pixel", "calibrationAlreadyApplied": True,
                                           "skyAlreadySubtracted": True},
                    "decompressed": {"completeScientificArrays": True}}))
    master = owner.build_mosaic_master(frames, entry, 32, .1, require_complete=True)
    assert master.joint_available.all()
    for band, value in zip(BANDS, (0, -2, -4)):
        assert np.all(master.bands[band].data == value), "finite black/negative measurements were modified or marked missing"
    return {"fullCoherentPixels": int(master.joint_available.sum()), "scienceValues": {b: float(master.bands[b].data[16, 16]) for b in BANDS}}


def partial_coadd_contract_fixture(owner, enforce=True):
    entry = {"objectRef": "M:51", "center": {"frame": "ICRS J2000", "raDeg": 202.469625,
             "decDeg": 47.1951666667}, "orientation": "north-up/east-left"}
    target = owner.target_tan(entry["center"], 32, .1)
    source = copy.deepcopy(target)
    source.wcs.crpix += [8, 8]
    frames = []
    for field in (1, 2):
        for band in BANDS:
            data = np.ones((64, 64), dtype=np.float32)
            if (field, band) in ((1, "g"), (2, "i")):
                data[:, 16:24] = np.nan
            frames.append(SimpleNamespace(data=data, wcs=source,
                receipt={"identity": {"run": 1, "rerun": "301", "camcol": 1, "field": field, "band": band},
                    "scientificSamples": {"unit": "nanomaggies/pixel", "calibrationAlreadyApplied": True,
                                           "skyAlreadySubtracted": True},
                    "decompressed": {"completeScientificArrays": True}}))
    master = owner.build_mosaic_master(frames, entry, 32, .1)
    assert not master.joint_available[12, 12]
    rows = {}
    for band in BANDS:
        projected = master.bands[band]
        mask = projected.footprint & projected.finite_neighbors
        mismatch = mask != np.isfinite(projected.data)
        rows[band] = {"maskDataMismatchPixels": int(mismatch.sum()),
                      "centerDataIsNaN": bool(np.isnan(projected.data[12, 12])),
                      "centerAvailabilityMask": bool(mask[12, 12])}
        if enforce:
            assert not mismatch.any(), "coadd ProjectedBand availability admits NaN where no coherent gri field exists"
            union = master.independent_band_unions[band]
            assert (union.footprint & union.finite_neighbors).all(), "independent available measurements were discarded with incomplete common color support"
    assert master.mosaic_fields["301/1/1/1"]["i"].finite_neighbors[12, 12]
    assert master.mosaic_fields["301/1/1/2"]["g"].finite_neighbors[12, 12]
    try:
        owner.build_mosaic_master(frames, entry, 32, .1, require_complete=True)
    except RuntimeError as error:
        assert str(error) == "sdss_mosaic_target_incomplete"
    else:
        raise AssertionError("partial coherent mosaic was accepted as complete")
    return {"coherentPixels": int(master.joint_available.sum()), "perBand": rows,
            "independentKnownGIInFieldSidecars": True, "requireCompleteRejects": True}


def independent_weight_formula_checks(candidate, directory):
    n = candidate["pixels"]
    target = WCS(candidate["wcsHeader"])
    grid = np.linspace(0, n - 1, 128).astype(int)
    yy, xx = np.meshgrid(grid, grid, indexing="ij")
    world = target.wcs_pix2world(xx, n - 1 - yy, 0)
    source_review = ROOT / "output/sdss-m51-mosaic-source-independent-1002-r3"
    masks = {b: np.load(source_review / (b + "-field-membership.npy"), allow_pickle=False)[yy, xx] for b in BANDS}
    expected_raw = {}
    fields_by_name = {row["fieldKey"]: row for row in candidate["mosaic"]["fields"]}
    for index, name in enumerate(FIELD_KEYS):
        distances = []
        coherent = np.logical_and.reduce([(masks[b] & (1 << index)) > 0 for b in BANDS])
        for band in BANDS:
            receipt = fields_by_name[name]["perBand"][band]["sourceReceipt"]
            x, y = WCS(receipt["wcs"]["celestialHeader"]).wcs_world2pix(*world, 0)
            rows, columns = receipt["scientificSamples"]["shapeRowsColumns"]
            distance = np.minimum.reduce([x, y, columns - 1 - x, rows - 1 - y])
            distances.append(np.maximum(distance, 0).astype(np.float32))
        expected_raw[name] = np.where(coherent, np.minimum.reduce(distances) + 1, 0).astype(np.float32)
    denominator = sum(value.astype(np.float64) for value in expected_raw.values())
    assert (denominator > 0).all()
    errors = {}
    for name in FIELD_KEYS:
        expected = (expected_raw[name] / denominator).astype(np.float32)
        actual = checked_array(directory, candidate["mosaic"]["diagnostics"][name]["normalized-weight"])[yy, xx]
        difference = np.abs(expected.astype(np.float64) - actual)
        assert difference.max() < 1e-7, "stored common field weights differ from actual min-three-band stencil geometry"
        errors[name] = float(difference.max())
    return {"perFieldGridPoints": int(xx.size), "fieldCount": len(FIELD_KEYS),
            "maximumNormalizedWeightFormulaDifferences": errors,
            "meaning": "Actual bound source WCS and independently verified finite memberships determine geometric preference only, not confidence or background matching"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise RuntimeError("preserve_existing_independent_review_generation")
    args.output.mkdir(parents=True)
    script_before = binding(Path(__file__))
    owner_path = ROOT / "data-pipelines/deep-sky/sdss_gri_tan.py"
    owner_before = binding(owner_path)
    owner_source = owner_path.read_text(encoding="utf-8")
    (args.output / "owner-reviewed.py.txt").write_text(owner_source, encoding="utf-8")
    candidate = json.loads(args.candidate.read_bytes())
    directory = args.candidate.parent
    generation_binding = json.loads((directory / "binding.json").read_bytes())
    assert generation_binding["sourceFilesBefore"] == generation_binding["sourceFilesAfter"]
    assert generation_binding["oldAssetsBefore"] == generation_binding["oldAssetsAfter"]
    assert generation_binding["oldCandidateBefore"] == generation_binding["oldCandidateAfter"]
    for record in (generation_binding["sourceFilesAfter"] + generation_binding["candidateOutputs"] +
                   generation_binding["oldCandidateAfter"]):
        assert binding(ROOT / record["path"]) == record, "generation binding no longer matches actual source/output"
    target, n = WCS(candidate["wcsHeader"]), candidate["pixels"]
    assert n == 2048 and candidate["mosaic"]["fieldCount"] == 6
    assert candidate["science"]["scientificValidity"] == "UNKNOWN"
    source_review_dir = ROOT / "output/sdss-m51-mosaic-source-independent-1002-r3"
    independent_membership = {b: np.load(source_review_dir / (b + "-field-membership.npy"), allow_pickle=False) for b in BANDS}
    arrays = {key: checked_array(directory, meta) for key, meta in candidate["arrays"].items()}
    assert arrays["joint-availability"].all()
    independent_unions = {b: {key: checked_array(directory, meta) for key, meta in descriptors.items()}
                          for b, descriptors in candidate["mosaic"]["independentSourceUnions"].items()}
    for band in BANDS:
        assert np.array_equal(independent_unions[band]["footprint"] & independent_unions[band]["finite-neighbors"],
                              independent_membership[band] > 0)
        assert np.array_equal(arrays[band + "-footprint"] & arrays[band + "-finite-neighbors"],
                              np.isfinite(arrays[band + "-science"]))
    field_arrays = {name: {key: checked_array(directory, meta) for key, meta in descriptors.items()}
                    for name, descriptors in candidate["mosaic"]["diagnostics"].items()}
    assert set(field_arrays) == set(FIELD_KEYS)
    count = checked_array(directory, candidate["mosaic"]["contributorCount"])
    expected_count = np.zeros((n, n), dtype=np.uint32)
    expected_weight_sum = np.zeros((n, n), dtype=np.float64)
    recomputed = {b: np.zeros((n, n), dtype=np.float64) for b in BANDS}
    for index, name in enumerate(FIELD_KEYS):
        field = field_arrays[name]
        for band in BANDS:
            actual_availability = field[band + "-footprint"] & field[band + "-finite-neighbors"]
            independent = (independent_membership[band] & (1 << index)) > 0
            assert np.array_equal(actual_availability, independent), "field mask differs from independent actual source WCS"
        coherent = np.logical_and.reduce([field[b + "-footprint"] & field[b + "-finite-neighbors"] for b in BANDS])
        weight = field["normalized-weight"]
        assert np.isfinite(weight).all() and ((weight >= 0) & (weight <= 1)).all()
        assert np.array_equal(weight > 0, coherent)
        expected_count += coherent
        expected_weight_sum += weight
        for band in BANDS:
            recomputed[band] += np.where(weight > 0, field[band + "-science"], 0).astype(np.float64) * weight
    assert np.array_equal(expected_count, count)
    weight_error = float(np.max(np.abs(expected_weight_sum - 1)))
    assert weight_error < 1e-6
    coadd_errors = {}
    for band in BANDS:
        actual = arrays[band + "-science"]
        assert np.isfinite(actual).all()
        error = np.abs(recomputed[band] - actual)
        assert np.all(error <= 1e-6 + 2e-7 * np.abs(actual)), "saved common weights do not reproduce actual coadd"
        coadd_errors[band] = float(error.max())
    grid = np.linspace(0, n - 1, 128).astype(int)
    yy, xx = np.meshgrid(grid, grid, indexing="ij")
    world = target.wcs_pix2world(xx, n - 1 - yy, 0)
    sampling = []
    for field_row in candidate["mosaic"]["fields"]:
        name = field_row["fieldKey"]
        for band in BANDS:
            receipt = field_row["perBand"][band]["sourceReceipt"]
            source = receipt["source"]
            frame = read_cached_frame(Path(source["path"]), {**receipt["identity"], "bytes": source["bytes"],
                "sha256": source["sha256"], "sourceUrl": source["sourceUrl"]}, max_uncompressed_bytes=32 * 1024 * 1024)
            x, y = frame.wcs.wcs_world2pix(*world, 0)
            expected, available = independent_sample(frame.data, x, y)
            actual = field_arrays[name][band + "-science"][yy, xx]
            assert np.array_equal(np.isfinite(actual), available)
            difference = np.abs(actual[available].astype(float) - expected[available].astype(float))
            assert np.all(difference <= 1e-6 + 2e-7 * np.abs(expected[available]))
            sampling.append({"field": name, "band": band, "gridPoints": int(xx.size), "availablePoints": int(available.sum()),
                             "maximumSampleDifference": float(difference.max()) if difference.size else None})
    rgb, alternative = arrays["rgb-master"], arrays["display-contribution-master"]
    reconstructed = np.rint(alternative[:, :, :3].astype(float) * alternative[:, :, 3:4] / 255).astype(np.uint8)
    assert np.array_equal(rgb, reconstructed)
    levels = {}
    for level, meta in candidate["levels"].items():
        start, ystart, end, yend = meta["masterCrop"]["boundsXYExclusive"]
        factor, p = meta["masterCrop"]["boxFactor"], meta["pixels"]
        assert start == ystart and end == yend and end - start == p * factor
        assert start + end == n and meta["crpixFitsOneBased"] == (p + 1) / 2
        exact_field = math.degrees(2 * math.atan(math.tan(math.radians(candidate["fieldDegrees"]) / 2) * (end - start) / n))
        assert abs(meta["fieldDegrees"] - exact_field) < 1e-12
        images = {}
        for label, descriptor, master in (("availability", meta, np.dstack((rgb, np.full((n, n), 255, dtype=np.uint8)))),
                                           ("contribution", meta["alternativeDisplay"], alternative)):
            path = directory / descriptor["file"]
            assert binding(path)["sha256"] == descriptor["sha256"] and path.stat().st_size == descriptor["bytes"]
            decoded = np.array(Image.open(path))
            crop = master[start:end, start:end]
            a = crop[:, :, 3].reshape(p, factor, p, factor).sum(axis=(1, 3), dtype=np.uint64)
            premult = crop[:, :, :3].astype(np.uint32) * crop[:, :, 3:4]
            sums = premult.reshape(p, factor, p, factor, 3).sum(axis=(1, 3), dtype=np.uint64)
            color = np.zeros((p, p, 3), dtype=float)
            np.divide(sums, a[..., None], out=color, where=a[..., None] > 0)
            expected = np.dstack((np.rint(color).astype(np.uint8), np.rint(a / factor ** 2).astype(np.uint8)))
            assert np.array_equal(decoded, expected), "level does not preserve once-mapped master pixels"
            images[label] = binding(path)
        points = np.array([[0, 0], [p - 1, 0], [p - 1, p - 1], [0, p - 1], [(p - 1) / 2] * 2])
        level_world = WCS(meta["wcsHeader"]).wcs_pix2world(points[:, 0], p - 1 - points[:, 1], 0)
        master_world = target.wcs_pix2world(start + factor * (points[:, 0] + .5) - .5,
                                          n - 1 - (start + factor * (points[:, 1] + .5) - .5), 0)
        world_error = float(np.max(np.abs(np.array(level_world) - np.array(master_world))))
        assert world_error < 1e-9
        levels[level] = {"images": images, "maximumWorldCoordinateDifferenceDegrees": world_error}
    old_binding_path = ROOT / "output/sdss-gri-tan-candidate-1002/binding.json"
    old_binding = json.loads(old_binding_path.read_bytes())
    old_outputs = old_binding["outputs"]
    assets = old_binding["oldAssetsAfter"]
    for record in old_outputs + assets:
        assert binding(ROOT / record["path"]) == record, "old output or publication asset changed"
    preserved_path = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json"
    preserved = json.loads(preserved_path.read_bytes())
    for record in preserved:
        assert binding(ROOT / record["path"])["sha256"] == record["sha256"]
    owner = load_owner(owner_source, "independent_sdss_mosaic_owner")
    weight_formula = independent_weight_formula_checks(candidate, directory)
    actual_fixture = black_measurement_fixture(owner)
    partial_fixture = partial_coadd_contract_fixture(owner)
    needle = "raw_weight = np.where(joint_field, distance + 1, 0).astype(np.float32)"
    assert owner_source.count(needle) == 1
    mutated_source = owner_source.replace(needle, needle + " * (projected['g'].data > 0)")
    (args.output / "bounded-mutant.py.txt").write_text(mutated_source, encoding="utf-8")
    try:
        black_measurement_fixture(load_owner(mutated_source, "independent_sdss_mosaic_mutant"))
    except (AssertionError, RuntimeError) as error:
        mutation = {"detected": True, "errorType": type(error).__name__, "message": str(error),
                    "meaning": "Bounded tempting brightness-mask mutation loses valid black/negative measurements"}
    else:
        raise AssertionError("bounded brightness-mask mutation escaped")
    if owner_before != binding(owner_path) or script_before != binding(Path(__file__)):
        raise RuntimeError("review_owner_or_script_changed_during_run")
    report = {"version": "sdss-m51-mosaic-independent-output-review-v1", "script": script_before,
              "owner": owner_before, "candidate": binding(args.candidate), "binding": binding(directory / "binding.json"),
              "sourceReview": binding(source_review_dir / "review.json"), "fieldMasksExactlyMatchIndependentSource": True,
              "maximumNormalizedWeightSumError": weight_error, "maximumCoaddReconstructionDifferencesNanomaggies": coadd_errors,
              "independentSourceSampling": sampling, "levels": levels, "oldOutputsUnchanged": len(old_outputs),
              "oldPublicationAssetsUnchanged": len(assets), "unrelatedPreservedFilesUnchanged": len(preserved),
              "validBlackNegativeFixture": actual_fixture, "boundedMutation": mutation,
              "partialCoaddDataAvailabilityFixture": partial_fixture,
              "independentActualGeometryWeightFormula": weight_formula,
              "scope": "Actual offline source/data/weight/geometry/encoded-pixel correctness checks only. Scientific validity, full asTrans/fpM, display quality, immutable publication/native/DAU acceptance remain unverified"}
    (args.output / "review.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"review": str(args.output / "review.json"), "sourceFrameSamplingRows": len(sampling),
                     "fullSourceMasksMatch": True, "oldAssetsUnchanged": len(assets), "mutation": mutation,
                     "maximumWeightSumError": weight_error, "coaddErrors": coadd_errors}))


if __name__ == "__main__":
    main()
