"""One directly adopted HiPS FITS/JPEG tile, to bind source validity evidence."""
from pathlib import Path
import hashlib
import io
import json
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[4]
OUTPUT = ROOT / "output/allwise-w3-hips-0929"
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
from astropy.io import fits
import numpy as np
from PIL import Image

SOURCE = "https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/W3"
TILE = "Norder8/Dir340000/Npix343034"


def fetch(url, maximum):
    with urllib.request.urlopen(urllib.request.Request(url, headers={
        "User-Agent": "Starward-bounded-HiPS-validity/1.0"}), timeout=25) as response:
        assert response.status == 200
        raw = response.read(maximum + 1)
        assert 0 < len(raw) <= maximum, "source_response_exceeds_trial_limit"
        return raw


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    result_path = OUTPUT / "input-result.json"
    assert not result_path.exists(), "preserve_previous_source_trial"
    result = {"scope": "One actual adopted HiPS tile, no new published pixels or all-sky mirror", "order": 8, "pixel": 343034, "files": []}
    for name, suffix, maximum in [("properties", None, 80_000), ("m42-tile.fits", ".fits", 1_200_000), ("m42-tile.jpg", ".jpg", 400_000)]:
        url = f"{SOURCE}/properties" if suffix is None else f"{SOURCE}/{TILE}{suffix}"
        metadata = {"file": name, "url": url}
        try:
            print(f"M42 HiPS: one {name} request", flush=True)
            raw = fetch(url, maximum)
            (OUTPUT / name).write_bytes(raw)
            metadata.update(state="RECEIVED", bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
            if suffix == ".fits":
                with fits.open(io.BytesIO(raw), memmap=False) as hdus:
                    hdus.verify("exception")
                    data = hdus[0].data
                    assert data.shape == (512, 512), f"unexpected_tile_shape:{data.shape}"
                    metadata.update(shape=list(data.shape), nonfinite=int((~np.isfinite(data)).sum()),
                                    finiteRange=[float(np.nanmin(data)), float(np.nanmax(data))],
                                    header=dict(hdus[0].header))
            if suffix == ".jpg":
                with Image.open(io.BytesIO(raw)) as image:
                    assert image.size == (512, 512) and image.format == "JPEG"
        except Exception as error:
            metadata.update(state="UNAVAILABLE", error=f"{type(error).__name__}: {error}")
        result["files"].append(metadata)
        result_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    assert all(file["state"] == "RECEIVED" for file in result["files"]), "source_trial_incomplete; no automatic retry"
    print(json.dumps(result))


if __name__ == "__main__":
    main()
