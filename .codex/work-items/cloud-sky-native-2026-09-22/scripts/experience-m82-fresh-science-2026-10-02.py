"""One offline DETAIL science generation through the shared sampler, no M82 image."""
from __future__ import annotations
import copy
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
sys.path[:0] = [str(ROOT / "data-pipelines/deep-sky"), str(ROOT / "output/allwise-w3-atlas-0929/python-deps")]
import numpy as np
import allwise_finite_tan as owner

OUT = ROOT / "output/allwise-w3-m82-fresh-science-1002-r2"
BASE = ROOT / "output/allwise-w3-m82-source-0930"
ACQ = ROOT / "output/allwise-w3-m82-detail-acquisition-1002-r1"
M42 = ROOT / "output/allwise-w3-hips-0929/candidate-axes-corrected"
ASSETS = ROOT / "workers/miniapp-api/assets/deep-sky"


def binding(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def inventory(directory):
    return [binding(path) for path in sorted(directory.rglob("*")) if path.is_file()]


def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def main():
    started = time.perf_counter()
    OUT.mkdir(exist_ok=False)
    (OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    source_paths = [ROOT / "data-pipelines/deep-sky" / name for name in
                    ("allwise_finite_tan.py", "test_publish_allwise_w3.py", "image_quality.py", "hips_tan_lookup.mjs")]
    source_before = [binding(path) for path in source_paths]
    preserved = json.loads((TASK / "tmp/resume-preserved-hashes-2026-10-01.json").read_text(encoding="utf-8"))
    preserved_before = [binding(ROOT / record["path"]) for record in preserved]
    assert all(actual["sha256"] == expected["sha256"] for actual, expected in zip(preserved_before, preserved))
    old_assets_before = inventory(ASSETS)
    old_assets_reference = json.loads((ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/binding.json").read_text(encoding="utf-8"))["oldAssetsAfter"]
    assert old_assets_before == old_assets_reference
    old_m82_before = inventory(BASE)
    old_acq_before = inventory(ACQ)
    old_m42_before = inventory(M42)
    acquisition = json.loads((ACQ / "acquisition.json").read_text(encoding="utf-8"))
    plan = json.loads((BASE / "candidate-detail/candidate-plan.json").read_text(encoding="utf-8"))
    manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
    entry = next(item for item in manifest["entries"] if item["objectRef"] == plan["objectRef"])
    locations = {record["path"]: record["raw"]["path"] for record in acquisition["sourceFiles"]}
    inputs = [binding(BASE / "candidate-detail/candidate-plan.json"), binding(BASE / "properties"),
              binding(ACQ / "acquisition.json"), binding(ACQ / "binding.json"),
              *[binding(ROOT / path) for path in locations.values()],
              binding(M42 / "candidate-plan.json"), binding(M42 / "candidate-result.json"),
              binding(M42.parent / "properties")]
    (OUT / "source-snapshots").mkdir()
    for path in source_paths:
        (OUT / "source-snapshots" / path.name).write_bytes(path.read_bytes())
    args = {"source_directory": ROOT, "source_files": acquisition["sourceFiles"],
            "source_count": acquisition["checkedSourceCount"], "properties": (BASE / "properties").read_bytes(),
            "properties_sha256": acquisition["sourcePropertiesSha256"], "source_paths": locations}
    sampled = owner.sample_cached_tan(plan, entry, **args)
    assert set(sampled) == {"DETAIL"}
    result = sampled["DETAIL"]
    assert result.intensity.dtype == np.float32 and result.finite.dtype == np.bool_
    assert np.array_equal(result.finite, np.isfinite(result.intensity))
    np.save(OUT / "detail-science.npy", result.intensity, allow_pickle=False)
    np.save(OUT / "detail-availability.npy", result.finite, allow_pickle=False)
    metadata = {**result.metadata, "intensityUnit": "UNKNOWN_NO_BUNIT_IN_CACHED_PRIMARY_HEADER",
                "availabilityMeaning": "All required source arrays admitted; true iff selected actual scalar is finite. Not detector-artifact or scientific-quality acceptance.",
                "science": binding(OUT / "detail-science.npy"), "availability": binding(OUT / "detail-availability.npy"),
                "physicalSources": [binding(ROOT / path) for path in locations.values()],
                "finitePixels": int(result.finite.sum()), "nonfinitePixels": int((~result.finite).sum()),
                "finiteZeroPixels": int((result.finite & (result.intensity == 0)).sum()),
                "finiteNegativePixels": int((result.finite & (result.intensity < 0)).sum()),
                "finitePercentiles": [float(value) for value in np.percentile(result.intensity[result.finite], [0, 1, 50, 99, 100])],
                "limits": ["Infrared W3 primary samples; not natural optical color.",
                           "No stretch, PNG, old JPEG mask, dark-region classification, publication or native quality acceptance.",
                           "Prior historical incomplete receipts remain unchanged; other nine OVERVIEW/MEDIUM inputs remain unavailable."]}
    write("detail-metadata.json", metadata)
    # The actual old consumer now obtains science from this same owner and keeps
    # its frozen expected PNG hashes, encoded-mask checks, quality and old offers.
    m42_entry = next(item for item in manifest["entries"] if item["objectRef"] == "M:42")
    quality = []
    reconstructed = owner.render_cached_candidate(M42, m42_entry, quality)
    compatibility = []
    for level, (payload, item) in reconstructed.items():
        current = m42_entry["levels"][level]
        assert payload == (ASSETS / current["file"]).read_bytes()
        assert item["sha256"] == current["sha256"]
        assert item["sourceFiniteMask"] == current["sourceFiniteMask"]
        compatibility.append({"level": level, "bytes": len(payload), "sha256": owner.sha256(payload),
                              "publishedByteIdentical": True, "sourceFiniteMask": item["sourceFiniteMask"]})
    write("m42-compatibility.json", {"levels": compatibility, "quality": quality})
    # Bounded admission mutation: physical valid FITS is insufficient when its
    # supplied completeness receipt says false. Removing only the common gate
    # must change that rejection into an output, demonstrating the guard's effect.
    bad = copy.deepcopy(args)
    bad["source_files"][0]["receipt"]["completeArrayReceived"] = False
    try:
        owner.sample_cached_tan(plan, entry, **bad)
    except RuntimeError as error:
        rejection = str(error)
    else:
        raise AssertionError("incomplete receipt was admitted")
    assert rejection == "image_quality_source_input_unavailable"
    gate = owner.checked_source_files
    try:
        owner.checked_source_files = lambda *arguments: []
        mutated = owner.sample_cached_tan(plan, entry, **bad)["DETAIL"]
        assert np.array_equal(mutated.intensity, result.intensity, equal_nan=True)
        assert np.array_equal(mutated.finite, result.finite)
    finally:
        owner.checked_source_files = gate
    write("admission-mutation.json", {"mutation": "Bypass only the shared checked_source_files call; production files untouched",
                                     "normalRejection": rejection, "mutantAdmittedScienceDespiteFalseReceipt": True,
                                     "mutantPixelsEqualValidInputs": True})
    tests = subprocess.run([sys.executable, "-m", "unittest", "test_publish_allwise_w3", "test_image_quality"],
                           cwd=ROOT / "data-pipelines/deep-sky", capture_output=True, text=True, timeout=30,
                           env={**os.environ, "PYTHONPATH": str(ROOT / "output/allwise-w3-atlas-0929/python-deps")})
    (OUT / "tests.txt").write_text(tests.stdout + tests.stderr, encoding="utf-8")
    assert tests.returncode == 0
    source_after = [binding(path) for path in source_paths]
    old_assets_after = inventory(ASSETS)
    assert source_before == source_after and old_assets_before == old_assets_after
    assert old_m82_before == inventory(BASE) and old_acq_before == inventory(ACQ) and old_m42_before == inventory(M42)
    assert preserved_before == [binding(ROOT / record["path"]) for record in preserved]
    report = {"scope": "One offline M82 DETAIL scientific array through shared production sampler; no image/adoption or target acceptance",
              "script": binding(Path(__file__)), "sourceFilesBefore": source_before, "sourceFilesAfter": source_after,
              "inputs": inputs, "detail": metadata, "m42PublishedByteCompatibility": compatibility,
              "oldM82InputsUnchanged": True, "acquisitionGenerationUnchanged": True, "oldM42CandidateUnchanged": True,
              "oldAssetsBefore": old_assets_before, "oldAssetsAfter": old_assets_after,
              "preservedBefore": preserved_before, "preservedAfter": preserved_before,
              "testExitCode": tests.returncode, "admissionMutationDetected": True,
              "elapsedSeconds": time.perf_counter() - started}
    write("result.json", report)
    write("binding.json", {"script": binding(Path(__file__)), "sourceFiles": source_after,
                           "outputs": inventory(OUT), "inputs": inputs})
    print(json.dumps({"result": binding(OUT / "result.json"), "binding": binding(OUT / "binding.json"),
                      "finitePixels": metadata["finitePixels"], "nonfinitePixels": metadata["nonfinitePixels"]}))


if __name__ == "__main__":
    main()
