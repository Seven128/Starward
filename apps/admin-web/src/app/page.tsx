import { useEffect, useMemo, useState } from "react";
import { STARWARD_RELEASE_CONTEXT } from "@starward/contracts/release-context";

declare const __STARWARD_PLATFORM_BOUNDARY_PRESENT__: boolean;

export const adminOperationsBoundary = {
  product: "Starward owner operations console",
  api: "/v1/admin/data-status",
  commands: "/v1/admin/commands",
  security: ["owner-only", "server-redaction", "immutable-audit"],
  releaseRule: "qualified-lowest-12m-tco-after-production-gates",
} as const;

type Snapshot = Record<string, any>;
type Evidence = { id: string; title: string; value: (snapshot: Snapshot) => unknown };
type Operation = { command: string; label: string; eyebrow: string; description: string; evidence: Evidence[] };

const adminOperations: Operation[] = [
  { command: "provider-tco-evaluate", label: "评估供应商 TCO", eyebrow: "成本治理", description: "先过合规、质量与可用性硬门槛，再比较 12 个月完整成本。", evidence: [
    { id: "provider-hard-gates", title: "生产硬门槛", value: (s) => s.provider?.hardGates },
    { id: "provider-tco-breakdown", title: "总成本拆分", value: (s) => s.provider?.tco },
    { id: "provider-selection-decision", title: "选择决定", value: (s) => s.provider?.decision },
  ] },
  { command: "job-replay", label: "回放失败任务", eyebrow: "任务恢复", description: "使用原幂等键回放，重复投递不产生第二份业务写入。", evidence: [
    { id: "job-idempotency-key", title: "幂等键", value: (s) => s.job?.idempotencyKey },
    { id: "job-replay-result", title: "回放结果", value: (s) => s.job?.result },
    { id: "job-duplicate-count", title: "重复写入", value: (s) => `${s.job?.duplicateCount ?? "—"} 项` },
  ] },
  { command: "spot-merge-review", label: "审查地点合并", eyebrow: "地点治理", description: "规范记录、道路风险和合并审计必须共同可追溯。", evidence: [
    { id: "spot-canonical-record", title: "规范地点", value: (s) => s.spot?.canonical },
    { id: "spot-risk-flags", title: "风险标记", value: (s) => s.spot?.riskFlags },
    { id: "spot-merge-audit", title: "合并审计", value: (s) => s.spot?.audit },
  ] },
  { command: "moderation-open-case", label: "打开审核案件", eyebrow: "社区审核", description: "证据、决定与申诉状态分别展示，不覆盖原始证据。", evidence: [
    { id: "moderation-evidence", title: "审核证据", value: (s) => s.moderation?.evidence },
    { id: "moderation-decision", title: "审核决定", value: (s) => s.moderation?.decision },
    { id: "moderation-appeal-status", title: "申诉状态", value: (s) => s.moderation?.appeal },
  ] },
  { command: "source-disable", label: "预览来源熔断", eyebrow: "来源健康", description: "停用前展示健康度、熔断状态与备用来源影响。", evidence: [
    { id: "source-health", title: "来源健康", value: (s) => s.source?.health },
    { id: "source-circuit-state", title: "熔断状态", value: (s) => s.source?.circuit },
    { id: "source-fallback-impact", title: "备用来源影响", value: (s) => s.source?.impact },
  ] },
  { command: "dataset-release-preview", label: "预览数据集发布", eyebrow: "版本发布", description: "差异、回滚点和审批状态在发布动作前保持可见。", evidence: [
    { id: "dataset-version-diff", title: "版本差异", value: (s) => s.release?.diff },
    { id: "dataset-rollback-point", title: "回滚点", value: (s) => s.release?.rollback },
    { id: "dataset-release-status", title: "发布状态", value: (s) => s.release?.status },
  ] },
  { command: "admin-open-audit", label: "检查管理权限", eyebrow: "安全审计", description: "owner-only 边界、不可变审计和服务端字段掩码必须同时成立。", evidence: [
    { id: "admin-role-boundary", title: "角色边界", value: (s) => s.security?.boundary },
    { id: "admin-audit-log", title: "审计记录", value: (s) => s.security?.audit },
    { id: "admin-sensitive-field-mask", title: "敏感字段掩码", value: (s) => s.security?.mask },
  ] },
  { command: "pipeline-open-run", label: "检查来源管线", eyebrow: "数据血缘", description: "血缘、校验和与隔离状态组成一次可审计运行。", evidence: [
    { id: "pipeline-lineage", title: "来源链路", value: (s) => s.pipeline?.lineage },
    { id: "pipeline-checksum", title: "校验和", value: (s) => s.pipeline?.checksum },
    { id: "pipeline-quarantine-status", title: "隔离状态", value: (s) => s.pipeline?.quarantine },
  ] },
];

const qualityOperations: Operation[] = [
  { command: "quality-open-restore-drill", label: "查看恢复演练", eyebrow: "恢复能力", description: "用实测 RPO/RTO 和完整性校验判断恢复结果。", evidence: [
    { id: "restore-rpo-result", title: "恢复点目标", value: (s) => s.restore?.rpo },
    { id: "restore-rto-result", title: "恢复时间目标", value: (s) => s.restore?.rto },
    { id: "restore-drill-evidence", title: "演练证据", value: (s) => s.restore?.evidence },
  ] },
  { command: "quality-open-release-matrix", label: "查看原生发布矩阵", eyebrow: "原生发布", description: "Android 与 iOS 产物分开陈述；暂缓验证不等于删除实现。", evidence: [
    { id: "release-ios-artifact", title: "iOS 产物", value: (s) => s.release?.ios },
    { id: "release-android-artifact", title: "Android 产物", value: (s) => s.release?.android },
    { id: "release-native-capability-gates", title: "原生能力门", value: (s) => s.release?.gates },
  ] },
  { command: "quality-open-trace", label: "追踪调用链", eyebrow: "可观测性", description: "关联发布、供应商调用和脱敏后的用户上下文。", evidence: [
    { id: "trace-correlation-id", title: "关联 ID", value: (s) => s.trace?.correlation },
    { id: "trace-provider-span", title: "供应商 Span", value: (s) => s.trace?.provider },
    { id: "trace-user-redaction", title: "用户脱敏", value: (s) => s.trace?.redaction },
  ] },
  { command: "quality-open-funnel", label: "检查决策漏斗", eyebrow: "隐私分析", description: "授权过滤在采集前发生，精确位置不进入分析事件。", evidence: [
    { id: "analytics-consent-filter", title: "授权过滤", value: (s) => s.funnel?.consent },
    { id: "analytics-funnel-steps", title: "漏斗步骤", value: (s) => s.funnel?.steps },
    { id: "analytics-retention-window", title: "保留窗口", value: (s) => s.funnel?.retention },
  ] },
];

async function requestJson(path: string, init?: RequestInit) {
  const response = await fetch(path, { headers: { accept: "application/json", "content-type": "application/json" }, ...init });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<Snapshot>;
}

export default function AdminPage() {
  const quality = window.location.pathname.startsWith("/release-quality");
  const operations = quality ? qualityOperations : adminOperations;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [selected, setSelected] = useState<Operation | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [error, setError] = useState("");
  const base = quality ? "/v1/quality" : "/v1/admin/data-status";
  const commandBase = quality ? "/v1/quality/commands" : "/v1/admin/commands";
  const title = quality ? "发布质量工作区" : "数据运营工作区";
  const screenId = quality ? "screen-quality-release-observability" : "screen-admin-data-operations";

  useEffect(() => {
    let current = true;
    requestJson(base).then((data) => { if (current) { setSnapshot(data); setStatus("ready"); } }).catch((reason: unknown) => {
      if (current) { setError(reason instanceof Error ? reason.message : "读取失败"); setStatus("error"); }
    });
    return () => { current = false; };
  }, [base]);

  const activeEvidence = useMemo(
    () => quality && !__STARWARD_PLATFORM_BOUNDARY_PRESENT__ ? [] : selected?.evidence ?? [],
    [quality, selected],
  );
  async function run(operation: Operation) {
    setSelected(operation); setStatus("saving"); setError("");
    try {
      const data = await requestJson(commandBase, { method: "POST", body: JSON.stringify({ command: operation.command }) });
      setSnapshot(data); setStatus("ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败"); setStatus("error");
    }
  }

  return <main data-testid={screenId} className="workspace">
    <header className="topbar"><div><span className="brand-mark">✦</span><span className="brand">STARWARD / OWNER OPS</span></div><div className="owner-badge"><span />仅限个人所有者 · 非生产流量</div></header>
    <section className="hero"><div><p className="kicker">{quality ? "RELEASE / RECOVERY / OBSERVABILITY" : "DATA / COST / GOVERNANCE"}</p><h1>{title}</h1><p>把操作结果、影响边界与恢复证据放在同一视野；界面不替代服务端权限、审批和审计。</p></div><aside><strong>CNY {STARWARD_RELEASE_CONTEXT.externalServicesBudgetCny}</strong><span>外部数据成本 / 月硬顶</span></aside></section>
    {quality ? <p data-testid="release-context-revision" className="revision">{STARWARD_RELEASE_CONTEXT.revision}</p> : null}
    <section className="layout">
      <nav aria-label="操作集合"><p className="section-label">CONTROL SET</p>{operations.map((operation, index) => <button key={operation.command} data-testid={operation.command} className={selected?.command === operation.command ? "control active" : "control"} disabled={status === "saving"} onClick={() => void run(operation)}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{operation.eyebrow}</small><b>{operation.label}</b></div><i>→</i></button>)}</nav>
      <section className="stage" aria-live="polite">
        <div className="stage-heading"><div><p className="section-label">LIVE EVIDENCE</p><h2>{selected?.label ?? "选择一个控制路径"}</h2></div><span className={`state ${status}`}>{status === "loading" ? "读取中" : status === "saving" ? "执行中" : status === "error" ? "未确认" : "服务就绪"}</span></div>
        <p className="description">{selected?.description ?? "所有动作都调用版本化服务端 API。结果返回前不会展示固定成功卡片。"}</p>
        {status === "error" ? <div className="error" role="alert"><b>操作没有确认</b><span>{error}。原状态保持不变，可安全重试。</span></div> : null}
        {selected && snapshot && status !== "saving" ? <div className="evidence-grid">{activeEvidence.map((item) => <article key={item.id} data-testid={item.id}><span>VERIFIED FIELD</span><h3>{item.title}</h3><p>{String(item.value(snapshot) ?? "服务端未返回该字段")}</p></article>)}</div> : null}
        {!selected ? <div className="empty"><span>◎</span><h3>尚未运行操作</h3><p>从左侧选择控制路径，查看真实 API 返回的证据、阻断原因和恢复边界。</p></div> : null}
      </section>
    </section>
    <footer><span>profile / {STARWARD_RELEASE_CONTEXT.profile}</span><span>production traffic / disabled</span><span>audit / immutable server record</span></footer>
  </main>;
}
