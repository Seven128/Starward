"""Publishing must keep the last valid asset after invalid input or encoding failure."""

from __future__ import annotations

import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
import numpy as np

from opal_latitude_profile import derive_profile


class LatitudeProfilePublicationTest(unittest.TestCase):
    def test_no_measured_latitude_keeps_existing_asset(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, output = root / "source.tif", root / "bands.png"
            Image.new("RGB", (8, 4), (0, 0, 0)).save(source)
            source_sha = hashlib.sha256(source.read_bytes()).hexdigest()
            output.write_bytes(b"previous-published-image")
            with self.assertRaisesRegex(ValueError, "no measured OPAL latitude rows"):
                derive_profile(source, output, source_sha256=source_sha,
                               source_size=(8, 4), strict_missing_mask=True)
            self.assertEqual(output.read_bytes(), b"previous-published-image")
            self.assertEqual(sorted(root.iterdir()), [output, source])

    def test_strict_mask_never_paints_unmeasured_rows(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, output = root / "source.tif", root / "bands.png"
            pixels = np.zeros((4, 8, 3), dtype=np.uint8)
            pixels[0] = (80, 120, 160)
            pixels[1] = (100, 140, 180)
            Image.fromarray(pixels, "RGB").save(source)
            source_sha = hashlib.sha256(source.read_bytes()).hexdigest()
            derive_profile(source, output, source_sha256=source_sha,
                           source_size=(8, 4), strict_missing_mask=True)
            expected = Image.fromarray(np.array([255, 255, 0, 0], dtype=np.uint8)
                                       .reshape((4, 1)).repeat(8, axis=1), "L")
            expected = np.asarray(expected.resize((8, 512), Image.Resampling.NEAREST))
            with Image.open(output) as published:
                alpha = np.asarray(published.getchannel("A"))
                self.assertTrue(np.array_equal(alpha, expected))
                self.assertEqual(set(np.unique(alpha)), {0, 255})

    def test_interrupted_encoder_keeps_existing_asset_then_recovers(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, output = root / "source.tif", root / "bands.png"
            Image.new("RGB", (8, 4), (80, 120, 160)).save(source)
            source_sha = hashlib.sha256(source.read_bytes()).hexdigest()
            output.write_bytes(b"previous-published-image")

            def fail_after_partial_write(_image: Image.Image, path: Path, **_options: object) -> None:
                path.write_bytes(b"incomplete-image")
                raise OSError("encoder interrupted")

            with patch.object(Image.Image, "save", fail_after_partial_write):
                with self.assertRaisesRegex(OSError, "encoder interrupted"):
                    derive_profile(source, output, source_sha256=source_sha, source_size=(8, 4))
            self.assertEqual(output.read_bytes(), b"previous-published-image")
            self.assertEqual(sorted(root.iterdir()), [output, source])

            result = derive_profile(source, output, source_sha256=source_sha, source_size=(8, 4))
            self.assertEqual(hashlib.sha256(output.read_bytes()).hexdigest(), result["outputSha256"])
            with Image.open(output) as published:
                self.assertEqual(published.size, (8, 512))


if __name__ == "__main__":
    unittest.main()
