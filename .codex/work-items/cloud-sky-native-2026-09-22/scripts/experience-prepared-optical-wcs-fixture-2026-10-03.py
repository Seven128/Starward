"""Independent nominal TAN coordinate fixture; no image decode/reprojection."""
from pathlib import Path
import hashlib
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
import astropy
from astropy.wcs import WCS

source = ROOT / "output/prepared-optical-publication-1003-r4/publication/manifest.json"
raw = source.read_bytes()
assert hashlib.sha256(raw).hexdigest() == "23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1"
manifest = json.loads(raw)
rows = []
for level, asset in manifest["levels"].items():
    w = WCS(naxis=2)
    w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    w.wcs.radesys = "ICRS"
    w.wcs.crval = [manifest["center"]["raDeg"], manifest["center"]["decDeg"]]
    w.wcs.crpix = [asset["crpixFitsOneBased"]] * 2
    step = 2 * math.tan(math.radians(asset["fieldDegrees"]) / 2) * 180 / math.pi / asset["pixels"]
    w.wcs.cdelt = [-step, step]
    for u, v in [(0, 0), (1, 0), (0, 1), (1, 1), (.5, .5), (.03, .07), (.83, .88), (.25, .75), (.61, .38)]:
        ra, dec = w.all_pix2world([[asset["pixels"] * u + .5, asset["pixels"] * (1 - v) + .5]], 1)[0]
        rows.append({"level": level, "uv": [u, v], "raDeg": float(ra), "decDeg": float(dec)})
fixture = {"scope": "Independent Astropy TAN geometry of admitted prepared product; no physical source alignment/coverage/quality certification",
           "astropyVersion": astropy.__version__, "manifestSha256": hashlib.sha256(raw).hexdigest(),
           "publicationHash": manifest["publicationHash"], "center": manifest["center"],
           "levels": manifest["levels"], "rows": rows}
output = ROOT / "apps/wechat-miniapp/src/features/sky/sky-prepared-optical-registration.fixture.json"
with output.open("x", encoding="utf-8", newline="\n") as file:
    json.dump(fixture, file, indent=2, allow_nan=False)
    file.write("\n")
print(json.dumps({"rows": len(rows), "fixtureSha256": hashlib.sha256(output.read_bytes()).hexdigest(), "sourceReprojection": 0}))
