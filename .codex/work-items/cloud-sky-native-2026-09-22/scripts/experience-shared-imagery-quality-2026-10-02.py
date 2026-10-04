"""Existing-publication batch and complete source reconstruction; no network."""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / "output/allwise-w3-atlas-0929/python-deps"), str(ROOT / "data-pipelines/deep-sky")]
import image_quality as quality
from allwise_finite_tan import render_cached_candidate, publication_hash

TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
OUTPUT = TASK / "evidence/shared-imagery-quality-2026-10-02-r2"
ASSETS = ROOT / "workers/miniapp-api/assets/deep-sky"
M42 = ROOT / "output/allwise-w3-hips-0929/candidate-axes-corrected"
M82 = ROOT / "output/allwise-w3-m82-source-0930/candidate-detail"


def binding(path):
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": quality.digest(raw)}


def snapshot():
    return [binding(path) for path in sorted(ASSETS.rglob("*")) if path.is_file()]


def save(name, value):
    quality.write_report(OUTPUT / name, value)


def main():
    assert not OUTPUT.exists(), "preserve_existing_report; choose a new generation after relevant input changes"
    before = snapshot()
    save("assets-before.json", {"scope": "All existing deep-sky assets, notices, old offers and current manifests", "files": before})
    catalog_path = ROOT / "packages/astronomy-core/data/opengc-messier-deep-sky.v1.json"
    rows = json.loads(catalog_path.read_text(encoding="utf-8"))["rows"]
    manifests = [ASSETS / "manifest.json", *sorted(ASSETS.glob("sdss-*/manifest.json"))]
    batch = {"version": quality.QUALITY_VERSION, "catalog": binding(catalog_path),
             "scope": "Read-only current publication structure/display diagnostics; no quality or target acceptance.",
             "publications": [quality.publication_report(path, rows) for path in manifests]}
    save("current-publication-batch.json", batch)
    all_reports = [report for publication in batch["publications"] for report in publication["reports"]]
    assert len(all_reports) == 171
    assert sum(report["coverage"]["sampleAvailability"] == "UNKNOWN" for report in all_reports) == 168
    assert sum(report["coverage"]["sampleAvailability"] == "DECLARED_NONFINITE_SAMPLES_ONLY" for report in all_reports) == 3
    assert all(report["coverage"]["scientificValidity"] == "UNKNOWN" for report in all_reports)

    manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
    entry = next(item for item in manifest["entries"] if item["objectRef"] == "M:42")
    row = next(item for item in rows if item["objectRef"] == "M:42")
    science_reports = []
    rendered = render_cached_candidate(M42, entry, science_reports, row)
    for level, (raw, metadata) in rendered.items():
        published = entry["levels"][level]
        assert quality.digest(raw) == published["sha256"]
        assert len(raw) == published["bytes"]
        assert raw == (ASSETS / published["file"]).read_bytes()
        assert metadata["sourceFiniteMask"] == published["sourceFiniteMask"]
    assert [report["coverage"]["nonfiniteSamples"] for report in science_reports] == [22, 648, 5095]
    assert [report["regions"]["full"]["opaqueRgbZeroPixels"] for report in science_reports] == [1095, 4016, 4206]
    source_receipt = json.loads((M42 / "candidate-result.json").read_text(encoding="utf-8"))
    save("m42-complete-source-reconstruction.json", {
        "scope": "Existing 20-source production TAN/HiPS reconstruction; all three PNG bytes equal current publication. No pixels published or changed.",
        "inputs": [binding(M42 / "candidate-plan.json"), binding(M42 / "candidate-result.json"), binding(M42.parent / "properties")],
        "sourceTileCount": source_receipt["sourceTileCount"], "sourceBytes": source_receipt["sourceBytes"],
        "sourceFiles": source_receipt["sourceFiles"], "reports": science_reports})

    m82_plan = json.loads((M82 / "candidate-plan.json").read_text(encoding="utf-8"))
    m82_receipt = json.loads((M82 / "candidate-result.json").read_text(encoding="utf-8"))
    failures = []
    for name, call in [
        ("shared-source-set-admission", lambda: quality.checked_source_files(M82 / "sources", m82_receipt["sourceFiles"],
             {path for profile in m82_plan["profiles"] for path in profile["tiles"]}, m82_receipt["sourceTileCount"])),
        ("actual-production-finite-renderer", lambda: render_cached_candidate(M82,
             next(item for item in manifest["entries"] if item["objectRef"] == "M:82"))),
    ]:
        try:
            call()
            raise AssertionError("incomplete M82 scientific candidate was incorrectly accepted")
        except RuntimeError as error:
            failures.append({"owner": name, "outcome": "REJECTED_INCOMPLETE_SOURCE_SET", "reason": str(error)})
    save("m82-incomplete-source-rejection.json", {
        "scope": "No new science mask; unknown input differs from nonfinite measurements and image dark regions.",
        "inputs": [binding(M82 / "candidate-plan.json"), binding(M82 / "candidate-result.json"),
                   binding(M82.parent / "source-overlap.json")], "plannedSourceTiles": 6, "checkedSourceTiles": 3,
        "renderedLevels": len(m82_receipt["levels"]), "outcomes": failures})

    after = snapshot()
    assert after == before, "existing publication/assets changed"
    save("assets-after.json", {"files": after, "byteIdenticalToBefore": True})
    source_paths = [ROOT / "data-pipelines/deep-sky" / name for name in (
        "image_quality.py", "publish_allwise_w3.py", "allwise_finite_tan.py", "test_image_quality.py", "test_publish_allwise_w3.py", "README.md", "requirements.txt")]
    m63 = next(report for report in all_reports if report["objectRef"] == "M:63" and report["level"] == "OVERVIEW" and report["asset"]["requestUrl"])
    cells = m63["displayDiagnostics"]["cells"]
    stripe = next(cell for cell in cells if cell["bounds"] == [320, 64, 384, 128])
    beside = next(cell for cell in cells if cell["bounds"] == [256, 64, 320, 128])
    assert stripe["redChromaMean"] > beside["redChromaMean"] + 3
    save("binding.json", {
        "scope": "Shared offline structure admission and anomaly-review diagnostics; source quality and final experience remain unverified.",
        "sourceFiles": [binding(path) for path in source_paths], "script": binding(Path(__file__)),
        "reportFiles": [binding(path) for path in sorted(OUTPUT.glob("*.json"))],
        "currentImages": 171, "jpegScientificCoverageUnknown": 168, "m42FullSourceVerifiedImages": 3,
        "immutableAssetFiles": len(before), "immutableAssetBytes": sum(item["bytes"] for item in before),
        "allExistingDeepSkyBytesUnchanged": True,
        "publicationIdentities": [{"path": path.relative_to(ROOT).as_posix(), "publicationHash": publication_hash(path.read_bytes())} for path in manifests],
        "m63OriginalStripeReview": {"stripeCell": stripe, "adjacentCell": beside,
            "meaning": "Coordinates/statistics locate a known source stripe for review; not an automatic artifact or coverage classification."},
        "unresolved": ["M51 daytime finite rectangle/composition", "M51 precise source WCS", "M82 dark-region cause and unavailable sources",
            "Survey bands/saturation/seams/source resolution", "Whole progressive composition", "Native/phone quality and resources"]})
    print(json.dumps({"reports": str(OUTPUT.relative_to(ROOT)), "images": 171, "m42SourceTiles": 20,
                      "m42ExactPublishedPngBytes": True, "m82NewMaskRejected": True,
                      "allExistingAssetFiles": len(before), "assetsUnchanged": True, "qualityAcceptance": "UNVERIFIED"}))


if __name__ == "__main__":
    main()
