"""Whole saved interior candidate numeric/LOD readback; bounded native witnesses.

Self-review only. The 23 source support windows and ten native coefficient
witness windows are reprojected; no filter, whole projection, coadd, fit or fetch.
"""
from pathlib import Path
import importlib.util
import json

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
GEN = ROOT / 'output/sdss-m82-recovered-aperture-interior-1004-r1'
OUT = ROOT / 'output/sdss-m82-recovered-aperture-interior-readback-1004-r2'
def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, TASK / 'scripts' / filename)
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value); return value
loader = module('loader', 'experience-m82-current-adaptive-recovery-2026-10-04.py')
witness = module('witness', 'readback-m82-recovered-aperture-regions-2026-10-04.py')
np, bind, save = loader.np, loader.bind, loader.save
from sdss_display_recovery import OtherScanDisplay, project_current_recovery_region
from sdss_adaptive_display import _display_support
from PIL import Image, ImageDraw
from astropy.visualization import make_lupton_rgb, ManualInterval, LuptonAsinhStretch


def main():
    assert not OUT.exists(); OUT.mkdir(); (OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    inputs = {}
    def pin(path, expected=None):
        actual = bind(path)
        if expected is not None: assert actual == expected
        prior = inputs.setdefault(actual['path'], actual); assert prior == actual
        return actual
    pin(Path(__file__)); pin(Path(witness.__file__))
    path = GEN / 'result.json'; result_pin = pin(path); result = json.loads(path.read_bytes())
    before = json.loads((GEN / 'inputs-before.json').read_bytes())
    after = json.loads((GEN / 'inputs-after.json').read_bytes()); assert before == after
    for item in before: pin(ROOT / item['path'], item)
    for item in result['outputsBeforeResult']: pin(ROOT / item['path'], item)
    path = loader.DISPLAY / 'result.json'; pin(path)
    master, parent, sources = loader.load_saved_inputs(json.loads(path.read_bytes()), pin)
    def document(meta):
        path = ROOT / meta['path']; pin(path, meta); return json.loads(path.read_bytes()), path.parent
    current, current_dir = document(result['candidate'])
    baseline, baseline_dir = document(result['recoveryCandidate'])
    def array(meta, directory):
        path = directory / meta['file']; actual = pin(path)
        assert (actual['bytes'], actual['sha256']) == (meta['bytes'], meta['sha256'])
        value = np.load(path, mmap_mode='r', allow_pickle=False)
        assert value.dtype.str == meta['dtype'] and list(value.shape) == meta['shape']; return value
    old = {b: array(baseline['arrays'][b], baseline_dir) for b in 'gri'}
    estimates = {b: array(current['arrays'][b], current_dir) for b in 'gri'}
    supply = array(baseline['arrays']['alternative-supply'], baseline_dir)
    maps = {key: array(current['arrays'][key], current_dir) for key in ('qualified','radius','reached','protected','affected')}
    raw = np.stack([np.where(supply, old[b], master.bands[b].data) for b in 'gri'])
    q, strong, affected, radius = (maps[key] for key in ('qualified','protected','affected','radius'))
    recovery = OtherScanDisplay(old, supply, baseline)
    # Candidate exterior maps deliberately retain parent history. Actual source
    # support at those positions is separate and must come from native sampling.
    # Never promote saved q|supply into source qualification.
    support_q = np.zeros(q.shape,bool); support_strong = np.zeros(q.shape,bool); support_seen = np.zeros(q.shape,bool)
    support_records = []
    for region_report in current['regions']:
        x0,y0,x1,y1 = region_report['sampling']['supportBoundsXYExclusive']; region = slice(y0,y1),slice(x0,x1)
        samples = project_current_recovery_region(master,parent,recovery,sources,region)
        actual_q, actual_strong = _display_support(samples.values,samples.eligible,list(samples.stencils.values()))
        np.testing.assert_array_equal(samples.values, raw[:,region[0],region[1]])
        assert samples.report == region_report['sampling']
        seen = support_seen[region]
        np.testing.assert_array_equal(actual_q[seen],support_q[region][seen])
        np.testing.assert_array_equal(actual_strong[seen],support_strong[region][seen])
        support_q[region] = actual_q; support_strong[region] = actual_strong; support_seen[region] = True
        tx0,ty0,tx1,ty1 = region_report['targetBoundsXYExclusive']; target = slice(ty0,ty1),slice(tx0,tx1)
        np.testing.assert_array_equal(q[target],support_q[target]); np.testing.assert_array_equal(strong[target],support_strong[target])
        support_records.append({'boundsXYExclusive':[x0,y0,x1,y1],'actualSamplingExact':True,
            'sourceQualified':int(actual_q.sum()),'sourceProtected':int(actual_strong.sum())})
        del samples,actual_q,actual_strong
    perimeter = np.ones(q.shape, bool); perimeter[8:-8,8:-8] = False
    for key in ('qualified','radius','reached','protected'):
        np.testing.assert_array_equal(maps[key][perimeter], getattr(parent,key)[perimeter])
    for b in 'gri':
        np.testing.assert_array_equal(estimates[b][~affected], old[b][~affected])
        np.testing.assert_array_equal(estimates[b][parent.protected], old[b][parent.protected])
    assert not affected[perimeter].any() and not (affected & (~q | strong)).any()
    means_checked = 0; fallback = 0; circles = {}
    for r in (1,2,4,8):
        dy, dx = np.mgrid[-r:r+1,-r:r+1]; circle = dx*dx+dy*dy <= r*r
        circles[r] = dy[circle], dx[circle]
    for cy, cx in np.argwhere(affected):
        r = int(radius[cy,cx]); expected = raw[:,cy,cx]
        if r > 0:
            assert r in circles; dy, dx = circles[r]; ys, xs = cy+dy, cx+dx
            assert support_seen[ys,xs].all() and support_q[ys,xs].all()
            selected = ~support_strong[ys,xs]; assert selected.any()
            expected = raw[:,ys[selected],xs[selected]].astype(np.float64).mean(axis=1).astype(np.float32)
            means_checked += 1
        else: assert r == -1; fallback += 1
        np.testing.assert_array_equal([estimates[b][cy,cx] for b in 'gri'], expected)
    changed = np.zeros(q.shape, bool)
    for b in 'gri': changed |= estimates[b] != old[b]
    assert int(changed.sum()) == current['changedEstimatePixels'] == result['changedEstimatePixels']
    assert int(affected.sum()) == current['affectedTargets']
    print(json.dumps({'actualMeansChecked': means_checked, 'rawFallback': fallback, 'changed': int(changed.sum())}), flush=True)
    # Stratified actual new apertures: independent native-coordinate/ID sums,
    # full support, signed stop, and original raw means on effective cohort weights.
    gates = []
    viable = np.argwhere(affected & (radius > 0))
    for cy, cx in viable[np.linspace(0,len(viable)-1,10,dtype=int)]:
        cy, cx = int(cy), int(cx); bounds = [cx-8,cy-8,cx+9,cy+9]
        samples = project_current_recovery_region(master,parent,recovery,sources,
            (slice(cy-8,cy+9),slice(cx-8,cx+9)))
        weights = {name.replace('/','-')+'-weight': value for name,value in samples.normalized_weights.items()}
        np.testing.assert_array_equal(samples.values, raw[:,cy-8:cy+9,cx-8:cx+9])
        local_q = support_q[cy-8:cy+9,cx-8:cx+9]
        local_strong = support_strong[cy-8:cy+9,cx-8:cx+9]
        chosen_radius = -1; reached = False; chosen_mean = raw[:,cy,cx]; checks = []
        for r in (1,2,4,8):
            dy, dx = circles[r]; ys, xs = 8+dy, 8+dx
            if not local_q[ys,xs].all(): break
            selected = np.zeros((17,17), bool); selected[ys,xs] = ~local_strong[ys,xs]
            upper, direct_raw, absolute, repeats = witness.original_aperture_noise(sources,weights,master,bounds,selected)
            mean = samples.values[:,selected].astype(np.float64).mean(axis=1)
            bound = (len(sources)+8)*np.finfo(np.float32).eps*absolute + len(sources)*np.finfo(np.float32).smallest_subnormal
            assert (np.abs(direct_raw-mean) <= bound).all()
            if not np.isfinite(upper).all() or (upper <= 0).any(): break
            chosen_radius = r; chosen_mean = mean.astype(np.float32); reached = bool((np.abs(mean)/np.sqrt(upper) >= 3).all())
            checks.append({'radius': r,'selected': int(selected.sum()),'conditionalNativeUpper': upper.tolist(),
                'rawMeanGri': mean.tolist(),'directOriginalNativeRawMeanGri': direct_raw.tolist(),
                'residualGri': np.abs(direct_raw-mean).tolist(),'derivedFloat32BoundGri': bound.tolist(),
                'conditionalRatioReached': reached,'nativeRepeats': repeats})
            if reached: break
        assert chosen_radius == radius[cy,cx] and reached == maps['reached'][cy,cx]
        np.testing.assert_array_equal(chosen_mean, [estimates[b][cy,cx] for b in 'gri'])
        gates.append({'globalXY': [cx,cy], 'radius': chosen_radius,'reached': reached,'checks': checks,
            'actualSampling': samples.report}); del samples
    recipe = current['sourceResolvedRecipe']; assert recipe == baseline['sourceResolvedRecipe'] == parent.report['sourceResolvedRecipe']
    def rgb(values):
        return make_lupton_rgb(values['i'],values['r'],values['g'],interval=ManualInterval(vmin=0,vmax=None),
            stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
    sheet = Image.new('RGB',(1024,1608),'#181818'); draw = ImageDraw.Draw(sheet); levels = []
    for at,(level,meta) in enumerate(current['levels'].items()):
        x0,y0,x1,y1 = meta['crop']['boundsXYExclusive']; factor = meta['crop']['boxFactor']; region = slice(y0,y1),slice(x0,x1)
        count = master.joint_available[region].reshape(512,factor,512,factor).sum(axis=(1,3)); means = {}
        for b in 'gri':
            total = np.where(master.joint_available[region],estimates[b][region],0).astype(np.float64).reshape(512,factor,512,factor).sum(axis=(1,3))
            means[b] = np.divide(total,count,out=np.zeros_like(total),where=count>0).astype(np.float32)
        alpha = np.rint(count.astype(float)*255/factor**2).astype(np.uint8)
        path = current_dir/meta['file']; actual = np.array(Image.open(path)); pin(path)
        np.testing.assert_array_equal(actual,np.dstack([rgb(means),alpha]))
        old_meta = baseline['levels'][level]; old_path = baseline_dir/old_meta['file']; pin(old_path)
        old_pixels = np.array(Image.open(old_path)); np.testing.assert_array_equal(actual[:,:,3],old_pixels[:,:,3])
        for key in ('pixels','fieldDegrees','wcsHeader'): assert meta[key] == old_meta[key]
        for column,(label,pixels) in enumerate((('current-v3',old_pixels),('actual interior increment',actual))):
            draw.text((column*512+4,at*536+4),level+' / '+label,fill='white'); sheet.paste(Image.fromarray(pixels[:,:,:3]),(column*512,at*536+24))
        levels.append({'level':level,'numericRGBAlphaWcsExact':True,'changedRgbPixels':int(np.any(actual[:,:,:3]!=old_pixels[:,:,:3],axis=2).sum()),'png':pin(path)})
    sheet.save(OUT/'actual-full-lod-pairs.png')
    old_rgb,new_rgb = rgb(old),rgb(estimates)
    path = ROOT/'output/sdss-m82-recovered-native-apertures-1004-r1/result.json'; pin(path); patches = json.loads(path.read_bytes())['patches']
    sheet = Image.new('RGB',(512,1400),'#181818'); draw = ImageDraw.Draw(sheet); patch_facts = []
    for at,patch in enumerate(patches):
        x0,y0,x1,y1 = patch['boundsXYExclusive']; region = slice(y0,y1),slice(x0,x1)
        draw.text((4,at*280+4),patch['name']+' / current-v3 / actual interior increment',fill='white')
        for column,pixels in enumerate((old_rgb,new_rgb)):
            sheet.paste(Image.fromarray(pixels[region]).resize((256,256),Image.Resampling.NEAREST),(column*256,at*280+24))
        patch_facts.append({'name':patch['name'],'boundsXYExclusive':patch['boundsXYExclusive'],
            'affected':int(affected[region].sum()),'changedRgbPixels':int(np.any(old_rgb[region]!=new_rgb[region],axis=2).sum())})
    sheet.save(OUT/'actual-patch-pairs.png')
    for item in inputs.values(): assert bind(ROOT/item['path']) == item
    save(OUT/'result.json',{'scope':__doc__,'producerResult':result_pin,'inputs':list(inputs.values()),'inputsAfterExact':True,
        'affected':int(affected.sum()),'actualCommonMeansChecked':means_checked,'rawFallback':fallback,
        'changedEstimates':int(changed.sum()),'nativeConditionalWitnesses':gates,'levels':levels,'patches':patch_facts,
        'actualSourceSupports':support_records,'candidateExteriorDiagnosticsRemainHistorical':True,
        'unaffectedStrongExteriorExact':True,'originalScienceCoverageRecipeBound':True,'boundedSourceWindowProjections':len(gates)+len(support_records),
        'wholeProjectionFilterCoaddFitRuns':0,'sourceRequests':0,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'})
    print(json.dumps({'result':bind(OUT/'result.json'),'means':means_checked,'nativeWitnesses':len(gates),'levels':levels,'patches':patch_facts}),flush=True)


if __name__=='__main__':
    try: main()
    except Exception as error:
        if OUT.exists(): save(OUT/'failed.json',{'type':type(error).__name__,'error':str(error)})
        raise
