"""One bounded acquisition of a public M51 observation and source/rights pages.

Research candidate only: no publication, scientific mask, sky compositing,
astrometric adoption, high-resolution original/tiles or implementation change.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import ssl
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
from PIL import Image

spec = importlib.util.spec_from_file_location("bounded_quality_fetch_helpers",
    TASK / "scripts/experience-sdss-core-quality-inputs-2026-10-02.py")
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
bind, save, inventory = common.bind, common.save, common.inventory
TARGETS = (
    ("source-page.html", "https://esahubble.org/images/heic0506a/", 1024 * 1024),
    ("rights-page.html", "https://esahubble.org/copyright/", 1024 * 1024),
    ("heic0506a.jpg", "https://cdn.esahubble.org/archives/images/publicationjpg/heic0506a.jpg", 8 * 1024 * 1024),
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    assert not output.exists() and output.is_relative_to((ROOT / "output").resolve())
    assert not list((ROOT / "output").rglob("heic0506a.jpg"))
    assets = inventory(ROOT / "workers/miniapp-api/assets/deep-sky")
    preserved = json.loads((TASK / "tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    assert all(bind(ROOT / r["path"])["sha256"] == r["sha256"] for r in preserved)
    output.mkdir()
    (output / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    receipts = []
    context = ssl.create_default_context()
    assert context.check_hostname and context.verify_mode == ssl.CERT_REQUIRED
    opener = urllib.request.build_opener(common.NoRedirect(), urllib.request.HTTPSHandler(context=context))
    for filename, url, maximum in TARGETS:
        path = output / filename
        receipt = {"url": url, "finalUrl": None, "httpStatus": None, "bytes": None,
            "sha256": None, "state": "REQUEST_STARTED", "maximumBytes": maximum,
            "socketTimeoutSeconds": 30, "automaticRetries": 0, "redirectsAllowed": False,
            "startedUtc": common.now()}
        save(output / (filename + ".request.json"), receipt)
        start = time.monotonic()
        try:
            with opener.open(urllib.request.Request(url, headers={"User-Agent": "Starward-bounded-observation-quality-research/1.0",
                    "Accept-Encoding": "identity"}), timeout=30) as response:
                receipt.update(finalUrl=response.geturl(), httpStatus=response.status,
                    contentType=response.headers.get("Content-Type"), contentLength=response.headers.get("Content-Length"))
                assert response.status == 200 and response.geturl() == url
                if receipt["contentLength"] is not None and int(receipt["contentLength"]) > maximum:
                    raise RuntimeError("declared_source_limit_exceeded")
                with path.open("xb") as stream:
                    remaining = maximum
                    while remaining:
                        data = response.read(min(65536, remaining))
                        if not data:
                            break
                        stream.write(data)
                        stream.flush()
                        remaining -= len(data)
                    if remaining == 0:
                        raise RuntimeError("hard_source_limit_reached")
            raw = bind(path)
            assert receipt["contentLength"] is None or raw["bytes"] == int(receipt["contentLength"])
            receipt.update(state="RAW_COMPLETE_UNADOPTED", raw=raw, bytes=raw["bytes"], sha256=raw["sha256"])
        except Exception as error:
            receipt.update(state="FAILED_OR_INCOMPLETE", errorType=type(error).__name__)
            if path.exists():
                receipt["partialRaw"] = bind(path)
        receipt.update(elapsedSeconds=time.monotonic() - start, finishedUtc=common.now())
        save(output / (filename + ".request.json"), receipt)
        receipts.append(receipt)
        print(json.dumps({"file": filename, "state": receipt["state"], "bytes": receipt["bytes"]}), flush=True)
        if receipt["state"] != "RAW_COMPLETE_UNADOPTED":
            save(output / "failed.json", {"scope": __doc__, "requests": receipts, "quality": "UNKNOWN"})
            return
    page = (output / "source-page.html").read_text(encoding="utf-8")
    rights = (output / "rights-page.html").read_text(encoding="utf-8")
    assert TARGETS[2][1] in page and "/copyright/" in page
    assert "creativecommons.org/licenses/by/4.0" in rights
    Image.MAX_IMAGE_PIXELS = 16_000_000
    with Image.open(output / "heic0506a.jpg") as image:
        assert image.format == "JPEG" and image.width * image.height <= 16_000_000
        width, height = image.size
        mode = image.mode
        xmp_raw = image.info.get("xmp")
        if xmp_raw is not None:
            if isinstance(xmp_raw, str):
                xmp_raw = xmp_raw.encode("utf-8")
            assert len(xmp_raw) <= 256 * 1024 and b"<!DOCTYPE" not in xmp_raw and b"<!ENTITY" not in xmp_raw
            (output / "embedded-xmp.xml").write_bytes(xmp_raw)
            xmp = ET.fromstring(xmp_raw)
            elements = [{"tag": element.tag, "text": element.text.strip() if element.text else None,
                         "attributes": element.attrib} for element in xmp.iter()]
        else:
            elements = None
        image.load()
        rgb = image.convert("RGB")
        decoded = {"width": width, "height": height, "mode": mode, "rgbBytes": width * height * 3,
                   "rgbSha256": hashlib.sha256(rgb.tobytes()).hexdigest()}
    assert assets == inventory(ROOT / "workers/miniapp-api/assets/deep-sky")
    assert all(bind(ROOT / r["path"])["sha256"] == r["sha256"] for r in preserved)
    result = {"scope": __doc__, "requests": receipts, "decoded": decoded,
        "embeddedXmpElements": elements,
        "scientificPixelAvailability": "UNKNOWN", "astrometricAccuracy": "UNVERIFIED",
        "colourMeaning": "Published historical multi-filter observation composite, not SDSS gri/calibrated flux/naked-eye appearance",
        "sourceQuality": "UNADOPTED", "published201AndSixRetainedUnchanged": True}
    save(output / "result.json", result)
    save(output / "binding.json", {"script": bind(Path(__file__)), "outputsBeforeBinding": inventory(output),
                                   "assetsBefore": assets, "sixRetained": preserved})
    print(json.dumps({"result": bind(output / "result.json"), "binding": bind(output / "binding.json"), "decoded": decoded}), flush=True)


if __name__ == "__main__":
    main()
