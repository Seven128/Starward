function scenario(key: string, action: string, label: string, ids: string[], primary: string, body: string, meta = "当前为版本化产品示例；生产数据将显示来源、生成时间、有效期和质量状态。") {
  return { key, action, label, evidence: ids.map((id, index) => ({ id, title: index === 0 ? primary : label, body, meta })) };
}
export const adminOperationsFeature = { outcome: "admin-data-operations", eyebrow: "运营控制台", title: "数据、来源与审核操作", subtitle: "生产启用先过真实性、目标区质量稳定、商业许可与安全降级硬门；合格候选再按 12 个月总成本选择。", scenarios: [
  scenario("qualified-lowest-tco-provider-selection","provider-tco-evaluate","供应商选型",["provider-hard-gates","provider-tco-breakdown","provider-selection-decision"],"硬门槛：5/5 通过", "通过硬门槛后按 12 个月总成本选择 qualified-low；免费但未通过许可与稳定性门的候选不入选。"),
  scenario("job-idempotent-replay","job-replay","任务回放",["job-idempotency-key","job-replay-result","job-duplicate-count"],"幂等键 ingest:g1:v7", "已重放 1 个失败分片；重复 2 项无需重复写入，审计保留输入版本。"),
  scenario("spot-merge-and-risk","spot-merge-review","地点合并",["spot-canonical-record","spot-risk-flags","spot-merge-audit"],"规范地点 spot-118", "合并记录已写入审计；高风险标记、来源版本与被合并别名仍可追溯。"),
  scenario("moderation-case","moderation-open-case","审核案件",["moderation-evidence","moderation-decision","moderation-appeal-status"],"证据：原图、时间与贡献历史", "处理决定待复核；提交者可查看理由与申诉状态。"),
  scenario("source-operation","source-disable","来源熔断",["source-health","source-circuit-state","source-fallback-impact"],"主来源错误率 18%", "熔断已打开；降级影响为路线使用缓存，备用来源不具备的字段明确缺失。"),
  scenario("replay-and-release","dataset-release-preview","数据发布",["dataset-version-diff","dataset-rollback-point","dataset-release-status"],"版本差异：新增 42、修正 7、隔离 3", "变更预览已生成；发布保持待审批，回滚点指向不可变版本。"),
  scenario("admin-security","admin-open-audit","权限与审计",["admin-role-boundary","admin-audit-log","admin-sensitive-field-mask"],"角色权限：来源操作员", "MFA 必需；审计记录操作与原因，敏感位置、凭据和个人字段已掩码。"),
  scenario("source-pipelines","pipeline-open-run","来源管线",["pipeline-lineage","pipeline-checksum","pipeline-quarantine-status"],"来源链路：raw → normalized → tile", "校验和与数据血缘完整；异常分片在隔离区，未进入生产版本。"),
] } as const;
