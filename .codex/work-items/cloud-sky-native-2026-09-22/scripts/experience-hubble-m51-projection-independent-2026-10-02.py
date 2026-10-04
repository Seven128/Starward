"""Direct TAN and independent raster sampling of cached nominal HST candidate."""
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/".codex/work-items/cloud-sky-native-2026-09-22"
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT/"output/allwise-w3-atlas-0929/python-deps"))
import numpy as np
from PIL import Image
spec=importlib.util.spec_from_file_location("metadata_review",TASK/"scripts/experience-hubble-m51-metadata-independent-2026-10-02.py")
common=importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
bound,inventory,save=common.bound,common.inventory,common.save


def tangent_inverse(plane,center):
    xi,eta=np.radians(plane).T
    ra0,dec0=np.radians(center)
    denominator=np.cos(dec0)-eta*np.sin(dec0)
    return np.column_stack((ra0+np.arctan2(xi,denominator),
        np.arctan2(np.sin(dec0)+eta*np.cos(dec0),np.hypot(denominator,xi))))


def tangent_forward(world,center):
    ra,dec=world.T
    ra0,dec0=np.radians(center)
    delta=ra-ra0
    denominator=np.sin(dec)*np.sin(dec0)+np.cos(dec)*np.cos(dec0)*np.cos(delta)
    return np.degrees(np.column_stack((np.cos(dec)*np.sin(delta)/denominator,
        (np.cos(dec0)*np.sin(dec)-np.sin(dec0)*np.cos(dec)*np.cos(delta))/denominator)))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",required=True,type=Path)
    args=parser.parse_args()
    output=args.output.resolve()
    assert output.is_relative_to((ROOT/"output").resolve()) and not output.exists()
    trial=ROOT/"output/hubble-m51-nominal-projection-trial-1002-r1"
    source=ROOT/"output/hubble-m51-source-quality-trial-1002-r1"
    meta=ROOT/"output/hubble-m51-metadata-independent-1002-r1"
    assert bound(trial/"result.json")["sha256"]=="a209ac6e4c10aebfaa5bb2447e20c1682836046dff1a21cacc8969003f2b7994"
    candidate=json.loads((ROOT/"output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json").read_bytes())
    projected=json.loads((trial/"result.json").read_bytes())
    metadata=json.loads((meta/"review.json").read_bytes())
    retained=json.loads((TASK/"tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    protected=inventory(trial)+inventory(source)+inventory(meta)+inventory(ROOT/"workers/miniapp-api/assets/deep-sky")+[bound(ROOT/item["path"]) for item in retained]
    output.mkdir(parents=True)
    snapshot=output/"executed-script.py";snapshot.write_bytes(Path(__file__).read_bytes())
    rgb=np.asarray(Image.open(source/"heic0506a.jpg"))
    assert rgb.dtype==np.uint8 and rgb.shape==(2776,4000,3)
    n=candidate["pixels"]
    step=math.degrees(2*math.tan(math.radians(candidate["fieldDegrees"])/2)/n)
    source_cd=np.array(metadata["spatial"]["independentCD"])
    inverse_cd=np.linalg.inv(source_cd)
    source_crpix=np.array(metadata["spatial"]["rescaledCrpix"])
    source_center=metadata["spatial"]["referenceValueRaDec"]
    target_center=[candidate["center"]["raDeg"],candidate["center"]["decDeg"]]
    expected=np.zeros((n,n,4),dtype=np.uint8)
    for start in range(0,n,64):
        stop=min(start+64,n)
        yy,xx=np.mgrid[start:stop,0:n]
        shape=xx.shape
        combined=np.zeros((*shape,3),dtype=np.float64)
        available=np.ones(shape,dtype=np.bool_)
        for dy,dx in ((-.25,-.25),(-.25,.25),(.25,-.25),(.25,.25)):
            fitsxy=np.column_stack(((xx+dx).ravel(),(n-1-yy-dy).ravel()))
            plane=(fitsxy+1-(n+1)/2)*np.array([-step,step])
            world=tangent_inverse(plane,target_center)
            source_plane=tangent_forward(world,source_center)
            source_fits=source_plane@inverse_cd.T+source_crpix-1
            sx=source_fits[:,0].reshape(shape)
            sy=(rgb.shape[0]-1-source_fits[:,1]).reshape(shape)
            geometric=(np.isfinite(sx)&np.isfinite(sy)&(sx>=0)&(sy>=0)&(sx<rgb.shape[1]-1)&(sy<rgb.shape[0]-1))
            available &= geometric
            ix=np.floor(sx[geometric]).astype(np.intp)
            iy=np.floor(sy[geometric]).astype(np.intp)
            fx,fy=sx[geometric]-ix,sy[geometric]-iy
            samples=(rgb[iy,ix].astype(np.float64)*(1-fx[:,None])*(1-fy[:,None])+
                     rgb[iy,ix+1].astype(np.float64)*fx[:,None]*(1-fy[:,None])+
                     rgb[iy+1,ix].astype(np.float64)*(1-fx[:,None])*fy[:,None]+
                     rgb[iy+1,ix+1].astype(np.float64)*fx[:,None]*fy[:,None]).astype(np.float32)
            combined[geometric]+=samples
        expected[start:stop,:,:3]=np.rint(combined/4).astype(np.uint8)
        expected[start:stop,:,:3][~available]=0
        expected[start:stop,:,3]=255*available.astype(np.uint8)
        if stop%512==0:print("rows",stop,flush=True)
    actual=np.load(ROOT/projected["master"]["path"],allow_pickle=False)
    assert actual.shape==expected.shape and actual.dtype==expected.dtype
    assert np.array_equal(actual[:,:,3],expected[:,:,3])
    difference=np.abs(actual.astype(np.int16)-expected.astype(np.int16))
    assert difference.max()<=1
    master={"expectedDirectTANRgbaSha256COrder":hashlib.sha256(expected.tobytes()).hexdigest(),
            "actualRgbaSha256COrder":hashlib.sha256(actual.tobytes()).hexdigest(),
            "geometricAlphaExactlyEqual":True,"geometricSupportPixels":int(np.count_nonzero(expected[:,:,3])),
            "maximumByteDifference":int(difference.max()),"differentPixels":int(np.count_nonzero(np.any(difference,axis=2))),
            "meaning":"Direct inverse/forward TAN math and top-first RGB sampler; tiny roundoff/float32 quantization need not be byte identical to WCSLIB."}
    levels={}
    for level,record in projected["levels"].items():
        x0,y0,x1,y1=record["targetGeometry"]["masterCrop"]["boundsXYExclusive"]
        factor=record["targetGeometry"]["masterCrop"]["boxFactor"]
        # Independently check this mathematical area filter on the actual immutable mother pixels.
        crop=actual[y0:y1,x0:x1]
        count=crop[:,:,3]>0
        h,w=crop.shape[:2]
        qualified=count.reshape(h//factor,factor,w//factor,factor).sum(axis=(1,3))
        sums=(crop[:,:,:3].astype(np.float64)*count[:,:,None]).reshape(h//factor,factor,w//factor,factor,3).sum(axis=(1,3))
        colour=np.zeros(sums.shape,dtype=np.float64)
        np.divide(sums,qualified[:,:,None],out=colour,where=qualified[:,:,None]>0)
        rebuilt=np.dstack((np.rint(colour).astype(np.uint8),np.rint(qualified/(factor*factor)*255).astype(np.uint8)))
        decoded=np.asarray(Image.open(ROOT/record["encoded"]["path"])).copy()
        assert decoded.dtype==np.uint8 and decoded.shape==(512,512,4)
        assert rebuilt.tobytes()==decoded.tobytes()
        assert hashlib.sha256(decoded.tobytes()).hexdigest()==record["decoded"]["sha256COrder"]
        levels[level]={"png":bound(ROOT/record["encoded"]["path"]),"decodedBytesExactlyEqualToIndependentMotherAreaFilter":True,
                       "cropGeometrySupportPixels":int(count.sum()),"cropPixels":int(count.size),
                       "alphaOpaque":int(np.count_nonzero(decoded[:,:,3]==255)),"alphaPartial":int(np.count_nonzero((decoded[:,:,3]>0)&(decoded[:,:,3]<255))),
                       "alphaZero":int(np.count_nonzero(decoded[:,:,3]==0))}
    result={"scope":__doc__,"newRequests":0,"master":master,"levels":levels,"scientificAvailability":"UNKNOWN",
            "astrometry":"UNVERIFIED_APPROXIMATE_PUBLISHER_AVM_WITH_5_ARCSEC_NOTE","imageQualityAdoption":"UNADOPTED",
            "metadataReview":bound(meta/"review.json"),"rootProjection":bound(trial/"result.json"),"script":bound(snapshot)}
    save(output/"review.json",result)
    after=[bound(ROOT/item["path"]) for item in protected]
    assert after==protected
    save(output/"binding.json",{"review":bound(output/"review.json"),"script":bound(snapshot),"inputsBefore":protected,"inputsAfter":after,
                                "unchanged":True,"outputs":inventory(output)})
    print(bound(output/"review.json"),flush=True)


if __name__=="__main__":main()
