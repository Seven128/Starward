"""Read existing NXT grain trials into the shared image review/exception queue.

No native invocation, encoding or publication. A distinct review schema keeps
the denoised chain outside SXT-only and original-restored publication contracts.
"""
import copy
import io
import json
from pathlib import Path
import numpy as np
from PIL import Image
from optical_publication_io import bound_bytes,bound_file
from sxt_processing import validate_job,checked_work_image
from covered_rgb_display import validate_covered_output,covered_pixels
from reviewed_sxt_display import validate_sxt_display_pixels

VERSION='nxt-grain-trial-review-v1'
METHOD='sxt+nxt-display-estimate'


def _read(binding,root,bindings):
    raw,current=bound_bytes(root/binding['path'],root=root,expected=binding,max_bytes=binding['bytes'])
    bindings.append(current)
    return raw


def _image(binding,root,bindings):
    raw=_read(binding,root,bindings)
    with Image.open(io.BytesIO(raw))as image:
        image.load()
        if image.format!='PNG' or image.getexif().get(274,1)!=1:
            raise ValueError('nxt_review_png_orientation_invalid')
        return image.copy()


def validate_trial_row(processing,trial,*,root):
    """Check the whole upstream/input/vendor/final/coverage chain by real pixels."""
    if (processing.get('status')!='NATIVE_NXT_GRAIN_TRIAL_PIXELS_VERIFIED_VISUAL_PENDING' or
        processing.get('ordinaryAdoption')is not False or processing.get('publicationCalls')!=0 or
        processing.get('sxtCalls')!=0 or processing.get('psCalls')!=0):
        raise ValueError('nxt_review_trial_scope_invalid')
    bindings=[]
    admission=json.loads(_read(processing['admission'],root,bindings))
    config=json.loads(_read(admission['config'],root,bindings))
    recipe=trial['recipe']
    if (config.get('purpose')!='DIAGNOSTIC_GRAIN_EXCEPTION_NOT_PUBLISHER' or
        recipe!=config.get('recipe') or recipe!={'denoise':0.9,'iterations':1,'mlVersion':3.1,
                                               'overlap':0.2,'depth':'8U','device':'gpu'}):
        raise ValueError('nxt_review_recipe_invalid')
    colour=json.loads(_read(admission['colorBoundary'],root,bindings))
    if colour.get('status')!='PASS_BOUNDED_SRGB_METADATA_NUMERIC_PAIR' or colour.get('iccLabelPairChannelDifferences')!=0:
        raise ValueError('nxt_review_colour_boundary_unverified')
    colour_admission=json.loads(_read(colour['admission'],root,bindings))
    if colour_admission['runtime']!=admission['runtime']:
        raise ValueError('nxt_review_colour_runtime_changed')
    selected=[r for r in config['jobs']if r['id']==trial['id']]
    if len(selected)!=1 or selected[0]['receipt']!=trial['upstreamReceipt']:
        raise ValueError('nxt_review_upstream_identity_invalid')
    upstream=json.loads(_read(trial['upstreamReceipt'],root,bindings))
    selected=[r for r in upstream['rows']if r['id']==trial['id']]
    if upstream.get('schema')!='sxt-processing-v1' or len(selected)!=1:
        raise ValueError('nxt_review_upstream_schema_or_selection_invalid')
    row=selected[0];job=row['key']['job']
    if (row.get('status')!='PROCESSED_PENDING_REVIEW' or row['key']['method']!='sxt' or
        trial['upstreamSxt']!=row['outputs'] or trial['coverage']!=job.get('coverage')):
        raise ValueError('nxt_review_upstream_row_changed')
    validate_job(job,root=root,factor=1)
    original=_image(job['input'],root,bindings)
    _,_,pixel_bindings=validate_sxt_display_pixels(job,row['outputs'],'sxt',original.info['icc_profile'],root=root)
    bindings.extend(pixel_bindings)
    validate_covered_output(job,row['outputs'],root)
    base=_image(row['outputs']['coveredStarless'],root,bindings)
    staged=[b for b in admission['inputs']if Path(b['path']).name==trial['id']+'.png']
    if len(staged)!=1:
        raise ValueError('nxt_review_staged_input_identity_invalid')
    model_input=_image(staged[0],root,bindings)
    rgba=np.asarray(base)
    if (model_input.mode!='RGB' or model_input.size!=base.size or
        model_input.info.get('icc_profile')!=base.info.get('icc_profile') or
        not np.array_equal(np.asarray(model_input),rgba[:,:,:3])):
        raise ValueError('nxt_review_staged_rgb_or_icc_changed')
    runtime=admission['runtime']
    if (not runtime or Path(runtime[0]['path']).name.lower()!='rc-astro.exe' or
        not any(Path(b['path']).name=='NoiseXTerminator.3.1.onnx'for b in runtime)):
        raise ValueError('nxt_review_runtime_identity_missing')
    expected_sources={'sxt_processing.py','covered_rgb_display.py','optical_publication_io.py'}
    executed=admission.get('executionSources',[])
    if {Path(b['path']).name for b in executed}!=expected_sources or len(executed)!=3:
        raise ValueError('nxt_review_execution_sources_missing')
    snapshot=(root/processing['admission']['path']).parent/'execution-sources'
    for binding in executed:
        retained={**binding,'path':(snapshot/Path(binding['path']).name).relative_to(root).as_posix()}
        _read(retained,root,bindings)
    expected_command=[runtime[0]['path'],'--json','nxt',
        *[str(root/b['path'])for b in admission['inputs']],
        '--output',str((root/trial['vendor']['path']).parent),
        '--device','gpu','--ml-version','3.1','--denoise','0.9','--iterations','1','--depth','8U','--overlap','0.2']
    # Frozen commands may contain absolute paths; compare path separators only.
    if [str(s).replace('\\','/')for s in admission['command']]!=[str(s).replace('\\','/')for s in expected_command]:
        raise ValueError('nxt_review_command_or_output_join_invalid')
    final=trial['outputs']['starless'];vendor=_image(trial['vendor'],root,bindings)
    checked_work_image(root/final['path'],final,job['outputSize'],root=root)
    after=_image(final,root,bindings)
    if (vendor.mode!='RGB' or vendor.size!=base.size or
        vendor.info.get('icc_profile')not in(None,original.info.get('icc_profile')) or after.tobytes()!=vendor.tobytes() or
        after.info.get('icc_profile')!=original.info.get('icc_profile')):
        raise ValueError('nxt_review_vendor_pixels_or_icc_changed')
    validate_covered_output(job,trial['outputs'],root)
    _,_,proof=covered_pixels(job,final,root)
    if trial.get('coverageProof')!=proof:
        raise ValueError('nxt_review_coverage_proof_changed')
    for binding in bindings:bound_file(root/binding['path'],root=root,expected=binding)
    return row,admission,proof,tuple(bindings)


def review_processing(processing,processing_binding,*,root):
    """Adapt existing rows; per-row failures survive without discarding peers."""
    trials=processing.get('rows')
    if (not trials or not isinstance(trials,list) or
        len({r['id']for r in trials})!=len(trials)):
        raise ValueError('nxt_review_trial_rows_invalid')
    if processing.get('nativeNxtBatchCalls')!=1 or processing.get('processedFiles')!=len(trials):
        raise ValueError('nxt_review_invocation_census_invalid')
    rows=[]
    for trial in trials:
        fallback={'job':{'id':trial['id']},'method':METHOD,'trial':processing_binding}
        result={'id':trial['id'],'key':fallback,'status':'FAILED','outputs':{},'error':'nxt_review_incomplete'}
        rows.append(result)
        try:
            previous,admission,coverage_proof,bindings=validate_trial_row(processing,trial,root=root)
            job=copy.deepcopy(previous['key']['job'])
            job['denoising']={'schemaVersion':VERSION,'trialReceipt':processing_binding,'id':trial['id']}
            for binding in [processing_binding,processing['admission'],*bindings]:
                if binding not in job['dependencies']:job['dependencies'].append(binding)
            layers={**trial['outputs'],'vendorStarless':trial['vendor'],'vendorStars':previous['outputs']['vendorStars']}
            result.update(status='PROCESSED_PENDING_REVIEW',outputs=layers,
                key={'job':job,'method':METHOD,'tools':admission['runtime'],'recipe':trial['recipe'],
                     'trialReceipt':processing_binding,'origin':'IMPORTED_IMMUTABLE_NXT_TRIAL'},coverageProof=coverage_proof,
                denoisingProof={'schemaVersion':VERSION,'upstreamReceipt':trial['upstreamReceipt'],
                    'recipe':trial['recipe'],'modelInput':next(b for b in admission['inputs']if Path(b['path']).name==trial['id']+'.png'),
                    'alphaChannelDifferences':0,'scientificAvailability':'UNKNOWN'},
                publicationContract='MISSING_DISTINCT_NXT_CHAIN')
            result.pop('error',None)
        except(ValueError,RuntimeError,OSError,KeyError,TypeError)as error:
            result['error']=str(error)
    return {'schema':'nxt-processing-v1','rows':rows,'ordinaryAdoption':False,'nativeInferenceCalls':0,
            'importValidator':bound_file(Path(__file__),root=root)}


def validate_review_row(job,outputs,*,root):
    binding=job['denoising']['trialReceipt'];raw,_=bound_bytes(root/binding['path'],root=root,expected=binding,max_bytes=binding['bytes'])
    processing=json.loads(raw)
    rows=review_processing(processing,binding,root=root)['rows']
    selected=[r for r in rows if r['id']==job['denoising']['id']]
    if (len(selected)!=1 or selected[0]['status']!='PROCESSED_PENDING_REVIEW' or
        selected[0]['key']['job']!=job or selected[0]['outputs']!=outputs):
        raise ValueError('nxt_review_current_chain_changed')
    return selected[0]['denoisingProof']
