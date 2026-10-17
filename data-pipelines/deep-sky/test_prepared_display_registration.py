"""Saved display TAN admission: exact evidence, disjoint samples and no refit."""
import copy
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from astropy.wcs import WCS

from optical_publication_io import bound_file
from prepared_display_registration import admit_display_registration


class DisplayRegistrationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[2] / 'output')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.encoded = self.write('original.json', {'pixels': 'unchanged source fixture'})
        self.metadata = self.write('metadata.json', {'publisher': 'unchanged nominal fixture'})
        self.nominal = {'sourceWidth': 1870, 'sourceHeight': 1815}
        self.wcs = WCS(naxis=2)
        self.wcs.wcs.ctype = ['RA---TAN', 'DEC--TAN']
        self.wcs.wcs.radesys = 'ICRS'
        self.wcs.wcs.crval = [190.00879583792857, -11.647214339695891]
        self.wcs.wcs.crpix = [1018.3889440576338, 679.0802355214839]
        self.wcs.wcs.cd = [[-7.743234859790925e-5, -7.78602016151903e-5],
                           [-7.780919047535321e-5, 7.734861378362536e-5]]
        pixels = np.array([[120, 160], [1550, 210], [740, 1540], [90, 1710], [1600, 1780], [980, 420]])
        world = self.wcs.all_pix2world(pixels, 0)
        top = np.column_stack([pixels[:, 0], 1814-pixels[:, 1]]).astype(float)
        self.rows = [{'designation': str(i), 'ra': float(p[0]), 'dec': float(p[1]), 'jdate': 2451450.5,
                     'observation': {'status': 'UNREVIEWED_CANDIDATE', 'warnings': [], 'centroid': t.tolist()}}
                    for i, (p, t) in enumerate(zip(world, top))]
        source = self.write('source.json', {'jpeg': self.encoded, 'xmp': self.metadata, 'originalSize': [1870, 1815]})
        self.points = {'sourceReceipt': source, 'rows': self.rows, 'inputs': [self.encoded, self.metadata]}
        point_binding = self.write('points.json', self.points)
        self.measurement = {
            'status': 'MEASURED_TAN_CANDIDATE_NOT_ADOPTED', 'sourceWidth': 1870, 'sourceHeight': 1815,
            'inputs': [], 'declaration': {'points': point_binding, 'training': ['0', '1', '2'], 'holdout': ['3', '4', '5']},
            'fittedHeader': self.wcs.to_header().tostring(sep='\n'),
            'referenceValue': self.wcs.wcs.crval.tolist(), 'referencePixelFitsOneBased': self.wcs.wcs.crpix.tolist(),
            'cdDegreesPerPixel': self.wcs.pixel_scale_matrix.tolist(),
            'observations': [{'designation': r['designation'], 'measuredPixelTopFirst': r['observation']['centroid'],
                              'referenceIcrsDegrees': [r['ra'], r['dec']], 'referenceJdate': r['jdate'],
                              'fittedResidualPixels': [0, 0]} for r in self.rows],
            'summaries': {k: {'count': 3, 'rmsPixels': 0, 'maxPixels': 0} for k in ('training', 'holdout')}}
        self.catalogue = {'name': 'Synthetic references', 'url': 'https://example.org/catalogue',
                          'rightsUrl': 'https://example.org/rights', 'credit': 'Synthetic test, not product data'}

    def write(self, name, value):
        path = self.root / name
        path.write_text(json.dumps(value, allow_nan=False), encoding='utf8')
        return bound_file(path, root=self.root)

    def spec(self):
        binding = self.write('measurement.json', self.measurement)
        review = {'status': 'MEASURED_DISPLAY_TAN_SAMPLE_REVIEWED', 'measurement': binding,
                  'source': self.encoded, 'catalogue': self.catalogue, 'limitations': 'Synthetic test only',
                  **{k: self.measurement['declaration'][k] for k in ('training', 'holdout')}}
        return {'measurement': binding, 'review': self.write('review.json', review), 'catalogue': self.catalogue}

    def admit(self, spec=None):
        return admit_display_registration(spec or self.spec(), self.encoded, self.metadata,
                                          self.nominal, 'a'*64, root=self.root)

    def test_fits_decimal_roundtrip_preserves_exact_geometry_and_source(self):
        before = copy.deepcopy(self.measurement)
        registration, actual, bindings = self.admit()
        self.assertEqual(registration['geometry']['referenceValue'], self.measurement['referenceValue'])
        self.assertEqual(registration['sourceImage'], {k: self.encoded[k] for k in ('bytes', 'sha256')})
        self.assertEqual(registration['pixelTransform'], 'none')
        self.assertEqual(registration['holdout']['count'], 3)
        np.testing.assert_array_equal(actual.pixel_scale_matrix, self.wcs.pixel_scale_matrix)
        self.assertEqual(self.measurement, before)
        self.assertIn(self.encoded, bindings)

    def test_coordinate_and_reported_residual_mutations_are_rejected(self):
        for key, mutate, error in [
            ('referencePixelFitsOneBased', lambda m: m['referencePixelFitsOneBased'].__setitem__(0, 1019.3889440576338), 'tan_header'),
            ('observations', lambda m: m['observations'][0].__setitem__('fittedResidualPixels', [1, 0]), 'residual_readback'),
            ('summaries', lambda m: m['summaries']['holdout'].__setitem__('maxPixels', 1), 'statistics_readback')]:
            with self.subTest(key=key):
                saved = copy.deepcopy(self.measurement)
                mutate(self.measurement)
                with self.assertRaisesRegex(ValueError, error):
                    self.admit()
                self.measurement = saved

    def test_changed_point_reference_or_epoch_cannot_use_old_sample(self):
        for key, value in [('measuredPixelTopFirst', [121, 1654]), ('referenceIcrsDegrees', [191, -12]), ('referenceJdate', 2451545)]:
            saved = copy.deepcopy(self.measurement)
            self.measurement['observations'][0][key] = value
            with self.assertRaisesRegex(ValueError, 'point_measurement'):
                self.admit()
            self.measurement = saved

    def test_holdout_overlap_and_missing_independence_are_rejected(self):
        for value in (['2', '4', '5'], ['3', '4']):
            self.measurement['declaration']['holdout'] = value
            with self.assertRaisesRegex(ValueError, 'independent_holdout'):
                self.admit()

    def test_changed_source_bytes_or_unbound_review_are_rejected(self):
        spec = self.spec()
        (self.root / self.encoded['path']).write_bytes(b'changed')
        with self.assertRaisesRegex(RuntimeError, 'identity_invalid'):
            self.admit(spec)

    def test_review_and_catalogue_cannot_silently_change(self):
        spec = self.spec()
        spec['catalogue'] = {**self.catalogue, 'name': 'Another catalogue'}
        with self.assertRaisesRegex(ValueError, 'catalogue_review'):
            self.admit(spec)


if __name__ == '__main__':
    unittest.main()
