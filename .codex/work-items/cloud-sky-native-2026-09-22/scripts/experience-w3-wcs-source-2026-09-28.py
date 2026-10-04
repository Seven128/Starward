"""One bounded FITS/JPEG pair from the already adopted source, for M42.

FITS finite samples are reported as such, not as valid measurement coverage.
JPEG bytes must match the published asset before associating this WCS trial.
"""
from pathlib import Path
import hashlib
import io
import json
import sys
import urllib.request

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
ASSETS = ROOT / "workers/miniapp-api/assets/deep-sky"
OUTPUT = ROOT / "output/playwright/cloud-sky-w3-quality-0928"


def request(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={
        "User-Agent": "Starward-W3-bounded-WCS-check/1.0"}), timeout=25) as response:
        assert response.status == 200
        return response.read()


def main():
    manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
    entry = next(item for item in manifest["entries"] if item["objectRef"] == "M:42")
    asset = entry["levels"]["DETAIL"]
    url = asset["source"]["requestUrl"]
    assert "&format=jpg&" in url and url.startswith("https://alasky.cds.unistra.fr/")
    if sys.argv[1:] == ["backup"]:
        url = url.replace("https://alasky.cds.unistra.fr/", "https://alaskybis.cds.unistra.fr/")
    else:
        assert not sys.argv[1:]
    fits_url = url.replace("&format=jpg&", "&format=fits&")
    print("M42 source WCS: FITS request", flush=True)
    raw = request(fits_url)
    print("M42 source WCS: matching JPEG request", flush=True)
    original = request(url)
    assert hashlib.sha256(original).hexdigest() == asset["sha256"], "upstream JPEG differs from pinned image"
    header = {}
    # Read scalar WCS cards from this simple primary image; Pillow owns FITS
    # image decoding. This trial deliberately does not implement a FITS reader.
    for offset in range(0, len(raw), 80):
        card = raw[offset:offset + 80].decode("ascii")
        key = card[:8].strip()
        if key == "END":
            break
        if card[8:10] == "= ":
            value = card[10:].split(" / ", 1)[0].strip()
            if value.startswith("'"):
                header[key] = value.strip("' ")
            else:
                try:
                    header[key] = float(value.replace("D", "E"))
                except ValueError:
                    header[key] = value
    with Image.open(io.BytesIO(raw)) as image:
        assert image.format == "FITS" and image.size == (asset["pixels"], asset["pixels"])
        values = np.asarray(image)
        finite = np.isfinite(values)
        samples = {"finiteFraction": float(finite.mean()), "zeroCount": int((values == 0).sum()),
                   "minMaxFinite": [float(values[finite].min()), float(values[finite].max())]}
    result = {"scope": "One unchanged published M42 JPEG and independently returned scalar FITS WCS",
              "objectRef": "M:42", "level": "DETAIL", "center": entry["center"],
              "fieldDegrees": asset["fieldDegrees"], "pixels": asset["pixels"],
              "sourceUrl": fits_url, "fitsSha256": hashlib.sha256(raw).hexdigest(), "fitsBytes": len(raw),
              "matchingJpegSha256": asset["sha256"], "header": header, "samples": samples,
              "limits": "Finite values do not certify detector validity, saturation or all 153 image coverage; this is not phone acceptance"}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "m42-detail-source.fits").write_bytes(raw)
    (OUTPUT / "m42-detail-wcs.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
