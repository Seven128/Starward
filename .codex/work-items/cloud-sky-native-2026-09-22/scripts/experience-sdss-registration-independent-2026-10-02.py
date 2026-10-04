"""Independent readback of cached published TAN fixture; no acquisition/output overwrite."""
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
fixture_path = ROOT / "output/sdss-science-registration-fixture-1002-r1/fixture.json"
publication = json.loads(source.read_bytes())
fixture = json.loads(fixture_path.read_bytes())
assert hashlib.sha256(source.read_bytes()).hexdigest() == fixture["manifestSha256"]
assert publication["center"] == fixture["center"]
assert publication["publicationHash"] == fixture["publicationHash"]
assert astropy.__version__ == fixture["astropyVersion"] == "8.0.1"
rows = []
for row in fixture["rows"]:
    asset = publication["levels"][row["level"]]
    for key, value in fixture["levels"][row["level"]].items():
        assert asset[key] == value
    # Derive coordinates from actual normalized encoded texel coordinates;
    # FITS origin=0 and reversed PNG rows differ from the author's origin=1.
    x = row["uv"][0] * asset["pixels"] - .5
    y = (1 - row["uv"][1]) * asset["pixels"] - .5
    scale = np.rad2deg(2 * np.tan(np.deg2rad(asset["fieldDegrees"]) / 2) / asset["pixels"])
    wcs = WCS(naxis=2)
    wcs.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    wcs.wcs.radesys = "ICRS"
    wcs.wcs.crval = [publication["center"]["raDeg"], publication["center"]["decDeg"]]
    wcs.wcs.crpix = [asset["crpixFitsOneBased"]] * 2
    wcs.wcs.cdelt = [-scale, scale]
    ra, dec = wcs.all_pix2world([[x, y]], 0)[0]
    errors = [abs(float(ra) - row["raDeg"]), abs(float(dec) - row["decDeg"])]
    assert max(errors) < 1e-12
    rows.append({"level": row["level"], "uv": row["uv"], "raDeg": float(ra),
                 "decDeg": float(dec), "maxErrorDegrees": max(errors)})
assert len(rows) == 27
loaded = []
seen = set()
for module in tuple(sys.modules.values()):
    file = getattr(module, "__file__", None)
    if not file:
        continue
    path = Path(file)
    if not path.is_file():
        continue
    path = path.resolve()
    if path in seen:
        continue
    seen.add(path)
    raw = path.read_bytes()
    loaded.append({"path": str(path), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()})
print(json.dumps({"status": "ACTUAL_ASTROPY_TAN_FIXTURE_READBACK_PASS", "astropyVersion": astropy.__version__,
                  "rows": rows, "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                  "fixtureSha256": hashlib.sha256(fixture_path.read_bytes()).hexdigest(),
                  "actualLoadedModuleBindings": loaded}, allow_nan=False))
