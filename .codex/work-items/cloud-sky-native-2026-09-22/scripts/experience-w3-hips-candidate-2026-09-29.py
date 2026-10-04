"""Bounded M42 source-bound candidate, outside publication and release paths.

Astropy owns TAN geometry/FITS; the already adopted healpix-ts owns spherical
cell lookup. Missing measurements remain transparent; no brightness mask,
inpainting, detector-band editing, or claim of artifact-free valid coverage.
"""
from pathlib import Path
import hashlib
import io
import json
import subprocess
import sys
import warnings

ROOT = Path(__file__).resolve().parents[4]
OUTPUT = ROOT / "output/allwise-w3-hips-0929"
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
from astropy.io import fits
from astropy.wcs import WCS
import numpy as np
from PIL import Image


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def geometry_plan():
    result_path = OUTPUT / "candidate-plan.json"
    assert not result_path.exists(), "preserve_previous_candidate_plan"
    manifest = json.loads((ROOT / "workers/miniapp-api/assets/deep-sky/manifest.json").read_text(encoding="utf-8"))
    entry = next(row for row in manifest["entries"] if row["objectRef"] == "M:42")
    profiles = []
    for level, original in entry["levels"].items():
        n, field = original["pixels"], original["fieldDegrees"]
        target = WCS(naxis=2)
        target.wcs.ctype = ["RA---TAN", "DEC--TAN"]
        target.wcs.crval = [entry["center"]["raDeg"], entry["center"]["decDeg"]]
        target.wcs.crpix = [n / 2, n / 2]
        step = 2 * np.tan(np.deg2rad(field) / 2) / n
        target.wcs.cdelt = np.rad2deg([-step, step])
        y, x = np.mgrid[0:n, 0:n]
        ra, dec = target.all_pix2world(x, n - 1 - y, 0)
        coordinates = np.stack([ra, dec], axis=-1).astype("<f8")
        coordinate_file = f"m42-{level.lower()}-world.bin"
        (OUTPUT / coordinate_file).write_bytes(coordinates.tobytes())
        # First available source pixel no coarser than the requested TAN step.
        source_order = min(8, max(0, int(np.ceil(np.log2(np.sqrt(np.pi / 3) / (512 * step))))))
        profiles.append({"level": level, "pixels": n, "fieldDegrees": field,
                         "sourceOrder": source_order, "worldFile": coordinate_file,
                         "worldSha256": sha(coordinates.tobytes()),
                         "wcsHeader": dict(target.to_header()), "original": original})
    plan = {"scope": "M42 three-level local candidate; not adopted/published or device accepted",
            "objectRef": entry["objectRef"], "center": entry["center"],
            "source": "https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/W3",
            "tileWidth": 512, "profiles": profiles}
    result_path.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    subprocess.run(["node", str(Path(__file__).with_suffix(".mjs")), str(result_path)], cwd=ROOT, check=True)


def paired_analysis():
    result_path = OUTPUT / "paired-analysis.json"
    assert not result_path.exists(), "preserve_previous_pair_analysis"
    raw = (OUTPUT / "m42-tile.fits").read_bytes()
    with warnings.catch_warnings(record=True) as notices:
        warnings.simplefilter("always")
        with fits.open(io.BytesIO(raw), memmap=False) as hdus:
            data = np.array(hdus[0].data, copy=True)
            offset = hdus[0].fileinfo()["datLoc"]
    jpeg = np.asarray(Image.open(OUTPUT / "m42-tile.jpg").convert("L"))
    measurements = {}
    for name, display_data in [("wrongFitsRowDirection", data), ("fitsRowsFlippedToJpeg", data[::-1])]:
        absent = ~np.isfinite(display_data)
        measurements[name] = {"missing": int(absent.sum()), "missingJpegPercentiles":
                              np.percentile(jpeg[absent], [0, 50, 90, 99, 100]).tolist(),
                              "missingAboveSeven": int((jpeg[absent] > 7).sum())}
    assert measurements["fitsRowsFlippedToJpeg"]["missingAboveSeven"] == 0
    assert measurements["wrongFitsRowDirection"]["missingAboveSeven"] > 10000
    # Direct source pairing proves orientation, not the old CDS cutout sampler.
    diagnostic = np.repeat(jpeg[..., None], 3, axis=-1)
    diagnostic[~np.isfinite(data[::-1])] = [255, 0, 255]
    Image.fromarray(diagnostic).save(OUTPUT / "m42-paired-hips-missing-diagnostic.png")
    result = {"fitsSha256": sha(raw), "jpegSha256": sha((OUTPUT / "m42-tile.jpg").read_bytes()),
              "fileBytes": len(raw), "dataOffset": offset, "completeArrayBytes": data.nbytes,
              "completeArrayReceived": len(raw) >= offset + data.nbytes,
              "missingEndPaddingBytes": (offset + data.nbytes + 2879) // 2880 * 2880 - len(raw),
              "readerWarnings": [str(n.message) for n in notices], "measurements": measurements,
              "limits": "One exact HiPS tile; not the original Atlas coverage map, full TAN cutout or absolute astrometry"}
    result_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result))


if __name__ == "__main__":
    assert sys.argv[1:] in [["plan"], ["plan-corrected"]], "bounded plan/analysis only; no implicit downloads or publication"
    if sys.argv[1:] == ["plan"]:
        paired_analysis()
    else:
        OUTPUT = OUTPUT / "candidate-axes-corrected"
        OUTPUT.mkdir(parents=True, exist_ok=True)
    geometry_plan()
