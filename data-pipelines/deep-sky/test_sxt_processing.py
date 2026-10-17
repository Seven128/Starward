"""Processing/review boundary regressions. Vendor fixtures never run a model."""
import copy
import json
from pathlib import Path
import sys
import unittest
import uuid
from unittest.mock import patch

import numpy as np
from PIL import Image, ImageCms

import sxt_processing as sxt
from optical_publication_io import bound_file
from image_quality import processing_review
from sxt_batch import prepare_batch
from normalized_rgb_source import normalize_whole_rgb
from reviewed_sxt_display import admit_reviewed_sxt, validate_sxt_display_pixels
from publish_prepared_native import publish_native_batch


ROOT = Path(__file__).resolve().parents[2]


class SxtBatchBoundaries(unittest.TestCase):
    def setUp(self):
        self.directory = ROOT / 'output/sxt-pipeline-tests' / uuid.uuid4().hex
        self.directory.mkdir(parents=True)
        self.profile = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
        self.source = self.directory / 'work.png'
        pixels = np.arange(24 * 18 * 3, dtype='uint8').reshape(18, 24, 3)
        Image.fromarray(pixels).save(self.source, icc_profile=self.profile)
        self.metadata = self.directory / 'source-admission.json'
        self.metadata.write_text('{"source":"fixture","geometry":"unchanged"}', encoding='utf8')
        self.jobs = [{'id': sid, 'kind': 'nebula', 'input': bound_file(self.source, root=ROOT),
            'outputSize': [24, 18], 'dependencies': [bound_file(self.metadata, root=ROOT)],
            'sourceContext': {'source': 'fixture'}, 'reviewRois': [[3, 2, 14, 12]]} for sid in ('first', 'second')]
        self.tools = {'sxt': str(self.directory / 'fixture.exe')}
        self.identity = [{'name': 'fixture', 'sha256': 'a' * 64},
                         {'mlVersion': 11, 'inputUpsample': 1, 'overlap': .2}]

    def fake_vendor(self, command, cwd, log, timeout, **kwargs):
        destination = Path(command[command.index('-o') + 1])
        events = [{'event': 'info', 'topic': 'device', 'device': 'gpu', 'provider': 'fixture'}]
        for source in [Path(p) for p in command[2:command.index('-o')]]:
            with Image.open(source) as image:
                rgb = np.asarray(image)
                Image.fromarray((rgb.astype('uint16') // 2).astype('uint8')).save(destination / (source.stem + '-sxt.png'))
                Image.fromarray(np.full(rgb.shape, 30, dtype='uint8')).save(destination / (source.stem + '-sxt-stars.png'))
            for suffix in ('-sxt.png', '-sxt-stars.png'):
                events.append({'event': 'status', 'phase': 'complete', 'output': str(destination / (source.stem + suffix))})
        log.write_text('\n'.join(json.dumps(e) for e in events), encoding='utf8')
        return {'wallSeconds': 0, 'measurement': 'fixture'}

    def process(self, name, jobs=None, **kwargs):
        with patch.object(sxt, 'sxt_identity', return_value=self.identity), \
                patch.object(sxt, 'run_external', side_effect=self.fake_vendor) as vendor:
            result = sxt.run_sxt_batch(jobs or self.jobs, self.directory / name,
                self.tools, 'sxt', root=ROOT, **kwargs)
        return result, vendor

    def test_batch_uses_one_call_and_restores_icc_without_mutating_input(self):
        original = self.source.read_bytes()
        result, vendor = self.process('batch')
        self.assertEqual(vendor.call_count, 1)
        self.assertEqual([r['status'] for r in result['rows']], ['PROCESSED_PENDING_REVIEW'] * 2)
        self.assertEqual(self.source.read_bytes(), original)
        for row in result['rows']:
            with Image.open(ROOT / row['outputs']['starless']['path']) as image:
                self.assertEqual(image.info['icc_profile'], self.profile)
            with Image.open(ROOT / row['outputs']['vendorStarless']['path']) as image:
                self.assertNotIn('icc_profile', image.info)

    def test_existing_run_import_allows_review_metadata_but_rejects_changed_pixels(self):
        result, _ = self.process('original-import', self.jobs[:1])
        previous = result['rows'][0]
        products = [{'id': previous['id'], 'receipt': bound_file(self.directory / 'original-import/result.json', root=ROOT),
            'events': bound_file(self.directory / 'original-import/tool.jsonl', root=ROOT),
            'outputs': previous['outputs']}]
        jobs = copy.deepcopy(self.jobs[:1])
        jobs[0]['sourceContext']['input'] = jobs[0]['input']
        jobs[0]['reviewRois'] = [[0, 0, 12, 9]]
        with patch.object(sxt, 'sxt_identity', return_value=self.identity), \
                patch.object(sxt, 'run_external') as vendor:
            imported = sxt.import_sxt_products(jobs, products, self.directory / 'imported', self.tools, 'sxt', root=ROOT)
            self.assertEqual(imported['rows'][0]['status'], 'PROCESSED_PENDING_REVIEW')
            self.assertEqual(imported['nativeInferenceCalls'], 0)
            self.assertEqual(imported['rows'][0]['outputs'], previous['outputs'])
            vendor.assert_not_called()
            jobs[0]['outputSize'] = [12, 9]
            rejected = sxt.import_sxt_products(jobs, products, self.directory / 'changed-size', self.tools, 'sxt', root=ROOT)
            self.assertEqual(rejected['rows'][0]['status'], 'FAILED')
            self.assertIn(rejected['rows'][0]['error'],
                ('sxt_import_processing_pixels_or_subject_changed', 'sxt_work_color_or_geometry_invalid'))
            jobs[0]['outputSize'] = [24, 18]
            jobs[0]['kind'] = 'galaxy'
            rejected = sxt.import_sxt_products(jobs, products, self.directory / 'changed-kind', self.tools, 'sxt', root=ROOT)
            self.assertEqual(rejected['rows'][0]['status'], 'FAILED')
            vendor.assert_not_called()

    def test_invalid_cluster_and_changed_input_are_isolated_before_vendor(self):
        jobs = copy.deepcopy(self.jobs)
        jobs[0]['kind'] = 'cluster'
        result, vendor = self.process('cluster', jobs)
        self.assertEqual(result['rows'][0]['status'], 'FAILED')
        self.assertEqual(result['rows'][1]['status'], 'PROCESSED_PENDING_REVIEW')
        command = vendor.call_args.args[0]
        self.assertFalse(any(Path(p).name == 'first.png' for p in command))
        jobs[0]['kind'] = 'nebula'
        jobs[0]['input']['sha256'] = '0' * 64
        result, _ = self.process('changed', jobs)
        self.assertEqual(result['rows'][0]['status'], 'FAILED')
        self.assertEqual(result['rows'][1]['status'], 'PROCESSED_PENDING_REVIEW')

    def test_fresh_display_hash_cannot_replace_vendor_pixels_or_icc(self):
        result, _ = self.process('pixel-readback', self.jobs[:1])
        row = result['rows'][0]
        job, outputs = row['key']['job'], copy.deepcopy(row['outputs'])
        validate_sxt_display_pixels(job, outputs, 'sxt', self.profile, root=ROOT)
        final = ROOT / outputs['starless']['path']
        with Image.open(final) as image:
            image.load(); changed = image.copy()
        changed.putpixel((0, 0), (255, 250, 245))
        changed.save(final, icc_profile=self.profile)
        outputs['starless'] = bound_file(final, root=ROOT)
        with self.assertRaisesRegex(ValueError, 'display_pixels_or_icc_changed'):
            validate_sxt_display_pixels(job, outputs, 'sxt', self.profile, root=ROOT)
        with Image.open(ROOT / outputs['vendorStarless']['path']) as vendor:
            vendor.save(final)  # Correct RGB with a fresh hash still needs the source ICC.
        outputs['starless'] = bound_file(final, root=ROOT)
        with self.assertRaisesRegex(ValueError, 'work_color_or_geometry_invalid'):
            validate_sxt_display_pixels(job, outputs, 'sxt', self.profile, root=ROOT)

    def reviewed_display(self):
        jobs = copy.deepcopy(self.jobs[:1])
        jobs[0]['sourceContext']['input'] = bound_file(self.source, root=ROOT)
        jobs[0]['dependencies'].append(bound_file(self.source, root=ROOT))
        result, _ = self.process('reviewed-display', jobs)
        receipt = self.directory / 'reviewed-display/result.json'
        review = processing_review(receipt, self.directory / 'file-review', root=ROOT)
        selected = review['rows'][0]
        decisions = self.directory / 'decisions.json'
        decisions.write_text(json.dumps({'processingReceipt': bound_file(receipt, root=ROOT),
            'decisions': [{'id': selected['id'], 'processingKeySha256': selected['processingKeySha256'],
                'outputs': selected['outputs'], 'status': 'FILE_REVIEW_PASSED_SCENE_PENDING',
                'reason': 'Synthetic file boundary fixture; no real-image quality claim'}]}), encoding='utf8')
        processing_review(receipt, self.directory / 'decided-review', root=ROOT, decisions_path=decisions)
        spec = {'id': selected['id'], 'processingReceipt': bound_file(receipt, root=ROOT),
                'reviewReceipt': bound_file(self.directory / 'decided-review/review.json', root=ROOT)}
        return spec

    def test_reviewed_display_preserves_whole_normalization_exact_output_and_unknown_scene(self):
        spec = self.reviewed_display()
        with Image.open(self.source) as original:
            original.load()
            rgb, encoded, proof, bindings = admit_reviewed_sxt(spec, bound_file(self.source, root=ROOT), original, root=ROOT)
        self.assertEqual(rgb.size, (24, 18))
        self.assertEqual(proof['starless']['sha256'], sxt.digest(encoded))
        self.assertEqual(proof['sceneAcceptance'], 'MISSING')
        self.assertEqual(proof['workingImage']['sha256'], bound_file(self.source, root=ROOT)['sha256'])
        self.assertTrue(bindings)

    def test_fresh_review_pin_cannot_admit_repair_or_different_source(self):
        spec = self.reviewed_display()
        with Image.open(self.source) as original:
            original.load()
            changed = {**bound_file(self.source, root=ROOT), 'sha256': '0' * 64}
            with self.assertRaisesRegex(ValueError, 'original_source_mismatch'):
                admit_reviewed_sxt(spec, changed, original, root=ROOT)
            # Matching original dimensions alone cannot certify whole-source pixels.
            other = original.copy(); other.putpixel((0, 0), (250, 240, 230))
            with self.assertRaisesRegex(ValueError, 'normalization_mismatch'):
                admit_reviewed_sxt(spec, bound_file(self.source, root=ROOT), other, root=ROOT)
            path = ROOT / spec['reviewReceipt']['path']
            review = json.loads(path.read_text(encoding='utf8'))
            review['rows'][0]['status'] = 'NEEDS_REPAIR'
            path.write_text(json.dumps(review), encoding='utf8')
            spec['reviewReceipt'] = bound_file(path, root=ROOT)
            with self.assertRaisesRegex(ValueError, 'exact_file_review_pass'):
                admit_reviewed_sxt(spec, bound_file(self.source, root=ROOT), original, root=ROOT)

    def test_publication_batch_queues_exceptions_and_isolates_candidate_failure(self):
        spec = self.reviewed_display()
        review_path = ROOT / spec['reviewReceipt']['path']
        review = json.loads(review_path.read_text(encoding='utf8'))
        review['rows'].append({'id': 'repair', 'status': 'NEEDS_REPAIR', 'reason': 'Real structure must be protected'})
        review_path.write_text(json.dumps(review), encoding='utf8')
        shared = {k: v for k, v in spec.items() if k != 'id'}
        shared['reviewReceipt'] = bound_file(review_path, root=ROOT)
        recipe_path = self.directory / 'publication-recipe.json'
        recipe_path.write_text(json.dumps({'sxtDisplay': shared | {'id': spec['id']}}), encoding='utf8')
        batch = {'schema': 'prepared-native-reviewed-batch-v1', 'review': shared,
            'recipes': [{'id': spec['id'], 'recipe': bound_file(recipe_path, root=ROOT)}]}
        manifest = self.directory / 'batch-input.json'; manifest.write_text(json.dumps(batch), encoding='utf8')
        with patch('publish_prepared_native.publish_native_recipe', side_effect=RuntimeError('fixture_encoding_failed')) as writer:
            result = publish_native_batch(manifest, bound_file(manifest, root=ROOT)['sha256'], self.directory / 'published', root=ROOT)
        self.assertEqual(writer.call_count, 1)
        self.assertEqual([r['status'] for r in result['rows']], ['FAILED', 'QUEUED_REVIEW_EXCEPTION'])
        self.assertEqual(result['rows'][1]['reason'], 'Real structure must be protected')
        self.assertTrue(all(r['ordinaryAdoption'] is False for r in result['rows']))
        self.assertEqual(result['batchReceipt'], bound_file(manifest, root=ROOT))
        self.assertEqual(result['reviewReceipt'], shared['reviewReceipt'])

    def test_whole_normalizer_rejects_partial_alpha_and_implicit_colour_or_upscale(self):
        opaque = Image.open(self.source).convert('RGBA')
        import io
        buffer = io.BytesIO(); opaque.save(buffer, format='PNG', icc_profile=self.profile)
        result = normalize_whole_rgb(buffer.getvalue(), 12)
        self.assertEqual(result.work_size, (12, 9))
        self.assertEqual(result.icc_profile, self.profile)
        opaque.putpixel((0, 0), (0, 0, 0, 0)); buffer = io.BytesIO()
        opaque.save(buffer, format='PNG', icc_profile=self.profile)
        with self.assertRaisesRegex(ValueError, 'complete_RGB'):
            normalize_whole_rgb(buffer.getvalue(), 12)
        with self.assertRaisesRegex(ValueError, 'upscale'):
            normalize_whole_rgb(self.source.read_bytes(), 48)
        untagged = io.BytesIO(); Image.new('RGB', (24, 18)).save(untagged, format='PNG')
        with self.assertRaisesRegex(ValueError, 'explicit_conversion'):
            normalize_whole_rgb(untagged.getvalue(), 12)
        interpreted = normalize_whole_rgb(untagged.getvalue(), 12, untagged_colour_interpretation='sRGB-web-display')
        self.assertIn('original untagged', interpreted.colour_meaning)

    def test_missing_one_output_preserves_other_result_and_review_exception(self):
        def partial(*args, **kwargs):
            measured = self.fake_vendor(*args, **kwargs)
            log = args[2]
            events = [json.loads(x) for x in log.read_text().splitlines()]
            events = [e for e in events if not e.get('output', '').endswith('first-sxt.png')]
            log.write_text('\n'.join(json.dumps(e) for e in events))
            return measured
        with patch.object(sxt, 'sxt_identity', return_value=self.identity), \
                patch.object(sxt, 'run_external', side_effect=partial):
            result = sxt.run_sxt_batch(self.jobs, self.directory / 'partial', self.tools, 'sxt', root=ROOT)
        self.assertEqual([r['status'] for r in result['rows']], ['FAILED', 'PROCESSED_PENDING_REVIEW'])
        review = processing_review(self.directory / 'partial/result.json', self.directory / 'review', root=ROOT)
        self.assertEqual(review['counts']['HARD_CHECK_FAILED'], 1)
        self.assertEqual(review['counts']['PENDING_REVIEW'], 1)

    def test_verified_cache_uses_no_vendor_and_corrupt_cache_does_not_rerun(self):
        first, _ = self.process('cache')
        result, vendor = self.process('reuse', reuse_from=self.directory / 'cache/result.json')
        vendor.assert_not_called()
        self.assertTrue(all(r['cacheHit'] for r in result['rows']))
        Path(ROOT / first['rows'][0]['outputs']['starless']['path']).write_bytes(b'corrupt fixture')
        result, vendor = self.process('corrupt', reuse_from=self.directory / 'cache/result.json')
        vendor.assert_not_called()
        self.assertEqual(result['rows'][0]['status'], 'FAILED')
        self.assertEqual(result['rows'][1]['status'], 'PROCESSED_PENDING_REVIEW')

    def test_input_changed_during_vendor_cannot_pass(self):
        def changed(*args, **kwargs):
            details = self.fake_vendor(*args, **kwargs)
            self.metadata.write_text('changed admission')
            return details
        with patch.object(sxt, 'sxt_identity', return_value=self.identity), \
                patch.object(sxt, 'run_external', side_effect=changed):
            result = sxt.run_sxt_batch(self.jobs, self.directory / 'late', self.tools, 'sxt', root=ROOT)
        self.assertTrue(all(r['status'] == 'FAILED' for r in result['rows']))

    def test_unparsed_or_failed_invocation_keeps_completed_products_in_exception_queue(self):
        def unparsed(*args, **kwargs):
            self.fake_vendor(*args, **kwargs)
            log = args[2]
            with log.open('a') as stream:
                stream.write('\n{"event":"unparsed","reason":"redacted"}')
            raise RuntimeError('fixture_exit_failure')
        with patch.object(sxt, 'sxt_identity', return_value=self.identity), \
                patch.object(sxt, 'run_external', side_effect=unparsed):
            result = sxt.run_sxt_batch(self.jobs, self.directory / 'incomplete', self.tools, 'sxt', root=ROOT)
        self.assertTrue(all(r['status'] == 'PROCESSED_PENDING_REVIEW' for r in result['rows']))
        queue = processing_review(self.directory / 'incomplete/result.json', self.directory / 'warnings', root=ROOT)
        self.assertTrue(all('VENDOR_INVOCATION_INCOMPLETE_REVIEW_REQUIRED' in r['warnings'] for r in queue['rows']))
        row = queue['rows'][0]
        decisions = {'processingReceipt': queue['processingReceipt'], 'decisions': [{
            'id': row['id'], 'processingKeySha256': row['processingKeySha256'], 'outputs': row['outputs'],
            'status': 'FILE_REVIEW_PASSED_SCENE_PENDING', 'reason': 'Incorrect fixture approval'}]}
        path = self.directory / 'bad-approval.json'
        path.write_text(json.dumps(decisions))
        reviewed = processing_review(self.directory / 'incomplete/result.json', self.directory / 'rejected-approval',
                                    root=ROOT, decisions_path=path)
        self.assertEqual(reviewed['rows'][0]['status'], 'HARD_CHECK_FAILED')

    def test_legacy_recipe_compatibility_does_not_hide_model_or_parameter_change(self):
        current = [{'name': 'model', 'sha256': 'a' * 64},
                   {'mlVersion': 11, 'overlap': .2, 'inputUpsample': 1}]
        legacy = copy.deepcopy(current)
        legacy[-1].pop('inputUpsample')
        self.assertTrue(sxt.same_sxt_recipe(legacy, current, 'sxt'))
        self.assertFalse(sxt.same_sxt_recipe(legacy, current, 'sxt-upsample'))
        legacy[0]['sha256'] = 'b' * 64
        self.assertFalse(sxt.same_sxt_recipe(legacy, current, 'sxt'))

    def test_review_decision_binds_pixels_and_stays_scene_pending(self):
        result, _ = self.process('decision')
        path = self.directory / 'decision/result.json'
        queue = processing_review(path, self.directory / 'initial-review', root=ROOT)
        row = queue['rows'][0]
        decisions = {'processingReceipt': queue['processingReceipt'], 'decisions': [{
            'id': row['id'], 'processingKeySha256': row['processingKeySha256'], 'outputs': row['outputs'],
            'status': 'FILE_REVIEW_PASSED_SCENE_PENDING', 'reason': 'Fixture file pixels examined'}]}
        decision_path = self.directory / 'decisions.json'
        decision_path.write_text(json.dumps(decisions))
        approved = processing_review(path, self.directory / 'decided-review', root=ROOT, decisions_path=decision_path)
        self.assertEqual(approved['rows'][0]['status'], 'FILE_REVIEW_PASSED_SCENE_PENDING')
        self.assertEqual(approved['rows'][0]['sceneAcceptance'], 'MISSING')
        self.assertFalse(approved['ordinaryAdoption'])
        decisions['decisions'][0]['outputs']['starless']['sha256'] = '0' * 64
        decision_path.write_text(json.dumps(decisions))
        stale = processing_review(path, self.directory / 'stale-review', root=ROOT, decisions_path=decision_path)
        self.assertEqual(stale['rows'][0]['status'], 'HARD_CHECK_FAILED')

    def test_new_size_works_and_pixel_budget_groups_without_hardcoded_width(self):
        Image.new('RGB', (2050, 3), (30, 20, 10)).save(self.source, icc_profile=self.profile)
        for job in self.jobs:
            job['input'] = bound_file(self.source, root=ROOT)
            job['outputSize'] = [2050, 3]
            job['reviewRois'] = []
        manifest = {'schema': 'sxt-batch-input-v1', 'method': 'sxt', 'maxBatchPixels': 6150,
                    'tools': self.tools, 'jobs': self.jobs}
        path = self.directory / 'batch-input.json'
        path.write_text(json.dumps(manifest))
        with patch.object(sxt, 'sxt_identity', return_value=self.identity), \
                patch.object(sxt, 'run_external', side_effect=self.fake_vendor) as vendor:
            result = prepare_batch(path, bound_file(path, root=ROOT)['sha256'], self.directory / 'grouped', root=ROOT)
        self.assertEqual(vendor.call_count, 2)
        self.assertEqual(len(result['rows']), 2)
        self.assertTrue(all(r['status'] == 'PROCESSED_PENDING_REVIEW' for r in result['rows']))

    def test_timeout_and_cancel_release_real_process_and_redact_vendor_output(self):
        import psutil
        pidfile = self.directory / 'pid.txt'
        script = self.directory / 'fixture_child.py'
        script.write_text('import os,time\nfrom pathlib import Path\n' +
            f'Path({str(pidfile)!r}).write_text(str(os.getpid()))\n' +
            'print("account-private-fixture",flush=True)\ntime.sleep(60)\n')
        with self.assertRaises(TimeoutError):
            sxt.run_external([sys.executable, str(script)], self.directory, self.directory / 'timeout.log',
                .4, event_filter=sxt.sxt_event_for_log)
        self.assertFalse(psutil.pid_exists(int(pidfile.read_text())))
        self.assertNotIn('account-private-fixture', (self.directory / 'timeout.log').read_text())
        with self.assertRaises(InterruptedError):
            sxt.run_external([sys.executable, str(script)], self.directory, self.directory / 'cancel.log',
                20, event_filter=sxt.sxt_event_for_log, cancel=lambda: True)


if __name__ == '__main__':
    unittest.main(verbosity=2)
