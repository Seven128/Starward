"""Explicit offline packaging of a pinned complete SDSS display generation.

Original science, coverage and frozen recipe stay the parent. Saved actual
execution/source/noise/common-aperture receipts admit the estimates; this owner
only reproduces their three levels. No FITS reads, projection, noise selection,
fit, download, registry adoption, old generation replacement or network publish.
"""
from dataclasses import dataclass
from pathlib import Path
import io,json,subprocess
import numpy as np
from PIL import Image
import sdss_gri_tan as gri
from sdss_noise_model_increment import (NoiseModelIncrementCandidate,VERSION,
    source_noise_increment_products)
from sdss_noise_display_provenance import canonical_bytes
from image_quality import digest
from optical_publication_io import bound_file,bound_bytes,decode_bound_npy
from publish_sdss_science import candidate_file,_publication_frames

IMPLEMENTATIONS=('sdss_noise_model_increment.py','sdss_frame_noise.py','sdss_noise_display.py',
    'sdss_display_recovery.py','sdss_adaptive_display.py','sdss_noise_aperture.py','sdss_source_stencil.py',
    'sdss_gri_tan.py','sdss_corrected_frame.py','sdss_frame_quality.py','sdss_noise_display_provenance.py')
DIAGNOSTICS=('qualified','radius','reached','protected','requested','changed')

@dataclass(frozen=True)
class VerifiedDisplayGeneration:
    directory: Path
    receipt_bytes: bytes
    scientific_receipt_bytes: bytes
    master: gri.GriMaster
    candidate: NoiseModelIncrementCandidate
    products: tuple
    bindings_bytes: bytes
    execution_bytes: bytes
    identities_bytes: bytes
    sources_bytes: bytes

    @property
    def receipt(self):return json.loads(self.receipt_bytes)
    @property
    def scientific_receipt(self):return json.loads(self.scientific_receipt_bytes)
    @property
    def bindings(self):return tuple(json.loads(self.bindings_bytes))
    @property
    def execution(self):return json.loads(self.execution_bytes)
    @property
    def identities(self):return json.loads(self.identities_bytes)
    @property
    def sources(self):return tuple(json.loads(self.sources_bytes))

def verify_cached_display_generation(directory:Path,*,root:Path,result_sha256:str,cancelled=None):
    root,directory=root.resolve(),directory.resolve()
    if not directory.is_relative_to(root):raise RuntimeError('sdss_display_generation_outside_root')
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_display_packaging_cancelled')
    check();bindings={}
    def pin(p,expected=None):
        v=bound_file(p,root=root,expected=expected)
        if v['path'] in bindings and bindings[v['path']]!=v:raise RuntimeError('sdss_display_input_changed')
        bindings[v['path']]=v;return v
    def document(p,expected=None):
        raw,v=bound_bytes(p,root=root,expected=expected,max_bytes=8*1024*1024);pin(p,v)
        value=json.loads(raw)
        if not isinstance(value,dict):raise RuntimeError('sdss_display_receipt_invalid')
        return value,raw,v
    execution,execution_raw,execution_id=document(directory/'result.json');check()
    if (execution_id['sha256']!=result_sha256 or execution.get('inputsAfterExact') is not True or
            execution.get('previousScientificAndCandidateAndProtectedInputsExact') is not True or
            execution.get('wholeVarianceFitsScienceCoaddFilterRuns')!=0 or
            execution.get('oldApertureMatricesOrPSFFitsOrDetectorsReplayed') is not False or
            execution.get('newAstronomicalSourceRequests')!=0 or execution.get('ordinaryAdoption') is not False):
        raise RuntimeError('sdss_display_execution_not_verified')
    inputs=execution.get('inputsBefore')
    if not isinstance(inputs,list) or not inputs:raise RuntimeError('sdss_display_execution_inputs_invalid')
    for v in inputs:check();pin(root/v['path'],v)
    science,science_raw,science_id=document(root/execution['scienceCandidate']['path'],execution['scienceCandidate'])
    previous,_,previous_id=document(root/execution['previousCompleteCandidate']['path'],execution['previousCompleteCandidate'])
    report,report_raw,report_id=document(root/execution['candidate']['path'],execution['candidate'])
    candidate_directory=(root/execution['candidate']['path']).parent
    if candidate_directory!=directory/'candidate' or report.get('publication')!='OFFLINE_CANDIDATE_ONLY':
        raise RuntimeError('sdss_display_candidate_location_invalid')
    if (science.get('version')!=gri.SCIENCE_PYRAMID_VERSION or science.get('pixels')!=2048 or
            science.get('pyramidKind')!=gri.SCIENCE_PYRAMID_KIND or report.get('version')!=VERSION or
            report.get('parentReportCanonicalSha256')!=digest(canonical_bytes(previous)) or
            report.get('planCanonicalSha256')!=execution.get('boundPlanCanonicalSha256')):
        raise RuntimeError('sdss_display_parent_model_binding_invalid')
    plan,_,plan_id=document(directory/'bound-dependency-plan.json')
    plan_content={k:v for k,v in plan.items() if k!='canonicalSha256'}
    if (digest(canonical_bytes(plan_content))!=report['planCanonicalSha256'] or
            plan['canonicalSha256']!=report['planCanonicalSha256'] or
            plan_content!=report['sourceModelDependencyPlan']):
        raise RuntimeError('sdss_display_dependency_plan_changed')
    def array(meta,base,*,dtype,shape=(2048,2048)):
        p=candidate_file(base,meta['file']);raw,v=bound_bytes(p,root=root,expected=meta,max_bytes=128*1024*1024);pin(p,v)
        if meta.get('format')!='npy' or meta.get('pickle') is not False:raise RuntimeError('sdss_display_array_format_invalid')
        if meta.get('shape')!=list(shape) or meta.get('dtype')!=np.dtype(dtype).str:
            raise RuntimeError('sdss_display_array_shape_invalid')
        return decode_bound_npy(raw,shape=shape,dtype=dtype)
    science_directory=(root/execution['scienceCandidate']['path']).parent;values={}
    for k,meta in science['arrays'].items():
        if k in ('joint-availability','rgb-master') or any(k==b+'-'+suffix for b in gri.BANDS for suffix in ('science','footprint','finite-neighbors')):
            check();values[k]=array(meta,science_directory,dtype='u1' if k=='rgb-master' else '<f4' if k.endswith('-science') else '?',
                shape=(2048,2048,3) if k=='rgb-master' else (2048,2048))
    bands={b:gri.ProjectedBand(*(values[b+'-'+suffix] for suffix in ('science','footprint','finite-neighbors')),science['science']['perBand'][b]) for b in gri.BANDS}
    target=gri.target_tan(science['center'],2048,science['fieldDegrees'])
    if dict(target.to_header())!=science['wcsHeader']:raise RuntimeError('sdss_display_science_geometry_changed')
    master=gri.GriMaster(target,bands,values['joint-availability'],values['rgb-master'],science)
    samples={b:array(report['arrays'][b],candidate_directory,dtype='<f4') for b in gri.BANDS}
    maps={k:array(report['arrays'][k],candidate_directory,dtype='i1' if k=='radius' else '?') for k in DIAGNOSTICS}
    candidate=NoiseModelIncrementCandidate(samples,*(maps[k] for k in DIAGNOSTICS),report)
    products=source_noise_increment_products(master,candidate,{k:science[k] for k in ('objectRef','center','orientation')})
    # Verify saved parent preservation independently of the execution's booleans.
    previous_directory=(root/execution['previousCompleteCandidate']['path']).parent
    old_protected=array(previous['arrays']['protected'],previous_directory,dtype='?')
    changed=np.zeros((2048,2048),bool)
    for b in gri.BANDS:
        old=array(previous['arrays'][b],previous_directory,dtype='<f4')
        if (digest(old.tobytes())!=report['parentDisplayEstimateCOrderSha256'][b] or
                not np.array_equal(samples[b][~maps['requested']],old[~maps['requested']],equal_nan=True) or
                not np.array_equal(samples[b][old_protected],old[old_protected],equal_nan=True)):
            raise RuntimeError('sdss_display_preserved_parent_changed')
        changed|=~((samples[b]==old)|(np.isnan(samples[b])&np.isnan(old)))
    if not np.array_equal(changed,maps['changed']):raise RuntimeError('sdss_display_changed_map_invalid')
    for k in ('qualified','radius','reached','protected'):
        old=array(previous['arrays'][k],previous_directory,dtype='i1' if k=='radius' else '?')
        if (digest(old.tobytes())!=report['parentDiagnosticCOrderSha256'][k] or
                not np.array_equal(maps[k][~maps['requested']],old[~maps['requested']])):
            raise RuntimeError('sdss_display_preserved_parent_diagnostic_changed')
    # A saved original-science reference stays original; it is not the new
    # estimates' coarse parent. Reuse numeric resolved recipe, never refit.
    recipe=gri._qualified_science_pyramid(master)
    rgb,_=gri.make_rgb_display(master.bands,master.joint_available,transfer=gri.FixedDisplayTransfer(stretch=recipe['stretch'],Q=recipe['Q']))
    if not np.array_equal(rgb,master.rgb):raise RuntimeError('sdss_display_science_reference_rgb_changed')
    implementation={}
    input_by_path={v['path']:v for v in inputs}
    for name in IMPLEMENTATIONS:
        source_path='data-pipelines/deep-sky/'+name;expected=input_by_path.get(source_path)
        if expected is None:raise RuntimeError('sdss_display_execution_implementation_missing')
        v=pin(directory/('executed-'+name),expected);implementation[name]={k:v[k] for k in ('bytes','sha256')}
        if name in report['implementation'] and v['sha256']!=report['implementation'][name]:
            raise RuntimeError('sdss_display_execution_implementation_changed')
    sources=[]
    for b in gri.BANDS:
        sources.extend(science['science']['perBand'][b]['sourceReceipts'])
    for receipt in sources:
        source=receipt['source'];v=pin(Path(source['path']),source)
        if v['path'] not in input_by_path:raise RuntimeError('sdss_display_native_source_unbound')
        identity=receipt['identity'];band=identity['band']
        found=[v[band]['frameReceipt'] for v in report['currentSourceModelInputs'].values() if v[band]['frameReceipt']['identity']==identity]
        if found!=[receipt]:raise RuntimeError('sdss_display_source_science_receipt_mismatch')
    identities={'candidateReceipt':report_id,'scientificCandidateReceipt':science_id,'previousCandidateReceipt':previous_id,
        'executionReceipt':execution_id,'dependencyPlanReceipt':plan_id,
        'implementation':implementation}
    raw,source_inputs_id=bound_bytes(directory/'inputs-before.json',root=root,max_bytes=8*1024*1024);pin(directory/'inputs-before.json',source_inputs_id)
    source_inputs=json.loads(raw)
    # The producer adds saved bounded consumer receipts after the processing
    # phase. Its original before inventory remains an exact nonempty subset,
    # not a forged complete record of those later verification inputs.
    if not isinstance(source_inputs,list) or not source_inputs or any(input_by_path.get(v['path'])!=v for v in source_inputs):
        raise RuntimeError('sdss_display_source_inventory_changed')
    identities['sourceInputsReceipt']=source_inputs_id
    for level,(payload,meta) in products.items():
        original=report['levels'][level];raw,v=bound_bytes(candidate_file(candidate_directory,original['file']),root=root,expected=original,max_bytes=8*1024*1024);pin(candidate_file(candidate_directory,original['file']),v)
        if raw!=payload or {k:v for k,v in original.items() if k!='file'}!=meta:
            raise RuntimeError('sdss_display_saved_level_derivation_changed')
    for v in bindings.values():check();bound_file(root/v['path'],root=root,expected=v)
    sealed=lambda v:json.dumps(v,ensure_ascii=False,allow_nan=False).encode('utf-8')
    check();return VerifiedDisplayGeneration(directory,report_raw,science_raw,master,candidate,tuple(products.items()),
        sealed(list(bindings.values())),execution_raw,sealed(identities),sealed(sources))

def display_publication_payload(verified,output,*,publication_id,legacy_source):
    report=verified.receipt;science=verified.scientific_receipt;master=verified.master
    if verified.candidate.report!=report or master.report!=science:
        raise RuntimeError('sdss_display_verified_generation_mutated')
    # This shared receipt serializer does not assume levels are science means.
    frames=_publication_frames(verified,output)
    content=lambda meta:{k:meta[k] for k in ('bytes','sha256')}
    entry={k:science[k] for k in ('objectRef','center','orientation')}
    products=source_noise_increment_products(master,verified.candidate,entry)
    if tuple(products.items())!=verified.products:raise RuntimeError('sdss_display_verified_generation_mutated')
    levels={}
    for level,(payload,metadata) in products.items():
        a=report['levels'][level];p=candidate_file(output,a['file'])
        with p.open('xb') as stream:stream.write(payload)
        with Image.open(io.BytesIO(p.read_bytes())) as image:
            if image.mode!='RGBA' or image.size!=(512,512):raise RuntimeError('sdss_display_saved_level_invalid')
        x0,y0,x1,y1=a['crop']['boundsXYExclusive'];joint=master.joint_available[y0:y1,x0:x1];factor=a['crop']['boxFactor']
        levels[level]=content(a)|{'file':a['file'],'format':'png','pixels':512,'fieldDegrees':a['fieldDegrees'],
            'crpixFitsOneBased':256.5,'sampleAvailability':'joint-area-alpha','masterAvailabilitySha256':science['arrays']['joint-availability']['sha256'],
            'masterCrop':a['crop'],'masterDisplayEstimatesSha256':{b:report['arrays'][b]['sha256'] for b in gri.BANDS},
            'displayEstimateMean':{'unit':'mean display estimate in source nanomaggies/native-pixel',
                'availablePixels':512**2-a['emptyPixels'],'emptyPixels':a['emptyPixels'],'partialPixels':a['partialPixels'],
                'availableMasterSamples':int(joint.sum())}}
    identities={k:content(v) for k,v in verified.identities.items() if k!='implementation'}
    display=identities|{'implementation':verified.identities['implementation'],'producerVersion':VERSION,
        'previousNoiseModel':report['previousModel'],'noiseModel':report['currentModel'],'estimateRole':'DISPLAY_ONLY_NOT_NEW_MEASUREMENTS',
        'estimates':{b:content(report['arrays'][b]) for b in gri.BANDS},'diagnostics':{k:content(report['arrays'][k]) for k in DIAGNOSTICS},
        'parentReportCanonicalSha256':report['parentReportCanonicalSha256'],'planCanonicalSha256':report['planCanonicalSha256'],
        'policy':{'radii':[1,2,4,8],'absoluteConditionalRatio':3,'realSourceHaloPixels':8,
            'variance':'repeated-native-ids-combined-before-variance-cross-field-cauchy-bound',
            'supply':'known-bad-positive-different-run-completely-qualified-gri-with-nonoverlapping-mjd',
            'strong':'signed-raw-preserved-and-excluded-from-weak-neighbor-apertures','unknown':'raw-preserved-no-unknown-hole-bridging'},
        'counts':{k:report[k] for k in ('requestedTargets','changedEstimatePixels','qualifiedCenters','protectedCenters','commonRatioReached','radiusCounts')},
        'sourceScienceCorrection':'NONE','sourceAvailabilityCorrection':'NONE','qualityAdopted':False}
    return entry|{'schemaVersion':'sdss-dr17-display-optical-publication-v1','imageVersion':'sdss-display-optical-v1','publicationId':publication_id,
        'source':dict(legacy_source),
        'processing':{'runtimeNetwork':'forbidden',
            'modification':'Starward preserves bound calibrated already sky-subtracted SDSS g/r/i scientific samples. A separate display-only estimate follows qualified native-ID noise, repeated-ID covariance and conservative unknown cross-field covariance; known-bad samples may use a completely qualified different RUN with nonoverlapping MJD. Signed strong and true-unknown raw values stay unchanged; weak common apertures use radii 1/2/4/8 with real source halos. Official retained-SKY constant-edge reconstruction only supplies the variance model, not another sky subtraction or new celestial measurement. Each exact crop averages signed display estimates before the original frozen i/r/g Lupton parameters; original SCI area independently sets PNG alpha. No per-crop fit, source acquisition, PSF matching, synthetic detail or quality-mask inpainting. Historical processed display, not photometry, naked-eye natural colour, realtime imagery or quality certification.',
            'coverage':'Only these three centred TAN crops of one bound original scientific mother; displayed values are estimates, not new scientific measurements. Scientific validity, colour/weak structure/PSF/absolute astrometry and adopted quality remain unverified. No whole-sky optical coverage.'},
        'master':{'pixels':2048,'fieldDegrees':science['fieldDegrees'],'astrometry':'source-primary-linear-TAN-approximation','scientificValidity':'UNKNOWN','unit':'nanomaggies/pixel',
            'sourceFrames':frames,'science':{b:content(science['arrays'][b+'-science']) for b in gri.BANDS},
            'jointAvailability':content(science['arrays']['joint-availability'])|{'availablePixels':int(master.joint_available.sum())},
            'rgb':content(science['arrays']['rgb-master']),'transfer':{'recipe':report['sourceResolvedRecipe'],'validation':'WHOLE_MASTER_REPRODUCED'}},
        'display':display,'pyramid':{'method':'signed-display-estimate-mean-before-frozen-lupton-v1','validation':'DISPLAY_ESTIMATE_LEVELS_REPRODUCED',
            'statisticalFitCalls':0,'scienceCorrection':'NONE','rgbMasterRole':'REFERENCE_ONLY','unknownSamples':'excluded-from-mean-and-divisor',
            'displayAlpha':'original-rounded-coherent-sample-area-independent-of-processing-qualification-and-brightness'},'levels':levels}

def publish_verified_display(verified,output,*,root,publication_id,legacy_manifest,cancelled=None):
    root,output,legacy_manifest=root.resolve(),output.resolve(),legacy_manifest.resolve()
    def check():
        if cancelled is not None and cancelled():raise RuntimeError('sdss_display_packaging_cancelled')
    check()
    preserved=(verified.directory,legacy_manifest.parent,
        (root/verified.identities['scientificCandidateReceipt']['path']).parent,
        (root/verified.identities['previousCandidateReceipt']['path']).parent)
    if (not output.is_relative_to(root) or any(output.is_relative_to(p) for p in preserved) or
            any((root/v['path']).resolve().is_relative_to(output) for v in verified.bindings)):
        raise RuntimeError('sdss_display_output_overlaps_preserved_input')
    output.mkdir(parents=True,exist_ok=False)
    command=['node',str(root/'tools/run-node.cjs'),'--import','tsx',str(root/'data-pipelines/deep-sky/pack_sdss_display_publication.mts')]
    try:
        legacy_raw,legacy_id=bound_bytes(legacy_manifest,root=root,max_bytes=8*1024*1024);legacy=json.loads(legacy_raw)
        if legacy['objectRef']!=verified.receipt['objectRef']:raise RuntimeError('sdss_display_source_reference_mismatch')
        inputs=[*verified.bindings,legacy_id]
        for v in inputs:check();bound_file(root/v['path'],root=root,expected=v)
        code=[Path(__file__),root/'data-pipelines/deep-sky/optical_publication_io.py',root/'data-pipelines/deep-sky/publish_sdss_science.py',
            *(root/'data-pipelines/deep-sky'/n for n in IMPLEMENTATIONS),
            root/'data-pipelines/deep-sky/pack_sdss_display_publication.mts',root/'packages/miniapp-contracts/src/sdss-display-optical-publication.ts',
            root/'packages/miniapp-contracts/src/sdss-science-optical-publication.ts',root/'packages/miniapp-contracts/src/optical-publication-content.ts',root/'tools/run-node.cjs']
        code_before=[bound_file(p,root=root) for p in code]
        payload=display_publication_payload(verified,output,publication_id=publication_id,legacy_source=legacy['source']);check()
        for name,raw in (('display-candidate-receipt.json',verified.receipt_bytes),('science-candidate-receipt.json',verified.scientific_receipt_bytes)):
            with (output/name).open('xb') as stream:stream.write(raw)
        for name,key in (('execution-receipt.json','executionReceipt'),('previous-candidate-receipt.json','previousCandidateReceipt'),
                ('dependency-plan-receipt.json','dependencyPlanReceipt'),('source-inputs-receipt.json','sourceInputsReceipt')):
            identity=verified.identities[key];raw,_=bound_bytes(root/identity['path'],root=root,expected=identity,max_bytes=8*1024*1024)
            with (output/name).open('xb') as stream:stream.write(raw)
        raw=(json.dumps(payload,ensure_ascii=False,allow_nan=False,indent=2)+'\n').encode('utf-8')
        with (output/'publication-input.json').open('xb') as stream:stream.write(raw)
        process=subprocess.run(command,input=raw,cwd=root,capture_output=True,timeout=60,check=False);check()
        for name,body in (('node-cli-stdout.txt',process.stdout),('node-cli-stderr.txt',process.stderr)):
            with (output/name).open('xb') as stream:stream.write(body)
        if process.returncode!=0:raise RuntimeError('sdss_display_shared_ts_packaging_rejected:'+str(process.returncode))
        manifest=json.loads(process.stdout);returned={k:v for k,v in manifest.items() if k!='publicationHash'}
        returned['levels']={level:{k:v for k,v in asset.items() if k!='downloadUrl'} for level,asset in manifest['levels'].items()}
        if returned!=payload:raise RuntimeError('sdss_display_shared_ts_payload_changed')
        for v in inputs:check();bound_file(root/v['path'],root=root,expected=v)
        if [bound_file(p,root=root) for p in code]!=code_before:raise RuntimeError('sdss_display_owner_changed_during_packaging')
        check()
        with (output/'manifest.json').open('xb') as stream:stream.write(process.stdout)
        receipt={'status':'OFFLINE_OPT_IN_DISPLAY_CANDIDATE_PACKAGED','publicationHash':manifest['publicationHash'],
            'publicationHashOwner':'shared TypeScript sdssDisplayOpticalPublicationHash','nodeExitCode':process.returncode,
            'inputs':inputs,'implementation':code_before,'outputFiles':[bound_file(p,root=root) for p in sorted(output.rglob('*')) if p.is_file()],
            'qualityAdopted':False,'runtimeRegistered':False,'newAstronomicalSourceRequests':0,'newNoiseProjectionApertureOrFitRuns':0,
            'scope':__doc__}
        with (output/'writer-receipt.json').open('x',encoding='utf-8') as stream:json.dump(receipt,stream,ensure_ascii=False,allow_nan=False,indent=2);stream.write('\n')
        return receipt
    except Exception as error:
        with (output/'failed.json').open('x',encoding='utf-8') as stream:json.dump({'status':'OFFLINE_DISPLAY_WRITER_FAILED','error':repr(error)},stream,indent=2);stream.write('\n')
        raise
