"""Independent bounded readback; no network, publication, runtime or source edits."""
import bz2
import io
import json
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
sys.path[:0] = [str(ROOT / "output/allwise-w3-atlas-0929/python-deps"), str(ROOT / "data-pipelines/deep-sky")]
import numpy as np
from PIL import Image
from astropy.io import fits
from astropy.wcs import WCS
import sdss_corrected_frame as reader
import sdss_gri_tan as gri
from image_quality import digest


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def bind(path):
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": digest(raw)}


def verify(item):
    path = Path(item["path"])
    actual = bind(path if path.is_absolute() else ROOT / path)
    assert (actual["bytes"], actual["sha256"]) == (item["bytes"], item["sha256"]), item["path"]
    return actual


def local(data, x, y):
    xx, yy = np.meshgrid(np.arange(round(x) - 10, round(x) + 11), np.arange(round(y) - 10, round(y) + 11))
    values = data[yy, xx].astype(float)
    radius = np.hypot(xx - x, yy - y)
    if not np.isfinite(values).any():
        return {"actualSamples": "UNAVAILABLE", "positiveApertureSum": 0.0}
    annulus = values[(radius >= 7) & (radius <= 10)]
    background, noise = float(np.nanmedian(annulus)), float(np.nanstd(annulus))
    weights = np.maximum(values - background, 0) * (radius <= 4.5)
    total = float(np.nansum(weights))
    cx, cy = float(np.nansum(weights * xx) / total), float(np.nansum(weights * yy) / total)
    return {"actualSamples": "AVAILABLE", "centroidXY": [cx, cy], "offsetPixels": [cx - x, cy - y],
            "background": background, "annulusStandardDeviation": noise,
            "peakMinusBackground": float(np.nanmax(values[radius <= 4.5]) - background), "positiveApertureSum": total}


def boxes(rgba, factor):
    # Independent integer premultiplied mean; do not call the owner sampler.
    size = rgba.shape[0] // factor
    alpha = rgba[:, :, 3].reshape(size, factor, size, factor).sum(axis=(1, 3), dtype=np.uint64)
    weighted = (rgba[:, :, :3].astype(np.uint64) * rgba[:, :, 3:4]).reshape(size, factor, size, factor, 3).sum(axis=(1, 3))
    mean = np.zeros((size, size, 3), dtype=float)
    np.divide(weighted, alpha[:, :, None], out=mean, where=alpha[:, :, None] > 0)
    return np.dstack([np.rint(mean).astype(np.uint8), np.rint(alpha / factor ** 2).astype(np.uint8)])


def main():
    r2 = TASK / "evidence/sdss-corrected-frame-2026-10-02-r2"
    rb, rd = load(r2 / "binding.json"), load(r2 / "reader-receipts.json")
    reader_bindings = [verify(item) for item in [*rb["sourceFiles"], rb["script"], rb["acquisition"], rb["report"]]]
    assert rd["sourceBefore"] == rd["sourceAfter"]
    [verify(item) for item in rd["sourceBefore"]]
    directory = ROOT / "output/sdss-gri-tan-candidate-1002"
    gb, candidate, stars = load(directory / "binding.json"), load(directory / "candidate.json"), load(directory / "catalog-star-projections.json")
    candidate_bindings = [verify(item) for item in [gb["script"], *gb["sourceFiles"], *gb["inputs"], gb["astropyLuptonSource"], *gb["outputs"]]]
    assert gb["oldAssetsBefore"] == gb["oldAssetsAfter"]
    [verify(item) for item in gb["oldAssetsBefore"]]
    paths = sorted(path.relative_to(ROOT).as_posix() for path in (ROOT / "workers/miniapp-api/assets/deep-sky").rglob("*") if path.is_file())
    assert paths == sorted(item["path"] for item in gb["oldAssetsBefore"])
    verify(stars["source"])
    records = load(ROOT / "output/sdss-corrected-m51-1002/frame-acquisition.json")["sourceFiles"]
    source_data, source_wcs, facts = {}, {}, []
    for record in records:
        band = record["identity"]["band"]
        path = ROOT / "output/sdss-corrected-m51-1002/sources" / record["path"]
        raw = bz2.decompress(path.read_bytes())
        report = next(item for item in rd["receipts"] if item["identity"]["band"] == band)
        assert digest(raw) == report["decompressed"]["sha256"] and len(raw) == report["decompressed"]["bytes"]
        expected = {**record["identity"], "bytes": record["bytes"], "sha256": record["sha256"], "sourceUrl": record["url"]}
        frame = reader.read_cached_frame(path, expected, max_uncompressed_bytes=32 * 1024 * 1024)
        with fits.open(io.BytesIO(raw), memmap=False) as hdus:
            data = np.array(hdus[0].data, copy=True)
            assert np.array_equal(data, frame.data, equal_nan=True)
            source_data[band], source_wcs[band] = data, frame.wcs
            primary = hdus[0].header.tostring(sep="\n", endcard=True, padding=False)
            astrans = hdus[3].header.tostring(sep="\n", endcard=True, padding=False)
            assert digest(primary.encode("ascii")) == report["wcs"]["primaryHeaderSha256"]
            assert digest(astrans.encode("ascii")) == report["asTrans"]["headerSha256"]
            assert {name: reader._json_value(hdus[3].data[0][name]) for name in hdus[3].columns.names} == report["asTrans"]["row"]
            assert len(report["asTrans"]["row"]) == 31 and report["source"]["sourceUrl"] == record["url"]
            facts.append({"band": band, "primaryFrame": hdus[0].header["FRAME"], "asTransField": int(hdus[3].data[0]["FIELD"]),
                          "BUNIT": hdus[0].header["BUNIT"], "NMGY": float(hdus[0].header["NMGY"]),
                          "actualArrayKeptWithoutRecalibration": True, "finite": int(np.isfinite(data).sum()),
                          "zero": int((data == 0).sum()), "negative": int((data < 0).sum()), "rawSha256": digest(raw),
                          "asTransAll31ActualFieldsEqualReceipt": True})
    before_path = TASK / "evidence/experience-sdss-corrected-reader-independent-before-2026-10-02.json"
    before, original = load(before_path), records[0]
    original_path = ROOT / "output/sdss-corrected-m51-1002/sources" / original["path"]
    original_raw, after = bz2.decompress(original_path.read_bytes()), []

    class MemoryFrame:
        name = original_path.name
        def __init__(self, payload): self.payload = payload
        def __str__(self): return "<synthetic-boundary-memory-" + self.name + ">"
        def stat(self): return types.SimpleNamespace(st_size=len(self.payload))
        def read_bytes(self): return self.payload

    for case in before["results"]:
        if case["boundary"] == "celestial_reference_frame":
            with fits.open(io.BytesIO(original_raw), memmap=False) as hdus:
                for key, value in case["change"].items(): hdus[0].header[key] = value
                output = io.BytesIO(); hdus.writeto(output); payload = bz2.compress(output.getvalue())
            assert digest(payload) == case["newCompressedSha256"]
            path, expected = MemoryFrame(payload), {**original["identity"], "bytes": len(payload), "sha256": digest(payload), "sourceUrl": original["url"]}
            reason = "sdss_frame_reference_frame_unsupported"
        else:
            path, expected = original_path, {**original["identity"], "bytes": original["bytes"], "sha256": original["sha256"], "sourceUrl": case["sourceUrl"]}
            reason = "sdss_frame_source_url_identity_mismatch"
        try:
            reader.read_cached_frame(path, expected, max_uncompressed_bytes=32 * 1024 * 1024)
            raise AssertionError("before failure still accepted")
        except RuntimeError as error:
            assert str(error) == reason
            after.append({"boundary": case["boundary"], "syntheticInput": True, "change": case.get("change", case.get("sourceUrl")),
                          "before": case["before"], "afterRejected": str(error)})
    arrays = {key: np.load(directory / meta["file"], mmap_mode="r", allow_pickle=False) for key, meta in candidate["arrays"].items()}
    joint, rgb, alternative = arrays["joint-availability"], arrays["rgb-master"], arrays["display-contribution-master"]
    combined = np.logical_and.reduce([arrays[band + "-footprint"] & arrays[band + "-finite-neighbors"] for band in gri.BANDS])
    assert np.array_equal(combined, joint) and int(joint.sum()) == 2031591 and not joint.all() and np.all(rgb[~joint] == 0)
    assert np.array_equal(alternative[:, :, 3], rgb.max(axis=2) * joint.astype(np.uint8))
    encoded_back = np.rint(alternative[:, :, :3].astype(float) * alternative[:, :, 3:4] / 255).astype(np.uint8)
    assert np.array_equal(encoded_back, rgb)
    target = WCS(candidate["wcsHeader"])
    points = np.array([(x, y) for y in range(0, 2048, 181) for x in range(0, 2048, 181)] + [(1024, 1024), (2047, 2047), (484, 1654)])
    world = target.all_pix2world(points[:, 0], 2047 - points[:, 1], 0)
    samples = []
    for band in gri.BANDS:
        sx, sy = source_wcs[band].all_world2pix(*world, 0)
        inside = np.isfinite(sx) & np.isfinite(sy) & (sx >= 0) & (sy >= 0) & (sx < 2047) & (sy < 1488)
        expected = np.full(len(points), np.nan, dtype=np.float32)
        x0, y0 = np.floor(sx[inside]).astype(int), np.floor(sy[inside]).astype(int)
        dx, dy, data = sx[inside] - x0, sy[inside] - y0, source_data[band]
        expected[inside] = (data[y0, x0].astype(float) * (1-dx) * (1-dy) + data[y0, x0+1].astype(float) * dx * (1-dy) +
                            data[y0+1, x0].astype(float) * (1-dx) * dy + data[y0+1, x0+1].astype(float) * dx * dy).astype(np.float32)
        actual = arrays[band + "-science"][points[:, 1], points[:, 0]]
        assert np.array_equal(np.isfinite(expected), np.isfinite(actual)) and np.allclose(expected, actual, rtol=1e-5, atol=1e-6, equal_nan=True)
        assert np.array_equal(arrays[band + "-footprint"][points[:, 1], points[:, 0]], inside)
        samples.append({"band": band, "points": len(points), "inFootprint": int(inside.sum()),
                        "maxAbsoluteNanomaggyDifference": float(np.max(np.abs(expected[inside] - actual[inside])))})
    products = []
    for level, meta in candidate["levels"].items():
        start, _, end, _ = meta["masterCrop"]["boundsXYExclusive"]
        factor, availability = meta["masterCrop"]["boxFactor"], joint[start:end, start:end]
        ordinary = np.dstack([rgb[start:end, start:end], availability.astype(np.uint8) * 255])
        image, alt_image = np.asarray(Image.open(directory / meta["file"]).convert("RGBA")), np.asarray(Image.open(directory / meta["alternativeDisplay"]["file"]).convert("RGBA"))
        assert np.array_equal(boxes(ordinary, factor), image)
        assert np.array_equal(boxes(alternative[start:end, start:end], factor), alt_image)
        wcs, pixel = WCS(meta["wcsHeader"]), np.array([[0, 511], [255.5, 255.5], [511, 0], [182, 289]], dtype=float)
        actual_world = wcs.all_pix2world(pixel, 0)
        mx, my = start + factor * (pixel[:, 0] + .5) - .5, 2047 - (start + factor * ((511 - pixel[:, 1]) + .5) - .5)
        master_world = np.stack(target.all_pix2world(mx, my, 0), axis=1)
        error = float(np.max(np.abs(actual_world - master_world)))
        assert error < 1e-10
        products.append({"level": level, "fieldDegrees": meta["fieldDegrees"], "crop": meta["masterCrop"],
                         "jointAvailability": float(availability.mean()), "scienceCropFull": bool(availability.all()),
                         "allRgbaAndAlternativePixelsMatchIndependentBox": True, "cropWcsMaximumDegreeDifference": error,
                         "bytes": meta["bytes"], "alternativeBytes": meta["alternativeDisplay"]["bytes"]})
    star, star_results = stars["stars"][0], []
    for band in gri.BANDS:
        sx, sy = source_wcs[band].all_world2pix([[star["raDeg"], star["decDeg"]]], 0)[0]
        mx, my = star["masterImagePixelXYZeroBased"]
        actual, wrong = local(arrays[band + "-science"], mx, my), local(arrays[band + "-science"], mx, 2047-my)
        assert actual["positiveApertureSum"] > 0 and wrong["actualSamples"] == "UNAVAILABLE"
        star_results.append({"band": band, "sourceUnfittedLocalCentroid": local(source_data[band], sx, sy),
                             "masterUnfittedLocalCentroid": actual, "boundedRowFlipOmissionPrediction": [mx, 2047-my], "wrongRowActualScience": wrong})
    source_world = np.array([[item["raDeg"], item["decDeg"]] for item in stars["stars"]])
    counts = {}
    for band in gri.BANDS:
        pixels = source_wcs[band].all_world2pix(source_world, 0)
        sx, sy = pixels[:, 0], pixels[:, 1]
        counts[band] = int(((sx >= 0) & (sy >= 0) & (sx < 2047) & (sy < 1488)).sum())
    assert counts == stars["counts"]["sourceBandFourNeighbor"]
    assert stars["counts"]["levelAvailableDisplayPixels"] == {"OVERVIEW": 5, "MEDIUM": 0, "DETAIL": 0}
    small = np.array([[0., -2., 8.], [-2., -4., np.nan], [1., 3., 9.]], dtype=np.float32)
    values, geometric, finite = gri.bilinear_samples(small, np.array([0., .5, 1.5, 2.]), np.array([0., .5, .5, 1.]))
    assert np.array_equal(geometric, [True, True, True, False]) and np.array_equal(finite, [True, True, False, False])
    assert values[0] == 0 and values[1] == -2 and np.isnan(values[2:]).all()
    gpu_path = ROOT / "output/playwright/cloud-sky-sdss-corrected-candidate-1002-r1/result.json"
    gpu = load(gpu_path)
    for item in gpu["sourceHashes"]: assert digest((ROOT / item["path"]).read_bytes()) == item["sha256"]
    [verify(item) for item in gpu["inputs"]]
    artifacts = [verify(item) for item in gpu["artifacts"]]
    assert digest((ROOT / gpu["harness"]["path"]).read_bytes()) == gpu["harness"]["sha256"]
    assert all(item["glError"] == 0 and item["releasedLogicalBytes"] == 0 and item["releasedTextures"] == 0 and item["failures"] == [] for item in gpu["rows"])
    comparisons = []
    for item in gpu["comparisons"]:
        a = np.fromfile(gpu_path.parent / (item["name"] + ".rgba"), dtype=np.uint8).reshape(-1, 4)[:, :3].astype(np.int16)
        b = np.fromfile(gpu_path.parent / (item["baseline"] + ".rgba"), dtype=np.uint8).reshape(-1, 4)[:, :3].astype(np.int16)
        delta = a - b
        actual = {"name": item["name"], "changedPixels": int(np.any(delta != 0, axis=1).sum()), "darkenedPixels": int(np.any(delta < 0, axis=1).sum()), "maxDelta": int(np.max(np.abs(delta)))}
        assert all(actual[key] == item[key] for key in ("changedPixels", "darkenedPixels", "maxDelta"))
        comparisons.append(actual)
    output = {"scope": "Independent limited cached source, same-master and actual software GPU readback; no publication or native acceptance.",
              "reviewScript": bind(Path(__file__)), "readerBinding": bind(r2 / "binding.json"), "readerBindings": reader_bindings,
              "actualSourceFacts": facts, "sourceBeforeEvidence": bind(before_path), "sourceActualBeforeToAfter": after,
              "candidateBinding": bind(directory / "binding.json"), "candidateBindings": candidate_bindings,
              "old201AssetsBeforeAfterAndCurrentHashesMatch": True, "jointAvailablePixels": int(joint.sum()), "jointFraction": float(joint.mean()),
              "actualBilinearSamples": samples, "pyramidAllPixelsAndWorldReadback": products, "alternativeRoundedBlackReconstructionExact": True,
              "unfittedBrightStar": {"objID": star["objID"], "expectedMaster": star["masterImagePixelXYZeroBased"], "localChecks": star_results,
                  "scope": "Only one bright source star in this field; no offset fit, holdout, absolute, full polynomial or whole-field certification."},
              "starPredictionCounts": stars["counts"], "smallNeighborBoundary": {"geometric": geometric.tolist(), "finite": finite.tolist()},
              "gpuResult": bind(gpu_path), "gpuSourceHashCount": len(gpu["sourceHashes"]), "gpuArtifactHashCount": len(artifacts),
              "gpuRows": len(gpu["rows"]), "gpuAllGlAndReleaseZero": True, "gpuCounterfactualRecomputed": comparisons,
              "limitations": ["Single field only, overview48.44%/medium83.36%, missing companion and diagonal source edge.",
                  "Primary linear TAN only; full asTrans polynomial/DCR not applied.", "Default stretch5/Q8 darker/brownish, artifacts/colors/background/source quality not accepted.",
                  "All blend/alpha variants task-only and unadopted; contribution alpha is display encoding, not radiance or a science mask.",
                  "v1 BFF/loader/source UI bypassed, suppressed-pass scene marker does not prove actual optical contribution.",
                  "No native journey, resident/GPU/OS peak, capacity/cost or current phone acceptance."]}
    path = TASK / "evidence/experience-sdss-gri-tan-independent-checks-2026-10-02.json"
    with path.open("x", encoding="utf-8") as stream:
        json.dump(output, stream, ensure_ascii=False, indent=2, allow_nan=False); stream.write("\n")
    print(json.dumps({"artifact": str(path.relative_to(ROOT)), "sha256": digest(path.read_bytes()), "readerBeforeAfter": len(after),
                      "candidateBindings": len(candidate_bindings), "pyramidWholePixels": len(products) * 2,
                      "sourceSamples": samples, "gpuSourceHashes": len(gpu["sourceHashes"]), "gpuArtifacts": len(artifacts)}))


if __name__ == "__main__":
    main()
