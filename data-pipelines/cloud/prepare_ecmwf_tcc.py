"""Offline IFS total-cloud publication. No API process decodes GRIB data.

The official client selects just tcc byte ranges. ecCodes decodes one native
frame at a time; immutable regional numeric files retain the original samples.
Only a complete, qualified same-run batch receives a manifest. This module
does not change a live pointer, upload data, or replace QWeather consumers.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import threading
import time
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import numpy as np
import requests

UTC = timezone.utc
SCHEMA = "starward-ecmwf-tcc-batch-v1"
METHOD = "ifs-0p1-tcc-native-f32-mask-v1"
NATIVE_STEPS = tuple(range(0, 145, 3)) + tuple(range(150, 361, 6))
DEFAULT_BOUNDS = (70.0, 0.0, 140.0, 55.0)
MAXIMUM_OUTPUT_BYTES = 512 * 1024 * 1024
MAXIMUM_INDEX_BYTES = 1024 * 1024
REQUEST_TIMEOUT_SECONDS = 30
OFFICIAL_MIRRORS = ("ecmwf", "aws", "google", "azure")

# This is the known provider incident, not a claim that future corrections do
# not exist. A model restart can change a coherent group without changing runAt.
KNOWN_CORRECTIONS = ({
    "url": "https://forum.ecmwf.int/t/free-and-open-data-issue-ifs-22-october-2026-00-utc-forecast-steps-288-to-360/15493",
    "runAt": "2026-10-22T00:00:00Z", "steps": tuple(range(288, 361, 6)),
    "reacquireAfter": "2026-10-23T13:00:00Z",
},)


def instant(value: str) -> datetime:
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("cloud_time_requires_offset")
    return result.astimezone(UTC)


def iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def sha_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical(value: Any) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n").encode()


def immutable(path: Path, data: bytes) -> dict:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("xb") as target:
            target.write(data)
    except FileExistsError:
        if path.stat().st_size != len(data) or sha_file(path) != hashlib.sha256(data).hexdigest():
            raise ValueError("cloud_immutable_file_conflict")
    return {"file": path.name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


class AcquisitionBudget:
    """One offline attempt; no cleanup, API work, live pointer or new scheduler."""
    def __init__(self, output: Path, deadline: datetime, maximum_output_bytes: int):
        if deadline.tzinfo is None or not isinstance(maximum_output_bytes, int) or maximum_output_bytes <= 0:
            raise ValueError("cloud_acquisition_limits_invalid")
        self.output, self.deadline, self.maximum_output_bytes = output, deadline, maximum_output_bytes
        self.wire_bytes = 0

    def check(self):
        if datetime.now(UTC) >= self.deadline:
            raise ValueError("cloud_acquisition_deadline_exceeded")

    def admit_output(self, extra: int = 0):
        self.check()
        used = sum(item.stat().st_size for item in self.output.rglob("*") if item.is_file())
        if used + extra > self.maximum_output_bytes:
            raise ValueError("cloud_acquisition_output_budget_exceeded")

    def put(self, path: Path, data: bytes):
        self.admit_output(0 if path.exists() else len(data))
        return immutable(path, data)


def public_source_url(url: str):
    """Signed query parameters, if a mirror uses them, are never provenance."""
    parsed = urlsplit(url)
    return urlunsplit((parsed.scheme, parsed.netloc.rsplit("@", 1)[-1], parsed.path, "", ""))


class PinnedSourceSession(requests.Session):
    """Keep the official client's URL/index/range owner, pin each HTTP object.

    Strong per-object conditionals stop torn index/range transfers. They do not
    establish an atomic revision shared by all forecast steps.
    """
    def __init__(self, budget: AcquisitionBudget):
        super().__init__()
        self.budget = budget
        self.pins: dict[str, dict] = {}
        self.conditionals_verified = False

    def send_read(self, method: str, url: str, **kwargs):
        # The official client's maximum_retries=1 means one attempt. Keep it
        # there, and own exactly one retry here rather than nesting retry loops.
        transient = (408, 429, 500, 502, 503, 504)
        for attempt in range(2):
            self.budget.check()
            remaining = (self.budget.deadline - datetime.now(UTC)).total_seconds()
            kwargs["timeout"] = (max(.001, min(10, remaining)), max(.001, min(REQUEST_TIMEOUT_SECONDS, remaining)))
            kwargs["stream"] = True
            try:
                response = super().request(method, url, **kwargs)
            except (requests.ConnectionError, requests.Timeout) as error:
                self.failure(method, url, attempt + 1, error_type=type(error).__name__)
                if attempt:
                    raise ValueError("cloud_source_connection_failed") from None
            else:
                if response.status_code >= 400 and not (response.status_code == 412 and
                    kwargs.get("headers", {}).get("If-Match") == '"starward-deliberately-not-current"'):
                    self.failure(method, url, attempt + 1, status=response.status_code)
                if response.status_code not in transient or attempt:
                    return response
                response.close()
            self.budget.check()
            if (self.budget.deadline - datetime.now(UTC)).total_seconds() <= 1:
                raise ValueError("cloud_acquisition_deadline_exceeded")
            time.sleep(1)
        raise AssertionError("unreachable")

    def failure(self, method: str, url: str, attempt: int, status=None, error_type=None):
        entry = canonical({"method": method, "url": public_source_url(url), "attempt": attempt,
                           "status": status, "errorType": error_type, "observedAt": iso(datetime.now(UTC))})
        self.budget.admit_output(len(entry))
        with (self.budget.output / "source-errors.jsonl").open("ab") as target:
            target.write(entry)

    def verify_conditionals(self, url: str):
        if self.conditionals_verified:
            return
        response = self.send_read("GET", url, headers={"Range": "bytes=0-0", "If-Match": '"starward-deliberately-not-current"'})
        try:
            # Do not consume a body if an endpoint ignored the false validator.
            if response.status_code != 412:
                response.raise_for_status()
                raise ValueError("cloud_source_conditionals_not_enforced")
            self.conditionals_verified = True
        finally:
            response.close()

    def pin(self, url: str):
        if url in self.pins:
            return self.pins[url]
        response = self.send_read("HEAD", url)
        try:
            response.raise_for_status()
            etag, length = response.headers.get("ETag", ""), response.headers.get("Content-Length", "")
            if not re.fullmatch(r'"[^"\r\n]+"', etag) or not length.isdecimal() or int(length) < 1:
                raise ValueError("cloud_source_object_identity_unavailable")
            self.pins[url] = {"url": public_source_url(url), "etag": etag, "bytes": int(length),
                              "lastModified": response.headers.get("Last-Modified"), "pinnedAt": iso(datetime.now(UTC))}
            return self.pins[url]
        finally:
            response.close()

    def request(self, method: str, url: str, **kwargs):
        method = method.upper()
        if method not in ("HEAD", "GET") or urlsplit(url).scheme != "https":
            raise ValueError("cloud_source_request_unsupported")
        if method == "HEAD":
            response = self.send_read(method, url, **kwargs)
            try:
                self.budget.check()
                return response
            finally:
                # HEAD callers need only headers, not an owned live socket.
                response.close()
        is_index = urlsplit(url).path.endswith(".index")
        if is_index:
            data_url = url.rsplit(".index", 1)[0] + ".grib2"
            self.verify_conditionals(data_url)
            # Pin data before reading the index. Its subsequent Range must
            # still refer to exactly this object, even if an index is replaced.
            self.pin(data_url)
        else:
            self.verify_conditionals(url)
        pin = self.pin(url)
        headers = requests.structures.CaseInsensitiveDict(kwargs.pop("headers", {}) or {})
        headers["Accept-Encoding"] = "identity"
        headers["If-Match"] = pin["etag"]
        part = re.fullmatch(r"bytes=(\d+)-(\d+)", headers.get("Range", ""))
        if is_index:
            if pin["bytes"] > MAXIMUM_INDEX_BYTES or part:
                raise ValueError("cloud_source_index_budget_exceeded")
            expected = pin["bytes"]
        else:
            if not part:
                raise ValueError("cloud_source_unbounded_data_request")
            start, end = map(int, part.groups())
            if start > end or end >= pin["bytes"]:
                raise ValueError("cloud_source_range_invalid")
            expected = end - start + 1
        self.budget.admit_output(expected)
        response = self.send_read(method, url, headers=headers, **kwargs)
        try:
            if public_source_url(response.url) != public_source_url(url):
                raise ValueError("cloud_source_redirect_unqualified")
            if response.status_code == 412:
                raise ValueError("cloud_source_object_changed")
            response.raise_for_status()
            if response.headers.get("ETag") != pin["etag"]:
                raise ValueError("cloud_source_object_changed")
            if response.headers.get("Content-Encoding", "identity") != "identity":
                raise ValueError("cloud_source_encoded_response_unsupported")
            if response.status_code != (200 if is_index else 206) or response.headers.get("Content-Length") != str(expected):
                raise ValueError("cloud_source_range_response_invalid")
            if not is_index and response.headers.get("Content-Range") != f"bytes {start}-{end}/{pin['bytes']}":
                raise ValueError("cloud_source_range_response_invalid")
        except BaseException:
            response.close()
            raise
        original = response.iter_content
        def content(*args, **kwargs):
            transferred, digest, index_bytes = 0, hashlib.sha256(), bytearray()
            try:
                for chunk in original(*args, **kwargs):
                    self.budget.check()
                    transferred += len(chunk)
                    self.budget.wire_bytes += len(chunk)
                    if transferred > expected or self.budget.wire_bytes > self.budget.maximum_output_bytes:
                        raise ValueError("cloud_source_transfer_budget_exceeded")
                    digest.update(chunk)
                    if is_index:
                        index_bytes.extend(chunk)
                    yield chunk
                if transferred != expected:
                    raise ValueError("cloud_source_transfer_length_mismatch")
                pin["bodySha256"] = digest.hexdigest()
                pin["verifiedTransferBytes"] = transferred
                if is_index:
                    name = hashlib.sha256(public_source_url(url).encode()).hexdigest() + ".index"
                    descriptor = self.budget.put(self.budget.output / "source-objects" / name, bytes(index_bytes))
                    pin["indexFile"] = {**descriptor, "file": "source-objects/" + name}
            finally:
                response.close()
        response.iter_content = content
        return response

    def receipt(self, result, raw: Path):
        if len(result.urls) != 1 or len(result.urls[0]) != 2:
            raise ValueError("cloud_source_selection_ambiguous")
        url, ranges = result.urls[0]
        if len(ranges) != 1:
            raise ValueError("cloud_source_selection_ambiguous")
        offset, length = ranges[0]
        data, index = self.pins[url], self.pins[url.rsplit(".", 1)[0] + ".index"]
        if raw.stat().st_size != length or data.get("verifiedTransferBytes") != length or data.get("bodySha256") != sha_file(raw):
            raise ValueError("cloud_source_selected_message_length_mismatch")
        return {"schemaVersion": "starward-cloud-object-acquisition-v1", "conditionalsEnforced": self.conditionals_verified,
                "data": dict(data), "index": dict(index), "range": {"offset": offset, "length": length}}

    def revalidate(self):
        for url, pin in self.pins.items():
            response = self.send_read("HEAD", url, headers={"If-Match": pin["etag"]})
            try:
                if response.status_code != 200 or response.headers.get("ETag") != pin["etag"] or response.headers.get("Content-Length") != str(pin["bytes"]):
                    raise ValueError("cloud_source_object_changed")
            finally:
                response.close()
        return {"objects": len(self.pins), "checkedAt": iso(datetime.now(UTC)), "meaning": "per-object revalidation, not atomic batch revision"}

    def adopt_receipt(self, receipt: dict):
        upstream = receipt.get("upstream")
        if not upstream:
            return False
        if upstream.get("schemaVersion") != "starward-cloud-object-acquisition-v1" or upstream.get("conditionalsEnforced") is not True:
            raise ValueError("cloud_source_receipt_invalid")
        data, index = upstream["data"], upstream["index"]
        self.verify_conditionals(data["url"])
        descriptor = index.get("indexFile", {})
        if not re.fullmatch(r"source-objects/[a-f0-9]{64}\.index", descriptor.get("file", "")):
            raise ValueError("cloud_source_receipt_invalid")
        file = self.budget.output / descriptor["file"]
        if file.stat().st_size != descriptor.get("bytes") or sha_file(file) != descriptor.get("sha256"):
            raise ValueError("cloud_source_receipt_invalid")
        for pin in (data, index):
            if urlsplit(pin["url"]).scheme != "https" or not re.fullmatch(r'"[^"\r\n]+"', pin.get("etag", "")):
                raise ValueError("cloud_source_receipt_invalid")
            self.pins[pin["url"]] = dict(pin)
        return True


def qualify_corrections(frames: list[dict], run: datetime):
    checks = []
    for correction in KNOWN_CORRECTIONS:
        requested = {frame["stepHours"]: frame for frame in frames}
        affected = iso(run) == correction["runAt"] and bool(set(requested) & set(correction["steps"]))
        if affected:
            if not set(correction["steps"]).issubset(requested):
                raise ValueError("cloud_source_correction_group_incomplete")
            for step in correction["steps"]:
                source = requested[step]["source"]
                if instant(source["retrievedAt"]) <= instant(correction["reacquireAfter"]) or not source.get("upstream", {}).get("conditionalsEnforced"):
                    raise ValueError("cloud_source_correction_requires_full_reacquisition")
        checks.append({"noticeUrl": correction["url"], "runAt": correction["runAt"], "affectedRequestedSteps": affected,
                       "result": "COMPLETE_REACQUIRED_GROUP" if affected else "NOT_APPLICABLE"})
    return checks


def required_steps(run: datetime, as_of: datetime, reserve_hours: int = 12) -> tuple[int, ...]:
    if run.hour not in (0, 12) or run.minute or run.second or run.microsecond:
        raise ValueError("cloud_run_requires_00_or_12_utc")
    if not 0 <= reserve_hours <= 24 or run > as_of:
        raise ValueError("cloud_batch_time_invalid")
    # Reserve covers the chosen 12-hour supply cycle; it is not extrapolation.
    last = (as_of - run).total_seconds() / 3600 + 240 + reserve_hours
    final = next((step for step in NATIVE_STEPS if step >= last), None)
    if final is None:
        raise ValueError("cloud_run_cannot_cover_future_240_hours")
    return tuple(step for step in NATIVE_STEPS if step <= final)


def crop_indices(meta: dict, bounds: tuple[float, float, float, float]):
    west, south, east, north = bounds
    if not all(math.isfinite(n) for n in bounds) or not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
        raise ValueError("cloud_bounds_invalid")
    if meta["gridType"] != "regular_ll" or meta["Ni"] != 3600 or meta["Nj"] != 1801:
        raise ValueError("cloud_grid_invalid")
    if any(meta[key] != 0 for key in ("iScansNegatively", "jScansPositively", "jPointsAreConsecutive", "alternativeRowScanning")):
        raise ValueError("cloud_scan_order_unsupported")
    if abs(meta["iDirectionIncrementInDegrees"] - 0.1) > 1e-9 or abs(meta["jDirectionIncrementInDegrees"] - 0.1) > 1e-9:
        raise ValueError("cloud_resolution_invalid")
    if abs(meta["latitudeOfFirstGridPointInDegrees"] - 90) > 1e-9 or abs(meta["latitudeOfLastGridPointInDegrees"] + 90) > 1e-9:
        raise ValueError("cloud_latitude_grid_invalid")
    expected_last = (meta["longitudeOfFirstGridPointInDegrees"] + 3599 * 0.1) % 360
    if abs(expected_last - meta["longitudeOfLastGridPointInDegrees"] % 360) > 1e-7:
        raise ValueError("cloud_longitude_grid_invalid")
    if abs(meta["longitudeOfFirstGridPointInDegrees"] * 10 - round(meta["longitudeOfFirstGridPointInDegrees"] * 10)) > 1e-7:
        raise ValueError("cloud_longitude_origin_not_native_tenth")
    # Expand to native centres, preserving a bracket around a requested edge.
    west_i, east_i = math.floor(west * 10 + 1e-8), math.ceil(east * 10 - 1e-8)
    south_i, north_i = math.floor(south * 10 + 1e-8), math.ceil(north * 10 - 1e-8)
    if (east_i - west_i + 1) * (north_i - south_i + 1) > 1_000_000:
        raise ValueError("cloud_crop_exceeds_offline_frame_budget")
    columns = ((np.arange(west_i, east_i + 1) - round(meta["longitudeOfFirstGridPointInDegrees"] * 10)) % 3600).astype(np.int64)
    rows = (900 - np.arange(north_i, south_i - 1, -1)).astype(np.int64)
    grid = {"crs": "WGS84", "layout": "row-major-north-to-south", "registration": "grid-point-centres",
            "width": len(columns), "height": len(rows), "west": west_i / 10, "north": north_i / 10,
            "longitudeStep": 0.1, "latitudeStep": -0.1, "unit": "fraction", "valueType": "float32-le",
            "maskType": "uint8", "validMaskValue": 1}
    return rows, columns, grid


META_KEYS = ("centre", "class", "stream", "dataType", "edition", "typeOfGeneratingProcess", "generatingProcessIdentifier",
             "shortName", "paramId", "units", "gridType", "Ni", "Nj", "latitudeOfFirstGridPointInDegrees",
             "longitudeOfFirstGridPointInDegrees", "latitudeOfLastGridPointInDegrees", "longitudeOfLastGridPointInDegrees",
             "iDirectionIncrementInDegrees", "jDirectionIncrementInDegrees", "iScansNegatively", "jScansPositively",
             "jPointsAreConsecutive", "alternativeRowScanning", "dataDate", "dataTime", "step", "stepType",
             "validityDate", "validityTime", "packingType", "bitsPerValue", "bitmapPresent", "numberOfMissing")


def validate_origin(meta: dict):
    expected = {"centre": "ecmf", "class": "od", "stream": "oper", "dataType": "fc", "edition": 2, "typeOfGeneratingProcess": 2}
    if any(meta.get(key) != value for key, value in expected.items()):
        raise ValueError("cloud_grib_origin_invalid")


def decode_frame(path: Path, run: datetime, step: int, bounds=DEFAULT_BOUNDS):
    import eccodes
    with path.open("rb") as source:
        handle = eccodes.codes_grib_new_from_file(source)
        if handle is None:
            raise ValueError("cloud_grib_empty")
        try:
            meta = {key: eccodes.codes_get(handle, key) for key in META_KEYS}
            validate_origin(meta)
            if meta["shortName"] != "tcc" or meta["paramId"] != 164 or meta["units"] != "(0 - 1)" or meta["stepType"] != "instant":
                raise ValueError("cloud_parameter_invalid")
            valid = run + timedelta(hours=step)
            if (meta["dataDate"], meta["dataTime"], meta["step"], meta["validityDate"], meta["validityTime"]) != (
                    int(run.strftime("%Y%m%d")), run.hour * 100, step, int(valid.strftime("%Y%m%d")), valid.hour * 100):
                raise ValueError("cloud_grib_run_or_valid_time_mismatch")
            rows, columns, grid = crop_indices(meta, bounds)
            # ecCodes supports selected elements without Python latitude/longitude
            # arrays or retaining a global ndarray for every frame in the batch.
            indices = (rows[:, None] * meta["Ni"] + columns).ravel()
            values = np.asarray(eccodes.codes_get_elements(handle, "values", indices.tolist()), dtype=np.float64)
            missing = eccodes.codes_get(handle, "missingValue")
            mask = (np.isfinite(values) & (values != missing)).astype(np.uint8)
            if np.any((values[mask == 1] < 0) | (values[mask == 1] > 1)):
                raise ValueError("cloud_fraction_out_of_range")
            numeric = values.astype("<f4")
            if not np.array_equal(numeric[mask == 1].astype(np.float64), values[mask == 1]):
                raise ValueError("cloud_float32_would_change_native_values")
            numeric[mask == 0] = np.nan
            second = eccodes.codes_grib_new_from_file(source)
            if second is not None:
                eccodes.codes_release(second)
                raise ValueError("cloud_grib_multiple_fields")
            return numeric, mask, grid, meta
        finally:
            eccodes.codes_release(handle)


def qualify(frames: list[dict], run: datetime, as_of: datetime, expected_steps: tuple[int, ...]):
    if not expected_steps:
        raise ValueError("cloud_batch_empty")
    if [frame["stepHours"] for frame in frames] != list(expected_steps):
        raise ValueError("cloud_batch_missing_or_duplicate_step")
    if expected_steps != tuple(step for step in NATIVE_STEPS if step <= expected_steps[-1]):
        raise ValueError("cloud_batch_native_gap")
    if any(frame["validAt"] != iso(run + timedelta(hours=frame["stepHours"])) for frame in frames):
        raise ValueError("cloud_batch_valid_time_mismatch")
    end = run + timedelta(hours=expected_steps[-1])
    if end < as_of + timedelta(hours=240):
        raise ValueError("cloud_batch_coverage_short")
    return {"validFrom": iso(run), "validTo": iso(end), "qualifiedAt": iso(as_of), "requestedHorizonHours": 240,
            "supports240HoursUntil": iso(end - timedelta(hours=240)), "endpointInclusive": True}


class Resources:
    def __enter__(self):
        import psutil
        self.process = psutil.Process()
        self.started = time.perf_counter()
        self.cpu = self.process.cpu_times()
        self.peak = self.process.memory_info().rss
        self.stop = threading.Event()
        def poll():
            while not self.stop.wait(0.05):
                self.peak = max(self.peak, self.process.memory_info().rss)
        self.thread = threading.Thread(target=poll, daemon=True)
        self.thread.start()
        return self

    def __exit__(self, *_):
        self.stop.set()
        self.thread.join()
        cpu = self.process.cpu_times()
        self.result = {"wallSeconds": time.perf_counter() - self.started,
                       "cpuSeconds": cpu.user + cpu.system - self.cpu.user - self.cpu.system,
                       "sampledPeakRssBytes": max(self.peak, self.process.memory_info().rss), "rssSampleIntervalSeconds": 0.05}


def prepare(output: Path, run: datetime, as_of: datetime, reserve_hours=12, source_name="ecmwf", bounds=DEFAULT_BOUNDS,
            deadline: datetime | None = None, maximum_output_bytes: int = MAXIMUM_OUTPUT_BYTES):
    # Keep the callable entry within the CLI's admitted source surface before
    # any request metadata can persist a URL containing access credentials.
    if not isinstance(source_name, str) or source_name not in OFFICIAL_MIRRORS:
        raise ValueError("cloud_source_mirror_invalid")
    from ecmwf.opendata import Client
    processor_bytes = Path(__file__).read_bytes()
    processor_hash = hashlib.sha256(processor_bytes).hexdigest()
    steps = required_steps(run, as_of, reserve_hours)
    latest_seal = run + timedelta(hours=steps[-1] - 240 - reserve_hours)
    deadline = min(deadline, latest_seal) if deadline else latest_seal
    output = output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    if (output / "manifest.json").exists():
        raise ValueError("cloud_batch_already_sealed_inspect_existing_result")
    budget = AcquisitionBudget(output, deadline, maximum_output_bytes)
    budget.check()
    request = {"runAt": iso(run), "asOf": iso(as_of), "reserveHours": reserve_hours, "boundsWgs84": list(bounds),
               "source": source_name, "methodVersion": METHOD, "steps": list(steps),
               "acquisitionDeadline": iso(deadline), "maximumOutputBytes": maximum_output_bytes}
    # An output directory is one frozen acquisition attempt; changing the run or
    # bounds requires another directory, never mixing an old partial batch.
    budget.put(output / "request.json", canonical(request))
    budget.put(output / "processor.py", processor_bytes)
    client = Client(source=source_name, model="ifs", resol="0p1", maximum_retries=1, retry_after=1, use_server_retry_after=False)
    client.session.close()
    frames, source_receipts, receipt_files, expected_grid, stages = [], [], [], None, []
    with PinnedSourceSession(budget) as source_session, Resources() as resources:
        client.session = source_session
        for step in steps:
            budget.check()
            started = time.perf_counter()
            raw = output / "raw" / f"{run:%Y%m%d%H}-{step}h-tcc.grib2"
            receipt = raw.with_suffix(".json")
            raw.parent.mkdir(exist_ok=True)
            if raw.exists():
                if not receipt.exists():
                    raise ValueError("cloud_raw_without_acquisition_receipt")
                acquired = json.loads(receipt.read_text())
                if acquired["sha256"] != sha_file(raw) or acquired["bytes"] != raw.stat().st_size:
                    raise ValueError("cloud_raw_integrity_mismatch")
                source_session.adopt_receipt(acquired)
            else:
                partial = raw.with_suffix(".grib2.part")
                if partial.exists():
                    raise ValueError("cloud_partial_download_requires_inspection")
                result = client.retrieve(date=run.strftime("%Y%m%d"), time=run.hour, stream="oper", type="fc",
                                         step=step, param="tcc", levtype="sfc", target=str(partial))
                budget.check()
                acquired = {"sha256": sha_file(partial), "bytes": partial.stat().st_size, "retrievedAt": iso(datetime.now(UTC)),
                            "upstream": source_session.receipt(result, partial)}
                partial.rename(raw)
                budget.put(receipt, canonical(acquired))
            source_receipts.append({"stepHours": step, "source": acquired})
            receipt_files.append({"file": f"raw/{receipt.name}", "bytes": receipt.stat().st_size, "sha256": sha_file(receipt)})
            downloaded = time.perf_counter()
            values, mask, grid, metadata = decode_frame(raw, run, step, bounds)
            if expected_grid is not None and grid != expected_grid:
                raise ValueError("cloud_batch_grid_changed")
            expected_grid = grid
            identity = hashlib.sha256(canonical({"raw": acquired["sha256"], "grid": grid, "method": METHOD})).hexdigest()
            numeric = budget.put(output / f"tcc-{identity}.f32", values.tobytes())
            validity = budget.put(output / f"tcc-{identity}.mask", mask.tobytes())
            frame = {"stepHours": step, "validAt": iso(run + timedelta(hours=step)),
                     "source": {"sha256": acquired["sha256"], "bytes": acquired["bytes"], "retrievedAt": acquired["retrievedAt"],
                                "file": f"raw/{raw.name}", "metadata": metadata},
                     "values": numeric, "mask": validity, "validSamples": int(mask.sum()),
                     "missingSamples": int(len(mask) - mask.sum()),
                     "minimum": float(values[mask == 1].min()) if mask.any() else None,
                     "maximum": float(values[mask == 1].max()) if mask.any() else None}
            frames.append(frame)
            stages.append({"step": step, "acquireSeconds": downloaded - started, "decodeWriteSeconds": time.perf_counter() - downloaded})
            print(json.dumps({"step": step, "frames": len(frames), "of": len(steps), "rawBytes": acquired["bytes"]}), flush=True)
            del values, mask
        correction_checks = qualify_corrections(source_receipts, run)
        source_revalidation = source_session.revalidate()
        completed = max(as_of, datetime.now(UTC))
        budget.check()
        if run + timedelta(hours=steps[-1]) < completed + timedelta(hours=240 + reserve_hours):
            raise ValueError("cloud_batch_update_reserve_exhausted")
        common_keys = ("centre", "class", "stream", "dataType", "edition", "typeOfGeneratingProcess", "generatingProcessIdentifier")
        first_origin = {key: frames[0]["source"]["metadata"][key] for key in common_keys}
        if any({key: frame["source"]["metadata"][key] for key in common_keys} != first_origin for frame in frames):
            raise ValueError("cloud_batch_producer_identity_changed")
        coverage = qualify(frames, run, completed, steps)
        if sha_file(Path(__file__)) != processor_hash:
            raise ValueError("cloud_processor_changed_during_batch")
        identity = {"schemaVersion": SCHEMA, "methodVersion": METHOD, "processorSha256": processor_hash, "runAt": iso(run), "grid": expected_grid,
                    "frames": [{"stepHours": f["stepHours"], "validAt": f["validAt"], "sourceSha256": f["source"]["sha256"],
                                "values": f["values"], "mask": f["mask"]} for f in frames]}
        revision = hashlib.sha256(canonical(identity)).hexdigest()
        manifest = {**identity, "frames": frames, "publicationId": f"ecmwf-tcc:{revision}", "contentSha256": revision,
                    "coverage": coverage, "source": {"provider": "ECMWF", "model": "IFS", "stream": "oper", "type": "fc",
                        "parameter": "tcc", "resolutionDegrees": 0.1, "sourceRevisionMeaning": "hash-of-exact-native-messages-and-processing",
                        "license": "CC-BY-4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
                        "url": "https://www.ecmwf.int/en/forecasts/datasets/open-data",
                        "attribution": "Contains modified ECMWF forecast data. Source: ECMWF.",
                        "modifications": ["Regional crop; native grid-point values retained exactly", "Missing-value mask separated from genuine zero"],
                        "acquisitionMirror": source_name},
                    "samplingPolicy": "bilinear-valid-neighbours-linear-adjacent-native-times-v1"}
        manifest_bytes = canonical(manifest)
        if len(manifest_bytes) > 256 * 1024:
            raise ValueError("cloud_manifest_exceeds_consumer_budget")
        descriptor = {"file": "manifest.json", "bytes": len(manifest_bytes), "sha256": hashlib.sha256(manifest_bytes).hexdigest()}
        # Development evidence, bound to the exact numeric manifest. Neither
        # object conditionals nor revalidation grant whole-model-run coherence.
        qualification = {"schemaVersion": "starward-cloud-development-qualification-v1", "state": "DEVELOPMENT_ONLY",
                         "manifest": descriptor, "processorSha256": processor_hash, "formalReady": False,
                         "sourceGroup": {"state": "UNKNOWN", "reason": "No public common model-job/revision attestation was established; per-object pins and same run are insufficient."},
                         "sourceObjects": source_revalidation, "knownCorrections": correction_checks,
                         "perObjectIntegrity": "VERIFIED" if len(source_session.pins) == len(frames) * 2 else "LEGACY_REUSE_NOT_FULLY_REVALIDATED",
                         "commonProducerMetadata": first_origin, "rawReceipts": receipt_files,
                         "limits": {"acquisitionDeadline": iso(deadline), "maximumOutputBytes": maximum_output_bytes,
                                    "requestTimeoutSeconds": REQUEST_TIMEOUT_SECONDS, "maximumRetries": 1,
                                    "nativeFramesInMemory": 1},
                         "completedAt": iso(completed), "wireBytes": budget.wire_bytes}
        budget.put(output / "candidate-qualification.json", canonical(qualification))
        budget.put(output / "manifest.json", manifest_bytes)
    files = [path for path in output.rglob("*") if path.is_file()]
    measurement = {**resources.result, "stages": stages, "files": len(files), "totalBytes": sum(p.stat().st_size for p in files),
                   "rawBytes": sum(f["source"]["bytes"] for f in frames),
                   "numericBytes": sum(f["values"]["bytes"] + f["mask"]["bytes"] for f in frames),
                   "manifest": descriptor, "publicationId": manifest["publicationId"],
                   "scope": "offline acquisition and numeric publication; no images, API, target-device or production-capacity result"}
    # Measurements describe this execution; each resume keeps its own receipt.
    budget.put(output / f"measurement-{time.time_ns()}.json", canonical(measurement))
    return measurement


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--run", type=instant, required=True)
    parser.add_argument("--as-of", type=instant, required=True)
    parser.add_argument("--reserve-hours", type=int, default=12)
    parser.add_argument("--source", choices=OFFICIAL_MIRRORS, default="ecmwf")
    parser.add_argument("--acquisition-deadline", type=instant)
    parser.add_argument("--maximum-output-bytes", type=int, default=MAXIMUM_OUTPUT_BYTES)
    parser.add_argument("--bounds", type=float, nargs=4, default=DEFAULT_BOUNDS, metavar=("WEST", "SOUTH", "EAST", "NORTH"))
    args = parser.parse_args()
    # This CLI is an owned offline process. The watchdog bounds DNS/native I/O
    # too; an interrupted .part is preserved rather than silently trusted.
    end_step = required_steps(args.run, args.as_of, args.reserve_hours)[-1]
    seal_deadline = args.run + timedelta(hours=end_step - 240 - args.reserve_hours)
    cutoff = min(args.acquisition_deadline, seal_deadline) if args.acquisition_deadline else seal_deadline
    def hard_deadline():
        sys.stderr.write("cloud_acquisition_deadline_exceeded\n")
        sys.stderr.flush()
        os._exit(124)
    watchdog = threading.Timer(max(0, (cutoff - datetime.now(UTC)).total_seconds()), hard_deadline)
    watchdog.daemon = True
    watchdog.start()
    try:
        print(json.dumps(prepare(args.output, args.run, args.as_of, args.reserve_hours, args.source, tuple(args.bounds),
                                 cutoff, args.maximum_output_bytes), indent=2))
    except Exception as error:
        code = str(error) if isinstance(error, ValueError) and re.fullmatch(r"cloud_[a-z0-9_]+", str(error)) else "cloud_acquisition_failed"
        print(json.dumps({"status": "failed", "error": code, "errorType": type(error).__name__}), flush=True)
        raise SystemExit(1)
    finally:
        watchdog.cancel()
