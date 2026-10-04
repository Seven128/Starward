"""Actual six complete cached M51 fields to a new offline mosaic generation."""
from pathlib import Path
import argparse
import ctypes
import itertools
import json
import math
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image
from image_quality import digest,write_report
from sdss_corrected_frame import read_cached_frame
import sdss_gri_tan as owner


def binding(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':digest(raw)}


def inventory(directory):
    return [binding(path) for path in sorted(directory.rglob('*')) if path.is_file()]


def field_key(identity):
    return '/'.join(str(identity[name]) for name in ('rerun','run','camcol','field'))


def process_memory():
    if sys.platform != 'win32':
        return {'kind':'WindowsProcessMemoryCounters','available':False,'peakWorkingSetBytes':None}
    class Counters(ctypes.Structure):
        _fields_ = [('cb',ctypes.c_ulong),('PageFaultCount',ctypes.c_ulong),
                    ('PeakWorkingSetSize',ctypes.c_size_t),('WorkingSetSize',ctypes.c_size_t),
                    ('QuotaPeakPagedPoolUsage',ctypes.c_size_t),('QuotaPagedPoolUsage',ctypes.c_size_t),
                    ('QuotaPeakNonPagedPoolUsage',ctypes.c_size_t),('QuotaNonPagedPoolUsage',ctypes.c_size_t),
                    ('PagefileUsage',ctypes.c_size_t),('PeakPagefileUsage',ctypes.c_size_t)]
    kernel = ctypes.WinDLL('kernel32',use_last_error=True)
    psapi = ctypes.WinDLL('psapi',use_last_error=True)
    kernel.GetCurrentProcess.restype = ctypes.c_void_p
    psapi.GetProcessMemoryInfo.argtypes = [ctypes.c_void_p,ctypes.POINTER(Counters),ctypes.c_ulong]
    counter = Counters()
    counter.cb = ctypes.sizeof(counter)
    success = bool(psapi.GetProcessMemoryInfo(kernel.GetCurrentProcess(),ctypes.byref(counter),counter.cb))
    return {'kind':'WindowsProcessMemoryCounters','available':success,
            'workingSetBytes':int(counter.WorkingSetSize) if success else None,
            'peakWorkingSetBytes':int(counter.PeakWorkingSetSize) if success else None,
            'privatePagefileBytes':int(counter.PagefileUsage) if success else None,
            'peakPrivatePagefileBytes':int(counter.PeakPagefileUsage) if success else None,
            'meaning':'actual local offline Python process, neither native renderer total memory nor staging/production server capacity'}


def stats(values):
    if not values.size:
        return {'samples':0,'median':None,'p05':None,'p95':None,'mad':None}
    median = float(np.median(values))
    return {'samples':int(values.size),'median':median,'p05':float(np.percentile(values,5)),
            'p95':float(np.percentile(values,95)),'mad':float(np.median(np.abs(values-median)))}


def overlap_diagnostics(master,row,output):
    n = master.joint_available.shape[0]
    yy,xx = np.mgrid[0:n,0:n]
    step_arcmin = abs(float(master.target.wcs.cdelt[0]))*60
    east = ((n-1)/2-xx)*step_arcmin
    north = ((n-1)/2-yy)*step_arcmin
    pa = math.radians(row['positionAngleDeg'])
    major = east*math.sin(pa)+north*math.cos(pa)
    minor = east*math.cos(pa)-north*math.sin(pa)
    # A conservative catalogue-size exclusion for residual diagnostics only.
    # It is neither a true outer-isophote/companion/star mask nor sky proof.
    scale = 1.25
    outside = (major/(row['majorAxisArcmin']*.5*scale))**2 + (minor/(row['minorAxisArcmin']*.5*scale))**2 > 1
    records = []
    for a,b in itertools.combinations(master.mosaic_fields,2):
        joint_a = np.logical_and.reduce([master.mosaic_fields[a][band].finite_neighbors for band in owner.BANDS])
        joint_b = np.logical_and.reduce([master.mosaic_fields[b][band].finite_neighbors for band in owner.BANDS])
        overlap = joint_a&joint_b
        if not overlap.any():
            continue
        per_band = {}
        for band in owner.BANDS:
            difference = master.mosaic_fields[a][band].data.astype(np.float64)-master.mosaic_fields[b][band].data
            per_band[band] = {'allOverlap':stats(difference[overlap]),'outsideEnlargedCatalogEllipse':stats(difference[overlap&outside])}
        records.append({'fieldA':a,'fieldB':b,'jointOverlapPixels':int(overlap.sum()),
                        'outsideCatalogPixels':int((overlap&outside).sum()),'perBandNanomaggiesPerPixelDifference':per_band})
    weight_sum = np.zeros((n,n),dtype=np.float64)
    for value in master.mosaic_weights.values():
        weight_sum += value
    max_sum_error = float(np.max(np.abs(weight_sum[master.joint_available]-1)))
    names = list(master.mosaic_fields)
    colors = np.array([(56,123,193),(217,142,26),(55,160,98),(168,93,202),(206,70,68),(42,174,188)],dtype=np.uint8)
    dominant = np.zeros((n,n),dtype=np.int8)
    maximum_weight = np.zeros((n,n),dtype=np.float32)
    contributions = []
    for index,name in enumerate(names):
        weight = master.mosaic_weights[name]
        replace = weight>maximum_weight
        dominant[replace] = index
        maximum_weight[replace] = weight[replace]
        contributions.append({'fieldKey':name,'positiveNormalizedWeightPixels':int((weight>0).sum()),
                              'summedNormalizedWeightEquivalentPixels':float(weight.sum(dtype=np.float64))})
    Image.fromarray(colors[dominant]).save(output/'mosaic-dominant-geometric-field.png')
    Image.fromarray(np.clip(master.contributor_count*64,0,255).astype(np.uint8)).save(output/'mosaic-supply-count.png')
    write_report(output/'overlap-diagnostics.json',{'fieldPairs':records,'fieldContributions':contributions,
        'normalizedWeightSumMaxError':max_sum_error,'unit':'nanomaggies/pixel',
        'backgroundCorrections':'NONE','outsideCatalogExclusion':{'majorAxisArcmin':row['majorAxisArcmin'],
            'minorAxisArcmin':row['minorAxisArcmin'],'positionAngleDeg':row['positionAngleDeg'],'sizeMultiplier':scale},
        'meaning':'measured differences between actual registered fields. All-overlap includes stars/galaxy/PSF and outside-enlarged-catalog still lacks a science source/companion/star mask; neither is a valid background-offset prescription or noise/quality certificate',
        'diagnosticColors':[{'fieldKey':name,'rgb':colors[index].tolist()} for index,name in enumerate(names)],
        'diagnosticImageMeaning':'field weight preference/supply only, not astronomy RGB/coverage confidence'})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    args = parser.parse_args()
    args.output = args.output.resolve()
    if args.output.exists():
        raise RuntimeError('preserve_existing_mosaic_generation')
    start = time.monotonic()
    initial_memory = process_memory()
    owner_paths = [ROOT/'data-pipelines/deep-sky'/name for name in ('sdss_gri_tan.py','test_sdss_gri_tan.py','sdss_corrected_frame.py','image_quality.py','requirements.txt')]
    source_before = [binding(path) for path in owner_paths]
    assets_before = inventory(ROOT/'workers/miniapp-api/assets/deep-sky')
    old_candidate_before = inventory(ROOT/'output/sdss-gri-tan-candidate-1002')
    cache = ROOT/'output/sdss-corrected-m51-1002'
    plan_path = ROOT/'output/sdss-m51-field-geometry-1002/selected-gi-plan.json'
    geometry_path = ROOT/'output/sdss-m51-field-geometry-1002/geometry.json'
    geometry = json.loads(geometry_path.read_bytes())
    selected = set(geometry['chosenBufferedRFields'])
    if len(selected)!=6:
        raise RuntimeError('bounded_actual_field_selection_changed')
    receipt_paths = [cache/name for name in ('frame-acquisition.json','field-r-acquisition.json','field-gi-acquisition.json')]
    all_records = [item for path in receipt_paths for item in json.loads(path.read_bytes())['sourceFiles']]
    records = [item for item in all_records if field_key(item['identity']) in selected]
    if len(records)!=18 or {(field_key(item['identity']),item['identity']['band']) for item in records}!={(field,band) for field in selected for band in owner.BANDS}:
        raise RuntimeError('six_complete_actual_band_sets_required')
    records.sort(key=lambda item:(int(item['identity']['rerun']),item['identity']['run'],item['identity']['camcol'],item['identity']['field'],item['identity']['band']))
    frames = []
    for item in records:
        source = (cache/'sources'/item['path']).resolve()
        if not source.is_relative_to((cache/'sources').resolve()) or item['httpStatus']!=200:
            raise RuntimeError('actual_source_path_or_acquisition_invalid')
        frames.append(read_cached_frame(source,{**item['identity'],'sha256':item['sha256'],'bytes':item['bytes'],'sourceUrl':item['url']},max_uncompressed_bytes=32*1024*1024))
    read_done = time.monotonic()
    entry_path = ROOT/'workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json'
    catalog_path = ROOT/'packages/astronomy-core/data/opengc-messier-deep-sky.v1.json'
    entry = json.loads(entry_path.read_bytes())
    row = next(row for row in json.loads(catalog_path.read_bytes())['rows'] if row['objectRef']=='M:51')
    master = owner.build_mosaic_master(frames,entry,2048,entry['levels']['OVERVIEW']['fieldDegrees'],require_complete=True)
    build_done = time.monotonic()
    report = owner.save_candidate(args.output,master,entry,row)
    overlap_diagnostics(master,row,args.output)
    save_done = time.monotonic()
    assets_after = inventory(ROOT/'workers/miniapp-api/assets/deep-sky')
    old_candidate_after = inventory(ROOT/'output/sdss-gri-tan-candidate-1002')
    source_after = [binding(path) for path in owner_paths]
    if source_after!=source_before or assets_after!=assets_before or old_candidate_after!=old_candidate_before:
        raise RuntimeError('owner_or_prior_generation_changed_during_mosaic')
    objects = [frame.data for frame in frames]+[master.joint_available,master.rgb,master.contributor_count]
    objects += [value for field in master.mosaic_fields.values() for item in field.values() for value in (item.data,item.footprint,item.finite_neighbors)]
    objects += list(master.mosaic_weights.values())
    objects += [value for item in master.bands.values() for value in (item.data,item.footprint,item.finite_neighbors)]
    objects += [value for item in master.independent_band_unions.values() for value in (item.footprint,item.finite_neighbors)]
    modeled_numpy_bytes = sum(value.nbytes for value in {id(value):value for value in objects}.values())
    outputs = inventory(args.output)
    family_bytes = {name:sum(metadata['bytes'] if name=='availability' else metadata['alternativeDisplay']['bytes'] for metadata in report['levels'].values()) for name in ('availability','encodedDisplayContribution')}
    write_report(args.output/'binding.json',{'version':owner.MOSAIC_VERSION,'scope':'Actual offline six-field trial only; neither new publication/runtime adoption nor source-quality/astrometry/native/server-capacity acceptance',
        'script':binding(Path(__file__)),'sourceFilesBefore':source_before,'sourceFilesAfter':source_after,
        'inputs':[binding(path) for path in [*receipt_paths,plan_path,geometry_path,entry_path,catalog_path,*[cache/'sources'/item['path'] for item in records]]],
        'sourceFrameReceipts':[frame.receipt for frame in frames],
        'compressedSelectedRawBytes':sum(item['bytes'] for item in records),'decompressedSelectedRawBytes':sum(frame.receipt['decompressed']['bytes'] for frame in frames),
        'elapsedSeconds':{'sourceAdmission':read_done-start,'mosaicBuild':build_done-read_done,'saveAndOverlapDiagnostics':save_done-build_done,'totalAtReadback':time.monotonic()-start},
        'localOfflineProcessMemory':{'initial':initial_memory,'afterActualBuildAndSave':process_memory()},
        'retainedKnownNumpyBytesModel':modeled_numpy_bytes,'numpyModelMeaning':'selected raw primary, field/coadd scientific arrays, masks, common weights, RGB and contributor arrays only; not temporaries, Astropy/Pillow buffers, OS/native/GPU or server capacity',
        'candidateOutputs':outputs,'candidateOutputsBytesBeforeBinding':sum(item['bytes'] for item in outputs),
        'mutuallyExclusiveClientPngFamilyBytes':family_bytes,'oldClientJpegFamilyBytes':sum(level['bytes'] for level in entry['levels'].values()),
        'oldAssetsBefore':assets_before,'oldAssetsAfter':assets_after,'oldCandidateBefore':old_candidate_before,'oldCandidateAfter':old_candidate_after,
        'fullTargetCoherentGriAvailable':report['science']['fullTargetFieldAvailable'],'qualityAcceptance':'UNVERIFIED','fullAsTransAstrometry':'NOT_APPLIED'})
    print(json.dumps({'candidate':str(args.output/'candidate.json'),'fieldCount':len(selected),'inputFrames':len(frames),'fullTargetCoherentGriAvailable':bool(master.joint_available.all()),
        'compressedSelectedRawBytes':sum(item['bytes'] for item in records),'mutuallyExclusiveClientPngFamilyBytes':family_bytes,
        'offlineElapsedSeconds':time.monotonic()-start,'peakLocalProcessWorkingSetBytes':process_memory().get('peakWorkingSetBytes'),'qualityAcceptance':'UNVERIFIED'}))


if __name__=='__main__':
    main()
