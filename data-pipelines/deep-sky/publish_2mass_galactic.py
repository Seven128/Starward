"""Publish the specific IPAC Cool Cosmos 2MASS equirectangular gallery image.

Input is downloaded manually from the exact URL below. Its SHA-256 prevents
silently changing to another gallery or survey product with different rights.
Run with deep-sky/requirements.txt and pass the downloaded JPEG as argv[1].
"""
from hashlib import sha256
from pathlib import Path
import json
import sys

from PIL import Image

SOURCE_URL = "https://coolcosmos.ipac.caltech.edu/system/avm_image_sqls/binaries/142/original/allsky-2mass.jpg?1373926530="
SOURCE_SHA256 = "c3a2ea0bebfe79eab5213480e3766c5437369a6da3d6f5ddec46860dfbf6a26c"
FILE = "2mass-galactic-2048x1024.jpg"
DEST = Path(__file__).resolve().parents[2] / "workers/miniapp-api/assets/deep-sky/galactic-2mass"


def main() -> None:
    source = Path(sys.argv[1])
    data = source.read_bytes()
    if sha256(data).hexdigest() != SOURCE_SHA256:
        raise ValueError("2MASS source differs from the rights-reviewed image")
    with Image.open(source) as original:
        if original.size != (9600, 4800) or original.format != "JPEG":
            raise ValueError("2MASS source projection/dimensions changed")
        image = original.convert("RGB").resize((2048, 1024), Image.Resampling.LANCZOS)
    DEST.mkdir(parents=True, exist_ok=True)
    target = DEST / FILE
    image.save(target, "JPEG", quality=88, subsampling=0, optimize=True)
    output = target.read_bytes()
    manifest = {
        "schemaVersion": "starward-2mass-galactic-v1",
        "publicationId": "2mass-coolcosmos-galactic-2048x1024-20260924",
        "source": {
            "title": "The Infrared Milky Way / 2MASS All-Sky",
            "provider": "IPAC / Cool Cosmos",
            "recordUrl": "https://coolcosmos.ipac.caltech.edu/images/142",
            "rightsUrl": "https://coolcosmos.ipac.caltech.edu/page/image_use_policy",
            "galleryRightsUrl": "https://www.ipac.caltech.edu/2mass/gallery/showcase/copyright.html",
            "credit": "2MASS/J. Carpenter, T. H. Jarrett, & R. Hurt; UMass/IPAC-Caltech/NASA/NSF",
            "sourceUrl": SOURCE_URL,
            "sourceSha256": SOURCE_SHA256,
        },
        "projection": {"kind": "equirectangular", "frame": "galactic",
                       "centerLongitudeDeg": 0, "longitudeIncreases": "left", "north": "up"},
        "image": {"file": FILE, "sha256": sha256(output).hexdigest(),
                  "bytes": len(output), "width": 2048, "height": 1024},
        "processing": "Specific IPAC 9600x4800 gallery JPEG downsampled to 2048x1024 with Pillow 12.3.0 LANCZOS and JPEG quality 88, 4:4:4; no recoloring.",
        "limitations": [
            "Historical 2MASS J/H/K near-infrared false color (1.2/1.6/2.2 micrometers), not visible-light sky or current observing conditions.",
            "Gallery visualization is not calibrated surface brightness or a high-resolution optical survey; 2048x1024 limits zoom detail.",
            "Image longitude registration follows the published Galactic-center-centered equirectangular view; physical-device rendering remains to verify.",
        ],
    }
    (DEST / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{target}: {len(output)} bytes, sha256 {manifest['image']['sha256']}")


if __name__ == "__main__":
    main()
