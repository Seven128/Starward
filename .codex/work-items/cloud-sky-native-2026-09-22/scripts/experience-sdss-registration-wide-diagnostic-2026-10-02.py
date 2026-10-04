"""Five controlled wide-TAN WCS points; real cached center, no publication adoption."""
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
assert hashlib.sha256(raw).hexdigest() == "3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5"
publication = json.loads(raw)
pixels, field, crpix = 512, 45.0, 256.5
wcs = WCS(naxis=2)
wcs.wcs.ctype = ["RA---TAN", "DEC--TAN"]
wcs.wcs.radesys = "ICRS"
wcs.wcs.crval = [publication["center"]["raDeg"], publication["center"]["decDeg"]]
wcs.wcs.crpix = [crpix, crpix]
scale = np.rad2deg(2 * np.tan(np.deg2rad(field) / 2) / pixels)
wcs.wcs.cdelt = [-scale, scale]
rows = []
for u, v in [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0), (.5, .5)]:
    ra, dec = wcs.all_pix2world([[u * pixels - .5, (1 - v) * pixels - .5]], 0)[0]
    rows.append({"uv": [u, v], "raDeg": float(ra), "decDeg": float(dec)})
assert hashlib.sha256(source.read_bytes()).hexdigest() == hashlib.sha256(raw).hexdigest()
print(json.dumps({"scope": "Controlled geometry only: original publication and hash untouched; this 45-degree field is not a published/adopted source or a coverage claim.",
                  "astropyVersion": astropy.__version__, "sourceSha256": hashlib.sha256(raw).hexdigest(),
                  "center": publication["center"], "pixels": pixels, "fieldDegrees": field,
                  "crpixFitsOneBased": crpix, "rows": rows}, allow_nan=False))
