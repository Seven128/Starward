"""One source-RGB master and three geometric tiers from cached AVM M51 data.

Nominal uncorrected source astrometry only. Geometric RGB support is not a
scientific availability mask. No new requests, source colours, publication or
runtime changes; this is an offline observation-image candidate.
"""
from __future__ import annotations
import argparse
import importlib.util
import io
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
LIB = ROOT / "output/pyavm-metadata-trial-1002-r1/lib"
sys.path[:0] = [str(LIB), str(ROOT / "data-pipelines/deep-sky"),
               str(ROOT / "output/allwise-w3-atlas-0929/python-deps")]
import numpy as np
from PIL import Image
from pyavm import AVM
from sdss_gri_tan import bilinear_samples, target_tan, premultiplied_rgba_box

spec = importlib.util.spec_from_file_location("core_diagnostic_binding_helpers",
    TASK / "scripts/experience-sdss-core-quality-diagnosis-2026-10-02.py")
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
bound, save, inventory = common.bound, common.save, common.inventory
AVM_NS = "{http://www.communicatingastronomy.org/avm/1.0/}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    assert not output.exists() and output.is_relative_to((ROOT / "output").resolve())
    source = ROOT / "output/hubble-m51-source-quality-trial-1002-r1"
    image_path = source / "heic0506a.jpg"
    assert bound(image_path)["sha256"] == "7b13a932bcf54653c591d369e8d1c4cbdbeb693ecc468242facb239fde52e4c2"
    assert bound(source / "result.json")["sha256"] == "2497653ac6946c0b21e77a71539ca8d75cc7c0332de523a41b91e451d01335c9"
    candidate = ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json"
    assert bound(candidate)["sha256"] == "73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52"
    c = json.loads(candidate.read_bytes())
    assets = inventory(ROOT / "workers/miniapp-api/assets/deep-sky")
    frozen_source = inventory(source)
    frozen_candidate = inventory(candidate.parent)
    owners = [ROOT / "data-pipelines/deep-sky" / name for name in ("sdss_gri_tan.py", "sdss_source_stencil.py")]
    owners_before = [bound(p) for p in owners]
    preserved = json.loads((TASK / "tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    assert all(bound(ROOT / r["path"])["sha256"] == r["sha256"] for r in preserved)
    output.mkdir()
    (output / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    root = ET.fromstring((source / "embedded-xmp.xml").read_bytes())
    # PyAVM0.9.9 rejects this publisher's empty optional rdf:Alt/rdf:li as
    # None instead of text. Normalize only the proved empty Spectral.Notes;
    # retain the raw packet and the meaningful spatial-uncertainty note.
    removed = []
    for parent in root.iter():
        for child in list(parent):
            if child.tag == AVM_NS + "Spectral.Notes":
                assert all(not (e.text or "").strip() for e in child.iter())
                removed.append(ET.tostring(child, encoding="unicode"))
                parent.remove(child)
    assert len(removed) == 1
    normalized = ET.tostring(root, encoding="utf-8")
    (output / "task-normalized-xmp.xml").write_bytes(normalized)
    avm = AVM.from_xml(normalized)
    assert avm.Spatial.CoordinateFrame == "ICRS" and avm.Spatial.CoordsystemProjection == "TAN"
    assert avm.Spatial.Equinox == "J2000" and avm.ResourceID == "heic0506a"
    with Image.open(image_path) as img:
        size = img.size
        rgb = np.array(img.convert("RGB"), dtype=np.float32)
    assert size == (4000, 2776)
    source_wcs = avm.to_wcs(use_full_header=False, target_shape=size)
    assert source_wcs.wcs.radesys == "ICRS"
    assert avm.Spatial.Notes and "5 arcsec" in avm.Spatial.Notes
    # AVM/FITS axes use bottom-up pixel y; encoded JPEG arrays use top first.
    native_rgb = rgb[::-1]
    n = c["pixels"]
    target = target_tan(c["center"], n, c["fieldDegrees"])
    master = np.zeros((n, n, 4), dtype=np.uint8)
    for start in range(0, n, 128):
        end = min(n, start + 128)
        yy, xx = np.mgrid[start:end, 0:n]
        accum = np.zeros((*xx.shape, 3), dtype=np.float64)
        support = np.ones(xx.shape, dtype=np.bool_)
        # A fixed2x2 target-pixel quadrature reduces raw point-sampling
        # aliasing. The shared lower-level stencil remains identical.
        for dy, dx in ((-.25, -.25), (-.25, .25), (.25, -.25), (.25, .25)):
            ra, dec = target.all_pix2world(xx + dx, n - 1 - yy - dy, 0)
            sx, sy = source_wcs.all_world2pix(ra, dec, 0)
            for band in range(3):
                value, geometric, finite = bilinear_samples(native_rgb[:, :, band], sx, sy)
                support &= geometric & finite
                accum[:, :, band] += np.where(geometric & finite, value, 0)
        master[start:end, :, :3] = np.rint(accum / 4).astype(np.uint8)
        master[start:end, :, :3][~support] = 0
        master[start:end, :, 3] = support.astype(np.uint8) * 255
        print(json.dumps({"completedMasterRows": end, "totalRows": n}), flush=True)
    master_record = common.save_array(output / "nominal-registered-display-master.npy", master)
    levels = {}
    for level, metadata in c["levels"].items():
        x0, y0, x1, y1 = metadata["masterCrop"]["boundsXYExclusive"]
        crop = master[y0:y1, x0:x1]
        rgba = premultiplied_rgba_box(crop, metadata["masterCrop"]["boxFactor"])
        path = output / ("M-51-" + level.lower() + "-nominal-avm.png")
        Image.fromarray(rgba).save(path, format="PNG")
        with Image.open(path) as img:
            decoded = np.array(img.convert("RGBA"))
        assert decoded.tobytes() == rgba.tobytes()
        levels[level] = {"encoded": bound(path), "decoded": common.array_identity(decoded),
            "targetGeometry": {k: metadata[k] for k in ("pixels", "fieldDegrees", "wcsHeader", "masterCrop")},
            "geometricSourceMasterSupportPixels": int((crop[:, :, 3] > 0).sum()),
            "totalSourceMasterCropPixels": int(crop.shape[0] * crop.shape[1]),
            "alphaPixels": {"opaque": int((rgba[:, :, 3] == 255).sum()), "partial": int(((rgba[:, :, 3] > 0) & (rgba[:, :, 3] < 255)).sum()),
                            "zero": int((rgba[:, :, 3] == 0).sum())},
            "alphaMeaning": "Area fraction of complete source-image geometric stencils; scientific sample availability remains UNKNOWN"}
    assert frozen_source == inventory(source) and frozen_candidate == inventory(candidate.parent)
    assert assets == inventory(ROOT / "workers/miniapp-api/assets/deep-sky")
    assert owners_before == [bound(p) for p in owners]
    assert all(bound(ROOT / r["path"])["sha256"] == r["sha256"] for r in preserved)
    result = {"scope": __doc__, "requests": 0, "source": bound(image_path),
        "metadataNormalization": {"removedOnlyEmptyOptionalSpectralNotes": True, "removedXml": removed,
                                  "preservedRawXmp": bound(source / "embedded-xmp.xml"), "derivedXml": bound(output / "task-normalized-xmp.xml")},
        "library": {"package": "pyavm", "version": "0.9.9", "isolatedAcquisition": bound(LIB.parent / "acquisition.json"),
                    "license": "MIT with included BSD3 notices; no production dependency adoption"},
        "nominalSourceWcs": dict(source_wcs.to_header()), "spatialNotes": avm.Spatial.Notes,
        "originalReferenceDimension": avm.Spatial.ReferenceDimension, "decodedSourceShapeWidthHeight": list(size),
        "sourceCredit": "NASA, ESA, S. Beckwith (STScI), and The Hubble Heritage Team (STScI/AURA)",
        "master": master_record, "levels": levels, "scientificPixelAvailability": "UNKNOWN",
        "colourMeaning": "Retained published B/V/H-alpha+Nii/I observation composite; encoded-RGB interpolation/box, not calibrated flux/radiance",
        "registration": "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM", "imageQualityAdoption": "UNADOPTED",
        "protectedSourceCandidateOwners201AssetsAndSixRetainedUnchanged": True,
        "limitations": ["Publisher explicitly warns of approximately5arcsec reference offset; actual star matching is required.",
            "Geometric JPEG coverage cannot certify exposure/measurement completeness or a scientific mask.",
            "PyAVM0.9.9 scales with its declared common x factor and CRPIX multiplication; coordinate-origin/resizing convention needs independent review.",
            "No source correction/sharpening, source mixing, painted attribution, immutable publication or target/native quality proof."]}
    save(output / "result.json", result)
    save(output / "binding.json", {"script": bound(Path(__file__)), "ownersBefore": owners_before,
        "sourceBefore": frozen_source, "candidateBefore": frozen_candidate, "published201": assets,
        "sixRetained": preserved, "outputsBeforeBinding": inventory(output)})
    print(json.dumps({"result": bound(output / "result.json"), "binding": bound(output / "binding.json")}), flush=True)


if __name__ == "__main__":
    main()
