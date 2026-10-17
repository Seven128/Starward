"""Restoration pixels and batch isolation; fixture dispatch is not Photoshop."""
import json
import copy
import hashlib
from pathlib import Path
import shutil
import subprocess
import unittest
import uuid
from unittest.mock import patch
import numpy as np
from PIL import Image
import test_sxt_processing as fixture_module
from image_quality import processing_review
from optical_publication_io import bound_file
from photoshop_original_restore import restore_batch,restoration_mask,restoration_pixels,native_restoration_row,import_restoration_products

ROOT=Path(__file__).resolve().parents[2]


class PhotoshopRestorationBoundaries(unittest.TestCase):
    def test_polygon_restores_an_irregular_structure_and_preserves_independent_exterior(self):
        mask=restoration_mask((32,24),[],1,[[[3,3],[20,3],[20,10],[28,10],[28,19],[3,19]]])
        original=np.full((24,32,3),150,dtype='uint8');base=np.full_like(original,40)
        m=np.asarray(mask).astype('uint32')[:,:,None]
        after=((original.astype('uint32')*m+base.astype('uint32')*(255-m)+127)//255).astype('uint8')
        proof=restoration_pixels(original,base,np.asarray(mask),after)
        self.assertGreater(proof['corePixels'],0);self.assertGreater(proof['exteriorPixels'],0)
        self.assertEqual(after[5,8].tolist(),original[5,8].tolist())
        self.assertEqual(after[5,27].tolist(),base[5,27].tolist())
        after[0,0,0]^=1
        with self.assertRaisesRegex(ValueError,'changed_core_or_exterior'):
            restoration_pixels(original,base,np.asarray(mask),after)

    def test_invalid_polygon_is_rejected_before_the_native_dispatch(self):
        for points in [[[1,1],[2,2]],[[1,1],[2,2],[3,3]],[[1,1],[20,1],[20,30]],
                       [[1,1],[20,1],[20.5,10]],[[1,1],[20,1],[20,10],[1,1]]]:
            with self.subTest(points=points),self.assertRaisesRegex(ValueError,'polygon_invalid'):
                restoration_mask((32,24),[],1,[points])

    def setUp(self):
        self.fixture=fixture_module.SxtBatchBoundaries();self.fixture.setUp()
        self.directory=self.fixture.directory
        self.fixture.process('sxt')
        processing=self.directory/'sxt/result.json'
        initial=processing_review(processing,self.directory/'source-review',root=ROOT)
        decisions={'processingReceipt':bound_file(processing,root=ROOT),'decisions':[{
            'id':r['id'],'processingKeySha256':r['processingKeySha256'],'outputs':r['outputs'],
            'status':'NEEDS_REPAIR','reason':'fixture known source-structure loss'}for r in initial['rows']]}
        d=self.directory/'decisions.json';d.write_text(json.dumps(decisions),encoding='utf8')
        processing_review(processing,self.directory/'decided-source',root=ROOT,decisions_path=d)
        tool=self.directory/'fixture-photoshop.exe';tool.write_bytes(b'fixture-not-Photoshop')
        manifest={'schemaVersion':'photoshop-original-restoration-batch-v1',
            'processingReceipt':bound_file(processing,root=ROOT),
            'reviewReceipt':bound_file(self.directory/'decided-source/review.json',root=ROOT),
            'maxBatchPixels':10000,'photoshop':{'version':'fixture','tool':{**bound_file(tool,root=ROOT),'path':str(tool)}},
            'jobs':[{'id':sid,'paths':[{'points':[[6,7],[14,10]],'radius':4}],
                     'featherPixels':1,'reason':'fixture restore original structure only'}for sid in ('first','second')]}
        self.manifest=self.directory/'restore.json';self.manifest.write_text(json.dumps(manifest),encoding='utf8')

    def dispatch(self,config_path,result_path,*,damage=False):
        config=json.loads(config_path.read_text(encoding='utf8'));rows=[]
        for index,job in enumerate(config['jobs']):
            source=Image.open(job['input']);original=np.asarray(source)
            base=np.asarray(Image.open(job['processedCandidate']))
            mask=np.asarray(Image.open(job['protectionMask']))
            after=((original.astype('uint32')*mask[:,:,None]+base.astype('uint32')*(255-mask[:,:,None])+127)//255).astype('uint8')
            if damage and index==0:
                after[0,0,0]^=1
            Image.fromarray(after).save(job['output'],icc_profile=source.info['icc_profile'])
            Path(job['psd']).write_bytes(b'fixture PSD, no native verification claim')
            rows.append({'sample':job['sample'],'status':'EXPORTED_NOT_PIXEL_ACCEPTANCE',
                         'width':job['width'],'height':job['height'],'mode':'RGB','bits':8,
                         'psdReadback':{'hasEditableUserMask':True,'layers':3,'alphaChannels':1,
                                       'width':job['width'],'height':job['height']}})
        report={'status':'EXPORTED_NOT_PIXEL_ACCEPTANCE','rows':rows,'documentIdsBefore':[42],'documentIdsAfter':[42]}
        result_path.write_text(json.dumps(report),encoding='utf8')
        return report,{'measurement':'fixture-only, no Photoshop process'}

    def test_bound_local_original_restoration_and_review_use_real_composite_pixels(self):
        manifest=json.loads(self.manifest.read_text());manifest['jobs'][0]['reviewRois']=[[1,1,6,6]]
        self.manifest.write_text(json.dumps(manifest),encoding='utf8')
        result=restore_batch(self.manifest,bound_file(self.manifest,root=ROOT)['sha256'],self.directory/'repaired',root=ROOT,dispatch=self.dispatch)
        self.assertEqual(result['nativeInferenceCalls'],0)
        self.assertEqual([r['status']for r in result['rows']],['PROCESSED_PENDING_REVIEW']*2)
        for row in result['rows']:
            self.assertEqual(row['restorationProof']['coreChannelDifferences'],0)
            self.assertEqual(row['restorationProof']['exteriorChannelDifferences'],0)
            self.assertGreater(row['restorationProof']['changedPixels'],0)
        review=json.loads((self.directory/'repaired/review/review.json').read_text(encoding='utf8'))
        self.assertEqual([r['status']for r in review['rows']],['PENDING_REVIEW']*2)
        self.assertIn('localRestoration',review['rows'][0])
        self.assertEqual(result['rows'][0]['key']['job']['reviewRois'][-1],[1,1,6,6])
        self.assertEqual(len(review['rows'][0]['comparisons']),len(review['rows'][1]['comparisons'])+1)

    def test_invalid_repair_roi_stops_before_any_native_call_or_product_directory(self):
        manifest=json.loads(self.manifest.read_text());manifest['jobs'][1]['reviewRois']=[[0,0,9999,9999]]
        self.manifest.write_text(json.dumps(manifest),encoding='utf8')
        directory=self.directory/'bad-roi'
        with patch('photoshop_original_restore.dispatch_photoshop')as native:
            with self.assertRaisesRegex(ValueError,'review_roi_invalid'):
                restore_batch(self.manifest,bound_file(self.manifest,root=ROOT)['sha256'],directory,root=ROOT,dispatch=native)
            native.assert_not_called()
        self.assertFalse(directory.exists())

    def frozen_mask_manifest(self):
        value=json.loads(self.manifest.read_text())
        source=value['processingReceipt'];processing=json.loads((ROOT/source['path']).read_text())
        size=processing['rows'][0]['key']['job']['outputSize']
        mask=restoration_mask(size,[{'points':[[8,8]],'radius':4}],1)
        target=self.directory/'frozen-mask.png';mask.save(target)
        value['jobs'][0]={'id':'first','frozenMask':bound_file(target,root=ROOT),
                          'reason':'fixture exact pinned non-circular mask'}
        self.manifest.write_text(json.dumps(value),encoding='utf8')
        return value,target

    def test_frozen_mask_is_applied_and_its_original_bytes_remain_in_provenance(self):
        value,target=self.frozen_mask_manifest()
        value['pngExport']='save-as-png';self.manifest.write_text(json.dumps(value),encoding='utf8')
        def dispatch(*args):
            self.assertEqual(json.loads(args[0].read_text())['pngExport'],'save-as-png')
            return self.dispatch(*args)
        result=restore_batch(self.manifest,bound_file(self.manifest,root=ROOT)['sha256'],
                             self.directory/'frozen-pass',root=ROOT,dispatch=dispatch)
        row=result['rows'][0]
        self.assertEqual(row['status'],'PROCESSED_PENDING_REVIEW')
        self.assertEqual(row['restorationProof']['coreChannelDifferences'],0)
        self.assertEqual(row['restorationProof']['exteriorChannelDifferences'],0)
        self.assertIn(value['jobs'][0]['frozenMask'],row['key']['job']['dependencies'])
        self.assertEqual(Image.open(target).tobytes(),
                         Image.open(ROOT/row['outputs']['restorationMask']['path']).tobytes())

    def test_changed_frozen_mask_stops_before_dispatch_and_product_creation(self):
        _,target=self.frozen_mask_manifest();target.write_bytes(target.read_bytes()+b'changed')
        directory=self.directory/'changed-mask'
        with patch('photoshop_original_restore.dispatch_photoshop')as native:
            with self.assertRaises((ValueError,RuntimeError)):
                restore_batch(self.manifest,bound_file(self.manifest,root=ROOT)['sha256'],directory,root=ROOT,dispatch=native)
            native.assert_not_called()
        self.assertFalse(directory.exists())

    def test_unknown_png_export_is_rejected_before_native_dispatch(self):
        value=json.loads(self.manifest.read_text());value['pngExport']='unknown'
        self.manifest.write_text(json.dumps(value),encoding='utf8')
        directory=self.directory/'unknown-export'
        with patch('photoshop_original_restore.dispatch_photoshop')as native:
            with self.assertRaisesRegex(ValueError,'png_export_invalid'):
                restore_batch(self.manifest,bound_file(self.manifest,root=ROOT)['sha256'],directory,root=ROOT,dispatch=native)
            native.assert_not_called()
        self.assertFalse(directory.exists())

    def test_ambiguous_frozen_and_generated_masks_are_not_silently_combined(self):
        value,_=self.frozen_mask_manifest();value['jobs'][0]['paths']=[]
        self.manifest.write_text(json.dumps(value),encoding='utf8')
        directory=self.directory/'ambiguous-mask'
        with patch('photoshop_original_restore.dispatch_photoshop')as native:
            with self.assertRaisesRegex(ValueError,'mask_definitions_ambiguous'):
                restore_batch(self.manifest,bound_file(self.manifest,root=ROOT)['sha256'],directory,root=ROOT,dispatch=native)
            native.assert_not_called()
        self.assertFalse(directory.exists())

    def test_non_mask_png_cannot_reach_native_dispatch(self):
        value,target=self.frozen_mask_manifest()
        Image.new('RGB',Image.open(target).size,'white').save(target)
        value['jobs'][0]['frozenMask']=bound_file(target,root=ROOT)
        self.manifest.write_text(json.dumps(value),encoding='utf8')
        directory=self.directory/'non-mask'
        with patch('photoshop_original_restore.dispatch_photoshop')as native:
            with self.assertRaisesRegex(ValueError,'frozen_mask_invalid'):
                restore_batch(self.manifest,bound_file(self.manifest,root=ROOT)['sha256'],directory,root=ROOT,dispatch=native)
            native.assert_not_called()
        self.assertFalse(directory.exists())

    def test_one_changed_exterior_cannot_pass_and_other_result_survives(self):
        result=restore_batch(self.manifest,bound_file(self.manifest,root=ROOT)['sha256'],self.directory/'partial',root=ROOT,
            dispatch=lambda *args:self.dispatch(*args,damage=True))
        self.assertEqual(result['rows'][0]['status'],'FAILED')
        self.assertIn('core_or_exterior',result['rows'][0]['error'])
        self.assertEqual(result['rows'][1]['status'],'PROCESSED_PENDING_REVIEW')
        review=json.loads((self.directory/'partial/review/review.json').read_text(encoding='utf8'))
        self.assertEqual([r['status']for r in review['rows']],['HARD_CHECK_FAILED','PENDING_REVIEW'])

    def test_mask_cannot_select_whole_image_and_original_whole_frame_is_not_restoration(self):
        with self.assertRaisesRegex(ValueError,'core_and_unchanged'):
            restoration_mask([18,18],[{'points':[[9,9]],'radius':50}],0)
        mask=np.asarray(restoration_mask([24,18],[{'points':[[8,8]],'radius':4}],1))
        original=np.full((18,24,3),100,dtype='uint8');base=np.full_like(original,20)
        with self.assertRaisesRegex(ValueError,'core_or_exterior'):
            restoration_pixels(original,base,mask,original)

    def test_native_saved_geometry_and_identity_are_required_beyond_mask_boolean(self):
        row={'sample':'first','status':'EXPORTED_NOT_PIXEL_ACCEPTANCE','width':24,'height':18,'mode':'RGB','bits':8,
             'psdReadback':{'hasEditableUserMask':True,'layers':3,'alphaChannels':1,'width':24,'height':18}}
        report={'status':'EXPORTED_NOT_PIXEL_ACCEPTANCE','documentIdsBefore':[],'documentIdsAfter':[],'rows':[row]}
        native_restoration_row(report,'first',[24,18])
        row['psdReadback']['width']=23
        with self.assertRaisesRegex(ValueError,'geometry_not_read_back'):
            native_restoration_row(report,'first',[24,18])
        row['psdReadback']['width']=24;report['rows'].append(row)
        with self.assertRaisesRegex(ValueError,'identity_or_ownership'):
            native_restoration_row(report,'first',[24,18])

    def test_saved_execution_epoch_reuses_unchanged_products_and_cannot_relocate_data(self):
        directory=self.directory/'saved-epoch'
        result=restore_batch(self.manifest,bound_file(self.manifest,root=ROOT)['sha256'],directory,root=ROOT,dispatch=self.dispatch)
        imported=import_restoration_products(directory/'result.json',result['executionSources'],self.directory/'imported',root=ROOT)
        self.assertEqual(imported['photoshopCalls'],0)
        self.assertEqual(imported['productEncodes'],0)
        self.assertEqual([r['outputs']for r in imported['rows']],[r['outputs']for r in result['rows']])
        review=processing_review(self.directory/'imported/result.json',self.directory/'import-review',root=ROOT)
        self.assertEqual([r['status']for r in review['rows']],['PENDING_REVIEW']*2)
        snapshots=json.loads(json.dumps(result['executionSources']))
        snapshots[0]['executedSource']=result['rows'][0]['key']['job']['input']
        with self.assertRaisesRegex(ValueError,'snapshot_identity'):
            import_restoration_products(directory/'result.json',snapshots,self.directory/'invalid',root=ROOT)


@unittest.skipUnless(shutil.which('pwsh'), 'PowerShell 7 host unavailable')
class PhotoshopLocalMedianPreflight(unittest.TestCase):
    """Run the real PS1 preflight; a forbidden COM stub never opens Photoshop."""
    def setUp(self):
        self.directory=ROOT/'output/photoshop-preflight-tests'/uuid.uuid4().hex
        self.directory.mkdir(parents=True)
        self.source=ROOT/'data-pipelines/deep-sky/photoshop_batch.ps1'
        self.input=self.directory/'input.bin';self.input.write_bytes(b'preflight fixture, not image data')
        self.mask=self.directory/'mask.bin';self.mask.write_bytes(b'preflight fixture, not mask pixels')
        self.config={'operation':'local-residual-median','outputDirectory':str(self.directory),
            'jsxSha256':hashlib.sha256(self.source.with_suffix('.jsx').read_bytes()).hexdigest(),
            'vendorTools':[],'jobs':[{'sample':'preflight','input':str(self.input),
                'inputSha256':hashlib.sha256(self.input.read_bytes()).hexdigest(),
                'protectionMask':str(self.mask),'protectionMaskSha256':hashlib.sha256(self.mask.read_bytes()).hexdigest(),
                'medianRadiusPixels':18,'output':str(self.directory/'candidate.png')}]}

    def invoke(self,config,*,without_recipe_guard=False):
        index=len(list(self.directory.glob('case-*.json')))
        config_path=self.directory/f'case-{index}.json';config_path.write_text(json.dumps(config),encoding='utf8')
        text=self.source.read_text(encoding='utf8')
        if without_recipe_guard:
            start=text.index("    if ($config.operation -eq 'local-residual-median' -and")
            end=text.index("    if ((Get-FileHash -LiteralPath $job.input",start)
            text=text[:start]+text[end:]
        # ScriptBlock has no file location; preserve the real owner's path.
        owner=str(self.source.parent).replace("'","''")
        text=text.replace('$PSScriptRoot',"'"+owner+"'")
        frozen=self.directory/f'case-{index}-source.ps1';frozen.write_text(text,encoding='utf8')
        runner=self.directory/f'case-{index}-runner.ps1'
        runner.write_text("param($Source,$Config,$Result)\nfunction New-Object { param($ComObject) "
            "[Console]::WriteLine('COM_BOUNDARY_REACHED'); throw 'fixture_COM_forbidden' }\n"
            "& ([ScriptBlock]::Create([IO.File]::ReadAllText($Source))) -ConfigPath $Config -ResultPath $Result\n",encoding='utf8')
        result=self.directory/f'case-{index}-result.json'
        process=subprocess.run(['pwsh','-NoProfile','-File',str(runner),str(frozen),str(config_path),str(result)],
            capture_output=True,text=True,timeout=30)
        output=process.stdout+process.stderr
        (self.directory/f'case-{index}.log').write_text(output,encoding='utf8')
        self.assertNotEqual(process.returncode,0)
        self.assertFalse(result.exists())
        self.assertFalse((self.directory/'candidate.png').exists())
        return output

    def test_unsupported_or_missing_recipe_is_rejected_before_com(self):
        cases=[0,101,18.5,'18',True,None]
        for radius in cases:
            with self.subTest(radius=radius):
                config=copy.deepcopy(self.config);config['jobs'][0]['medianRadiusPixels']=radius
                output=self.invoke(config)
                self.assertIn('photoshop_local_median_recipe_invalid',output)
                self.assertNotIn('COM_BOUNDARY_REACHED',output)
        for missing in ['medianRadiusPixels','protectionMask']:
            with self.subTest(missing=missing):
                config=copy.deepcopy(self.config);del config['jobs'][0][missing]
                output=self.invoke(config)
                self.assertIn('photoshop_local_median_recipe_invalid',output)
                self.assertNotIn('COM_BOUNDARY_REACHED',output)

    def test_valid_recipe_reaches_forbidden_com_control(self):
        self.assertIn('COM_BOUNDARY_REACHED',self.invoke(self.config))

    def test_removing_recipe_guard_exposes_invalid_radius_to_com(self):
        config=copy.deepcopy(self.config);config['jobs'][0]['medianRadiusPixels']=0
        self.assertIn('COM_BOUNDARY_REACHED',self.invoke(config,without_recipe_guard=True))


if __name__=='__main__':
    unittest.main()
