"""Independent 20-file format and 15-frame association audit; cached only.

No production reader is used as an oracle. All raw descriptors, active PSF
coefficients, signed eigenimages and mask spans are independently checked.
Core field100 is referenced through its completed review, not re-audited.
"""
import bz2
import hashlib
import io
import json
from pathlib import Path
import struct
import sys
import zlib

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
import astropy
import numpy as np
from astropy.io import fits

GEN = ROOT / "output/sdss-contributing-quality-inputs-1002-r1"
STOCK = ROOT / "output/sdss-contributing-quality-stock-1002-r2/input-manifest.json"
OUT = ROOT / "output/sdss-contributing-quality-independent-1002-r4"
PLANES = ("S_MASK_INTERP", "S_MASK_SATUR", "S_MASK_NOTCHECKED", "S_MASK_OBJECT", "S_MASK_BRIGHTOBJECT", "S_MASK_BINOBJECT", "S_MASK_CATOBJECT", "S_MASK_SUBTRACTED", "S_MASK_GHOST", "S_MASK_CR")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def bind(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": digest(raw)}


def check_payload(raw, table, row, descriptor_offset, size):
    at = table.fileinfo()["datLoc"] + row * table.header["NAXIS1"] + descriptor_offset
    count, pointer = struct.unpack_from(">ii", raw, at)
    base = table.header["NAXIS1"] * table.header["NAXIS2"]
    start = table.header.get("THEAP", base)
    capacity = base + table.header["PCOUNT"] - start
    assert start >= base and count >= 0 and pointer >= 0 and pointer + count * size <= capacity
    begin = table.fileinfo()["datLoc"] + start + pointer
    payload = raw[begin:begin + count * size]
    assert len(payload) == count * size
    return count, payload


def actual_identity(header, expected, frame=False):
    keywords = [("RUN", "run"), ("CAMCOL", "camcol")]
    if not frame or "FIELD" in header:
        keywords.append(("FIELD", "field"))
    for keyword, key in keywords:
        assert header[keyword] == expected[key]
    if "RERUN" in header:
        assert str(header["RERUN"]).strip() == expected["rerun"]
    if "band" in expected and "FILTER" in header:
        assert header["FILTER"] == expected["band"]
    return {key: header.get(key) for key in ["RUN", "RERUN", "CAMCOL", "FRAME", "FIELD", "FILTER", "FILTERS", "PS_ID", "VERSION"]}


def full_fits(raw):
    assert len(raw) % 2880 == 0
    hdus = fits.open(io.BytesIO(raw), memmap=False, lazy_load_hdus=False)
    hdus.verify("exception")
    for table in hdus:
        info = table.fileinfo()
        assert info["datLoc"] + info["datSpan"] <= len(raw)
        if isinstance(table, fits.BinTableHDU):
            # Independently inspect every variable descriptor before forcing
            # any payload, then force all columns/arrays, including summaries.
            for column in table.columns:
                form = str(column.format)
                if form.startswith("1P"):
                    unit = {"B": 1, "E": 4, "D": 8, "J": 4, "I": 2, "A": 1}[form[2]]
                    offset = table.data.dtype.fields[column.name][1]
                    for row in range(table.header["NAXIS2"]):
                        n, payload = check_payload(raw, table, row, offset, unit)
                        value = np.asarray(table.data[column.name][row])
                        assert value.size == n and value.nbytes == len(payload)
                else:
                    np.asarray(table.data[column.name])
    assert hdus[-1].fileinfo()["datLoc"] + hdus[-1].fileinfo()["datSpan"] == len(raw)
    return hdus


def psfield(raw, expected):
    with full_fits(raw) as hdus:
        assert len(hdus) == 10 and hdus[0].header["FILTERS"].split() == list("ugriz")
        primary = actual_identity(hdus[0].header, expected)
        bands = {}
        total_samples = 0
        for band, table in zip("ugriz", hdus[1:6]):
            assert table.header["NAXIS1"] == 144 and table.header["TDIM3"] == "(5,5)"
            basis = []
            for index, row in enumerate(table.data):
                n, payload = check_payload(raw, table, index, 124, 4)
                pixels = np.frombuffer(payload, dtype=">f4")
                assert pixels.tobytes() == np.asarray(row["RROWS"]).astype(">f4", copy=False).tobytes()
                assert n == int(row["RNROW"]) * int(row["RNCOL"]) and np.isfinite(pixels).all()
                start = table.fileinfo()["datLoc"] + index * 144 + 8
                raw_c = raw[start:start + 100]
                coefficients = np.frombuffer(raw_c, dtype=">f4").reshape(5, 5)
                assert raw_c == np.asarray(row["c"]).tobytes()
                nr, nc = int(row["nrow_b"]), int(row["ncol_b"])
                assert 1 <= nr <= 5 and 1 <= nc <= 5 and np.isfinite(coefficients[:nr, :nc]).all()
                assert row["RTYPE"] == 128 and row["RROW0"] == row["RCOL0"] == 0
                basis.append({"basis": index, "rowOrder": nr, "columnOrder": nc,
                    "kernelShapeRowsColumns": [int(row["RNROW"]), int(row["RNCOL"])],
                    "eigenimageSamples": n, "eigenimageWireSha256": digest(payload),
                    "negativeEigenimageSamples": int(np.count_nonzero(pixels < 0)),
                    "coefficientWireSha256": digest(raw_c), "activeCoefficientsFinite": True,
                    "inactiveCoefficientNonfinite": int(np.count_nonzero(~np.isfinite(coefficients)))})
                total_samples += n
            assert len(basis) > 0 and len({tuple(b["kernelShapeRowsColumns"]) for b in basis}) == 1
            bands[band] = {"basisCount": len(basis), "basis": basis,
                          "kernelShapeRowsColumns": basis[0]["kernelShapeRowsColumns"]}
        assert hdus[6].data["field"][0] == expected["field"]
        return {"primary": primary, "hdus": len(hdus), "bands": bands,
            "totalEigenimageSamples": total_samples, "actualSummaryStatus": hdus[6].data["status"].tolist(),
            "actualPspStatus": hdus[6].data["psp_status"].tolist(),
            "support": "SIGNED_DYNAMIC_BASES_ACTIVE_PER_ROW_ORDERS_C_ROW_POWER_COLUMN_POWER_ONLY_ZERO_REGION_ORIGIN",
            "scientificQuality": "UNKNOWN"}


def mask(raw, expected):
    with full_fits(raw) as hdus:
        assert len(hdus) == 12 and hdus[0].header["NPLANE"] == 10 and hdus[0].header["NFILTER"] == 5
        rows, columns = hdus[0].header["MASKROWS"], hdus[0].header["MASKCOLS"]
        assert (rows, columns) == (1489, 2048)
        actual = actual_identity(hdus[0].header, expected)
        enum = [(str(row["defName"]).strip(), str(row["attributeName"]).strip(), int(row["Value"])) for row in hdus[11].data]
        assert enum == [("S_MASKTYPE", name, value) for value, name in enumerate(PLANES + ("S_NMASK_TYPES",))]
        descriptions = []
        for plane, table in enumerate(hdus[1:11]):
            assert table.header["NAXIS1"] == 44
            spans_total = pixels_total = 0
            for index, row in enumerate(table.data):
                nbytes, payload = check_payload(raw, table, index, 36, 1)
                nspan = int(row["nspan"])
                assert nspan > 0 and nbytes == 6 * nspan and payload == np.asarray(row["s"]).tobytes()
                spans = np.frombuffer(payload, dtype=">i2").reshape(nspan, 3).astype(np.int64)
                yy, lo, hi = spans.T
                assert int(row["row0"]) == int(row["col0"]) == 0
                assert np.all((yy >= 0) & (yy < rows) & (lo >= 0) & (hi < columns) & (lo <= hi))
                assert np.all((yy[1:] > yy[:-1]) | ((yy[1:] == yy[:-1]) & (lo[1:] > hi[:-1] + 1)))
                assert (int(yy.min()), int(yy.max()), int(lo.min()), int(hi.max())) == tuple(int(row[name]) for name in ("rmin", "rmax", "cmin", "cmax"))
                pixels = int(np.sum(hi - lo + 1))
                assert pixels == row["npix"]
                spans_total += nspan
                pixels_total += pixels
            descriptions.append({"hdu": plane + 1, "plane": plane, "name": PLANES[plane], "objects": len(table.data),
                "spans": spans_total, "sumObjectNpixNotUnion": pixels_total,
                "objectOffsets": sorted({(int(r["row0"]), int(r["col0"])) for r in table.data}),
                "referenceCounters": sorted({int(r["refcntr"]) for r in table.data})})
        return {"primary": actual, "shapeRowsColumns": [rows, columns], "enum": enum, "planes": descriptions,
            "support": "COMPLETE_BE16_INCLUSIVE_CANONICAL_SPAN_HEAPS_ZERO_OBJECT_OFFSET_NONEMPTY_OBJECTS_EMPTY_PLANES_VALID",
            "scientificQuality": "UNKNOWN", "sampleAvailability": "NOT_SUPPLIED"}


def main():
    assert not OUT.exists()
    acquisition_path = GEN / "acquisition.json"
    assert bind(acquisition_path)["sha256"] == "901b671c84da7799c85f092c3a15652fc1e7eb37e508e56863a2d961d463ff31"
    assert bind(STOCK)["sha256"] == "64db3bc0301f977549b2d6b67c8589cbb534c2911680e5c34cc43d90e6e8b0d2"
    acq = json.loads(acquisition_path.read_text("utf-8"))
    stock = json.loads(STOCK.read_text("utf-8"))
    author_binding = json.loads((GEN / "binding.json").read_text("utf-8"))
    assert author_binding["before"] == author_binding["after"]
    protected = author_binding["before"]
    for entry in protected + author_binding["outputsBeforeBinding"]:
        assert bind(ROOT / entry["path"]) == entry
    assert len(acq["sourceFiles"]) == 20 and len(stock["fields"]) == 5
    OUT.mkdir()
    (OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    decoded = {}
    facts = []
    raw_total = decoded_total = 0
    for receipt in acq["sourceFiles"]:
        assert receipt["automaticRetries"] == 0 and receipt["redirectsAllowed"] is False
        assert receipt["httpStatus"] == 200 and receipt["actualFinalUrl"] == receipt["url"] and receipt["rawTransferComplete"]
        expected = receipt["identity"]
        filename = (f"psField-{expected['run']:06d}-{expected['camcol']}-{expected['field']:04d}.fit" if "band" not in expected else
                    f"fpM-{expected['run']:06d}-{expected['band']}{expected['camcol']}-{expected['field']:04d}.fit.gz")
        assert filename == receipt["filename"]
        assert receipt["url"] == f"https://data.sdss.org/sas/dr17/eboss/photo/redux/{expected['rerun']}/{expected['run']}/objcs/{expected['camcol']}/{filename}"
        path = ROOT / receipt["raw"]["path"]
        assert bind(path) == receipt["raw"] and receipt["bytes"] == path.stat().st_size
        encoded = path.read_bytes()
        if path.suffix == ".gz":
            unzip = zlib.decompressobj(16 + zlib.MAX_WBITS)
            raw = unzip.decompress(encoded, 16 * 1024 * 1024 + 1)
            assert unzip.eof and not unzip.unused_data and len(raw) <= 16 * 1024 * 1024
        else:
            raw = encoded
        assert digest(raw) == receipt["decodedFits"]["sha256"] and len(raw) == receipt["decodedFits"]["bytes"]
        assert raw == (ROOT / receipt["decodedFits"]["path"]).read_bytes()
        details = psfield(raw, expected) if "band" not in expected else mask(raw, expected)
        key = (expected["run"], expected["camcol"], expected["field"], expected.get("band", "psField"))
        decoded[key] = details
        facts.append({"identity": expected, "raw": bind(path), "decoded": receipt["decodedFits"], "actualFormat": details})
        raw_total += len(encoded)
        decoded_total += len(raw)
    assert raw_total == acq["knownRawBytesReceivedOrReused"] == 3644048
    assert decoded_total == acq["knownDecodedFitsBytes"] == 6546240
    associations = []
    raw_frames = []
    for field in stock["fields"]:
        ident = field["identity"]
        key = (ident["run"], ident["camcol"], ident["field"])
        ps = decoded[(*key, "psField")]
        association = next(a for a in acq["fieldAssociations"] if a["identity"] == ident)
        checks = []
        for frame_info in field["correctedFrames"]:
            path = ROOT / frame_info["path"]
            assert bind(path) == {k: frame_info[k] for k in ["path", "bytes", "sha256"]}
            raw_frames.append(bind(path))
            raw = bz2.decompress(path.read_bytes())
            with fits.open(io.BytesIO(raw), memmap=False) as hdus:
                header = hdus[0].header
                frame_expected = {**ident, "band": frame_info["band"]}
                frame_actual = actual_identity(header, frame_expected, frame=True)
                shape = [header["NAXIS2"], header["NAXIS1"]]
                # Corrected-frame primary FRAME is a camera sequence counter,
                # not the field identity. The actual asTrans row carries FIELD.
                assert len(hdus[3].data) == 1
                ast = hdus[3].data[0]
                as_identity = {"run": int(ast["RUN"]), "rerun": str(ast["RERUN"]).strip(),
                    "camcol": int(ast["CAMCOL"]), "field": int(ast["FIELD"]),
                    "band": str(ast["FILTER"]).strip()}
                assert as_identity == frame_expected
                assert tuple(int(v) for v in ast["NAXIS"]) == (2048, 1489)
            q = decoded[(*key, frame_info["band"])]
            assert shape == q["shapeRowsColumns"] == [1489, 2048]
            batches = {"frame": frame_actual["PS_ID"], "psField": ps["primary"]["PS_ID"], "fpM": q["primary"]["PS_ID"]}
            assert all(isinstance(value, str) and value.strip() for value in batches.values()) and len(set(batches.values())) == 1
            authored = next(b for b in association["bands"] if b["identity"]["band"] == frame_info["band"])
            assert authored["actualPS_ID"] == batches and authored["processingIdentity"] == "MATCH"
            assert authored["quality"] == "UNKNOWN" and authored["availability"] == "NOT_ASSESSED"
            assert authored["sourceSha256"]["frame"] == frame_info["sha256"]
            checks.append({"band": frame_info["band"], "actualPrimary": frame_actual,
                "actualAsTransIdentity": as_identity, "source": bind(path),
                "shapeMatches": True, "actualPS_ID": batches, "processingIdentity": "MATCH", "quality": "UNKNOWN"})
        assert len(checks) == 3
        associations.append({"identity": ident, "fieldKey": field["fieldKey"],
            "jointAvailableMasterPixelsFromFrozenCandidate": field["jointAvailableMasterPixels"],
            "bands": checks, "sharedOwnerKnownLayoutSupported": True})
    assert len(associations) == 5
    excluded = stock["excludedSyntheticFixtures"]
    assert len(excluded) == 1
    synthetic = excluded[0]
    fixture_path = ROOT / synthetic["fixture"]["path"]
    assert bind(fixture_path) == synthetic["fixture"]
    assert synthetic["fixture"]["sha256"] == "2f59c889f66d26c4c39b73ca71ab6a8b5602340676bb0f251d1e52e2db936575"
    assert bind(ROOT / synthetic["evidence"]["path"]) == synthetic["evidence"]
    genuine = next(f for f in facts if f["identity"] == {"rerun": "301", "run": 3699, "camcol": 6, "field": 101})
    assert genuine["raw"]["sha256"] != synthetic["fixture"]["sha256"]
    assert genuine["raw"]["path"] != synthetic["fixture"]["path"]
    with full_fits(fixture_path.read_bytes()) as hdus:
        fake_array = np.asarray(hdus[2].data["RROWS"][0]).tobytes()
    real_record = next(r for r in acq["sourceFiles"] if r["filename"] == "psField-003699-6-0101.fit")
    with full_fits((ROOT / real_record["raw"]["path"]).read_bytes()) as hdus:
        real_array = np.asarray(hdus[2].data["RROWS"][0]).tobytes()
    assert real_array != fake_array
    for entry in protected + author_binding["outputsBeforeBinding"] + raw_frames:
        assert bind(ROOT / entry["path"]) == entry
    result = {"scope": __doc__, "acquisition": bind(acquisition_path), "stock": bind(STOCK),
        "authorBinding": bind(GEN / "binding.json"), "libraries": {"astropy": astropy.__version__, "numpy": np.__version__},
        "files": facts, "newRawBytes": raw_total, "decodedFitsBytes": decoded_total, "actualNewFrameAssociations": associations,
        "associationCount": 15,
        "fixtureExclusion": {"synthetic": synthetic, "genuineField101": genuine["raw"], "differentRawAndNativeGBasis": True,
            "rawBytesAndFilenameAloneNotProvenance": True, "sourceEvidence": "Separate canonical HTTP receipt and exact raw binding; this review did not replay HTTP"},
        "coreReference": bind(ROOT / "output/sdss-m51-core-quality-independent-1002-r1/review.json"),
        "conclusion": "New five fields all independently satisfy existing shared-owner supported layout and true same-field/band/shape/PS_ID association. Together with separately reviewed field100, inputs support a complete six-field mosaic diagnostic consumer; no quality policy or correction is established.",
        "sourceQuality": "UNKNOWN", "wholeMosaicQuality": "UNVERIFIED", "sourceScienceDisplayWeightsPublicationChanged": False,
        "allProtectedInputsUnchanged": True, "networkRequests": 0,
        "limits": ["PSF basis/metadata support is not measured spatial PSF/absolute astrometry or sharpness certification.",
            "Mask processing flags need source-specific interpretation; no flag was made science absence/alpha/bad-color proof.",
            "Only source input qualification in this generation; whole-mosaic target pixel/range/contribution consumer remains next actual check.",
            "Existing primary TAN/+0.5 declared approximation, full asTrans and PSF/noise/background matching not adopted.",
            "Current mask support offset0/nonempty objects; other variants remain unsupported, not zero/good.",
            "No official unknown-license code adoption, dependency install or new source/rights conclusion."]}
    result_path = OUT / "review.json"
    result_path.write_text(json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")
    (OUT / "binding.json").write_text(json.dumps({"script": bind(OUT / "executed-script.py"), "stock": bind(STOCK),
        "acquisition": bind(acquisition_path), "protectedInputs": protected, "qualityRawInputs": [f["raw"] for f in facts],
        "correctedFrameInputs": raw_frames, "review": bind(result_path)}, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"review": bind(result_path), "binding": bind(OUT / "binding.json")}, indent=2))


if __name__ == "__main__":
    main()
