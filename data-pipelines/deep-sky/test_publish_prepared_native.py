"""Whole-source batching keeps failures isolated and cannot grant visual approval."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from optical_publication_io import bound_file
from publish_prepared_native import publish_native_batch


class FullSourceBatchTest(unittest.TestCase):
    def run_batch(self, recipes, ids=None, fail=None):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            entries = []
            for index, recipe in enumerate(recipes):
                file = root / f'recipe-{index}.json'
                file.write_text(json.dumps(recipe), encoding='utf8')
                entries.append({'id': (ids or [f'image-{i}' for i in range(len(recipes))])[index],
                                'recipe': bound_file(file, root=root)})
            batch = root / 'batch.json'
            batch.write_text(json.dumps({'schema': 'prepared-native-full-source-batch-v1', 'recipes': entries}), encoding='utf8')

            def publish(recipe, pin, destination, **kwargs):
                if destination.name == fail:
                    raise RuntimeError('fixture_bad_source')
                destination.mkdir()
                for name in ('manifest.json', 'writer-receipt.json'):
                    (destination / name).write_text('{}', encoding='utf8')
                return {'publicationHash': 'a' * 64}

            owner = root / 'owner.py'
            owner.write_text('# fixture', encoding='utf8')
            with patch('publish_prepared_native.__file__', str(owner)), \
                    patch('publish_prepared_native.publish_native_recipe', side_effect=publish) as writer:
                result = publish_native_batch(batch, bound_file(batch, root=root)['sha256'], root / 'out', root=root)
                inventory = json.loads((root / 'out/inventory-input.json').read_text(encoding='utf8'))
                return result, inventory, writer.call_count

    def test_partial_failure_keeps_next_valid_candidate_unreviewed(self):
        result, inventory, calls = self.run_batch([{}, {}, {'reuseDetail': {'bound': True}}], fail='image-1')
        self.assertEqual(calls, 3)
        self.assertEqual([row['status'] for row in result['rows']],
                         ['LOCAL_CANDIDATE_PACKAGED', 'FAILED', 'LOCAL_CANDIDATE_PACKAGED'])
        self.assertEqual([row['id'] for row in inventory['candidates']], ['image-0', 'image-2'])
        self.assertEqual(inventory['decisions'], [])
        self.assertTrue(all(row['fileReview'] == 'PENDING_REVIEW' and not row['ordinaryAdoption'] for row in result['rows']))
        self.assertTrue(result['rows'][2]['reusedDetail'])

    def test_processing_cannot_bypass_its_review(self):
        for key in ('sxtDisplay', 'restoredDisplay', 'backgroundDisplay', 'denoisedDisplay', 'displayRegistration'):
            with self.subTest(key=key):
                result, inventory, calls = self.run_batch([{key: None}, {}])
                self.assertEqual(result['rows'][0]['status'], 'FAILED')
                self.assertEqual(calls, 1)
                self.assertEqual(len(inventory['candidates']), 1)

    def test_invalid_duplicate_or_traversal_ids_rejected(self):
        for ids in (['same', 'same'], ['../escape', 'okay'], ['', 'okay']):
            with self.assertRaisesRegex(ValueError, 'batch_ids_invalid'):
                self.run_batch([{}, {}], ids=ids)


if __name__ == '__main__':
    unittest.main()
