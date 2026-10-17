"""Bounded regressions for actual cache/integrity failures, no tool inference."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest
import uuid
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('benchmark', Path(__file__).with_name('benchmark-image-tools.py'))
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)


class CacheContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.destination = b.ROOT / 'output/image-tool-benchmark-2026-10-08' / ('regression-' + uuid.uuid4().hex)
        cls.destination.mkdir()
        cls.sample = json.loads(Path(__file__).with_name('image-tool-benchmark-samples.json').read_text())['samples'][0]
        cls.versions = b.packages()

    def sample_for(self, name):
        sample = copy.deepcopy(self.sample)
        sample['testCase'] = name
        return sample

    def test_failed_result_reused_without_retry_and_preserves_reason(self):
        sample = self.sample_for('deterministic-failure')
        with patch.object(b, 'produce', side_effect=ValueError('no_reliable_background')) as produce:
            first = b.process_sample(sample, 'photutils', self.destination, {}, self.versions)
            second = b.process_sample(sample, 'photutils', self.destination, {}, self.versions)
            self.assertEqual(produce.call_count, 1)
        self.assertEqual(first['status'], 'FAILED')
        self.assertEqual(second['error'], first['error'])
        self.assertTrue(second['cacheHit'])

    def test_parameter_change_invalidates_existing_failure(self):
        sample = self.sample_for('parameter-invalidation')
        with patch.object(b, 'produce', side_effect=ValueError('fixture')) as produce:
            first = b.process_sample(sample, 'photutils', self.destination, {}, self.versions)
            sample['protectEllipses'][0][2] += .01
            second = b.process_sample(sample, 'photutils', self.destination, {}, self.versions)
        self.assertEqual(produce.call_count, 2)
        self.assertNotEqual(first['receipt'], second['receipt'])

    def test_recovered_dependency_can_retry_without_erasing_failure(self):
        sample = self.sample_for('transient-dependency')
        with patch.object(b, 'produce', side_effect=RuntimeError('temporarily_unavailable')):
            failed = b.process_sample(sample, 'original', self.destination, {}, self.versions)
        failure_path = b.ROOT / failed['receipt']
        before = failure_path.read_bytes()
        recovered = b.process_sample(sample, 'original', self.destination, {}, self.versions, retry_failed=True)
        cached = b.process_sample(sample, 'original', self.destination, {}, self.versions)
        self.assertNotEqual(failed['receipt'], recovered['receipt'])
        self.assertEqual(before, failure_path.read_bytes())
        self.assertNotEqual(recovered.get('status'), 'FAILED')
        self.assertTrue(cached['cacheHit'])
        self.assertEqual(cached['receipt'], recovered['receipt'])

    def test_output_corruption_not_reused_and_original_is_shared(self):
        sample = self.sample_for('artifact-corruption')
        row = b.process_sample(sample, 'original', self.destination, {}, self.versions)
        receipt = b.ROOT / row['receipt']
        original = receipt.parent / 'original.png'
        processed = receipt.parent / 'processed.png'
        self.assertTrue(original.samefile(processed))
        original_hash = b.digest(original.read_bytes())
        # Corrupt an independent diagnostic, never any source or shared object.
        (receipt.parent / 'difference-x8.png').write_bytes(b'damaged test output')
        with self.assertRaises(Exception):
            b.process_sample(sample, 'original', self.destination, {}, self.versions)
        self.assertEqual(original_hash, b.digest(original.read_bytes()))

    def test_wrong_source_hash_rejected_before_processing(self):
        sample = self.sample_for('source-corruption')
        sample['input']['sha256'] = '0' * 64
        with patch.object(b, 'produce') as produce:
            with self.assertRaises(Exception):
                b.process_sample(sample, 'original', self.destination, {}, self.versions)
            produce.assert_not_called()

    def test_cluster_rejected_before_loading_model(self):
        sample = self.sample_for('cluster')
        sample['kind'] = 'cluster'
        for method in b.STAR_REMOVERS:
            with self.subTest(method=method):
                with self.assertRaisesRegex(ValueError, 'cluster_star_removal_forbidden'):
                    b.process_sample(sample, method, self.destination, {}, self.versions)

    def test_siril_zero_exit_does_not_prove_inference(self):
        # Escaped failure: the real wrapper rejected its argument while Siril
        # still saved the original image and announced successful execution.
        log = 'log: StarNet: unknown mask kind(s): difference\nlog: Saving PNG\nlog: Script execution finished successfully.'
        with self.assertRaisesRegex(RuntimeError, 'did_not_complete_inference'):
            b.validate_siril_starnet_log(log)
        # A model can finish, then the wrapper can fail before importing it.
        after_model = 'StarNet: Working: Done!\nStarNet: Writing starless image to: temporary.tif\nStarNet: Requested native star mask was not produced\nScript execution finished successfully.'
        with self.assertRaisesRegex(RuntimeError, 'did_not_complete_inference'):
            b.validate_siril_starnet_log(after_model)

    def test_siril_config_and_dll_change_invalidate_cache(self):
        tool = self.destination / 'fake-siril.exe'
        dll = self.destination / 'fake-dependency.dll'
        tool.write_bytes(b'fixture, never executed');dll.write_bytes(b'v1')
        sample = self.sample_for('siril-configuration')
        with patch.object(b, 'produce', side_effect=ValueError('fixture')) as produce:
            first = b.process_sample(sample, 'siril', self.destination, {'siril': str(tool)}, self.versions)
            with patch.object(b, 'SIRIL_CONFIG', b.SIRIL_CONFIG + '\n# changed configuration'):
                second = b.process_sample(sample, 'siril', self.destination, {'siril': str(tool)}, self.versions)
            dll.write_bytes(b'v2')
            third = b.process_sample(sample, 'siril', self.destination, {'siril': str(tool)}, self.versions)
        self.assertEqual(produce.call_count, 3)
        self.assertEqual(len({r['receipt'] for r in [first, second, third]}), 3)

    def test_sxt_complete_for_unrelated_output_not_accepted(self):
        # A successful stars-only write cannot establish that the requested
        # starless image was written. Tie the vendor events to both real files.
        case = self.destination / 'sxt-event-contract'
        case.mkdir()
        result = case / 'starless.png'
        stars = case / 'stars.png'
        b.Image.new('RGB', (3, 2), (5, 10, 15)).save(stars)
        log = case / 'tool.jsonl'
        events = [{'event': 'info', 'topic': 'device', 'device': 'gpu'},
                  {'event': 'status', 'phase': 'complete', 'output': str(stars)}]
        log.write_text('\n'.join(json.dumps(e) for e in events))
        with self.assertRaisesRegex(RuntimeError, 'missing_or_ambiguous'):
            b.validate_sxt_events(log, result, (3, 2))
        events.append({'event': 'status', 'phase': 'complete', 'output': str(result)})
        log.write_text('\n'.join(json.dumps(e) for e in events))
        self.assertEqual(b.validate_sxt_events(log, result, (3, 2))['starLayer'], stars.name)
        b.Image.new('RGB', (4, 2), (5, 10, 15)).save(stars)
        with self.assertRaisesRegex(RuntimeError, 'invalid_star_layer'):
            b.validate_sxt_events(log, result, (3, 2))

    def test_sxt_vendor_account_fields_do_not_enter_evidence(self):
        event = {'event': 'info', 'topic': 'license', 'daysLeft': 32,
                 'account': {'email': 'fixture-secret'}, 'licenseKey': 'fixture-key',
                 'message': 'may include private account detail in a newer version'}
        safe = json.dumps(b.sxt_event_for_log(event))
        self.assertNotIn('fixture-secret', safe)
        self.assertNotIn('fixture-key', safe)
        self.assertNotIn('message', safe)
        self.assertIn('daysLeft', safe)

    def test_native_batch_actual_directory_names_and_missing_starless(self):
        # First real multi-file run completed all outputs but the adapter
        # guessed '-starless'. These are the vendor's observed 2.6.9 names.
        output = self.destination / 'native-output'
        result = output / 'ngc5128-sxt.png'
        stars = output / 'ngc5128-sxt-stars.png'
        self.assertEqual(b.native_sxt_outputs([result, stars], 'ngc5128', output), (result, stars))
        with self.assertRaisesRegex(RuntimeError, 'output_name_or_location'):
            b.native_sxt_outputs([stars, output / 'different-sxt.png'], 'ngc5128', output)

    def test_native_batch_missing_vendor_icc_preserves_input_color_and_pixels(self):
        # Escaped real defect: three r2 finals had correct RGB but no ICC.
        case = self.destination / 'native-color'
        case.mkdir()
        profile = b.ImageCms.ImageCmsProfile(b.ImageCms.createProfile('sRGB')).tobytes()
        original = case / 'bound-input.png'
        vendor = case / 'vendor-without-icc.png'
        final = case / 'final.png'
        pixels = b.np.arange(6 * 4 * 3, dtype='uint8').reshape(4, 6, 3)
        b.Image.fromarray(pixels).save(original, icc_profile=profile)
        b.Image.fromarray(pixels).save(vendor)
        expected = b.np.array(b.Image.open(vendor).resize((3, 2), b.Image.Resampling.LANCZOS))
        result, color = b.write_sxt_native_final(vendor, original, final, (3, 2), 2)
        with b.Image.open(final) as saved:
            self.assertEqual(saved.info.get('icc_profile'), profile)
            self.assertTrue(b.np.array_equal(b.np.array(saved), expected))
        self.assertTrue(b.np.array_equal(result, expected))
        self.assertEqual(color['iccSha256'], b.digest(profile))
        with self.assertRaises(FileExistsError):
            b.write_sxt_native_final(vendor, original, final, (3, 2), 2)
        with self.assertRaisesRegex(RuntimeError, 'input_color_or_geometry_missing'):
            b.write_sxt_native_final(vendor, vendor, case / 'invalid.png', (3, 2), 2)

    def test_native_batch_current_policy_or_normalization_change_rejected_before_staging(self):
        # A bound old run must not bypass a later cluster/allowlist/width change.
        sample = self.sample_for('native-admission')
        sample['methods'].append('sxt-upsample')
        receipt_path = self.destination / 'native-admission-receipt.json'
        receipt_path.write_text(json.dumps({'key': {'method':'sxt-upsample','sample':sample}}))
        run_path = self.destination / 'native-admission-run.json'
        run_path.write_text(json.dumps({'rows':[{'sample':sample['id'],'method':'sxt-upsample',
            'status':'COMPLETED_NOT_QUALITY_ACCEPTANCE','receipt':str(receipt_path.relative_to(b.ROOT))}]}))
        for changes, error in [({'kind':'cluster'}, 'cluster_star_removal_forbidden'),
                               ({'methods':[]}, 'sample_method_not_admitted'),
                               ({'width':512}, 'sample_contract_changed')]:
            current = {**copy.deepcopy(sample), **changes}
            with self.subTest(changes=changes), patch.object(b, 'sxt_identity', return_value=[]), \
                 patch.object(b.os, 'link') as stage, patch.object(b, 'run_external') as infer:
                with self.assertRaisesRegex(ValueError, error):
                    b.native_sxt_batch(run_path, self.destination, 'forbidden-native', {},
                                       'sxt-upsample', [current])
                stage.assert_not_called()
                infer.assert_not_called()
                self.assertFalse((self.destination / 'forbidden-native-files').exists())


if __name__ == '__main__':
    unittest.main(verbosity=2)
