"""Four once-only core-field quality inputs; structure/identity readback only."""
from __future__ import annotations
import argparse
import gzip
import hashlib
import io
import json
import re
import ssl
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.request
import warnings
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
ORIGIN = "https://data.sdss.org/sas/dr17/eboss/photo/redux/301/3699/objcs/6"
FILES = ("psField-003699-6-0100.fit", "fpM-003699-g6-0100.fit.gz",
         "fpM-003699-r6-0100.fit.gz", "fpM-003699-i6-0100.fit.gz")
MAX_RAW = 4 * 1024 * 1024
MAX_FITS = 16 * 1024 * 1024


def now():
    return datetime.now(timezone.utc).isoformat()


def bind(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def save(path, value):
    temporary = path.with_name(path.name + ".writing")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(path)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(request.full_url, code, "canonical_redirect_forbidden", headers, fp)


def scalar(value):
    import numpy as np
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, bytes):
        return value.decode("ascii", errors="replace").rstrip()
    if isinstance(value, float) and not np.isfinite(value):
        return {"nonfinite": str(value)}
    return value if value is None or isinstance(value, (str, bool, int, float)) else str(value)


def column_summary(value):
    import numpy as np
    array = np.asarray(value)
    record = {"shape": list(array.shape), "dtype": array.dtype.str, "scalarCount": int(array.size)}
    if array.dtype.kind == "O":
        rows = [np.asarray(row) for row in array]
        record.update(variableLengthRows=len(rows), rowShapes=[list(row.shape) for row in rows],
                      rowDtypes=sorted({row.dtype.str for row in rows}),
                      totalHeapScalarCount=sum(int(row.size) for row in rows),
                      scientificInterpretation="NONE: heap content inspected, not decoded as pixel masks or PSF")
        if rows and all(row.dtype.kind in "fiu" for row in rows):
            record["nonfiniteScalars"] = sum(int((~np.isfinite(row)).sum()) for row in rows)
    elif array.dtype.kind in "fiu":
        finite = np.isfinite(array)
        record["nonfiniteScalars"] = int((~finite).sum())
        if finite.any():
            record.update(minimum=scalar(array[finite].min()), maximum=scalar(array[finite].max()))
        if array.size <= 128:
            record["values"] = [scalar(item) for item in array.ravel()]
    elif array.dtype.kind in "SU" and array.size <= 256:
        record["values"] = [scalar(item) for item in array.ravel()]
    return record


def inspect_fits(raw, filename):
    sys.path[:0] = [str(ROOT / "output/allwise-w3-atlas-0929/python-deps")]
    import numpy as np
    from astropy.io import fits
    if not raw or len(raw) > MAX_FITS or len(raw) % 2880:
        raise RuntimeError("fits_container_length_invalid")
    reports = []
    with warnings.catch_warnings(record=True) as notices:
        warnings.simplefilter("always")
        with fits.open(io.BytesIO(raw), memmap=False, lazy_load_hdus=False) as hdus:
            hdus.verify("exception")
            if hdus[0].header.get("SIMPLE") is not True or hdus[0].header.get("NAXIS") != 0:
                raise RuntimeError("quality_primary_container_invalid")
            for index, hdu in enumerate(hdus):
                info = hdu.fileinfo()
                if info["datLoc"] + info["datSpan"] > len(raw):
                    raise RuntimeError("fits_array_or_heap_incomplete")
                data = hdu.data  # Force the actual fixed payload and all variable columns below.
                if "CHECKSUM" in hdu.header and hdu.verify_checksum() != 1:
                    raise RuntimeError("fits_checksum_invalid")
                if "DATASUM" in hdu.header and hdu.verify_datasum() != 1:
                    raise RuntimeError("fits_datasum_invalid")
                report = {"hdu": index, "class": type(hdu).__name__, "name": hdu.name,
                          "headerCards": [{"keyword": card.keyword, "value": scalar(card.value), "comment": card.comment}
                                          for card in hdu.header.cards],
                          "dataOffset": info["datLoc"], "paddedDataBytes": info["datSpan"], "completePayloadReceived": True}
                if isinstance(hdu, fits.BinTableHDU):
                    width, count = hdu.header["NAXIS1"], hdu.header["NAXIS2"]
                    heap_start = hdu.header.get("THEAP", width * count)
                    heap_bytes = hdu.header["PCOUNT"] - (heap_start - width * count)
                    if heap_start < width * count or heap_bytes < 0:
                        raise RuntimeError("fits_heap_bounds_invalid")
                    report.update(rows=count, rowBytes=width, pcount=hdu.header["PCOUNT"],
                                  theap=hdu.header.get("THEAP"), actualHeapRelativeOffset=heap_start,
                                  heapPayloadBytes=heap_bytes, columns=[])
                    for column in hdu.columns:
                        values = data[column.name]
                        col = {"name": column.name, "format": str(column.format), "dim": column.dim,
                               "unit": column.unit, "readback": column_summary(values)}
                        variable = re.fullmatch(r"(\d*)([PQ])([LXBIJKAEDCM])(?:\(\d*\))?", str(column.format))
                        if variable:
                            repeat, descriptor_type, element_type = variable.groups()
                            if repeat not in ("", "1"):
                                raise RuntimeError("fits_heap_descriptor_repeat_unsupported")
                            offset = data.dtype.fields[column.name][1]
                            lengths = []
                            pointer_bytes = 8 if descriptor_type == "P" else 16
                            for row in range(count):
                                start = info["datLoc"] + row * width + offset
                                length, pointer = struct.unpack(">ii" if descriptor_type == "P" else ">qq", raw[start:start + pointer_bytes])
                                element_bytes = {"L": 1, "B": 1, "I": 2, "J": 4, "K": 8, "A": 1,
                                                 "E": 4, "D": 8, "C": 8, "M": 16}
                                needed = (length + 7) // 8 if element_type == "X" else length * element_bytes[element_type]
                                if length < 0 or pointer < 0 or pointer + needed > heap_bytes:
                                    raise RuntimeError("fits_heap_descriptor_out_of_bounds")
                                if element_type != "X" and int(np.asarray(values[row]).size) != length:
                                    raise RuntimeError("fits_heap_readback_length_changed")
                                lengths.append(length)
                            col["heapDescriptors"] = {"kind": descriptor_type, "elementType": element_type,
                                                      "descriptorCount": count, "lengths": lengths,
                                                      "allDescriptorBoundsAndReadbackLengthsChecked": True}
                        report["columns"].append(col)
                elif data is not None:
                    report["array"] = column_summary(data)
                reports.append(report)
            primary = hdus[0].header
            actual_identity = {key: scalar(primary[key]) if key in primary else None
                               for key in ("RUN", "RERUN", "CAMCOL", "FIELD", "FILTER", "FILTERS")}
            expected = {"RUN": 3699, "CAMCOL": 6, "FIELD": 100}
            checks = {key: "MISSING_UNKNOWN" if actual_identity[key] is None else
                      "MATCH" if actual_identity[key] == value else "MISMATCH" for key, value in expected.items()}
            if "MISMATCH" in checks.values():
                raise RuntimeError("quality_core_identity_mismatch")
            if filename.startswith("psField"):
                if len(hdus) < 7 or any(not isinstance(hdus[index], fits.BinTableHDU) for index in range(1, 7)):
                    raise RuntimeError("psfield_required_tables_missing")
                eigen = []
                for index in range(1, 6):
                    table = hdus[index].data
                    required = {"nrow_b", "ncol_b", "c", "rnrow", "rncol", "rtype", "rrows"}
                    if not required.issubset({name.lower() for name in table.names}):
                        raise RuntimeError("psfield_eigen_columns_missing")
                    eigen.append({"hdu": index, "rows": len(table),
                                  "spatialCoefficientShape": list(np.asarray(table["c"]).shape),
                                  "nrow_b": np.asarray(table["nrow_b"]).tolist(),
                                  "ncol_b": np.asarray(table["ncol_b"]).tolist(),
                                  "rnrow": np.asarray(table["rnrow"]).tolist(),
                                  "rncol": np.asarray(table["rncol"]).tolist(),
                                  "rtype": np.asarray(table["rtype"]).tolist(),
                                  "rrowsLengths": [int(np.asarray(value).size) for value in table["rrows"]]})
                detail = {"kind": "PSFIELD_TABLES", "eigenimages": eigen,
                          "filterOrderActualPrimary": actual_identity["FILTERS"] or actual_identity["FILTER"],
                          "perBandSummaryHdu6": reports[6],
                          "psfReconstructed": False, "spatialPsfQualityAccepted": False}
            else:
                detail = {"kind": "FPM_TABLE_HEAPS_ONLY", "maskDimensionsActualPrimary":
                          {key: scalar(primary[key]) if key in primary else None for key in ("MASKROWS", "MASKCOLS", "NPLANE", "NFILTER")},
                          "enumTables": [report for report in reports if any(card["keyword"] == "TYPENAME"
                                        and card["value"] == "S_MASKTYPE" for card in report["headerCards"])],
                          "spanBytesDecodedAsPixels": False,
                          "bandIdentityLimit": "Use actual FILTER/FILTERS when present; no invented band header from filename",
                          "maskRasterOrQualitySelectionProduced": False}
    return {"completeFitsContainerAndAllTablesRead": True, "rawFitsBytes": len(raw),
            "rawFitsSha256": hashlib.sha256(raw).hexdigest(), "hdus": reports,
            "actualPrimaryIdentity": actual_identity, "coreIdentityChecks": checks,
            "rerunIdentityInFile": "MISSING_UNKNOWN" if actual_identity["RERUN"] is None else str(actual_identity["RERUN"]),
            "readerWarnings": sorted({str(notice.message) for notice in notices}), "detail": detail,
            "limits": "Structure and actual identity evidence only; no raster mask, PSF match, source repair or quality acceptance"}


def child(output, filename, reused=None):
    record_path = output / (filename + ".request.json")
    url = ORIGIN + "/" + filename
    record = {"filename": filename, "url": url, "actualFinalUrl": None, "httpStatus": None,
              "state": "REQUEST_STARTED", "startedUtc": now(), "bytes": None, "sha256": None,
              "socketTimeoutSeconds": 30, "wholeChildBudgetSeconds": 40, "maximumResponseBytes": MAX_RAW,
              "maximumDecodedFitsBytes": MAX_FITS, "automaticRetries": 0, "redirectsAllowed": False,
              "tls": "default CA and hostname verification", "acquisition": "REUSED_CACHE" if reused else "ONE_CANONICAL_REQUEST"}
    save(record_path, record)
    started = time.monotonic()
    raw_path = Path(reused) if reused else output / "sources" / filename
    try:
        if reused:
            actual = bind(raw_path)
            if actual["bytes"] > MAX_RAW:
                raise RuntimeError("reused_raw_response_budget_exceeded")
        else:
            context = ssl.create_default_context()
            assert context.check_hostname and context.verify_mode == ssl.CERT_REQUIRED
            opener = urllib.request.build_opener(NoRedirect(), urllib.request.HTTPSHandler(context=context))
            with opener.open(urllib.request.Request(url, headers={"User-Agent": "Starward-bounded-SDSS-core-quality/1.0"}), timeout=30) as response:
                record.update(httpStatus=response.status, actualFinalUrl=response.geturl(), contentLengthHeader=response.headers.get("Content-Length"))
                if response.status != 200 or response.geturl() != url:
                    raise RuntimeError("canonical_response_invalid")
                length = response.headers.get("Content-Length")
                if length is not None and int(length) > MAX_RAW:
                    raise RuntimeError("response_declared_byte_budget_exceeded")
                record["state"] = "RAW_STREAMING_UNCHECKED"
                save(record_path, record)
                with raw_path.open("xb") as target:
                    remaining = MAX_RAW
                    while remaining:
                        chunk = response.read(min(65536, remaining))
                        if not chunk:
                            break
                        target.write(chunk)
                        target.flush()
                        remaining -= len(chunk)
                    if remaining == 0:
                        raise RuntimeError("response_hard_byte_budget_reached")
                actual = bind(raw_path)
        record.update(state="RAW_ACQUIRED_UNCHECKED", raw=actual, bytes=actual["bytes"], sha256=actual["sha256"], rawTransferComplete=True)
        save(record_path, record)
        if filename.endswith(".gz"):
            payload = bytearray()
            with gzip.GzipFile(fileobj=io.BytesIO(raw_path.read_bytes())) as decoded:
                while len(payload) < MAX_FITS:
                    chunk = decoded.read(min(65536, MAX_FITS - len(payload)))
                    if not chunk:
                        break
                    payload.extend(chunk)
                else:
                    raise RuntimeError("gzip_decoded_hard_byte_budget_reached")
            record["gzipCompleteCrcAndLengthReadback"] = True
            fits_path = output / "decoded" / filename[:-3]
            with fits_path.open("xb") as target:
                target.write(payload)
            record["decodedFits"] = bind(fits_path)
        else:
            payload = raw_path.read_bytes()
            record["gzipCompleteCrcAndLengthReadback"] = None
            record["decodedFits"] = actual
        inspection = inspect_fits(bytes(payload), filename)
        save(output / (filename + ".inspection.json"), inspection)
        record.update(state="FITS_STRUCTURE_CHECKED", inspection=bind(output / (filename + ".inspection.json")),
                      actualPrimaryIdentity=inspection["actualPrimaryIdentity"], coreIdentityChecks=inspection["coreIdentityChecks"],
                      allRequiredCoreIdentityPresent=all(value == "MATCH" for value in inspection["coreIdentityChecks"].values()))
    except urllib.error.HTTPError as error:
        record.update(state="UNAVAILABLE", httpStatus=error.code, errorKind="HTTP_ERROR",
                      errorCode="canonical_redirect_forbidden" if 300 <= error.code < 400 else f"HTTP_{error.code}")
        error.close()
    except Exception as error:
        record.update(errorKind=type(error).__name__, errorCode=str(error) if isinstance(error, RuntimeError) else "network_gzip_or_fits_readback_failure")
        if raw_path.exists():
            actual = bind(raw_path)
            record.update(state="RAW_ACQUIRED_UNCHECKED", raw=actual, bytes=actual["bytes"], sha256=actual["sha256"])
        else:
            record["state"] = "UNAVAILABLE"
    finally:
        record.update(finishedUtc=now(), elapsedSeconds=time.monotonic() - started)
        save(record_path, record)


def inventory(directory):
    return [bind(path) for path in sorted(directory.rglob("*")) if path.is_file()]


def parent(output):
    assert output.is_relative_to(ROOT / "output") and not output.exists(), "exclusive_output_required"
    output.mkdir(exist_ok=False)
    (output / "sources").mkdir()
    (output / "decoded").mkdir()
    (output / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    # The logged rg inventory is the first lookup. Independently recheck the
    # exact four filenames before any request, so existing cached bytes win.
    scan = subprocess.run(["rg", "--files", "-uuu", "output", ".codex", "data-pipelines", "workers/miniapp-api/assets"],
                          cwd=ROOT, capture_output=True, text=True, check=True, timeout=30)
    existing = {name: [ROOT / line for line in scan.stdout.splitlines() if Path(line).name == name and not (ROOT / line).is_relative_to(output)]
                for name in FILES}
    save(output / "cache-check.json", {"tool": "rg --files -uuu", "searchedRoots": ["output", ".codex", "data-pipelines", "workers/miniapp-api/assets"],
                                       "matches": {name: [bind(path) for path in paths] for name, paths in existing.items()}})
    preserved = json.loads((TASK / "tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    source_paths = [ROOT / "data-pipelines/deep-sky" / name for name in
                    ("sdss_corrected_frame.py", "sdss_gri_tan.py", "allwise_finite_tan.py", "test_publish_allwise_w3.py", "image_quality.py")]
    source_paths.extend(ROOT / item["path"] for item in preserved)
    before = [bind(path) for path in source_paths]
    assert all(bind(ROOT / item["path"])["sha256"] == item["sha256"] for item in preserved)
    assets_before = inventory(ROOT / "workers/miniapp-api/assets/deep-sky")
    old_assets = json.loads((ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/binding.json").read_bytes())["oldAssetsAfter"]
    assert assets_before == old_assets
    frames_before = inventory(ROOT / "output/sdss-corrected-m51-1002")
    candidate_before = inventory(ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2")
    result = {"scope": "One existing core field quality raw inputs and actual FITS/heap/identity only; no masks, PSF reconstruction or quality adoption",
              "canonicalOrigin": ORIGIN, "expectedCoreField": {"run": 3699, "rerun": "301", "camcol": 6, "field": 100},
              "script": bind(Path(__file__)), "sourceFilesBefore": before, "maximumRequests": 4,
              "maximumTotalResponseBytes": 4 * MAX_RAW, "maximumTotalDecodedFitsBytes": 4 * MAX_FITS,
              "sourceFiles": [], "automaticRetries": 0,
              "primaryReferences": ["https://www.sdss4.org/dr17/imaging/pipeline/", "https://www.sdss4.org/dr17/imaging/images/",
                                    "https://data.sdss.org/datamodel/files/PHOTO_REDUX/RERUN/RUN/objcs/CAMCOL/psField.html",
                                    "https://data.sdss.org/datamodel/files/PHOTO_REDUX/RERUN/RUN/objcs/CAMCOL/fpM.html",
                                    "https://www.sdss4.org/dr17/algorithms/masks/"],
              "maskSemanticLimit": "Special polygon mask definitions differ from fpM photo masks; actual fpM enum must govern any future decoder"}
    save(output / "acquisition.json", result)
    for filename in FILES:
        print(json.dumps({"phase": "one_request_or_cached_read", "filename": filename}), flush=True)
        reused = existing[filename][0] if existing[filename] else None
        arguments = [sys.executable, str(Path(__file__).resolve()), "--output", str(output), "--child", filename]
        if reused:
            arguments.extend(["--reused", str(reused)])
        process = subprocess.Popen(arguments, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        started = time.monotonic()
        timed_out = False
        try:
            stdout, stderr = process.communicate(timeout=40)
        except subprocess.TimeoutExpired:
            timed_out = True
            process.kill()
            stdout, stderr = process.communicate()
        record_path = output / (filename + ".request.json")
        record = json.loads(record_path.read_bytes()) if record_path.exists() else {"filename": filename, "url": ORIGIN + "/" + filename,
                                  "state": "UNAVAILABLE", "bytes": None, "sha256": None, "httpStatus": None}
        if timed_out and record["state"] != "FITS_STRUCTURE_CHECKED":
            record.update(errorKind="WHOLE_CHILD_TIME_BUDGET_EXCEEDED", elapsedSeconds=time.monotonic() - started, finishedUtc=now())
            raw = reused or output / "sources" / filename
            if raw.exists():
                actual = bind(raw)
                record.update(state="RAW_ACQUIRED_UNCHECKED", raw=actual, bytes=actual["bytes"], sha256=actual["sha256"])
            else:
                record["state"] = "UNAVAILABLE"
            save(record_path, record)
        if stderr:
            (output / (filename + ".child-stderr.txt")).write_bytes(stderr)
        result["sourceFiles"].append(record)
        result["attemptedRequests"] = sum(item.get("acquisition") == "ONE_CANONICAL_REQUEST" for item in result["sourceFiles"])
        result["checkedStructures"] = sum(item["state"] == "FITS_STRUCTURE_CHECKED" for item in result["sourceFiles"])
        result["knownRawBytesReceivedOrReused"] = sum(item["bytes"] for item in result["sourceFiles"] if item["bytes"] is not None)
        assert result["knownRawBytesReceivedOrReused"] <= result["maximumTotalResponseBytes"]
        save(output / "acquisition.json", result)
        print(json.dumps({"phase": "saved", "filename": filename, "state": record["state"], "httpStatus": record.get("httpStatus"),
                          "bytes": record["bytes"], "elapsedSeconds": record.get("elapsedSeconds")}), flush=True)
    after = [bind(path) for path in source_paths]
    assets_after = inventory(ROOT / "workers/miniapp-api/assets/deep-sky")
    assert before == after and assets_before == assets_after
    assert frames_before == inventory(ROOT / "output/sdss-corrected-m51-1002")
    assert candidate_before == inventory(ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2")
    result.update(sourceFilesAfter=after, old201AssetsUnchanged=True, oldCorrectedSourcesAndMosaicUnchanged=True, finishedUtc=now())
    save(output / "acquisition.json", result)
    save(output / "binding.json", {"script": bind(Path(__file__)), "inputsBefore": before, "inputsAfter": after,
                                   "oldAssetsBefore": assets_before, "oldAssetsAfter": assets_after,
                                   "oldCorrectedSourceBefore": frames_before, "oldMosaicBefore": candidate_before,
                                   "outputs": inventory(output), "scope": result["scope"]})
    print(json.dumps({"phase": "done", "acquisition": bind(output / "acquisition.json"), "binding": bind(output / "binding.json"),
                      "checkedStructures": result["checkedStructures"], "sourceFilesUnchanged": True}), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--child", choices=FILES)
    parser.add_argument("--reused")
    arguments = parser.parse_args()
    directory = arguments.output.resolve()
    if arguments.child:
        child(directory, arguments.child, arguments.reused)
    else:
        parent(directory)
