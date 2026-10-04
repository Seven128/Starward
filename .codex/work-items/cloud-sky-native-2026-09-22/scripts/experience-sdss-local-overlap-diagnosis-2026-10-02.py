"""Offline bounded local overlap diagnostics; no science, weight or display edits."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
sys.path.insert(0, str(ROOT / "data-pipelines/deep-sky"))
import numpy as np
from PIL import Image, ImageDraw
from sdss_corrected_frame import read_cached_frame
from sdss_frame_quality import read_cached_psfield, read_cached_fpm, check_frame_quality
from sdss_gri_tan import target_tan

BANDS = tuple("gri")
RADIUS = 16
REJECT_DIAGNOSTIC_STAR_FLAGS = sum(1 << value for value in (0, 1, 8, 9))


def bound(path):
    path = Path(path).resolve()
    sha = hashlib.sha256()
    with path.open("rb") as stream:
        for data in iter(lambda: stream.read(1024 * 1024), b""):
            sha.update(data)
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": path.stat().st_size, "sha256": sha.hexdigest()}


def inventory(directory):
    return [bound(path) for path in sorted(directory.rglob("*")) if path.is_file()]


def save(path, value):
    with path.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n")


def save_array(path, value):
    with path.open("xb") as stream:
        np.save(stream, value, allow_pickle=False)
    replay = np.load(path, allow_pickle=False)
    assert replay.dtype == value.dtype and replay.shape == value.shape and replay.tobytes() == value.tobytes()
    return bound(path) | {"shape": list(value.shape), "dtype": value.dtype.str,
                          "sha256COrder": hashlib.sha256(value.tobytes()).hexdigest()}


def stats(values):
    values = np.asarray(values, dtype=np.float64)
    assert values.size and np.isfinite(values).all()
    median = float(np.median(values))
    return {"samples": int(values.size), "median": median,
            "madSigma": float(1.4826 * np.median(np.abs(values - median))),
            "p05": float(np.quantile(values, .05)), "p95": float(np.quantile(values, .95)),
            "negativeSamples": int(np.count_nonzero(values < 0)), "zeroSamples": int(np.count_nonzero(values == 0))}


def flag_counts(values, enum):
    return {name: int(np.count_nonzero(values & (1 << bit))) for name, bit in enum.items() if bit < 10}


def centroid(patch, radius):
    yy, xx = np.mgrid[-RADIUS:RADIUS+1, -RADIUS:RADIUS+1]
    annulus = (xx*xx + yy*yy >= 10**2) & (xx*xx + yy*yy <= 15**2)
    background = float(np.median(patch[annulus]))
    noise = stats(patch[annulus])["madSigma"]
    aperture = xx*xx + yy*yy <= radius**2
    # Positive residual weights belong only to this diagnostic centroid estimator.
    weights = np.where(aperture, np.maximum(patch.astype(np.float64) - background, 0), 0)
    total = float(weights.sum())
    if total <= 0:
        return None
    cx, cy = float((weights*xx).sum()/total), float((weights*yy).sum()/total)
    variance = float((weights*((xx-cx)**2+(yy-cy)**2)).sum()/total)
    return {"columnRow": [cx, cy], "positiveResidualSum": total, "annulusMedian": background,
            "annulusMadSigma": noise, "radialRmsTargetPixels": float(np.sqrt(variance)),
            "peakContrast": float(patch.max()-background), "diagnosticOnly": True}


def local_shift(a, b):
    """Only a 17x17 star ROI, +/-2px search, fitted scale/constant for diagnostics."""
    yy, xx = np.mgrid[8:25, 8:25]
    target = a[8:25, 8:25].astype(np.float64).ravel()
    target_std = float(target.std())
    if target_std == 0:
        return None
    def evaluate(dx, dy):
        sx, sy = xx + dx, yy + dy
        ix, iy = np.floor(sx).astype(np.intp), np.floor(sy).astype(np.intp)
        fx, fy = sx-ix, sy-iy
        shifted = ((1-fx)*(1-fy)*b[iy,ix] + fx*(1-fy)*b[iy,ix+1] +
                   (1-fx)*fy*b[iy+1,ix] + fx*fy*b[iy+1,ix+1]).astype(np.float64).ravel()
        design = np.column_stack((shifted, np.ones(shifted.size)))
        scale, offset = np.linalg.lstsq(design, target, rcond=None)[0]
        residual = target - (scale*shifted + offset)
        return float(np.mean(residual*residual)), float(scale), float(offset)
    candidates = [(evaluate(float(dx),float(dy))[0], float(dx), float(dy))
                  for dy in np.arange(-2,2.001,.1) for dx in np.arange(-2,2.001,.1)]
    _, dx, dy = min(candidates)
    refined = [(evaluate(float(x),float(y))[0],float(x),float(y))
               for y in np.arange(dy-.1,dy+.1001,.02) for x in np.arange(dx-.1,dx+.1001,.02)
               if -2 <= x <= 2 and -2 <= y <= 2]
    mse, dx, dy = min(refined)
    _, scale, offset = evaluate(dx,dy)
    mse0, scale0, offset0 = evaluate(0,0)
    return {"samplingBAtAPlusColumnRow": [dx,dy], "searchLimitPixels": 2, "refinementStepPixels": .02,
            "atSearchBoundary": bool(abs(dx)>1.95 or abs(dy)>1.95),
            "rmsAfter": float(np.sqrt(mse)), "rmsUnshiftedWithFittedScaleOffset": float(np.sqrt(mse0)),
            "residualRmsOverAStandardDeviation": float(np.sqrt(mse)/target_std),
            "scaleBToA": scale, "constantBToA": offset, "unshiftedScaleBToA": scale0,
            "unshiftedConstantBToA": offset0,
            "meaning": "Local intensity match with diagnostic fitted scale/constant; PSF, morphology, sampling and noise can confound a shift. Nothing is applied."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    assert output.is_relative_to((ROOT/"output").resolve()) and not output.exists()
    candidate_path = ROOT/"output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json"
    assert bound(candidate_path)["sha256"] == "73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52"
    candidate = json.loads(candidate_path.read_bytes())
    pair_path = candidate_path.parent/"overlap-diagnostics.json"
    pair_metadata = json.loads(pair_path.read_bytes())
    acquisitions = [ROOT/"output/sdss-m51-core-quality-inputs-1002-r1/acquisition.json",
                    ROOT/"output/sdss-contributing-quality-inputs-1002-r1/acquisition.json"]
    sources = {item["filename"]: item for path in acquisitions for item in json.loads(path.read_bytes())["sourceFiles"]}
    owner_paths = [ROOT/"data-pipelines/deep-sky"/name for name in
                   ("sdss_frame_quality.py","sdss_source_stencil.py","sdss_gri_tan.py","sdss_corrected_frame.py","image_quality.py")]
    preserved = json.loads((TASK/"tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    assert all(bound(ROOT/item["path"])["sha256"] == item["sha256"] for item in preserved)
    protected = (inventory(candidate_path.parent) + inventory(ROOT/"workers/miniapp-api/assets/deep-sky") +
                 inventory(acquisitions[0].parent) + inventory(acquisitions[1].parent) +
                 [bound(path) for path in owner_paths] + [bound(ROOT/item["path"]) for item in preserved])
    output.mkdir(parents=True)
    snapshot = output/"executed-script.py"
    snapshot.write_bytes(Path(__file__).read_bytes())
    save(output/"started.json", {"scope":__doc__,"candidate":bound(candidate_path),"script":bound(snapshot),
                                "requests":0,"protectedInputs":protected})
    n = candidate["pixels"]
    target = target_tan(candidate["center"],n,candidate["fieldDegrees"])
    yy, xx = np.mgrid[0:n,0:n]
    # Identical task catalog ellipse formula to prior overlap diagnostic.
    east = -(xx-(n-1)/2)*abs(target.wcs.cdelt[0])*60
    north = ((n-1)/2-yy)*abs(target.wcs.cdelt[1])*60
    ellipse = pair_metadata["outsideCatalogExclusion"]
    angle = np.radians(ellipse["positionAngleDeg"])
    major = east*np.sin(angle)+north*np.cos(angle)
    minor = east*np.cos(angle)-north*np.sin(angle)
    outside = ((major/(ellipse["majorAxisArcmin"]*ellipse["sizeMultiplier"]/2))**2 +
               (minor/(ellipse["minorAxisArcmin"]*ellipse["sizeMultiplier"]/2))**2 > 1)
    del east,north,major,minor,xx,yy
    fields = {}
    for record in candidate["mosaic"]["fields"]:
        key, identity = record["fieldKey"],record["identity"]
        def quality_input(filename,band=None):
            acquired = sources[filename]
            assert acquired["httpStatus"] == 200 and acquired["actualFinalUrl"] == acquired["url"]
            path = ROOT/acquired["raw"]["path"]
            assert bound(path) == acquired["raw"]
            expected = identity | {"bytes":acquired["bytes"],"sha256":acquired["sha256"],"sourceUrl":acquired["url"]}
            if band is not None: expected["band"] = band
            return path,expected
        path,expected = quality_input(f"psField-{identity['run']:06d}-6-{identity['field']:04d}.fit")
        psf = read_cached_psfield(path,expected,max_uncompressed_bytes=16*1024*1024)
        item = {"psf":psf,"bands":{},"identity":identity}
        associations = {}
        for band in BANDS:
            receipt = record["perBand"][band]["sourceReceipt"]
            source = receipt["source"]
            frame_path = Path(source["path"])
            assert bound(frame_path)["sha256"] == source["sha256"]
            frame = read_cached_frame(frame_path,receipt["identity"] | {"bytes":source["bytes"],"sha256":source["sha256"],"sourceUrl":source["sourceUrl"]},max_uncompressed_bytes=32*1024*1024)
            path,expected = quality_input(f"fpM-{identity['run']:06d}-{band}6-{identity['field']:04d}.fit.gz",band)
            mask = read_cached_fpm(path,expected,max_uncompressed_bytes=16*1024*1024)
            associations[band] = check_frame_quality(frame,psf,mask)
            arrays = candidate["mosaic"]["diagnostics"][key]
            science_path = candidate_path.parent/arrays[f"{band}-science"]["file"]
            finite_path = candidate_path.parent/arrays[f"{band}-finite-neighbors"]["file"]
            science = np.load(science_path,mmap_mode="r",allow_pickle=False)
            finite = np.load(finite_path,mmap_mode="r",allow_pickle=False)
            assert science.shape == finite.shape == (n,n) and np.array_equal(np.isfinite(science),finite)
            item["bands"][band] = {"science":science,"finite":finite,"mask":mask,"wcs":frame.wcs}
            del frame
        save(output/(key.replace('/','-')+"-association.json"),associations)
        item["joint"] = np.logical_and.reduce([item["bands"][band]["finite"] for band in BANDS])
        fields[key] = item
        print("associated",key,flush=True)

    def roi(field,band,x,y):
        item = fields[field]["bands"][band]
        ys,xs = np.mgrid[y-RADIUS:y+RADIUS+1,x-RADIUS:x+RADIUS+1]
        ra,dec = target.all_pix2world(xs,n-1-ys,0)
        sx,sy = item["wcs"].all_world2pix(ra,dec,0)
        flags = item["mask"].stencil(sx,sy)
        finite = item["finite"][y-RADIUS:y+RADIUS+1,x-RADIUS:x+RADIUS+1]
        return item["science"][y-RADIUS:y+RADIUS+1,x-RADIUS:x+RADIUS+1],flags,finite,sx,sy

    pairs, contacts = [],[]
    for pair in pair_metadata["fieldPairs"]:
        a,b = pair["fieldA"],pair["fieldB"]
        common = fields[a]["joint"] & fields[b]["joint"]
        assert int(common.sum()) == pair["jointOverlapPixels"]
        ra_data, rb_data = fields[a]["bands"]["r"]["science"],fields[b]["bands"]["r"]["science"]
        mean = (np.where(common,ra_data,0).astype(np.float64)+np.where(common,rb_data,0))/2
        peaks = common.copy()
        peaks[:RADIUS] = peaks[-RADIUS:] = False
        peaks[:,:RADIUS] = peaks[:,-RADIUS:] = False
        for dy,dx in ((-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)):
            peaks &= mean > np.roll(mean,(dy,dx),axis=(0,1))
        py,px = np.where(peaks)
        order = np.argsort(mean[py,px])[::-1][:200]
        selected, rejected = [],{}
        for index in order:
            x,y = int(px[index]),int(py[index])
            if any((x-old[0])**2+(y-old[1])**2<64**2 for old in selected): continue
            if not common[y-RADIUS:y+RADIUS+1,x-RADIUS:x+RADIUS+1].all():
                rejected["incompleteRoi"] = rejected.get("incompleteRoi",0)+1; continue
            okay = True
            for field in (a,b):
                patch,flags,finite,_,_ = roi(field,"r",x,y)
                cy,cx = np.mgrid[-RADIUS:RADIUS+1,-RADIUS:RADIUS+1]
                core = cx*cx+cy*cy<=6**2
                measurement = centroid(patch,6)
                if np.any(flags.flags[core]&REJECT_DIAGNOSTIC_STAR_FLAGS):
                    rejected["rCoreProcessingFlags"] = rejected.get("rCoreProcessingFlags",0)+1; okay=False;break
                if (measurement is None or measurement["peakContrast"] < 8*measurement["annulusMadSigma"] or
                        not .5 < measurement["radialRmsTargetPixels"] < 2.8 or
                        np.hypot(*measurement["columnRow"])>2):
                    rejected["weakExtendedOrOffCenter"] = rejected.get("weakExtendedOrOffCenter",0)+1; okay=False;break
                outer = (cx*cx+cy*cy>=6**2)&(cx*cx+cy*cy<=12**2)
                if patch[outer].max()-measurement["annulusMedian"] > .25*measurement["peakContrast"]:
                    rejected["nearbyOrExtendedEmission"] = rejected.get("nearbyOrExtendedEmission",0)+1; okay=False;break
            if okay: selected.append((x,y))
            if len(selected)==3: break
        pair_result = {"fieldA":a,"fieldB":b,"crossRun":fields[a]["identity"]["run"]!=fields[b]["identity"]["run"],
                       "jointOverlapPixels":int(common.sum()),"outsideCatalogPixels":int((common&outside).sum()),
                       "maximaConsideredAtMost":200,"rejectedSelectionCounts":rejected,"compactPeaks":[],"backgroundPatches":[]}
        for number,(x,y) in enumerate(selected):
            name = f"pair-{len(pairs)+1}-peak-{number+1}"
            ra,dec = target.all_pix2world(x,n-1-y,0)
            peak_result = {"targetColumnRow":[x,y],"raDecDeg":[float(ra),float(dec)],"insideExpandedCatalogEllipse":bool(not outside[y,x]),
                           "identification":"isolated compact intensity peak, not catalog-confirmed star","bands":{}}
            science_patches,flag_patches,finite_patches,kernels = [],[],[],[]
            for band in BANDS:
                band_result, patches = {"fields":{}},[]
                for field in (a,b):
                    patch,flags,finite,sx,sy = roi(field,band,x,y)
                    assert finite.all() and flags.geometry.all()
                    kernel = fields[field]["psf"].reconstruct(band,float(sx[RADIUS,RADIUS]),float(sy[RADIUS,RADIUS]))
                    measurements = {str(radius):centroid(patch,radius) for radius in (4,6,8)}
                    core = (np.mgrid[-RADIUS:RADIUS+1,-RADIUS:RADIUS+1]**2).sum(axis=0)<=6**2
                    band_result["fields"][field] = {"nativeColumnRow":[float(sx[RADIUS,RADIUS]),float(sy[RADIUS,RADIUS])],
                        "finitePixels":int(finite.sum()),"geometryPixels":int(flags.geometry.sum()),
                        "coreProcessingFlagsPresent":bool(np.any(flags.flags[core]&REJECT_DIAGNOSTIC_STAR_FLAGS)),
                        "flagCounts":flag_counts(flags.flags,fields[field]["bands"][band]["mask"].enum),
                        "centroidByRadius":measurements,"signedKernelSum":float(kernel.sum()),
                        "signedKernelNegativePixels":int(np.count_nonzero(kernel<0)),
                        "noiseEquivalentAreaNativePixels":float(kernel.sum()**2/np.square(kernel).sum())}
                    patches.append(patch)
                    science_patches.append(patch);flag_patches.append(flags.flags);finite_patches.append(finite);kernels.append(kernel)
                offsets = [[band_result["fields"][b]["centroidByRadius"][str(radius)]["columnRow"][axis]-
                            band_result["fields"][a]["centroidByRadius"][str(radius)]["columnRow"][axis] for axis in (0,1)] for radius in (4,6,8)]
                band_result["centroidBMinusAByRadius"] = offsets
                band_result["centroidOffsetApertureSpreadPixels"] = float(np.max(np.linalg.norm(np.array(offsets)-np.array(offsets)[1],axis=1)))
                band_result["localMatch"] = local_shift(*patches)
                peak_result["bands"][band] = band_result
            peak_result["arrays"] = {label:save_array(output/(name+"-"+label+".npy"),np.stack(values))
                for label,values in (("science-gArAgBrBgAiAiB",science_patches),("flags",flag_patches),("finite",finite_patches),("signed-native-kernels",kernels))}
            peak_result["arrayOrder"] = [f"{band}:{field}" for band in BANDS for field in (a,b)]
            contacts.append((name,a,b,x,y,science_patches[2],science_patches[3]))
            pair_result["compactPeaks"].append(peak_result)
        # A coarse fixed 32-pixel lattice, at most 4 spatially separate low-object boxes.
        background_candidates=[]
        for y in range(RADIUS,n-RADIUS,32):
            for x in range(RADIUS,n-RADIUS,32):
                if not common[y-RADIUS:y+RADIUS+1,x-RADIUS:x+RADIUS+1].all():continue
                if any((x-sx)**2+(y-sy)**2<40**2 for sx,sy in selected):continue
                object_fraction=0.;processing=0.;value=[]
                for field in (a,b):
                    patch,flags,finite,_,_=roi(field,"r",x,y)
                    object_fraction=max(object_fraction,float(np.mean((flags.flags&(1<<3))!=0)))
                    processing=max(processing,float(np.mean((flags.flags&REJECT_DIAGNOSTIC_STAR_FLAGS)!=0)))
                    value.append(stats(patch)["madSigma"])
                background_candidates.append(((not bool(outside[y,x]),object_fraction,processing,max(value)),x,y))
        chosen=[]
        for _,x,y in sorted(background_candidates):
            if any((x-oldx)**2+(y-oldy)**2<80**2 for oldx,oldy in chosen):continue
            chosen.append((x,y))
            if len(chosen)==4:break
        for number,(x,y) in enumerate(chosen):
            ra,dec=target.all_pix2world(x,n-1-y,0)
            background={"targetColumnRow":[x,y],"raDecDeg":[float(ra),float(dec)],
                        "entireRoiOutsideExpandedCatalogEllipse":bool(outside[y-RADIUS:y+RADIUS+1,x-RADIUS:x+RADIUS+1].all()),
                        "meaning":"local low-object patch; not a certified blank sky mask; galaxy wings, undetected sources and resampling correlation remain", "bands":{}}
            science_patches,flag_patches=[],[]
            for band in BANDS:
                arrays=[];values={}
                for field in (a,b):
                    patch,flags,finite,_,_=roi(field,band,x,y)
                    assert finite.all() and flags.geometry.all()
                    values[field]={"science":stats(patch),"flagCounts":flag_counts(flags.flags,fields[field]["bands"][band]["mask"].enum),
                                   "finitePixels":int(finite.sum()),"geometryPixels":int(flags.geometry.sum())}
                    arrays.append(patch);science_patches.append(patch);flag_patches.append(flags.flags)
                delta=arrays[1].astype(np.float64)-arrays[0]
                values["BMinusA"] = stats(delta)
                values["differenceMadSigmaOverCombinedMarginalMad"] = (values["BMinusA"]["madSigma"]/
                    np.hypot(values[a]["science"]["madSigma"],values[b]["science"]["madSigma"]))
                background["bands"][band]=values
            name=f"pair-{len(pairs)+1}-background-{number+1}"
            background["arrays"]={label:save_array(output/(name+"-"+label+".npy"),np.stack(values)) for label,values in
                                  (("science",science_patches),("flags",flag_patches))}
            background["arrayOrder"]=[f"{band}:{field}" for band in BANDS for field in (a,b)]
            # Differences of band medians are diagnostic residual colour, not magnitudes or a calibrated colour.
            background["medianResidualColorBMinusA"]={"gMinusR":background["bands"]["g"]["BMinusA"]["median"]-background["bands"]["r"]["BMinusA"]["median"],
                                                        "rMinusI":background["bands"]["r"]["BMinusA"]["median"]-background["bands"]["i"]["BMinusA"]["median"]}
            pair_result["backgroundPatches"].append(background)
        pairs.append(pair_result)
        save(output/(f"pair-{len(pairs)}.json"),pair_result)
        print("pair",len(pairs),a,b,"peaks",len(selected),"background",len(chosen),flush=True)
        del mean,peaks,common
    if contacts:
        width,height=640,len(contacts)*110
        sheet=Image.new("RGB",(width,height),"#101010");draw=ImageDraw.Draw(sheet)
        for index,(name,a,b,x,y,pa,pb) in enumerate(contacts):
            low=float(min(np.quantile(pa,.05),np.quantile(pb,.05)))
            high=float(max(pa.max(),pb.max()))
            for col,patch in enumerate((pa,pb)):
                gray=np.rint(np.clip((patch-low)/(high-low),0,1)*255).astype(np.uint8)
                tile=Image.fromarray(gray).resize((99,99),Image.Resampling.NEAREST).convert("RGB")
                sheet.paste(tile,(220+col*110,index*110+5))
            draw.text((5,index*110+5),f"{name} ({x},{y})\nA {a}\nB {b}\nr shared linear scale",fill="white")
        sheet.save(output/"compact-peak-r-contact.png")
    result={"version":"sdss-local-overlap-diagnosis-v1","requests":0,"candidate":bound(candidate_path),"script":bound(snapshot),
            "targetFactory":{"center":candidate["center"],"pixels":n,"fieldDegrees":candidate["fieldDegrees"],"exactCdelt":target.wcs.cdelt.tolist(),
                             "savedRows":"north/top; native target FITS row=n-1-savedRow"},
            "unit":"nanomaggies per source pixel, bilinear display reprojection; not flux-conserving aperture photometry",
            "diagnosticSelection":{"starMaxima":200,"starsPerPair":3,"starRoi":33,"backgroundPerPair":4,"backgroundGridStepPixels":32,
                                   "diagnosticStarCoreRejectedBits":[0,1,8,9],"finiteNeverChanged":True},
            "pairs":pairs,"limitations":["Local matches and centroids confounded by spatial PSF, colour, noise and linear TAN approximation; no correction applied.",
                "No catalog-confirmed star identity or absolute astrometric truth.","Low OBJECT/processing flags and catalog ellipse exclusion do not constitute a deep-wing/undetected-source sky mask.",
                "No second sky subtraction, per-field calibration, image/mosaic edits, native-runtime acceptance or quality adoption.",
                "Signed native PSF NEA is not FWHM, a homogenized mosaic PSF or a quality pass.","No PS1/NMGY reapplication; no changes to finite zero or negative science."]}
    save(output/"result.json",result)
    protected_after=[bound(ROOT/item["path"]) for item in protected]
    assert protected_after==protected
    save(output/"binding.json",{"result":bound(output/"result.json"),"script":bound(snapshot),"protectedInputsBefore":protected,
                                "protectedInputsAfter":protected_after,"protectedInputsUnchanged":True,
                                "outputs":inventory(output),"finishedUtc":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())})
    print("complete",bound(output/"result.json"),flush=True)


if __name__=="__main__":main()
