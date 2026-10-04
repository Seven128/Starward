"""Existing recovery/common-aperture owners on saved real M82 bounded regions.

No whole filter, coadd, source acquisition, exterior guesses or adoption.
The sampling owner must exactly realize the saved r81 raw native evidence.
"""
from pathlib import Path
import importlib.util
import json
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
PREREQUISITE = ROOT / 'output/sdss-m82-recovered-native-apertures-1004-r1'
GEN = ROOT / 'output/sdss-m82-current-adaptive-recovery-1004-r1'
OUT = ROOT / 'output/sdss-m82-recovered-aperture-regions-1004-r1'
spec = importlib.util.spec_from_file_location('loader', TASK / 'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py')
loader = importlib.util.module_from_spec(spec); spec.loader.exec_module(loader)
np, bind, save = loader.np, loader.bind, loader.save
from sdss_display_recovery import OtherScanDisplay, refine_current_recovery_display_region
from image_quality import digest
from astropy.visualization import make_lupton_rgb, ManualInterval, LuptonAsinhStretch
from PIL import Image, ImageDraw


def main():
    assert not OUT.exists(); OUT.mkdir()
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    inputs = {}
    def pin(path, expected=None):
        actual = bind(path)
        if expected is not None: assert actual == expected
        prior = inputs.setdefault(actual['path'], actual); assert prior == actual
        return actual
    checkpoint_path = TASK / 'evidence/current-execution-state-2026-10-04-r81.json'; pin(checkpoint_path)
    checkpoint = json.loads(checkpoint_path.read_bytes()); changed = []
    allowed = {'data-pipelines/deep-sky/sdss_display_recovery.py','data-pipelines/deep-sky/sdss_adaptive_display.py',
        'data-pipelines/deep-sky/test_sdss_display_recovery.py'}
    for item in checkpoint['currentSources']:
        actual = bind(ROOT / item['path'])
        if actual != item:
            assert item['path'] in allowed
            record = {'previous': item, 'current': pin(ROOT / item['path']), 'reason': 'Existing Sky offline owner/cohort sharing/targeted kernel or relocated meaningful guard mutation.'}
            if item['path'].endswith('/sdss_display_recovery.py') or item['path'].endswith('/sdss_adaptive_display.py'):
                old = GEN / ('executed-' + Path(item['path']).name); archive = pin(old)
                assert (archive['sha256'],archive['bytes']) == (item['sha256'],item['bytes'])
                record['previousExecutedArchive'] = archive
            changed.append(record)
    assert {v['previous']['path'] for v in changed} == allowed
    for item in checkpoint['protected'] + checkpoint['evidence']: assert bind(ROOT / item['path']) == item
    pin(Path(__file__)); pin(Path(loader.__file__))
    for name in ('sdss_display_recovery.py','sdss_adaptive_display.py','sdss_noise_aperture.py','sdss_noise_display.py',
                 'sdss_frame_noise.py','sdss_gri_tan.py','sdss_source_stencil.py','sdss_frame_quality.py','sdss_corrected_frame.py'):
        path = ROOT / 'data-pipelines/deep-sky' / name; pin(path)
        (OUT / ('executed-' + name)).write_bytes(path.read_bytes())
    pin(ROOT / 'data-pipelines/deep-sky/test_sdss_recovered_apertures.py')
    path = loader.DISPLAY / 'result.json'; pin(path)
    master,parent,sources = loader.load_saved_inputs(json.loads(path.read_bytes()),pin)
    path = GEN / 'result.json'; pin(path); current = json.loads(path.read_bytes())
    saved_path = ROOT / current['candidate']['path']; pin(saved_path,current['candidate']); saved = json.loads(saved_path.read_bytes())
    def array(meta):
        path = saved_path.parent / meta['file']; actual = pin(path)
        assert (actual['bytes'],actual['sha256']) == (meta['bytes'],meta['sha256'])
        return np.load(path,mmap_mode='r',allow_pickle=False)
    recovery = OtherScanDisplay({b:array(saved['arrays'][b]) for b in 'gri'},array(saved['arrays']['alternative-supply']),saved)
    path = PREREQUISITE / 'result.json'; pin(path); prerequisite = json.loads(path.read_bytes())
    recipe = saved['sourceResolvedRecipe']; records = []
    sheet = Image.new('RGB',(672,1290),'#181818'); draw = ImageDraw.Draw(sheet)
    draw.text((4,4),'Actual frozen RGB: current saved / raw-source aperture increment / affected centres',fill='white')
    total_started,total_cpu = time.perf_counter(),time.process_time()
    for at,patch in enumerate(prerequisite['patches']):
        x0,y0,x1,y1 = patch['boundsXYExclusive']; target = slice(y0+8,y1-8),slice(x0+8,x1-8)
        path = PREREQUISITE / (patch['name']+'-samples.npz'); pin(path)
        with np.load(path,allow_pickle=False) as archive: expected = {key:archive[key] for key in archive.files}
        started,cpu = time.perf_counter(),time.process_time()
        region = refine_current_recovery_display_region(master,parent,recovery,sources,target,batch_size=64)
        seconds,cpu_seconds = time.perf_counter()-started,time.process_time()-cpu
        sampling = region.report['sampling']
        assert sampling['samplingCOrderSha256']['rawSamplingGri'] == digest(expected['rawDisplaySamplingGri'].tobytes())
        assert sampling['commonFieldWeightCOrderSha256'] == {key[:-7].replace('-', '/'):digest(value.tobytes())
            for key,value in expected.items() if key.endswith('-weight')}
        np.testing.assert_array_equal(region.qualified,expected['sourceQualified'][8:-8,8:-8])
        np.testing.assert_array_equal(region.protected,expected['strongSigned'][8:-8,8:-8])
        old = np.stack([recovery.estimates[b][target] for b in 'gri'])
        np.testing.assert_array_equal(region.estimates[:,~region.affected],old[:,~region.affected])
        np.testing.assert_array_equal(region.estimates[:,parent.protected[target]],old[:,parent.protected[target]])
        payload = dict(estimates=region.estimates,qualified=region.qualified,radius=region.radius,reached=region.reached,
            protected=region.protected,affected=region.affected,baselineGri=old)
        np.savez_compressed(OUT / (patch['name']+'-region.npz'),**payload)
        save(OUT / (patch['name']+'-region.json'),region.report)
        images = []
        for suffix,values in (('before',old),('after',region.estimates)):
            rgb = make_lupton_rgb(values[2],values[1],values[0],interval=ManualInterval(vmin=0,vmax=None),
                stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
            rgba = np.dstack([rgb,master.joint_available[target].astype(np.uint8)*255])
            Image.fromarray(rgba).save(OUT / (patch['name']+'-'+suffix+'.png')); images.append(rgb)
        roles = np.full((*region.affected.shape,3),28,np.uint8); roles[~region.qualified]=[220,60,60]
        roles[region.protected]=[65,115,220]; roles[region.affected]=[55,195,95]
        draw.text((4,28+at*250),patch['name']+' / complete real8pixel source halo / unchanged current fallback',fill='white')
        for column,pixels in enumerate((*images,roles)):
            sheet.paste(Image.fromarray(pixels).resize((224,224),Image.Resampling.NEAREST),(224*column,48+at*250))
        rgb_changes = int(np.any(images[0]!=images[1],axis=2).sum())
        records.append({'name':patch['name'],'targetBoundsXYExclusive':region.report['targetBoundsXYExclusive'],
            'supportBoundsXYExclusive':sampling['supportBoundsXYExclusive'],'sourceSamplingMatchesR81':True,
            'affectedTargets':region.report['affectedTargets'],'changedEstimatePixels':region.report['changedEstimatePixels'],
            'rgbChangedPixels':rgb_changes,'unaffectedEstimatesExact':True,'originalStrongColourExact':True,
            'seconds':seconds,'cpuSeconds':cpu_seconds,'regionReport':pin(OUT/(patch['name']+'-region.json')),
            'arrays':pin(OUT/(patch['name']+'-region.npz'))})
        print(json.dumps(records[-1]),flush=True)
    sheet.save(OUT/'actual-regional-frozen-rgb-pairs.png')
    before = list(inputs.values()); after = [bind(ROOT/value['path']) for value in before]; assert after==before
    for item in checkpoint['protected']+checkpoint['evidence']: assert bind(ROOT/item['path'])==item
    assert sum(row['changedEstimatePixels'] for row in records)>0 and sum(row['rgbChangedPixels'] for row in records)>0
    for row in records:
        if row['name'] in ('core','diffuse','field-transition'): assert row['affectedTargets']==row['changedEstimatePixels']==0
    outputs = [bind(path) for path in OUT.rglob('*') if path.is_file()]
    report = {'scope':__doc__,'checkpoint':pin(checkpoint_path),'previousSourcesExplicitlyChanged':changed,
        'inputs':before,'inputsAfterExact':True,'previousProtectedAndEvidenceExact':True,'patches':records,
        'outputsBeforeResult':outputs,'newLogicalBytesBeforeResult':sum(v['bytes'] for v in outputs),
        'seconds':time.perf_counter()-total_started,'cpuSeconds':time.process_time()-total_cpu,'processMemory':loader.memory(),
        'sourceRequests':0,'wholeFilterCoaddCoverageOrHaloRuns':0,'fullCandidateAssembly':False,
        'ordinaryAdoption':False,'quality':'UNVERIFIED','independentReview':'MISSING'}
    save(OUT/'result.json',report);print(json.dumps({'result':bind(OUT/'result.json'),'memory':loader.memory()}))


if __name__=='__main__':
    try:main()
    except Exception as error:
        if OUT.exists():save(OUT/'failed.json',{'type':type(error).__name__,'error':str(error)})
        raise
