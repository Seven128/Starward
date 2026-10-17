"""Batch real-structure restoration from original RGB onto bound SXT products.

Photoshop owns editable original/base/mask layers. Pixel checks enforce exact
source in mask cores and unchanged SXT outside; no model, healing or fake detail.
Existing scientific/geometry/Scene uncertainty and exceptions remain explicit.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import numpy as np
from PIL import Image,ImageCms,ImageDraw,ImageFilter
from optical_publication_io import bound_bytes,bound_file,pinned_json
from photoshop_host import dispatch_photoshop
from image_quality import write_report,processing_review

VERSION='photoshop-local-original-restoration-v1'
EXECUTION_SOURCE_NAMES=('photoshop_original_restore.py','photoshop_host.py','photoshop_batch.ps1','photoshop_batch.jsx')


def retain_execution_sources(owners,directory,root):
    retained=directory/'execution-sources';retained.mkdir(exist_ok=False)
    bindings=[]
    for owner in owners:
        raw,_=bound_bytes(root/owner['path'],root=root,expected=owner,max_bytes=1024*1024)
        target=retained/Path(owner['path']).name
        with target.open('xb') as stream:
            stream.write(raw)
        bindings.append({'executedSource':owner,'retainedSource':bound_file(target,root=root)})
    return bindings


def import_restoration_products(processing_path,snapshots,directory,*,root):
    """Revalidate existing PS products using exact retained execution sources.

    Historical owner paths may have evolved. Only the four declared execution
    sources can relocate to same-byte/hash snapshots; data inputs cannot. The
    original receipt/key stay bound and unchanged, with current validation
    recorded separately. Never dispatch Photoshop or encode a product.
    """
    root,directory=root.resolve(),directory.resolve()
    raw,parent=bound_bytes(processing_path,root=root,max_bytes=8*1024*1024)
    original=json.loads(raw)
    if original.get('producerVersion')!=VERSION or original.get('schema')!='sxt-processing-v1':
        raise ValueError('ps_restoration_import_producer_invalid')
    if directory.exists() or not directory.is_relative_to(root/'output'):
        raise ValueError('ps_restoration_import_requires_fresh_output')
    if len(snapshots)!=len(EXECUTION_SOURCE_NAMES):
        raise ValueError('ps_restoration_execution_snapshots_incomplete')
    relocations={}
    for item in snapshots:
        source,retained=item['executedSource'],item['retainedSource']
        if (source['path']!='data-pipelines/deep-sky/'+Path(source['path']).name or
            Path(source['path']).name not in EXECUTION_SOURCE_NAMES or source['path'] in relocations or
            any(source[k]!=retained[k] for k in ('bytes','sha256'))):
            raise ValueError('ps_restoration_execution_snapshot_identity_invalid')
        bound_file(root/retained['path'],root=root,expected=retained)
        relocations[source['path']]=item
    rows=[]
    if not original.get('rows') or len({r['id']for r in original['rows']})!=len(original['rows']):
        raise ValueError('ps_restoration_import_identity_invalid')
    from sxt_processing import validate_job
    for source_row in original['rows']:
        if source_row['status']!='PROCESSED_PENDING_REVIEW' or source_row['key']['method']!='sxt+ps-local-original-restoration':
            raise ValueError('ps_restoration_import_requires_existing_completed_product')
        job=dict(source_row['key']['job']);dependencies=[];used=set()
        for dependency in job['dependencies']:
            relocated=relocations.get(dependency['path'])
            if relocated:
                if dependency!=relocated['executedSource']:
                    raise ValueError('ps_restoration_dependency_epoch_mismatch')
                dependency=relocated['retainedSource'];used.add(relocated['executedSource']['path'])
            else:
                for item in snapshots:
                    if dependency==item['retainedSource']:
                        used.add(item['executedSource']['path'])
            dependencies.append(dependency)
        if used!=set(relocations):
            raise ValueError('ps_restoration_import_execution_source_set_incomplete')
        job['dependencies']=[*dependencies,parent]
        validate_job(job,root=root,factor=1)
        for output in source_row['outputs'].values():
            bound_file(root/output['path'],root=root,expected=output)
        proof=validate_restoration_output(job,source_row['outputs'],root)
        if proof!=source_row['restorationProof']:
            raise ValueError('ps_restoration_import_pixel_proof_changed')
        rows.append({**source_row,'key':{**source_row['key'],'job':job,'owner':bound_file(Path(__file__),root=root),
                    'originalExecutionKey':source_row['key'],'executionDependencyRelocations':snapshots},
                    'origin':'IMPORTED_EXISTING_PS_PRODUCT','cacheHit':True})
    bound_file(processing_path,root=root,expected=parent)
    for item in snapshots:
        bound_file(root/item['retainedSource']['path'],root=root,expected=item['retainedSource'])
    directory.mkdir(parents=True,exist_ok=False)
    result={'schema':'sxt-processing-v1','producerVersion':VERSION,'manifest':original['manifest'],'rows':rows,
            'originalProcessing':parent,'nativeInferenceCalls':0,'photoshopCalls':0,'productEncodes':0,
            'originalExecutionNativeReport':original['nativeReport'],'currentValidationOwner':bound_file(Path(__file__),root=root),
            'executionDependencyRelocations':snapshots,'ordinaryAdoption':False,'visualQuality':'UNVERIFIED'}
    write_report(directory/'result.json',result)
    return result


def native_restoration_row(report,sid,size):
    rows=report.get('rows',[])
    if (report.get('status')!='EXPORTED_NOT_PIXEL_ACCEPTANCE' or
        report.get('documentIdsBefore')!=report.get('documentIdsAfter') or
        len({r.get('sample') for r in rows})!=len(rows)):
        raise ValueError('ps_restoration_native_identity_or_ownership_invalid')
    matches=[r for r in rows if r.get('sample')==sid]
    if len(matches)!=1:
        raise ValueError('ps_restoration_native_row_missing_or_ambiguous')
    row=matches[0];saved=row.get('psdReadback',{})
    if (row.get('status')!='EXPORTED_NOT_PIXEL_ACCEPTANCE' or
        [row.get('width'),row.get('height')]!=list(size) or
        row.get('mode')!='RGB' or row.get('bits')!=8 or
        saved.get('hasEditableUserMask') is not True or saved.get('layers')!=3 or
        saved.get('alphaChannels')!=1 or [saved.get('width'),saved.get('height')]!=list(size)):
        raise ValueError('ps_restoration_saved_editable_geometry_not_read_back')
    return row


def restoration_mask(size,paths,feather,polygons=()):
    if (type(feather) is not int or feather<0 or not isinstance(paths,(list,tuple)) or
        not isinstance(polygons,(list,tuple)) or not paths and not polygons):
        raise ValueError('ps_restoration_mask_invalid')
    mask=Image.new('L',tuple(size),0);draw=ImageDraw.Draw(mask)
    for path in paths:
        radius,points=path.get('radius'),path.get('points')
        if (type(radius) is not int or radius<=feather or radius<=0 or
            not isinstance(points,list) or not points or any(not isinstance(p,list) or len(p)!=2 or
            any(type(v) is not int for v in p) or not 0<=p[0]<size[0] or not 0<=p[1]<size[1] for p in points)):
            raise ValueError('ps_restoration_path_invalid')
        if len(points)>1:
            draw.line([tuple(p)for p in points],fill=255,width=radius*2+1,joint='curve')
        for x,y in points:
            draw.ellipse((x-radius,y-radius,x+radius,y+radius),fill=255)
    for points in polygons:
        if (not isinstance(points,list) or len(points)<3 or
            any(not isinstance(p,list) or len(p)!=2 or any(type(v) is not int for v in p) or
                not 0<=p[0]<size[0] or not 0<=p[1]<size[1] for p in points) or
            len({tuple(p)for p in points})!=len(points) or
            sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points,points[1:]+points[:1]))==0):
            raise ValueError('ps_restoration_polygon_invalid')
        draw.polygon([tuple(p)for p in points],fill=255)
    if feather:
        mask=mask.filter(ImageFilter.GaussianBlur(feather))
    values=np.asarray(mask)
    if not np.any(values==255) or not np.any(values==0):
        raise ValueError('ps_restoration_mask_requires_core_and_unchanged_exterior')
    return mask


def restoration_review_rois(size,rois):
    """Frozen repair-specific review windows, checked before native dispatch."""
    if (not isinstance(rois,list) or any(not isinstance(roi,list) or len(roi)!=4 or
            any(type(value)is not int for value in roi) or
            not 0<=roi[0]<roi[2]<=size[0] or not 0<=roi[1]<roi[3]<=size[1] for roi in rois)):
        raise ValueError('ps_restoration_review_roi_invalid')
    return rois


def rgb_binding(binding,root,size):
    raw,_=bound_bytes(root/binding['path'],root=root,expected=binding,max_bytes=128*1024*1024)
    with Image.open(io.BytesIO(raw)) as image:
        image.load()
        profile=image.info.get('icc_profile')
        if (image.format!='PNG' or image.mode!='RGB' or image.size!=tuple(size) or not profile or
            'sRGB' not in ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(profile)))):
            raise ValueError('ps_restoration_rgb_colour_or_geometry_invalid')
        return np.asarray(image).copy(),profile


def restoration_pixels(original,base,mask,after):
    if original.shape!=base.shape or after.shape!=original.shape or mask.shape!=original.shape[:2]:
        raise ValueError('ps_restoration_readback_geometry_invalid')
    core,exterior=mask==255,mask==0
    if not np.any(core) or not np.any(exterior):
        raise ValueError('ps_restoration_mask_support_invalid')
    core_diff=int(np.count_nonzero(after[core]!=original[core]))
    exterior_diff=int(np.count_nonzero(after[exterior]!=base[exterior]))
    if core_diff or exterior_diff:
        raise ValueError('ps_restoration_changed_core_or_exterior')
    numerator=original.astype('uint32')*mask[:,:,None]+base.astype('uint32')*(255-mask[:,:,None])
    expected=((numerator+127)//255).astype('uint8')
    difference=np.abs(after.astype('int16')-expected.astype('int16'))
    maximum=int(difference.max())
    if maximum>1 or not np.any(after!=base):
        raise ValueError('ps_restoration_feather_or_effect_invalid')
    return {'corePixels':int(core.sum()),'exteriorPixels':int(exterior.sum()),
        'coreChannelDifferences':core_diff,'exteriorChannelDifferences':exterior_diff,
        'featherMaximumVsEncodedNormalBlend':maximum,'changedPixels':int(np.any(after!=base,axis=2).sum()),
        'meaning':'Exact original RGB in frozen mask cores; exact previous SXT outside; feather quantization at most one code.'}


def validate_restoration_output(job,outputs,root):
    spec=job['restoration'];size=job['outputSize']
    if spec.get('schemaVersion')!=VERSION:
        raise ValueError('ps_restoration_contract_invalid')
    raw,_=bound_bytes(root/spec['nativeReport']['path'],root=root,expected=spec['nativeReport'],max_bytes=8*1024*1024)
    native_restoration_row(json.loads(raw),job['id'],size)
    original,profile=rgb_binding(job['input'],root,size)
    base,base_profile=rgb_binding(spec['base'],root,size)
    after,after_profile=rgb_binding(outputs['starless'],root,size)
    raw,_=bound_bytes(root/spec['mask']['path'],root=root,expected=spec['mask'],max_bytes=128*1024*1024)
    with Image.open(io.BytesIO(raw)) as image:
        image.load()
        if image.format!='PNG' or image.mode!='L' or image.size!=tuple(size):
            raise ValueError('ps_restoration_mask_geometry_invalid')
        mask=np.asarray(image).copy()
    if profile!=base_profile or profile!=after_profile or outputs.get('restorationBase')!=spec['base'] or outputs.get('restorationMask')!=spec['mask']:
        raise ValueError('ps_restoration_bound_base_mask_or_colour_changed')
    return restoration_pixels(original,base,mask,after)


def restore_batch(manifest_path,pin,directory,*,root,dispatch=dispatch_photoshop):
    root,directory=root.resolve(),directory.resolve()
    manifest,binding=pinned_json(manifest_path,pin,root=root)
    if manifest.get('schemaVersion')!='photoshop-original-restoration-batch-v1' or not manifest.get('jobs'):
        raise ValueError('ps_restoration_manifest_invalid')
    if directory.exists() or not directory.is_relative_to(root/'output'):
        raise ValueError('ps_restoration_output_must_be_new_under_output')
    limit=manifest.get('maxBatchPixels')
    if type(limit) is not int or limit<=0 or not 1<=len(manifest['jobs'])<=5:
        raise ValueError('ps_restoration_batch_budget_invalid')
    png_export=manifest.get('pngExport','save-for-web-profile')
    if png_export not in ('save-for-web-profile','save-as-png'):
        raise ValueError('ps_restoration_png_export_invalid')
    def document(spec):
        raw,current=bound_bytes(root/spec['path'],root=root,expected=spec,max_bytes=8*1024*1024)
        return json.loads(raw),current
    processing,processing_binding=document(manifest['processingReceipt'])
    review,review_binding=document(manifest['reviewReceipt'])
    if processing.get('schema')!='sxt-processing-v1' or review.get('schema')!='sxt-review-queue-v1' or review['processingReceipt']!=processing_binding:
        raise ValueError('ps_restoration_source_review_join_invalid')
    for receipt in (processing,review):
        if len({r['id'] for r in receipt['rows']})!=len(receipt['rows']):
            raise ValueError('ps_restoration_source_review_identity_ambiguous')
    retained=[binding,processing_binding,review_binding];jobs=[];pixels=0;seen=set()
    owners=[bound_file(Path(__file__),root=root),*[bound_file(Path(__file__).with_name(n),root=root)
        for n in ('photoshop_host.py','photoshop_batch.ps1','photoshop_batch.jsx')]]
    tool=manifest['photoshop']['tool'];tool_path=Path(tool['path'])
    if not tool_path.is_absolute() or tool_path.stat().st_size!=tool['bytes'] or hashlib.sha256(tool_path.read_bytes()).hexdigest()!=tool['sha256']:
        raise ValueError('ps_restoration_vendor_changed')
    for planned in manifest['jobs']:
        sid=planned['id']
        if not isinstance(sid,str) or re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',sid) is None or sid in seen:
            raise ValueError('ps_restoration_job_identity_invalid')
        seen.add(sid)
        source=next(r for r in processing['rows']if r['id']==sid)
        reviewed=next(r for r in review['rows']if r['id']==sid)
        if (source['status']!='PROCESSED_PENDING_REVIEW' or reviewed['status']!='NEEDS_REPAIR' or
            reviewed['outputs']!=source['outputs'] or reviewed['processingKeySha256']!=hashlib.sha256(json.dumps(source['key'],sort_keys=True).encode()).hexdigest()):
            raise ValueError('ps_restoration_not_current_bound_exception')
        job=source['key']['job'];size=job['outputSize']
        if 'coverage' in job or job['kind'] not in ('galaxy','galaxy-pair','nebula'):
            raise ValueError('ps_restoration_requires_complete_rgb_true_structure_recipe')
        original,profile=rgb_binding(job['input'],root,size)
        base,base_profile=rgb_binding(source['outputs']['starless'],root,size)
        if profile!=base_profile:
            raise ValueError('ps_restoration_original_base_colour_changed')
        pixels+=size[0]*size[1]
        if pixels>limit:
            raise ValueError('ps_restoration_declared_pixel_budget_exceeded')
        for dependency in [job['input'],*job['dependencies'],*source['outputs'].values()]:
            retained.append(bound_file(root/dependency['path'],root=root,expected=dependency))
        mask_source=None
        if 'frozenMask' in planned:
            if any(name in planned for name in ('paths','polygons','featherPixels')):
                raise ValueError('ps_restoration_mask_definitions_ambiguous')
            spec=planned['frozenMask']
            raw,mask_source=bound_bytes(root/spec['path'],root=root,expected=spec,max_bytes=spec['bytes'])
            with Image.open(io.BytesIO(raw))as image:
                if (image.format!='PNG' or image.mode!='L' or image.size!=tuple(size) or
                        'transparency'in image.info or image.info.get('icc_profile')):
                    raise ValueError('ps_restoration_frozen_mask_invalid')
                image.load();mask=image.copy()
            values=np.asarray(mask)
            if not np.any(values==255) or not np.any(values==0):
                raise ValueError('ps_restoration_mask_requires_core_and_unchanged_exterior')
            retained.append(mask_source)
        else:
            mask=restoration_mask(size,planned.get('paths',[]),planned['featherPixels'],planned.get('polygons',[]))
        review_rois=restoration_review_rois(size,planned.get('reviewRois',[]))
        jobs.append({'id':sid,'job':job,'size':size,'original':original,'base':base,'profile':profile,'maskImage':mask,'maskSource':mask_source,'sourceOutputs':source['outputs'],'reason':planned['reason'],'reviewRois':review_rois})
    directory.mkdir(parents=True,exist_ok=False)
    execution_sources=retain_execution_sources(owners,directory,root)
    retained_owners=[item['retainedSource']for item in execution_sources]
    native_jobs=[]
    for item in jobs:
        sid=item['id'];mask=directory/(sid+'-mask.png');item['maskImage'].save(mask)
        item['mask']=bound_file(mask,root=root);retained.append(item['mask'])
        native_jobs.append({'sample':sid,'input':str(root/item['job']['input']['path']),
            'inputSha256':item['job']['input']['sha256'],'processedCandidate':str(root/item['sourceOutputs']['starless']['path']),
            'processedCandidateSha256':item['sourceOutputs']['starless']['sha256'],'width':item['size'][0],'height':item['size'][1],
            'protectionMask':str(mask),'protectionMaskSha256':item['mask']['sha256'],
            'output':str(directory/(sid+'-photoshop.png')),'psd':str(directory/(sid+'.psd'))})
    config={'operation':'local-original-restoration','outputDirectory':str(directory),'pngExport':png_export,
        'jsxSha256':next(o['sha256']for o in owners if o['path'].endswith('.jsx')),
        'photoshopVersion':manifest['photoshop']['version'],'vendorTools':[tool],'jobs':native_jobs,'recipe':{}}
    write_report(directory/'native-config.json',config)
    native,details=dispatch(directory/'native-config.json',directory/'native-report.json')
    if native['documentIdsBefore']!=native['documentIdsAfter'] or len(native['rows'])!=len(jobs):
        raise RuntimeError('ps_restoration_native_document_ownership_not_restored')
    native_binding=bound_file(directory/'native-report.json',root=root);rows=[]
    for item in jobs:
        sid=item['id'];row={'id':sid,'status':'FAILED'};rows.append(row)
        try:
            native_restoration_row(native,sid,item['size'])
            output=directory/(sid+'-photoshop.png')
            with Image.open(output) as image:
                image.load()
                if image.mode!='RGB' or image.size!=tuple(item['size']):
                    raise ValueError('ps_restoration_native_output_geometry_invalid')
                after=np.asarray(image).copy()
            proof=restoration_pixels(item['original'],item['base'],np.asarray(item['maskImage']),after)
            final=directory/(sid+'-restored.png')
            Image.fromarray(after).save(final,icc_profile=item['profile'])
            final_binding=bound_file(final,root=root)
            job={**item['job'],'reviewRois':item['job'].get('reviewRois',[])+item['reviewRois'],
                'restoration':{'schemaVersion':VERSION,'base':item['sourceOutputs']['starless'],'mask':item['mask'],
                'nativeReport':native_binding,'originalProcessing':processing_binding,'originalReview':review_binding,'reason':item['reason']},
                'dependencies':[ *item['job']['dependencies'],binding,processing_binding,review_binding,item['mask'],native_binding,item['sourceOutputs']['starless'],*([item['maskSource']]if item['maskSource']else[]),*retained_owners]}
            outputs={**item['sourceOutputs'],'starless':final_binding,'restorationBase':item['sourceOutputs']['starless'],
                'restorationMask':item['mask'],'editablePsd':bound_file(directory/(sid+'.psd'),root=root)}
            validate_restoration_output(job,outputs,root)
            row.update(status='PROCESSED_PENDING_REVIEW',key={'job':job,'method':'sxt+ps-local-original-restoration','tools':[tool],
                'owner':owners[0],'parentProcessing':processing_binding},outputs=outputs,restorationProof=proof,
                scientificAvailability='UNKNOWN',sceneAcceptance='MISSING')
        except (ValueError,RuntimeError,OSError,KeyError) as error:
            row['error']=str(error);row['key']={'job':item['job'],'method':'sxt+ps-local-original-restoration'}
    for dependency in retained+owners:
        bound_file(root/dependency['path'],root=root,expected=dependency)
    if hashlib.sha256(tool_path.read_bytes()).hexdigest()!=tool['sha256']:
        raise RuntimeError('ps_restoration_tool_changed_during_batch')
    result={'schema':'sxt-processing-v1','producerVersion':VERSION,'manifest':binding,'rows':rows,
        'nativeInferenceCalls':0,'photoshopCalls':1,'details':details,'nativeReport':native_binding,'ordinaryAdoption':False,'visualQuality':'UNVERIFIED'}
    result['executionSources']=execution_sources
    write_report(directory/'result.json',result)
    processing_review(directory/'result.json',directory/'review',root=root)
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest',type=Path,required=True);parser.add_argument('--pin',required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();root=Path(__file__).resolve().parents[2]
    result=restore_batch(args.manifest,args.pin,args.output,root=root)
    print(json.dumps({'rows':len(result['rows']),'failed':sum(r['status']=='FAILED'for r in result['rows']),'nativeInferenceCalls':0}))
