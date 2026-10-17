"""The display estimate must have an effect without erasing source coverage."""
import unittest
import json
from pathlib import Path
import tempfile
from unittest.mock import patch
import numpy as np
from PIL import Image, ImageCms
from optical_display_background import estimate_display_background, background_batch
from optical_publication_io import bound_file


class DisplayBackgroundTest(unittest.TestCase):
    def fixture(self):
        rgb = np.full((256, 256, 3), 10, dtype=np.uint8)
        rgb[120:136, 120:136] = 100
        guard = np.zeros((256, 256), dtype=bool)
        guard[110:146, 110:146] = True
        return rgb, guard

    def test_known_floor_removed_and_guarded_source_retained(self):
        rgb, guard = self.fixture(); before = rgb.copy(); guard_before = guard.copy()
        display, background, mask, facts = estimate_display_background(rgb, guard)
        # IEC sRGB: byte100 minus a byte10 display floor encodes to byte99.
        # Both a no-effect result and an empty/erased source fail these checks.
        np.testing.assert_array_equal(display[120:136, 120:136], 99)
        self.assertTrue(np.all(display[0] == 0))
        self.assertTrue(np.all(background == 10))
        self.assertTrue(np.all(mask[guard]))
        self.assertEqual(facts['suppliedPixels'], 256 ** 2)
        self.assertEqual(facts['validBlackDisplayPixels'], 256 ** 2 - 16 ** 2)
        np.testing.assert_array_equal(rgb, before)
        np.testing.assert_array_equal(guard, guard_before)

    def test_invalid_or_empty_estimation_support_rejected(self):
        rgb, guard = self.fixture()
        for bad in (guard.astype('uint8'), guard[:20], np.ones_like(guard)):
            with self.assertRaisesRegex(ValueError, 'rgb_or_exclusion_invalid'):
                estimate_display_background(rgb, bad)
        with self.assertRaisesRegex(ValueError, 'recipe_invalid'):
            estimate_display_background(rgb, guard, box_size=(0, 128))
        with self.assertRaisesRegex(ValueError, 'recipe_invalid'):
            estimate_display_background(rgb, guard, source_dilation=-1)

    def test_batch_keeps_parent_stage_after_success_and_isolates_bad_mask(self):
        # Exercise the real batch/estimator/saved receipt path, stubbing only
        # the already-qualified parent. A single-row saved-result review does
        # not expose stage identity being overwritten by a per-job directory.
        root = Path(__file__).resolve().parents[2]
        (root / 'output').mkdir(exist_ok=True)
        temp = tempfile.TemporaryDirectory(prefix='background-batch-test-', dir=root / 'output')
        work = Path(temp.name).resolve()
        def cleanup():
            self.assertEqual(work.parent, (root / 'output').resolve())
            self.assertTrue(work.name.startswith('background-batch-test-'))
            temp.cleanup()
        self.addCleanup(cleanup)
        def bind(path):
            return bound_file(path, root=root)
        def save(name, value):
            path = work / name
            path.write_text(json.dumps(value), encoding='utf8')
            return bind(path)
        rgb, guard = self.fixture()
        profile = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
        Image.fromarray(rgb).save(work / 'parent.png', icc_profile=profile)
        Image.fromarray(guard.astype('uint8') * 255).save(work / 'mask.png')
        Image.fromarray(np.zeros((8, 8), dtype='uint8')).save(work / 'bad-mask.png')
        source = bind(work / 'parent.png')
        ids = ['good-first', 'bad-mask', 'good-last']
        for stage, processing_schema, review_schema in [
            ('SXT_ORIGINAL_RESTORED', 'sxt-processing-v1', 'sxt-review-queue-v1'),
            ('NXT_SXT_ORIGINAL_RESTORED', 'background-display-nxt-trial-result-v1', 'optical-display-denoise-review-v1'),
        ]:
            with self.subTest(stage=stage):
                processing = save(f'{stage}-processing.json', {'schema': processing_schema, 'rows': [
                    {'id': sid, 'size': [256, 256], 'key': {'job': {'outputSize': [256, 256]}}} for sid in ids]})
                decisions = save(f'{stage}-decisions.json', {'processingReceipt': processing})
                review = save(f'{stage}-review.json', {'schema': review_schema,
                    'processingReceipt': processing, 'decisionReceipt': decisions})
                manifest = save(f'{stage}-input.json', {'schemaVersion': 'optical-display-background-batch-v1',
                    'parentStage': stage, 'processingReceipt': processing, 'reviewReceipt': review,
                    'maxBatchPixels': 3 * 256 * 256, 'jobs': [
                        {'id': sid, 'boxSize': [128, 128], 'sourceDilation': 5,
                         'exclusionMask': bind(work / ('bad-mask.png' if sid == 'bad-mask' else 'mask.png'))}
                        for sid in ids]})
                seen = []
                def qualified_parent(spec, parent_stage, *, root):
                    seen.append((spec['id'], parent_stage))
                    if parent_stage != stage:
                        raise ValueError('fixture_parent_stage_changed')
                    return {'size': [256, 256], 'keySha256': 'a' * 64, 'input': source}, []
                output = work / f'{stage}-result'
                with patch('reviewed_background_display.background_parent', new=qualified_parent), \
                     patch('optical_display_background.BACKGROUND_ARRAY_LIMIT_BYTES', 2 * 1024 * 1024), \
                     patch('publish_prepared_display.BACKGROUND_ARRAY_LIMIT_BYTES', 2 * 1024 * 1024):
                    report = background_batch(root / manifest['path'], manifest['sha256'], output, root=root)
                self.assertEqual(seen, [(sid, stage) for sid in ids])
                saved = json.loads((output / 'result.json').read_text(encoding='utf8'))
                self.assertEqual(saved['parentStage'], stage)
                self.assertEqual(saved, report)
                self.assertEqual([row['status'] for row in saved['rows']],
                    ['DISPLAY_ESTIMATE_PENDING_REVIEW', 'FAILED', 'DISPLAY_ESTIMATE_PENDING_REVIEW'])
                self.assertEqual(saved['rows'][1]['error'], 'display_background_exclusion_mask_invalid')
                for row in (saved['rows'][0], saved['rows'][2]):
                    with Image.open(root / row['outputs']['display.png']['path']) as image:
                        self.assertEqual(image.getpixel((125, 125)), (99, 99, 99))
                        self.assertEqual(image.getpixel((0, 0)), (0, 0, 0))
                for budget in (True, 1):
                    invalid = json.loads((root / manifest['path']).read_text())
                    invalid['maxBackgroundBytes'] = budget
                    pin = save(f'{stage}-invalid-budget-{budget}.json', invalid)
                    rejected = work / f'{stage}-rejected-{budget}'
                    with patch('optical_display_background.estimate_display_background') as estimator:
                        with self.assertRaisesRegex(ValueError, 'byte_budget'):
                            background_batch(root / pin['path'], pin['sha256'], rejected, root=root)
                        estimator.assert_not_called()
                    self.assertFalse(rejected.exists())


if __name__ == '__main__':
    unittest.main()
