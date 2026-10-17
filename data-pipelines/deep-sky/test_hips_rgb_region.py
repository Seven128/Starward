"""Coverage/cell/chunk regressions; no model, network or publication."""
import copy
import io
import json
from pathlib import Path
import subprocess
import unittest
import uuid
import numpy as np
from PIL import Image
from astropy.wcs import WCS
from hips_rgb_region import build_cached_hips_region, lookup_world, native_cell_step_degrees, nominal_region_tan, VERSION
from normalized_rgb_source import normalize_whole_rgb
from optical_publication_io import bound_file
from sxt_batch import stage_continuous_regions

ROOT = Path(__file__).resolve().parents[2]


class ContinuousRegionBoundaries(unittest.TestCase):
    def setUp(self):
        self.directory = ROOT / 'output/hips-region-tests' / uuid.uuid4().hex
        self.directory.mkdir(parents=True)
        metadata = self.directory / 'source.json'
        metadata.write_text('{"scope":"fixture-not-science"}', encoding='utf8')
        self.source = {'sourceId': 'fixture', 'inputs': [bound_file(metadata, root=ROOT)]}
        self.tile = self.directory / 'tile.png'
        pixels = np.full((512, 512, 4), 255, dtype=np.uint8)
        pixels[1, 2] = [13, 21, 34, 255]
        pixels[3, 4] = [0, 0, 0, 255]
        pixels[5, 6] = [7, 8, 9, 0]
        pixels[7, 8] = [10, 11, 12, 128]
        Image.fromarray(pixels).save(self.tile)
        self.tiles = [{'pixel': 1, 'raw': bound_file(self.tile, root=ROOT)}]
        self.wcs = WCS(naxis=2)
        self.wcs.wcs.ctype = ['RA---TAN', 'DEC--TAN']
        self.wcs.wcs.radesys = 'ICRS'
        self.wcs.wcs.crval = [270, -24]
        self.wcs.wcs.crpix = [3, 1]
        self.wcs.wcs.cdelt = [-.001, .001]
        self.options = dict(root=ROOT, source=self.source, tiles=self.tiles, target=self.wcs,
            width=5, height=1, order=1, max_output_pixels=100000, max_cached_tile_bytes=1048576,
            colour_interpretation='sRGB-web-display')

    def test_exact_native_alpha_missing_and_valid_black_are_distinct(self):
        addresses = np.array([[1, 2, 510], [1, 4, 508], [1, 6, 506], [1, 8, 504], [2, 0, 511]], dtype='<u4')
        result = build_cached_hips_region(**self.options, lookup=lambda *args: addresses)
        self.assertEqual(result.rgba[0].tolist(), [[13,21,34,255],[0,0,0,255],[7,8,9,0],[10,11,12,128],[0,0,0,0]])
        self.assertEqual(result.supplied[0].tolist(), [True,True,True,True,False])
        self.assertEqual(result.report['counts'], dict(samples=5, missingTileSamples=1, sourceTransparentSamples=1,
            sourcePartialAlphaSamples=1, opaqueSamples=2, opaqueBlackSamples=1))
        self.assertEqual(result.report['sxtAdmission'], 'COVERAGE_ADAPTER_REQUIRED')
        with self.assertRaisesRegex(ValueError, 'complete_RGB'):
            normalize_whole_rgb(result.png_bytes, 5)

    def test_saved_tan_contract_preserves_matrix_and_rejects_distortion(self):
        from astropy.io import fits
        header = self.wcs.to_header(relax=True)
        receipt = dict(schemaVersion=VERSION, rowOrder='top-first', width=24, height=18,
                       targetFitsHeader=header.tostring())
        plane = nominal_region_tan(receipt)
        self.assertEqual(plane['cdDegreesPerPixel'], [[-.001, 0], [0, .001]])
        self.assertEqual(plane['referencePixelFitsOneBased'], [3, 1])
        self.assertEqual(plane['accuracy'], 'UNVERIFIED_DERIVED_HIPS_NATIVE_CELL_TAN')
        for keyword, value in [('RADESYS', 'FK5'), ('LONPOLE', 0)]:
            modified = fits.Header.fromstring(header.tostring()); modified[keyword] = value
            with self.assertRaisesRegex(ValueError, 'unsupported'):
                nominal_region_tan(receipt | {'targetFitsHeader': modified.tostring()})
        modified = header.copy(); modified['CTYPE1'] = 'RA---TAN-SIP'; modified['CTYPE2'] = 'DEC--TAN-SIP'
        for keyword, value in [('A_ORDER', 2), ('B_ORDER', 2), ('A_2_0', .01), ('B_0_2', .01)]:
            modified[keyword] = value
        with self.assertRaisesRegex(ValueError, 'unsupported'):
            nominal_region_tan(receipt | {'targetFitsHeader': modified.tostring()})

    def test_arbitrary_full_region_uses_chunks_without_1024_ceiling(self):
        calls = []
        def lookup(world, *args):
            calls.append(len(world))
            return np.tile(np.array([1,2,510], dtype='<u4'), (len(world),1))
        result = build_cached_hips_region(**(self.options | dict(width=2050,height=33)), lookup=lookup)
        self.assertEqual(calls, [65536,2114])
        self.assertEqual(result.rgba.shape, (33,2050,4))
        self.assertTrue(result.report['completeOpaqueRgb'])
        self.assertTrue(np.all(result.rgba[:,:,:3] == [13,21,34]))
        self.assertEqual(result.report['decodedTileCache']['tileDecodes'], 1)

    def test_corrupt_native_input_changed_during_lookup_and_cancel_fail_closed(self):
        binding = self.tiles[0]['raw']
        original = self.tile.read_bytes()
        def changed(world, *args):
            self.tile.write_bytes(original + b'changed')
            return np.tile(np.array([1,2,510], dtype='<u4'), (len(world),1))
        try:
            with self.assertRaisesRegex(RuntimeError, 'identity_invalid'):
                build_cached_hips_region(**self.options, lookup=changed)
        finally:
            self.tile.write_bytes(original)
        self.assertEqual(bound_file(self.tile,root=ROOT), binding)
        with self.assertRaisesRegex(RuntimeError, 'cancelled'):
            build_cached_hips_region(**self.options, cancelled=lambda: True)
        with self.assertRaisesRegex(ValueError, 'budget'):
            build_cached_hips_region(**(self.options | dict(max_output_pixels=4)))

    def test_native_cell_centres_match_shared_orientation_and_legacy_protocol(self):
        code = """import {pixcoord2VecNest} from 'healpix-ts';
        const ns=2, rows=[[5,0,0],[5,511,0],[5,0,511],[31,123,456]];
        const world=rows.map(([tile,ne,nw])=>{const v=pixcoord2VecNest(ns,tile,(ne+.5)/512,(nw+.5)/512);
          return [(Math.atan2(v[1],v[0])*180/Math.PI+360)%360,Math.asin(v[2])*180/Math.PI];});
        console.log(JSON.stringify(world));"""
        process = subprocess.run(['node','tools/run-node.cjs','--input-type=module','-e',code],cwd=ROOT,capture_output=True,check=True)
        world = np.array(json.loads(process.stdout))
        addresses = lookup_world(world,1,ROOT)
        self.assertEqual(addresses.tolist(), [[5,0,511],[5,0,0],[5,511,511],[31,456,388]])
        repeated = np.tile(world[3], (64,1)).astype('<f8').tobytes()
        old = subprocess.run(['node','tools/run-node.cjs','data-pipelines/deep-sky/hips_tan_lookup.mjs','1','8'],
            input=repeated,cwd=ROOT,capture_output=True,check=True)
        new = lookup_world(np.frombuffer(repeated,dtype='<f8').reshape(-1,2),1,ROOT)
        self.assertEqual(old.stdout,new.tobytes())
        self.assertGreater(native_cell_step_degrees(1), native_cell_step_degrees(8))

    def test_complete_region_staging_cannot_admit_filled_missing_mask(self):
        addresses = np.tile(np.array([1,2,510],dtype='<u4'),(5,1))
        result = build_cached_hips_region(**self.options,lookup=lambda *args:addresses)
        image, mask = self.directory/'whole.png',self.directory/'supplied.png'
        image.write_bytes(result.png_bytes)
        Image.fromarray(np.full((1,5),255,dtype='uint8')).save(mask)
        row = {'reference':'M:61','inputPreparation':result.report,
            'wholeImage':bound_file(image,root=ROOT),'suppliedMask':bound_file(mask,root=ROOT)}
        prepared = self.directory/'prepared.json'
        def saved():
            prepared.write_text(json.dumps({'schemaVersion':'continuous-hips-region-trial-v1','rows':[row]}),encoding='utf8')
            return bound_file(prepared,root=ROOT)['sha256']
        with self.assertRaisesRegex(ValueError,'work_height'):
            stage_continuous_regions(prepared,saved(),self.directory/'too-short',root=ROOT,tools={},max_batch_pixels=100)
        # A fresh receipt may claim opaque RGB even when the separate supplied
        # mask records absence. Neither new hashes nor nonblack fill authorizes it.
        Image.fromarray(np.array([[255,255,0,255,255]],dtype='uint8')).save(mask)
        row['suppliedMask'] = bound_file(mask,root=ROOT)
        with self.assertRaisesRegex(ValueError,'claimed_coverage'):
            stage_continuous_regions(prepared,saved(),self.directory/'false-complete',root=ROOT,tools={},max_batch_pixels=100)


if __name__ == '__main__':
    unittest.main()
