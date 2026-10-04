"""Independent saved-ROI/source-coordinate and estimator audit, cached only.

Uses frozen science sidecars and the complete source-flag arrays independently
verified in the preceding full-target review. Does not repeat that projection
or call production samplers to validate the new local diagnostic output.
Local shift uses independent centered-covariance regression, not author SVD.
"""
import bz2
import hashlib
import importlib.util
import io
import itertools
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
from PIL import Image

OUT = ROOT / "output/sdss-local-overlap-independent-1002-r1"
AUTHOR = ROOT / "output/sdss-local-overlap-diagnosis-1002-r1"
CONTROLS = ROOT / "output/sdss-local-overlap-controls-1002-r1"
CANDIDATE = ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json"
WHOLE = ROOT / "output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json"
PLANES = ("S_MASK_INTERP", "S_MASK_SATUR", "S_MASK_NOTCHECKED", "S_MASK_OBJECT", "S_MASK_BRIGHTOBJECT", "S_MASK_BINOBJECT", "S_MASK_CATOBJECT", "S_MASK_SUBTRACTED", "S_MASK_GHOST", "S_MASK_CR")
PROCESSING = sum(1 << bit for bit in (0, 1, 8, 9))
BANDS = "gri"


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def bind(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": digest(raw)}


def save(name, value):
    path = OUT / name
    with path.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n")
    return bind(path)


def load_array(entry):
    path = ROOT / entry["path"]
    assert bind(path) == {k: entry[k] for k in ("path", "bytes", "sha256")}
    a = np.load(path, allow_pickle=False, mmap_mode="r")
    if "sha256COrder" in entry:
        assert entry["shape"] == list(a.shape) and entry["dtype"] == a.dtype.str
        assert entry["sha256COrder"] == digest(a.tobytes())
    return a


def frozen(entry):
    return load_array({**entry, "path": (CANDIDATE.parent / entry["file"]).relative_to(ROOT).as_posix()})


def flags_count(a):
    return {name: int(np.count_nonzero(a & (1 << bit))) for bit, name in enumerate(PLANES)}


def stats(values):
    a = np.asarray(values, dtype=np.float64)
    assert a.size and np.isfinite(a).all()
    median = float(np.median(a))
    return {"samples": int(a.size), "median": median, "madSigma": float(1.4826 * np.median(abs(a - median))),
            "p05": float(np.quantile(a, .05)), "p95": float(np.quantile(a, .95)),
            "negativeSamples": int(np.count_nonzero(a < 0)), "zeroSamples": int(np.count_nonzero(a == 0))}


def centroid(a, radius):
    y, x = np.indices((33, 33), dtype=np.float64)
    x, y = x - 16, y - 16
    rr = np.square(x) + np.square(y)
    annulus = (rr >= 100) & (rr <= 225)
    base = float(np.median(a[annulus]))
    residual = np.maximum(np.asarray(a, dtype=np.float64) - base, 0)
    w = residual * (rr <= radius ** 2)
    total = float(np.sum(w))
    if total == 0:
        return None
    cx, cy = float(np.sum(w * x) / total), float(np.sum(w * y) / total)
    return {"columnRow": [cx, cy], "positiveResidualSum": total, "annulusMedian": base,
        "annulusMadSigma": stats(a[annulus])["madSigma"],
        "radialRmsTargetPixels": float(np.sqrt(np.sum(w * (np.square(x - cx) + np.square(y - cy))) / total)),
        "peakContrast": float(a.max() - base), "diagnosticOnly": True}


def local_fit(a, b):
    # The selected actual patches have complete finite science. The independent
    # oracle rejects an unidentifiable target OR sampled reference, explicitly.
    assert a.shape == b.shape == (33, 33) and np.isfinite(a).all() and np.isfinite(b).all()
    query_y, query_x = np.indices((17, 17), dtype=np.float64)
    query_x, query_y = query_x + 8, query_y + 8
    target = np.asarray(a[8:25, 8:25], dtype=np.float64).ravel()
    tm, tv = float(target.mean()), target - target.mean()
    std = float(np.sqrt(np.mean(tv * tv)))
    if std == 0:
        return None

    def sample(dx, dy):
        x, y = query_x + dx, query_y + dy
        ix, iy = np.floor(x).astype(int), np.floor(y).astype(int)
        fx, fy = x - ix, y - iy
        return ((1 - fx) * (1 - fy) * b[iy, ix] + fx * (1 - fy) * b[iy, ix + 1] +
                (1 - fx) * fy * b[iy + 1, ix] + fx * fy * b[iy + 1, ix + 1]).ravel().astype(np.float64)

    def evaluate(dx, dy):
        reference = sample(dx, dy)
        rm = float(reference.mean())
        centered = reference - rm
        variance = float(np.sum(centered * centered))
        if variance == 0:
            return None
        scale = float(np.sum(centered * tv) / variance)
        constant = tm - scale * rm
        residual = target - (scale * reference + constant)
        return float(np.mean(residual * residual)), scale, constant

    coarse = []
    for dy in np.arange(-2, 2.001, .1):
        for dx in np.arange(-2, 2.001, .1):
            fit = evaluate(dx, dy)
            if fit is not None:
                coarse.append((fit[0], float(dx), float(dy)))
    if not coarse:
        return None
    _, cx, cy = min(coarse)
    fine = []
    for dy in np.arange(cy - .1, cy + .1001, .02):
        for dx in np.arange(cx - .1, cx + .1001, .02):
            if -2 <= dx <= 2 and -2 <= dy <= 2:
                fit = evaluate(dx, dy)
                if fit is not None:
                    fine.append((fit[0], float(dx), float(dy)))
    mse, dx, dy = min(fine)
    fit, zero = evaluate(dx, dy), evaluate(0, 0)
    return {"samplingBAtAPlusColumnRow": [dx, dy], "atSearchBoundary": bool(abs(dx) > 1.95 or abs(dy) > 1.95),
        "rmsAfter": float(np.sqrt(mse)), "rmsUnshiftedWithFittedScaleOffset": float(np.sqrt(zero[0])),
        "residualRmsOverAStandardDeviation": float(np.sqrt(mse) / std), "scaleBToA": fit[1], "constantBToA": fit[2],
        "unshiftedScaleBToA": zero[1], "unshiftedConstantBToA": zero[2]}


def close(calculated, actual, tolerance=2e-12):
    for key, value in calculated.items():
        if isinstance(value, (bool, str)) or value is None:
            assert actual[key] == value, key
        elif isinstance(value, dict):
            close(value, actual[key], tolerance)
        else:
            assert np.max(np.abs(np.asarray(actual[key]) - value)) <= tolerance, (key, actual[key], value)


def main():
    assert not OUT.exists()
    result_path, binding_path = AUTHOR / "result.json", AUTHOR / "binding.json"
    assert bind(result_path)["sha256"] == "4611e2bf79b8e7bb3c31b0a022badcdff8d445c9ada3adaf9a3d36e25405bb6f"
    assert bind(binding_path)["sha256"] == "7fbbaf5ca7571cd5902c21b917c13b9aab544ebbf92ec0ee963846f38a04255d"
    assert bind(CONTROLS / "derived-summary.json")["sha256"] == "5a3a9e5fd293ab661d4d78324174079838b9aee97447504e33497655c5e8474b"
    bindings = json.loads(binding_path.read_text("utf-8"))
    assert bindings["protectedInputsBefore"] == bindings["protectedInputsAfter"]
    preserved = bindings["protectedInputsBefore"] + bindings["outputs"]
    controls_binding = json.loads((CONTROLS / "binding.json").read_text("utf-8"))
    preserved += controls_binding["protectedDiagnosisBefore"] + controls_binding["outputs"]
    preserved += [bind(binding_path), bind(CONTROLS / "binding.json"), bind(WHOLE),
        bind(ROOT / "output/sdss-m51-mosaic-quality-independent-1002-r2/review.json"),
        bind(ROOT / "output/sdss-m51-mosaic-quality-independent-1002-r2/binding.json")]
    unique = {r["path"]: r for r in preserved}
    for record in unique.values():
        assert bind(ROOT / record["path"]) == record
    report = json.loads(result_path.read_text("utf-8"))
    candidate = json.loads(CANDIDATE.read_text("utf-8"))
    whole = json.loads(WHOLE.read_text("utf-8"))
    independent = json.loads((ROOT / "output/sdss-m51-mosaic-quality-independent-1002-r2/review.json").read_text("utf-8"))
    assert independent["author"] == bind(WHOLE) and independent["all18ScienceGeometryFiniteAndProjectedFlagsIndependentExact"]
    psf_helper_path = TASK / "scripts/experience-sdss-mosaic-quality-independent-2026-10-02.py"
    spec = importlib.util.spec_from_file_location("independent_psf_wire_math", psf_helper_path)
    ph = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ph)
    OUT.mkdir()
    (OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    save("started.json", {"scope": __doc__, "author": bind(result_path), "requests": 0})
    n = candidate["pixels"]
    scale = math.degrees(2 * math.tan(math.radians(candidate["fieldDegrees"]) / 2) / n)
    target = WCS(naxis=2)
    target.wcs.ctype, target.wcs.cunit, target.wcs.radesys = ["RA---TAN", "DEC--TAN"], ["deg", "deg"], "ICRS"
    target.wcs.crpix = [(n + 1) / 2] * 2
    target.wcs.crval = [candidate["center"]["raDeg"], candidate["center"]["decDeg"]]
    target.wcs.cdelt = [-scale, scale]
    assert report["targetFactory"]["exactCdelt"] == [-scale, scale]
    pair_meta = json.loads((CANDIDATE.parent / "overlap-diagnostics.json").read_text("utf-8"))
    ellipse = pair_meta["outsideCatalogExclusion"]
    y, x = np.indices((n, n), dtype=np.float64)
    east, north = -(x - (n - 1) / 2) * scale * 60, ((n - 1) / 2 - y) * scale * 60
    angle = math.radians(ellipse["positionAngleDeg"])
    major = east * math.sin(angle) + north * math.cos(angle)
    minor = east * math.cos(angle) - north * math.sin(angle)
    outside = (np.square(major / (ellipse["majorAxisArcmin"] * ellipse["sizeMultiplier"] / 2)) +
               np.square(minor / (ellipse["minorAxisArcmin"] * ellipse["sizeMultiplier"] / 2))) > 1
    del y, x, east, north, major, minor
    fields = {}
    for field in candidate["mosaic"]["fields"]:
        key = field["fieldKey"]
        actual = next(f for f in whole["fields"] if f["fieldKey"] == key)
        ps_raw = (ROOT / actual["psfSource"]["path"]).read_bytes()
        item = {"identity": field["identity"], "bands": {}}
        for band in BANDS:
            diag = candidate["mosaic"]["diagnostics"][key]
            a = frozen(diag[f"{band}-science"])
            finite = frozen(diag[f"{band}-finite-neighbors"])
            assert np.array_equal(np.isfinite(a), finite)
            with fits.open(io.BytesIO(bz2.decompress((ROOT / actual["bands"][band]["correctedSource"]["path"]).read_bytes())), memmap=False) as hdus:
                wcs = WCS(hdus[0].header)
            item["bands"][band] = {"science": a, "finite": finite, "wcs": wcs,
                "flags": load_array(actual["bands"][band]["projectedFlags"]), "bases": ph.psf_basis(ps_raw, band)}
        item["coherent"] = np.logical_and.reduce([item["bands"][b]["finite"] for b in BANDS])
        fields[key] = item
    possible = {}
    for ka, kb in itertools.combinations(fields, 2):
        common = fields[ka]["coherent"] & fields[kb]["coherent"]
        if common.any():
            possible[(ka, kb)] = (int(common.sum()), int(np.count_nonzero(common & outside)))
    assert len(possible) == len(report["pairs"]) == 9
    assert set(possible) == {(p["fieldA"], p["fieldB"]) for p in report["pairs"]}
    inspected, totals, exterior = [], {"peaks": 0, "backgrounds": 0, "bandMeasurements": 0, "sourcePlanes": 0, "signedKernels": 0}, []
    peak_match_error = 0.
    actual_controls = json.loads((CONTROLS / "controls.json").read_text("utf-8"))
    for pair_index, pair in enumerate(report["pairs"], 1):
        ka, kb = pair["fieldA"], pair["fieldB"]
        assert possible[(ka, kb)] == (pair["jointOverlapPixels"], pair["outsideCatalogPixels"])
        assert pair["crossRun"] == (fields[ka]["identity"]["run"] != fields[kb]["identity"]["run"])
        assert len(pair["compactPeaks"]) <= 3 and len(pair["backgroundPatches"]) <= 4
        measurements = []
        for is_peak, points in [(True, pair["compactPeaks"]), (False, pair["backgroundPatches"])]:
            previous = []
            for point in points:
                x, y = point["targetColumnRow"]
                assert 16 <= x < n - 16 and 16 <= y < n - 16
                min_distance = 64 if is_peak else 80
                assert all((x - px) ** 2 + (y - py) ** 2 >= min_distance ** 2 for px, py in previous)
                previous.append((x, y))
                c = (slice(y - 16, y + 17), slice(x - 16, x + 17))
                assert fields[ka]["coherent"][c].all() and fields[kb]["coherent"][c].all()
                assert point["arrayOrder"] == [f"{b}:{f}" for b in BANDS for f in (ka, kb)]
                arrays = point["arrays"]
                data = load_array(arrays["science-gArAgBrBgAiAiB" if is_peak else "science"])
                flags = load_array(arrays["flags"])
                assert data.shape == flags.shape == (6, 33, 33) and np.isfinite(data).all()
                if is_peak:
                    finite = load_array(arrays["finite"])
                    kernels = load_array(arrays["signed-native-kernels"])
                    assert finite.shape == data.shape and finite.all() and kernels.shape == (6, 51, 51)
                    assert point["insideExpandedCatalogEllipse"] == bool(not outside[y, x])
                else:
                    assert x % 32 == y % 32 == 16
                    is_exterior = bool(outside[c].all())
                    assert point["entireRoiOutsideExpandedCatalogEllipse"] == is_exterior
                    if is_exterior:
                        exterior.append({"pair": [ka, kb], "targetColumnRow": [x, y], "sourceFlags": [flags_count(q) for q in flags]})
                ra, dec = target.all_pix2world(x, n - 1 - y, 0)
                close({"raDecDeg": [float(ra), float(dec)]}, point, 0)
                detail = {"targetColumnRow": [x, y], "compactPeak": is_peak, "bands": {}}
                for bi, band in enumerate(BANDS):
                    band_record = point["bands"][band]
                    band_detail = {}
                    centers = []
                    for fi, field_key in enumerate((ka, kb)):
                        plane = 2 * bi + fi
                        original = fields[field_key]["bands"][band]
                        assert data[plane].tobytes() == original["science"][c].tobytes()
                        assert flags[plane].tobytes() == original["flags"][c].tobytes()
                        actual_field = band_record["fields"][field_key] if is_peak else band_record[field_key]
                        assert flags_count(flags[plane]) == actual_field["flagCounts"]
                        assert actual_field["finitePixels"] == actual_field["geometryPixels"] == 1089
                        native_x, native_y = original["wcs"].all_world2pix(ra, dec, 0)
                        source_position = [float(native_x), float(native_y)]
                        if is_peak:
                            assert source_position == actual_field["nativeColumnRow"]
                            value, weights = ph.kernel(original["bases"], *source_position)
                            assert kernels[plane].tobytes() == value.tobytes()
                            assert float(value.sum()) == actual_field["signedKernelSum"]
                            assert int(np.count_nonzero(value < 0)) == actual_field["signedKernelNegativePixels"]
                            close({"noiseEquivalentAreaNativePixels": float(value.sum() ** 2 / np.square(value).sum())}, actual_field)
                            estimates = {str(radius): centroid(data[plane], radius) for radius in (4, 6, 8)}
                            close(estimates, actual_field["centroidByRadius"])
                            centers.append(estimates)
                            gy, gx = np.indices((33, 33))
                            core = np.square(gx - 16) + np.square(gy - 16) <= 36
                            assert actual_field["coreProcessingFlagsPresent"] == bool(np.any(flags[plane][core] & PROCESSING))
                            if band == "r":
                                m = estimates["6"]
                                assert not actual_field["coreProcessingFlagsPresent"] and m["peakContrast"] >= 8 * m["annulusMadSigma"]
                                assert .5 < m["radialRmsTargetPixels"] < 2.8 and np.hypot(*m["columnRow"]) <= 2
                                distance = np.square(gx - 16) + np.square(gy - 16)
                                assert data[plane][(distance >= 36) & (distance <= 144)].max() - m["annulusMedian"] <= .25 * m["peakContrast"]
                            totals["signedKernels"] += 1
                            band_detail[field_key] = {"nativeColumnRow": source_position, "signedKernelSha256": digest(value.tobytes()),
                                "signedKernelNegativePixels": int(np.count_nonzero(value < 0)), "basisWeights": weights,
                                "noiseEquivalentAreaNativePixels": float(value.sum() ** 2 / np.square(value).sum())}
                        else:
                            close({"science": stats(data[plane])}, actual_field, 0)
                        totals["sourcePlanes"] += 1
                    if is_peak:
                        offsets = [np.asarray(centers[1][str(r)]["columnRow"]) - centers[0][str(r)]["columnRow"] for r in (4, 6, 8)]
                        close({"centroidBMinusAByRadius": np.asarray(offsets),
                            "centroidOffsetApertureSpreadPixels": float(np.max(np.linalg.norm(np.asarray(offsets) - offsets[1], axis=1)))}, band_record)
                        fit = local_fit(data[2 * bi], data[2 * bi + 1])
                        close(fit, band_record["localMatch"], 3e-12)
                        error = float(np.max(abs(np.asarray(fit["samplingBAtAPlusColumnRow"]) - band_record["localMatch"]["samplingBAtAPlusColumnRow"])))
                        peak_match_error = max(peak_match_error, error)
                        band_detail["independentMatch"] = fit
                    else:
                        delta = data[2 * bi + 1].astype(np.float64) - data[2 * bi]
                        calculated = stats(delta)
                        close(calculated, band_record["BMinusA"], 0)
                        qa, qb = stats(data[2 * bi])["madSigma"], stats(data[2 * bi + 1])["madSigma"]
                        close({"differenceMadSigmaOverCombinedMarginalMad": calculated["madSigma"] / np.hypot(qa, qb)}, band_record, 0)
                        band_detail = {"independentBMinusA": calculated, "marginalMadSigmaAandB": [qa, qb]}
                    detail["bands"][band] = band_detail
                    totals["bandMeasurements"] += 1
                if not is_peak:
                    delta_gri = [stats(data[2 * k + 1].astype(np.float64) - data[2 * k])["median"] for k in range(3)]
                    close({"medianResidualColorBMinusA": {"gMinusR": delta_gri[0] - delta_gri[1], "rMinusI": delta_gri[1] - delta_gri[2]}}, point, 0)
                else:
                    # Verify local maximum in the actual two-field r mean,
                    # without claiming an exhaustive/new source catalog.
                    ar, br = fields[ka]["bands"]["r"]["science"], fields[kb]["bands"]["r"]["science"]
                    neighbors = (ar[y - 1:y + 2, x - 1:x + 2].astype(np.float64) + br[y - 1:y + 2, x - 1:x + 2]) / 2
                    assert all(neighbors[1, 1] > q for i, q in enumerate(neighbors.ravel()) if i != 4)
                measurements.append(detail)
                totals["peaks" if is_peak else "backgrounds"] += 1
        inspected.append({"fieldA": ka, "fieldB": kb, "jointOverlapPixels": possible[(ka, kb)][0],
            "outsideEllipsePixels": possible[(ka, kb)][1], "measurements": measurements})
        save(f"pair-{pair_index}.review.json", inspected[-1])
        print(json.dumps({"phase": "pair", "pair": pair_index}), flush=True)
    assert totals == {"peaks": 11, "backgrounds": 33, "bandMeasurements": 132, "sourcePlanes": 264, "signedKernels": 66}
    assert len(exterior) == 3
    y, x = np.indices((33, 33), dtype=np.float64)
    control_a = np.exp(-((x - 16.2) ** 2 + (y - 15.7) ** 2) / (2 * 1.6 ** 2)) - .03
    control_b = 1.23 * np.exp(-((x - 16.84) ** 2 + (y - 15.32) ** 2) / (2 * 1.6 ** 2)) + .02
    known = [.64, -.38]
    known_fit = local_fit(control_a, control_b)
    close(known_fit, actual_controls["fit"], 3e-12)
    assert np.max(abs(np.asarray(known_fit["samplingBAtAPlusColumnRow"]) - known)) < .04
    assert np.max(abs(-np.asarray(known_fit["samplingBAtAPlusColumnRow"]) - known)) > 1
    same_fit = local_fit(control_a, control_a)
    close(same_fit, actual_controls["samePatch"], 3e-12)
    assert local_fit(np.zeros((33, 33)), np.zeros((33, 33))) is None
    beyond = 1.23 * np.exp(-((x - 18.7) ** 2 + (y - 15.7) ** 2) / (2 * 1.6 ** 2)) + .02
    boundary_fit = local_fit(control_a, beyond)
    close(boundary_fit, actual_controls["beyondTwoPixelSearch"], 3e-12)
    assert boundary_fit["atSearchBoundary"]
    # One useful identifiability boundary: flat B supplies no shift information.
    assert local_fit(control_a, np.zeros((33, 33))) is None
    for name, a in (("known-A.npy", control_a), ("known-B.npy", control_b)):
        with (OUT / name).open("xb") as stream:
            np.save(stream, a, allow_pickle=False)
    # Pixels of the contact sheet are independently tied to actual saved r
    # arrays and its declared common per-row display scale (text not an oracle).
    with Image.open(AUTHOR / "compact-peak-r-contact.png") as image:
        image.load()
        assert image.size == (640, 1210)
        panel = 0
        for pair in report["pairs"]:
            for peak in pair["compactPeaks"]:
                patches = load_array(peak["arrays"]["science-gArAgBrBgAiAiB"])[2:4]
                low = min(np.quantile(patches[0], .05), np.quantile(patches[1], .05))
                high = max(patches[0].max(), patches[1].max())
                for column, patch in enumerate(patches):
                    gray = np.rint(np.clip((patch - float(low)) / (float(high) - float(low)), 0, 1) * 255).astype(np.uint8)
                    expected = np.repeat(np.repeat(gray, 3, axis=0), 3, axis=1)
                    actual = np.asarray(image.crop((220 + column * 110, panel * 110 + 5, 319 + column * 110, panel * 110 + 104)))
                    assert np.array_equal(actual, np.repeat(expected[:, :, None], 3, axis=2))
                panel += 1
    for record in unique.values():
        assert bind(ROOT / record["path"]) == record
    save("review.json", {"scope": __doc__, "author": bind(result_path), "authorBinding": bind(binding_path),
        "authorControls": bind(CONTROLS / "derived-summary.json"), "libraries": {"numpy": np.__version__, "astropy": astropy.__version__},
        "pairs": inspected, "counts": totals, "allSavedScienceFiniteFlagsExactlyTiedToFrozenFullSourceProof": True,
        "allNativeWcsPositionsAnd66SignedKernelBytesExact": True, "allStatsCentroidsMatchIndependent": True,
        "maximumActualShiftGridDifferencePixels": peak_match_error, "entireOutsideEllipsePatches": exterior,
        "knownControl": {"actualKnownBMinusA": known, "independentFit": known_fit, "signReversalMutantDetected": True,
            "samePatch": same_fit, "constantTargetNoEstimate": True, "constantReferenceNoIdentifiableEstimate": True,
            "beyondSearch": boundary_fit},
        "contactSheet22ImagePanelsIndependentlyExact": True, "networkRequests": 0, "protectedInputsUnchanged": True,
        "conclusion": "The saved local diagnosis is supported as a bounded relative intensity/PSF/background observation. It does not identify absolute or global astrometric errors, clean sky, calibrated flux/colour or a source correction.",
        "scientificQuality": "UNKNOWN", "imageQuality": "UNVERIFIED",
        "limits": ["Selection is at most200 brightest maxima then three isolated peaks; not catalog stars/unbiased samples. Four of five cross-run overlaps have no selected peak.",
            "R-band core flags/contrast/compactness select peaks; other bands may retain processing labels and all scientific samples are retained.",
            "No catalog-confirmed blank sky; only3 whole exterior ROIs, no star/deep-wing exclusion. Background ranking prioritizes center-exterior/r flags/scatter.",
            "Fitted scale and constant absorb PSF/morphology/sampling differences; one cross-run peak does not constrain a global transform or natural color.",
            "MAD on correlated bilinear samples is not calibrated independent source noise variance; same-run overlap disagreement shares data.",
            "Primary TAN remains approximate; no full asTrans or absolute astrometric validation. Signed native NEA is not FWHM/target matched PSF.",
            "Author estimator is a task function called only on verified finite compact ROIs, not a reusable general-registration owner; constant-reference/missing input qualification requires a future supported owner.",
            "No second sky subtraction, reweighting, correction, display image, new source, scientific quality or runtime/publication adoption."]})
    save("binding.json", {"script": bind(OUT / "executed-script.py"), "independentPsfHelper": bind(psf_helper_path),
        "preserved": list(unique.values()), "outputs": [bind(p) for p in sorted(OUT.rglob("*")) if p.is_file()]})
    print(json.dumps({"review": bind(OUT / "review.json"), "binding": bind(OUT / "binding.json")}), flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        if OUT.exists() and not (OUT / "failed.json").exists():
            save("failed.json", {"status": "FAILED_TASK_ORACLE_NOT_PASS", "traceback": traceback.format_exc()})
        raise
