"""Synthetic pixels/receipts test review boundaries; never runs NXT or SXT."""
import copy,json
from pathlib import Path
import unittest
from unittest.mock import patch
import numpy as np
from PIL import Image
from optical_publication_io import bound_file
from sxt_processing import run_sxt_batch
from covered_rgb_display import write_covered_output
from image_quality import processing_review
from reviewed_sxt_display import reviewed_processing_row
from nxt_review import review_processing
from test_covered_rgb_display import CoveredDisplayBoundaries

ROOT=Path(__file__).resolve().parents[2]


class NxtReviewBoundaries(unittest.TestCase):
    def setUp(self):
        self.fixture=CoveredDisplayBoundaries();self.fixture.setUp()
        self.directory=self.fixture.directory/'nxt';self.directory.mkdir()
        first=copy.deepcopy(self.fixture.job);second=copy.deepcopy(first);second['id']='second-region'
        with patch('sxt_processing.sxt_identity',return_value=self.fixture.fixture.identity),\
             patch('sxt_processing.run_external',side_effect=self.fixture.fixture.fake_vendor):
            upstream=run_sxt_batch([first,second],self.fixture.directory/'sxt',self.fixture.fixture.tools,'sxt',root=ROOT)
        upstream_pin=bound_file(self.fixture.directory/'sxt/result.json',root=ROOT)
        inputs=self.directory/'inputs';outputs=self.directory/'outputs';inputs.mkdir();outputs.mkdir()
        recipe={'denoise':0.9,'iterations':1,'mlVersion':3.1,'overlap':0.2,'depth':'8U','device':'gpu'}
        runtime=[]
        for name in ['rc-astro.exe','NoiseXTerminator.3.1.onnx']:
            file=self.directory/name;file.write_bytes(b'fixture only, never an executable or model')
            runtime.append({**bound_file(file,root=ROOT),'path':str(file)})
        colour_admission=self.directory/'colour-admission.json';colour_admission.write_text(json.dumps({'runtime':runtime}))
        colour=self.directory/'colour.json';colour.write_text(json.dumps({'status':'PASS_BOUNDED_SRGB_METADATA_NUMERIC_PAIR',
            'iccLabelPairChannelDifferences':0,'admission':bound_file(colour_admission,root=ROOT)}))
        config={'purpose':'DIAGNOSTIC_GRAIN_EXCEPTION_NOT_PUBLISHER','recipe':recipe,
            'jobs':[{'id':r['id'],'receipt':upstream_pin}for r in upstream['rows']]}
        config_path=self.directory/'config.json';config_path.write_text(json.dumps(config))
        snapshot=self.directory/'execution-sources';snapshot.mkdir();sources=[]
        for name in ['sxt_processing.py','covered_rgb_display.py','optical_publication_io.py']:
            source=ROOT/'data-pipelines/deep-sky'/name;(snapshot/name).write_bytes(source.read_bytes())
            sources.append(bound_file(source,root=ROOT))
        trials=[];input_bindings=[]
        for row in upstream['rows']:
            with Image.open(ROOT/row['outputs']['coveredStarless']['path'])as image:
                image.load();before=np.asarray(image).copy();profile=image.info['icc_profile']
            model_input=inputs/(row['id']+'.png');Image.fromarray(before[:,:,:3]).save(model_input,icc_profile=profile)
            input_bindings.append(bound_file(model_input,root=ROOT))
            after=(before[:,:,:3].astype('uint16')//2).astype('uint8')
            vendor=outputs/(row['id']+'-nxt.png');final=outputs/(row['id']+'-final.png');covered=outputs/(row['id']+'-covered.png')
            Image.fromarray(after).save(vendor);Image.fromarray(after).save(final,icc_profile=profile)
            proof=write_covered_output(row['key']['job'],bound_file(final,root=ROOT),covered,ROOT)
            trials.append({'id':row['id'],'recipe':recipe,'upstreamReceipt':upstream_pin,'upstreamSxt':row['outputs'],
                'coverage':row['key']['job']['coverage'],'vendor':bound_file(vendor,root=ROOT),
                'outputs':{'starless':bound_file(final,root=ROOT),'coveredStarless':bound_file(covered,root=ROOT)},'coverageProof':proof})
        command=[runtime[0]['path'],'--json','nxt',*[str(ROOT/b['path'])for b in input_bindings],'--output',str(outputs),
            '--device','gpu','--ml-version','3.1','--denoise','0.9','--iterations','1','--depth','8U','--overlap','0.2']
        admission={'config':bound_file(config_path,root=ROOT),'colorBoundary':bound_file(colour,root=ROOT),
            'runtime':runtime,'executionSources':sources,'command':command,'inputs':input_bindings}
        self.admission=self.directory/'admission.json';self.admission.write_text(json.dumps(admission))
        self.result={'status':'NATIVE_NXT_GRAIN_TRIAL_PIXELS_VERIFIED_VISUAL_PENDING','ordinaryAdoption':False,
            'publicationCalls':0,'sxtCalls':0,'psCalls':0,'nativeNxtBatchCalls':1,'processedFiles':2,
            'admission':bound_file(self.admission,root=ROOT),'rows':trials}

    def review(self,name):
        receipt=self.directory/(name+'.json');receipt.write_text(json.dumps(self.result))
        return receipt,processing_review(receipt,self.directory/(name+'-review'),root=ROOT)

    def test_shared_queue_retains_separate_chain_and_old_publisher_rejects_even_file_pass(self):
        receipt,review=self.review('first')
        self.assertEqual(review['schema'],'nxt-review-queue-v1')
        self.assertEqual([r['status']for r in review['rows']],['PENDING_REVIEW']*2)
        for row in review['rows']:
            self.assertEqual(row['denoisingProof']['alphaChannelDifferences'],0)
            self.assertEqual(row['publicationContract'],'MISSING_DISTINCT_NXT_CHAIN')
        decisions={'processingReceipt':bound_file(receipt,root=ROOT),'decisions':[
            {'id':r['id'],'processingKeySha256':r['processingKeySha256'],'outputs':r['outputs'],
             'status':'FILE_REVIEW_PASSED_SCENE_PENDING','reason':'fixture-only file decision; not publication'}for r in review['rows']]}
        decision=self.directory/'decisions.json';decision.write_text(json.dumps(decisions))
        passed=self.directory/'passed';processing_review(receipt,passed,root=ROOT,decisions_path=decision)
        spec={'id':review['rows'][0]['id'],'processingReceipt':bound_file(receipt,root=ROOT),'reviewReceipt':bound_file(passed/'review.json',root=ROOT)}
        with self.assertRaisesRegex(ValueError,'review_receipt_invalid'):
            reviewed_processing_row(spec,'FILE_REVIEW_PASSED_SCENE_PENDING',root=ROOT)

    def test_fresh_hash_one_pixel_change_cannot_replace_native_vendor_and_other_row_survives(self):
        row=self.result['rows'][0];final=ROOT/row['outputs']['starless']['path']
        with Image.open(final)as image:
            image.load();pixels=np.asarray(image).copy();profile=image.info['icc_profile']
        pixels[0,0,0]^=1;Image.fromarray(pixels).save(final,icc_profile=profile)
        row['outputs']['starless']=bound_file(final,root=ROOT)
        covered=ROOT/row['outputs']['coveredStarless']['path']
        with Image.open(covered)as image:
            image.load();rgba=np.asarray(image).copy()
        rgba[0,0,:3]=pixels[0,0];Image.fromarray(rgba).save(covered,icc_profile=profile)
        row['outputs']['coveredStarless']=bound_file(covered,root=ROOT)
        _,review=self.review('changed-final')
        self.assertEqual([r['status']for r in review['rows']],['HARD_CHECK_FAILED','PENDING_REVIEW'])
        self.assertIn('vendor_pixels_or_icc',review['rows'][0]['error'])
        # Bounded mutation of the real importer: all geometry/ICC/alpha and
        # fresh hashes still agree, so this must depend on raw vendor pixels.
        source=ROOT/'data-pipelines/deep-sky/nxt_review.py';text=source.read_text()
        guard='after.tobytes()!=vendor.tobytes()';self.assertEqual(text.count(guard),1)
        namespace={'__file__':str(source),'__name__':'fixture_nxt_pixel_guard_mutation'}
        exec(compile(text.replace(guard,'after.tobytes()!=after.tobytes()'),str(source),'exec'),namespace)
        receipt=bound_file(self.directory/'changed-final.json',root=ROOT)
        mutated=namespace['review_processing'](self.result,receipt,root=ROOT)
        self.assertEqual([r['status']for r in mutated['rows']],['PROCESSED_PENDING_REVIEW']*2)

    def test_alpha_change_with_new_hash_cannot_invent_coverage(self):
        row=self.result['rows'][0];file=ROOT/row['outputs']['coveredStarless']['path']
        with Image.open(file)as image:
            image.load();pixels=np.asarray(image).copy();profile=image.info['icc_profile']
        pixels[-1,0,3]=255;Image.fromarray(pixels).save(file,icc_profile=profile)
        row['outputs']['coveredStarless']=bound_file(file,root=ROOT)
        _,review=self.review('changed-alpha')
        self.assertEqual([r['status']for r in review['rows']],['HARD_CHECK_FAILED','PENDING_REVIEW'])
        self.assertIn('native_alpha',review['rows'][0]['error'])

    def test_original_rgb_cannot_be_substituted_for_post_sxt_model_input(self):
        admission=json.loads(self.admission.read_text());staged=ROOT/admission['inputs'][0]['path']
        job=self.fixture.job
        staged.write_bytes((ROOT/job['input']['path']).read_bytes())
        admission['inputs'][0]=bound_file(staged,root=ROOT);self.admission.write_text(json.dumps(admission))
        self.result['admission']=bound_file(self.admission,root=ROOT)
        _,review=self.review('wrong-stage-input')
        self.assertEqual([r['status']for r in review['rows']],['HARD_CHECK_FAILED','PENDING_REVIEW'])
        self.assertIn('staged_rgb_or_icc',review['rows'][0]['error'])

    def test_processing_count_cannot_hide_a_second_input(self):
        self.result['processedFiles']=1
        with self.assertRaisesRegex(ValueError,'invocation_census'):
            self.review('wrong-census')

    def test_conflicting_vendor_colour_tag_is_not_relabelled_as_input_srgb(self):
        row=self.result['rows'][0];file=ROOT/row['vendor']['path']
        with Image.open(file)as image:
            image.load();pixels=np.asarray(image).copy()
        Image.fromarray(pixels).save(file,icc_profile=b'fixture unknown colour conversion')
        row['vendor']=bound_file(file,root=ROOT)
        _,review=self.review('conflicting-colour')
        self.assertEqual([r['status']for r in review['rows']],['HARD_CHECK_FAILED','PENDING_REVIEW'])
        self.assertIn('vendor_pixels_or_icc',review['rows'][0]['error'])

    def test_current_validator_identity_is_separate_from_native_processing_key(self):
        receipt,_=self.review('identity');binding=bound_file(receipt,root=ROOT)
        before=review_processing(self.result,binding,root=ROOT)
        original=bound_file
        def changed_validator(file,**kwargs):
            pin=original(file,**kwargs)
            return {**pin,'sha256':'0'*64}if Path(file).name=='nxt_review.py'else pin
        with patch('nxt_review.bound_file',side_effect=changed_validator):
            after=review_processing(self.result,binding,root=ROOT)
        self.assertNotEqual(before['importValidator'],after['importValidator'])
        self.assertEqual([r['key']for r in before['rows']],[r['key']for r in after['rows']])
        self.assertTrue(all(r['status']=='PROCESSED_PENDING_REVIEW'for r in after['rows']))


if __name__=='__main__':unittest.main()
