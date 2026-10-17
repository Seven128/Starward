"""Local review publication of already processed continuous HiPS regions.

Original source/support and display estimates remain separate. No downloads,
raster/model/PS dispatch or source identity adoption. Current native/Prepared
packaging owns canonical hashes, immutable files and the existing HTTP family.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import numpy as np
from PIL import Image,ImageCms
from optical_publication_io import bound_bytes,bound_file,pinned_json
from hips_rgb_region import nominal_region_tan
from sxt_processing import validate_job,checked_work_image
from covered_rgb_display import validate_covered_output
from publish_prepared_optical import publish_prepared_candidate,PreparedEncodedLevel
from reviewed_sxt_display import validate_sxt_display_pixels

VERSION='prepared-derived-hips-sxt-display-v1'
def identity(binding):
    return {key:binding[key]for key in ('bytes','sha256')}
def byte_identity(raw):
    return {'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def text_identity(raw):
    return {**byte_identity(raw),'utf8':raw.decode('utf8')}

def recipe_identity_valid(recipe):
    if not isinstance(recipe,dict):return False
    def matches(key,pattern):
        value=recipe.get(key);return isinstance(value,str)and re.fullmatch(pattern,value)is not None
    return (recipe.get('schemaVersion')=='prepared-derived-region-recipe-v1' and
        matches('reference',r'REGION:[a-z0-9]+(?:-[a-z0-9]+)*') and
        matches('publicationId',r'[a-z0-9]+(?:-[a-z0-9]+)*') and
        all(isinstance(recipe.get(key),str)and recipe[key].strip()for key in ('label','preparedReference','processingId')) and
        type(recipe.get('maxWorkingPixels'))is int and recipe['maxWorkingPixels']>0)


def nominal_width(geometry):
    from astropy.wcs import WCS
    from astropy.coordinates import SkyCoord
    import astropy.units as u
    # Astropy interprets the same admitted plane; no custom spherical math.
    target=WCS(naxis=2);target.wcs.ctype=['RA---TAN','DEC--TAN'];target.wcs.radesys='ICRS'
    target.wcs.crval=geometry['referenceValue'];target.wcs.crpix=geometry['referencePixelFitsOneBased']
    target.wcs.cd=geometry['cdDegreesPerPixel']
    world=target.all_pix2world([-.5,geometry['sourceWidth']-.5],[geometry['sourceHeight']/2-.5]*2,0)
    points=SkyCoord(world[0]*u.deg,world[1]*u.deg,frame='icrs')
    return float(points[0].separation(points[1]).deg)


def publish_derived_region_recipe(recipe,recipe_binding,output,*,root):
    root,output=root.resolve(),output.resolve()
    if (not recipe_identity_valid(recipe) or
        output.exists() or not output.is_relative_to(root/'output')):
        raise ValueError('prepared_derived_region_recipe_or_output_invalid')
    bindings=[recipe_binding]
    def read(binding):
        raw,current=bound_bytes(root/binding['path'],root=root,expected=binding,max_bytes=binding['bytes'])
        bindings.append(current);return raw
    prep_raw=read(recipe['preparationReceipt']);prep=json.loads(prep_raw)
    if prep.get('schemaVersion')!='continuous-hips-region-trial-v1' or not prep.get('rows'):
        raise ValueError('prepared_derived_region_preparation_invalid')
    selected=[r for r in prep['rows']if r['reference']==recipe['preparedReference']]
    if len(selected)!=1:
        raise ValueError('prepared_derived_region_preparation_identity_ambiguous')
    region=selected[0];p=region['inputPreparation'];geometry=nominal_region_tan(p)
    width,height=p['width'],p['height']
    if (width*height>recipe['maxWorkingPixels'] or p['source']['ordinaryAdoption']is not False or p['scientificAvailability']!='UNKNOWN' or
        p['source']['contentLicense']!='CC-BY-4.0' or p['source']['hipsDatabaseLicense']!='ODbL-1.0'):
        raise ValueError('prepared_derived_region_budget_or_source_meaning_invalid')
    original_raw=read(region['wholeImage']);supplied_raw=read(region['suppliedMask'])
    with Image.open(io.BytesIO(original_raw)) as image:
        image.load();profile=image.info.get('icc_profile')
        if (image.format!='PNG' or image.mode!='RGBA' or image.size!=(width,height) or
            not profile or 'sRGB'not in ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(profile))) or image.getexif().get(274,1)!=1):
            raise ValueError('prepared_derived_region_original_rgb_or_colour_invalid')
        original=np.asarray(image).copy()
    with Image.open(io.BytesIO(supplied_raw)) as image:
        image.load()
        if image.format!='PNG' or image.mode!='L' or image.size!=(width,height):
            raise ValueError('prepared_derived_region_supply_invalid')
        supplied=np.asarray(image).copy()
    alpha=original[:,:,3];supplied_bool=supplied==255
    if not np.isin(alpha,[0,255]).all() or not np.isin(supplied,[0,255]).all() or np.any((~supplied_bool)&(alpha!=0)):
        raise ValueError('prepared_derived_region_partial_or_filled_coverage_unsupported')
    counts={'samples':width*height,'missingTileSamples':int((~supplied_bool).sum()),
        'sourceTransparentSamples':int((supplied_bool&(alpha==0)).sum()),'sourcePartialAlphaSamples':0,
        'opaqueSamples':int((supplied_bool&(alpha==255)).sum()),
        'opaqueBlackSamples':int((supplied_bool&(alpha==255)&np.all(original[:,:,:3]==0,axis=2)).sum())}
    if counts!=p['counts']:
        raise ValueError('prepared_derived_region_declared_coverage_changed')
    processing_raw=read(recipe['processingReceipt']);processing=json.loads(processing_raw)
    review_raw=read(recipe['reviewReceipt']);review=json.loads(review_raw)
    if processing.get('schema')!='sxt-processing-v1' or review.get('schema')!='sxt-review-queue-v1' or review.get('processingReceipt')!=recipe['processingReceipt']:
        raise ValueError('prepared_derived_region_processing_review_join_invalid')
    rows=[r for r in processing['rows']if r['id']==recipe['processingId']]
    reviewed=[r for r in review['rows']if r['id']==recipe['processingId']]
    if len(rows)!=1 or len(reviewed)!=1:
        raise ValueError('prepared_derived_region_processing_identity_ambiguous')
    row,decision=rows[0],reviewed[0];job=row['key']['job']
    if not review.get('decisionReceipt'):
        raise ValueError('prepared_derived_region_manual_decision_missing')
    decisions=json.loads(read(review['decisionReceipt']))
    declared=[r for r in decisions.get('decisions',[])if r.get('id')==recipe['processingId']]
    if (decisions.get('processingReceipt')!=recipe['processingReceipt'] or len(declared)!=1 or
        any(declared[0].get(key)!=decision.get(key)for key in ('status','reason','outputs','processingKeySha256'))):
        raise ValueError('prepared_derived_region_manual_decision_join_invalid')
    if (row['status']!='PROCESSED_PENDING_REVIEW' or row['key']['method']!='sxt' or row.get('processingWarnings') or
        decision['status']not in ('NEEDS_REPAIR','FILE_REVIEW_PASSED_SCENE_PENDING') or not decision.get('reason') or
        decision['processingKeySha256']!=hashlib.sha256(json.dumps(row['key'],sort_keys=True).encode()).hexdigest() or
        decision['outputs']!=row['outputs'] or job['kind']!='region' or job['outputSize']!=[width,height] or
        job['sourceContext']['preparation']!=recipe['preparationReceipt'] or job['sourceContext']['input']!=region['wholeImage'] or
        job['sourceContext']['targetFitsHeader']!=p['targetFitsHeader'] or job['sourceContext']['source']!=p['source'] or
        'restoration'in job):
        raise ValueError('prepared_derived_region_current_work_or_review_invalid')
    parameters=row['key']['tools'][-1]
    if (parameters.get('mlVersion')!=11 or parameters.get('overlap')!=.2 or parameters.get('inputUpsample',1)!=1):
        raise ValueError('prepared_derived_region_model_recipe_invalid')
    validate_job(job,root=root,factor=1)
    for dependency in job['dependencies']:
        bindings.append(bound_file(root/dependency['path'],root=root,expected=dependency))
    for binding in row['outputs'].values():
        bindings.append(bound_file(root/binding['path'],root=root,expected=binding))
    checked_work_image(root/job['input']['path'],job['input'],[width,height],root=root)
    _,_,pixel_bindings=validate_sxt_display_pixels(job,row['outputs'],'sxt',profile,root=root)
    bindings.extend(pixel_bindings)
    if 'coverage'in job:
        if job['coverage']['originalRgba']!=region['wholeImage'] or job['coverage']['suppliedMask']!=region['suppliedMask']:
            raise ValueError('prepared_derived_region_coverage_input_join_invalid')
        validate_covered_output(job,row['outputs'],root)
        finest_binding=row['outputs']['coveredStarless']
    else:
        with Image.open(io.BytesIO(read(job['input']))) as image:
            image.load()
            if not np.all(alpha==255) or not np.array_equal(np.asarray(image),original[:,:,:3]) or image.info.get('icc_profile')!=profile:
                raise ValueError('prepared_derived_region_complete_model_source_changed')
        finest_binding=row['outputs']['starless']
    finest=read(finest_binding)
    with Image.open(io.BytesIO(finest)) as image:
        image.load();display=image.convert('RGBA')
        if image.format!='PNG' or image.size!=(width,height) or image.info.get('icc_profile')!=profile or not np.array_equal(np.asarray(display)[:,:,3],alpha):
            raise ValueError('prepared_derived_region_modified_master_colour_or_alpha_changed')
    # Existing native provenance: exact source receipts/rights and actually used
    # tile bytes, including qualified mirror recovery. No new source acquisition.
    parent_inputs=p['source']['inputs']
    if recipe['originalManifest']not in parent_inputs or recipe['originalRights']not in parent_inputs or recipe['sourceReadback']not in parent_inputs:
        raise ValueError('prepared_derived_region_parent_provenance_missing')
    original_manifest_raw=read(recipe['originalManifest']);original_manifest=json.loads(original_manifest_raw)
    original_rights_raw=read(recipe['originalRights']);rights=json.loads(original_rights_raw)
    native_readback=json.loads(read(recipe['sourceReadback']))
    if (native_readback['manifest']!=recipe['originalManifest'] or native_readback['rights']!=recipe['originalRights'] or
        native_readback['publicationHash']!=recipe['originalManifest']['sha256'] or
        rights['publicationHash']!=native_readback['publicationHash']):
        raise ValueError('prepared_derived_region_native_parent_join_invalid')
    sources=[s for s in original_manifest['sources']if s.get('hipsCreatorDid')=='ivo://'+p['source']['sourceId']]
    if len(sources)!=1:
        raise ValueError('prepared_derived_region_native_source_identity_invalid')
    source=sources[0];notice=next(s for s in rights['sources']if s['sourceId']==source['id'])
    used=[]
    for pixel in p['usedTiles']:
        entries=[t for t in native_readback['tileInputs']if t['order']==p['order']and t['pixel']==pixel]
        declared=[t for t in rights['alterations']['selectedTiles']if t['sourceId']==source['id']and t['order']==p['order']and t['pixel']==pixel]
        if len(entries)!=1 or len(declared)!=1 or identity(entries[0]['raw'])!=identity(declared[0]) or entries[0]['raw']not in p['inputs']:
            raise ValueError('prepared_derived_region_native_tile_provenance_invalid')
        bindings.append(bound_file(root/entries[0]['raw']['path'],root=root,expected=entries[0]['raw']))
        used.append({**identity(entries[0]['raw']),'pixel':pixel})
    for binding in p['inputs']:
        bindings.append(bound_file(root/binding['path'],root=root,expected=binding))
    owners=[Path(__file__),*[Path(__file__).with_name(name)for name in ('hips_rgb_region.py','covered_rgb_display.py','sxt_processing.py','image_quality.py','reviewed_sxt_display.py')],
        root/'packages/miniapp-contracts/src/prepared-derived-region-optical-publication.ts',root/'packages/miniapp-contracts/src/optical-tan-plane.ts']
    before=[bound_file(owner,root=root)for owner in owners]
    generation=output.with_name(output.name+'-generation')
    if generation.exists():
        raise ValueError('prepared_derived_region_generation_already_exists')
    generation.mkdir(parents=True,exist_ok=False)
    field=nominal_width(geometry);levels={};products=[]
    for level,tier_width in zip(('OVERVIEW','MEDIUM','DETAIL'),(max(2,width//4),max(2,width//2),width)):
        if level=='DETAIL':encoded=finest;tier=display
        else:
            tier=display.resize((tier_width,max(2,round(height*tier_width/width))),Image.Resampling.LANCZOS)
            buffer=io.BytesIO();tier.save(buffer,format='PNG',icc_profile=profile);encoded=buffer.getvalue()
        levels[level]={**byte_identity(encoded),'file':recipe['publicationId']+'-'+level.lower()+'.png','format':'png',
            'width':tier.width,'height':tier.height,'fieldDegrees':field,'sourceUvBounds':[0,0,1,1],
            'displayAlpha':'resampled-source-display-alpha','scientificAvailability':'UNKNOWN','decodedRgba':byte_identity(tier.tobytes())}
        products.append(PreparedEncodedLevel(level,encoded))
    producer={'version':VERSION,'inputs':bindings,'nominalTan':geometry,'sourceCounts':counts,'owners':before,
        'processing':recipe['processingReceipt'],'review':recipe['reviewReceipt'],'modifiedMaster':finest_binding,
        'sourceAlphaByteDifferences':0,'levels':levels,'sourceRasterCalls':0,'nativeInferenceCalls':0,'newCoarseEncodes':2,
        'finestReencoded':False,'scope':'DEVELOPMENT_REVIEW_ONLY; source astrometry/science/Scene/quality not adopted'}
    producer_path=generation/'producer-receipt.json'
    producer_path.write_text(json.dumps(producer,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    producer_binding=bound_file(producer_path,root=root);bindings.append(producer_binding)
    support={}
    for key,raw,mode in (('originalRegion',original_raw,'RGBA'),('suppliedMask',supplied_raw,'L')):
        support[key]={**byte_identity(raw),'file':recipe['publicationId']+('-original-region.png'if key=='originalRegion'else'-supplied-mask.png'),
            'format':'png','width':width,'height':height,'mode':mode,
            'meaning':'Original observed display RGBA before processing, including native source alpha; not science validity.'if key=='originalRegion'else
                'Independent original tile supply, 0 absent / 255 supplied; not original transparency or science validity.'}
    payload={'schemaVersion':'prepared-derived-region-optical-publication-v1','imageVersion':'prepared-derived-region-optical-v1',
        'publicationId':recipe['publicationId'],'reference':recipe['reference'],
        'subject':{'kind':'region','reference':recipe['reference'],'label':recipe['label']},'scope':'DEVELOPMENT_REVIEW_ONLY','ordinaryAdoption':False,
        'nominalTan':geometry,'source':{'resourceId':p['source']['sourceId'],'hipsSourceId':source['id'],
            'sourceUrl':source['originalDataUrl'],'metadataReferenceUrl':source['hipsRecordUrl'],
            'credit':notice['originalContent']['copyright'],'license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/',
            'policyUrl':source['originalRightsUrl'],'colourMeaning':p['colourMeaning'],
            'originalHipsManifest':text_identity(original_manifest_raw),'originalHipsRights':text_identity(original_rights_raw),
            'order':p['order'],'usedTiles':used,'preparationReceipt':identity(recipe['preparationReceipt']),
            'iccProfile':byte_identity(profile),'originalAlpha':byte_identity(alpha.tobytes()),'counts':counts},
        'processing':{'producerVersion':VERSION,'runtimeNetwork':'forbidden','colourUnit':'sxt-starless-display-estimate',
            'sourceResolution':'UNKNOWN','scientificAvailability':'UNKNOWN','coordinateProvenance':'derived-native-cell-ICRS-TAN-grid',
            'resampling':'whole-region-LANCZOS','alphaMeaning':'finest-original-source-alpha; coarser-whole-region-LANCZOS',
            'modelPadding':'not-observed-black-or-new-coverage','sampling':'nearest-native-HEALPix-cell',
            'modification':'Original finite HiPS cells projected once into a continuous nominal TAN work region; AI-based SXT ML11/default overlap0.2 star separation processed the whole RGB model canvas; display retains source alpha; two whole-region LANCZOS tiers added. No source coverage/science/detail fabricated.',
            'producerReceipt':identity(producer_binding),'processingReceipt':identity(recipe['processingReceipt']),
            'reviewReceipt':identity(recipe['reviewReceipt']),'method':'sxt','modelVersion':11,'overlap':.2,'inputUpsample':1,
            'workingImage':identity(job['input']),'modifiedMaster':byte_identity(finest),
            'fileReview':'PASSED'if decision['status']=='FILE_REVIEW_PASSED_SCENE_PENDING'else'NEEDS_REPAIR',
            'reviewReason':decision['reason'],'sceneAcceptance':'MISSING'},
        'alterations':{'schemaVersion':'starward-derived-region-alterations-v1','pixelBytes':'MODIFIED','databaseLicense':'ODbL-1.0',
            'offerChoice':'ODbL-1.0 4.6(b)','contentLicense':'CC BY 4.0',
            'notice':f"Contains information from {notice['database']['title']}, made available under the Open Database License: https://opendatacommons.org/licenses/odbl/1-0/ . Original content permission and full notices are retained separately. This finite derived display data publication offers its complete alterations and added contents, not the entire mother HiPS.",
            'availability':'complete-modified-master-and-support-in-this-publication',
            'reproductionMethod':['Read the exact original HiPS manifest/rights, selected native tile identities and declared ICRS/TAN work-plane geometry from this manifest.',
                'The original-region PNG contains the complete pre-processing RGBA work region; the supplied-mask PNG distinguishes tile absence from original alpha.',
                'The DETAIL PNG is the complete modified display master and added pixel contents; coarse PNGs are its whole-region LANCZOS levels. Read these files directly; no proprietary model, executable, remote processing or private source path is required.',
                'This derivative contains only the declared region and listed files; it does not claim unselected mother-database entries, science validity, astrometric calibration or ordinary quality adoption.']},
        'support':support,'levels':levels}
    for binding in bindings:
        bound_file(root/binding['path'],root=root,expected=binding)
    if [bound_file(owner,root=root)for owner in owners]!=before:
        raise ValueError('prepared_derived_region_owner_changed_during_generation')
    receipt=publish_prepared_candidate(payload,tuple(products),tuple(bindings),generation,output,root=root,
        additional_owners=tuple(owners),support_products={'originalRegion':original_raw,'suppliedMask':supplied_raw})
    return {'publicationHash':receipt['publicationHash'],'output':str(output),'files':receipt['files'],
            'writerReceipt':bound_file(output/'writer-receipt.json',root=root),'nativeInferenceCalls':0,
            'sourceRasterCalls':0,'coarseEncodes':2,'finestReencoded':False,'fileReview':payload['processing']['fileReview']}


def publish_derived_region_batch(manifest_path,pin,directory,*,root):
    root,directory=root.resolve(),directory.resolve()
    manifest,binding=pinned_json(manifest_path,pin,root=root)
    if not isinstance(manifest,dict):
        raise ValueError('prepared_derived_region_batch_identity_budget_or_output_invalid')
    recipes=manifest.get('recipes',[]);limit=manifest.get('maxBatchWorkingPixels')
    if (manifest.get('schemaVersion')!='prepared-derived-region-batch-v1' or not isinstance(recipes,list) or not recipes or
        type(limit)is not int or limit<=0 or not all(recipe_identity_valid(r)for r in recipes) or
        sum(r['maxWorkingPixels']for r in recipes)>limit or
        len({r.get('reference')for r in recipes})!=len(recipes) or len({r.get('publicationId')for r in recipes})!=len(recipes) or
        directory.exists() or not directory.is_relative_to(root/'output')):
        raise ValueError('prepared_derived_region_batch_identity_budget_or_output_invalid')
    directory.mkdir(parents=True,exist_ok=False);rows=[]
    for recipe in recipes:
        row={'reference':recipe['reference'],'status':'FAILED'};rows.append(row)
        try:
            result=publish_derived_region_recipe(recipe,binding,directory/recipe['publicationId'],root=root)
            row.update(status='LOCAL_REVIEW_CANDIDATE_PACKAGED',result=result)
        except (ValueError,RuntimeError,OSError,KeyError) as error:
            row['error']=str(error)
    bound_file(manifest_path,root=root,expected=binding)
    result={'schemaVersion':'prepared-derived-region-batch-result-v1','manifest':binding,'rows':rows,
            'scope':'DEVELOPMENT_REVIEW_ONLY','ordinaryAdoption':False,'sourceRasterCalls':0,'nativeInferenceCalls':0,
            'coarseEncodes':sum(r.get('result',{}).get('coarseEncodes',0)for r in rows),'failed':sum(r['status']=='FAILED'for r in rows),
            'independentReview':'MISSING','sceneAcceptance':'MISSING','owner':bound_file(Path(__file__),root=root)}
    (directory/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest',type=Path,required=True);parser.add_argument('--pin',required=True);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();root=Path(__file__).resolve().parents[2]
    result=publish_derived_region_batch(args.manifest,args.pin,args.output,root=root)
    print(json.dumps({'rows':len(result['rows']),'failed':result['failed'],'nativeInferenceCalls':0,'sourceRasterCalls':0,'coarseEncodes':result['coarseEncodes']},ensure_ascii=True))
