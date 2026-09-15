import { useEffect, useRef, useState } from "react";
import type { Snapshot, Request, Row } from "./event-catalog-view";
import { Notice } from "./notice";

type Article = { sourceUrl: string; title: string; authorName: string | null; publishedTime: string | null; paragraphs: string[]; contentSha256: string; retrievedAt: string; parserVersion: string; omittedMediaCount: number };
type Props = {
  snapshot: Snapshot;
  request: Request;
  disabled: boolean;
  mutate: (label: string, path: string, body: unknown, verify: (fresh: Snapshot, receipt: Row) => boolean, readOffset?: number) => Promise<void>;
};
const version = () => `editorial-${crypto.randomUUID()}`;

export function EventArticleForm({ snapshot, request, disabled, mutate }: Props) {
  const [occurrenceId, setOccurrenceId] = useState("");
  const [registeredSourceId, setRegisteredSourceId] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState("");
  const [body, setBody] = useState("");
  const [license, setLicense] = useState("");
  const [basis, setBasis] = useState("");
  const [rights, setRights] = useState(false);
  const [catalogVersion, setVersion] = useState(version);
  const [manualRetrievedAt, setManualRetrievedAt] = useState(() => new Date().toISOString());
  const [preview, setPreview] = useState<Article | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [remove, setRemove] = useState(false);
  const [baseline, setBaseline] = useState(snapshot.activeIdentity);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  const dirty = () => { setRights(false); setVersion(version()); setManualRetrievedAt(new Date().toISOString()); setRemove(false); };
  const locked = disabled || reading;
  const selected = snapshot.active.events.find(event => event.occurrenceId === occurrenceId);
  const stale = baseline.contentSha256 !== snapshot.activeIdentity.contentSha256;
  const readArticle = async (file?: File) => {
    if (locked) return;
    const abort = new AbortController(); abortRef.current?.abort(); abortRef.current = abort;
    setReading(true); setError(""); dirty();
    try {
      if (file && file.size > 2 * 1024 * 1024) throw new Error("HTML 文件不能超过 2 MiB。");
      let htmlBase64: string | undefined;
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
        htmlBase64 = btoa(binary);
      }
      const result = await request<Article>("/v2/admin/event-catalog/article-previews", { method: "POST", signal: abort.signal,
        body: JSON.stringify({ url, ...(htmlBase64 === undefined ? {} : { htmlBase64 }) }) });
      if (abort.signal.aborted) return;
      if (!result.data?.paragraphs?.length) throw new Error("没有取得可用正文。");
      const article = result.data;
      setPreview(article); setUrl(article.sourceUrl); setTitle(article.title); setAuthor(article.authorName ?? ""); setDate(article.publishedTime ?? ""); setBody(article.paragraphs.join("\n\n"));
    } catch (error) {
      if (!abort.signal.aborted) {
        const message = error instanceof Error ? error.message : String(error);
        const detail = /INVALID_INPUT/u.test(message) ? "未能从这个链接或文件提取可用正文" : /PROVIDER_UNAVAILABLE/u.test(message) ? "文章来源暂时无法访问" : message;
        setError(`${detail}。可以保留原文链接，直接粘贴并核对正文；需要登录或以图片为主的文章可能无法自动读取。`);
      }
    }
    finally { if (!abort.signal.aborted) setReading(false); }
  };
  const chooseEvent = (id: string) => {
    dirty(); setOccurrenceId(id); setBaseline(snapshot.activeIdentity); setPreview(null); setError("");
    const event = snapshot.active.events.find(event => event.occurrenceId === id);
    const article = event?.article as Row | undefined;
    const source = snapshot.active.sources.find(source => source.id === article?.sourceId);
    const storedRights = (snapshot.active.articleRights as Record<string, Row> | undefined)?.[id];
    setUrl(String(article?.originalUrl ?? "")); setTitle(String(article?.title ?? "")); setAuthor(String(article?.authorName ?? "")); setDate(String(article?.publishedTime ?? ""));
    setBody(Array.isArray(article?.paragraphs) ? article.paragraphs.join("\n\n") : "");
    setLicense(String(source?.license ?? "")); setRegisteredSourceId(String(storedRights?.registeredSourceId ?? "")); setBasis("");
  };
  const submit = () => {
    const article = remove ? null : { title: title.trim(), paragraphs: body.split(/\n\s*\n/u).map(value => value.trim()).filter(Boolean), originalUrl: url.trim(),
      authorName: author.trim() || null, publishedTime: date.trim() || null,
      retrievedAt: preview?.retrievedAt ?? manualRetrievedAt, inputSha256: preview?.sourceUrl === url.trim() ? preview.contentSha256 : null,
      parserVersion: preview?.sourceUrl === url.trim() ? preview.parserVersion : "manual-text.v1" };
    void mutate(remove ? "移除文章候选" : "文章候选", "/v2/admin/event-catalog/article-imports", { occurrenceId, catalogVersion, expectedActive: baseline, article, license,
      rights: { confirmed: rights, basis, registeredSourceId } },
      (fresh, receipt) => fresh.recentCandidates.some(candidate => candidate.candidateId === (receipt.candidate as Row | undefined)?.candidateId), 0);
  };
  return <div className="surface-card"><h2>事件文章</h2><p>读取公开网页，核对和编辑正文后创建待审候选。文章只补充阅读资料，不修改事件日期、辐射方向或流量。</p>
    {error ? <Notice tone="danger" title="文章尚未读取">{error}</Notice> : null}
    {stale ? <Notice tone="warning" title="目录已变更">请先核对当前事件资料，再使用下方按钮将这份草稿应用到当前目录。<button className="control secondary" disabled={locked} onClick={() => { setBaseline(snapshot.activeIdentity); dirty(); }}>已核对，使用当前目录</button></Notice> : null}
    <fieldset disabled={locked} className="event-article-fields"><legend>文章草稿</legend>
      <label className="field-block">关联事件<select value={occurrenceId} onChange={event => chooseEvent(event.target.value)}><option value="">选择事件</option>{snapshot.active.events.map(event => <option key={String(event.occurrenceId)} value={String(event.occurrenceId)}>{String(event.displayName)}</option>)}</select></label>
      <label className="field-block">文章来源<select value={registeredSourceId} onChange={event => { setRegisteredSourceId(event.target.value); dirty(); }}><option value="">选择已登记来源</option>{snapshot.sources.filter(source => source.enabled).map(source => <option key={String(source.sourceId)} value={String(source.sourceId)}>{String(source.provider)}</option>)}</select></label>
      <label className="field-block">原文链接<input type="url" value={url} maxLength={2000} placeholder="https://…" onChange={event => { setUrl(event.target.value); setPreview(null); dirty(); }} /></label>
      <div className="button-row"><button className="control secondary" disabled={!url.trim()} onClick={() => void readArticle()}>读取文章链接</button></div>
      <label className="field-block">或上传已保存的 HTML<input type="file" accept=".html,.htm,text/html" disabled={!url.trim()} onChange={event => { const file = event.target.files?.[0]; if (file) void readArticle(file); event.target.value = ""; }} /></label>
      {preview ? <Notice tone="neutral" title="请核对提取结果">仅保留文字。{preview.omittedMediaCount ? `有 ${preview.omittedMediaCount} 项图片、表格或其他媒体未导入。` : "图片与复杂排版不会自动导入。"}请对照原文检查段落、作者及日期。</Notice> : null}
      <label className="field-block">标题<input value={title} maxLength={300} onChange={event => { setTitle(event.target.value); dirty(); }} /></label>
      <label className="field-block">作者（来源未提供可留空）<input value={author} maxLength={300} onChange={event => { setAuthor(event.target.value); dirty(); }} /></label>
      <label className="field-block">原文日期（保留原始精度，可留空）<input value={date} maxLength={100} placeholder="例如 2026-09-15" onChange={event => { setDate(event.target.value); dirty(); }} /></label>
      <label className="field-block">正文（空行分段，也可直接粘贴）<textarea rows={12} value={body} maxLength={40000} onChange={event => { setBody(event.target.value); dirty(); }} /></label>
      <label className="field-block">展示给读者的许可名称<input value={license} maxLength={300} onChange={event => { setLicense(event.target.value); dirty(); }} /></label>
      <label className="field-block">内部核对依据<textarea value={basis} maxLength={2000} placeholder="记录授权条款、授权凭据或自有内容依据" onChange={event => { setBasis(event.target.value); dirty(); }} /></label>
      {selected?.article ? <label className="field-block"><span><input type="checkbox" checked={remove} onChange={event => { dirty(); setRemove(event.target.checked); }} /> 从此事件移除现有文章（审核后生效）</span></label> : null}
      <label className="field-block"><span><input type="checkbox" checked={rights} onChange={event => setRights(event.target.checked)} /> 已核对本次正文、来源、使用权限及改动范围</span></label>
      <button className="control primary" disabled={stale || !occurrenceId || !rights || (!remove && (!registeredSourceId || !title.trim() || !body.trim() || !url.trim() || !license.trim() || !basis.trim()))} onClick={submit}>创建文章待审候选</button>
    </fieldset>
    {reading ? <p role="status">正在读取正文…</p> : null}
  </div>;
}
