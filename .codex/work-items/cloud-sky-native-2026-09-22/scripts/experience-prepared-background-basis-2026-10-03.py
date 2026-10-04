"""Measure cached photographic margins; all estimates remain display-only."""
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
assert OUT.parent == ROOT / "output" and OUT.name.startswith("prepared-background-basis-")
OUT.mkdir()
PUB = ROOT / "output/prepared-optical-publication-1003-r4/publication"
NOMINAL = ROOT / "output/prepared-footprint-display-1003-r1/result.json"
PROTECTION = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json"

def identity(p):
    raw = p.read_bytes()
    return {"path": str(p), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}

assert identity(PUB / "manifest.json")["sha256"] == "23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1"
assert identity(NOMINAL)["sha256"] == "95f72b83ace5de05346f09a7e0414b3e8157f55f5593653d859f6468c6d77d83"
publication = json.loads((PUB / "manifest.json").read_bytes())
nominal = json.loads(NOMINAL.read_bytes())
protected = json.loads(PROTECTION.read_text())
files = [Path(__file__), PUB / "manifest.json", NOMINAL, PROTECTION, Path(sys.executable), Path(np.__file__)]
files += [PUB / asset["file"] for asset in publication["levels"].values()]
files += [ROOT / row["path"] for row in protected]
before = [identity(p) for p in files]
for row in protected:
    assert identity(ROOT / row["path"])["sha256"] == row["sha256"]
(OUT / "inputs-before.json").write_text(json.dumps(before, indent=2) + "\n")
(OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())

ra, dec = np.radians([publication["center"]["raDeg"], publication["center"]["decDeg"]])
center = np.array([math.cos(dec)*math.cos(ra), math.cos(dec)*math.sin(ra), math.sin(dec)])
east = np.array([-math.sin(ra), math.cos(ra), 0])
north = np.array([-math.sin(dec)*math.cos(ra), -math.sin(dec)*math.sin(ra), math.cos(dec)])
yy, xx = np.mgrid[:512, :512]

def smoothstep(v):
    t = np.clip(v, 0, 1)
    return t*t*(3 - 2*t)

def uv(rows, rays):
    hom = rays @ np.asarray(rows).T
    return hom[..., :2] / hom[..., 2:]

levels = {}
for level, asset in publication["levels"].items():
    raw = (PUB / asset["file"]).read_bytes()
    assert len(raw) == asset["bytes"] and hashlib.sha256(raw).hexdigest() == asset["sha256"]
    with Image.open(io.BytesIO(raw)) as image:
        rgba = np.asarray(image.convert("RGBA"))
    rgb = rgba[..., :3].astype(np.float64)/255
    diameter = 2*math.tan(math.radians(asset["fieldDegrees"])/2)
    rays = center - diameter*(((xx+.5)/512-.5)[..., None]*east + ((yy+.5)/512-.5)[..., None]*north)
    source_uv, master_uv = uv(nominal["nominalSourceRows"], rays), uv(nominal["masterRows"], rays)
    feather = np.prod(smoothstep(np.minimum(source_uv, 1-source_uv)/.08), axis=-1)
    feather *= np.prod(smoothstep(np.minimum(master_uv, 1-master_uv)/.08), axis=-1)
    levels[level] = {"rgba": rgba, "rgb": rgb, "luma": rgb @ np.array([.2126, .7152, .0722]),
                     "uv": source_uv, "feather": feather, "opaque": rgba[..., 3] == 255}

overview = levels["OVERVIEW"]
cells, sensitivity = [], []
# Equal source-coordinate segments prevent a long/bright photographic edge
# from deciding the profile simply through its greater TAN raster sample count.
for width in [.02, .04, .08]:
    for axis in [0, 1]:
        across, along = overview["uv"][..., axis], overview["uv"][..., 1-axis]
        for side in [0, 1]:
            strip = (across <= width) if side == 0 else (across >= 1-width)
            strip &= overview["opaque"] & (across >= 0) & (across <= 1)
            for segment in range(8):
                selected = strip & (along >= segment/8) & (along < (segment+1)/8)
                luma = overview["luma"][selected]
                assert luma.size >= 40, "insufficient source margin samples"
                values = np.percentile(luma, [10, 25, 50, 75, 90])
                cells.append({"width": width, "axis": axis, "side": side, "segment": segment,
                    "samples": int(luma.size), "lumaPercentiles": values.tolist(),
                    "rgbMedian": np.median(overview["rgb"][selected], axis=0).tolist()})
    current = [c for c in cells if c["width"] == width]
    sensitivity.append({"width": width, "samplesWithCornerDuplication": sum(c["samples"] for c in current),
        "cellP25Range": [min(c["lumaPercentiles"][1] for c in current), max(c["lumaPercentiles"][1] for c in current)],
        "medianCellP10P25P50": np.median([c["lumaPercentiles"][:3] for c in current], axis=0).tolist(),
        "medianBySideP25": [float(np.median([c["lumaPercentiles"][1] for c in current if c["axis"] == axis and c["side"] == side]))
                            for axis in [0, 1] for side in [0, 1]]})

# Candidate photographic black-point from one full-source perimeter, not each
# LOD. Quantiles diagnose encoded tone only: they cannot identify true sky,
# absent observations, diffuse astrophysical structure or a physical flux.
basis = next(row for row in sensitivity if row["width"] == .04)
black_point = basis["medianCellP10P25P50"][1]
assert math.isfinite(black_point) and 0 < black_point < 1
perimeter = overview["opaque"] & (overview["feather"] < 1)
old_p95 = float(np.percentile(overview["luma"][perimeter], 95))
stats, comparisons = [], []
for background in [(3, 7, 16), (32, 40, 56)]:
    sheet = Image.new("RGB", (2048, 1644), background)
    draw = ImageDraw.Draw(sheet)
    for row, (level, data) in enumerate(levels.items()):
        luma, rgb, rgba, feather = (data[k] for k in ["luma", "rgb", "rgba", "feather"])
        soft = np.divide(luma, luma+black_point)
        # Scalar luma scaling keeps encoded channel ratios; source RGB/alpha is
        # never replaced. Hard black-point here is a comparison, not adoption.
        hard = np.divide(np.maximum(luma-black_point, 0), luma*(1-black_point),
                         out=np.zeros_like(luma), where=luma > 0)
        gains = [np.ones_like(luma), smoothstep(luma/old_p95), soft, hard]
        names = ["Original", "Shared P95", "Soft photographic toe", "Shared black-point"]
        if background == (3, 7, 16):
            weak = data["opaque"] & (luma > black_point) & (luma <= old_p95)
            stats.append({"level": level, "opaque": int(data["opaque"].sum()),
                "originalAlphaSha256": hashlib.sha256(rgba[..., 3].tobytes()).hexdigest(),
                "belowCandidateBlackPoint": int((data["opaque"] & (luma <= black_point)).sum()),
                "weakPixelsAboveBlackPoint": int(weak.sum()),
                "weakMeanGainSoft": float(soft[weak].mean()) if weak.any() else None,
                "weakMeanGainHard": float(hard[weak].mean()) if weak.any() else None})
        for column, gain in enumerate(gains):
            weight = gain if column == 0 else gain*feather
            weight *= rgba[..., 3]/255
            contribution = rgb.max(axis=-1)*weight
            pixels = rgb*weight[..., None] + np.asarray(background)/255*(1-contribution)[..., None]
            rendered = Image.fromarray(np.rint(np.clip(pixels, 0, 1)*255).astype(np.uint8))
            sheet.paste(rendered, (column*512, row*548+30))
            draw.text((column*512+8, row*548+6), level+": "+names[column], fill=(240, 240, 240))
    target = OUT / ("comparison-"+"-".join(map(str, background))+".png")
    sheet.save(target)
    comparisons.append(identity(target))

after = [identity(p) for p in files]
assert before == after
(OUT / "inputs-after.json").write_text(json.dumps(after, indent=2)+"\n")
result = {"status": "MEASURED_PHOTOGRAPHIC_MARGIN_CANDIDATES_NOT_ADOPTED", "inputsBeforeAfterExact": True,
    "inputCount": len(before), "sourceCoordinateCells": cells, "widthSensitivity": sensitivity,
    "candidateCommonBlackPoint": black_point, "comparisonP95": old_p95, "levels": stats, "comparisons": comparisons,
    "meaning": "Encoded photographic margins only; shared scalar luma display studies preserve hue ratios and original alpha. No physical sky/coverage/noise/background-removal guarantee, source reconstruction or processing, GPU/native/default recipe, quality or capacity acceptance. Edge cells can contain genuine diffuse source structure; sensitivity is evidence against premature adoption."}
(OUT / "result.json").write_text(json.dumps(result, indent=2)+"\n")
print(json.dumps({"status": result["status"], "inputCount": len(before), "commonBlackPoint": black_point,
    "widthSensitivity": sensitivity, "result": identity(OUT / "result.json")}))
