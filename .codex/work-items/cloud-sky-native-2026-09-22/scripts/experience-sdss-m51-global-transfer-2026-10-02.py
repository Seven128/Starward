"""Three global Astropy display transfers on the same cached M51 science master.

No source request, per-object fitting, per-level rescaling, science correction,
new dependency, publication, or native rendering. Outputs are exclusive.
"""
from pathlib import Path
import argparse
import inspect
import io
import json
import sys
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import astropy
from astropy.wcs import WCS
from astropy.visualization import ManualInterval, LuptonAsinhStretch, LuptonAsinhZscaleStretch, ZScaleInterval, make_lupton_rgb
from astropy.visualization.lupton_rgb import RGBImageMappingLupton, compute_intensity
import numpy as np
from PIL import Image, ImageDraw
import PIL
from image_quality import digest, write_report
import sdss_gri_tan as owner

SOURCE = ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
DOCS = [
    'https://docs.astropy.org/en/stable/visualization/rgb.html',
    'https://docs.astropy.org/en/stable/api/astropy.visualization.LuptonAsinhZscaleStretch.html',
    'https://docs.astropy.org/en/stable/api/astropy.visualization.ZScaleInterval.html',
]


def binding(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':digest(raw)}


def inventory(path):
    return [binding(item) for item in sorted(path.rglob('*')) if item.is_file()]


def save_array(path, data):
    with path.open('xb') as output:
        np.save(output,data,allow_pickle=False)
    return binding(path)|{'shape':list(data.shape),'dtype':data.dtype.str}


def stats(values):
    finite = values[np.isfinite(values)]
    return {'totalSamples':int(values.size),'finiteSamples':int(finite.size),
            'negativeSamples':int((finite<0).sum()),'zeroSamples':int((finite==0).sum()),
            'min':float(finite.min()),'max':float(finite.max()),
            'percentiles':dict(zip(('p01','p05','p25','p50','p75','p95','p99'),
                [float(value) for value in np.percentile(finite,[1,5,25,50,75,95,99])]))}


def rgb_stats(rgb):
    return {'totalPixels':int(rgb.shape[0]*rgb.shape[1]),
            'encodedRgbMean':[float(value) for value in rgb.mean(axis=(0,1))],
            'encodedMaxChannelPercentiles':[float(value) for value in np.percentile(rgb.max(axis=2),[1,25,50,75,95,99])],
            'allBlackPixels':int((rgb.max(axis=2)==0).sum()),
            'atLeastOne255Pixels':int((rgb.max(axis=2)==255).sum()),
            'meaning':'encoded display measurements; not scientific flux/quality, noise confidence or image resolution'}


def independent_box(master_rgb,joint,bounds,factor):
    x0,y0,x1,y1 = bounds
    rgb = master_rgb[y0:y1,x0:x1]
    available = joint[y0:y1,x0:x1]
    out = (x1-x0)//factor
    count = available.reshape(out,factor,out,factor).sum(axis=(1,3),dtype=np.uint64)
    weighted = (rgb.astype(np.uint32)*available[...,None]).reshape(out,factor,out,factor,3).sum(axis=(1,3),dtype=np.uint64)
    color = np.zeros((out,out,3),dtype=np.float64)
    np.divide(weighted,count[...,None],out=color,where=count[...,None]>0)
    alpha = np.rint(count.astype(np.float64)*255/(factor*factor)).astype(np.uint8)
    return np.dstack([np.rint(color).astype(np.uint8),alpha])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists():
        raise RuntimeError('preserve_existing_global_transfer_generation')
    source_before = inventory(SOURCE)
    owners = [ROOT/'data-pipelines/deep-sky'/name for name in ('sdss_gri_tan.py','test_sdss_gri_tan.py','image_quality.py','requirements.txt')]
    owner_before = [binding(path) for path in owners]
    candidate_path = SOURCE/'candidate.json'
    candidate = json.loads(candidate_path.read_bytes())
    previous_binding_path = SOURCE/'binding.json'
    previous_binding = json.loads(previous_binding_path.read_bytes())
    if previous_binding['sourceFilesAfter'][0] != owner_before[0] or not candidate['science']['fullTargetFieldAvailable']:
        raise RuntimeError('r2_bound_source_owner_or_coverage_changed')
    names = [f'{band}-science' for band in owner.BANDS]+['joint-availability','rgb-master']
    science_inputs = []
    loaded = {}
    for name in names:
        metadata = candidate['arrays'][name]
        path = SOURCE/metadata['file']
        bound = binding(path)
        if (bound['bytes'],bound['sha256'])!=(metadata['bytes'],metadata['sha256']):
            raise RuntimeError('actual_mosaic_science_binding_changed')
        data = np.load(path,mmap_mode='r',allow_pickle=False)
        if list(data.shape)!=metadata['shape'] or data.dtype.str!=metadata['dtype']:
            raise RuntimeError('actual_mosaic_science_array_changed')
        science_inputs.append(bound)
        loaded[name] = data
    joint = loaded['joint-availability']
    science = {band:loaded[f'{band}-science'] for band in owner.BANDS}
    if joint.dtype!=np.bool_ or joint.shape!=(2048,2048) or not joint.all() or any(not np.isfinite(value[joint]).all() for value in science.values()):
        raise RuntimeError('bound_full_coherent_science_required')
    # Read-only cached scientific arrays remain authoritative. Zero fill here
    # only sanitizes unavailable inputs for a display transformation.
    display = {band:np.where(joint,value,0).astype(np.float32) for band,value in science.items()}
    entry = {'objectRef':candidate['objectRef'],'center':candidate['center'],'orientation':candidate['orientation']}
    target = WCS(candidate['wcsHeader'])
    output.mkdir(parents=True,exist_ok=False)
    implementation = {
        'LuptonAsinhStretch':inspect.getsource(LuptonAsinhStretch),
        'LuptonAsinhZscaleStretch':inspect.getsource(LuptonAsinhZscaleStretch),
        'ZScaleInterval':inspect.getsource(ZScaleInterval),
        'RGBImageMappingLupton.apply_mappings':inspect.getsource(RGBImageMappingLupton.apply_mappings),
        'compute_intensity':inspect.getsource(compute_intensity),
        'make_lupton_rgb':inspect.getsource(make_lupton_rgb),
    }
    implementation_paths = []
    for name,text in implementation.items():
        path = output/(name.replace('.','-')+'-actual-implementation.py.txt')
        with path.open('x',encoding='utf-8',newline='\n') as source:
            source.write(text)
        implementation_paths.append(binding(path))
    zscale_calls = []
    original_limits = ZScaleInterval.get_limits
    def record_global_limits(instance,values):
        # Transparently instrument the library's one whole-master fit, rather
        # than refitting it for a report or for any of the three crop levels.
        finite_indices = np.flatnonzero(np.isfinite(values).ravel())
        finite_values = np.asarray(values).ravel()[finite_indices]
        stride = int(max(1.0,finite_values.size/instance.n_samples))
        indices = finite_indices[::stride][:instance.n_samples]
        samples = finite_values[::stride][:instance.n_samples]
        limits = original_limits(instance,values)
        zscale_calls.append({'scope':'one complete coherent RGB master, before any crop',
            'nSamples':instance.n_samples,'contrast':instance.contrast,'maxReject':instance.max_reject,
            'minNpixels':instance.min_npixels,'krej':instance.krej,'maxIterations':instance.max_iterations,
            'finiteIntensitySamples':int(finite_values.size),'deterministicRasterStride':stride,
            'actualStatisticalSamples':int(samples.size),'z1':float(limits[0]),'z2':float(limits[1]),
            'inputIntensityStats':stats(finite_values),
            'sampleRasterIndices':save_array(output/'zscale-actual-sample-raster-indices.npy',indices),
            'sampleIntensityValues':save_array(output/'zscale-actual-sample-intensities.npy',samples),
            'meaning':'selection/limits are display statistics only; finite/zero/negative source samples remain scientific measurements'})
        return limits
    # Astropy copies to float64 and computes mean intensity from all three
    # bands. Unavailable science would be NaN and excluded, never valid black.
    zscale_input = np.stack([np.where(joint,science[band],np.nan) for band in ('i','r','g')])
    with patch.object(ZScaleInterval,'get_limits',record_global_limits):
        zscale = LuptonAsinhZscaleStretch(zscale_input,Q=8,pedestal=None)
    del zscale_input
    if len(zscale_calls)!=1 or zscale.stretch<=0:
        raise RuntimeError('one_positive_global_zscale_required')
    choices = [
        ('fixed-5-q8',LuptonAsinhStretch(stretch=5,Q=8),{'kind':'fixed-parameters','selection':'previous mosaic and Astropy defaults'}),
        ('docs-05-q10',LuptonAsinhStretch(stretch=.5,Q=10),{'kind':'fixed-parameters','selection':'Astropy SDSS display example, not fitted to M51/crops'}),
        ('global-zscale-q8',zscale,{'kind':'whole-master-LuptonAsinhZscaleStretch','selection':'one library default ZScaleInterval fit to shared intensity; Q8, pedestal None','statistics':zscale_calls[0]}),
    ]
    variants, decoded_for_sheet = {}, {}
    for name,stretch,selection in choices:
        directory = output/name
        directory.mkdir()
        with np.errstate(invalid='ignore',divide='ignore'):
            rgb = make_lupton_rgb(display['i'],display['r'],display['g'],interval=ManualInterval(vmin=0,vmax=None),stretch_object=stretch,output_dtype=np.uint8)
        rgb[~joint] = 0
        if name=='fixed-5-q8' and not np.array_equal(rgb,loaded['rgb-master']):
            raise RuntimeError('default_global_transfer_must_reproduce_r2_master_exactly')
        master_binding = save_array(directory/'rgb-master.npy',rgb)
        bands = {band:owner.ProjectedBand(value,joint,joint,{}) for band,value in science.items()}
        master = owner.GriMaster(target,bands,joint,rgb,{'fieldDegrees':candidate['fieldDegrees']})
        level_reports = {}
        for level,(payload,metadata) in owner.pyramid(master,entry).items():
            path = directory/(level.lower()+'.png')
            with path.open('xb') as image:
                image.write(payload)
            with Image.open(io.BytesIO(payload)) as image:
                image.load()
                mode = image.mode
                decoded = np.asarray(image.convert('RGBA'))
            expected = independent_box(rgb,joint,metadata['masterCrop']['boundsXYExclusive'],metadata['masterCrop']['boxFactor'])
            if not np.array_equal(decoded,expected):
                raise RuntimeError('decoded_level_does_not_come_from_bound_global_rgb_master')
            old_path = SOURCE/candidate['levels'][level]['file']
            with Image.open(old_path) as old_image:
                old_image.load()
                old = np.asarray(old_image.convert('RGBA'))
            if not np.array_equal(decoded[:,:,3],old[:,:,3]):
                raise RuntimeError('global_transfer_cannot_change_scientific_availability_alpha')
            if name=='fixed-5-q8' and not np.array_equal(decoded,old):
                raise RuntimeError('default_levels_must_reproduce_r2_pixels_exactly')
            diff = decoded[:,:,:3].astype(np.int16)-old[:,:,:3].astype(np.int16)
            level_reports[level] = metadata|{'actualFile':binding(path),'actualDecoded':{'mode':mode,'shape':list(decoded.shape),'dtype':decoded.dtype.str,
                'rgbaBytes':int(decoded.nbytes),'rgbaSha256':digest(decoded.tobytes()),'sameGlobalMasterBoxPixels':True,'sameScienceAlphaAsR2':True},
                'rgbStats':rgb_stats(decoded[:,:,:3]),'differenceToFixed5Q8':{'changedPixels':int(np.any(diff!=0,axis=2).sum()),'maxAbsoluteChannelDelta':int(np.abs(diff).max())},
                'sourceRgbMaster':master_binding}
            decoded_for_sheet[(name,level)] = decoded
        variants[name] = {'method':'Astropy make_lupton_rgb; same i/r/g mapping; common intensity scaling',
            'libraryVersion':astropy.__version__,'stretchClass':type(stretch).__name__,'stretch':float(stretch.stretch),'Q':float(stretch.Q),
            'interval':{'class':'ManualInterval','vmin':0,'vmax':None},'selection':selection,
            'scienceCorrection':'NONE; no NMGY/sky/background/channel balancing/deconvolution/sharpening',
            'rgbMaster':master_binding,'rgbStats':rgb_stats(rgb),'levels':level_reports,
            'pngFamilyBytes':sum(item['bytes'] for item in level_reports.values()),
            'sampleValidity':'unchanged coherent joint mask; display clipping of negative intensity is not scientific absence'}
    # Actual decoded level pixels at 1:1 size, with labels outside the panels.
    sheet = Image.new('RGB',(1560,1632),(18,18,18))
    draw = ImageDraw.Draw(sheet)
    for column,(name,_,_) in enumerate(choices):
        for row,level in enumerate(owner.LEVELS):
            x,y = column*520+4,row*544+4
            draw.text((x,y),name+' '+level,fill='white')
            sheet.paste(Image.fromarray(decoded_for_sheet[(name,level)][:,:,:3]),(x,y+24))
    sheet.save(output/'transfer-contact-sheet.png')
    source_after = inventory(SOURCE)
    owner_after = [binding(path) for path in owners]
    if source_before!=source_after or owner_before!=owner_after:
        raise RuntimeError('science_inputs_or_owner_changed_during_global_transfer')
    report = {'version':'sdss-m51-whole-master-transfer-trial-v1',
        'scope':'three bounded display transfers of one previously bound science mosaic; not source quality, natural color, resolution/native/publication acceptance',
        'script':binding(Path(__file__)),'astropyVersion':astropy.__version__,'numpyVersion':np.__version__,'pillowVersion':PIL.__version__,
        'documentation':DOCS,'actualLibraryImplementation':implementation_paths,
        'previousCandidate':binding(candidate_path),'previousBinding':binding(previous_binding_path),
        'actualScienceInputs':science_inputs,'actualScientificCounts':{band:stats(value[joint]) for band,value in science.items()},
        'sourceBefore':source_before,'sourceAfter':source_after,'sourceArraysAndWholePreviousGenerationUnchanged':True,
        'ownerBefore':owner_before,'ownerAfter':owner_after,'productionOwnerUnchanged':True,
        'globalZscaleDeterminationCalls':len(zscale_calls),'variants':variants,
        'contactSheet':binding(output/'transfer-contact-sheet.png'),
        'limitations':['Same physical source/PSF and bilinear science coadd for every candidate; no generated or recovered astronomical details.',
            'Changing global intensity transfer cannot restore frequencies lost to source PSF/seeing/resampling, or increase resolution when displayed beyond source sampling.',
            'Common channel mapping and intensity weights are preserved; brighter encoding is not natural color or channel/PSF calibration.',
            'Statistical sampling covers this whole master once; parameters are never re-estimated from individual display crop levels.',
            'No runtime blend/alpha/taper/publication/consumer cache changes; actual sky composition and production memory/DAU remain unverified.']}
    write_report(output/'result.json',report)
    write_report(output/'binding.json',{'script':binding(Path(__file__)),'inputs':science_inputs+[binding(candidate_path),binding(previous_binding_path)],
        'ownerBefore':owner_before,'ownerAfter':owner_after,'outputs':inventory(output),
        'scienceArraysAndMasksUnchanged':True,'outputScope':'exclusive task-only transfer diagnostics and PNG; no scientific/source/native quality adoption'})
    print(json.dumps({'result':str(output/'result.json'),'contactSheet':str(output/'transfer-contact-sheet.png'),
        'variants':{name:{'stretch':item['stretch'],'Q':item['Q'],'pngFamilyBytes':item['pngFamilyBytes'],'rgbStats':item['rgbStats']} for name,item in variants.items()},
        'globalZscaleDeterminationCalls':len(zscale_calls),'sourceAndOwnerUnchanged':True}))


if __name__=='__main__':
    main()
