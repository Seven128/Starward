"""Bound frozen-before/current cached-master admission counterexample; no real-source projection."""
from dataclasses import replace
import importlib.util
from pathlib import Path
import sys
import traceback
import types

ROOT = Path(__file__).resolve().parents[4]
DRIVER = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-prepared-rgb-tan-2026-10-03.py"
spec = importlib.util.spec_from_file_location("prepared_tan_generation_driver", DRIVER)
driver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(driver)
import numpy as np
import prepared_rgb_tan as current
from test_prepared_rgb_tan import PreparedTanTest


def main():
    output = ROOT / "output/prepared-rgb-tan-cache-guard-1003-r1"
    if output.exists():
        raise RuntimeError("exclusive_output_required")
    output.mkdir()
    old_path = ROOT / "output/prepared-rgb-tan-generation-1003-r1/executed-owners/data-pipelines/deep-sky/prepared_rgb_tan.py"
    if driver.bind(old_path)["sha256"] != "c29a0b5a46de3fdbf8ec918ccfd6cfd6c52e261959f56e37d9991d2abb3943d7":
        raise RuntimeError("frozen_before_owner_changed")
    local = driver.graph([driver.PIPELINE / "prepared_rgb_tan.py", driver.PIPELINE / "test_prepared_rgb_tan.py"])
    # Exact same package/runtime inventory frozen by current cached-master execution.
    cached_before = driver.json.loads((ROOT / "output/prepared-rgb-tan-cached-validation-1003-r1/inputs-before.json").read_bytes())
    paths = {Path(row["path"]) if Path(row["path"]).is_absolute() else ROOT / row["path"]
             for row in cached_before["files"]}
    paths.update([Path(__file__), DRIVER, old_path, Path(sys.executable), *local])
    before = [driver.bind(path) for path in sorted(paths)]
    driver.save(output / "inputs-before.json", before)
    (output / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    (output / "frozen-before-owner.py").write_bytes(old_path.read_bytes())
    for path in local:
        destination = output / "executed-owners" / path.relative_to(ROOT)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(path.read_bytes())
    old = types.ModuleType("frozen_before_prepared_rgb_tan")
    sys.modules[old.__name__] = old
    exec(compile(old_path.read_bytes(), str(old_path), "exec"), old.__dict__)
    fixture = PreparedTanTest()
    fixture.setUp()
    try:
        # Only the existing eight-pixel admitted fixture is projected, once.
        master = fixture.build(fixture.observation(black=True))
        changed_alpha = master.rgba_top_first.copy(); changed_alpha[2, 2, 3] = 128
        hidden_colour = master.rgba_top_first.copy(); hidden_colour[0, 0, :3] = [220, 100, 20]
        malformed = [
            ("nonbinary-master-alpha", replace(master, rgba_bytes=changed_alpha.tobytes())),
            ("unsupported-hidden-colour", replace(master, rgba_bytes=hidden_colour.tobytes())),
            ("support-count-mismatch", replace(master, geometric_support_pixels=35)),
            ("supported-black-count-mismatch", replace(master, supported_black_pixels=35)),
        ]
        rows = []
        for name, forged in malformed:
            prior_master = old.PreparedRgbTanMaster(**forged.__dict__)
            prior_products = old.prepared_rgb_tan_products(prior_master, output_pixels=2)
            rejection = None
            try:
                current.prepared_rgb_tan_products(forged, output_pixels=2)
            except RuntimeError as error:
                rejection = str(error)
            assert rejection and "master_geometry" in rejection, name
            rows.append({"case": name, "frozenBeforeAcceptedLevels": [p.level for p in prior_products],
                         "currentRejected": rejection})
        old_good = old.prepared_rgb_tan_products(old.PreparedRgbTanMaster(**master.__dict__), output_pixels=2)
        good = current.prepared_rgb_tan_products(master, output_pixels=2)
        assert all(a.rgba_bytes == b.rgba_bytes and a.png_bytes == b.png_bytes for a, b in zip(old_good, good))
        assert np.all(good[-1].rgba_top_first[:, :, 3] == 255)
        assert np.all(good[-1].rgba_top_first[:, :, :3] == 0)
        after = [driver.bind(path) for path in sorted(paths)]
        driver.save(output / "inputs-after.json", after)
        assert before == after
        driver.save(output / "result.json", {"status": "PASSED_BOUNDED_CACHE_GUARD_COUNTEREXAMPLE",
            "frozenBefore": driver.bind(old_path), "current": driver.bind(current.__file__),
            "python": driver.bind(sys.executable), "rows": rows, "validBlackProductsByteExact": True,
            "boundFiles": len(before), "bindingsPrePostExact": before == after,
            "realSourceDecodesAndMasterReprojections": 0,
            "scope": "One existing 8x8 fixture master; public products rejects malformed cached geometric master. No scientific-quality or source-registration inference."})
        print(driver.json.dumps({"status": "PASSED_BOUNDED_CACHE_GUARD_COUNTEREXAMPLE", "cases": len(rows), "bindings": len(before)}))
    finally:
        fixture.doCleanups()


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        traceback.print_exc()
        raise
