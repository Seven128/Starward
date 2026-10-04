"""Prepared once-only five-field acquisition; run only after explicit authorization.

The approved exact plan/hash and --execute-once are required. No plan generation,
endpoint rearrangement, retries, source-frame fetches or publication are provided.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
VERSION = "sdss-five-contributing-fields-quality-input-plan-v1"
FIELDS = ((3699, 99), (3699, 101), (3716, 116), (3716, 117), (3716, 118))
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
sys.path.insert(0, str(ROOT / "data-pipelines/deep-sky"))
import sdss_frame_quality as quality
from sdss_corrected_frame import read_cached_frame

# Reuse the already exercised task's TLS redirect guard, atomic receipt writer,
# byte binding, time stamps and table summaries; no legacy acquisition is run.
LEGACY = TASK / "scripts/experience-sdss-core-quality-inputs-2026-10-02.py"
spec = importlib.util.spec_from_file_location("sdss_owned_quality_acquisition_helpers", LEGACY)
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
MAX_RAW, MAX_FITS = common.MAX_RAW, common.MAX_FITS
bind, save, now, inventory = common.bind, common.save, common.now, common.inventory


def validate_plan(path, sha):
    if bind(path)["sha256"] != sha:
        raise RuntimeError("approved_plan_bytes_changed")
    plan = json.loads(path.read_bytes())
    expected = {}
    for run, field in FIELDS:
        for band in (None, "g", "r", "i"):
            name = f"psField-{run:06d}-6-{field:04d}.fit" if band is None else f"fpM-{run:06d}-{band}6-{field:04d}.fit.gz"
            identity = {"run": run, "rerun": "301", "camcol": 6, "field": field}
            if band is not None:
                identity["band"] = band
            url = f"https://data.sdss.org/sas/dr17/eboss/photo/redux/301/{run}/objcs/6/{name}"
            expected[name] = (identity, url)
    if plan.get("version") != VERSION or len(plan.get("files", [])) != 20:
        raise RuntimeError("approved_input_version_or_count_invalid")
    actual = {entry["filename"]: (entry["identity"], entry["sourceUrl"]) for entry in plan["files"]}
    if actual != expected:
        raise RuntimeError("approved_exact_fields_or_canonical_sources_changed")
    for entry in plan["frozenInputs"]:
        if bind(ROOT / entry["path"]) != entry:
            raise RuntimeError("frozen_plan_dependency_changed")
    return plan


def cached_source(entry, matches, excluded):
    verified = []
    genuine_matches = []
    excluded_by_path = {item["fixture"]["path"]: item["fixture"] for item in excluded}
    for path in matches:
        actual = bind(path)
        if actual["path"] in excluded_by_path:
            if actual != excluded_by_path[actual["path"]]:
                raise RuntimeError("bound_synthetic_fixture_changed_no_request")
            continue
        genuine_matches.append(path)
        if actual["bytes"] > MAX_RAW:
            continue
        generation = path.parent.parent if path.parent.name == "sources" else path.parent
        receipt_path = generation / (entry["filename"] + ".request.json")
        if not receipt_path.is_file():
            continue
        receipt = json.loads(receipt_path.read_bytes())
        if (receipt.get("url") == entry["sourceUrl"] and receipt.get("actualFinalUrl") == entry["sourceUrl"] and
                receipt.get("httpStatus") == 200 and receipt.get("rawTransferComplete") is True and
                receipt.get("raw") == actual and receipt.get("bytes") == actual["bytes"] and receipt.get("sha256") == actual["sha256"]):
            verified.append({"raw": actual, "requestReceipt": bind(receipt_path)})
    if len({value["raw"]["sha256"] for value in verified}) > 1:
        raise RuntimeError("cached_canonical_bytes_ambiguous_no_request")
    if genuine_matches and not verified:
        raise RuntimeError("cached_bytes_without_matching_complete_receipt_no_request")
    return verified[0] if verified else None


def child(output, entry, cached):
    filename, url = entry["filename"], entry["sourceUrl"]
    receipt_path = output / (filename + ".request.json")
    record = {"version": VERSION, "filename": filename, "identity": entry["identity"], "url": url,
              "actualFinalUrl": None, "httpStatus": None, "state": "REQUEST_STARTED", "bytes": None, "sha256": None,
              "requestIssued": False, "acquisition": "REUSED_BYTE_BOUND_CACHE" if cached else "ONE_CANONICAL_REQUEST",
              "startedUtc": now(), "socketTimeoutSeconds": 30, "wholeChildBudgetSeconds": 40,
              "maximumResponseBytes": MAX_RAW, "maximumDecodedFitsBytes": MAX_FITS,
              "automaticRetries": 0, "redirectsAllowed": False, "tls": "default CA and hostname verification"}
    save(receipt_path, record)
    started = time.monotonic()
    raw_path = ROOT / cached["raw"]["path"] if cached else output / "sources" / filename
    try:
        if cached:
            actual = bind(raw_path)
            if actual != cached["raw"]:
                raise RuntimeError("cached_raw_bytes_changed")
            record.update(cacheEvidence=cached, actualFinalUrl=url, httpStatus=200)
        else:
            context = ssl.create_default_context()
            assert context.check_hostname and context.verify_mode == ssl.CERT_REQUIRED
            opener = urllib.request.build_opener(common.NoRedirect(), urllib.request.HTTPSHandler(context=context))
            record["requestIssued"] = True
            save(receipt_path, record)
            with opener.open(urllib.request.Request(url, headers={"User-Agent": "Starward-bounded-SDSS-contributing-quality/1.0"}), timeout=30) as response:
                record.update(actualFinalUrl=response.geturl(), httpStatus=response.status,
                              contentLengthHeader=response.headers.get("Content-Length"))
                if response.status != 200 or response.geturl() != url:
                    raise RuntimeError("canonical_response_invalid")
                if response.headers.get("Content-Length") is not None and int(response.headers["Content-Length"]) > MAX_RAW:
                    raise RuntimeError("declared_response_byte_budget_exceeded")
                save(receipt_path, record)
                with raw_path.open("xb") as target:
                    remaining = MAX_RAW
                    while remaining:
                        block = response.read(min(65536, remaining))
                        if not block:
                            break
                        target.write(block)
                        target.flush()
                        remaining -= len(block)
                    if remaining == 0:
                        raise RuntimeError("hard_response_byte_budget_reached")
            actual = bind(raw_path)
            if record.get("contentLengthHeader") is not None and actual["bytes"] != int(record["contentLengthHeader"]):
                raise RuntimeError("declared_response_incomplete")
        record.update(state="RAW_ACQUIRED_UNCHECKED", raw=actual, bytes=actual["bytes"], sha256=actual["sha256"], rawTransferComplete=True)
        save(receipt_path, record)
        expected = {**entry["identity"], "sourceUrl": url, "bytes": actual["bytes"], "sha256": actual["sha256"]}
        kind = "psField" if filename.startswith("psField") else "fpM"
        raw, identity, source = quality._read_source(raw_path, expected, kind, MAX_FITS)
        decoded_path = raw_path if kind == "psField" else output / "decoded" / filename[:-3]
        if kind == "fpM":
            with decoded_path.open("xb") as target:
                target.write(raw)
        record["decodedFits"] = bind(decoded_path)
        with quality._checked_fits(raw, identity, source, kind, MAX_FITS) as (hdus, inspection):
            inspection["allColumnsActualReadback"] = [{"hdu": index, "columns": [
                {"name": column.name, "readback": common.column_summary(hdu.data[column.name])} for column in hdu.columns]}
                for index, hdu in enumerate(hdus) if index]
        save(output / (filename + ".inspection.json"), inspection)
        record.update(state="FITS_STRUCTURE_CHECKED_QUALITY_UNCHECKED", inspection=bind(output / (filename + ".inspection.json")))
        save(receipt_path, record)
        try:
            diagnostic = (quality.read_cached_psfield if kind == "psField" else quality.read_cached_fpm)(raw_path, expected, max_uncompressed_bytes=MAX_FITS)
            save(output / (filename + ".quality-admission.json"), diagnostic.receipt)
            record.update(state="DIAGNOSTIC_STRUCTURE_CHECKED_SCIENTIFIC_QUALITY_UNKNOWN",
                          qualityAdmission=bind(output / (filename + ".quality-admission.json")))
        except RuntimeError as error:
            record.update(qualityAdmissionError=str(error), scientificQuality="UNKNOWN")
    except urllib.error.HTTPError as error:
        record.update(state="UNAVAILABLE", httpStatus=error.code, errorKind="HTTP_ERROR", errorCode=f"HTTP_{error.code}")
        error.close()
    except Exception as error:
        record.update(errorKind=type(error).__name__, errorCode=str(error) if isinstance(error, RuntimeError) else "network_or_readback_failure")
        if raw_path.is_file():
            actual = bind(raw_path)
            record.update(state="RAW_ACQUIRED_UNCHECKED", raw=actual, bytes=actual["bytes"], sha256=actual["sha256"])
        else:
            record["state"] = "UNAVAILABLE"
    finally:
        record.update(finishedUtc=now(), elapsedSeconds=time.monotonic() - started)
        save(receipt_path, record)


def parent(output, plan, plan_path):
    if output.exists() or not output.is_relative_to(ROOT / "output"):
        raise RuntimeError("exclusive_workspace_output_required")
    output.mkdir(exist_ok=False)
    (output / "sources").mkdir()
    (output / "decoded").mkdir()
    (output / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    (output / "approved-plan.json").write_bytes(plan_path.read_bytes())
    listed = subprocess.run(["rg", "--files", "-uuu", "output", ".codex", "data-pipelines", "workers/miniapp-api/assets"], cwd=ROOT,
                            capture_output=True, text=True, check=True, timeout=30)
    matches = {entry["filename"]: sorted(ROOT / value for value in listed.stdout.splitlines() if Path(value).name == entry["filename"]
                                        and not (ROOT / value).is_relative_to(output)) for entry in plan["files"]}
    save(output / "cache-recheck.json", {name: [bind(path) for path in paths] for name, paths in matches.items()})
    protected = plan["protectedInputs"]
    before = [bind(ROOT / record["path"]) for record in protected]
    if before != protected:
        raise RuntimeError("protected_inputs_changed_since_preparation")
    result = {"version": VERSION, "scope": "Exactly five contributing fields quality raw input/readback; no science/PSF/mask selection or publication",
              "script": bind(Path(__file__)), "approvedPlan": bind(plan_path), "sourceFiles": [], "attemptedRequests": 0,
              "maximumRequests": 20, "maximumTotalResponseBytes": 20 * MAX_RAW, "maximumTotalDecodedFitsBytes": 20 * MAX_FITS,
              "scientificQuality": "UNKNOWN"}
    save(output / "acquisition.json", result)
    for entry in plan["files"]:
        filename = entry["filename"]
        print(json.dumps({"phase": "one_request_or_cached_read", "filename": filename}), flush=True)
        try:
            cached = cached_source(entry, matches[filename], plan["excludedSyntheticFixtures"])
        except RuntimeError as error:
            record = {"version": VERSION, "filename": filename, "identity": entry["identity"], "url": entry["sourceUrl"],
                      "state": "CACHE_UNVERIFIED_NO_REQUEST", "errorCode": str(error), "bytes": None, "sha256": None,
                      "httpStatus": None, "requestIssued": False, "cachedCandidates": [bind(path) for path in matches[filename]]}
            save(output / (filename + ".request.json"), record)
        else:
            child_spec = output / (filename + ".coded-child-input.json")
            save(child_spec, {"version": VERSION, "entry": entry, "cached": cached})
            command = [sys.executable, str(Path(__file__).resolve()), "--plan", str(plan_path), "--plan-sha256", bind(plan_path)["sha256"],
                       "--output", str(output), "--execute-once", "--child-input", str(child_spec)]
            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            timed_out = False
            try:
                stdout, stderr = process.communicate(timeout=40)
            except subprocess.TimeoutExpired:
                timed_out = True
                process.kill()
                stdout, stderr = process.communicate()
            receipt_path = output / (filename + ".request.json")
            record = json.loads(receipt_path.read_bytes()) if receipt_path.is_file() else {"filename": filename, "url": entry["sourceUrl"],
                    "identity": entry["identity"], "state": "UNAVAILABLE", "bytes": None, "sha256": None, "httpStatus": None, "requestIssued": False}
            if timed_out:
                record.update(errorKind="WHOLE_CHILD_TIME_BUDGET_EXCEEDED", finishedUtc=now())
                raw_path = ROOT / cached["raw"]["path"] if cached else output / "sources" / filename
                if raw_path.is_file() and record["state"] in ("REQUEST_STARTED", "UNAVAILABLE"):
                    actual = bind(raw_path)
                    record.update(state="RAW_ACQUIRED_UNCHECKED", raw=actual, bytes=actual["bytes"], sha256=actual["sha256"])
                save(receipt_path, record)
            if stderr:
                (output / (filename + ".child-stderr.txt")).write_bytes(stderr)
        result["sourceFiles"].append(record)
        result["attemptedRequests"] = sum(bool(item.get("requestIssued")) for item in result["sourceFiles"])
        result["knownRawBytesReceivedOrReused"] = sum(item["bytes"] for item in result["sourceFiles"] if item.get("bytes") is not None)
        assert result["attemptedRequests"] <= 20 and result["knownRawBytesReceivedOrReused"] <= 20 * MAX_RAW
        save(output / "acquisition.json", result)
        print(json.dumps({"phase": "saved", "filename": filename, "state": record["state"], "bytes": record.get("bytes")}), flush=True)
    after = [bind(ROOT / record["path"]) for record in protected]
    # Correlation is performed only for complete, supported quality inputs and
    # existing byte-bound corrected frames. Missing inputs never become masks.
    result["fieldAssociations"] = []
    by_name = {record["filename"]: record for record in result["sourceFiles"]}
    for run, field in FIELDS:
        names = [f"psField-{run:06d}-6-{field:04d}.fit"] + [f"fpM-{run:06d}-{band}6-{field:04d}.fit.gz" for band in "gri"]
        associated = {"identity": {"run": run, "rerun": "301", "camcol": 6, "field": field},
                      "quality": "UNKNOWN", "state": "INPUTS_INCOMPLETE_OR_UNSUPPORTED"}
        if all(by_name[name]["state"] == "DIAGNOSTIC_STRUCTURE_CHECKED_SCIENTIFIC_QUALITY_UNKNOWN" for name in names):
            try:
                def expected(record):
                    return {**record["identity"], "bytes": record["bytes"], "sha256": record["sha256"], "sourceUrl": record["url"]}
                ps = quality.read_cached_psfield(ROOT / by_name[names[0]]["raw"]["path"], expected(by_name[names[0]]), max_uncompressed_bytes=MAX_FITS)
                checked = []
                field_spec = next(item for item in plan["fields"] if item["identity"] == associated["identity"])
                for band, name in zip("gri", names[1:]):
                    mask = quality.read_cached_fpm(ROOT / by_name[name]["raw"]["path"], expected(by_name[name]), max_uncompressed_bytes=MAX_FITS)
                    source = next(value for value in field_spec["correctedFrames"] if value["band"] == band)
                    frame_expected = {**associated["identity"], "band": band, "bytes": source["bytes"], "sha256": source["sha256"], "sourceUrl": source["sourceUrl"]}
                    frame = read_cached_frame(ROOT / source["path"], frame_expected, max_uncompressed_bytes=32 * 1024 * 1024)
                    checked.append(quality.check_frame_quality(frame, ps, mask))
                associated.update(state="CACHED_FRAME_QUALITY_INPUTS_CORRELATED", bands=checked)
            except RuntimeError as error:
                associated.update(state="CORRELATION_UNAVAILABLE", errorCode=str(error))
        save(output / f"field-{run}-{field}.association.json", associated)
        result["fieldAssociations"].append(associated)
        save(output / "acquisition.json", result)
    result["knownDecodedFitsBytes"] = sum(record["decodedFits"]["bytes"] for record in result["sourceFiles"] if record.get("decodedFits"))
    assert result["knownDecodedFitsBytes"] <= 20 * MAX_FITS
    after = [bind(ROOT / record["path"]) for record in protected]
    assert before == after
    validate_plan(plan_path, bind(plan_path)["sha256"])
    result.update(protectedInputsUnchanged=True, finishedUtc=now())
    save(output / "acquisition.json", result)
    save(output / "binding.json", {"script": bind(Path(__file__)), "plan": bind(plan_path), "before": before, "after": after,
                                   "outputsBeforeBinding": inventory(output), "scope": result["scope"]})
    print(json.dumps({"phase": "done", "acquisition": bind(output / "acquisition.json"), "binding": bind(output / "binding.json")}), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--plan-sha256", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--execute-once", action="store_true", required=True)
    parser.add_argument("--child-input", type=Path)
    args = parser.parse_args()
    plan = validate_plan(args.plan.resolve(), args.plan_sha256)
    if args.child_input:
        coded = json.loads(args.child_input.read_bytes())
        if coded.get("version") != VERSION or coded.get("entry") not in plan["files"]:
            raise RuntimeError("coded_child_input_not_in_approved_plan")
        child(args.output.resolve(), coded["entry"], coded.get("cached"))
    else:
        parent(args.output.resolve(), plan, args.plan.resolve())
