"""Offline, opt-in science optical packaging from an admitted cached gri master.

This owner never downloads, reads/reprojects FITS, changes science samples, fits
individual crops, or adopts source/color quality. Publication validation and
canonical identity belong to the shared TypeScript contract, not Python JSON.
"""
from __future__ import annotations

from dataclasses import dataclass, replace
import copy
import argparse
import io
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image

import sdss_gri_tan as gri
from image_quality import digest
from sdss_corrected_frame import MODEL_URL, IMAGES_URL


@dataclass
class VerifiedCandidate:
    candidate: dict
    candidate_directory: Path
    master: gri.GriMaster
    transfer: dict
    sources: list[dict]
    bindings: list[dict]
    levels: dict[str, tuple[bytes, dict]]
    reference_rgb_identity: dict | None = None
    frozen_display_validation: dict | None = None


def bound_file(path: Path, *, root: Path, expected: dict | None = None) -> dict:
    absolute = path.resolve()
    try:
        relative = absolute.relative_to(root.resolve()).as_posix()
    except ValueError as error:
        raise RuntimeError('sdss_science_input_outside_root') from error
    raw = absolute.read_bytes()
    binding = {'path': relative, 'bytes': len(raw), 'sha256': digest(raw)}
    if expected is not None and (binding['bytes'], binding['sha256']) != (expected['bytes'], expected['sha256']):
        raise RuntimeError('sdss_science_input_bytes_changed:' + relative)
    return binding


def candidate_file(directory: Path, name: str) -> Path:
    if not isinstance(name, str) or not name or Path(name).is_absolute():
        raise RuntimeError('sdss_science_candidate_path_invalid')
    value = (directory / name).resolve()
    if not value.is_relative_to(directory.resolve()) or value == directory.resolve():
        raise RuntimeError('sdss_science_candidate_path_invalid')
    return value


def verify_cached_candidate(directory: Path, *, root: Path,
                            candidate_sha256: str, binding_sha256: str) -> VerifiedCandidate:
    """Bind existing evidence and verify its current display/box derivation.

    This checks the admitted upstream receipt chain without redoing scientific
    acquisition/coaddition. Caller-supplied immutable report pins cannot be
    replaced by a newly self-consistent report invented beside changed arrays.
    """
    directory = directory.resolve()
    paths = [directory / 'candidate.json', directory / 'binding.json']
    bindings = [bound_file(p, root=root) for p in paths]
    if [v['sha256'] for v in bindings] != [candidate_sha256, binding_sha256]:
        raise RuntimeError('sdss_science_cached_evidence_identity_changed')
    candidate, evidence = [json.loads(p.read_text(encoding='utf8')) for p in paths]
    if (candidate.get('pyramidKind', 'encoded-rgb-box') != 'encoded-rgb-box' or
            'pyramidRecipe' in candidate or candidate.get('version') == gri.SCIENCE_PYRAMID_VERSION):
        raise RuntimeError('sdss_science_cached_pyramid_kind_unsupported')
    if candidate.get('version') not in [gri.VERSION, gri.MOSAIC_VERSION]:
        raise RuntimeError('sdss_science_candidate_version_unsupported')
    if candidate.get('orientation') != 'north-up/east-left':
        raise RuntimeError('sdss_science_candidate_orientation_invalid')
    # The original single-field producer bound its nested admission receipts in
    # candidate.json and used `outputs`; the later mosaic producer also stored
    # a separate receipt list. Admit the frozen producer format explicitly,
    # rather than rewriting historical evidence beside unchanged arrays.
    single_evidence = (candidate['version'] == gri.VERSION and evidence.get('version') == gri.VERSION
                       and 'outputs' in evidence and 'candidateOutputs' not in evidence
                       and 'sourceFrameReceipts' not in evidence)
    expected_outputs = {v['path']: v for v in evidence['outputs' if single_evidence else 'candidateOutputs']}
    for p in paths[:1]:
        binding = bound_file(p, root=root)
        if binding['path'] not in expected_outputs:
            raise RuntimeError('sdss_science_cached_report_unbound')
        bound_file(p, root=root, expected=expected_outputs[binding['path']])
    admitted_inputs = {v['path']:v for v in evidence['inputs']}
    admitted_current = {name:bound_file(root/name,root=root,expected=value) for name,value in admitted_inputs.items()}
    bindings.extend(admitted_current.values())
    arrays = {}
    for name in [f'{band}-{suffix}' for band in gri.BANDS for suffix in ['science', 'footprint', 'finite-neighbors']] + ['joint-availability', 'rgb-master']:
        metadata = candidate['arrays'][name]
        if metadata.get('format') != 'npy' or metadata.get('pickle') is not False:
            raise RuntimeError('sdss_science_array_format_invalid')
        p = candidate_file(directory, metadata['file'])
        bindings.append(bound_file(p, root=root, expected=metadata))
        value = np.load(p, mmap_mode='r', allow_pickle=False)
        if list(value.shape) != metadata['shape'] or value.dtype.str != metadata['dtype']:
            raise RuntimeError('sdss_science_array_shape_or_dtype_changed')
        arrays[name] = value
    n = candidate['pixels']; joint = arrays['joint-availability']; rgb = arrays['rgb-master']
    if joint.shape != (n,n) or joint.dtype != np.bool_ or rgb.shape != (n,n,3) or rgb.dtype != np.uint8:
        raise RuntimeError('sdss_science_master_shape_invalid')
    coherent = np.ones(joint.shape,dtype=np.bool_)
    bands = {}
    for band in gri.BANDS:
        data, footprint, finite = [arrays[f'{band}-{suffix}'] for suffix in ['science', 'footprint', 'finite-neighbors']]
        if data.shape != joint.shape or data.dtype != np.dtype('<f4') or footprint.shape != joint.shape or finite.shape != joint.shape or footprint.dtype != np.bool_ or finite.dtype != np.bool_:
            raise RuntimeError('sdss_science_band_shape_invalid')
        if not np.isfinite(data[joint]).all():
            raise RuntimeError('sdss_science_joint_nonfinite')
        coherent &= footprint & finite
        bands[band] = gri.ProjectedBand(data,footprint,finite,candidate['science']['perBand'][band])
    if not np.array_equal(joint,coherent):
        raise RuntimeError('sdss_science_joint_availability_mismatch')
    if single_evidence:
        source_receipts = [candidate['science']['perBand'][band]['sourceReceipt'] for band in gri.BANDS]
        # In this producer format inputs[0] is the acquisition receipt. It is
        # already byte-verified above; bind identity, URL and source bytes too.
        acquisition = json.loads((root / evidence['inputs'][0]['path']).read_text(encoding='utf8'))
        acquired = acquisition.get('sourceFiles', [])
        if acquisition.get('objectRef') != candidate['objectRef'] or len(acquired) != len(gri.BANDS):
            raise RuntimeError('sdss_science_single_acquisition_mismatch')
        for receipt in source_receipts:
            matches = [v for v in acquired if v.get('identity') == receipt['identity']]
            source = receipt['source']
            if len(matches) != 1 or any(matches[0].get(key) != source[key] for key in ('bytes','sha256')) or matches[0].get('url') != source['sourceUrl']:
                raise RuntimeError('sdss_science_single_acquisition_mismatch')
    else:
        source_receipts = evidence['sourceFrameReceipts']
    receipts = {tuple(v['identity'][key] for key in ['rerun','run','camcol','field','band']):v for v in source_receipts}
    if len(receipts) != len(source_receipts) or not receipts:
        raise RuntimeError('sdss_science_source_receipts_invalid')
    nested = []
    for band in gri.BANDS:
        report = candidate['science']['perBand'][band]
        nested.extend(report['sourceReceipts'] if 'sourceReceipts' in report else [report['sourceReceipt']])
    if len(nested) != len(receipts) or any(receipts.get(tuple(v['identity'][key] for key in ['rerun','run','camcol','field','band'])) != v for v in nested):
        raise RuntimeError('sdss_science_source_receipts_mismatch')
    if candidate['version'] == gri.MOSAIC_VERSION:
        field_receipts = [v['sourceReceipt'] for field in candidate['mosaic']['fields'] for v in field['perBand'].values()]
        if len(field_receipts) != len(receipts) or any(receipts.get(tuple(v['identity'][key] for key in ['rerun','run','camcol','field','band'])) != v for v in field_receipts):
            raise RuntimeError('sdss_science_mosaic_receipts_mismatch')
    sources = []
    for receipt in source_receipts:
        source = receipt['source']; p = Path(source['path'])
        try:relative=p.resolve().relative_to(root.resolve()).as_posix()
        except ValueError as error:raise RuntimeError('sdss_science_input_outside_root') from error
        current = admitted_current.get(relative)
        if current is None or (current['bytes'],current['sha256'])!=(source['bytes'],source['sha256']):
            raise RuntimeError('sdss_science_source_input_unbound')
        sources.append(receipt)
    declared = candidate['display']['transfer']
    if declared.get('method') != 'Astropy make_lupton_rgb' or declared.get('rgbBands') != ['i','r','g'] or declared.get('intervalMinimum') != 0:
        raise RuntimeError('sdss_science_transfer_unsupported')
    if declared.get('kind','fixed') != 'fixed':
        raise RuntimeError('sdss_science_cached_transfer_kind_unsupported')
    verified_rgb,transfer = gri.make_rgb_display(bands,joint,transfer=gri.FixedDisplayTransfer(stretch=declared['stretch'],Q=declared['Q']))
    if declared.get('version') != transfer['version'] or not np.array_equal(rgb,verified_rgb):
        raise RuntimeError('sdss_science_rgb_recipe_mismatch')
    target = gri.target_tan(candidate['center'],n,candidate['fieldDegrees'])
    if dict(target.to_header()) != candidate['wcsHeader']:
        raise RuntimeError('sdss_science_master_geometry_mismatch')
    master = gri.GriMaster(target,bands,joint,rgb,{'fieldDegrees':candidate['fieldDegrees'],'display':{'transfer':transfer}})
    entry = {k:candidate[k] for k in ['objectRef','center','orientation']}
    output_pixels = candidate['levels']['DETAIL']['pixels']
    products = gri.pyramid(master,entry,output_pixels=output_pixels)
    for level,(payload,metadata) in products.items():
        original = candidate['levels'][level]
        p = candidate_file(directory,original['file'])
        bindings.append(bound_file(p,root=root,expected=original))
        if metadata['masterCrop']['boxFactor'] != {'OVERVIEW':4,'MEDIUM':2,'DETAIL':1}[level]:
            raise RuntimeError('sdss_science_complete_stencil_box_scope_unsupported')
        if p.read_bytes() != payload:
            raise RuntimeError('sdss_science_availability_png_derivation_mismatch')
        for key in ['pixels','fieldDegrees','wcsHeader','crpixFitsOneBased','masterCrop','scienceCrop','displayAlpha']:
            if original[key] != metadata[key]:
                raise RuntimeError('sdss_science_level_metadata_mismatch:' + key)
        with Image.open(io.BytesIO(payload)) as image:
            image.load()
            if image.mode != 'RGBA' or image.size != (output_pixels,output_pixels):
                raise RuntimeError('sdss_science_availability_png_format_invalid')
    return VerifiedCandidate(candidate,directory,master,transfer,sources,bindings,products)


def reuse_frozen_zscale_reference(verified: VerifiedCandidate, *, root: Path,
                                 rgb_path: Path, rgb_binding: dict, recipe: dict,
                                 evidence_bindings: tuple[dict, ...]) -> VerifiedCandidate:
    """Explicit v3-only reuse of an admitted mother's cached display variant.

    Caller pins the original producer evidence and reference bytes. The shared
    science owner checks actual samples, resolved parameters and complete RGB;
    evidence/file presence alone does not establish a valid whole-master fit.
    Original source/admission/candidate bindings and old v2 products remain.
    """
    if verified.frozen_display_validation is not None or not evidence_bindings:
        raise RuntimeError('sdss_science_frozen_reference_inputs_invalid')
    evidence = [bound_file(root/value['path'],root=root,expected=value) for value in evidence_bindings]
    bound = bound_file(rgb_path,root=root,expected=rgb_binding)
    rgb = np.load(rgb_path,mmap_mode='r',allow_pickle=False)
    transfer = copy.deepcopy(recipe)
    original = verified.master
    master = gri.GriMaster(original.target,original.bands,original.joint_available,rgb,
        {'fieldDegrees':verified.candidate['fieldDegrees'],'display':{'transfer':transfer}})
    validation = gri.verify_frozen_zscale_reference(master)
    return replace(verified, master=master, transfer=transfer,
        bindings=[*verified.bindings,*evidence,bound],
        reference_rgb_identity={key:bound[key] for key in ('bytes','sha256')},
        frozen_display_validation=validation)


def _publication_frames(verified: VerifiedCandidate, output: Path) -> list[dict]:
    candidate=verified.candidate;frames=[]
    receipt_directory=output/'admission-receipts';receipt_directory.mkdir()
    for receipt in verified.sources:
        identity=receipt['identity'];source=receipt['source']
        header=receipt['wcs']['primaryHeaderFitsCards']
        if digest(header.encode('utf8'))!=receipt['wcs']['primaryHeaderSha256']:
            raise RuntimeError('sdss_science_primary_header_receipt_mismatch')
        name='-'.join(str(identity[key]) for key in ['rerun','run','camcol','field','band'])+'.json'
        raw=(json.dumps(receipt,ensure_ascii=False,allow_nan=False,indent=2)+'\n').encode('utf8')
        with candidate_file(receipt_directory,name).open('xb') as f:f.write(raw)
        frames.append({'bytes':source['bytes'],'sha256':source['sha256'],'sourceUrl':source['sourceUrl'],
                       'identity':dict(identity),'primaryHeaderSha256':receipt['wcs']['primaryHeaderSha256'],
                       'admissionReceipt':{'bytes':len(raw),'sha256':digest(raw)}})
    return frames


def publication_payload(verified: VerifiedCandidate, output: Path, *,
                        publication_id: str, legacy_source: dict) -> dict:
    """Save exact receipt bytes and construct the shared contract's input.

    Receipt hashes are ordinary hashes of the actual saved byte files. There
    is deliberately no Python canonical JSON or publication hash algorithm.
    """
    if verified.frozen_display_validation is not None:
        raise RuntimeError('sdss_science_frozen_reference_requires_unmodified_v3')
    candidate=verified.candidate;frames=_publication_frames(verified,output)
    levels={}
    for level,(payload,metadata) in verified.levels.items():
        original=candidate['levels'][level]
        file=candidate['objectRef'].replace(':','-')+'-'+level.lower()+'.png'
        actual=candidate_file(verified.candidate_directory,original['file']).read_bytes()
        if actual!=payload:raise RuntimeError('sdss_science_level_changed_before_copy')
        with candidate_file(output,file).open('xb') as f:f.write(actual)
        levels[level]={'file':file,'format':'png','pixels':metadata['pixels'],'fieldDegrees':metadata['fieldDegrees'],
                       'crpixFitsOneBased':metadata['crpixFitsOneBased'],'sampleAvailability':'joint-area-alpha',
                       'bytes':len(actual),'sha256':digest(actual),
                       'masterRgbSha256':candidate['arrays']['rgb-master']['sha256'],
                       'masterAvailabilitySha256':candidate['arrays']['joint-availability']['sha256'],
                       'masterCrop':{key:metadata['masterCrop'][key] for key in ['boundsXYExclusive','boxFactor']}}
    content=lambda name:{key:candidate['arrays'][name][key] for key in ['bytes','sha256']}
    source=dict(legacy_source)
    source.update({'dataset':'SDSS DR17 calibrated corrected-frame g/r/i imaging, offline coherent same-field TAN coadd',
                   'landingUrl':IMAGES_URL,'processingDocumentationUrl':MODEL_URL})
    return {'schemaVersion':'sdss-dr17-science-optical-publication-v2','imageVersion':'science-optical-v2',
            'publicationId':publication_id,'objectRef':candidate['objectRef'],'center':candidate['center'],
            'orientation':candidate['orientation'],'source':source,
            'processing':{'runtimeNetwork':'forbidden',
              'modification':'Starward uses byte-bound cached SDSS calibrated, sky-subtracted corrected g/r/i frames; the upstream producer applied primary linear TAN display reprojection and common same-field geometric-weight coaddition. One shared whole-master Astropy Lupton RGB transfer precedes centered TAN crops and availability-premultiplied integer box means. PNG alpha is joint source-area availability, independent of display brightness. No second sky subtraction, full asTrans polynomial/DCR, PSF matching, deconvolution, sharpening, synthetic celestial detail or source artifact quality mask was applied. This is historical processed survey imagery, not realtime/naked-eye appearance, flux-conserving photometry, natural-color or source-quality certification.',
              'coverage':f"Only {candidate['objectRef']} at these three exact TAN crops of one coherent master; source sample availability is measured, scientific validity remains UNKNOWN, artifact/PSF/absolute astrometry and adopted display quality remain unverified. No whole-sky optical coverage is claimed."},
            'master':{'pixels':candidate['pixels'],'fieldDegrees':candidate['fieldDegrees'],
                      'astrometry':'source-primary-linear-TAN-approximation','scientificValidity':'UNKNOWN',
                      'unit':'nanomaggies/pixel','sourceFrames':frames,
                      'science':{band:content(band+'-science') for band in gri.BANDS},
                      'jointAvailability':content('joint-availability')|{'availablePixels':int(verified.master.joint_available.sum())},
                      'rgb':content('rgb-master'),
                      'transfer':{'recipe':verified.transfer,'validation':'WHOLE_MASTER_REPRODUCED'}},'levels':levels}


def science_mean_publication_payload(verified: VerifiedCandidate, output: Path, *,
                                    publication_id: str, legacy_source: dict,
                                    display_transfer: gri.FixedDisplayTransfer | None = None) -> dict:
    """New immutable order from a pinned admitted mother, never a v2 replacement.

    The existing cached verifier owns upstream admission. The new shared pyramid
    owns signed means/area/recipe; publication parents bind those original arrays.
    A requested fixed transfer produces a saved reference RGB, not new science.
    """
    candidate=verified.candidate;original=verified.master
    if verified.frozen_display_validation is not None and display_transfer is not None:
        raise RuntimeError('sdss_science_frozen_reference_requires_unmodified_v3')
    if display_transfer is None:
        rgb,recipe=original.rgb,verified.transfer
        rgb_identity=(verified.reference_rgb_identity or
            {key:candidate['arrays']['rgb-master'][key] for key in ('bytes','sha256')})
    else:
        if not isinstance(display_transfer,gri.FixedDisplayTransfer):
            raise RuntimeError('sdss_science_publication_transfer_unsupported')
        rgb,recipe=gri.make_rgb_display(original.bands,original.joint_available,transfer=display_transfer)
        meta=gri._save_array(output/'reference-rgb-master.npy',rgb)
        rgb_identity={key:meta[key] for key in ('bytes','sha256')}
    master=gri.GriMaster(original.target,original.bands,original.joint_available,rgb,
        {'fieldDegrees':candidate['fieldDegrees'],'display':{'transfer':recipe}})
    entry={key:candidate[key] for key in ('objectRef','center','orientation')}
    # Fixed 2048/512 publication geometry, not arbitrary task fixture crop sizes.
    if candidate['pixels']!=2048:
        raise RuntimeError('sdss_science_publication_master_pixels_invalid')
    products=gri.science_mean_pyramid(master,entry)
    frames=_publication_frames(verified,output)
    content=lambda name:{key:candidate['arrays'][name][key] for key in ('bytes','sha256')}
    levels={}
    for level,(payload,metadata) in products.items():
        file=candidate['objectRef'].replace(':','-')+'-'+level.lower()+'.png'
        with candidate_file(output,file).open('xb') as stream:stream.write(payload)
        # Decode saved bytes and rederive with the shared owner again; source
        # bindings are rechecked around the complete packaging transaction.
        actual=candidate_file(output,file).read_bytes()
        if actual!=payload:raise RuntimeError('sdss_science_mean_saved_level_changed')
        with Image.open(io.BytesIO(actual)) as image:
            image.load()
            if image.mode!='RGBA' or image.size!=(512,512):
                raise RuntimeError('sdss_science_mean_saved_level_format_invalid')
        means=metadata['scienceMeans']
        levels[level]={'file':file,'format':'png','pixels':512,'fieldDegrees':metadata['fieldDegrees'],
            'crpixFitsOneBased':metadata['crpixFitsOneBased'],'sampleAvailability':'joint-area-alpha',
            'bytes':len(actual),'sha256':digest(actual),
            'masterScienceSha256':{band:content(band+'-science')['sha256'] for band in gri.BANDS},
            'masterAvailabilitySha256':content('joint-availability')['sha256'],
            'masterCrop':{key:metadata['masterCrop'][key] for key in ('boundsXYExclusive','boxFactor')},
            'scienceMean':{key:means[key] for key in ('unit','availablePixels','emptyPixels','partialPixels','perBand')} |
                {'availableMasterSamples':metadata['scienceCrop']['jointAvailablePixels']}}
    repeated=gri.science_mean_pyramid(master,entry)
    if any(products[level]!=repeated[level] for level in gri.LEVELS):
        raise RuntimeError('sdss_science_mean_level_derivation_changed')
    source=dict(legacy_source)
    source.update({'dataset':'SDSS DR17 calibrated corrected-frame g/r/i imaging, offline coherent same-field TAN coadd',
                   'landingUrl':IMAGES_URL,'processingDocumentationUrl':MODEL_URL})
    return {'schemaVersion':'sdss-dr17-science-optical-publication-v3','imageVersion':'science-optical-v3',
        'publicationId':publication_id,'objectRef':candidate['objectRef'],'center':candidate['center'],
        'orientation':candidate['orientation'],'source':source,
        'processing':{'runtimeNetwork':'forbidden',
            'modification':'Starward uses byte-bound cached SDSS calibrated, already sky-subtracted corrected g/r/i frames and the upstream primary linear TAN coherent same-field coadd. Each centered crop averages signed jointly available scientific samples before the same frozen resolved Astropy Lupton display parameters. Unknown samples are excluded from both sum and divisor. PNG alpha independently rounds coherent sample area; brightness and valid zero/negative means do not infer absence. The RGB master is a display reference, not the parent of these coarse levels. Mean source nanomaggies/native-pixel is not summed coarse-pixel flux or uniform surface brightness. No second sky subtraction, per-crop fit, full asTrans/DCR, PSF matching, sharpening, synthetic celestial detail or artifact quality mask. Historical processed survey imagery, not realtime/naked-eye appearance, natural color, photometry or source-quality certification.',
            'coverage':f"Only {candidate['objectRef']} at these three exact TAN crops of one coherent mother. Sample availability is measured; scientific validity, complete color/PSF/absolute astrometry and adopted display quality remain UNKNOWN or unverified. No whole-sky optical coverage is claimed."},
        'master':{'pixels':2048,'fieldDegrees':candidate['fieldDegrees'],
            'astrometry':'source-primary-linear-TAN-approximation','scientificValidity':'UNKNOWN','unit':'nanomaggies/pixel',
            'sourceFrames':frames,'science':{band:content(band+'-science') for band in gri.BANDS},
            'jointAvailability':content('joint-availability') | {'availablePixels':int(original.joint_available.sum())},
            'rgb':rgb_identity,'transfer':{'recipe':recipe,'validation':'WHOLE_MASTER_REPRODUCED'}},
        'pyramid':{'method':gri.SCIENCE_PYRAMID_KIND,'validation':'SIGNED_LEVELS_REPRODUCED',
            'statisticalFitCalls':0,'scienceCorrection':'NONE','rgbMasterRole':'REFERENCE_ONLY',
            'unknownSamples':'excluded-from-mean-and-divisor',
            'displayAlpha':'rounded-coherent-sample-area-independent-of-brightness'},'levels':levels}


def publish_verified_candidate(verified: VerifiedCandidate, output: Path, *, root: Path,
                               publication_id: str, legacy_manifest: Path,
                               pyramid_kind: str = 'encoded-rgb-box',
                               display_transfer: gri.FixedDisplayTransfer | None = None) -> dict:
    output=output.resolve();root=root.resolve();legacy_manifest=legacy_manifest.resolve()
    if (not output.is_relative_to(root) or output.is_relative_to(verified.candidate_directory) or
            output.is_relative_to(legacy_manifest.parent)):
        raise RuntimeError('sdss_science_output_overlaps_preserved_input')
    if pyramid_kind not in ('encoded-rgb-box',gri.SCIENCE_PYRAMID_KIND) or (pyramid_kind=='encoded-rgb-box' and display_transfer is not None):
        raise RuntimeError('sdss_science_publication_pyramid_kind_invalid')
    if verified.frozen_display_validation is not None and (pyramid_kind!=gri.SCIENCE_PYRAMID_KIND or display_transfer is not None):
        raise RuntimeError('sdss_science_frozen_reference_requires_unmodified_v3')
    # Exclusive generation: no partial failure or prior publication is replaced.
    output.mkdir(parents=True,exist_ok=False)
    command=['node',str(root/'tools/run-node.cjs'),'--import','tsx',str(root/'data-pipelines/deep-sky/pack_sdss_science_publication.mts')]
    try:
        legacy_binding=bound_file(legacy_manifest,root=root)
        legacy=json.loads(legacy_manifest.read_text(encoding='utf8'))
        if legacy['objectRef']!=verified.candidate['objectRef']:
            raise RuntimeError('sdss_science_legacy_source_reference_mismatch')
        sources=[Path(__file__),root/'data-pipelines/deep-sky/sdss_gri_tan.py',
                 root/'data-pipelines/deep-sky/image_quality.py',root/'data-pipelines/deep-sky/sdss_corrected_frame.py',
                 root/'packages/miniapp-contracts/src/sdss-science-optical-publication.ts',
                 root/'packages/miniapp-contracts/src/sdss-optical-publication.ts',
                 root/'packages/miniapp-contracts/src/optical-publication-content.ts',
                 root/'data-pipelines/deep-sky/pack_sdss_science_publication.mts',root/'tools/run-node.cjs']
        implementation_before=[bound_file(p,root=root) for p in sources]
        inputs_before=[*verified.bindings,legacy_binding]
        for v in inputs_before:
            bound_file(root/v['path'],root=root,expected=v)
        for name in ['candidate.json','binding.json']:
            with (output/('upstream-'+name)).open('xb') as f:
                f.write((verified.candidate_directory/name).read_bytes())
        payload=(publication_payload(verified,output,publication_id=publication_id,legacy_source=legacy['source'])
            if pyramid_kind=='encoded-rgb-box' else science_mean_publication_payload(verified,output,
                publication_id=publication_id,legacy_source=legacy['source'],display_transfer=display_transfer))
        payload_bytes=(json.dumps(payload,ensure_ascii=False,allow_nan=False,indent=2)+'\n').encode('utf8')
        with (output/'publication-input.json').open('xb') as f:f.write(payload_bytes)
        process=subprocess.run(command,input=payload_bytes,cwd=root,capture_output=True,check=False,timeout=60)
        with (output/'node-cli-stdout.txt').open('xb') as f:f.write(process.stdout)
        with (output/'node-cli-stderr.txt').open('xb') as f:f.write(process.stderr)
        if process.returncode!=0:raise RuntimeError('sdss_science_shared_ts_packaging_rejected:'+str(process.returncode))
        manifest=json.loads(process.stdout)
        returned={k:v for k,v in manifest.items() if k!='publicationHash'}
        returned['levels']={level:{k:v for k,v in value.items() if k!='downloadUrl'} for level,value in manifest['levels'].items()}
        if returned!=payload:raise RuntimeError('sdss_science_shared_ts_payload_changed')
        inputs_after=[bound_file(root/v['path'],root=root) for v in inputs_before]
        implementation_after=[bound_file(p,root=root) for p in sources]
        if inputs_before!=inputs_after or implementation_before!=implementation_after:
            raise RuntimeError('sdss_science_input_or_owner_changed_during_packaging')
        with (output/'manifest.json').open('xb') as f:f.write(process.stdout)
        receipt={'status':'OFFLINE_OPT_IN_CANDIDATE_PACKAGED','publicationHash':manifest['publicationHash'],
                 'publicationHashOwner':'shared TypeScript sdssScienceOpticalPublicationHash; Python byte hashes only',
                 'nodeCommand':command,'nodeExitCode':process.returncode,
                 'inputsBefore':inputs_before,'inputsAfter':inputs_after,
                 'implementationBefore':implementation_before,'implementationAfter':implementation_after,
                 'outputFiles':[bound_file(p,root=root) for p in sorted(output.rglob('*')) if p.is_file()],
                 'qualityAdopted':False,'runtimeRegistered':False,
                 'frozenDisplayValidation':verified.frozen_display_validation,
                 'pyramidKind':pyramid_kind,
                 'scope':('Byte-bound upstream science/joint/RGB and original availability PNG reproduced.' if pyramid_kind=='encoded-rgb-box' else
                    'Byte-bound admitted upstream science/joint, fixed whole-master reference RGB and signed-science-before-display levels reproduced; no coarse RGB parent.')+
                    ' No FITS read, reprojection, acquisition, per-crop fit, old publication replacement or native/render/source-quality acceptance.'}
        with (output/'writer-receipt.json').open('x',encoding='utf8') as f:json.dump(receipt,f,ensure_ascii=False,allow_nan=False,indent=2);f.write('\n')
        return receipt
    except Exception as error:
        with (output/'failed.json').open('x',encoding='utf8') as f:
            json.dump({'status':'OFFLINE_WRITER_FAILED','error':repr(error),'nodeCommand':command,
                       'scope':'Exclusive failed generation preserved; no publication acceptance or replacement.'},f,indent=2);f.write('\n')
        raise


def main() -> None:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate',type=Path,required=True)
    parser.add_argument('--candidate-sha256',required=True)
    parser.add_argument('--binding-sha256',required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--publication-id',required=True)
    parser.add_argument('--legacy-source-manifest',type=Path,required=True)
    args=parser.parse_args();root=Path(__file__).resolve().parents[2]
    verified=verify_cached_candidate(args.candidate,root=root,candidate_sha256=args.candidate_sha256,binding_sha256=args.binding_sha256)
    receipt=publish_verified_candidate(verified,args.output,root=root,publication_id=args.publication_id,legacy_manifest=args.legacy_source_manifest)
    print(json.dumps({'output':str(args.output),'publicationHash':receipt['publicationHash'],
                      'qualityAdopted':False,'runtimeRegistered':False}))


if __name__=='__main__':main()
