"""Read frozen real outputs; no renderer, request, source processing or production edit."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
OLD = ROOT / "output/playwright/cloud-sky-selected-full-hook-1002-r3"
NEW = ROOT / "output/playwright/cloud-sky-selected-full-hook-1002-r4"
OUT = ROOT / "output/selected-reference-root-readback-1002-r1"
OUT.mkdir(exist_ok=False)
bindings = []


def read(path):
    data = path.read_bytes()
    bindings.append({"path": path.relative_to(ROOT).as_posix(), "bytes": len(data),
                     "sha256": hashlib.sha256(data).hexdigest()})
    return data


def document(path):
    return json.loads(read(path))


old = document(OLD / "result.json")
new = document(NEW / "result.json")
assert bindings[0]["sha256"] == "10922aff9d1d6543f036709acc1705f9ce942472f301c9c282fe3ea4d78898cf"
assert bindings[1]["sha256"] == "97e8638410d407d4ede3b16b42a8890253d300641982bd504de3ee5ebdc983d0"
assert new["status"] == "PASS" and not new["errors"]
(OUT / "executed-script.py.txt").write_bytes(read(Path(__file__).resolve()))
before = document(NEW / "source-binding-before.json")
after = document(NEW / "source-binding-after.json")
old_sources = {r["path"]: r for r in old["sourceBindings"]}
differences = []
for row in new["sourceBindings"]:
    current = read(ROOT / row["path"])
    snapshot = read(NEW / "source-inputs" / row["path"])
    assert current == snapshot and hashlib.sha256(current).hexdigest() == row["sha256"]
    if row["sha256"] != old_sources[row["path"]]["sha256"]:
        differences.append(row["path"])
assert differences == ["apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx"]
for receipt in (before["sourceBindings"], after["sourceBindings"]):
    assert {r["path"]: r["sha256"] for r in receipt} == {r["path"]: r["sha256"] for r in new["sourceBindings"]}
for row in after["preserved"]:
    assert hashlib.sha256(read(ROOT / row["path"])).hexdigest() == row["sha256"]

rows = []
for previous, current in zip(old["rows"], new["rows"]):
    name = current["condition"]["name"]
    assert name == previous["condition"]["name"]
    original = read(OLD / (name + ".rgba"))
    actual = read(NEW / (name + ".rgba"))
    assert original == actual and len(actual) == 390 * 844 * 4
    for folder, raw in ((OLD, original), (NEW, actual)):
        png = folder / (name + ".png")
        read(png)
        with Image.open(png) as image:
            assert image.size == (390, 844)
            top_down = b"".join(raw[y * 1560:(y + 1) * 1560] for y in range(843, -1, -1))
            assert image.convert("RGBA").tobytes() == top_down
    uploads = [sum(e.get("bytes", 0) for e in p["events"] if e["operation"] == "source-upload") for p in current["passes"]]
    assert not uploads or uploads[1] == 0
    rows.append({"name": name, "wholeNormalRgbaExact": True,
                 "newDecodedOffers": [r["offeredId"] for r in current["newDecodes"]],
                 "selectedObjectId": (current["ready"]["selected"]["decoded"] or {}).get("objectId"),
                 "normalSourceUploads": uploads,
                 "imageTransferBytes": sum(t["bytes"] for t in current["transfers"] if t["type"] == "image"),
                 "metadataTransferBytes": sum(t["bytes"] for t in current["transfers"] if t["type"] == "metadata")})
assert rows[0]["selectedObjectId"] == rows[1]["selectedObjectId"] == 0
assert "selected:M:51:DETAIL" not in rows[1]["newDecodedOffers"]
assert rows[4]["selectedObjectId"] is None and new["rows"][4]["ready"]["decodedSourceRgbaModel"] == 0
assert rows[5]["selectedObjectId"] != rows[3]["selectedObjectId"]
assert rows[5]["imageTransferBytes"] == 0 and rows[5]["metadataTransferBytes"] == 74167
final = document(NEW / "actual-final-owner.json")
assert final == new["final"]
assert final["gpu"]["liveBytes"] == final["gpu"]["aliveTextures"] == final["cache"][0]["leased"] == 0
assert not any(r["current"] for r in final["nativeCurrent"])
result = {"status": "ROOT_FROZEN_SOURCE_AND_FULL_NORMAL_PIXELS_READBACK_PASS",
          "sourceBindings": len(new["sourceBindings"]), "onlyChangedProductionSource": differences,
          "normalFullRgbaComparisons": 6, "fullPngToRawComparisons": 12, "rows": rows,
          "oneAvoidedDecodeSourceEquivalentBytes": 512 * 512 * 4,
          "scope": "Same-byte report resubmission fixture; one fewer selected createImage, not physical memory/FPS/network gain or WEAPP/whole experience acceptance. Hidden PNG is residual readback, not a hidden draw. Metadata still transfers on new Canvas."}
(OUT / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(OUT / "binding.json").write_text(json.dumps(bindings, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"output": OUT.relative_to(ROOT).as_posix(), "status": result["status"], "boundReads": len(bindings)}))
