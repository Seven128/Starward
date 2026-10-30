import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { displayRasterWindowBounds, displayRasterWindowKey, type DisplayRasterWindow } from "@starward/coordinate-system";
import { cloudInstant, type CloudDisplayWindowProof } from "@starward/miniapp-contracts";
import { SharedReadPool } from "../../workers/miniapp-api/src/shared-read-pool.ts";

export interface CloudDisplayExecutionBudget {
  deadlineAt: string;
  maximumConcurrent: number;
  maximumQueued: number;
  maximumOutputBytes: number;
}
export interface CloudDisplayExecutionSource {
  directory: string;
  manifestSha256: string;
  codeHashes: readonly string[];
}
export interface CloudDisplayRenderResult {
  png: Buffer;
  proof: CloudDisplayWindowProof;
  wallSeconds: number;
  cpuSeconds: number;
  sampledPeakRssBytes: number;
  geometryReused: boolean;
}
export type CloudDisplayProcessLauncher = (file: string, args: readonly string[], options: SpawnOptions) => ChildProcess;
const failure = (code: string) => new Error("cloud_display_" + code);

export class CloudDisplayDeadline {
  private readonly expires: number;
  private readonly monotonicEnd: number;
  constructor(readonly at: string) {
    const canonical = cloudInstant(at);
    if (!canonical) throw failure("execution_budget_invalid");
    this.expires = Date.parse(at);
    this.monotonicEnd = performance.now() + this.expires - Date.now();
    this.check();
  }
  remaining() { return Math.min(this.expires - Date.now(), this.monotonicEnd - performance.now()); }
  check(signal?: AbortSignal) {
    signal?.throwIfAborted();
    if (this.remaining() <= 0) throw failure("deadline_exceeded");
  }
}

export function validateCloudDisplayBudget(value: CloudDisplayExecutionBudget) {
  if (!value || !Number.isSafeInteger(value.maximumConcurrent) || value.maximumConcurrent < 1
    || !Number.isSafeInteger(value.maximumQueued) || value.maximumQueued < 0
    || !Number.isSafeInteger(value.maximumOutputBytes) || value.maximumOutputBytes < 1) throw failure("execution_budget_invalid");
  return new CloudDisplayDeadline(value.deadlineAt);
}

export function canonicalCloudDisplayWindow(window: DisplayRasterWindow): DisplayRasterWindow {
  if (!window || Object.keys(window).sort().join() !== ["grid", "zoom", "x", "y", "columns", "rows", "tilePixels"].sort().join())
    throw failure("window_invalid");
  displayRasterWindowBounds(window);
  if (window.columns > 3 || window.rows > 3) throw failure("window_invalid");
  return { grid: window.grid, zoom: window.zoom, x: window.x, y: window.y, columns: window.columns, rows: window.rows,
    tilePixels: window.tilePixels };
}

type Job = { id: number; window: DisplayRasterWindow; selectedAt: string; resolve(value: CloudDisplayRenderResult): void;
  reject(reason: unknown): void; cleanup(): void };
type ExitMetrics = { cpuSeconds: number; sampledPeakRssBytes: number };

/** One reusable, serial process. Termination is acknowledged by close, never
 * by the kill request or a rejected consumer Promise. No business worker runs. */
class DisplayProcess {
  readonly child: ChildProcess;
  readonly stopped: Promise<void>;
  private stoppedResolve!: () => void;
  private readonly ready: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (reason: unknown) => void;
  private job: Job | null = null;
  private sequence = 0;
  private reason: unknown = null;
  private closing = false;
  private exited = false;
  private metrics: ExitMetrics | null = null;
  inUse = false;
  usable = true;

  constructor(source: CloudDisplayExecutionSource, private readonly deadline: CloudDisplayDeadline,
    launch: CloudDisplayProcessLauncher, private readonly onExit: (worker: DisplayProcess, metrics: ExitMetrics | null) => void) {
    this.ready = new Promise((resolve, reject) => { this.readyResolve = resolve; this.readyReject = reject; });
    void this.ready.catch(() => undefined);
    this.stopped = new Promise(resolve => { this.stoppedResolve = resolve; });
    this.child = launch(process.execPath, [fileURLToPath(new URL("./cloud-display-process.mjs", import.meta.url))], {
      windowsHide: true, stdio: ["ignore", "ignore", "ignore", "ipc"], serialization: "advanced",
    });
    this.child.once("spawn", () => this.send({ type: "init", source }));
    this.child.on("message", message => this.receive(message));
    this.child.once("error", error => this.terminate(error));
    this.child.once("close", (code, signal) => {
      this.exited = true; this.usable = false;
      const reason = this.reason ?? failure("worker_exited");
      this.readyReject(reason);
      if (this.job) { const job = this.job; this.job = null; job.cleanup(); job.reject(reason); }
      // A report followed by an abnormal exit is not a completed drain.
      const metrics = this.closing && code === 0 && signal === null ? this.metrics : null;
      this.stoppedResolve(); this.onExit(this, metrics);
    });
  }

  private send(message: unknown) {
    if (!this.child.connected || this.exited) { this.terminate(failure("worker_disconnected")); return; }
    this.child.send(message as any, error => { if (error) this.terminate(error); });
  }

  private receive(raw: unknown) {
    const message = raw as { type?: string; id?: number; result?: CloudDisplayRenderResult; code?: string; metrics?: ExitMetrics };
    if (!message || typeof message !== "object") { this.terminate(failure("worker_protocol_invalid")); return; }
    if (message.type === "ready") { this.readyResolve(); return; }
    if (message.type === "failed") {
      const code = typeof message.code === "string" && /^cloud_(?:display|publication)_[a-z0-9_]+$/u.test(message.code)
        ? message.code : "cloud_display_worker_failed";
      this.terminate(new Error(code)); return;
    }
    if (message.type === "closed" && this.closing && !this.job) {
      const m = message.metrics;
      if (m && Number.isFinite(m.cpuSeconds) && m.cpuSeconds >= 0
        && Number.isSafeInteger(m.sampledPeakRssBytes) && m.sampledPeakRssBytes > 0) this.metrics = m;
      return;
    }
    const job = this.job, result = message.result;
    if (message.type !== "rendered" || !job || message.id !== job.id || !result || !Buffer.isBuffer(result.png)
      || result.png.byteLength < 1 || result.png.byteLength > 16 * 1024 * 1024) {
      this.terminate(failure("worker_protocol_invalid")); return;
    }
    try { this.deadline.check(); } catch (error) { this.terminate(error); return; }
    this.job = null; job.cleanup(); job.resolve(result);
  }

  render(window: DisplayRasterWindow, selectedAt: string, signal: AbortSignal) {
    signal.throwIfAborted(); this.deadline.check();
    if (!this.usable || this.closing || this.job) throw failure("worker_unavailable");
    return new Promise<CloudDisplayRenderResult>((resolve, reject) => {
      const cancel = () => this.terminate(signal.reason);
      const job: Job = { id: ++this.sequence, window, selectedAt, resolve, reject,
        cleanup: () => signal.removeEventListener("abort", cancel) };
      this.job = job;
      signal.addEventListener("abort", cancel, { once: true });
      this.ready.then(() => {
        if (this.job !== job || !this.usable) return;
        if (signal.aborted) { cancel(); return; }
        try { this.deadline.check(); this.send({ type: "render", id: job.id, window, selectedAt }); }
        catch (error) { this.terminate(error); }
      }, error => this.terminate(error));
      if (signal.aborted) cancel();
    });
  }

  terminate(reason: unknown) {
    this.reason ??= reason; this.usable = false;
    if (!this.exited) this.child.kill("SIGKILL");
    return this.stopped;
  }

  async close() {
    if (this.exited) return;
    if (!this.usable || this.job) { await this.terminate(this.reason ?? failure("execution_closed")); return; }
    if (!this.closing) {
      this.closing = true;
      try { await this.ready; this.send({ type: "close" }); }
      catch (error) { await this.terminate(error); }
    }
    await this.stopped;
  }
}

type Waiting = { signal: AbortSignal; resolve(worker: DisplayProcess): void; reject(reason: unknown): void; cancel(): void };

/** Offline execution sessions only. Same-key in-flight sharing uses the
 * existing owner; completed images stay with the batch/file owner, not here. */
export class CloudDisplayExecution {
  private readonly shared = new SharedReadPool<CloudDisplayRenderResult>(() => failure("render_cancelled"));
  private readonly workers = new Set<DisplayProcess>();
  private readonly idle: DisplayProcess[] = [];
  private readonly queue: Waiting[] = [];
  private readonly work = new Set<Promise<CloudDisplayRenderResult>>();
  private readonly deadline: CloudDisplayDeadline;
  private timer: ReturnType<typeof setTimeout>;
  private closed: unknown = null;
  private draining: Promise<void> | null = null;
  private starts = 0;
  private exits = 0;
  private completed = 0;
  private geometryReuses = 0;
  private peakProcesses = 0;
  private cpuSeconds = 0;
  private sampledPeakRssBytes = 0;
  private measuredExits = 0;

  constructor(private readonly source: CloudDisplayExecutionSource, private readonly budget: CloudDisplayExecutionBudget,
    private readonly launch: CloudDisplayProcessLauncher = spawn) {
    if (!path.isAbsolute(source.directory) || !/^[a-f0-9]{64}$/u.test(source.manifestSha256)
      || source.codeHashes.length !== 8 || source.codeHashes.some(hash => !/^[a-f0-9]{64}$/u.test(hash))) throw failure("execution_source_invalid");
    this.source = { ...source, directory: path.resolve(source.directory), codeHashes: [...source.codeHashes] };
    this.budget = { ...budget };
    this.deadline = validateCloudDisplayBudget(budget);
    // Node clamps longer timers to 1ms. The check preserves the absolute
    // deadline without turning a long explicit budget into an early abort.
    const expire = () => {
      if (this.deadline.remaining() > 0) {
        this.timer = setTimeout(expire, Math.min(2_147_483_647, Math.max(1, Math.ceil(this.deadline.remaining())))); return;
      }
      const reason = failure("deadline_exceeded");
      this.closed = reason; this.shared.close(reason);
      for (const worker of this.workers) void worker.terminate(reason);
      void this.close();
    };
    this.timer = setTimeout(expire, Math.min(2_147_483_647, Math.max(1, Math.ceil(this.deadline.remaining()))));
  }

  run(window: DisplayRasterWindow, rawAt: string, signal?: AbortSignal) {
    if (this.closed) return Promise.reject(this.closed);
    this.deadline.check(signal);
    const selectedAt = cloudInstant(rawAt);
    if (!selectedAt) throw failure("render_input_invalid");
    const canonical = canonicalCloudDisplayWindow(window);
    const key = JSON.stringify([path.resolve(this.source.directory), this.source.manifestSha256,
      this.source.codeHashes, displayRasterWindowKey(canonical), selectedAt]);
    return this.shared.run(key, controller => {
      const operation = this.perform(canonical, selectedAt, controller.signal);
      this.work.add(operation);
      void operation.then(() => this.work.delete(operation), () => this.work.delete(operation));
      return operation;
    }, signal);
  }

  private async perform(window: DisplayRasterWindow, selectedAt: string, signal: AbortSignal) {
    const worker = await this.admit(signal);
    try {
      const result = await worker.render(window, selectedAt, signal);
      signal.throwIfAborted(); this.deadline.check();
      this.completed++; if (result.geometryReused) this.geometryReuses++;
      return result;
    } finally {
      if (this.closed || !worker.usable || signal.aborted) {
        if (signal.aborted) await worker.terminate(signal.reason); else await worker.close();
        this.workers.delete(worker);
      } else this.idle.push(worker);
      worker.inUse = false; this.pump();
    }
  }

  private create() {
    const worker = new DisplayProcess(this.source, this.deadline, this.launch, (stopped, metrics) => {
      this.exits++;
      if (metrics) {
        this.measuredExits++; this.cpuSeconds += metrics.cpuSeconds;
        this.sampledPeakRssBytes = Math.max(this.sampledPeakRssBytes, metrics.sampledPeakRssBytes);
      }
      if (!stopped.inUse) {
        this.workers.delete(stopped);
        const index = this.idle.indexOf(stopped); if (index >= 0) this.idle.splice(index, 1);
        this.pump();
      }
    });
    this.starts++; this.workers.add(worker); worker.inUse = true;
    this.peakProcesses = Math.max(this.peakProcesses, this.workers.size);
    return worker;
  }

  private take() {
    const worker = this.idle.shift() ?? this.create(); worker.inUse = true; return worker;
  }

  private admit(signal: AbortSignal): Promise<DisplayProcess> {
    signal.throwIfAborted(); this.deadline.check();
    if (this.closed) throw this.closed;
    if (!this.queue.length && (this.idle.length || this.workers.size < this.budget.maximumConcurrent)) return Promise.resolve(this.take());
    if (this.queue.length >= this.budget.maximumQueued) throw failure("render_queue_full");
    return new Promise((resolve, reject) => {
      const entry: Waiting = { signal, resolve, reject, cancel: () => {
        const index = this.queue.indexOf(entry);
        if (index < 0) return;
        this.queue.splice(index, 1); signal.removeEventListener("abort", entry.cancel); reject(signal.reason);
      } };
      this.queue.push(entry); signal.addEventListener("abort", entry.cancel, { once: true });
      if (signal.aborted) entry.cancel();
    });
  }

  private pump() {
    while (!this.closed && this.queue.length && (this.idle.length || this.workers.size < this.budget.maximumConcurrent)) {
      const next = this.queue.shift()!; next.signal.removeEventListener("abort", next.cancel);
      if (next.signal.aborted) { next.reject(next.signal.reason); continue; }
      try { this.deadline.check(); next.resolve(this.take()); } catch (error) { next.reject(error); }
    }
  }

  observation() {
    return { processStarts: this.starts, processExits: this.exits, liveProcesses: this.workers.size, queued: this.queue.length,
      completed: this.completed, geometryReuses: this.geometryReuses, peakProcesses: this.peakProcesses,
      cpuSeconds: this.cpuSeconds, sampledPeakRssBytes: this.sampledPeakRssBytes, measuredExits: this.measuredExits,
      cpuMeasurementComplete: this.measuredExits === this.exits && this.exits === this.starts,
      measurementScope: "sum of owned render-process CPU; maximum sampled single-process RSS; excludes parent and tsx helper CPU" };
  }

  close(): Promise<void> {
    if (this.draining) return this.draining;
    this.closed ??= failure("execution_closed"); this.shared.close(this.closed as Error);
    this.draining = Promise.allSettled([...this.work]).then(async () => {
      await Promise.all([...this.workers].map(worker => worker.close()));
      this.workers.clear(); this.idle.length = 0; clearTimeout(this.timer);
    });
    return this.draining;
  }
}
