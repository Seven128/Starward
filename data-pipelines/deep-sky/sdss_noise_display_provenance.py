"""Offline processing/source binding for explicit noise-display candidates.

This downstream consumer neither filters/reprojects sources nor admits quality,
licensing or a runtime publication. Caller pins are external trust inputs;
matching URL/hash/JSON does not prove acquisition origin or physical fidelity.
"""
from __future__ import annotations

import copy
from dataclasses import asdict
import json
from pathlib import Path
import re

import numpy as np
import astropy
import PIL

from image_quality import digest
from sdss_gri_tan import BANDS
from sdss_noise_display import (VERSION, RADIUS, REJECT_PROCESSING_BITS,
    NoiseDisplayCandidate, _qualified_sources, noise_display_pyramid)
from publish_sdss_science import candidate_file, bound_file

PROVENANCE_VERSION = 'sdss-noise-display-processing-provenance-v1'
CHAIN_VERSION = 'sdss-noise-display-source-chain-v1'
CODE_FILES = ('sdss_noise_display.py', 'sdss_gri_tan.py', 'sdss_frame_noise.py',
              'sdss_corrected_frame.py', 'sdss_frame_quality.py', 'sdss_source_stencil.py',
              'publish_sdss_science.py', 'image_quality.py')


def canonical_bytes(value):
    return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode('utf-8')


def array_identity(value):
    return {'shape':list(value.shape),'dtype':value.dtype.str,'cOrderBytes':int(value.nbytes),
            'cOrderSha256':digest(value.tobytes(order='C'))}


def _pin(value):
    if not isinstance(value,str) or re.fullmatch('[a-f0-9]{64}',value) is None:
        raise RuntimeError('sdss_noise_provenance_external_pin_invalid')


def build_noise_display_provenance(master,sources):
    """Snapshot actual admitted objects and common master, not provider guesses.

    Metadata can be absent while original science remains usable. Missing model
    facts stay null; a complete field in one band cannot certify other bands.
    Code/array identities bind the current snapshot, not a previous execution.
    """
    recipe,fields,weights=_qualified_sources(master,sources)
    if (not isinstance(master.report.get('objectRef'),str) or not master.report['objectRef'] or
            not isinstance(master.report.get('center'),dict) or master.report.get('orientation')!='north-up/east-left'):
        raise RuntimeError('sdss_noise_provenance_master_identity_missing')
    field_records=[]
    for name in sorted(fields):
        bands={}
        for band in BANDS:
            source=sources[name][band];frame=source.frame;metadata=frame.calibration_sky
            calibration=None if metadata is None else {key:array_identity(getattr(metadata,key))
                for key in ('calibration','allsky','xinterp','yinterp')}
            flags=None if source.flags is None else {
                'admissionReceipt':copy.deepcopy(source.flags.receipt),
                'nativeFlags':array_identity(source.flags.flags),
                'planeNumbers':dict(source.flags.enum)}
            bands[band]={
                'frameAdmissionReceipt':copy.deepcopy(frame.receipt),
                'nativeScience':array_identity(frame.data),
                'primaryHeaderProcessingId':frame.header.get('PS_ID'),
                'sampledLinearWcsHeader':dict(frame.wcs.to_header()),
                'calibrationSky':calibration,
                'camera':None if source.camera is None else asdict(source.camera),
                'flags':flags,
                'projected':{key:array_identity(getattr(fields[name][band],key))
                    for key in ('data','footprint','finite_neighbors')}}
        field_records.append({'fieldKey':name,'normalizedGeometryWeight':array_identity(weights[name]),'bands':bands})
    return {'schemaVersion':PROVENANCE_VERSION,'processingVersion':VERSION,
        'scope':'Actual offline inputs/model snapshot; not scientific correction, quality/rights admission or runtime publication.',
        'master':{'targetIdentity':{key:copy.deepcopy(master.report[key]) for key in ('objectRef','center','orientation')},
            'targetWcsHeader':dict(master.target.to_header()),'fieldDegrees':master.report['fieldDegrees'],
            'jointAvailability':array_identity(master.joint_available),
            'science':{b:array_identity(master.bands[b].data) for b in BANDS},
            'sourceResolvedRecipe':copy.deepcopy(recipe)},
        'fields':field_records,
        'algorithm':{'radius':RADIUS,'spatialSigma':1,'rangeSigma':1,'passes':1,
            'rejectProcessingBits':REJECT_PROCESSING_BITS,
            'nativeVariance':'((science/calibration + skyCounts)/gain + darkVariance)*calibration^2',
            'withinField':'Squared interpolation and spatial contribution coefficients; shared native IDs retain pair covariance.',
            'acrossFields':'Conditional Cauchy upper of difference marginals; unknown field covariance is not set to zero.',
            'omittedUncertainty':['sky-model','systematic','processing','full native off-diagonal covariance','post-filter uncertainty'],
            'unknownRecovery':'Any unsupported positive contributor preserves original center. Zero contributions are neutral.',
            'availability':'Science availability and area alpha remain original; processability never supplies coverage.',
            'estimateMeaning':'Display-only signed nMgy/native-pixel estimates, not new measurements, photometry or uniform surface brightness.',
            'projectionLimit':'Primary linear TAN; no full asTrans polynomial/DCR or PSF matching certification.',
            'edgePolicy':'Real two-pixel halo; outer two rows/columns original, no synthetic extension.',
            'cancellation':'No partial candidate returned; no automatic acquisition or retry.'},
        'implementation':{name:digest((Path(__file__).parent/name).read_bytes()) for name in (*CODE_FILES,Path(__file__).name)},
        'libraries':{'numpy':np.__version__,'astropy':astropy.__version__,'Pillow':PIL.__version__},
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}


def verify_noise_display_provenance(value,master,sources,*,expected_sha256):
    _pin(expected_sha256)
    if digest(canonical_bytes(value))!=expected_sha256:
        raise RuntimeError('sdss_noise_provenance_document_changed')
    actual=build_noise_display_provenance(master,sources)
    if canonical_bytes(value)!=canonical_bytes(actual):
        raise RuntimeError('sdss_noise_provenance_current_inputs_changed')
    return value


def bind_saved_noise_display(directory,master,sources,provenance,*,root,
                             candidate_sha256,provenance_sha256):
    """Pin saved explicit estimates, derive levels without fitting/filtering.

    The result is a source-chain development packet. Reconstruction of an older
    missing snapshot alone cannot certify which objects an old process used;
    that requires the original byte-bound execution input/code evidence too.
    """
    verify_noise_display_provenance(provenance,master,sources,expected_sha256=provenance_sha256)
    _pin(candidate_sha256)
    candidate_path=directory/'candidate.json';candidate_binding=bound_file(candidate_path,root=root)
    if candidate_binding['sha256']!=candidate_sha256:
        raise RuntimeError('sdss_noise_provenance_candidate_changed')
    candidate=json.loads(candidate_path.read_bytes())
    if any(candidate.get(key)!=item for key,item in provenance['master']['targetIdentity'].items()):
        raise RuntimeError('sdss_noise_provenance_target_identity_mismatch')
    if (candidate.get('version')!=VERSION or candidate.get('quality')!='UNVERIFIED' or
            candidate.get('independentReview')!='MISSING' or candidate.get('adopted') is not False or
            candidate.get('radius')!=RADIUS or candidate.get('spatialSigma')!=1 or
            candidate.get('rangeSigma')!=1 or candidate.get('passes')!=1):
        raise RuntimeError('sdss_noise_provenance_candidate_contract_invalid')
    if set(candidate.get('arrays',{}))!=set(BANDS)|{'processable'}:
        raise RuntimeError('sdss_noise_provenance_candidate_array_set_invalid')
    arrays={};bindings=[]
    n=master.joint_available.shape[0]
    for name,metadata in candidate['arrays'].items():
        if metadata.get('format')!='npy' or metadata.get('pickle') is not False:
            raise RuntimeError('sdss_noise_provenance_array_format_invalid')
        path=candidate_file(directory,metadata['file'])
        bindings.append(bound_file(path,root=root,expected=metadata))
        value=np.load(path,mmap_mode='r',allow_pickle=False)
        if (value.shape!=(n,n) or list(value.shape)!=metadata['shape'] or value.dtype.str!=metadata['dtype'] or
                value.dtype!=(np.bool_ if name=='processable' else np.float32)):
            raise RuntimeError('sdss_noise_provenance_array_shape_invalid')
        arrays[name]=value
    processable=arrays['processable']
    if (candidate['processablePixels']!=int(processable.sum()) or
            candidate['originalKeptPixels']!=int((~processable).sum()) or
            processable[:RADIUS].any() or processable[-RADIUS:].any() or
            processable[:,:RADIUS].any() or processable[:,-RADIUS:].any()):
        raise RuntimeError('sdss_noise_provenance_processability_invalid')
    for band in BANDS:
        if (not np.isfinite(arrays[band][master.joint_available]).all() or
                not np.array_equal(arrays[band][~processable],master.bands[band].data[~processable],equal_nan=True)):
            raise RuntimeError('sdss_noise_provenance_fallback_invalid')
    value=NoiseDisplayCandidate({b:arrays[b] for b in BANDS},processable,candidate)
    entry={k:candidate[k] for k in ('objectRef','center','orientation')}
    products=noise_display_pyramid(master,value,entry,output_pixels=candidate['levels']['DETAIL']['pixels'])
    if set(candidate['levels'])!=set(products):
        raise RuntimeError('sdss_noise_provenance_level_set_invalid')
    levels={}
    for level,(payload,metadata) in products.items():
        old=candidate['levels'][level];path=candidate_file(directory,old['file'])
        binding=bound_file(path,root=root,expected=old)
        if path.read_bytes()!=payload or any(old.get(key)!=item for key,item in metadata.items()):
            raise RuntimeError('sdss_noise_provenance_level_derivation_invalid')
        levels[level]={'encoded':binding,'derivation':copy.deepcopy(metadata)}
    return {'schemaVersion':CHAIN_VERSION,'objectRef':candidate['objectRef'],'center':candidate['center'],
        'candidate':candidate_binding,'processingProvenanceCanonicalSha256':provenance_sha256,
        'estimateFiles':bindings,'levels':levels,
        'sourceFields':len(provenance['fields']),'sourceBands':sum(len(f['bands']) for f in provenance['fields']),
        'originalFallbackExact':True,'levelDerivationExact':True,'filterRuns':0,'statisticalFitCalls':0,
        'meaning':'Offline development source chain only. Original execution evidence separately binds historical input/code use; quality, source-rights publication and runtime delivery are not admitted.',
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}


ADAPTIVE_CHAIN_VERSION = 'sdss-adaptive-recovery-processing-source-chain-v1'
ADAPTIVE_CHAIN_ROLES = ('science', 'disclosure', 'adaptive', 'halo', 'supply',
                        'qualification', 'current', 'readback')


def _adaptive_recovery_lineage(documents):
    """Check fixed processing roles; the input snapshot remains noise-v1.

    No processing version is inferred from snapshot shape or a current module.
    Saved numeric readback is external pinned execution evidence, not a new
    numerical run or source/quality admission by this downstream packet.
    """
    from sdss_adaptive_display import VERSION as adaptive_version, HALO_VERSION
    from sdss_display_recovery import VERSION as supply_version, REBASE_VERSION
    science, disclosure, adaptive, halo, supply, qualification, current, readback = (
        documents[k] for k in ADAPTIVE_CHAIN_ROLES)
    identity = {k:science[k] for k in ('objectRef', 'center', 'orientation')}
    stages = (adaptive, halo, supply, current)
    if (any(any(v.get(k) != expected for k, expected in identity.items()) for v in (*stages, disclosure)) or
            identity['orientation'] != 'north-up/east-left'):
        raise RuntimeError('sdss_adaptive_chain_target_changed')
    if (tuple(v.get('version') for v in stages) !=
            (adaptive_version, HALO_VERSION, supply_version, REBASE_VERSION) or
            any(v.get('adopted') is not False or v.get('quality') != 'UNVERIFIED' or
                v.get('independentReview') != 'MISSING' for v in stages)):
        raise RuntimeError('sdss_adaptive_chain_version_or_adoption_invalid')
    recipe = disclosure['master']['transfer']['recipe']
    if any(v.get('sourceResolvedRecipe') != recipe for v in stages):
        raise RuntimeError('sdss_adaptive_chain_recipe_changed')
    if (halo.get('parentProcessingVersion') != adaptive_version or
            halo.get('parentDisplayEstimatesCOrderSha256') != adaptive['displayEstimatesCOrderSha256'] or
            halo.get('parentDiagnosticCOrderSha256') != adaptive['diagnosticCOrderSha256'] or
            halo.get('interiorExact') is not True or halo.get('wholeMasterFilterRuns') != 0 or
            current.get('baselineProcessingVersion') != HALO_VERSION or
            current.get('baselineEstimateCOrderSha256') != halo['displayEstimatesCOrderSha256'] or
            current.get('baselineDiagnosticCOrderSha256') != halo['diagnosticCOrderSha256'] or
            current.get('baselineQualifiedCOrderSha256') != halo['diagnosticCOrderSha256']['qualified']):
        raise RuntimeError('sdss_adaptive_chain_parent_changed')
    snapshot = qualification.get('currentInputSnapshot', {})
    if (qualification.get('kind') != 'CURRENT_RECOVERY_EXECUTION_WITH_PINNED_OLD_NOISE_PARENT' or
            snapshot.get('schemaVersion') != PROVENANCE_VERSION or
            snapshot.get('processingVersion') != VERSION or
            any(supply.get(k) != v for k, v in qualification.get('recoveryReport', {}).items()) or
            qualification.get('recoveryReport', {}).get('version') != supply_version or
            current.get('savedSupplyProcessingVersion') != supply_version or
            current.get('savedSupplyReportCanonicalSha256') != digest(canonical_bytes(supply)) or
            current.get('savedExecutionCanonicalSha256') != digest(canonical_bytes(qualification)) or
            current.get('sourceInputsExact') is not True or
            current.get('currentSourceInputs', {}).get('masterAndFieldsCanonicalSha256') !=
                digest(canonical_bytes({k:snapshot.get(k) for k in ('master', 'fields')}))):
        raise RuntimeError('sdss_adaptive_chain_qualification_changed')
    if (snapshot['master'].get('targetIdentity') != identity or
            snapshot['master'].get('sourceResolvedRecipe') != recipe or
            not snapshot.get('fields') or any(set(f.get('bands', {})) != set(BANDS) for f in snapshot['fields']) or
            any(v.get('sourceScienceCOrderSha256') != current['sourceScienceCOrderSha256'] or
                v.get('sourceAvailabilityCOrderSha256') != current['sourceAvailabilityCOrderSha256'] for v in stages) or
            current['sourceScienceCOrderSha256'] != {b:snapshot['master']['science'][b]['cOrderSha256'] for b in BANDS} or
            current['sourceAvailabilityCOrderSha256'] != snapshot['master']['jointAvailability']['cOrderSha256']):
        raise RuntimeError('sdss_adaptive_chain_science_changed')
    if (current.get('supplyProjectionRuns') != 0 or current.get('filterRuns') != 0 or current.get('fitRuns') != 0 or
            current.get('savedAlternativePixels') != supply.get('alternativePixels') or
            readback.get('alternativePixels') != current.get('alternativePixels') or
            readback.get('admittedSavedValuesExact') is not True or
            readback.get('outsideAdmittedLatestParentExact') is not True or
            readback.get('baselineDiagnosticLineageExact') is not True or
            readback.get('oldQualificationCanonicalInputsExact') is not True or
            set(readback.get('levels', {})) != set(current['levels']) or
            any(v.get('numericDerivationExact') is not True or v.get('originalAlphaExact') is not True
                for v in readback['levels'].values())):
        raise RuntimeError('sdss_adaptive_chain_saved_derivation_missing')
    source = disclosure.get('source', {})
    if (disclosure['master']['science'] != {b:{k:science['arrays'][b+'-science'][k] for k in ('bytes', 'sha256')} for b in BANDS} or
            any(disclosure['master']['jointAvailability'].get(k) != science['arrays']['joint-availability'][k] for k in ('bytes', 'sha256'))):
        raise RuntimeError('sdss_adaptive_chain_disclosure_science_changed')
    if any(not isinstance(source.get(k), str) or not source[k].strip()
           for k in ('provider', 'credit', 'license', 'licenseUrl', 'imageUsePolicyUrl', 'landingUrl')):
        raise RuntimeError('sdss_adaptive_chain_disclosure_missing')
    return identity, snapshot, recipe


def bind_saved_adaptive_recovery_chain(document_bindings, executions, *, root, model_evidence):
    """Bind the already executed adaptive/real-halo/saved-supply lineage.

    All caller pins must be retained outside the candidates they authenticate.
    Each historical input is byte-checked, using an explicit archived code file
    when live code has since evolved. The inspector's code is a separate role.
    Original signed data, saved estimates and numeric readback are referenced;
    no frame parsing/projection/filter/fit/PNG derivation is repeated here.
    Internal receipts and paths make this an offline packet, not public payload.
    """
    if set(document_bindings) != set(ADAPTIVE_CHAIN_ROLES) or set(executions) != {'adaptive', 'halo', 'supply', 'current'} or not model_evidence:
        raise RuntimeError('sdss_adaptive_chain_roles_invalid')
    checked = {}
    def file(binding):
        if not isinstance(binding, dict) or not isinstance(binding.get('path'), str):
            raise RuntimeError('sdss_adaptive_chain_binding_invalid')
        _pin(binding.get('sha256'))
        path = root / binding['path']
        prior = checked.get(path.resolve())
        if prior is not None:
            if prior != binding:
                raise RuntimeError('sdss_adaptive_chain_conflicting_file_pin')
            return prior
        result = bound_file(path, root=root, expected=binding)
        checked[path.resolve()] = result
        return result
    def document(binding):
        actual = file(binding)
        return json.loads((root / actual['path']).read_bytes())
    documents = {k:document(v) for k, v in document_bindings.items()}
    identity, snapshot, recipe = _adaptive_recovery_lineage(documents)
    current = documents['current'];readback = documents['readback']
    historical_code = {}
    for execution in executions.values():
        for path, archive in execution.get('archives', {}).items():
            if not path.endswith(('.py', '.ts', '.mts', '.mjs')):
                raise RuntimeError('sdss_adaptive_chain_archive_role_invalid')
            historical_code[(path, archive['sha256'], archive['bytes'])] = archive
    def historical_file(v):
        archive = historical_code.get((v['path'], v['sha256'], v['bytes']))
        return file(archive if archive is not None else v)
    if readback.get('candidate') != document_bindings['current']:
        raise RuntimeError('sdss_adaptive_chain_readback_candidate_changed')
    if document_bindings['science'] not in readback.get('inputs', []):
        raise RuntimeError('sdss_adaptive_chain_readback_science_changed')
    readback_inputs = [{'original':v, 'verifiedBytesAt':historical_file(v)} for v in readback.get('inputs', [])]
    if not readback.get('inputs'):
        raise RuntimeError('sdss_adaptive_chain_readback_inputs_missing')
    for level, value in readback['levels'].items():
        expected = current['levels'][level]
        if (value['png'].get('sha256'), value['png'].get('bytes')) != (expected['sha256'], expected['bytes']):
            raise RuntimeError('sdss_adaptive_chain_readback_level_changed')
        file(value['png'])
    products = {}
    for role in ('science', 'adaptive', 'halo', 'supply', 'current'):
        candidate = documents[role];directory = (root / document_bindings[role]['path']).parent
        if not candidate.get('arrays') or not candidate.get('levels'):
            raise RuntimeError('sdss_adaptive_chain_outputs_missing')
        products[role] = {kind:{name:bound_file(candidate_file(directory, v['file']), root=root, expected=v)
                               for name, v in candidate[kind].items()} for kind in ('arrays', 'levels')}
    history = {}
    for role, execution in executions.items():
        result = document(execution['result']);before = document(execution['before']);after = document(execution['after'])
        if (before != after or not before or result.get('candidate') != document_bindings[role] or result.get('adopted') is not False):
            raise RuntimeError('sdss_adaptive_chain_execution_changed')
        recorded = {v['path']:v for v in before}
        if len(recorded) != len(before):
            raise RuntimeError('sdss_adaptive_chain_duplicate_input')
        archives = execution.get('archives', {})
        if any(path not in recorded or not path.endswith(('.py', '.ts', '.mts', '.mjs')) for path in archives):
            raise RuntimeError('sdss_adaptive_chain_archive_role_invalid')
        resolved = []
        for path, v in recorded.items():
            actual = file(archives[path] if path in archives else v)
            if (actual['bytes'], actual['sha256']) != (v['bytes'], v['sha256']):
                raise RuntimeError('sdss_adaptive_chain_historical_code_changed')
            resolved.append({'original':v, 'verifiedBytesAt':actual})
        producer = file(execution['producer'])
        if not any(v['sha256'] == producer['sha256'] and v['bytes'] == producer['bytes'] and v['path'].endswith('.py') for v in before):
            raise RuntimeError('sdss_adaptive_chain_producer_unbound')
        history[role] = copy.deepcopy(execution) | {'resolvedHistoricalInputs':resolved,
            'meaning':'Original byte-pinned execution evidence, including archived historical code; no current-code attribution to this run.'}
    evidence = {k:file(v) for k, v in model_evidence.items()}
    return {'schemaVersion':ADAPTIVE_CHAIN_VERSION, **identity, 'documents':copy.deepcopy(document_bindings),
        'processingRoles':{k:documents[k]['version'] for k in ('adaptive', 'halo', 'supply', 'current')},
        'inputSnapshotRole':{'schemaVersion':snapshot['schemaVersion'], 'processingVersion':snapshot['processingVersion'],
            'meaning':'Original saved native/model/epoch/projected/weight identity snapshot only, not the adaptive algorithm declaration.',
            'masterAndFieldsCanonicalSha256':current['currentSourceInputs']['masterAndFieldsCanonicalSha256']},
        'historicalExecutions':history, 'products':products, 'source':copy.deepcopy(documents['disclosure']['source']),
        'resolvedDisplayRecipe':copy.deepcopy(recipe), 'modelEvidence':evidence,
        'processingDisclosure':{
            'science':'Original signed calibrated already sky-subtracted nMgy/native-pixel samples and common geometric coadd are preserved; no second sky subtraction or new measurement.',
            'display':'Shared gri sign-neutral conditional common apertures (1/2/4/8, ratio3) protect strong signed structure. Real CCD exterior support refines only the crop perimeter; interior stays exact. Saved qualified temporally disjoint other-RUN supply is used only at currently unqualified centers. Different scans do not imply independent systematics or identical epoch/PSF.',
            'coverage':'Original coherent science availability alone controls rounded area alpha; processability, brightness, valid zero/negative values and supply do not create coverage.',
            'export':'Signed display means are boxed before one frozen whole-master i/r/g Lupton recipe. These PNGs and estimates are display products, not calibrated photometry or uniform surface brightness.',
            'limits':['primary linear TAN, no full asTrans/DCR or absolute astrometry certification',
                'conditional native diagonal variance/shared native IDs and cross-field Cauchy upper omit sky/systematic/processing uncertainty',
                'native noncentral PSF correspondence is diagnostic; central/extended/coadded target PSF and full matching remain unverified',
                'complete background, weak structure, colour and registration quality not passed; independent review missing'],
            'rights':'Credit/license/policy text is retained from the pinned source disclosure. This packet does not authorize full-quality adoption or certify final public rights/processing/source-route delivery.'},
        'numericEvidence':'Existing pinned saved numeric/alpha readback reused, not rerun by this inspector.',
        'numericReadbackInputsResolved':readback_inputs,
        'inspectionImplementation':{Path(__file__).name:digest(Path(__file__).read_bytes())},
        'checkedDistinctFiles':len(checked), 'sourceRequests':0, 'filterRuns':0, 'projectionRuns':0,
        'statisticalFitCalls':0, 'pngDerivationRuns':0, 'runtimePublication':'UNPUBLISHED',
        'quality':'UNVERIFIED', 'independentReview':'MISSING', 'adopted':False}
