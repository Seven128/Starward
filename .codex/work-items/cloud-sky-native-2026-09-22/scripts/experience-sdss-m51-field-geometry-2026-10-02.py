"""Actual cached M51 fields: target-pixel stencil union and bounded next inputs.

No network, source edits or publication. R selection is a dependency for actual
g/i acquisition, not a three-band or full-astrometry coverage certificate.
"""
from pathlib import Path
import argparse
import csv
import hashlib
import io
import itertools
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'), str(ROOT / 'data-pipelines/deep-sky')]
import numpy as np
from astropy.wcs import WCS
from PIL import Image
from sdss_corrected_frame import read_cached_frame


def binding(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def key(identity):
    return '/'.join(str(identity[name]) for name in ('rerun', 'run', 'camcol', 'field'))


def field_rows(path, receipt_path):
    raw = path.read_bytes()
    receipt = json.loads(receipt_path.read_bytes())
    if receipt['status'] != 200 or receipt['bytes'] != len(raw) or receipt['sha256'] != hashlib.sha256(raw).hexdigest():
        raise RuntimeError('cas_raw_receipt_mismatch')
    rows = list(csv.DictReader(io.StringIO('\n'.join(line for line in raw.decode('utf-8-sig').splitlines() if line and not line.startswith('#')))))
    if len(rows) != 7:
        raise RuntimeError('bounded_discovered_field_count_changed')
    expected_fields = {(301,3699,6,99), (301,3699,6,100), (301,3699,6,101),
                       (301,3716,5,117), (301,3716,6,116), (301,3716,6,117), (301,3716,6,118)}
    decoded = []
    for row in rows:
        value = int(row['fieldID'])
        parts = ((value >> 48) & 2047, (value >> 32) & 65535, (value >> 29) & 7, (value >> 16) & 4095)
        if value & 65535 or parts != tuple(int(row[name]) for name in ('rerun','run','camcol','field')):
            raise RuntimeError('field_id_encoding_mismatch')
        decoded.append({'fieldID': row['fieldID'], 'rerun': str(parts[0]), 'run': parts[1],
                        'camcol': parts[2], 'field': parts[3], 'skyVersion': (value >> 59) & 15})
    if {tuple(int(row[name]) for name in ('rerun','run','camcol','field')) for row in decoded} != expected_fields:
        raise RuntimeError('bounded_discovered_identity_changed')
    return decoded


def source_stencil(data, x, y):
    rows, cols = data.shape
    geometric = np.isfinite(x) & np.isfinite(y) & (x >= 0) & (y >= 0) & (x < cols - 1) & (y < rows - 1)
    finite = np.zeros(x.shape, dtype=bool)
    if geometric.any():
        xx = np.floor(x[geometric]).astype(np.intp)
        yy = np.floor(y[geometric]).astype(np.intp)
        finite[geometric] = np.isfinite(data[yy,xx]) & np.isfinite(data[yy,xx+1]) & np.isfinite(data[yy+1,xx]) & np.isfinite(data[yy+1,xx+1])
    return geometric, finite


def analyze_frame(frame, target, n, guard, output, expected_footprint=None):
    rows, cols = frame.data.shape
    geometric = np.zeros((n,n), dtype=bool)
    finite = np.zeros((n,n), dtype=bool)
    buffered = np.zeros((n,n), dtype=bool)
    boundaries = {name: 0 for name in ('xBelow0','xAtOrAboveColumnsMinus1','yBelow0','yAtOrAboveRowsMinus1','nonfiniteWcs')}
    bounds = [math.inf, math.inf, -math.inf, -math.inf]
    for start in range(0,n,64):
        end = min(n,start+64)
        yy,xx = np.mgrid[start:end,0:n]
        ra,dec = target.all_pix2world(xx,n-1-yy,0)
        x,y = frame.wcs.all_world2pix(ra,dec,0)
        gg,ff = source_stencil(frame.data,x,y)
        geometric[start:end], finite[start:end] = gg,ff
        buffered[start:end] = ff & (x >= guard[0]) & (y >= guard[1]) & (x < cols-1-guard[0]) & (y < rows-1-guard[1])
        for name,mask in (('xBelow0',x<0),('xAtOrAboveColumnsMinus1',x>=cols-1),
                          ('yBelow0',y<0),('yAtOrAboveRowsMinus1',y>=rows-1),('nonfiniteWcs',~np.isfinite(x)|~np.isfinite(y))):
            boundaries[name] += int(mask.sum())
        if np.isfinite(x).any() and np.isfinite(y).any():
            bounds = [min(bounds[0],float(np.nanmin(x))),min(bounds[1],float(np.nanmin(y))),
                      max(bounds[2],float(np.nanmax(x))),max(bounds[3],float(np.nanmax(y)))]
    available = geometric & finite
    same_saved = None
    if expected_footprint:
        previous = np.load(expected_footprint)
        same_saved = bool(np.array_equal(previous,geometric))
        if not same_saved:
            raise RuntimeError('current_candidate_footprint_differs_from_actual_source_wcs')
    field_key = key(frame.receipt['identity'])
    name = field_key.replace('/','-')+'-'+frame.receipt['identity']['band']
    np.save(output/(name+'-available.npy'),available,allow_pickle=False)
    np.save(output/(name+'-buffered.npy'),buffered,allow_pickle=False)
    corners = np.array([[0,0],[cols-1,0],[cols-1,rows-1],[0,rows-1]],dtype=float)
    world = frame.wcs.all_pix2world(corners,0)
    target_xy = target.all_world2pix(world,0)
    target_xy[:,1] = n-1-target_xy[:,1]
    regions = {}
    for region,x0,y0,x1,y1 in (('NW',0,0,n//2,n//2),('NE',n//2,0,n,n//2),('SW',0,n//2,n//2,n),('SE',n//2,n//2,n,n),
                              ('MEDIUM',n//4,n//4,3*n//4,3*n//4),('DETAIL',3*n//8,3*n//8,5*n//8,5*n//8)):
        area = available[y0:y1,x0:x1]
        regions[region] = {'availablePixels':int(area.sum()),'totalPixels':int(area.size),'fraction':float(area.mean())}
    report = {'identity':frame.receipt['identity'],'source':frame.receipt['source'],'sourceHeaderSha256':frame.receipt['wcs']['primaryHeaderSha256'],
              'sourceShapeRowsColumns':[rows,cols], 'sourceCornersWorld':world.tolist(),'sourceCornersTargetImageXY':target_xy.tolist(),
              'targetInSourceXYExtrema':bounds,'outsideBoundaryCountsOverlapping':boundaries,
              'availablePixels':int(available.sum()),'geometricPixels':int(geometric.sum()),
              'inFootprintNonfiniteNeighborPixels':int((geometric&~finite).sum()),'bufferedPixels':int(buffered.sum()),
              'regions':regions,'matchesSavedCandidateFootprintExactly':same_saved,
              'scientificValidity':'UNKNOWN','astrometry':'ACTUAL_PRIMARY_HEADER_LINEAR_TAN_ONLY_FULL_ASTRANS_NOT_APPLIED'}
    return available,buffered,report


def measured_guard(candidate,target,n):
    headers = {b:WCS(candidate['science']['perBand'][b]['sourceReceipt']['wcs']['celestialHeader']) for b in ('g','r','i')}
    delta = [0.,0.]
    for start in range(0,n,64):
        yy,xx = np.mgrid[start:min(n,start+64),0:n]
        ra,dec = target.all_pix2world(xx,n-1-yy,0)
        rx,ry = headers['r'].all_world2pix(ra,dec,0)
        for band in ('g','i'):
            x,y = headers[band].all_world2pix(ra,dec,0)
            delta = [max(delta[0],float(np.max(np.abs(x-rx)))),max(delta[1],float(np.max(np.abs(y-ry))))]
    return [math.ceil(v)+2 for v in delta],delta


def covering_sets(masks,base):
    packed = {name:np.packbits(mask.reshape(-1)) for name,mask in masks.items()}
    options = sorted(name for name in packed if name != base)
    best_partial = {'addedFields':[],'coveredPixels':int(masks[base].sum())}
    for count in range(len(options)+1):
        complete = []
        for additions in itertools.combinations(options,count):
            union = packed[base].copy()
            for name in additions:
                union |= packed[name]
            coverage = int(np.unpackbits(union).sum())
            if coverage > best_partial['coveredPixels']:
                best_partial = {'addedFields':list(additions),'coveredPixels':coverage}
            if bool((union==255).all()):
                complete.append({'addedFields':list(additions),'allFields':[base,*additions],'coveredPixels':coverage})
        if complete:
            return {'minimumAdditionalFieldCount':count,'completeSets':complete,'bestPartial':best_partial}
    return {'minimumAdditionalFieldCount':None,'completeSets':[],'bestPartial':best_partial}


def requests(fields,bands,existing):
    result = []
    for field in fields:
        for band in bands:
            if (key(field),band) in existing:
                continue
            path = f"frame-{band}-{field['run']:06d}-{field['camcol']}-{field['field']:04d}.fits.bz2"
            result.append({'path':path,'band':band,'identity':{**{k:field[k] for k in ('rerun','run','camcol','field')},'band':band},
                           'url':f"https://data.sdss.org/sas/dr17/eboss/photoObj/frames/{field['rerun']}/{field['run']}/{field['camcol']}/{path}"})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--r-acquisition',type=Path)
    parser.add_argument('--output',type=Path,required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise RuntimeError('preserve_existing_geometry_generation')
    source_dir = ROOT/'output/sdss-corrected-m51-1002/sources'
    candidate_path = ROOT/'output/sdss-gri-tan-candidate-1002/candidate.json'
    candidate = json.loads(candidate_path.read_bytes())
    cas_csv = ROOT/'output/sdss-corrected-m51-1002/target-field-response.csv'
    cas_receipt = ROOT/'output/sdss-corrected-m51-1002/target-field-receipt.json'
    fields = field_rows(cas_csv,cas_receipt)
    base_acquisition_path = ROOT/'output/sdss-corrected-m51-1002/frame-acquisition.json'
    base_records = json.loads(base_acquisition_path.read_bytes())['sourceFiles']
    extra_records = json.loads(args.r_acquisition.read_bytes())['sourceFiles'] if args.r_acquisition else []
    records = base_records+extra_records
    expected_keys = {key(field) for field in fields}
    existing = set()
    frames = []
    reader_before = binding(ROOT/'data-pipelines/deep-sky/sdss_corrected_frame.py')
    inputs = [binding(candidate_path),binding(cas_csv),binding(cas_receipt),binding(base_acquisition_path)]
    if args.r_acquisition:
        inputs.append(binding(args.r_acquisition))
    for record in records:
        identity = record['identity']
        if key(identity) not in expected_keys or identity['band'] not in ('g','r','i') or (key(identity),identity['band']) in existing:
            raise RuntimeError('actual_frame_identity_set_invalid')
        existing.add((key(identity),identity['band']))
        expected = {**identity,'sha256':record['sha256'],'bytes':record['bytes'],'sourceUrl':record['url']}
        path = (source_dir/record['path']).resolve()
        if not path.is_relative_to(source_dir.resolve()):
            raise RuntimeError('source_path_outside_authorized_cache')
        frames.append(read_cached_frame(path,expected,max_uncompressed_bytes=32*1024*1024))
        inputs.append(binding(path))
    if args.r_acquisition and {key(f.receipt['identity']) for f in frames if f.receipt['identity']['band']=='r'} != expected_keys:
        raise RuntimeError('seven_r_geometry_inputs_incomplete')
    n = candidate['pixels']
    if n != 2048:
        raise RuntimeError('actual_target_size_changed')
    target = WCS(candidate['wcsHeader'])
    guard,delta = measured_guard(candidate,target,n)
    args.output.mkdir(parents=True)
    r_masks,buffered_r,reports = {},{},[]
    base = '301/3699/6/100'
    base_masks = {}
    for frame in frames:
        band = frame.receipt['identity']['band']
        same_base = key(frame.receipt['identity'])==base
        previous = ROOT/f'output/sdss-gri-tan-candidate-1002/{band}-footprint.npy' if same_base else None
        available,buffered,report = analyze_frame(frame,target,n,guard,args.output,previous)
        reports.append(report)
        if same_base:
            base_masks[band] = available
        if band=='r':
            r_masks[key(frame.receipt['identity'])],buffered_r[key(frame.receipt['identity'])] = available,buffered
    joint = np.logical_and.reduce([base_masks[b] for b in ('g','r','i')])
    previous_joint = np.load(ROOT/'output/sdss-gri-tan-candidate-1002/joint-availability.npy')
    if not np.array_equal(joint,previous_joint):
        raise RuntimeError('current_candidate_joint_mask_not_reproduced')
    rgb_mask = np.stack([base_masks['i'],base_masks['r'],base_masks['g']],axis=2).astype(np.uint8)*255
    Image.fromarray(rgb_mask).save(args.output/'center-actual-stencil-coverage.png')
    selection = {'actualStencil':covering_sets(r_masks,base),'bufferedStencil':covering_sets(buffered_r,base)}
    union = np.logical_or.reduce(list(r_masks.values()))
    Image.fromarray((union.astype(np.uint8)*255)).save(args.output/'actual-r-union.png')
    np.save(args.output/'actual-r-union.npy',union,allow_pickle=False)
    pending_r = requests(fields,('r',),existing)
    chosen = selection['bufferedStencil']['completeSets'][0]['allFields'] if selection['bufferedStencil']['completeSets'] else []
    gi_fields = [field for field in fields if key(field) in chosen]
    followup = requests(gi_fields,('g','i'),existing)
    reader_after = binding(ROOT/'data-pipelines/deep-sky/sdss_corrected_frame.py')
    if reader_before != reader_after:
        raise RuntimeError('source_reader_changed_during_geometry_run')
    report = {'version':'sdss-m51-actual-field-geometry-task-v1','scope':'Finite target-pixel availability under actual primary-header linear TAN; no full astrometry/scientific quality/publication/runtime claim',
              'targetWcs':candidate['wcsHeader'],'targetPixels':n,'casFields':fields,'casResponseStatus':'RAW_HASH_AND_64BIT_IDENTITY_CHECKED',
              'sourceReader':reader_after,'inputs':inputs,'frames':reports,'centerJointPixels':int(joint.sum()),
              'centerJointMatchesSavedCandidateExactly':True,'rUnionPixels':int(union.sum()),'rUnionFraction':float(union.mean()),
              'selectionGuardSourcePixelsXY':guard,'actualCenterCrossBandMaximumSourceXYDisplacement':delta,
              'guardMeaning':'Selection heuristic measured from acquired field100 g/r/i linear mappings plus two source pixels; does not bound different-field g/i distortion, full asTrans or scientific artifacts',
              'rSelection':selection,'pendingRGeometryRequests':pending_r,'chosenBufferedRFields':chosen,'followupGiRequests':followup,
              'giRequestMeaning':'Only a next-input dependency after complete buffered actual-r union; actual every-band all-target stencils still required, no black filling',
              'scientificValidity':'UNKNOWN','fullGriTargetCoverage':'UNVERIFIED','fullAsTransAstrometry':'NOT_APPLIED'}
    (args.output/'geometry.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    for name,source_requests,scope in [('pending-r-geometry-plan.json',pending_r,'CAS-discovered candidate r frames only; not known minimum full source set'),
                                       ('selected-gi-plan.json',followup,'Actual buffered r set selects g/i acquisition only; r cannot certify g/i coverage')]:
        (args.output/name).write_text(json.dumps({'objectRef':'M:51','scope':scope,'sourceFiles':source_requests,'compressedBytes':None,
            'runtimeNetwork':'forbidden','retries':0,'casResponse':binding(cas_csv),'geometryReport':binding(args.output/'geometry.json')},indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'report':str(args.output/'geometry.json'),'centerJointPixels':int(joint.sum()),'rUnionFraction':float(union.mean()),
                      'guardSourcePixelsXY':guard,'rMinimumAddedFields':selection['actualStencil']['minimumAdditionalFieldCount'],
                      'bufferedRMinimumAddedFields':selection['bufferedStencil']['minimumAdditionalFieldCount'],
                      'bufferedRCompleteSetCount':len(selection['bufferedStencil']['completeSets']),'chosenRFields':chosen,
                      'pendingRRequestCount':len(pending_r),'selectedGiRequestCount':len(followup),'fullGriTargetCoverage':'UNVERIFIED'}))


if __name__=='__main__':
    main()
