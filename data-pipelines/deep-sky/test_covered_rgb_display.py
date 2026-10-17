"""Model padding/true-alpha/consumer review boundaries, without real inference."""
import copy
import json
from pathlib import Path
import unittest
import uuid
from unittest.mock import patch
import numpy as np
from PIL import Image,ImageCms
from covered_rgb_display import VERSION,model_canvas,validate_covered_input,validate_covered_output
from optical_publication_io import bound_file
from image_quality import processing_review
from sxt_processing import run_sxt_batch
from reviewed_sxt_display import reviewed_sxt_row
import test_sxt_processing as fixture_module

ROOT=Path(__file__).resolve().parents[2]


class CoveredDisplayBoundaries(unittest.TestCase):
    def setUp(self):
        self.directory=ROOT/'output/covered-rgb-tests'/uuid.uuid4().hex
        self.directory.mkdir(parents=True)
        self.profile=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
        rgba=np.full((18,24,4),255,dtype='uint8')
        rgba[:,:,:3]=np.arange(18*24*3,dtype='uint8').reshape(18,24,3)
        rgba[-4:,:,3]=0
        rgba[2,3,:3]=0  # Valid black stays supported.
        source=self.directory/'original.png'
        Image.fromarray(rgba).save(source,icc_profile=self.profile)
        supply=self.directory/'supplied.png'
        mask=np.full((18,24),255,dtype='uint8');mask[-1,:]=0
        Image.fromarray(mask).save(supply)
        self.coverage={'schemaVersion':VERSION,'originalRgba':bound_file(source,root=ROOT),'suppliedMask':bound_file(supply,root=ROOT)}
        work=self.directory/'model.png'
        work.write_bytes(model_canvas(self.coverage,[24,18],ROOT))
        self.job={'id':'covered-region','kind':'region','input':bound_file(work,root=ROOT),'outputSize':[24,18],
            'dependencies':[self.coverage['originalRgba'],self.coverage['suppliedMask']],
            'sourceContext':{'input':self.coverage['originalRgba'],'scope':'fixture-display-only'},'coverage':self.coverage}
        self.fixture=fixture_module.SxtBatchBoundaries()
        self.fixture.setUp()

    def process(self,name,job=None):
        with patch('sxt_processing.sxt_identity',return_value=self.fixture.identity),patch('sxt_processing.run_external',side_effect=self.fixture.fake_vendor):
            return run_sxt_batch([job or self.job],self.directory/name,self.fixture.tools,'sxt',root=ROOT)

    def test_true_alpha_restored_and_review_excludes_model_padding(self):
        result=self.process('run')
        self.assertEqual(result['rows'][0]['status'],'PROCESSED_PENDING_REVIEW')
        row=result['rows'][0]
        covered=np.asarray(Image.open(ROOT/row['outputs']['coveredStarless']['path']))
        original=np.asarray(Image.open(ROOT/self.coverage['originalRgba']['path']))
        rgb=np.asarray(Image.open(ROOT/row['outputs']['starless']['path']))
        np.testing.assert_array_equal(covered[:,:,3],original[:,:,3])
        np.testing.assert_array_equal(covered[:14,:,:3],rgb[:14])
        self.assertTrue(np.all(covered[14:,:,:3]==0))
        self.assertEqual(covered[2,3,3],255)
        validate_covered_output(self.job,row['outputs'],ROOT)
        review=processing_review(self.directory/'run/result.json',self.directory/'review',root=ROOT)
        self.assertEqual(review['rows'][0]['status'],'PENDING_REVIEW')
        self.assertEqual(review['rows'][0]['displayDiagnostics']['regions'][0]['original']['supportedPixels'],336)
        self.assertEqual(review['rows'][0]['coverageProof']['missingTileSamples'],24)
        decision=self.directory/'decisions.json'
        reviewed=review['rows'][0]
        decision.write_text(json.dumps({'processingReceipt':bound_file(self.directory/'run/result.json',root=ROOT),
            'decisions':[{'id':self.job['id'],'processingKeySha256':reviewed['processingKeySha256'],
                'outputs':reviewed['outputs'],'status':'FILE_REVIEW_PASSED_SCENE_PENDING','reason':'fixture-only manual decision'}]}),encoding='utf8')
        processing_review(self.directory/'run/result.json',self.directory/'approved-review',root=ROOT,decisions_path=decision)
        spec={'id':self.job['id'],'processingReceipt':bound_file(self.directory/'run/result.json',root=ROOT),
            'reviewReceipt':bound_file(self.directory/'approved-review/review.json',root=ROOT)}
        with self.assertRaisesRegex(ValueError,'whole_rectangle_does_not_admit'):
            reviewed_sxt_row(spec,self.coverage['originalRgba'],root=ROOT)
        with patch('sxt_processing.sxt_identity',return_value=self.fixture.identity),patch('sxt_processing.run_external') as vendor:
            reused=run_sxt_batch([self.job],self.directory/'reused',self.fixture.tools,'sxt',root=ROOT,
                reuse_from=self.directory/'run/result.json')
        vendor.assert_not_called()
        self.assertEqual(reused['nativeInferenceCalls'],0)
        self.assertTrue(reused['rows'][0]['cacheHit'])

    def test_padding_source_changes_rejected_before_vendor_and_alpha_mutation_rejected_by_review(self):
        work=ROOT/self.job['input']['path'];original=work.read_bytes()
        image=Image.open(work);pixels=np.asarray(image).copy();pixels[-1,0]=[3,4,5]
        Image.fromarray(pixels).save(work,icc_profile=self.profile)
        modified=copy.deepcopy(self.job);modified['input']=bound_file(work,root=ROOT)
        with self.assertRaisesRegex(ValueError,'padding'):
            validate_covered_input(modified,1,ROOT)
        rejected=self.process('rejected',modified)
        self.assertEqual(rejected['nativeInferenceCalls'],0)
        self.assertEqual(rejected['rows'][0]['status'],'FAILED')
        work.write_bytes(original)
        result=self.process('valid')
        forged=copy.deepcopy(result);forged['rows'][0]['coverageProof']['opaqueSamples']+=1
        (self.directory/'false-proof.json').write_text(json.dumps(forged),encoding='utf8')
        review=processing_review(self.directory/'false-proof.json',self.directory/'false-proof-review',root=ROOT)
        self.assertEqual(review['rows'][0]['status'],'HARD_CHECK_FAILED')
        self.assertIn('coverage_proof',review['rows'][0]['error'])
        row=result['rows'][0];target=ROOT/row['outputs']['coveredStarless']['path']
        pixels=np.asarray(Image.open(target)).copy();pixels[-1,0,3]=255
        Image.fromarray(pixels).save(target,icc_profile=self.profile)
        row['outputs']['coveredStarless']=bound_file(target,root=ROOT)
        (self.directory/'mutated.json').write_text(json.dumps(result),encoding='utf8')
        review=processing_review(self.directory/'mutated.json',self.directory/'invalid-review',root=ROOT)
        self.assertEqual(review['rows'][0]['status'],'HARD_CHECK_FAILED')
        self.assertIn('native_alpha',review['rows'][0]['error'])

    def test_missing_supply_opaque_and_fractional_alpha_not_silently_flattened(self):
        path=ROOT/self.coverage['originalRgba']['path']
        rgba=np.asarray(Image.open(path)).copy();rgba[-1,0,3]=255
        Image.fromarray(rgba).save(path,icc_profile=self.profile)
        changed=copy.deepcopy(self.coverage);changed['originalRgba']=bound_file(path,root=ROOT)
        with self.assertRaisesRegex(ValueError,'missing_supply'):
            model_canvas(changed,[24,18],ROOT)
        rgba[-1,0,3]=0;rgba[0,0,3]=128
        Image.fromarray(rgba).save(path,icc_profile=self.profile)
        changed['originalRgba']=bound_file(path,root=ROOT)
        with self.assertRaisesRegex(ValueError,'binary_source_alpha'):
            model_canvas(changed,[24,18],ROOT)
        with self.assertRaisesRegex(ValueError,'upsampled'):
            validate_covered_input(self.job,2,ROOT)


if __name__=='__main__':
    unittest.main()
