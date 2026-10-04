"""Exclusive cached source-binding and flat-reference boundary addendum.

Does not re-render/reproject or alter the preceding independent output.
One finite analytic control checks task-estimator identifiability scope;
it is not an actual source defect or an adopted registration capability.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
OUT = ROOT / "output/sdss-local-overlap-independent-1002-r2"
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
import numpy as np


def bind(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def save(name, value):
    path = OUT / name
    with path.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(value, indent=2, allow_nan=False) + "\n")
    return bind(path)


def main():
    assert not OUT.exists()
    whole_path = ROOT / "output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json"
    assert bind(whole_path)["sha256"] == "9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0"
    report = json.loads(whole_path.read_text("utf-8"))
    frames = [band["correctedSource"] for field in report["fields"] for band in field["bands"].values()]
    assert len(frames) == 18
    for record in frames:
        assert bind(ROOT / record["path"]) == record
    independent_dir = ROOT / "output/sdss-local-overlap-independent-1002-r1"
    preserved = [bind(p) for p in sorted(independent_dir.rglob("*")) if p.is_file()]
    author_note = TASK / "evidence/experience-sdss-local-overlap-diagnosis-2026-10-02.md"
    assert bind(author_note)["sha256"] == "4c81a7925fa3e06d34cb49e6a1689fa9896e99dba40602b08c2f0a73142d2c11"
    source = TASK / "scripts/experience-sdss-local-overlap-diagnosis-2026-10-02.py"
    assert bind(source)["sha256"] == "c8f04dc33f0d5b438fda8e96aa3ca0c33a7c8f0ac251fa4726c1501b084c291b"
    spec = importlib.util.spec_from_file_location("frozen_task_estimator_scope", source)
    author = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(author)
    OUT.mkdir()
    (OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    y, x = np.indices((33, 33), dtype=np.float64)
    compact_a = np.exp(-((x - 16.2) ** 2 + (y - 15.7) ** 2) / (2 * 1.6 ** 2)) - .03
    flat_b = np.zeros((33, 33), dtype=np.float64)
    result = author.local_shift(compact_a, flat_b)
    assert result is not None
    assert np.var(flat_b) == 0 and abs(result["residualRmsOverAStandardDeviation"] - 1) < 1e-12
    for record in frames + preserved:
        assert bind(ROOT / record["path"]) == record
    save("result.json", {"scope": __doc__, "priorIndependent": bind(independent_dir / "review.json"),
        "authorNote": bind(author_note), "actual18SourceReadback": frames, "actualSourcesUnchanged": True,
        "flatReference": {"controlReferenceVariance": 0, "authorTaskReturned": result,
            "meaning": "No identifiable shift information. This does not invalidate actual selected finite compact A/B peaks, but the task function must not be advertised as a general qualified registration owner."},
        "scientificInputsOrDisplayChanged": False, "requests": 0})
    save("binding.json", {"script": bind(OUT / "executed-script.py"), "taskEstimator": bind(source),
        "preservedIndependentR1": preserved, "actualFrames": frames,
        "outputs": [bind(p) for p in sorted(OUT.rglob("*")) if p.is_file()]})
    print(json.dumps({"result": bind(OUT / "result.json"), "binding": bind(OUT / "binding.json")}), flush=True)


if __name__ == "__main__":
    main()
