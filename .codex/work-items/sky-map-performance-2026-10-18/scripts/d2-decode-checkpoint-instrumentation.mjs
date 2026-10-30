// Apply only to the next explicitly selected task candidate, after R25 wiring.
// No product file, frozen tree, scheduler, native method or cache is changed.
function one(source, before, after, label) {
  if (source.split(before).length !== 2) throw Error('d2_decode_boundary_changed:' + label);
  return source.replace(before, after);
}
export function addD2DecodeCheckpoint({ request, adapter }) {
  request = 'import { d2DecodeObservation } from "./d2-decode-observation";\n' + request;
  request = one(request, '  let pendingDecodeFail:(()=>void)|undefined;',
    '  let pendingDecodeFail:(()=>void)|undefined;\n  let d2ActiveDecode: ReturnType<typeof d2DecodeObservation.createAttempt> | null = null;', 'attempt_owner');
  request = one(request, '  const detach=()=>{pendingDecodeFail=undefined;',
    '  const detach=()=>{d2DecodeObservation.detached(d2ActiveDecode);d2ActiveDecode=null;pendingDecodeFail=undefined;', 'actual_detach');
  request = one(request, '    pendingDecodeFail=failed;\n    try{',
    '    pendingDecodeFail=failed;\n    const d2Attempt=d2DecodeObservation.createAttempt();d2ActiveDecode=d2Attempt;\n    try{', 'before_create');
  request = one(request, '      image=input.canvas.createImage();',
    '      image=input.canvas.createImage();d2DecodeObservation.created(d2Attempt);', 'create_returned');
  request = one(request, '      image.onload=()=>{\n        if(!current())return;',
    '      image.onload=()=>{\n        d2DecodeObservation.callback(d2Attempt,"load");\n        if(!current())return;', 'actual_load_callback');
  request = one(request, '        const retireBitmap=registerSkyNativeImageLifetime(decoded,()=>current()&&isCurrent());',
    '        const retireBitmap=d2DecodeObservation.withImageRetirement(registerSkyNativeImageLifetime(decoded,()=>current()&&isCurrent()),decoded,input.asset.width,input.asset.height);', 'explicit_image_claim');
  request = one(request, '      image.onerror=()=>decodeFailed();',
    '      image.onerror=()=>{d2DecodeObservation.callback(d2Attempt,"error");decodeFailed();};', 'actual_error_callback');
  request = one(request, '      if(current())image.src=decodePath;',
    '      if(current()){d2DecodeObservation.sourceAttempt(d2Attempt);image.src=decodePath;}', 'source_assignment_attempt');
  request = one(request, '    }catch(cause){decodeFailed(cause);}',
    '    }catch(cause){d2DecodeObservation.caughtSync(d2Attempt);decodeFailed(cause);}', 'same_sync_failure_path');
  adapter = 'import { d2DecodeObservation } from "./d2-decode-observation";\n' + adapter;
  adapter = one(adapter, 'schemaVersion: "starward-r25-memory-checkpoint-v1", variant: "baseline",',
    'schemaVersion: "starward-r25-memory-checkpoint-v2", variant: "baseline",', 'explicit_checkpoint_version');
  adapter = one(adapter, 'observation, owners: owners.snapshot() });',
    'observation, owners: owners.snapshot(), decode: d2DecodeObservation.snapshot() });', 'same_checkpoint_snapshot');
  adapter = one(adapter, '  if (!tracking) { probe.seal(); owners.release(); return false; }',
    '  // v2 keeps scalar decode drain checkpoints even when weak witnesses are unavailable.\n  // Old v1 capability/stopTracking behavior remains unchanged in its template.', 'decode_without_weakref');
  for (const phase of ['active-5', 'active-15', 'active-30']) adapter = one(adapter,
    `if (tracking) checkpoint("${phase}");`, `checkpoint("${phase}");`, 'decode_' + phase);
  return { request, adapter };
}
