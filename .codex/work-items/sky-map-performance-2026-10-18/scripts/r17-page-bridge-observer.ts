// Task-only observation owner. No payload, page, callback or frame history.
type SetData = (this: unknown, ...args: any[]) => any;
type Page = { setData: SetData };
type State = {
  available: number; enableDebug: boolean | null; submitted: number; completed: number;
  failed: number; failedBeforeCallback: number; callbackMissing: number;
  pending: number; inheritedPending: number; maxPending: number; duplicateCallback: number;
  latencyTotalMs: number; latencyMaxMs: number; keyCountTotal: number; maxKeyCount: number;
  keyCountFailures: number; sampledCalls: number; sampledBytes: number; maxSampledBytes: number;
  serializationFailures: number; sampling: boolean;
};
const limit = Number.MAX_SAFE_INTEGER;
const add = (left: number, right = 1) => Math.min(limit, left + Math.max(0, right));
const now = () => {
  try { if (typeof performance !== "undefined" && typeof performance.now === "function") return performance.now(); } catch {}
  return Date.now();
};
function fresh(): State {
  return { available: 0, enableDebug: null, submitted: 0, completed: 0, failed: 0,
    failedBeforeCallback: 0, callbackMissing: 0, pending: 0, inheritedPending: 0, maxPending: 0,
    duplicateCallback: 0, latencyTotalMs: 0, latencyMaxMs: 0, keyCountTotal: 0, maxKeyCount: 0,
    keyCountFailures: 0, sampledCalls: 0, sampledBytes: 0, maxSampledBytes: 0, serializationFailures: 0, sampling: false };
}
let current = fresh();
let bufferDataCalls = 0, totalTypedUploadBytes = 0, maxTypedUploadBytes = 0;
export function r17CreatePageBridgeState() { current = fresh(); return current; }
export function r17ReadEnableDebug(read: (() => unknown) | undefined): boolean | null {
  if (!read) return null;
  try { const value = (read() as { enableDebug?: unknown } | null)?.enableDebug; return typeof value === "boolean" ? value : null; }
  catch { return null; }
}
export function r17PageBridgeEnableDebug(value: boolean | null) { current.enableDebug = value; }
export function r17ResetPageBridgeObservation(enableDebug: boolean | null) {
  // Existing callbacks still own this same State; do not manufacture zero pending.
  current.enableDebug = enableDebug;
  current.inheritedPending = current.pending;
  current.submitted = current.completed = current.failed = current.failedBeforeCallback = current.callbackMissing = 0;
  current.maxPending = current.pending; current.duplicateCallback = 0;
  current.latencyTotalMs = current.latencyMaxMs = current.keyCountTotal = current.maxKeyCount = current.keyCountFailures = 0;
  current.sampledCalls = current.sampledBytes = current.maxSampledBytes = current.serializationFailures = 0;
  current.sampling = true;
  bufferDataCalls = totalTypedUploadBytes = maxTypedUploadBytes = 0;
}
export function r17StopPageBridgeSampling() { current.sampling = false; }
function utf8Bytes(text: string) {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes++;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length &&
      text.charCodeAt(index + 1) >= 0xdc00 && text.charCodeAt(index + 1) <= 0xdfff) { bytes += 4; index++; }
    else bytes += 3;
  }
  return bytes;
}
function inspectData(state: State, data: unknown) {
  // Count enumerable own keys without allocating Object.keys on every update.
  try {
    let count = 0;
    if (data !== null && (typeof data === "object" || typeof data === "function")) {
      for (const key in data) if (Object.prototype.hasOwnProperty.call(data, key)) count++;
    }
    state.keyCountTotal = add(state.keyCountTotal, count); state.maxKeyCount = Math.max(state.maxKeyCount, count);
  } catch { state.keyCountFailures = add(state.keyCountFailures); }
  if (!state.sampling || state.sampledCalls >= 16) return;
  state.sampledCalls++;
  try {
    // This local string is never retained, exported, logged, or passed elsewhere.
    const serialized = JSON.stringify(data);
    if (typeof serialized !== "string") throw new Error("unserializable_sample");
    const bytes = utf8Bytes(serialized);
    state.sampledBytes = add(state.sampledBytes, bytes); state.maxSampledBytes = Math.max(state.maxSampledBytes, bytes);
  } catch { state.serializationFailures = add(state.serializationFailures); }
}
export function r17AttachPageBridge(page: Page | null | undefined, state: State): () => void {
  current = state; state.available = 0;
  if (!page) return () => {};
  let original: SetData, descriptor: PropertyDescriptor | undefined;
  try {
    original = page.setData; descriptor = Object.getOwnPropertyDescriptor(page, "setData");
    if (typeof original !== "function" || (descriptor && (!Object.prototype.hasOwnProperty.call(descriptor, "value") || !descriptor.writable))) return () => {};
  } catch { return () => {}; }
  let installed = true;
  function wrapped(this: unknown, ...args: any[]) {
    if (!installed) return original.apply(this, args);
    state.submitted = add(state.submitted);
    inspectData(state, args[0]);
    const callback = args[1];
    let finished = false;
    if (typeof callback === "function") {
      const started = now();
      state.pending = add(state.pending); state.maxPending = Math.max(state.maxPending, state.pending);
      args[1] = function(this: unknown, ...callbackArgs: any[]) {
        if (finished) state.duplicateCallback = add(state.duplicateCallback);
        else {
          finished = true; state.pending = Math.max(0, state.pending - 1); state.completed = add(state.completed);
          const latency = Math.max(0, now() - started);
          if (Number.isFinite(latency)) { state.latencyTotalMs = add(state.latencyTotalMs, latency); state.latencyMaxMs = Math.max(state.latencyMaxMs, latency); }
        }
        // Preserve every invocation, callback receiver, arguments, return and throw.
        return callback.apply(this, callbackArgs);
      };
    } else state.callbackMissing = add(state.callbackMissing);
    try { return original.apply(this, args); }
    catch (error) {
      state.failed = add(state.failed);
      if (typeof callback === "function" && !finished) {
        finished = true; state.pending = Math.max(0, state.pending - 1); state.failedBeforeCallback = add(state.failedBeforeCallback);
      }
      throw error;
    }
  }
  try {
    Object.defineProperty(page, "setData", descriptor ? { ...descriptor, value: wrapped }
      : { configurable: true, enumerable: true, writable: true, value: wrapped });
    if (page.setData !== wrapped) throw new Error("set_data_wrapper_not_installed");
    state.available = 1;
  } catch { installed = false; return () => {}; }
  return () => {
    if (!installed) return;
    installed = false; state.available = 0; state.sampling = false;
    try {
      // Do not overwrite another owner's later replacement.
      if (page.setData === wrapped) {
        if (descriptor) Object.defineProperty(page, "setData", descriptor);
        else delete (page as Partial<Page>).setData;
      }
    } catch {}
  };
}
export function r17RecordTypedGpuUpload(length: number) {
  // Called only after the original bufferData returns; no copy/new typed array.
  const bytes = length * 4;
  if (!Number.isFinite(bytes) || bytes < 0) return;
  bufferDataCalls = add(bufferDataCalls); totalTypedUploadBytes = add(totalTypedUploadBytes, bytes);
  maxTypedUploadBytes = Math.max(maxTypedUploadBytes, bytes);
}
export function r17PageBridgeObservationStats() {
  const { sampling: _sampling, ...numeric } = current;
  return { ...numeric, bufferDataCalls, totalTypedUploadBytes, maxTypedUploadBytes };
}
