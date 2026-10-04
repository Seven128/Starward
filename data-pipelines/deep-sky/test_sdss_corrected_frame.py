"""Bounded source admission regressions; no download or original-file edits."""
import bz2
import io
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from astropy.io import fits

from image_quality import digest
import sdss_corrected_frame as reader

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "output/sdss-corrected-m51-1002"
LIMIT = 32 * 1024 * 1024  # Explicit safety ceiling for the observed 12,447,360B files, not a runtime budget.


class BzipBoundaryTest(unittest.TestCase):
    def test_complete_stream_and_trailing_truncation_output_limit(self):
        raw = bz2.compress(b"science" * 512)
        self.assertEqual(reader.decompress_frame(raw, 4096), b"science" * 512)
        for value, limit, reason in ((raw[:-4], 4096, "bzip2_incomplete"),
                                     (raw + bz2.compress(b"other-frame"), 4096, "bzip2_trailing_data"),
                                     (raw, 1024, "decompression_limit_exceeded")):
            with self.subTest(reason=reason), self.assertRaisesRegex(RuntimeError, reason):
                reader.decompress_frame(value, limit)


@unittest.skipUnless((CACHE / "frame-acquisition.json").is_file(), "bounded actual source cache is not shipped in the repository")
class ActualCorrectedFrameTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        acquisition = json.loads((CACHE / "frame-acquisition.json").read_text(encoding="utf-8"))
        cls.records = [{**record["identity"], "path": record["path"], "bytes": record["bytes"],
                        "sha256": record["sha256"], "sourceUrl": record["url"]}
                       for record in acquisition["sourceFiles"]]
        cls.g = next(record for record in cls.records if record["band"] == "g")
        cls.compressed = (CACHE / "sources" / cls.g["path"]).read_bytes()
        cls.raw = bz2.decompress(cls.compressed)

    def mutate(self, change, assertion):
        # The caller receives a newly hash-bound test payload, so an objective
        # source inconsistency cannot be hidden behind the old bytes guard.
        with fits.open(io.BytesIO(self.raw), memmap=False) as hdus:
            change(hdus)
            output = io.BytesIO()
            hdus.writeto(output)
        self.inspect_mutated(output.getvalue(), assertion)

    def inspect_mutated(self, raw, assertion):
        compressed = bz2.compress(raw)
        expected = {**self.g, "bytes": len(compressed), "sha256": digest(compressed)}
        with tempfile.TemporaryDirectory(prefix="starward-sdss-frame-") as temporary:
            path = Path(temporary) / self.g["path"]
            path.write_bytes(compressed)
            assertion(lambda: reader.read_cached_frame(path, expected, max_uncompressed_bytes=LIMIT))

    def reject(self, reason):
        def assertion(call):
            with self.assertRaisesRegex(RuntimeError, reason):
                call()
        return assertion

    def test_real_three_band_frames_keep_complete_actual_astrans_and_unit_semantics(self):
        frames = reader.read_cached_band_set(CACHE / "sources", self.records, ("g", "r", "i"), max_uncompressed_bytes=LIMIT)
        self.assertEqual(len(frames), 3)
        for frame, record in zip(frames, self.records):
            receipt = frame.receipt
            self.assertEqual(receipt["source"]["sha256"], record["sha256"])
            self.assertEqual(frame.data.shape, (1489, 2048))
            self.assertEqual(receipt["scientificSamples"]["scientificValidity"], "UNKNOWN")
            self.assertEqual(receipt["scientificSamples"]["unit"], "nanomaggies/pixel")
            self.assertEqual(receipt["asTrans"]["row"]["FIELD"], 100)
            self.assertEqual(len(receipt["asTrans"]["row"]), 31)
            self.assertIn("DROW3", receipt["asTrans"]["row"])
            self.assertEqual(receipt["wcs"]["primaryHeaderSha256"], digest(frame.header.tostring(sep="\n", endcard=True, padding=False).encode("ascii")))
            self.assertIn("not applied", receipt["wcs"]["meaning"])
        self.assertEqual(frames[0].header["FRAME"], 108)
        self.assertEqual(frames[0].receipt["identity"]["field"], 100, "raw CCD FRAME is not the asTrans field identity")
        self.assertGreater(frames[0].receipt["scientificSamples"]["finiteNegativeSamples"], 0)

    def test_changed_compressed_bytes_and_missing_band_cannot_make_a_complete_rgb_supply(self):
        for expected in ({**self.g, "sha256": "0" * 64}, {**self.g, "bytes": self.g["bytes"] + 1}):
            with self.subTest(expected=expected), self.assertRaisesRegex(RuntimeError, "compressed_bytes_changed"):
                reader.read_cached_frame(CACHE / "sources" / self.g["path"], expected, max_uncompressed_bytes=LIMIT)
        with self.assertRaisesRegex(RuntimeError, "band_set_incomplete"):
            reader.read_cached_band_set(CACHE / "sources", self.records[:2], ("g", "r", "i"), max_uncompressed_bytes=LIMIT)

    def test_true_zero_negative_and_nonfinite_sample_are_not_an_artifact_mask(self):
        def change(hdus):
            hdus[0].data[0, :3] = [0, -3.25, np.nan]
        def inspect(call):
            frame = call()
            self.assertEqual(float(frame.data[0, 0]), 0)
            self.assertEqual(float(frame.data[0, 1]), -3.25)
            self.assertTrue(np.isnan(frame.data[0, 2]))
            sample = frame.receipt["scientificSamples"]
            self.assertEqual(sample["finiteZeroSamples"], 1)
            self.assertEqual(sample["nonfiniteSamples"], 1)
            self.assertEqual(sample["scientificValidity"], "UNKNOWN")
            self.assertEqual(sample["artifactMask"], "NOT_SUPPLIED")
        self.mutate(change, inspect)

    def test_actual_astrans_identity_mismatch_or_lost_polynomial_column_is_rejected(self):
        self.mutate(lambda hs: hs[3].data["FIELD"].__setitem__(0, 101), self.reject("actual_identity_mismatch"))
        def remove(hdus):
            hdus[3] = fits.BinTableHDU.from_columns([column for column in hdus[3].columns if column.name != "DROW3"])
        self.mutate(remove, self.reject("astrans_identity_missing"))

    def test_complete_bzip_stream_without_actual_final_scientific_samples_is_rejected(self):
        with fits.open(io.BytesIO(self.raw), memmap=False) as hdus:
            primary_end = hdus[0].fileinfo()["datLoc"] + hdus[0].size
            final_end = hdus[-1].fileinfo()["datLoc"] + hdus[-1].size
        for endpoint in (primary_end - 4, final_end - 4):
            with self.subTest(endpoint=endpoint):
                self.inspect_mutated(self.raw[:endpoint], self.reject("scientific_array_incomplete|required_hdus_missing|fits_invalid"))

    def test_primary_units_calibration_and_singular_celestial_wcs_are_not_inferred(self):
        self.mutate(lambda hs: hs[0].header.__setitem__("BUNIT", "counts"), self.reject("unit_invalid"))
        self.mutate(lambda hs: hs[0].header.__setitem__("NMGY", 0), self.reject("applied_calibration_missing"))
        def singular(hdus):
            for key in ("CD1_1", "CD1_2", "CD2_1", "CD2_2"):
                hdus[0].header[key] = 0
        self.mutate(singular, self.reject("celestial_wcs_invalid|fits_invalid"))

    def test_actual_source_reference_frame_cannot_be_silently_borrowed_for_icrs_target(self):
        # Synthetic boundary mutations of real cached input, with updated
        # local payload hashes; these are not new SDSS provider observations.
        for system, equinox in (("FK4", 1950), ("FK5", 2000)):
            def change(hdus):
                hdus[0].header["RADECSYS"] = system
                hdus[0].header["RADESYS"] = system
                hdus[0].header["EQUINOX"] = equinox
            with self.subTest(system=system):
                self.mutate(change, self.reject("reference_frame_unsupported"))

    def test_acquisition_url_missing_other_provider_or_wrong_identity_cannot_claim_sdss_frame(self):
        for url in (None, "https://example.invalid/frame.fits.bz2", self.g["sourceUrl"].replace("/301/", "/302/"),
                    self.g["sourceUrl"] + "?other=1", self.g["sourceUrl"] + "#fragment"):
            with self.subTest(url=url), self.assertRaisesRegex(RuntimeError, "source_url_identity_mismatch"):
                reader.read_cached_frame(CACHE / "sources" / self.g["path"], {**self.g, "sourceUrl": url}, max_uncompressed_bytes=LIMIT)


if __name__ == "__main__":
    unittest.main()
