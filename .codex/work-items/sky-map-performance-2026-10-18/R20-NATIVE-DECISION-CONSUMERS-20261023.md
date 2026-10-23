# R20 F07 原生共享决策消费者实现（2026-10-23）

状态：非设备实现已整合；首轮独审发现的摄影未知提交重试覆盖已修，新的独立复核未发现本修复范围内未解决P1/P2。不代表完整 F07、原生界面/定位/导航/设备验收或完整 Goal 完成。现有 R1–R20/H1–H8 及未完成实体持久化义务保留。

## 已实施责任

- `shell-store` 一次发布位置、偏好、地图选择和决策 revision；地图选择/角色/路线模式规则仍由纯 `map-selection-state` 拥有，原 `map-selection-store` 为同一 shell 的兼容入口。没有第二份 selectedId 或自动首项选择。`useDecisionSnapshot` 从同一已提交状态派生观察地点和出发地：Tonight/Forecast/Sky/Shooting 使用已选择观察点，Map 搜索与路线起点保持原出发地。选择地点不会覆盖设备位置或既有保存实体。
- `decision-context` 保存有效观星夜、精确 UTC moment、moment 来源和明确的默认时区来源。共享纯时间语义在 `packages/contracts/src/observing-time.ts`；沿现 Astronomy 当地中午至次日中午的观星夜归属，跨午夜不会被 UTC 日期截断成另一个夜。非法日期（含日历溢出）和无时区时刻不提交。没有新增 Node 依赖到纯合同。
- Tonight、Forecast 和 Map 的 query key/queryFn 使用同一个请求快照；当前夜来自共享状态，重进页面不提交挂载默认值。Forecast 原跨 key 的旧数据 placeholder 已移除，迟到旧夜不能冒充当前夜；HTTP client 拒绝上下文不匹配的响应。模型、图层、透明度、滚动和展开等呈现状态继续属于页面。
- Forecast 时间列与天文事件、Sky 目标最高点提交精确 moment；Shooting 用同一地点、夜、时区、目标、moment 和当前镜头输入请求。新的时间/地点请求没有旧条件作为当前结果；保存版本使用其原输入/条件，切换浏览状态不会重写或重新标注旧版本。保存失败/进行中不宣称成功。
- Map 实际点击地点 B 后路线目的地与动态详情 `/spot/[spotId]` 一致；未选择地点时详情禁用，marker 有 `map-spot-${spot.id}`。Spot 的独立深链 B 不自动采用其可能仅近似的坐标；已有观察点 A 保留，通用说明明确 B 尚未用于当前安排。Spot/API 读取权限和 ID 修复由并行 Spot owner 实施，本记录只覆盖组合消费者证据。

## 交互与有界能力决定

- Tonight 的“今晚/明晚”仍直接提交。自定义日期改为本地编辑草稿，增加“应用日期/取消”：只有显式应用合法日期才提交；无效输入、取消、返回或重新进入不会覆盖已提交日期。这是此次消除“边输入边污染共享夜”的明确交互决定，沿原生 Screen Contract 的合法 commit/cancel 规则，不是新的 UI 资源采用。
- 切换到另一个夜会清除旧精确选择，按现小时表起点提供当地 **18:00 预览**，明确显示“尚未选定时刻”，不能称最佳或用户精确已选。合法具体事件/时间列/跳时刻再提交 `selected` moment。
- 位置尚无可靠 IANA 时区来源。本批保留现产品默认 `Asia/Shanghai` 并在界面说明“默认北京时间；地点时区尚未确认”。没有由经纬度推断时区；跨区域地点时区恢复与目标验收继续未验。未取得数值位置时沿已声明深圳默认范围并明确未定位，不冒充设备定位。
- 各现能力支持集合不同：Forecast 夜计算支持银河/月/主要行星，Sky 目录支持银河/命名星/M31，摄影规则当前为银河模板。选中其他目标时不悄悄替换为银河；不支持的消费者明确不可用，摄影 HTTP 为 422。扩展这些实际算法/输入仍是既有产品未完成义务。
- Forecast/Map 图层仍按供应商实际批次时间描述；与选定时刻不同则明确未重算，不拿新时间标签证明旧图层已更新。完整目标图层渲染/时间供应与设备验收未关闭。

## 摄影精确时刻的服务边界

原 `ShootingPreviewService` 把 `scheduledAt` 换为最近天气小时，并把小时天文高度当拍摄高度。本批在真实 handler/service 修复：

- HTTP、规则输入、返回上下文和既有 runtime receipt 保留规范化精确 UTC；验证夜归属、合法时区/时刻，兼容未带 target 的旧银河调用。
- 最近小时仅提供天气，保留 `weatherSampleAt` 和与拍摄时刻的分钟偏差；不把缺失条件写成 0。月面照明/银河方向高度复用现 Astronomy Engine 与银河方向 owner，在精确时刻计算并记录 `astronomyAt`/算法版本。
- receipt 身份纳入全部实际输入和算法版本，两个相邻秒/不同坐标不折叠成一个小时结果。客户端验证返回位置/夜/时刻/目标与方案输入身份，拒绝旧服务舍入结果。
- 既有 runtime 仍是非生产 POC receipt，不把本次 SQLite receipt 重启读回称作完整摄影/行程领域持久化完成。

## 实际自动验证

生产回归为 `apps/mobile/src/state/decision-context-consumers.test.tsx`；旧任务 probe（原先对错误行为断言）的 `.test.tsx` 已删除并由此替代。历史 trace 保留其当时失败事实，不能继续运行旧“错误成立”期望冒充绿灯。

真实 React、Zustand、React Query、页面和 HTTP clients；仅 RN/Expo、存储外部边界、导航与远端响应隔离。7 个消费者回归验证：未来夜跨 Tonight/Forecast/Map 与已挂载消费者/重进；非法/取消/显式应用；Sky 精确时刻→Shooting 请求/保存；Map B→路线/真实 detail；Forecast 日期/精确事件/小时提交与本地浏览；深链 B 保 A 的采用身份和坐标；旧夜迟到响应隔离。

API 测试使用实际 Fastify HTTP handler、ShootingPreviewService、天文计算、规则 owner 和生成临时 SQLite runtime。覆盖精确请求/天气时刻差异/确定性输出/receipt 重启读回、相邻秒与不同位置身份、非法时刻/夜/时区及不支持目标拒绝。临时目录清理已核验绝对路径在本次系统 temp 前缀内。

命令与结果：

```powershell
node tools/run-node.cjs --bin vitest vitest run apps/mobile/src apps/mobile/modules apps/api/src/__tests__/shooting-preview.test.ts apps/api/src/__tests__/server.test.ts packages/domain/src/shooting/shooting.test.ts --reporter=dot
# 34 files / 138 tests passed，exit 0
node tools/run-node.cjs --bin typescript tsc --noEmit -p apps/mobile/tsconfig.json
# exit 0
node tools/run-node.cjs --bin typescript tsc --noEmit -p apps/api/tsconfig.json
# exit 0
```

随后仅修复受影响的文案/小型边界（无支持目标不触发 refresh、当前 Sky 保存状态不受旧异步结果覆盖、数值位置不完整时不拼接默认坐标、客户端承认等价带时区的精确时刻）。受影响 4 files / 15 tests 及 mobile typecheck 再通过；最终 Map 图层批次说明/文案后 7 个消费者回归和 mobile typecheck 通过。

## 保留事项与 Context 回写建议

- 根任务应完成独立审查后记录结论；以上是实现者验证。没有操作 IDE、ADB、手机、共享服务或私有数据库。
- Itinerary/Field/Community/既有版本等仍由各实体 owner 负责，目前通用时间标签不证明它们业务请求、持久写入或重新启动链完成。不能用这一批前端/receipt 通过关闭 R20 独立 API 真实业务持久化。
- 原生视觉、实际导航/返回、真实设备定位、性能、持久化全流程和跨时区来源仍保留原设备/数据义务。
- Durable Context 可在 `mobile/core-journeys.md` 写入共享 shell slice、起点/观察点分义、Tonight 明确应用/取消；在 `mobile/field-and-account.md` 写入精确时刻与采样时间分义、保存版本保持原身份；不应把本轮测试次数/执行过程或总体完成结论写入 Context。

## 整合独审与摄影恢复修复

首轮独立审查实际运行7文件41项，route/verifier53项通过。Android先选prepared marker、Android/iOS共享具体地点路由、remote iOS传递ID的旧接线缺口已在代码关闭，未执行目标平台导航。共享快照、出发地/观察点区分、深链不自动采用近似坐标、合法日期和精确时刻未发现其它新增P1/P2。

独审在真实ShootingScreen/Query/domain/storage中注入“写入成功但确认丢失”，实证A的r2在切时刻B后点重试被B的r2覆盖。原任务反例保留于`tmp/r20-f07-integration-save-review.test.tsx`，其错误成立期望不是修后产品检查。

root修复：保存前冻结完整版本与ID/revision/savedAt；同步single-flight阻止同轮双击；初始化未读完不能创建新版本。未知结果继续同attempt，不从新Context重建。存储同ID/revision不可变，旧回放返回当前全量历史而不重排/覆盖；同native JS owner的读写队列串行。写入抛错后只在精确读回已提交版本时确认成功，否则保留未知。确定版本冲突需用户显式“另存原方案为新版本”，读取最新记录后保留原输入另建版本；不自动renew未知提交。历史损坏/不可读不清空存储。

生产回归`ShootingScreen.test.tsx`验证A未知→切B→重试仍保A，下一显式保存B为新revision，重新挂载读回，后续并发版本冲突及显式另存；真实存储单测补丢回复可读回、历史回放、不同行为同版本拒绝与损坏保留。最终命令：

```powershell
node tools/run-node.cjs --bin vitest vitest run --root apps/mobile src/features/shooting/ShootingScreen.test.tsx src/data/shooting-storage.test.ts src/state/decision-context-consumers.test.tsx src/data/shooting-client.test.ts --reporter=dot
# 当前mobile 4 files / 13 tests passed, exit 0
node tools/run-node.cjs --bin vitest vitest run --root packages/domain src/shooting/shooting.test.ts --reporter=dot
# 当前domain 1 file / 7 tests passed, exit 0
```

此前根目录命令报告7文件34项；随后`vitest list --filesOnly`核实其中两份是`.codex/work-items/main-integration-2026-10-17/tmp/parent-main`与`parent-branch`的历史shooting测试，不能计入当前源码范围。以上限定root结果取代该统计。实现者较早根目录138项结果也仅保原执行记录，最终当前workspace整合结果另记，不据其总数宣称当前全套。

本轮mobile noEmit捕获并行F14消费者迁移中的旧Itinerary类型错误，待其批次整合后复验，不冒已通过。摄影仍使用现AsyncStorage；队列仅证明同JS owner，跨Web标签页/独立native进程原子提交及全部F14实体持久化仍未关闭。未操作任何设备、共享服务或私有资料。

新的独立审查实际复跑正式摄影组件/存储2文件4项，未发现本修复范围内未解决P1/P2；只根据正式回归复核同一故障序列，没有声称再次执行旧临时反例。root另核旧反例仍在上述任务目录。消费者的冷启/恢复路由证据现在记录已解析的实际marker ID而不是模板；相应route/verifier53项复验通过，仍不冒Android/iOS运行已执行。
