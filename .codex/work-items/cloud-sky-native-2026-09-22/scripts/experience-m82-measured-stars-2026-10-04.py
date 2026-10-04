"""Actual M82 catalog/native PSF and saved-science/current-centroid diagnostics.

No science correction, whole filter/coadd, source-image request or adoption.
Catalog shares upstream astrometry; moments and conditional fits are not truth.
"""
from pathlib import Path
import csv, io, importlib.util, json, sys, time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np, astropy, scipy, photutils
from photutils.psf import ImagePSF
from astropy.modeling.fitting import TRFLSQFitter
from astropy.coordinates import SkyCoord
from PIL import Image, ImageDraw
from sdss_frame_quality import read_cached_psfield, check_frame_quality
from sdss_frame_noise import native_noise_samples
from sdss_gri_tan import ProjectedBand, FixedDisplayTransfer, make_rgb_display

def module(name,filename):
    spec=importlib.util.spec_from_file_location(name,TASK/'scripts'/filename)
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
loader=module('saved_m82','experience-m82-current-adaptive-recovery-2026-10-04.py')
moments=module('measured_moments','experience-sdss-measured-star-registration-2026-10-03.py')
linear=module('native_linear','experience-sdss-measured-native-psf-r2-2026-10-03.py')
centering=module('mature_center','experience-sdss-imagepsf-centering-2026-10-03.py')
bind,save=loader.bind,loader.save
OUT=ROOT/'output/sdss-m82-measured-stars-1004-r4';BANDS='gri'

def separation(a,b):
    return float(SkyCoord(*a,unit='deg',frame='icrs').separation(SkyCoord(*b,unit='deg',frame='icrs')).arcsec)

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    started=time.perf_counter();cpu=time.process_time();pins={}
    def pin(path,expected=None):
        actual=bind(path)
        if expected is not None:assert actual==expected,(path,actual,expected)
        assert pins.setdefault(actual['path'],actual)==actual
        return actual
    cp_path=TASK/'evidence/current-execution-state-2026-10-04-r85.json';pin(cp_path)
    cp=json.loads(cp_path.read_bytes())
    for item in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    pin(ROOT/'output/sdss-m82-recovered-complete-readback-1004-r1/checkpoint-continuity.json')
    for path in (Path(__file__),Path(loader.__file__),Path(moments.__file__),Path(moments.prior.__file__),Path(linear.__file__),Path(centering.__file__),
                 Path(sys.modules[ImagePSF.__module__].__file__),Path(sys.modules[TRFLSQFitter.__module__].__file__)):
        pin(path)
    for name in ('sdss_corrected_frame.py','sdss_frame_quality.py','sdss_frame_noise.py','sdss_gri_tan.py','sdss_source_stencil.py'):
        pin(ROOT/'data-pipelines/deep-sky'/name)
    receipt_path=ROOT/'output/sdss-m82-registration-stars-1004-r1/receipt.json';pin(receipt_path)
    receipt=json.loads(receipt_path.read_bytes());assert receipt['status']==200
    response=receipt_path.parent/'response.csv';raw=response.read_bytes();record=pin(response)
    assert (record['bytes'],record['sha256'])==(receipt['bytes'],receipt['sha256'])
    pin(receipt_path.parent/'query.sql');pin(ROOT/receipt['fieldSource']['path'],receipt['fieldSource'])
    text=raw.decode('utf-8-sig');assert text.startswith('#Table1') and 'TOO_LONG' not in text and 'ERROR' not in text
    rows=list(csv.DictReader(io.StringIO('\n'.join(s for s in text.splitlines() if not s.startswith('#')))))
    assert 0<len(rows)<receipt['maximumRows'] and len({r['objID'] for r in rows})==len(rows)
    result_path=ROOT/'output/sdss-m82-shared-adaptive-display-1004-r1/result.json';pin(result_path)
    master,_,sources=loader.load_saved_inputs(json.loads(result_path.read_bytes()),pin)
    full_path=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate/candidate.json';pin(full_path)
    full=json.loads(full_path.read_bytes());estimates={}
    for b in BANDS:
        m=full['arrays'][b];p=full_path.parent/m['file'];actual=pin(p)
        assert (actual['bytes'],actual['sha256'])==(m['bytes'],m['sha256']);estimates[b]=np.load(p,mmap_mode='r',allow_pickle=False)
    m=full['arrays']['qualified'];p=full_path.parent/m['file'];assert pin(p)['sha256']==m['sha256'];qualified=np.load(p,mmap_mode='r',allow_pickle=False)
    for m in full['levels'].values():p=full_path.parent/m['file'];assert pin(p)['sha256']==m['sha256']
    quality_path=ROOT/'output/sdss-m82-quality-inputs-1004-r1/result.json';pin(quality_path);quality=json.loads(quality_path.read_bytes())
    psfields={};fields={}
    for key,group in sources.items():
        ident=group['g'].frame.receipt['identity'];fields[group['g'].camera.field_id]=key
        ident={k:v for k,v in ident.items() if k!='band'}
        m=next(v for v in quality['sourceRecords'] if v['filename'].startswith('psField') and v['identity']==ident)
        p=ROOT/m['raw']['path'];pin(p,m['raw'])
        psfields[key]=read_cached_psfield(p,ident|{'sourceUrl':m['url'],'bytes':m['bytes'],'sha256':m['sha256']},max_uncompressed_bytes=16*1024*1024)
        for source in group.values():assert check_frame_quality(source.frame,psfields[key],source.flags)['processingIdentity']=='MATCH'
    before=list(pins.values());save(OUT/'inputs-before.json',before)
    records=[]
    for s in rows:
        assert s['fieldID'] in fields and s['rerun']=='301' and s['type']=='6' and s['mode'] in ('1','2')
        key=fields[s['fieldID']];identity=sources[key]['g'].frame.receipt['identity']
        assert all(int(s[k])==int(identity[k]) for k in ('run','camcol','field'))
        position=(float(s['ra']),float(s['dec']));assert np.isfinite(position).all()
        px,py=master.target.all_world2pix(*position,0);px,py=float(px),2047-float(py)
        row={'objID':s['objID'],'fieldKey':key,'catalog':s,'targetXY':[px,py],'bands':{},'imageQualification':[]}
        for b in BANDS:
            source=sources[key][b];x,y=float(s['colc_'+b])-.5,float(s['rowc_'+b])-.5
            color=float(s['psfMag_g'])-float(s['psfMag_r']) if b=='g' else float(s['psfMag_r'])-float(s['psfMag_i'])
            fr,fd=moments.prior.retained_solution(source.frame.receipt['asTrans']['row'],x,y,origin_offset=.5,color=color)
            tr,td=source.frame.wcs.all_pix2world(x,y,0)
            row['bands'][b]={'catalogNativeXY':[x,y],'catalogColor':color,'retainedRaDec':[float(fr),float(fd)],'linearRaDec':[float(tr),float(td)],
                'fullToCatalogArcsec':separation(position,(fr,fd)),'linearToCatalogArcsec':separation(position,(tr,td)),
                'insideNativeCut':20<=x<2027 and 20<=y<1468}
        records.append(row)
    selected=[]
    for row in records:
        s=row['catalog'];px,py=row['targetXY'];reasons=row['imageQualification']
        if not(16<=px<2032 and 16<=py<2032):reasons.append('outside_complete_target_cut')
        if s['clean']!='1' or s['nChild']!='0':reasons.append('catalog_not_clean_or_blended')
        if any(not np.isfinite(float(s[k+'_'+b])) or not 0<=float(s[k+'_'+b])<=.1 for b in BANDS for k in ('rowcErr','colcErr','psfMagErr')):reasons.append('catalog_uncertain')
        if not all(v['insideNativeCut'] for v in row['bands'].values()):reasons.append('outside_complete_native_cut')
        if reasons:continue
        ix,iy=int(np.rint(px)),int(np.rint(py));bounds=[ix-16,iy-16,ix+17,iy+17];x0,y0,x1,y1=bounds;crop=np.s_[y0:y1,x0:x1]
        yy,xx=np.mgrid[y0:y1,x0:x1];radius=np.hypot(xx-px,yy-py);used=(radius<=7)|((radius>=10)&(radius<=12))
        if not master.joint_available[crop].all() or not qualified[crop][used].all():reasons.append('actual_target_support_unqualified');continue
        distances=[np.hypot(px-r['targetXY'][0],py-r['targetXY'][1]) for r in records if r['objID']!=row['objID']]
        if any(2.5<d<24 for d in distances):reasons.append('queried_neighbor');continue
        row['targetCutBoundsXYExclusive']=bounds;row['targetMoments']={}
        saved={'target_qualified':qualified[crop]}
        for b in BANDS:
            a=np.asarray(master.bands[b].data[crop]);z=np.asarray(estimates[b][crop]);saved['science_'+b]=a;saved['estimate_'+b]=z
            am=moments.aperture_centroid(a,px-x0,py-y0);zm=moments.aperture_centroid(z,px-x0,py-y0)
            row['targetMoments'][b]={'science':am,'current':zm,'filterCenterMovementPixels':float(np.linalg.norm(np.array(zm['centerXY'])-am['centerXY'])) if am['available'] and zm['available'] else None}
        p=OUT/(row['objID']+'-target.npz');np.savez_compressed(p,**saved);row['targetSaved']=bind(p)
        for b in BANDS:
            source=sources[row['fieldKey']][b];x,y=row['bands'][b]['catalogNativeXY'];xc,yc=int(np.rint(x)),int(np.rint(y))
            xx,yy=np.meshgrid(np.arange(xc-20,xc+21),np.arange(yc-20,yc+21));dx,dy=xx-x,yy-y;rad=np.hypot(dx,dy)
            data=source.frame.data[yy,xx];flags=source.flags.flags[yy,xx];noise=native_noise_samples(source.frame,source.camera,xx,yy)
            kernel=psfields[row['fieldKey']].reconstruct(b,x,y);assert np.isfinite(kernel).all() and kernel.sum()>0
            model=ImagePSF(kernel/kernel.sum(),flux=1,x_0=0,y_0=0,origin=(25,25),oversampling=1,fill_value=np.nan)
            template=model(dx,dy);admitted=np.isfinite(data)&noise.available&(noise.variance_nmgy_squared>0)&((flags&771)==0)
            use=admitted&(rad<=12);fit=linear.weighted_model_fit(data,template,dx,dy,noise.variance_nmgy_squared,use)
            values={'data':data,'flags':flags,'variance':noise.variance_nmgy_squared,'noise_available':noise.available,'kernel':kernel,'template':template,'dx':dx,'dy':dy,'fit_mask':use}
            m=row['bands'][b];m['nativeCutBoundsXYExclusive']=[xc-20,yc-20,xc+21,yc+21]
            m.update({'fitExcluded':int(((rad<=12)&~admitted).sum()),'coreRadius3Excluded':int(((rad<=3)&~admitted).sum()),'psfStatus':psfields[row['fieldKey']].receipt['psf']['status']})
            if fit is None:m['fitStatus']='UNAVAILABLE_SUPPORT_OR_RANK'
            else:
                coeff,pred,resid,stats=fit;m.update({'fixedCoefficients':coeff.tolist(),'fixedStats':stats})
                fitter=TRFLSQFitter();fitted=fitter(centering.initialize(kernel,coeff),dx[use],dy[use],data[use],weights=1/np.sqrt(noise.variance_nmgy_squared[use]),maxiter=100)
                info=fitter.fit_info;pred=fitted(dx,dy);resid=data-pred;xy=[float(fitted.x_0_0.value),float(fitted.y_0_0.value)]
                m.update({'fitStatus':'CONDITIONAL_DIAGNOSTIC' if info['success'] else 'FAILED_OPTIMIZER','parameters':fitted.parameters.tolist(),'parameterNames':list(fitted.param_names),
                    'relativeNativeCenterXY':xy,'centerAtBounds':any(abs(v)>=.499999 for v in xy),'optimizer':{'success':bool(info['success']),'nfev':int(info['nfev'])},
                    'localChiSquarePerDof':float(np.square(resid[use]/np.sqrt(noise.variance_nmgy_squared[use])).sum()/(use.sum()-6))})
                values.update(model=pred,residual=resid)
                ra,dec=source.frame.wcs.all_pix2world(x+xy[0],y+xy[1],0);m['fittedLinearRaDec']=[float(ra),float(dec)]
            p=OUT/(row['objID']+'-'+b+'.npz');np.savez_compressed(p,**values);m['saved']=bind(p)
        row['relativeBandRegistration']={}
        for b in ('g','i'):
            entry={}
            for name in ('science','current'):
                a=row['targetMoments'][b][name];r=row['targetMoments']['r'][name]
                entry[name+'MomentSeparationPixels']=float(np.linalg.norm(np.array(a['centerXY'])-r['centerXY'])) if a['available'] and r['available'] else None
            if all(row['bands'][n].get('fitStatus')=='CONDITIONAL_DIAGNOSTIC' and not row['bands'][n]['centerAtBounds'] and row['bands'][n]['coreRadius3Excluded']==0 for n in (b,'r')):
                entry['nativeFittedLinearSeparationArcsec']=separation(row['bands'][b]['fittedLinearRaDec'],row['bands']['r']['fittedLinearRaDec'])
            row['relativeBandRegistration'][b]=entry
        selected.append(row)
        save(OUT/'progress.json',{'completedActualDetections':len(selected),'elapsedSeconds':time.perf_counter()-started})
    assert selected,'no_actual_qualified_stellar_effect'
    # All actual selected records remain in JSON/NPZ; visual examples are spread
    # by cells only to keep the comparison readable, never an analysis cap.
    examples=[];cells=set()
    for row in selected:
        cell=tuple(int(v//512) for v in row['targetXY'])
        if cell not in cells:cells.add(cell);examples.append(row)
    sheet=Image.new('RGB',(720,180*len(examples)),(20,20,20));draw=ImageDraw.Draw(sheet)
    recipe=full['sourceResolvedRecipe']
    for index,row in enumerate(examples):
        x0,y0,x1,y1=row['targetCutBoundsXYExclusive'];crop=np.s_[y0:y1,x0:x1]
        draw.text((2,index*180+2),row['objID']+' science / current / native g-r-i / residual g-r-i',fill='white')
        for col,arrays in enumerate(({b:master.bands[b].data for b in BANDS},estimates)):
            rgb,_=make_rgb_display({b:ProjectedBand(arrays[b][crop],master.joint_available[crop],master.joint_available[crop],{}) for b in BANDS},master.joint_available[crop],transfer=FixedDisplayTransfer(recipe['stretch'],recipe['Q']))
            sheet.paste(Image.fromarray(rgb).resize((132,132),Image.Resampling.NEAREST),(col*136+2,index*180+30))
        for at,b in enumerate(BANDS):
            with np.load(ROOT/row['bands'][b]['saved']['path'],allow_pickle=False) as z:
                use=z['fit_mask'];scale=max(float(np.percentile(z['data'][use],99)-np.percentile(z['data'][use],5)),1e-12)
                for col,name in enumerate(('data','residual')):
                    if name not in z:continue
                    gray=np.clip((z[name]-np.percentile(z['data'][use],5))/scale if col==0 else .5+z[name]/scale,0,1)
                    sheet.paste(Image.fromarray(np.rint(gray*255).astype(np.uint8)).resize((72,72),Image.Resampling.NEAREST),(280+at*74+col*222,index*180+40))
    sheet.save(OUT/'actual-distributed-stellar-comparison.png')
    after=[bind(ROOT/p['path']) for p in before];assert before==after;save(OUT/'inputs-after.json',after)
    for item in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    field_counts={key:sum(row['fieldKey']==key for row in records) for key in sources}
    stats={b:{name:moments.summary([r['relativeBandRegistration'][b][name] for r in selected if r['relativeBandRegistration'][b].get(name) is not None]) for name in ('scienceMomentSeparationPixels','currentMomentSeparationPixels','nativeFittedLinearSeparationArcsec')} for b in ('g','i')}
    report={'scope':__doc__,'checkpoint':pin(cp_path),'catalogReceipt':pin(receipt_path),'catalogDetections':len(records),'fieldDetectionCounts':field_counts,
        'qualifiedActualImageDetections':len(selected),'qualifiedFieldCounts':{key:sum(r['fieldKey']==key for r in selected) for key in sources},
        'catalogCoordinateMetrics':{b:{k:moments.summary([r['bands'][b][k] for r in records]) for k in ('fullToCatalogArcsec','linearToCatalogArcsec')} for b in BANDS},
        'relativeBandMetrics':stats,'records':records,'displayedObjectRefs':[r['objID'] for r in examples],
        'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'memory':loader.memory(),
        'libraries':{'numpy':np.__version__,'astropy':astropy.__version__,'scipy':scipy.__version__,'photutils':photutils.__version__},
        'policy':'All queried type6/mode1-2 records retained; actual complete target/native cuts, clean/no-child/centroid-mag errors <=.1, qualified target core/annulus and queried-neighbor separation for image diagnostics. Existing radius7 moments, cubic signed relative ImagePSF plus native local plane/centroid fit, radius12, +/-0.5 center bounds/max100 evaluations. No parameter sweep.',
        'limits':['Catalog/frame astrometry share upstream solution; no independent absolute astrometry.',
            'Zero catalog rows in a field is not absence of real stars or validated central PSF; no coverage extrapolation.',
            'Repeated observations/adjacent fields are not independent sources; unqueried nonstellar/faint neighbors and blends remain.',
            'Moments, conditional pixel noise and nuisance fits omit sky/model/PSF/systematics; local plane is never subtracted from science.',
            'Native kernels are not projected/coadded target PSF or a galaxy-wide matching/extended-source DCR solution.'],
        'inputsExact':True,'oldSourcesExact':len(cp['currentSources']),'oldEvidenceExact':len(cp['evidence']),'protectedExact':6,
        'sourceImageRequests':0,'wholeFilterCoaddRuns':0,'scientificCorrections':'NONE','productionChanges':'NONE','quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(OUT/'result.json',report)
    print(json.dumps({k:report[k] for k in ('catalogDetections','fieldDetectionCounts','qualifiedActualImageDetections','qualifiedFieldCounts','relativeBandMetrics','elapsedSeconds','memory')}))

if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
        raise
