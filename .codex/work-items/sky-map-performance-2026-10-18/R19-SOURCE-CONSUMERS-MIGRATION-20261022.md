# R19 非 Sky 来源消费者迁移

2026-10-22。执行用户“来源统一跳真实页面，共用按钮、跳转和内容模板”最新指令，沿当前 checkout 保留已有未提交成果。此分工未改公共 core、Map root、app.config、spot/data-source、PLAN、HANDOFF 或 durable Context；未操作设备、IDE、服务、Git commit。公共来源导航和页面由主代理集成。

## 已实施责任

生产端只提交当前完整 `SourceSummary` 和可序列化 `SourceSection`，不传 ReactNode、查询函数或 click 闭包给阅读页，不创建第二数据缓存。现有纯来源 `SourceDisclosure` 及适合迁移的直接 `Provenance` 均已改成共享 `SourceEntry`。已聚合记录继续使用完整记录去重；未新增按 ID 去重。

| 消费者 owner | 迁移与保留边界 |
| --- | --- |
| `components/air-quality.tsx` | current/forecast 两条完整记录保留独立；实际小时、时区、air scope 和失败/过期情况作为 forecast section，原说明作为 text section。重试仍在入口前，当前读数不填未来。 |
| `components/recent-weather.tsx` | active 生命周期内由当前 envelope/data 形成小型文档；隐藏仍由原 hook 清除 Geo 数据，不存历史/离线 payload。缺失日期、日期事实、已返回时段风速与影响限制保留，地区名仅为文档副标题。 |
| `components/weather-alerts.tsx` | 完整预警正文改为独立业务展开，headline/sender/发布时间/生效/到期/完整防御指引继续在原区域；展开按 scope/alert 隔离，来源往返保持当前阅读。来源只传 warningSource，不把预警正文转移到来源页。多条预警共用一处来源入口，必要 credit 仍在内容旁。 |
| `pages/map/spot-panel.tsx` | 月相、气象、年度夜光、天文气象来源均用 Entry；小时范围和原时效说明进入结构化模板。完整点位来源入口改 `SourceButton.onOpen(() => onEvidence("sources"))`，保留 Map 领域导航。 |
| `pages/map/spot-terrain-overview.tsx` | 地形/夜光的完整记录、datasetVersion、源/派生分辨率、coverage 保留；无数据不造空来源入口。必要 credit 仍依 displayedSources，不把关闭/未显示的图层当成当前信用。 |
| `pages/map/spot-terrain-horizon.tsx` | 保留独立 publication identity、coverage 和 limitations，未与俯视图版本合并。画布绘制与释放 owner 未改。 |
| `pages/map/search-page.tsx` | LESS_CLOUD 对应预报必要 credit 就地，增加同一来源页入口；未修改筛选和候选语义。 |
| `components/facility-evidence.tsx`、`pages/map/spot-additional-information.tsx` | 设施状态/核验/使用条件及更多场地业务展开保持；仅长出处迁移为 Entry，credit 就地。 |
| `features/spot/spot-detail-page.tsx` | SITE 原相邻“当前资料来源”和“全部来源”双按钮经主代理确认合为一个 Entry，保留 spot/route/site.sources/facility 当前完整记录；Map 的独立聚合页入口仍保留。共同设施来源在设施区域以同一组件呈现。 |
| `content/article/detail/index.tsx` | 引用设施和文章来源独立 Entry，原设施核验与文章正文不移动；credit 留在相应内容旁。 |
| `content/article/detail/article-media.tsx` | 媒体权利采用 facts + links 模板：原作者、许可原文、拍摄时间、现场/代表归属和原始出处/许可 URL。`sources=[]` 不伪造 SourceSummary 或获取时间；空来源链接保持缺失含义，图片/代表媒体警示仍在正文。 |
| `content/share/public-share-card.tsx`、`content/share/index.tsx` | DAY 分享来源用一个 Entry；公开行程 notes 移回分享正文，阅读来源之前即可读。其他主题保留各独立事件/点位来源，沿用同一入口，不混合身份。 |
| `content/plan/detail/plan-reference.tsx` | 观测参考增加 Entry，必要天气信用只跟对应预报；原范围帮助和计划业务说明仍就地可用。 |
| `components/astronomical-event-modal.tsx` | 科学来源与补充文章来源保持两个独立 Entry；目录版本只属于科学记录，保留在原区域并随科学来源进入阅读。原科学日期精度、资料短名和必要 credit 就地，文章作者/日期/正文保持。各主题不再保留内联长来源卡。 |

已退役上述分工可编辑样式内的 source-disclosure 专属选择器：terrain overview/horizon、spot-panel compact information、public share、weather alerts。预警的业务展开有独立样式 owner，未再借用旧来源壳。Map root index.scss 的旧来源专属选择器已通知主代理处理，未跨分工修改。

## 检查与证据边界

最终检查从 `apps/wechat-miniapp` cwd 执行，使用现有 tsconfig、npm 依赖和 Node/tsx 测试入口，12 个文件 **98/98 通过**：

```powershell
node ../../tools/run-node.cjs --import tsx --test --test-reporter=dot src/components/air-quality.test.ts src/components/air-quality-clock.test.ts src/components/recent-weather.test.ts src/components/weather-alerts.test.ts src/components/astronomical-event-modal.test.ts src/components/data-presentation.test.ts src/content/article/detail/partial-content.test.ts src/content/share/navigation.test.ts src/content/plan/detail/plan-reference-render.test.ts src/pages/map/spot-terrain-overview.test.ts src/pages/map/spot-terrain-horizon.test.ts src/pages/map/spot-additional-information.test.ts
```

保留原测试对 AQ 到期/独立失败、Geo 清旧与重试、预警生效/到期和完整防御文本、设施状态/地形像素生命周期、文章独立读取/恢复、分享导航身份/失效/重复请求的行为断言。SourceEntry 的 source/sections 属性替代旧 children 模型，不恢复旧展开结构。事件主题检查随新要求验证独立来源页入口和科学/文章版本隔离，退役旧“DAY inline disclosure”要求。新增两个有意义的投影检查：媒体拍摄时间不能生成获取时间；公开行程 notes 必须独立留在正文且不混入来源 payload。

首次运行遇到的 Harness 问题均已定位并修复/更正：

- 从仓库 root 启动 terrain 测试时，tsx 未采用 miniapp tsconfig，`@/services` alias 解析失败；改用上述既有 workspace cwd。未改生产 alias。
- share navigation fixture 未覆盖前一轮已迁移的 `SharedButton` import；补齐同一 Button 测试适配后原导航断言通过。
- 预警测量依赖最初引用展开数组；改为展开内容值，未变化内容不重复测量，activation/expiry 仍触发实际父容器测量。

静态消费者扫描确认：此分工范围不再有 SourceDisclosure 或直接 Provenance 生产消费者。剩余排除项为主代理负责的 Map root、公共阅读 core、原 spot/data-source 及 Sky 领域页面。

按主代理最后核对，已移除 `reading-image.test.ts` 中没有实际消费者的旧 SourceDisclosure mock 字段；该 fixture 不再暗示图片渲染负责来源披露。

本分工未运行整包 typecheck/build，也未取得新来源页 WEAPP 实际外观、复制、系统 Back、旧页面状态恢复或性能/内存验收；由主代理在公共 core 与所有消费者合并后统一执行。98 个本地行为检查不替代这些目标运行时义务。
