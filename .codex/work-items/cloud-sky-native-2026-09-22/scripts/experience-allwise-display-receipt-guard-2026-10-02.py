"""One task-only frozen-PNG receipt mutation through the actual cached consumer."""
import hashlib
import json
import sys
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / "data-pipelines/deep-sky"), str(ROOT / "output/allwise-w3-atlas-0929/python-deps")]
import allwise_finite_tan as owner

OUT = ROOT / "output/allwise-w3-display-receipt-guard-1002-r1"
M42 = ROOT / "output/allwise-w3-hips-0929/candidate-axes-corrected"
RECEIPT = M42 / "candidate-result.json"
MANIFEST = ROOT / "workers/miniapp-api/assets/deep-sky/manifest.json"
OWNER = ROOT / "data-pipelines/deep-sky/allwise_finite_tan.py"


def bind(path):
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    before = [bind(OWNER), bind(RECEIPT), bind(MANIFEST)]
    entry = next(item for item in json.loads(MANIFEST.read_text(encoding="utf-8"))["entries"] if item["objectRef"] == "M:42")
    changed = json.loads(RECEIPT.read_text(encoding="utf-8"))
    changed["levels"][0]["sha256"] = "0" * 64
    original = Path.read_text

    def read(path, *arguments, **keywords):
        return json.dumps(changed) if path.resolve() == RECEIPT.resolve() else original(path, *arguments, **keywords)

    with patch.object(Path, "read_text", read):
        try:
            owner.render_cached_candidate(M42, entry)
        except RuntimeError as error:
            rejection = str(error)
        else:
            raise AssertionError("changed expected PNG digest was admitted")
    assert rejection == "allwise_candidate_pixels_changed"
    after = [bind(ROOT / record["path"]) for record in before]
    assert before == after
    result = {"scope": "Task-only read mutation; actual cached source admission and renderer run; no files or published pixels changed",
              "script": bind(Path(__file__)), "before": before, "after": after,
              "mutation": "Only first existing expected PNG sha256 is changed to 64 zeroes in the returned receipt read",
              "actualConsumerRejection": rejection,
              "normalActualResult": "All three valid receipt PNGs were previously byte-compared in bound fresh and old/new compatibility generations"}
    (OUT / "result.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(bind(OUT / "result.json")))


if __name__ == "__main__":
    main()
