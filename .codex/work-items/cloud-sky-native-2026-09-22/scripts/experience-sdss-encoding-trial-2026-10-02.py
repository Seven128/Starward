"""Byte-bound offline encoding comparisons, without source or RGB-master edits.

Lossy candidates are diagnostics only; no scientific mask, publication or
runtime choice changes. PNG decoding/premultiplied error is not quality proof.
"""
from pathlib import Path
import argparse
import io
import json
import sys
ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / "output/allwise-w3-atlas-0929/python-deps"), str(ROOT / "data-pipelines/deep-sky")]
import numpy as np
from PIL import Image
from image_quality import digest, write_report


def bound(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": digest(raw)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise RuntimeError("preserve_existing_encoding_generation")
    candidate = json.loads(args.candidate.read_bytes())
    if candidate["science"]["fullTargetFieldAvailable"] is not True:
        raise RuntimeError("compare_complete_target_candidate_first")
    args.output.mkdir(parents=True)
    rows = []
    for family in ("availability", "contribution"):
        for level, metadata in candidate["harnessInput"]["levels"].items():
            asset = metadata if family == "availability" else metadata["displayContribution"]
            source = (args.candidate.parent / asset["file"]).resolve()
            source_binding = bound(source)
            if source_binding["bytes"] != asset["bytes"] or source_binding["sha256"] != asset["sha256"]:
                raise RuntimeError("candidate_image_changed")
            with Image.open(source) as image:
                image.load()
                original = np.asarray(image.convert("RGBA")).copy()
            if original.shape != (512, 512, 4):
                raise RuntimeError("unexpected_candidate_geometry")
            rgba = Image.fromarray(original)
            cases = [("rgba-lossless-optimized", rgba, "PNG", {"optimize": True, "compress_level": 9}, True),
                     ("palette256-display-trial", rgba.quantize(colors=256, method=Image.Quantize.FASTOCTREE,
                          dither=Image.Dither.NONE), "PNG", {"optimize": True, "compress_level": 9}, False)]
            if np.all(original[:, :, 3] == 255):
                cases.extend([("opaque-rgb-lossless", rgba.convert("RGB"), "PNG", {"optimize": True, "compress_level": 9}, True),
                              ("opaque-jpeg88-display-trial", rgba.convert("RGB"), "JPEG",
                               {"quality": 88, "subsampling": 0, "optimize": True, "progressive": True}, False)])
            for name, encoded, mime, options, lossless in cases:
                buffer = io.BytesIO()
                encoded.save(buffer, format=mime, **options)
                raw = buffer.getvalue()
                with Image.open(io.BytesIO(raw)) as readback:
                    readback.load()
                    result = np.asarray(readback.convert("RGBA"))
                if result.shape != original.shape or (lossless and not np.array_equal(result, original)):
                    raise RuntimeError("encoding_geometry_or_lossless_readback_failed")
                delta = result.astype(np.int16) - original.astype(np.int16)
                original_premult = original[:, :, :3].astype(np.float64) * original[:, :, 3:4] / 255
                result_premult = result[:, :, :3].astype(np.float64) * result[:, :, 3:4] / 255
                pdiff = result_premult - original_premult
                filename = f"{family}-{level.lower()}-{name}.{'png' if mime == 'PNG' else 'jpg'}"
                destination = args.output / filename
                with destination.open("xb") as handle:
                    handle.write(raw)
                rows.append({"family": family, "level": level, "variant": name, "input": source_binding,
                             "encoded": bound(destination), "format": mime, "losslessRgbaReadback": bool(np.array_equal(result, original)),
                             "byteRatioToOriginal": len(raw) / source_binding["bytes"],
                             "changedRgbaPixels": int(np.any(delta != 0, axis=2).sum()),
                             "maxChannelByteDifference": int(np.abs(delta).max()),
                             "meanAbsoluteChannelByteDifference": float(np.abs(delta).mean()),
                             "maxAlphaByteDifference": int(np.abs(delta[:, :, 3]).max()),
                             "maxPremultipliedDisplayByteDifference": float(np.abs(pdiff).max()),
                             "meanAbsolutePremultipliedDisplayByteDifference": float(np.abs(pdiff).mean()),
                             "geometry": {"pixels": 512, "fieldDegrees": metadata["fieldDegrees"], "center": candidate["harnessInput"]["center"]},
                             "adoption": "UNADOPTED; actual multi-background/native/progressive quality and whole-client resource checks still required"})
    write_report(args.output / "encoding.json", {"scope": "Offline encoding choices over one actual complete candidate; source/master/science unchanged, no publication or target performance acceptance",
        "candidate": bound(args.candidate.resolve()), "script": bound(Path(__file__).resolve()), "rows": rows,
        "limitations": ["Palette/JPEG are display lossy candidates; encoded-byte errors do not certify detail/color/alpha preservation in a real scene.",
                        "Opaque RGB/JPEG is considered only after every actual input alpha byte is 255; never remove supplied transparency.",
                        "Different families are mutually exclusive trial products; their total is not user download or cloud capacity.",
                        "Logical pixel dimensions do not measure native decode, GPU/OS peak or timing; raw science inputs remain offline."]})
    print(json.dumps({"output": str(args.output / "encoding.json"), "variants": len(rows)}))


if __name__ == "__main__":
    main()
