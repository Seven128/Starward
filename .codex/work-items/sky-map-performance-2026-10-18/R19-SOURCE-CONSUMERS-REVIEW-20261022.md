# R19 统一来源页：独立消费者审核

2026-10-22。独立审核当前 checkout 的消费者迁移；未参与实现。只读代码、最新用户修订、相关 Skill/Context、PLAN 来源页段及本轮三个实施/核心审查报告，仅写本报告。未操作设备、IDE、服务、Git、生产代码、PLAN、HANDOFF 或 durable Context。

## 结论

发现一个公共按钮视觉接线 P2，主代理已修复，本审核已读回确认；当前审核范围没有已确认未修的 P1/P2。此结论是代码接线审查，不认证实际 WEAPP 页面交接、视觉或 Back，也不关闭整个 Goal。

### 已修 P2：Sky 影像状态区覆盖公共来源按钮

- 位置：`apps/wechat-miniapp/src/features/sky/spot-sky-page.scss:930`。修复前 `.sky-image-status button` 的 specificity 高于公共 `.source-button`，会覆盖其边框、背景和内边距。
- 实际消费者：`spot-sky-page.tsx` 的 HiPS、prepared region 和 SDSS 已绘影像 credit 均在 `.sky-image-status` 内，通过 `SkyOpticalImageCredit` 渲染同一 `SourceButton`；该覆盖使这些入口变为透明无边框，违背用户“同一按钮样式”的修订。
- 修复读回：`.sky-image-status button` 现在只保留 `pointer-events:auto`，视觉规则缩至 `button:not(.source-button)`。因此公共按钮不再接受旧视觉覆盖，上层状态区的 `pointer-events:none` 也不会使它失去点击能力。此处未以 CSS 读回代替目标视觉验收。

## 消费者与语义核对

| 责任 | 实际核对结果 |
| --- | --- |
| Map 视口与层叠 | 视口地形和层叠来源均为 `SourceEntry`，保当前来源、数据版次、临时覆盖说明；时区已有公共入口。正式点完整来源按钮经原 `onEvidence`/`openMapPage` 资格和公共 `navigateToSource` 跳页。云量、年度光污染的必要短声明仍与实际可见数据对应。未发现旧来源 host、sheet 或 native Back 接线残留。 |
| 点位月相/气象/夜光/地形 | 复用公共入口，天气实际小时、时区、过期和“获取不等于发布”说明进入结构化模板；夜光、地形必要 credit 仍在正文。山体轮廓保持独立来源/覆盖/限制，其短声明由同章 `SpotTerrainOverview.displayedSources` 一起承载，没有因子组件改成按钮而丢掉。 |
| AQ 与近期天气 | AQ 保 current、forecast 两条完整记录和各自失败/有效性，不以 ID 合并或用当前值填未来。近期天气保前两自然日、缺失日、额外天气事实与安全限制；原 live hook 的 hide/失败清旧值未改，接收页可见期间持有当次小型文档，hide/身份变化/卸载释放。没有新增历史缓存或 URL 正文。 |
| 官方预警 | 来源与预警业务正文已拆开。标题、发布机构、发布/生效/到期、完整 instruction 和展开的 description 仍在原内容区；来源往返不会把防御指引藏进来源页或无故复位同 scope 展开。 |
| Search 与 Plan | LESS_CLOUD 和观测参考接同一入口；必要天气声明仍只对应真实使用的预报。独立范围帮助和计划正文未机械迁成来源信息。 |
| SITE、设施与文章 | 设施状态、核验时间、使用条件、文章正文保持原 owner；只移动长来源详情。SITE 聚合继续保 spot、route、site.sources、facility 完整记录。当前路线能力说明没有已确认的第三方 attribution 输入，本次未将“可能存在某种未来输入”写成已丢失署名；相关范围限制仍保留。 |
| 照片与分享 | 媒体采用 facts/links 模板，保作者、原文许可、拍摄时间、现场/代表含义和原始/许可 URL，不伪造 SourceSummary 获取时间。分享 notes 留在分享正文，事件和点位来源身份保持；DAY 与其他主题均用公共入口。 |
| 天象 | 科学源与补充文章来源仍是独立入口；科学日期精度、必要 credit、作者/原文日期及文章正文留原处，目录版次只随科学源。没有内联完整来源卡继续承担详情。 |
| Sky 资料与资产 | 目标、目录、光学 credit、星座/暗星、太阳模型、地景、银河、W3、Body 均接公共按钮/页骨架或结构模板。天空说明保模拟、非现场、历史影像等当前事实，不将这些必要含义全部搬走。 |

静态扫描范围为 `apps/wechat-miniapp/src` 全部生产 TSX/SCSS；未找到生产 `SourceDisclosure`、`SourceReadingHost`、`SourceReadingSheet`、`useSourceReading`、`SkySourceDisclosure` 或 `SkySourceLink` 引用。余下直接 `Provenance` 仅为公共阅读模板及既有领域来源页，没有在被迁移业务正文遗留长来源卡。其余相关通用 button 选择器未发现同类公共来源按钮视觉覆盖。

## Sky 身份与返回边界

- 公共按钮没有绕过 `openSkySources`；该领域入口继续检查当前时间/Context、取消未确认校准、串行导航、设置 sourceReturn，并在失败恢复/释放。hide/show、Canvas 保留与正常隐藏退休仍归原 Sky owner。
- 光学来源继续核当前 native generation、时间、模式、完成 credit；地景再核实际 resource/publication，银河再核图像存活，Body 再核同一 reference/image/publication 后走精确 hash route。公共模板没有以当前查询或另一出版版次替代这些已绘身份。
- 原目录/可选影像、prepared、HiPS/rights、Body 与 target 的不同加载机制、互斥参数解析、旧/隐藏 retry 拒绝、部分/过期/失败含义均保留。target 活动与主体来源用完整记录去重，同 ID 异记录不会被吞掉。
- W3 继续沿原有效 metadata 和 discovery/current manifest 资格；其数据清单链接是 discovery/current，不能据此称为固定 hash 下载或当前成功绘制回执。本轮没有扩展该渲染/发布链，本报告也不提升它的证据等级。
- 统一内部来源页不等于已打开外部官网、满足供应商超链接义务或已实际下载；原文 URL/权利与准确“复制”语义保留。

## 证据与未验范围

本次阅读了 `R19-SOURCE-PAGE-CONSUMERS-20261022.md`、`R19-SOURCE-CONSUMERS-MIGRATION-20261022.md`、`R19-SKY-SOURCE-PAGES-20261022.md` 和 `R19-SOURCE-CORE-REVIEW-20261022.md`；实际核对生产接线、模板字段、相关 query/生命周期 owner 和样式。公共核心的内部验证详见已有独审，未重复启动另一路核心审核。

本审核未重新运行他人已经完成的 15/98/60 项检查，也未把这些报告当成自己的执行结果。主代理仍应沿当前完整候选完成实际 EventChannel 内容交付、正确来源/复制、原生系统 Back 与原层叠/时间/档位/滚动状态，以及 Sky Sources 往返恢复。整包构建、当前目标外观/行为、物理资源与性能/内存均未由本报告认证；不新增设备/主题排列矩阵，也不恢复历史失败采集循环。
