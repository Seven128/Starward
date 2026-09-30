"""Pin the twelve order-0 AllWISE W3 HiPS JPEGs from the CDS master.

This is a deliberately bounded, low-resolution *infrared* all-sky layer. It
does not fetch higher orders, use the unclonable IRSA mirror, or provide an
optical/naked-eye Milky Way image. Existing output hashes are a lock: an
upstream change requires an explicit review and new publication identity.
"""

import argparse
import hashlib
import io
import json
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image


MASTER = "https://alasky.cds.unistra.fr/AllWISE/W3"
RECORD = "https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FallWISE%2FW3&fmt=html&get=record"
DEFAULT_OUTPUT = Path("workers/miniapp-api/assets/deep-sky/wide-field-w3")


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--refresh", action="store_true", help="Recheck the CDS master against pinned hashes")
    args = parser.parse_args()
    output: Path = args.output
    old_manifest = output / "manifest.json"
    old = json.loads(old_manifest.read_text(encoding="utf-8")) if old_manifest.exists() else None
    pinned = {tile["pixel"]: tile["sha256"] for tile in old["tiles"]} if old else {}
    tiles = []
    for pixel in range(12):
        relative = f"Norder0/Dir0/Npix{pixel}.jpg"
        url = f"{MASTER}/{relative}"
        file = output / relative
        if file.exists() and not args.refresh:
            payload = file.read_bytes()
        else:
            request = Request(url, headers={"User-Agent": "Starward-data-pipeline/1.0"})
            with urlopen(request, timeout=30) as response:
                payload = response.read(1_000_001)
        if len(payload) > 1_000_000 or payload[:2] != b"\xff\xd8" or payload[-2:] != b"\xff\xd9":
            raise ValueError(f"Invalid bounded JPEG at pixel {pixel}")
        with Image.open(io.BytesIO(payload)) as image:
            if image.format != "JPEG" or image.size != (512, 512):
                raise ValueError(f"Unexpected HiPS tile geometry at pixel {pixel}")
            image.verify()
        digest = sha(payload)
        if pixel in pinned and pinned[pixel] != digest:
            raise ValueError(f"CDS master tile {pixel} changed; review rights, imagery and publication before repinning")
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(payload)
        tiles.append({"pixel": pixel, "file": relative, "sha256": digest, "bytes": len(payload), "sourceUrl": url})

    manifest = {
        "schemaVersion": "starward-allwise-w3-wide-v1",
        "publicationId": "allwise-w3-order0-cds-2019",
        "source": {
            "title": "AllWISE W3 (12 μm) infrared HiPS, 2010 observations",
            "masterUrl": MASTER,
            "recordUrl": RECORD,
            "originalRightsUrl": "https://irsa.ipac.caltech.edu/data_use_terms.html",
            "acknowledgmentUrl": "https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec1_6b.html",
            "originalCopyright": "IPAC/NASA",
            "hipsCopyright": "CNRS/Unistra",
            "hipsLicense": "ODbL-1.0",
            "hipsLicenseUrl": "https://opendatacommons.org/licenses/odbl/1-0/",
            "hipsDoi": "10.26093/cds/aladin/na1n-03",
            "atlasDoi": "10.26131/IRSA153",
            "acknowledgment": "This distribution makes use of data products from the Wide-field Infrared Survey Explorer, a joint project of UCLA and JPL/Caltech, and NEOWISE, a project of JPL/Caltech. WISE and NEOWISE are funded by NASA.",
        },
        "processing": "Direct, unmodified JPEG tiles copied from the CDS public master; order 0 only. Starward selection and arrangement offered under ODbL-1.0.",
        "limitations": [
            "Historical 2010 12 μm infrared emission, not visible light, a live sky image or a naked-eye visibility forecast.",
            "Only twelve 512×512 order-0 tiles are published; zoomed detail, photometric intensity and optical all-sky coverage are not claimed.",
            "Original survey and tile processing may contain detector artifacts or gaps; source and derived database rights remain separately attributed.",
        ],
        "hips": {"frame": "equatorial", "order": 0, "tileWidth": 512, "tileFormat": "jpeg", "status": "public partial unclonable"},
        "tiles": tiles,
    }
    properties = "\n".join([
        "creator_did = ivo://CDS/P/allWISE/W3",
        "obs_title = AllWISE W3 (12um) from raw Atlas Images — Starward order-0 partial copy",
        "hips_version = 1.4",
        "hips_release_date = 2019-05-20T08:23Z",
        "hips_frame = equatorial",
        "hips_order = 0",
        "hips_tile_width = 512",
        "hips_tile_format = jpeg",
        "hips_status = public partial unclonable",
        "hips_license = ODbL-1.0",
        "hips_copyright = CNRS/Unistra",
        "obs_copyright = IPAC/NASA",
        "obs_regime = Infrared",
        "obs_ack = WISE and NEOWISE are funded by NASA; see manifest.json for the full acknowledgment and source.",
        "",
    ])
    manifest["propertiesSha256"] = sha(properties.encode("utf-8"))
    output.mkdir(parents=True, exist_ok=True)
    old_manifest.write_bytes((json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    (output / "properties").write_bytes(properties.encode("utf-8"))
    print(json.dumps({"tiles": len(tiles), "bytes": sum(item["bytes"] for item in tiles), "manifestSha256": sha(old_manifest.read_bytes())}))


if __name__ == "__main__":
    main()
