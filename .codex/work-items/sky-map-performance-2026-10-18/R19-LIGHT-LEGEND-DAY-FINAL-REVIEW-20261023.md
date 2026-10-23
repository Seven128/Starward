# R19 LIGHT 图例 DAY 范围最终独审

结论：当前源码与最新普通 WEAPP 编译消费者未发现新增 P1/P2。DAY-only 收敛符合本次采用边界，NIGHT/OBSERVATION 没有套用新的紧凑表达。**本独审不关闭旧普通 gen14 的 LIGHT 排版 P2：新普通包的实际行数、高度、完整可读与返回仍待 Root 沿原设备 owner 复核。**

## Candidate identity

上游为当前 AGENTS、`uiux_design/SKILL.md` 及文字层级参考、DESIGN 小程序 §5A.4、Map Screen Contract 与 `map-and-finder.md` 紧凑层叠/年度夜光合同。本代理完整读取 delta `ADOPTION.md`，实际查看 `review-images/layers-light.png`，并读取 `source/candidate-preserved/review.mjs` 的 `adaptLayers` 和对应具体样式；没有重新选稿、生成或采用设计。

采用说明明确覆盖 DAY 主界面局部构图，公共按压沿主题复用，不重新设计 NIGHT/OBSERVATION 或 Sky。参考图的三项“相对较低/中等/较高”是原示意数据；当前固定产品是五档定量年度夜光，不能为了复制示意项数而删掉两档、阈值或物理单位。参考源保留 12px 图例、gap12、内容流与原色点；此次用一次共同标题承载五档共享的年度属性和单位，再保留五项原颜色/范围，是针对重复内容的展示归组，不把示意相对档赋予新的科学含义。

审查时身份如下，未把旧隔离包或冻结 gen32 倒绑到新源码：

| 文件 | SHA256 |
| --- | --- |
| `map/map-layer-legend.ts` | `ee5b7487a53469742a479f43ee8cd2f334dcbfaffa1a4554b4b3a8180df81136` |
| `map/map-layer-legend.test.ts` | `846992cf29814fcffd1695f5baee62b579eb44b79822502de2dcc9b0302c261c` |
| `map/index.tsx` | `3f480ba695330866149e478f0ec07ac5cb4ef49596830f1a8a9b8e7d91c04aa7` |
| `map/map-layer-selector.scss` | `ca90932cd4149a558391720dc7c33cb3d640cafb34e6ebbad39e65cb503024c8` |
| 普通 `dist/weapp/pages/map/index.js` | `7eed840b87c633cb714d40eebad468ff812f182a26355b67fce0ed3c97b8083b` |
| 普通 `dist/weapp/pages/map/index.wxss` | `c724538363ab50e1fa7ebad841fa5efe913cc188474637f7392164090873c6ec` |

## Invocation result

本代理只读比较修前私有 `index.tsx.before`、`map-layer-selector.scss.before` 和上一轮 `map-layer-legend.ts.after`。当前 Map 相对本批修前只有导入、当前显示数据的投影调用及图例渲染接线；SCSS 只有共同标题规则。新增 `mode` 取自 Map 已有、唯一的 `useAppStore(state => state.mode)`，没有新增 hook 或第二份主题状态。

复用 Root 的 15 项相关检查通过与正式 typecheck exit 0，不重跑。Root 保留的首轮 scope 修改重复声明 `mode` 导致 TS2451 和一次独立 check build 失败；该错误已删除，当前声明与调用已直接核对，不将失败输出算作构建通过。

普通 `dist/weapp` 已在审查时生成。本代理实际读其 Map JS/WXSS，以及原私有 `normal-final-build.log`，后者结尾为 webpack 5.91.0 compiled with 10 warnings in 28210 ms。完整 build 执行 exit、包预算、包指纹和预览准入归 Root 原执行/inspection owner，本代理没有另启 build。

## Observed product behavior

`projectMapLayerLegend` 的 `DisplayMode` 是必需参数，只有 `mode === "DAY"` 且 LIGHT raster 的 method/style/unit、五项数量和每项按序 label/color/完整 range 全部匹配当前固定 policy 时，才归组为 `年度夜光 · nW/cm²/sr` 及五条短标签/原阈值。

NIGHT 与 OBSERVATION 走原完整标签、原 range/单位路径，共同标题为 null；云量、无 raster 的历史相对夜光、未知版本或任一字段不符也保留原展示规则。未盲切字符串，未缩字、隐藏条目或固定裁高。五个物理范围、颜色和边界含义未改变；年份、不随观测时刻变化说明、EOG 署名、PARTIAL 缺测提示、来源页和 native acknowledged 数据责任保留。

这是源码与编译消费观察，没有新的手机画面。本报告不预断实际会排成几行或达到某个固定面板高度。

## Verified

- 复用[前独审](R19-LIGHT-LEGEND-COMPACT-REVIEW-20261023.md)已核的当前真实 r6 proof、完整五档 policy、服务准入链与实际投影可达性。本次没有再采集 proof、请求活动 HTTP、重跑发布或重复读取全部数据。新增 DAY 门不改变该数据准入链，仅缩小展示变更的主题范围。
- Map 仍传入 `displayedLayer`，LIGHT 由实际已呈现的 `displayedLightLayer` 负责，不提前用 pending 新图例标注旧原生图。当前已有 `mode` 作为第二参数直接传入；没有额外主题订阅、状态迁移或数据 mutation。
- 最新普通 Map JS 实含 `"DAY"===n` 与完整 fixed 科学字段检查、两参投影调用，以及 `heading/items` 的实际渲染。NIGHT/OBSERVATION 不具备该 heading 的可达分支。
- 最新普通 WXSS 的 heading 仍限于 `.theme-day.map-page .map-layer-sheet`，为 12Px/20Px、上距 4Px、原主题次级文字色与居中；DAY legend 保原 gap12Px/上距4Px，现有 flex-wrap、inline-flex、nowrap、色点与其他尺寸没有被本补丁改变。没有增加自定颜色、装饰容器、强制宽高或裁切来压缩排版。
- 与采用源对照时保留数据差异：三项示意不能作为删除真实五档的依据；一次共有物理单位是数据必需内容，具体布局是否达到采用的紧凑比例仍必须看新目标画面。未将这一语义映射直接写成“视觉已符合”。

## Unverified

旧 gen14 手机画面仍是修前排版，新普通包尚待沿既有预览/设备 owner 推送并实际查看。需要核同一 LIGHT 五档的实际内容、可读性和面板高度，以及来源/关闭返回；旧 P2 在此之前保持未关闭。该局部对比不重开选稿，也不要求再做已有科学数据或工具资格矩阵。

本独审不认证其他 UI 区域、完整按压曲线、未覆盖主题目标表现、原生配准/覆盖、叠层流畅度与内存、Sky 六字段/Play 或整个 Goal。冻结 gen32 仍属于本次 LIGHT 合修前的观察包，不能因其目录名称含 current-ui 而称已包含此修复。

## Invalidated

前独审对应的无 `mode` 限定投影身份已经被当前 DAY-only 源码替代；前独审的真实 proof/科学责任核对继续复用。旧隔离构建 `ed16d3cf…`、scope 失败 check、普通 gen14 与冻结 gen32 各保其独立身份，均不是当前普通源码的实际手机结果。

最初组合读取对大型 DESIGN/Screen Contract 输出发生截断；本代理随后按受影响标题、采用范围和具体 Map 图层责任定向重读，不用截断输出声称完整读取全部文件。

## Cleanup

本代理只新增本报告，没有修改既有文件、重跑检查/build、启动服务/collector、操作手机/IDE或发出预览；没有生成/删除设计资源、触碰账号/N05/R6/数据库/VPN，未提交或上传。全部私有原件、首错日志、普通 gen14 和冻结构建保留。完成后交 Root 关闭，不复用本代理。
