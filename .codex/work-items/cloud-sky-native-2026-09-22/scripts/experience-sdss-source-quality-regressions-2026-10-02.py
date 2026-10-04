"""Frozen owner checks and bounded in-memory mutants; no input/source edits."""
from pathlib import Path
import hashlib
import importlib.util
import io
import json
import sys
import time
import types
import unittest

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
OUTPUT = ROOT / "output/sdss-source-quality-regressions-1002-r1"
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
sys.path.insert(0, str(ROOT / "data-pipelines/deep-sky"))
import sdss_frame_quality as owner
import test_sdss_frame_quality as tests


def bind(path):
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, allow_nan=False, indent=2) + "\n", encoding="utf-8")


def inventory(directory):
    return [bind(path) for path in sorted(directory.rglob("*")) if path.is_file()]


def run_suite(suite):
    stream = io.StringIO()
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
    return {"testsRun": result.testsRun, "failures": len(result.failures), "errors": len(result.errors),
            "skipped": len(result.skipped), "successful": result.wasSuccessful(), "log": stream.getvalue()}


def main():
    OUTPUT.mkdir(exist_ok=False)
    started = time.monotonic()
    sources = [ROOT / "data-pipelines/deep-sky" / name for name in
               ("sdss_frame_quality.py", "test_sdss_frame_quality.py", "sdss_source_stencil.py",
                "sdss_corrected_frame.py", "sdss_gri_tan.py")]
    source_before = [bind(path) for path in sources]
    assets = json.loads((ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/binding.json").read_text())["oldAssetsBefore"]
    retained = json.loads((TASK / "tmp/resume-preserved-hashes-2026-10-01.json").read_text())
    asset_before = [bind(ROOT / item["path"]) for item in assets]
    retained_before = [bind(ROOT / item["path"]) for item in retained]
    assert asset_before == assets
    assert all(item["sha256"] == old["sha256"] for item, old in zip(retained_before, retained))
    acquisition_before = inventory(ROOT / "output/sdss-m51-core-quality-inputs-1002-r1")
    raw_source = sources[0].read_text(encoding="utf-8")
    (OUTPUT / "owner.py").write_text(raw_source, encoding="utf-8")
    (OUTPUT / "tests.py").write_bytes(sources[1].read_bytes())
    (OUTPUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    baseline = run_suite(unittest.defaultTestLoader.loadTestsFromModule(tests))
    save(OUTPUT / "baseline.json", baseline)
    assert baseline["successful"] and baseline["testsRun"] == 11 and baseline["skipped"] == 0

    dynamic = "test_dynamic_fourth_basis_per_row_orders_axes_half_pixel_and_signed_kernel"
    mutations = [
        ("omit-photo-half-pixel", "(float(y) + .5) * .001, (float(x) + .5) * .001", "float(y) * .001, float(x) * .001", dynamic),
        ("transpose-wire-coefficients", "basis.coefficients[k, i, j]", "basis.coefficients[k, j, i]", dynamic),
        ("drop-fourth-basis", "range(basis.images.shape[0])", "range(min(3, basis.images.shape[0]))", dynamic),
        ("first-basis-orders-for-all", "int(basis.row_orders[k])", "int(basis.row_orders[0])", dynamic),
        ("omit-span-inclusive-end", "int(a):int(b) + 1]", "int(a):int(b)]", "test_actual_big_endian_span_endpoint_is_inclusive_and_objects_union"),
        ("omit-object-canonical-guard", "if np.any(yy[1:] < yy[:-1]) or np.any((yy[1:] == yy[:-1]) & (left[1:] <= right[:-1] + 1)):", "if False:",
         "test_duplicate_or_overlap_with_self_consistent_bbox_and_sum_npix_is_rejected"),
        ("omit-heap-alias-budget", "if variable_payload_bytes > limit:", "if False:", "test_aliased_valid_heap_bounds_cannot_expand_past_admission_budget"),
        ("omit-fourth-flag-neighbour", "self.flags[yy + 1, xx] | self.flags[yy + 1, xx + 1]", "self.flags[yy + 1, xx]",
         "test_flag_stencil_uses_shared_four_neighbours_without_science_availability"),
    ]
    controls = []
    for index, (name, old, new, method) in enumerate(mutations):
        assert raw_source.count(old) == 1, (name, raw_source.count(old))
        changed = raw_source.replace(old, new, 1)
        module_name = f"sdss_quality_bounded_mutant_{index}"
        module = types.ModuleType(module_name)
        sys.modules[module_name] = module
        exec(compile(changed, module_name, "exec"), module.__dict__)
        tests.reader = module
        result = run_suite(unittest.defaultTestLoader.loadTestsFromName("ActualQualityTest." + method, tests))
        tests.reader = owner
        assert not result["successful"] and result["testsRun"] == 1, (name, result)
        record = {"mutation": name, "sourceSha256": hashlib.sha256(changed.encode()).hexdigest(),
                  "selectedRegression": method, "rejectedByRegression": True, "result": result}
        save(OUTPUT / (name + ".json"), record)
        controls.append(record)
    source_after = [bind(path) for path in sources]
    asset_after = [bind(ROOT / item["path"]) for item in assets]
    retained_after = [bind(ROOT / item["path"]) for item in retained]
    acquisition_after = inventory(ROOT / "output/sdss-m51-core-quality-inputs-1002-r1")
    assert source_before == source_after and asset_before == asset_after and retained_before == retained_after
    assert acquisition_before == acquisition_after
    result = {"scope": "Author owner regression and bounded mutation evidence, not independent review or source-quality adoption",
              "script": bind(Path(__file__)), "sourceBefore": source_before, "sourceAfter": source_after,
              "baseline": baseline, "boundedMutations": controls, "oldAssetsBefore": asset_before, "oldAssetsAfter": asset_after,
              "sixPreservedBefore": retained_before, "sixPreservedAfter": retained_after,
              "oldAcquisitionBefore": acquisition_before, "oldAcquisitionAfter": acquisition_after,
              "downloads": 0, "scienceMaskWeightOrPublicationChanges": False, "elapsedSeconds": time.monotonic() - started}
    save(OUTPUT / "result.json", result)
    save(OUTPUT / "binding.json", {"result": bind(OUTPUT / "result.json"),
                                  "artifactsBeforeBinding": inventory(OUTPUT), "sourceBefore": source_before, "sourceAfter": source_after})
    print(json.dumps({"result": bind(OUTPUT / "result.json"), "binding": bind(OUTPUT / "binding.json"),
                      "baselinePass": True, "boundedMutationsRejected": len(controls), "old201AssetsUnchanged": True,
                      "sixPreservedUnchanged": True, "oldAcquisitionUnchanged": True}))


if __name__ == "__main__":
    main()
