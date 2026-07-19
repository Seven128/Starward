function scenario(key: string, action: string, label: string, ids: string[], primary: string, body: string, meta = "当前为版本化产品示例；生产数据将显示来源、生成时间、有效期和质量状态。") {
  return { key, action, label, evidence: ids.map((id, index) => ({ id, title: index === 0 ? primary : label, body, meta })) };
}
export const communityFeature = { outcome: "community-contribution", eyebrow: "社区贡献", title: "可信贡献与纠错", subtitle: "地点、实况、照片和安全纠错经过隐私清理、版本追踪与审核；社区内容不覆盖硬安全信息。", scenarios: [
  scenario("new-spot-privacy","community-submit-spot","提交地点",["spot-location-precision","spot-consent-scope","spot-submission-status"],"公开为模糊位置", "精确位置仅供审核且需单独同意；当前提交待核验，不会立即成为安全结论。"),
  scenario("transient-report-expiry","community-submit-report","现场实况",["report-expiry","report-current-state","report-source-time"],"实况有效至 03:00", "当前状态有效；到期后自动退出推荐证据，仍保留可审计来源时间。"),
  scenario("safety-correction","community-submit-correction","安全纠错",["correction-safety-impact","correction-review-state","correction-original-version"],"封路纠错 · 高安全影响", "立即进入待复核并临时降级地点；原版本保留，不让旧高分覆盖安全风险。"),
  scenario("media-sanitization","community-upload-media","上传媒体",["media-location-stripped","media-review-state","media-original-protected"],"位置已移除", "EXIF 与可识别隐私信息已清理；公开副本待审核，原图受保护且不直接分发。"),
  scenario("trust-and-moderation-status","community-open-trust","可信与审核",["contributor-trust-level","moderation-visible-status","moderation-appeal-entry"],"贡献者可信等级 2", "审核状态对提交者可见；不通过时提供理由和申诉入口。"),
  scenario("multidimensional-review","community-open-review-form","地点评价",["review-darkness-rating","review-access-rating","review-safety-rating"],"暗度、可达性与安全分别评分", "安全维度必须填写现场日期和说明；综合星级不能掩盖单项风险。"),
] } as const;
