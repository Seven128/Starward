"""Shared-source display-contrast study on cached PNGs; no publication editing."""
from __future__ import annotations
import hashlib
import io
import json
import math
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / sys.argv[1]
assert OUT.parent == ROOT / "output" and OUT.name.startswith("prepared-tone-comparison-")
OUT.mkdir()
publication_dir = ROOT / "output/prepared-optical-publication-1003-r4/publication"
manifest_path = publication_dir / "manifest.json"
nominal_path = ROOT / "output/prepared-footprint-display-1003-r1/result.json"
raw = manifest_path.read_bytes()
assert hashlib.sha256(raw).hexdigest() == "23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1"
nominal_raw = nominal_path.read_bytes()
assert hashlib.sha256(nominal_raw).hexdigest() == "95f72b83ace5de05346f09a7e0414b3e8157f55f5593653d859f6468c6d77d83"
publication, nominal = json.loads(raw), json.loads(nominal_raw)

def identity(path):
    b = path.read_bytes()
    return {"path": str(path), "bytes": len(b), "sha256": hashlib.sha256(b).hexdigest()}

protected = json.loads((ROOT / ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json").read_text())
files = [Path(__file__), manifest_path, nominal_path, Path(sys.executable), Path(np.__file__)]
files += [publication_dir / asset["file"] for asset in publication["levels"].values()]
files += [ROOT / row["path"] for row in protected]
before = [identity(p) for p in files]
for row in protected:
    assert identity(ROOT / row["path"])["sha256"] == row["sha256"]
(OUT / "inputs-before.json").write_text(json.dumps(before, indent=2) + "\n")
(OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())

ra, dec = np.radians([publication["center"]["raDeg"], publication["center"]["decDeg"]])
center = np.array([math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec)])
east = np.array([-math.sin(ra), math.cos(ra), 0])
north = np.array([-math.sin(dec) * math.cos(ra), -math.sin(dec) * math.sin(ra), math.cos(dec)])
yy, xx = np.mgrid[:512, :512]

def coordinates(rows, rays):
    projected = rays @ np.asarray(rows).T
    return projected[..., :2] / projected[..., 2:]

def smoothstep(value):
    t = np.clip(value, 0, 1)
    return t * t * (3 - 2 * t)

def edge_weight(uv):
    return np.prod(smoothstep(np.minimum(uv, 1 - uv) / .08), axis=-1)

levels = {}
for level, asset in publication["levels"].items():
    payload = (publication_dir / asset["file"]).read_bytes()
    assert len(payload) == asset["bytes"] and hashlib.sha256(payload).hexdigest() == asset["sha256"]
    with Image.open(io.BytesIO(payload)) as image:
        rgba = np.asarray(image.convert("RGBA"))
    rgb = rgba[..., :3].astype(np.float64) / 255
    # Exact admitted linear TAN plane; no WCS/source grid or image is regenerated.
    diameter = 2 * math.tan(math.radians(asset["fieldDegrees"]) / 2)
    rays = center - diameter * (((xx + .5) / 512 - .5)[..., None] * east +
                               ((yy + .5) / 512 - .5)[..., None] * north)
    feather = edge_weight(coordinates(nominal["nominalSourceRows"], rays)) * edge_weight(coordinates(nominal["masterRows"], rays))
    levels[level] = {"rgba": rgba, "rgb": rgb, "luma": rgb @ np.array([.2126, .7152, .0722]),
                     "feather": feather, "supported": rgba[..., 3] == 255}

overview = levels["OVERVIEW"]
perimeter = overview["supported"] & (overview["feather"] < 1)
assert np.count_nonzero(perimeter) > 1000
edge_values = overview["luma"][perimeter]
# Parameter study only: robust encoded tone of the full-source/mother perimeter.
# It is not a measured physical sky level, a missing-data threshold or adoption.
edge95 = float(np.percentile(edge_values, 95))
assert math.isfinite(edge95) and edge95 > 0
recipe_names = ["Original", "Existing W3 gain", "Shared perimeter P95 gain", "Edges only"]
backgrounds = [(3, 7, 16), (32, 40, 56)]  # Declared synthetic comparison grounds.
stats, sheets = [], []
for background in backgrounds:
    sheet = Image.new("RGB", (2048, 1644), background); draw = ImageDraw.Draw(sheet)
    for row, (level, data) in enumerate(levels.items()):
        rgb, rgba, luma, feather, supported = (data[k] for k in ["rgb", "rgba", "luma", "feather", "supported"])
        old_gain, perimeter_gain = smoothstep(luma), smoothstep(luma / edge95)
        factors = [np.ones_like(luma), old_gain * feather, perimeter_gain * feather, feather]
        if background == backgrounds[0]:
            weak = supported & (luma > 0) & (luma <= edge95)
            stats.append({"level": level, "opaque": int(np.count_nonzero(supported)),
                "alphaSha256": hashlib.sha256(rgba[..., 3].tobytes()).hexdigest(),
                "sameCommonToneScale": edge95, "edgeWidth": .08,
                "oldGainQuantiles": np.percentile(old_gain[supported], [10, 50, 90]).tolist(),
                "perimeterGainQuantiles": np.percentile(perimeter_gain[supported], [10, 50, 90]).tolist(),
                "weakEncodedPixels": int(np.count_nonzero(weak)),
                "weakMeanGainOld": float(np.mean(old_gain[weak])) if np.any(weak) else None,
                "weakMeanGainPerimeter": float(np.mean(perimeter_gain[weak])) if np.any(weak) else None})
        for column, factor in enumerate(factors):
            # Match the corrected common-gain formula, preserving channel ratios.
            contribution = rgb.max(axis=-1) * factor * (rgba[..., 3] / 255)
            composite = rgb * (factor * rgba[..., 3] / 255)[..., None] + np.asarray(background) / 255 * (1 - contribution)[..., None]
            preview = Image.fromarray(np.rint(np.clip(composite, 0, 1) * 255).astype(np.uint8))
            sheet.paste(preview, (column * 512, row * 548 + 30))
            draw.text((column * 512 + 8, row * 548 + 6), level + ": " + recipe_names[column], fill=(240, 240, 240))
    file = OUT / ("contrast-" + "-".join(map(str, background)) + ".png")
    sheet.save(file); sheets.append(identity(file))

after = [identity(p) for p in files]
assert before == after
(OUT / "inputs-after.json").write_text(json.dumps(after, indent=2) + "\n")
result = {"status": "PASSED_BOUNDED_TONE_PARAMETER_STUDY_NOT_ADOPTED", "beforeAfterExact": True,
    "inputs": len(before), "perimeterEncodedPixels": int(np.count_nonzero(perimeter)),
    "perimeterLumaQuantiles": np.percentile(edge_values, [0, 10, 50, 90, 95, 99, 100]).tolist(),
    "sharedPerimeterScaleCandidate": edge95, "stats": stats, "comparisons": sheets,
    "scope": "Cached three publication PNGs and previously bound nominal footprint rows only. Corrected common encoded-RGB gain on two declared flat comparison backgrounds. No original JPEG/master decode, image/source reprocessing, scientific background/validity assertion, source RGB/alpha/metadata change, GPU/native/default/quality/physical-colour/PSF adoption or capacity acceptance. P95 is a display parameter study, not established background removal."}
(OUT / "result.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"status": result["status"], "perimeterPixels": result["perimeterEncodedPixels"],
                  "candidateScale": edge95, "result": identity(OUT / "result.json")}))
