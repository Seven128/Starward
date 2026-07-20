# Starward 个人试用版边界与未来生产发布门

状态：当前权威只交付 `individual-personal-trial`（个人运营主体、owner-only、非商业个人试用）。当前机器交付可在不购买服务、不公开上架、不接入 production traffic 的前提下完成验收；本文列出的事项是未来转公开或商业运营时的新发布门，不再是当前 14 个 Outcome 的外部确认。

## 0. 当前交付配置

- 运营主体：个人；分发范围：owner-only personal trial；不得宣称公开、商业或生产就绪。
- 外部服务经常性成本硬上限：CNY 200/月、CNY 2,400/年。
- 选择顺序：先过滤来源可追溯、个人非商业使用权明确、目标区质量/稳定性合格且可安全降级的候选，再在合格候选中免费优先，最后才比较最低完整 TCO。
- 预算不是购买授权：`withinBudget=true` 不等于 `purchaseAuthorized=true`；当前代码不得自动购买、自动升档、启用第二付费源或开放生产流量。
- MVP、V1、V2、V3 的产品能力仍全部保留。尚未得到生产合同、法务、专家或代表性现场背书的结果必须标为 `experimental`、`unknown`、`pending` 或安全降级，不能伪装为权威、安全或生产结论。
- 地点、媒体、现场记录等“用户上传”仍是产品功能；本文所称外部证据是未来发布方用来证明合同、许可、商店审核、专业正确性与代表性现场有效性的治理材料，两者不是一回事。

## 1. 数据源接入能力已实现，生产激活与生产 SLO 留待未来发布权威

[技术选型与数据源决策包](../technical-data-source-decisions.md) 已完成数据来源、真实性/稳定性/许可硬门、合格后最低 12 个月 TCO、缓存与安全降级方案的调研。当前交付也已完成 [production integration manifest](../../config/data-sources/production-integration.json)、[运行手册](../runbooks/production-data-integration.md)、动态 provider carrier、流式不可变静态落盘、fail-closed 生产组合和 [fixture 验证](../../artifacts/verification/production-data-integration.json)。因此“如何对接生产”不是实现卡点，不能再以待合同为由把代码实现留空。

尚未完成的是生产激活：供应商签约/报价、账号与配额审批、真实 secret 颁发与轮换、商业许可/再分发证据、首发区 POC 和真实生产流量。这些事实保持 `externalActivationStatus=pending`、`productionTrafficAllowed=false`，继续阻止 production promotion，但不把当前个人试用版的 `implementationStatus=passed` 改回 pending。个人试用可使用通过上述资格硬门的免费来源、fixture、离线快照或明确降级路径；没有合格候选时必须关闭该实时能力，而不是越权使用来源。

当前交付已经建立十项指标口径、遥测信号与分层维度。真实 SLO 仍须在获批预发/生产链路上线后，按 `DEC production-slo-measurement` 的 28 天滚动窗口采集，并以连续 30 天真实基线、样本数、版本、平台、设备档、网络和冷热缓存分层复验。完成前：

- `artifacts/verification/slo-report.json` 保持 `pending-production-measurement`；
- 每个指标保持 `sampleCount: 0`，不得写入推测值；
- `releaseBlocked` 保持 `true`，不得宣称 production SLO/SLA。

## 2. 未来生产门：iOS、真机和户外矩阵

当前 Windows/Android 环境已完成可执行的自动测试与 Android 模拟器证据。以下项目不阻塞 owner-only 个人试用版，但在未来 production release 权威中必须重新进入验收：

- 天文权威黄金集审阅；
- iOS 模拟器、iOS 真机和代表性 Android 真机；
- 弱网、离线进程重启、低电、低亮与红光；
- 山区/郊外 GPS、磁力计、车辆/金属干扰、最后一公里及长期户外验证。

权威记录为 `artifacts/verification/release-matrix.json`。延期行必须保持 `pending`、`sampleCount: 0` 并写明所需证据；模拟器或室内样本不得改写成真机/户外通过。

## 3. 未来生产门：中国生产合规

当前交付不进入中国 production promotion。ICP/应用备案、地图与测绘边界、个人信息与敏感行踪、跨境与境内存储、对象存储/CDN、第三方 SDK、隐私政策、注销及运营主体配置继续等待合格法律/合规审阅。

权威记录为 `docs/evidence/external-confirmations/china-production-legal-readiness.json`。在 reviewer、qualification、confirmedAt 和 evidenceLinks 真实齐全前，该文件保持 `pending`、`releaseBlocked: true`；不得创建占位 reviewer 或伪造链接。

## 4. 转公开或商业运营时必须新建权威的八类门

当前 Delivery Contract 不把以下事项列为个人试用版的 external confirmations。若 owner 决定公开分发、商业运营、接入生产流量或作出专业/安全保证，必须先批准新的 Source Plan / Delivery Contract 修订，并把以下八类事项恢复为有证据的发布门：

1. 商业供应商权利、价格、配额与 SLA；
2. 地理、遥感、星表和媒体数据许可；
3. 中国生产法律与运营准备；
4. 应用商店、证书、推送与原生能力准备；
5. 户外设备和现场验证；
6. 天文权威审阅；
7. 摄影设备与专家审阅；
8. 地点准入、通行与安全核验。

## 5. 未来升级与关闭条件

取得新证据后，只更新对应既有 Evidence Surface，保留日期、设备/环境、步骤、原始证据链接、样本数、失败与复测记录；随后在新的生产发布权威下重新运行 `quality-release-observability` 和 Live Final Gate。只有适用外部门真实完成后，才能解除 production promotion 阻止状态。当前个人试用版完成不会自动放开该状态，也不会自动产生采购、公开分发或商业使用授权。
