"""One cached offline writer generation. No source/GPU/network/runtime adoption."""
from pathlib import Path
import io
import json
import sys
import unittest

ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import publish_sdss_science as writer
from image_quality import digest

OUT=ROOT/'output/sdss-science-optical-writer-1002-r1'
CACHED=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'

def bind(p):return writer.bound_file(p,root=ROOT)
def inventory(p):return [bind(v) for v in sorted(p.rglob('*')) if v.is_file()]

def main():
    OUT.mkdir(exist_ok=False)
    (OUT/'executed-script.py.txt').write_bytes(Path(__file__).read_bytes())
    old_assets=ROOT/'workers/miniapp-api/assets/deep-sky'
    preserved=json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_text(encoding='utf8'))
    before={'cached':inventory(CACHED),'oldAssets':inventory(old_assets),'preserved':[bind(ROOT/v['path']) for v in preserved]}
    assert [{'path':v['path'],'sha256':v['sha256']} for v in before['preserved']]==preserved
    cached_binding=json.loads((CACHED/'binding.json').read_text(encoding='utf8'))
    assert before['oldAssets']==cached_binding['oldAssetsAfter']
    (OUT/'binding-before.json').write_text(json.dumps(before,indent=2)+'\n',encoding='utf8')
    try:
        log=io.StringIO()
        suite=unittest.defaultTestLoader.discover(str(ROOT/'data-pipelines/deep-sky'),pattern='test_publish_sdss_science.py')
        checks=unittest.TextTestRunner(stream=log,verbosity=2).run(suite)
        (OUT/'writer-tests.log').write_text(log.getvalue(),encoding='utf8')
        if not checks.wasSuccessful():raise RuntimeError('writer_boundary_regressions_failed')
        candidate_sha='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
        binding_sha='bc2af0aafc316986c6e55ae75a144074421b930dad2273c001809803585c087d'
        verified=writer.verify_cached_candidate(CACHED,root=ROOT,candidate_sha256=candidate_sha,binding_sha256=binding_sha)
        receipt=writer.publish_verified_candidate(verified,OUT/'publication',root=ROOT,
                   publication_id='sdss-dr17-m51-science.task20261002',
                   legacy_manifest=old_assets/'sdss-m51/manifest.json')
        manifest=json.loads((OUT/'publication/manifest.json').read_text(encoding='utf8'))
        png_checks=[]
        for level,asset in manifest['levels'].items():
            original=CACHED/verified.candidate['levels'][level]['file']
            actual=OUT/'publication'/asset['file']
            assert actual.read_bytes()==original.read_bytes()
            png_checks.append({'level':level,'published':bind(actual),'cached':bind(original),'allEncodedBytesEqual':True,
                               'fieldDegrees':asset['fieldDegrees'],'crpixFitsOneBased':asset['crpixFitsOneBased'],
                               'sampleAvailability':asset['sampleAvailability'],'boxFactor':asset['masterCrop']['boxFactor']})
        after={'cached':inventory(CACHED),'oldAssets':inventory(old_assets),'preserved':[bind(ROOT/v['path']) for v in preserved]}
        assert before==after
        (OUT/'binding-after.json').write_text(json.dumps(after,indent=2)+'\n',encoding='utf8')
        report={'status':'ACTUAL_CACHED_OFFLINE_WRITER_PASSED','manifest':bind(OUT/'publication/manifest.json'),
                'writerReceipt':bind(OUT/'publication/writer-receipt.json'),'publicationHash':manifest['publicationHash'],
                'writer':bind(ROOT/'data-pipelines/deep-sky/publish_sdss_science.py'),
                'tests':bind(ROOT/'data-pipelines/deep-sky/test_publish_sdss_science.py'),'script':bind(Path(__file__)),
                'tsContract':bind(ROOT/'packages/miniapp-contracts/src/sdss-science-optical-publication.ts'),
                'nodeCli':bind(ROOT/'data-pipelines/deep-sky/pack_sdss_science_publication.mts'),
                'testsRun':checks.testsRun,'pngs':png_checks,
                'scienceCounts':{band:{'zero':int((value.data[verified.master.joint_available]==0).sum()),
                                      'negative':int((value.data[verified.master.joint_available]<0).sum())}
                                 for band,value in verified.master.bands.items()},
                'cachedFilesPreserved':len(before['cached']),'oldAssetFilesPreserved':len(before['oldAssets']),
                'preservedSettingsOutbox':before['preserved'],'encodedPngFamilyBytes':sum(v['bytes'] for v in manifest['levels'].values()),
                'jointAvailablePixels':manifest['master']['jointAvailability']['availablePixels'],
                'originalRecipe':verified.candidate['display']['transfer'],'currentReproducedRecipe':verified.transfer,
                'scope':'One new exclusive, opt-in offline publication; same cached science/joint/RGB and original three availability PNG. Node shared contract owns publication canonical/hash. No new FITS read, reprojection, per-level transfer, acquisition/download, GPU, old source/publication mutation, default registry or runtime/source-quality adoption.'}
        (OUT/'result.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
        print(json.dumps({'output':str(OUT.relative_to(ROOT)),'result':bind(OUT/'result.json'),'manifest':report['manifest'],
                          'publicationHash':manifest['publicationHash']}))
    except Exception as error:
        (OUT/'failed.json').write_text(json.dumps({'status':'ACTUAL_WRITER_GENERATION_FAILED','error':repr(error)},indent=2)+'\n',encoding='utf8')
        raise

if __name__=='__main__':main()
