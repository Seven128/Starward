import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ViewKey =
  | "queue"
  | "case"
  | "media"
  | "merge"
  | "publication"
  | "replacement"
  | "audit";
type LoadState =
  "idle" | "loading" | "ready" | "empty" | "partial" | "stale" | "error";
type Tone = "neutral" | "violet" | "success" | "warning" | "danger";
type JsonRecord = Record<string, unknown>;

type AuthSession = { token: string; actor: string };
type ApiEnvelope<T> = JsonRecord & {
  data?: T;
  dataState?: string;
  requestId?: string;
  generatedAt?: string;
  validAt?: string;
  etag?: string;
  warnings?: string[];
  receipt?: JsonRecord;
  receiptId?: string;
  auditId?: string;
};

type DashboardData = {
  spots: JsonRecord[];
  moderation: JsonRecord[];
  queue: JsonRecord[];
  audits: JsonRecord[];
  dataSources: JsonRecord[];
  providerHealth: JsonRecord[];
  [key: string]: unknown;
};

type MutationPhase =
  "idle" | "submitting" | "readback" | "confirmed" | "unverified" | "error";
type MutationState = {
  phase: MutationPhase;
  label: string;
  message?: string;
  receipt?: JsonRecord;
  requestId?: string;
};

const API_BASE = String(import.meta.env.VITE_ADMIN_API_BASE_URL ?? "").replace(
  /\/$/u,
  "",
);
const SESSION_TOKEN_KEY = "starward.admin.session.token";
const SESSION_ACTOR_KEY = "starward.admin.session.actor";

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ key: ViewKey; label: string; description: string }>;
}> = [
  {
    label: "投稿处理",
    items: [
      {
        key: "queue",
        label: "审核队列",
        description: "按优先级、风险和新鲜度查看待处理 Case",
      },
      { key: "case", label: "Case", description: "原始证据与审核决定分开记录" },
      {
        key: "media",
        label: "媒体核验",
        description: "只查看净化后的媒体派生物",
      },
      {
        key: "merge",
        label: "证据合并",
        description: "预览与提交 canonical merge",
      },
    ],
  },
  {
    label: "正式地点",
    items: [
      {
        key: "publication",
        label: "发布评估",
        description: "服务端完整性门禁与发布动作",
      },
      {
        key: "replacement",
        label: "替换与退役",
        description: "预览关系影响，再提交高影响转换",
      },
      {
        key: "audit",
        label: "审计",
        description: "追加式、脱敏、可归因的操作历史",
      },
    ],
  },
];

class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string;
  readonly details: unknown;

  constructor(
    status: number,
    code: string,
    requestId = "—",
    details?: unknown,
  ) {
    super(`${code}（HTTP ${status}）`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function asString(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "不可读取";
  }
}

function redactId(value: unknown): string {
  const text = asString(value);
  if (text === "—" || text.length < 9) return text;
  return `${text.slice(0, 5)}••${text.slice(-3)}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError)
    return `${error.message}；request ${error.requestId}`;
  return error instanceof Error
    ? error.message
    : "请求失败，服务端未确认本次操作";
}

function newIdempotencyKey(prefix: string): string {
  const portablePrefix =
    prefix
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 48) || "operation";
  const randomId = globalThis.crypto?.randomUUID?.();
  return `${portablePrefix}:${randomId ?? `${Date.now()}-${String(performance.now()).replace(".", "")}`}`;
}

function getSessionStorage(key: string): string {
  try {
    return window.sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function setSessionStorage(session: AuthSession | null) {
  try {
    if (!session) {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
      window.sessionStorage.removeItem(SESSION_ACTOR_KEY);
      return;
    }
    window.sessionStorage.setItem(SESSION_TOKEN_KEY, session.token);
    window.sessionStorage.setItem(SESSION_ACTOR_KEY, session.actor);
  } catch {
    // A session-only token is a convenience, not an authority. The API remains the authority.
  }
}

function normalizeDashboard(value: unknown): DashboardData {
  const raw = asRecord(value);
  return {
    ...raw,
    spots: asRecords(raw.spots),
    moderation: asRecords(raw.moderation),
    queue: asRecords(raw.queue),
    audits: asRecords(raw.audits),
    dataSources: asRecords(raw.dataSources),
    providerHealth: asRecords(raw.providerHealth),
  };
}

function getCasePayload(item: JsonRecord): JsonRecord {
  return asRecord(item.payload);
}

function getSubmission(item: JsonRecord): JsonRecord {
  const payload = getCasePayload(item);
  return asRecord(payload.submission ?? item.submission);
}

function caseName(item: JsonRecord): string {
  const submission = getSubmission(item);
  const candidate = asRecord(submission.candidateLocation);
  return asString(
    submission.spotNameSnapshot ?? candidate.displayName ?? item.subject_id,
    "未命名投稿",
  );
}

function caseKind(item: JsonRecord): string {
  const kind = asString(getSubmission(item).kind ?? item.kind, "未知投稿");
  return (
    (
      {
        FIELD_REPORT: "现场报告",
        CORRECTION: "更正信息",
        NEW_SPOT_PROPOSAL: "新地点",
      } as Record<string, string>
    )[kind] ?? kind
  );
}

function caseRisk(item: JsonRecord): { label: string; tone: Tone } {
  const payload = getCasePayload(item);
  const submission = getSubmission(item);
  const topics = Array.isArray(submission.topics)
    ? submission.topics.map(String)
    : [];
  if (
    topics.includes("NIGHT_SAFETY") ||
    topics.includes("LEGAL_ACCESS") ||
    Boolean(payload.preciseLocation)
  ) {
    return { label: "高 · 需核验", tone: "danger" };
  }
  if (
    !Boolean(submission.rightsConfirmed) ||
    !asRecords(submission.media).length
  )
    return { label: "中 · 需核验", tone: "warning" };
  return { label: "待服务端判定", tone: "neutral" };
}

function caseMedia(item: JsonRecord): JsonRecord[] {
  return asRecords(getSubmission(item).media);
}

function spotIdOf(spot: JsonRecord): string {
  return asString(spot.spot_id ?? spot.spotId ?? asRecord(spot.payload).spotId);
}

function spotNameOf(spot: JsonRecord): string {
  return asString(spot.name ?? asRecord(spot.payload).name, "未命名正式地点");
}

function spotStatusOf(spot: JsonRecord): string {
  return asString(spot.status ?? asRecord(spot.payload).status, "UNKNOWN");
}

function spotAssessmentOf(spot: JsonRecord): JsonRecord {
  return asRecord(spot.publication_assessment ?? spot.publicationAssessment);
}

function findCase(data: DashboardData | null, id: string): JsonRecord | null {
  return (
    data?.moderation.find(
      (item) => asString(item.case_id ?? item.caseId) === id,
    ) ?? null
  );
}

function queueCaseId(item: JsonRecord): string {
  return asString(item.caseId ?? item.case_id);
}

function queueRisk(item: JsonRecord): { label: string; tone: Tone } {
  const flags = Array.isArray(item.riskFlags)
    ? item.riskFlags.map((flag) => String(flag)).filter(Boolean)
    : [];
  const priority = asString(item.priority, "").toUpperCase();
  if (flags.length) {
    return {
      label: flags.join(" · "),
      tone: priority === "HIGH" || priority === "URGENT" ? "danger" : "warning",
    };
  }
  if (priority === "HIGH" || priority === "URGENT")
    return { label: priority, tone: "danger" };
  if (priority) return { label: priority, tone: "warning" };
  return { label: "服务端未返回", tone: "neutral" };
}

function queueAssignment(item: JsonRecord): string {
  const assignee = item.assignee ?? item.assignedTo ?? item.assigned_to;
  if (assignee === null) return "未分配";
  if (assignee !== undefined) return asString(assignee, "服务端未返回");
  return "服务端未返回";
}

function findSpot(data: DashboardData | null, id: string): JsonRecord | null {
  return data?.spots.find((item) => spotIdOf(item) === id) ?? null;
}

function extractReceipt<T>(envelope: ApiEnvelope<T>): JsonRecord | null {
  const direct = asRecord(envelope.receipt);
  const nested = asRecord(asRecord(envelope.data).receipt);
  if (Object.keys(direct).length) return direct;
  if (Object.keys(nested).length) return nested;
  if (typeof envelope.receiptId === "string" && envelope.receiptId)
    return { receiptId: envelope.receiptId, auditId: envelope.auditId };
  return null;
}

function receiptLabel(receipt: JsonRecord | undefined): string {
  return redactId(
    receipt?.receiptId ?? receipt?.operationId ?? receipt?.requestId,
  );
}

function dataStateTone(state: LoadState): Tone {
  if (state === "ready") return "success";
  if (state === "partial" || state === "stale") return "warning";
  if (state === "error") return "danger";
  return "neutral";
}

function dataStateLabel(state: LoadState): string {
  return (
    {
      idle: "未读取",
      loading: "读取中",
      ready: "服务就绪",
      empty: "服务端为空",
      partial: "部分读取",
      stale: "结果过期",
      error: "读取失败",
    } as Record<LoadState, string>
  )[state];
}

function mutationLabel(state: MutationState): string {
  return (
    {
      idle: "未执行",
      submitting: "提交中",
      readback: "等待读回",
      confirmed: "已确认",
      unverified: "未确认",
      error: "未确认",
    } as Record<MutationPhase, string>
  )[state.phase];
}

type OpsIconName =
  | "telescope"
  | "inbox"
  | "file"
  | "images"
  | "merge"
  | "clipboard"
  | "repeat"
  | "history";

function OpsIcon({ name }: { name: OpsIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      className="ops-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      {name === "telescope" ? (
        <>
          <path
            {...common}
            d="m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44"
          />
          <path
            {...common}
            d="m13.56 11.747 4.332-.924M16 21l-3.105-6.21M6.158 8.633l1.114 4.456M8 21l3.105-6.21"
          />
          <path
            {...common}
            d="M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z"
          />
          <circle {...common} cx="12" cy="13" r="2" />
        </>
      ) : null}
      {name === "inbox" ? (
        <>
          <polyline {...common} points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path
            {...common}
            d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
          />
        </>
      ) : null}
      {name === "file" ? (
        <>
          <path
            {...common}
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          />
          <path {...common} d="M14 2v6h6M8 13h8M8 17h5" />
        </>
      ) : null}
      {name === "images" ? (
        <>
          <path
            {...common}
            d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2"
          />
          <circle cx="13" cy="7" r="1" fill="currentColor" />
          <rect {...common} x="8" y="2" width="14" height="14" rx="2" />
        </>
      ) : null}
      {name === "merge" ? (
        <>
          <path {...common} d="M6 3v6a6 6 0 0 0 6 6h6" />
          <path {...common} d="m15 12 3 3-3 3M18 9l3 3-3 3" />
          <circle {...common} cx="6" cy="3" r="2" />
          <circle {...common} cx="6" cy="21" r="2" />
        </>
      ) : null}
      {name === "clipboard" ? (
        <>
          <rect {...common} x="5" y="4" width="14" height="17" rx="2" />
          <path {...common} d="M9 4V3h6v1M9 12l2 2 4-4" />
        </>
      ) : null}
      {name === "repeat" ? (
        <>
          <path {...common} d="m17 2 4 4-4 4" />
          <path {...common} d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" />
          <path {...common} d="M21 13v2a3 3 0 0 1-3 3H3" />
        </>
      ) : null}
      {name === "history" ? (
        <>
          <path
            {...common}
            d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
          />
          <path {...common} d="M3 3v5h5M12 7v5l4 2" />
        </>
      ) : null}
    </svg>
  );
}

async function requestEnvelope<T>(
  path: string,
  session: AuthSession,
  init: RequestInit = {},
  idempotencyKey?: string,
): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("content-type", "application/json");
  headers.set("x-admin-token", session.token);
  headers.set("x-admin-actor", session.actor);
  headers.set("x-request-id", newIdempotencyKey("request"));
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  const envelope = asRecord(body) as ApiEnvelope<T>;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      asString(
        envelope.code ?? asRecord(envelope.error).code,
        "admin_request_failed",
      ),
      asString(envelope.requestId, "—"),
      envelope.details,
    );
  }
  if (!("data" in envelope))
    throw new ApiError(
      response.status,
      "admin_envelope_invalid",
      asString(envelope.requestId, "—"),
    );
  return envelope;
}

function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="ops-header">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="header-actions">{action}</div> : null}
    </header>
  );
}

function Notice({
  tone = "neutral",
  title,
  children,
}: {
  tone?: Tone;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`notice ${tone}`}
      role={tone === "danger" ? "alert" : undefined}
    >
      <div className="notice-mark" aria-hidden="true">
        {tone === "success"
          ? "✓"
          : tone === "danger"
            ? "!"
            : tone === "warning"
              ? "·"
              : "i"}
      </div>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-mark" aria-hidden="true">
        —
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong className={mono ? "mono" : undefined}>{value}</strong>
    </div>
  );
}

function MutationBanner({ state }: { state: MutationState }) {
  if (state.phase === "idle") return null;
  const tone: Tone =
    state.phase === "confirmed"
      ? "success"
      : state.phase === "error"
        ? "danger"
        : state.phase === "unverified"
          ? "warning"
          : "violet";
  return (
    <div className={`mutation-banner ${tone}`} aria-live="polite">
      <div>
        <StatusPill tone={tone}>{mutationLabel(state)}</StatusPill>
        <strong>{state.label}</strong>
      </div>
      <p>
        {state.message ??
          (state.phase === "readback"
            ? "服务端已返回回执，正在读取当前投影确认影响。"
            : "操作状态由服务端返回决定。")}
      </p>
      {state.receipt ? (
        <span className="receipt-line">
          receipt {receiptLabel(state.receipt)}
          {state.receipt.auditId
            ? ` · audit ${redactId(state.receipt.auditId)}`
            : ""}
        </span>
      ) : null}
    </div>
  );
}

function AuthGate({
  token,
  actor,
  error,
  busy,
  onToken,
  onActor,
  onSubmit,
}: {
  token: string;
  actor: string;
  error: string;
  busy: boolean;
  onToken: (value: string) => void;
  onActor: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="auth-gate" aria-labelledby="auth-title">
      <div className="auth-copy">
        <span className="eyebrow">AUTHENTICATED OWNER OPERATIONS</span>
        <h1 id="auth-title">先建立管理员会话</h1>
        <p>
          此工作台只读取带 owner capability 的真实 `/v2/admin`
          服务。没有服务端认证时不会展示投稿、地点或审计数据。
        </p>
      </div>
      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          <span>管理员 token</span>
          <input
            required
            type="password"
            value={token}
            onChange={(event) => onToken(event.target.value)}
            autoComplete="current-password"
            placeholder="仅在本次浏览会话使用"
          />
        </label>
        <label>
          <span>actor identity</span>
          <input
            required
            pattern="admin:[A-Za-z0-9._\\x2d]{1,64}"
            value={actor}
            onChange={(event) => onActor(event.target.value)}
            placeholder="admin:your-name"
          />
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="control primary" type="submit" disabled={busy}>
          {busy ? "认证中…" : "连接真实工作台"}
        </button>
        <p className="form-hint">
          token 不写入 URL、日志或永久存储；权限、脱敏和审计由服务端决定。
        </p>
      </form>
    </section>
  );
}

function QueueView({
  data,
  state,
  queueState,
  selectedCaseId,
  onOpenCase,
  onRefresh,
}: {
  data: DashboardData;
  state: LoadState;
  queueState: LoadState;
  selectedCaseId: string;
  onOpenCase: (id: string) => void;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const cases = data.queue;
  const counts = useMemo(
    () => ({
      ALL: cases.length,
      FIELD_REPORT: cases.filter(
        (item) => asString(item.kind).toUpperCase() === "FIELD_REPORT",
      ).length,
      CORRECTION: cases.filter(
        (item) => asString(item.kind).toUpperCase() === "CORRECTION",
      ).length,
      NEW_SPOT_PROPOSAL: cases.filter(
        (item) => asString(item.kind).toUpperCase() === "NEW_SPOT_PROPOSAL",
      ).length,
      MEDIA: cases.reduce(
        (count, item) =>
          count + asNumber(item.pendingMediaCount ?? item.mediaPendingCount),
        0,
      ),
    }),
    [cases],
  );
  const rows = cases.filter((item) => {
    const summary = findCase(data, queueCaseId(item));
    const submission = summary ? getSubmission(summary) : {};
    const kind = asString(item.kind ?? submission.kind).toUpperCase();
    const title = summary
      ? caseName(summary)
      : asString(item.spotName ?? item.name, "服务端未返回投稿");
    const haystack =
      `${title} ${queueCaseId(item)} ${asString(item.spotId)} ${kind}`.toLowerCase();
    const matchesFilter =
      filter === "ALL" ||
      (filter === "MEDIA"
        ? asNumber(item.pendingMediaCount ?? item.mediaPendingCount) > 0
        : kind === filter);
    return matchesFilter && haystack.includes(query.trim().toLowerCase());
  });
  return (
    <section className="view-stack" data-testid="moderation-queue">
      <SectionHeader
        eyebrow="MODERATE / QUEUE"
        title="审核队列"
        description="投稿只进入审核；不会从这个列表直接更改正式地点或公开状态。"
        action={
          <button
            className="control secondary"
            type="button"
            onClick={onRefresh}
          >
            刷新队列
          </button>
        }
      />
      <div className="toolbar">
        <div className="filter-row" aria-label="队列筛选">
          {[
            ["ALL", `全部 ${counts.ALL}`],
            ["FIELD_REPORT", `现场报告 ${counts.FIELD_REPORT}`],
            ["CORRECTION", `更正 ${counts.CORRECTION}`],
            ["NEW_SPOT_PROPOSAL", `新地点 ${counts.NEW_SPOT_PROPOSAL}`],
            ["MEDIA", `媒体待处理 ${counts.MEDIA}`],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`filter-button ${filter === key ? "active" : ""}`}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-field">
          <span className="sr-only">搜索队列</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索地点、投稿 ID"
          />
          <span aria-hidden="true">⌕</span>
        </label>
      </div>
      {queueState === "error" ? (
        <Notice tone="danger" title="专用审核队列读取失败">
          没有用 dashboard 的摘要或 fixture 替代专用队列；请修复队列接口后重试。
        </Notice>
      ) : null}
      {queueState === "partial" ? (
        <Notice tone="warning" title="审核队列部分读取">
          当前专用队列返回了不完整的服务端字段；未返回的地点、风险或分配信息不会由前端推断。
        </Notice>
      ) : null}
      {state === "loading" || queueState === "loading" ? (
        <LoadingRows />
      ) : rows.length ? (
        <div className="table-card">
          <div className="table-scroll">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>投稿</th>
                  <th>类型</th>
                  <th>风险 / 完整度</th>
                  <th>提交时间</th>
                  <th>分配</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const id = queueCaseId(item);
                  const summary = findCase(data, id);
                  const submission = summary ? getSubmission(summary) : {};
                  const mediaCount = summary
                    ? caseMedia(summary).length
                    : asNumber(item.mediaCount);
                  const kind = asString(
                    item.kind ?? submission.kind,
                    "服务端未返回",
                  ).toUpperCase();
                  const title = summary
                    ? caseName(summary)
                    : asString(item.spotName ?? item.name, "服务端未返回投稿");
                  const risk = queueRisk(item);
                  const status = asString(
                    item.state ?? summary?.state,
                    "服务端未返回",
                  );
                  return (
                    <tr
                      key={id}
                      className={selectedCaseId === id ? "selected" : undefined}
                    >
                      <td>
                        <strong>{title}</strong>
                        <span>
                          {redactId(id)} ·{" "}
                          {redactId(item.spotId ?? submission.spotId)} ·{" "}
                          {mediaCount ? `${mediaCount} 个媒体` : "媒体数未返回"}
                        </span>
                      </td>
                      <td>
                        <StatusPill tone="violet">
                          {caseKind(summary ?? item)}
                        </StatusPill>
                      </td>
                      <td>
                        <StatusPill tone={risk.tone}>{risk.label}</StatusPill>
                      </td>
                      <td className="mono">
                        {asString(
                          item.createdAt ??
                            item.created_at ??
                            submission.createdAt,
                          "服务端未返回",
                        )}
                      </td>
                      <td>{queueAssignment(item)}</td>
                      <td>
                        <button
                          className="control quiet compact"
                          type="button"
                          disabled={id === "—"}
                          onClick={() => onOpenCase(id)}
                        >
                          打开
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title={
            query || filter !== "ALL"
              ? "没有符合条件的 Case"
              : "服务端当前没有 Case"
          }
          description={
            query || filter !== "ALL"
              ? "清除筛选后重新查看当前真实队列。"
              : "当前队列为空；没有使用设计资源中的示例投稿填充。"
          }
        />
      )}
    </section>
  );
}

function LoadingRows() {
  return (
    <div
      className="loading-stack"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="正在加载审核队列"
    >
      <span className="sr-only">正在从服务端加载审核队列</span>
      <span className="loading-block" aria-hidden="true" />
      <span className="loading-block" aria-hidden="true" />
      <span className="loading-block" aria-hidden="true" />
    </div>
  );
}

function CaseView({
  data,
  selectedCaseId,
  detail,
  detailState,
  reason,
  onReason,
  mutation,
  onResolve,
  onOpenMedia,
  onOpenMerge,
}: {
  data: DashboardData;
  selectedCaseId: string;
  detail: JsonRecord | null;
  detailState: LoadState;
  reason: string;
  onReason: (value: string) => void;
  mutation: MutationState;
  onResolve: (
    resolution: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED",
  ) => void;
  onOpenMedia: () => void;
  onOpenMerge: () => void;
}) {
  const item = findCase(data, selectedCaseId);
  if (!item)
    return (
      <EmptyState
        title="尚未选择 Case"
        description="从审核队列打开一个服务端 Case，保留队列上下文后继续处理。"
      />
    );
  const submission = getSubmission(item);
  const payload = getCasePayload(item);
  const full = detail ? asRecord(detail.case ?? detail) : item;
  const fullPayload = getCasePayload(full);
  const fullSubmission = Object.keys(getSubmission(full)).length
    ? getSubmission(full)
    : submission;
  const effectiveState = asString(full.state ?? item.state, "UNKNOWN");
  const candidate = asRecord(fullSubmission.candidateLocation);
  const locationContext = fullSubmission.spotId
    ? redactId(fullSubmission.spotId)
    : asString(
        candidate.displayName ?? candidate.region,
        "服务端未返回候选地点",
      );
  return (
    <section className="view-stack" data-testid="moderation-case">
      <SectionHeader
        eyebrow="MODERATE / CASE"
        title={caseName(item)}
        description={`${redactId(selectedCaseId)} · submission revision ${asString(fullSubmission.revision ?? submission.revision)} · 原始证据保持不可变`}
        action={
          <StatusPill
            tone={effectiveState === "PENDING" ? "warning" : "neutral"}
          >
            {effectiveState}
          </StatusPill>
        }
      />
      {detailState === "partial" ? (
        <Notice tone="warning" title="Case 详细接口暂不可用">
          当前显示来自已认证 dashboard 的脱敏摘要；完整 Case
          读取失败，不会替代或猜测原始证据。
        </Notice>
      ) : null}
      <div className="grid-two">
        <article className="surface-card">
          <CardHeading
            title="投稿事实"
            description="审核此投稿本身，不直接编辑正式地点"
            badge={<StatusPill tone="success">身份由服务端返回</StatusPill>}
          />
          <div className="fact-grid">
            <Fact label="投稿类型" value={caseKind(item)} />
            <Fact
              label="地点上下文"
              value={locationContext}
              mono={Boolean(fullSubmission.spotId)}
            />
            <Fact
              label="观察时间"
              value={asString(fullSubmission.observedAt)}
              mono
            />
            <Fact
              label="投稿 revision"
              value={asString(fullSubmission.revision)}
              mono
            />
          </div>
          <div className="field-block">
            <span className="field-label">涉及主题</span>
            <div className="chip-row">
              {Array.isArray(fullSubmission.topics) &&
              fullSubmission.topics.length ? (
                fullSubmission.topics.map((topic) => (
                  <StatusPill key={String(topic)} tone="violet">
                    {String(topic)}
                  </StatusPill>
                ))
              ) : (
                <span className="muted">服务端未返回主题</span>
              )}
            </div>
          </div>
          <div className="field-block">
            <span className="field-label">贡献者描述</span>
            <p className="evidence-copy">
              {asString(fullSubmission.detail, "服务端未返回投稿描述")}
            </p>
          </div>
        </article>
        <article className="surface-card">
          <CardHeading
            title="安全与隐私检查"
            description="服务端状态与人工决定保持分开"
            badge={
              <StatusPill
                tone={detailState === "ready" ? "success" : "warning"}
              >
                {detailState === "ready" ? "已读取" : "部分读取"}
              </StatusPill>
            }
          />
          <div className="evidence-list">
            <EvidenceRow
              label="媒体格式与大小"
              value={`${caseMedia(item).length} 项媒体由服务端返回`}
              tone={caseMedia(item).length ? "success" : "warning"}
            />
            <EvidenceRow
              label="投稿者权利确认"
              value={
                fullSubmission.rightsConfirmed === true
                  ? "已确认"
                  : fullSubmission.rightsConfirmed === false
                    ? "未确认"
                    : "服务端未返回"
              }
              tone={
                fullSubmission.rightsConfirmed === true ? "success" : "warning"
              }
            />
            <EvidenceRow
              label="精确位置授权"
              value={
                fullSubmission.preciseLocationConsent === true
                  ? "已确认"
                  : fullSubmission.preciseLocationConsent === false
                    ? "未确认"
                    : "不在普通读模型"
              }
              tone={
                fullSubmission.preciseLocationConsent === true
                  ? "success"
                  : "neutral"
              }
            />
            <EvidenceRow
              label="合并 / 发布轴"
              value={formatValue(
                payload.canonicalMergeRequired ??
                  fullPayload.canonicalMergeRequired ??
                  "服务端未返回",
              )}
              tone="violet"
            />
          </div>
        </article>
      </div>
      <article className="surface-card decision-card">
        <CardHeading
          title="审核决定"
          description="请求补充会保留用户输入；接收只进入后续合并队列，不直接改变公开地点。"
        />
        <label className="field-block">
          <span className="field-label">
            给贡献者的说明 <small>不得包含内部 ID 或其他用户信息</small>
          </span>
          <textarea
            className="text-area"
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            placeholder="说明需要补充或拒绝的可行动原因"
          />
        </label>
        <div className="button-row">
          <button
            className="control secondary"
            type="button"
            disabled={
              !reason.trim() ||
              mutation.phase === "submitting" ||
              mutation.phase === "readback"
            }
            onClick={() => onResolve("CHANGES_REQUESTED")}
          >
            请求补充
          </button>
          <button
            className="control leaf"
            type="button"
            disabled={
              !reason.trim() ||
              mutation.phase === "submitting" ||
              mutation.phase === "readback"
            }
            onClick={() => onResolve("APPROVED")}
          >
            接收投稿
          </button>
          <button
            className="control danger"
            type="button"
            disabled={
              !reason.trim() ||
              mutation.phase === "submitting" ||
              mutation.phase === "readback"
            }
            onClick={() => onResolve("REJECTED")}
          >
            拒绝
          </button>
          <button className="control quiet" type="button" onClick={onOpenMedia}>
            先审媒体
          </button>
          <button className="control quiet" type="button" onClick={onOpenMerge}>
            查看合并
          </button>
        </div>
        <MutationBanner state={mutation} />
        <Notice tone="violet" title="三条状态轴保持分离">
          审核接受不等于 canonical merge，canonical merge 也不等于
          publication。每一条后续动作都需要当前 revision、权限、回执与读回。
        </Notice>
      </article>
    </section>
  );
}

function CardHeading({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: ReactNode;
}) {
  return (
    <div className="card-heading">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {badge ? badge : null}
    </div>
  );
}

function EvidenceRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <div className="evidence-row">
      <span className="evidence-dot" aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
      <StatusPill tone={tone}>
        {tone === "success" ? "通过" : tone === "warning" ? "待核验" : "读取"}
      </StatusPill>
    </div>
  );
}

function MediaView({
  data,
  selectedCaseId,
  selectedMediaId,
  mediaDetail,
  mediaState,
  reason,
  onReason,
  onSelectMedia,
  onDecision,
  mutation,
  onOpenMerge,
}: {
  data: DashboardData;
  selectedCaseId: string;
  selectedMediaId: string;
  mediaDetail: JsonRecord | null;
  mediaState: LoadState;
  reason: string;
  onReason: (value: string) => void;
  onSelectMedia: (id: string) => void;
  onDecision: (decision: "ACCEPT" | "REJECT") => void;
  mutation: MutationState;
  onOpenMerge: () => void;
}) {
  const item = findCase(data, selectedCaseId);
  const media = item ? caseMedia(item) : [];
  if (!item)
    return (
      <EmptyState
        title="尚未选择 Case"
        description="媒体属于一个具体 Case。先从队列打开 Case，再进入媒体核验。"
      />
    );
  const detailData = asRecord(mediaDetail?.data ?? mediaDetail);
  const dataBase64 = asString(detailData.dataBase64, "");
  const mimeType = asString(detailData.mimeType, "image/jpeg");
  return (
    <section className="view-stack" data-testid="moderation-media-review">
      <SectionHeader
        eyebrow="MODERATE / MEDIA"
        title="媒体核验"
        description="逐项查看服务端净化派生物、权利状态与安全扫描；原始路径、EXIF 和精确 contributor coordinate 不进入普通读模型。"
        action={
          <StatusPill
            tone={
              media.some((entry) => asString(entry.state) !== "ATTACHED")
                ? "warning"
                : "success"
            }
          >
            {media.length} 项 ·{" "}
            {
              media.filter((entry) => asString(entry.state) === "ATTACHED")
                .length
            }{" "}
            已附着
          </StatusPill>
        }
      />
      {media.length ? (
        <div className="media-grid">
          {media.map((entry) => {
            const id = asString(entry.uploadId);
            const active = selectedMediaId === id;
            return (
              <button
                key={id}
                className={`media-card ${active ? "active" : ""}`}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectMedia(id)}
              >
                {active && dataBase64 ? (
                  <img
                    className="media-preview"
                    src={`data:${mimeType};base64,${dataBase64}`}
                    alt=""
                  />
                ) : null}
                <strong>{asString(entry.originalName, "已净化媒体")}</strong>
                <span>
                  {asString(entry.mimeType)} ·{" "}
                  {asNumber(entry.byteSize ?? entry.declaredByteSize)
                    ? `${asNumber(entry.byteSize ?? entry.declaredByteSize)} bytes`
                    : "大小未返回"}
                </span>
                <span>
                  {asString(entry.state)} · upload {redactId(id)}
                </span>
                <StatusPill
                  tone={
                    asString(entry.state) === "ATTACHED" ? "success" : "warning"
                  }
                >
                  {asString(entry.state)}
                </StatusPill>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="该 Case 没有媒体"
          description="没有使用设计资源中的示例媒体补位。"
        />
      )}
      {selectedMediaId ? (
        <div className="grid-two">
          <article className="surface-card">
            <CardHeading
              title="净化派生物"
              description="媒体对象由 authenticated API 返回；读取失败时不保留旧预览。"
              badge={
                <StatusPill
                  tone={mediaState === "ready" ? "success" : "warning"}
                >
                  {dataBase64 ? "已读取" : dataStateLabel(mediaState)}
                </StatusPill>
              }
            />
            {dataBase64 ? (
              <img
                className="sanitized-media"
                src={`data:${mimeType};base64,${dataBase64}`}
                alt="服务端返回的净化媒体派生物"
              />
            ) : (
              <div className="media-unavailable">
                {mediaState === "loading"
                  ? "媒体读取中…"
                  : "服务端未返回可显示派生物"}
              </div>
            )}
            <div className="redacted-note">
              普通读模型不展示原始 object key、EXIF、GPS 或 contributor
              精确坐标。
            </div>
          </article>
          <article className="surface-card">
            <CardHeading
              title="媒体决定"
              description="拒绝某个媒体不会自动拒绝整条投稿；决定会写入 Case 审计。"
            />
            <div className="evidence-list">
              <EvidenceRow
                label="权利确认"
                value={
                  getSubmission(item).rightsConfirmed === true
                    ? "已确认"
                    : "服务端未返回"
                }
                tone={
                  getSubmission(item).rightsConfirmed === true
                    ? "success"
                    : "warning"
                }
              />
              <EvidenceRow
                label="净化与扫描"
                value={dataBase64 ? "已从服务端读取派生对象" : "未确认"}
                tone={dataBase64 ? "success" : "warning"}
              />
              <EvidenceRow
                label="当前媒体状态"
                value={asString(
                  media.find(
                    (entry) => asString(entry.uploadId) === selectedMediaId,
                  )?.state,
                )}
                tone="violet"
              />
            </div>
            <label className="field-block">
              <span className="field-label">决定理由</span>
              <textarea
                className="text-area"
                value={reason}
                onChange={(event) => onReason(event.target.value)}
                placeholder="采用或不采用的可审计理由"
              />
            </label>
            <div className="button-row">
              <button
                className="control leaf"
                type="button"
                disabled={
                  !reason.trim() ||
                  mutation.phase === "submitting" ||
                  mutation.phase === "readback"
                }
                onClick={() => onDecision("ACCEPT")}
              >
                采用
              </button>
              <button
                className="control danger"
                type="button"
                disabled={
                  !reason.trim() ||
                  mutation.phase === "submitting" ||
                  mutation.phase === "readback"
                }
                onClick={() => onDecision("REJECT")}
              >
                不采用
              </button>
              <button
                className="control quiet"
                type="button"
                onClick={onOpenMerge}
              >
                进入证据合并
              </button>
            </div>
            <MutationBanner state={mutation} />
          </article>
        </div>
      ) : null}
    </section>
  );
}

function MergeView({
  data,
  selectedCaseId,
  preview,
  previewState,
  selections,
  reason,
  onReason,
  onSelect,
  onPreview,
  onCommit,
  mutation,
}: {
  data: DashboardData;
  selectedCaseId: string;
  preview: JsonRecord | null;
  previewState: LoadState;
  selections: Record<string, string>;
  reason: string;
  onReason: (value: string) => void;
  onSelect: (claimId: string, choice: string) => void;
  onPreview: () => void;
  onCommit: () => void;
  mutation: MutationState;
}) {
  const item = findCase(data, selectedCaseId);
  if (!item)
    return (
      <EmptyState
        title="尚未选择 Case"
        description="Canonical merge 必须绑定当前 Case、submission revision 与 formal spot revision。"
      />
    );
  const submission = getSubmission(item);
  const payload = getCasePayload(item);
  const rawClaims = Array.isArray(preview?.claims)
    ? preview.claims
    : Array.isArray(preview?.fields)
      ? preview.fields
      : [];
  const claims = rawClaims.map(asRecord);
  const hasFormalTarget = Boolean(asString(submission.spotId, ""));
  const ready =
    hasFormalTarget &&
    claims.length > 0 &&
    claims.every((claim) =>
      Boolean(selections[asString(claim.claimId ?? claim.key)]),
    );
  return (
    <section className="view-stack" data-testid="moderation-canonical-merge">
      <SectionHeader
        eyebrow="MERGE / CANONICAL EVIDENCE"
        title="证据合并预览"
        description={`目标 ${redactId(submission.spotId)} · submission revision ${asString(submission.revision)} · 预览与提交是两个独立的 audited step。`}
        action={
          <StatusPill tone={previewState === "ready" ? "violet" : "warning"}>
            {previewState === "ready" ? "PREVIEW READY" : "未生成预览"}
          </StatusPill>
        }
      />
      <Notice tone="warning" title="合并只生成候选 revision">
        它不会自动上架或替换 active revision。每个事实必须选择 canonical
        value，服务端仍会重新检查 revision、权限、幂等与证据有效期。
      </Notice>
      {!hasFormalTarget ? (
        <Notice tone="violet" title="新地点投稿尚无 formal spot">
          当前投稿必须先完成审核，并由服务端建立正式地点候选与初始
          revision；在获得真实 spotId 前不允许生成或提交 canonical merge。
        </Notice>
      ) : null}
      {previewState === "error" ? (
        <Notice tone="danger" title="合并预览未确认">
          没有使用 fixture 继续渲染；请修复服务端 endpoint 或当前
          Case/revision。
        </Notice>
      ) : null}
      <div className="button-row">
        <button
          className="control secondary"
          type="button"
          onClick={onPreview}
          disabled={
            !hasFormalTarget ||
            previewState === "loading" ||
            mutation.phase === "submitting"
          }
        >
          {previewState === "loading" ? "读取预览中…" : "获取最新预览"}
        </button>
        <StatusPill tone="neutral">
          case {redactId(selectedCaseId)} · spot {redactId(submission.spotId)}
        </StatusPill>
      </div>
      {claims.length ? (
        <div className="merge-list">
          {claims.map((claim, index) => {
            const claimId = asString(
              claim.claimId ?? claim.key,
              `claim-${index}`,
            );
            const current = asRecord(claim.current ?? claim.canonical);
            const candidate = asRecord(
              claim.candidate ?? claim.proposed ?? claim.incoming,
            );
            return (
              <article className="surface-card merge-card" key={claimId}>
                <CardHeading
                  title={asString(claim.label ?? claim.title ?? claimId)}
                  description={asString(
                    claim.description,
                    "选择要写入候选 revision 的值",
                  )}
                  badge={
                    <StatusPill
                      tone={selections[claimId] ? "success" : "warning"}
                    >
                      {selections[claimId] ? "已选择" : "待选择"}
                    </StatusPill>
                  }
                />
                <div className="merge-compare">
                  <button
                    className={`merge-choice ${selections[claimId] === "current" ? "selected" : ""}`}
                    type="button"
                    aria-pressed={selections[claimId] === "current"}
                    onClick={() => onSelect(claimId, "current")}
                  >
                    <span>
                      当前正式值 ·{" "}
                      {asString(
                        claim.currentRevision ?? claim.spotRevision,
                        "revision 未返回",
                      )}
                    </span>
                    <strong>
                      {formatValue(
                        current.value ??
                          claim.currentValue ??
                          claim.canonicalValue,
                      )}
                    </strong>
                    <small>
                      {asString(
                        current.source ?? claim.currentSource,
                        "来源未返回",
                      )}
                    </small>
                  </button>
                  <span className="merge-arrow" aria-hidden="true">
                    →
                  </span>
                  <button
                    className={`merge-choice ${selections[claimId] === "candidate" ? "selected" : ""}`}
                    type="button"
                    aria-pressed={selections[claimId] === "candidate"}
                    onClick={() => onSelect(claimId, "candidate")}
                  >
                    <span>
                      投稿建议值 ·{" "}
                      {asString(
                        claim.submissionRevision ?? submission.revision,
                      )}
                    </span>
                    <strong>
                      {formatValue(
                        candidate.value ??
                          claim.candidateValue ??
                          claim.proposedValue,
                      )}
                    </strong>
                    <small>
                      {asString(
                        candidate.source ?? claim.candidateSource,
                        "来源未返回",
                      )}
                    </small>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : previewState === "ready" ? (
        <EmptyState
          title="服务端没有返回可合并 claim"
          description="不能把缺失的 claim 当作已确认；请回到 Case 或让服务端返回完整 merge preview。"
        />
      ) : null}
      <article className="surface-card commit-card">
        <CardHeading
          title="提交 canonical merge"
          description="失败时保留本地选择与理由；成功仍必须有服务端 receipt 和 readback。"
          badge={
            <StatusPill tone={ready ? "success" : "warning"}>
              {ready ? "可提交" : "等待选择"}
            </StatusPill>
          }
        />
        <div className="fact-grid">
          <Fact
            label="submission revision"
            value={asString(submission.revision)}
            mono
          />
          <Fact
            label="formal spot revision"
            value={asString(
              findSpot(data, asString(submission.spotId))?.version,
              "服务端未返回",
            )}
            mono
          />
          <Fact
            label="publication impact"
            value={formatValue(
              payload.publicationImpact ?? "NONE / 服务端未返回",
            )}
          />
        </div>
        <label className="field-block">
          <span className="field-label">合并理由</span>
          <textarea
            className="text-area"
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            placeholder="说明为什么这些 claim 可以进入 canonical record"
          />
        </label>
        <button
          className="control leaf"
          type="button"
          disabled={
            !ready ||
            !reason.trim() ||
            mutation.phase === "submitting" ||
            mutation.phase === "readback"
          }
          onClick={onCommit}
        >
          确认全部字段后合并
        </button>
        <MutationBanner state={mutation} />
      </article>
    </section>
  );
}

function PublicationView({
  data,
  selectedSpotId,
  onSpot,
  reason,
  onReason,
  mutation,
  onAssess,
  onLifecycle,
}: {
  data: DashboardData;
  selectedSpotId: string;
  onSpot: (id: string) => void;
  reason: string;
  onReason: (value: string) => void;
  mutation: MutationState;
  onAssess: () => void;
  onLifecycle: (action: "publish" | "suspend" | "unpublish") => void;
}) {
  const spot = findSpot(data, selectedSpotId);
  const assessment = spot ? spotAssessmentOf(spot) : {};
  const rawBlockers = Array.isArray(assessment.blockers ?? assessment.failures)
    ? ((assessment.blockers ?? assessment.failures) as unknown[])
    : [];
  const blockerCounts = new Map<string, number>();
  const structuredBlockers: JsonRecord[] = [];
  for (const blocker of rawBlockers) {
    if (typeof blocker === "string") {
      blockerCounts.set(blocker, (blockerCounts.get(blocker) ?? 0) + 1);
    } else {
      structuredBlockers.push(asRecord(blocker));
    }
  }
  const blockers: JsonRecord[] = [
    ...structuredBlockers,
    ...Array.from(blockerCounts, ([code, count]) => ({ code, count })),
  ];
  const checks = asRecords(
    assessment.checks ?? assessment.families ?? assessment.requirements,
  );
  const complete = assessment.complete === true;
  if (!spot)
    return (
      <EmptyState
        title="没有可评估的正式地点"
        description="评估必须来自服务端 formal spot projection；不会用 DRA 里的示例地点替代。"
      />
    );
  const status = spotStatusOf(spot);
  return (
    <section className="view-stack" data-testid="publication-assessment">
      <SectionHeader
        eyebrow="PUBLISH / ASSESSMENT"
        title="发布完整性评估"
        description={`${spotNameOf(spot)} · ${redactId(selectedSpotId)} · assessment digest ${redactId(assessment.assessmentDigest)}`}
        action={
          <select
            className="select-control"
            value={selectedSpotId}
            onChange={(event) => onSpot(event.target.value)}
            aria-label="选择正式地点"
          >
            {data.spots.map((item) => (
              <option key={spotIdOf(item)} value={spotIdOf(item)}>
                {spotNameOf(item)} · {spotStatusOf(item)}
              </option>
            ))}
          </select>
        }
      />
      <div className="toolbar">
        <StatusPill tone={complete ? "success" : "warning"}>
          {complete ? "可上架" : "BLOCKED / 未完成"}
        </StatusPill>
        <span className="muted">
          active status {status} · revision{" "}
          {asString(spot.version, "服务端未返回")}
        </span>
        <button
          className="control secondary compact"
          type="button"
          onClick={onAssess}
          disabled={
            !reason.trim() ||
            mutation.phase === "submitting" ||
            mutation.phase === "readback"
          }
        >
          重新评估
        </button>
      </div>
      {!Object.keys(assessment).length ? (
        <Notice tone="warning" title="服务端未返回 publication assessment">
          发布动作保持禁用。必须由 server policy 返回当前 revision、digest 和
          completeness 结论。
        </Notice>
      ) : null}
      <div className="grid-two">
        <article className="surface-card">
          <CardHeading
            title="正式地点门槛"
            description="任何必需项缺失或无效都会保持 fail-closed"
            badge={
              <StatusPill tone={complete ? "success" : "warning"}>
                {checks.length
                  ? `${checks.filter((check) => check.complete === true || check.status === "PASS").length} / ${checks.length}`
                  : "服务端未返回"}
              </StatusPill>
            }
          />
          {checks.length ? (
            <div className="evidence-list">
              {checks.map((check, index) => {
                const passed =
                  check.complete === true ||
                  ["PASS", "PASSED", "COMPLETE"].includes(
                    String(check.status).toUpperCase(),
                  );
                return (
                  <EvidenceRow
                    key={asString(check.key ?? check.id, String(index))}
                    label={asString(check.label ?? check.key ?? check.id)}
                    value={asString(
                      check.detail ?? check.reason ?? check.message,
                      "服务端未返回说明",
                    )}
                    tone={passed ? "success" : "warning"}
                  />
                );
              })}
            </div>
          ) : (
            <div className="unavailable-copy">
              评估结果只接受真实 API 返回；未返回的检查不会默认为通过。
            </div>
          )}
          {blockers.length ? (
            <div className="blocker-list">
              <span className="field-label">阻断项</span>
              {blockers.map((blocker, index) => (
                <div
                  className="blocker"
                  key={asString(blocker.key ?? blocker.code, String(index))}
                >
                  <strong>
                    {asString(blocker.label ?? blocker.code, "未命名阻断")}
                  </strong>
                  <span>
                    {asString(
                      blocker.reason ?? blocker.message,
                      asNumber(blocker.count) > 1
                        ? `服务端返回 ${asNumber(blocker.count)} 个同类阻断实例；详细字段未包含在当前读模型。`
                        : "服务端返回了阻断代码；详细字段未包含在当前读模型。",
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </article>
        <article className="surface-card">
          <CardHeading
            title="影响与操作"
            description="先说明对象、影响、理由和恢复点，再提交高影响动作"
          />
          <div className="fact-grid">
            <Fact
              label="地图 / 搜索"
              value={formatValue(
                assessment.publicProjection ?? assessment.projection,
              )}
            />
            <Fact
              label="assessment digest"
              value={redactId(assessment.assessmentDigest)}
              mono
            />
            <Fact
              label="recovery point"
              value={redactId(assessment.recoveryPoint)}
              mono
            />
          </div>
          <Notice tone="violet" title="审核接受不会自动上架">
            publication 只能绑定当前 spot、active revision 和 assessment
            digest；读模型读回匹配前不会显示完成。
          </Notice>
          <label className="field-block">
            <span className="field-label">动作理由</span>
            <textarea
              className="text-area"
              value={reason}
              onChange={(event) => onReason(event.target.value)}
              placeholder="说明本次发布治理动作及影响"
            />
          </label>
          <div className="button-row">
            <button
              className="control leaf"
              type="button"
              disabled={
                !complete ||
                !reason.trim() ||
                mutation.phase === "submitting" ||
                mutation.phase === "readback"
              }
              onClick={() => onLifecycle("publish")}
            >
              上架当前 revision
            </button>
            <button
              className="control secondary"
              type="button"
              disabled={
                !reason.trim() ||
                mutation.phase === "submitting" ||
                mutation.phase === "readback"
              }
              onClick={() => onLifecycle("suspend")}
            >
              暂停展示
            </button>
            <button
              className="control danger"
              type="button"
              disabled={
                !reason.trim() ||
                mutation.phase === "submitting" ||
                mutation.phase === "readback"
              }
              onClick={() => onLifecycle("unpublish")}
            >
              下架
            </button>
          </div>
          <MutationBanner state={mutation} />
        </article>
      </div>
    </section>
  );
}

function ReplacementView({
  data,
  currentSpotId,
  successorSpotId,
  onCurrentSpot,
  onSuccessorSpot,
  reason,
  onReason,
  preview,
  previewState,
  mutation,
  onPreview,
  onAction,
}: {
  data: DashboardData;
  currentSpotId: string;
  successorSpotId: string;
  onCurrentSpot: (id: string) => void;
  onSuccessorSpot: (id: string) => void;
  reason: string;
  onReason: (value: string) => void;
  preview: JsonRecord | null;
  previewState: LoadState;
  mutation: MutationState;
  onPreview: () => void;
  onAction: (action: "replace" | "retire") => void;
}) {
  const current = findSpot(data, currentSpotId);
  const successor = findSpot(data, successorSpotId);
  const listedImpacts = asRecords(
    preview?.impacts ?? preview?.effects ?? preview?.relations,
  );
  const impacts = listedImpacts.length
    ? listedImpacts
    : preview && Object.keys(preview).length
      ? [
          {
            key: "favorites",
            label: "收藏关系",
            detail: `${asNumber(preview.favoriteCount)} 项保留原 spotId，不静默迁移`,
            severity: "NORMAL",
          },
          {
            key: "plans",
            label: "观测计划",
            detail: `${asNumber(preview.planCount)} 项保留原 spotId，不静默迁移`,
            severity: "NORMAL",
          },
          {
            key: "relation",
            label: "关系状态",
            detail: asString(preview.relationState, "服务端未返回"),
            severity: "NORMAL",
          },
          ...(Array.isArray(preview.warnings) ? preview.warnings : []).map(
            (warning, index) => ({
              key: `warning-${index}`,
              label: "服务端影响说明",
              detail: asString(warning, "服务端未返回"),
              severity: "HIGH",
            }),
          ),
        ]
      : [];
  return (
    <section className="view-stack" data-testid="spot-replacement-retirement">
      <SectionHeader
        eyebrow="LIFECYCLE / HIGH IMPACT"
        title="替换与退役"
        description="先预览 successor 关系和用户影响，再提交带 current revision、理由、幂等键和恢复点的高影响转换。"
        action={<StatusPill tone="warning">高影响操作</StatusPill>}
      />
      <Notice tone="warning" title="历史与关系不可硬删除">
        原始 revision、证据、favorite/plan 关系和审计必须保留；successor
        不能自指，也不能形成替换环。
      </Notice>
      <div className="grid-two">
        <article className="surface-card">
          <CardHeading
            title="当前正式地点"
            description="替换或退役的 source object"
            badge={
              <StatusPill tone={current ? "success" : "warning"}>
                {current ? spotStatusOf(current) : "未选择"}
              </StatusPill>
            }
          />
          <label className="field-block">
            <span className="field-label">Current spot</span>
            <select
              className="select-control"
              value={currentSpotId}
              onChange={(event) => onCurrentSpot(event.target.value)}
            >
              <option value="">选择服务端地点</option>
              {data.spots.map((spot) => (
                <option key={spotIdOf(spot)} value={spotIdOf(spot)}>
                  {spotNameOf(spot)} · {redactId(spotIdOf(spot))}
                </option>
              ))}
            </select>
          </label>
          {current ? (
            <div className="fact-grid">
              <Fact
                label="active revision"
                value={asString(current.version, "服务端未返回")}
                mono
              />
              <Fact label="status" value={spotStatusOf(current)} />
              <Fact
                label="公开关系"
                value={formatValue(
                  asRecord(current.payload).relationships ?? "服务端未返回",
                )}
              />
            </div>
          ) : null}
        </article>
        <article className="surface-card">
          <CardHeading
            title="替代地点"
            description="可选 successor；不允许回指 current"
            badge={
              <StatusPill tone={successor ? "violet" : "warning"}>
                {successor ? spotStatusOf(successor) : "未选择"}
              </StatusPill>
            }
          />
          <label className="field-block">
            <span className="field-label">Successor spot</span>
            <select
              className="select-control"
              value={successorSpotId}
              onChange={(event) => onSuccessorSpot(event.target.value)}
            >
              <option value="">选择服务端地点</option>
              {data.spots
                .filter((spot) => spotIdOf(spot) !== currentSpotId)
                .map((spot) => (
                  <option key={spotIdOf(spot)} value={spotIdOf(spot)}>
                    {spotNameOf(spot)} · {redactId(spotIdOf(spot))}
                  </option>
                ))}
            </select>
          </label>
          {successor ? (
            <div className="fact-grid">
              <Fact
                label="candidate revision"
                value={asString(successor.version, "服务端未返回")}
                mono
              />
              <Fact
                label="assessment"
                value={
                  spotAssessmentOf(successor).complete === true
                    ? "PASS"
                    : "服务端未返回"
                }
              />
              <Fact label="spot id" value={redactId(successorSpotId)} mono />
            </div>
          ) : null}
        </article>
      </div>
      <article className="surface-card">
        <CardHeading
          title="影响预览"
          description="预览不会写入；执行绑定 current revision、successor revision 与 recovery point"
          badge={
            <StatusPill tone={previewState === "ready" ? "violet" : "warning"}>
              {previewState === "ready" ? "已读取" : "尚未读取"}
            </StatusPill>
          }
        />
        {impacts.length ? (
          <div className="evidence-list">
            {impacts.map((impact, index) => (
              <EvidenceRow
                key={asString(impact.key ?? impact.id, String(index))}
                label={asString(impact.label ?? impact.key ?? impact.id)}
                value={asString(
                  impact.detail ?? impact.effect ?? impact.count,
                  "服务端未返回影响",
                )}
                tone={
                  String(impact.severity).toUpperCase() === "HIGH"
                    ? "warning"
                    : "neutral"
                }
              />
            ))}
          </div>
        ) : (
          <div className="unavailable-copy">
            没有预览就不能推断收藏、计划、地图或历史影响。
          </div>
        )}
        <label className="field-block">
          <span className="field-label">影响与动作理由</span>
          <textarea
            className="text-area"
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            placeholder="说明替换/退役原因，以及无 successor 时的恢复边界"
          />
        </label>
        <div className="button-row">
          <button
            className="control secondary"
            type="button"
            disabled={
              !currentSpotId ||
              !successorSpotId ||
              !reason.trim() ||
              previewState === "loading"
            }
            onClick={onPreview}
          >
            生成最新影响预览
          </button>
          <button
            className="control leaf"
            type="button"
            disabled={
              !currentSpotId ||
              !successorSpotId ||
              !reason.trim() ||
              previewState !== "ready" ||
              mutation.phase === "submitting" ||
              mutation.phase === "readback"
            }
            onClick={() => onAction("replace")}
          >
            确认替换
          </button>
          <button
            className="control danger"
            type="button"
            disabled={
              !currentSpotId ||
              !reason.trim() ||
              previewState !== "ready" ||
              mutation.phase === "submitting" ||
              mutation.phase === "readback"
            }
            onClick={() => onAction("retire")}
          >
            确认退役
          </button>
        </div>
        <MutationBanner state={mutation} />
      </article>
    </section>
  );
}

function AuditView({
  data,
  state,
  rows,
  onRefresh,
}: {
  data: DashboardData;
  state: LoadState;
  rows: JsonRecord[];
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const filtered = rows.filter((item) => {
    const action = asString(item.action, "");
    const category = action.includes("MERGE")
      ? "MERGE"
      : action.includes("MODERATION") || action.includes("SUBMISSION")
        ? "MODERATION"
        : action.includes("PUBLICATION") || action.includes("SPOT")
          ? "PUBLICATION"
          : "ALL";
    return (
      (filter === "ALL" || category === filter) &&
      `${action} ${asString(item.subject_id)} ${asString(item.actor_id)} ${asString(item.request_id)}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    );
  });
  const exportAudit = () => {
    const safeRows = filtered.map((item) => ({
      auditId: item.audit_id,
      actor: item.actor_id,
      action: item.action,
      subjectType: item.subject_type,
      subjectId: redactId(item.subject_id),
      requestId: redactId(item.request_id),
      occurredAt: item.occurred_at,
    }));
    const blob = new Blob([JSON.stringify(safeRows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "starward-operations-audit.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="view-stack" data-testid="operations-audit">
      <SectionHeader
        eyebrow="AUDIT / APPEND ONLY"
        title="不可变审计"
        description="仅展示服务端返回的脱敏操作上下文；筛选不改变事件顺序，导出只包含当前已读字段。"
        action={
          <div className="button-row">
            <button
              className="control secondary compact"
              type="button"
              onClick={onRefresh}
            >
              刷新审计
            </button>
            <button
              className="control quiet compact"
              type="button"
              onClick={exportAudit}
              disabled={!filtered.length}
            >
              导出当前范围
            </button>
          </div>
        }
      />
      <div className="toolbar">
        <div className="filter-row">
          <button
            className={`filter-button ${filter === "ALL" ? "active" : ""}`}
            type="button"
            onClick={() => setFilter("ALL")}
          >
            全部事件
          </button>
          <button
            className={`filter-button ${filter === "MODERATION" ? "active" : ""}`}
            type="button"
            onClick={() => setFilter("MODERATION")}
          >
            审核
          </button>
          <button
            className={`filter-button ${filter === "MERGE" ? "active" : ""}`}
            type="button"
            onClick={() => setFilter("MERGE")}
          >
            合并
          </button>
          <button
            className={`filter-button ${filter === "PUBLICATION" ? "active" : ""}`}
            type="button"
            onClick={() => setFilter("PUBLICATION")}
          >
            发布治理
          </button>
        </div>
        <label className="search-field">
          <span className="sr-only">搜索审计</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索 action、actor、对象"
          />
          <span aria-hidden="true">⌕</span>
        </label>
      </div>
      {state === "partial" ? (
        <Notice tone="warning" title="审计使用 dashboard 的部分读模型">
          专用审计读取接口未返回完整数据；当前列表仍来自已认证服务端，不会补入静态事件。
        </Notice>
      ) : null}
      {state === "error" ? (
        <Notice tone="danger" title="审计读取失败">
          历史事件不可由前端重建；请修复服务端读取后重试。
        </Notice>
      ) : null}
      {filtered.length ? (
        <article className="surface-card audit-card">
          <CardHeading
            title="服务端事件序列"
            description="事件只追加；恢复必须使用对应 recovery point，不修改历史。"
            badge={
              <StatusPill tone="success">
                {filtered.length} 个已读事件
              </StatusPill>
            }
          />
          <div className="audit-list">
            {filtered.map((item, index) => (
              <div
                className="audit-row"
                key={asString(item.audit_id, String(index))}
              >
                <time>{asString(item.occurred_at, "时间未返回")}</time>
                <div>
                  <strong>{asString(item.action, "ACTION 未返回")}</strong>
                  <span>
                    {asString(item.subject_type)} · {redactId(item.subject_id)}{" "}
                    · request {redactId(item.request_id)}
                  </span>
                </div>
                <div>
                  <strong>{asString(item.actor_id, "actor 未返回")}</strong>
                  <span>audit {redactId(item.audit_id)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      ) : (
        <EmptyState
          title={
            query || filter !== "ALL"
              ? "没有符合条件的事件"
              : "服务端当前没有审计事件"
          }
          description="审计不是恢复按钮；没有使用 DRA 中的示例操作历史填充。"
        />
      )}
    </section>
  );
}

function OperationsSidebar({
  view,
  data,
  actor,
  onNavigate,
}: {
  view: ViewKey;
  data: DashboardData | null;
  actor: string;
  onNavigate: (view: ViewKey) => void;
}) {
  const pendingCount = data?.queue.length ?? 0;
  const mediaCount =
    data?.queue.reduce(
      (count, item) =>
        count + asNumber(item.pendingMediaCount ?? item.mediaPendingCount),
      0,
    ) ?? 0;
  const icons: Record<
    ViewKey,
    "inbox" | "file" | "images" | "merge" | "clipboard" | "repeat" | "history"
  > = {
    queue: "inbox",
    case: "file",
    media: "images",
    merge: "merge",
    publication: "clipboard",
    replacement: "repeat",
    audit: "history",
  };
  return (
    <aside className="ops-sidebar">
      <div className="ops-logo">
        <span className="logo-orbit" aria-hidden="true">
          <OpsIcon name="telescope" />
        </span>
        <div>
          <strong>Starward Ops</strong>
          <span>数据与发布治理</span>
        </div>
      </div>
      {NAV_GROUPS.map((group) => (
        <div className="nav-group" key={group.label}>
          <span className="nav-label">{group.label}</span>
          {group.items.map((item) => {
            const count =
              item.key === "queue"
                ? pendingCount
                : item.key === "media"
                  ? mediaCount
                  : 0;
            return (
              <button
                key={item.key}
                className={`nav-button ${view === item.key ? "active" : ""}`}
                type="button"
                data-nav-key={item.key}
                aria-current={view === item.key ? "page" : undefined}
                aria-label={`${item.label}：${item.description}`}
                onClick={() => onNavigate(item.key)}
              >
                <span className="nav-icon">
                  <OpsIcon name={icons[item.key]} />
                </span>
                <span>{item.label}</span>
                {count > 0 ? <b>{count}</b> : <span aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      ))}
      <div className="ops-user">
        <span className="avatar" aria-hidden="true">
          {actor.slice(6, 7).toUpperCase() || "O"}
        </span>
        <div>
          <strong>{actor}</strong>
          <span>owner.moderation · 已认证</span>
        </div>
      </div>
    </aside>
  );
}

export default function AdminPage() {
  const initialToken = getSessionStorage(SESSION_TOKEN_KEY);
  const initialActor = getSessionStorage(SESSION_ACTOR_KEY) || "admin:local";
  const [session, setSession] = useState<AuthSession | null>(
    initialToken ? { token: initialToken, actor: initialActor } : null,
  );
  const [token, setToken] = useState(initialToken);
  const [actor, setActor] = useState(initialActor);
  const [authState, setAuthState] = useState<
    "idle" | "checking" | "authenticated" | "error"
  >(initialToken ? "checking" : "idle");
  const [authError, setAuthError] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [dashboardState, setDashboardState] = useState<LoadState>(
    initialToken ? "loading" : "idle",
  );
  const [queueState, setQueueState] = useState<LoadState>(
    initialToken ? "loading" : "idle",
  );
  const [view, setView] = useState<ViewKey>(
    () => (window.location.hash.slice(1) as ViewKey) || "queue",
  );
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedSpotId, setSelectedSpotId] = useState("");
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [caseDetail, setCaseDetail] = useState<JsonRecord | null>(null);
  const [caseDetailState, setCaseDetailState] = useState<LoadState>("idle");
  const [mediaDetail, setMediaDetail] = useState<JsonRecord | null>(null);
  const [mediaState, setMediaState] = useState<LoadState>("idle");
  const [auditRows, setAuditRows] = useState<JsonRecord[]>([]);
  const [auditState, setAuditState] = useState<LoadState>("idle");
  const [mergePreview, setMergePreview] = useState<JsonRecord | null>(null);
  const [mergePreviewState, setMergePreviewState] = useState<LoadState>("idle");
  const [replacementPreview, setReplacementPreview] =
    useState<JsonRecord | null>(null);
  const [replacementPreviewState, setReplacementPreviewState] =
    useState<LoadState>("idle");
  const [mergeSelections, setMergeSelections] = useState<
    Record<string, string>
  >({});
  const [reason, setReason] = useState("");
  const [mutation, setMutation] = useState<MutationState>({
    phase: "idle",
    label: "",
  });
  const activeRequest = useRef<AbortController | null>(null);

  const readDashboard = useCallback(
    async (activeSession: AuthSession, signal?: AbortSignal) => {
      const [dashboardEnvelope, queueResult] = await Promise.all([
        requestEnvelope<unknown>("/v2/admin/dashboard", activeSession, {
          method: "GET",
          signal,
        }),
        requestEnvelope<unknown>("/v2/admin/moderation/queue", activeSession, {
          method: "GET",
          signal,
        })
          .then((envelope) => ({ envelope }))
          .catch((error: unknown) => ({ error })),
      ]);
      const next = normalizeDashboard(dashboardEnvelope.data);
      if ("envelope" in queueResult) {
        next.queue = asRecords(asRecord(queueResult.envelope.data).items);
      } else {
        next.queue = [];
      }
      return {
        data: next,
        queueState:
          "envelope" in queueResult
            ? next.queue.length
              ? "ready"
              : "empty"
            : ("error" as LoadState),
      };
    },
    [],
  );

  const loadDashboard = useCallback(
    async (activeSession: AuthSession) => {
      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;
      setDashboardState("loading");
      try {
        const result = await readDashboard(activeSession, controller.signal);
        const next = result.data;
        setData(next);
        setQueueState(result.queueState);
        setDashboardState(
          next.spots.length || next.moderation.length || next.audits.length
            ? result.queueState === "error"
              ? "partial"
              : "ready"
            : "empty",
        );
        setAuthState("authenticated");
        return next;
      } catch (error) {
        if (controller.signal.aborted) throw error;
        setDashboardState("error");
        throw error;
      }
    },
    [readDashboard],
  );

  useEffect(() => {
    if (!session) return;
    loadDashboard(session).catch((error) => {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setAuthError(getErrorMessage(error));
    });
    return () => activeRequest.current?.abort();
  }, [loadDashboard, session]);

  useEffect(() => {
    if (!data) return;
    const caseStillExists = data.queue.some(
      (item) => queueCaseId(item) === selectedCaseId,
    );
    const spotStillExists = data.spots.some(
      (item) => spotIdOf(item) === selectedSpotId,
    );
    if (!caseStillExists)
      setSelectedCaseId(data.queue[0] ? queueCaseId(data.queue[0]) : "");
    if (!spotStillExists)
      setSelectedSpotId(data.spots[0] ? spotIdOf(data.spots[0]) : "");
  }, [data, selectedCaseId, selectedSpotId]);

  useEffect(() => {
    if (!session || view !== "case" || !selectedCaseId) return;
    const controller = new AbortController();
    setCaseDetailState("loading");
    requestEnvelope<unknown>(
      `/v2/admin/moderation/cases/${encodeURIComponent(selectedCaseId)}`,
      session,
      { method: "GET", signal: controller.signal },
    )
      .then((envelope) => {
        setCaseDetail(asRecord(envelope.data));
        setCaseDetailState("ready");
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setCaseDetail(null);
          setCaseDetailState(
            error instanceof ApiError && error.status === 404
              ? "partial"
              : "error",
          );
        }
      });
    return () => controller.abort();
  }, [session, selectedCaseId, view]);

  useEffect(() => {
    if (!session || view !== "media" || !selectedMediaId) return;
    const controller = new AbortController();
    setMediaState("loading");
    requestEnvelope<unknown>(
      `/v2/admin/contribution-media/${encodeURIComponent(selectedMediaId)}`,
      session,
      { method: "GET", signal: controller.signal },
    )
      .then((envelope) => {
        setMediaDetail(asRecord(envelope.data));
        setMediaState("ready");
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setMediaDetail(null);
          setMediaState(
            error instanceof ApiError && error.status === 404
              ? "partial"
              : "error",
          );
        }
      });
    return () => controller.abort();
  }, [session, selectedMediaId, view]);

  const loadAudit = useCallback(async () => {
    if (!session) return;
    setAuditState("loading");
    try {
      const envelope = await requestEnvelope<unknown>(
        "/v2/admin/audit-logs",
        session,
        { method: "GET" },
      );
      const rows = asRecords(envelope.data);
      setAuditRows(rows);
      setAuditState(rows.length ? "ready" : "empty");
    } catch {
      setAuditRows(data?.audits ?? []);
      setAuditState(data?.audits.length ? "partial" : "error");
    }
  }, [data, session]);

  useEffect(() => {
    if (view === "audit") void loadAudit();
  }, [loadAudit, view]);

  const authenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    if (!/^admin:[A-Za-z0-9._-]{1,64}$/u.test(actor.trim())) {
      setAuthError("actor identity 必须符合 admin:<name> 格式");
      return;
    }
    const nextSession = { token: token.trim(), actor: actor.trim() };
    if (!nextSession.token) {
      setAuthError("管理员 token 不能为空");
      return;
    }
    setAuthState("checking");
    try {
      await loadDashboard(nextSession);
      setSession(nextSession);
      setSessionStorage(nextSession);
    } catch (error) {
      setSession(null);
      setAuthState("error");
      setAuthError(getErrorMessage(error));
    }
  };

  const signOut = () => {
    activeRequest.current?.abort();
    setSession(null);
    setData(null);
    setDashboardState("idle");
    setAuthState("idle");
    setAuthError("");
    setSessionStorage(null);
  };

  const navigate = (nextView: ViewKey) => {
    setView(nextView);
    window.history.replaceState(null, "", `#${nextView}`);
    setMutation({ phase: "idle", label: "" });
    setReason("");
  };

  const refresh = () => {
    if (session)
      void loadDashboard(session).catch((error) =>
        setAuthError(getErrorMessage(error)),
      );
  };

  const runMutation = useCallback(
    async (input: {
      label: string;
      path: string;
      body: JsonRecord;
      verify?: (fresh: DashboardData, receipt: JsonRecord) => boolean;
      verifyReadback?: (
        activeSession: AuthSession,
        receipt: JsonRecord,
      ) => Promise<boolean>;
    }) => {
      if (!session) return;
      const idempotencyKey = newIdempotencyKey(
        input.label.replace(/\s+/gu, "-"),
      );
      setMutation({ phase: "submitting", label: input.label });
      try {
        const envelope = await requestEnvelope<unknown>(
          input.path,
          session,
          {
            method: "POST",
            body: JSON.stringify({ ...input.body, idempotencyKey }),
          },
          idempotencyKey,
        );
        const receipt = extractReceipt(envelope);
        if (!receipt) {
          setMutation({
            phase: "unverified",
            label: input.label,
            message: "服务端响应缺少 receipt；即使 HTTP 成功，也不会显示成功。",
            requestId: asString(envelope.requestId),
          });
          return;
        }
        setMutation({
          phase: "readback",
          label: input.label,
          receipt,
          requestId: asString(envelope.requestId),
        });
        const freshResult = await readDashboard(session);
        const fresh = freshResult.data;
        setData(fresh);
        setQueueState(freshResult.queueState);
        const readbackMatches = input.verifyReadback
          ? await input.verifyReadback(session, receipt)
          : input.verify
            ? input.verify(fresh, receipt)
            : true;
        if (!readbackMatches) {
          setMutation({
            phase: "unverified",
            label: input.label,
            receipt,
            requestId: asString(envelope.requestId),
            message:
              "已收到服务端 receipt，但当前 readback 没有证明预期对象/影响已经生效。",
          });
          return;
        }
        setMutation({
          phase: "confirmed",
          label: input.label,
          receipt,
          requestId: asString(envelope.requestId),
          message: "receipt 与服务端 readback 均匹配当前操作。",
        });
      } catch (error) {
        setMutation({
          phase: "error",
          label: input.label,
          message: getErrorMessage(error),
          requestId: error instanceof ApiError ? error.requestId : undefined,
        });
      }
    },
    [readDashboard, session],
  );

  const resolveCase = (
    resolution: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED",
  ) => {
    if (!data || !selectedCaseId) return;
    const item = findCase(data, selectedCaseId);
    const submission = item ? getSubmission(item) : {};
    const path =
      resolution === "CHANGES_REQUESTED"
        ? `/v2/admin/moderation/cases/${encodeURIComponent(selectedCaseId)}/request-changes`
        : `/v2/admin/moderation/cases/${encodeURIComponent(selectedCaseId)}/resolve`;
    const body =
      resolution === "CHANGES_REQUESTED"
        ? { reason, expectedRevision: submission.revision }
        : { resolution, reason, expectedRevision: submission.revision };
    void runMutation({
      label:
        resolution === "APPROVED"
          ? "接收投稿"
          : resolution === "REJECTED"
            ? "拒绝投稿"
            : "请求补充",
      path,
      body,
      verify: (fresh) => {
        const next = findCase(fresh, selectedCaseId);
        const state = asString(next?.state).toUpperCase();
        return resolution === "CHANGES_REQUESTED"
          ? ["CHANGES_REQUESTED", "NEEDS_CHANGES", "PENDING_CHANGES"].includes(
              state,
            )
          : state === resolution;
      },
    });
  };

  const decideMedia = (decision: "ACCEPT" | "REJECT") => {
    if (!selectedCaseId || !selectedMediaId) return;
    const mediaId = selectedMediaId;
    void runMutation({
      label: decision === "ACCEPT" ? "采用媒体" : "不采用媒体",
      path: `/v2/admin/moderation/cases/${encodeURIComponent(selectedCaseId)}/media-decisions`,
      body: { mediaId, decision, reason },
      verifyReadback: async (activeSession) => {
        const envelope = await requestEnvelope<unknown>(
          `/v2/admin/contribution-media/${encodeURIComponent(mediaId)}/review`,
          activeSession,
          { method: "GET" },
        );
        const payload = asRecord(envelope.data);
        const media = asRecord(payload.media ?? payload);
        return (
          asString(media.decision).toUpperCase() ===
          (decision === "ACCEPT" ? "ACCEPTED" : "REJECTED")
        );
      },
    });
  };

  const loadMergePreview = async () => {
    if (!session || !data || !selectedCaseId) return;
    const item = findCase(data, selectedCaseId);
    const submission = item ? getSubmission(item) : {};
    setMergePreviewState("loading");
    try {
      const envelope = await requestEnvelope<unknown>(
        `/v2/admin/moderation/cases/${encodeURIComponent(selectedCaseId)}/merge-preview`,
        session,
        {
          method: "POST",
          body: JSON.stringify({
            spotId: submission.spotId,
            expectedSubmissionRevision: submission.revision,
            expectedSpotRevision: findSpot(data, asString(submission.spotId))
              ?.version,
          }),
        },
      );
      const payload = asRecord(envelope.data);
      const preview = asRecord(payload.preview ?? payload);
      setMergePreview(preview);
      setMergeSelections({});
      setMergePreviewState(Object.keys(preview).length ? "ready" : "partial");
    } catch {
      setMergePreview(null);
      setMergeSelections({});
      setMergePreviewState("error");
    }
  };

  const commitMerge = () => {
    if (!data || !selectedCaseId) return;
    const item = findCase(data, selectedCaseId);
    const submission = item ? getSubmission(item) : {};
    void runMutation({
      label: "提交 canonical merge",
      path: `/v2/admin/moderation/cases/${encodeURIComponent(selectedCaseId)}/merge`,
      body: {
        spotId: submission.spotId,
        confirmedClaims: Object.keys(mergeSelections),
        reason,
        expectedSubmissionRevision: submission.revision,
        expectedSpotRevision: findSpot(data, asString(submission.spotId))
          ?.version,
      },
      verify: (fresh) =>
        Boolean(
          getCasePayload(findCase(fresh, selectedCaseId) ?? {}).canonicalMerge,
        ),
    });
  };

  const assessPublication = () => {
    if (!data || !selectedSpotId) return;
    const spot = findSpot(data, selectedSpotId);
    void runMutation({
      label: "重新评估发布完整性",
      path: `/v2/admin/spots/${encodeURIComponent(selectedSpotId)}/publication-assessments`,
      body: { expectedRevision: spot?.version, reason },
      verify: (fresh, receipt) => {
        const assessment = spotAssessmentOf(
          findSpot(fresh, selectedSpotId) ?? {},
        );
        return Boolean(
          Object.keys(assessment).length &&
          (!receipt.assessmentDigest ||
            assessment.assessmentDigest === receipt.assessmentDigest),
        );
      },
    });
  };

  const lifecycle = (action: "publish" | "suspend" | "unpublish") => {
    if (!data || !selectedSpotId) return;
    const spot = findSpot(data, selectedSpotId);
    const path = `/v2/admin/spots/${encodeURIComponent(selectedSpotId)}/${action}`;
    const expected =
      action === "publish"
        ? ["PUBLISHED"]
        : action === "suspend"
          ? ["TEMPORARILY_CLOSED", "SUSPENDED"]
          : ["UNPUBLISHED", "DATA_INSUFFICIENT"];
    void runMutation({
      label:
        action === "publish"
          ? "上架正式地点"
          : action === "suspend"
            ? "暂停展示"
            : "下架正式地点",
      path,
      body: {
        reason,
        expectedRevision: spot?.version,
        assessmentDigest: spotAssessmentOf(spot ?? {}).assessmentDigest,
      },
      verify: (fresh) =>
        expected.includes(spotStatusOf(findSpot(fresh, selectedSpotId) ?? {})),
    });
  };

  const [currentSpotId, setCurrentSpotId] = useState("");
  const [successorSpotId, setSuccessorSpotId] = useState("");
  useEffect(() => {
    if (!currentSpotId && selectedSpotId) setCurrentSpotId(selectedSpotId);
  }, [currentSpotId, selectedSpotId]);

  const loadReplacementPreview = async () => {
    if (!session || !data || !currentSpotId || !successorSpotId) return;
    setReplacementPreviewState("loading");
    try {
      const envelope = await requestEnvelope<unknown>(
        `/v2/admin/spots/${encodeURIComponent(currentSpotId)}/replacement-preview`,
        session,
        {
          method: "POST",
          body: JSON.stringify({
            successorSpotId,
            expectedRevision: findSpot(data, currentSpotId)?.version,
          }),
        },
      );
      const payload = asRecord(envelope.data);
      const impact = asRecord(payload.impact ?? payload);
      setReplacementPreview(impact);
      setReplacementPreviewState(
        Object.keys(impact).length ? "ready" : "partial",
      );
    } catch {
      setReplacementPreview(null);
      setReplacementPreviewState("error");
    }
  };
  const replacementAction = (action: "replace" | "retire") => {
    if (!data || !currentSpotId) return;
    const current = findSpot(data, currentSpotId);
    const path = `/v2/admin/spots/${encodeURIComponent(currentSpotId)}/${action}`;
    void runMutation({
      label: action === "replace" ? "替换正式地点" : "退役正式地点",
      path,
      body: {
        successorSpotId: successorSpotId || null,
        expectedRevision: current?.version,
        previewDigest:
          replacementPreview?.digest ?? replacementPreview?.impactDigest,
        reason,
      },
      verifyReadback:
        action === "replace"
          ? async (_activeSession, receipt) => {
              const readback = asRecord(receipt.readback ?? receipt.result);
              return (
                asString(readback.relationState).toUpperCase() ===
                  "COMMITTED" && asString(readback.spotId) === currentSpotId
              );
            }
          : undefined,
      verify:
        action === "retire"
          ? (fresh) =>
              spotStatusOf(findSpot(fresh, currentSpotId) ?? {}) === "RETIRED"
          : undefined,
    });
  };

  const openCase = (id: string) => {
    setSelectedCaseId(id);
    setSelectedMediaId("");
    setCaseDetail(null);
    navigate("case");
  };
  const openMedia = () => {
    const item = findCase(data, selectedCaseId);
    const first = item ? caseMedia(item)[0] : null;
    if (first) setSelectedMediaId(asString(first.uploadId));
    navigate("media");
  };
  const openMerge = () => {
    setMergePreview(null);
    setMergePreviewState("idle");
    setMergeSelections({});
    navigate("merge");
  };

  const renderView = () => {
    if (!data)
      return (
        <div className="content-error">
          <Notice tone="danger" title="真实 dashboard 尚未读取">
            没有 API 数据时不渲染工作台 fixture。请刷新或重新认证。
          </Notice>
        </div>
      );
    if (view === "queue")
      return (
        <QueueView
          data={data}
          state={dashboardState}
          queueState={queueState}
          selectedCaseId={selectedCaseId}
          onOpenCase={openCase}
          onRefresh={refresh}
        />
      );
    if (view === "case")
      return (
        <CaseView
          data={data}
          selectedCaseId={selectedCaseId}
          detail={caseDetail}
          detailState={caseDetailState}
          reason={reason}
          onReason={setReason}
          mutation={mutation}
          onResolve={resolveCase}
          onOpenMedia={openMedia}
          onOpenMerge={openMerge}
        />
      );
    if (view === "media")
      return (
        <MediaView
          data={data}
          selectedCaseId={selectedCaseId}
          selectedMediaId={selectedMediaId}
          mediaDetail={mediaDetail}
          mediaState={mediaState}
          reason={reason}
          onReason={setReason}
          onSelectMedia={(id) => setSelectedMediaId(id)}
          onDecision={decideMedia}
          mutation={mutation}
          onOpenMerge={openMerge}
        />
      );
    if (view === "merge")
      return (
        <MergeView
          data={data}
          selectedCaseId={selectedCaseId}
          preview={mergePreview}
          previewState={mergePreviewState}
          selections={mergeSelections}
          reason={reason}
          onReason={setReason}
          onSelect={(claimId, choice) =>
            setMergeSelections((current) => ({ ...current, [claimId]: choice }))
          }
          onPreview={() => void loadMergePreview()}
          onCommit={commitMerge}
          mutation={mutation}
        />
      );
    if (view === "publication")
      return (
        <PublicationView
          data={data}
          selectedSpotId={selectedSpotId}
          onSpot={setSelectedSpotId}
          reason={reason}
          onReason={setReason}
          mutation={mutation}
          onAssess={assessPublication}
          onLifecycle={lifecycle}
        />
      );
    if (view === "replacement")
      return (
        <ReplacementView
          data={data}
          currentSpotId={currentSpotId}
          successorSpotId={successorSpotId}
          onCurrentSpot={setCurrentSpotId}
          onSuccessorSpot={setSuccessorSpotId}
          reason={reason}
          onReason={setReason}
          preview={replacementPreview}
          previewState={replacementPreviewState}
          mutation={mutation}
          onPreview={() => void loadReplacementPreview()}
          onAction={replacementAction}
        />
      );
    return (
      <AuditView
        data={data}
        state={auditState}
        rows={auditRows.length ? auditRows : data.audits}
        onRefresh={() => void loadAudit()}
      />
    );
  };

  return (
    <main
      className={`operations-app ${session ? "is-authenticated" : "is-unauthenticated"}`}
      data-testid="operations-workbench"
    >
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-star" aria-hidden="true">
            ✦
          </span>
          <div>
            <strong>STARWARD / SKY CANVAS</strong>
            <span>Authenticated owner operations</span>
          </div>
        </div>
        <div className="topbar-actions">
          <StatusPill
            tone={session ? dataStateTone(dashboardState) : "warning"}
          >
            {session ? dataStateLabel(dashboardState) : "未认证"}
          </StatusPill>
          {session ? (
            <>
              <span className="topbar-actor">{session.actor}</span>
              <button
                className="control quiet compact"
                type="button"
                onClick={signOut}
              >
                结束会话
              </button>
            </>
          ) : null}
        </div>
      </header>
      {session ? (
        <div className="app-layout">
          <OperationsSidebar
            view={view}
            data={data}
            actor={session.actor}
            onNavigate={navigate}
          />
          <main className="ops-main">
            <div className="content-context">
              <span>MODERATE → MERGE → ASSESS → PUBLISH</span>
              <span>数据、权限、回执与读回由服务端拥有</span>
            </div>
            {dashboardState === "error" ? (
              <Notice tone="danger" title="工作台读取失败">
                {authError || "服务端没有返回可用 dashboard。"}{" "}
                <button
                  className="inline-button"
                  type="button"
                  onClick={refresh}
                >
                  重试
                </button>
              </Notice>
            ) : null}
            {dashboardState === "partial" ? (
              <Notice tone="warning" title="工作台部分读取">
                专用 Operations
                读模型未完整返回；缺失字段保持未确认，不会由前端生成。
              </Notice>
            ) : null}
            {renderView()}
          </main>
        </div>
      ) : (
        <AuthGate
          token={token}
          actor={actor}
          error={authError}
          busy={authState === "checking"}
          onToken={setToken}
          onActor={setActor}
          onSubmit={authenticate}
        />
      )}
      <footer className="app-footer">
        <span>Sky Canvas current Operations constraint</span>
        <span>receipt → readback required</span>
        <span>no fixture success</span>
      </footer>
    </main>
  );
}
