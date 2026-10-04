"""Cached admission regressions; synthetic identities, no source requests/FITS/GPU."""
import copy
import io
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image

import publish_sdss_science as publisher
import sdss_gri_tan as gri
from image_quality import digest

ENTRY={'objectRef':'M:51','center':{'raDeg':202.469625,'decDeg':47.1951666667,'frame':'ICRS J2000'},'orientation':'north-up/east-left'}


def save_array(path,value):
    with path.open('wb') as f: np.save(f,value,allow_pickle=False)
    b=path.read_bytes()
    return {'file':path.name,'bytes':len(b),'sha256':digest(b),'shape':list(value.shape),'dtype':value.dtype.str,'format':'npy','pickle':False}


class CachedSciencePublisherTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='starward-sdss-writer-')
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.cached=self.root/'synthetic-candidate';self.cached.mkdir()
        n=32;data=np.linspace(-1,12,n*n,dtype=np.float32).reshape(n,n);data[0,:2]=[-7,0]
        joint=np.ones((n,n),dtype=np.bool_);joint[0,2]=False
        bands={};arrays={};receipts=[];per_band={};inputs=[]
        for index,band in enumerate(gri.BANDS):
            science=(data*(index+1)).astype(np.float32);science[~joint]=np.nan
            raw=self.root/('synthetic-frame-'+band+'.fits.bz2');raw.write_bytes(('SYNTHETIC TEST BYTES '+band).encode())
            source={'path':str(raw),'bytes':raw.stat().st_size,'sha256':digest(raw.read_bytes()),'sourceUrl':'https://fixture.invalid/'+raw.name}
            header='SYNTHETIC PRIMARY HEADER '+band
            receipt={'identity':{'rerun':'301','run':1,'camcol':1,'field':1,'band':band},'source':source,
                     'wcs':{'primaryHeaderFitsCards':header,'primaryHeaderSha256':digest(header.encode())},
                     'limitations':['Synthetic writer-boundary test identity; not actual source admission/science.']}
            receipts.append(receipt);inputs.append(publisher.bound_file(raw,root=self.root))
            per_band[band]={'sourceReceipts':[receipt],'scientificValidity':'UNKNOWN'}
            bands[band]=gri.ProjectedBand(science,joint,joint,per_band[band])
            for suffix,value in [('science',science),('footprint',joint),('finite-neighbors',joint)]:
                arrays[band+'-'+suffix]=save_array(self.cached/(band+'-'+suffix+'.npy'),value)
        rgb,recipe=gri.make_rgb_display(bands,joint)
        arrays['joint-availability']=save_array(self.cached/'joint-availability.npy',joint)
        arrays['rgb-master']=save_array(self.cached/'rgb-master.npy',rgb)
        target=gri.target_tan(ENTRY['center'],n,.22755555555555557)
        master=gri.GriMaster(target,bands,joint,rgb,{'fieldDegrees':.22755555555555557,'display':{'transfer':recipe}})
        levels={}
        for level,(payload,metadata) in gri.pyramid(master,ENTRY,output_pixels=8).items():
            name=level.lower()+'.png';(self.cached/name).write_bytes(payload);levels[level]=metadata|{'file':name}
        self.candidate={**ENTRY,'version':gri.MOSAIC_VERSION,'pixels':n,'fieldDegrees':master.report['fieldDegrees'],
                        'wcsHeader':dict(target.to_header()),'arrays':arrays,'levels':levels,
                        'science':{'perBand':per_band},'display':{'transfer':recipe},
                        'mosaic':{'fields':[{'perBand':{band:{'sourceReceipt':v} for band,v in zip(gri.BANDS,receipts)}}]}}
        self.evidence={'inputs':inputs,'sourceFrameReceipts':receipts}
        self.repin()

    def repin(self):
        (self.cached/'candidate.json').write_text(json.dumps(self.candidate,allow_nan=False),encoding='utf8')
        self.evidence['candidateOutputs']=[publisher.bound_file(p,root=self.root) for p in sorted(self.cached.iterdir()) if p.name!='binding.json']
        (self.cached/'binding.json').write_text(json.dumps(self.evidence,allow_nan=False),encoding='utf8')
        self.pins={'candidate_sha256':digest((self.cached/'candidate.json').read_bytes()),'binding_sha256':digest((self.cached/'binding.json').read_bytes())}

    def verify(self): return publisher.verify_cached_candidate(self.cached,root=self.root,**self.pins)

    def use_single_producer_evidence(self):
        self.candidate['version']=gri.VERSION;self.candidate.pop('mosaic')
        receipts=self.evidence.pop('sourceFrameReceipts')
        for band,receipt in zip(gri.BANDS,receipts):
            self.candidate['science']['perBand'][band]={'sourceReceipt':receipt,'scientificValidity':'UNKNOWN'}
        acquisition=self.root/'acquisition.json'
        acquisition.write_text(json.dumps({'objectRef':ENTRY['objectRef'],'sourceFiles':[
            {'identity':v['identity'],'bytes':v['source']['bytes'],'sha256':v['source']['sha256'],
             'url':v['source']['sourceUrl']} for v in receipts]}),encoding='utf8')
        self.evidence['inputs'].insert(0,publisher.bound_file(acquisition,root=self.root))
        self.evidence['version']=gri.VERSION
        self.repin()
        self.evidence['outputs']=self.evidence.pop('candidateOutputs')
        self.pin_single_binding()

    def pin_single_binding(self):
        (self.cached/'binding.json').write_text(json.dumps(self.evidence,allow_nan=False),encoding='utf8')
        self.pins['binding_sha256']=digest((self.cached/'binding.json').read_bytes())

    def test_original_single_producer_preserves_nested_receipts_without_rebinding_arrays(self):
        before={name:dict(value) for name,value in self.candidate['arrays'].items()}
        self.use_single_producer_evidence()
        verified=self.verify()
        self.assertEqual(verified.candidate['arrays'],before)
        self.assertEqual(len(verified.sources),3)
        self.assertEqual(int(verified.master.joint_available.sum()),32*32-1)

    def test_single_acquisition_identity_and_url_are_not_inferred_from_nested_receipts(self):
        self.use_single_producer_evidence()
        acquisition=self.root/'acquisition.json';document=json.loads(acquisition.read_bytes())
        document['sourceFiles'][0]['url']='https://fixture.invalid/foreign-frame'
        acquisition.write_text(json.dumps(document),encoding='utf8')
        # Deliberately fresh fixture pins: matching frame bytes still cannot
        # excuse a conflicting bound upstream identity/URL.
        self.evidence['inputs'][0]=publisher.bound_file(acquisition,root=self.root)
        self.pin_single_binding()
        with self.assertRaisesRegex(RuntimeError,'single_acquisition_mismatch'):self.verify()

    def test_frozen_reference_byte_pins_and_legacy_boundary_keep_original_candidate(self):
        for receipt in self.evidence['sourceFrameReceipts']:
            receipt['scientificSamples']={'unit':'nanomaggies/pixel','calibrationAlreadyApplied':True,'skyAlreadySubtracted':True}
            receipt['decompressed']={'completeScientificArrays':True}
        self.repin();verified=self.verify();old_recipe=copy.deepcopy(verified.transfer)
        rgb,recipe=gri.make_rgb_display(verified.master.bands,verified.master.joint_available,
            transfer=gri.WholeMasterZscaleTransfer())
        reference=self.root/'frozen-rgb.npy';save_array(reference,rgb)
        producer=self.root/'frozen-producer.json';producer.write_text(json.dumps(recipe),encoding='utf8')
        arguments={'root':self.root,'rgb_path':reference,'rgb_binding':publisher.bound_file(reference,root=self.root),
                   'recipe':recipe,'evidence_bindings':(publisher.bound_file(producer,root=self.root),)}
        frozen=publisher.reuse_frozen_zscale_reference(verified,**arguments)
        self.assertEqual(verified.transfer,old_recipe)
        self.assertIsNone(verified.reference_rgb_identity)
        self.assertNotEqual(frozen.reference_rgb_identity['sha256'],verified.candidate['arrays']['rgb-master']['sha256'])
        recipe['stretch']*=2
        self.assertNotEqual(frozen.transfer['stretch'],recipe['stretch'],'caller mutation cannot replace admitted recipe')
        out=self.root/'forbidden-v2';out.mkdir()
        with self.assertRaisesRegex(RuntimeError,'requires_unmodified_v3'):
            publisher.publication_payload(frozen,out,publication_id='test',legacy_source={})
        self.assertEqual(list(out.iterdir()),[])
        with self.assertRaisesRegex(RuntimeError,'requires_unmodified_v3'):
            publisher.science_mean_publication_payload(frozen,out,publication_id='test',legacy_source={},
                display_transfer=gri.FixedDisplayTransfer())
        self.assertEqual(list(out.iterdir()),[])
        # This deliberate corruption is after the frozen reader is retired;
        # Windows correctly prevents truncating its still-mapped NPY file.
        frozen.master.rgb._mmap.close()
        reference.write_bytes(reference.read_bytes()+b'changed')
        with self.assertRaisesRegex(RuntimeError,'input_bytes_changed'):
            publisher.reuse_frozen_zscale_reference(verified,**arguments)

    def test_partial_source_and_valid_black_keep_distinct_availability(self):
        verified=self.verify();detail=np.asarray(Image.open(io.BytesIO(verified.levels['DETAIL'][0])))
        overview=np.asarray(Image.open(io.BytesIO(verified.levels['OVERVIEW'][0])))
        self.assertLess(overview[0,0,3],255,'one missing source sample cannot admit complete four-sample texture support')
        self.assertTrue(np.all(detail[:,:,3]==255))
        self.assertLess(verified.master.bands['g'].data[0,0],0)
        self.assertEqual(verified.master.bands['g'].data[0,1],0)
        self.assertTrue(verified.master.joint_available[0,0] and verified.master.joint_available[0,1])
        self.assertTrue(np.all(verified.master.rgb[0,:2]==0),'valid nonpositive measurements can have black display without becoming missing')
        self.assertFalse(verified.master.joint_available[0,2])
        self.assertTrue(np.isnan(verified.master.bands['g'].data[0,2]))

    def test_new_scientific_pyramid_cannot_enter_legacy_publication_even_if_pixels_are_unchanged(self):
        self.candidate['pyramidKind']=gri.SCIENCE_PYRAMID_KIND
        self.repin()
        with self.assertRaisesRegex(RuntimeError,'cached_pyramid_kind_unsupported'):self.verify()
        self.candidate.pop('pyramidKind')
        self.candidate['pyramidRecipe']={'method':gri.SCIENCE_PYRAMID_KIND}
        self.repin()
        with self.assertRaisesRegex(RuntimeError,'cached_pyramid_kind_unsupported'):self.verify()

    def test_external_report_pins_reject_new_self_consistent_evidence(self):
        old=self.pins.copy();self.candidate['center']['raDeg']+=1;self.repin();self.pins=old
        with self.assertRaisesRegex(RuntimeError,'cached_evidence_identity_changed'):self.verify()

    def test_raw_source_bytes_and_receipt_identity_are_not_inferred_from_rgb(self):
        raw=Path(self.evidence['sourceFrameReceipts'][0]['source']['path']);raw.write_bytes(raw.read_bytes()+b'changed')
        with self.assertRaisesRegex(RuntimeError,'input_bytes_changed'):self.verify()

    def test_conflicting_receipts_reject_a_same_byte_source_with_different_identity(self):
        self.candidate['science']['perBand']['g']['sourceReceipts']=copy.deepcopy(self.candidate['science']['perBand']['g']['sourceReceipts'])
        self.candidate['science']['perBand']['g']['sourceReceipts'][0]['identity']['field']=2;self.repin()
        with self.assertRaisesRegex(RuntimeError,'source_receipts_mismatch'):self.verify()

    def test_source_and_array_locators_cannot_escape_their_approved_roots(self):
        self.candidate['arrays']['g-science']['file']='../outside.npy';self.repin()
        with self.assertRaisesRegex(RuntimeError,'candidate_path_invalid'):self.verify()
        with self.assertRaisesRegex(RuntimeError,'input_outside_root'):publisher.bound_file(self.root.parent/'outside',root=self.root)

    def test_cached_rgb_and_transfer_are_checked_by_actual_shared_processing(self):
        self.candidate['display']['transfer']['stretch']=.5;self.repin()
        with self.assertRaisesRegex(RuntimeError,'rgb_recipe_mismatch'):self.verify()

    def test_changed_rgb_with_rebound_file_hash_cannot_impersonate_same_science_master(self):
        p=self.cached/'rgb-master.npy';value=np.load(p,allow_pickle=False);value[10,10,0]^=np.uint8(1)
        self.candidate['arrays']['rgb-master']=save_array(p,value);self.repin()
        with self.assertRaisesRegex(RuntimeError,'rgb_recipe_mismatch'):self.verify()

    def test_display_contribution_alpha_cannot_be_published_as_joint_availability(self):
        verified=self.verify();alt=gri.encoded_contribution_rgba(verified.master.rgb,verified.master.joint_available)
        products=gri.pyramid(verified.master,ENTRY,output_pixels=8,display_rgba=alt)
        for level,(payload,metadata) in products.items():
            name=self.candidate['levels'][level]['file'];(self.cached/name).write_bytes(payload)
            self.candidate['levels'][level].update({'bytes':len(payload),'sha256':digest(payload)})
        self.repin()
        with self.assertRaisesRegex(RuntimeError,'availability_png_derivation_mismatch'):self.verify()

    def test_tan_crop_geometry_keeps_real_field_not_an_arithmetic_half(self):
        self.candidate['levels']['MEDIUM']['fieldDegrees']=self.candidate['fieldDegrees']/2;self.repin()
        with self.assertRaisesRegex(RuntimeError,'level_metadata_mismatch:fieldDegrees'):self.verify()

    def test_package_input_binds_actual_receipt_files_and_keeps_alpha_and_recipe_semantics(self):
        verified=self.verify();out=self.root/'fresh-payload';out.mkdir()
        payload=publisher.publication_payload(verified,out,publication_id='synthetic-writer-test',legacy_source={'dataset':'legacy JPEG'})
        for frame,receipt in zip(payload['master']['sourceFrames'],verified.sources):
            name='-'.join(str(receipt['identity'][key]) for key in ['rerun','run','camcol','field','band'])+'.json'
            raw=(out/'admission-receipts'/name).read_bytes()
            self.assertEqual(frame['admissionReceipt'],{'bytes':len(raw),'sha256':digest(raw)})
            self.assertEqual(json.loads(raw),receipt)
        self.assertEqual(payload['master']['transfer']['recipe'],verified.transfer)
        self.assertEqual(payload['master']['jointAvailability']['availablePixels'],32*32-1)
        self.assertNotIn('SkyServer',payload['processing']['modification'])
        self.assertNotIn('no pixel edits',payload['processing']['modification'])
        self.assertIn('UNKNOWN',payload['processing']['coverage'])
        for level,asset in payload['levels'].items():
            self.assertEqual(asset['sampleAvailability'],'joint-area-alpha')
            self.assertEqual(asset['masterRgbSha256'],payload['master']['rgb']['sha256'])
            self.assertEqual(asset['masterAvailabilitySha256'],payload['master']['jointAvailability']['sha256'])
            self.assertEqual((out/asset['file']).read_bytes(),verified.levels[level][0])

    def test_exclusive_output_and_failure_leave_existing_and_partial_generations_reviewable(self):
        verified=self.verify();legacy_dir=self.root/'legacy-publication';legacy_dir.mkdir();legacy=legacy_dir/'manifest.json'
        legacy.write_text(json.dumps({'objectRef':'M:51','source':{'dataset':'synthetic legacy'}}),encoding='utf8')
        existing=self.root/'existing';existing.mkdir();marker=existing/'marker';marker.write_bytes(b'keep')
        with self.assertRaises(FileExistsError):
            publisher.publish_verified_candidate(verified,existing,root=self.root,publication_id='test',legacy_manifest=legacy)
        self.assertEqual(marker.read_bytes(),b'keep')
        partial=self.root/'failed-exclusive'
        # Implementation sources cannot be admitted outside a caller's root.
        # This fails before Node, preserves failed.json and cannot be retried
        # over the failed generation. No fake schema/hash success is supplied.
        with self.assertRaisesRegex(RuntimeError,'input_outside_root'):
            publisher.publish_verified_candidate(verified,partial,root=self.root,publication_id='test',legacy_manifest=legacy)
        self.assertTrue((partial/'failed.json').is_file())
        self.assertFalse((partial/'manifest.json').exists())
        with self.assertRaises(FileExistsError):
            publisher.publish_verified_candidate(verified,partial,root=self.root,publication_id='test',legacy_manifest=legacy)

    def test_malformed_receipt_identity_cannot_escape_the_output_before_ts_admission(self):
        verified=self.verify();verified.sources[0]['identity']['rerun']='../../escape'
        out=self.root/'receipt-output';out.mkdir()
        with self.assertRaisesRegex(RuntimeError,'candidate_path_invalid'):
            publisher.publication_payload(verified,out,publication_id='test',legacy_source={})
        self.assertEqual(list((out/'admission-receipts').iterdir()),[])
        self.assertFalse((self.root/'escape-1-1-1-g.json').exists())

    def test_malformed_object_reference_cannot_escape_png_output_before_ts_admission(self):
        verified=self.verify();verified.candidate['objectRef']='../escape'
        out=self.root/'png-output';out.mkdir()
        with self.assertRaisesRegex(RuntimeError,'candidate_path_invalid'):
            publisher.publication_payload(verified,out,publication_id='test',legacy_source={})
        self.assertFalse((self.root/'escape-overview.png').exists())
        self.assertFalse(list(out.glob('*.png')))


if __name__=='__main__':unittest.main()
