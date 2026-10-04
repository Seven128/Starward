"""One pinned cached prepared-image packaging path and recovery controls."""
from __future__ import annotations
from dataclasses import replace
import hashlib
import json
from pathlib import Path
import sys
import traceback

ROOT = Path(__file__).resolve().parents[4]
PIPELINE = ROOT / "data-pipelines/deep-sky"
sys.path[:0] = [str(PIPELINE), str(ROOT / "output/pyavm-metadata-trial-1002-r1/lib"),
               str(ROOT / "output/allwise-w3-atlas-0929/python-deps")]
import publish_prepared_optical as owner


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def save(path, value):
    with Path(path).open("x", encoding="utf8") as file:
        json.dump(value, file, ensure_ascii=False, allow_nan=False, indent=2); file.write("\n")


def main():
    output = Path(sys.argv[1]).resolve()
    if not output.is_relative_to(ROOT / "output"):
        raise RuntimeError("output_not_task_artifact")
    output.mkdir(parents=True, exist_ok=False)
    (output / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    directory = ROOT / "output/prepared-rgb-tan-cached-validation-1003-r1"
    pin = "794924fa3d190c8b9c6cc6d43084430f77878c245b6c37638daeb8dcd0f49021"
    before_pin, after_pin = digest(directory / "inputs-before.json"), digest(directory / "inputs-after.json")
    six = json.loads((ROOT / ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    if any(digest(ROOT / row["path"]) != row["sha256"] for row in six):
        raise RuntimeError("preserved_input_changed")
    sources = [Path(__file__), PIPELINE / "publish_prepared_optical.py", PIPELINE / "prepared_rgb_tan.py",
               PIPELINE / "prepared_rgb_observation.py", PIPELINE / "sdss_gri_tan.py", PIPELINE / "sdss_source_stencil.py",
               PIPELINE / "pack_prepared_optical_publication.mts",
               ROOT / "packages/miniapp-contracts/src/prepared-optical-publication.ts",
               ROOT / "packages/miniapp-contracts/src/prepared-optical-publication.test.ts",
               ROOT / "packages/miniapp-contracts/src/optical-publication-content.ts",
               ROOT / "packages/miniapp-contracts/src/sdss-optical-publication.ts",
               ROOT / "packages/miniapp-contracts/src/sdss-science-optical-publication.ts",
               ROOT / "packages/miniapp-contracts/package.json", ROOT / "tools/run-node.cjs", Path(sys.executable)]
    before = [owner.bound_file(path, root=ROOT) for path in sources]
    save(output / "owners-before.json", before)
    for path in sources:
        if path.is_relative_to(ROOT):
            target = output / "executed-owners" / path.relative_to(ROOT)
            target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(path.read_bytes())
    try:
        empty = next(row for row in json.loads((directory / "inputs-before.json").read_bytes())["files"] if row["bytes"] == 0)
        assert owner.bound_file(ROOT / empty["path"], root=ROOT, expected=empty) == empty
        try:
            owner.bound_file(ROOT / empty["path"], root=ROOT, expected=empty | {"sha256": "0" * 64})
        except RuntimeError as error:
            assert str(error) == "prepared_optical_input_changed"
        else:
            raise AssertionError("wrong empty dependency digest accepted")
        try:
            owner.verify_cached_prepared_generation(directory, root=ROOT, result_sha256="0" * 64,
                                                   before_sha256=before_pin, after_sha256=after_pin)
        except RuntimeError as error:
            assert str(error) == "prepared_optical_receipt_pin_invalid"
        else:
            raise AssertionError("wrong cached receipt pin accepted")
        verified = owner.verify_cached_prepared_generation(directory, root=ROOT, result_sha256=pin,
                                                           before_sha256=before_pin, after_sha256=after_pin)
        exposed = verified.receipt; exposed["source"]["credit"] = "changed"
        assert verified.receipt["source"]["credit"] != "changed"
        exposed = verified.bindings[0]; exposed["sha256"] = "0" * 64
        assert verified.bindings[0]["sha256"] == pin
        bad = replace(verified, master=replace(verified.master, object_ref="../escaped"))
        try:
            owner.publish_verified_prepared_generation(bad, output / "rejected-reference", root=ROOT,
                                                       publication_id="rejected-reference-control")
        except RuntimeError as error:
            assert str(error).startswith("prepared_optical_shared_packaging_rejected:")
        else:
            raise AssertionError("unsafe source reference accepted")
        assert not list(output.glob("escaped*.png")) and not list((output / "rejected-reference").glob("*.png"))
        assert json.loads((output / "rejected-reference/failed.json").read_bytes())["status"] == "OFFLINE_PREPARED_WRITER_FAILED"
        published = owner.publish_verified_prepared_generation(verified, output / "publication", root=ROOT,
                                                                publication_id="esa-hubble-heic0506a-m51.v20261003")
        try:
            owner.publish_verified_prepared_generation(verified, output / "publication", root=ROOT,
                                                       publication_id="replacement-forbidden")
        except FileExistsError:
            pass
        else:
            raise AssertionError("existing generation overwritten")
        try:
            owner.publish_verified_prepared_generation(verified, directory / "forbidden-child", root=ROOT,
                                                       publication_id="input-overlap-forbidden")
        except RuntimeError as error:
            assert str(error) == "prepared_optical_output_overlaps_preserved_input"
        else:
            raise AssertionError("preserved input overlap accepted")
        assert not (directory / "forbidden-child").exists()
        manifest = json.loads((output / "publication/manifest.json").read_bytes())
        for level, asset in manifest["levels"].items():
            path = output / "publication" / asset["file"]
            original = ROOT / verified.receipt["levels"][level]["file"]["path"]
            assert path.read_bytes() == original.read_bytes()
        after = [owner.bound_file(path, root=ROOT) for path in sources]
        if before != after or any(digest(ROOT / row["path"]) != row["sha256"] for row in six):
            raise RuntimeError("owner_or_preserved_input_changed")
        save(output / "owners-after.json", after)
        result = {"status": "PASSED_BOUNDED_PREPARED_PUBLICATION_PATH", "publicationHash": published["publicationHash"],
                  "manifest": owner.bound_file(output / "publication/manifest.json", root=ROOT),
                  "writerReceipt": owner.bound_file(output / "publication/writer-receipt.json", root=ROOT),
                  "cachedReceipt": verified.receipt_identity, "cachedInputRows": len(verified.bindings),
                  "masterReprojections": 0, "sourceDecodes": 0, "networkRequests": 0,
                  "controls": ["empty dependency bytes preserved and wrong digest rejected", "wrong upstream pin rejected", "fresh receipt/binding views cannot mutate verified ownership",
                      "unsafe reference rejected before image writes with preserved failed generation", "existing output refused",
                      "input overlap rejected before write", "all three immutable published PNG bytes exact"],
                  "levelPngBytes": sum(asset["bytes"] for asset in manifest["levels"].values()),
                  "sixPreserved": six, "implementationBeforeAfterExact": True, "qualityAdopted": False, "runtimeRegistered": False,
                  "limits": ["Prepared encoded RGB and binary geometric area-alpha are not calibrated gri or scientific masks.",
                      "Approximate AVM/5arcsec warning, source colour and rectangular boundaries retained.",
                      "No default/service/scene/visible-attribution/target-native or final quality acceptance."]}
        save(output / "result.json", result)
        print(json.dumps({"result": owner.bound_file(output / "result.json", root=ROOT), "status": result["status"],
                          "publicationHash": result["publicationHash"], "levelPngBytes": result["levelPngBytes"]}), flush=True)
    except Exception as error:
        (output / "error.log").write_text(traceback.format_exc(), encoding="utf8")
        save(output / "result.json", {"status": "FAILED", "error": repr(error), "scope": "Partial exclusive generation preserved."})
        raise


if __name__ == "__main__":
    main()
