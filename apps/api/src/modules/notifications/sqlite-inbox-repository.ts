import { DatabaseSync } from "node:sqlite";
import type { NotificationRule } from "../../../../../packages/domain/src/notifications/rules";
import { NotificationEvaluationError, nextNotificationAllowed, notificationRuleSupport, notificationThreshold,
  parseNotificationControlsCommand, type NotificationControls, type NotificationControlsResult,
  type NotificationInboxMessage, type NotificationInboxPage, type NotificationRuleActivity,
  type NotificationSourceSnapshot, type NotificationTriggerSnapshot, type NotificationWeatherAcquisition,
  type NotificationWeatherMetric } from "../../../../../packages/domain/src/notifications/evaluation";
import { commandDigest, commitWithReceipt } from "../../persistence/command-transaction";

// Reuse the rule-library page size for bounded source fan-out and inbox reads.
const PAGE = 50;
interface Candidate {
  id: string; ownerId: string; signal: string; dueAt: string;
  trigger: NotificationTriggerSnapshot; evidence: { value: number; source: NotificationSourceSnapshot };
}
interface QualifiedWindow { hourAt: string; window: { startUtc: string; endUtc: string }; query: NotificationWeatherAcquisition["query"]; astronomyAlgorithmVersion: string }
interface Edge extends QualifiedWindow { acquiredAt: string; expiresAt: string; value: number | null; condition: boolean | null; dataVersion: string; source: NotificationSourceSnapshot }
export type NotificationObservedSource = Omit<NotificationWeatherAcquisition, "hours">;
const sourceScope = (query: NotificationWeatherAcquisition["query"], source: Pick<NotificationSourceSnapshot, "provider" | "model">) =>
  JSON.stringify([query.latitude, query.longitude, query.target, source.provider, source.model]);
type Row = { body: string };
export class SqliteNotificationInboxRepository {
  private readonly db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS notification_evaluation_schema(version INTEGER NOT NULL);
      INSERT INTO notification_evaluation_schema SELECT 1 WHERE NOT EXISTS(SELECT 1 FROM notification_evaluation_schema);
      CREATE INDEX IF NOT EXISTS notification_rule_point_target ON notification_rules(
        json_extract(body,'$.definition.location.latitude'), json_extract(body,'$.definition.location.longitude'), json_extract(body,'$.definition.target'), id)
        WHERE json_extract(body,'$.definition.location.kind')='place';
      CREATE TABLE IF NOT EXISTS notification_controls(actor_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS notification_control_receipts(actor_id TEXT NOT NULL, command_key TEXT NOT NULL, input_digest TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(actor_id,command_key));
      CREATE TABLE IF NOT EXISTS notification_source_events(id TEXT PRIMARY KEY, digest TEXT NOT NULL, acquired_at TEXT NOT NULL, source_body TEXT NOT NULL, payload TEXT, cursor TEXT NOT NULL DEFAULT '', complete INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS notification_source_pending ON notification_source_events(complete,acquired_at,id);
      CREATE TABLE IF NOT EXISTS notification_source_readiness(id TEXT PRIMARY KEY, digest TEXT NOT NULL, scope_key TEXT NOT NULL, acquired_at TEXT NOT NULL, expires_at TEXT NOT NULL, status TEXT NOT NULL, source_body TEXT NOT NULL, payload TEXT);
      CREATE INDEX IF NOT EXISTS notification_readiness_scope ON notification_source_readiness(scope_key,acquired_at DESC);
      CREATE INDEX IF NOT EXISTS notification_readiness_pending ON notification_source_readiness(status,expires_at,acquired_at);
      CREATE TABLE IF NOT EXISTS notification_edges(rule_id TEXT NOT NULL, rule_revision INTEGER NOT NULL, signal TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(rule_id,rule_revision,signal));
      CREATE INDEX IF NOT EXISTS notification_edges_future ON notification_edges(rule_id,rule_revision,json_extract(body,'$.window.endUtc'));
      CREATE TABLE IF NOT EXISTS notification_rule_evaluations(event_id TEXT NOT NULL, rule_id TEXT NOT NULL, rule_revision INTEGER NOT NULL, acquired_at TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(event_id,rule_id,rule_revision));
      CREATE INDEX IF NOT EXISTS notification_rule_latest_evaluation ON notification_rule_evaluations(rule_id,rule_revision,acquired_at DESC);
      CREATE TABLE IF NOT EXISTS notification_inbox_candidates(id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, rule_id TEXT NOT NULL, rule_revision INTEGER NOT NULL, signal TEXT NOT NULL, status TEXT NOT NULL, reason TEXT, due_at TEXT NOT NULL, next_at TEXT NOT NULL, evidence_expiry TEXT NOT NULL, window_end TEXT NOT NULL, body TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS notification_candidate_due ON notification_inbox_candidates(status,next_at);
      CREATE INDEX IF NOT EXISTS notification_candidate_window ON notification_inbox_candidates(status,window_end);
      CREATE INDEX IF NOT EXISTS notification_candidate_signal ON notification_inbox_candidates(rule_id,rule_revision,signal,status);
      CREATE TABLE IF NOT EXISTS notification_inbox(id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, rule_id TEXT NOT NULL, origin_event_id TEXT NOT NULL, signal TEXT NOT NULL, delivered_at TEXT NOT NULL, body TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS notification_inbox_owner ON notification_inbox(actor_id,delivered_at DESC);
      CREATE INDEX IF NOT EXISTS notification_inbox_cooldown ON notification_inbox(actor_id,rule_id,delivered_at DESC);`);
    this.db.exec("CREATE INDEX IF NOT EXISTS notification_inbox_source_event ON notification_inbox(actor_id,rule_id,origin_event_id,delivered_at DESC)");
    const version = this.db.prepare("SELECT version FROM notification_evaluation_schema").all() as Array<{ version: number }>;
    if (version.length !== 1 || version[0].version !== 1) { this.db.close(); throw new Error("notification_evaluation_schema_unsupported"); }
  }
  private transaction<T>(effect: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = effect(); this.db.exec("COMMIT"); return result; }
    catch (error) { try { this.db.exec("ROLLBACK"); } catch {} throw error; }
  }
  private rule(actorId: string, id: string): NotificationRule | null {
    const row = this.db.prepare("SELECT body FROM notification_rules WHERE actor_id=? AND id=?").get(actorId, id) as Row | undefined;
    return row ? JSON.parse(row.body) as NotificationRule : null;
  }
  controls(actorId: string): NotificationControls {
    const row = this.db.prepare("SELECT body FROM notification_controls WHERE actor_id=?").get(actorId) as Row | undefined;
    return row ? JSON.parse(row.body) as NotificationControls : {
      schemaVersion: "starward-notification-controls-v1", ownerId: actorId, revision: 0, updatedAt: null,
      enabled: false, categories: { pretrip: false, "long-term": false },
    };
  }
  setControls(actorId: string, value: unknown, at: string): NotificationControlsResult {
    const command = parseNotificationControlsCommand(value);
    if (command.expectedOwnerId !== actorId) throw new NotificationEvaluationError("notification_controls_owner_mismatch", 403);
    const result = commitWithReceipt(this.db, { actorId, key: command.idempotencyKey, digest: commandDigest(command), receiptTable: "notification_control_receipts",
      conflict: () => new NotificationEvaluationError("notification_controls_idempotency_conflict", 409) }, () => {
      const current = this.controls(actorId);
      if (current.revision !== command.baseRevision) throw new NotificationEvaluationError("notification_controls_revision_conflict", 409);
      const controls: NotificationControls = { ...current, enabled: command.enabled, categories: command.categories, revision: current.revision + 1, updatedAt: at };
      this.db.prepare("INSERT INTO notification_controls(actor_id,revision,body) VALUES (?,?,?) ON CONFLICT(actor_id) DO UPDATE SET revision=excluded.revision,body=excluded.body").run(actorId, controls.revision, JSON.stringify(controls));
      for (const category of ["pretrip", "long-term"] as const) if (!controls.enabled || !controls.categories[category]) {
        this.db.prepare("UPDATE notification_inbox_candidates SET status='cancelled',reason='controls-disabled' WHERE actor_id=? AND status IN ('scheduled','awaiting-evidence') AND json_extract(body,'$.trigger.category')=?").run(actorId, category);
      }
      return { schemaVersion: "starward-notifications-v1" as const, replayed: false, controls,
        receipt: { idempotencyKey: command.idempotencyKey, revision: controls.revision, committedAt: at } };
    });
    return { ...result.value, replayed: result.replayed };
  }
  enqueue(event: NotificationWeatherAcquisition): void {
    const digest = commandDigest(event);
    const { hours: _hours, ...header } = event;
    // The observation remains known even if the following event enqueue fails.
    // A separate committed intent retains the exact input for safe replay.
    this.transaction(() => {
      const old = this.db.prepare("SELECT digest FROM notification_source_readiness WHERE id=?").get(event.id) as { digest: string } | undefined;
      if (old) { if (old.digest !== digest) throw new NotificationEvaluationError("notification_source_identity_conflict", 409); return; }
      this.db.prepare("INSERT INTO notification_source_readiness(id,digest,scope_key,acquired_at,expires_at,status,source_body,payload) VALUES (?,?,?,?,?,'pending',?,?)")
        .run(event.id, digest, sourceScope(event.query, event.source), event.source.acquiredAt, event.source.expiresAt, JSON.stringify(header), JSON.stringify(event));
    });
    this.transaction(() => {
      const old = this.db.prepare("SELECT digest FROM notification_source_events WHERE id=?").get(event.id) as { digest: string } | undefined;
      if (old && old.digest !== digest) throw new NotificationEvaluationError("notification_source_identity_conflict", 409);
      if (!old) this.db.prepare("INSERT INTO notification_source_events(id,digest,acquired_at,source_body,payload) VALUES (?,?,?,?,?)").run(event.id, digest, event.source.acquiredAt, JSON.stringify(header), JSON.stringify(event));
      this.db.prepare("UPDATE notification_source_readiness SET status='accepted',payload=NULL WHERE id=? AND digest=?").run(event.id, digest);
    });
  }
  processSourceIntent(now: number): boolean {
    const at = new Date(now).toISOString();
    const expired = this.db.prepare("SELECT id FROM notification_source_readiness WHERE status='pending' AND expires_at<=? LIMIT ?").all(at, PAGE) as Array<{ id: string }>;
    if (expired.length) {
      this.transaction(() => { for (const row of expired) this.db.prepare("UPDATE notification_source_readiness SET status='retired-expired',payload=NULL WHERE id=? AND status='pending'").run(row.id); });
      return true;
    }
    const row = this.db.prepare("SELECT payload FROM notification_source_readiness WHERE status='pending' ORDER BY acquired_at,id LIMIT 1").get() as { payload: string } | undefined;
    if (!row) return false;
    this.enqueue(JSON.parse(row.payload) as NotificationWeatherAcquisition);
    return true;
  }
  hasUnconfirmedSources(now: number): boolean {
    return !!this.db.prepare("SELECT 1 FROM notification_source_readiness WHERE status='pending' AND expires_at>? LIMIT 1").get(new Date(now).toISOString());
  }
  acceptedSource(id: string, digest: string): boolean {
    return !!this.db.prepare("SELECT 1 FROM notification_source_readiness r JOIN notification_source_events e ON e.id=r.id AND e.digest=r.digest WHERE r.id=? AND r.digest=? AND r.status='accepted' LIMIT 1").get(id, digest);
  }
  retireObservedSource(header: NotificationObservedSource, digest: string, now: number): void {
    if (Date.parse(header.source.expiresAt) > now) throw new Error("notification_source_not_expired");
    this.transaction(() => {
      const row = this.db.prepare("SELECT digest,status FROM notification_source_readiness WHERE id=?").get(header.id) as { digest: string; status: string } | undefined;
      if (row) {
        if (row.digest !== digest) throw new NotificationEvaluationError("notification_source_identity_conflict", 409);
        if (row.status === "pending") this.db.prepare("UPDATE notification_source_readiness SET status='retired-expired',payload=NULL WHERE id=?").run(header.id);
      } else this.db.prepare("INSERT INTO notification_source_readiness(id,digest,scope_key,acquired_at,expires_at,status,source_body,payload) VALUES (?,?,?,?,?,'retired-expired',?,NULL)")
        .run(header.id, digest, sourceScope(header.query, header.source), header.source.acquiredAt, header.source.expiresAt, JSON.stringify(header));
    });
  }
  private observedAfter(query: NotificationWeatherAcquisition["query"], source: Pick<NotificationSourceSnapshot, "provider" | "model" | "acquiredAt">,
    volatile: readonly NotificationObservedSource[] = []): boolean {
    const scope = sourceScope(query, source);
    if (volatile.some(item => sourceScope(item.query, item.source) === scope && item.source.acquiredAt > source.acquiredAt)) return true;
    // Even an expired unresolved observation cannot revive older truth. Its
    // compact watermark remains after the processing payload retires.
    return !!this.db.prepare("SELECT 1 FROM notification_source_readiness WHERE scope_key=? AND acquired_at>? LIMIT 1").get(scope, source.acquiredAt);
  }
  processSourceBatch(now: number): boolean {
    return this.transaction(() => {
      const row = this.db.prepare("SELECT id,payload,cursor FROM notification_source_events WHERE complete=0 ORDER BY acquired_at,id LIMIT 1").get() as { id: string; payload: string; cursor: string } | undefined;
      if (!row) return false;
      const event = JSON.parse(row.payload) as NotificationWeatherAcquisition;
      const rows = this.db.prepare(`SELECT id,body FROM notification_rules WHERE json_extract(body,'$.definition.location.kind')='place'
        AND json_extract(body,'$.definition.location.latitude')=? AND json_extract(body,'$.definition.location.longitude')=?
        AND json_extract(body,'$.definition.target')=? AND id>? ORDER BY id LIMIT ?`).all(event.query.latitude, event.query.longitude, event.query.target, row.cursor, PAGE) as Array<Row & { id: string }>;
      for (const item of rows) this.evaluate(JSON.parse(item.body) as NotificationRule, event, now);
      if (rows.length < PAGE) {
        // Retire the temporary normalized processing payload. Immutable source
        // identity/digest and rule/trigger evidence remain in their owners.
        this.db.prepare("UPDATE notification_source_events SET cursor=?,complete=1,payload=NULL WHERE id=?").run(rows.at(-1)?.id ?? row.cursor, row.id);
      } else this.db.prepare("UPDATE notification_source_events SET cursor=? WHERE id=?").run(rows.at(-1)!.id, row.id);
      return true;
    });
  }
  private evaluate(rule: NotificationRule, event: NotificationWeatherAcquisition, now: number): void {
    if (this.db.prepare("SELECT 1 FROM notification_rule_evaluations WHERE event_id=? AND rule_id=? AND rule_revision=?").get(event.id, rule.id, rule.revision)) return;
    this.db.prepare("UPDATE notification_inbox_candidates SET status='cancelled',reason='rule-changed' WHERE rule_id=? AND rule_revision<>? AND status IN ('scheduled','awaiting-evidence')").run(rule.id, rule.revision);
    const unsupported = notificationRuleSupport(rule), control = this.controls(rule.ownerId), d = rule.definition;
    let status = unsupported ?? (Date.parse(event.source.expiresAt) <= now ? "source-expired"
      : Date.parse(event.source.acquiredAt) > now ? "source-time-unconfirmed" : Date.parse(rule.updatedAt) > Date.parse(event.source.acquiredAt) ? "rule-newer-than-source" : "evaluated");
    let consideredWindows = 0, queued = 0;
    if (status === "evaluated") {
      const enabled = d.enabled && control.enabled && control.categories[d.category]
        && control.updatedAt !== null && Date.parse(control.updatedAt) <= Date.parse(event.source.acquiredAt);
      if (!enabled) status = "controls-disabled";
      if (d.expiresAt && Date.parse(d.expiresAt) <= now) status = "rule-expired";
      const metric = d.threshold.metric as NotificationWeatherMetric;
      const windows = new Map<string, QualifiedWindow>();
      const oldWindows = this.db.prepare("SELECT signal,body FROM notification_edges WHERE rule_id=? AND rule_revision=? AND json_extract(body,'$.window.endUtc')>?").all(rule.id, rule.revision, new Date(now).toISOString()) as Array<Row & { signal: string }>;
      for (const row of oldWindows) {
        const old = JSON.parse(row.body) as Edge;
        if (old.source.provider === event.source.provider && old.source.model === event.source.model && old.astronomyAlgorithmVersion === event.astronomyAlgorithmVersion)
          windows.set(row.signal, { hourAt: old.hourAt, window: old.window, query: old.query, astronomyAlgorithmVersion: old.astronomyAlgorithmVersion });
      }
      // Earlier local prototype rows kept the same qualified frame in their
      // candidate. Reuse that original declaration without rewriting receipts.
      const priorCandidates = this.db.prepare("SELECT signal,body FROM notification_inbox_candidates WHERE rule_id=? AND rule_revision=? AND window_end>?").all(rule.id, rule.revision, new Date(now).toISOString()) as Array<Row & { signal: string }>;
      for (const row of priorCandidates) if (!windows.has(row.signal)) {
        const c = JSON.parse(row.body) as Candidate, hourAt = (JSON.parse(row.signal) as unknown[]).at(-1);
        if (typeof hourAt === "string" && c.evidence.source.provider === event.source.provider && c.evidence.source.model === event.source.model && c.trigger.astronomyAlgorithmVersion === event.astronomyAlgorithmVersion)
          windows.set(row.signal, { hourAt, window: c.trigger.window, query: c.trigger.query, astronomyAlgorithmVersion: c.trigger.astronomyAlgorithmVersion });
      }
      const windowKey = (value: QualifiedWindow) => JSON.stringify([value.query.nightDate, value.query.timezone, value.window, value.hourAt, value.astronomyAlgorithmVersion]);
      const identities = new Set([...windows.values()].map(windowKey));
      for (const hour of event.nightWindow && event.targetWindow ? event.hours : []) {
        const start = Math.max(Date.parse(hour.at), Date.parse(event.nightWindow!.startUtc), Date.parse(event.targetWindow!.startUtc));
        const end = Math.min(Date.parse(hour.endUtc), Date.parse(event.nightWindow!.endUtc), Date.parse(event.targetWindow!.endUtc), d.expiresAt ? Date.parse(d.expiresAt) : Infinity);
        if (end <= Math.max(start, now)) continue;
        const frame: QualifiedWindow = { hourAt: hour.at, window: { startUtc: new Date(start).toISOString(), endUtc: new Date(end).toISOString() }, query: event.query, astronomyAlgorithmVersion: event.astronomyAlgorithmVersion };
        if (identities.has(windowKey(frame))) continue;
        const signal = JSON.stringify([event.source.provider, event.source.model, event.query.latitude, event.query.longitude, event.query.target, event.astronomyAlgorithmVersion, event.query.nightDate, event.query.timezone, frame.window.startUtc, frame.window.endUtc, hour.at]);
        windows.set(signal, frame); identities.add(windowKey(frame));
      }
      if (!windows.size && status === "evaluated") status = !event.nightWindow ? "night-window-unavailable" : !event.targetWindow ? "target-window-unavailable" : "no-eligible-window";
      const hours = new Map(event.hours.map(hour => [hour.at, hour]));
      for (const [signal, frame] of windows) {
        const start = Date.parse(frame.window.startUtc), end = Date.parse(frame.window.endUtc);
        if (end <= Math.max(start, now)) continue;
        consideredWindows++;
        const oldRow = this.db.prepare("SELECT body FROM notification_edges WHERE rule_id=? AND rule_revision=? AND signal=?").get(rule.id, rule.revision, signal) as Row | undefined;
        const old = oldRow ? JSON.parse(oldRow.body) as Edge : null;
        if (old && Date.parse(old.acquiredAt) >= Date.parse(event.source.acquiredAt)) continue;
        const value = hours.get(frame.hourAt)?.values[metric] ?? null;
        // Unknown is never treated as false or as a current qualified edge.
        // Existing immutable messages remain; queued work awaits new evidence.
        if (value === null) {
          const unknown: Edge = { ...frame, acquiredAt: event.source.acquiredAt, expiresAt: event.source.expiresAt, value: null, condition: null, dataVersion: event.source.dataVersion, source: event.source };
          this.db.prepare("INSERT INTO notification_edges(rule_id,rule_revision,signal,body) VALUES (?,?,?,?) ON CONFLICT(rule_id,rule_revision,signal) DO UPDATE SET body=excluded.body").run(rule.id, rule.revision, signal, JSON.stringify(unknown));
          this.db.prepare("UPDATE notification_inbox_candidates SET status='awaiting-evidence',reason='value-missing' WHERE rule_id=? AND rule_revision=? AND signal=? AND status='scheduled'").run(rule.id, rule.revision, signal);
          continue;
        }
        const condition = notificationThreshold(value, rule);
        const edge: Edge = { ...frame, acquiredAt: event.source.acquiredAt, expiresAt: event.source.expiresAt, value, condition, dataVersion: event.source.dataVersion, source: event.source };
        this.db.prepare("INSERT INTO notification_edges(rule_id,rule_revision,signal,body) VALUES (?,?,?,?) ON CONFLICT(rule_id,rule_revision,signal) DO UPDATE SET body=excluded.body").run(rule.id, rule.revision, signal, JSON.stringify(edge));
        const existing = this.db.prepare("SELECT id,body FROM notification_inbox_candidates WHERE rule_id=? AND rule_revision=? AND signal=? AND status IN ('scheduled','awaiting-evidence')").get(rule.id, rule.revision, signal) as Row & { id: string } | undefined;
        if (!condition || !enabled || status === "rule-expired") {
          if (existing) this.db.prepare("UPDATE notification_inbox_candidates SET status='cancelled',reason=? WHERE id=?").run(!condition ? "condition-reversed" : "controls-disabled", existing.id);
          continue;
        }
        if (existing) {
          const candidate = JSON.parse(existing.body) as Candidate;
          candidate.evidence = { value, source: event.source };
          this.db.prepare("UPDATE notification_inbox_candidates SET status='scheduled',reason=NULL,next_at=due_at,evidence_expiry=?,body=? WHERE id=?").run(event.source.expiresAt, JSON.stringify(candidate), existing.id);
        } else if (old && old.condition === false && old.value !== null && condition && old.dataVersion !== event.source.dataVersion) {
          const dueAt = new Date(start - d.leadMinutes * 60_000).toISOString();
          const trigger: NotificationTriggerSnapshot = { ruleId: rule.id, revision: rule.revision, eventId: event.id, location: d.location, target: d.target, category: d.category,
            metric, unit: d.threshold.unit, direction: d.threshold.direction, threshold: d.threshold.value, previousValue: old.value, previousSource: old.source, value,
            source: event.source, window: frame.window, query: frame.query, astronomyAlgorithmVersion: frame.astronomyAlgorithmVersion };
          const id = commandDigest({ ruleId: rule.id, revision: rule.revision, signal, eventId: event.id, dataVersion: event.source.dataVersion });
          const candidate: Candidate = { id, ownerId: rule.ownerId, signal, dueAt, trigger, evidence: { value, source: event.source } };
          this.db.prepare("INSERT INTO notification_inbox_candidates(id,actor_id,rule_id,rule_revision,signal,status,due_at,next_at,evidence_expiry,window_end,body) VALUES (?,?,?,?,?,'scheduled',?,?,?,?,?)").run(id, rule.ownerId, rule.id, rule.revision, signal, dueAt, dueAt, event.source.expiresAt, trigger.window.endUtc, JSON.stringify(candidate));
          queued++;
        }
      }
    }
    const activity: NonNullable<NotificationRuleActivity["lastEvaluation"]> = { eventId: event.id, at: event.source.acquiredAt, source: event.source, status, consideredWindows, queued };
    this.db.prepare("INSERT INTO notification_rule_evaluations(event_id,rule_id,rule_revision,acquired_at,body) VALUES (?,?,?,?,?)").run(event.id, rule.id, rule.revision, event.source.acquiredAt, JSON.stringify(activity));
  }
  processDueBatch(now: number, volatile: readonly NotificationObservedSource[] = []): boolean {
    return this.transaction(() => {
      const instant = new Date(now).toISOString();
      const rows = this.db.prepare(`SELECT p.id,p.body,p.status,p.evidence_expiry,p.window_end,r.body AS rule_body FROM notification_inbox_candidates p
        LEFT JOIN notification_rules r ON r.id=p.rule_id AND r.actor_id=p.actor_id
        WHERE p.status IN ('scheduled','awaiting-evidence') AND ((p.status='scheduled' AND (p.next_at<=? OR p.evidence_expiry<=?)) OR p.window_end<=? OR r.id IS NULL OR r.revision<>p.rule_revision OR json_extract(r.body,'$.definition.enabled')=0)
        ORDER BY p.next_at,p.id LIMIT ?`).all(instant, instant, instant, PAGE) as Array<Row & { id: string; status: string; evidence_expiry: string; window_end: string; rule_body: string | null }>;
      const quietResume = new Map<string, number | null>();
      for (const row of rows) {
        const c = JSON.parse(row.body) as Candidate;
        const rule = row.rule_body ? JSON.parse(row.rule_body) as NotificationRule : null;
        const control = this.controls(c.ownerId);
        const finish = (status: string, reason: string) => this.db.prepare("UPDATE notification_inbox_candidates SET status=?,reason=? WHERE id=?").run(status, reason, c.id);
        if (!rule || rule.revision !== c.trigger.revision || !rule.definition.enabled || !control.enabled || !control.categories[c.trigger.category]) { finish("cancelled", "rule-or-controls-disabled"); continue; }
        if (Date.parse(row.window_end) <= now || rule.definition.expiresAt && Date.parse(rule.definition.expiresAt) <= now) { finish("cancelled", "window-expired"); continue; }
        if (this.observedAfter(c.trigger.query, c.evidence.source, volatile)) { finish("awaiting-evidence", "newer-acquisition-unconfirmed"); continue; }
        if (Date.parse(row.evidence_expiry) <= now) { finish("awaiting-evidence", "source-expired"); continue; }
        const quietKey = JSON.stringify([rule.definition.quietHours, row.evidence_expiry, row.window_end]);
        if (!quietResume.has(quietKey)) quietResume.set(quietKey, nextNotificationAllowed(now, Math.min(Date.parse(row.evidence_expiry), Date.parse(row.window_end)), rule.definition.quietHours));
        const allowed = quietResume.get(quietKey)!;
        if (allowed === null) { finish("awaiting-evidence", "quiet-hours"); continue; }
        if (allowed > now) { this.db.prepare("UPDATE notification_inbox_candidates SET next_at=?,reason='quiet-hours' WHERE id=?").run(new Date(allowed).toISOString(), c.id); continue; }
        const last = this.db.prepare("SELECT delivered_at FROM notification_inbox WHERE actor_id=? AND rule_id=? ORDER BY delivered_at DESC LIMIT 1").get(c.ownerId, rule.id) as { delivered_at: string } | undefined;
        if (last && now - Date.parse(last.delivered_at) < rule.definition.cooldownMinutes * 60_000) { finish("suppressed", "cooldown"); continue; }
        const sameEvent = this.db.prepare("SELECT delivered_at FROM notification_inbox WHERE actor_id=? AND rule_id=? AND origin_event_id=? ORDER BY delivered_at DESC LIMIT 1").get(c.ownerId, rule.id, c.trigger.eventId) as { delivered_at: string } | undefined;
        if (sameEvent && now - Date.parse(sameEvent.delivered_at) < 6 * 60 * 60_000) { finish("suppressed", "same-source-event-cooldown"); continue; }
        const message: Omit<NotificationInboxMessage, "current" | "currentEvidence"> = { id: c.id, ownerId: c.ownerId, deliveredAt: instant, dueAt: c.dueAt, trigger: c.trigger, evidence: c.evidence, boundary: "in-app-inbox-only" };
        this.db.prepare("INSERT INTO notification_inbox(id,actor_id,rule_id,origin_event_id,signal,delivered_at,body) VALUES (?,?,?,?,?,?,?)").run(c.id, c.ownerId, rule.id, c.trigger.eventId, c.signal, instant, JSON.stringify(message));
        finish("delivered", "in-app-inbox");
      }
      return rows.length > 0;
    });
  }
  nextDue(): number | null {
    const row = this.db.prepare("SELECT MIN(CASE WHEN status='scheduled' THEN min(next_at,evidence_expiry,window_end) ELSE window_end END) AS at FROM notification_inbox_candidates WHERE status IN ('scheduled','awaiting-evidence')").get() as { at: string | null };
    const pending = this.db.prepare("SELECT MIN(expires_at) AS at FROM notification_source_readiness WHERE status='pending'").get() as { at: string | null };
    const boundaries = [row.at, pending.at].filter((at): at is string => at !== null).map(Date.parse);
    return boundaries.length ? Math.min(...boundaries) : null;
  }
  hasImmediateWork(now: number): boolean {
    if (this.db.prepare("SELECT 1 FROM notification_source_readiness WHERE status='pending' LIMIT 1").get()) return true;
    if (this.db.prepare("SELECT 1 FROM notification_source_events WHERE complete=0 LIMIT 1").get()) return true;
    const at = new Date(now).toISOString();
    return !!this.db.prepare("SELECT 1 FROM notification_inbox_candidates WHERE status IN ('scheduled','awaiting-evidence') AND ((status='scheduled' AND (next_at<=? OR evidence_expiry<=?)) OR window_end<=?) LIMIT 1").get(at, at, at);
  }
  activity(actorId: string, id: string): NotificationRuleActivity {
    const rule = this.rule(actorId, id);
    if (!rule) throw new NotificationEvaluationError("notification_rule_not_found", 404);
    const row = this.db.prepare("SELECT body FROM notification_rule_evaluations WHERE rule_id=? AND rule_revision=? ORDER BY acquired_at DESC,event_id DESC LIMIT 1").get(id, rule.revision) as Row | undefined;
    const last = this.db.prepare("SELECT MAX(delivered_at) AS at FROM notification_inbox WHERE actor_id=? AND rule_id=?").get(actorId, id) as { at: string | null };
    const pending = this.db.prepare("SELECT count(*) AS count FROM notification_inbox_candidates WHERE actor_id=? AND rule_id=? AND status IN ('scheduled','awaiting-evidence')").get(actorId, id) as { count: number };
    const reason = notificationRuleSupport(rule);
    return { ruleId: id, revision: rule.revision, supported: reason === null, reason, lastEvaluation: row ? JSON.parse(row.body) as NonNullable<NotificationRuleActivity["lastEvaluation"]> : null, lastDeliveryAt: last.at, pending: pending.count, evaluationStatus: "ready" };
  }
  inbox(actorId: string, now: number, cursor = Number.MAX_SAFE_INTEGER, volatile: readonly NotificationObservedSource[] = []): NotificationInboxPage {
    const rows = this.db.prepare("SELECT rowid AS cursor,body,signal FROM notification_inbox WHERE actor_id=? AND rowid<? ORDER BY rowid DESC LIMIT ?").all(actorId, cursor, PAGE + 1) as Array<Row & { cursor: number; signal: string }>;
    const items = rows.slice(0, PAGE).map(row => {
      const message = JSON.parse(row.body) as Omit<NotificationInboxMessage, "current" | "currentEvidence">;
      const rule = this.rule(actorId, message.trigger.ruleId), control = this.controls(actorId);
      const edgeRow = this.db.prepare("SELECT body FROM notification_edges WHERE rule_id=? AND rule_revision=? AND signal=?").get(message.trigger.ruleId, message.trigger.revision, row.signal) as Row | undefined;
      const edge = edgeRow ? JSON.parse(edgeRow.body) as Edge : null;
      let current: NotificationInboxMessage["current"] = "unconfirmed";
      if (Date.parse(message.trigger.window.endUtc) <= now) current = "expired";
      else if (rule?.revision === message.trigger.revision && rule.definition.enabled && control.enabled && control.categories[message.trigger.category] && edge && edge.condition !== null && Date.parse(edge.expiresAt) > now
        && !this.observedAfter(message.trigger.query, edge.source, volatile)) current = edge.condition ? "same-condition" : "condition-reversed";
      else if (Date.parse(message.evidence.source.expiresAt) <= now) current = "expired";
      return { ...message, current, currentEvidence: edge ? { value: edge.value, source: edge.source } : null };
    });
    return { schemaVersion: "starward-notifications-v1", ownerId: actorId, checkedAt: new Date(now).toISOString(), evaluationStatus: "ready", items, nextCursor: rows.length > PAGE ? String(rows[PAGE - 1]!.cursor) : null, scope: "local-owner-poc" };
  }
  close(): void { this.db.close(); }
}
