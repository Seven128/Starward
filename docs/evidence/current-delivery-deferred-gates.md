# Starward 当前交付延期门与生产发布提醒

状态：当前机器交付可继续验收；production promotion 必须保持阻止，直到本文列出的真实证据完成。

## 1. 数据源调研与生产 SLO 不是同一份证据

[技术选型与数据源决策包](../technical-data-source-decisions.md) 已完成数据来源、真实性/稳定性/许可硬门、合格后最低 12 个月 TCO、缓存与安全降级方案的调研。这证明“应如何选择、实现和验证”，不证明供应商已经签约，也不产生真实生产性能样本。

当前交付已经建立十项指标口径、遥测信号与分层维度。真实 SLO 仍须在获批预发/生产链路上线后，按 `DEC production-slo-measurement` 的 28 天滚动窗口采集，并以连续 30 天真实基线、样本数、版本、平台、设备档、网络和冷热缓存分层复验。完成前：

- `artifacts/verification/slo-report.json` 保持 `pending-production-measurement`；
- 每个指标保持 `sampleCount: 0`，不得写入推测值；
- `releaseBlocked` 保持 `true`，不得宣称 production SLO/SLA。

## 2. 已由 owner 延期：iOS、真机和户外矩阵

当前 Windows/Android 环境已完成可执行的自动测试与 Android 模拟器证据。以下项目延期，不阻塞当前机器交付，但继续阻塞 production release：

- 天文权威黄金集审阅与商业供应商契约样本；
- iOS 模拟器、iOS 真机和代表性 Android 真机；
- 弱网、离线进程重启、低电、低亮与红光；
- 山区/郊外 GPS、磁力计、车辆/金属干扰、最后一公里及长期户外验证。

权威记录为 `artifacts/verification/release-matrix.json`。延期行必须保持 `pending`、`sampleCount: 0` 并写明所需证据；模拟器或室内样本不得改写成真机/户外通过。

## 3. 已由 owner 延期：中国生产合规

当前交付不进入中国 production promotion。ICP/应用备案、地图与测绘边界、个人信息与敏感行踪、跨境与境内存储、对象存储/CDN、第三方 SDK、隐私政策、注销及运营主体配置继续等待合格法律/合规审阅。

权威记录为 `docs/evidence/external-confirmations/china-production-legal-readiness.json`。在 reviewer、qualification、confirmedAt 和 evidenceLinks 真实齐全前，该文件保持 `pending`、`releaseBlocked: true`；不得创建占位 reviewer 或伪造链接。

## 4. 仍需在正式发布前提醒 owner 的外部门

除上述两类延期外，Delivery Contract 仍保留以下外部确认：

1. 商业供应商权利、价格、配额与 SLA；
2. 地理、遥感、星表和媒体数据许可；
3. 中国生产法律与运营准备；
4. 应用商店、证书、推送与原生能力准备；
5. 户外设备和现场验证；
6. 天文权威审阅；
7. 摄影设备与专家审阅；
8. 地点准入、通行与安全核验。

## 5. 恢复与关闭条件

取得新证据后，只更新对应既有 Evidence Surface，保留日期、设备/环境、步骤、原始证据链接、样本数、失败与复测记录；随后重新运行 `quality-release-observability` 和 Live Final Gate。只有外部门真实完成后，才能解除 production promotion 阻止状态。
