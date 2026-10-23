# R19 第一批 UI 独立代码审查 — 2026-10-22

结论：本轮发现的来源记录、时区链接和共享按压转场问题已由主任务修复，并逐处复核当前源码；本次已审范围没有剩余已确认 P1/P2。此结论仅是代码与采用输入审查，**没有本次独审实看或产生的新 WEAPP 页面输出**，不关闭 R19、导航迁移、目标交互或完整 Goal。

## 范围与输入

- 只审 R19 本批共享 Button、来源读取宿主及 Map 整合、紧凑月相/九项天气、图层 header/限高与工具入口；没有将既有性能、Harness、数据与其他 dirty 工作纳入本批缺陷。
- 读取 PLAN R19、REQUIREMENTS R19、global/architecture、Mini Program Screen Contract 的当前采用范围、Map/Shared State/Information Design owners、DESIGN 对应 Mini Program 条款，以及当前 `starward-interaction-design` 和措辞参考。
- 读取 `R19-SHARED-PRESS-IMPLEMENTATION-20261022.md`、`R19-COMPACT-INFORMATION-IMPLEMENTATION-20261022.md` 与相关测试源码。
- 实际读取临时采用包的 README、ADOPTION、`source/candidate-preserved/review.mjs`、`review.css` 及原 `source-ui.mjs`；实际 `view_image` 查看 `press.png`、`map.png`、`sources.png`、`layers-cloud.png`、`layers-light.png`、`astronomy.png`、`weather.png`。资源根为 `C:/Users/momoooo/AppData/Local/Temp/starward-design-20261022/implementation-input-20261022`。没有重新选稿、改稿或建立仓库镜像。
- My 导航实现方案仍由主任务等待用户选择；保留 TabBar 的当前状态不被当作已交付，也没有要求按未选机制改造。

## 发现及修后复核

1. **P2，已修复：层叠来源不能按 ID 丢弃不同完整记录。** 原 `pages/map/index.tsx` 的 `layerSources` 用 `Map(source.id, source)` 合并。真实 BFF `miniapp-service.ts` 的 Map Scene 会合并多个地点报告与 cloud sample 的 forecast sources，并通过 `uniqueSourceRecords` 保留不同获取/有效时段；`use-map-cloud-presentation.ts` 继续保留这些记录。新的入口曾将其重新缩成最后一条。现 `index.tsx:1154` 已调用 contracts 的 `uniqueSourceRecords`，共享读取宿主也保留每一条记录；没有新增第二套去重规则。
2. **P2，已修复：Map 时区出处复制入口被无替代移除。** `timezoneSource` 曾一起改为纯 `credit`，但新层叠 sources 不包含时区来源。国内大湾区外坐标由 `observation-context-service.ts` 提供的 `DOMESTIC_TIMEZONE_SOURCE` 会触发该实际路径。现 `index.tsx:2683` 恢复原 `SourceAttribution compact`，完整出处复制仍可到达。地图地形原可见 provider 文本也已在 `:2689` 附近恢复，小来源按钮没有取代该短署名。
3. **P2，已修复：公共根 transition 覆盖原 Sky 动效。** 原共享双 class 的 `transition` 简写覆盖 `.sky-browse-sidecar` 的 transform/opacity，以及真实 `sky-orientation-time-ruler__tick` 随 visualIndex 变化的 transform/opacity/color；它们原本的转场会变为突变。现 `shared-button-press.scss` 仅以 `--button-press-duration` 改按压 filter/box-shadow 时长，并组合 `--button-domain-transition`；`spot-sky-page.scss` 的 sidecar 与 tick 已把各自原参数接入该插槽，减少动态效果的原规则仍在。进一步检查 Button 根上已有 transform/opacity transition；另一真实命中 `sky-overlay-motion__backdrop` 使用 `pressVariant="none"`，不带共享 class，因此不受本覆盖影响。
4. **按压采用差异，已修复：可见面与图标变体漏接。** Sky 菜单 toggle 的可见圆面是 `::before`，sidecar 的可见面是内层 View，现分别接 `before` / `child`，没有对大命中盒画内凹。My 设置、Search 返回、点位路线三处可见纯图标按钮已接 `icon`；现有隐藏 extent 控件未借机扩改。

以上修复由主任务实施，本审查仅回读确认，没有改写生产代码。

## 其余已审责任

- `SharedButton` 保留原 Taro touch/cancel/long-press/openType/formType 等参数；disabled/loading/aria-busy 会阻止 click，普通原事件只调用一次。反馈没有 React 状态、订阅、查询或动画计时器；长按连发及兼容 click 抑制仍由原 Sky owner 管理。self/before/child 只改变可见反馈，文字、根布局及命中盒未缩放。Observation 的按压色沿现暖红 token；来源遮罩也受共享黑色 modal-scrim 规则覆盖。
- `SourceDisclosure` 原 inline 消费者保留；sheet 使用一条 route-local channel。Map 仅把来源 surface 放入原 `NativeBackBoundary.nativeMapContent`，来源 Back 优先，退出期间保持拦截；hide、账户/点位身份变化和消费者移除清掉阅读。当前代码无第二个 Map PageContainer，完整记录的 provider/title/时间/精度/许可/限制与复制动作继续由 Provenance/SourceAttribution 管理。
- 月相继续读取原 phase、照明、月出/月落、高度和夜间阶段。天气矩阵九项均来自同一个当前 `skyRow`，复用原数值格式化；0、缺值、无覆盖/过期、单位和风向没有补造或混同。非 DAY 天气保原分组。夜光、目标、AQ、近期天气及地形独立信息和缺失/失败责任仍在。
- 图层 header 保标题/地形开关/来源/两选项，单一 ScrollView 保内容。测量使用真实 workspace、header/content 和 tool rail 限高；点击工具保原 stopPropagation 和业务动作，云量日期/时间尺与年度夜光无时间控件的边界未改变。原有重试、覆盖与必要署名仍可达。

## 证据与保留项

复用两份实现记录所载的 54 项按钮/消费者检查、33 项来源/布局/数值检查，以及主任务所报 integrated typecheck 和 15 项 Map 检查；本独审没有重复运行全量，也不把这些先前结果冒充本次最后修复后的重编结果。额外只做只读 TSX Button 消费者/根 transition 盘点和级联、数据生产链检查。

主任务报告第一版 WEAPP 构建完成，但其后还有上述修复；本独审未借用该构建证明页面已出现。当前没有实际新 WEAPP frame/原生动作供本独审比对。仍由原验收 lane 完成修后构建及实际采用对照、原生 hover 的滑出/滚动接管/touchcancel/隐藏复位、Sky hold/repeat、来源滚动/关闭重开/Back、页面状态恢复、真实高度与工具命中、正常/减少动态效果及暖红反馈。只补这些现存义务，不新增主题/设备组合矩阵。

本审查仅新增本报告；未操作设备、IDE、服务或构建，未执行 Git 写操作，未上传原件，未修改 PLAN/HANDOFF 或设计采用资源。
