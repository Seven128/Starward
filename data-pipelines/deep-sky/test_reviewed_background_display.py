"""Saved RGB proof, independent failure queues and explicit quality decisions."""
import copy
from contextlib import redirect_stdout
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
from PIL import Image, ImageCms
from optical_publication_io import bound_file
from image_quality import processing_review
from sxt_batch import main as batch_main
from reviewed_background_display import (background_processing_row, background_row_hash, verify_background_row, background_parent)


class BackgroundAdmissionTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='starward-background-')
        self.root = Path(self.temp.name).resolve()
        def cleanup():
            self.assertEqual(self.root.parent, Path(tempfile.gettempdir()).resolve())
            self.assertTrue(self.root.name.startswith('starward-background-'))
            self.temp.cleanup()
        self.addCleanup(cleanup)
        self.profile = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()

    def binding(self, path):
        return bound_file(self.root / path, root=self.root)

    def save(self, path, value):
        (self.root / path).write_text(json.dumps(value, sort_keys=True), encoding='utf8')
        return self.binding(path)

    def fixture(self, shape=(32, 40, 3), *, max_background_bytes=None):
        height, width, _ = shape; count = height * width
        pixels = np.full(shape, 10, dtype='uint8'); pixels[12:20, 16:24] = 100
        display = np.zeros_like(pixels); display[12:20, 16:24] = 99
        for name, values in [('parent.png', pixels), ('display.png', display)]:
            Image.fromarray(values).save(self.root / name, icc_profile=self.profile)
        mask = np.zeros(shape[:2], dtype='uint8'); mask[10:22, 14:26] = 255
        Image.fromarray(mask).save(self.root / 'mask.png')
        np.savez_compressed(self.root / 'background.npz', background=np.full(shape, 10, dtype='f8'))
        sid = 'fixture'; parent_file = self.binding('parent.png')
        key = {'method': 'sxt', 'job': {'id': sid, 'kind': 'nebula', 'outputSize': [width, height], 'input': parent_file,
            'dependencies': [parent_file], 'sourceContext': {'input': parent_file}}, 'tools': []}
        outputs = {'starless': parent_file, 'vendorStarless': parent_file}
        parent = {'id': sid, 'status': 'PROCESSED_PENDING_REVIEW', 'key': key, 'outputs': outputs}
        parent_proc = self.save('parent-processing.json', {'schema': 'sxt-processing-v1', 'rows': [parent]})
        parent_decision = {'id': sid, 'status': 'FILE_REVIEW_PASSED_SCENE_PENDING', 'reason': 'Transport fixture only',
            'processingKeySha256': hashlib.sha256(json.dumps(key, sort_keys=True).encode()).hexdigest(), 'outputs': outputs}
        decisions = self.save('parent-decisions.json', {'processingReceipt': parent_proc, 'decisions': [parent_decision]})
        parent_review = self.save('parent-review.json', {'schema': 'sxt-review-queue-v1', 'processingReceipt': parent_proc,
            'decisionReceipt': decisions, 'rows': [parent_decision]})
        recipe = {'id': sid, 'exclusionMask': self.binding('mask.png'), 'boxSize': [8, 10], 'sourceDilation': 0}
        declaration = {'schemaVersion': 'optical-display-background-batch-v1',
            'processingReceipt': parent_proc, 'reviewReceipt': parent_review, 'jobs': [recipe], 'maxBatchPixels': count}
        if max_background_bytes is not None: declaration['maxBackgroundBytes'] = max_background_bytes
        manifest = self.save('recipe.json', declaration)
        row = {'id': sid, 'status': 'DISPLAY_ESTIMATE_PENDING_REVIEW', 'recipe': recipe, 'size': [width, height], 'input': parent_file,
            'parentProcessingKeySha256': parent_decision['processingKeySha256'],
            'outputs': {'display.png': self.binding('display.png'), 'background.npz': self.binding('background.npz'),
                'estimation-mask.png': self.binding('mask.png')}, 'comparisons': [], 'changedPixels': count,
            'details': {'producerVersion': 'source-excluded-srgb-display-background-v1', 'boxSize': [8, 10], 'sourceDilation': 0,
                'meshFilterSize': [3, 3], 'sigmaClip': [3, 10], 'detectNSigma': 2, 'detectNPixels': 10,
                'negativeChannelPixels': [0, 0, 0], 'suppliedPixels': count, 'validBlackDisplayPixels': count - 64,
                'guardPixels': 144, 'detectedOnlyPixels': 0, 'maskedFraction': 144 / count, 'backgroundMedianRGB': [10, 10, 10]}}
        processing = {'schemaVersion': 'optical-display-background-batch-result-v1', 'manifest': manifest,
            'processingReceipt': parent_proc, 'reviewReceipt': parent_review, 'rows': [row], 'inputs': [], 'executionOwners': []}
        return processing, row

    def test_current_saved_pixels_and_rebound_wrong_formula_fail_without_refit(self):
        processing, row = self.fixture()
        image, _, _, _ = verify_background_row(processing, row, root=self.root, receipt_directory=Path('.'))
        self.assertEqual(image.getpixel((17, 13)), (99, 99, 99))
        # Rebind a syntactically valid PNG containing unchanged source RGB.
        # A hash-only or no-effect verifier would admit this escaped pixel bug.
        changed = copy.deepcopy(row); changed['outputs']['display.png'] = row['input']
        with self.assertRaisesRegex(RuntimeError, 'formula_pixels_invalid'):
            verify_background_row(processing, changed, root=self.root, receipt_directory=Path('.'))
        changed = copy.deepcopy(row); changed['details']['validBlackDisplayPixels'] = 0
        with self.assertRaisesRegex(ValueError, 'saved_proof_changed'):
            verify_background_row(processing, changed, root=self.root, receipt_directory=Path('.'))

    def test_quality_is_separate_and_one_failed_row_keeps_independent_result(self):
        processing, row = self.fixture()
        other = copy.deepcopy(row); other['id'] = 'unbound'; processing['rows'].append(other)
        processing_binding = self.save('processing.json', processing)
        decision = {'id': row['id'], 'status': 'FILE_REVIEW_PASSED_SCENE_PENDING', 'reason': 'Fixture review decision only',
            'processingKeySha256': background_row_hash(row), 'outputs': row['outputs'], 'evidence': [row['outputs']['display.png']]}
        decisions = self.save('decisions.json', {'processingReceipt': processing_binding, 'decisions': [decision]})
        report = processing_review(self.root / 'processing.json', self.root / 'review', root=self.root,
            decisions_path=self.root / decisions['path'])
        self.assertEqual([r['status'] for r in report['rows']], ['FILE_REVIEW_PASSED_SCENE_PENDING', 'HARD_CHECK_FAILED'])
        spec = {'id': 'fixture', 'processingReceipt': processing_binding, 'reviewReceipt': self.binding('review/review.json')}
        _, admitted, _ = background_processing_row(spec, root=self.root)
        self.assertEqual(admitted['outputs'], row['outputs'])
        pending = processing_review(self.root / 'processing.json', self.root / 'pending', root=self.root)
        spec['reviewReceipt'] = self.binding('pending/review.json')
        with self.assertRaises((ValueError, TypeError)):
            background_processing_row(spec, root=self.root)
        self.assertEqual(pending['rows'][0]['status'], 'PENDING_FILE_REVIEW')

    def test_declared_large_saved_model_preserves_formula_and_old_budget(self):
        shape = (2380, 2400, 3)
        processing, row = self.fixture(shape, max_background_bytes=shape[0] * shape[1] * 24)
        image, _, _, _ = verify_background_row(processing, row, root=self.root, receipt_directory=Path('.'))
        self.assertEqual(image.getpixel((17, 13)), (99, 99, 99))
        self.assertEqual(image.getpixel((2399, 2379)), (0, 0, 0))
        manifest = json.loads((self.root / 'recipe.json').read_text()); del manifest['maxBackgroundBytes']
        processing['manifest'] = self.save('recipe.json', manifest)
        with self.assertRaisesRegex((ValueError, RuntimeError), 'budget|shape_invalid'):
            verify_background_row(processing, row, root=self.root, receipt_directory=Path('.'))

    def test_review_cli_reports_saved_display_rows_without_sxt_only_counts(self):
        processing, row = self.fixture()
        other = copy.deepcopy(row); other['id'] = 'unbound'; processing['rows'].append(other)
        self.save('processing.json', processing)
        output = self.root / 'cli-review'
        stdout = io.StringIO()
        argv = ['sxt_batch.py', '--root', str(self.root), '--review-from',
                str(self.root / 'processing.json'), '--output', str(output)]
        with patch('sys.argv', argv), redirect_stdout(stdout):
            batch_main()
        summary = json.loads(stdout.getvalue())
        self.assertEqual(summary['counts'], {'PENDING_FILE_REVIEW': 1, 'HARD_CHECK_FAILED': 1})
        report = json.loads((output / 'review.json').read_text())
        self.assertEqual([r['status'] for r in report['rows']],
                         ['PENDING_FILE_REVIEW', 'HARD_CHECK_FAILED'])
        self.assertFalse(report['ordinaryAdoption'])

    def test_before_background_parent_rejects_after_background_cycle_and_unknown_stage(self):
        # The only permitted NXT parent is the reviewed complete SXT/PS stage.
        # An after-background NXT chain must never recurse back into background.
        with patch('reviewed_denoised_display.denoise_processing_row', return_value=({}, {}, {'parentStage': 'BACKGROUND_DISPLAY'}, ())):
            with self.assertRaisesRegex(ValueError, 'nested_stage_order_invalid'):
                background_parent({'id': 'fixture'}, 'NXT_SXT_ORIGINAL_RESTORED', root=self.root)
        with self.assertRaisesRegex(ValueError, 'parent_stage_invalid'):
            background_parent({}, 'UNKNOWN', root=self.root)


if __name__ == '__main__':
    unittest.main()
