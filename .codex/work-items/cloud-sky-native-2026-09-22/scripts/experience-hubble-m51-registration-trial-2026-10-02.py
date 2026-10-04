"""Bounded task-only compact-source ties between frozen SDSS and nominal HST RGB."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/".codex/work-items/cloud-sky-native-2026-09-22"
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT/"output/allwise-w3-atlas-0929/python-deps"))
sys.path.insert(0,str(ROOT/"data-pipelines/deep-sky"))
import numpy as np
from PIL import Image,ImageDraw
from astropy.io import fits
from astropy.wcs import WCS
from sdss_gri_tan import target_tan
spec=importlib.util.spec_from_file_location("local_diagnostic",TASK/"scripts/experience-sdss-local-overlap-diagnosis-2026-10-02.py")
local=importlib.util.module_from_spec(spec);spec.loader.exec_module(local)
bound,inventory,save,save_array=local.bound,local.inventory,local.save,local.save_array
REJECT=sum(1<<bit for bit in (0,1,2,8,9))
LIMIT=22


def peaks(values):
    qualified=np.ones(values.shape,dtype=np.bool_)
    qualified[0]=qualified[-1]=False;qualified[:,0]=qualified[:,-1]=False
    for dy,dx in ((-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)):
        qualified &= values>np.roll(values,(dy,dx),axis=(0,1))
    return qualified


def extract(array,x,y,radius):
    return np.array(array[y-radius:y+radius+1,x-radius:x+radius+1],copy=True)


def measurements(patch):
    assert patch.shape==(33,33) and np.isfinite(patch).all()
    return {str(radius):local.centroid(patch,radius) for radius in (4,6,8)}


def compact(patch,max_rms):
    value=local.centroid(patch,6)
    if value is None or value["peakContrast"]<10*value["annulusMadSigma"] or value["peakContrast"]<=0:
        return False
    if not .25<value["radialRmsTargetPixels"]<max_rms or np.hypot(*value["columnRow"])>1.5:return False
    yy,xx=np.mgrid[-16:17,-16:17]
    outer=(xx*xx+yy*yy>=6**2)&(xx*xx+yy*yy<=12**2)
    if patch[outer].max()-value["annulusMedian"]>.25*value["peakContrast"]:return False
    return True


def similarity(a,b):
    design=np.zeros((a.shape[0]*2,4),dtype=np.float64)
    design[::2]=np.column_stack((a[:,0],-a[:,1],np.ones(a.shape[0]),np.zeros(a.shape[0])))
    design[1::2]=np.column_stack((a[:,1],a[:,0],np.zeros(a.shape[0]),np.ones(a.shape[0])))
    values,residuals,rank,_=np.linalg.lstsq(design,b.ravel(),rcond=None)
    ca,sa,tx,ty=values
    predicted=(design@values).reshape(-1,2)
    return {"coefficientsRealImagAndTranslation":values.tolist(),"scale":float(np.hypot(ca,sa)),
            "rotationDegrees":float(np.degrees(np.arctan2(sa,ca))),"rank":int(rank),
            "residualsTargetColumnRow":(b-predicted).tolist(),
            "rmsResidualTargetPixels":float(np.sqrt(np.mean(np.sum((b-predicted)**2,axis=1))))}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",required=True,type=Path)
    args=parser.parse_args()
    output=args.output.resolve()
    assert output.is_relative_to((ROOT/"output").resolve()) and not output.exists()
    candidate_path=ROOT/"output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json"
    candidate=json.loads(candidate_path.read_bytes())
    root_hst=ROOT/"output/hubble-m51-nominal-projection-trial-1002-r1"
    hst_report=json.loads((root_hst/"result.json").read_bytes())
    quality_dir=ROOT/"output/sdss-m51-mosaic-quality-diagnosis-1002-r3"
    quality=json.loads((quality_dir/"result.json").read_bytes())
    assert bound(candidate_path)["sha256"]=="73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52"
    assert bound(quality_dir/"result.json")["sha256"]=="9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0"
    preserved=json.loads((TASK/"tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    protected=inventory(candidate_path.parent)+inventory(root_hst)+inventory(quality_dir)+inventory(ROOT/"output/hubble-m51-source-quality-trial-1002-r1")+inventory(ROOT/"workers/miniapp-api/assets/deep-sky")+[bound(ROOT/item["path"]) for item in preserved]
    output.mkdir(parents=True)
    snapshot=output/"executed-script.py";snapshot.write_bytes(Path(__file__).read_bytes())
    science=np.load(candidate_path.parent/"r-science.npy",mmap_mode="r",allow_pickle=False)
    finite=np.load(candidate_path.parent/"joint-availability.npy",mmap_mode="r",allow_pickle=False)
    hst=np.load(ROOT/hst_report["master"]["path"],mmap_mode="r",allow_pickle=False)
    flags=np.load(ROOT/quality["projectedFlagArrays"]["r"]["path"],mmap_mode="r",allow_pickle=False)
    assert science.shape==finite.shape==flags.shape==hst.shape[:2]==(2048,2048)
    assert finite.all() and np.isfinite(science).all()
    intensity=hst[:,:,:3].astype(np.float64).mean(axis=2)
    hst_maxima=peaks(intensity)
    eligible=peaks(science)&finite&(hst[:,:,3]==255)
    margin=16+LIMIT
    eligible[:margin]=eligible[-margin:]=False;eligible[:,:margin]=eligible[:,-margin:]=False
    ys,xs=np.where(eligible)
    order=np.argsort(science[ys,xs])[::-1][:100]
    selected=[];rejected={};inspected=[]
    for index in order:
        x,y=int(xs[index]),int(ys[index])
        if any((x-old[0])**2+(y-old[1])**2<150**2 for old in selected):continue
        patch=extract(science,x,y,16)
        if not compact(patch,3.2):rejected["sdssNotIsolatedCompact"]=rejected.get("sdssNotIsolatedCompact",0)+1;continue
        core_y,core_x=np.mgrid[-6:7,-6:7]
        core=core_x*core_x+core_y*core_y<=6**2
        flag_core=extract(flags,x,y,6)
        if np.any(flag_core[core]&REJECT):rejected["actualContributorRFlags"]=rejected.get("actualContributorRFlags",0)+1;continue
        possible=[]
        hy,hx=np.where(hst_maxima[y-LIMIT:y+LIMIT+1,x-LIMIT:x+LIMIT+1])
        for px,py in zip(hx,hy):
            bx,by=int(x-LIMIT+px),int(y-LIMIT+py)
            if not extract(hst[:,:,3],bx,by,16).all():continue
            hp=extract(intensity,bx,by,16)
            if compact(hp,2.6):possible.append((local.centroid(hp,6)["peakContrast"],bx,by))
        possible.sort(reverse=True)
        inspected.append({"sdssPixel":[x,y],"hstCompactPeaks":[[bx,by] for _,bx,by in possible],"rPeak":float(science[y,x])})
        if not possible:rejected["noHstCompactCounterpart"]=rejected.get("noHstCompactCounterpart",0)+1;continue
        if len(possible)>1 and possible[1][0]>.3*possible[0][0]:
            rejected["ambiguousHstCounterpart"]=rejected.get("ambiguousHstCounterpart",0)+1;continue
        _,bx,by=possible[0]
        selected.append((x,y,bx,by))
        if len(selected)==8:break
    target=target_tan(candidate["center"],2048,candidate["fieldDegrees"])
    hst_wcs=WCS(hst_report["nominalSourceWcs"])
    source_rgb=np.asarray(Image.open(ROOT/hst_report["source"]["path"]))
    rows=[];contact_rows=[]
    for number,(x,y,bx,by) in enumerate(selected):
        name=f"tie-{number+1}"
        sdss_measure=measurements(extract(science,x,y,16))
        hst_measure=measurements(extract(intensity,bx,by,16))
        coords={str(radius):{"sdssColumnRow":(np.array([x,y])+sdss_measure[str(radius)]["columnRow"]).tolist(),
                             "hstNominalTargetColumnRow":(np.array([bx,by])+hst_measure[str(radius)]["columnRow"]).tolist()}
                for radius in (4,6,8)}
        ra,dec=target.all_pix2world(coords["6"]["hstNominalTargetColumnRow"][0],2047-coords["6"]["hstNominalTargetColumnRow"][1],0)
        native_x,native_y=hst_wcs.all_world2pix(ra,dec,0)
        native_top=2775-native_y
        nx,ny=int(np.rint(native_x)),int(np.rint(native_top))
        native_bounds=[max(0,nx-100),max(0,ny-100),min(4000,nx+101),min(2776,ny+101)]
        lx,ly,rx,ry=native_bounds
        native_patch=np.array(source_rgb[ly:ry,lx:rx],copy=True)
        sdss_patch=extract(science,x,y,32)
        hst_patch=extract(hst,x,y,32)
        saved={"sdss-r-science":save_array(output/(name+"-sdss-r-science.npy"),sdss_patch),
               "sdss-common-finite":save_array(output/(name+"-sdss-common-finite.npy"),extract(finite,x,y,32)),
               "actual-contributor-r-flags":save_array(output/(name+"-contributor-r-flags.npy"),extract(flags,x,y,32)),
               "hst-nominal-rgba":save_array(output/(name+"-hst-nominal-rgba.npy"),hst_patch),
               "hst-original-encoded-rgb-roi":save_array(output/(name+"-hst-original-rgb-roi.npy"),native_patch)}
        contributions={}
        for field in candidate["mosaic"]["fields"]:
            key=field["fieldKey"]
            weight=np.load(candidate_path.parent/candidate["mosaic"]["diagnostics"][key]["normalized-weight"]["file"],mmap_mode="r",allow_pickle=False)
            active=extract(weight,x,y,6)[core]>0
            if not active.any():continue
            perfield=json.loads((quality_dir/(key.replace('/','-')+".result.json")).read_bytes())
            native_flags=np.load(ROOT/perfield["bands"]["r"]["projectedFlags"]["path"],mmap_mode="r",allow_pickle=False)
            vals=extract(native_flags,x,y,6)[core][active]
            contributions[key]={"centerCommonWeight":float(weight[y,x]),"activeCorePixels":int(active.sum()),
                                "flagCountsActiveCore":local.flag_counts(vals,perfield["bands"]["r"]["enum"]),
                                "association":perfield["bands"]["r"]["association"],"maskSource":perfield["bands"]["r"]["maskSource"]}
        delta=np.array(coords["6"]["hstNominalTargetColumnRow"])-coords["6"]["sdssColumnRow"]
        row={"id":name,"provisionalIdentification":"isolated compact candidate; requires actual ROI inspection and cross-source star identification",
             "coordinatesByApertureRadius":coords,"nominalHstMinusSdssTargetColumnRow":delta.tolist(),
             "sdssMeasurements":sdss_measure,"hstEncodedIntensityMeasurements":hst_measure,
             "nativeHstColumnTopRow":[float(native_x),float(native_top)],"nativeHstRgbRoiBounds":native_bounds,
             "hstAllRgb255PixelsInOriginalRoi":int(np.count_nonzero(np.all(native_patch==255,axis=2))),
             "hstAnyRgb255PixelsInOriginalRoi":int(np.count_nonzero(np.any(native_patch==255,axis=2))),
             "hstPhysicalSaturation":"UNKNOWN; prepared JPEG clipping is not a science flag",
             "scienceFinitePixels":int(np.count_nonzero(extract(finite,x,y,32))),
             "hstGeometricPixelSupport":int(np.count_nonzero(hst_patch[:,:,3])),
             "sdssActualRContributorFlagCounts":local.flag_counts(extract(flags,x,y,32),perfield["bands"]["r"]["enum"]),
             "sourceContributors":contributions,"arrays":saved}
        rows.append(row)
        contact_rows.append((name,x,y,bx,by,sdss_patch,hst_patch,native_patch))
    fit_result={"status":"NO_TRANSFORM_ADOPTED","requiresInspection":True,"allEstimatesAreProvisional":True}
    if len(rows)>=3:
        fits_by_radius={}
        for radius in (4,6,8):
            a=np.array([row["coordinatesByApertureRadius"][str(radius)]["sdssColumnRow"] for row in rows])
            b=np.array([row["coordinatesByApertureRadius"][str(radius)]["hstNominalTargetColumnRow"] for row in rows])
            delta=b-a
            translated=np.median(delta,axis=0)
            fits_by_radius[str(radius)]={"translationMedianHstMinusSdss":translated.tolist(),"translationResidualsTargetPixels":(delta-translated).tolist(),
                "similarity":similarity(a,b),"coverageBoundsSdssColumnRow":[a.min(axis=0).tolist(),a.max(axis=0).tolist()],
                "leaveOneOutPredictedResiduals":[]}
            if len(rows)>=4:
                for index in range(len(rows)):
                    keep=np.arange(len(rows))!=index
                    fitted=similarity(a[keep],b[keep])
                    ca,sa,tx,ty=fitted["coefficientsRealImagAndTranslation"]
                    predicted=np.array([ca*a[index,0]-sa*a[index,1]+tx,sa*a[index,0]+ca*a[index,1]+ty])
                    fits_by_radius[str(radius)]["leaveOneOutPredictedResiduals"].append((b[index]-predicted).tolist())
        fit_result["byCentroidApertureRadius"]=fits_by_radius
    if contact_rows:
        sheet=Image.new("RGB",(940,len(contact_rows)*216),"#101010");draw=ImageDraw.Draw(sheet)
        for index,(name,x,y,bx,by,sp,hp,native) in enumerate(contact_rows):
            top=index*216
            low=float(np.quantile(sp,.1));high=float(np.quantile(sp,.997))
            gray=np.rint(np.clip((sp-low)/(high-low),0,1)*255).astype(np.uint8)
            st=Image.fromarray(gray).convert("RGB").resize((195,195),Image.Resampling.NEAREST)
            ht=Image.fromarray(hp[:,:,:3]).resize((195,195),Image.Resampling.NEAREST)
            nt=Image.fromarray(native).resize((201,201),Image.Resampling.NEAREST)
            sheet.paste(st,(240,top+15));sheet.paste(ht,(450,top+15));sheet.paste(nt,(660,top+15))
            draw.text((5,top+15),f"{name} SDSS({x},{y})\nHST nominal peak({bx},{by})\nSDSS gray / HST encoded RGB\nBoth target ROIs at SDSS centre\nRight: original HST RGB ROI",fill="white")
            draw.text((240,top),"SDSS r science (local linear)",fill="white");draw.text((450,top),"HST nominal same target region",fill="white")
        sheet.save(output/"provisional-ties-contact.png")
    result={"scope":__doc__,"requests":0,"candidate":bound(candidate_path),"hstProjection":bound(root_hst/"result.json"),
            "sdssQualityProjection":bound(quality_dir/"result.json"),"script":bound(snapshot),"selection":{"maximumSdssPeaks":100,"maxTies":8,
            "searchPlusMinusTargetPixels":LIMIT,"minimumTieSeparationTargetPixels":150,"diagnosticRCoreRejectedBits":[0,1,2,8,9]},
            "rejected":rejected,"inspected":inspected,"ties":rows,"provisionalFit":fit_result,
            "scientificSaturationValidityHst":"UNKNOWN","limits":["Only provisional encoded-RGB intensity versus calibrated but bilinear SDSS r display samples; PSF/filter, processed pixels and possible motion differ.",
                "Nominal publisher AVM warns about 5arcsec; SDSS primary TAN is also approximate; relative fit is not absolute astrometry.",
                "Actual visual ROI inspection must qualify/reject these peaks before a transform is considered; no transform is applied.",
                "No new image, source correction, scientific validity mask, production change, publication or target/native adoption."]}
    save(output/"result.json",result)
    after=[bound(ROOT/item["path"]) for item in protected]
    assert after==protected
    save(output/"binding.json",{"script":bound(snapshot),"result":bound(output/"result.json"),"inputsBefore":protected,"inputsAfter":after,"unchanged":True,"outputs":inventory(output)})
    print(bound(output/"result.json"),"ties",len(rows),flush=True)


if __name__=="__main__":main()
