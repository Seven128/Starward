"""Real CLI rejection checks for the bounded protection replay; no inference."""
from __future__ import annotations
import copy
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[4]
HELPER = Path(__file__).with_name('benchmark-image-protection.py')
OUTPUT = ROOT / 'output/image-tool-full-comparison-2026-10-08'
MANIFEST = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22/scripts/image-tool-full-comparison-samples.json'
INPUT_RUN = OUTPUT / 'sxt-upsample-validation-r1.json'


def save(path, value):
    with path.open('x', encoding='utf8') as file:
        json.dump(value, file, ensure_ascii=False, indent=2)


class RejectionChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.evidence = OUTPUT / ('protection-admission-' + uuid.uuid4().hex[:12])
        cls.evidence.mkdir(exist_ok=False)
        cls.config = json.loads(MANIFEST.read_text(encoding='utf8'))
        cls.measured_run = json.loads(INPUT_RUN.read_text(encoding='utf8'))
        print('admission evidence: ' + str(cls.evidence.relative_to(ROOT)), flush=True)

    def invoke(self, name, expected, *, config=None, run=INPUT_RUN, sample='ngc5128', existing_run=None):
        manifest = MANIFEST
        if config is not None:
            manifest = self.evidence / (name + '-manifest.json')
            save(manifest, config)
        run_name = existing_run or (self.evidence.name + '-' + name)
        output = OUTPUT / run_name
        command = [sys.executable, str(HELPER), '--manifest', str(manifest), '--from', str(run),
                   '--samples', sample, '--methods', 'sxt-upsample', '--run', run_name]
        result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=30)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(expected, result.stderr)
        if existing_run is None:
            self.assertFalse(output.exists(), 'rejected input must not create or stage an output run')
        save(self.evidence / (name + '-result.json'), {'command': command, 'exitCode': result.returncode,
             'stdout': result.stdout, 'stderr': result.stderr, 'expectedRejection': expected,
             'outputCreated': output.exists(), 'existingRun': existing_run,
             'helperSha256': hashlib.sha256(HELPER.read_bytes()).hexdigest()})

    def test_cluster_members_not_removed_even_when_method_list_allows(self):
        config = copy.deepcopy(self.config)
        next(s for s in config['samples'] if s['id'] == 'ngc5128')['kind'] = 'cluster'
        self.invoke('cluster', 'cluster_star_removal_forbidden', config=config)

    def test_diffuse_nebula_has_no_invented_mask(self):
        self.invoke('nebula', 'no_qualified_protection_mask', sample='m8-tile-28892')

    def test_revoked_method_not_replayed(self):
        config = copy.deepcopy(self.config)
        next(s for s in config['samples'] if s['id'] == 'ngc5128')['methods'].remove('sxt-upsample')
        self.invoke('revoked', 'sample_method_not_admitted', config=config)

    def test_changed_protection_recipe_not_silently_reused(self):
        config = copy.deepcopy(self.config)
        next(s for s in config['samples'] if s['id'] == 'ngc5128')['protectEllipses'][0][0] += .01
        self.invoke('recipe', 'replay_sample_contract_changed', config=config)

    def changed_receipt_run(self, name, mutate, copy_pixels=False):
        row = copy.deepcopy(next(r for r in self.measured_run['rows'] if r['sample'] == 'ngc5128'))
        original_receipt = ROOT / row['receipt']
        receipt = json.loads(original_receipt.read_text(encoding='utf8'))
        directory = self.evidence / name
        directory.mkdir(exist_ok=False)
        if copy_pixels:
            outputs = []
            for filename in ('original.png', 'processed.png'):
                original = next(p for p in receipt['outputs'] if Path(p['path']).name == filename)
                target = directory / filename
                shutil.copyfile(ROOT / original['path'], target)
                outputs.append({**original, 'path': target.relative_to(ROOT).as_posix()})
            receipt['outputs'] = outputs
        mutate(receipt)
        save(directory / 'receipt.json', receipt)
        row['receipt'] = (directory / 'receipt.json').relative_to(ROOT).as_posix()
        path = self.evidence / (name + '-input-run.json')
        save(path, {'rows': [row]})
        return path

    def test_changed_metadata_binding_not_replayed(self):
        run = self.changed_receipt_run('metadata', lambda r: r['key']['metadata'].update(sha256='0' * 64))
        self.invoke('metadata', 'replay_metadata_changed', run=run)

    def test_corrupted_processed_pixels_rejected_before_staging(self):
        def corrupt(receipt):
            target = self.evidence / 'pixels' / 'processed.png'
            with target.open('ab') as file:
                file.write(b'changed-after-measurement')
        run = self.changed_receipt_run('pixels', corrupt, copy_pixels=True)
        self.invoke('pixels', 'prepared_optical_input_identity_invalid', run=run)

    def test_existing_result_never_overwritten(self):
        path = OUTPUT / 'protection-replay-r1/result.json'
        before = hashlib.sha256(path.read_bytes()).hexdigest()
        self.invoke('existing', 'replay_run_already_exists', existing_run='protection-replay-r1')
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), before)


if __name__ == '__main__':
    unittest.main(verbosity=2)
