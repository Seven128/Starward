"""Packaging pin, exclusive-output, cancellation and durable failure boundaries.

Controlled transport tests; full scientific/estimate arrays and real TS writer
are separately executed from the pinned actual saved generation.
"""
from pathlib import Path
from types import SimpleNamespace
import copy,json,tempfile,unittest
from unittest.mock import patch
import publish_sdss_display as owner

class DisplayPackagingTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='starward-display-packaging-')
        self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
        self.input=self.root/'input';self.input.mkdir();self.legacy=self.root/'legacy';self.legacy.mkdir()
        self.manifest=self.legacy/'manifest.json';self.manifest.write_text(json.dumps({'objectRef':'M:51','source':{}}))
        old=self.input/'input.txt';old.write_bytes(b'original scientific input, protected')
        self.input_identity=owner.bound_file(old,root=self.root)
        self.verified=SimpleNamespace(directory=self.input,bindings=(self.input_identity,),receipt={'objectRef':'M:51'},
            receipt_bytes=b'{}',scientific_receipt_bytes=b'{}',identities={
                'scientificCandidateReceipt':self.input_identity,'previousCandidateReceipt':self.input_identity,
                'executionReceipt':self.input_identity,'dependencyPlanReceipt':self.input_identity,'sourceInputsReceipt':self.input_identity})
        self.output=self.root/'new-generation'

    def pack(self,**kwargs):return owner.publish_verified_display(self.verified,self.output,root=self.root,
        publication_id='controlled-unadopted-transport',legacy_manifest=self.manifest,**kwargs)

    def fake_bound(self,p,*,root,expected=None,**kwargs):
        if Path(p).is_file():return owner_original_bound(p,root=root,expected=expected)
        return {'path':Path(p).relative_to(root).as_posix(),'bytes':1,'sha256':'1'*64}

    def test_wrong_execution_pin_and_cancel_are_rejected_before_science_or_partial_output(self):
        p=self.input/'result.json';p.write_text(json.dumps({'inputsAfterExact':True,'previousScientificAndCandidateAndProtectedInputsExact':True,
            'wholeVarianceFitsScienceCoaddFilterRuns':0,'oldApertureMatricesOrPSFFitsOrDetectorsReplayed':False,
            'newAstronomicalSourceRequests':0,'ordinaryAdoption':False,'inputsBefore':[self.input_identity]}))
        with patch.object(owner,'source_noise_increment_products',side_effect=AssertionError('unadmitted estimates consumed')):
            with self.assertRaisesRegex(RuntimeError,'execution_not_verified'):
                owner.verify_cached_display_generation(self.input,root=self.root,result_sha256='1'*64)
            with self.assertRaisesRegex(RuntimeError,'cancelled'):
                owner.verify_cached_display_generation(self.input,root=self.root,result_sha256='1'*64,cancelled=lambda:True)
        self.assertFalse(self.output.exists())

    def test_existing_generation_and_every_retained_input_directory_stay_untouched(self):
        self.output.mkdir();(self.output/'sentinel').write_bytes(b'preserved generation')
        with self.assertRaises(FileExistsError):self.pack()
        self.assertEqual((self.output/'sentinel').read_bytes(),b'preserved generation')
        self.output=self.input/'inside-preserved'
        with self.assertRaisesRegex(RuntimeError,'overlaps_preserved_input'):self.pack()
        self.assertFalse(self.output.exists());self.assertEqual((self.input/'input.txt').read_bytes(),b'original scientific input, protected')

    def test_late_cancel_and_source_change_keep_failure_without_manifest(self):
        for cause in ('cancel','source'):
            with self.subTest(cause=cause):
                self.output=self.root/('failed-'+cause);stopped=[]
                def consume(*args,**kwargs):
                    if cause=='cancel':stopped.append(True)
                    else:(self.input/'input.txt').write_bytes(b'changed')
                    return {'levels':{},'publicationHash':'2'*64}
                def run(*args,**kwargs):return SimpleNamespace(returncode=0,stdout=b'{"levels":{},"publicationHash":"2"}',stderr=b'')
                with patch.object(owner,'bound_file',side_effect=self.fake_bound),patch.object(owner,'display_publication_payload',side_effect=consume),patch.object(owner.subprocess,'run',side_effect=run):
                    with self.assertRaises(RuntimeError):self.pack(cancelled=lambda:bool(stopped))
                self.assertTrue((self.output/'failed.json').is_file());self.assertFalse((self.output/'manifest.json').exists())
                (self.input/'input.txt').write_bytes(b'original scientific input, protected')

    def test_verified_memory_cannot_forge_frozen_report_even_when_encoded_rgb_would_be_unchanged(self):
        sealed={'version':'actual pinned display report'}
        candidate=SimpleNamespace(report=copy.deepcopy(sealed));master=SimpleNamespace(report={'originalScience':True})
        verified=SimpleNamespace(receipt=sealed,scientific_receipt={'originalScience':True},candidate=candidate,master=master)
        candidate.report['version']='forged after validation'
        with patch.object(owner,'source_noise_increment_products',side_effect=AssertionError('mutable evidence used')):
            with self.assertRaisesRegex(RuntimeError,'verified_generation_mutated'):
                owner.display_publication_payload(verified,self.output,publication_id='x',legacy_source={})

owner_original_bound=owner.bound_file
if __name__=='__main__':unittest.main()
