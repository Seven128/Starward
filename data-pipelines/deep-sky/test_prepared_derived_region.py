"""Batch preflight/isolation only; mocked publication makes no image claims."""
import copy,json,unittest,uuid
from pathlib import Path
from unittest.mock import patch
from optical_publication_io import bound_file
from publish_prepared_derived_region import publish_derived_region_batch
ROOT=Path(__file__).resolve().parents[2]
class DerivedRegionBatchBoundaries(unittest.TestCase):
    def setUp(self):
        self.directory=ROOT/'output/derived-region-batch-tests'/uuid.uuid4().hex
        self.directory.mkdir(parents=True)
        self.recipes=[dict(schemaVersion='prepared-derived-region-recipe-v1',reference='REGION:'+name,
            publicationId=name,label='Fixture',preparedReference='M:8',processingId='fixture',maxWorkingPixels=100)
            for name in ('first','second')]
    def run_batch(self,manifest,name):
        path=self.directory/(name+'.json');path.write_text(json.dumps(manifest),encoding='utf8')
        return publish_derived_region_batch(path,bound_file(path,root=ROOT)['sha256'],self.directory/name,root=ROOT)
    def test_malformed_identity_duplicate_and_budget_fail_before_output_or_writer(self):
        base=dict(schemaVersion='prepared-derived-region-batch-v1',maxBatchWorkingPixels=200,recipes=self.recipes)
        cases=[]
        for mutate in (lambda r:r.pop('reference'),lambda r:r.update(reference=42),lambda r:r.update(publicationId='../outside'),
                       lambda r:r.update(maxWorkingPixels=True),lambda r:r.update(label=[])):
            manifest=copy.deepcopy(base);mutate(manifest['recipes'][0]);cases.append(manifest)
        cases.extend([dict(base,recipes=[None]),dict(base,recipes={}),dict(base,maxBatchWorkingPixels=199),dict(base,recipes=[self.recipes[0]]*2)])
        for index,manifest in enumerate(cases):
            with patch('publish_prepared_derived_region.publish_derived_region_recipe')as writer:
                with self.assertRaisesRegex(ValueError,'batch_identity_budget_or_output_invalid'):
                    self.run_batch(manifest,'invalid-'+str(index))
                writer.assert_not_called();self.assertFalse((self.directory/('invalid-'+str(index))).exists())
    def test_one_failed_row_preserves_other_and_never_infers_or_rewrites(self):
        manifest=dict(schemaVersion='prepared-derived-region-batch-v1',maxBatchWorkingPixels=200,recipes=self.recipes)
        success=dict(publicationHash='1'*64,coarseEncodes=2,fileReview='NEEDS_REPAIR')
        with patch('publish_prepared_derived_region.publish_derived_region_recipe',side_effect=[ValueError('fixture-input-changed'),success])as writer:
            result=self.run_batch(manifest,'isolated')
        self.assertEqual(writer.call_count,2);self.assertEqual(result['failed'],1)
        self.assertEqual([r['status']for r in result['rows']],['FAILED','LOCAL_REVIEW_CANDIDATE_PACKAGED'])
        self.assertEqual(result['rows'][1]['result']['fileReview'],'NEEDS_REPAIR')
        self.assertEqual(result['nativeInferenceCalls'],0);self.assertEqual(result['sourceRasterCalls'],0)
        self.assertFalse(result['ordinaryAdoption'])
if __name__=='__main__':unittest.main()
