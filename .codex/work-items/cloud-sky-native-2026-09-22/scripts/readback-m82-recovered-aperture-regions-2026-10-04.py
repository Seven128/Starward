"""Saved incremental regions: full raw means/RGB, bounded original-native gates.

No filter or full-source projection replay. Root readback is self-review, not
independent review, absolute registration/PSF or image-quality acceptance.
"""
from pathlib import Path
import importlib.util
import json
import math

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
GEN = ROOT / 'output/sdss-m82-recovered-aperture-regions-1004-r1'
PREREQUISITE = ROOT / 'output/sdss-m82-recovered-native-apertures-1004-r1'
OUT = ROOT / 'output/sdss-m82-recovered-aperture-regions-readback-1004-r1'
spec = importlib.util.spec_from_file_location('loader', TASK / 'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py')
loader = importlib.util.module_from_spec(spec); spec.loader.exec_module(loader)
np,bind,save = loader.np,loader.bind,loader.save
from sdss_frame_noise import native_noise_samples
from astropy.visualization import make_lupton_rgb,ManualInterval,LuptonAsinhStretch
from PIL import Image


def original_aperture_noise(sources,maps,master,bounds,selected):
    y,x=np.where(selected);x0,y0,_,_=bounds
    ra,dec=master.target.all_pix2world(x+x0,master.joint_available.shape[0]-1-y-y0,0)
    count=len(y);variances=[];actual_raw=np.zeros(3);absolute=np.zeros(3);repeats=[]
    for name,bands in sources.items():
        key=name.replace('/','-')+'-weight'
        if key not in maps:continue
        weight=maps[key][selected];field_variance=[];field_repeats=[]
        for band_at,band in enumerate('gri'):
            source=bands[band];frame=source.frame
            sx,sy=frame.wcs.all_world2pix(ra,dec,0)
            geometry=np.isfinite(sx)&np.isfinite(sy)&(sx>=0)&(sy>=0)&(sx<frame.data.shape[1]-1)&(sy<frame.data.shape[0]-1)
            assert geometry[weight>0].all()
            nx,ny=np.full(sx.shape,-1,np.int64),np.full(sy.shape,-1,np.int64)
            nx[geometry],ny[geometry]=np.floor(sx[geometry]).astype(np.int64),np.floor(sy[geometry]).astype(np.int64)
            xx,yy=np.stack([nx,nx+1,nx,nx+1]),np.stack([ny,ny,ny+1,ny+1])
            fx,fy=np.where(geometry,sx-nx,0),np.where(geometry,sy-ny,0)
            coefficient=np.stack([(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy])*weight/count
            active=coefficient>0;native=native_noise_samples(frame,source.camera,xx,yy)
            assert native.available[active].all()
            ids=yy*frame.data.shape[1]+xx;combined={};raw=[]
            for index,c,v in zip(ids[active],coefficient[active],native.variance_nmgy_squared[active]):
                if int(index) not in combined:combined[int(index)]=[0.,float(v)]
                assert combined[int(index)][1]==v
                combined[int(index)][0]+=float(c);raw.append(float(frame.data.ravel()[index])*float(c))
            field_variance.append(math.fsum(c*c*v for c,v in combined.values()))
            field_repeats.append(int(active.sum())-len(combined))
            actual_raw[band_at]+=math.fsum(raw);absolute[band_at]+=math.fsum(abs(v) for v in raw)
        variances.append(field_variance);repeats.append({'field':name,'repeatedNativeContributions':field_repeats})
    upper=np.array([math.fsum(math.sqrt(v[b]) for v in variances)**2 for b in range(3)])
    return upper,actual_raw,absolute,repeats


def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    inputs={}
    def pin(path,expected=None):
        actual=bind(path)
        if expected is not None:assert actual==expected
        prior=inputs.setdefault(actual['path'],actual);assert prior==actual
        return actual
    result_path=GEN/'result.json';pin(result_path);result=json.loads(result_path.read_bytes())
    assert pin(result_path)['sha256']=='c3882f888f439eaf96e4228d4fb7ba1b65af4a94345fdfd6bb941a09db075bea'
    for item in result['inputs']+result['outputsBeforeResult']:pin(ROOT/item['path'],item)
    pin(Path(__file__));path=loader.DISPLAY/'result.json';pin(path)
    master,parent,sources=loader.load_saved_inputs(json.loads(path.read_bytes()),pin)
    facts=[];gates=[];means_checked=0;changed_total=0;rgb_total=0
    for patch in result['patches']:
        path=ROOT/patch['regionReport']['path'];pin(path,patch['regionReport']);report=json.loads(path.read_bytes())
        path=ROOT/patch['arrays']['path'];pin(path,patch['arrays'])
        with np.load(path,allow_pickle=False) as archive:region={key:archive[key] for key in archive.files}
        path=PREREQUISITE/(patch['name']+'-samples.npz');pin(path)
        with np.load(path,allow_pickle=False) as archive:maps={key:archive[key] for key in archive.files}
        raw=maps['rawDisplaySamplingGri'];q=maps['sourceQualified'];strong=maps['strongSigned'];local=slice(8,-8),slice(8,-8)
        np.testing.assert_array_equal(region['qualified'],q[local]);np.testing.assert_array_equal(region['protected'],strong[local])
        affected=region['affected'];expected=region['baselineGri'].copy();radii=region['radius'];target=report['targetBoundsXYExclusive']
        np.testing.assert_array_equal(region['estimates'][:,~affected],expected[:,~affected])
        for cy,cx in np.argwhere(affected):
            r=int(radii[cy,cx]);y,x=int(cy+8),int(cx+8)
            if r<1:expected[:,cy,cx]=raw[:,y,x];continue
            assert r in (1,2,4,8)
            dy,dx=np.mgrid[-r:r+1,-r:r+1];circle=dx*dx+dy*dy<=r*r
            ys,xs=y+dy[circle],x+dx[circle];assert q[ys,xs].all()
            selected=~strong[ys,xs];assert selected.any() and not strong[y,x]
            expected[:,cy,cx]=raw[:,ys[selected],xs[selected]].astype(np.float64).mean(axis=1).astype(np.float32)
            means_checked+=1
        np.testing.assert_array_equal(region['estimates'],expected)
        changed=int(np.any(region['estimates']!=region['baselineGri'],axis=0).sum());assert changed==patch['changedEstimatePixels']
        changed_total+=changed
        recipe=report['sampling']['sourceResolvedRecipe'];images=[]
        for suffix,values in (('before',region['baselineGri']),('after',region['estimates'])):
            pixels=make_lupton_rgb(values[2],values[1],values[0],interval=ManualInterval(vmin=0,vmax=None),
                stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
            path=GEN/(patch['name']+'-'+suffix+'.png');pin(path);actual=np.array(Image.open(path));images.append(actual)
            np.testing.assert_array_equal(actual[:,:,:3],pixels)
            np.testing.assert_array_equal(actual[:,:,3],master.joint_available[target[1]:target[3],target[0]:target[2]].astype(np.uint8)*255)
        rgb=int(np.any(images[0][:,:,:3]!=images[1][:,:,:3],axis=2).sum());assert rgb==patch['rgbChangedPixels'];rgb_total+=rgb
        viable=np.argwhere(affected&(radii>0))
        if len(viable):
            for cy,cx in viable[np.linspace(0,len(viable)-1,5,dtype=int)]:
                y,x=int(cy+8),int(cx+8);chosen_radius=-1;chosen_reached=False;chosen_mean=raw[:,y,x];checks=[]
                for r in (1,2,4,8):
                    dy,dx=np.mgrid[-r:r+1,-r:r+1];circle=dx*dx+dy*dy<=r*r;ys,xs=y+dy[circle],x+dx[circle]
                    if not q[ys,xs].all():break
                    selected=np.zeros(q.shape,bool);selected[ys,xs]=~strong[ys,xs]
                    upper,direct_raw,absolute,repeated=original_aperture_noise(sources,maps,master,report['sampling']['supportBoundsXYExclusive'],selected)
                    mean=raw[:,selected].astype(np.float64).mean(axis=1)
                    bound=(len(sources)+8)*np.finfo(np.float32).eps*absolute+len(sources)*np.finfo(np.float32).smallest_subnormal
                    assert (np.abs(direct_raw-mean)<=bound).all()
                    if not np.isfinite(upper).all() or (upper<=0).any():break
                    chosen_radius=r;chosen_mean=mean.astype(np.float32);chosen_reached=bool((np.abs(mean)/np.sqrt(upper)>=3).all())
                    checks.append({'radius':r,'selected':int(selected.sum()),'conditionalNativeUpper':upper.tolist(),
                        'rawMeanGri':mean.tolist(),'directOriginalNativeRawMeanGri':direct_raw.tolist(),
                        'rawMeanResidualGri':np.abs(direct_raw-mean).tolist(),'derivedFloat32BoundGri':bound.tolist(),
                        'commonConditionalRatioReached':chosen_reached,'nativeRepeats':repeated})
                    if chosen_reached:break
                assert chosen_radius==radii[cy,cx] and chosen_reached==region['reached'][cy,cx]
                np.testing.assert_array_equal(chosen_mean,region['estimates'][:,cy,cx])
                gates.append({'patch':patch['name'],'globalXY':[int(cx+target[0]),int(cy+target[1])],
                    'radius':chosen_radius,'reached':chosen_reached,'checks':checks})
        facts.append({'name':patch['name'],'affected':int(affected.sum()),'changedEstimates':changed,'changedRGB':rgb,
            'numericMeansExact':True,'fullPNGAndOriginalAlphaExact':True,'unaffectedCurrentExact':True})
    assert len(gates)==10 and changed_total==7759 and rgb_total==7710
    for item in inputs.values():assert bind(ROOT/item['path'])==item
    save(OUT/'result.json',{'scope':__doc__,'producerResult':pin(result_path),'inputs':list(inputs.values()),'inputsAfterExact':True,
        'allAffectedNumericCommonMeansChecked':means_checked,'changedEstimates':changed_total,'changedRGB':rgb_total,
        'patches':facts,'actualNativeConditionalStopChecks':gates,'originalScienceCoverageRecipeUntouched':True,
        'filterOrWholeProjectionRuns':0,'sourceRequests':0,'ordinaryAdoption':False,'quality':'UNVERIFIED','independentReview':'MISSING'})
    print(json.dumps({'result':bind(OUT/'result.json'),'commonMeans':means_checked,'nativeWitnesses':len(gates),'changedEstimates':changed_total,'changedRGB':rgb_total}))


if __name__=='__main__':
    try:main()
    except Exception as error:
        if OUT.exists():save(OUT/'failed.json',{'type':type(error).__name__,'error':str(error)})
        raise
