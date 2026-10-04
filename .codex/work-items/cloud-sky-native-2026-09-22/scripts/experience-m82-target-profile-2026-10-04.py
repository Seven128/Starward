"""Actual saved M82 target shape/amplitude/affine residuals, without source replay.

Unweighted descriptive projection only. No independent pixel assumption, chi
square/confidence, flux calibration, centre fitting or global matching kernel.
"""
from pathlib import Path
import importlib.util,json,sys,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image,ImageDraw

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,TASK/'scripts'/file);m=importlib.util.module_from_spec(spec);sys.modules[name]=m;spec.loader.exec_module(m);return m
binding=module('profile_binding','analyze-m82-fixed-response-shapes-2026-10-04.py');bind,save=binding.bind,binding.save
profile=module('descriptive_profile','sdss-descriptive-target-profile-2026-10-04.py')
resources=module('profile_memory','experience-shared-noise-display-2026-10-03.py')
SOURCE=ROOT/'output/sdss-m82-fixed-display-response-1004-r1';OUT=ROOT/'output/sdss-m82-target-profile-1004-r1'

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    started,cpu=time.perf_counter(),time.process_time();pins={}
    def pin(p,expected=None):
        value=bind(p)
        if expected is not None:assert value==expected
        assert pins.setdefault(value['path'],value)==value;return value
    def doc(p):pin(p);return json.loads(p.read_bytes())
    cp_path=TASK/'evidence/current-execution-state-2026-10-04-r89.json';cp=doc(cp_path)
    for v in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/v['path'])==v
    pin(ROOT/'output/sdss-m82-fixed-display-response-readback-1004-r2/checkpoint-continuity.json')
    for p in (Path(__file__),Path(profile.__file__),Path(binding.__file__),Path(resources.__file__),Path(np.linalg._linalg.__file__)):pin(p)
    source=doc(SOURCE/'result.json')
    catalog=doc(ROOT/'output/sdss-m82-measured-stars-1004-r4/result.json')
    central=doc(ROOT/'output/sdss-m82-central-native-1004-r2/result.json')
    native_lookup={v['objID']:v for v in catalog['records'] if 'targetSaved' in v}|{v['rCandidateId']:v for v in central['fits']}
    assert len(native_lookup)==134
    native_summary={};native_files=0
    for identity,row in native_lookup.items():
        summary={}
        for b,band in row['bands'].items():
            file=ROOT/band['saved']['path'];pin(file,band['saved']);native_files+=1
            with np.load(file,allow_pickle=False) as z:
                if 'residual' in z:
                    residual=z['residual'][z['fit_mask']];assert np.isfinite(residual).all()
                    metrics={'originalFitSupport':len(residual),'originalResidualRmsNmgy':float(np.sqrt(np.mean(residual**2))),
                        'originalResidualMaximumAbsoluteNmgy':float(np.max(np.abs(residual)))}
                else:metrics={'originalResidual':'UNAVAILABLE_NO_SAVED_FITTED_RESIDUAL'}
            summary[b]={'originalFitStatus':band['fitStatus'],'originalCenterAtBounds':band.get('centerAtBounds'),
                'originalConditionalChiSquarePerDof':band.get('conditionalChiSquarePerDof',band.get('localChiSquarePerDof')),
                'originalRelativeNativeCenterXY':band.get('relativeNativeCenterXY'),'saved':band['saved'],**metrics}
        native_summary[identity]=summary
    for row in source['records']:pin(ROOT/row['arrays']['path'],row['arrays'])
    before=list(pins.values());save(OUT/'inputs-before.json',before);records=[]
    for row in source['records']:
        with np.load(ROOT/row['arrays']['path'],allow_pickle=False) as z:
            a={k:z[k] for k in ('target_global_yx','targets_yx','source_target_x','source_target_y','selected_offsets','selected_sample_ids',
                'target_science','fixed_actual_estimates','target_saved_science_unit','fixed_unit_response','fixed_unit_known','current_qualified','current_radius')}
        y,x=a['target_global_yx'].T;anchor=row['anchorTargetXY']
        sci_basis=profile.affine_basis(x,y,anchor)
        cur_basis=profile.recorded_affine_basis(a['source_target_x'],a['source_target_y'],anchor,a['selected_offsets'],a['selected_sample_ids'])
        assert len(cur_basis)==len(x)
        # Support is diagnostic only: no science, source mask or candidate edits.
        valid=np.isfinite(a['target_saved_science_unit'])&a['fixed_unit_known']&a['current_qualified'][None]
        valid&=np.isfinite(a['target_science'])&np.isfinite(a['fixed_actual_estimates'])
        packet={'global_targets_yx':a['target_global_yx'],'science_basis':sci_basis,'current_recorded_basis':cur_basis,
            'science_data':a['target_science'],'current_data':a['fixed_actual_estimates'],'science_unit':a['target_saved_science_unit'],
            'current_unit':a['fixed_unit_response'],'shared_fit_support':valid,'current_radius':a['current_radius']}
        entry={'index':row['index'],'material':row['material'],'anchorTargetXY':anchor,'targetBoundsXYExclusive':row['targetBoundsXYExclusive'],
            'bands':{},'originalNativeDiagnostics':native_summary.get(row['material']['id']),
            'mappedPlaneTargetDifferences':int(np.any(cur_basis!=sci_basis,axis=1).sum())}
        for stage,basis in (('science',sci_basis),('current',cur_basis)):
            pred=np.full((3,len(x)),np.nan);resid=pred.copy();plane=pred.copy();coef=np.full((3,4),np.nan);plane_coef=np.full((3,3),np.nan)
            for at,b in enumerate('gri'):
                fit=profile.descriptive_profile(packet[stage+'_data'][at],packet[stage+'_unit'][at],basis,valid[at])
                metrics={'state':'UNAVAILABLE_SUPPORT_OR_RANK','support':int(valid[at].sum())}
                if fit is not None:
                    pred[at]=fit.prediction;resid[at]=fit.residual;plane[at]=fit.plane_only_prediction;coef[at]=fit.coefficients;plane_coef[at]=fit.plane_only_coefficients
                    v=valid[at];rss=float(np.square(resid[at,v]).sum());plane_rss=float(np.square(packet[stage+'_data'][at,v]-plane[at,v]).sum())
                    point=fit.coefficients[0]*packet[stage+'_unit'][at,v];point_norm=float(np.linalg.norm(point))
                    radius=np.hypot(x-anchor[0],y-anchor[1]);shells={}
                    for name,mask in (('core0to3',radius<=3),('annulus3to7',(radius>3)&(radius<=7)),('annulus7to12',(radius>7)&(radius<=12))):
                        used=mask&v;shells[name]={'support':int(used.sum()),'residualRmsNmgy':float(np.sqrt(np.mean(resid[at,used]**2))) if used.any() else None}
                    metrics={'state':'DESCRIPTIVE_POSITIVE_AMPLITUDE' if fit.coefficients[0]>0 else 'DESCRIPTIVE_NONPOSITIVE_AMPLITUDE',
                        'support':int(v.sum()),'rank':fit.rank,'coefficientsUnitConstantDx12Dy12':fit.coefficients.tolist(),
                        'designSingularValues':fit.singular_values.tolist(),'residualRmsNmgy':float(np.sqrt(rss/v.sum())),
                        'residualMaximumAbsoluteNmgy':float(np.max(abs(resid[at,v]))),'residualSumSquaresNmgySquared':rss,
                        'planeOnlyResidualSumSquaresNmgySquared':plane_rss,'descriptiveResidualToPointNorm':float(np.sqrt(rss)/point_norm) if point_norm>0 else None,
                        'radialResiduals':shells,'probabilisticOrFluxInterpretation':False}
                entry['bands'].setdefault(b,{})[stage]=metrics
            packet[stage+'_prediction']=pred;packet[stage+'_residual']=resid;packet[stage+'_plane_only_prediction']=plane
            packet[stage+'_coefficients']=coef;packet[stage+'_plane_only_coefficients']=plane_coef
        path=OUT/f'profile-{row["index"]:03}.npz';np.savez_compressed(path,**packet);entry['saved']=bind(path);records.append(entry)
        save(OUT/f'progress-{row["index"]:03}.json',{'completed':len(records),'record':entry,'elapsedSeconds':time.perf_counter()-started})
    images=[]
    for start in range(0,146,8):
        page=records[start:start+8];sheet=Image.new('RGB',(738,252*len(page)),'#181818');draw=ImageDraw.Draw(sheet)
        for k,row in enumerate(page):
            with np.load(ROOT/row['saved']['path'],allow_pickle=False) as z:a={n:z[n] for n in z.files}
            for at,b in enumerate('gri'):
                offset=k*252+at*84
                planes=[a[n][at] for n in ('science_data','science_prediction','science_residual','current_data','current_prediction','current_residual')]
                finite=np.concatenate([v[np.isfinite(v)] for v in planes]);scale=float(np.max(abs(finite))) if len(finite) else 1
                draw.text((2,offset),f'{row["index"]} {row["material"]["id"]} {b}: sci/model/resid | current/model/resid, +/-{scale:.4g} nMgy',fill='white')
                for col,v in enumerate(planes):
                    sheet.paste(binding.signed_panel(v,np.isfinite(v),a['global_targets_yx'],row['targetBoundsXYExclusive'],scale if scale>0 else 1).resize((64,64),Image.Resampling.NEAREST),(col*120,offset+18))
        path=OUT/f'actual-target-profiles-{start//8+1}.png';sheet.save(path);images.append(bind(path))
    after=[bind(ROOT/v['path']) for v in before];assert before==after;save(OUT/'inputs-after.json',after)
    for v in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/v['path'])==v
    statuses={}
    for row in records:
        for band in row['bands'].values():
            for stage,m in band.items():statuses.setdefault(stage,{});statuses[stage][m['state']]=statuses[stage].get(m['state'],0)+1
    report={'scope':__doc__,'actualLocations':len(records),'actualBandStageDiagnostics':876,'nativeSavedFilesReused':native_files,
        'records':records,'images':images,'statuses':statuses,'mappedPlaneTargetDifferences':sum(r['mappedPlaneTargetDifferences'] for r in records),
        'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'memory':resources.memory(),
        'policy':'All recorded radius12 targets, shared actual qualified/finite science+current model support. NumPy SVD least-squares amplitude+affine background, and plane-only comparison; current affine terms mapped by actual saved CSR means. No variance weighting/chi-square/independence/confidence/centre optimisation or extra native/coadd processing. Background is a descriptive raw-sampling-view nuisance, not a fitted source sky correction.',
        'limits':['Residual includes noise, blend, extended structure, registration and model mismatch; not calibrated uncertainty or a PSF quality threshold.',
            'Unit amplitude has nMgy per relative sampled unit meaning, not independently calibrated or flux-conserving total flux.',
            'Native/target fits have different spaces, support, weighting and nuisance terms; native residual RMS is retained context, not directly comparable quality.',
            'Finite model support exclusion is diagnostic only, not new scientific mask/coverage or repaired sky.',
            'Geometry controls are not stars;114 anonymous candidates and all original nonpositive/bound/native failures retain their status.'],
        'oldSourcesExact':len(cp['currentSources']),'oldEvidenceExact':len(cp['evidence']),'protectedExact':6,
        'sourceRequestsOrDetectionNativeFitVarianceReprojectionOrWholeFilterCoaddOrCorrections':False,'productionChanges':[],
        'quality':'UNVERIFIED','independentReview':'MISSING','ordinaryAdoption':False}
    save(OUT/'result.json',report);print(json.dumps({k:report[k] for k in ('actualLocations','actualBandStageDiagnostics','nativeSavedFilesReused','statuses','mappedPlaneTargetDifferences','elapsedSeconds','cpuSeconds','memory')}),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as error:
        if OUT.exists():save(OUT/'failed.json',{'type':type(error).__name__,'error':str(error),'scientificCorrections':False})
        raise
