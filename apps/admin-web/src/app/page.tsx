function scenario(key: string, action: string, label: string, ids: string[], primary: string, body: string, meta = "当前为版本化产品示例；生产数据将显示来源、生成时间、有效期和质量状态。") {
  return { key, action, label, evidence: ids.map((id, index) => ({ id, title: index === 0 ? primary : label, body, meta })) };
}
export const adminOperationsFeature = { outcome: "admin-data-operations", eyebrow: "运营控制台", title: "数据、来源与审核操作", subtitle: "生产启用先过真实性、目标区质量稳定、商业许可与安全降级硬门；合格候选再按 12 个月总成本选择。", scenarios: [
  scenario("qualified-lowest-tco-provider-selection","provider-tco-evaluate","供应商选型",["provider-hard-gates","provider-tco-breakdown","provider-selection-decision"],"硬门槛：真实性 / 区域质量 / 稳定 / 商业许可 / 安全降级", "失败候选先淘汰；通过硬门槛后按同日 CNY 含税 12 个月总成本、1k/10k/100k MAU 与故障场景比较。", "当前付费预算 CNY 0；不自动购买、续费或升档。"),
  scenario("job-idempotent-replay","job-replay","任务回放",["job-idempotency-key","job-replay-result","job-duplicate-count"],"幂等键 weather.normalize:g1:v7", "已重放 1 个死信分片；重复 2 项无需重复写入；输入/输出版本、耗时和审计完整。", "支持 dry-run、范围、速率、暂停与恢复。"),
  scenario("spot-merge-and-risk","spot-merge-review","地点合并",["spot-canonical-record","spot-risk-flags","spot-merge-audit"],"规范地点 spot-118 · 新版本 12", "媒体、评论、来源与坐标策略按预览迁移；最新封路警告保留且缓存已失效。", "合并记录已写入审计；rollback 指向 spot-118:v11。"),
  scenario("moderation-case","moderation-open-case","审核案件",["moderation-evidence","moderation-decision","moderation-appeal-status"],"证据：受限原图/EXIF、现场时间与贡献历史", "处理决定：需补充，公开状态仍为待核实；原贡献不可变。", "理由、通知、申诉和审计原子保存；仅授权审核员可见原始证据。"),
  scenario("source-operation","source-disable","来源熔断",["source-health","source-circuit-state","source-fallback-impact"],"路线主来源错误率 18% · 成本偏差 +31%", "熔断已打开；降级影响 248 份报告；后续响应标记缓存/降级，备用来源缺失交通字段。", "变更需 source.operator + 有效 MFA；操作与原因进入不可变审计。"),
  scenario("replay-and-release","dataset-release-preview","规则回放",["dataset-version-diff","dataset-rollback-point","dataset-release-status"],"历史复现 vs 当前模拟：主备排序变化", "版本差异、阻断项和解释可追溯；现场反馈只用于比较，不改写历史输入。", "发布已阻止：缺少第二审批；旧规则 v9 保持生效，rollback 可用。"),
  scenario("admin-security","admin-open-audit","权限与审计",["admin-role-boundary","admin-audit-log","admin-sensitive-field-mask"],"权限拒绝：invite_only 坐标 · MFA 已过期", "敏感写入要求重新认证；成功/失败尝试均记录 actor/action/reason/correlationId。", "审计不含 secret；坐标、EXIF、凭据和个人字段服务端掩码。"),
  scenario("source-pipelines","pipeline-open-run","来源管线",["pipeline-lineage","pipeline-checksum","pipeline-quarantine-status"],"数据血缘：immutable raw → normalized → quality → derived", "天气缺字段进入隔离，未进入业务；OMM epoch 过期使可信度下降；VIIRS/DEM 版本与许可可见。", "checksum、run、许可、归属、影响与熔断真实；不直接透传 provider。"),
] } as const;
