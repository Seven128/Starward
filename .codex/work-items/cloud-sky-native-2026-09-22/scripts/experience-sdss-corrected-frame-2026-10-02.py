"""Actual three cached SDSS source receipts, without download or publication."""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / "output/allwise-w3-atlas-0929/python-deps"), str(ROOT / "data-pipelines/deep-sky")]
from image_quality import digest, write_report
from sdss_corrected_frame import read_cached_band_set

TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
CACHE = ROOT / "output/sdss-corrected-m51-1002"
OUTPUT = TASK / "evidence/sdss-corrected-frame-2026-10-02-r2"
LIMIT = 32 * 1024 * 1024


def binding(path):
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": digest(raw)}


def main():
    assert not OUTPUT.exists(), "preserve prior reports; choose new generation after source change"
    acquisition_path = CACHE / "frame-acquisition.json"
    acquisition = json.loads(acquisition_path.read_text(encoding="utf-8"))
    records = [{**record["identity"], "path": record["path"], "sha256": record["sha256"],
                "bytes": record["bytes"], "sourceUrl": record["url"]} for record in acquisition["sourceFiles"]]
    before = [binding(CACHE / "sources" / record["path"]) for record in records]
    frames = read_cached_band_set(CACHE / "sources", records, ("g", "r", "i"), max_uncompressed_bytes=LIMIT)
    after = [binding(CACHE / "sources" / record["path"]) for record in records]
    assert after == before
    assert sum(record["bytes"] for record in before) == 9134078
    assert all(frame.receipt["scientificSamples"]["scientificValidity"] == "UNKNOWN" for frame in frames)
    assert all(frame.receipt["source"]["sourceUrl"] for frame in frames)
    write_report(OUTPUT / "reader-receipts.json", {
        "scope": "Three actual cached corrected frames only; source structure admitted, scientific validity/quality unknown. No pixels published.",
        "acquisition": binding(acquisition_path), "sourceBefore": before, "sourceAfter": after,
        "rawOriginalFilesUnchanged": True,
        "receipts": [frame.receipt for frame in frames]})
    sources = [ROOT / "data-pipelines/deep-sky" / name for name in (
        "sdss_corrected_frame.py", "test_sdss_corrected_frame.py", "requirements.txt")]
    write_report(OUTPUT / "binding.json", {
        "sourceFiles": [binding(path) for path in sources], "script": binding(Path(__file__)),
        "acquisition": binding(acquisition_path), "report": binding(OUTPUT / "reader-receipts.json"),
        "compressedBytes": sum(record["bytes"] for record in before),
        "decompressedBytes": sum(frame.receipt["decompressed"]["bytes"] for frame in frames),
        "arrays": [{"band": frame.receipt["identity"]["band"], **frame.receipt["scientificSamples"]} for frame in frames],
        "scope": "Input, scientific-array completeness and actual identity; neither complete distortion correction, RGB, mosaic nor quality acceptance."})
    print(json.dumps({"report": str(OUTPUT.relative_to(ROOT)), "frames": len(frames),
        "compressedBytes": sum(record["bytes"] for record in before), "rawFilesUnchanged": True,
        "scientificValidity": "UNKNOWN", "fullDistortionAstrometry": "NOT_APPLIED"}))


if __name__ == "__main__":
    main()
