"""Curated foreground-spike ROI proposals after the preserved automatic tie failure."""
import argparse
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
from astropy.wcs import WCS
from sdss_gri_tan import target_tan
spec=importlib.util.spec_from_file_location("original_bounded_registration",TASK/"scripts/experience-hubble-m51-registration-trial-2026-10-02.py")
previous=importlib.util.module_from_spec(spec);spec.loader.exec_module(previous)
bound,inventory,save,save_array=previous.bound,previous.inventory,previous.save,previous.save_array

# Only small source regions around visually observed foreground diffraction spikes.
# These coordinates are proposals, never a coordinate correction or a matched-star certificate.
HINTS=((438,2427),(492,1950),(875,1130),(1151,1812),(1592,2138),(2491,2393))


def estimate(patch,radius):
    h=patch.shape[0]//2
    yy,xx=np.mgrid[-h:h+1,-h:h+1]
    rr=xx*xx+yy*yy
    background=float(np.median(patch[(rr>=20**2)&(rr<=28**2)]))
    weights=np.where(rr<=radius**2,np.maximum(patch.astype(np.float64)-background,0),0)
    total=float(weights.sum())
    assert total>0
    point=np.array([(weights*xx).sum()/total,(weights*yy).sum()/total])
    return {"columnRow":point.tolist(),"backgroundEncodedIntensity":background,"positiveWeightSum":total}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",required=True,type=Path)
    args=parser.parse_args();output=args.output.resolve()
    assert output.is_relative_to((ROOT/"output").resolve()) and not output.exists()
    candidate_path=ROOT/"output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json"
    c=json.loads(candidate_path.read_bytes())
    hst_dir=ROOT/"output/hubble-m51-nominal-projection-trial-1002-r1"
    h=json.loads((hst_dir/"result.json").read_bytes())
    quality_dir=ROOT/"output/sdss-m51-mosaic-quality-diagnosis-1002-r3"
    q=json.loads((quality_dir/"result.json").read_bytes())
    failed=ROOT/"output/hubble-m51-registration-trial-1002-r1"
    retained=json.loads((TASK/"tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    protected=inventory(candidate_path.parent)+inventory(hst_dir)+inventory(quality_dir)+inventory(failed)+inventory(ROOT/"output/hubble-m51-source-quality-trial-1002-r1")+inventory(ROOT/"workers/miniapp-api/assets/deep-sky")+[bound(ROOT/item["path"]) for item in retained]
    output.mkdir(parents=True)
    snapshot=output/"executed-script.py";snapshot.write_bytes(Path(__file__).read_bytes())
    science=np.load(candidate_path.parent/"r-science.npy",mmap_mode="r",allow_pickle=False)
    finite=np.load(candidate_path.parent/"joint-availability.npy",mmap_mode="r",allow_pickle=False)
    flags=np.load(ROOT/q["projectedFlagArrays"]["r"]["path"],mmap_mode="r",allow_pickle=False)
    rgb=np.asarray(Image.open(ROOT/h["source"]["path"]))
    target=target_tan(c["center"],2048,c["fieldDegrees"])
    source=WCS(h["nominalSourceWcs"])
    source_intensity=rgb.astype(np.float64).mean(axis=2)
    rows=[];contacts=[]
    for index,(hintx,hinty) in enumerate(HINTS):
        name=f"foreground-{index+1}"
        search=source_intensity[hinty-18:hinty+19,hintx-18:hintx+19]
        iy,ix=np.unravel_index(np.argmax(search),search.shape)
        hx,hy=hintx-18+int(ix),hinty-18+int(iy)
        raw_patch=previous.extract(source_intensity,hx,hy,32)
        raw_rgb=previous.extract(rgb,hx,hy,64)
        actual_native={str(radius):estimate(raw_patch,radius) for radius in (4,8,12)}
        nominal={}
        for radius in (4,8,12):
            center=np.array([hx,hy])+actual_native[str(radius)]["columnRow"]
            ra,dec=source.all_pix2world(center[0],2775-center[1],0)
            fx,fy=target.all_world2pix(ra,dec,0)
            nominal[str(radius)]={"sourceColumnTopRow":center.tolist(),"raDecDeg":[float(ra),float(dec)],
                                  "nominalTargetColumnRow":[float(fx),float(2047-fy)]}
        nx,ny=np.rint(nominal["8"]["nominalTargetColumnRow"]).astype(np.intp)
        row={"id":name,"visualHintSourceColumnTopRow":[hintx,hinty],"sourcePeakIntegerColumnTopRow":[hx,hy],
             "hstEncodedNativeCentroid":actual_native,"hstNominalCoordinates":nominal,"provisionalIdentification":"visually proposed foreground diffraction-spike feature; matching still requires inspection",
             "hstSourcePhysicalSaturation":"UNKNOWN","hstAllRgb255InNative129Roi":int(np.count_nonzero(np.all(raw_rgb==255,axis=2))),
             "hstAnyRgb255InNative129Roi":int(np.count_nonzero(np.any(raw_rgb==255,axis=2))),"candidates":[]}
        arrays={"hst-original-rgb-roi":save_array(output/(name+"-hst-original-rgb.npy"),raw_rgb)}
        if not(54<=nx<1994 and 54<=ny<1994):row["state"]="NOMINAL_POINT_OUTSIDE_BOUNDED_TARGET_INTERIOR";row["arrays"]=arrays;rows.append(row);continue
        search_science=previous.extract(science,int(nx),int(ny),22)
        py,px=np.where(previous.peaks(search_science))
        order=np.argsort(search_science[py,px])[::-1][:8]
        candidates=[]
        for at in order:
            x,y=int(nx)-22+int(px[at]),int(ny)-22+int(py[at])
            patch=previous.extract(science,x,y,16)
            if not previous.compact(patch,3.2):continue
            yy,xx=np.mgrid[-6:7,-6:7];core=xx*xx+yy*yy<=36
            flag_core=previous.extract(flags,x,y,6)[core]
            candidate={"integerSdssPeakColumnRow":[x,y],"rPeak":float(science[y,x]),
                       "coreRejectedFlagPixels":int(np.count_nonzero(flag_core&previous.REJECT)),
                       "centroids":previous.measurements(patch)}
            candidates.append(candidate)
        candidates.sort(key=lambda item:item["rPeak"],reverse=True)
        row["candidates"]=candidates
        if not candidates:row["state"]="NO_COMPACT_SDSS_COUNTERPART";row["arrays"]=arrays;rows.append(row);continue
        candidate=candidates[0]
        x,y=candidate["integerSdssPeakColumnRow"]
        row["state"]="PROVISIONAL_COUNTERPART_NEEDS_VISUAL_REVIEW" if candidate["coreRejectedFlagPixels"]==0 else "REJECTED_SDSS_CORE_PROCESSING_FLAGS"
        row["selectedHighestRPeak"]=candidate
        row["sdssActualCoordinates"]={str(radius):(np.array([x,y])+candidate["centroids"][str(radius)]["columnRow"]).tolist() for radius in (4,6,8)}
        row["nominalHstMinusSdssTargetColumnRow"]=(np.array(nominal["8"]["nominalTargetColumnRow"])-np.array(row["sdssActualCoordinates"]["6"])).tolist()
        roi=previous.extract(science,int(nx),int(ny),48)
        finite_roi=previous.extract(finite,int(nx),int(ny),48)
        flags_roi=previous.extract(flags,int(nx),int(ny),48)
        arrays.update({"sdss-r-science":save_array(output/(name+"-sdss-r-science.npy"),roi),
                       "sdss-common-finite":save_array(output/(name+"-sdss-common-finite.npy"),finite_roi),
                       "sdss-contributor-r-flags":save_array(output/(name+"-sdss-contributor-r-flags.npy"),flags_roi)})
        row["sdssSavedRoiTargetBoundsXYExclusive"]=[int(nx)-48,int(ny)-48,int(nx)+49,int(ny)+49]
        row["scienceFinitePixelsInRoi"]=int(finite_roi.sum())
        row["sourceContributors"]={}
        for field in c["mosaic"]["fields"]:
            key=field["fieldKey"]
            weight=np.load(candidate_path.parent/c["mosaic"]["diagnostics"][key]["normalized-weight"]["file"],mmap_mode="r",allow_pickle=False)
            if weight[y,x]<=0:continue
            fr=json.loads((quality_dir/(key.replace('/','-')+".result.json")).read_bytes())
            ff=np.load(ROOT/fr["bands"]["r"]["projectedFlags"]["path"],mmap_mode="r",allow_pickle=False)
            row["sourceContributors"][key]={"centerCommonWeight":float(weight[y,x]),"centerFlags":int(ff[y,x]),
                "coreFlags":previous.local.flag_counts(previous.extract(ff,x,y,6)[core],fr["bands"]["r"]["enum"]),
                "association":fr["bands"]["r"]["association"],"fpMSource":fr["bands"]["r"]["maskSource"]}
        row["arrays"]=arrays
        rows.append(row);contacts.append((name,row,raw_rgb,roi))
    if contacts:
        sheet=Image.new("RGB",(740,len(contacts)*288),"#101010");draw=ImageDraw.Draw(sheet)
        for index,(name,row,raw,science_roi) in enumerate(contacts):
            top=index*288
            ht=Image.fromarray(raw).resize((258,258),Image.Resampling.NEAREST)
            low=float(np.quantile(science_roi,.1));high=float(np.quantile(science_roi,.999))
            gray=np.rint(np.clip((science_roi-low)/(high-low),0,1)*255).astype(np.uint8)
            st=Image.fromarray(gray).convert("RGB").resize((258,258),Image.Resampling.NEAREST)
            sheet.paste(ht,(210,top+20));sheet.paste(st,(475,top+20))
            draw.text((5,top+20),f"{name}\nRaw HST source ROI\nSDSS ROI at nominal AVM\nState {row['state']}\nHST-SDSS {np.round(row['nominalHstMinusSdssTargetColumnRow'],3).tolist()}\nR-core bad flags {row['selectedHighestRPeak']['coreRejectedFlagPixels']}",fill="white")
            draw.text((210,top),"Original HST RGB",fill="white");draw.text((475,top),"Actual SDSS r (local linear)",fill="white")
        sheet.save(output/"curated-foreground-contact.png")
    result={"scope":__doc__,"requests":0,"originalAutomaticFailure":bound(failed/"result.json"),"script":bound(snapshot),
            "sourceProjection":bound(hst_dir/"result.json"),"qualityProjection":bound(quality_dir/"result.json"),"sourceHints":list(HINTS),"proposals":rows,
            "transform":"NOT_ESTIMATED_BEFORE_ACTUAL_ROI_REVIEW; no original WCS, RGB, science, masks, assets or publication changed",
            "limits":["Publisher AVM 5arcsec note retained; relative SDSS TAN alignment is not absolute astrometry.",
                      "Prepared HST JPEG clipping has unknown physical saturation and calibration; different filters/PSF and possible proper motion affect matching.",
                      "SOURCE rectangle and SDSS finite are independent of processing flags; the latter only reject this diagnostic tie, never underlying science."]}
    save(output/"result.json",result)
    after=[bound(ROOT/item["path"]) for item in protected];assert after==protected
    save(output/"binding.json",{"script":bound(snapshot),"result":bound(output/"result.json"),"inputsBefore":protected,"inputsAfter":after,"unchanged":True,"outputs":inventory(output)})
    print(bound(output/"result.json"),flush=True)


if __name__=="__main__":main()
