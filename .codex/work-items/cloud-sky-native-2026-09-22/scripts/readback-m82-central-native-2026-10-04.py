"""Read saved central detections and native PSF diagnostics, no detector/fit replay."""
from pathlib import Path
import sys,json,csv,io,math,hashlib
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
from scipy.interpolate import RectBivariateSpline
from PIL import Image
GEN=ROOT/'output/sdss-m82-central-native-1004-r2';OUT=ROOT/'output/sdss-m82-central-native-readback-1004-r2'

def bind(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for v in iter(lambda:f.read(1024*1024),b''):h.update(v)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def save(p,v):
    with p.open('x',encoding='utf-8') as f:json.dump(v,f,indent=2,allow_nan=False);f.write('\n')

def original_variance(frame,xx,yy,parameters):
    sx,sy=frame['sx'][xx],frame['sy'][yy];xlo,ylo=np.floor(sx).astype(int),np.floor(sy).astype(int)
    shape=frame['sky'].shape;geo=np.isfinite(sx)&np.isfinite(sy)&(sx>=0)&(sy>=0)&(sx<shape[1]-1)&(sy<shape[0]-1)
    sky=np.full(xx.shape,np.nan,dtype=np.float32);coords=np.where(geo);X,Y=xlo[geo],ylo[geo]
    four=np.stack([frame['sky'][Y,X],frame['sky'][Y,X+1],frame['sky'][Y+1,X],frame['sky'][Y+1,X+1]]).astype(float);finite=np.isfinite(four).all(axis=0)
    dx,dy=sx[geo][finite]-X[finite],sy[geo][finite]-Y[finite]
    values=(four[0,finite]*(1-dx)*(1-dy)+four[1,finite]*dx*(1-dy)+four[2,finite]*(1-dx)*dy+four[3,finite]*dx*dy).astype(np.float32)
    sky[coords[0][finite],coords[1][finite]]=values;cal=frame['calib'][xx].astype(float);data=frame['data'][yy,xx]
    variance=((data.astype(float)/cal+sky.astype(float))/parameters['gain_electrons_per_count']+parameters['dark_variance_counts_squared'])*cal**2
    known=np.isfinite(sky)&np.isfinite(cal)&(cal>0)&np.isfinite(data)&np.isfinite(variance)&(variance>=0);variance[~known]=np.nan
    return variance,known

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    r=json.loads((GEN/'result.json').read_bytes());before=json.loads((GEN/'resumed-inputs-before.json').read_bytes());assert before==json.loads((GEN/'inputs-after.json').read_bytes())
    for item in before:assert bind(ROOT/item['path'])==item
    inputs=before+[bind(GEN/'result.json'),bind(Path(__file__))]
    science=json.loads((ROOT/r['scienceCandidate']['path']).read_bytes());field=next(f for f in science['mosaic']['fields'] if f['fieldKey']==r['fieldKey'])
    quality=json.loads((ROOT/'output/sdss-m82-quality-inputs-1004-r1/result.json').read_bytes());masks=json.loads((ROOT/'output/sdss-m82-fpm-frame-intersection-1004-r1/result-r2.json').read_bytes())
    camera=json.loads((ROOT/'output/sdss-m82-quality-inputs-1004-r1/camera-noise-parameters.json').read_bytes())['parameters']
    identity=field['perBand']['g']['sourceReceipt']['identity'];ident={k:v for k,v in identity.items() if k!='band'}
    ps=next(s for s in quality['sourceRecords'] if s['filename'].startswith('psField') and s['identity']==ident)
    with fits.open(ROOT/ps['raw']['path'],memmap=False) as hdus:
        psfs={b:[{name:np.array(term[name],copy=True) for name in ('nrow_b','ncol_b','c','rrows')} for term in hdus['ugriz'.index(b)+1].data] for b in 'gri'}
    target=WCS(naxis=2);target.wcs.ctype=['RA---TAN','DEC--TAN'];target.wcs.cunit=['deg','deg'];target.wcs.radesys='ICRS'
    target.wcs.crval=[science['center']['raDeg'],science['center']['decDeg']];target.wcs.crpix=[(science['pixels']+1)/2]*2
    step=math.degrees(2*math.tan(math.radians(science['fieldDegrees'])/2)/science['pixels']);target.wcs.cdelt=[-step,step]
    all_records={};cut_count=0
    for b in 'gri':
        source=field['perBand'][b]['sourceReceipt'];p=Path(source['source']['path']);assert bind(p)['sha256']==source['source']['sha256']
        with fits.open(p,memmap=False) as h:
            native={'data':np.array(h[0].data),'calib':np.array(h[1].data),'sky':np.array(h[2].data['ALLSKY'][0]),'sx':np.array(h[2].data['XINTERP'][0]),'sy':np.array(h[2].data['YINTERP'][0]),'wcs':WCS(h[0].header)}
        mask=next(v for v in masks['fpMInputs'] if v['identity']==source['identity'])
        with np.load(ROOT/mask['flags']['path'],allow_pickle=False) as z:native['flags']=np.array(z['flags'])
        parameter=next(v for v in camera if list(v['identity'])==[identity['run'],identity['rerun'],identity['camcol'],identity['field'],b])
        band=r['fields'][b];assert len(band['allRecords'])==band['allDetectorCandidates'];assert len(band['records'])==band['insideTargetSaved']
        assert band['outsideTarget']==sum(v['state']=='OUTSIDE_TARGET' for v in band['allRecords'])
        assert band['cutOutOfBounds']==sum(v['state']=='CUT_OUTSIDE_NATIVE' for v in band['allRecords'])
        all_records[b]={v['candidateId']:v for v in band['records']};assert len(all_records[b])==len(band['records'])
        for v in band['allRecords']:
            x,y=v['nativeXY'];ra,dec=native['wcs'].all_pix2world(x,y,0);tx,ty=target.all_world2pix(ra,dec,0)
            np.testing.assert_allclose([tx,2047-ty],v['targetXY'],rtol=0,atol=1e-10)
        for v in band['records']:
            p=ROOT/v['saved']['path'];assert bind(p)==v['saved'];inputs.append(bind(p))
            with np.load(p,allow_pickle=False) as z:a={k:z[k] for k in z.files}
            x,y=v['nativeXY'];x0,y0,x1,y1=v['nativeCutBoundsXYExclusive'];xx,yy=np.meshgrid(np.arange(x0,x1),np.arange(y0,y1))
            np.testing.assert_array_equal(a['data'],native['data'][yy,xx]);np.testing.assert_array_equal(a['flags'],native['flags'][yy,xx])
            variance,known=original_variance(native,xx,yy,parameter);np.testing.assert_array_equal(variance,a['variance'])
            eligible=known&(variance>0)&np.isfinite(a['data'])&((a['flags']&771)==0);np.testing.assert_array_equal(eligible,a['admitted'])
            np.testing.assert_array_equal(a['dx'],xx-x);np.testing.assert_array_equal(a['dy'],yy-y);np.testing.assert_array_equal(a['radius'],np.hypot(xx-x,yy-y))
            assert bool(eligible[a['radius']<=12].all())==v['radius12FullyNativeQualified'];cut_count+=1
        assert sum(v['radius12FullyNativeQualified'] for v in band['records'])==band['qualifiedRadius12']
        del native
    # Rebuild the complete reciprocal graph, rather than trust a chosen fit list.
    expected=[]
    for rr in all_records['r'].values():
        if not rr['radius12FullyNativeQualified']:continue
        match={'r':rr};ok=True
        for b in ('g','i'):
            options=[v for v in all_records[b].values() if v['radius12FullyNativeQualified'] and np.linalg.norm(np.array(v['targetXY'])-rr['targetXY'])<=2.5]
            if len(options)!=1:ok=False;break
            v=options[0];reverse=[z for z in all_records['r'].values() if z['radius12FullyNativeQualified'] and np.linalg.norm(np.array(z['targetXY'])-v['targetXY'])<=2.5]
            if len(reverse)!=1:ok=False;break
            match[b]=v
        if ok:expected.append(tuple(match[b]['candidateId'] for b in 'gri'))
    assert expected==[tuple(t['bands'][b]['candidateId'] for b in 'gri') for t in r['triplets']]
    rows=[];wrong_axis=0.;nonpositive=0;max_template_delta=0.;max_model_delta=0.;bound_counts={b:0 for b in 'gri'}
    for row,t in zip(r['fits'],r['triplets'],strict=True):
        assert row['rCandidateId']==t['bands']['r']['candidateId']
        for b in 'gri':
            m=row['bands'][b];rec=m['detection'];assert rec==t['bands'][b]
            p=ROOT/m['saved']['path'];assert bind(p)==m['saved'];inputs.append(bind(p))
            with np.load(p,allow_pickle=False) as z:modeldata={k:z[k] for k in z.files}
            with np.load(ROOT/rec['saved']['path'],allow_pickle=False) as z:a={k:z[k] for k in z.files}
            x,y=rec['nativeXY'];kernel=np.zeros((51,51),float)
            for term in psfs[b]:
                weight=0.
                for i in range(int(term['nrow_b'])):
                    for j in range(int(term['ncol_b'])):weight+=float(term['c'][i,j])*((y+.5)*.001)**i*((x+.5)*.001)**j
                kernel+=weight*np.asarray(term['rrows'],float).reshape(51,51)
            np.testing.assert_array_equal(kernel,modeldata['kernel']);normalized=kernel/kernel.sum()
            spline=RectBivariateSpline(np.arange(51),np.arange(51),normalized,kx=3,ky=3,s=0);template=spline.ev(a['dy']+25,a['dx']+25)
            template_bound=16*np.finfo(float).eps*float(np.max(np.abs(normalized)))
            template_delta=float(np.max(np.abs(template-modeldata['template'])));assert template_delta<=template_bound;max_template_delta=max(max_template_delta,template_delta)
            use=a['admitted']&(a['radius']<=12);np.testing.assert_array_equal(use,modeldata['fit_mask'])
            design=np.stack((template,np.ones(template.shape),a['dx'],a['dy']),axis=-1)[use];weights=1/a['variance'][use]
            normal=design.T@(design*weights[:,None]);rhs=design.T@(a['data'][use]*weights);coeff=np.linalg.solve(normal,rhs)
            np.testing.assert_allclose(coeff,m['fixedCoefficients'],rtol=1e-10,atol=1e-10)
            if m['fitStatus']=='NONPOSITIVE_DIAGNOSTIC_AMPLITUDE':assert coeff[0]<=0;nonpositive+=1;continue
            assert m['fitStatus']=='CONDITIONAL_DIAGNOSTIC' and m['optimizer']['success']
            params=np.array(m['parameters']);np.testing.assert_array_equal(params,modeldata['parameters'])
            shifted=spline.ev(a['dy']-params[2]+25,a['dx']-params[1]+25);model=params[0]*shifted+params[3]*a['dx']+params[4]*a['dy']+params[5];residual=a['data']-model
            # Opposite spline axis traversal and compound-model summation can
            # differ at machine roundoff. Scale the bound from the actual
            # normalized kernel, flux and nuisance-plane terms, not pixels.
            arithmetic_scale=float(np.max(np.abs(model)))+abs(params[3])*float(np.max(np.abs(a['dx'])))+abs(params[4])*float(np.max(np.abs(a['dy'])))+abs(params[5])
            model_bound=abs(params[0])*template_bound+16*np.finfo(float).eps*arithmetic_scale
            model_delta=float(np.max(np.abs(model-modeldata['model'])));assert model_delta<=model_bound;max_model_delta=max(max_model_delta,model_delta)
            np.testing.assert_allclose(residual,modeldata['residual'],rtol=0,atol=model_bound+4*np.finfo(float).eps*float(np.max(np.abs(a['data']))))
            chi=float(np.square(residual[use]/np.sqrt(a['variance'][use])).sum()/(use.sum()-6));np.testing.assert_allclose(chi,m['conditionalChiSquarePerDof'],rtol=1e-11,atol=1e-11)
            at_bounds=any(abs(v)>=.499999 for v in params[1:3]);assert at_bounds==m['centerAtBounds'];bound_counts[b]+=int(at_bounds)
            wrong=RectBivariateSpline(np.arange(51),np.arange(51),normalized.T,kx=3,ky=3,s=0).ev(a['dy']-params[2]+25,a['dx']-params[1]+25)
            delta=float(np.max(np.abs(params[0]*(wrong-shifted))));wrong_axis=max(wrong_axis,delta)
            rows.append({'rCandidateId':row['rCandidateId'],'band':b,'chiSquarePerDof':chi,'centerAtBounds':at_bounds,'wrongAxisMaximumModelDelta':delta})
    assert wrong_axis>1e-6 and len(rows)+nonpositive==r['tripletCount']*3
    images=[]
    for m in r['actualComparisons']:
        p=ROOT/m['path'];assert bind(p)==m;inputs.append(m)
        with Image.open(p) as im:im.load();images.append({'binding':m,'dimensions':list(im.size)})
    for item in inputs:assert bind(ROOT/item['path'])==item
    cp=json.loads((ROOT/r['checkpoint']['path']).read_bytes())
    for item in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    report={'scope':__doc__,'producerResult':bind(GEN/'result.json'),'nativeTargetCuts':cut_count,'reciprocalTriplets':len(expected),'originalDataFlagsCalibSkyVarianceExact':True,'nativeWcsTargetPositionsAndEligibilityExact':True,
        'originalPositionPsfAndRowFirstSavedTemplatesModelsExact':True,'fixedNormalEquationsAndSavedStatisticsExactToRoundoff':True,'nonpositiveProfilesKept':nonpositive,'conditionalProfiles':len(rows),'centerAtBoundsByBand':bound_counts,'wrongKernelAxisMaximumModelDelta':wrong_axis,'maximumTemplateTraversalDelta':max_template_delta,'maximumSavedModelRoundoffDelta':max_model_delta,'roundoffBoundMeaning':'16 machine-epsilon times actual normalized kernel and flux/plane operation scales; no scientific pixel/PSF-quality tolerance.',
        'rows':rows,'images':images,'inputs':inputs,'oldSourcesExact':len(cp['currentSources']),'oldEvidenceExact':len(cp['evidence']),'protectedExact':6,'detectorRuns':0,'fitReruns':0,'sourceRequests':0,'wholeFilterCoaddRuns':0,
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False,'limits':'All saved detector output/793 cuts/114 graph/342 PSF stages read back; no calibrated detection completeness, confirmed stars, absolute astrometry, central full-quality acceptance or target/adaptive PSF claim.'}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('rows','images','inputs')}))

if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
        raise
