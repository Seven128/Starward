"""Offline exact inventory/manifest preparation; no network import or request."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
OUT = ROOT / "output/sdss-contributing-quality-stock-1002-r2"
WANTED = {(3699, 99), (3699, 101), (3716, 116), (3716, 117), (3716, 118)}


def bind(path):
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def inventory(path):
    return [bind(item) for item in sorted(path.rglob("*")) if item.is_file()]


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, allow_nan=False, indent=2) + "\n", encoding="utf-8")


def main():
    candidate_path = ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json"
    candidate = json.loads(candidate_path.read_bytes())
    fields = [value for value in candidate["mosaic"]["fields"] if (value["identity"]["run"], value["identity"]["field"]) in WANTED]
    assert len(fields) == 5 and all(value["identity"]["rerun"] == "301" and value["identity"]["camcol"] == 6 and
                                  value["jointAvailablePixels"] > 0 for value in fields)
    scan = subprocess.run(["rg", "--files", "-uuu", "output", ".codex", "data-pipelines", "workers/miniapp-api/assets"],
                          cwd=ROOT, capture_output=True, text=True, check=True, timeout=30)
    review_path = ROOT / "output/sdss-m51-core-quality-independent-1002-r1/review.json"
    review = json.loads(review_path.read_bytes())
    synthetic = review["boundedControls"]["newHashWrongFieldRejects"]["fixture"]
    assert bind(ROOT / synthetic["path"]) == synthetic
    files, field_records = [], []
    for value in fields:
        identity = value["identity"]
        frames = []
        for band, projected in value["perBand"].items():
            source = projected["sourceReceipt"]["source"]
            actual = bind(Path(source["path"]).resolve())
            assert (actual["bytes"], actual["sha256"]) == (source["bytes"], source["sha256"])
            frames.append({"band": band, **actual, "sourceUrl": source["sourceUrl"]})
        assert {frame["band"] for frame in frames} == set("gri")
        field_records.append({"fieldKey": value["fieldKey"], "identity": identity,
                              "jointAvailableMasterPixels": value["jointAvailablePixels"], "correctedFrames": frames})
        for band in (None, "g", "r", "i"):
            run, field = identity["run"], identity["field"]
            name = f"psField-{run:06d}-6-{field:04d}.fit" if band is None else f"fpM-{run:06d}-{band}6-{field:04d}.fit.gz"
            all_matches = [bind(ROOT / item) for item in scan.stdout.splitlines() if Path(item).name == name]
            matches = [item for item in all_matches if item != synthetic]
            files.append({"filename": name, "kind": "psField" if band is None else "fpM", "fieldKey": value["fieldKey"],
                          "identity": {**identity, **({"band": band} if band is not None else {})},
                          "sourceUrl": f"https://data.sdss.org/sas/dr17/eboss/photo/redux/301/{run}/objcs/6/{name}",
                          "excludedSyntheticMatches": [item for item in all_matches if item == synthetic],
                          "cacheMatches": matches, "cacheStatus": "ABSENT" if not matches else "REQUIRES_BYTE_RECEIPT_CHECK",
                          "rawBytes": None, "rawSha256": None, "scientificQuality": "UNKNOWN"})
    assert len(files) == 20 and len({item["filename"] for item in files}) == 20
    frozen_paths = [candidate_path, candidate_path.parent / "binding.json",
                    review_path,
                    TASK / "scripts/experience-sdss-core-quality-inputs-2026-10-02.py",
                    TASK / "scripts/experience-sdss-contributing-quality-inputs-2026-10-02.py"]
    frozen_paths += [ROOT / "data-pipelines/deep-sky" / name for name in
                     ("sdss_frame_quality.py", "test_sdss_frame_quality.py", "sdss_source_stencil.py", "sdss_corrected_frame.py", "sdss_gri_tan.py")]
    frozen = [bind(path) for path in frozen_paths]
    old_assets = json.loads((candidate_path.parent / "binding.json").read_bytes())["oldAssetsBefore"]
    retained = json.loads((TASK / "tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    assert [bind(ROOT / item["path"]) for item in old_assets] == old_assets
    assert all(bind(ROOT / item["path"])["sha256"] == item["sha256"] for item in retained)
    protected = frozen + old_assets + [synthetic] + [bind(ROOT / item["path"]) for item in retained]
    for directory in ("sdss-m51-core-quality-inputs-1002-r1", "sdss-m51-core-quality-readback-1002-r1",
                      "sdss-corrected-m51-1002", "sdss-m51-gri-mosaic-candidate-1002-r2"):
        protected.extend(inventory(ROOT / "output" / directory))
    protected = sorted({item["path"]: item for item in protected}.values(), key=lambda item: item["path"])
    result = {"version": "sdss-five-contributing-fields-quality-input-plan-v1", "scope": "Prepared exact inventory, no HTTP executed",
              "candidate": bind(candidate_path), "fields": field_records, "files": files,
              "excludedSyntheticFixtures": [{"fixture": synthetic, "evidence": bind(review_path),
                                              "reason": "INDEPENDENT_REVIEW_NEW_HASH_WRONG_FIELD_CONTROL_NOT_ACQUIRED_SOURCE"}],
              "inventory": {"command": ["rg", "--files", "-uuu", "output", ".codex", "data-pipelines", "workers/miniapp-api/assets"],
                            "exactFilesWanted": 20, "exactCacheMatches": sum(len(item["cacheMatches"]) for item in files),
                            "excludedSyntheticFilenameMatches": 1,
                            "missingFiles": sum(not item["cacheMatches"] for item in files), "networkRequests": 0},
              "budgets": {"maximumRequests": 20, "rawBytesPerFile": 4194304, "decodedBytesPerFile": 16777216,
                          "maximumBatchRawBytes": 83886080, "maximumBatchDecodedBytes": 335544320,
                          "socketSeconds": 30, "wholeChildSeconds": 40, "automaticRetries": 0, "redirects": False},
              "frozenInputs": frozen, "protectedInputs": protected,
              "excluded": {"oldCoreField": {"run": 3699, "rerun": "301", "camcol": 6, "field": 100},
                           "correctedFramesFetched": False, "moonOrOtherSourcesFetched": False,
                           "noncontributing3716Camcol5Field117": "NOT_REQUESTED"}}
    OUT.mkdir(exist_ok=False)
    save(OUT / "input-manifest.json", result)
    (OUT / "executed-stock-script.py").write_bytes(Path(__file__).read_bytes())
    save(OUT / "binding.json", {"manifest": bind(OUT / "input-manifest.json"), "stockScript": bind(Path(__file__)),
                                "inputs": frozen, "exactMissing": [item["filename"] for item in files if not item["cacheMatches"]],
                                "networkRequests": 0})
    print(json.dumps({"manifest": bind(OUT / "input-manifest.json"), "binding": bind(OUT / "binding.json"),
                      "exactMissingFiles": sum(not item["cacheMatches"] for item in files), "networkRequests": 0}))


if __name__ == "__main__":
    main()
