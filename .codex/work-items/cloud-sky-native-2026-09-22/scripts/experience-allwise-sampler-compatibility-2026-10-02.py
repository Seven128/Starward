"""Read-only old/new complete M42 render metadata/QC and serialized identity."""
import hashlib
import json
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / "data-pipelines/deep-sky"), str(ROOT / "output/allwise-w3-atlas-0929/python-deps")]
import allwise_finite_tan as current

OUT = ROOT / "output/allwise-w3-fresh-sampler-compatibility-1002-r1"
OLD = ROOT / "output/allwise-w3-m82-detail-acquisition-1002-r1/input-snapshots/09-allwise_finite_tan.py"
OWNER = ROOT / "data-pipelines/deep-sky/allwise_finite_tan.py"
M42 = ROOT / "output/allwise-w3-hips-0929/candidate-axes-corrected"
ASSETS = ROOT / "workers/miniapp-api/assets/deep-sky"
CATALOG = ROOT / "packages/astronomy-core/data/opengc-messier-deep-sky.v1.json"


def bind(path):
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def serialized(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")


def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    before = [bind(OWNER), bind(OLD), bind(ASSETS / "manifest.json"), bind(CATALOG),
              bind(M42 / "candidate-plan.json"), bind(M42 / "candidate-result.json"), bind(M42.parent / "properties")]
    assert before[1]["sha256"] == "6ce051e687cb2a66da3de0390c6b16015b5f44eb0f34457ff874142dd5edc354"
    old = types.ModuleType("old_allwise_finite_tan_snapshot")
    # Only lookup's sibling resolution uses __file__; the executed source is
    # exactly the frozen prior owner, with the unchanged current lookup owner.
    old.__file__ = str(OWNER)
    exec(compile(OLD.read_bytes(), str(OLD), "exec"), old.__dict__)
    manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
    entry = next(item for item in manifest["entries"] if item["objectRef"] == "M:42")
    row = next(item for item in json.loads(CATALOG.read_text(encoding="utf-8"))["rows"] if item["objectRef"] == "M:42")
    old_qc, new_qc = [], []
    previous = old.render_cached_candidate(M42, entry, old_qc, row)
    latest = current.render_cached_candidate(M42, entry, new_qc, row)
    records = []
    for level in current.LEVELS:
        old_png, old_meta = previous[level]
        new_png, new_meta = latest[level]
        assert old_png == new_png == (ASSETS / entry["levels"][level]["file"]).read_bytes()
        assert old_meta == new_meta
        assert serialized(old_meta) == serialized(new_meta)
        records.append({"level": level, "pngByteEqual": True, "metadataSemanticEqual": True,
                        "metadataPublicationSerializationByteEqual": True, "pngSha256": current.sha256(new_png),
                        "metadataCompactJSONSha256": current.sha256(serialized(new_meta))})
    assert old_qc == new_qc and serialized(old_qc) == serialized(new_qc)
    write("old-render-metadata.json", {level: value[1] for level, value in previous.items()})
    write("new-render-metadata.json", {level: value[1] for level, value in latest.items()})
    write("old-quality.json", old_qc)
    write("new-quality.json", new_qc)
    after = [bind(ROOT / record["path"]) for record in before]
    assert before == after
    write("result.json", {"scope": "Actual old source snapshot vs frozen current shared sampler M42 renderer, with current catalog QC; read-only, no publication",
                          "script": bind(Path(__file__)), "before": before, "after": after,
                          "levels": records, "fullQualitySemanticEqual": True,
                          "fullQualitySerializedByteEqual": True,
                          "qualityCompactJSONSha256": current.sha256(serialized(new_qc))})
    write("binding.json", {"inputs": before, "script": bind(Path(__file__)),
                           "outputs": [bind(path) for path in sorted(OUT.iterdir()) if path.is_file()]})
    print(json.dumps({"result": bind(OUT / "result.json"), "binding": bind(OUT / "binding.json")}))


if __name__ == "__main__":
    main()
