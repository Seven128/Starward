# P2 总云量 BFF 消费者接线证据（2026-10-28）

本轮按唯一 PLAN P2 续接暂停前代码，未改 PLAN/HANDOFF，未重新开发已独审的 Context pin、publication registry、全局 numeric read store 与既有开发发布。这里只确认 BFF 软件消费者接线及下述开发检查，不代表 P2 完整交付或完整 Goal 完成。独立复核由主 agent 后续安排。

## 已接通的责任

- `cloud-point-weather.ts` 通过 registry 读取指定 immutable pin；只保留点位所需原生时次数值，不访问 GRIB/provider。共享空间采样与相邻原生时次规则沿用 contracts；缺帧保留占位且不跨缺帧插值；共享队列满后该次点读不再发余下帧请求；始终释放 publication。过期、读失败、覆盖外与真实零值保留不同含义。
- `weather-provider.ts` 新 `TotalCloudCompositeAdapter` 同时读取 ECMWF 与既有 QWeather；QWeather 的非云字段、原始小时、官方预警及其来源独立保留。新源协商后旧 QWeather 行内 `cloudPercent` 清空，ECMWF 数值只放独立 `totalCloud`，经统一投影消费。ECMWF 不可用不 fallback QWeather 总云量；其它天气失败仍保留有效 ECMWF。显式 `totalCloud:null` 是旧 Context 兼容路径；`undefined` 才允许 contextless 操作选一次当前 pin。
- `weather-hour.ts` 的 `projectWeatherAt` 是共享组合读取边界：保真实 QWeather `weatherAt`，ECMWF 按所选精确时刻及真实相邻端点取值。新源总云量无值时 `cloudEvidence:null`；旧合同不产生该字段。cloud-only 返回 `weather:null`、`weatherAt:null`，仍有独立云量；不制造温度、危险天气布尔值或其它资料。
- `astronomy-service.ts` 的 hourly 与 opportunity 两投影已迁到同一 helper；每 report 一份 `weatherEvidence.totalCloud`，row 只带 compact evidence。weather/report cache 已含 pin 身份、独立有效性及 v15 时间轴版本；`weather.value === null` 不再直接清空有效 cloud-only cache；到期不追 current。整条天气 deadline/failure 也保留新源显式无值合同。
- `miniapp-service.ts` 将上述组合供给 Astronomy；Map signal 复制 compact evidence，Map 到期与 forecast validity 同时考虑云量期限。为 D1 接入 `TerrainService` 的 `mapStaticPublication` 配置，其余 Terrain 责任未修改。
- `outbox-worker.ts` 复用既有 WEATHER / ASTRONOMY 批次，分别在进入点循环前只选一次 pin。WEATHER 持久化新 `weather-run-v2-total-cloud` / `weather-snapshot-hour-v2`，独立序列每 run 一份、hour 保真实其它天气小时或显式 null；旧 Context 行形状维持原合同。cloud-only 不将 QWeather provider health 冒充 READY。ASTRONOMY 候选 Context 继承同 pin；已有 DECISION 消费 astronomy 快照，无新增取源。

## Map 兼容边界及仍未完成项

`map-cloud-forecast.ts` 旧九点采样显式传 `totalCloud:null`；有新源字段的 Context 不允许进入旧 QWeather snapshot/polygon DTO。新 Context 的 `getMapCloud` 暂以 `cloud_grid_provider_not_ready` 返回可重试 503；combined Map 保留 markers / report signals 等独立结果，cloud dynamicLayer 无伪装 polygon。后续真正 ECMWF grid/base raster 由 P2 原责任接入并替换这一未就绪边界。

现用本地 numeric `current` 只具开发资格。本轮未新增正式地图 ready 声明，基础成品、必要有界补图、对象上传与校验、正式 ready pointer、CDN 冷回源、目标手机/持续 Play/内存等原义务仍待各 owner 完成。本轮未启动 API、DB、worker、提醒发送或手机会话，未上传、下载、重新发布数据，未运行 Git 修改、构建或切换分支。

## 行为验证

命令（`workers/miniapp-api`）：

```text
node ../../tools/run-node.cjs --import tsx --test src/cloud-weather-composition.test.ts src/weather-hour.test.ts src/weather-provider.test.ts src/weather-hour-validity.test.ts src/weather-astronomy-coverage.test.ts src/map-cloud-forecast.test.ts src/api-exception-filter.test.ts
```

结果：40 pass / 0 fail。新组合用例 8 个，使用现有共享 synthetic publication fixture、真实 `CloudNumericPublication` 文件读取与真实 MiniappService/Sky/Map 消费者，覆盖同 pin 精确时刻、真实零值、原生端点、禁止跨缺帧或外推、ECMWF 过期禁 QWeather fallback、其它天气失败时 cloud-only v2 快照、legacy 显式 null、一次选择后 current 改变仍保 pin、共享队列饱和停止发余下请求、Sky/Map compact evidence、旧新 cache 隔离、cloud-only cache 独立存活和到期。

源码收尾复核发现：若先遇一般帧读失败，再遇队列满，首次错误码可能遮蔽饱和停止条件。已按本次帧错误判断停止，并优先披露 queue-full；既有饱和用例改为“先一帧成功、再一般失败、再队列满”，最终重跑 `cloud-weather-composition.test.ts` 8 pass / 0 fail。没有追加同类地点或扩大重复验证。

API noEmit 已运行；本轮最后一次只有并行 D1 的 `terrain-prepared-publication.test.ts:82` 入参 purpose 联合类型错误（已向主 agent 报告）；本轮 BFF 文件及新增测试无类型错误。整体 typecheck 必须由主 agent 在 D1 收敛后确认，不能将该状态计为全仓通过。

## 既有真实开发批次只读结果

只读 root：`E:/Dev/Starward-data/development/nationwide-layers-20261028/cloud/published-development`。未写 current / manifest / ready / numeric 文件。

- publication：`ecmwf-tcc:5eeb59e648e63d6c847b6674e6dc4d37795623e19892136e13a73c64f7a06f5d`
- manifest SHA-256：`0569b5777aa8c6aef3f0ad61a9832902b1e47bb8ddddaebf39a33badd9bdc26c`
- run：`2026-10-27T00:00:00Z`；supports240HoursUntil：`2026-10-28T12:00:00Z`；validTo：`2026-11-07T12:00:00Z`。

经 registry → `CloudPointWeather` → `cloudPointSeriesAt`，用原 qualification clock `2026-10-27T18:50:00Z` 检查 `2026-10-28T06:20:00Z`（原生端点均 `06:00` / `09:00`，每点 2 帧，均 FRESH、errorCode:null）：

| 地点 | WGS84 | cloudPercent |
| --- | --- | ---: |
| 深圳 | 22.5431, 114.0579 | 23.640965972221668 |
| 北京 | 39.9042, 116.4074 | 42.93220208333372 |
| 拉萨 | 29.652, 91.172 | 82.69444444444464 |

同现有 pin 另用实际 wall clock `2026-10-27T22:10:51.584Z` 读取深圳点，状态 FRESH、errorCode:null。这只验证当时既有真实数值路径，不延长批次有效期或声明之后持续供给、整机性能和正式地图可用。

## 独审发现的整体截止丢结果及修复

全新只读独审指出：原 `Promise.all` 等待两源时，一源拖到整体截止会使整个组合 reject；Astronomy 的整体 fallback 随后清空另一源已经成功的结果。Root 新增回归在修复前实测 **1 fail / 0 pass**，失败为 `weather_deadline_exceeded`，不是 fixture 无数据或工具失败。

本次局部修复沿原 owner 完成：

- `TotalCloudCompositeAdapter` 仍独立组合真实 QWeather 与 ECMWF，使用原 **6,500 ms** 整体预算有界结束。没有给整个 QWeather 再套一个与其内部请求相同的 6,000 ms 截止；原 QWeather forecast / alerts 的分别截止、缓存和部分成功行为保持。组合每当独立来源完成时提供内部 `onIndependentResult` 快照，未完成来源仅在截止降级结果中记 unavailable；选批尚未完成不能伪装 legacy，已选 pin 后的读等待仍保该真实身份，不追第二次 current。
- Astronomy 保留原 shared weather cache 的 key、容量、权限与 TTL。只在同一个活跃 acquisition 内保存一份进度引用，索引数量受既有 `weatherEntries` 限制；超容量的原 uncached compute 保本次局部进度，不能挤掉共享请求。内层 acquisition 截止和每个 waiter 的剩余截止均可取已完成独立结果；用户取消仍先拒绝该 waiter，不能取消其它共享读者。
- 进度记录没有 Context、SpotDetail、Sky report 或诊断日志。waiter 在 finally 解除订阅；settled 后清除全局索引、latest 和 listeners；clearCaches 的 generation 隔离原样保留，旧 factory 不能迟到占用新代索引。组合自身在截止/取消后停止发进度并清已完成来源局部引用，迟到完成不能覆盖已返回结果。这里确认逻辑退休，不把 abort 当作底层物理工作或内存已经停止/释放。

实际检查（`workers/miniapp-api`）：

```text
node ../../tools/run-node.cjs --import tsx --test src/cloud-weather-composition.test.ts src/weather-provider.test.ts src/astronomy-reuse.test.ts src/weather-hour-validity.test.ts
```

结果 **35 pass / 0 fail**。覆盖原 QWeather 各天气/预警 lane 截止不互相抹去、真实小时过期、Astronomy 缓存共享/取消/失效，以及新截止回归。随后修复 exactOptionalPropertyTypes 的剔除 observer 方式、补充在途 generation guard 和 contextless 已选 pin 的迟到隔离后，最终重跑：

```text
node ../../tools/run-node.cjs --import tsx --test src/cloud-weather-composition.test.ts src/astronomy-reuse.test.ts
```

结果 **22 pass / 0 fail**。新四个行为用例包括：

1. 双向独立来源在有界截止保成功值，用户取消仍拒绝。
2. 真实 Astronomy `computeDecision` 入口用默认 **6,500 ms** 定时器（测试只推进 clock），在 shared acquisition 整体截止保已成功 QWeather 和官方预警，不冒有效云量。
3. 同一 key 的三个 waiter：短剩余截止保 QWeather、另一个 user cancel 拒绝、peer 保持活跃并最终获得完整同 pin 云量；仅一次 primary 读取，迟到结果不修改先前 partial，后续完整缓存继续复用。
4. contextless 异步选批已完成而数值仍在途时，截止保持已选 pin；忽略取消的来源之后完成也不能再发布进度或改变返回值。

Root 的统一 API typecheck 与本修复的全新独审仍须在最终整合时确认。本次未启动 API、DB、worker、设备、构建或分发，未改 PLAN/HANDOFF/运行配置，未上传、取数或重新加工数据。正式 raster/OSS/CDN、真实 DB 快照及设备等前述未完义务保持。
