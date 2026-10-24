import type { ForecastPrimaryAcquisition } from "../forecast/forecast-query-service";
import { clearTimeout, setImmediate, setTimeout } from "node:timers";
import { requireNotificationRuleActor, type NotificationRuleActor } from "./rule-service";
import { notificationWeatherAcquisition } from "./weather-acquisition";
import type { NotificationObservedSource, SqliteNotificationInboxRepository } from "./sqlite-inbox-repository";
import { commandDigest } from "../../persistence/command-transaction";
export type NotificationInboxRepository = Pick<SqliteNotificationInboxRepository,
  "enqueue" | "controls" | "setControls" | "activity" | "inbox" | "processSourceIntent" | "processSourceBatch" | "processDueBatch" | "nextDue" | "hasImmediateWork" | "hasUnconfirmedSources" | "acceptedSource" | "retireObservedSource">;

/** A single module-owned worker drains durable source/candidate pages. Timers
 * wake only for an actual due/expiry boundary, never to poll a user's provider. */
export class NotificationEvaluationService {
  private running: Promise<void> | null = null;
  private rerun = false;
  private closed = false;
  private failed = false;
  private readonly unconfirmed = new Map<string, { header: NotificationObservedSource; digest: string }>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private readonly repository: NotificationInboxRepository, private readonly now = () => new Date()) {
    void this.kick().catch(() => undefined);
  }
  acceptForecast(input: ForecastPrimaryAcquisition): void {
    if (this.closed) throw new Error("notification_evaluation_closed");
    const event = notificationWeatherAcquisition(input), { hours: _hours, ...header } = event;
    try { this.repository.enqueue(event); this.unconfirmed.delete(event.id); }
    catch (error) { this.failed = true; this.unconfirmed.set(event.id, { header, digest: commandDigest(event) }); throw error; }
    void this.kick().catch(() => undefined);
  }
  controls(actor: NotificationRuleActor | null) { return this.repository.controls(requireNotificationRuleActor(actor).id); }
  command(actor: NotificationRuleActor | null, value: unknown) {
    const result = this.repository.setControls(requireNotificationRuleActor(actor).id, value, this.now().toISOString());
    void this.kick().catch(() => undefined);
    return result;
  }
  async activity(actor: NotificationRuleActor | null, id: string) {
    const owner = requireNotificationRuleActor(actor);
    void this.kick().catch(() => undefined);
    return { ...this.repository.activity(owner.id, id), evaluationStatus: this.status() };
  }
  async inbox(actor: NotificationRuleActor | null, cursor?: number) {
    const owner = requireNotificationRuleActor(actor);
    void this.kick().catch(() => undefined);
    return { ...this.repository.inbox(owner.id, this.now().getTime(), cursor, this.unconfirmedSources()), evaluationStatus: this.status() };
  }
  private unconfirmedSources(): NotificationObservedSource[] {
    const now = this.now().getTime();
    for (const [id, value] of this.unconfirmed) {
      try {
        if (this.repository.acceptedSource(id, value.digest)) this.unconfirmed.delete(id);
        else if (Date.parse(value.header.source.expiresAt) <= now) {
          // Persist its retired observation watermark before dropping the
          // volatile fallback. Older evidence must not become current again.
          this.repository.retireObservedSource(value.header, value.digest, now); this.unconfirmed.delete(id);
        }
      } catch { /* Retain the known qualifier while durable read/write is unavailable. */ }
    }
    return [...this.unconfirmed.values()].map(value => value.header);
  }
  private status(): "ready" | "processing" | "unavailable" {
    const now = this.now().getTime();
    const unconfirmed = this.unconfirmedSources().some(header => Date.parse(header.source.expiresAt) > now) || this.repository.hasUnconfirmedSources(now);
    return this.failed || unconfirmed ? "unavailable" : this.repository.hasImmediateWork(now) ? "processing" : "ready";
  }
  private kick(): Promise<void> {
    if (this.closed) return Promise.resolve();
    this.rerun = true;
    if (this.running) return this.running;
    clearTimeout(this.timer); this.timer = undefined;
    const task = (async () => {
      while (!this.closed) {
        this.rerun = false;
        let failure: unknown, intentWork = false, sourceWork = false, dueWork = false;
        try { intentWork = this.repository.processSourceIntent(this.now().getTime()); } catch (error) { failure = error; }
        try { sourceWork = this.repository.processSourceBatch(this.now().getTime()); } catch (error) { failure ??= error; }
        try { dueWork = this.repository.processDueBatch(this.now().getTime(), this.unconfirmedSources()); } catch (error) { failure ??= error; }
        if (failure) throw failure;
        if (!intentWork && !sourceWork && !dueWork) { this.failed = false; break; }
        await new Promise<void>(resolve => setImmediate(resolve));
      }
    })().catch(error => { this.failed = true; throw error; });
    const owned = task.finally(() => {
      if (this.running !== owned) return;
      this.running = null;
      if (this.closed) return;
      if (this.rerun) { void this.kick().catch(() => undefined); return; }
      // A failed batch retains its cursor/input; a later source or explicit
      // read retries it. Do not start an unchanged failure loop.
    });
    this.running = owned;
    void owned.then(() => this.arm(), () => this.arm(false));
    return owned;
  }
  private arm(allowImmediate = true): void {
    if (this.closed || this.running) return;
    clearTimeout(this.timer); this.timer = undefined;
    let next: number | null;
    try { next = this.repository.nextDue(); } catch { return; }
    if (next === null) return;
    if (!allowImmediate && next <= this.now().getTime()) return;
    this.timer = setTimeout(() => { this.timer = undefined; void this.kick().catch(() => undefined); }, Math.max(1, Math.min(2_147_483_647, next - this.now().getTime())));
    const timer: unknown = this.timer;
    if (timer && typeof timer === "object" && "unref" in timer && typeof timer.unref === "function") timer.unref();
  }
  async flush(): Promise<void> {
    // Explicit operational/test drain only. Ordinary history/activity reads
    // return committed data plus processing state, never this global barrier.
    let task = this.kick();
    while (true) {
      await task;
      if (!this.running) return;
      task = this.running;
    }
  }
  async close(): Promise<void> {
    this.closed = true; clearTimeout(this.timer); this.timer = undefined;
    try { await this.running; } catch { /* Unprocessed durable pages remain available after reopen. */ }
  }
}
