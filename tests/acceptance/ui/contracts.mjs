const scenario = (action, evidence, text) => ({
  action,
  evidence,
  text,
});

export const outcomeRoutes = Object.freeze({
  "admin-data-operations": "/admin/operations",
  "community-contribution": "/community",
  "field-offline-safety": "/field",
  "forecast-and-astronomy": "/forecast",
  "identity-profile-privacy": "/profile",
  "itinerary-and-collaboration": "/plans",
  "map-route-discovery": "/map",
  "mobile-shell-and-preferences": "/",
  "notifications-and-toolbox": "/tools",
  "quality-release-observability": "/admin/quality",
  "shooting-assistant": "/shooting",
  "sky-orientation-ar": "/sky",
  "spot-detail-and-trust": "/spots/current",
  "tonight-decision": "/tonight",
});

export const uiContracts = Object.freeze({
  "admin-data-operations": {
    "qualified-lowest-tco-provider-selection": scenario("provider-tco-evaluate", ["provider-hard-gates", "provider-tco-breakdown", "provider-selection-decision"], ["provider-selection-decision", /通过硬门槛.*总成本|总成本.*通过硬门槛/u]),
    "job-idempotent-replay": scenario("job-replay", ["job-idempotency-key", "job-replay-result", "job-duplicate-count"], ["job-replay-result", /已重放|无需重复/u]),
    "spot-merge-and-risk": scenario("spot-merge-review", ["spot-canonical-record", "spot-risk-flags", "spot-merge-audit"], ["spot-merge-audit", /合并记录|审计/u]),
    "moderation-case": scenario("moderation-open-case", ["moderation-evidence", "moderation-decision", "moderation-appeal-status"], ["moderation-decision", /处理决定|待复核/u]),
    "source-operation": scenario("source-disable", ["source-health", "source-circuit-state", "source-fallback-impact"], ["source-fallback-impact", /降级影响|备用来源/u]),
    "replay-and-release": scenario("dataset-release-preview", ["dataset-version-diff", "dataset-rollback-point", "dataset-release-status"], ["dataset-version-diff", /版本差异|变更预览/u]),
    "admin-security": scenario("admin-open-audit", ["admin-role-boundary", "admin-audit-log", "admin-sensitive-field-mask"], ["admin-role-boundary", /权限|角色/u]),
    "source-pipelines": scenario("pipeline-open-run", ["pipeline-lineage", "pipeline-checksum", "pipeline-quarantine-status"], ["pipeline-lineage", /来源链路|数据血缘/u]),
  },
  "community-contribution": {
    "new-spot-privacy": scenario("community-submit-spot", ["spot-location-precision", "spot-consent-scope", "spot-submission-status"], ["spot-location-precision", /模糊位置|精确位置/u]),
    "transient-report-expiry": scenario("community-submit-report", ["report-expiry", "report-current-state", "report-source-time"], ["report-expiry", /到期|有效至/u]),
    "safety-correction": scenario("community-submit-correction", ["correction-safety-impact", "correction-review-state", "correction-original-version"], ["correction-safety-impact", /安全|封路/u]),
    "media-sanitization": scenario("community-upload-media", ["media-location-stripped", "media-review-state", "media-original-protected"], ["media-location-stripped", /位置已移除|隐私信息已清理/u]),
    "trust-and-moderation-status": scenario("community-open-trust", ["contributor-trust-level", "moderation-visible-status", "moderation-appeal-entry"], ["moderation-visible-status", /审核|申诉/u]),
    "multidimensional-review": scenario("community-open-review-form", ["review-darkness-rating", "review-access-rating", "review-safety-rating"], ["review-safety-rating", /安全/u]),
  },
  "field-offline-safety": {
    "pack-integrity": scenario("field-verify-pack", ["offline-pack-version", "offline-pack-checksum", "offline-pack-validity"], ["offline-pack-validity", /校验通过|需要更新/u]),
    "red-mode-accessible": scenario("field-toggle-red-mode", ["field-red-mode-state", "field-primary-action", "field-status-label"], ["field-red-mode-state", /红光模式/u]),
    "parking-and-backup-offline": scenario("field-open-offline-route", ["field-parking-point", "field-walking-segment", "field-backup-spot"], ["field-backup-spot", /备选/u]),
    "bounded-safety-session": scenario("field-start-session", ["field-session-window", "field-checkin-control", "field-overdue-action"], ["field-session-window", /预计结束|安全时段/u]),
    "explicit-location-share": scenario("field-share-location", ["share-location-scope", "share-location-expiry", "share-location-revoke"], ["share-location-scope", /仅本次|精确位置/u]),
    "offline-write-replay": scenario("field-save-report", ["offline-write-state", "offline-replay-key", "offline-conflict-action"], ["offline-write-state", /待同步|已保存在本机/u]),
    "offline-field-use": scenario("field-enter-airplane-mode", ["field-offline-banner", "field-cached-plan", "field-offline-toolbox"], ["field-offline-banner", /离线/u]),
  },
  "forecast-and-astronomy": {
    "hourly-professional-view": scenario("forecast-open-hourly", ["forecast-hourly-cloud", "forecast-hourly-transparency", "forecast-hourly-seeing"], ["forecast-hourly-transparency", /通透度/u]),
    "model-disagreement": scenario("forecast-compare-models", ["forecast-model-a", "forecast-model-b", "forecast-disagreement"], ["forecast-disagreement", /分歧|差异/u]),
    "future-trend": scenario("forecast-select-future-night", ["forecast-night-selector", "forecast-trend-confidence", "forecast-validity"], ["forecast-trend-confidence", /趋势|可信度/u]),
    "twilight-and-milky-way": scenario("forecast-open-astronomy-timeline", ["astronomy-twilight", "astronomy-moon-window", "astronomy-milky-way-window"], ["astronomy-milky-way-window", /银河/u]),
    "layer-provenance": scenario("forecast-open-layer-details", ["forecast-layer-source", "forecast-layer-version", "forecast-layer-freshness"], ["forecast-layer-source", /来源/u]),
  },
  "identity-profile-privacy": {
    "guest-login-merge": scenario("profile-login-and-merge", ["profile-merge-preview", "profile-local-data-count", "profile-merge-result"], ["profile-merge-preview", /合并/u]),
    "session-revocation": scenario("profile-revoke-session", ["session-current-device", "session-revoked-device", "session-revocation-result"], ["session-revocation-result", /已退出|已撤销/u]),
    "profile-content-equipment": scenario("profile-save-equipment", ["profile-observer-type", "profile-equipment-list", "profile-preference-summary"], ["profile-equipment-list", /设备|镜头|望远镜/u]),
    "secure-export": scenario("profile-request-export", ["export-scope", "export-verification", "export-expiry"], ["export-expiry", /有效期|过期/u]),
    "account-deletion-completion": scenario("profile-confirm-deletion", ["deletion-scope", "deletion-retention-exceptions", "deletion-completion-status"], ["deletion-completion-status", /删除完成|删除处理中/u]),
    "help-and-sources": scenario("profile-open-sources", ["help-data-sources", "help-licenses", "help-safety-boundary"], ["help-data-sources", /数据来源/u]),
    "location-privacy-enforced": scenario("profile-change-location-privacy", ["location-storage-precision", "location-analytics-scope", "location-sharing-default"], ["location-sharing-default", /默认不分享|关闭/u]),
  },
  "itinerary-and-collaboration": {
    "create-generated-plan": scenario("plan-generate", ["plan-observation-window", "plan-main-spot", "plan-safety-checklist"], ["plan-observation-window", /观测窗口/u]),
    "overview-consistency": scenario("plan-open-overview", ["plan-overview-map", "plan-overview-timeline", "plan-overview-version"], ["plan-overview-version", /版本/u]),
    "candidate-to-plan": scenario("plan-add-candidate", ["plan-candidate-source", "plan-candidate-role", "plan-candidate-result"], ["plan-candidate-role", /主地点|备选/u]),
    "route-tradeoff": scenario("plan-compare-routes", ["route-distance-tradeoff", "route-risk-tradeoff", "route-arrival-tradeoff"], ["route-risk-tradeoff", /风险/u]),
    "refresh-version": scenario("plan-refresh", ["plan-change-preview", "plan-saved-version", "plan-refresh-result"], ["plan-change-preview", /变化|更新预览/u]),
    "secure-share-and-offline": scenario("plan-create-share", ["plan-share-scope", "plan-share-expiry", "plan-offline-availability"], ["plan-share-expiry", /有效期|到期/u]),
    "collaboration-conflict": scenario("plan-resolve-conflict", ["plan-conflict-original", "plan-conflict-incoming", "plan-conflict-resolution"], ["plan-conflict-resolution", /解决冲突|保留版本/u]),
    "astronomy-timeline": scenario("plan-open-astronomy", ["plan-twilight-event", "plan-moon-event", "plan-target-event"], ["plan-target-event", /目标/u]),
  },
  "map-route-discovery": {
    "map-status-and-context": scenario("map-open-status", ["map-location-context", "map-data-state", "map-provenance"], ["map-data-state", /最新|缓存|部分可用/u]),
    "filter-no-results": scenario("map-apply-strict-filter", ["map-active-filters", "map-empty-reason", "map-relax-filter"], ["map-empty-reason", /没有符合|无结果/u]),
    "layer-version-and-failure": scenario("map-toggle-light-layer", ["map-layer-version", "map-layer-freshness", "map-layer-failure-state"], ["map-layer-failure-state", /图层不可用|使用缓存/u]),
    "selected-spot-action": scenario("map-select-spot", ["map-selected-spot", "map-spot-summary", "map-add-to-plan"], ["map-add-to-plan", /加入计划/u]),
    "route-reorder": scenario("map-reorder-route", ["route-stop-order", "route-recalculation-state", "route-version"], ["route-recalculation-state", /重新计算|已更新/u]),
    "route-mode-and-last-mile": scenario("map-change-route-mode", ["route-mode", "route-parking-end", "route-last-mile"], ["route-last-mile", /步行|最后一段/u]),
    "route-provider-degradation": scenario("map-refresh-route", ["route-provider-state", "route-cache-age", "route-straight-line-fallback"], ["route-provider-state", /超时|降级/u]),
  },
  "mobile-shell-and-preferences": {
    "guest-manual-location": scenario("shell-set-manual-location", ["shell-location-label", "shell-location-source", "shell-guest-state"], ["shell-location-source", /手动位置/u]),
    "preference-save-and-switch": scenario("shell-switch-profile", ["preference-active-profile", "preference-saved-state", "preference-ranking-impact"], ["preference-saved-state", /已保存/u]),
    "primary-navigation": scenario("shell-open-map-tab", ["primary-tab-tonight", "primary-tab-map", "primary-tab-profile"], ["primary-tab-map", /地图/u]),
    "permission-scope": scenario("shell-open-permission-feature", ["permission-purpose", "permission-scope", "permission-denied-alternative"], ["permission-denied-alternative", /手动|稍后/u]),
  },
  "notifications-and-toolbox": {
    "pretrip-rule": scenario("tools-create-pretrip-rule", ["notification-rule-trigger", "notification-rule-channel", "notification-rule-preview"], ["notification-rule-trigger", /出发前|提前/u]),
    "intrip-risk-deeplink": scenario("tools-open-risk-notification", ["notification-risk-reason", "notification-deeplink-target", "notification-risk-action"], ["notification-risk-reason", /风险|封路|天气变化/u]),
    "long-term-controls": scenario("tools-change-notification-controls", ["notification-topic-control", "notification-quiet-hours", "notification-consent-state"], ["notification-quiet-hours", /免打扰/u]),
    "calendar-and-station": scenario("tools-add-calendar-event", ["calendar-event-time", "calendar-event-timezone", "station-mode-state"], ["station-mode-state", /站点|固定地点/u]),
    "position-tools": scenario("tools-open-position", ["position-azimuth", "position-altitude", "position-time"], ["position-azimuth", /方位/u]),
    "professional-tool-boundaries": scenario("tools-open-professional", ["tool-precision-label", "tool-data-source", "tool-limitation"], ["tool-limitation", /仅供参考|精度限制/u]),
    "educational-content-priority": scenario("tools-open-learning-card", ["learning-prerequisite", "learning-safety-note", "learning-next-action"], ["learning-safety-note", /安全/u]),
  },
  "quality-release-observability": {
    "restore-objectives": scenario("quality-open-restore-drill", ["restore-rpo-result", "restore-rto-result", "restore-drill-evidence"], ["restore-rto-result", /RTO|恢复时间/u]),
    "native-release-boundary": scenario("quality-open-release-matrix", ["release-ios-artifact", "release-android-artifact", "release-native-capability-gates"], ["release-native-capability-gates", /真机|原生能力/u]),
    "observability-correlation": scenario("quality-open-trace", ["trace-correlation-id", "trace-provider-span", "trace-user-redaction"], ["trace-correlation-id", /关联|Trace/u]),
    "analytics-funnel": scenario("quality-open-funnel", ["analytics-consent-filter", "analytics-funnel-steps", "analytics-retention-window"], ["analytics-consent-filter", /同意|授权/u]),
  },
  "shooting-assistant": {
    "mobile-plan": scenario("shooting-create-mobile-plan", ["shooting-phone-model", "shooting-mobile-settings", "shooting-mobile-risk"], ["shooting-mobile-settings", /曝光|快门/u]),
    "camera-plan-and-risk": scenario("shooting-create-camera-plan", ["shooting-camera-settings", "shooting-lens-field", "shooting-risk-note"], ["shooting-risk-note", /风险|试拍/u]),
    "preset-boundary": scenario("shooting-apply-preset", ["shooting-preset-source", "shooting-preset-assumptions", "shooting-preset-adjustment"], ["shooting-preset-assumptions", /假设|适用条件/u]),
    "checklist-offline": scenario("shooting-save-checklist", ["shooting-checklist-items", "shooting-checklist-offline", "shooting-checklist-progress"], ["shooting-checklist-offline", /离线可用/u]),
    "versioned-save": scenario("shooting-save-version", ["shooting-plan-version", "shooting-change-summary", "shooting-restore-version"], ["shooting-plan-version", /版本/u]),
    "ai-is-explanation": scenario("shooting-open-ai-explanation", ["shooting-rule-result", "shooting-ai-explanation", "shooting-ai-boundary"], ["shooting-ai-boundary", /不会编造|规则/u]),
  },
  "sky-orientation-ar": {
    "universal-sky": scenario("sky-open-universal-view", ["sky-time-context", "sky-location-context", "sky-visible-objects"], ["sky-visible-objects", /可见/u]),
    "time-jump": scenario("sky-jump-time", ["sky-selected-time", "sky-object-position", "sky-timezone"], ["sky-selected-time", /时间/u]),
    "obstruction-trajectory": scenario("sky-add-obstruction", ["sky-obstruction-profile", "sky-target-trajectory", "sky-visible-window"], ["sky-visible-window", /可见窗口/u]),
    "field-of-view": scenario("sky-apply-fov", ["sky-fov-equipment", "sky-fov-overlay", "sky-fov-scale"], ["sky-fov-equipment", /镜头|目镜|焦距/u]),
    "ar-degradation": scenario("sky-open-ar", ["sky-ar-support-state", "sky-ar-fallback", "sky-ar-accuracy"], ["sky-ar-fallback", /通用天空|降级/u]),
    "low-accuracy-guidance": scenario("sky-calibrate-sensors", ["sky-sensor-accuracy", "sky-calibration-guide", "sky-manual-orientation"], ["sky-sensor-accuracy", /精度低|需要校准/u]),
  },
  "spot-detail-and-trust": {
    "spot-first-screen": scenario("spot-open-detail", ["spot-decision-summary", "spot-observation-window", "spot-primary-action"], ["spot-decision-summary", /适合|谨慎|不建议/u]),
    "light-and-horizon": scenario("spot-open-light-details", ["spot-light-estimate", "spot-horizon-profile", "spot-light-provenance"], ["spot-light-provenance", /来源|估算/u]),
    "media-provenance": scenario("spot-open-media", ["spot-media-capture-time", "spot-media-source", "spot-media-moderation"], ["spot-media-source", /来源/u]),
    "last-mile-and-facilities": scenario("spot-open-access", ["spot-parking", "spot-last-mile", "spot-facilities"], ["spot-last-mile", /步行|最后一段/u]),
    "safety-overrides-score": scenario("spot-open-safety", ["spot-safety-block", "spot-score-suppressed", "spot-safe-alternative"], ["spot-safety-block", /封路|安全风险/u]),
    "coordinate-policy-all-exits": scenario("spot-share-coordinate", ["spot-authoritative-coordinate", "spot-map-coordinate-label", "spot-share-coordinate-policy"], ["spot-map-coordinate-label", /GCJ-02|WGS84/u]),
    "reviews-and-trust": scenario("spot-open-reviews", ["spot-review-dimensions", "spot-review-trust", "spot-review-moderation"], ["spot-review-trust", /可信|贡献者/u]),
  },
  "tonight-decision": {
    "successful-night-report": scenario("tonight-refresh", ["tonight-decision-summary", "tonight-observation-window", "tonight-data-provenance"], ["tonight-observation-window", /观测窗口|最佳时段/u]),
    "main-and-backups": scenario("tonight-select-primary", ["tonight-primary-spot", "tonight-backup-spots", "tonight-switch-impact"], ["tonight-backup-spots", /备选/u]),
    "partial-provider-failure": scenario("tonight-refresh", ["tonight-partial-state", "tonight-missing-impact", "tonight-route-fallback"], ["tonight-partial-state", /部分可用|缓存/u]),
    "visible-target-selection": scenario("tonight-select-target", ["target-visible-window", "target-altitude-azimuth", "target-next-action"], ["target-altitude-azimuth", /高度|方位/u]),
  },
});

export function validateUiContracts(outcome, expectedKeys) {
  const route = outcomeRoutes[outcome];
  const contracts = uiContracts[outcome];
  if (!route || !contracts) throw new Error(`missing_ui_contract_group:${outcome}`);
  const actualKeys = Object.keys(contracts).sort();
  const wantedKeys = [...expectedKeys].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(wantedKeys)) {
    throw new Error(`ui_contract_key_mismatch:${outcome}:expected=${wantedKeys.join(",")}:actual=${actualKeys.join(",")}`);
  }
  for (const [key, item] of Object.entries(contracts)) {
    if (!item.action || !Array.isArray(item.evidence) || item.evidence.length < 3 || !item.text) {
      throw new Error(`invalid_ui_contract:${outcome}:${key}`);
    }
  }
}
