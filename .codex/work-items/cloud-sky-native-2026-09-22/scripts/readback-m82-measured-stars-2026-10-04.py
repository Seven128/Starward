"""Original M82 FITS/PSF and saved stellar arithmetic, without fit replay."""
from pathlib import Path
import hashlib,json,sys,csv,io,math
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from scipy.interpolate import RectBivariateSpline
from astropy.io import fits
from astropy.wcs import WCS
from astropy.coordinates import SkyCoord
from PIL import Image
GEN=ROOT/'output/sdss-m82-measured-stars-1004-r4';OUT=ROOT/'output/sdss-m82-measured-stars-readback-1004-r3'

def bind(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def save(p,v):
    with p.open('x',encoding='utf-8') as f:json.dump(v,f,indent=2,allow_nan=False);f.write('\n')
def separation(a,b):
    return float(SkyCoord(*a,unit='deg',frame='icrs').separation(SkyCoord(*b,unit='deg',frame='icrs')).arcsec)
def moment(a,cx,cy):
    yy,xx=np.indices(a.shape);rad=np.hypot(xx-cx,yy-cy)
    base=float(np.median(a[(rad>=10)&(rad<=12)]));use=rad<=7
    weights=np.clip(a.astype(float)-base,0,None)*use;total=float(weights.sum())
    if total<=0 or not np.isfinite(total):return None
    return np.array([(weights*xx).sum()/total,(weights*yy).sum()/total])

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    result=json.loads((GEN/'result.json').read_bytes());before=json.loads((GEN/'inputs-before.json').read_bytes())
    assert before==json.loads((GEN/'inputs-after.json').read_bytes())
    for item in before:assert bind(ROOT/item['path'])==item
    inputs=before+[bind(GEN/'result.json'),bind(Path(__file__))]
    science=json.loads((ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate/candidate.json').read_bytes())
    full=json.loads((ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate/candidate.json').read_bytes())
    sciencebase=ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate';fullbase=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate'
    planes={b:np.load(sciencebase/science['arrays'][b+'-science']['file'],mmap_mode='r',allow_pickle=False) for b in 'gri'}
    current={b:np.load(fullbase/full['arrays'][b]['file'],mmap_mode='r',allow_pickle=False) for b in 'gri'}
    q=np.load(fullbase/full['arrays']['qualified']['file'],mmap_mode='r',allow_pickle=False)
    # Serialized FITS-header decimal cards lose the exact retained center/step.
    # Rebuild the original declared grid from retained scalar parameters; do
    # not relax pixel residual tolerance or change any producer output.
    serialized_target=WCS(science['wcsHeader']);target=WCS(naxis=2)
    target.wcs.ctype=['RA---TAN','DEC--TAN'];target.wcs.cunit=['deg','deg'];target.wcs.radesys='ICRS'
    target.wcs.crval=[science['center']['raDeg'],science['center']['decDeg']]
    target.wcs.crpix=[(science['pixels']+1)/2]*2
    step=math.degrees(2*math.tan(math.radians(science['fieldDegrees'])/2)/science['pixels'])
    target.wcs.cdelt=[-step,step];serialization_delta=0.
    quality=json.loads((ROOT/'output/sdss-m82-quality-inputs-1004-r1/result.json').read_bytes())
    masks=json.loads((ROOT/'output/sdss-m82-fpm-frame-intersection-1004-r1/result-r2.json').read_bytes())
    camera=json.loads((ROOT/'output/sdss-m82-quality-inputs-1004-r1/camera-noise-parameters.json').read_bytes())['parameters']
    receipt=json.loads((ROOT/'output/sdss-m82-registration-stars-1004-r1/receipt.json').read_bytes())
    raw=(ROOT/'output/sdss-m82-registration-stars-1004-r1/response.csv').read_text(encoding='utf-8-sig')
    catalog=list(csv.DictReader(io.StringIO('\n'.join(s for s in raw.splitlines() if not s.startswith('#')))))
    assert len(catalog)==result['catalogDetections']<receipt['maximumRows']
    assert {s['objID']:s for s in catalog}=={r['objID']:r['catalog'] for r in result['records']}
    selected=[r for r in result['records'] if 'targetSaved' in r];assert len(selected)==result['qualifiedActualImageDetections']
    field_count={key:sum(r['fieldKey']==key for r in result['records']) for key in result['fieldDetectionCounts']}
    assert field_count==result['fieldDetectionCounts']
    native={};psfs={};rows=[];wrong_axis=0.;max_noise_delta=0.;moved=0
    for r in selected:
        field=next(f for f in science['mosaic']['fields'] if f['fieldKey']==r['fieldKey']);key=r['fieldKey']
        identity=field['perBand']['g']['sourceReceipt']['identity'];ident={k:v for k,v in identity.items() if k!='band'}
        if key not in psfs:
            ps=next(s for s in quality['sourceRecords'] if s['filename'].startswith('psField') and s['identity']==ident)
            p=ROOT/ps['raw']['path'];assert bind(p)==ps['raw']
            with fits.open(p,memmap=False) as hdus:
                # Materialize variable-length heap vectors while FITS is open.
                psfs[key]={b:[{name:np.array(term[name],copy=True) for name in ('nrow_b','ncol_b','c','rrows')}
                    for term in hdus['ugriz'.index(b)+1].data] for b in 'gri'}
        p=ROOT/r['targetSaved']['path'];assert bind(p)==r['targetSaved'];inputs.append(bind(p))
        with np.load(p,allow_pickle=False) as z:targetdata={k:z[k] for k in z.files}
        x0,y0,x1,y1=r['targetCutBoundsXYExclusive'];px,py=r['targetXY'];crop=np.s_[y0:y1,x0:x1]
        wx,wy=target.all_world2pix(float(r['catalog']['ra']),float(r['catalog']['dec']),0)
        np.testing.assert_allclose([wx,2047-wy],[px,py],rtol=0,atol=1e-10)
        hx,hy=serialized_target.all_world2pix(float(r['catalog']['ra']),float(r['catalog']['dec']),0)
        serialization_delta=max(serialization_delta,float(np.max(np.abs(np.array([hx,2047-hy])-[wx,2047-wy]))))
        np.testing.assert_array_equal(targetdata['target_qualified'],q[crop])
        for b in 'gri':
            np.testing.assert_array_equal(targetdata['science_'+b],planes[b][crop]);np.testing.assert_array_equal(targetdata['estimate_'+b],current[b][crop])
            for name,values in (('science',targetdata['science_'+b]),('current',targetdata['estimate_'+b])):
                xy=moment(values,px-x0,py-y0);old=r['targetMoments'][b][name]
                assert (xy is not None)==old['available']
                if xy is not None:np.testing.assert_allclose(xy,old['centerXY'],rtol=0,atol=2e-14)
            movement=r['targetMoments'][b]['filterCenterMovementPixels'];moved+=int(movement is not None and movement>0)
            m=r['bands'][b];source=field['perBand'][b]['sourceReceipt'];native_key=(key,b)
            if native_key not in native:
                p=Path(source['source']['path']);assert bind(p)['sha256']==source['source']['sha256']
                with fits.open(p,memmap=False) as hdus:
                    native[native_key]={'data':np.array(hdus[0].data),'calib':np.array(hdus[1].data),'sky':np.array(hdus[2].data['ALLSKY'][0]),
                        'sx':np.array(hdus[2].data['XINTERP'][0]),'sy':np.array(hdus[2].data['YINTERP'][0]),'wcs':WCS(hdus[0].header)}
                mask=next(v for v in masks['fpMInputs'] if v['identity']==source['identity'])
                with np.load(ROOT/mask['flags']['path'],allow_pickle=False) as z:native[native_key]['flags']=np.array(z['flags'])
            original=native[native_key];p=ROOT/m['saved']['path'];assert bind(p)==m['saved'];inputs.append(bind(p))
            with np.load(p,allow_pickle=False) as z:a={k:z[k] for k in z.files}
            nx0,ny0,nx1,ny1=m['nativeCutBoundsXYExclusive'];xx,yy=np.meshgrid(np.arange(nx0,nx1),np.arange(ny0,ny1));x,y=m['catalogNativeXY']
            np.testing.assert_array_equal(a['data'],original['data'][yy,xx]);np.testing.assert_array_equal(a['flags'],original['flags'][yy,xx])
            np.testing.assert_array_equal(a['dx'],xx-x);np.testing.assert_array_equal(a['dy'],yy-y)
            sx,sy=original['sx'][xx],original['sy'][yy];xlo,ylo=np.floor(sx).astype(int),np.floor(sy).astype(int)
            geometry=np.isfinite(sx)&np.isfinite(sy)&(sx>=0)&(sy>=0)&(sx<original['sky'].shape[1]-1)&(sy<original['sky'].shape[0]-1)
            sampled=np.full(xx.shape,np.nan,dtype=np.float32);available=np.zeros(xx.shape,bool)
            X,Y=xlo[geometry],ylo[geometry];neighbors=np.stack([original['sky'][Y,X],original['sky'][Y,X+1],original['sky'][Y+1,X],original['sky'][Y+1,X+1]]).astype(float)
            good=np.isfinite(neighbors).all(axis=0);fx,fy=sx[geometry][good]-X[good],sy[geometry][good]-Y[good]
            values=(neighbors[0,good]*(1-fx)*(1-fy)+neighbors[1,good]*fx*(1-fy)+neighbors[2,good]*(1-fx)*fy+neighbors[3,good]*fx*fy).astype(np.float32)
            coords=np.where(geometry);sampled[coords[0][good],coords[1][good]]=values
            parameter=next(v for v in camera if list(v['identity'])==[identity['run'],identity['rerun'],identity['camcol'],identity['field'],b])
            cal=original['calib'][xx].astype(float);var=((a['data'].astype(float)/cal+sampled.astype(float))/parameter['gain_electrons_per_count']+parameter['dark_variance_counts_squared'])*cal**2
            available=np.isfinite(sampled)&np.isfinite(cal)&(cal>0)&np.isfinite(a['data'])&np.isfinite(var)&(var>=0);var[~available]=np.nan
            np.testing.assert_array_equal(available,a['noise_available']);np.testing.assert_array_equal(var,a['variance'])
            max_noise_delta=max(max_noise_delta,float(np.max(np.abs(var[available]-a['variance'][available]))))
            use=available&(var>0)&np.isfinite(a['data'])&((a['flags']&771)==0)&(np.hypot(xx-x,yy-y)<=12)
            np.testing.assert_array_equal(use,a['fit_mask'])
            table=psfs[key][b];kernel=np.zeros((51,51),dtype=float)
            for term in table:
                coefficient=0.
                for i in range(int(term['nrow_b'])):
                    for j in range(int(term['ncol_b'])):coefficient+=float(term['c'][i,j])*((y+.5)*.001)**i*((x+.5)*.001)**j
                kernel+=coefficient*np.asarray(term['rrows'],dtype=float).reshape(51,51)
            np.testing.assert_array_equal(kernel,a['kernel'])
            normalized=kernel/kernel.sum();spline=RectBivariateSpline(np.arange(51),np.arange(51),normalized,kx=3,ky=3,s=0)
            template=spline.ev(yy-y+25,xx-x+25);np.testing.assert_allclose(template,a['template'],rtol=0,atol=5e-17)
            design=np.stack((template,np.ones(template.shape),xx-x,yy-y),axis=-1)[use];weights=1/var[use]
            normal=design.T@(weights[:,None]*design);rhs=design.T@(weights*a['data'][use]);coeff=np.linalg.solve(normal,rhs)
            np.testing.assert_allclose(coeff,m['fixedCoefficients'],rtol=1e-10,atol=1e-10)
            params=np.array(m['parameters']);assert m['parameterNames']==['flux_0','x_0_0','y_0_0','slope_x_1','slope_y_1','intercept_1']
            shifted=spline.ev(yy-y-params[2]+25,xx-x-params[1]+25);model=params[0]*shifted+params[3]*(xx-x)+params[4]*(yy-y)+params[5]
            residual=a['data']-model;np.testing.assert_allclose(model,a['model'],rtol=0,atol=1e-12);np.testing.assert_allclose(residual,a['residual'],rtol=0,atol=1e-12)
            chi=float((np.square(residual[use])/var[use]).sum()/(use.sum()-6));np.testing.assert_allclose(chi,m['localChiSquarePerDof'],rtol=1e-11,atol=1e-11)
            ra,dec=original['wcs'].all_pix2world(x+params[1],y+params[2],0);np.testing.assert_array_equal([ra,dec],m['fittedLinearRaDec'])
            wrong=RectBivariateSpline(np.arange(51),np.arange(51),normalized.T,kx=3,ky=3,s=0).ev(yy-y-params[2]+25,xx-x-params[1]+25)
            delta=float(np.max(np.abs(params[0]*(wrong-shifted))));wrong_axis=max(wrong_axis,delta)
            rows.append({'objID':r['objID'],'fieldKey':key,'band':b,'conditionalChiSquarePerDof':chi,'wrongKernelAxisModelDelta':delta,'centerAtBounds':m['centerAtBounds']})
        for b in ('g','i'):
            m=r['relativeBandRegistration'][b]
            for name in ('science','current'):
                a=r['targetMoments'][b][name];rr=r['targetMoments']['r'][name]
                if a['available'] and rr['available']:np.testing.assert_allclose(float(np.linalg.norm(np.array(a['centerXY'])-rr['centerXY'])),m[name+'MomentSeparationPixels'],rtol=0,atol=1e-14)
            if 'nativeFittedLinearSeparationArcsec' in m:np.testing.assert_allclose(separation(r['bands'][b]['fittedLinearRaDec'],r['bands']['r']['fittedLinearRaDec']),m['nativeFittedLinearSeparationArcsec'],rtol=0,atol=1e-12)
    assert len(rows)==len(selected)*3 and wrong_axis>1e-6 and moved>0
    with Image.open(GEN/'actual-distributed-stellar-comparison.png') as im:im.load();image_shape=list(im.size)
    for item in inputs:assert bind(ROOT/item['path'])==item
    cp=json.loads((ROOT/result['checkpoint']['path']).read_bytes())
    for item in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    report={'scope':__doc__,'producerResult':bind(GEN/'result.json'),'actualProfiles':len(rows),'actualStars':len(selected),'rows':rows,
        'rawCatalogAndAllFieldCountsExact':True,'originalNativeDataFlagsCalibSkyVarianceExact':True,'maximumNativeVarianceDelta':max_noise_delta,
        'originalPositionDependentPsfCoefficientsExact':True,'rowFirstSplineTemplatesAndSavedModelsResidualStatsExact':True,
        'fixedNormalEquationsExactToRoundoff':True,'targetScienceCurrentMomentAndRelativePositionExact':True,
        'wrongKernelAxisMaximumModelDelta':wrong_axis,'targetBandCentersActuallyMoved':moved,'actualComparisonShape':image_shape,'serializedHeaderMaximumPixelDifference':serialization_delta,'originalScalarGridExact':True,
        'inputs':inputs,'oldEvidenceExact':len(cp['evidence']),'oldSourcesExact':len(cp['currentSources']),'protectedExact':6,
        'fitReruns':0,'sourceImageRequests':0,'wholeFilterCoaddRuns':0,'scientificCorrection':'NONE','quality':'UNVERIFIED','independentReview':'MISSING','adopted':False,
        'limits':'Arithmetic readback is self-review; 20 actual field stars and native relative PSF do not validate missing central stars, absolute astrometry, projected/coadded target PSF or complete galaxy/weak-structure quality.'}
    save(OUT/'result.json',report)
    print(json.dumps({k:v for k,v in report.items() if k not in ('rows','inputs')}))

if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
        raise
