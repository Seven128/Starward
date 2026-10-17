"""Source identity and real pixel/edge conventions, independent of file names."""
from copy import deepcopy
import json
import unittest

from astropy.wcs import WCS
import numpy as np

from prepared_publisher_corners import stellarium_corner_geometry


class PublisherCornersTest(unittest.TestCase):
    def fixture(self):
        width, height = 512, 384
        expected = WCS(naxis=2)
        expected.wcs.ctype = ['RA---TAN', 'DEC--TAN']
        expected.wcs.radesys = 'ICRS'
        expected.wcs.crval = [359.99, -32.8]
        expected.wcs.crpix = [(width+1)/2, (height+1)/2]
        expected.wcs.cd = [[-.0003, .00004], [.00003, .0003]]
        edges = np.array([[0, 0], [width, 0], [width, height], [0, height]])-.5
        world = expected.all_pix2world(edges, 0).tolist()
        revision = 'a'*40
        base = f'https://raw.githubusercontent.com/Stellarium/stellarium/{revision}/nebulae/default/'
        encoded = {'path': 'source.png', 'bytes': 120, 'sha256': 'b'*64}
        metadata = {'path': 'textures.json', 'bytes': 1000, 'sha256': 'c'*64}
        tile = {'imageUrl': 'n1234.png', 'worldCoords': [world],
                'textureCoords': [[[0, 0], [1, 0], [1, 1], [0, 1]]], 'imageCredits': {'short': 'ESO/Fixture'}}
        document = {'subTiles': [tile]}
        recipe = {'encoded': encoded, 'metadata': metadata, 'metadataSourceUrl': base+'textures.json',
                  'source': {'sourceUrl': base+'n1234.png', 'credit': 'ESO/Fixture'}}
        evidence = {'schemaVersion': 'source-fetch-evidence-v1', 'repository': 'https://github.com/Stellarium/stellarium',
                    'revision': revision, 'metadata': [metadata], 'files': [{'file': 'n1234.png',
                    'sourceUrl': base+'n1234.png', **encoded, 'size': [width, height], 'texture': deepcopy(tile)}]}
        return recipe, document, evidence, width, height, expected

    def test_rotated_ra_wrap_preserves_corner_edges_and_interior_pixel_centers(self):
        recipe, document, evidence, width, height, expected = self.fixture()
        actual, receipt = stellarium_corner_geometry(recipe, json.dumps(document), evidence, width, height)
        points = np.array([[0, 0], [width-1, height-1], [width*.23, height*.61], [(width-1)/2, (height-1)/2]])
        predicted = actual.all_world2pix(expected.all_pix2world(points, 0), 0)
        np.testing.assert_allclose(predicted, points, atol=2e-4, rtol=0)
        # A .5-pixel origin shift or a top-first interpretation fails this bound.
        self.assertLess(receipt['maximumCornerResidualPixels'], 2e-4)
        self.assertIn('not independent registration', receipt['meaning'])

    def test_wrong_source_metadata_dimensions_or_credit_cannot_borrow_geometry(self):
        for edit in [
            lambda r, d, e: r['encoded'].update(sha256='d'*64),
            lambda r, d, e: r.update(metadataSourceUrl=r['metadataSourceUrl'].replace('a'*40, 'master')),
            lambda r, d, e: r['metadata'].update(sha256='e'*64),
            lambda r, d, e: e['files'][0].update(size=[513, 384]),
            lambda r, d, e: r['source'].update(credit='Different source'),
            lambda r, d, e: d['subTiles'][0]['worldCoords'][0][0].__setitem__(0, 180),
            lambda r, d, e: d['subTiles'].append(deepcopy(d['subTiles'][0])),
        ]:
            recipe, document, evidence, width, height, _ = self.fixture()
            # Break dictionary aliases so stale receipt content cannot follow an edit.
            recipe, document, evidence = deepcopy(recipe), deepcopy(document), deepcopy(evidence)
            edit(recipe, document, evidence)
            with self.assertRaisesRegex(ValueError, 'prepared_corners_'):
                stellarium_corner_geometry(recipe, json.dumps(document), evidence, width, height)

    def test_incompatible_polygons_and_non_tan_distortion_stay_exceptions(self):
        for change in ('world', 'texture', 'frame'):
            recipe, document, evidence, width, height, _ = self.fixture()
            tile = document['subTiles'][0]
            if change == 'world':
                tile['worldCoords'][0][0][1] += .02
            elif change == 'texture':
                tile['textureCoords'][0][0] = [.1, 0]
            else:
                tile['frameType'] = 'Galactic'
            evidence['files'][0]['texture'] = deepcopy(tile)
            with self.assertRaisesRegex(ValueError, 'prepared_corners_'):
                stellarium_corner_geometry(recipe, json.dumps(document), evidence, width, height)


if __name__ == '__main__':
    unittest.main()
