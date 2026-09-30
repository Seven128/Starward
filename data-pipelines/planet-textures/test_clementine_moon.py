import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace

import numpy as np
from PIL import Image
import rasterio
from rasterio.transform import from_origin, from_bounds
from rasterio.crs import CRS

from clementine_moon import reduce_raster, sha256_file
from publish_clementine_moon import validate_geography, publish


class ClementineCoverageTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.source, self.output = self.root / 'input.tif', self.root / 'output.png'

    def write(self, values, nodata=0):
        data = np.array(values, dtype=np.uint8)
        with rasterio.open(self.source, 'w', driver='GTiff', width=4, height=4,
                           count=1, dtype='uint8', nodata=nodata,
                           transform=from_origin(-180, 90, 90, 45)) as dataset:
            dataset.write(data, 1)

    def derive(self):
        return reduce_raster(self.source, self.output,
                             source_sha256=sha256_file(self.source),
                             source_size=(4, 4), output_size=(2, 2))

    def test_missing_partial_and_valid_dark_terrain_are_distinct(self):
        self.write([[0, 0, 0, 10], [0, 0, 0, 30],
                    [1, 1, 50, 70], [1, 1, 90, 110]])
        result = self.derive()
        with Image.open(self.output) as image:
            pixels = np.asarray(image)
        np.testing.assert_array_equal(pixels[:, :, 0], [[0, 20], [1, 80]])
        np.testing.assert_array_equal(pixels[:, :, 3], [[0, 128], [255, 255]])
        self.assertEqual(result['sourceValidPixels'], 10)
        self.assertEqual(result['fullyMissingOutputPixels'], 1)
        self.assertEqual(result['partialOutputPixels'], 1)

    def test_invalid_empty_or_failed_source_preserves_existing_output(self):
        previous = b'previous publication'
        self.output.write_bytes(previous)
        self.write([[0]*4]*4)
        with self.assertRaisesRegex(ValueError, 'no measured'):
            self.derive()
        self.write([[1]*4]*4, nodata=None)
        with self.assertRaisesRegex(ValueError, 'NoData'):
            self.derive()
        self.write([[1]*4]*4)
        with patch('clementine_moon.Image.Image.save', side_effect=OSError('encoder failed')):
            with self.assertRaisesRegex(OSError, 'encoder failed'):
                self.derive()
        self.assertEqual(self.output.read_bytes(), previous)
        self.assertEqual(list(self.root.glob('.output.png.*')), [])

    def test_wrong_hash_or_grid_never_publishes(self):
        self.write([[1]*4]*4)
        for sha, size, pattern in [('0'*64, (2, 2), 'hash'),
                                   (sha256_file(self.source), (3, 2), 'divide')]:
            with self.assertRaisesRegex(ValueError, pattern):
                reduce_raster(self.source, self.output, source_sha256=sha,
                              source_size=(4, 4), output_size=size)
        self.assertFalse(self.output.exists())

    def test_incomplete_original_is_rejected_before_decoding(self):
        self.source.write_bytes(b'incomplete transfer')
        with self.assertRaisesRegex(ValueError, 'byte length'):
            publish(self.source, self.output, '0'*64)
        self.assertFalse(self.output.exists())

    def test_lunar_global_registration_rejects_earth_shift_and_flip(self):
        import math
        half = math.pi * 1737400
        bounds = (-half, -half/2, half, half/2)
        moon = SimpleNamespace(crs=CRS.from_string('+proj=eqc +R=1737400 +units=m'),
                               transform=from_bounds(*bounds, 2048, 1024), bounds=bounds)
        validate_geography(moon)
        moon.crs = CRS.from_epsg(4326)
        with self.assertRaisesRegex(ValueError, 'CRS'):
            validate_geography(moon)
        moon.crs = CRS.from_string('+proj=eqc +R=1737400 +units=m')
        moon.bounds = (-half+10, -half/2, half, half/2)
        with self.assertRaisesRegex(ValueError, 'coverage'):
            validate_geography(moon)
        moon.bounds = bounds
        moon.transform = from_bounds(-half, half/2, half, -half/2, 2048, 1024)
        with self.assertRaisesRegex(ValueError, 'orientation'):
            validate_geography(moon)


if __name__ == '__main__':
    unittest.main()
