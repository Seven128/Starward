"""Read the existing W3 JPEG publication, without network or pixel replacement.

Brightness statistics describe encoded display pixels, NOT scientific coverage.
No fraction of valid measurements can be inferred from a stretched JPEG.
"""
from pathlib import Path
import hashlib
import json
import math

from PIL import Image, ImageDraw, ImageStat

ROOT = Path(__file__).resolve().parents[4]
ASSETS = ROOT / "workers/miniapp-api/assets/deep-sky"
OUTPUT = ROOT / "output/playwright/cloud-sky-w3-quality-0928"


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
    results = []
    for level in ("OVERVIEW", "MEDIUM", "DETAIL"):
        cell_width, cell_height, side, columns = 138, 156, 128, 9
        sheet = Image.new("RGB", (columns * cell_width,
                                  math.ceil(len(manifest["entries"]) / columns) * cell_height), "#141414")
        draw = ImageDraw.Draw(sheet)
        for index, entry in enumerate(manifest["entries"]):
            asset = entry["levels"][level]
            raw = (ASSETS / asset["file"]).read_bytes()
            assert len(raw) == asset["bytes"]
            assert hashlib.sha256(raw).hexdigest() == asset["sha256"]
            with Image.open(ASSETS / asset["file"]) as image:
                assert image.size == (asset["pixels"], asset["pixels"])
                gray = image.convert("L")
                histogram = gray.histogram()
                results.append({"objectRef": entry["objectRef"], "level": level,
                                "fieldDegrees": asset["fieldDegrees"], "sha256": asset["sha256"],
                                "bytes": len(raw), "declaredValidFraction": asset.get("validFraction"),
                                "displayPixelMinMax": gray.getextrema(),
                                "displayPixelMean": ImageStat.Stat(gray).mean[0],
                                "displayBlackFraction": histogram[0] / (gray.width * gray.height),
                                "warning": "JPEG black/brightness is not a missing-data mask"})
                thumb = image.convert("RGB").resize((side, side), Image.Resampling.LANCZOS)
            x, y = (index % columns) * cell_width, (index // columns) * cell_height
            sheet.paste(thumb, (x + 5, y + 23))
            draw.text((x + 5, y + 4), f"{entry['objectRef']} {asset['fieldDegrees']}deg", fill="white")
        sheet.save(OUTPUT / f"{level.lower()}-contact.png")
    result = {"scope": "Existing, hash-verified display JPEGs, no measured coverage or astrometric correction",
              "entries": len(manifest["entries"]), "images": len(results), "results": results}
    (OUTPUT / "source-audit.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"entries": result["entries"], "images": result["images"],
                      "declaredFullCoverage": sum(row["declaredValidFraction"] == 1 for row in results),
                      "sourceBytes": sum(row["bytes"] for row in results), "output": str(OUTPUT)}))


if __name__ == "__main__":
    main()
