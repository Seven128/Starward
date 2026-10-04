"""Offline format/capability audit only; no quality reader adoption or network.

All inputs are frozen cached artifacts. SPAN triples are checked against raw
FITS heap descriptors, not used to generate a scientific-validity raster.
"""
from __future__ import annotations

import gzip
import hashlib
import io
import json
import re
import struct
import sys
import tarfile
from importlib.util import find_spec
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
import astropy
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS

OUT = ROOT / "output/sdss-mask-psf-capability-independent-1002-r1"
SOURCE = ROOT / "output/sdss-m51-core-quality-inputs-1002-r1"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def binding(path: Path) -> dict:
    data = path.read_bytes()
    return {"path": str(path.resolve().relative_to(ROOT)).replace("\\", "/"),
            "bytes": len(data), "sha256": digest(data)}


def write(name: str, value: object) -> None:
    path = OUT / name
    assert not path.exists(), f"refusing to overwrite {path}"
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def heap_array(raw: bytes, hdu, row_index: int, descriptor_offset: int,
               dtype: str, element_bytes: int) -> tuple[np.ndarray, dict]:
    info = hdu.fileinfo()
    data_start = info["datLoc"]
    row_bytes = int(hdu.header["NAXIS1"])
    rows = int(hdu.header["NAXIS2"])
    table_bytes = row_bytes * rows
    heap_offset = int(hdu.header.get("THEAP", table_bytes))
    pcount = int(hdu.header["PCOUNT"])
    heap_size = table_bytes + pcount - heap_offset
    assert heap_offset >= table_bytes and heap_size >= 0
    descriptor = data_start + row_index * row_bytes + descriptor_offset
    count, offset = struct.unpack_from(">ii", raw, descriptor)
    assert count >= 0 and offset >= 0 and offset + count * element_bytes <= heap_size
    start = data_start + heap_offset + offset
    end = start + count * element_bytes
    assert end <= data_start + table_bytes + pcount <= len(raw)
    payload = raw[start:end]
    return np.frombuffer(payload, dtype=dtype), {"elements": count, "heapOffset": offset,
                "payloadBytes": len(payload), "payloadSha256": digest(payload)}


def full_hdus(raw: bytes):
    assert len(raw) % 2880 == 0
    opened = fits.open(io.BytesIO(raw), memmap=False, lazy_load_hdus=False)
    opened.verify("exception")
    for hdu in opened:
        info = hdu.fileinfo()
        assert info["datLoc"] + info["datSpan"] <= len(raw)
        if hdu.data is not None and hasattr(hdu, "columns"):
            for name in hdu.columns.names:
                values = hdu.data[name]
                for value in values:
                    np.asarray(value)  # force all variable-length arrays
    return opened


def identity(header) -> dict:
    actual = {key: header.get(key) for key in ["RUN", "RERUN", "CAMCOL", "FIELD", "FILTER", "FILTERS", "PS_ID", "VERSION"]}
    assert actual["RUN"] == 3699 and actual["CAMCOL"] == 6 and actual["FIELD"] == 100
    return actual


def inspect_psf(raw: bytes) -> dict:
    hdus = full_hdus(raw)
    assert len(hdus) == 10 and hdus[0].header["FILTERS"].split() == list("ugriz")
    result = {"identity": identity(hdus[0].header), "hduCount": len(hdus), "bands": {}}
    for band, hdu in zip("ugriz", hdus[1:6]):
        assert hdu.header["NAXIS1"] == 144 and hdu.columns.formats[7].startswith("1PE")
        assert {name.lower() for name in hdu.columns.names} >= {
            "nrow_b", "ncol_b", "c", "rnrow", "rncol", "rtype", "rrows"}
        rows = []
        for row_index, row in enumerate(hdu.data):
            payload, descriptor = heap_array(raw, hdu, row_index, 124, ">f4", 4)
            values = np.asarray(row["RROWS"])
            assert np.array_equal(payload, values)
            start = hdu.fileinfo()["datLoc"] + row_index * 144 + 8
            wire_c = np.frombuffer(raw[start:start + 100], dtype=">f4").reshape(5, 5)
            assert wire_c.tobytes() == np.asarray(row["c"]).tobytes()
            nr, nc = int(row["RNROW"]), int(row["RNCOL"])
            assert len(values) == nr * nc
            assert np.isfinite(values).all()
            br, bc = int(row["nrow_b"]), int(row["ncol_b"])
            assert 0 < br <= 5 and 0 < bc <= 5 and np.asarray(row["c"]).shape == (5, 5)
            assert np.isfinite(row["c"][:br, :bc]).all()
            rows.append({"basisIndex": row_index, "nrow_b": br, "ncol_b": bc,
                         "RNROW": nr, "RNCOL": nc, "RTYPE": int(row["RTYPE"]),
                         "RROW0": int(row["RROW0"]), "RCOL0": int(row["RCOL0"]),
                         "minimum": float(values.min()), "maximum": float(values.max()),
                         "negative": int(np.count_nonzero(values < 0)),
                         "zero": int(np.count_nonzero(values == 0)),
                         "coefficientNegative": int(np.count_nonzero(row["c"] < 0)),
                         "inactiveCoefficientNonfinite": int(np.count_nonzero(~np.isfinite(row["c"]))),
                         "wireCoefficientRowMajorEqualsAstropy": True,
                         "c01": float(row["c"][0, 1]), "c10": float(row["c"][1, 0]),
                         "lambda": float(row["lambda"]), "counts": float(row["counts"]),
                         "rawDescriptor": descriptor})
        result["bands"][band] = {"columnNames": hdu.columns.names, "basisCount": len(rows),
            "ordersAreEqualInThisInput": len({(r["nrow_b"], r["ncol_b"]) for r in rows}) == 1,
            "basis": rows, "fourthBasisHasMeasuredNonzeroSamples": bool(np.any(hdu.data[3]["RROWS"] != 0))}
    result["summaryColumnNames"] = hdus[6].columns.names
    result["scope"] = "Full arrays and raw descriptors only; no spatial PSF/kernel/normalization/quality reconstruction"
    return result


def inspect_mask(raw: bytes, band: str) -> dict:
    hdus = full_hdus(raw)
    header = hdus[0].header
    assert len(hdus) == 12 and header["NPLANE"] == 10
    nr, nc = int(header["MASKROWS"]), int(header["MASKCOLS"])
    enum = []
    for row in hdus[11].data:
        enum.append({name: str(row[name]).strip() if isinstance(row[name], str) else int(row[name])
                     for name in hdus[11].columns.names})
    enum_values = [int(row["Value"]) for row in enum]
    assert enum_values == list(range(11))
    planes, offsets = [], set()
    little_endian_invalid = 0
    for index, hdu in enumerate(hdus[1:11]):
        assert hdu.header["NAXIS1"] == 44 and hdu.columns.formats[-1].startswith("1PB")
        total_spans, total_inclusive_pixels = 0, 0
        descriptors = []
        for row_index, row in enumerate(hdu.data):
            payload, descriptor = heap_array(raw, hdu, row_index, 36, "u1", 1)
            assert np.array_equal(payload, row["s"])
            nspan = int(row["nspan"])
            assert len(payload) == 6 * nspan and nspan > 0
            spans = np.frombuffer(payload.tobytes(), dtype=">i2").reshape(nspan, 3)
            y, x1, x2 = [spans[:, column].astype(np.int64) for column in range(3)]
            offsets.add((int(row["row0"]), int(row["col0"])))
            assert np.all(x1 <= x2)
            assert (int(y.min()), int(y.max()), int(x1.min()), int(x2.max())) == (
                int(row["rmin"]), int(row["rmax"]), int(row["cmin"]), int(row["cmax"]))
            count = int(np.sum(x2 - x1 + 1))
            assert count == int(row["npix"])
            assert np.all((y >= 0) & (y < nr) & (x1 >= 0) & (x2 < nc))
            wrong = np.frombuffer(payload.tobytes(), dtype="<i2").reshape(nspan, 3).astype(np.int64)
            invalid = (wrong[:, 0] < 0) | (wrong[:, 0] >= nr) | (wrong[:, 1] < 0) | (wrong[:, 2] >= nc) | (wrong[:, 1] > wrong[:, 2])
            little_endian_invalid += int(np.count_nonzero(invalid))
            total_spans += nspan
            total_inclusive_pixels += count
            descriptors.append(descriptor)
        planes.append({"hdu": index + 1, "enumValue": index, "name": enum[index]["attributeName"],
            "objectRows": len(hdu.data), "spans": total_spans,
            "inclusivePixelsSummedPerObjectNotUnion": total_inclusive_pixels,
            "heapDescriptorBindings": descriptors})
    assert little_endian_invalid > 0
    return {"identity": identity(header), "bandIdentitySource": "canonical acquired filename/URL, FILTER header absent",
        "band": band, "hduCount": len(hdus), "maskRows": nr, "maskColumns": nc,
        "declaredObjectOffsets": [list(v) for v in sorted(offsets)], "enum": enum,
        "planes": planes, "nativeLittleEndianInterpretationInvalidSpans": little_endian_invalid,
        "scope": "Every descriptor/span/bbox/npix checked; no mask raster or quality policy; counts are not union coverage"}


def archive_facts(path: Path) -> dict:
    with tarfile.open(fileobj=io.BytesIO(path.read_bytes()), mode="r:gz") as archive:
        members = archive.getmembers()
        assert len(members) == 34 and sum(m.size for m in members if m.isfile()) < 2 * 1024 * 1024
        files, legal = {}, []
        for member in members:
            if not member.isfile():
                continue
            data = archive.extractfile(member).read()
            text = data.decode("utf-8", errors="replace")
            name = member.name.split("/", 1)[1]
            files[name] = {"bytes": len(data), "sha256": digest(data)}
            hits = [i + 1 for i, line in enumerate(text.splitlines())
                    if re.search(r"\bcopyright\b|\blicen[sc]e\b|\bpermission\b|\bGPL\b|General Public|redistribut", line, re.I)]
            if hits:
                legal.append({"file": name, "matchingLineNumbers": hits})
        return {"archive": binding(path), "memberCount": len(members), "files": files,
            "legalMatches": legal, "licenseFilePresent": any(re.search(r"license|copying", name, re.I) for name in files),
            "bundleLicenseConclusion": "UNKNOWN: only geometry.c lines100-109 has component-specific AT&T permission; not a whole bundle grant",
            "facts": [
                {"file": "phSpanUtil.h", "lines": [11, 24], "fact": "SPAN signed short y,x1,x2; object carries row0,col0,bbox,npix separately"},
                {"file": "read.c", "lines": [410, 421, 493, 497], "fact": "Actual FITS heap stores SPANs directly; little-endian machine swab2 means big-endian signed16 triples"},
                {"file": "phSpanUtil.c", "lines": [419, 431], "fact": "npix sums inclusive x2-x1+1"},
                {"file": "phSpanUtil.c", "lines": [614, 646], "fact": "Raster uses span y,x1,x2 directly relative to target region origin; not blindly adding object row0,col0"},
                {"file": "read.c", "lines": [423, 442], "fact": "Coefficient wire25float copied directly to C[5][5]; RROW0/RCOL0 describe eigenimage region"},
                {"file": "variablePsf.c", "lines": [1084, 1107], "fact": "C implementation evaluates raw C[rowPower][colPower], rowc/colc scale.001, linear combination all bases; contrast pydl outer(row,column).T"},
                {"file": "README", "lines": [60, 75], "fact": "HDU1 INTERP enum0, subsequent HDU enum+1; S_NMASK_TYPES sentinel is not a plane"}],
            "scope": "Read cached tar in memory only; no extraction, install, compile or source adoption"}


def main() -> None:
    assert not (OUT / "result.json").exists()
    acq_path = SOURCE / "acquisition.json"
    acq = json.loads(acq_path.read_text("utf-8"))
    historical_inputs = acq["sourceFilesBefore"]
    frozen_before = [binding(ROOT / entry["path"]) for entry in historical_inputs]
    parallel_drift = [{"historical": old, "currentAtAuditStart": current}
                      for old, current in zip(historical_inputs, frozen_before) if old != current]
    assert all(entry["historical"]["path"] == "data-pipelines/deep-sky/sdss_gri_tan.py" for entry in parallel_drift)
    source_results = []
    for receipt in acq["sourceFiles"]:
        path = ROOT / receipt["raw"]["path"]
        assert binding(path) == receipt["raw"]
        compressed = path.read_bytes()
        raw = gzip.decompress(compressed) if path.suffix == ".gz" else compressed
        assert len(raw) <= 16 * 1024 * 1024
        assert digest(raw) == receipt["decodedFits"]["sha256"] and len(raw) == receipt["decodedFits"]["bytes"]
        decoded_path = ROOT / receipt["decodedFits"]["path"]
        assert raw == decoded_path.read_bytes()
        result = inspect_psf(raw) if path.name.startswith("psField") else inspect_mask(raw, path.name.split("-")[2][0])
        source_results.append({"raw": binding(path), "decoded": binding(decoded_path),
            "recordedAcquisitionState": receipt["state"], "actualIndependentFullFormat": result})
    candidate_path = ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json"
    candidate = json.loads(candidate_path.read_text("utf-8"))
    points = []
    for band in "gri":
        for receipt in candidate["science"]["perBand"][band]["sourceReceipts"]:
            ident = receipt["identity"]
            if (ident["run"], ident["field"]) not in [(3699, 100), (3716, 117)]:
                continue
            world = [[candidate["center"]["raDeg"], candidate["center"]["decDeg"]]]
            xy = WCS(fits.Header(receipt["wcs"]["celestialHeader"])).all_world2pix(world, 0)[0]
            inside = bool(0 <= xy[0] < 2047 and 0 <= xy[1] < 1488)
            points.append({"identity": ident, "sourceFrame": receipt["source"],
                "zeroBasedSourceXY": xy.tolist(), "fullFourNeighborInside": inside,
                "centered51PixelBoxInside": bool(25 <= xy[0] < 2023 and 25 <= xy[1] < 1464)})
    archive = archive_facts(OUT / "reference/readAtlasImages-v5_4_11.tar.gz")
    frozen_after = [binding(ROOT / entry["path"]) for entry in frozen_before]
    assert frozen_before == frozen_after
    old_binding_path = SOURCE / "binding.json"
    old_binding = json.loads(old_binding_path.read_text("utf-8"))
    assert old_binding["oldAssetsBefore"] == old_binding["oldAssetsAfter"]
    assets_current = [binding(ROOT / entry["path"]) for entry in old_binding["oldAssetsBefore"]]
    assert assets_current == old_binding["oldAssetsBefore"]
    result = {"scope": "Independent bounded format/capability evidence, not a quality decoder/model implementation",
        "libraries": {"astropy": astropy.__version__, "numpy": np.__version__},
        "localOptionalAvailability": {name: find_spec(name) is not None for name in ["pydl", "fitsio", "sdss", "scipy"]},
        "sources": source_results, "compressedOrRaw4InputBytes": sum(entry["raw"]["bytes"] for entry in source_results),
        "coreGeometry": {"candidate": binding(candidate_path), "center": candidate["center"], "points": points,
            "scope": "Existing primary ICRS TAN approximation only, not absolute astrometry/full asTrans; kernel not reconstructed"},
        "officialArchive": archive,
        "preExistingAuthorizedParallelOwnerDrift": parallel_drift,
        "boundedCounterexamples": {"nativeEndianSpans": "actual big-endian valid versus wrong little-endian out-of-frame triples",
            "threeBasisAssumption": "all actual bands have four bases with measured nonzero fourth component",
            "caseSensitiveColumns": "r1 acquisition false-rejected mixed-case psField columns; actual all10HDUs and every array/heap checked here; old failure preserved"},
        "boundaries": ["fpM flags are not scientific absence or display alpha", "finite source samples can include PHOTO interpolation",
            "only one field core quality supplied; whole six-field mosaic quality unknown", "unresolved whole-reader-bundle license; no GPL adoption",
            "PSF reconstruction/normalization/astrometric conventions/field-quality policy are future owners", "catalog scalar psfWidth is not a spatial PSF"],
        "old201AssetsUnchanged": len(assets_current) == 201,
        "auditStartOwnersAndSixPreservedUnchangedDuringAudit": frozen_before == frozen_after,
        "sixPreservedUnchangedFromAcquisition": historical_inputs[-6:] == frozen_after[-6:],
        "networkRequestsThisOfflineScript": 0}
    assert result["old201AssetsUnchanged"]
    write("result.json", result)
    write("binding.json", {"script": binding(Path(__file__)), "acquisition": binding(acq_path),
        "priorAcquisitionBinding": binding(old_binding_path), "archiveAcquisition": binding(OUT / "reference/acquisition.json"),
        "candidate": binding(candidate_path), "sources": [entry["raw"] for entry in source_results],
        "frozenInputsBefore": frozen_before, "frozenInputsAfter": frozen_after,
        "oldAssets": assets_current, "result": binding(OUT / "result.json")})
    print(json.dumps({"result": binding(OUT / "result.json"), "binding": binding(OUT / "binding.json")}, indent=2))


if __name__ == "__main__":
    main()
