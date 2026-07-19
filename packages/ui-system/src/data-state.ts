export type DataStateKind = "loading" | "empty" | "no-results" | "stale" | "partial" | "failed" | "success";

export interface DataStatePresentation {
  kind: DataStateKind;
  label: string;
  description: string;
  action: string;
  accessibilityLabel: string;
  syntheticData: false;
  missing: string[];
}

const presentations: Record<DataStateKind, Omit<DataStatePresentation, "kind" | "accessibilityLabel" | "syntheticData" | "missing">> = {
  loading: { label: "正在获取数据", description: "保留当前布局，完成后自动更新。", action: "等待" },
  empty: { label: "还没有数据", description: "当前范围没有可展示的记录。", action: "了解数据来源" },
  "no-results": { label: "没有符合筛选的结果", description: "数据存在，但当前条件过严。", action: "放宽筛选" },
  stale: { label: "正在使用缓存结果", description: "显示上次有效数据，并明确更新时间。", action: "重新获取" },
  partial: { label: "部分数据暂不可用", description: "可用部分仍会展示，缺失项不会被伪造。", action: "查看影响" },
  failed: { label: "数据获取失败", description: "没有可安全使用的结果。", action: "重试" },
  success: { label: "数据已更新", description: "结果与来源信息均已就绪。", action: "查看来源" },
};

export function presentDataState(input: { state: DataStateKind; missing?: string[] }): DataStatePresentation {
  const value = presentations[input.state];
  if (!value) throw new Error(`unsupported_data_state:${String(input.state)}`);
  const missing = input.missing ?? [];
  return {
    kind: input.state,
    ...value,
    missing,
    accessibilityLabel: `${value.label}。${value.description}${missing.length ? ` 缺失：${missing.join("、")}` : ""}`,
    syntheticData: false,
  };
}
