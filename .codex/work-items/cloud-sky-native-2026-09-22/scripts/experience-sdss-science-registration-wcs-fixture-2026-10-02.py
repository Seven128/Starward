"""Cached admitted publication -> independent linear TAN coordinate fixture.

This reproduces the *published approximation*, not original SDSS astrometric
accuracy. No FITS, reprojection, RGB processing, installation or network access.
"""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / "output/allwise-w3-atlas-0929/python-deps")]
import astropy
from astropy.wcs import WCS
import numpy as np

source = ROOT / "output/sdss-science-optical-writer-1002-r1/publication/manifest.json"
raw = source.read_bytes()
source_sha = hashlib.sha256(raw).hexdigest()
assert source_sha == "3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5"
publication = json.loads(raw)
output = ROOT / "output/sdss-science-registration-fixture-1002-r1"
output.mkdir(exist_ok=False)

rows = []
for level in ("OVERVIEW", "MEDIUM", "DETAIL"):
    asset = publication["levels"][level]
    pixels, crpix = asset["pixels"], asset["crpixFitsOneBased"]
    tangent_scale_deg = 2 * np.tan(np.deg2rad(asset["fieldDegrees"]) / 2) / pixels * 180 / np.pi
    wcs = WCS(naxis=2)
    wcs.wcs.crpix = [crpix, crpix]
    wcs.wcs.crval = [publication["center"]["raDeg"], publication["center"]["decDeg"]]
    wcs.wcs.cdelt = [-tangent_scale_deg, tangent_scale_deg]
    wcs.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    for x in (0.0, 255.5, 511.0):
        for y in (0.0, 255.5, 511.0):
            # astropy origin=1 uses FITS coordinates; PNG rows are reversed.
            ra, dec = wcs.all_pix2world([[x + 1, pixels - y]], 1)[0]
            rows.append({"level": level, "uv": [(x + .5) / pixels, (y + .5) / pixels],
                         "raDeg": float(ra), "decDeg": float(dec)})

fixture = {"reference": "Published primary-linear TAN approximation; not source WCS accuracy",
           "astropyVersion": astropy.__version__, "manifestSha256": source_sha,
           "publicationHash": publication["publicationHash"], "center": publication["center"],
           "levels": {level: {key: value for key, value in asset.items()
                               if key in ("pixels", "fieldDegrees", "crpixFitsOneBased", "sampleAvailability")}
                      for level, asset in publication["levels"].items()}, "rows": rows}
encoded = (json.dumps(fixture, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode()
(output / "fixture.json").write_bytes(encoded)
assert hashlib.sha256(source.read_bytes()).hexdigest() == source_sha
print(json.dumps({"output": str(output / "fixture.json"), "bytes": len(encoded),
                  "sha256": hashlib.sha256(encoded).hexdigest(), "rows": len(rows),
                  "sourcePreserved": True, "astropyVersion": astropy.__version__}))
