// TASK ONLY. Logical geometry reads and the existing hook's admission boundary.
// A fulfilled client Promise has passed matchingSkyGeometryWindow. This is not
// a network/HTTP/cache-hit, rendering or physical-presentation measurement.
import { r17ProbePayloadBytes } from "./r17-ruler-entry-runtime";
type Stamp = { value: number | null; epoch: number; windowId: number };
type Token = { run: number; id: number };
type Entry = [number, number, number | null, number, number | null, number | null, number | null, number | null, number];
type Pending = { signal: AbortSignal | undefined; abort: (() => void) | null; aborted: boolean };
const CAPACITY = 128, REQUEST_LIMIT = 64, WINDOW_LIMIT = 64, RESPONSE_LIMIT = 128, MAX = 1e12;
const plus = (value: number) => Math.min(MAX, value + 1);
const instant = (value: string) => { const parsed = Date.parse(value); return Number.isSafeInteger(parsed) ? parsed : null; };

export function createR17GeometryStages(readStamp: () => Stamp) {
  let running = false, start: Stamp | null = null, origin: number | null = null;
  let observed = 0, invalid = 0, requests = 0, omittedRequests = 0, unmatchedAdmissions = 0;
  let pendingAtStop = 0, responseRotations = 0, responseCount = 0, windowMisses = 0, ambiguousResponses = 0;
  let entries: Entry[] = [], windows = new Map<number, number>(), pending = new Map<number, Pending>();
  let responses = new WeakMap<object, number | null>();
  let lastAdmission: [number | null, number | null, number | null, number | null] | null = null;
  const current = (token: Token | null): token is Token => Boolean(running && token && start && token.run === start.windowId);
  const relative = (stamp: Stamp) => {
    if (!start || start.value === null || stamp.value === null || stamp.windowId !== start.windowId ||
      stamp.epoch !== start.epoch || stamp.value < start.value || stamp.value - start.value > 60000) return null;
    return stamp.value - start.value;
  };
  const target = (at: string) => {
    const value = instant(at);
    if (value === null) { invalid = plus(invalid); return null; }
    origin ??= value;
    return value - origin;
  };
  const window = (at: string) => {
    const value = instant(at);
    if (value === null) { invalid = plus(invalid); return null; }
    const existing = windows.get(value);
    if (existing !== undefined) return existing;
    if (windows.size >= WINDOW_LIMIT) { windowMisses = plus(windowMisses); return null; }
    const id = windows.size + 1; windows.set(value, id); return id;
  };
  function record(code: number, request: number | null = null, windowId: number | null = null,
    at: number | null = null, intent: number | null = null, detail = 0, stamp = readStamp()) {
    if (!running) return;
    observed = plus(observed);
    if (entries.length < CAPACITY) entries.push([observed, code, relative(stamp), stamp.epoch, request, windowId, at, intent, detail]);
  }
  function release(id: number) {
    const item = pending.get(id);
    try { if (item?.signal && item.abort) item.signal.removeEventListener("abort", item.abort); }
    catch { invalid = plus(invalid); }
    pending.delete(id);
  }
  function rejected(token: Token | null, synchronous: boolean) {
    if (!current(token) || !pending.has(token.id)) return;
    record(5, token.id, null, null, null, synchronous ? 1 : 0);
    release(token.id);
  }
  function stop() {
    if (!running) return;
    pendingAtStop = pending.size;
    running = false;
    for (const id of pending.keys()) release(id);
    // Weak keys never retain models. Retiring them also prevents inherited
    // responses from acquiring a made-up request identity in a later run.
    responses = new WeakMap(); responseCount = 0;
  }
  const snapshot = (count = entries.length) => ({
    schemaVersion: "starward-r17-geometry-stages-v1",
    meaning: "logical-client-call-validated-promise-current-hook-assignment-not-network-or-presentation",
    capacity: CAPACITY, requestLimit: REQUEST_LIMIT, windowLimit: WINDOW_LIMIT, responseLimit: RESPONSE_LIMIT,
    observed, dropped: observed - entries.length, overflow: observed > CAPACITY, exportOmitted: entries.length - count, invalid,
    requests, omittedRequests, unmatchedAdmissions, pendingAtStop, responseRotations, windowMisses, ambiguousResponses,
    windows: [...windows].map(([at, id]) => [id, origin === null ? null : at - origin]),
    entries: entries.slice(0, count).map(value => [...value]),
  });
  return {
    start(stamp: Stamp | null) {
      stop();
      start = stamp && { ...stamp }; running = stamp !== null; origin = null;
      observed = invalid = requests = omittedRequests = unmatchedAdmissions = 0;
      pendingAtStop = responseRotations = responseCount = windowMisses = ambiguousResponses = 0;
      entries = []; windows = new Map(); pending = new Map(); responses = new WeakMap(); lastAdmission = null;
    },
    stop,
    intent(id: number, at: string, stamp: Stamp) {
      if (running) record(1, null, null, target(at), id, 0, stamp);
    },
    request(at: string, windowAt: string, intent: number | null, signal?: AbortSignal): Token | null {
      if (!running || !start) return null;
      requests = plus(requests);
      if (pending.size >= REQUEST_LIMIT || requests >= MAX) { omittedRequests = plus(omittedRequests); return null; }
      const token = { run: start.windowId, id: requests };
      const item: Pending = { signal, abort: null, aborted: false };
      pending.set(token.id, item);
      record(2, token.id, window(windowAt), target(at), intent, signal ? signal.aborted ? 2 : 1 : 0);
      const aborted = (alreadyAborted = false) => {
        if (!current(token) || !pending.has(token.id) || item.aborted) return;
        item.aborted = true;
        record(3, token.id, null, null, null, alreadyAborted ? 1 : 0);
      };
      if (signal?.aborted) aborted(true);
      else if (signal) {
        item.abort = () => aborted();
        try { signal.addEventListener("abort", item.abort, { once: true }); }
        catch { invalid = plus(invalid); item.abort = null; }
      }
      return token;
    },
    watch<T>(token: Token | null, promise: Promise<T>) {
      if (!current(token)) return;
      // Observe the original Promise, and let the caller return it unchanged.
      // These callbacks retain only the scalar token, never a response/model.
      void promise.then(value => {
        if (!current(token) || !pending.has(token.id)) return;
        record(4, token.id);
        if (value !== null && typeof value === "object") {
          if (responseCount >= RESPONSE_LIMIT) { responses = new WeakMap(); responseCount = 0; responseRotations = plus(responseRotations); }
          // A 304/reused cache envelope can be shared by multiple actual calls.
          // Object identity then cannot identify which request the hook saw.
          const prior = responses.get(value);
          if (prior === undefined) { responses.set(value, token.id); responseCount++; }
          else if (prior !== null && prior !== token.id) { responses.set(value, null); ambiguousResponses = plus(ambiguousResponses); }
        }
        release(token.id);
      }, () => rejected(token, false)).catch(() => { /* optional observation cannot reject the product's original Promise */ });
    },
    rejected,
    admitted(response: object, at: string, windowAt: string, intent: number | null) {
      if (!running) return;
      const associated = responses.get(response), request = associated ?? null, windowId = window(windowAt), time = target(at);
      const identity: typeof lastAdmission = [request, windowId, time, intent];
      if (lastAdmission && identity.every((value, index) => value === lastAdmission![index])) return;
      lastAdmission = identity;
      if (request === null) unmatchedAdmissions = plus(unmatchedAdmissions);
      record(6, request, windowId, time, intent, associated === undefined ? 1 : associated === null ? 2 : 0);
    },
    attach<T extends object>(payload: T): T | (T & { geometryStages: object }) {
      if (!start) return payload;
      // Same writer budget, export only. Omission is explicit, never an empty
      // successful trace. Base metrics retain their existing refusal policy.
      let low = 0, high = entries.length;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (r17ProbePayloadBytes(JSON.stringify({ ...payload, geometryStages: snapshot(middle) })) <= 32768) low = middle;
        else high = middle - 1;
      }
      return { ...payload, geometryStages: snapshot(low) };
    },
  };
}
