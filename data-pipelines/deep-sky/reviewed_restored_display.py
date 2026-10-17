"""Exact SXT + original-structure restoration admission; no PS/model execution.

Both review epochs remain explicit. The SXT baseline needed repair; only the
bound PS result has passed file review. Neither establishes Scene acceptance.
"""
import io
from PIL import Image
from optical_publication_io import bound_bytes,bound_file
from reviewed_sxt_display import reviewed_processing_row,admit_reviewed_sxt
from photoshop_original_restore import VERSION,validate_restoration_output
from sxt_processing import validate_job

def content(binding):return {k:binding[k]for k in ('bytes','sha256')}


def file_reviewed_processed_display(spec, *, root):
    """One file-qualified complete SXT/PS parent for later display stages."""
    from reviewed_sxt_display import validate_sxt_display_pixels
    row, bindings = reviewed_processing_row(spec, 'FILE_REVIEW_PASSED_SCENE_PENDING', root=root)
    job = row['key']['job']
    validate_job(job, root=root, factor=2 if row['key']['method'] == 'sxt-upsample' else 1)
    if 'coverage' in job:
        raise ValueError('processed_display_parent_must_be_complete_rgb')
    retained = list(bindings)
    retained.extend(bound_file(root / b['path'], root=root, expected=b)
        for b in [job['input'], *job['dependencies'], *row['outputs'].values()])
    if 'restoration' in job:
        if validate_restoration_output(job, row['outputs'], root) != row.get('restorationProof'):
            raise ValueError('processed_display_parent_restoration_changed')
    else:
        with Image.open(root / job['input']['path']) as image:
            image.load(); profile = image.info['icc_profile']
        _, _, checked = validate_sxt_display_pixels(job, row['outputs'], row['key']['method'], profile, root=root)
        retained.extend(checked)
    return row, tuple(retained)


def reviewed_processed_display(spec, original_binding, *, root):
    row, bindings = file_reviewed_processed_display(spec, root=root)
    from reviewed_sxt_display import reviewed_sxt_row
    verifier = reviewed_restored_row if 'restoration' in row['key']['job'] else reviewed_sxt_row
    _, checked = verifier(spec, original_binding, root=root)
    return row, bindings + tuple(checked)


def admit_processed_display(spec, original_binding, original_image, *, root):
    row, _ = file_reviewed_processed_display(spec, root=root)
    if 'restoration' in row['key']['job']:
        return admit_reviewed_restored(spec, original_binding, original_image, root=root)
    image, raw, separation, bindings = admit_reviewed_sxt(spec, original_binding, original_image, root=root)
    return image, raw, separation, None, bindings

def reviewed_restored_row(spec, original_binding, *, root):
    row,bindings=reviewed_processing_row(spec,'FILE_REVIEW_PASSED_SCENE_PENDING',root=root)
    job=row['key']['job'];restoration=job.get('restoration')
    if (row['key']['method']!='sxt+ps-local-original-restoration' or not restoration or
        restoration.get('schemaVersion')!=VERSION or 'coverage'in job or
        job['sourceContext'].get('input')!=original_binding or original_binding not in job['dependencies']):
        raise ValueError('prepared_restored_original_or_recipe_invalid')
    validate_job(job,root=root,factor=1)
    bindings=list(bindings)+[bound_file(root/b['path'],root=root,expected=b)for b in job['dependencies']]
    bindings.extend(bound_file(root/b['path'],root=root,expected=b)for b in row['outputs'].values())
    if validate_restoration_output(job,row['outputs'],root)!=row['restorationProof']:
        raise ValueError('prepared_restored_pixel_proof_changed')
    return row,tuple(bindings)

def admit_reviewed_restored(spec, original_binding, original_image, *, root):
    row,bindings=reviewed_restored_row(spec,original_binding,root=root)
    bindings=list(bindings);job=row['key']['job'];restore=job['restoration'];outputs=row['outputs']
    parent={'id':spec['id'],'processingReceipt':restore['originalProcessing'],'reviewReceipt':restore['originalReview']}
    base,_,separation,parent_bindings=admit_reviewed_sxt(parent,original_binding,original_image,root=root,required_status='NEEDS_REPAIR')
    bindings.extend(parent_bindings)
    # The restored input must be the exact same normalized original used by SXT,
    # and its base must be that reviewed baseline, not another processed image.
    if (content(restore['base'])!=content(separation['starless']) or
        content(job['input'])!=content(separation['workingImage']) or
        list(base.size)!=job['outputSize']):
        raise ValueError('prepared_restored_baseline_or_working_join_invalid')
    proof=row['restorationProof']
    raw,binding=bound_bytes(root/outputs['starless']['path'],root=root,expected=outputs['starless'],max_bytes=outputs['starless']['bytes'])
    bindings.append(binding)
    with Image.open(io.BytesIO(raw))as image:
        image.load();rgb=image.copy()
    restored={
        'method':VERSION,'processingReceipt':content(spec['processingReceipt']),'reviewReceipt':content(spec['reviewReceipt']),
        'nativeReport':content(restore['nativeReport']),'mask':content(restore['mask']),
        'editablePsd':content(outputs['editablePsd']),
        'restored':content(outputs['starless'])|{'width':rgb.width,'height':rgb.height},
        'pixels':{k:proof[k]for k in ('corePixels','exteriorPixels','coreChannelDifferences','exteriorChannelDifferences','featherMaximumVsEncodedNormalBlend','changedPixels')},
        'fileReview':'PASSED','sceneAcceptance':'MISSING'}
    for binding in bindings:bound_file(root/binding['path'],root=root,expected=binding)
    return rgb,raw,separation,restored,tuple(bindings)
