"""Task-only estimator controls and exact readback for the bounded overlap diagnosis."""
import argparse
import importlib.util
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/".codex/work-items/cloud-sky-native-2026-09-22"
sys.path.insert(0,str(ROOT/"output/allwise-w3-atlas-0929/python-deps"))
import numpy as np
source=TASK/"scripts/experience-sdss-local-overlap-diagnosis-2026-10-02.py"
spec=importlib.util.spec_from_file_location("overlap_diagnosis",source)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",required=True,type=Path)
    args=parser.parse_args()
    output=args.output.resolve()
    assert output.is_relative_to((ROOT/"output").resolve()) and not output.exists()
    diagnosis=ROOT/"output/sdss-local-overlap-diagnosis-1002-r1"
    report=json.loads((diagnosis/"result.json").read_bytes())
    assert module.bound(source)["sha256"]==module.bound(diagnosis/"executed-script.py")["sha256"]
    frozen=module.inventory(diagnosis)+[module.bound(source)]
    output.mkdir(parents=True)
    snapshot=output/"executed-script.py"
    snapshot.write_bytes(Path(__file__).read_bytes())
    yy,xx=np.mgrid[0:33,0:33]
    a=np.exp(-((xx-16.2)**2+(yy-15.7)**2)/(2*1.6**2))-.03
    known=[.64,-.38]
    b=1.23*np.exp(-((xx-16.2-known[0])**2+(yy-15.7-known[1])**2)/(2*1.6**2))+.02
    fitted=module.local_shift(a,b)
    error=np.asarray(fitted["samplingBAtAPlusColumnRow"])-known
    assert np.max(np.abs(error))<.04 and not fitted["atSearchBoundary"]
    same=module.local_shift(a,a)
    assert np.max(np.abs(same["samplingBAtAPlusColumnRow"]))<1e-12
    assert module.local_shift(np.zeros((33,33)),np.zeros((33,33))) is None
    beyond=1.23*np.exp(-((xx-18.7)**2+(yy-15.7)**2)/(2*1.6**2))+.02
    bounded=module.local_shift(a,beyond)
    assert bounded["atSearchBoundary"]
    controls={"knownAnalyticPeakBMinusA":known,"fit":fitted,"absoluteErrorPixels":np.abs(error).tolist(),
              "samePatch":same,"constantPatch":"NO_ESTIMATE","beyondTwoPixelSearch":bounded,
              "meaning":"Only bounded estimator orientation/recovery controls; analytic Gaussian is not actual PSF or astrometric truth."}
    summaries=[]
    readback_count=0
    for pair in report["pairs"]:
        summary={"fieldA":pair["fieldA"],"fieldB":pair["fieldB"],"crossRun":pair["crossRun"],
                 "stars":[],"backgrounds":[],"entireOutsideCatalogPatches":0}
        for peak in pair["compactPeaks"]:
            science=np.load(ROOT/peak["arrays"]["science-gArAgBrBgAiAiB"]["path"],allow_pickle=False)
            flags=np.load(ROOT/peak["arrays"]["flags"]["path"],allow_pickle=False)
            finite=np.load(ROOT/peak["arrays"]["finite"]["path"],allow_pickle=False)
            kernels=np.load(ROOT/peak["arrays"]["signed-native-kernels"]["path"],allow_pickle=False)
            assert science.shape==flags.shape==finite.shape==(6,33,33) and finite.all() and np.isfinite(science).all()
            assert kernels.shape==(6,51,51) and np.isfinite(kernels).all()
            star={"targetColumnRow":peak["targetColumnRow"],"insideCatalogEllipse":peak["insideExpandedCatalogEllipse"],"bands":{}}
            for bi,band in enumerate("gri"):
                data=peak["bands"][band]
                for fi,field in enumerate((pair["fieldA"],pair["fieldB"])):
                    index=2*bi+fi
                    actual=data["fields"][field]
                    assert module.centroid(science[index],6)==actual["centroidByRadius"]["6"]
                    assert float(kernels[index].sum())==actual["signedKernelSum"]
                    assert int(np.count_nonzero(kernels[index]<0))==actual["signedKernelNegativePixels"]
                    nea=float(kernels[index].sum()**2/np.square(kernels[index]).sum())
                    assert nea==actual["noiseEquivalentAreaNativePixels"]
                fit=module.local_shift(science[2*bi],science[2*bi+1])
                assert fit==data["localMatch"]
                nea=[data["fields"][field]["noiseEquivalentAreaNativePixels"] for field in (pair["fieldA"],pair["fieldB"])]
                star["bands"][band]={"localShiftBMinusATargetPixels":fit["samplingBAtAPlusColumnRow"],
                    "scaleBToA":fit["scaleBToA"],"rmsResidualOverAStd":fit["residualRmsOverAStandardDeviation"],
                    "centroidBMinusAAtRadius6":data["centroidBMinusAByRadius"][1],
                    "centroidRadiusSensitivityPixels":data["centroidOffsetApertureSpreadPixels"],
                    "nativePsfNoiseEquivalentAreaAandB":nea,"nativePsfNeaBOverA":nea[1]/nea[0],
                    "coreProcessingFlagsAandB":[data["fields"][field]["coreProcessingFlagsPresent"] for field in (pair["fieldA"],pair["fieldB"])]}
                readback_count+=1
            summary["stars"].append(star)
        for patch in pair["backgroundPatches"]:
            science=np.load(ROOT/patch["arrays"]["science"]["path"],allow_pickle=False)
            flags=np.load(ROOT/patch["arrays"]["flags"]["path"],allow_pickle=False)
            assert science.shape==flags.shape==(6,33,33) and np.isfinite(science).all()
            background={"targetColumnRow":patch["targetColumnRow"],"entireOutsideCatalogEllipse":patch["entireRoiOutsideExpandedCatalogEllipse"],
                        "bands":{},"residualColorBMinusA":patch["medianResidualColorBMinusA"]}
            if background["entireOutsideCatalogEllipse"]:summary["entireOutsideCatalogPatches"]+=1
            for bi,band in enumerate("gri"):
                data=patch["bands"][band]
                for fi,field in enumerate((pair["fieldA"],pair["fieldB"])):
                    assert module.stats(science[2*bi+fi])==data[field]["science"]
                delta=module.stats(science[2*bi+1].astype(np.float64)-science[2*bi])
                assert delta==data["BMinusA"]
                background["bands"][band]={"Amedian":data[pair["fieldA"]]["science"]["median"],
                    "Bmedian":data[pair["fieldB"]]["science"]["median"],"BMinusAMedian":delta["median"],
                    "marginalMadSigmaAandB":[data[field]["science"]["madSigma"] for field in (pair["fieldA"],pair["fieldB"])],
                    "differenceMadSigma":delta["madSigma"],"differenceOverQuadratureMarginalMad":data["differenceMadSigmaOverCombinedMarginalMad"],
                    "objectPixelsAandB":[int(np.count_nonzero(flags[2*bi+fi]&(1<<3))) for fi in (0,1)],
                    "processingPixelsAandB":[int(np.count_nonzero(flags[2*bi+fi]&module.REJECT_DIAGNOSTIC_STAR_FLAGS)) for fi in (0,1)],
                    "notCheckedPixelsAandB":[int(np.count_nonzero(flags[2*bi+fi]&(1<<2))) for fi in (0,1)]}
                readback_count+=1
            summary["backgrounds"].append(background)
        summaries.append(summary)
    module.save(output/"controls.json",controls)
    module.save(output/"derived-summary.json",{"diagnosis":module.bound(diagnosis/"result.json"),"pairs":summaries,
               "exactReadbackLocalBandMeasurements":readback_count,"estimatorControls":module.bound(output/"controls.json"),
               "meaning":"Author readback, not independent review; no quality adoption or corrected outputs."})
    after=[module.bound(ROOT/item["path"]) for item in frozen]
    assert after==frozen
    module.save(output/"binding.json",{"script":module.bound(snapshot),"diagnosticOwner":module.bound(source),
                "protectedDiagnosisBefore":frozen,"protectedDiagnosisAfter":after,"unchanged":True,"outputs":module.inventory(output)})
    print(module.bound(output/"derived-summary.json"),flush=True)


if __name__=="__main__":main()
