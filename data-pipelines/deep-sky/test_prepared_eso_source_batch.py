import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from optical_publication_io import bound_file
from prepared_eso_source_batch import download, prepare_batch, validate_source_declaration
from prepared_rgb_observation import parse_prepared_rgb_avm


def declared(identifier='eso1118a'):
    return {'id': identifier, 'resourceId': identifier, 'kind': 'galaxy',
        'pageUrl': f'https://www.eso.org/public/images/{identifier}/',
        'downloadUrl': f'https://cdn.eso.org/images/large/{identifier}.jpg',
        'credit': 'ESO', 'colourMeaning': 'Published multi-band display composite',
        'workWidth': 4096,
        'rightsUse': 'CC_BY_4_0_REVIEWED_WITH_CREDIT_AND_AI_MODIFICATION_NOTICE'}


class EsoSourceBoundaryTests(unittest.TestCase):
    def test_real_provider_attribute_and_standard_namespaces_are_read_by_shared_parser(self):
        # Representation observed in the new ESO JPEGs: AVM attributes,
        # Photoshop credit, and XMP Rights language-alternative usage terms.
        packet = b'''<x:xmpmeta xmlns:x="adobe:ns:meta/">
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        <rdf:Description xmlns:avm="http://www.communicatingastronomy.org/avm/1.0/"
        xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
        xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/" avm:ResourceID="eso1118a"
        photoshop:Credit="ESO" avm:ReferenceURL="https://www.eso.org/public/images/eso1118a/">
        <xmpRights:UsageTerms><rdf:Alt><rdf:li xml:lang="x-default">Creative Commons Attribution 4.0 International License</rdf:li></rdf:Alt></xmpRights:UsageTerms>
        </rdf:Description></rdf:RDF></x:xmpmeta>'''
        avm, _, _, _ = parse_prepared_rgb_avm(packet)
        self.assertEqual(avm.ResourceID, 'eso1118a')
        self.assertEqual(avm.Credit, 'ESO')
        self.assertEqual(avm.Rights, 'Creative Commons Attribution 4.0 International License')
        self.assertEqual(avm.ReferenceURL, declared()['pageUrl'])

    def test_source_declaration_cannot_fetch_another_asset_or_unsupported_subject(self):
        for changes in ({'downloadUrl': declared('eso1037a')['downloadUrl']},
                        {'pageUrl': 'https://example.org/eso1118a/'},
                        {'kind': 'cluster'}, {'rightsUse': ''}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                validate_source_declaration(declared() | changes)

    def test_network_size_limit_keeps_partial_evidence_without_a_complete_asset(self):
        class Response(io.BytesIO):
            url = 'https://cdn.eso.org/images/large/eso1118a.jpg'
            headers = {}
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / 'image.jpg'
            with patch('urllib.request.urlopen', return_value=Response(b'oversized')):
                with self.assertRaisesRegex(ValueError, 'resource_budget'):
                    download(declared()['downloadUrl'], destination, 3)
            self.assertFalse(destination.exists())
            self.assertTrue(destination.with_name('image.jpg.partial').exists())

    def test_failed_source_does_not_erase_independent_ready_rows_or_adopt_them(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            owner = root / 'prepared_eso_source_batch.py'
            import prepared_eso_source_batch
            owner.write_bytes(Path(prepared_eso_source_batch.__file__).read_bytes())
            manifest = root / 'input.json'
            manifest.write_text(json.dumps({'schema': 'eso-prepared-source-batch-v1',
                'sources': [declared('eso1037a'), declared()], 'tools': {},
                'limits': dict.fromkeys(('maxPageBytes', 'maxEncodedBytes',
                                        'maxDecodedPixels', 'maxBatchPixels'), 100)}))
            def local_download(url, destination, limit):
                destination.write_text('https://creativecommons.org/licenses/by/4.0/ AI')
            def local_prepare(source, directory, policy_binding, **kwargs):
                if source['resourceId'] == 'eso1037a':
                    raise ValueError('invalid source identity')
                return {'id': source['id'], 'kind': source['kind']}
            with patch('prepared_eso_source_batch.download', side_effect=local_download), \
                    patch('prepared_eso_source_batch.prepare_source', side_effect=local_prepare), \
                    patch('prepared_eso_source_batch.__file__', str(owner)):
                result = prepare_batch(manifest, bound_file(manifest, root=root)['sha256'],
                                       root / 'output', root=root)
            self.assertEqual([r['status'] for r in result['rows']],
                             ['FAILED', 'SOURCE_PREPARED_PROCESSING_PENDING'])
            self.assertTrue(all(not r['ordinaryAdoption'] for r in result['rows']))
            self.assertEqual(json.loads((root / 'output/sxt-input.json').read_text())['jobs'],
                             [{'id': 'eso1118a', 'kind': 'galaxy'}])


if __name__ == '__main__':
    unittest.main()
