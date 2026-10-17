"""Display estimates retain opaque black, geometry and complete formula effects."""
import io
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch
import numpy as np
from publish_prepared_display import verify_display_pixels, decode_background_npz, open_background_npz


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

    def test_non_square_owner_dimensions_and_payload_ceiling_before_decode(self):
        background = np.full((5, 7, 3), 10, dtype='f8')
        stream = io.BytesIO(); np.savez_compressed(stream, background=background)
        np.testing.assert_array_equal(decode_background_npz(stream.getvalue(), shape=(5, 7, 3)), background)
        for shape in ((7, 5, 3), (5, 7, 4), (True, 7, 3), (4096, 4096, 3)):
            with self.assertRaises(RuntimeError):
                decode_background_npz(stream.getvalue(), shape=shape)

    def test_streamed_model_header_budget_and_scratch_cleanup(self):
        shape = (5, 7, 3); values = np.arange(105, dtype='f8').reshape(shape)
        stream = io.BytesIO(); np.savez_compressed(stream, background=values)
        with patch('publish_prepared_display.BACKGROUND_ARRAY_LIMIT_BYTES', 512):
            with open_background_npz(stream.getvalue(), shape=shape, max_payload_bytes=values.nbytes) as model:
                self.assertIsInstance(model, np.memmap)
                self.assertFalse(model.flags.writeable)
                scratch = Path(model.filename)
                np.testing.assert_array_equal(model, values)
            self.assertFalse(scratch.exists())

            self.assertTrue(model._mmap.closed)
            with self.assertRaisesRegex(RuntimeError, 'byte_budget_exceeded'):
                with open_background_npz(stream.getvalue(), shape=shape, max_payload_bytes=values.nbytes - 1): pass
            for bad in (True, 0, -1):
                with self.assertRaisesRegex(RuntimeError, 'byte_budget_exceeded'):
                    with open_background_npz(stream.getvalue(), shape=shape, max_payload_bytes=bad): pass
            for altered in (values.transpose(1, 0, 2), values.astype('f4'), np.asfortranarray(values)):
                encoded = io.BytesIO(); np.savez_compressed(encoded, background=altered)
                with self.assertRaises(RuntimeError):
                    with open_background_npz(encoded.getvalue(), shape=shape, max_payload_bytes=values.nbytes): pass
            with self.assertRaisesRegex(RuntimeError, 'fixture_stop'):
                with open_background_npz(stream.getvalue(), shape=shape, max_payload_bytes=values.nbytes) as model:
                    scratch = Path(model.filename)
                    raise RuntimeError('fixture_stop')
            self.assertFalse(scratch.exists())

    def test_declared_budget_cannot_remove_per_channel_bound(self):
        with patch('publish_prepared_display.zipfile.ZipFile') as decoder:
            with self.assertRaisesRegex(RuntimeError, 'byte_budget_exceeded'):
                with open_background_npz(b'', shape=(4097, 4097, 3), max_payload_bytes=10**12): pass
            decoder.assert_not_called()

    def test_streamed_header_claim_rejected_before_large_read(self):
        encoded = io.BytesIO()
        with zipfile.ZipFile(encoded, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('background.npy', b'\x93NUMPY\x02\x00' + (2**32-1).to_bytes(4, 'little') + b'x'*956)
        with patch('publish_prepared_display.BACKGROUND_ARRAY_LIMIT_BYTES', 512), \
             patch('numpy.lib.format.read_array_header_2_0') as header:
            with self.assertRaisesRegex(RuntimeError, 'header_invalid'):
                with open_background_npz(encoded.getvalue(), shape=(5, 7, 3), max_payload_bytes=840): pass
            header.assert_not_called()

    def test_streamed_model_rejects_extra_payload_and_object_arrays(self):
        with patch('publish_prepared_display.BACKGROUND_ARRAY_LIMIT_BYTES', 512):
            for values, tail in ((np.ones((5, 7, 3), dtype='f8'), b'extra'),
                                 (np.ones((5, 7, 3), dtype='object'), b'')):
                array = io.BytesIO(); np.save(array, values)
                encoded = io.BytesIO()
                with zipfile.ZipFile(encoded, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
                    archive.writestr('background.npy', array.getvalue() + tail)
                with self.assertRaises(RuntimeError):
                    with open_background_npz(encoded.getvalue(), shape=(5, 7, 3), max_payload_bytes=840): pass


if __name__ == '__main__':
    unittest.main()
