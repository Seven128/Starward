import json
from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from publish_bsc5p_acrux import publish


ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'packages/astronomy-core/data'
BASE = DATA / 'bsc5p-bright-stars.v2.json'
MANIFEST = DATA / 'bsc5p-bright-stars.v2.manifest.json'


class AcruxPublicationTest(unittest.TestCase):
    def test_explicit_component_changes_only_one_name_and_is_hash_bound(self):
        with TemporaryDirectory() as temp:
            work = Path(temp)
            active = work / 'active.html'
            archived = work / 'archived.html'
            active.write_text('<table><tr><th>proper names</th><th>Designation</th><th>HIP</th><th>Bayer ID</th></tr>'
                              '<tr><td>Acrux</td><td>* alf Cru</td><td>60718</td><td>α Cru</td></tr></table>', encoding='utf-8')
            archived.write_text('<table><tr><th>IAU Name</th><th>Designation</th></tr>'
                                '<tr><td>Acrux</td><td>HR 4730</td></tr></table>', encoding='utf-8')
            manifest = json.loads(MANIFEST.read_bytes())
            for file, source in ((active, manifest['sources']['names']),
                                 (archived, manifest['sources']['nameIdentities'])):
                raw = file.read_bytes()
                source['responseSha256'] = sha256(raw).hexdigest()
                source['responseBytes'] = len(raw)
            fixture_manifest = work / 'manifest.json'
            fixture_manifest.write_text(json.dumps(manifest), encoding='utf-8')
            output = work / 'output'
            result = publish(BASE, fixture_manifest, active, archived, output)
            before = json.loads(BASE.read_bytes())
            after_raw = (output / 'bsc5p-bright-stars.v3.json').read_bytes()
            after = json.loads(after_raw)
            changed = [(left['sourceId'], key) for left, right in zip(before['rows'], after['rows'])
                       for key in left if left[key] != right[key]]
            self.assertEqual(changed, [('HR:4730', 'properName')])
            self.assertEqual(next(row for row in after['rows'] if row['sourceId'] == 'HR:4730')['properName'], 'Acrux')
            self.assertIsNone(next(row for row in after['rows'] if row['sourceId'] == 'HR:4731')['properName'])
            self.assertEqual(result['derivedAssetSha256'], sha256(after_raw).hexdigest())
            self.assertEqual(result['namedRowCount'], manifest['namedRowCount'] + 1)
            archived.write_text(archived.read_text(encoding='utf-8').replace('HR 4730', 'HR 4731'), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'IAU source bytes changed'):
                publish(BASE, fixture_manifest, active, archived, output)
            changed_raw = archived.read_bytes()
            manifest['sources']['nameIdentities']['responseSha256'] = sha256(changed_raw).hexdigest()
            manifest['sources']['nameIdentities']['responseBytes'] = len(changed_raw)
            fixture_manifest.write_text(json.dumps(manifest), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Acrux component evidence changed'):
                publish(BASE, fixture_manifest, active, archived, output)


if __name__ == '__main__':
    unittest.main()
