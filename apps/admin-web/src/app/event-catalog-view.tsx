import { useCallback, useEffect, useRef, useState } from "react";

import { Notice } from "./notice";
import { EventArticleForm } from "./event-article-form";

export type Row = Record<string, unknown>;
export type Request = <T>(path: string, init?: RequestInit) => Promise<{ data?: T }>;
type Catalog = Row & { catalogVersion: string; events: Row[]; sources: Row[] };
type Candidate = Row & { candidateId: string; sourceId: string; state: string; package: Catalog; diff: Row; decisionReasons: string[]; reviewCurrent: boolean };
type Publication = Row & { catalogVersion: string; package: Catalog; reason: string; publishedAt: string; publishedBy: string; restorable: boolean; activeEquivalent: boolean; restoredFromVersion?: string | null };
type ActiveIdentity = { catalogVersion: string; contentSha256: string };
export type Snapshot = { active: Catalog; activeIdentity: ActiveIdentity; candidateOffset: number; hasMoreCandidates: boolean; recentCandidates: Candidate[]; publications: Publication[]; sources: Row[] };
const base = "/v2/admin/event-catalog";
const labels: Record<string, string> = { REVIEW_REQUIRED: "待审核", AUTO_PUBLISH_ELIGIBLE: "审核通过，待发布", REJECTED: "已拒绝", PUBLISHED: "已发布" };
const text = (value: unknown) => value == null ? "暂无数据" : String(value);
const rows = (value: unknown) => Array.isArray(value) ? value : [];

function CatalogFacts({ catalog }: { catalog: Catalog }) {
  return <>
    <p>版本：<code>{catalog.catalogVersion}</code> · {catalog.events.length} 个事件</p>
    <div className="table-scroll"><table className="queue-table"><thead><tr><th>事件</th><th>日期及精度</th><th>辐射方向 / 流量</th></tr></thead>
      <tbody>{catalog.events.map(event => <tr key={text(event.occurrenceId)}><td><strong>{text(event.displayName)}</strong><small>{text(event.occurrenceId)}</small></td>
        <td>{text(event.peakDate)}<br />{event.annualReference ? "常年参考日（UTC）" : event.kind === "METEOR_SHOWER" ? "审核年度资料" : "食甚日期（北京时间）"}</td>
        <td>{event.kind === "METEOR_SHOWER" ? <>{event.annualReference ? (event.annualReference as Row).radiantDrift ? "历史漂移，仅覆盖时段内有效" : "方向暂无数据" : "来源给定方向"}<br />ZHR：{text(event.nominalPeakZhr)}</> : "按地点和时刻计算"}</td></tr>)}</tbody></table></div>
    <details><summary>来源、许可与完整资料</summary><pre className="event-catalog-json">{JSON.stringify(catalog, null, 2)}</pre></details>
    {catalog.events.filter(event => event.article).map(event => { const article = event.article as Row; const evidence = (catalog.articleRights as Record<string, Row> | undefined)?.[String(event.occurrenceId)]; return <details key={String(event.occurrenceId)}><summary>{text(event.displayName)} · {text(article.title)}</summary>
      <p>作者：{text(article.authorName)} · 原文日期：{text(article.publishedTime)}</p><p className="event-article-url">{text(article.originalUrl)}</p>
      {rows(article.paragraphs).map((paragraph, index) => <p key={index}>{text(paragraph)}</p>)}
      {evidence ? <p>内部核对：{text(evidence.basis)} · {text(evidence.confirmedBy)} · {text(evidence.confirmedAt)}</p> : null}
    </details>; })}
  </>;
}

export function EventCatalogView({ request }: { request: Request }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [upload, setUpload] = useState<Catalog | null>(null);
  const [fileName, setFileName] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [reason, setReason] = useState("");
  const [rights, setRights] = useState(false);
  const [uploadBasis, setUploadBasis] = useState("");
  const [source, setSource] = useState({ id: "", provider: "", parserVersion: "", termsUrl: "", coverage: "" });
  const [confirmation, setConfirmation] = useState<{ kind: "PUBLISH" | "ROLLBACK"; version: string; path: string; reason: string; expectedActive: ActiveIdentity } | null>(null);
  const confirmationPanel = useRef<HTMLDivElement>(null);
  const confirmationOpener = useRef<HTMLElement | null>(null);
  useEffect(() => { if (confirmation) confirmationPanel.current?.focus(); }, [confirmation]);
  const life = useRef(0);
  const lock = useRef(false);
  const fileGeneration = useRef(0);
  const offset = useRef(0);
  const read = useCallback(async (signal?: AbortSignal, candidateOffset = offset.current) => {
    const envelope = await request<Snapshot>(`${base}?candidateOffset=${candidateOffset}`, { signal });
    if (!envelope.data || !Array.isArray(envelope.data.recentCandidates)) throw new Error("事件目录未返回完整数据，请刷新。");
    return envelope.data;
  }, [request]);
  useEffect(() => {
    const generation = ++life.current;
    const abort = new AbortController();
    setLoading(true);
    void read(abort.signal).then(data => { if (life.current === generation) setSnapshot(data); })
      .catch(error => { if (!abort.signal.aborted && life.current === generation) setError(String(error.message ?? error)); })
      .finally(() => { if (life.current === generation) setLoading(false); });
    return () => { ++life.current; ++fileGeneration.current; abort.abort(); };
  }, [read]);
  const reload = async (candidateOffset = offset.current) => {
    if (lock.current || loading) return;
    const generation = life.current;
    setLoading(true); setError("");
    try { const data = await read(undefined, candidateOffset); if (life.current === generation) { offset.current = data.candidateOffset; setSnapshot(data); setUncertain(false); } }
    catch (error) { if (life.current === generation) setError(String(error instanceof Error ? error.message : error)); }
    finally { if (life.current === generation) setLoading(false); }
  };
  const mutate = async (label: string, path: string, body: unknown, verify: (fresh: Snapshot, receipt: Row) => boolean, readOffset = offset.current) => {
    if (lock.current || loading || uncertain) return;
    lock.current = true; setBusy(true); setError(""); setMessage("");
    const generation = life.current;
    try {
      const result = await request<Row>(path, { method: "POST", body: JSON.stringify(body) });
      const fresh = await read(undefined, readOffset);
      if (life.current !== generation) return;
      offset.current = fresh.candidateOffset; setSnapshot(fresh); setUncertain(false);
      if (!result.data || !verify(fresh, result.data)) throw new Error("操作已返回，但读回结果尚未确认，请刷新核对后继续。");
      setMessage(`${label}已确认。`);
    } catch (error) {
      // A lost response does not establish that the write failed. Reconcile before another mutation.
      let reconciled = false;
      try { const fresh = await read(undefined, readOffset); if (life.current === generation) { offset.current = fresh.candidateOffset; setSnapshot(fresh); reconciled = true; } } catch { /* Keep writes blocked until refresh succeeds. */ }
      if (life.current === generation) { setUncertain(!reconciled); setError(`${reconciled ? "已重新读取当前状态，请核对操作结果。" : "暂时无法确认提交结果，请刷新目录核对后继续。"}${error instanceof Error ? error.message : String(error)}`); }
    } finally { lock.current = false; if (life.current === generation) setBusy(false); }
  };
  const chooseFile = async (file?: File) => {
    const generation = ++fileGeneration.current;
    setUpload(null); setRights(false); setFileName(file?.name ?? ""); setError("");
    if (!file) return;
    try {
      if (file.size > 1_048_576) throw new Error("文件不能超过 1 MiB。");
      const value = JSON.parse(await file.text()) as Catalog;
      if (typeof value?.catalogVersion !== "string" || !Array.isArray(value.events) || !Array.isArray(value.sources)) throw new Error("请选择包含版本、事件与来源的事件目录 JSON 数据包。");
      if (value.events.some(event => !event || typeof event !== "object" || Array.isArray(event) || typeof event.occurrenceId !== "string" || typeof event.displayName !== "string")) throw new Error("事件记录格式无效，请检查数据包。");
      if (generation === fileGeneration.current) setUpload(value);
    } catch (error) { if (generation === fileGeneration.current) setError(error instanceof Error ? error.message : String(error)); }
  };
  const review = (candidate: Candidate, decision: "APPROVE" | "REJECT") => void mutate(decision === "APPROVE" ? "审核通过" : "拒绝候选",
    `${base}/candidates/${encodeURIComponent(candidate.candidateId)}/review`, { decision, reason, expectedState: candidate.state, expectedActive: snapshot?.activeIdentity },
    fresh => fresh.recentCandidates.some(row => row.candidateId === candidate.candidateId && row.state === (decision === "APPROVE" ? "AUTO_PUBLISH_ELIGIBLE" : "REJECTED")));
  const writeDisabled = busy || loading || uncertain || Boolean(confirmation);
  return <section className="event-catalog-workspace" aria-busy={busy || loading}>
    <header className="ops-header"><div><span className="eyebrow">数据资料</span><h1>天文事件</h1><p>上传常年或年度资料，核对差异后审核与发布。目录更新不会更改用户计划。</p></div>
      <button className="control secondary" disabled={busy || loading} onClick={() => void reload()}>刷新目录</button></header>
    {error ? <Notice tone="danger" title="请核对当前状态">{error}</Notice> : null}
    {message ? <Notice tone="success" title="操作结果">{message}</Notice> : null}
    {confirmation ? <div ref={confirmationPanel} tabIndex={-1} className="surface-card" role="group" aria-label="确认目录变更">
      <h2>{confirmation.kind === "PUBLISH" ? "确认发布" : "确认回滚"}</h2>
      <p>将以 {confirmation.version} 的事件资料替换当前目录；用户计划的地点、日期和关联保持原样。操作会追加发布与审计记录。</p>
      <p>原因：{confirmation.reason}</p>
      <div className="button-row"><button className="control secondary" disabled={busy} onClick={() => { setConfirmation(null); confirmationOpener.current?.focus(); }}>取消目录变更</button>
        <button className="control primary" disabled={busy || loading || uncertain} onClick={() => {
          const action = confirmation; setConfirmation(null);
          void mutate(action.kind === "PUBLISH" ? "发布" : "回滚", action.path, { reason: action.reason, expectedActive: action.expectedActive },
            (fresh, receipt) => fresh.active.catalogVersion === receipt.catalogVersion && fresh.publications.some(row => row.catalogVersion === receipt.catalogVersion));
        }}>确认目录变更</button></div>
    </div> : null}
    {loading && !snapshot ? <p role="status">正在读取目录…</p> : null}
    {snapshot ? <div className="surface-card"><h2>当前已发布目录</h2><CatalogFacts catalog={snapshot.active} /></div> : null}
    <div className="surface-card"><h2>上传资料</h2><p>先下载当前目录作为格式参考；上传会创建候选，审核通过后才可单独发布。现有事件的稳定 ID 应保留。</p>
      <button className="control secondary" disabled={!snapshot} onClick={() => {
        if (!snapshot) return;
        const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot.active, null, 2)], { type: "application/json" }));
        const anchor = document.createElement("a"); anchor.href = url; anchor.download = "astronomical-events.json"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}>下载当前数据包</button>
      <label className="field-block">资料来源<select value={sourceId} disabled={busy} onChange={event => setSourceId(event.target.value)}><option value="">选择已登记来源</option>{snapshot?.sources.map(row => <option key={text(row.sourceId)} value={text(row.sourceId)}>{text(row.provider)} · {text(row.sourceId)}</option>)}</select></label>
      <label className="field-block">事件目录 JSON<input type="file" accept=".json,application/json" disabled={busy} onChange={event => void chooseFile(event.target.files?.[0])} /></label>
      {upload ? <details open><summary>{fileName} · 导入前预览</summary><CatalogFacts catalog={upload} /></details> : null}
      {upload?.events.some(event => event.article) ? <label className="field-block">包内新增或修改文章的使用权限依据<textarea maxLength={2000} value={uploadBasis} disabled={busy} onChange={event => { setUploadBasis(event.target.value); setRights(false); }} /></label> : null}
      <label className="field-block"><span><input type="checkbox" checked={rights} disabled={busy} onChange={event => setRights(event.target.checked)} /> 已核对资料来源、版本及本产品商业使用所需的数据权限</span></label>
      <button className="control primary" disabled={writeDisabled || !snapshot || !upload || !sourceId || !rights} onClick={() => void mutate("导入", `${base}/imports`, { sourceId, package: upload, ...(uploadBasis.trim() ? { articleRightsConfirmation: { confirmed: rights, basis: uploadBasis, registeredSourceId: sourceId } } : {}) },
        (fresh, receipt) => receipt.state === "NO_CHANGE" || fresh.recentCandidates.some(row => row.candidateId === (receipt.candidate as Row | undefined)?.candidateId), 0)}>创建待审候选</button>
      <details><summary>登记手动上传来源</summary><form onSubmit={event => { event.preventDefault(); void mutate("来源登记", `${base}/sources/${encodeURIComponent(source.id)}`, {
        provider: source.provider, parserVersion: source.parserVersion, termsUrl: source.termsUrl, coverage: source.coverage,
        endpoint: null, enabled: true, autoPublishEligible: false, approvedBaselineVersion: null, createOnly: true,
      }, fresh => fresh.sources.some(row => row.sourceId === source.id && row.parserVersion === source.parserVersion && row.provider === source.provider && row.termsUrl === source.termsUrl && row.coverage === source.coverage && row.endpoint === null && row.enabled === true && row.autoPublishEligible === false && row.approvedBaselineVersion === null)); }}>
        {([['id', '来源 ID'], ['provider', '来源名称'], ['parserVersion', '数据包 parserVersion'], ['termsUrl', '许可说明网址（HTTPS）'], ['coverage', '资料覆盖范围']] as const).map(([key, label]) => <label className="field-block" key={key}>{label}<input required value={source[key]} disabled={busy} onChange={event => setSource(current => ({ ...current, [key]: event.target.value }))} /></label>)}
        <button className="control secondary" disabled={writeDisabled}>保存来源</button>
      </form></details>
    </div>
    {snapshot ? <EventArticleForm snapshot={snapshot} request={request} disabled={writeDisabled} mutate={mutate} /> : null}
    <div className="surface-card"><h2>候选审核与发布</h2><label className="field-block">本次操作理由<textarea maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} placeholder="记录核对结果或发布、回滚原因" /></label>
      {snapshot?.recentCandidates.length === 0 ? <p>暂无待处理资料。</p> : null}
      {snapshot?.recentCandidates.map(candidate => <article className="event-catalog-candidate" key={candidate.candidateId}>
        <h3>{candidate.package.catalogVersion} · {candidate.state === "AUTO_PUBLISH_ELIGIBLE" && !candidate.reviewCurrent ? "需重新审核" : labels[candidate.state] ?? candidate.state}</h3><p>{candidate.sourceId}</p>
        <p>相对当前目录：新增 {rows(candidate.diff.addedOccurrenceIds).length} · 移除 {rows(candidate.diff.removedOccurrenceIds).length} · 改动 {rows(candidate.diff.changedOccurrenceIds).length} · 关键日期或来源变化 {rows(candidate.diff.criticalTimeChanges).length} · 文章变化 {rows(candidate.diff.articleChanges).length}</p>
        {candidate.state === "AUTO_PUBLISH_ELIGIBLE" && !candidate.reviewCurrent ? <p>目录已变更，请核对最新差异并重新审核。</p> : null}
        <details><summary>查看逐项差异与完整候选</summary><pre className="event-catalog-json">{JSON.stringify(candidate.diff, null, 2)}</pre><CatalogFacts catalog={candidate.package} /></details>
        <div className="button-row">{candidate.state === "REVIEW_REQUIRED" || (candidate.state === "AUTO_PUBLISH_ELIGIBLE" && !candidate.reviewCurrent) ? <><button className="control secondary" disabled={writeDisabled || !reason.trim()} onClick={() => review(candidate, "APPROVE")}>审核通过</button><button className="control danger" disabled={writeDisabled || !reason.trim()} onClick={() => review(candidate, "REJECT")}>拒绝</button></> : null}
        {candidate.state === "AUTO_PUBLISH_ELIGIBLE" && candidate.reviewCurrent ? <button className="control primary" disabled={writeDisabled || !reason.trim()} onClick={() => {
          confirmationOpener.current = document.activeElement as HTMLElement | null;
          setConfirmation({ kind: "PUBLISH", version: candidate.package.catalogVersion, path: `${base}/candidates/${encodeURIComponent(candidate.candidateId)}/publish`, reason, expectedActive: snapshot.activeIdentity });
        }}>发布此版本</button> : null}</div>
      </article>)}
      {snapshot ? <div className="button-row"><button className="control secondary" disabled={writeDisabled || snapshot.candidateOffset === 0} onClick={() => void reload(Math.max(0, snapshot.candidateOffset - 100))}>较新候选</button><span>第 {Math.floor(snapshot.candidateOffset / 100) + 1} 页</span><button className="control secondary" disabled={writeDisabled || !snapshot.hasMoreCandidates} onClick={() => void reload(snapshot.candidateOffset + 100)}>较早候选</button></div> : null}
    </div>
    <div className="surface-card"><h2>发布历史与回滚</h2>{snapshot?.publications.map(publication => <article className="event-catalog-candidate" key={publication.catalogVersion}>
      <strong>{publication.catalogVersion}</strong><p>{publication.publishedAt} · {publication.publishedBy}</p><p>{publication.reason}</p>
      {publication.restoredFromVersion ? <p>恢复自：<code>{publication.restoredFromVersion}</code></p> : null}
      <button className="control secondary" disabled={writeDisabled || !reason.trim() || publication.activeEquivalent || !publication.restorable} onClick={() => {
        confirmationOpener.current = document.activeElement as HTMLElement | null;
        setConfirmation({ kind: "ROLLBACK", version: publication.catalogVersion, path: `${base}/rollback/${encodeURIComponent(publication.catalogVersion)}`, reason, expectedActive: snapshot.activeIdentity });
      }}>{publication.catalogVersion === snapshot.active.catalogVersion ? "当前版本" : !publication.restorable ? "退役基线仅供查阅" : publication.activeEquivalent ? "与当前资料相同" : "恢复此版本"}</button>
    </article>)}</div>
  </section>;
}
