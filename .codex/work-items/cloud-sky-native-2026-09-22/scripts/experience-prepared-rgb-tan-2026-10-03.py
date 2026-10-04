"""Bound checks or one fresh prepared-RGB TAN generation from cached inputs."""
from __future__ import annotations
import argparse
import ast
from dataclasses import asdict
import hashlib
import io
import json
from pathlib import Path
import sys
import traceback
import unittest

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
PIPELINE = ROOT / "data-pipelines/deep-sky"
LIB = ROOT / "output/pyavm-metadata-trial-1002-r1/lib"
DEPS = ROOT / "output/allwise-w3-atlas-0929/python-deps"
sys.path[:0] = [str(PIPELINE), str(LIB), str(DEPS)]

import numpy as np
from PIL import Image
from prepared_rgb_observation import ByteIdentity, NominalAvmGeometry, PreparedRgbSource, load_prepared_rgb_observation
import prepared_rgb_tan as owner


def bind(path):
    path = Path(path).resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix() if path.is_relative_to(ROOT) else path.as_posix(),
            "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def save(path, value):
    with Path(path).open("x", encoding="utf-8", newline="\n") as file:
        json.dump(value, file, ensure_ascii=False, indent=2, allow_nan=False)
        file.write("\n")


def inventory(directory):
    return [bind(path) for path in sorted(Path(directory).rglob("*")) if path.is_file() and "__pycache__" not in path.parts]


def graph(initial):
    found, pending = set(), list(initial)
    while pending:
        path = pending.pop().resolve()
        if path in found:
            continue
        found.add(path)
        for node in ast.walk(ast.parse(path.read_bytes())):
            names = ([node.module] if isinstance(node, ast.ImportFrom) else
                     [item.name for item in node.names] if isinstance(node, ast.Import) else [])
            for name in names:
                if name:
                    candidate = PIPELINE / (name.split(".")[0] + ".py")
                    if candidate.is_file():
                        pending.append(candidate)
    return sorted(found)


def array_record(path, array):
    with Path(path).open("xb") as file:
        np.save(file, array, allow_pickle=False)
    return bind(path) | {"shape": list(array.shape), "dtype": array.dtype.str,
                         "rawArrayBytes": array.nbytes, "rawArraySha256": hashlib.sha256(array.tobytes()).hexdigest()}


def compare(before, after):
    if before.shape != after.shape or before.dtype != after.dtype:
        raise RuntimeError("historical_comparison_shape_changed")
    different = before != after
    return {"wholeBytesExact": before.tobytes() == after.tobytes(), "differentChannels": int(different.sum()),
            "differentPixels": int(different.any(axis=2).sum()), "maxByteDelta": int(np.max(np.abs(before.astype(np.int16) - after.astype(np.int16))))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--checks-only", action="store_true")
    parser.add_argument("--cached-generation", type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists() or not output.is_relative_to(ROOT / "output"):
        raise RuntimeError("exclusive_output_required")
    output.mkdir()
    (output / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    source_directory = ROOT / "output/hubble-m51-source-quality-trial-1002-r1"
    nominal_directory = ROOT / "output/hubble-m51-nominal-projection-trial-1002-r1"
    admitted_path = ROOT / "output/prepared-rgb-observation-source-1003-r4/result.json"
    admitted = json.loads(admitted_path.read_bytes())
    if bind(admitted_path)["sha256"] != "17642f44087d8d5b604e60c4f0063883ce47dc907151df16f62c11dba638369d":
        raise RuntimeError("source_admission_receipt_changed")
    nominal = json.loads((nominal_directory / "result.json").read_bytes())
    candidate_path = ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json"
    target = json.loads(candidate_path.read_bytes())
    protected = json.loads((nominal_directory / "binding.json").read_bytes())["published201"]
    six = json.loads((TASK / "tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    for row in [*protected, *six]:
        if bind(ROOT / row["path"])["sha256"] != row["sha256"]:
            raise RuntimeError("protected_input_changed")
    local_graph = graph([PIPELINE / "prepared_rgb_tan.py", PIPELINE / "test_prepared_rgb_tan.py",
                         PIPELINE / "test_prepared_rgb_observation.py", PIPELINE / "test_sdss_source_stencil.py",
                         PIPELINE / "test_sdss_gri_tan.py"])
    packages = [path for directory in (LIB / "pyavm", LIB / "pyavm-0.9.9.dist-info", DEPS / "PIL", DEPS / "numpy", DEPS / "astropy")
                for path in directory.rglob("*") if path.is_file() and "__pycache__" not in path.parts]
    inputs = sorted(set(local_graph + packages + [Path(__file__), Path(sys.executable), admitted_path,
        candidate_path, PIPELINE / "requirements.txt", PIPELINE / "third-party/PyAVM-LICENSE.txt"] +
        [ROOT / row["path"] for row in [*protected, *six]]))
    cached = args.cached_generation.resolve() if args.cached_generation else None
    if cached and (not cached.is_relative_to(ROOT / "output") or not cached.is_dir()):
        raise RuntimeError("cached_generation_path_invalid")
    if cached:
        inputs = sorted(set(inputs + [Path(row["path"]) if Path(row["path"]).is_absolute() else ROOT / row["path"]
                                     for row in inventory(cached)]))
    before = {"files": [bind(path) for path in inputs], "source": inventory(source_directory),
              "historicalNominal": inventory(nominal_directory), "allPublishedAssets": inventory(ROOT / "workers/miniapp-api/assets/deep-sky")}
    save(output / "inputs-before.json", before)
    for path in local_graph:
        destination = output / "executed-owners" / path.relative_to(ROOT)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(path.read_bytes())
    try:
        suite = unittest.TestSuite(unittest.defaultTestLoader.loadTestsFromName(name) for name in
            ("test_prepared_rgb_tan", "test_prepared_rgb_observation", "test_sdss_source_stencil", "test_sdss_gri_tan"))
        stream = io.StringIO()
        checks = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
        (output / "checks.log").write_text(stream.getvalue(), encoding="utf-8")
        if not checks.wasSuccessful():
            raise RuntimeError("affected_checks_failed")
        result = {"status": "PASSED_BOUNDED_CHECKS_ONLY" if args.checks_only else
                  "PASSED_BOUNDED_CACHED_MASTER_VALIDATION" if cached else "PASSED_BOUNDED_PREPARED_TAN_GENERATION",
                  "requests": 0, "checks": {"run": checks.testsRun, "failures": len(checks.failures), "errors": len(checks.errors)},
                  "python": {"executable": bind(Path(sys.executable)), "version": sys.version}}
        if not args.checks_only:
            source_fields = dict(admitted["source"])
            source_fields["jpeg"] = ByteIdentity(**source_fields["jpeg"])
            source_fields["xmp"] = ByteIdentity(**source_fields["xmp"])
            source = PreparedRgbSource(**source_fields)
            if cached:
                previous = json.loads((cached / "result.json").read_bytes())
                metadata = previous["masterMetadata"]
                old_array = np.load(ROOT / previous["master"]["path"], mmap_mode="r", allow_pickle=False)
                if bind(ROOT / previous["master"]["path"]) != {key: previous["master"][key] for key in ("path", "bytes", "sha256")}:
                    raise RuntimeError("cached_master_file_identity_changed")
                if hashlib.sha256(old_array.tobytes()).hexdigest() != metadata["rgba"]["sha256"]:
                    raise RuntimeError("cached_master_rgba_identity_changed")
                geometry_fields = dict(metadata["sourceGeometry"])
                for name in ("reference_dimension", "reference_pixel", "reference_value", "scale", "decoded_shape_width_height", "crpix", "cdelt"):
                    geometry_fields[name] = tuple(geometry_fields[name])
                master = owner.PreparedRgbTanMaster(metadata["objectRef"], metadata["center"]["raDeg"], metadata["center"]["decDeg"],
                    metadata["pixels"], metadata["fieldDegrees"], old_array.tobytes(), source, NominalAvmGeometry(**geometry_fields),
                    metadata["sourceRgbSha256"], metadata["sourceRawXmpSha256"], metadata["sourceParserXmpSha256"],
                    tuple(metadata["sourceLibraryVersions"].items()), metadata["geometricSupportPixels"],
                    metadata["supportedBlackPixels"], metadata["sampling"]["chunkRows"])
                result["cachedGeneration"] = bind(cached / "result.json")
                result["sourceDecodesAndMasterReprojections"] = 0
            else:
                observation = load_prepared_rgb_observation(source_directory / "heic0506a.jpg", source_directory / "embedded-xmp.xml",
                    source, max_encoded_bytes=source.jpeg.bytes, max_decoded_pixels=4000 * 2776)
                master = owner.build_prepared_rgb_tan_master(observation, object_ref=target["objectRef"], center=target["center"],
                    pixels=target["pixels"], field_degrees=target["fieldDegrees"], chunk_rows=128)
                result["sourceDecodesAndMasterReprojections"] = 1
            products = owner.prepared_rgb_tan_products(master, output_pixels=512)
            master_array = master.rgba_top_first
            saved_master = array_record(output / "prepared-rgb-tan-master.npy", master_array)
            level_records = {}
            for product in products:
                path = output / ("M-51-" + product.level.lower() + "-prepared.png")
                path.write_bytes(product.png_bytes)
                with Image.open(path) as image:
                    rgba = np.array(image)
                if image.mode != "RGBA" or rgba.tobytes() != product.rgba_bytes:
                    raise RuntimeError("encoded_product_readback_mismatch")
                old_path = ROOT / nominal["levels"][product.level]["encoded"]["path"]
                with Image.open(old_path) as old_image:
                    old_rgba = np.array(old_image.convert("RGBA"))
                level_records[product.level] = {"file": bind(path), "metadata": product.metadata(),
                    "historicalEncodedBytesExact": old_path.read_bytes() == path.read_bytes(),
                    "wholeRgbaComparison": compare(old_rgba, rgba), "historicalFile": bind(old_path)}
            old_master = np.load(ROOT / nominal["master"]["path"], mmap_mode="r", allow_pickle=False)
            result.update({"source": asdict(source), "sourceAdmission": bind(admitted_path),
                "master": saved_master, "masterMetadata": master.metadata(), "levels": level_records,
                "historicalMaster": bind(ROOT / nominal["master"]["path"]), "wholeMasterComparison": compare(old_master, master_array),
                "logicalResidentPayload": {"sourceEncodedRgbBytes": 0 if cached else len(observation.rgb_bytes), "masterRgbaBytes": len(master.rgba_bytes),
                    "productRgbaBytes": sum(len(product.rgba_bytes) for product in products), "productPngBytes": sum(len(product.png_bytes) for product in products),
                    "chunkPixelsMaximum": min(master.pixels, master.chunk_rows) * master.pixels,
                    "wholeFloatingSourceRgbCopies": 0, "driverRssGcOrPythonObjectPeak": "UNKNOWN"},
                "limits": ["Cached validation never admits/decodes/reprojects source again; original fresh generation remains bound to its original source. Whole-byte comparisons do not adopt colour/quality or certify physical astrometry." if cached else
                    "Fresh current shared producer executes once on existing source. Whole-byte comparisons do not adopt colour/quality or certify physical astrometry.",
                    "Original publisher approximate AVM, prepared encoded composite colour and UNKNOWN scientific availability/validity retained. Geometric alpha is not a science mask.",
                    "No source correction/background/feather/sharpening/WCS fit, network request, publication/service/default/GPU/WEAPP/native or final acceptance."]})
        after = {"files": [bind(path) for path in inputs], "source": inventory(source_directory),
                 "historicalNominal": inventory(nominal_directory), "allPublishedAssets": inventory(ROOT / "workers/miniapp-api/assets/deep-sky")}
        save(output / "inputs-after.json", after)
        if before != after:
            raise RuntimeError("frozen_input_changed")
        result["protected201AndSixUnchanged"] = True
        save(output / "result.json", result)
        print(json.dumps({"result": bind(output / "result.json"), "status": result["status"], "checks": result["checks"]}), flush=True)
    except Exception as error:
        (output / "error.log").write_text(traceback.format_exc(), encoding="utf-8")
        save(output / "result.json", {"status": "FAILED", "error": str(error), "checksOnly": args.checks_only,
            "scope": "Partial exclusive generation preserved; no historical output or production asset is replaced."})
        raise


if __name__ == "__main__":
    main()
