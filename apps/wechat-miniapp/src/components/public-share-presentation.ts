import type { PlanPublicShareData, SourceSummary, SpotPublicShareData } from "@starward/miniapp-contracts";
import { displayZonedShareExpiry } from "../utils/zoned-date";
import { planSpotRiskMessage } from "../utils/public-share-copy";
import { isProductSource } from "../utils/source-presentation";

export type PublicShare = PlanPublicShareData | SpotPublicShareData;
export interface PublicSharePresentation {
  kind: PublicShare["kind"];
  name: string;
  region: string;
  date: string;
  address: string;
  facts: { label: string; value: string; segments?: string[] }[];
  warnings: string[];
  notes: string[];
  sources: SourceSummary[];
}
const missing = "暂无数据";

function dateRange(start: string, end: string) {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(start);
  const b = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(end);
  if (!a || !b) return `${start} — ${end}`;
  if (a[1] !== b[1]) return `${start} — ${end}`;
  return start === end ? `${a[2]}.${a[3]} / ${a[1]}` : `${a[2]}.${a[3]} — ${b[2]}.${b[3]} / ${a[1]}`;
}

/** One explicit public projection for the receiving page and the exported image. */
export function publicSharePresentation(data: PublicShare): PublicSharePresentation {
  if (data.kind === "PLAN") {
    const risk = planSpotRiskMessage(data.spotStatus);
    return {
      kind: "PLAN", name: data.spotName, region: data.spotRegion,
      date: dateRange(data.localDate, data.endLocalDate), address: "",
      facts: [
        { label: "计划出发", value: `${data.departureLocalDate} ${data.departureLocalTime}` },
        { label: "计划观测时段", value: `${data.localDate} ${data.localTime} — ${data.endLocalDate} ${data.endLocalTime}（${data.timezone}）`,
          segments: [`${data.localDate} ${data.localTime}`, `— ${data.endLocalDate} ${data.endLocalTime}`, `（${data.timezone}）`] },
        { label: "关联天象", value: data.events.length ? data.events.map(event => `${event.displayName}${event.source ? "" : "（资料暂不可用）"}`).join("、") : "未关联天象" },
      ],
      warnings: [
        ...(risk ? [risk] : []),
        ...(data.events.some(event => event.kind === "SOLAR_ECLIPSE") ? ["日食观测须使用符合标准且完好的专用观测镜；不可裸眼或使用普通太阳镜看太阳。"] : []),
      ],
      notes: ["计划结束不代表已到访或观测成功。", `此链接有效至 ${displayZonedShareExpiry(data.expiresAt, data.timezone)}；计划修改后需重新分享。`],
      sources: [data.spotSource, ...data.events.flatMap(event => event.source ? [event.source] : [])].filter(isProductSource),
    };
  }
  return {
    kind: "SPOT", name: data.name, region: data.region, date: "", address: data.address,
    facts: [
      { label: "开放时段", value: data.opening || missing },
      { label: "停车条件", value: data.parking || missing },
      { label: "地平线视野", value: data.horizon || missing },
    ],
    warnings: [
      ...(data.status === "TEMPORARILY_CLOSED" ? ["此观星点暂时关闭，请勿按旧信息进入。"] : []),
      `进入：${data.access || missing}`, `安全：${data.safety || missing}`,
    ],
    notes: [], sources: [data.source].filter(isProductSource),
  };
}

export function publicShareCredits(sources: readonly SourceSummary[]) {
  return sources.flatMap(source => [
    `${source.attribution?.name || source.provider} · ${source.title}`,
    ...(source.attribution?.statements ?? []),
    `许可：${source.license || "暂无许可说明"}`,
    source.sourceUrl,
    ...(source.licenseUrl && source.licenseUrl !== source.sourceUrl ? [source.licenseUrl] : []),
    ...(source.attribution?.url && source.attribution.url !== source.sourceUrl ? [source.attribution.url] : []),
  ]).filter(Boolean);
}
