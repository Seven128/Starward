"""Actual CLI rejection and reuse boundaries; never invokes SXT inference."""
from __future__ import annotations
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[4]
SCRIPT = Path(__file__).with_name('benchmark-image-photoshop.py')
MANIFEST = SCRIPT.with_name('image-tool-full-comparison-samples.json')
OUTPUT = ROOT / 'output/image-tool-full-comparison-2026-10-08'
ORIGINALS = [OUTPUT / 'representative-review-r1.json', OUTPUT / 'validation-batch-r1.json']
REUSE = OUTPUT / 'ps-roundtrip-final-r1/result.json'

def save(path, value):
    with path.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)

class PhotoshopBoundaries(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.evidence = OUTPUT / ('ps-admission-' + uuid.uuid4().hex[:12])
        cls.evidence.mkdir(exist_ok=False)
        cls.manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
        print('evidence: ' + cls.evidence.relative_to(ROOT).as_posix(), flush=True)

    def invoke(self, name, expected, *, manifest=None, runs=None, ids=('ngc253',),
               operation='roundtrip', reuse=None, existing=None):
        source = MANIFEST
        if manifest is not None:
            source = self.evidence / (name + '-manifest.json'); save(source, manifest)
        run_name = existing or self.evidence.name + '-' + name
        command = [sys.executable, str(SCRIPT), '--manifest', str(source), '--from',
                   *map(str, runs or ORIGINALS), '--samples', *ids, '--operation', operation, '--run', run_name]
        if reuse: command += ['--reuse-from', str(reuse)]
        elif not existing: command += ['--preflight-only']
        completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=30)
        self.assertNotEqual(completed.returncode, 0)
        self.assertIn(expected, completed.stderr)
        created = (OUTPUT / run_name).exists()
        if not existing: self.assertFalse(created, 'rejected input created/staged an output')
        save(self.evidence / (name + '-result.json'), {'command': command, 'exitCode': completed.returncode,
            'expectedRejection': expected, 'stdout': completed.stdout, 'stderr': completed.stderr,
            'outputCreated': created, 'existingRun': existing,
            'adapterSha256': hashlib.sha256(SCRIPT.read_bytes()).hexdigest()})

    def changed_sample(self):
        config = copy.deepcopy(self.manifest)
        return config, next(s for s in config['samples'] if s['id'] == 'ngc253')

    def test_cluster_rejected_even_if_original_method_allowed(self):
        config, sample = self.changed_sample(); sample['kind'] = 'cluster'
        self.invoke('cluster', 'photoshop_target_requires_separate_cluster_recipe', manifest=config)

    def test_plugin_method_revocation_enforced_before_ps(self):
        config, sample = self.changed_sample(); sample['methods'].remove('sxt')
        self.invoke('revoked', 'sample_method_not_admitted', manifest=config, operation='ps-sxt')

    def test_changed_target_geometry_rejected(self):
        config, sample = self.changed_sample(); sample['protectEllipses'][0][0] += .01
        self.invoke('geometry', 'photoshop_original_policy_changed', manifest=config)

    def test_duplicate_sample_selection_rejected(self):
        self.invoke('duplicate', 'photoshop_invalid_sample_selection', ids=('ngc253','ngc253'))

    def test_failed_original_not_treated_as_ready(self):
        run = json.loads(ORIGINALS[0].read_text(encoding='utf-8'))
        next(r for r in run['rows'] if r['sample']=='ngc253' and r['method']=='original')['status']='FAILED'
        path=self.evidence / 'failed-input-run.json'; save(path,run)
        self.invoke('failed-original', 'photoshop_ambiguous_or_failed_original', runs=[path])

    def test_changed_metadata_identity_rejected(self):
        run=json.loads(ORIGINALS[0].read_text(encoding='utf-8'))
        row=next(r for r in run['rows'] if r['sample']=='ngc253' and r['method']=='original')
        receipt=json.loads((ROOT/row['receipt']).read_text(encoding='utf-8'))
        receipt['key']['metadata']['sha256']='0'*64
        receipt_path=self.evidence/'metadata-receipt.json';save(receipt_path,receipt)
        row['receipt']=receipt_path.relative_to(ROOT).as_posix()
        path=self.evidence/'metadata-input-run.json';save(path,run)
        self.invoke('metadata', 'photoshop_source_or_metadata_changed', runs=[path])

    def test_old_adapter_epoch_not_reused(self):
        run=json.loads(REUSE.read_text(encoding='utf-8')); row=run['rows'][0]
        receipt=json.loads((ROOT/row['receipt']).read_text(encoding='utf-8'))
        receipt['key']['adapter']['jsx']['sha256']='0'*64
        path=self.evidence/'stale-receipt.json';save(path,receipt)
        row['receipt']=path.relative_to(ROOT).as_posix()
        run_path=self.evidence/'stale-run.json';save(run_path,run)
        self.invoke('stale-reuse', 'photoshop_reuse_identity_changed', reuse=run_path)

    def test_corrupted_output_binding_not_reused(self):
        run=json.loads(REUSE.read_text(encoding='utf-8')); row=run['rows'][0]
        receipt=json.loads((ROOT/row['receipt']).read_text(encoding='utf-8'))
        # The actual historical receipt remains frozen and is rejected at its
        # old adapter epoch. This local fixture admits the CURRENT preflight
        # key to exercise the separate corrupt-output boundary without COM.
        spec=importlib.util.spec_from_file_location('current_ps_fixture',SCRIPT)
        adapter=importlib.util.module_from_spec(spec);spec.loader.exec_module(adapter)
        jobs,inputs,recipes,recipe=adapter.prepare(MANIFEST,ORIGINALS,('ngc253',),'roundtrip')
        receipt['key']=adapter.receipt_key(jobs[0],inputs,'roundtrip',recipe,'save-for-web-profile')
        receipt['outputs'][0]['sha256']='0'*64
        path=self.evidence/'output-receipt.json';save(path,receipt)
        row['receipt']=path.relative_to(ROOT).as_posix()
        run_path=self.evidence/'output-run.json';save(run_path,run)
        self.invoke('corrupt-output', 'prepared_optical_input_changed', reuse=run_path)

    def test_existing_run_not_overwritten(self):
        before=hashlib.sha256(REUSE.read_bytes()).hexdigest()
        self.invoke('existing', 'photoshop_run_already_exists', existing='ps-roundtrip-final-r1')
        self.assertEqual(hashlib.sha256(REUSE.read_bytes()).hexdigest(),before)

if __name__=='__main__':
    unittest.main(verbosity=2)
