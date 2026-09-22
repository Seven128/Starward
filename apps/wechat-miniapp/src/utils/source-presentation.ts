import type { SourceKind, SourceSummary } from "@starward/miniapp-contracts";

export const SOURCE_KIND_LABEL: Readonly<Record<SourceKind, string | null>> = {
  THIRD_PARTY_FORECAST: "第三方预测", THIRD_PARTY_ROUTE: "第三方路线",
  THIRD_PARTY_PLACE: "第三方地点", OFFICIAL_REFERENCE: "官方资料", EDITORIAL_REFERENCE: "文章资料",
  PRODUCT_CALCULATION: "计算结果", OFFICIAL_VERIFICATION: "官方核验",
  USER_FIELD_REPORT: "现场反馈", HISTORICAL_RECORD: "历史资料",
  OPEN_DATA: "开放数据", TEST_FIXTURE: null,
};

/** Internal fixture provenance stays in data and verification, not product disclosure. */
export function isProductSource(source: SourceSummary) {
  return Boolean(SOURCE_KIND_LABEL[source.kind]);
}

export function productSourceNames(sources: readonly SourceSummary[]) {
  return [...new Set(sources.filter(isProductSource).map(source => source.provider || source.title).filter(Boolean))].join(" · ");
}

/** Display mandatory statements verbatim, once per provider and exact text. */
export function sourceAttributions(sources: readonly SourceSummary[]) {
  const groups = new Map<string, { name: string; url: string; statements: string[] }>();
  for (const source of sources.filter(isProductSource)) {
    const credit = source.attribution;
    if (!credit) continue;
    const key = JSON.stringify([credit.name, credit.url]);
    const group = groups.get(key) ?? { name: credit.name, url: credit.url, statements: [] };
    for (const statement of credit.statements) if (!group.statements.includes(statement)) group.statements.push(statement);
    groups.set(key, group);
  }
  return [...groups.values()];
}
