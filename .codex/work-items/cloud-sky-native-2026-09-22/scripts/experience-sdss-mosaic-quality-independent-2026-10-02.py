"""Offline independent full-mosaic source diagnostic audit; no production oracle.

Reuses the prior independent interval-event SPAN and four-neighbor science
oracles, not the production reader/stencil/sampler or author's assertions.
All six contributors are evaluated over the actual 2048-square target.
"""
import bz2
import gzip
import hashlib
import importlib.util
import io
import json
import math
from pathlib import Path
import sys
import traceback

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
import astropy
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS

OUT = ROOT / "output/sdss-m51-mosaic-quality-independent-1002-r2"
AUTHOR = ROOT / "output/sdss-m51-mosaic-quality-diagnosis-1002-r3"
CANDIDATE = ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json"
BANDS = "gri"
PLANES = ("S_MASK_INTERP", "S_MASK_SATUR", "S_MASK_NOTCHECKED", "S_MASK_OBJECT", "S_MASK_BRIGHTOBJECT", "S_MASK_BINOBJECT", "S_MASK_CATOBJECT", "S_MASK_SUBTRACTED", "S_MASK_GHOST", "S_MASK_CR")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def bind(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": digest(raw)}


def identity(array):
    return {"shape": list(array.shape), "dtype": array.dtype.str,
            "sha256COrder": digest(array.tobytes(order="C"))}


def save(name, value):
    path = OUT / name
    with path.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n")
    return bind(path)


def array(entry):
    path = ROOT / entry["path"]
    assert bind(path) == {k: entry[k] for k in ("path", "bytes", "sha256")}
    result = np.load(path, allow_pickle=False, mmap_mode="r")
    if "sha256COrder" in entry:
        assert identity(result) == {k: entry[k] for k in ("shape", "dtype", "sha256COrder")}
    return result


def frozen(entry):
    return array({**entry, "path": (CANDIDATE.parent / entry["file"]).relative_to(ROOT).as_posix()})


def counts(flags, selected):
    return {name: int(np.count_nonzero(selected & ((flags & (1 << bit)) != 0)))
            for bit, name in enumerate(PLANES)}


def psf_basis(raw, band):
    # Decode actual coefficient wire bytes independently of Astropy TDIM.
    with fits.open(io.BytesIO(raw), memmap=False) as hdus:
        table = hdus["ugriz".index(band) + 1]
        bases = []
        for k, record in enumerate(table.data):
            offset = table.fileinfo()["datLoc"] + k * table.header["NAXIS1"] + 8
            c = np.frombuffer(raw[offset:offset + 100], dtype=">f4").reshape(5, 5).astype(np.float64)
            nr, nc = int(record["nrow_b"]), int(record["ncol_b"])
            image = np.asarray(record["RROWS"], dtype=np.float64).reshape(int(record["RNROW"]), int(record["RNCOL"]))
            assert np.isfinite(c[:nr, :nc]).all() and np.isfinite(image).all()
            bases.append((c, nr, nc, image))
        return bases


def kernel(bases, x, y):
    assert 0 <= x <= 2047 and 0 <= y <= 1488
    rp, cp = (float(y) + .5) * .001, (float(x) + .5) * .001
    result = np.zeros(bases[0][3].shape, dtype=np.float64)
    weights = []
    for c, nr, nc, image in bases:
        weight = sum(c[r, q] * rp ** r * cp ** q for r in range(nr) for q in range(nc))
        weights.append(float(weight))
        result += weight * image
    assert np.isfinite(result).all()
    return result, weights


def kernel_metrics(value):
    total = float(value.sum())
    square = float(np.square(value).sum())
    yy, xx = np.indices(value.shape)
    return {"sumSignedRelative": total, "negativePixels": int(np.count_nonzero(value < 0)),
        "minimumSignedRelative": float(value.min()), "maximumSignedRelative": float(value.max()),
        "relativeKernelCentroidColumnRow": [float(np.sum(value * xx) / total), float(np.sum(value * yy) / total)],
        "noiseEquivalentAreaSourcePixels": total * total / square}


def verify_kernel(bases, x, y, record):
    value, weights = kernel(bases, x, y)
    calculated = kernel_metrics(value)
    for key, expected in calculated.items():
        if isinstance(expected, int):
            assert record[key] == expected
        else:
            assert np.max(np.abs(np.asarray(record[key]) - expected)) < 2e-10, (key, expected, record[key])
    assert record["shape"] == list(value.shape) and record["dtype"] == "<f8"
    return {"sourceColumnRow": [float(x), float(y)], "basisWeights": weights,
            "independentKernel": identity(value), "authorKernelByteHashEqual": identity(value)["sha256COrder"] == record["sha256COrder"],
            "metrics": calculated}


def main():
    assert not OUT.exists()
    author_path, binding_path = AUTHOR / "result.json", AUTHOR / "binding.json"
    assert bind(author_path)["sha256"] == "9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0"
    assert bind(binding_path)["sha256"] == "926850edbe64bd1fd6492e96accdc637480d1cffc3da2b18aa84b1e34e79099e"
    author = json.loads(author_path.read_text("utf-8"))
    bindings = json.loads(binding_path.read_text("utf-8"))
    assert bindings["ownersBefore"] == bindings["ownersAfter"]
    protected = bindings["ownersBefore"] + bindings["candidateBefore"] + bindings["qualityInputs"] + bindings["scienceInputs"] + bindings["published201Before"]
    protected += [{"path": r["path"], "bytes": (ROOT / r["path"]).stat().st_size, "sha256": r["sha256"]} for r in bindings["sixPreserved"]]
    protected += bindings["outputsBeforeBinding"] + bindings["acquisitions"] + [bind(author_path), bind(binding_path)]
    protected += [bind(ROOT / "output/sdss-contributing-quality-independent-1002-r4/review.json"),
                  bind(ROOT / "output/sdss-m51-core-quality-independent-1002-r1/review.json")]
    for record in protected:
        assert bind(ROOT / record["path"]) == record
    candidate = json.loads(CANDIDATE.read_text("utf-8"))
    assert bind(CANDIDATE)["sha256"] == "73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52"
    helper_path = TASK / "scripts/experience-sdss-core-quality-independent-2026-10-02.py"
    spec = importlib.util.spec_from_file_location("prior_independent_raw_oracles", helper_path)
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    # Only independently written cached-data algorithms are reused; none of
    # main(), production imports, mutations or earlier fixtures are executed.
    OUT.mkdir()
    (OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    save("started.json", {"scope": __doc__, "author": bind(author_path), "independentHelper": bind(helper_path), "requests": 0})
    n = candidate["pixels"]
    assert n == 2048
    target = WCS(naxis=2)
    target.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    target.wcs.cunit = ["deg", "deg"]
    target.wcs.radesys = "ICRS"
    target.wcs.crval = [candidate["center"]["raDeg"], candidate["center"]["decDeg"]]
    target.wcs.crpix = [(n + 1) / 2, (n + 1) / 2]
    scale = math.degrees(2 * math.tan(math.radians(candidate["fieldDegrees"]) / 2) / n)
    target.wcs.cdelt = [-scale, scale]
    assert dict(target.to_header()) == candidate["wcsHeader"] == author["target"]["wcsHeader"]
    yy, xx = np.indices((n, n), dtype=np.float64)
    ra, dec = target.all_pix2world(xx, n - 1 - yy, 0)
    crop = {name: (slice(level["masterCrop"]["boundsXYExclusive"][1], level["masterCrop"]["boundsXYExclusive"][3]),
                   slice(level["masterCrop"]["boundsXYExclusive"][0], level["masterCrop"]["boundsXYExclusive"][2]))
            for name, level in candidate["levels"].items()}
    expected_grid = np.rint(np.linspace(0, n - 1, 17)).astype(int)
    unions = {band: np.zeros((n, n), dtype=np.uint16) for band in BANDS}
    winner = {band: np.zeros((n, n), dtype=np.uint16) for band in BANDS}
    best_weight = np.zeros((n, n), dtype=np.float32)
    contributor_count = np.zeros((n, n), dtype=np.uint32)
    weight_sum = np.zeros((n, n), dtype=np.float64)
    results = []
    total_psf, exact_psf = 0, 0
    for field in candidate["mosaic"]["fields"]:
        key = field["fieldKey"]
        print(json.dumps({"phase": "field", "fieldKey": key}), flush=True)
        actual = next(f for f in author["fields"] if f["fieldKey"] == key)
        assert field["identity"] == actual["identity"]
        diagnostic = candidate["mosaic"]["diagnostics"][key]
        weight = frozen(diagnostic["normalized-weight"])
        active = weight > 0
        assert int(active.sum()) == actual["activePixels"] == field["jointAvailablePixels"]
        contributor_count += active.astype(np.uint32)
        weight_sum += weight
        replace = weight > best_weight
        best_weight[replace] = weight[replace]
        ps_raw = (ROOT / actual["psfSource"]["path"]).read_bytes()
        assert bind(ROOT / actual["psfSource"]["path"]) == actual["psfSource"]
        coherent = np.ones((n, n), dtype=np.bool_)
        band_results = {}
        for band in BANDS:
            report = actual["bands"][band]
            frame_path = ROOT / report["correctedSource"]["path"]
            assert bind(frame_path) == report["correctedSource"]
            with fits.open(io.BytesIO(bz2.decompress(frame_path.read_bytes())), memmap=False) as hdus:
                source = np.array(hdus[0].data, dtype=np.float32, copy=True)
                source_wcs = WCS(hdus[0].header)
                primary = hdus[0].header.copy()
            raw_mask = gzip.decompress((ROOT / report["maskSource"]["path"]).read_bytes())
            native, native_counts, mask_primary = helper.native_flags(raw_mask)
            assert identity(native) == report["nativeFlags"] and native_counts == report["nativePlanePixels"]
            assert report["enum"] == {name: i for i, name in enumerate(PLANES + ("S_NMASK_TYPES",))}
            sx, sy = source_wcs.all_world2pix(ra, dec, 0)
            science, geometry, finite, flags = helper.independent_sample(source, native, sx, sy)
            assert science.tobytes() == frozen(diagnostic[f"{band}-science"]).tobytes()
            assert np.array_equal(geometry, frozen(diagnostic[f"{band}-footprint"]))
            assert np.array_equal(finite, frozen(diagnostic[f"{band}-finite-neighbors"]))
            assert np.array_equal(flags, array(report["projectedFlags"]))
            assert int(geometry.sum()) == report["geometryPixels"] and int(finite.sum()) == report["finiteAvailablePixels"]
            coherent &= geometry & finite
            assert np.all(~active | (geometry & finite))
            assert counts(flags, active) == report["activePlanePixels"]
            unions[band][active] |= flags[active]
            winner[band][replace] = flags[replace]
            for name, c in crop.items():
                r = report["levels"][name]
                assert int(active[c].sum()) == r["activeCoherentPixels"]
                assert counts(flags[c], active[c]) == r["activePlanePixels"]
                weighted = {p: float(np.sum(weight[c][active[c] & ((flags[c] & (1 << bit)) != 0)], dtype=np.float64))
                            for bit, p in enumerate(PLANES)}
                assert weighted == r["weightedFlagContribution"]
            bases = psf_basis(ps_raw, band)
            samples = report["spatialPsfSamples"]
            expected_positions = [[int(tx), int(ty)] for ty in expected_grid for tx in expected_grid if active[ty, tx]]
            assert [point["targetColumnRow"] for point in samples] == expected_positions
            psf_records = []
            for point in samples:
                tx, ty = point["targetColumnRow"]
                position = [float(sx[ty, tx]), float(sy[ty, tx])]
                assert position == point["sourceColumnRow"]
                inspected = verify_kernel(bases, *position, point)
                total_psf += 1
                exact_psf += int(inspected["authorKernelByteHashEqual"])
                psf_records.append({"targetColumnRow": [tx, ty], **inspected})
            cx, cy = source_wcs.all_world2pix(candidate["center"]["raDeg"], candidate["center"]["decDeg"], 0)
            center_geometry = bool(np.isfinite(cx) and np.isfinite(cy) and 0 <= cx < source.shape[1] - 1 and 0 <= cy < source.shape[0] - 1)
            assert [float(cx), float(cy)] == report["center"]["sourceColumnRow"]
            assert center_geometry == report["center"]["completeSourceStencil"]
            center = {"sourceColumnRow": [float(cx), float(cy)], "completeSourceStencil": center_geometry}
            if center_geometry:
                ix, iy = math.floor(cx), math.floor(cy)
                flag = int(np.bitwise_or.reduce(native[iy:iy + 2, ix:ix + 2].reshape(-1)))
                assert flag == report["center"]["stencilFlags"]
                center.update(stencilFlags=flag, independentPsf=verify_kernel(bases, cx, cy, report["center"]["psf"]))
            with fits.open(io.BytesIO(ps_raw), memmap=False) as ps:
                batches = dict(zip(("frame", "psField", "fpM"), (primary["PS_ID"], ps[0].header["PS_ID"], mask_primary["PS_ID"])))
            assert len(set(batches.values())) == 1 and batches == report["association"]["actualPS_ID"]
            assert report["association"]["processingIdentity"] == "MATCH" and report["association"]["quality"] == "UNKNOWN"
            band_results[band] = {"science": identity(science), "scienceAndGeometryFiniteByteExactFrozen": True,
                "nativeFlags": identity(native), "projectedFlags": identity(flags), "allProjectedFlagBytesExact": True,
                "nativePlaneCounts": native_counts, "activePlaneCounts": counts(flags, active),
                "finiteAvailablePixels": int(finite.sum()), "sourceScienceZeroPixels": int(np.count_nonzero(source == 0)),
                "sourceScienceNegativePixels": int(np.count_nonzero(source < 0)), "levelsExactCountsAndWeightedFlagSums": True,
                "actualPS_ID": batches, "center": center, "independentSpatialPsfSamples": psf_records}
            del source, native, science, geometry, finite, flags, sx, sy, bases
        assert np.array_equal(coherent, active)
        result = {"fieldKey": key, "identity": field["identity"], "activePixels": int(active.sum()),
                  "coherentPerFieldGriEqualsPositiveWeight": True, "bands": band_results}
        results.append(result)
        save(key.replace("/", "-") + ".review.json", result)
        del coherent, active, weight
    assert np.array_equal(contributor_count, frozen(candidate["mosaic"]["contributorCount"]))
    availability = frozen(candidate["arrays"]["joint-availability"])
    assert np.array_equal(weight_sum > 0, availability) and availability.all()
    assert float(np.max(np.abs(weight_sum - 1))) == author["weightSumMaximumAbsoluteErrorFromOne"]
    union_records, aggregate = {}, {}
    for band, flags in unions.items():
        assert np.array_equal(flags, array(author["projectedFlagArrays"][band]))
        path = OUT / f"independent-mosaic-{band}-flags.npy"
        with path.open("xb") as stream:
            np.save(stream, flags, allow_pickle=False)
        assert np.array_equal(np.load(path, allow_pickle=False), flags)
        union_records[band] = {**bind(path), **identity(flags)}
    for name, c in crop.items():
        r = {"nativeMasterCropPixels": int(availability[c].size), "allAvailablePixels": int(availability[c].sum()),
             "singleContributorPixels": int((contributor_count[c] == 1).sum()), "overlapPixels": int((contributor_count[c] > 1).sum()),
             "bands": {b: counts(unions[b][c], availability[c]) for b in BANDS}}
        assert r == author["levels"][name]
        aggregate[name] = r
    winner_loss = {b: int(np.count_nonzero(unions[b] != winner[b])) for b in BANDS}
    assert all(v > 0 for v in winner_loss.values())
    save("winner-only-counterfactual.json", {"scope": "Bounded incorrect diagnostic union policy, not modified production or science",
        "mechanism": "Retain only the highest-weight field's four-neighbor flag instead of OR of all positive-weight contributors",
        "detectedPixelsLosingSourceFlagBits": winner_loss,
        "allThreeBandsDetected": True})
    for record in protected:
        assert bind(ROOT / record["path"]) == record
    save("review.json", {"scope": __doc__, "author": bind(author_path), "authorBinding": bind(binding_path),
        "libraries": {"astropy": astropy.__version__, "numpy": np.__version__}, "fields": results,
        "targetRebuiltFromExactConstructionNotRoundedFitsCards": {"center": candidate["center"], "fieldDegrees": candidate["fieldDegrees"], "scaleDegPerPixel": scale},
        "all18ScienceGeometryFiniteAndProjectedFlagsIndependentExact": True,
        "all6CoherentGriFieldMasksEqualsPositiveWeights": True, "frozenContributorCountsAndWeightsUnchanged": True,
        "mosaicFlagUnions": union_records, "levels": aggregate,
        "sparsePsfSampleCount": total_psf, "sparsePsfByteHashExactCount": exact_psf,
        "sparsePsfAllSignedMetricsAndActualSourcePositionsAgree": True,
        "winnerOnlyBoundedCounterfactualDetectedPixels": winner_loss,
        "allProtectedInputsUnchanged": True, "networkRequests": 0,
        "conclusion": "The six-field diagnostic consumer correctly preserves science/geometry/finite values, projects complete native source flags and ORs only true positive-weight coherent contributors. It is usable as a diagnosis input, not a quality/reweighting/correction policy.",
        "scientificQuality": "UNKNOWN", "wholeImageQuality": "UNVERIFIED",
        "limits": ["No measured spatial PSF/star correspondence or absolute astrometric validation; primary TAN and PHOTO+.5 approximation retained.",
            "Signed source-relative sparse PSFs/NEA are not a target-resolution/FWHM/matched coadd PSF or sharpening proof.",
            "Flags are source-processing labels, not missing flux/alpha or established brown-color causes.",
            "Counts are exact native-master crops, not resampled512 output pixels.",
            "No source science/weights/RGB/route/publication/native/server change; no new HTTP, installs or unknown-license code adoption.",
            "Parent r1/r2 failed generations remain history; this review is bound only to the repaired r3."]})
    save("binding.json", {"script": bind(OUT / "executed-script.py"), "independentHelper": bind(helper_path),
        "frozenAuthorAndInputs": protected, "outputs": [bind(p) for p in sorted(OUT.rglob("*")) if p.is_file()]})
    print(json.dumps({"review": bind(OUT / "review.json"), "binding": bind(OUT / "binding.json")}), flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        if OUT.exists() and not (OUT / "failed.json").exists():
            save("failed.json", {"status": "FAILED_TASK_ORACLE_NOT_QUALITY_PASS", "traceback": traceback.format_exc()})
        raise
