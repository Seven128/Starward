// Finite source transform for one normal diagnostic candidate. Production and
// all frozen predecessors stay unchanged; rebuild the complete transformed tree.
function one(source,before,after,label){if(source.split(before).length!==2)throw Error('r25_memory_boundary_changed:'+label);return source.replace(before,after);}
export function addR25MemoryLifetime({controls,observation,time,transform,renderer,playTrialMs=60000}){
  if (![20000,60000].includes(playTrialMs)) throw Error('r25_finite_play_window_required');
  if (playTrialMs === 20000) {
    controls=one(controls,'  }, 60000);','  }, 20000);','device_owned_twenty_second_pause');
    controls=one(controls,'this finite trial uses the guarded 60s Pause.','this finite trial uses the guarded 20s Pause.','finite_pause_comment');
  }
  controls='import { r25MemoryStarted, r25MemoryHidden, r25MemoryScopeEnded, r25MemoryStatus, r25MemoryExport } from "./r25-memory-lifetime-adapter";\n'+controls;
  controls=one(controls,'  r17NormalPlayStartedReceipt(playGeneration);','  r17NormalPlayStartedReceipt(playGeneration);\n  r25MemoryStarted();','actual_normal_play');
  controls=one(controls,'return `Y${t.nativeGlyphCalls}', 'return `${r25MemoryStatus()} Y${t.nativeGlyphCalls}','capability_header');
  controls=one(controls,'useDidHide(() => {','useDidHide(() => { r25MemoryHidden();','hide_observation');
  controls=one(controls,'function retireManualInput() {','function retireManualInput() { r25MemoryScopeEnded();','context_scope_retirement');
  controls=one(controls,'onClick={() => void exportDiagnostic()}', 'onClick={() => { void exportDiagnostic(); void r25MemoryExport(); }}','same_export_retry');
  controls=one(controls,'正常Play按本次60秒同次暂停',`正常Play按本次${playTrialMs/1000}秒同次暂停；内存分点保存，90秒结束`,'declared_window');
  observation='import { r25MemoryRetired } from "./r25-memory-lifetime-adapter";\n'+observation;
  observation=one(observation,'export function r17NormalSurfaceRetired() { retired = true; }',
    'export function r17NormalSurfaceRetired() { retired = true; r25MemoryRetired(); }','actual_surface_retire');
  time='import { r25MemoryPaused } from "./r25-memory-lifetime-adapter";\n'+time;
  time=one(time,'state = { ...state, ...change }; r17Probe.intent(state); return state;',
    'const wasPlaying = state.mode === "PLAYING"; state = { ...state, ...change }; r17Probe.intent(state);\n    if (wasPlaying && state.mode !== "PLAYING") r25MemoryPaused(); return state;','actual_time_pause');
  transform='import { r25MemoryTrack } from "./r25-memory-lifetime-adapter";\n'+transform;
  transform=one(transform,'  const transmissions:Array<number|undefined>=new Array(count);',
    '  const transmissions:Array<number|undefined>=new Array(count);\n'+
    '  r25MemoryTrack("stellar-vectors",vectors,count); r25MemoryTrack("stellar-positions",positions,count);\n'+
    '  r25MemoryTrack("stellar-directions",directions,count); r25MemoryTrack("stellar-transmissions",transmissions,count);','actual_four_arrays');
  renderer='import { r25MemoryTrack } from "./r25-memory-lifetime-adapter";\n'+renderer;
  renderer=one(renderer,'          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);',
    '          const r25Upload = new Float32Array(data);\n'+
    '          r25MemoryTrack("gpu-upload-view",r25Upload,r25Upload.byteLength);\n'+
    '          r25MemoryTrack("gpu-upload-backing",r25Upload.buffer,r25Upload.byteLength);\n'+
    '          gl.bufferData(gl.ARRAY_BUFFER, r25Upload, gl.DYNAMIC_DRAW);','same_typed_upload');
  return {controls,observation,time,transform,renderer};
}
