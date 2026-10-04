"""Display estimates retain opaque black, geometry and complete formula effects."""
import io
import unittest
import zipfile
import numpy as np
from publish_prepared_display import verify_display_pixels, decode_background_npz


class PreparedDisplayTest(unittest.TestCase):
    def fixture(self):
        raw = np.array([[[0, 0, 0, 255], [10, 10, 100, 255], [0, 0, 0, 0]]], dtype=np.uint8)
        bg = np.array([[[1, 1, 1], [11, 10, 0], [1, 1, 1]]], dtype=np.float64)
        display = np.array([[[0, 0, 0, 255], [0, 0, 100, 255], [0, 0, 0, 0]]], dtype=np.uint8)
        return raw, display, bg

    def test_actual_formula_effect_counts_and_valid_black(self):
        raw, display, bg = self.fixture()
        self.assertEqual(verify_display_pixels(raw, display, bg, chunk_rows=1), ((2, 1, 1), 2, 1))
        # Both unchanged raw RGB and an empty/no-effect result fail this example.
        with self.assertRaisesRegex(RuntimeError, 'formula_pixels_invalid'):
            verify_display_pixels(raw, raw, bg)
        changed = display.copy(); changed[0, 1, 2] = 0
        with self.assertRaisesRegex(RuntimeError, 'formula_pixels_invalid'):
            verify_display_pixels(raw, changed, bg)

    def test_brightness_mask_and_nonfinite_models_cannot_change_geometry(self):
        raw, display, bg = self.fixture()
        display[0, 0, 3] = 0
        with self.assertRaisesRegex(RuntimeError, 'geometry_or_background_invalid'):
            verify_display_pixels(raw, display, bg)
        raw, display, bg = self.fixture(); bg[0, 0, 0] = np.nan
        with self.assertRaisesRegex(RuntimeError, 'geometry_or_background_invalid'):
            verify_display_pixels(raw, display, bg)
        raw, display, bg = self.fixture(); display[0, 2, 0] = 1
        with self.assertRaisesRegex(RuntimeError, 'geometry_or_background_invalid'):
            verify_display_pixels(raw, display, bg)

    def test_fixed_npz_member_and_size_admission_before_loading(self):
        for names in (['../background.npy'], ['background.npy', 'another.npy'], []):
            stream = io.BytesIO()
            with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
                for name in names:
                    archive.writestr(name, b'not-an-array')
            with self.assertRaisesRegex(RuntimeError, 'background_container_invalid'):
                decode_background_npz(stream.getvalue())


if __name__ == '__main__':
    unittest.main()
