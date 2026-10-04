"""Independent offline ROI qualification and local HST/SDSS registration readback."""
import argparse
import hashlib
import itertools
import json
import math
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
import numpy as np
from PIL import Image, ImageDraw
from astropy.io import fits

GENERATIONS = {
    "automatic": ("hubble-m51-registration-trial-1002-r1", "9a4d6d2aef39b29fd5886b2cf4833ce0d517bedb081385f3219d182c28836348", "9e1b4921034245c11ba0196518a1934183a8a22eaeee1eaee468c84fd0cf9ce8"),
    "curated": ("hubble-m51-curated-registration-1002-r1", "fdbd364dd867f9df92986ac5af59010cca339b15c45d4d0e20ccdf4bae5445cc", "b3f4c20023ec1fe1963d66e85dba924a6e7185401b10cdb95fa826a6c2eaf5a0"),
    "fit": ("hubble-m51-registration-fit-1002-r1", "376420444bd4608f00830a34bf0bb5a316e1364c46d889336b2fd0c9d0a91902", "d045d67de6d3bd05152b753b36650e4a2ecc504db2c49967a2b11cebcb80877a"),
}
ACCEPT = ("foreground-1", "foreground-2", "foreground-3", "foreground-5")
REJECT = sum(2 ** b for b in (0, 1, 2, 8, 9))


def record(path):
    path = Path(path).resolve()
    payload = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest()}


def read_json(path):
    return json.loads(Path(path).read_bytes())


def write_json(path, value):
    with Path(path).open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n")


def save_array(path, array):
    with Path(path).open("xb") as stream:
        np.save(stream, array, allow_pickle=False)
    return {**record(path), "shape": list(array.shape), "dtype": array.dtype.str,
            "sha256COrder": hashlib.sha256(array.tobytes()).hexdigest()}


def roi(array, x, y, radius):
    return np.array(array[y-radius:y+radius+1, x-radius:x+radius+1], copy=True)


def centroid(patch, aperture, annulus):
    """Explicit aperture sums over pixels; independent of the author helpers."""
    half = patch.shape[0] // 2
    assert patch.shape == (2*half+1, 2*half+1) and np.isfinite(patch).all()
    yy, xx = np.indices(patch.shape, dtype=np.float64)
    xx -= half
    yy -= half
    square = xx*xx + yy*yy
    background_samples = patch[(square >= annulus[0]**2) & (square <= annulus[1]**2)]
    background = float(np.median(background_samples))
    noise = float(np.median(np.abs(background_samples.astype(np.float64)-background))*1.4826)
    active = square <= aperture**2
    positive = np.maximum(patch.astype(np.float64)[active]-background, 0)
    total = float(positive.sum())
    if total <= 0:
        return None
    xy = np.column_stack((xx[active], yy[active]))
    point = np.sum(positive[:, None]*xy, axis=0)/total
    rms = math.sqrt(float(np.sum(positive*np.sum((xy-point)**2, axis=1))/total))
    return {"columnRow": point.tolist(), "positiveWeightSum": total, "background": background,
            "madSigma": noise, "rms": rms, "contrastFullPatch": float(patch.max()-background)}


def compact(patch):
    value = centroid(patch, 6, (10, 15))
    if value is None:
        return False, "noPositiveWeight", value
    if value["contrastFullPatch"] <= 0 or value["contrastFullPatch"] < 10*value["madSigma"]:
        return False, "contrast", value
    if not .25 < value["rms"] < 3.2:
        return False, "rms", value
    if math.hypot(*value["columnRow"]) > 1.5:
        return False, "offset", value
    yy, xx = np.indices(patch.shape)
    square = (xx-16)**2+(yy-16)**2
    outer = patch[(square >= 36) & (square <= 144)]
    if outer.max()-value["background"] > .25*value["contrastFullPatch"]:
        return False, "outerBright", value
    return True, "pass", value


def maxima45(patch):
    """Strict eight-neighbour comparisons, no roll or author peak routine."""
    center = patch[1:-1, 1:-1]
    mask = np.ones(center.shape, dtype=bool)
    for dy, dx in itertools.product((-1, 0, 1), repeat=2):
        if dx or dy:
            mask &= center > patch[1+dy:patch.shape[0]-1+dy, 1+dx:patch.shape[1]-1+dx]
    y, x = np.where(mask)
    y, x = y+1, x+1
    order = np.argsort(patch[y, x])[::-1][:8]
    return [(int(x[k]), int(y[k])) for k in order]


def avm_projection(source_xml, candidate, width, height):
    """Raw AVM CD/TAN, explicit source inverse TAN and target forward TAN."""
    xml = ET.fromstring(source_xml)
    avm = "http://www.communicatingastronomy.org/avm/1.0/"
    rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    def values(name):
        return np.array([float(e.text) for e in xml.find(".//{"+avm+"}"+name).findall(".//{"+rdf+"}li")])
    def attr(name):
        return next(e.attrib["{"+avm+"}"+name] for e in xml.iter() if "{"+avm+"}"+name in e.attrib)
    assert attr("MetadataVersion") == "1.1" and attr("Spatial.CoordsystemProjection") == "TAN"
    notes = xml.find(".//{"+avm+"}Spatial.Notes").find(".//{"+rdf+"}li").text
    assert "5 arcsec" in notes and "Simbad" in notes
    ratio = width/values("Spatial.ReferenceDimension")[0]
    crpix = values("Spatial.ReferencePixel")*ratio
    sx, sy = values("Spatial.Scale")/ratio
    angle = math.radians(float(attr("Spatial.Rotation")))
    cd = np.array([[sx*math.cos(angle), -sy*math.sin(angle)],
                   [sx*math.sin(angle), sy*math.cos(angle)]])
    ra0, dec0 = np.radians(values("Spatial.ReferenceValue"))
    target_ra, target_dec = np.radians([candidate["center"]["raDeg"], candidate["center"]["decDeg"]])
    step = math.degrees(2*math.tan(math.radians(candidate["fieldDegrees"])/2)/2048)
    def source_to_target(column_top_row):
        px, py = column_top_row
        xi, eta = np.radians(cd @ (np.array([px, height-1-py])+1-crpix))
        denominator = math.cos(dec0)-eta*math.sin(dec0)
        ra = ra0+math.atan2(xi, denominator)
        dec = math.atan2(math.sin(dec0)+eta*math.cos(dec0), math.hypot(denominator, xi))
        dra = ra-target_ra
        tangent_denominator = math.sin(target_dec)*math.sin(dec)+math.cos(target_dec)*math.cos(dec)*math.cos(dra)
        tx = math.cos(dec)*math.sin(dra)/tangent_denominator
        ty = (math.cos(target_dec)*math.sin(dec)-math.sin(target_dec)*math.cos(dec)*math.cos(dra))/tangent_denominator
        point = np.array([1023.5-math.degrees(tx)/step, 1023.5-math.degrees(ty)/step])
        return point, np.degrees([ra, dec])
    return source_to_target, {"rawSpatialNotesPreserved": notes, "crpix": crpix.tolist(), "cd": cd.tolist(), "targetDegreesPerTangentPixel": step}


def similarity(a, b):
    """Centered complex covariance closed form, rather than author design/lstsq."""
    z = a[:, 0]+1j*a[:, 1]
    w = b[:, 0]+1j*b[:, 1]
    az, bw = z.mean(), w.mean()
    variance = float(np.sum(np.abs(z-az)**2))
    assert variance > 0
    factor = np.sum(np.conj(z-az)*(w-bw))/variance
    shift = bw-factor*az
    predicted = factor*z+shift
    residual = w-predicted
    return {"coefficients": [float(factor.real), float(factor.imag), float(shift.real), float(shift.imag)],
            "scale": float(abs(factor)), "rotationDegrees": float(np.degrees(np.angle(factor))),
            "residuals": np.column_stack((residual.real, residual.imag)).tolist(),
            "rms": float(np.sqrt(np.mean(np.abs(residual)**2))), "conditionMeaning": "centered scalar variance only; four tie local fit, no global validation"}


def independent_hull(points):
    # Four points here are all convex. Verify that fact before the polar-order area.
    center = points.mean(axis=0)
    order = np.argsort(np.arctan2(points[:, 1]-center[1], points[:, 0]-center[0]))
    polygon = points[order]
    edge = np.roll(polygon, -1, axis=0)-polygon
    following = np.roll(edge, -1, axis=0)
    cross = edge[:, 0]*following[:, 1]-edge[:, 1]*following[:, 0]
    assert np.all(cross > 0)
    area = .5*abs(float(np.sum(polygon[:, 0]*np.roll(polygon[:, 1], -1)-polygon[:, 1]*np.roll(polygon[:, 0], -1))))
    return polygon, area


def close(actual, expected, tolerance=1e-8):
    difference = float(np.max(np.abs(np.asarray(actual)-np.asarray(expected))))
    assert difference < tolerance, (difference, tolerance, actual, expected)
    return difference


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    assert output.is_relative_to((ROOT/"output").resolve()) and not output.exists()
    protected_map = {}
    generations = {}
    for name, (directory, expected_result, expected_binding) in GENERATIONS.items():
        directory = ROOT/"output"/directory
        assert record(directory/"result.json")["sha256"] == expected_result
        assert record(directory/"binding.json")["sha256"] == expected_binding
        binding = read_json(directory/"binding.json")
        assert binding["unchanged"] is True and binding["inputsBefore"] == binding["inputsAfter"]
        for item in binding["inputsBefore"]+binding["outputs"]:
            actual = record(ROOT/item["path"])
            assert all(actual[key] == item[key] for key in ("path", "bytes", "sha256")), item["path"]
            protected_map[actual["path"]] = actual
        for path in sorted(directory.rglob("*")):
            if path.is_file():
                actual = record(path)
                protected_map[actual["path"]] = actual
        generations[name] = read_json(directory/"result.json")
    retained = read_json(TASK/"tmp/resume-preserved-hashes-2026-10-01.json")
    assert len(retained) == 6
    for item in retained:
        assert record(ROOT/item["path"])["sha256"] == item["sha256"]
    source_dir = ROOT/"output/hubble-m51-source-quality-trial-1002-r1"
    nominal_dir = ROOT/"output/hubble-m51-nominal-projection-trial-1002-r1"
    candidate_dir = ROOT/"output/sdss-m51-gri-mosaic-candidate-1002-r2"
    quality_dir = ROOT/"output/sdss-m51-mosaic-quality-diagnosis-1002-r3"
    candidate = read_json(candidate_dir/"candidate.json")
    nominal = read_json(nominal_dir/"result.json")
    quality = read_json(quality_dir/"result.json")
    science = np.load(candidate_dir/"r-science.npy", mmap_mode="r", allow_pickle=False)
    finite = np.load(candidate_dir/"joint-availability.npy", mmap_mode="r", allow_pickle=False)
    flags = np.load(ROOT/quality["projectedFlagArrays"]["r"]["path"], mmap_mode="r", allow_pickle=False)
    mother = np.load(ROOT/nominal["master"]["path"], mmap_mode="r", allow_pickle=False)
    rgb = np.asarray(Image.open(source_dir/"heic0506a.jpg"))
    assert hashlib.sha256(rgb.tobytes()).hexdigest() == "e9720f3cfcd75966deb94060b6a0711b295e094ae03c76ec1d58633a343b1710"
    source_intensity = rgb.astype(np.float64).mean(axis=2)
    transform, metadata = avm_projection((source_dir/"embedded-xmp.xml").read_bytes(), candidate, rgb.shape[1], rgb.shape[0])
    geometric = int(np.count_nonzero(mother[:, :, 3]))
    assert geometric == 1425463 and science.shape == flags.shape == finite.shape == (2048, 2048)
    output.mkdir(parents=True)
    snapshot = output/"executed-script.py"
    snapshot.write_bytes(Path(__file__).read_bytes())
    proposals = {p["id"]: p for p in generations["curated"]["proposals"]}
    independent = {}
    contacts = []
    maximum_coordinate_error = 0.0
    maximum_centroid_error = 0.0
    selected_fields = []
    for name, point in proposals.items():
        hx, hy = point["sourcePeakIntegerColumnTopRow"]
        hintx, hinty = point["visualHintSourceColumnTopRow"]
        search = source_intensity[hinty-18:hinty+19, hintx-18:hintx+19]
        sy, sx = np.unravel_index(np.argmax(search), search.shape)
        assert [hx, hy] == [hintx-18+int(sx), hinty-18+int(sy)]
        raw = roi(rgb, hx, hy, 64)
        saved = np.load(ROOT/point["arrays"]["hst-original-rgb-roi"]["path"], allow_pickle=False)
        assert np.array_equal(raw, saved) and raw.shape == (129, 129, 3)
        clipping = {"anyChannel255": int(np.any(raw == 255, axis=2).sum()), "allChannels255": int(np.all(raw == 255, axis=2).sum())}
        assert clipping["anyChannel255"] == point["hstAnyRgb255InNative129Roi"]
        assert clipping["allChannels255"] == point["hstAllRgb255InNative129Roi"]
        hst_coordinates = {}
        for radius in (4, 8, 12):
            native = centroid(roi(source_intensity, hx, hy, 32), radius, (20, 28))
            maximum_centroid_error = max(maximum_centroid_error, close(native["columnRow"], point["hstEncodedNativeCentroid"][str(radius)]["columnRow"]))
            actual_native = np.array([hx, hy])+native["columnRow"]
            target, world = transform(actual_native)
            author = point["hstNominalCoordinates"][str(radius)]
            maximum_coordinate_error = max(maximum_coordinate_error, close(target, author["nominalTargetColumnRow"]))
            close(world, author["raDecDeg"], 1e-10)
            close(actual_native, author["sourceColumnTopRow"])
            hst_coordinates[str(radius)] = target.tolist()
        nx, ny = np.rint(hst_coordinates["8"]).astype(int)
        actual_candidates = []
        rejected = []
        for px, py in maxima45(roi(science, nx, ny, 22)):
            x, y = int(nx)-22+px, int(ny)-22+py
            patch = roi(science, x, y, 16)
            passed, reason, metric = compact(patch)
            if not passed:
                rejected.append({"columnRow": [x, y], "reason": reason, "metrics": metric})
                continue
            yy, xx = np.indices((13, 13))
            disk = (xx-6)**2+(yy-6)**2 <= 36
            core = roi(flags, x, y, 6)[disk]
            coordinates = {str(radius): (np.array([x, y])+centroid(patch, radius, (10, 15))["columnRow"]).tolist() for radius in (4, 6, 8)}
            actual_candidates.append({"columnRow": [x, y], "rPeak": float(science[y, x]),
                "rejectedCorePixels": int(np.count_nonzero(core & REJECT)), "centroids": coordinates})
        actual_candidates.sort(key=lambda entry: entry["rPeak"], reverse=True)
        assert len(actual_candidates) == len(point["candidates"])
        for actual, author in zip(actual_candidates, point["candidates"]):
            assert actual["columnRow"] == author["integerSdssPeakColumnRow"]
            assert actual["rPeak"] == author["rPeak"] and actual["rejectedCorePixels"] == author["coreRejectedFlagPixels"]
            for radius in (4, 6, 8):
                maximum_centroid_error = max(maximum_centroid_error, close(actual["centroids"][str(radius)], np.array(actual["columnRow"])+author["centroids"][str(radius)]["columnRow"]))
        sdss_roi = roi(science, int(nx), int(ny), 48)
        finite_roi = roi(finite, int(nx), int(ny), 48)
        flag_roi = roi(flags, int(nx), int(ny), 48)
        if name != "foreground-6":
            for key, array in (("sdss-r-science", sdss_roi), ("sdss-common-finite", finite_roi), ("sdss-contributor-r-flags", flag_roi)):
                assert np.array_equal(array, np.load(ROOT/point["arrays"][key]["path"], allow_pickle=False))
            assert finite_roi.all() and np.isfinite(sdss_roi).all() and int(finite_roi.sum()) == 9409
        else:
            assert not actual_candidates and point["state"] == "NO_COMPACT_SDSS_COUNTERPART"
        arrays = {"nominalHstTargetRoi": save_array(output/(name+"-nominal-hst-target-roi.npy"), roi(mother, int(nx), int(ny), 48))}
        if name == "foreground-6":
            arrays.update({"sdssScience": save_array(output/(name+"-sdss-r-science.npy"), sdss_roi),
                "finite": save_array(output/(name+"-sdss-finite.npy"), finite_roi), "rFlags": save_array(output/(name+"-sdss-flags.npy"), flag_roi)})
        entry = {"independentSourceCoordinates": hst_coordinates, "actualBoundedCandidates": actual_candidates,
            "actualTopEightRejected": rejected, "clippingUnknownPhysicalSaturation": clipping,
            "nominalTargetIntegerCenter": [int(nx), int(ny)], "arrays": arrays}
        if actual_candidates:
            chosen = actual_candidates[0]
            x, y = chosen["columnRow"]
            yy, xx = np.indices((13, 13))
            disk = (xx-6)**2+(yy-6)**2 <= 36
            core = roi(flags, x, y, 6)[disk]
            enum = read_json(quality_dir/"301-3699-6-100.result.json")["bands"]["r"]["enum"]
            counts = {key: int(np.count_nonzero(core & (2**bit))) for key, bit in enum.items() if bit < 10}
            entry["selectedCoreFlagCounts"] = counts
            entry["selectedOverNextPeak"] = None if len(actual_candidates) == 1 else chosen["rPeak"]/actual_candidates[1]["rPeak"]
            contributors = {}
            for field in candidate["mosaic"]["fields"]:
                key = field["fieldKey"]
                weight = np.load(candidate_dir/candidate["mosaic"]["diagnostics"][key]["normalized-weight"]["file"], mmap_mode="r", allow_pickle=False)
                weights_in_core = roi(weight, x, y, 6)[disk]
                if not (weights_in_core > 0).any():
                    continue
                report = read_json(quality_dir/(key.replace("/", "-")+".result.json"))
                field_flags = np.load(ROOT/report["bands"]["r"]["projectedFlags"]["path"], mmap_mode="r", allow_pickle=False)
                native = roi(field_flags, x, y, 6)[disk]
                assert np.array_equal(core, native)
                association = report["bands"]["r"]["association"]
                assert association == point["sourceContributors"][key]["association"]
                assert association["identity"] == {"run": 3699, "rerun": "301", "camcol": 6, "field": 100, "band": "r"}
                corrected = ROOT/report["bands"]["r"]["correctedSource"]["path"]
                mask = ROOT/report["bands"]["r"]["maskSource"]["path"]
                psfield = ROOT/"output/sdss-m51-core-quality-inputs-1002-r1/sources/psField-003699-6-0100.fit"
                originals = {"frame": record(corrected), "fpM": record(mask), "psField": record(psfield)}
                ids = {}
                for source_key, source_record in originals.items():
                    assert source_record["sha256"] == association["sourceSha256"][source_key]
                    with fits.open(ROOT/source_record["path"], memmap=False) as hdus:
                        ids[source_key] = hdus[0].header["PS_ID"]
                    assert ids[source_key] == association["actualPS_ID"][source_key]
                assert len(set(ids.values())) == 1
                contributors[key] = {"centerWeight": float(weight[y, x]), "coreMinimumWeight": float(weights_in_core.min()),
                    "coreMaximumWeight": float(weights_in_core.max()), "actualAssociation": association, "originalHeadersPS_ID": ids}
            assert list(contributors) == ["301/3699/6/100"] and contributors["301/3699/6/100"]["coreMinimumWeight"] == 1
            entry["contributors"] = contributors
            if name in ACCEPT:
                assert chosen["rejectedCorePixels"] == 0 and point["state"] == "PROVISIONAL_COUNTERPART_NEEDS_VISUAL_REVIEW"
                selected_fields.append(list(contributors)[0])
            else:
                assert name == "foreground-4" and chosen["rejectedCorePixels"] == 113
                assert counts["S_MASK_SATUR"] == counts["S_MASK_INTERP"] == 25 and counts["S_MASK_NOTCHECKED"] == 113
                assert point["state"] == "REJECTED_SDSS_CORE_PROCESSING_FLAGS"
        independent[name] = entry
        contacts.append((name, raw, roi(mother, int(nx), int(ny), 48), sdss_roi))

    recomputed_fits = {}
    aperture_by_point = {}
    for label, sdss_radius, hst_radius in (("small", 4, 4), ("central", 6, 8), ("large", 8, 12)):
        a = np.array([independent[name]["actualBoundedCandidates"][0]["centroids"][str(sdss_radius)] for name in ACCEPT])
        b = np.array([independent[name]["independentSourceCoordinates"][str(hst_radius)] for name in ACCEPT])
        author = generations["fit"]["fitVariants"][label]
        close(a, author["sdssTargetPoints"])
        close(b, author["nominalHstTargetPoints"])
        delta = b-a
        median = np.median(delta, axis=0)
        translate_rms = float(np.sqrt(np.mean(np.sum((delta-median)**2, axis=1))))
        fitted = similarity(a, b)
        close(median, author["translationMedianHstMinusSdss"])
        close(translate_rms, author["translationRmsResidualTargetPixels"])
        close(fitted["coefficients"], author["similarity"]["coefficientsRealImagAndTranslation"])
        for our_key, their_key in (("scale", "scale"), ("rotationDegrees", "rotationDegrees"), ("rms", "rmsResidualTargetPixels"), ("residuals", "residualsTargetColumnRow")):
            close(fitted[our_key], author["similarity"][their_key])
        loo = []
        for index, name in enumerate(ACCEPT):
            keep = np.arange(4) != index
            held_fit = similarity(a[keep], b[keep])
            ca, sa, tx, ty = held_fit["coefficients"]
            predicted = np.array([ca*a[index, 0]-sa*a[index, 1]+tx, sa*a[index, 0]+ca*a[index, 1]+ty])
            residual = b[index]-predicted
            norm = float(np.linalg.norm(residual))
            close(residual, author["leaveOneOut"][index]["residualTargetColumnRow"])
            close(norm, author["leaveOneOut"][index]["normTargetPixels"])
            loo.append({"heldOut": name, "residual": residual.tolist(), "norm": norm})
            aperture_by_point.setdefault(name, {})[label] = {"sdss": a[index].tolist(), "hstNominal": b[index].tolist(), "delta": delta[index].tolist()}
        polygon, area = independent_hull(a)
        close(area, author["convexHullAreaTargetPixelsSquared"], 1e-6)
        close(area/geometric, author["convexHullOverNominalHstGeometricSupport"])
        recomputed_fits[label] = {"translationMedianHstMinusSdss": median.tolist(), "translationRms": translate_rms,
            "similarity": fitted, "leaveOneOut": loo, "hull": polygon.tolist(), "hullArea": area,
            "hullFractionNominalGeometry": area/geometric, "sdssPoints": a.tolist(), "hstNominalPoints": b.tolist()}
    for name, variants in aperture_by_point.items():
        variants["maximumSdssPairDistance"] = max(float(np.linalg.norm(np.array(variants[a]["sdss"])-variants[b]["sdss"])) for a, b in itertools.combinations(("small", "central", "large"), 2))
        variants["maximumHstNominalPairDistance"] = max(float(np.linalg.norm(np.array(variants[a]["hstNominal"])-variants[b]["hstNominal"])) for a, b in itertools.combinations(("small", "central", "large"), 2))
        variants["maximumDeltaPairDistance"] = max(float(np.linalg.norm(np.array(variants[a]["delta"])-variants[b]["delta"])) for a, b in itertools.combinations(("small", "central", "large"), 2))

    false_ties = []
    for index, old in enumerate(generations["automatic"]["ties"]):
        a = np.array(old["coordinatesByApertureRadius"]["6"]["sdssColumnRow"])
        b = np.array(old["coordinatesByApertureRadius"]["6"]["hstNominalTargetColumnRow"])
        close(b-a, old["nominalHstMinusSdssTargetColumnRow"])
        if index < 2:
            name = ACCEPT[index]
            close(a, independent[name]["actualBoundedCandidates"][0]["centroids"]["6"])
            true = np.array(independent[name]["independentSourceCoordinates"]["8"])
            false_ties.append({"automaticId": old["id"], "correspondingForeground": name,
                "wrongNeighbourDelta": (b-a).tolist(), "actualForegroundDelta": (true-a).tolist(),
                "wrongVsForegroundDistance": float(np.linalg.norm(b-true)),
                "actualVisualFinding": "Original contact places automatic HST proposal on weak neighbour rather than the bright diffraction-spike source"})
        else:
            false_ties.append({"automaticId": old["id"], "actualVisualFinding": "Companion dust/background structure; insufficient foreground identity; remains excluded"})
        x, y = np.rint(a).astype(int)
        # The author saved the ROI around the integer SDSS maximum, not rounded centroid.
        old_saved_r = np.load(ROOT/old["arrays"]["sdss-r-science"]["path"], allow_pickle=False)
        assert np.array_equal(old_saved_r, roi(science, int(x), int(y), 32))
        lx, ly, rx, ry = old["nativeHstRgbRoiBounds"]
        assert np.array_equal(rgb[ly:ry, lx:rx], np.load(ROOT/old["arrays"]["hst-original-encoded-rgb-roi"]["path"], allow_pickle=False))
    controls_a = np.array([[100., 150.], [720., 120.], [850., 720.], [240., 850.]])
    controls = {}
    for label, factor, shift in (("known", 1.003*np.exp(1j*np.radians(.12)), .8-1.2j), ("zero", 1+0j, 0+0j)):
        z = controls_a[:, 0]+1j*controls_a[:, 1]
        w = factor*z+shift
        b = np.column_stack((w.real, w.imag))
        fitted = similarity(controls_a, b)
        close(fitted["coefficients"], [factor.real, factor.imag, shift.real, shift.imag], 1e-10)
        assert fitted["rms"] < 1e-10
        controls[label] = fitted
    # An association mutation uses the two actual preserved false neighbours, not synthetic source pixels.
    a = np.array(recomputed_fits["central"]["sdssPoints"])
    mutated_b = np.array(recomputed_fits["central"]["hstNominalPoints"])
    for index in (0, 1):
        mutated_b[index] = generations["automatic"]["ties"][index]["coordinatesByApertureRadius"]["6"]["hstNominalTargetColumnRow"]
    mutation = similarity(a, mutated_b)
    assert mutation["rms"] > 3 and abs(mutation["rotationDegrees"]-recomputed_fits["central"]["similarity"]["rotationDegrees"]) > .5

    sheet = Image.new("RGB", (970, 286*len(contacts)), "#101010")
    draw = ImageDraw.Draw(sheet)
    for index, (name, raw, nominal_roi, sdss_roi) in enumerate(contacts):
        top = index*286
        draw.text((8, top+20), name+"\nIndependent original readback\nNative HST / nominal target / SDSS r", fill="white")
        gray_low, gray_high = np.quantile(sdss_roi, [.1, .999])
        assert gray_high > gray_low
        gray = np.rint(np.clip((sdss_roi-gray_low)/(gray_high-gray_low), 0, 1)*255).astype(np.uint8)
        sheet.paste(Image.fromarray(raw).resize((258, 258), Image.Resampling.NEAREST), (180, top+20))
        sheet.paste(Image.fromarray(nominal_roi[:, :, :3]).resize((258, 258), Image.Resampling.NEAREST), (445, top+20))
        sheet.paste(Image.fromarray(gray).convert("RGB").resize((258, 258), Image.Resampling.NEAREST), (710, top+20))
        draw.text((180, top), "Original JPEG RGB", fill="white")
        draw.text((445, top), "Uncorrected nominal target ROI", fill="white")
        draw.text((710, top), "Science r, diagnostic local linear", fill="white")
    sheet.save(output/"independent-six-regions-contact.png")
    review = {"scope": __doc__, "requests": 0, "authorGenerations": {name: record(ROOT/"output"/g[0]/"result.json") for name, g in GENERATIONS.items()},
        "originalsAndSavedRoisByteExact": True, "metadataRawExplicitTan": metadata,
        "maximumCoordinateDifferenceTargetPixels": maximum_coordinate_error, "maximumCentroidDifferencePixels": maximum_centroid_error,
        "regions": independent, "qualifiedLocalCorrespondences": list(ACCEPT), "allAcceptedActualFields": selected_fields,
        "excluded": ["foreground-4: actual 113 NOTCHECKED and 25 INTERP/SATUR core pixels", "foreground-6: zero unchanged-rule top-eight compact counterparts", "automatic-tie-3: unqualified foreground identity in companion dust field"],
        "recomputedFits": recomputed_fits, "apertureSensitivity": aperture_by_point,
        "falseNeighbourReadback": false_ties, "controls": controls, "preservedActualFalseNeighbourMutationFit": mutation,
        "contact": record(output/"independent-six-regions-contact.png"),
        "visualInspection": "AWAITING_ACTUAL_REVIEWER_VIEW_OF_THIS_NEW_CONTACT; earlier two author contacts viewed directly",
        "status": "BOUNDED_LOCAL_MATH_PASS_NO_SOURCE_TRANSFORM_NO_FULL_FIELD_ASTROMETRY",
        "limits": ["Visual foreground-like correspondences are not catalog identities; HST physical saturation/calibration/motion and SDSS primary TAN approximation remain unverified.",
                   "All four supported ties use one field and 6.77% local hull; no northern/companion, cross-run or absolute certificate.",
                   "Small/central/large apertures measure sensitivity, not statistical confidence or full systematic error.",
                   "Similarity maps SDSS target points to nominal HST target points; it is diagnostic only, not a corrected source WCS.",
                   "Specific image rights review remains separate; full visible runtime credit, background/edge composition, publication and native quality remain undelivered."]}
    write_json(output/"review.json", review)
    before = sorted(protected_map.values(), key=lambda entry: entry["path"])
    after = [record(ROOT/item["path"]) for item in before]
    assert before == after
    outputs = [record(path) for path in sorted(output.rglob("*")) if path.is_file()]
    write_json(output/"binding.json", {"script": record(snapshot), "review": record(output/"review.json"), "inputsBefore": before, "inputsAfter": after, "unchanged": True, "outputs": outputs})
    print(json.dumps({"review": record(output/"review.json"), "binding": record(output/"binding.json"), "qualified": list(ACCEPT), "hullFraction": recomputed_fits["central"]["hullFractionNominalGeometry"], "maximumCoordinateDifference": maximum_coordinate_error}))


if __name__ == "__main__":
    main()
