# 总云量来源、覆盖与实际展示接线

沿唯一 PLAN P2 的全部现用消费者责任实施，没有修改 PLAN、HANDOFF、运行配置、SDK、API、数据库或发布状态。Root 统一负责构建、服务及目标运行时；本模块没有启服务/worker、操作手机、构建、Git 操作或上传。旧 r6、私有原件、冻结候选及其他 dirty 均未处理。

## 实际缺口与接线

先读 Selected Weather Evidence、共同迁移责任、当前客户端/BFF证据、UI Skill 和 DESIGN 的小程序相关规则；实际查看采用的 `increment/review-images/weather.png`、`sources.png`，并回读当前增量源 `candidate-preserved/review.mjs` 的天气矩阵及来源展开/返回、原 `chapters.js` 的组件拼接。沿用矩阵、署名与现有 SourceEntry/原生阅读页，不修改样式、图标、布局或设计资源；新数据身份不把设计稿的旧 QWeather 样例升级成事实。

确认并修复的实际消费者缺口：

- `map-time-frame.ts` 原先要求 `weatherAt` 才允许云量帧，合法 ECMWF cloud-only 及真实零会被丢弃。现在由现用 compact evidence 资格 owner 确认 exact selectedAt/期限，保原 frame index。旧九点 polygon/source-hour 分支保持。缺失、错误身份或 UNAVAILABLE 帧退休旧 compact identity，不能随另一时刻的数值继续保留；legacy replacement 保无字段语义。
- 原 `cloudForecastStarts` 仍只代表真实 QWeather 小时。新增原生区间沿已有 `ForecastCoverageNote` 传递：`cloudIntervals` 缺省表示旧合同；明确空数组表示已启用新源但无有效云覆盖。区间只来自共享 `cloudPointSeriesAt` 采样准入的原生/相邻端点，缺测不连过去，孤立时刻不扩成一小时。UTC 表示归一化不取整有效时刻。Map index 仅接一次 memo 和现有 coverage prop，没有改 native、raster、手势或图层选择。
- 地点矩阵沿原结构使用同一 native projection；“对应小时”仅在新合同下限定为“其他天气对应小时”，云量的缺测、读取失败与过期独立表达。普通旧合同的 caption、credits 与覆盖保持原样。新云量数据失败不借 QWeather 填值。
- 现有气象与天文 SourceEntry 共用 `weather-source-presentation.ts`：披露当前选中时刻、真实起报、本批期限、原生时刻或 3/6 小时插值两端，以及由原 bracket owner 给出的两端权重。秒/毫秒被保留。详细规则留在已有来源阅读页，不添加常驻技术说明或产品版本文案。必要短署名随实际有效的独立字段显示，QWeather 小时缺失不再隐藏 ECMWF 声明。
- 计划 `weatherStarts` 继续只表示 QWeather 小时；`cloudIntervals` 与 `hasCloud` 独立来自同一采样责任并裁到计划时段。现有 coverage 位置分别标明总云量和其他天气，cloud-only 时不会显示整项“暂无可用预报时段”，也不会隐藏必要署名。原计划失败/重试、日期、地点、天文和多日结束语义保持。
- SourceDocument 的原生阅读传输准入/复制保留独立区间，拒绝逆序、无效日期等输入；没有传 React 节点、Query 闭包或整份 report。原来源身份、账号/Context 失效、返回 owner 保持。

实际 Sky 主页面没有单独的天气矩阵/预报来源入口；目前该处为 WeatherAlerts 和独立影像/目录来源。本轮不新建 Sky 天气入口，原精确云量/连续 Play 投影继续沿前批责任，不改变原 Source/菜单构图。

## 新消费者引出的独立整批到期

源区间可以包含展示行之外的孤立原生端点。如果所有 hourly 行的 `cloudEvidence` 均为 null，原 `skyForecastPresentation.boundaries` 只有 row deadline，native header 没有计时；即使新增 deadline，原 project 在 row 不变时也会返回原 report。此边界会让来源覆盖状态不随整批期限变化。

Root 明确授权在原 `forecast-presentation.ts` 最小补齐：沿同一 boundaries/idle clock 加 header `supports240HoursUntil+1ms`，不新增时钟、Query、缓存或 TTL。期限本身仍有效，下一毫秒后只投影独立 totalCloud 及同 source id 为 EXPIRED；value 保历史身份，其他 QWeather、天文、hourly 引用和原缓存不改变。 Source/coverage 由该新 view identity 更新；没有把整份报告或其他来源判成过期。

新增 `header-only native coverage` 回归先在旧实现实测失败，首个失败为缺 header deadline；修复后通过。另以实际 `useSkyForecastQuery` 挂载原 idle clock，证明全 row 无 cloud、离线时仍在期限后更新，查询缓存未被写回。

## 独审发现的时钟错位与窄修

全新只读审查发现：上述 Query 投影已经按 BFF 校准时钟把 totalCloud header 判成 EXPIRED，来源 helper 却默认使用较慢的设备 `Date.now()`，且未尊重该终态，从保留的 native 历史 value 重新得到覆盖和云量。已在真实生产函数回归中确认：使用合法的 header-only、hourly 云量均为 null 的输入，修前 `totalCloudCoverage` 仍返回整条 native 范围，期望应为空；这次失败不依赖非法/缺字段的 SkyRow fixture。

- `totalCloudCoverage` 与 `selectedTotalCloud` 先拒绝 EXPIRED/UNAVAILABLE header，不删除历史 value，不从 compact 或旧 QWeather 分支补回。
- Map 的 SpotInformationPanel 收到 `spotSky.forecastClockOffsetMs`，其 coverage、selected cloud、缺失文案及来源 sections 全部沿原 Query 校准时钟；memo 依赖包含该偏移。对应 report 仍由原同地点/Context/fingerprint/revision 资格检查选择。
- PlanReference 由实际 editor host 收到 `skyQuery.forecastClockOffsetMs`，同一次 render 以一个 `now` 传给既有 planReference 和来源 sections。没有把 `weatherStarts` 改成云量时刻。
- Map 的区间与可选时刻沿 `cloudPresentation.clockOffsetMs`，保留旧公开候选期间不借用一个新请求的时钟。既有 retained-candidate 和 Query clock/timer 持有失效责任，未增加 timer、Query、cache、TTL 或设备时钟校正 owner。
- 缺省偏移仍为 0；旧 undefined 合同和其他天气/天文的独立结果保持。期限时刻本身有效，`+1ms` 后才不可用。

新增三个行为回归：已过期 header 在慢设备时钟下不能复活；实际 Map host → Spot memo 与 Plan host → 实际 PlanReference renderer 使用查询偏移（同 report 的偏移变化也触发 memo 更新）；实际 Map 区间/choices 使用 retained candidate 的偏移而不是新 query。前述 header 反例修前真实失败、修后通过。生产函数/绑定提取与受控 React primitive 仍是有界开发证据，不替代目标运行时。

修后原 13 个受影响文件同批 **69/69 PASS、0 skip**。随后仅修正新增 VM test 的字典类型，并补相同期限定界的断言；对应两个改变的 test 文件 **13/13** 复跑通过。最终 `npm run typecheck --workspace @starward/wechat-miniapp` 通过；没有放宽生产类型。

## 检查及边界

原接线阶段的受影响组同批 **66/66 PASS、0 skip**；clock 窄修后的 69 项及最终复跑见上节：

```text
node ../../tools/run-node.cjs --import tsx --test
  src/hooks/use-forecast-query.test.ts
  src/services/forecast-presentation.test.ts
  src/components/forecast-coverage.test.ts
  src/components/forecast-coverage-note.test.ts
  src/components/weather-source-presentation.test.ts
  src/components/source-document-content.test.ts
  src/utils/source-document.test.ts
  src/pages/map/map-time-frame.test.ts
  src/pages/map/cloud-map-consumer.test.ts
  src/content/plan/detail/plan-reference-model.test.ts
  src/content/plan/detail/plan-reference-render.test.ts
  src/content/plan/detail/plan-reference-host.test.ts
  src/components/data-presentation.test.ts
```

含实际 CoverageNote / PlanReference 模块渲染、实际 SourceDocument EventChannel 数据准入/复制、Map 实际绑定和原 Query clock，覆盖云-only/0/缺帧/孤立端点/3与6小时/expiry/旧合同及失败恢复。运行时边界为受控 Node/Taro primitive fixture；没有宣称 WEAPP 画面、原生操作或手机结果。首轮四项失败仅为 UTC 文本表现 `.000Z` 差异，统一为保毫秒的 UTC ISO 表示后通过；没有取整或放松范围断言。

`npm run typecheck --workspace @starward/wechat-miniapp` 最后通过。曾有一处 TypeScript predicate 的 false 分支收窄到 never，已调整同一判断的求值顺序；未放宽合同类型。

原来源接线已获全新独立审查，发现的时钟阻断已按上述窄修。修后仍待 Root 窄审与统一构建/WEAPP包体、采用资源在可比目标条件下的呈现及来源阅读/返回效果。正式 Map 新云量 raster 仍为诚实的未就绪 503；全国数据、持续批次、正式 OSS/CDN、整组切换/回滚、目标设备/持续 Play/内存/OOM 与完整 Goal 仍未完成。本记录不将软件检查或来源接线当作完整迁移交付。
