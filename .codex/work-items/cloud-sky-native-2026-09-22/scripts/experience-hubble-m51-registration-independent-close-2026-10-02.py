"""Close actual-view local HST registration review with frozen original failure readback."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT/"output/allwise-w3-atlas-0929/python-deps"))
import numpy as np


def bound(path):
    path = Path(path).resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def read(path):
    return json.loads(Path(path).read_bytes())


def save(path, value):
    with Path(path).open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False)+"\n")


def centroid33(values):
    yy, xx = np.indices(values.shape, dtype=float)
    xx -= 16
    yy -= 16
    squared = xx*xx+yy*yy
    background = float(np.median(values[(squared >= 100) & (squared <= 225)]))
    weights = np.maximum(values.astype(float)-background, 0)*(squared <= 36)
    return np.array([(weights*xx).sum(), (weights*yy).sum()])/weights.sum()


def complex_fit(a, b):
    z = a[:, 0]+1j*a[:, 1]
    w = b[:, 0]+1j*b[:, 1]
    centered = z-z.mean()
    coefficient = np.vdot(centered, w-w.mean())/np.vdot(centered, centered)
    translation = w.mean()-coefficient*z.mean()
    residual = w-(coefficient*z+translation)
    return {"coefficients": [float(coefficient.real), float(coefficient.imag), float(translation.real), float(translation.imag)],
        "scale": float(abs(coefficient)), "rotationDegrees": float(np.degrees(np.angle(coefficient))),
        "rms": float(np.sqrt(np.mean(np.abs(residual)**2))), "residuals": np.column_stack((residual.real, residual.imag)).tolist()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    output = parser.parse_args().output.resolve()
    assert output.is_relative_to((ROOT/"output").resolve()) and not output.exists()
    review_dir = ROOT/"output/hubble-m51-registration-independent-1002-r1"
    assert bound(review_dir/"review.json")["sha256"] == "361297590d5faff226398609e529d98270d05491895c5e490567e974d1228717"
    binding = read(review_dir/"binding.json")
    protected = {item["path"]: item for item in binding["inputsBefore"]}
    for path in sorted(review_dir.rglob("*")):
        if path.is_file():
            item = bound(path)
            protected[item["path"]] = item
    for item in protected.values():
        assert bound(ROOT/item["path"]) == item
    review = read(review_dir/"review.json")
    automatic = read(ROOT/"output/hubble-m51-registration-trial-1002-r1/result.json")
    nominal = read(ROOT/"output/hubble-m51-nominal-projection-trial-1002-r1/result.json")
    mother = np.load(ROOT/nominal["master"]["path"], mmap_mode="r", allow_pickle=False)
    output.mkdir(parents=True)
    snapshot = output/"executed-script.py"
    snapshot.write_bytes(Path(__file__).read_bytes())
    coordinates = []
    for point in automatic["ties"]:
        # Locating the saved peak is separate from recomputing centroid from the original pixels.
        integer_sdss = np.rint(np.array(point["coordinatesByApertureRadius"]["6"]["sdssColumnRow"])-point["sdssMeasurements"]["6"]["columnRow"]).astype(int)
        integer_hst = np.rint(np.array(point["coordinatesByApertureRadius"]["6"]["hstNominalTargetColumnRow"])-point["hstEncodedIntensityMeasurements"]["6"]["columnRow"]).astype(int)
        science = np.load(ROOT/point["arrays"]["sdss-r-science"]["path"], allow_pickle=False)
        a = integer_sdss+centroid33(science[16:49, 16:49])
        x, y = integer_hst
        intensity = mother[y-16:y+17, x-16:x+17, :3].astype(float).mean(axis=2)
        assert all(intensity[16, 16] > intensity[16+dy, 16+dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dx or dy)
        b = integer_hst+centroid33(intensity)
        assert np.max(np.abs(a-point["coordinatesByApertureRadius"]["6"]["sdssColumnRow"])) < 1e-10
        assert np.max(np.abs(b-point["coordinatesByApertureRadius"]["6"]["hstNominalTargetColumnRow"])) < 1e-10
        coordinates.append({"id": point["id"], "actualSdss": a.tolist(), "actualWrongOrUnqualifiedHst": b.tolist(), "delta": (b-a).tolist()})
    fitted = complex_fit(np.array([p["actualSdss"] for p in coordinates]), np.array([p["actualWrongOrUnqualifiedHst"] for p in coordinates]))
    old_fitted = automatic["provisionalFit"]["byCentroidApertureRadius"]["6"]["similarity"]
    assert np.max(np.abs(np.array(fitted["coefficients"])-old_fitted["coefficientsRealImagAndTranslation"])) < 1e-8
    assert abs(fitted["rms"]-old_fitted["rmsResidualTargetPixels"]) < 1e-8
    result = {"scope": __doc__, "requests": 0, "mathAndRoiReview": bound(review_dir/"review.json"),
        "actualViewedContact": review["contact"], "actualVisualQualification": {
            "foreground-1": "PASS local relative visual correspondence: strong original HST diffraction spike and strong isolated SDSS peak; faint neighbour visibly distinct",
            "foreground-2": "PASS local relative visual correspondence: strong original HST diffraction spike and strong isolated SDSS peak; faint neighbour visibly distinct",
            "foreground-3": "PASS local relative visual correspondence: strong original HST diffraction spike and one accepted compact SDSS peak; does not prove stellar catalogue identity",
            "foreground-4": "EXCLUDED: visibly stellar-like, actual SDSS processing flags invalidate diagnostic clean-tie eligibility",
            "foreground-5": "PASS local relative visual correspondence: strong original HST diffraction spike and dominant compact SDSS peak; background structure and encoded highlights remain uncertainty",
            "foreground-6": "EXCLUDED: actual native and nominal ROI dark/no independently qualified source; real SDSS patch has no unchanged-rule compact counterpart; no fabricated match",
            "automatic-tie-1-and-2": "FAIL: actual original contacts show weak neighbours in place of bright diffraction sources; the failure generation remains byte exact",
            "automatic-tie-3": "EXCLUDED: source in companion dust structure; insufficient reliable foreground identity"},
        "actualOriginalFailureCoordinates": coordinates, "independentOriginalFailureFit": fitted,
        "selectionCaveat": "Contrast uses full 33x33 patch maximum; nearby bright sources can inflate a weak peak's nominal contrast. Selected accepted peaks are actual dominant strong sources, but this bounded filter is not validated as a general automatic registration selector.",
        "status": "INDEPENDENT_OFFLINE_LOCAL_DIAGNOSIS_PASS_NO_TRANSFORM_ADOPTION",
        "limits": review["limits"], "noFullFieldCertificate": True,
        "runtimeRightsAndAcceptance": "Specific-source rights/metadata review retained; visible attribution, field/background composition, producer/runtime source integration and native acceptance remain pending"}
    save(output/"review.json", result)
    before = sorted(protected.values(), key=lambda item: item["path"])
    after = [bound(ROOT/item["path"]) for item in before]
    assert before == after
    save(output/"binding.json", {"script": bound(snapshot), "review": bound(output/"review.json"), "inputsBefore": before, "inputsAfter": after, "unchanged": True,
        "outputs": [bound(path) for path in sorted(output.rglob("*")) if path.is_file()]})
    print(json.dumps({"review": bound(output/"review.json"), "binding": bound(output/"binding.json"), "originalFailureRms": fitted["rms"], "originalFailureRotation": fitted["rotationDegrees"]}))


if __name__ == "__main__":
    main()
