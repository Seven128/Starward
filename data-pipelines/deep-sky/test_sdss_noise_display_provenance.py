"""Actual offline consumer provenance/byte/derivation and recovery boundaries."""
import copy
import inspect
from dataclasses import replace
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image

import sdss_gri_tan as gri
import sdss_noise_display as display
import sdss_noise_display_provenance as owner
from image_quality import digest
from test_sdss_noise_display import source_frames
from test_sdss_gri_tan import ENTRY


class NoiseProvenanceTest(unittest.TestCase):
    def setup_inputs(self,second=False):
        frames,sources=source_frames(second=second)
        master=gri.build_mosaic_master(frames,ENTRY,32,.1) if second else gri.build_master(frames,ENTRY,32,.1)
        return master,sources

    def pin(self,document):return digest(owner.canonical_bytes(document))

    def test_actual_source_snapshot_binds_camera_calibration_flags_and_shared_projection(self):
        master,sources=self.setup_inputs(second=True)
        document=owner.build_noise_display_provenance(master,sources)
        # JSON roundtrip preserves large field identity/string and tuple meaning.
        loaded=json.loads(owner.canonical_bytes(document))
        owner.verify_noise_display_provenance(loaded,master,sources,expected_sha256=self.pin(document))
        self.assertEqual(len(loaded['fields']),2)
        band=loaded['fields'][0]['bands']['g']
        self.assertEqual(band['camera']['gain_electrons_per_count'],1.)
        self.assertEqual(band['flags']['planeNumbers']['S_MASK_NOTCHECKED'],2)
        self.assertEqual(band['calibrationSky']['allsky']['shape'],[4,4])
        self.assertIn('post-filter uncertainty',document['algorithm']['omittedUncertainty'])
        self.assertIn('asTrans',document['algorithm']['projectionLimit'])
        self.assertFalse(loaded['adopted'])
        self.assertEqual(document['master']['sourceResolvedRecipe'],master.report['display']['transfer'])

    def test_changed_documents_or_current_inputs_cannot_relabel_prior_source_snapshot(self):
        master,sources=self.setup_inputs()
        document=owner.build_noise_display_provenance(master,sources);pin=self.pin(document)
        forged=copy.deepcopy(document);forged['quality']='PASSED'
        with self.assertRaisesRegex(RuntimeError,'document_changed'):
            owner.verify_noise_display_provenance(forged,master,sources,expected_sha256=pin)
        old=sources['301/1/1/1']['g']
        sources['301/1/1/1']['g']=display.NoiseDisplaySource(old.frame,
            replace(old.camera,gain_electrons_per_count=2.),old.flags)
        with self.assertRaisesRegex(RuntimeError,'current_inputs_changed'):
            owner.verify_noise_display_provenance(document,master,sources,expected_sha256=pin)
        sources['301/1/1/1']['g']=old
        old.frame.calibration_sky.allsky[1,1]+=1
        with self.assertRaisesRegex(RuntimeError,'current_inputs_changed'):
            owner.verify_noise_display_provenance(document,master,sources,expected_sha256=pin)
        old.frame.calibration_sky.allsky[1,1]-=1
        old.flags.flags[1,1]|=1<<0
        with self.assertRaisesRegex(RuntimeError,'current_inputs_changed'):
            owner.verify_noise_display_provenance(document,master,sources,expected_sha256=pin)
        with self.assertRaisesRegex(RuntimeError,'external_pin_invalid'):
            owner.verify_noise_display_provenance(document,master,sources,expected_sha256=None)

    def test_missing_model_facts_stay_null_and_do_not_certify_processing(self):
        master,sources=self.setup_inputs()
        old=sources['301/1/1/1']['r']
        sources['301/1/1/1']['r']=display.NoiseDisplaySource(old.frame,None,None)
        provenance=owner.build_noise_display_provenance(master,sources)
        self.assertIsNone(provenance['fields'][0]['bands']['r']['camera'])
        self.assertIsNone(provenance['fields'][0]['bands']['r']['flags'])
        candidate=display.render_noise_display_candidate(master,sources)
        self.assertFalse(candidate.processable.any())
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);output=root/'candidate'
            display.save_noise_display_candidate(output,master,candidate,ENTRY,output_pixels=8)
            packet=owner.bind_saved_noise_display(output,master,sources,provenance,root=root,
                candidate_sha256=digest((output/'candidate.json').read_bytes()),provenance_sha256=self.pin(provenance))
            self.assertTrue(packet['originalFallbackExact'])
            self.assertFalse(packet['adopted'])

    def test_partial_black_saved_output_real_png_and_external_pins(self):
        master,sources=self.setup_inputs()
        # Actual outside geometry source, valid black and absent pixels differ.
        frames=[s.frame for s in sources['301/1/1/1'].values()]
        for frame in frames:frame.data[:]=0;frame.wcs.wcs.crpix-=[12,12]
        master=gri.build_master(frames,ENTRY,32,.1)
        provenance=owner.build_noise_display_provenance(master,sources)
        candidate=display.render_noise_display_candidate(master,sources)
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);output=root/'candidate'
            saved=display.save_noise_display_candidate(output,master,candidate,ENTRY,output_pixels=8)
            pin=digest((output/'candidate.json').read_bytes())
            packet=owner.bind_saved_noise_display(output,master,sources,provenance,root=root,
                candidate_sha256=pin,provenance_sha256=self.pin(provenance))
            self.assertEqual(packet['sourceBands'],3)
            self.assertEqual(packet['filterRuns'],0)
            self.assertTrue(packet['levelDerivationExact'])
            image=np.asarray(Image.open(output/saved['levels']['OVERVIEW']['file']))
            self.assertTrue((image[:,:,3]==0).any());self.assertTrue((image[:,:,3]==255).any())
            self.assertTrue((image[:,:,:3]==0).all())
            # Relabeling a valid PNG checksum cannot establish original pixels.
            detail=output/saved['levels']['DETAIL']['file']
            detail.write_bytes((output/saved['levels']['OVERVIEW']['file']).read_bytes())
            saved['levels']['DETAIL']['bytes']=detail.stat().st_size
            saved['levels']['DETAIL']['sha256']=digest(detail.read_bytes())
            (output/'candidate.json').write_text(json.dumps(saved),encoding='utf-8')
            with self.assertRaisesRegex(RuntimeError,'candidate_changed'):
                owner.bind_saved_noise_display(output,master,sources,provenance,root=root,
                    candidate_sha256=pin,provenance_sha256=self.pin(provenance))
            # Even a caller granting the forged candidate hash cannot bypass
            # the actual source/estimate -> level derivation consumer.
            with self.assertRaisesRegex(RuntimeError,'level_derivation_invalid'):
                owner.bind_saved_noise_display(output,master,sources,provenance,root=root,
                    candidate_sha256=digest((output/'candidate.json').read_bytes()),provenance_sha256=self.pin(provenance))

    def test_saved_estimate_and_processability_cannot_hide_changed_fallback(self):
        master,sources=self.setup_inputs()
        provenance=owner.build_noise_display_provenance(master,sources)
        candidate=display.render_noise_display_candidate(master,sources)
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);output=root/'candidate'
            saved=display.save_noise_display_candidate(output,master,candidate,ENTRY,output_pixels=8)
            value=np.load(output/saved['arrays']['g']['file'],allow_pickle=False)
            value[0,0]+=.01
            # A coherent encoded checksum does not grant changed fallback.
            with (output/saved['arrays']['g']['file']).open('wb') as stream:np.save(stream,value,allow_pickle=False)
            raw=(output/saved['arrays']['g']['file']).read_bytes()
            saved['arrays']['g'].update(bytes=len(raw),sha256=digest(raw))
            saved['displayEstimatesCOrderSha256']['g']=digest(value.tobytes())
            (output/'candidate.json').write_text(json.dumps(saved),encoding='utf-8')
            with self.assertRaisesRegex(RuntimeError,'fallback_invalid'):
                owner.bind_saved_noise_display(output,master,sources,provenance,root=root,
                    candidate_sha256=digest((output/'candidate.json').read_bytes()),provenance_sha256=self.pin(provenance))

    def test_same_geometry_target_relabel_is_rejected_at_source_chain_owner(self):
        master,sources=self.setup_inputs()
        provenance=owner.build_noise_display_provenance(master,sources)
        candidate=display.render_noise_display_candidate(master,sources)
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);output=root/'candidate'
            # Prior lower-level serializer admits another reference at the
            # same center; its image/WCS/pixel hashes cannot prove identity.
            altered=ENTRY|{'objectRef':'M:82'}
            display.save_noise_display_candidate(output,master,candidate,altered,output_pixels=8)
            code=inspect.getsource(owner.bind_saved_noise_display)
            guard="    if any(candidate.get(key)!=item for key,item in provenance['master']['targetIdentity'].items()):\n        raise RuntimeError('sdss_noise_provenance_target_identity_mismatch')\n"
            self.assertIn(guard,code)
            namespace=dict(owner.__dict__);exec(code.replace(guard,''),namespace)
            escaped=namespace['bind_saved_noise_display'](output,master,sources,provenance,root=root,
                candidate_sha256=digest((output/'candidate.json').read_bytes()),provenance_sha256=self.pin(provenance))
            self.assertEqual(escaped['objectRef'],'M:82','bounded missing-guard mutation reproduces wrong identity')
            with self.assertRaisesRegex(RuntimeError,'target_identity_mismatch'):
                owner.bind_saved_noise_display(output,master,sources,provenance,root=root,
                    candidate_sha256=digest((output/'candidate.json').read_bytes()),provenance_sha256=self.pin(provenance))
        master.report.pop('objectRef')
        with self.assertRaisesRegex(RuntimeError,'master_identity_missing'):
            owner.build_noise_display_provenance(master,sources)


if __name__=='__main__':unittest.main()
