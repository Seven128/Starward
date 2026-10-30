import hashlib
import io
import json
from datetime import datetime, timedelta
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import requests
from ecmwf.opendata import Client

from prepare_ecmwf_tcc import AcquisitionBudget, PinnedSourceSession, UTC, instant, prepare, qualify_corrections


class Upstream:
    def __init__(self):
        self.index = json.dumps({"param": "tcc", "levtype": "sfc", "type": "fc", "stream": "oper", "class": "od",
                                 "date": "20261027", "time": "1200", "step": "0", "expver": "0001",
                                 "_offset": 3, "_length": 3}).encode() + b"\n"
        self.calls, self.responses = [], []
        self.ignore_conditionals = False
        self.data_status = 206
        self.content_range = "bytes 3-5/9"
        self.data_body = b"GRB"
        self.changed = False
        self.head_statuses = []

    def request(self, session, method, url, **kwargs):
        self.calls.append((method, url, kwargs))
        headers = kwargs.get("headers", {})
        is_index = url.endswith(".index")
        etag = '"index-v1"' if is_index else '"data-v2"' if self.changed else '"data-v1"'
        response = requests.Response()
        response.url = url
        response.status_code = 200
        response.headers.update({"ETag": etag, "Content-Length": str(len(self.index) if is_index else 9), "Accept-Ranges": "bytes"})
        body = b""
        if method == "HEAD" and not is_index and self.head_statuses:
            response.status_code = self.head_statuses.pop(0)
        elif headers.get("If-Match") and headers["If-Match"] != etag and not self.ignore_conditionals:
            response.status_code = 412
        elif method == "GET":
            if is_index:
                body = self.index
            else:
                body = self.data_body
                response.status_code = self.data_status
                response.headers.update({"Content-Length": "3", "Content-Range": self.content_range})
        response.raw = io.BytesIO(body)
        response._content = False
        response._content_consumed = False
        self.responses.append(response)
        return response


class CloudSourceAcquisitionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.budget = AcquisitionBudget(self.root, datetime.now(UTC) + timedelta(minutes=1), 1024 * 1024)
        self.source = Upstream()
        self.mock = patch.object(requests.Session, "request", autospec=True, side_effect=self.source.request)
        self.mock.start()
        self.session = PinnedSourceSession(self.budget)

    def tearDown(self):
        self.session.close()
        self.mock.stop()
        self.temp.cleanup()

    def test_official_client_selects_one_pinned_range_and_archives_the_actual_index(self):
        client = Client(source="https://source.invalid/forecasts", model="ifs", resol="0p1", maximum_retries=1,
                        retry_after=0, use_server_retry_after=False)
        client.session.close()
        client.session = self.session
        target = self.root / "frame.part"
        result = client.retrieve(date="20261027", time=12, stream="oper", type="fc", step=0,
                                 param="tcc", levtype="sfc", target=str(target))
        self.assertEqual(target.read_bytes(), b"GRB")
        receipt = self.session.receipt(result, target)
        self.assertTrue(receipt["conditionalsEnforced"])
        self.assertEqual(receipt["range"], {"offset": 3, "length": 3})
        self.assertEqual(receipt["data"]["bodySha256"], hashlib.sha256(b"GRB").hexdigest())
        self.assertEqual((self.root / receipt["index"]["indexFile"]["file"]).read_bytes(), self.source.index)
        self.assertEqual(self.session.revalidate()["objects"], 2)
        actual_reads = [options for method, _url, options in self.source.calls
                        if method == "GET" and options.get("headers", {}).get("Range") == "bytes=3-5"]
        self.assertEqual(len(actual_reads), 1)
        self.assertEqual(actual_reads[0]["headers"]["If-Match"], '"data-v1"')
        self.assertEqual(actual_reads[0]["headers"]["Accept-Encoding"], "identity")
        self.assertTrue(actual_reads[0]["stream"])
        self.assertLessEqual(actual_reads[0]["timeout"][1], 30)

    def test_ignored_conditionals_fail_before_grib_or_manifest_creation(self):
        self.source.ignore_conditionals = True
        run = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        with self.assertRaisesRegex(ValueError, "conditionals_not_enforced"):
            prepare(self.root, run, datetime.now(UTC), source_name="aws")
        self.assertFalse((self.root / "manifest.json").exists())
        self.assertFalse(list((self.root / "raw").glob("*.grib2")))

    def test_prepare_rejects_unadmitted_mirrors_before_output_or_client_creation(self):
        run = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        invalid = ("https://synthetic-user:synthetic-password@source.invalid/forecasts?sig=do-not-persist",
                   "https://source.invalid/forecasts", "unknown", "", None, 1, True, [], {})
        with patch("ecmwf.opendata.Client", side_effect=ValueError("test_client_must_not_be_created")) as client:
            for index, source in enumerate(invalid):
                output = self.root / f"rejected-{index}"
                with self.subTest(case=index), self.assertRaisesRegex(ValueError, "cloud_source_mirror_invalid"):
                    prepare(output, run, datetime.now(UTC), source_name=source)
                self.assertFalse(output.exists())
                client.assert_not_called()
                self.assertEqual(self.source.calls, [])

    def test_prepare_preserves_the_supported_official_mirror_surface(self):
        run = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        with patch("ecmwf.opendata.Client", side_effect=ValueError("test_client_reached")) as client:
            for mirror in ("ecmwf", "aws", "google", "azure"):
                output = self.root / mirror
                with self.subTest(mirror=mirror), self.assertRaisesRegex(ValueError, "test_client_reached"):
                    prepare(output, run, datetime.now(UTC), source_name=mirror)
                self.assertEqual(json.loads((output / "request.json").read_bytes())["source"], mirror)
                self.assertEqual(client.call_args.kwargs["source"], mirror)
        self.assertEqual(self.source.calls, [])

    def test_wrong_or_ignored_range_is_rejected_before_its_body_is_consumed(self):
        for status, content_range in [(200, "bytes 3-5/9"), (206, "bytes 4-6/9")]:
            with self.subTest(status=status, content_range=content_range):
                self.source.data_status, self.source.content_range = status, content_range
                self.session.get("https://source.invalid/field.index").content
                before = self.budget.wire_bytes
                with self.assertRaisesRegex(ValueError, "range_response_invalid"):
                    self.session.get("https://source.invalid/field.grib2", headers={"Range": "bytes=3-5"})
                self.assertEqual(self.budget.wire_bytes, before)

    def test_short_stream_and_changed_object_are_not_accepted_as_complete(self):
        self.session.get("https://source.invalid/field.index").content
        self.source.data_body = b"GR"
        response = self.session.get("https://source.invalid/field.grib2", headers={"Range": "bytes=3-5"})
        with self.assertRaisesRegex(ValueError, "transfer_length_mismatch"):
            response.content
        self.source.changed = True
        with self.assertRaisesRegex(ValueError, "object_changed"):
            self.session.revalidate()

    def test_absolute_deadline_and_output_budget_reject_before_a_new_body(self):
        self.budget.deadline = datetime.now(UTC) - timedelta(seconds=1)
        with self.assertRaisesRegex(ValueError, "deadline_exceeded"):
            self.session.get("https://source.invalid/field.index")
        self.assertEqual(self.source.calls, [])
        self.budget.deadline = datetime.now(UTC) + timedelta(minutes=1)
        self.budget.maximum_output_bytes = 1
        with self.assertRaisesRegex(ValueError, "output_budget_exceeded"):
            self.session.get("https://source.invalid/field.index")
        self.assertEqual(self.budget.wire_bytes, 0)

    def test_known_restart_requires_whole_corrected_group_and_fresh_object_receipts(self):
        run = instant("2026-10-22T00:00:00Z")
        def frame(step, when="2026-10-23T14:00:00Z", verified=True):
            return {"stepHours": step, "source": {"retrievedAt": when, "upstream": {"conditionalsEnforced": verified}}}
        full = [frame(step) for step in range(288, 361, 6)]
        self.assertEqual(qualify_corrections(full, run)[0]["result"], "COMPLETE_REACQUIRED_GROUP")
        with self.assertRaisesRegex(ValueError, "group_incomplete"):
            qualify_corrections(full[:-1], run)
        for old in [frame(300, when="2026-10-23T12:59:59Z"), frame(300, verified=False)]:
            changed = [old if item["stepHours"] == 300 else item for item in full]
            with self.assertRaisesRegex(ValueError, "full_reacquisition"):
                qualify_corrections(changed, run)
        self.assertEqual(qualify_corrections([frame(264)], instant("2026-10-27T12:00:00Z"))[0]["result"], "NOT_APPLICABLE")

    def test_only_one_transient_retry_and_failure_diagnostics_do_not_store_signed_queries(self):
        url = "https://private-user:private-password@source.invalid/transient.grib2?sig=do-not-log"
        self.source.head_statuses = [503, 200]
        with patch("prepare_ecmwf_tcc.time.sleep"):
            self.assertEqual(self.session.pin(url)["etag"], '"data-v1"')
        self.assertEqual(len(self.source.calls), 2)
        self.source.head_statuses = [503, 503]
        with patch("prepare_ecmwf_tcc.time.sleep"), self.assertRaises(requests.HTTPError):
            self.session.pin("https://source.invalid/failed.grib2")
        self.assertEqual(len(self.source.calls), 4)
        records = (self.root / "source-errors.jsonl").read_text()
        self.assertNotIn("do-not-log", records)
        self.assertNotIn("?sig", records)
        self.assertNotIn("private-user", records)
        self.assertNotIn("private-password", records)
        failures = [json.loads(line) for line in records.splitlines()]
        self.assertEqual([item["attempt"] for item in failures], [1, 1, 2])
        self.assertEqual([item["status"] for item in failures], [503, 503, 503])


if __name__ == "__main__":
    unittest.main()
