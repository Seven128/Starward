"""Exclusive factual r2 correction and bounded synthetic translation examples.

This is format research, not a production fpM reader or acceptance of quality.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PRIOR = ROOT / "output/sdss-mask-psf-capability-independent-1002-r1"
OUT = ROOT / "output/sdss-mask-psf-capability-independent-1002-r2"


def bind(path):
    data = path.read_bytes()
    return {"path": path.resolve().relative_to(ROOT).as_posix(), "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest()}


def declared_format_pixels(spans, object_origin, target_origin, dimensions, add_origin=True):
    # Simple mathematical definition, independently compared with explicit
    # small sets below. This neither decodes files nor writes a mask raster.
    rows, columns = dimensions
    oy, ox = object_origin if add_origin else (0, 0)
    ty, tx = target_origin
    pixels = set()
    for y, first, last in spans:
        for x in range(first, last + 1):
            yy, xx = y + oy - ty, x + ox - tx
            if 0 <= yy < rows and 0 <= xx < columns:
                pixels.add((yy, xx))
    return pixels


def main():
    assert not OUT.exists(), "exclusive generation only"
    previous_path = PRIOR / "coordinate-addendum.json"
    previous_binding = bind(previous_path)
    assert previous_binding["sha256"] == "712a4e71cc8c1420c2958a6641f79febb38fba6f3537c61eb702f4604a2d6a2f"
    value = json.loads(previous_path.read_text("utf-8"))
    for entry in value["sources"]:
        assert bind(ROOT / entry["path"]) == entry
    fixtures = [
        {"name": "positive_object_origin", "spans": [(1, -1, 2)], "object": (2, 3), "target": (0, 0),
         "dimensions": (6, 7), "expected": {(3, 2), (3, 3), (3, 4), (3, 5)}},
        {"name": "negative_column_origin_clip", "spans": [(2, 1, 4)], "object": (-1, -3), "target": (0, 0),
         "dimensions": (6, 7), "expected": {(1, 0), (1, 1)}},
        {"name": "negative_row_origin_outside", "spans": [(2, 1, 3)], "object": (-3, 2), "target": (0, 0),
         "dimensions": (6, 7), "expected": set()},
        {"name": "nonzero_target_origin_subtract_once", "spans": [(1, -1, 2)], "object": (2, 3), "target": (2, 2),
         "dimensions": (3, 4), "expected": {(1, 0), (1, 1), (1, 2), (1, 3)}},
        {"name": "inclusive_endpoint_and_object_union", "spans": [(0, 1, 2), (0, 2, 3)], "object": (1, 1), "target": (0, 0),
         "dimensions": (4, 6), "expected": {(1, 2), (1, 3), (1, 4)}}]
    controls = []
    for item in fixtures:
        actual = declared_format_pixels(item["spans"], item["object"], item["target"], item["dimensions"])
        wrong = declared_format_pixels(item["spans"], item["object"], item["target"], item["dimensions"], False)
        assert actual == item["expected"] and wrong != item["expected"]
        controls.append({"name": item["name"], "spans": item["spans"], "objectOriginRowColumn": item["object"],
            "targetOriginRowColumn": item["target"], "targetDimensionsRowColumn": item["dimensions"],
            "explicitExpectedPixels": sorted(item["expected"]), "actualDeclaredFormulaPixels": sorted(actual),
            "wrongNoObjectOffsetPixels": sorted(wrong), "noObjectOffsetCounterexampleDetected": True})
    value["generation"] = "Exclusive r2 factual correction; r1 outputs retained as historical"
    value["priorSupplement"] = previous_binding
    value["boundedSyntheticCoordinateExamples"] = controls
    value["syntheticScope"] = "Format arithmetic versus explicit small pixel sets only, not proof of a not-yet-reviewed production decoder"
    value["supersedes"] = "r1 result officialArchive.facts phRegionSetValFromObjmask cannot establish actual read_mask offset semantics; standalone main_mask/phMaskSetFromObjmask chain here supersedes that implication"
    OUT.mkdir()
    output = OUT / "coordinate-addendum.json"
    output.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    closure = {"script": bind(Path(__file__)), "prior": previous_binding, "addendum": bind(output),
        "archiveAcquisition": bind(PRIOR / "reference/acquisition.json"), "archive": bind(PRIOR / "reference/readAtlasImages-v5_4_11.tar.gz"),
        "networkRequests": 0, "productionEdited": False}
    binding_path = OUT / "binding.json"
    binding_path.write_text(json.dumps(closure, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"addendum": bind(output), "binding": bind(binding_path)}, indent=2))


if __name__ == "__main__":
    main()
