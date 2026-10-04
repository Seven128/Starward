"""Author qualification of actual foreground ROIs and bounded relative fit; no transform applied."""
import argparse
import importlib.util
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/".codex/work-items/cloud-sky-native-2026-09-22"
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT/"output/allwise-w3-atlas-0929/python-deps"))
spec=importlib.util.spec_from_file_location("registration",TASK/"scripts/experience-hubble-m51-registration-trial-2026-10-02.py")
previous=importlib.util.module_from_spec(spec);spec.loader.exec_module(previous)
import numpy as np
bound,inventory,save=previous.bound,previous.inventory,previous.save
ACCEPTED=("foreground-1","foreground-2","foreground-3","foreground-5")


def hull(points):
    points=sorted(tuple(point) for point in points)
    def cross(o,a,b):return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    lower=[]
    for point in points:
        while len(lower)>=2 and cross(lower[-2],lower[-1],point)<=0:lower.pop()
        lower.append(point)
    upper=[]
    for point in reversed(points):
        while len(upper)>=2 and cross(upper[-2],upper[-1],point)<=0:upper.pop()
        upper.append(point)
    return np.array(lower[:-1]+upper[:-1])


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",required=True,type=Path)
    args=parser.parse_args();output=args.output.resolve()
    assert output.is_relative_to((ROOT/"output").resolve()) and not output.exists()
    curated=ROOT/"output/hubble-m51-curated-registration-1002-r1"
    automatic=ROOT/"output/hubble-m51-registration-trial-1002-r1"
    assert bound(curated/"result.json")["sha256"]=="fdbd364dd867f9df92986ac5af59010cca339b15c45d4d0e20ccdf4bae5445cc"
    c=json.loads((curated/"result.json").read_bytes())
    points={point["id"]:point for point in c["proposals"]}
    protected=inventory(curated)+inventory(automatic)
    output.mkdir(parents=True)
    snapshot=output/"executed-script.py";snapshot.write_bytes(Path(__file__).read_bytes())
    qualifications=[]
    for name in ACCEPTED:
        point=points[name]
        assert point["state"]=="PROVISIONAL_COUNTERPART_NEEDS_VISUAL_REVIEW"
        assert point["selectedHighestRPeak"]["coreRejectedFlagPixels"]==0
        assert list(point["sourceContributors"])==["301/3699/6/100"]
        r=np.load(ROOT/point["arrays"]["sdss-r-science"]["path"],allow_pickle=False)
        finite=np.load(ROOT/point["arrays"]["sdss-common-finite"]["path"],allow_pickle=False)
        flags=np.load(ROOT/point["arrays"]["sdss-contributor-r-flags"]["path"],allow_pickle=False)
        assert finite.all() and np.isfinite(r).all() and r.shape==flags.shape==finite.shape==(97,97)
        candidate=point["selectedHighestRPeak"]
        x,y=candidate["integerSdssPeakColumnRow"]
        left,top,_,_=point["sdssSavedRoiTargetBoundsXYExclusive"]
        core=flags[y-top-6:y-top+7,x-left-6:x-left+7]
        yy,xx=np.mgrid[-6:7,-6:7]
        assert not np.any(core[xx*xx+yy*yy<=36]&previous.REJECT)
        measurements=previous.measurements(r[y-top-16:y-top+17,x-left-16:x-left+17])
        assert measurements==candidate["centroids"]
        other=point["candidates"][1:]
        qualifications.append({"id":name,"authorVisualQualification":"ACTUAL_CONTACT_VIEWED: HST foreground diffraction spikes and single strong compact SDSS r counterpart with nearby weak features distinguished",
            "actualContributorRejectedRCoreFlags":0,"finiteRoiPixels":int(finite.sum()),
            "selectedRPeakOverNextCompactCandidate":None if not other else candidate["rPeak"]/other[0]["rPeak"],
            "sourceField":"301/3699/6/100","scientificHstQuality":"UNKNOWN; JPEG highlight clipping is not a physical saturation flag"})
    fits={}
    for label,sdss_radius,hst_radius in (("small",4,4),("central",6,8),("large",8,12)):
        a=np.array([points[name]["sdssActualCoordinates"][str(sdss_radius)] for name in ACCEPTED])
        b=np.array([points[name]["hstNominalCoordinates"][str(hst_radius)]["nominalTargetColumnRow"] for name in ACCEPTED])
        delta=b-a
        median=np.median(delta,axis=0)
        fit=previous.similarity(a,b)
        loo=[]
        for index,name in enumerate(ACCEPTED):
            keep=np.arange(len(a))!=index
            f=previous.similarity(a[keep],b[keep])
            ca,sa,tx,ty=f["coefficientsRealImagAndTranslation"]
            predicted=np.array([ca*a[index,0]-sa*a[index,1]+tx,sa*a[index,0]+ca*a[index,1]+ty])
            residual=b[index]-predicted
            loo.append({"heldOut":name,"residualTargetColumnRow":residual.tolist(),"normTargetPixels":float(np.linalg.norm(residual))})
        polygon=hull(a)
        area=abs(float(np.sum(polygon[:,0]*np.roll(polygon[:,1],-1)-polygon[:,1]*np.roll(polygon[:,0],-1))/2))
        fits[label]={"sdssCentroidRadiusTargetPixels":sdss_radius,"hstCentroidRadiusOriginalJpegPixels":hst_radius,
                     "sdssTargetPoints":a.tolist(),"nominalHstTargetPoints":b.tolist(),"individualHstMinusSdss":delta.tolist(),
                     "translationMedianHstMinusSdss":median.tolist(),"translationRmsResidualTargetPixels":float(np.sqrt(np.mean(np.sum((delta-median)**2,axis=1)))),
                     "similarity":fit,"leaveOneOut":loo,"convexHullTargetPixels":polygon.tolist(),"convexHullAreaTargetPixelsSquared":area,
                     "convexHullOverNominalHstGeometricSupport":area/1425463,"boundsTargetColumnRow":[a.min(axis=0).tolist(),a.max(axis=0).tolist()]}
    # One known-sample orientation/scale/rotation control for this isolated fitter.
    controls_a=np.array([[100,150],[720,120],[850,720],[240,850]],dtype=np.float64)
    angle=np.radians(.12);scale=1.003;ca=scale*np.cos(angle);sa=scale*np.sin(angle)
    controls_b=controls_a@np.array([[ca,-sa],[sa,ca]]).T+np.array([.8,-1.2])
    control=previous.similarity(controls_a,controls_b)
    assert abs(control["scale"]-scale)<1e-12 and abs(control["rotationDegrees"]-.12)<1e-12 and control["rmsResidualTargetPixels"]<1e-9
    # The actual incorrect early matching generation is retained, never fitted into accepted points.
    false_pairs=json.loads((automatic/"result.json").read_bytes())["ties"]
    assert false_pairs[0]["coordinatesByApertureRadius"]["6"]["sdssColumnRow"][0]==points["foreground-1"]["sdssActualCoordinates"]["6"][0]
    assert false_pairs[1]["coordinatesByApertureRadius"]["6"]["sdssColumnRow"][0]==points["foreground-2"]["sdssActualCoordinates"]["6"][0]
    comparisons=[{"automaticTie":false_pairs[index]["id"],"qualifiedForeground":ACCEPTED[index],
                  "automaticWrongNeighbourDelta":false_pairs[index]["nominalHstMinusSdssTargetColumnRow"],
                  "actualForegroundDelta":points[ACCEPTED[index]]["nominalHstMinusSdssTargetColumnRow"]} for index in (0,1)]
    result={"scope":__doc__,"requests":0,"curatedProposals":bound(curated/"result.json"),"automaticProvisionalFailure":bound(automatic/"result.json"),
            "qualifiedAuthorTies":qualifications,"excluded":[{"id":"foreground-4","reason":"Actual contributing SDSS core processing flag rejection, despite positive finite science"},
            {"id":"foreground-6","reason":"No isolated compact SDSS counterpart under the unchanged bounded criteria"},
            {"id":"automatic-tie-3","reason":"Point in companion dust field lacks sufficient foreground identification; never used"}],
            "falseNeighbourEvidence":comparisons,"fitVariants":fits,"knownSimilarityControl":control,
            "status":"RELATIVE_DIAGNOSTIC_ONLY_NO_TRANSFORM_APPLIED",
            "limits":["Four visually qualified author ties are not independent review or catalog-confirmed stellar identity.",
                "All accepted SDSS points use one field 3699/301/6/100; their local convex hull does not validate HST full field or cross-run mosaic.",
                "PSF/wavelength/processed highlight clipping, possible proper motion and SDSS linear TAN approximation remain systematic uncertainty; aperture and LOO are diagnostics, not an absolute error bound.",
                "Original AVM approximately5arcsec note, source matrix, decoded RGB, masks/science/weights, PNGs, assets, native status and publication remain unchanged."]}
    save(output/"result.json",result)
    after=[bound(ROOT/item["path"]) for item in protected];assert after==protected
    save(output/"binding.json",{"script":bound(snapshot),"result":bound(output/"result.json"),"inputsBefore":protected,"inputsAfter":after,"unchanged":True,"outputs":inventory(output)})
    print(bound(output/"result.json"),flush=True)


if __name__=="__main__":main()
