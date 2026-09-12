import {
  CONTRIBUTION_FORMAL_FIELD_KEYS,
  type ContributionFormalFieldKey,
  type ContributionFormalProposal,
} from "@starward/miniapp-contracts";

export type SpotDocumentValues = Record<ContributionFormalFieldKey, string>;

export const SPOT_DOCUMENT_CHAPTERS = [
  ["place", "地点"],
  ["access", "到达"],
  ["facilities", "设施"],
  ["notes", "说明"],
] as const;

export type SpotDocumentChapter = (typeof SPOT_DOCUMENT_CHAPTERS)[number][0];

export const SPOT_DOCUMENT_CHOICES: Readonly<
  Partial<Record<ContributionFormalFieldKey, readonly string[]>>
> = {
  openness: ["", "开放", "有条件开放", "不开放"],
  access: ["", "允许进入", "需预约或其他条件", "禁止进入"],
  parking: ["", "有", "没有", "季节性开放"],
  toilet: ["", "有", "没有", "季节性开放"],
};

export const SPOT_DOCUMENT_LABELS: Readonly<Record<ContributionFormalFieldKey, string>> = {
  address: "地点地址", name: "地点名称", openness: "开放状态", hours: "开放时间",
  access: "进入规则", accessNote: "进入条件", road: "末段道路", safety: "夜间安全",
  parking: "设施状态", parkingNote: "停车说明", toilet: "设施状态", toiletNote: "洗手间说明",
  platform: "观测平台", horizon: "视野与遮挡", light: "现场灯光", signal: "通信与充电",
  camping: "露营条件", contact: "场地联系", detail: "补充说明",
};

export const SPOT_DOCUMENT_PLACEHOLDERS: Readonly<Partial<Record<ContributionFormalFieldKey, string>>> = {
  address: "搜索地址，确定观星位置", name: "地点名称", hours: "如 18:00—次日06:00",
  accessNote: "预约、门禁或许可方式", road: "入口、步行距离及路况", safety: "台阶、临水或其他风险",
  parkingNote: "距离、数量、费用与时段", toiletNote: "距离、开放时间与使用条件",
  platform: "平台位置、地面情况", horizon: "开阔方向、树木或建筑遮挡", light: "附近路灯等实际情况",
  signal: "信号、充电设施，不清楚可留空", camping: "是否允许及限制", contact: "可公开的管理方联系方式",
  detail: "地点特点及注意事项",
};

export function emptySpotDocumentValues(): SpotDocumentValues {
  return Object.fromEntries(CONTRIBUTION_FORMAL_FIELD_KEYS.map((key) => [key, ""])) as SpotDocumentValues;
}

export function spotDocumentValuesFromProposal(
  proposal: ContributionFormalProposal | undefined,
): SpotDocumentValues {
  return {
    ...emptySpotDocumentValues(),
    ...(proposal?.fields ?? {}),
  };
}

export function spotDocumentProposal(
  values: SpotDocumentValues,
  media: ContributionFormalProposal["media"] = {},
): ContributionFormalProposal {
  const fields: Partial<Record<ContributionFormalFieldKey, string>> = {};
  for (const key of CONTRIBUTION_FORMAL_FIELD_KEYS) {
    const value = values[key].trim();
    if (value) fields[key] = value;
  }
  return { fields, media };
}
