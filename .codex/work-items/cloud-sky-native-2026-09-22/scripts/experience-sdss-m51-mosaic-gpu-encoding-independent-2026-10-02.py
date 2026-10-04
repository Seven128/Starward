"""Read-only independent reuse/GPU pixels and existing encoding trial checks."""
from pathlib import Path
import argparse
import hashlib
import json
import sys
ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / "output/allwise-w3-atlas-0929/python-deps")]
import numpy as np
from PIL import Image


def binding(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def check_record(record):
    actual = binding(ROOT / record["path"])
    assert actual["sha256"] == record["sha256"]
    if "bytes" in record:
        assert actual["bytes"] == record["bytes"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise RuntimeError("preserve_previous_independent_generation")
    args.output.mkdir(parents=True)
    script_before = binding(Path(__file__))
    gpu_dir = ROOT / "output/playwright/cloud-sky-sdss-mosaic-candidate-1002-r2"
    gpu_path = gpu_dir / "result.json"
    gpu = json.loads(gpu_path.read_bytes())
    old_path = Path(gpu["reusedBackground"]["path"])
    check_record(gpu["reusedBackground"])
    old = json.loads(old_path.read_bytes())
    assert gpu["productionBundleSha256"] == old["productionBundleSha256"] == binding(gpu_dir / "production.js")["sha256"]
    assert gpu["sourceHashes"] == old["sourceHashes"]
    for record in gpu["sourceHashes"] + gpu["inputs"] + gpu["artifacts"] + gpu["reusedArtifacts"]:
        check_record(record)
    check_record(gpu["harness"])
    previous_rows = {row["name"]: row for row in old["rows"]}
    rows = {row["name"]: row for row in gpu["rows"]}
    reused, drawn, pixel_errors = 0, 0, {}
    for name, row in rows.items():
        assert row["glError"] == row["releasedLogicalBytes"] == row["releasedTextures"] == 0
        assert row["failures"] == [] and row["pick"] == ["M:51"]
        directory = gpu_dir if row["renderedInThisGeneration"] else old_path.parent
        if row["renderedInThisGeneration"]:
            drawn += 1
        else:
            reused += 1
            old_row = previous_rows[name]
            assert all(row[key] == value for key, value in old_row.items()), "reused actual scene record changed"
            assert row["variant"]["name"] in ("baseline", "legacy")
        rgba_path, png_path = directory / (name + ".rgba"), directory / (name + ".png")
        assert binding(rgba_path)["sha256"] == row["rgbaSha256"]
        assert binding(png_path)["sha256"] == row["pngSha256"]
        rgba = np.frombuffer(rgba_path.read_bytes(), dtype=np.uint8).reshape(844, 390, 4)
        pixels = np.array(Image.open(png_path).convert("RGBA"))
        error = int(np.max(np.abs(pixels.astype(np.int16) - rgba[::-1].astype(np.int16))))
        assert error == 0, "PNG is not a lossless top-row-first view of actual GPU RGBA"
        pixel_errors[name] = error
        if row["mode"] == "OBSERVATION":
            assert row["uploads"] == [] and row["draws"] == [] and row["sceneReportedPaintedImage"] is None
        if row["variant"].get("suppress"):
            assert row["uploads"] == [] and all(draw["suppressed"] for draw in row["draws"])
    assert drawn == 28 and reused == 18 and len(gpu["artifacts"]) == 56 and len(gpu["reusedArtifacts"]) == 36
    for comparison in gpu["comparisons"]:
        def raw(name):
            row = rows[name]
            directory = gpu_dir if row["renderedInThisGeneration"] else old_path.parent
            return np.frombuffer((directory / (name + ".rgba")).read_bytes(), dtype=np.uint8).reshape(-1, 4)[:, :3].astype(np.int16)
        difference = raw(comparison["name"]) - raw(comparison["baseline"])
        assert int(np.any(difference != 0, axis=1).sum()) == comparison["changedPixels"]
        assert int(np.any(difference < 0, axis=1).sum()) == comparison["darkenedPixels"]
        assert int(np.abs(difference).max()) == comparison["maxDelta"]
    encoding_path = ROOT / "output/sdss-m51-encoding-trial-1002-r3/encoding.json"
    encoding = json.loads(encoding_path.read_bytes())
    check_record(encoding["candidate"])
    check_record(encoding["script"])
    encoding_rows = []
    for row in encoding["rows"]:
        check_record(row["input"])
        check_record(row["encoded"])
        before = np.array(Image.open(ROOT / row["input"]["path"]).convert("RGBA"))
        after = np.array(Image.open(ROOT / row["encoded"]["path"]).convert("RGBA"))
        assert before.shape == after.shape == (512, 512, 4)
        difference = after.astype(np.int16) - before.astype(np.int16)
        premult = after[:, :, :3].astype(np.float64) * after[:, :, 3:4] / 255 - before[:, :, :3].astype(np.float64) * before[:, :, 3:4] / 255
        assert int(np.any(difference != 0, axis=2).sum()) == row["changedRgbaPixels"]
        assert int(np.abs(difference).max()) == row["maxChannelByteDifference"]
        assert int(np.abs(difference[:, :, 3]).max()) == row["maxAlphaByteDifference"]
        assert float(np.abs(difference).mean()) == row["meanAbsoluteChannelByteDifference"]
        assert float(np.abs(premult).max()) == row["maxPremultipliedDisplayByteDifference"]
        assert float(np.abs(premult).mean()) == row["meanAbsolutePremultipliedDisplayByteDifference"]
        assert bool(np.array_equal(before, after)) == row["losslessRgbaReadback"]
        if row["variant"].startswith("opaque-"):
            assert (before[:, :, 3] == 255).all(), "opaque encoding removed actual transparency"
        encoding_rows.append({"family": row["family"], "level": row["level"], "variant": row["variant"],
                              "bytes": row["encoded"]["bytes"], "losslessRgba": row["losslessRgbaReadback"],
                              "maxRgbaByteDifference": row["maxChannelByteDifference"], "maxAlphaByteDifference": row["maxAlphaByteDifference"]})
    assert len(encoding_rows) == 18
    # Preserve the exact earlier main-check executable before the narrow weight
    # helper was appended. Recovery is accepted only by its recorded actual SHA.
    main_path = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-m51-mosaic-independent-2026-10-02.py"
    main_text = main_path.read_text(encoding="utf-8")
    start, end = main_text.index("def independent_weight_formula_checks("), main_text.index("def main():")
    previous_main_text = (main_text[:start] + main_text[end:]).replace("    weight_formula = independent_weight_formula_checks(candidate, directory)\n", "").replace("              \"independentActualGeometryWeightFormula\": weight_formula,\n", "")
    main_review_path = ROOT / "output/sdss-m51-mosaic-independent-1002-r1/review.json"
    main_review = json.loads(main_review_path.read_bytes())
    recovered = previous_main_text.encode("utf-8")
    assert hashlib.sha256(recovered).hexdigest() == main_review["script"]["sha256"]
    with (args.output / "main-reviewed-script.py.txt").open("xb") as snapshot:
        snapshot.write(recovered)
    if script_before != binding(Path(__file__)):
        raise RuntimeError("review_script_changed_during_run")
    report = {"version": "sdss-m51-gpu-and-encoding-independent-v1", "script": script_before,
              "mainReview": binding(main_review_path), "mainReviewScriptSnapshot": binding(args.output / "main-reviewed-script.py.txt"),
              "gpuResult": binding(gpu_path), "encodingResult": binding(encoding_path),
              "actualRendererSourcesChecked": len(gpu["sourceHashes"]), "newDrawnScenes": drawn,
              "reusedByteBoundScenes": reused, "pngActualRgbaMaximumDifference": max(pixel_errors.values()),
              "actualSourcePick": "M:51", "observationOpticalSuppressed": True,
              "baselineReportedPaintedMarkerMeaning": "Counterfactual suppression still returns true; marker is not actual optical credit",
              "encodingRows": encoding_rows,
              "scope": "Static softwareGPU output/reuse and actual existing encode/decode readback only. No new parameter matrix, renderer edit, scientific/native/whole-client/quality/capacity acceptance or adoption"}
    with (args.output / "review.json").open("x", encoding="utf-8") as output:
        json.dump(report, output, indent=2)
        output.write("\n")
    print(json.dumps({"review": str(args.output / "review.json"), "newDrawn": drawn, "reused": reused,
                      "pngRgbaError": max(pixel_errors.values()), "encodingRows": len(encoding_rows)}))


if __name__ == "__main__":
    main()
