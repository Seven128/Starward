"""Bounded display-only footprint/tone comparison; no source/publication change."""
from __future__ import annotations

import hashlib
import io
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / "data-pipelines/deep-sky"),
               str(ROOT / "output/allwise-w3-atlas-0929/python-deps"),
               str(ROOT / "output/pyavm-metadata-trial-1002-r1/lib")]
import astropy
import astropy.wcs
import numpy as np
from PIL import Image, ImageDraw
from prepared_rgb_observation import NominalAvmGeometry
from sdss_gri_tan import target_tan

OUT = ROOT / sys.argv[1]
assert OUT.parent == ROOT / "output" and OUT.name.startswith("prepared-footprint-display-")
OUT.mkdir()

def identity(path):
    data = path.read_bytes()
    return {"path": str(path), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}

publication_dir = ROOT / "output/prepared-optical-publication-1003-r4/publication"
manifest_path = publication_dir / "manifest.json"
raw = manifest_path.read_bytes()
assert hashlib.sha256(raw).hexdigest() == "23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1"
publication = json.loads(raw)
master_path = ROOT / "output/prepared-rgb-tan-generation-1003-r1/prepared-rgb-tan-master.npy"
master_raw = master_path.read_bytes()
assert hashlib.sha256(master_raw).hexdigest() == publication["master"]["rgbaNpy"]["sha256"]
master = np.load(io.BytesIO(master_raw), allow_pickle=False)
assert master.shape == (2048, 2048, 4) and master.dtype == np.uint8
assert np.all((master[:, :, 3] == 0) | (master[:, :, 3] == 255))
assert not np.any(master[:, :, :3][master[:, :, 3] == 0])
files = [Path(__file__), manifest_path, master_path,
         ROOT / "data-pipelines/deep-sky/prepared_rgb_observation.py",
         ROOT / "data-pipelines/deep-sky/prepared_rgb_tan.py", ROOT / "data-pipelines/deep-sky/sdss_gri_tan.py",
         ROOT / "data-pipelines/deep-sky/sdss_source_stencil.py",
         ROOT / "apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts",
         Path(astropy.wcs.__file__), Path(np.__file__), Path(sys.executable)]
protected = json.loads((ROOT / ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json").read_text())
files += [ROOT / row["path"] for row in protected]
files += [publication_dir / asset["file"] for asset in publication["levels"].values()]
before = [identity(path) for path in files]
for row in protected:
    assert identity(ROOT / row["path"])["sha256"] == row["sha256"]
(OUT / "inputs-before.json").write_text(json.dumps(before, indent=2) + "\n")
(OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())
g = publication["source"]["nominalAvm"]
geometry = NominalAvmGeometry(tuple(g["referenceDimension"]), tuple(g["referencePixel"]), tuple(g["referenceValue"]),
    tuple(g["scale"]), g["rotation"], tuple(g["decodedShapeWidthHeight"]), g["resizeCommonXFactor"], g["resizeYFactor"],
    tuple(g["crpixFitsOneBased"]), tuple(g["cdeltDegrees"]), "", g["spatialNotes"], g["spatialQuality"])
source_wcs = geometry.new_wcs()

def basis(ra_deg, dec_deg):
    ra, dec = np.radians([ra_deg, dec_deg])
    return (np.array([math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec)]),
            np.array([-math.sin(ra), math.cos(ra), 0]),
            np.array([-math.sin(dec) * math.cos(ra), -math.sin(dec) * math.sin(ra), math.cos(dec)]))

source_center, east, north = basis(*g["referenceValue"])
inverse_cd = np.linalg.inv(source_wcs.pixel_scale_matrix)
width, height = g["decodedShapeWidthHeight"]
rows = np.vstack([(inverse_cd[0, 0] * east + inverse_cd[0, 1] * north) * 180 / math.pi + (g["crpixFitsOneBased"][0] - 1) * source_center,
                  (inverse_cd[1, 0] * east + inverse_cd[1, 1] * north) * 180 / math.pi + (g["crpixFitsOneBased"][1] - 1) * source_center,
                  source_center])
rows[0] /= width - 1; rows[1] /= height - 1
center = publication["center"]
master_center, master_east, master_north = basis(center["raDeg"], center["decDeg"])
diameter = 2 * math.tan(math.radians(publication["master"]["fieldDegrees"]) / 2)
master_rows = np.vstack([.5 * master_center - master_east / diameter,
                         .5 * master_center - master_north / diameter, master_center])

def rays(ra, dec):
    ra, dec = np.radians(ra), np.radians(dec)
    return np.stack([np.cos(dec) * np.cos(ra), np.cos(dec) * np.sin(ra), np.sin(dec)], axis=-1)

def uv_for(matrix, ray):
    transformed = ray @ matrix.T
    return transformed[..., :2] / transformed[..., 2:]

def edge_weight(uv):
    # The existing W3 normalized 8% window is a comparison candidate only.
    edge = np.minimum(uv, 1 - uv)
    t = np.clip(edge / .08, 0, 1)
    return np.prod(t * t * (3 - 2 * t), axis=-1)

max_source_residual = max_master_residual = 0.
positive_outside = 0
for start in range(0, 2048, 128):
    yy, xx = np.mgrid[start:min(start + 128, 2048), :2048]
    world = target_tan(center, 2048, publication["master"]["fieldDegrees"]).all_pix2world(xx, 2047 - yy, 0)
    ray = rays(*world); uv = uv_for(rows, ray)
    sx, sy = source_wcs.all_world2pix(*world, 0)
    max_source_residual = max(max_source_residual, float(np.max(np.abs(uv - np.stack([sx / (width - 1), sy / (height - 1)], -1)))) * max(width - 1, height - 1))
    master_uv = uv_for(master_rows, ray)
    expected = np.stack([(xx + .5) / 2048, (yy + .5) / 2048], -1)
    max_master_residual = max(max_master_residual, float(np.max(np.abs(master_uv - expected))) * 2048)
    supported = master[start:min(start + 128, 2048), :, 3] == 255
    positive_outside += int(np.sum(supported & (np.any(uv < 0, axis=-1) | np.any(uv > 1, axis=-1))))
assert max_source_residual < 1e-5 and max_master_residual < 1e-5 and positive_outside == 0

sheet = Image.new("RGB", (3 * 512, 3 * 548), (3, 7, 16)); draw = ImageDraw.Draw(sheet)
stats = []
for row_index, (level, asset) in enumerate(publication["levels"].items()):
    payload = (publication_dir / asset["file"]).read_bytes()
    assert len(payload) == asset["bytes"] and hashlib.sha256(payload).hexdigest() == asset["sha256"]
    with Image.open(io.BytesIO(payload)) as image: rgba = np.asarray(image.convert("RGBA"))
    yy, xx = np.mgrid[:512, :512]
    world = target_tan(center, 512, asset["fieldDegrees"]).all_pix2world(xx, 511 - yy, 0)
    ray = rays(*world)
    rgb = rgba[:, :, :3].astype(np.float64) / 255
    luma = rgb @ np.array([.2126, .7152, .0722])
    gain = luma * luma * (3 - 2 * luma)
    feather = edge_weight(uv_for(rows, ray)) * edge_weight(uv_for(master_rows, ray))
    supported = rgba[:, :, 3] == 255
    luminance = luma[supported]
    stats.append({"level": level, "sourceLumaPercentiles": np.percentile(luminance, [0, 10, 50, 90, 99, 100]).tolist(),
                  "displayGainPercentiles": np.percentile(gain[supported], [0, 10, 50, 90, 99, 100]).tolist(),
                  "featherBelowOneSupportedPixels": int(np.sum(supported & (feather < 1))),
                  "inputAlphaSha256": hashlib.sha256(rgba[:, :, 3].tobytes()).hexdigest()})
    for col, (label, factor) in enumerate([("Original display", np.ones_like(gain)), ("W3 luma gain", gain), ("Luma + source/mother edges", gain * feather)]):
        # Display-only preview over a declared flat synthetic background. This
        # is not a renderer, alpha contract, availability, registration or adoption.
        contribution = rgb.max(axis=-1) * factor * (rgba[:, :, 3] / 255)
        composite = rgb * (factor * rgba[:, :, 3] / 255)[..., None] + np.array([3, 7, 16]) / 255 * (1 - contribution)[..., None]
        preview = Image.fromarray(np.rint(np.clip(composite, 0, 1) * 255).astype(np.uint8))
        sheet.paste(preview, (col * 512, row_index * 548 + 30)); draw.text((col * 512 + 8, row_index * 548 + 6), level + ": " + label, fill=(230, 230, 230))
sheet.save(OUT / "display-comparison.png")
after = [identity(path) for path in files]
assert before == after
(OUT / "inputs-after.json").write_text(json.dumps(after, indent=2) + "\n")
result = {"status": "PASSED_BOUNDED_FOOTPRINT_DISPLAY_COMPARISON_NOT_ADOPTED", "nominalSourceRows": rows.tolist(),
          "masterRows": master_rows.tolist(), "maxSourceNominalResidualPixels": max_source_residual,
          "maxMasterResidualPixels": max_master_residual, "opaqueMasterSamplesOutsideSourceFootprint": positive_outside,
          "stats": stats, "inputs": len(before), "beforeAfterExact": True, "python": sys.version, "astropy": astropy.__version__,
          "comparison": identity(OUT / "display-comparison.png"), "edgeWidth": .08,
          "scope": "Cached original master/three PNGs, analytic homogeneous source/mother footprints versus original nominal WCS, display-only existing-W3 tone/window comparison on synthetic background. No source RGB/alpha/validity/publication changes, JPEG decode/download, renderer/GPU/native/ordinary adoption, physical astrometry/colour/PSF or quality/capacity acceptance."}
(OUT / "result.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"status": result["status"], "sourceResidualPx": max_source_residual, "masterResidualPx": max_master_residual,
                  "opaqueOutside": positive_outside, "inputCount": len(before), "result": identity(OUT / "result.json")}))
