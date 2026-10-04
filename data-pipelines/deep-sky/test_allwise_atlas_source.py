"""Source admission boundaries, real support counterexample and cancellation."""
from pathlib import Path
import copy
import io
import unittest
from unittest.mock import patch

import numpy as np
from astropy.io import fits

import allwise_atlas_source as owner
from image_quality import digest

COADD = '1507p696_ac51'
DIRECTORY = Path(__file__).resolve().parents[2] / 'output/allwise-atlas-source-test-fixtures'


def raw_fits(product, data, changes=None):
    hdu = fits.PrimaryHDU(np.asarray(data, dtype=np.float32))
    hdu.header.update({'COADDID': COADD, 'BAND': 3, 'FILETYPE': owner.FILE_TYPES[product],
        'BUNIT': owner.UNITS[product], 'MAGZP': 18.0, 'EQUINOX': 2000.0,
        'CTYPE1': 'RA---SIN', 'CTYPE2': 'DEC--SIN', 'CRVAL1': 148.96, 'CRVAL2': 69.67,
        'CRPIX1': 2.0, 'CRPIX2': 2.0, 'CDELT1': -1.375 / 3600, 'CDELT2': 1.375 / 3600})
    if changes:
        hdu.header.update(changes)
    output = io.BytesIO()
    hdu.writeto(output)
    return output.getvalue()


class AtlasSourceTests(unittest.TestCase):
    def setUp(self):
        # Finite black/negative values and small positive support are real
        # scientific states; positive coverage can coexist with NaN science.
        self.arrays = {'int': [[0, -5, np.nan, 12], [200, 280, 90, 70]],
                       'cov': [[1, 1, .002, 0], [.03, np.nan, -1, 1]],
                       'unc': [[1, 2, np.nan, 3], [.01, 2, 3, -1]]}
        self.raw = {f'{key}.fits': raw_fits(key, array) for key, array in self.arrays.items()}
        self.products = {key: {'path': f'{key}.fits', 'state': 'CHECKED',
            'receipt': {'completeArrayReceived': True}, 'bytes': len(self.raw[f'{key}.fits']),
            'sha256': digest(self.raw[f'{key}.fits'])} for key in owner.PRODUCTS}

    def read(self, products=None, cancelled=None, reader=None):
        with patch.object(Path, 'read_bytes', reader or (lambda path: self.raw[path.name])):
            return owner.read_cached_atlas_triplet(DIRECTORY, self.products if products is None else products,
                                                   coadd_id=COADD, cancelled=cancelled)

    def replace(self, key, raw):
        self.raw[f'{key}.fits'] = raw
        self.products[key].update(bytes=len(raw), sha256=digest(raw))

    def test_preserves_science_and_separates_support_without_quality_threshold(self):
        result = self.read()
        np.testing.assert_array_equal(result.intensity, np.asarray(self.arrays['int'], dtype=np.float32))
        self.assertEqual(result.supported.tolist(), [[True, True, False, False], [True, False, False, False]])
        self.assertTrue(result.positive_contribution[0, 2])
        self.assertFalse(result.intensity_finite[0, 2])
        self.assertFalse(result.uncertainty_known[0, 2])
        self.assertFalse(result.coverage_known[1, 1])
        self.assertFalse(result.coverage_known[1, 2])
        self.assertFalse(result.uncertainty_known[1, 3])
        self.assertEqual(result.magnitude_zero_point, 18)
        with self.assertRaises(ValueError):
            result.intensity[0, 0] = 1

    def test_missing_product_does_not_return_zero_bundle(self):
        products = copy.deepcopy(self.products)
        del products['unc']
        with self.assertRaisesRegex(RuntimeError, 'source_set_incomplete'):
            self.read(products)

    def test_incomplete_receipt_is_not_admitted_even_with_valid_fits(self):
        products = copy.deepcopy(self.products)
        products['int']['receipt']['completeArrayReceived'] = False
        with self.assertRaisesRegex(RuntimeError, 'source_input_unavailable'):
            self.read(products)

    def test_hash_mismatch_is_not_admitted(self):
        products = copy.deepcopy(self.products)
        products['unc']['sha256'] = '0' * 64
        with self.assertRaisesRegex(RuntimeError, 'source_bytes_changed'):
            self.read(products)

    def test_header_identity_units_grid_and_scaling_are_enforced(self):
        for key, changes, error in [
            ('int', {'COADDID': '0835m061_ac51'}, 'product_identity_invalid'),
            ('cov', {'BUNIT': 'DN'}, 'product_identity_invalid'),
            ('unc', {'FILETYPE': 'intensity image'}, 'product_identity_invalid'),
            ('unc', {'CRPIX1': 2.25}, 'grid_or_calibration_differ'),
            ('unc', {'MAGZP': 17.5}, 'grid_or_calibration_differ'),
            ('int', {'BSCALE': 2}, 'scaled_units_unqualified'),
        ]:
            with self.subTest(changes=changes):
                self.setUp()
                self.replace(key, raw_fits(key, self.arrays[key], changes))
                with self.assertRaisesRegex(RuntimeError, error):
                    self.read()

    def test_scientific_truncation_is_rejected_but_end_padding_remains_explicit(self):
        raw = self.raw['int.fits']
        self.replace('int', raw[:2880 + 12])
        with self.assertRaisesRegex(RuntimeError, 'array_truncated'):
            self.read()
        self.replace('int', raw[:2880 + 32])
        result = self.read()
        self.assertTrue(result.source_receipts[0]['completeArrayReceived'])
        self.assertEqual(result.source_receipts[0]['missingEndPaddingBytes'], 2848)

    def test_cancel_before_io_and_during_a_product_return_no_bundle(self):
        calls = []
        def no_io(path):
            calls.append(path)
            return self.raw[path.name]
        with self.assertRaisesRegex(RuntimeError, 'atlas_cancelled'):
            self.read(cancelled=lambda: True, reader=no_io)
        self.assertEqual(calls, [])
        counts, cancel = {}, [False]
        def cancel_reader(path):
            counts[path.name] = counts.get(path.name, 0) + 1
            if path.name == 'int.fits' and counts[path.name] == 2:
                cancel[0] = True
            return self.raw[path.name]
        with self.assertRaisesRegex(RuntimeError, 'atlas_cancelled'):
            self.read(cancelled=lambda: cancel[0], reader=cancel_reader)
        self.assertEqual(counts['cov.fits'], 1)

    def test_source_change_after_parse_cannot_escape_as_a_bundle(self):
        counts = {}
        def changing_reader(path):
            counts[path.name] = counts.get(path.name, 0) + 1
            raw = self.raw[path.name]
            if path.name == 'int.fits' and counts[path.name] == 2:
                changed = bytearray(raw)
                changed[2880] ^= 1
                self.raw[path.name] = bytes(changed)
            return raw
        with self.assertRaisesRegex(RuntimeError, 'source_bytes_changed'):
            self.read(reader=changing_reader)


if __name__ == '__main__':
    unittest.main()
