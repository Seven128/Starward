"""Cached real SDSS quality inputs and newly byte-bound semantic mutations."""
import gzip
import io
import json
from pathlib import Path
import tempfile
import unittest

try:
    import numpy as np
    from astropy.io import fits
    from image_quality import digest
    import sdss_frame_quality as reader
    from sdss_gri_tan import bilinear_samples
    from sdss_corrected_frame import read_cached_frame
    DEPENDENCIES = True
except ImportError:
    DEPENDENCIES = False

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "output/sdss-m51-core-quality-inputs-1002-r1"
LIMIT = 16 * 1024 * 1024  # Explicit offline admission ceiling, not runtime memory.
IDENTITY = {"run": 3699, "rerun": "301", "camcol": 6, "field": 100}


@unittest.skipUnless(DEPENDENCIES, "cached NumPy/Astropy dependencies unavailable")
class SingleGzipTest(unittest.TestCase):
    def test_crc_single_member_complete_output_and_bounded_expansion(self):
        source = gzip.compress(b"signed-science" * 200)
        self.assertEqual(reader._single_gzip(source, 3000), b"signed-science" * 200)
        for encoded, limit, reason in ((source[:-3], 3000, "gzip_incomplete"),
                                       (source + gzip.compress(b"other"), 3000, "gzip_trailing_data"),
                                       (source + b"padding", 3000, "gzip_trailing_data"),
                                       (source, 1000, "decompression_limit_exceeded")):
            with self.subTest(reason=reason), self.assertRaisesRegex(RuntimeError, reason):
                reader._single_gzip(encoded, limit)
        bad_crc = bytearray(source)
        bad_crc[-8] ^= 1
        with self.assertRaisesRegex(RuntimeError, "gzip_invalid"):
            reader._single_gzip(bytes(bad_crc), 3000)


@unittest.skipUnless(DEPENDENCIES and (CACHE / "acquisition.json").is_file(),
                     "four real quality inputs are not shipped in the repository")
class ActualQualityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        acquisition = json.loads((CACHE / "acquisition.json").read_text(encoding="utf-8"))
        cls.records = {record["filename"]: {**IDENTITY, "bytes": record["bytes"], "sha256": record["sha256"],
                                               "sourceUrl": record["url"], **({"band": record["filename"][11]}
                                                if record["filename"].startswith("fpM") else {})}
                       for record in acquisition["sourceFiles"]}
        cls.ps_name = "psField-003699-6-0100.fit"
        cls.g_name = "fpM-003699-g6-0100.fit.gz"
        cls.ps_raw = (CACHE / "sources" / cls.ps_name).read_bytes()
        cls.g_raw = gzip.decompress((CACHE / "sources" / cls.g_name).read_bytes())
        cls.ps = reader.read_cached_psfield(CACHE / "sources" / cls.ps_name, cls.records[cls.ps_name], max_uncompressed_bytes=LIMIT)
        cls.masks = {band: reader.read_cached_fpm(CACHE / "sources" / f"fpM-003699-{band}6-0100.fit.gz",
                                               cls.records[f"fpM-003699-{band}6-0100.fit.gz"], max_uncompressed_bytes=LIMIT)
                     for band in "gri"}

    def changed(self, filename, change, assertion):
        raw = self.ps_raw if filename == self.ps_name else self.g_raw
        with fits.open(io.BytesIO(raw), memmap=False) as hdus:
            change(hdus)
            stream = io.BytesIO()
            hdus.writeto(stream)
        self.bound_bytes(filename, stream.getvalue(), assertion)

    def bound_bytes(self, filename, raw, assertion):
        encoded = raw if filename == self.ps_name else gzip.compress(raw)
        expected = {**self.records[filename], "bytes": len(encoded), "sha256": digest(encoded)}
        with tempfile.TemporaryDirectory(prefix="starward-sdss-quality-") as temporary:
            path = Path(temporary) / filename
            path.write_bytes(encoded)
            read = reader.read_cached_psfield if filename == self.ps_name else reader.read_cached_fpm
            assertion(lambda: read(path, expected, max_uncompressed_bytes=LIMIT))

    def reject(self, reason):
        def check(call):
            with self.assertRaisesRegex(RuntimeError, reason):
                call()
        return check

    def test_canonical_spans_outside_native_frame_preserve_full_metadata_and_intersect(self):
        def change(hdus):
            table = hdus[1].data
            spans = np.array([[-1, -2, 3], [0, -2, 3], [1, 2046, 2051]], dtype='>i2')
            table['s'][0] = np.frombuffer(spans.tobytes(), dtype=np.uint8).copy()
            for key, value in {'nspan': 3, 'npix': 18, 'rmin': -1, 'rmax': 1,
                               'cmin': -2, 'cmax': 2051, 'row0': 0, 'col0': 0}.items():
                table[key][0] = value
        def check(call):
            masks = call()
            self.assertTrue((masks.flags[0, :4] & 1).all())
            self.assertTrue((masks.flags[1, 2046:2048] & 1).all())
            plane = masks.receipt['pixelFlags']['planes'][0]
            self.assertEqual(plane['spansIntersectingOutsideFrame'], 3)
            self.assertEqual(plane['sourceSpanPixelsOutsideFrame'], 12)
            self.assertEqual(masks.receipt['pixelFlags']['frameIntersection'],
                             'fpM-native-frame-span-intersection-v1')
        self.changed(self.g_name, change, check)

    def test_actual_four_sources_keep_unknown_identity_signed_basis_and_status(self):
        self.assertEqual(tuple(self.ps.bands), tuple("ugriz"))
        for band in "ugriz":
            basis = self.ps.bands[band]
            self.assertEqual(basis.images.shape, (4, 51, 51))
            self.assertFalse(basis.images.flags.writeable)
            self.assertTrue((basis.images < 0).any())
            self.assertTrue(np.isfinite(self.ps.reconstruct(band, 1100, 700)).all())
        self.assertTrue(np.isnan(self.ps.bands["r"].coefficients[1, 3, 4]))
        self.assertEqual(self.ps.receipt["psf"]["bands"]["r"]["inactiveCoefficientNonfinite"], 1)
        self.assertEqual(self.ps.receipt["psf"]["status"], [[64] * 5])
        self.assertIsNone(self.ps.receipt["actualPrimaryIdentity"]["RERUN"])
        self.assertNotIn("band", self.ps.receipt["expectedIdentity"])
        self.assertEqual(self.ps.receipt["psf"]["normalization"], "NONE")
        for band, count in zip("gri", (1071316, 990014, 919403)):
            masks = self.masks[band]
            self.assertEqual(masks.flags.shape, (1489, 2048))
            self.assertEqual(masks.flags.dtype, np.dtype("uint16"))
            self.assertEqual(int((masks.flags != 0).sum()), count)
            self.assertFalse(masks.flags.flags.writeable)
            self.assertIsNone(masks.receipt["actualPrimaryIdentity"]["FILTER"])
            self.assertIsNone(masks.receipt["actualPrimaryIdentity"]["RERUN"])
            self.assertEqual(masks.enum["S_NMASK_TYPES"], 10)
            self.assertFalse(bool((masks.flags & (1 << 10)).any()))
            json.dumps(masks.receipt, allow_nan=False)
        json.dumps(self.ps.receipt, allow_nan=False)

    def test_dynamic_fourth_basis_per_row_orders_axes_half_pixel_and_signed_kernel(self):
        def change(hdus):
            table = hdus[2].data  # actual primary band order: g is HDU2
            table["c"][:] = 0
            table["nrow_b"][:] = [2, 1, 2, 1]
            table["ncol_b"][:] = [2, 2, 1, 1]
            for k in range(4):
                table["c"][k, 0, 0] = k + 1
                table["RROWS"][k][:] = 0
                table["RROWS"][k][k] = 1 if k < 3 else -1
            table["c"][0, 0, 1] = 2  # native column term
            table["c"][0, 1, 0] = 3  # native row term
            table["c"][1, 0, 1] = 4
            table["c"][1, 1, 0] = np.nan  # outside this basis's declared rows
            table["c"][2, 1, 0] = 5
            table["c"][2, 0, 1] = np.nan  # outside this basis's declared columns
        def check(call):
            ps = call()
            kernel = ps.reconstruct("g", 2, 7)
            expected = [1 + 2 * .0025 + 3 * .0075, 2 + 4 * .0025, 3 + 5 * .0075, -4]
            np.testing.assert_allclose(kernel[0, :4], expected, rtol=0, atol=1e-12)
            self.assertEqual(np.count_nonzero(kernel), 4)
            self.assertFalse(kernel.flags.writeable)
            self.assertAlmostEqual(float(kernel.sum()), sum(expected), places=12)
        self.changed(self.ps_name, change, check)

    def test_source_binding_canonical_names_urls_and_actual_header_identity(self):
        path = CACHE / "sources" / self.ps_name
        record = self.records[self.ps_name]
        for altered, reason in (({"sha256": "0" * 64}, "source_bytes_changed"),
                                ({"bytes": record["bytes"] - 1}, "source_bytes_changed"),
                                ({"sourceUrl": record["sourceUrl"] + "?x=1"}, "source_url_identity_mismatch"),
                                ({"sourceUrl": record["sourceUrl"].replace("/301/", "/302/")}, "source_url_identity_mismatch"),
                                ({"field": 101}, "filename_identity_mismatch")):
            with self.subTest(altered=altered), self.assertRaisesRegex(RuntimeError, reason):
                reader.read_cached_psfield(path, {**record, **altered}, max_uncompressed_bytes=LIMIT)
        for key, value in (("FIELD", 101), ("RERUN", "302")):
            self.changed(self.ps_name, lambda hs: hs[0].header.__setitem__(key, value), self.reject("actual_identity_mismatch"))
        self.changed(self.g_name, lambda hs: hs[0].header.__setitem__("FILTER", "i"), self.reject("actual_identity_mismatch"))

    def test_truncated_complete_fits_and_nonfinite_declared_coeff_are_rejected(self):
        for raw in (self.ps_raw[:-1], self.ps_raw[:-2880]):
            self.bound_bytes(self.ps_name, raw, self.reject("fits_container_incomplete|fits_payload_incomplete|fits_invalid"))
        self.changed(self.ps_name, lambda hs: hs[2].data["c"].__setitem__((0, 0, 0), np.nan),
                     self.reject("declared_basis_nonfinite"))
        self.changed(self.ps_name, lambda hs: hs[2].data["nrow_b"].__setitem__(1, 6),
                     self.reject("basis_geometry_unsupported"))
        for band, x, y, reason in (("r", -1, 1, "position_outside_frame"), ("r", 1, np.nan, "position_invalid"),
                                   ("r", 2048, 10, "position_outside_frame"), ("unknown", 1, 1, "position_invalid")):
            with self.subTest(band=band, x=x, y=y), self.assertRaisesRegex(RuntimeError, reason):
                self.ps.reconstruct(band, x, y)

    def test_actual_big_endian_span_endpoint_is_inclusive_and_objects_union(self):
        with fits.open(io.BytesIO(self.g_raw), memmap=False) as hdus:
            for plane in (0, 1, 8, 9):
                direct = np.zeros((1489, 2048), dtype=np.bool_)
                for obj in hdus[plane + 1].data:
                    packed = bytes(obj["s"])
                    for at in range(0, len(packed), 6):
                        row = int.from_bytes(packed[at:at + 2], "big", signed=True)
                        left = int.from_bytes(packed[at + 2:at + 4], "big", signed=True)
                        right = int.from_bytes(packed[at + 4:at + 6], "big", signed=True)
                        direct[row, left:right + 1] = True
                np.testing.assert_array_equal((self.masks["g"].flags & (1 << plane)) != 0, direct)
        # A newly bound real-file mutation isolates one exact span endpoint.
        def change(hdus):
            obj = hdus[1].data[0]
            obj["nspan"], obj["npix"] = 1, 2
            obj["rmin"], obj["rmax"], obj["cmin"], obj["cmax"] = 1488, 1488, 2046, 2047
            obj["s"] = np.array([5, 208, 7, 254, 7, 255], dtype=np.uint8)  # BE (1488,2046,2047)
        def check(call):
            masks = call()
            self.assertTrue(masks.flags[1488, 2046] & 1)
            self.assertTrue(masks.flags[1488, 2047] & 1)
        self.changed(self.g_name, change, check)

    def test_newly_hash_bound_span_mismatch_heap_and_enum_fail_at_semantic_owner(self):
        changes = [
            (lambda hs: hs[1].data["nspan"].__setitem__(0, hs[1].data["nspan"][0] + 1), "span_length_invalid"),
            (lambda hs: hs[1].data["npix"].__setitem__(0, hs[1].data["npix"][0] + 1), "span_npix_invalid"),
            (lambda hs: hs[1].data["rmin"].__setitem__(0, hs[1].data["rmin"][0] + 1), "span_bbox_invalid"),
            (lambda hs: hs[1].data["row0"].__setitem__(0, 1), "object_variant_unsupported"),
            (lambda hs: hs[11].data["Value"].__setitem__(10, 9), "enum_unsupported"),
            (lambda hs: hs[1].data["s"][0].__setitem__(slice(0, 2), [255, 255]), "span_bbox_invalid"),
        ]
        for change, reason in changes:
            with self.subTest(reason=reason):
                self.changed(self.g_name, change, self.reject(reason))
        # Damage an actual heap pointer and update the outer receipt hash.
        with fits.open(io.BytesIO(self.g_raw), memmap=False) as hdus:
            table = hdus[1]
            at = table.fileinfo()["datLoc"] + table.data.dtype.fields["s"][1] + 4
        damaged = bytearray(self.g_raw)
        damaged[at:at + 4] = (0x7fffffff).to_bytes(4, "big")
        self.bound_bytes(self.g_name, bytes(damaged), self.reject("heap_bounds_invalid"))

    def test_duplicate_or_overlap_with_self_consistent_bbox_and_sum_npix_is_rejected(self):
        def mutation(hdus, overlap):
            obj = next(row for row in hdus[1].data if row["nspan"] >= 3)
            triples = np.frombuffer(bytes(obj["s"]), dtype=">i2").reshape(-1, 3).copy()
            triples[1] = triples[0]
            if overlap and triples[0, 1] < triples[0, 2]:
                triples[1, 1] += 1
            obj["s"][:] = np.frombuffer(triples.astype(">i2").tobytes(), dtype=np.uint8)
            obj["npix"] = int(np.sum(triples[:, 2].astype(np.int64) - triples[:, 1] + 1))
            obj["rmin"], obj["rmax"] = int(triples[:, 0].min()), int(triples[:, 0].max())
            obj["cmin"], obj["cmax"] = int(triples[:, 1].min()), int(triples[:, 2].max())
        for overlap in (False, True):
            self.changed(self.g_name, lambda hs: mutation(hs, overlap), self.reject("span_canonical_order_invalid"))

    def test_aliased_valid_heap_bounds_cannot_expand_past_admission_budget(self):
        damaged = bytearray(self.ps_raw)
        with fits.open(io.BytesIO(self.ps_raw), memmap=False) as hdus:
            for table in hdus[1:6]:
                offset = table.data.dtype.fields["RROWS"][1]
                payload_size = table.header["PCOUNT"] // 4
                for row in range(len(table.data)):
                    at = table.fileinfo()["datLoc"] + row * table.header["NAXIS1"] + offset
                    # Each pointer separately fits this heap; their aliased
                    # decoded arrays jointly exceed the complete raw file.
                    damaged[at:at + 8] = payload_size.to_bytes(4, "big") + b"\0" * 4
        encoded = bytes(damaged)
        expected = {**self.records[self.ps_name], "bytes": len(encoded), "sha256": digest(encoded)}
        with tempfile.TemporaryDirectory(prefix="starward-sdss-alias-") as temporary:
            path = Path(temporary) / self.ps_name
            path.write_bytes(encoded)
            with self.assertRaisesRegex(RuntimeError, "variable_payload_limit_exceeded"):
                reader.read_cached_psfield(path, expected, max_uncompressed_bytes=len(encoded) + 1)

    def test_flag_stencil_uses_shared_four_neighbours_without_science_availability(self):
        flags = np.zeros((3, 3), dtype=np.uint16)
        flags[:2, :2] = [[1, 2], [4, 8]]
        masks = reader.PixelFlags(flags, {}, {})
        self.assertEqual(int(masks.stencil(0, 0).flags), 15, "zero bilinear weights still require all four neighbours")
        for x, y in ((2, 1), (-1, 0), (np.nan, 0)):
            sampled = masks.stencil(x, y)
            self.assertFalse(bool(sampled.geometry))
            self.assertEqual(int(sampled.flags), 0)
        for x, y in ((True, 0), ("1", 0), ([0, 1], [0])):
            with self.subTest(x=x, y=y), self.assertRaisesRegex(RuntimeError, "stencil_input_invalid"):
                masks.stencil(x, y)
        x = np.array([[0, 1], [2, np.nan]])
        y = np.zeros_like(x)
        sampled = masks.stencil(x, y)
        science = np.zeros((3, 3), dtype=np.float32)  # genuine finite black/zero
        _, geometry, finite = bilinear_samples(science, x, y)
        np.testing.assert_array_equal(sampled.geometry, geometry)
        self.assertTrue(finite[0, 0])
        self.assertEqual(int(sampled.flags[0, 0]), 15)
        science[1, 1] = np.nan
        _, _, finite_missing = bilinear_samples(science, x, y)
        self.assertFalse(finite_missing[0, 0])
        np.testing.assert_array_equal(masks.stencil(x, y).flags, sampled.flags)
        self.assertTrue(sampled.geometry[0, 0], "flag geometry cannot certify a finite science sample")

    def test_cross_source_field_band_and_processing_identity_are_checked_not_quality(self):
        cache = ROOT / "output/sdss-corrected-m51-1002"
        if not (cache / "frame-acquisition.json").is_file():
            self.skipTest("independently cached corrected frame unavailable")
        record = next(item for item in json.loads((cache / "frame-acquisition.json").read_text())["sourceFiles"]
                      if item["identity"] == {**IDENTITY, "band": "g"})
        frame = read_cached_frame(cache / "sources" / record["path"],
                                  {**record["identity"], "bytes": record["bytes"], "sha256": record["sha256"],
                                   "sourceUrl": record["url"]}, max_uncompressed_bytes=32 * 1024 * 1024)
        original_hash = digest(frame.data.tobytes())
        check = reader.check_frame_quality(frame, self.ps, self.masks["g"])
        self.assertEqual(check["identity"], {**IDENTITY, "band": "g"})
        self.assertEqual(check["processingIdentity"], "MATCH")
        self.assertEqual(check["availability"], "NOT_ASSESSED")
        self.assertEqual(check["quality"], "UNKNOWN")
        self.assertEqual(check["sourceSha256"]["frame"], record["sha256"])
        self.assertEqual(len(set(check["actualPS_ID"].values())), 1)
        self.assertEqual(digest(frame.data.tobytes()), original_hash)

        def process_mismatch(call):
            with self.assertRaisesRegex(RuntimeError, "processing_identity_mismatch"):
                reader.check_frame_quality(frame, call(), self.masks["g"])
        self.changed(self.ps_name, lambda hs: hs[0].header.__setitem__("PS_ID", "different-processing"), process_mismatch)
        def missing_process(call):
            result = reader.check_frame_quality(frame, call(), self.masks["g"])
            self.assertIsNone(result["actualPS_ID"]["psField"])
            self.assertEqual(result["missingProcessingIdentity"], ["psField"])
            self.assertEqual(result["processingIdentity"], "PARTIAL_KNOWN_MATCH_MISSING_UNKNOWN")
            self.assertEqual(result["quality"], "UNKNOWN")
        self.changed(self.ps_name, lambda hs: hs[0].header.__delitem__("PS_ID"), missing_process)

        # Valid standalone new hashes for a different field and mask band must
        # still fail association with this independently admitted g frame.
        for field, band in ((101, None), (100, "i")):
            filename = f"psField-003699-6-{field:04d}.fit" if band is None else f"fpM-003699-{band}6-0100.fit.gz"
            with fits.open(io.BytesIO(self.ps_raw if band is None else self.g_raw), memmap=False) as hdus:
                hdus[0].header["FIELD"] = field
                if band is None:
                    hdus[6].data["field"][0] = field
                else:
                    hdus[0].header["FILTER"] = band
                stream = io.BytesIO()
                hdus.writeto(stream)
            encoded = stream.getvalue() if band is None else gzip.compress(stream.getvalue())
            expected = {**IDENTITY, "field": field, "bytes": len(encoded), "sha256": digest(encoded),
                        "sourceUrl": "https://data.sdss.org/sas/dr17/eboss/photo/redux/301/3699/objcs/6/" + filename}
            if band is not None:
                expected["band"] = band
            with tempfile.TemporaryDirectory(prefix="starward-sdss-association-") as temporary:
                path = Path(temporary) / filename
                path.write_bytes(encoded)
                if band is None:
                    psfield = reader.read_cached_psfield(path, expected, max_uncompressed_bytes=LIMIT)
                    flags = self.masks["g"]
                else:
                    psfield = self.ps
                    flags = reader.read_cached_fpm(path, expected, max_uncompressed_bytes=LIMIT)
                with self.assertRaisesRegex(RuntimeError, "correlation_identity_mismatch"):
                    reader.check_frame_quality(frame, psfield, flags)
        short = reader.PixelFlags(self.masks["g"].flags[:, :-1], self.masks["g"].enum, self.masks["g"].receipt)
        with self.assertRaisesRegex(RuntimeError, "correlation_shape_mismatch"):
            reader.check_frame_quality(frame, self.ps, short)


if __name__ == "__main__":
    unittest.main()
