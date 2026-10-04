"""Read-only landmark check of the pinned 2MASS equirectangular JPEG.

SIMBAD Galactic coordinates for LMC and SMC are independent of this image.
Compare their predicted centers with alternative mirrored projections. This
checks coarse registration, not survey astrometry or photometric calibration.
"""
from pathlib import Path
import json
import math

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[3]
IMAGE = ROOT / "workers/miniapp-api/assets/deep-sky/galactic-2mass/2mass-galactic-2048x1024.jpg"
LANDMARKS = {
    "LMC": {"l": 280.4652, "b": -32.8884,
            "record": "https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=LMC"},
    "SMC": {"l": 302.8084, "b": -44.3277,
            "record": "https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Small+Magellanic+Cloud"},
}


def mean(gray: Image.Image, x: float, y: float, radius: int) -> float:
    box = (round(x - radius), round(y - radius), round(x + radius), round(y + radius))
    return ImageStat.Stat(gray.crop(box)).mean[0]


def main() -> None:
    with Image.open(IMAGE) as image:
        gray = image.convert("L")
    result = {}
    for name, item in LANDMARKS.items():
        signed_l = ((item["l"] + 180) % 360) - 180
        u, v = .5 - signed_l / 360, .5 - item["b"] / 180
        samples = {}
        for variant, (sample_u, sample_v) in {
            "expected": (u, v), "horizontal_mirror": (1-u, v),
            "vertical_mirror": (u, 1-v), "both_mirrors": (1-u, 1-v),
        }.items():
            x, y = sample_u * gray.width, sample_v * gray.height
            samples[variant] = {"x": round(x, 2), "y": round(y, 2),
                                "mean_radius_12": round(mean(gray, x, y, 12), 3),
                                "mean_radius_30": round(mean(gray, x, y, 30), 3)}
        result[name] = {"source": item["record"], "galactic_deg": [item["l"], item["b"]],
                        "uv": [u, v], "samples": samples}
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
