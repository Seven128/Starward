"""Independent cached HST/AVM byte and nominal coordinate audit; zero image requests."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/".codex/work-items/cloud-sky-native-2026-09-22"
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT/"output/allwise-w3-atlas-0929/python-deps"))
sys.path.insert(0,str(ROOT/"output/pyavm-metadata-trial-1002-r1/lib"))
import numpy as np
from PIL import Image
from pyavm import AVM


def bound(path):
    path=Path(path).resolve()
    raw=path.read_bytes()
    return {"path":path.relative_to(ROOT).as_posix(),"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()}


def inventory(directory):
    return [bound(path) for path in sorted(directory.rglob("*")) if path.is_file()]


def save(path,value):
    with path.open("x",encoding="utf-8") as stream:
        stream.write(json.dumps(value,indent=2,ensure_ascii=False,allow_nan=False)+"\n")


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",required=True,type=Path)
    args=parser.parse_args()
    output=args.output.resolve()
    assert output.is_relative_to((ROOT/"output").resolve()) and not output.exists()
    source_dir=ROOT/"output/hubble-m51-source-quality-trial-1002-r1"
    trial_dir=ROOT/"output/pyavm-metadata-trial-1002-r1"
    old_diag=ROOT/"output/sdss-local-overlap-diagnosis-1002-r1/result.json"
    assert bound(source_dir/"result.json")["sha256"]=="2497653ac6946c0b21e77a71539ca8d75cc7c0332de523a41b91e451d01335c9"
    assert bound(source_dir/"heic0506a.jpg")["sha256"]=="7b13a932bcf54653c591d369e8d1c4cbdbeb693ecc468242facb239fde52e4c2"
    retained=json.loads((TASK/"tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    protected=inventory(source_dir)+inventory(trial_dir)+inventory(ROOT/"workers/miniapp-api/assets/deep-sky")+[bound(ROOT/item["path"]) for item in retained]+[bound(old_diag)]
    assert all(bound(ROOT/item["path"])["sha256"]==item["sha256"] for item in retained)
    output.mkdir(parents=True)
    snapshot=output/"executed-script.py"
    snapshot.write_bytes(Path(__file__).read_bytes())
    image=Image.open(source_dir/"heic0506a.jpg")
    image.load()
    assert image.size==(4000,2776) and image.mode=="RGB"
    rgb=np.asarray(image)
    assert hashlib.sha256(rgb.tobytes()).hexdigest()=="e9720f3cfcd75966deb94060b6a0711b295e094ae03c76ec1d58633a343b1710"
    xmp=(source_dir/"embedded-xmp.xml").read_bytes()
    assert image.info["xmp"]==xmp
    xml=ET.fromstring(xmp)
    ns="http://www.communicatingastronomy.org/avm/1.0/"
    rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    def values(name):
        element=xml.find(".//{"+ns+"}"+name)
        return [float(child.text) for child in element.findall(".//{"+rdf+"}li")]
    def attribute(name):
        return next(element.attrib["{"+ns+"}"+name] for element in xml.iter() if "{"+ns+"}"+name in element.attrib)
    notes=xml.find(".//{"+ns+"}Spatial.Notes").find(".//{"+rdf+"}li").text
    pixel=np.array(values("Spatial.ReferencePixel"))
    reference=np.array(values("Spatial.ReferenceValue"))
    dimensions=np.array(values("Spatial.ReferenceDimension"))
    scales=np.array(values("Spatial.Scale"))
    rotation=float(attribute("Spatial.Rotation"))
    assert attribute("MetadataVersion")=="1.1" and attribute("Spatial.CoordinateFrame")=="ICRS" and attribute("Spatial.CoordsystemProjection")=="TAN"
    assert "5 arcsec" in notes and "Simbad" in notes
    try:
        AVM.from_image(source_dir/"heic0506a.jpg")
        raise AssertionError("raw optional empty RDF failure was expected")
    except (AttributeError,TypeError) as error:
        raw_failure={"type":type(error).__name__,"message":str(error)}
    empty=xml.find(".//{"+ns+"}Spectral.Notes")
    assert empty is not None and all(not (element.text or "").strip() for element in empty.iter())
    for parent in xml.iter():
        if empty in list(parent):parent.remove(empty)
    avm=AVM.from_xml(ET.tostring(xml,encoding="utf-8"))
    assert avm.Spatial.Notes==notes and np.array_equal(avm.Spatial.ReferencePixel,pixel)
    wcs=avm.to_wcs(target_shape=image.size)
    ratio=np.array(image.size)/dimensions
    assert np.array_equal(wcs.wcs.crpix,pixel*ratio[0])
    assert np.array_equal(wcs.wcs.cdelt,scales/ratio[0])
    # Independent explicit CROTA/CD and inverse tangent-plane math, not WCS calls.
    theta=np.radians(rotation)
    sx,sy=scales/ratio[0]
    cd=np.array([[sx*np.cos(theta),-sy*np.sin(theta)],[sx*np.sin(theta),sy*np.cos(theta)]])
    yy,xx=np.meshgrid(np.linspace(0,image.height-1,9),np.linspace(0,image.width-1,13),indexing="ij")
    fitsxy=np.column_stack((xx.ravel(),image.height-1-yy.ravel()))
    plane=(fitsxy+1-pixel*ratio[0])@cd.T
    xi,eta=np.radians(plane).T
    ra0,dec0=np.radians(reference)
    denominator=np.cos(dec0)-eta*np.sin(dec0)
    analytic_ra=np.degrees(ra0+np.arctan2(xi,denominator))%360
    analytic_dec=np.degrees(np.arctan2(np.sin(dec0)+eta*np.cos(dec0),np.hypot(denominator,xi)))
    library_world=np.column_stack(wcs.all_pix2world(fitsxy[:,0],fitsxy[:,1],0))
    analytic_world=np.column_stack((analytic_ra,analytic_dec))
    error=np.abs(analytic_world-library_world)
    assert error.max()<1e-10
    grid= [{"jpegColumnTopRow":xy,"libraryRaDecDeg":world,"independentRaDecDeg":other}
           for xy,world,other in zip(np.column_stack((xx.ravel(),yy.ravel())).tolist(),library_world.tolist(),analytic_world.tolist())]
    save(output/"nominal-coordinate-grid.json",grid)
    points=[]
    diagnosis=json.loads(old_diag.read_bytes())
    for pair in diagnosis["pairs"]:
        for peak in pair["compactPeaks"]:
            ra,dec=peak["raDecDeg"]
            fx,fy=wcs.all_world2pix(ra,dec,0)
            top=image.height-1-fy
            points.append({"fields":[pair["fieldA"],pair["fieldB"]],"sdssTargetColumnRow":peak["targetColumnRow"],
                "raDecDeg":[ra,dec],"nominalJpegColumnTopRow":[float(fx),float(top)],
                "insideBilinearRectangle":bool(0<=fx<image.width-1 and 0<=top<image.height-1),
                "meaning":"Only nominal footprint; not confirmed cross-source matching or scientific coverage"})
    save(output/"previous-sdss-peak-footprints.json",points)
    result={"scope":__doc__,"source":bound(source_dir/"heic0506a.jpg"),"rawXmpByteIdentical":True,
        "rgbByteIdentical":True,"rawParserFailure":raw_failure,
        "removedForIsolatedParse":"Only empty optional Spectral.Notes; original image/XML remain unchanged; populated Spatial.Notes preserved",
        "spatial":{"frame":attribute("Spatial.CoordinateFrame"),"projection":attribute("Spatial.CoordsystemProjection"),
            "version":attribute("MetadataVersion"),"referencePixelFitsOneBased":pixel.tolist(),"referenceValueRaDec":reference.tolist(),
            "referenceDimensionsWidthHeight":dimensions.tolist(),"jpegDimensionsWidthHeight":list(image.size),
            "ratioXandY":ratio.tolist(),"relativeRatioDifference":float(abs(ratio[0]-ratio[1])/np.mean(ratio)),
            "libraryUsesXRatioForBothAxes":True,"rescaledCrpix":wcs.wcs.crpix.tolist(),"rescaledCdelt":wcs.wcs.cdelt.tolist(),
            "rotationDegrees":rotation,"independentCD":cd.tolist(),"gridMaximumDifferenceDeg":float(error.max()),
            "jpegPixelArcsec":float(abs(sx)*3600),"nominalFovArcminWidthHeight":[float(abs(sx)*image.width*60),float(abs(sy)*image.height*60)],
            "xRatioVersusYRatioReferencePixelDifferencePixels":(pixel*(ratio[0]-ratio[1])).tolist(),
            "genericCenterPreservingResizeMinusAvmReferencePixelPixels":((pixel-.5)*ratio[0]+.5-pixel*ratio[0]).tolist(),
            "genericResizeMeaning":"Diagnostic contrast only: AVM1.1 explicitly prescribes multiplying reference pixels by ratio, so this alternative is not a mandated correction.",
            "expectedFiveArcsecInJpegPixels":float(5/(abs(sx)*3600)),
            "expectedFiveArcsecInSdssTargetPixels":float(5/(abs(diagnosis["targetFactory"]["exactCdelt"][0])*3600)),
            "astrometricAccuracy":"UNVERIFIED; populated original note warns about a roughly 5 arcsec overlay difference"},
        "previousCompactPeaks":{"count":len(points),"insideNominalJpegBilinearRectangle":sum(item["insideBilinearRectangle"] for item in points),
                                "file":bound(output/"previous-sdss-peak-footprints.json")},
        "license":{"image":"CC BY 4.0 specific ESA/Hubble origin and embedded usage terms; full visible credit/runtime and modification notice remain delivery obligations",
                   "pyavm":"Exact isolated 0.9.9 wheel MIT plus included ESA/ESO BSD3 license; not a production dependency"},
        "scientificPixelAvailability":"UNKNOWN","colourMeaning":"Published historical ACS 435/555/658/814nm composite; not SDSS gri/calibrated flux/naked-eye appearance",
        "quality":"UNADOPTED","newImageRequests":0}
    save(output/"review.json",result)
    after=[bound(ROOT/item["path"]) for item in protected]
    assert after==protected
    save(output/"binding.json",{"script":bound(snapshot),"inputsBefore":protected,"inputsAfter":after,"unchanged":True,
                                "review":bound(output/"review.json"),"outputs":inventory(output)})
    print(bound(output/"review.json"),flush=True)


if __name__=="__main__":main()
