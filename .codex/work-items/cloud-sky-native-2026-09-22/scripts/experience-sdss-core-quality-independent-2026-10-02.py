"""Independent cached-data oracle plus bounded owner mutations, offline only.

Native mask oracle uses cumulative interval events, unlike the owner's span
slices. Raw science, WCS and four-neighbor calculations do not call the new
quality/stencil/scientific sampler. No pixel is removed because it is flagged.
"""
from __future__ import annotations

import bz2
import copy
import gzip
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import types

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
sys.path[:0] = [str(ROOT / "data-pipelines/deep-sky"), str(ROOT / "output/allwise-w3-atlas-0929/python-deps")]
import astropy
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS

OUT = ROOT / "output/sdss-m51-core-quality-independent-1002-r1"
AUTHOR = ROOT / "output/sdss-m51-core-quality-diagnosis-1002-r1"
RAW = ROOT / "output/sdss-m51-core-quality-inputs-1002-r1"
BANDS = "gri"
CORE = {"run": 3699, "rerun": "301", "camcol": 6, "field": 100}
LIMIT = 16 * 1024 * 1024
OWNER_SHA = "0e450d57d13baa31d1029a6e66435d2dcdd420e866ffe1633b8c3f1ecb02bbeb"
TEST_SHA = "ae391d26dbfe464232f02b1dd0ea048574920e6c19e9c7ba93266871d99ed346"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def bind(path):
    path = path.resolve()
    data = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(data), "sha256": sha(data)}


def identity(array):
    return {"shape": list(array.shape), "dtype": array.dtype.str, "sha256COrder": sha(array.tobytes(order="C"))}


def save(name, value):
    path = OUT / name
    with path.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n")
    return bind(path)


def save_array(name, value):
    path = OUT / name
    with path.open("xb") as stream:
        np.save(stream, value, allow_pickle=False)
    loaded = np.load(path, allow_pickle=False)
    assert loaded.tobytes() == value.tobytes() and loaded.dtype == value.dtype and loaded.shape == value.shape
    return {**bind(path), **identity(value)}


def decoded_author_array(entry):
    path = ROOT / entry["path"]
    assert bind(path) == {key: entry[key] for key in ("path", "bytes", "sha256")}
    value = np.load(path, allow_pickle=False)
    assert identity(value) == {key: entry[key] for key in ("shape", "dtype", "sha256COrder")}
    return value


def native_flags(raw):
    """Independent interval-event sweep; every object's overlap becomes OR."""
    with fits.open(io.BytesIO(raw), memmap=False) as hdus:
        rows, cols = int(hdus[0].header["MASKROWS"]), int(hdus[0].header["MASKCOLS"])
        flags = np.zeros((rows, cols), dtype=np.uint16)
        plane_counts = {}
        for plane, table in enumerate(hdus[1:11]):
            events = np.zeros((rows, cols + 1), dtype=np.int32)
            for record in table.data:
                triplets = np.frombuffer(record["s"].tobytes(), dtype=">i2").reshape(-1, 3).astype(np.int64)
                yy = triplets[:, 0] + int(record["row0"])
                lo, hi = triplets[:, 1] + int(record["col0"]), triplets[:, 2] + int(record["col0"])
                assert len(triplets) == record["nspan"] and np.all(lo <= hi)
                assert np.all((yy >= 0) & (yy < rows) & (lo >= 0) & (hi < cols))
                np.add.at(events, (yy, lo), 1)
                np.add.at(events, (yy, hi + 1), -1)
            supplied = np.cumsum(events, axis=1, dtype=np.int32)[:, :-1] > 0
            name = str(hdus[11].data[plane]["attributeName"]).strip()
            assert int(hdus[11].data[plane]["Value"]) == plane
            flags[supplied] |= np.uint16(2 ** plane)
            plane_counts[name] = int(supplied.sum())
        assert not np.any(flags & 1024)
        return flags, plane_counts, hdus[0].header.copy()


def independent_sample(source, native, x, y):
    rows, columns = source.shape
    geometry = np.isfinite(x) & np.isfinite(y) & (x >= 0) & (y >= 0) & (x < columns - 1) & (y < rows - 1)
    x0, y0 = np.floor(x[geometry]).astype(np.int64), np.floor(y[geometry]).astype(np.int64)
    science = np.full(x.shape, np.nan, dtype=np.float32)
    finite_mask = np.zeros(x.shape, dtype=np.bool_)
    samples = np.array([source[y0, x0], source[y0, x0 + 1], source[y0 + 1, x0], source[y0 + 1, x0 + 1]])
    finite = np.isfinite(samples).all(axis=0)
    finite_mask[geometry] = finite
    fx, fy = x[geometry][finite] - x0[finite], y[geometry][finite] - y0[finite]
    a, b, c, d = samples[:, finite].astype(np.float64)
    science[finite_mask] = (a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy).astype(np.float32)
    quality = np.zeros(x.shape, dtype=np.uint16)
    quality[geometry] = np.bitwise_or.reduce(np.array([native[y0, x0], native[y0, x0 + 1], native[y0 + 1, x0], native[y0 + 1, x0 + 1]]), axis=0)
    return science, geometry, finite_mask, quality


def raw_kernel(raw, band, x, y):
    with fits.open(io.BytesIO(raw), memmap=False) as hdus:
        table = hdus["ugriz".index(band) + 1]
        kernel = np.zeros((int(table.data[0]["RNROW"]), int(table.data[0]["RNCOL"])), dtype=np.float64)
        weights = []
        for index, record in enumerate(table.data):
            # Decode coefficient bytes independently of Astropy's TDIM view.
            start = table.fileinfo()["datLoc"] + index * table.header["NAXIS1"] + 8
            coeff = np.frombuffer(raw[start:start + 100], dtype=">f4").reshape(5, 5).astype(np.float64)
            nr, nc = int(record["nrow_b"]), int(record["ncol_b"])
            weight = sum(coeff[r, c] * ((y + .5) / 1000) ** r * ((x + .5) / 1000) ** c for r in range(nr) for c in range(nc))
            weights.append(float(weight))
            kernel += weight * np.asarray(record["RROWS"], dtype=np.float64).reshape(kernel.shape)
        return kernel, weights


def mutate_module(original, name, needle, replacement):
    assert original.count(needle) == 1, name
    text = original.replace(needle, replacement)
    path = OUT / "mutants" / f"{name}.py"
    path.write_text(text, encoding="utf-8")
    module = types.ModuleType(f"sdss_quality_independent_mutant_{name}")
    module.__file__ = str(path)
    sys.modules[module.__name__] = module
    exec(compile(text, str(path), "exec"), module.__dict__)
    return module, bind(path)


def changed_psfield(raw, name, edit, field=100):
    directory = OUT / "fixtures" / name
    directory.mkdir()
    with fits.open(io.BytesIO(raw), memmap=False) as hdus:
        edit(hdus)
        stream = io.BytesIO()
        hdus.writeto(stream)
    data = stream.getvalue()
    path = directory / f"psField-003699-6-{field:04d}.fit"
    path.write_bytes(data)
    expected = {**CORE, "field": field, "bytes": len(data), "sha256": sha(data),
        "sourceUrl": f"https://data.sdss.org/sas/dr17/eboss/photo/redux/301/3699/objcs/6/{path.name}"}
    return path, expected


def fail_reason(call, required):
    try:
        call()
    except RuntimeError as error:
        assert required in str(error), (required, str(error))
        return str(error)
    raise AssertionError(f"did not reject {required}")


def main():
    assert not OUT.exists()
    author_result_path = AUTHOR / "result.json"
    assert bind(author_result_path)["sha256"] == "1b1fc575f4e5ca50aac77b74a2290501270bb71baf2b6093891f8d66dd435866"
    author = json.loads(author_result_path.read_text("utf-8"))
    binding_path = AUTHOR / "binding.json"
    author_binding = json.loads(binding_path.read_text("utf-8"))
    source_path = ROOT / "data-pipelines/deep-sky/sdss_frame_quality.py"
    tests_path = ROOT / "data-pipelines/deep-sky/test_sdss_frame_quality.py"
    assert bind(source_path)["sha256"] == OWNER_SHA and bind(tests_path)["sha256"] == TEST_SHA
    frozen = author_binding["owners"] + author_binding["inputQualityGeneration"] + author_binding["oldAssets"]
    frozen += [{"path": item["path"], "bytes": (ROOT / item["path"]).stat().st_size, "sha256": item["sha256"]}
               for item in author_binding["sixPreserved"]]
    frozen += [bind(author_result_path), bind(binding_path), bind(tests_path)]
    for item in author_binding["outputs"]:
        assert bind(ROOT / item["path"]) == item
    for item in frozen:
        assert bind(ROOT / item["path"]) == item
    OUT.mkdir()
    (OUT / "mutants").mkdir()
    (OUT / "fixtures").mkdir()
    (OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    save("started.json", {"scope": __doc__, "owners": author_binding["owners"], "authorResult": bind(author_result_path), "networkRequests": 0})
    target = WCS(author["target"]["wcsHeader"])
    yy, xx = np.indices((512, 512), dtype=np.float64)
    ra, dec = target.all_pix2world(xx, 511 - yy, 0)
    acq = json.loads((RAW / "acquisition.json").read_text("utf-8"))
    sources = {item["filename"]: item for item in acq["sourceFiles"]}
    psf_raw = (RAW / "sources/psField-003699-6-0100.fit").read_bytes()
    frame_bindings, bands = [], {}
    for band in BANDS:
        item = author["bands"][band]
        frame_path = ROOT / item["correctedSource"]["path"]
        assert bind(frame_path) == item["correctedSource"]
        frame_bindings.append(bind(frame_path))
        with fits.open(io.BytesIO(bz2.decompress(frame_path.read_bytes())), memmap=False) as hdus:
            source = np.array(hdus[0].data, dtype=np.float32, copy=True)
            header = hdus[0].header.copy()
        source_digest_before = sha(source.tobytes())
        frame_wcs = WCS(header)
        sx, sy = frame_wcs.all_world2pix(ra, dec, 0)
        mask_path = RAW / "sources" / f"fpM-003699-{band}6-0100.fit.gz"
        native, counts, mask_header = native_flags(gzip.decompress(mask_path.read_bytes()))
        assert identity(native) == item["nativeFlagArray"] and counts == item["nativePlanePixels"]
        science, geometry, finite, flags = independent_sample(source, native, sx, sy)
        actual_flags = decoded_author_array(item["detail"]["flags"])
        actual_available = decoded_author_array(item["detail"]["availability"])
        assert np.array_equal(flags, actual_flags) and np.array_equal(geometry & finite, actual_available)
        assert identity(science) == item["detail"]["science"]
        cx, cy = item["center"]["sourceColumnRowZeroIndexed"]
        catalog = author["candidate"]
        c_json = json.loads((ROOT / catalog["path"]).read_text("utf-8"))
        center_independent = frame_wcs.all_world2pix(c_json["center"]["raDeg"], c_json["center"]["decDeg"], 0)
        assert np.max(np.abs(np.asarray(center_independent) - [cx, cy])) == 0
        kernel, weights = raw_kernel(psf_raw, band, cx, cy)
        actual_kernel = decoded_author_array(item["center"]["psfKernel"])
        difference = float(np.max(np.abs(kernel - actual_kernel)))
        assert difference < 2e-15
        total, square = float(kernel.sum()), float(np.sum(kernel * kernel))
        nea = total * total / square
        assert abs(nea - item["center"]["psfSummary"]["noiseEquivalentAreaSourcePixels"]) < 2e-12
        assert item["sourceAssociation"]["processingIdentity"] == "MATCH"
        with fits.open(io.BytesIO(psf_raw), memmap=False) as ps:
            batch = [header["PS_ID"], ps[0].header["PS_ID"], mask_header["PS_ID"]]
            assert len(set(batch)) == 1 and item["sourceAssociation"]["actualPS_ID"] == dict(zip(("frame", "psField", "fpM"), batch))
        flag_counts = {name: int(np.count_nonzero((geometry & finite) & ((flags & (1 << index)) != 0)))
                       for index, name in enumerate(counts)}
        assert flag_counts == item["detail"]["finiteAvailablePlanePixels"]
        assert sha(source.tobytes()) == source_digest_before
        corners = []
        for point in item["spatialPsfAtDetailCorners"]:
            tx, ty = point["targetColumnRow"]
            assert np.max(np.abs([sx[ty, tx], sy[ty, tx]] - np.asarray(point["sourceColumnRow"]))) == 0
            corner, _ = raw_kernel(psf_raw, band, sx[ty, tx], sy[ty, tx])
            assert np.isfinite(corner).all()
            assert abs(float(corner.sum()) - point["sumSignedRelative"]) < 2e-14
            corners.append({"targetColumnRow": [tx, ty], "kernelSum": float(corner.sum()), "negativePixels": int(np.count_nonzero(corner < 0))})
        bands[band] = {"nativeFlags": save_array(f"native-{band}-flags-independent.npy", native),
            "detailFlags": save_array(f"detail-{band}-flags-independent.npy", flags),
            "detailAvailability": save_array(f"detail-{band}-availability-independent.npy", geometry & finite),
            "science": identity(science), "scienceExactAuthorCOrderBytes": True, "scienceNegativePixels": int(np.count_nonzero(science < 0)),
            "scienceZeroPixels": int(np.count_nonzero(science == 0)), "detailFiniteFlagCounts": flag_counts,
            "nativeFlagsExactAuthorCOrderBytes": True, "nativePlaneCounts": counts,
            "centerIndependentKernel": save_array(f"center-{band}-independent-psf.npy", kernel),
            "centerKernelMaxAbsoluteDifference": difference, "centerWeights": weights,
            "centerNegativeKernelSamples": int(np.count_nonzero(kernel < 0)),
            "relativeKernelNEASourcePixels": nea, "actualProcessingBatchMatches": True, "corners": corners,
            "availabilityQualityMeaning": "flags preserve source-processing labels; finite geometry is separate, none is a scientific-quality pass"}

    import sdss_frame_quality as owner
    from sdss_corrected_frame import read_cached_frame
    from sdss_gri_tan import bilinear_samples
    from sdss_source_stencil import source_pixel_stencil
    ps_record = sources["psField-003699-6-0100.fit"]
    ps_expected = {**CORE, "bytes": ps_record["bytes"], "sha256": ps_record["sha256"], "sourceUrl": ps_record["url"]}
    psf = owner.read_cached_psfield(RAW / "sources" / ps_record["filename"], ps_expected, max_uncompressed_bytes=LIMIT)
    g_record = sources["fpM-003699-g6-0100.fit.gz"]
    g_expected = {**CORE, "band": "g", "bytes": g_record["bytes"], "sha256": g_record["sha256"], "sourceUrl": g_record["url"]}
    mask = owner.read_cached_fpm(RAW / "sources" / g_record["filename"], g_expected, max_uncompressed_bytes=LIMIT)
    frame_source = author["bands"]["g"]["correctedReceipt"]["source"]
    frame = read_cached_frame(ROOT / author["bands"]["g"]["correctedSource"]["path"],
        {**CORE, "band": "g", "bytes": frame_source["bytes"], "sha256": frame_source["sha256"], "sourceUrl": frame_source["sourceUrl"]},
        max_uncompressed_bytes=32 * 1024 * 1024)
    x = np.array([[0, 2.999, 3, -0.01, np.nan, np.inf, 1]])
    y = np.array([[0, 1.999, 1, 0, 1, 1, 2]])
    geometry = source_pixel_stencil((3, 4), x, y)
    assert np.array_equal(geometry.geometry, [[True, True, False, False, False, False, False]])
    assert np.array_equal(geometry.x0, [0, 2]) and np.array_equal(geometry.y0, [0, 1])
    flux = np.array([[0, -3, 5, 6], [7, 8, 9, 10], [11, 12, 13, 14]], dtype=np.float32)
    q = np.zeros((3, 4), dtype=np.uint16)
    q[0, 0], q[0, 1], q[1, 0], q[1, 1] = 1, 2, 4, 8
    test_flags = owner.PixelFlags(q, {}, {})
    queries = np.array([0., 2.]), np.array([0., 1.])
    before = bilinear_samples(flux, *queries)
    qa_before = test_flags.stencil(*queries)
    assert before[0][0] == 0 and before[0][1] == 9 and before[2].all() and qa_before.flags[0] == 15
    flux[0, 0] = -5
    assert bilinear_samples(flux, *queries)[0][0] == -5
    flux[0, 0] = np.nan
    changed = bilinear_samples(flux, *queries)
    assert not changed[2][0] and np.array_equal(qa_before.flags, test_flags.stencil(*queries).flags)
    controls = {"sharedStencilExplicitBoundary": "last samples reject their unavailable +1 neighbor; NaN/Inf reject without indices",
        "finiteZeroNegativeAndQualityIndependent": True, "qualityDoesNotCertifyFiniteFlux": True}

    def asymmetric(hdus):
        table = hdus[2].data
        table["c"][:] = 0
        table["nrow_b"][:] = [2, 1, 3, 1]
        table["ncol_b"][:] = [2, 3, 1, 1]
        for index in range(4):
            table["RROWS"][index][:] = 0
            table["RROWS"][index][index] = [1, 2, -3, 4][index]
            table["c"][index, 4, 4] = np.nan
        table["c"][0, 0, 0], table["c"][0, 1, 0], table["c"][0, 0, 1] = 2, 10, 100
        table["c"][1, 0, :3] = [3, 4, 5]
        table["c"][1, 1, 0] = np.nan
        table["c"][2, :3, 0] = [6, 7, 8]
        table["c"][2, 0, 1] = np.nan
        table["c"][3, 0, 0] = 11
    fixture_path, fixture_expected = changed_psfield(psf_raw, "asymmetric-per-basis", asymmetric)
    fixture = owner.read_cached_psfield(fixture_path, fixture_expected, max_uncompressed_bytes=LIMIT)
    result = fixture.reconstruct("g", 5, 9)
    expected4 = [2.645, 6.0443025, -18.201666, 44.]
    assert np.max(np.abs(result[0, :4] - expected4)) < 2e-12 and np.count_nonzero(result) == 4
    controls["asymmetricPerRowOrdersFourBasesAndInactiveNaNs"] = {"fixture": bind(fixture_path), "newExpectedHash": fixture_expected["sha256"], "handDeclaredFirstFour": expected4}
    source_text = source_path.read_text("utf-8")
    mutations = []
    for name, needle, replacement in [
        ("transpose-coefficient-axes", "basis.coefficients[k, i, j]", "basis.coefficients[k, j, i]"),
        ("drop-fourth-basis", "range(basis.images.shape[0])", "range(basis.images.shape[0] - 1)"),
        ("remove-photo-half-pixel", "row, column = (float(y) + .5) * .001, (float(x) + .5) * .001", "row, column = float(y) * .001, float(x) * .001")]:
        module, binding = mutate_module(source_text, name, needle, replacement)
        mutated = module.PsfField(psf.bands, psf.receipt)
        errors = {}
        for band in BANDS:
            cx, cy = author["bands"][band]["center"]["sourceColumnRowZeroIndexed"]
            errors[band] = float(np.max(np.abs(mutated.reconstruct(band, cx, cy) - psf.reconstruct(band, cx, cy))))
            assert errors[band] > 1e-10
        mutations.append({"name": name, "source": binding, "detectedActualCoreMaxErrors": errors})
    module, binding = mutate_module(source_text, "ignore-processing-batch", "if len(known) > 1:", "if False:")
    mismatch_path, mismatch_expected = changed_psfield(psf_raw, "ps-id-mismatch", lambda h: h[0].header.__setitem__("PS_ID", "independent-different-processing"))
    mismatched = owner.read_cached_psfield(mismatch_path, mismatch_expected, max_uncompressed_bytes=LIMIT)
    rejection = fail_reason(lambda: owner.check_frame_quality(frame, mismatched, mask), "processing_identity_mismatch")
    bypass = module.check_frame_quality(frame, module.PsfField(mismatched.bands, mismatched.receipt), module.PixelFlags(mask.flags, mask.enum, mask.receipt))
    assert bypass["processingIdentity"] == "MATCH" and len(set(bypass["actualPS_ID"].values())) == 2
    mutations.append({"name": "ignore-processing-batch", "source": binding, "fixture": bind(mismatch_path),
        "currentRejects": rejection, "bypassedIncorrectMatch": bypass})
    missing_path, missing_expected = changed_psfield(psf_raw, "ps-id-missing", lambda h: h[0].header.__delitem__("PS_ID"))
    missing_psf = owner.read_cached_psfield(missing_path, missing_expected, max_uncompressed_bytes=LIMIT)
    unknown = owner.check_frame_quality(frame, missing_psf, mask)
    assert unknown["processingIdentity"] == "PARTIAL_KNOWN_MATCH_MISSING_UNKNOWN" and unknown["quality"] == "UNKNOWN"
    assert unknown["missingProcessingIdentity"] == ["psField"]
    def other_field(hdus):
        hdus[0].header["FIELD"] = 101
        hdus[6].data["field"][0] = 101
    different_path, different_expected = changed_psfield(psf_raw, "different-field", other_field, field=101)
    different_psf = owner.read_cached_psfield(different_path, different_expected, max_uncompressed_bytes=LIMIT)
    controls["newHashWrongFieldRejects"] = {"fixture": bind(different_path), "reason": fail_reason(lambda: owner.check_frame_quality(frame, different_psf, mask), "correlation_identity_mismatch")}
    controls["newHashProcessingMismatchRejects"] = rejection
    controls["newHashMissingProcessingUnknown"] = {"fixture": bind(missing_path), "association": unknown}
    controls["wrongBandAndShapeReject"] = {
        "wrongBand": fail_reason(lambda: owner.check_frame_quality(frame, psf, owner.PixelFlags(mask.flags, mask.enum, {**mask.receipt, "expectedIdentity": {**mask.receipt["expectedIdentity"], "band": "r"}})), "correlation_identity_mismatch"),
        "wrongShape": fail_reason(lambda: owner.check_frame_quality(frame, psf, owner.PixelFlags(mask.flags[:, :-1], mask.enum, mask.receipt)), "correlation_shape_mismatch")}
    selected = ["ActualQualityTest.test_aliased_valid_heap_bounds_cannot_expand_past_admission_budget",
        "ActualQualityTest.test_duplicate_or_overlap_with_self_consistent_bbox_and_sum_npix_is_rejected",
        "ActualQualityTest.test_newly_hash_bound_span_mismatch_heap_and_enum_fail_at_semantic_owner"]
    code = "import sys,unittest;sys.path[:0]=" + repr(sys.path[:2]) + ";s=unittest.TestLoader().loadTestsFromNames(" + repr(["test_sdss_frame_quality." + name for name in selected]) + ");r=unittest.TextTestRunner(verbosity=2).run(s);sys.exit(not r.wasSuccessful())"
    check = subprocess.run([sys.executable, "-c", code], cwd=ROOT, capture_output=True, text=True)
    (OUT / "focused-checks.txt").write_text(check.stdout + check.stderr, encoding="utf-8")
    assert check.returncode == 0, check.stderr
    for item in frozen + frame_bindings:
        assert bind(ROOT / item["path"]) == item
    final = {"scope": "Independent actual one-field source mask and spatial PSF diagnostics; no science/weight/RGB/native quality adoption",
        "owners": author_binding["owners"], "authorResult": bind(author_result_path), "authorBinding": bind(binding_path),
        "libraries": {"numpy": np.__version__, "astropy": astropy.__version__}, "bands": bands,
        "boundedControls": controls, "boundedMutations": mutations, "focusedChecks": selected,
        "networkRequests": 0, "old201AssetsAndSixPreservedUnchanged": True, "allFrozenAuthorAndRawFilesUnchanged": True,
        "scientificQuality": "UNKNOWN", "wholeMosaicQuality": "UNVERIFIED",
        "limitations": ["Only field3699/301/6/100 quality exists here; other five field inputs absent.",
            "Primary TAN/PHOTO+.5 declared approximation; no full asTrans or measured absolute PSF validation.",
            "Native flags are source-processing diagnostics, not missing-science masks/display alpha/source correction.",
            "Signed relative kernel/NEA not FWHM or sharpening/deconvolution certification.",
            "Unknown-license archive/SDSSIDL code not copied, installed or executed; no new dependency.",
            "Synthetic new-hash files are explicit task fixtures, not acquired field101 or new source entitlement.",
            "fpM supports zero object offsets and nonempty objects only; other object variants explicitly unsupported."]}
    save("review.json", final)
    outputs = [bind(path) for path in sorted(OUT.rglob("*")) if path.is_file()]
    save("binding.json", {"script": bind(OUT / "executed-script.py"), "authorFrozenInputs": frozen,
        "correctedFrameInputs": frame_bindings, "outputs": outputs})
    print(json.dumps({"review": bind(OUT / "review.json"), "binding": bind(OUT / "binding.json"), "sourceAndQualityOwner": OWNER_SHA}, indent=2))


if __name__ == "__main__":
    main()
