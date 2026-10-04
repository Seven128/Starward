"""One cached prepared-RGB admission and bounded sampler compatibility check.

No requests, source repair, master reprojection, LOD generation or publication.
Dependencies are the existing cached Python packages, not an installation.
"""
from __future__ import annotations
import argparse
import ast
from dataclasses import asdict
import hashlib
import io
import json
import math
from pathlib import Path
import sys
import types
import unittest

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
PIPELINE = ROOT / "data-pipelines/deep-sky"
LIB = ROOT / "output/pyavm-metadata-trial-1002-r1/lib"
DEPS = ROOT / "output/allwise-w3-atlas-0929/python-deps"
sys.path[:0] = [str(PIPELINE), str(LIB), str(DEPS)]

import numpy as np
from PIL import Image
import prepared_rgb_observation as owner
import sdss_gri_tan as gri
import sdss_source_stencil as stencil
import test_prepared_rgb_observation as tests


def binding(path):
    path = Path(path).resolve()
    return {"path": path.relative_to(ROOT).as_posix() if path.is_relative_to(ROOT) else path.as_posix(),
            "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def save(path, value):
    with Path(path).open("x", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2, allow_nan=False)
        handle.write("\n")


def inventory(directory):
    return [binding(path) for path in sorted(Path(directory).rglob("*"))
            if path.is_file() and "__pycache__" not in path.parts]


def pipeline_graph(initial):
    found = set()
    pending = list(initial)
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
                    local = PIPELINE / (name.split(".")[0] + ".py")
                    if local.is_file() and local not in found:
                        pending.append(local)
    return sorted(found)


def old_sampler(snapshot):
    tree = ast.parse(snapshot.read_bytes())
    function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "bilinear_samples")
    scope = {"np": np, "source_pixel_stencil": stencil.source_pixel_stencil}
    exec(compile(ast.Module(body=[function], type_ignores=[]), str(snapshot), "exec"), scope)
    return scope["bilinear_samples"]


def same_samples(before, after):
    # Compare floats by bytes, including retained NaN patterns and masks.
    return all(a.shape == b.shape and a.dtype == b.dtype and a.tobytes() == b.tobytes() for a, b in zip(before, after))


def run_suite(suite):
    log = io.StringIO()
    result = unittest.TextTestRunner(stream=log, verbosity=2).run(suite)
    return result, log.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists() or not output.is_relative_to(ROOT / "output"):
        raise RuntimeError("exclusive output required")
    output.mkdir()
    (output / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    source_directory = ROOT / "output/hubble-m51-source-quality-trial-1002-r1"
    nominal_directory = ROOT / "output/hubble-m51-nominal-projection-trial-1002-r1"
    history = ROOT / "output/prepared-rgb-observation-source-1003-r1"
    previous_gri = history / "prior-sdss-gri-tan.py.txt"
    assert binding(previous_gri)["sha256"] == "2f1fed34ca2f49913003b23a886677d197b1ab39fadb88ebfde74d5133dac58d"
    previous_stencil = history / "prior-sdss-source-stencil.py.txt"
    assert binding(previous_stencil)["sha256"] == "b2c244872f291f52a4ca3817d46d2b799bf8aa1e0c3b1bfaa8c9fab1529fecab"
    assert binding(source_directory / "result.json")["sha256"] == "2497653ac6946c0b21e77a71539ca8d75cc7c0332de523a41b91e451d01335c9"
    assert binding(nominal_directory / "result.json")["sha256"] == "a209ac6e4c10aebfaa5bb2447e20c1682836046dff1a21cacc8969003f2b7994"
    protected = json.loads((nominal_directory / "binding.json").read_bytes())["published201"]
    preserved = json.loads((TASK / "tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    for record in [*protected, *preserved]:
        assert binding(ROOT / record["path"])["sha256"] == record["sha256"]
    graph = pipeline_graph([PIPELINE / "prepared_rgb_observation.py", PIPELINE / "test_prepared_rgb_observation.py",
                            PIPELINE / "test_sdss_gri_tan.py", PIPELINE / "test_sdss_source_stencil.py"])
    # Complete selected package directories are fixed before owner/test actions.
    package_files = [path for directory in (LIB / "pyavm", LIB / "pyavm-0.9.9.dist-info",
                       DEPS / "PIL", DEPS / "numpy", DEPS / "astropy")
                     for path in directory.rglob("*") if path.is_file() and "__pycache__" not in path.parts]
    scientific_sample_path = ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/mosaic-fields/301-3699-6-100-r-science.npy"
    inputs = sorted(set(graph + package_files + [Path(sys.executable), Path(__file__), previous_gri, previous_stencil,
        PIPELINE / "requirements.txt", PIPELINE / "third-party/PyAVM-LICENSE.txt", scientific_sample_path,
        LIB.parent / "acquisition.json", ROOT / "project_context/external-capabilities.md"] +
        [ROOT / record["path"] for record in [*protected, *preserved]]))
    before = {"files": [binding(path) for path in inputs], "source": inventory(source_directory),
              "historicalNominalOutputs": inventory(nominal_directory)}
    save(output / "inputs-before.json", before)
    for path in graph:
        destination = output / "executed-owners" / path.relative_to(ROOT)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(path.read_bytes())
    try:
        suite = unittest.TestSuite(unittest.defaultTestLoader.loadTestsFromName(name)
            for name in ("test_prepared_rgb_observation", "test_sdss_source_stencil", "test_sdss_gri_tan"))
        checks, log = run_suite(suite)
        (output / "checks.log").write_text(log, encoding="utf-8")
        assert checks.wasSuccessful(), log

        source = owner.PreparedRgbSource("heic0506a",
            owner.ByteIdentity(4060187, "7b13a932bcf54653c591d369e8d1c4cbdbeb693ecc468242facb239fde52e4c2"),
            owner.ByteIdentity(10913, "cdbf74f5e358b11d6e28fa63b83144322f9340e6b5fc406ca8802b644373d52c"),
            "https://cdn.esahubble.org/archives/images/publicationjpg/heic0506a.jpg",
            "https://www.spacetelescope.org/images/heic0506a/",
            "NASA, ESA, S. Beckwith (STScI), and The Hubble Heritage Team (STScI/AURA)",
            "Creative Commons Attribution 4.0 International License", "https://creativecommons.org/licenses/by/4.0/",
            "https://esahubble.org/copyright/", "Retained published B/V/H-alpha+Nii/I composite; encoded RGB, not calibrated flux")
        observation = owner.load_prepared_rgb_observation(source_directory / "heic0506a.jpg",
            source_directory / "embedded-xmp.xml", source, max_encoded_bytes=4060187, max_decoded_pixels=4000 * 2776)
        nominal = json.loads((nominal_directory / "result.json").read_bytes())
        assert hashlib.sha256(observation.rgb_bytes).hexdigest() == "e9720f3cfcd75966deb94060b6a0711b295e094ae03c76ec1d58633a343b1710"
        assert observation.parser_xmp != observation.raw_xmp
        wcs = observation.geometry.new_wcs()
        assert dict(wcs.to_header()) == nominal["nominalSourceWcs"]
        assert observation.geometry.spatial_notes == nominal["spatialNotes"]
        with Image.open(source_directory / "heic0506a.jpg") as image:
            image.load()
            assert image.tobytes() == observation.rgb_bytes
        (output / "nominal-source-header.txt").write_text(observation.geometry.header_cards, encoding="utf-8")
        (output / "parser-normalized-xmp.xml").write_bytes(observation.parser_xmp)

        # Independent declared scale/CROTA + inverse gnomonic formula, nine
        # original native pixels. Agreement is metadata mathematics, not sky
        # matching or a new measurement of the publisher's ~5 arcsec warning.
        points = [(0., 0.), (3999., 0.), (0., 2775.), (3999., 2775.), (1999.3, 1387.2),
                  (999.5, 693.5), (2999.5, 2081.5), (1999.3485231332231, 1387.3419011936917), (10.25, 2000.75)]
        g = observation.geometry
        theta = math.radians(g.rotation)
        a0, d0 = map(math.radians, g.reference_value)
        coordinates = []
        for x, y in points:
            dx, dy = x + 1 - g.crpix[0], y + 1 - g.crpix[1]
            xi = math.radians(g.cdelt[0] * math.cos(theta) * dx - g.cdelt[1] * math.sin(theta) * dy)
            eta = math.radians(g.cdelt[0] * math.sin(theta) * dx + g.cdelt[1] * math.cos(theta) * dy)
            denom = math.cos(d0) - eta * math.sin(d0)
            expected = ((math.degrees(a0 + math.atan2(xi, denom))) % 360,
                        math.degrees(math.atan2(math.sin(d0) + eta * math.cos(d0), math.hypot(xi, denom))))
            measured = tuple(float(v) for v in wcs.all_pix2world(x, y, 0))
            error = max(abs(a - b) for a, b in zip(expected, measured))
            assert error < 1e-11
            coordinates.append({"sourceXYFitsOrigin0": [x, y], "directDeclaredTanWorld": expected,
                                "newOwnerWorld": measured, "maxDegreeDifference": error})

        # Original exact float-only sampler snapshot, not a reimplementation.
        old = old_sampler(previous_gri)
        x = np.array([0., .25, 1., 2., np.nan, -1., 0.99999999999999])
        y = np.array([0., .5, 0., 0., 0., 0., 0.5])
        floating = np.array([[0, -4, 8], [4, 8, np.nan], [12, 16, 20]], dtype=np.float32)
        assert same_samples(old(floating, x, y), gri.bilinear_samples(floating, x, y))
        assert same_samples(old(floating, np.asarray(.25), np.asarray(.5)),
                            gri.bilinear_samples(floating, np.asarray(.25), np.asarray(.5)))
        for kind in (np.float32, np.float64):
            random = np.random.default_rng(3301).normal(size=(33, 39)).astype(kind)
            random[3:5, 11] = np.nan
            xx, yy = np.meshgrid(np.linspace(-.25, 38, 71), np.linspace(-.25, 32, 65))
            assert same_samples(old(random, xx, yy), gri.bilinear_samples(random, xx, yy))
        encoded = np.arange(33 * 39, dtype=np.uint16).reshape(33, 39).astype(np.uint8)
        assert same_samples(old(encoded.astype(np.float32), xx, yy), stencil.bilinear_source_samples(encoded, xx, yy))
        overflow = np.full((2, 2), 1e100, dtype=np.float64)
        with np.errstate(over="ignore"):
            for function in (old, gri.bilinear_samples):
                with unittest.TestCase().assertRaisesRegex(RuntimeError, "^sdss_tan_finite_interpolation_overflow$"):
                    function(overflow, np.asarray(.5), np.asarray(.5))
        actual_science = np.load(scientific_sample_path, mmap_mode="r")
        sx = np.array([0., 99.25, 511.5, 1023.75, 1535.1, 2046.9, 2047., np.nan])
        sy = np.array([0., 200.5, 511.3, 1024.9, 1999., 2046.9, 1., 1.])
        actual_float_before = old(actual_science, sx, sy)
        assert same_samples(actual_float_before, gri.bilinear_samples(actual_science, sx, sy))
        with unittest.TestCase().assertRaisesRegex(RuntimeError, "sdss_tan_sampling_shape_invalid"):
            gri.bilinear_samples(encoded, xx, yy)  # Original float-only public API.

        rx = np.array([0., 1.25, 100.5, 1999.3, 2000.25, 3998.5, 3999., -.01, np.nan])
        ry = np.array([0., 1.5, 1000.75, 1387.2, 1388.25, 2774.5, 1., 0., 0.])
        rgb_samples = observation.sample_native(rx, ry)
        for channel in range(3):
            expected = old(observation.rgb_top_first[::-1, :, channel].astype(np.float32), rx, ry)
            assert expected[0].tobytes() == rgb_samples.encoded_rgb[:, channel].tobytes()
            assert np.array_equal(expected[1], rgb_samples.geometric_support)
        np.save(output / "original-coordinate-encoded-rgb.npy", rgb_samples.encoded_rgb)
        np.save(output / "original-coordinate-geometric-support.npy", rgb_samples.geometric_support)

        # Useful in-memory defect: lose the required JPEG/FITS row inversion.
        original_text = (PIPELINE / "prepared_rgb_observation.py").read_text(encoding="utf-8")
        wrong = original_text.replace("source = rgb[::-1, :, channel]", "source = rgb[:, :, channel]")
        assert wrong != original_text
        module = types.ModuleType("prepared_rgb_row_mutant")
        sys.modules[module.__name__] = module
        exec(compile(wrong, "prepared-rgb-row-mutant.py", "exec"), module.__dict__)
        actual_owner = tests.owner
        tests.owner = module
        try:
            mutation, mutation_log = run_suite(unittest.TestSuite([tests.PreparedRgbTest(
                "test_fits_row_direction_four_neighbours_and_valid_black_are_independent")]))
        finally:
            tests.owner = actual_owner
        (output / "row-direction-mutant.log").write_text(mutation_log, encoding="utf-8")
        (output / "row-direction-mutant.py.txt").write_text(wrong, encoding="utf-8")
        assert not mutation.wasSuccessful() and len(mutation.failures) == 1
        after = {"files": [binding(path) for path in inputs], "source": inventory(source_directory),
                 "historicalNominalOutputs": inventory(nominal_directory)}
        save(output / "inputs-after.json", after)
        assert before == after
        result = {"status": "PASSED_BOUNDED_OFFLINE_SOURCE_ADMISSION", "requests": 0,
            "source": asdict(source), "geometry": asdict(observation.geometry), "coordinates": coordinates,
            "decodedRgb": {"shape": list(observation.rgb_top_first.shape), "bytes": len(observation.rgb_bytes),
                           "sha256": hashlib.sha256(observation.rgb_bytes).hexdigest(), "topFirst": True,
                           "immutableBytesBacking": True}, "libraries": dict(observation.library_versions),
            "scientificAvailability": observation.scientific_availability,
            "spectralBandpass": observation.spectral_bandpass,
            "spectralCentralWavelength": observation.spectral_central_wavelength,
            "normalization": {"onlyEmptyOptionalSpectralNotesRemoved": observation.removed_empty_spectral_notes,
                              "rawXmp": asdict(source.xmp), "parserXml": binding(output / "parser-normalized-xmp.xml"),
                              "method": "validated empty node byte-span removal; all other raw XML bytes retained",
                              "historicalWholeXmlSerializedBytesInherited": False},
            "checks": {"passed": checks.testsRun, "rowFlipMutantDetected": True,
                       "noNormalizationRealParserFailureDetected": True,
                       "namespaceRegistrationCounterfactualDetected": True},
            "samplerCompatibility": {"priorOwner": binding(previous_gri), "priorStencil": binding(previous_stencil),
                "syntheticFloatGridQueriesEach": 71 * 65, "floatDtypes": ["float32", "float64"],
                "uint8ComparedToPriorExplicitFloatEncoding": True, "actualScience": binding(scientific_sample_path),
                "actualScientificQueries": 8, "actualScientificFinite": int(actual_float_before[2].sum()),
                "actualPreparedRgbQueries": 9, "allValuesAndMasksByteExact": True,
                "originalPublicFloatOnlyApiPreserved": True, "originalFiniteOverflowErrorPreserved": True},
            "sampleConversionModel": {"currentGatheredNeighborValuesForActualRgbQueries": int(rgb_samples.geometric_support.sum()) * 4 * 3,
                "rejectedPriorWholeChannelConvertedValuesPerCall": 4000 * 2776 * 3,
                "scope": "code path/count model, not process/native/server capacity or performance"},
            "preserved": {"old201": len(protected), "sixRetained": len(preserved), "sourceAndNominalInventoriesExact": True,
                          "inputsPrePostExact": True},
            "historicalNominalProducts": {"result": binding(nominal_directory / "result.json"),
                "master": nominal["master"], "recipe": "unchanged cached nominal AVM resize, 2x2 quadrature, same-master box tiers",
                "newOwnerExecutedOnHistoricalMaster": False},
            "limitations": ["No old master reprojection or new LOD/pixels/publication/runtime path.",
                "Agreement checks the declared nominal TAN arithmetic, not absolute star matches or the publisher ~5 arcsec uncertainty.",
                "RGB/JPEG geometry is not calibrated flux or scientific availability; colour/PSF/rectangular boundary remain unadopted.",
                "Selected package files/Python executable/local import graph bound; dynamic native DLL/OS/process heap not certified.",
                "Adapter source/rights facts do not approve another provider/image; visible complete credit remains a future consumer obligation."]}
        save(output / "result.json", result)
        print(json.dumps({"result": binding(output / "result.json"), "inputCount": len(inputs), "checks": checks.testsRun}))
    except Exception as error:
        save(output / "failed.json", {"type": type(error).__name__, "message": str(error)})
        raise


if __name__ == "__main__":
    main()
