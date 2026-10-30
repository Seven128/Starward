# D2 当前证据能决定什么（2026-10-28）

**2026-10-30后续用户裁决：本轮D2已完成。** 用户明确将调时、长按反向、跨年、Play/Pause、普通退出及其剩余内存问题“直接算完成了，等到后续遇到卡顿再来解决”。已有证据复用；本文历史UNKNOWN保事实未知，但图片解码/Canvas/native/GPU容量不再是本轮完成门槛，历史“未完义务”表述由此覆盖，不额外补录。后续实际卡顿、增长或退出等体验故障才按[原D2](PLAN.md#sky-time-performance)处理新现场；这不是未测物理释放获得通过。

本记录执行当前 PLAN 的 D2 两个归因问题，不修改方案。已完整核对当前 D2、development/performance 方法、Sky 的时间/缓存/资源 Context、`D0-D2-REPAIR-20261026.md`、两份 `PERFORMANCE-*-ANALYSIS-20261026.md` 及 `SKY-REMAINING-AUDIT-20261028.md`，并沿当前目录、解码、纹理、辅助面与 surface owner 回读实现。

本轮未发现足以支持新增生产修复的证据。生产源码、测试、PLAN、HANDOFF、Context 均未修改，未操作 Git、构建、设备、API 或服务。Query、vector、staging、逐星 motion scratch、精确时间和按住供给已修部分直接复用。下述 UNKNOWN 仍是 D2 未完义务，不能由源码边界或旧软件检查关闭。

## 1. 先核退出原件：有原生崩溃分类，没有 abort 信息/栈

实际读取已收到目录：`E:/Dev/Starward-data/verification/sky-map-20261018/source-received-20261027/performance-repair-20261026/`。

| 原件 | 实际可读内容 | 缺失内容 |
| --- | --- | --- |
| `phone8-exit-info.private.json` | 8 条历史退出摘要，`rawOutputStored=false`；记录字段仅 timestamp/process/reason/status/pss/rss | abort message、native backtrace、allocator/VM fatal 信息 |
| `phone11-entry-exit-info.private.json` | 4 条历史退出摘要，`rawOutputStored=false`；同一字段集合 | 同上 |

两份中 native 记录均指向 **2026-10-26 09:19:42.688、APP CRASH(NATIVE)、status 6、PSS/RSS 各 1.3 GB**，不是两次独立新失败。对整个已收到目录按 crash/exit/abort/tombstone/logcat/stack/ANR 文件名检查，只发现这两份摘要；没有发现已保存的对应栈。未输出进程身份、账号、位置或原始日志内容。

因此，已有材料支持“该次正常路径发生了原生崩溃”，不支持把 signal 6 等同 OOM，更不能定位到 JS、解码、GPU 或某个业务持有者。已有摘要不能通过再次分析变出栈；本轮不重跑崩溃、不重索整批资料。后续只有在当前授权会话能直接读取既存对应退出附件时，才补这一个缺口；取不到继续标 UNKNOWN。

## 2. 跨字段历史后同目标：尚未建立多工作还是同工作变慢

现有首轮 trace 的用户反馈明确覆盖“初始分钟较顺、全景及分钟/时/日/月/年之后再调时更慢”；`extra.heapprofile` 是分配采样，没有逐输入 CPU 时间线。不能拿其分配权重解释年→时那一次等待。

已有 `45° → 264.355° → 45°` 有界源码路径结果中，实际加载 SAO 行为 `747 → 4653 → 747`、tile pool 为 `17 → 106 → 106`，CPU 中位为 `10.45 → 22.51 → 7.80 ms`。它支持“广角需要更多真实内容，窄回时该路径未累积同量计算”；不包含跨年月历史、真实图片/native 工作或手机 GC/呈现，不能用它否定用户问题。

当前 owner 回读缩小了可修范围：

- `sky-stellar-tile-loader.ts:30,79,91`：aborted pending 留到 promise 的 finally 才释放槽位，`loaded` 删除离开 wanted 的 tile；状态发布在 ready tile 身份/顺序不变时复用原数组。不能重新把此处当“每帧累加全历史目录”修复。
- `sky-stellar-supplement-scene.ts`：WeakMap 每 tile 只保存最新 geometry 的 transform；当前 aggregate 的 spans 只来自本次传入 tiles。旧 aggregate 若有外部持有者仍可能保原 transform，但当前 owner 没有强存一份时间历史。
- Query page-reader 和其余闭包已按 `SKY-REMAINING-AUDIT-20261028.md` 修复；不能为本问题再次改变 Query 的共享请求/60 秒响应复用资格。

**真正缺的比较单位只有两段**：同位置/最终精确时刻、视野与 native 尺寸、模式、数据版本和内容资格下，直接到达后的一次调小时，与保留分钟/时/日/月/年操作历史后回到该时刻的同一次调小时。历史中的缓存和在途状态必须保留，不清缓存或强制 GC。

现有 R17 v3 已能给准备/paint/accepted 次数、阶段时间、SAO tiles/rows、星提交量、typed-upload traffic 和 Page pending；用现有 identity/run/Context/generation 和真实 accepted 时刻分别界定这两段即可，不需重录原完整批次。当前资料及旧汇总的全窗口 min/max 没有提供该对应关系。

| 该两段的决定性差异 | 才能成立的后续归因 |
| --- | --- |
| 准备次数、实际选中/加载 SAO、实际图片需求或未退休任务增加 | 在增加的原 owner 追必要内容、失效/退休；仅增加请求计数不能证明浪费 CPU |
| 工作量相近，某既有供给/准备/提交/accepted 等待拉长 | 只追这个等待阶段。已有 CPU 的具名 owner 可复用，只有该阶段仍无法定位时才补其短窗口，而非全链热点普查 |

目前两种分支都没有被当前修复候选的同条件数据建立。故本轮维持这些 owner，不尝试准备合并、准入前移、延期上传、buffer 容量变体或新调度。

## 3. 稳定工作集 Play/Pause/普通退出：当前逻辑账及缺口

### 在途账

`sky-artwork-request.ts:44,49,63–92` 的取消会递增 decode generation、把 onload/onerror 置空并解除本方 image 引用；原件传输有 abort/cancel。**这些是消费者取消和 JS 退休，未取得 native decode 的取消/完成确认。** 一个已取消解码的物理完成可能不再有回调，不能把逻辑 loading 数下降当 native 已排空。当前代码并未因此提供可靠的共享预约结算；不能先新增全局名额/预算，再把这些取消当已结算。

`sky-artwork-loader.ts` 的两项本地 loading 并发也仅约束该 loader 当前逻辑请求，不是所有 loader、已失去回调的 native 工作或整个 Sky 的硬上限。已完成 decode 可以转为驻留，不能仍把它计成在途并同时重复加到 resident。

### 驻留账

| 当前 owner 与可确认逻辑行为 | 不能由源码推出的物理结论 |
| --- | --- |
| `use-sky-artwork.ts:35–64` 为单 canvas/revision/hash 建 owner；真正 ownership loss dispose 并清 nativeState/React state。Sources 的 paused 仅停工作、保合法 ready 图 | dispose/解除 JS 引用不等于 native bitmap 已被系统回收；Sources 不应与普通退出要求相同回落 |
| `sky-gpu-textures.ts:43–200` 按实际 decoded 对象存纹理；begin 保护当帧需求，finish 退休 unused，dispose 全退休。16 MiB 是压力目标，当前受保护集合可超出 | 相同 image/handle 数不证明无重复上传；GL delete 不证明驱动已释放；局部压力目标不是整 Sky 上限 |
| `sky-gpu-textures.ts:109–150` 首次完整源上传后可能另建裁切纹理，成功才删除原纹理，临时 FBO 在 finally 退休 | 完整源与裁切纹理会有真实逻辑重叠；尚无当前同条件证据证明其是失败时主要峰值或应改成新调度 |
| `sky-gpu-artwork-contributions.ts:407–417,621–677` 每帧清 receipt/used，动态 allowance 缩小时退休超额 pool，finish 退休未用 target，dispose 退休 pool/scratch/program | 稳定 pool 仍有全尺寸存储；数量稳定不排除 RGB/RGBA 重定义或多组 readback 成本 |
| `spot-sky-page.tsx:1686–1689,1755` 普通路由也按本帧 preparedRegions/targetOptical 的实际组数供动态 contribution policy；OBSERVATION 为 0 | 不能仅因未传显式 props 就认定辅助面关闭。是否实际多组、ALPHA_BITS、重定义次数/尺寸在旧失败采集中未知，故不能试 finish 合并 |
| `sky-canvas-surface.ts` 在同一尺寸持有 offscreen WebGL、2D display 和可用的 selection backing；普通退休独立 loseContext/清零各 backing。`spot-sky-page.tsx:1714–1727` 用 finally 保 surface 退休 | 一个 createContext 入口不证明手机未重建；清零/loseContext 不给物理回收时刻 |

旧 Heap 的总 self bytes 下降同时 profiler `_profileFrames` 和 inspector Network 表有增长；快照节点 ID 也不支持跨快照同对象追踪。旧正常 CPU profiling 样本的 PSS 增长及 Pause 后残留成立，但 warm footprint/swap 与观察者成本明显，不能据此给当前修复后的 JS/native/GPU 分摊或认定某 WeakMap 泄漏。

### 能改变决定的最小现有观测缺口

所需产品路径仍是当前 PLAN 的一条：**实际图片/目录集合和 native 尺寸稳定后，正常 Play → 真正 Pause → 有界排空 → 普通退出**；不故意等到崩溃。Sources 暂存返回是独立语义，不能用其 resident 持有否定普通退出。短诊断不替代完整持续 Play 验收。

现有 R17 的阶段/identity/Page pending/upload traffic 及 r25/r26 的有界 weak/owner/checkpoint 可以复用；r25 仅观测声明的 stellar/upload 样本，不能冒充 native/GPU census。真正还缺的是与这些实际生命周期点对应的以下窄事实，而不是更多优化候选：

1. **在途**：下载/解码开始、完成/失败、消费者取消、取消后仍无底层完成确认的数量；上传的 JS 提交/返回与 GPU 完成分开，未测到后者仍是 UNKNOWN。未知不推算成已回收；无需记录 URL、完整 frame/report 或强持 native 对象。
2. **驻留**：唯一 decoded image 的尺寸/持有者/退休；真实纹理上传与裁切的数量/尺寸、逻辑 resident；实际 contribution 组、pool/scratch/backing 尺寸及存储重定义。共享图片/纹理只计一次，encoded file 和 upload traffic 分列。
3. **物理趋势**：相同当前进程口径在稳定工作集、Pause 排空和普通退出前后的分类/趋势，与逻辑两账对照；无栈时仍保崩溃根因 UNKNOWN。

决定边界保持原 PLAN：退休后逻辑未退或持续新开先追持有/操作；逻辑稳定但占用过大追真实副本/完整上传/辅助面/backing；只有旧新可推迟工作确实重叠才考虑并发次序。若逻辑账退休而物理残留，记录该边界，不能用猜想命名 native leak，也不能凭单次 PSS 回落关闭 OOM。

这三项是当前证据的明确缺口，本轮未新建 profiling 框架、共享预约、scheduler 或 native method proxy；未把所有可能字段都提升为新验收门禁。由 Root 在同一个有效当前候选/会话按首次有差异的责任取最小标量，取得能选定以上分支的数据后即停止扩大观测。

## 本轮源码读回身份

以下 SHA-256 仅绑定本轮 read-only 源码，不声明手机整包、平台编译字节或 target 行为已通过。

| `apps/wechat-miniapp/src/features/sky/` 下文件 | SHA-256 |
| --- | --- |
| `sky-stellar-tile-loader.ts` | `b4baed20a9e30c0f6a615ee40dff7fb43780bce80744126ea6e0fc95a54ee1bf` |
| `sky-stellar-supplement-scene.ts` | `30ee5d7d8091147c741d15d507c5b3871c8ac846f998711a8b0de1f26746067b` |
| `sky-artwork-request.ts` | `926b89053918ec8cd4eb68d9b76695c6f8dca48a9fa797cd7faba6dacc1fea9c` |
| `sky-artwork-loader.ts` | `fc87b73190f87555b61668b4241a18e1b427fc32340a916cae182c52a3de9723` |
| `use-sky-artwork.ts` | `6da39898ee08e1864b01cb260fb9b7502f3ebe18718f7765073f4f9ce0632845` |
| `sky-gpu-textures.ts` | `3beceb05f72b15a39929166e203b003382e0c9e04e317803ca522173eb68529e` |
| `sky-gpu-artwork-contributions.ts` | `c8b9c61ea179e1a79c969d39ac5217752a1cb6b797efcdcd5565594dfa8089cf` |
| `sky-gpu-renderer.ts` | `242f468541b48e324ab52d3cd190eaa716f1550c10cc6a97fc32c465c9d94854` |
| `sky-canvas-surface.ts` | `32a37fb4cf3c73f055edc04ac4ab1467617d9fe6f092d6c0083675309bc60c4f` |

本轮没有生产改动，不重复已有效的软件检查；也没有新增目标端结果。D2 的分钟真实连续性、两段同目标归因、正常持续 Play/Pause/普通退出、Sources 与内存/OOM 仍为未验/未完。

## Root 当前只读退出历史与诊断准备核对

Root沿已授权、唯一TLS无线目标和原`AdbDevice`身份重核完成有界shell读取，没有手机输入、截图、录制、Play或候选绑定。原`r17-sky-exit-summary.mjs`取得当前最近三条Appbrand退出分类，均reason2/status9；它们没有当前Sky/候选身份，不能用来解释产品或改称OOM。随后只为原已知`2026-10-26 09:19:42.688`记录作一次精确查找：当前16条包级历史中8条Appbrand、匹配0。未取到该次trace/abort信息，未保存原始dumpsys、进程身份或描述。结果在`E:/Dev/Starward-data/development/phone-current-20261028/known-exit-readback.json`，最近三条分类仍归原`native-play-copy-trial/current-existing-exit-20261028.json`。这是当前可读取历史的边界，不证明历史从未发生、当前无OOM或手机产品已就绪；不扩大到无关日志或再次跑崩溃。

fresh只读准备核对确认：原builder已实际选择R17 v3 runtime，旧`R17-PROBE-V3`中的“尚待接入”是历史状态，不据此重做集成或重建gen34。`skyPublicImageOwner().inspect()`已含running/ioBytes/pending/encoded bytes/leased/retired，取消的真实I/O仍占槽至完成；原normal surface receipt已含构建/ready/退休尝试与三类backing尺寸/逐步结果。二者分别是文件I/O和逻辑native操作，不代decoded/GPU物理驻留。r25/r26的stellar/upload弱样本及Pause停止新增跟踪保持原语义。该初始只读核对没有新增探针/构建；后续最窄decode与真实生命周期接线已完成，实际合同、独审、完整编译和离线封口统一归[D2-DECODE-PREPARATION](D2-DECODE-PREPARATION-20261028.md)。取消后失去通知仍仅记累计未确认，不推算当前native在途；没有强留owner的全局读取闭包、调度/预约或native代理。目标LAN/手机/物理趋势及完整D2仍未完成。

## 2026-10-29：主用 Memory 普通退出后的实际持有路径

Root 使用当前热点LAN、普通候选349166eb及同一手机，在非空夜空（45°、8404真实亮星、过去时刻21:00:00）正常Play；读到已绘时刻跨过原active-30检查点后通过真实Pause控件暂停，最终已绘21:00:34.739保持。Android Back关时间面板，#sky-return普通退Map；两次裸天空外点未关面板保UNKNOWN，未因事件派发成功判代码bug或删除身份门槛。主用独立真机调试Memory记录17:33:14–17:40:03 UTC（包含额外idle及退出准备，非等长性能基准），无同时Performance、清缓存或手工GC。

原始导出归私有`phone-hotspot-20261029/memory/normal-play-pause-exit.heaptimeline`，93,791,146B，SHA`04a05d4c73f62ca33f00a408683a2d6cb81394b3a2c8db3b08cd3f20c90e1116`。完整解析1,280,301 nodes/4,603,309 edges/self112,313,993B；samples仅1、trace0，因此不宣称完整分配时间线，只用于普通退出后Heap引用图。原r17-sky-memory取得12次分类，私有pid/name/activity/startTicks逐项相同；PSS KiB：Map前880403、Sky ready1005194、active/Pause峰1247012、普通退出Map后1413853→1330504→1170304。受debug/profiler、Java/native/Unknown及Map恢复影响，不把这些值分摊为JS、GPU或泄漏字节。

现有离线owner及fresh只读核对找到两条实际路径，详细限定与脚本归该私有根`exit-retainer-analysis.md`、`exit-retainer-boundaries-final.json`：

- 零observer的observation-context Query.options.queryFn绑定Context session；session getter的Context.previous通向Page refs。剔除所有weak与WeakMap条件边后，6个实际scene键仍沿普通强路径可达。
- 零observer的stellar-catalog Query合法保留publication；作为catalogs WeakMap真实强活key，其RenderCatalog.motionAt的局部Context.previous又保留Page refs。冻结目录backing仍8404条，不把direct indexed edge为0误判空数组。
- 原prepared与sealed的sky/detail/index.js逐项一致；实际Terser把createSkyContextSession和attachSkyCatalog搬入Page useMemo作用域，解释上述Page连带持有。原Query精确reader修复仍保有效，不重开发；本次新增缺陷归长寿命工厂的最终编译作用域。

只修这两个现有owner的逃逸方法/闭包边界，保持Query、目录缓存、Sources资格、全量星表及科学输出；不改gcTime、WeakMap制度或全局压缩策略。当前修复实施中，需实际完整压缩产物及修复候选普通退出后的对应持有回归。一次Heap不证明无限增长，完整持续Play、其它驻留/瞬态峰值、原生释放及OOM仍未完成。

采集后原guard拒绝额外截图，定位为IDE唯一新增`pages/my/index.wxss` 25B注释；原337文件全部SHA不变。该注释文件已原样保存在私有`ide-generated`，sealed树恢复且guard随后capture成功；没有改候选JS/模板/已有样式、重绑、重推或重录。原始捕获链及恢复回执均保留。


### 4aad851c 修复候选与普通退出 Heap

Context session改为模块级prototype，catalog motionAt绑定仅持rows的模块级prototype reader；未缩短缓存期限、清空publication或改变压缩全局策略。源码压缩回收反例旧0/2、修后2/2，原行为38项及miniapp类型检查通过。完整68.609s构建封存为341文件/5,208,218B/SHA4aad851c0e27ad360eccc6742d54662d634ca2db19531e56e19e02e7c96ca376；实际sky/detail/index.js AST确认两个方法定义都在Page tf之外。完整AST、helper 414及精确输入回执归私有phone-scope-fix-20261029/scope-review.json。

原官方auto_preview因321.576s完成晚于宿主300s超时，已从当前s6上传和正式handler终态恢复success，未重发。一次auto remote原回执超时但独立窗口实际Wi-Fi连通，fresh Android runtime及ADB画面确认；不因超时重修网络。仅IDE新增25B空注释WXSS已精确保留到私有ide-generated并恢复原341文件哈希；一次remote误在前置守卫失败后送出，已保留该错误，不用该失败给证据绑定，恢复守卫后才绑定当前run/session。

新候选使用同一8404星、45度、21:00初始场景。按前轮实际场景前进至少30秒条件，8次公开场景时刻读回后正常Pause，稳定21:00:32.670；Android Back关时间预览并恢复21:00，#sky-return正常退回Map。随后主用Memory只取普通Heap，无同时Performance/分配录制或手动GC。原始normal-play-pause-exit-scope-fix.heapsnapshot为89,874,568B/SHA3be9b8b40a18860f00bb6ee18aa2d56c431fd7bc981d9de9af52ed87f5c00a94，1,209,593节点/4,415,185边/self111,719,537B，schema完整。5个分离系统观测同一物理进程；新旧Profiler方式、空闲时长及进程历史不同，不能用总Heap/PSS差作修复效果大小。两条旧链及新条件WeakMap路径分析进行中，未判OOM或所有资源退休完成。


新Heap核验结论：两条旧方法捕获路径已消失，实际Context/两catalog Query均0 observers，完整8404 rows继续存在。不能只剔除弱边后宣布退休：对6524条条件边/1068组key-value-table做资格固定点、4轮收敛，5个scene key仍被活平台port→coordinators WeakMap→configure词法父级→controller options.presented→Page持有。真实编译内联发生于orientation controller内部，不是当前已证native stop状态清理失败；正常dispose无法切断词法previous。沿原compass-lifecycle将共享coordinator改为模块级prototype，新旧反例2/3→3/3及原25项行为通过、typecheck0；保持native串行启停/失败保留所有权重试。新完整普通候选74d2cfc已封存，下一次目标证据尚待，不将此源码修复冒Page全部退休或OOM解决。原始图、固定点与修复回执归私有phone-scope-fix-20261029/memory。

### 74d2cfc 目标 VM 三条持有链回归

完整候选341文件/5,209,469B、SHA74d2cfc494a7e5835983010847f3cfccebe72b2b1f4fdedc8a70c6d826f12d70，实际产物8个coordinator方法均在模块初始化prototype内，controller/lifecycle只构造实例。官方auto_preview单次成功，bigPackageSizeSupport=false；官方main2,082,316B、total5,258,821B，main距2 MiB上限14,836B。该结果只证明此次官方预览预算，不关闭正式发布/部署义务。新remote返回超时后实际Wi-Fi连接，未重放；Android14/SDK3.17.5、实际Map及独立ADB确认后绑定TW3E6Z/aui3b3。私有根为phone-compass-scope-fix-20261029，完整构建、官方原始回执、作用域和身份保护均在该根。

同一8404星/45度/21:00场景正常Play，实际accepted时间前进30秒后Pause在21:00:31.777；Android Back恢复21:00，#sky-return普通退出后fresh路由与ADB画面均确认Map。随后一次普通Heap，无并发Performance/分配录制或手动GC：74,362,749B/SHA c75d2c306f6a0d84f46baa4456f49d87c31ab492e7da6fa08b447d08ec3b2c58，915,221节点/3,743,868边/self105,598,053B，samples0/trace0。五个系统观察均为同一物理进程；退出后PSS KiB为1,633,231→1,524,719→1,435,695，不以其差值分摊业务或物理释放。

Root完整读回fresh代理的compass-exit-retainer-analysis.md/assessment.json：3976条条件边、969组key/value/table，0解析或ID失败，按key与table实际资格3轮固定点后，前轮5个scene/currentFrames和controller options不再存在。唯一相似对象的四项值全为Hole且由code.transition_info持有，已排除为代码模板。合法coordinator的desired/installed/installedMotion均null，两项running标志false；八方法共用20B类Context，previous直接接模块。tail仅prototype/shape边，不编造其fulfilled状态。Context/catalog原两条修复未回归，三个Query均0 observers；完整8404 rows及8404 render entries和合法publication/WeakMap缓存保留。此证据支持三条已定位Page连带持有链已切断，没有在这些准确责任形状中发现替代入口；持续Play、其它Page闭包、native/GPU、Sources和OOM仍未完成，不继续无依据扩相邻缓存改造。代理已停止。

随后开始同目标调时对照：新一次Sky进入后，以45度/8404星/手动视角从21:00通过正常增加小时按钮到22:00，主用Performance已停止并保存direct-hour-performance.json（1,169,865B/SHA2d0ac555035a2eade28676a5cd786dde9c06352e928deb454a027694d25210f6，837事件，含52 ProfileChunk和12 Screenshot）。这不是完整对照结论，历史段与实际CPU/输入关联尚待。此后guard发现IDE唯一新增25B pages/my/index.wxss注释，原341文件逐项不变；新增原件已移入本次ide-generated，恢复原哈希并通过guard，未重绑/重推。额外data-*属性未返回有效值，不冒已取得精确view/版本读回。

历史段已于19:52Z保存：同次Sky进入、没有清缓存/GC/重连，先由公共canvas触控将45度放到264.4度，分钟/小时/日/月/年各一次前后往返。月份上调两次官方工具超时，三次aria及实际手机仍为09月；确认未变后由新guarded截图授权的ADB触控恢复10月，再完成年往返。每步已呈现场景时刻与8404星均保存；历史日期目标资料不可用仍如实显示，返回基准时刻恢复3个目标。Back关面板、公共pinch按实际384×796.800048828125尺寸恢复45度，再正常小时上调到同一22:00。after-history-hour-performance.json为1,249,503B/SHAdc2d152dce9f721b7d3c4b0f8ebc98c005d53b77c1a095ba46a8efe59e0f3f0a，715事件，含25 ProfileChunk和14 Screenshot；录制已停止。历史与工具失败原始记录归同根time-history/history-observations.json。

Root已完整读回fresh只读分析time-history/analysis.md及assessment的结论、控制条件和计量边界。两段合格非idle采样828.169→783.341ms，GC218.829→207.342ms；与实际FunctionCall历时及面板一致。初始和最终截帧分别逐字节相同，确有paint/目录投影与Taro模板链执行。局部paint与setData模板历时略增，但没有整体工作增长；setData19→20、导出data对象总量16,780→17,406B，wx.request3→0。保持现实现，不据本组重开准备合并、延期上传或新缓存/调度，也不立即重录同一有限历史。

两面板全窗口分别26.234s和11.255s，准备等待不同，不把总时长当点击延迟、FPS或改善百分比。含onClick/preview的任务开始至最终同字节截帧为586.664/601.434ms，末两帧间隔37.392/35.890ms；任务起点非实际触点，不能把14.770ms差异判作系统退化。全部FrameworkTask时间为null，直接段ClientTask时间为负、历史段缺该通道；不将它们归零。此次普通包没有R17流，精确input/run/Context、SAO与图片集合及源映射仍UNKNOWN；官方appservice列号不能直接套到prepared文件，未补造source map。有限同目标对照未复现整体历史退化，不关闭分钟连续性、长按反向、持续Play、native/GPU或OOM。代理已完成并停止。

### 74d2 正常播放、暂停与普通退出的进程分类

复用原r17-sky-memory与私有clock/process receipt，在同一普通候选、当前Wi-Fi debug会话中观察一次正常产品Play。先核MoonBay/21:00/45度/8404星/手动；实际aria依次前进到21:00:00.826、21:01:13.368、21:02:09.113，随后点真实Pause，稳定21:02:26.388且目标资料恢复。暂停后重复读回和实际手机图一致，Android Back取消预览、#sky-return普通退出，fresh路由及独立ADB确认Map。没有自动诊断Pause、缓存清除、手动GC或同时Profiler录制；调试器此前的三份Performance/Heap历史保留，所以不能与无调试历史的旧进程作效果量比较。

四个原watch共12点，私有PID/name/activity/startTicks逐项相同、12点均verified；原件与只读归并在phone-compass-scope-fix-20261029/normal-play-process。单位KiB：Map前1,747,808；Sky ready1,835,148；播放/暂停watch为1,821,072→2,001,892→1,849,252→1,854,168→1,862,040→1,867,236→1,908,242；普通退出后1,993,774→1,825,922→1,792,142。最后退出点覆盖该watch的53.790–61.144秒，串行dumpsys字段不是同一设备瞬时读数；不把本次有界观察长度当产品性能预算。

播放中Native Heap峰404,809后回到约281,000，六个active样本GL/EGL分别16,680/101,608；后段Unknown缓慢增加。退出后Unknown753,757→646,113→614,513、Native Heap321,625→295,325→294,953，存在实际分类回落。该证据支持一次146.388秒场景进展、真正Pause及普通退出流程，并排除本观察窗内“所有分类只升不降”的描述；不能把Unknown等同V8或GPU，也不能将首尾差归成泄漏或据回落证明native全部释放。当前普通包无完整SAO/图像/texture/contribution/backing账，瞬态重叠、必要工作集、其它保持者和历史OOM根因仍未定位；不重新录f40已经有效的11图decode结果或相同短窗口。

### 当前纹理/辅助面逻辑账：任务副本准备

Root与fresh只读核查确认普通74d2没有可公开读取的texture/contribution资源统计。旧VBO上传字段不能代图片上传；surface退休的finally成功也不能代renderer dispose成功。源码存在默认framebuffer无alpha时的RGB backdrop→RGBA signal同handle重定义，但当前目标是否使用及成本尚未知，不能直接优化或重开延期上传/准备合并。具体边界报告保存在私有normal-play-process/resident-accounting-boundary.md，核查代理已结束。

沿原PLAN D2和原builder增加一次任务副本接线：`--d2-gpu-resources`使用独立task generation36/slot `d2-gpu-resources-20261029`，原f40/35和gen34不变。texture/contribution只在原操作处计尝试、返回/失败、请求像素及逻辑驻留/峰，renderer单独记录dispose结果；native方法/GL查询次数、产品算法、时间与发布顺序不变。普通surface writer显式升为新精确键的v2，最多保存ready/play-start/active-30/paused/before-retire/after-retire六槽标量，32768B上限；无全局owner/getter、图像/frame/handle或逐帧序列化。只在真实draw完成及退休边界取数；draw完成仍不冒accepted/物理呈现。原R25 v2、90秒/32文件/单飞与实际Play协调复用，surface退休回执独立于该封口。

作者8项与Root独立复核8项通过；Root生命周期4项、原协调8项和隔离profile4项通过（合计24个不同检查）。覆盖实际fixture稳定缓存、完整源/裁切转移、RGB/RGBA分支、删除异常与原抛错/退出顺序；观测UTC毫秒初次误用计数上限的失败已修，目标时间不会被置null。生产及完整任务副本类型均0诊断。完整构建并封口341文件/5,239,137B/SHA`59742fd1c5c138000f6a759b5561ea6f0891697cd54a919b49d48311ac97bb54`，sourceHash`2d33048ac05a808bfa9ba98e8616ea3d8b0026941bc1a72716a95540cb344532`；30份map在包外，普通检查/预算通过，main源1,992,867B不等于官方预览尺寸。当前生产源码与74d2构建输入一致，ordinary/74d2/f40原字节逐项保持。

随后原Map owner发现并修复已知begin被选点退休后、迟到user end重新认领相机的条件性缺口，详[UI证据](WEAPP-UI-OBSERVATION-20261028.md#2026-10-29-选点后迟到原生手势的窄修)。同一GPU profile/task36从当前完整源码重新构建为`5140b813e1a4aee37cd1f36c8eb1c7887034e7c7991b81d620bfba181f117116`，341文件/5,239,262B，buildSourceHash为`5b32a7b94545ae13b4e66456f7c83688233027962aa68621b85317efccdebe03`。30份map/7,772,299B在包外，生产/副本0诊断及双副本/源绑定读回通过。相应精确Storage键为`starward.r17.normal-surface-retirement.v2.5b32a7b94545ae13b4e66456f7c83688233027962aa68621b85317efccdebe03`；不读取旧准备hash的键来判断本候选。GPU计数及生命周期实现未改，原24项仍按原范围复用；新的Map49项只支持其责任层窄修。

私有`phone-gpu-resources-20261029`持有当前operation、同一wAZ3Du run的generation2及`current-source-sealed-readback.json`；原59742 trial/maps/回执与generation1均保留，ordinary/74d2/f40逐项原hash不变。新包未调用官方投递或绑定；8798 collector未启动，专用规则提权返回用户取消、零规则写入；旧74d2的debug也已断开，不能复用当前模拟器读数冒手机。新接线尚无目标数据或优化效果，计数/逻辑峰不等于GPU完成、物理内存或OOM根因。取得足以区分重复操作、稳定工作集和未退休的同一窗口后停止扩探针，按实际结果决定原owner是否需修复。

### 2026-10-29 用户操作资源寿命场景

上节未投递/8798未启用是准备时状态。本轮用户反馈看不到诊断入口，Root明确普通e17b不含该入口，并完成专项5140的实际投递。12组生产输入与generation核验一致，官方main2,065,264B、total5,259,663B；用户允许UAC后原8798规则按8787同一精确手机/接口/程序范围建好，主机与Android health均200/true。普通Map/非空Sky及菜单里的“诊断：GPU资源逻辑账”实际可见，绑定wAZ3Du generation2/session IzhMDu。s8关闭、同包s9打开后真机实际连接，官方Map runtime为Android并能读取精确v2 key。Sky阶段evaluate超时，但实际元素交互/诊断状态及独立手机像素仍可用，不冒产品空白或资源为零。

用户准备好后，Root只做后台读取，用户完成准备观察、正常Play/Pause/退Map并明确回执“已回地图”。10份R25 v2包均通过原validator，同generation36/sourceHash5b32a7及同一run；最大compact包5043B、落盘合计86589B，32文件/32KiB单包、10 checkpoint/8 event等原预算未变。实际相对事件：Play0、Pause35,739ms、scope-ended62,963ms、retired62,973ms、end90,009ms；两段drain-10均已保存。11个image claim与11个logical images/4,128,768pixels在retired归零，至end保持零；create/src/load始终各11，无受控路径新增解码或未完成callback。退休记账在finally执行，因此只证明显式claim逻辑退休，不能证明底层retire返回或物理释放。未跟踪的旧六类weak/stellar owner零值不用于评价其资源；owners.released=false由end先记录、release随后执行的源码顺序解释，不判成泄漏。当前证据不支持额外修改生产图片owner。

7点watch加一个晚Map点共8点PID/name/activity/startTicks完全一致，原字段仅在私有sidecar。前7点host窗口约02:04:32–02:06:22 UTC，R25 baseline到达约02:05:56 UTC；未标定设备发送/网络延迟，不能将到达时刻当精确设备时钟，也未建立Pause/即时退出的合格采样对应。前7点PSS范围1,128,162–1,580,066KiB，晚Map点1,285,587KiB、比第七点少282,555KiB；晚点与退出有长间隔且调试已结束，不能用其差值推释放量、水位或泄漏。Unknown不是V8或GPU，summary/detail不相加。

原调试窗10:07:39北京时间结束后，Root排除了devtools空Storage与早期ready-only/playCount0。经同一项目的失效实例恢复及官方调试IP修正，03:12 UTC在Android Map读回原精确v2 key：retire-complete、同source/gen36、同一surface、六槽完整、拒绝事件及priorWriteFailures均0，实际compact10,579B。内部UTC时刻play-start02:05:55.038、paused02:06:30.762、before/after-retire02:06:57.960/.962、surface完成.965，与原操作和R25边界时序一致；不是恢复时新建的ready-only记录。两协议无共同runId、无host/device时钟标定，不冒精确跨协议对齐。gpu.playCount=1是首轮饱和标记；normalRun=null是旧normal controls字段未接本D2 lifecycle，不否定真实Play。

六槽显示：Play、active-30、paused、before-retire的residentTextureCount均11、residentRgbaBytes/逻辑峰均16,515,072B（15.75MiB），累计source upload attempts/returned始终11、failed0、pixels4,128,768；crop计数0，逻辑完整标记true。after-retire的texture数与逻辑RGBA均0、deleteFailures0；renderer disposeAttempts=1/Returned=1/Threw=0，因此比finally记账更强，证明原清理函数正常返回，但不证明GPU异步完成或物理字节释放。contributions所有槽enabled=false/maxGroups0、faulted=false、无allocation/copy/storage redefine，是该样本未分配的既有策略，不是失败，也不覆盖启用后的分支。surface selection及四个宽高写入returned，实际1080×2241→1×1、selectionLayerPresent=false；contextExtension/contextLoss unavailable、contextPresent=true/contextLost=false，不能称画布已销毁或native全释放。

本轮没有重复纹理上传、该图片资源owner累积、renderer清理抛错或已记录surface退休流程未完成的证据，不新增生产修复或重开原否决优化。实际修复是工具连接边界：同包失效debug实例与重开后错误IDE调试IP；未改VPN/TUN/ICS、生产绘制、算法或PLAN。采集流程发现固定7点watch在真正Play前过早开始，已在原operator-checklist明确不把“准备好了”当实际Play起点；若以后经授权补阶段PSS，沿真实检查点协调原watcher，不重录同样7点。私有analysis/gpu-cycle-summary.json及gpu-receipt-review.md持最终分析，原user-cycle-assessment.*按其最初输入范围保留，18份旧输入及新原件均核hash。Root完整读回两份fresh复核，代理均已关闭。原341文件保持，后发25B pages/my/index.wxss已单独保留，来源UNKNOWN；5140原hash及独立手机guard通过。

用户最后明确要求本场景分析、必要修复/验证后暂停；本轮有限问题分析已收口并按要求停在此处。完整持续Play、native/GPU物理释放、OOM及整体Goal仍未完成，不据本场景继续下一场景。停止与当前必要服务/窗口只归HANDOFF。

### 2026-10-29 恢复后的最小时间身份链准备

上述暂停已兑现；用户明确恢复完整Goal并优先D1/D2。GPU5140的10包、8个PSS点和六槽继续复用，不重播或重索。本次只为分钟单步、真实按住/反向和释放后精确收敛适配原R17有界观察owner，新增task分支`--d2-time-observation`，gen37，独立slot。它记录实际`previewSkyTime`输入、原state发布、弱身份准备、实际渲染请求、resource clone与原`surface.present`和`attempt.publish`都正常返回后的accepted；几何保实际request token/serial、validation、phase/scope/window和admit。不能证明的几何输入归属为null，不推定为最近一次输入。

Root审查发现并修复两处仅仪表误关联：迟到prepare曾取全局最新input，改为原state的有界WeakMap身份；真实同步input发布、同target/generation的内部tick或release才能继承，no-op不改旧state。几何旧请求/A→B→A也不借最新input补身份。修前最小反例失败、修后通过，fresh独审用独立内存反例复核。未改变生产时间、算法、prepare次数、渲染或发布顺序，也未恢复过时`clone_identity`生产结构。无Page sampling/GPU/内存探针或自动Play/Pause；45秒诊断截止、32768B、手动arm/export、单飞和原字节重试沿原owner。该接线不提供完整SAO/图像工作量或物理内存结论。

完整候选`451cc53494223e4a361baec4171065f000dac1cf414c8eb4c2d011a16a3eb485`，341文件/5,248,217B，main1,993,380B；source binding `fbeb65b9b304366c885301eea74dbef46922e19b1233601275c0b06c9e69fb86`，1682输入，manifest `9e7a794dd9039c0a6826c649176bfb3fea54896f56b460bd45f599d0752f0a64`。生产与副本TypeScript均0诊断，完整构建、预算、当前源码/产物inspect通过，30份source maps/7,772,743B留包外。独立8799观察服务转发当前8787，目录`E:/Dev/Starward-data/development/d1-d2-targeted-20261029`；旧collector与原件不变。此段写入时未投递或执行手机场景，不能据构建关闭分钟连续性、长按、完整Play、Sources或OOM。

### 当前候选分钟单步的真实accepted链

随后完整task用官方auto-preview成功推送；旧D1 marker消失、非空Sky及独有“诊断：时间输入与呈现”实际确认，绑定`d2/starward-device-feedback-y5cRlH/generation-000001-Xropqo/project`及session `starward-device-test-i2x9hL`。源码确认时间面板关闭会cancel预览，因此通过正常“应用所选时刻”把隔离测试正式点的Context准备为2025-10-28 21:00；Root明确允许这一可恢复测试准备，不涉及计划/提醒/N05或新地点。测试中的minute/hour目标只预览、不应用。

首个真实分钟输入21:00→21:01的视频/最终预览已保存。后续2秒小时`record-swipe`在原10秒录制的`recording_ended_before_input`守卫拒绝，确实没有派发，不计成长按失败或长按验证；未放宽守卫。45秒截止后才关闭时间面板并手动保存，取消回退独立于采样窗口。回执`baseline-r17-1-p1ulgergc6.json`18,845B经Root独立协议验证，gen37/source匹配、Date.now时钟无invalid/backward；1input/44事件，无drop/overflow/省略，原scope/timeGeneration/canvasGeneration/bounds/backwards违规均0。1个unlinked位于22ms、为原先准备的21:00帧，未把它倒绑为本输入。

同scope5/timeGeneration8/canvas1的5个实际准备及成功present+publish结果，从21:00:23.153、21:00:39.966、21:00:53.570、21:00:59.317单调推进至精确21:01:00。首个精确结果相对记录起点211ms、距合法input返回209ms；中间时刻不是像素插值或控件值冒天空。无新geometry请求，属于已有合格几何内单步。20个frameRequested与16个copy+publishReturned不能相减推算浪费CPU，后续同一精确目标的重复已绘也不单独判泄漏。分钟包仅证明实际呈现调用/发布链，不冒物理屏幕首像素、完整SAO/图像工作量或OOM。

Root随后实看原PTS抽帧和最终手机图：星点、星座位置及已绘时刻确有渐进，21:00→21:00:39→21:01，不只有字段变化。原`recording-1793267724869.mp4` SHA `9a8fe4c2ec410755bf424adf4166a29d0fd0a4c631ed8f08698bdd566f9023d7`，5.844556秒/35个实际帧；首帧PTS0，之后从5.251722开始密集，不能用均匀抽帧补造连续帧率。目标字段首次变化PTS5.311711、可见天空变化5.324556、首次最终预览5.492489；录像/采样时钟未标定，不相减冒输入到像素延迟。原件及`contact-sheet-original-pts.png`归私有`d2/phone-observation/minute-video-analysis`。

私有`d2/analysis/minute-identity-chain.json`保存逐token/时刻核对；12项当前时间仪表检查再次全通过、完整虚拟TypeScript0诊断，旧过时`clone_identity`锚点未回退。此有限结果没有支持重开准备合并、延期上传或另加调度；下一包仅补尚未派发的跨窗口按住/反向，用原普通swipe避免已证录制前置时限，不重复分钟场景。

### 跨窗反向长按的真实失败、根因与普通候选回归

第二包`baseline-r17-2-ms2b0pidgn.json`由Root按原协议验证：gen37/source相同，落盘79,731B为格式化JSON，不是请求超过32KiB；20输入在约1,927ms内、总332事件，按原规则保留256条并明确丢弃76条中段。3个真实geometry请求均validated/admitted，窗口相对50,400,000/57,600,000/64,800,000ms；scope/time/canvas/bounds/backwards违规均0。最终目标2025-10-29 17:00，原成功呈现/发布到相同时刻。合法内部bind换代后的部分输入关联为空，3条unlinked未强配最近input。

反向操作在原45秒封口窗外，不假称第二包已覆盖。实际手机目标2025-10-28 17:00、已绘11:00，持续数分钟“更新中/时间尺定位中”；Root实看旧候选失败图。这里的“时间尺定位中”来自ruler定位guard，不证明geometry HTTP失败。API/8799依赖仍可用，没有Sky请求遥测不能推断未发请求。随后唯一新分钟触摸使目标与已绘均为17:01，后续无输入图稳定；未用重试/应用/关闭解围，未将截图间隔当恢复耗时。失败与新触摸回执、23张hash一致原件归私有`d2/phone-observation`。

原页面/Query/时间/native-copy夹具稳定复现：`SkyTimeControls`在一次触摸内保留touch-start的`onPreview`。跨窗口得到新模型后，该旧页面闭包仍拿旧`timeModel`重新bind观察时间覆盖；页面effect因模型身份未再改变而不纠正，松手后已有当前供给却仍waiting。修复只在原页面维护最新`timeModelRef`，每次合法preview从该ref取模型；原Context/权限/edit generation/日期范围守卫先执行，旧触摸不因此获得新授权。不改geometry算法、状态文案、调度、内容或GPU策略。

回归夹具修前稳定失败，修后覆盖正向新窗13:00→13:01、反向11:00→10:59及旧权限拒绝。四文件43项通过；Root沿全部真实preview函数提取夹具补入同一当前模型ref，另三文件50项通过，合计93个不同相关检查。第一次从错误cwd启动的alias失败及缺ref夹具失败均只属于harness，断言未降级；生产typecheck通过，随后fixture修改后的typecheck再次0。

完整普通修复候选`e43c99ef3519e1830c116ac52617fb70d807e3f1f25a486930eec19aa129a1a4`，341文件/5,210,008B、main1,993,362B，完整构建/检查/预算/physical guard通过。当前1,677源绑定归私有`d2-reverse-fix/current-source-and-candidate.json`；与gen37相比仅一项生产页面修复及四项测试修改，构建后测试变动明确保留，canonical aed9原字节保持。官方auto-preview terminal success后绑定feedback `starward-device-feedback-zKHUna`、generation `000001-tyo1A6`、session `starward-device-test-yePpQy`。无task仪表/自动Play/Profiler，不把official success冒手机字节证明。

第一组2秒正向到10/29 18:00、2秒反向回10/28 21:00，字段/预览/非空天空一致；但反向恰回committed，不足排除特例。仅补一组针对该缺口：2秒正向从10/28 21:00到10/29 17:00，1.6秒反向到**10/29 00:00**，与committed相差3小时。10:50:05.549Z及69.239秒后10:51:14.788Z两张无中间输入图均为00:00预览，无更新中或时间尺定位中；Root独看正向、反向、无输入终态三张图，真实天空由白昼转为非空且不同构图的夜空。未补分钟、重试或应用；公共Context仍10/28 21:00。此证据关闭本次旧模型长按缺陷的普通手机目标回归，不关闭全部D2、六字段完整资格、Sources、持续Play/native或OOM。

新session准备阶段曾仅为新候选创建一次只读bootstrap捕获；完整图与receipt归档/hash核对后由原owner停止该临时session，没有发送输入或动旧session。绑定后的12份截图及receipt索引、操作UTC与局限归私有`d2-reverse-fix/phone-observation/OBSERVATION.md`。所有观察都是development_feedback；没有原生accepted逐帧身份或即时延迟测量。独立官方天气预警失败卡仍存在，未掩盖为无预警，也不误列为时间修复回归。手机代理已完成并释放控制权。

### e43 普通候选：真实SAO、Sources返回与播放退出

Root正常关闭未应用的00:00时间预览，用户双指放大到显示10.0°。11:07:55.259Z实际星图明显增加暗星；Root从Canvas真实点选得到SAO20467/20469/20464候选，再选择20467（8.40mag、HD218843、A0），不是搜索结果冒已绘内容。11:09:57.244Z打开该对象来源，页面标题与编号一致、提供方SAO/ADC/USNO/NASA HEASARC、历史视觉星等和非完整10等限制真实保留；未知发布/取得时刻未捏造。11:10:41.956Z普通Back恢复同一对象、北0.8°/高度43.8°、10.0°和相同背景构图。随后时间面板11:14:18.077Z确认公共2025-10-28 21:00:00，测试预览未应用。此处只证明至少一个真实已绘可拾取SAO消费者和该次Sources返回，不证明完整tiles/rows、精确相机矩阵或全部工作量。

当前普通NIGHT UI的Time关闭会cancel PLAYING/PAUSED/PREVIEW；进入Sources的实际路径先回公共时刻，不能写成“Sources保留刚才的PAUSED时刻”。Sources ready surface暂存与普通退出仍不同。旧GPU5140、74d2普通146.388秒和三条持有链证据均复用，没有重录。

为该新SAO/已选对象/Sources返回负载补阶段系统观察：原`r17-sky-memory`的5个有效样本私有pid/name/activity/startTicks逐项相同。Sources前/隐藏/返回PSS分别1,537,868/1,521,864/1,442,277KiB，Graphics分别153,604/171,824/154,408KiB；这些变化不分摊成资源释放量。正常Play派发包围11:14:36.591–11:14:43.194Z，首张实际21:00:03播放中图在11:14:47.974Z。只有确认正在Play后才启动两点有界watch。首点PSS2,625,576KiB、Unknown1,866,057KiB、native265,281KiB、Graphics135,300KiB；第二点相对watch25,314ms时已非前台。Root准备Pause的fresh capture被foreground guard拒绝，未发送Pause或借旧图控制。

精确匹配上述同一实例的退出记录为2026-10-29 19:15:39.395本地、reason2/status11，trace不存在、描述没有OOM/heap-corruption/graphics分类。仅当前pid的crash buffer为空；没有保存raw dumpsys/logcat或打印私有身份。新证据归`d2-reverse-fix/source-return/current-exit-match.json`及memory目录，原退出分类另归`native-play-copy-trial/sao-play-e43-20261029-1116.json`。这是一次真实异常退出，不能因无trace判无故障；也不能直接称系统OOM或把Unknown全部归GPU/JS。Pause、普通退出及D1重新显示因该失败尚未执行。

### 选中层全屏backing反复分配的责任层窄修

独立只读复核实际e43压缩产物：SAO resolver仍在模块层，未重现BSC旧Page内联捕获；正常clone不读取惰性points，Sources保同一loader。没有足够证据改SAO transform缓存、准备合并或延期上传。当前新场景还包含Sources返回和选中对象，不能单因10°把异常归于SAO。

Root与fresh独审在另一明确边界确认：SkySelectedObject消费已绘A；新请求B首次paint的严格report/at guard会拒绝A位置，reticle暂为null。B接受后子组件发布B位置并请求同一writer重绘，下一时刻C未取代B时reticle恢复。原selectionLayer.paint(null)把整屏backing尺寸清零，下个合法marker重新分配；coalescing不消除此跨accepted交接。这是条件性真实重分配，不是每tick必然，也尚未证明它造成上述退出。

原surface反例60次位置间隙产生122次正尺寸写入（61次backing建立）；修后只2次。Page在发布时一次读取当前selection，核本frame所属点，并把selectionActive沿原surface传给原selection-layer。仍有选中对象但坐标暂缺时只清旧三段，保持最多一个既有backing；首次暂缺不分配。真正取消、Sources隐藏、失效及退出继续释放，复制失败不移动marker。代价是已分配的单个透明backing可在选中对象暂离视口时保留至该选择结束；不缓存历史帧、不减内容或近似时刻。

55项surface/实际Page提取/lifecycle检查通过，包含迟到选择、缺坐标、失败复制及释放。新增测试的assert.deepEqual空数组导致TypeScript错误窄化为never，已改为等价length断言，最终typecheck0；12项当前任务仪表检查通过，虚拟完整TypeScript重验0诊断。四个原task adapter仅同步present签名，未重建冻结代/旧候选。生产改动尚未完整构建或投递，不据软件检查宣称native/OOM已修。

用户随后提出直接真机Profiler录制。Root保留失败e43完整原字节及未构建修复，继续使用主用真机调试路线；下节为实际采集结果，当前进度只归HANDOFF。

### 原 e43 Sky 代码的真机 LAN Performance

首次官方remote返回timeout，但独立真机窗及手机实际页面已启动；随后手机明确显示调试地址误选Mihomo虚拟IP、回退WAN，结构化读回失败。用户指出应在真机调试构建处切IP，Root结束该失效会话，在官方面板选当前WLAN 192.168.31.26并重新自动调试。同一开发工具进程实际8001 TCP连接到当前手机，官方currentPage为Map、systemInfo为Android14/SDK3.17.5/384×797，独立guarded手机图也非空。保持VPN/TUN，未启动或重放旧collector。WAN期间没有有效录制，不能把绿灯或超时当LAN/产品证据。

IP切换前原prepared/e43完整hash仍匹配；自动编译后IDE仅增加`pages/my/index.wxss`，25B、内容只有同路径注释，原341文件逐hash均未变。实际当前prepared指纹为`38df47d8a71b1ba1d0b5e1033ac77bfbd5afc51455afc810446def153db225fc`，342文件/5,210,033B；未删除新增文件或放宽守卫。旧session的bundle_changed拒绝有效，另以原device-session owner在私有profiler目录创建`starward-device-test-PVjUOg`绑定当前实际字节；原e43输出及旧证据保留。此记录可用于原Sky代码分析，不冒原e43手机逐字节证明或正式验收。

同地点/公共2025-10-28 21:00，官方Canvas触摸事件将45°调至10.0°；实际暗星和Canvas拾取SAO10666已见。初次位置暂不可用后实际reticle恢复，没有据一次异步读回认定持久位置故障。为固定对象，随后经正常搜索选择原SAO20467，打开其Sources并返回，实际文本为北0.8°/高度43.8°，独立手机图已见选中reticle、10°与21:00。该次搜索用于准备已验证过的同对象负载，不替代此前真实Canvas拾取证据，也不冒物理双指验收。

只开启Performance及其Screenshots/Memory选项，没有同时启用Memory面板的分配追踪。Record点击12:29:56.658Z；实际Profiling状态确认后，guarded Play派发包围12:30:28.083–35.936Z。12:30:54.919Z手机显示21:00:17播放；Pause派发12:31:18.064–26.273Z，12:31:57.789Z手机为21:00:50预览、播放按钮恢复，未应用公共Context。Stop点击12:31:50.470Z。因主机/模型往返，实际Play为约50秒，超过原计划十几秒；不伪记15秒，也不再按同一串行截图流程控制下一次有限播放。此轮无异常退出，但不能反证普通候选先前故障或关闭OOM。墙时未与trace时钟标定，不能精确相减归阶段耗时。

原件`d2-reverse-fix/profiler/e43-lan-sao20467-play-20261029-1230.json`为66,869,697B，SHA256 `9e47b8983b22d4931726f585b81234bc74e4a20727d2e6e309f664befd276768`，已由官方Save profile导出；截图与操作回执仍归phone-observation的28–50号及各自guarded session。Root完整解析34,586事件、1,586个filmstrip原图；直接提取未重编码的0/60.013/109.355秒原图，实际分别为21:00、21:00:21播放、21:00:50暂停。trace没有UpdateCounters或C类计数，不能报告JS/GPU零增长。

fresh CPU代理只读分析并由Root核原件/报告：实际50,989个samples、无无效节点；scene paint子树32.87%，独立setData/WXML子树24.97%，两者样本不重合。selection paint→clear→native width/height真实出现但仅100个inclusive样本/0.196%，支持该资源责任修复，不解释主要CPU或证明OOM。运行时`appservice.app.js:7723:422539 u`的3008个self样本，通过同一旧产物相邻校验/fallback函数、三个局部偏移和Sky调用祖先多锚点对应`clockTimeInTimezone`，主要经时间尺rows.map；没有冒用旧source map或声称精确TS行映射。

271个FunctionCall与ProfileChunk时间戳一一对应，dur恰为该chunk去首间隔的timeDeltas总和，故面板约52.976秒Scripting与总53.154561秒只是采样包络，不能报271个独立长任务或精确设备CPU。统计报告与脚本在私有`profiler/analysis-cpu/CPU-ANALYSIS.md`；Root的原件核对及filmstrip索引在同profiler目录。没有新Heap/分配样本、native/PSS阶段数据，普通退出原因仍未知。

页面只读审查发现Taro4.2.1对FormElement.value强制发布；同值style已有深比较，不归因给style对象。Root独立执行保存的`analysis-cpu/analyze-input-publication.mjs`得到1602次setData，6时间Input各1602次：年/月/日/时/分各1601次同值，秒51次变化/1551次重复；搜索Input1599次/1598次重复。总11211条Input.value中11154重复，139次提交仅含Input（APITask累计1062.757ms），131次整个payload没有新值（1000.974ms）；没有输入节点祖先替换干扰。该duration不能直接视作可全部节省CPU；另外1460次accepted场景身份/已绘视图更新仍有实际含义，不能节流或删除。

### LAN Performance 导出的窄修

时间尺只在`rows/timezone`改变时计算当前窗口的刻度文字，复用到刻度可见文本与无障碍标签。当前accepted秒、选择、距离变换、事件资格、拖动及新窗口准入照常处理；没有全局Intl缓存、时区fallback改变或历史窗口积累。原真实组件夹具在一帧更新中调用格式化62次，回归修前失败；修后只格式化当前时刻1次，跨时区、新日期窗口、当前秒与标签断言保持，37个相关ruler检查通过。此为责任层计算证据，不冒真机帧率或原生提交收益。

Input修复已由fresh独立实现代理完成，Root读回实际adapter、两个消费者、原Taro源码并独立重跑4个真实renderer检查。`sky-controlled-input`只memo原生叶子，外层更新最新事件ref；实际Input/Blur/Confirm后用局部revision保受控回写，active/editingGeneration变化也重新同步，不重挂载。原时间控件保exact at、旧blur与长按owner，未memo整个面板或降低accepted更新频率。12次无关frame更新的六字段发布为0；00.750→01.875只发布秒值一次，Apply保.875；拒绝输入、最新回调、搜索恢复/Confirm及节点身份通过，普通Input正对照仍重复发布。38个相关检查通过，Miniapp typecheck0；route-date首次错误cwd造成alias失败，正确workspace重跑通过，未改生产行为绕过。最终软件证据37项ruler、38项Input/消费者，原selection55项/任务12项复用；完整普通候选构建中，真机效果及退出/OOM保持未验。

完整普通候选已构建/投递为`f0a8e6421b5350462737ff02c237335c4a97419fa7ccc0ad10da7d8612363e2f`，341文件/5,211,670B，main1,993,362B、sky1,390,912B，预算/physical guard/compiled API与Sky origin/inspect通过。1679源绑定在构建前后相同，SHA`10f103dbe81bbd8a58ee604cb2dd50acdcbcc0341e916085ee6729cc7d981823`；canonical aed9原字节不动。来源与准备工具归私有`d1-d2-targeted-20261029/d2-render-fix/current-source-and-candidate.json`及其父目录`prepare-render-candidate.mjs`。未重建冻结代，没有把source map缺失补作精确行映射。

旧e43真机调试正常结束，原件/旧prepared/IDE附加25B保留；新候选官方auto-preview terminal success后，Root用新bootstrap实看Map及同地点面板，再按原反馈owner绑定`starward-device-feedback-boh3m6`、generation`000001-vK00jt/project`、session`starward-device-test-DFc9jc`。原guard未放宽。新普通手机已完成地形关开/来源及进入Sky；正常Canvas拾取HR375和关闭面板仍有效。关闭天体面板后原菜单恢复，不将一张菜单隐藏态认作布局故障。当前已请求用户将重启后的45°视野放到10°，该手动操作未回执前不进入所需暗星Play比较。持续普通Play、Pause排空、退出/物理资源、先前异常原因仍未验证。

后续只读手机图23仍显示同一未播放星图/HR375；初始视野不显示缩放标签是原`verticalFovDeg !== SKY_VERTICAL_FOV_DEG`呈现条件，不另改UI。当前01–23的23份操作回执、13张截图已逐项读回SHA，与guard报告全部一致，私有`d2-render-fix/phone-observation/originals-01-23-receipt.json`持绑定；没有新的f0 Play或PSS，旧候选的用户手势回执不代替本次新包。

fresh只读投影审查由Root对照现有源码结论：当前精确时刻的vector/角度/prepared direction/transmission已按需复用，BSC/SAO只在投影通过后构造惰性点数据，SAO transmission已有连续span复用；draw preparation已同帧同view复用，collect/replay仍负责失败及revision隔离。本轮没有可据此安全删除的重复完整阶段，不追加实验或缓存。该审查未改文件、构建或设备；完成后已按可用工具停止代理。当前Context结构验证及git diff --check通过，PLAN SHA仍为`9e14c42d2478da071394bfdbd3f0d5269c562bbcd046e9816c0031d299b325ca`。

### f0 普通10°暗星与用户20秒暂停

上述待放大状态已由用户本次“就绪”取代。24号独立手机图实际10.0°且暗星非空；Canvas点选SAO20377，8.80等。26/27号图的位置仍不可用，正常“重试位置”后29号恢复北359.7°/高度44.0°和reticle。32号真实来源页明确SAO/ADC/USNO、NASA HEASARC、J2000及历史视星等/自行精度；返回同10°星图和对象有效。没有将旧候选的SAO20467冒成同一对象，也没有将重试成功倒写成首次成功。

当前代码的SAO点位依赖独立lazy位置HTTP；已绘tile没有直接供给该位置消费者。服务端重新生成SkyReport，客户端按当前页面原report的Context、dataRevision、catalog与at严格验收。dataRevision包含天气来源/星表/timeModel，因此存在版本失配路径；原首次请求的HTTP/错误码未取得，不能确认本次是失配、网络失败或服务端不可用。“重试位置”同时刷新report、SAO与位置，不能单独定位原因。保原guard，不据猜测放宽契约。

成功Play派发只发生一次，host包围14:31:36.481–44.789Z。用户按约定在手机20秒后暂停并回执“已暂停”；42/43号图均为21:00:20预览、六字段更新、播放三角恢复且天空/reticle非空。关闭时间面板取消未应用预览，46正常退出Sky；47/48 Map选点、面板、地形恢复，短暂独立天气错误随后消退。公共Context未被应用成测试预览。record在Play之后因单次capture授权已消费被守卫拒绝，**没有本次活动录像**，不重播补造。截图只能证明各实际终态，不提供活动帧率/输入延迟。

原r17只读PSS owner取得6个有确切工具调用来源的文件、18点；对应process与anchor私有sidecar的PID/name/activity/startTicks全一致，completedRowsSha均匹配。13点watch实际全部早于成功Play，末点结束仍早约32.976秒；不能称Play窗口或据此求活动峰。以下为同进程detail分类，单位KiB；Unknown不等于V8/GPU，summary/detail不相加。

| 阶段 | TOTAL PSS | Unknown | Graphics | Native Heap |
| --- | ---: | ---: | ---: | ---: |
| 首次SAO位置不可用、未Play | 777820 | 281693 | 94028 | 97343 |
| 最后一个真实Play前watch点 | 779227 | 269769 | 113876 | 110979 |
| 用户已暂停后的首次点 | 1945525 | 1351109 | 113908 | 137339 |
| 晚暂停 | 1496770 | 965577 | 113908 | 135475 |
| 正常退Map | 1492753 | 921905 | 108120 | 142503 |
| 晚Map | 1570534 | 948677 | 108076 | 156027 |

暂停后点host窗口相对Play派发起点约+61–66秒，晚暂停+172–178秒，退Map+293–297秒，晚Map+638–643秒；未校准设备/host时钟，不能据此算精确Pause/退出释放速度。结果支持明显增长和部分回落，但分配归属、活动峰、稳态/泄漏、物理资源释放及旧e43异常退出仍未知，20秒无退出不关闭OOM。一个无可核工具调用来源的同名前缀user-paused文件已保留并排除，未混入18点。

私有`d2-render-fix/phone-observation/sao-cycle-memory-assessment.json`持逐点时间窗口/绑定，`originals-24-49-receipt.json`持26份JSON及17张逐hash相符的截图；24–48为ordinary，49是随后真机连接，二者分开。原件仍在其guarded session，不能先stop删除。系统mapping读取按同进程/前台/startTicks保护尝试后返回read_failed，未取得smaps，不能由该失败断言权限状态或Unknown归属。

### f0 LAN Memory 补充的当前绑定

保持同一源码/完整普通包，卡欢迎页的IDE项目在1679源码/341产物无漂移核验后官方重开一次恢复Map；未重建Taro。当前官方构建面板再次从虚拟IP改为当前WLAN192.168.31.26，remote超时后以实际8001 LAN TCP、Android14 runtime及独立手机图确认连接，不重复调用remote。新真机窗187566080，项目窗33687646。Memory面板只读Map基线约62.5MB；进入宽视野Sky后约96.9MB，尚无活动Play/Heap/分配采样。该调试条件不与普通PSS直接相减。

IDE只增加25B `pages/my/index.wxss`，原341文件均相同，无删除/改动；actual prepared变为342文件/5211695B/SHA `ef850c0ab688958b548e1fa6d189f8f4a820523a2f3a3f71dea45d4bf659fe26`。原ordinary guard正确拒绝漂移，随后用原device-session owner在私有memory-profiler目录创建`starward-device-test-Kb65QC`绑定实际产物，保原f0及DFc9jc证据，不放宽守卫。当前操作与基线归私有`d2-render-fix/memory-profiler/operation.json`等，后续只为上述Unknown归属缺口使用此连接；GPU5140原10包/六槽不重复。
## 2026-10-30：f0 LAN 暗星位置与暂停堆

本段f0采集时真机连接按用户要求持续保留，用户接管手机输入、Profiler录制与保存，Root分析、修复和准备。随后用户明确授权保存必要数据后关闭旧窗口、打开新包，当前61cbf2d7连接见本节末；不沿旧窗口限制阻止此次已授权替换。不是新的整轮验收。普通f0的20秒场景继续复用，下面另属`ef850c0a`调试候选；原341文件不变，IDE额外25B文件已按此前记录绑定。

### 位置差异和窄修

用户已把本次调试星图放大到约10°。实际选中SAO20453后，13号手机原件显示位置不可用；随后14号在未手动重试的情况下显示北0.7°/高度45.4°。这两个截图的时间间隔不能当作精确恢复延迟。实际真机Network中该位置请求200/FRESH，position和stellarMotion均存在；与它之前的Sky响应比较，Context id/revision/fingerprint和algorithmVersion一致，但dataRevision分别为`dcee4cab15474a77086851b2`和`c8d7fdfbc62b68ac8fcca583`。位置锚点04:00Z与选中时刻13:00Z不同属于原注册设计，不能误报成时刻错误。客户端现有严格绑定会拒绝该revision差异；未取得原错误码日志，也不把普通SAO20377的初次失败倒归同一原因。

已在原SAO frame与`sky-presentation-position`中接通已加载对象的精确位置：从同一已准入tile transform读取单个引用，核完整Context、精确geometry对象/时刻及SAO版本/hash；已绘reticle使用accepted frame，面板/定位/跟踪使用对应当前帧。访问器仅保本帧最后一条查找，不展开完整points、不另建全局目录。未加载对象仍复用原有严格绑定的remote motion，不放宽revision、权限、时刻或科学精度。

使用实际完整BSC/已准入SAO夹具的新回归在修前返回null而失败；修后17项相关检查通过，包含远端fallback、错revision/Context/hash、旧geometry、选片撤回和复制frame拒绝、全BSC/SAO逐点精度及下半球。小程序typecheck通过。该修复已和下述压缩作用域修复进入新普通候选61cbf2d7，并已建立LAN真机调试；手机修后行为尚待。本修复不认证整段播放性能或OOM。

### 内存归属与边界

本次Play实际从21:00:00到21:00:57，属于Root工具往返造成的57秒观测，不把它标成预期20秒。20号启动、21号确认播放、22号暂停、23号确认21:00:57。未Apply或退出Sky。23个JSON及14张截图已逐个核hash，归私有`memory-profiler/originals-01-23-receipt.json`。

四个PSS点的私有进程旁车核得相同PID/name/startTicks，采样前后实例及前台均验证，wall/monotonic anchor有效。单位KiB：

| 阶段 | Total PSS | Unknown | Graphics | Native Heap |
| --- | ---: | ---: | ---: | ---: |
| Play前 | 989018 | 293549 | 117324 | 161005 |
| 实际Play中 | 1385887 | 692545 | 117408 | 150105 |
| Pause后静置 | 1432767 | 721917 | 117304 | 151401 |
| 取Heap后、保存期间 | 1027760 | 285705 | 113080 | 224269 |

真机Memory选中VM的读数为播放前125MB、活动339MB、暂停423MB、静置424MB；同一UI的90/91MB是Network流量文字，不是另一堆值。之后只取一次Heap Snapshot，用户完成保存；原件93,646,333B，SHA`1c86355eb8bfdec4abca6356492cac6cd0a3e4faaaa7663ca1575fe2d505261b`，解析结构完整，self-size总计108,897,941B，UI显示109MB。

既有离线分析器定位约9,985,848B的大保留链为调试adapter的`Network/_resourcesData/_entries`；嵌套报告项是同一所有权，不能相加。另见约2.1MB mask与其alpha；六个8404长度数组对应BSC frame访问链，不能据此宣称六份独立星库。形状识别为9 supplementFrames、94 tileTransforms、101 stellarTransforms、16 skyReports；单张暂停图无法证明这些对象持续增长。string/code及系统根字符串尚不能全部归为产品目录或脚本。

取堆可能触发/扰动GC，取堆后下降不能冒普通自然排空，更不是强制GC修复依据；VM堆、PSS Unknown、native/GPU也不能相加或互相替代。用户已按一次最小时间线清单完成并保存`f0-lan-sao-play10-alloc.heaptimeline`，118,569,747B/SHA`d092a26b3924febf66a5199cd1ce543bef6a7b0ff5b84df7097fc5d475a6b0a4`。完整解析1,872,930 nodes/5,504,249 edges；实际trace_function_count=0、trace_tree空、samples仅1个，因此文件有效但只提供终态堆，不能按扩展名冒分配时间线或零分配。没有要求用户重录，也没有重新选择Profiler工具。

第二份self-size为118,252,349B，比第一份多9,354,408B；形状为14 supplementFrames/170 tileTransforms/182 stellarTransforms/29 skyReports。两份最大几何时刻差13.448秒，**不是录制时长**；第二份仍有3个上一暂停时刻的frame。调试Network大保留链只从约9.99增至10.08MB。比较只证明这两张终态图中的对象差异，不推断长期线性增长或完整进程归因。

### 压缩后回调作用域的实际差异与修复

第二份堆明确保留`spot-sky-target-instant Query.options.enabled → factory Context → previous Hook Context → reader.readCurrent → 1256B页面Context → stellarSupplement`；该reader属于上一暂停帧，不能仅用可退休的`latest.current`解释。实际f0 `sky/sub-vendors.js`的webpack模块9776把`targetQueryCallbacks`内联为Hook内部IIFE，重新建立了源级隔离本想切掉的父作用域。原source-level退休检查没有覆盖这种压缩结果；这是新实际证据，不是重做已有Query生命周期方案。

在原退休夹具加入与产物相同机制的模块包装、ES5降低和已安装Terser压缩。修前未压缩hide/unmount均通过，但两个压缩场景稳定失败，旧pageOwner仍存活。窄修仅在模块顶层`Object.freeze`一次原factory，使压缩器保留该作用域；原60秒响应复用、当前reader更新、取消、Context/权限/代次守卫及共享Sources请求均不改。修后4个退休检查和9个相关真实Query/页面行为检查全部通过；最终typecheck通过。局部测试的GC仅用于WeakRef判别，没有在手机触发GC或把GC加入产品。

完整普通候选`61cbf2d710858452792f2e25d488b56f08717ab8b0105f89e4017686a937cdc3`，341文件/5,212,397B，main1,993,362B、sky1,391,639B。1679源的构建前后SHA均为`652c4e1a8521fe19572b0ffe6c3665560b12c9543fe9f5721db0c3f95f391028`；预算、physical guard、API/Sky origin、产物inspect通过，actual module9776已确认factory在Hook外。原canonical aed9及历史f0项目原件不变。构建后依下段明确授权完成新包连接，不把连接成功冒修后验收。

新候选入口为私有`d1-d2-targeted-20261029/d2-sao-query-fix/source-project`，内weapp与构建产物hash一致。用户最新要求“都关了重开呗”“把需要的数据存起来呗”，最后确认“算了，已经关掉了，那开新的吧”；Root重新核两份堆原件SHA及13个相关文件，并保存旧Allocation timelines UI文本。旧窗口关闭后工具仍提示需结束其它真机调试，已官方完整退出，再只开新项目。当前自动调试选中WLAN192.168.31.26；一次remote返回timeout，但实际手机TCP、真机窗179376014/Wi-Fi/正常服务/非零消息建立，后续官方systemInfo和currentPage成功读回Android14及Map，未重试remote。连接后完整341文件/SHA61cbf2d7仍匹配。私有`d2-sao-query-fix/connection-operation.json`、`new-debug-connected-ui.txt`与`phone-observation/starward-device-test-e9xKP6`保存绑定及限制，手机逐字节/runtime AppID未独立认证。

本段原首次SAO核对及取堆动作现已执行，实际失败与后续候选见下一节。其它旧帧路径、短命分配归属、物理GPU/native释放和完整OOM仍未闭合，不以本次两个窄修或打包成功标D2完成。

私有根：`E:/Dev/Starward-data/development/d1-d2-targeted-20261029/d2-render-fix/memory-profiler`。`sao-position-response-binding.json`、`heap-original-receipt.json`、`debug-memory-assessment.json`及两个`heap-*.json`分析文件保存输入身份与边界；原普通场景仍由邻接`phone-observation/sao-cycle-memory-assessment.json`独立负责。未重采GPU5140、未新启服务或重放collector。



## 2026-10-30：61 首次定位失败、暂停取堆崩溃与6b候选

用户在61cbf2d7的10°星图首次选择SAO20481，回执“提示位置不可用”；Root独立手机截图同样显示失败。真机Network所见位置请求200，响应前缀含position/motion、正确SAO身份；UIA仅取得前1000字符，不认证完整响应或客户端错误码。源码回归通过真实presentSkyTime EXACT路径复现：合法geometry没有冻结，位置消费者误用了绘制缓存复用资格。修复将位置准入与绘制缓存复用分开；已准入index/tile的原frame可提供单星位置，仍核完整Context、geometry对象/时刻、目录版本/hash；复制frame及未准入输入仍拒绝，绘制缓存继续要求不可变geometry。修前EXACT回归失败，修后18项相关检查和typecheck通过。

完整普通6b5e29b6候选包含61修复及本次EXACT修复：341文件/5,212,418B，SHA `6b5e29b6561b58451b6cedc2f530c4b295fae822ed3b3276c7a938bf18b442d5`；1679源码构建前后SHA `930b0534757dc2357cbb28e64bb444bd3f6c9a9153eaab41ef1655474ca2fd39`，普通构建、预算、physical guard、origin及inspect通过。初次inspect误传绝对路径，按原owner改用repo-relative路径后通过；失败回执保留，不归因产品。私有`d2-sao-query-fix/exact-row-fix/build-validation.json`及source-project保存完整绑定。用户随后已导入并连接，首次位置与轻量采样结果见下一节；项目目录止于source-project，内部weapp由miniprogramRoot选择。

新包准备期间，用户在仍运行的61上按最小Play/Pause清单取Heap，截图停在78%、VM828MB/↑3.4MB/s，随后手机闪退、WebSocket断连。用户明确确认“已暂停，秒数已停”；未独立精确计量实际Play和静置时长。目标目录没有完整新Heap，不能据此验证61的reader退休。原截图已保存核SHA `1d27d8861b47752dfb321ab0256e9201531e78161d85dcff12c24d446b433177`。

只读最近Appbrand退出记录为reason5/status6/nativeCrash，exit PSS823296KiB、RSS1153434KiB；有界对应进程日志包含signal6及固定fatal短语`Scudo ERROR: internal map failure (NO MEMORY) requesting 8KB`、`Out of memory`。未事前绑定该新会话的PID/startTicks，故只成立最近退出与采集时序关联。不是OS low-memory kill记录；整机RAM耗尽、V8 heap limit、地址空间/映射限制、产品驻留与快照额外开销的比例仍未知。Android Scudo[分配源码](https://android.googlesource.com/platform/external/scudo/+/2f1f9d26a4ae52bcfca24fd10f7f442de1fd90d7/standalone/linux.cpp)及[报错源码](https://android.googlesource.com/platform/external/scudo/+/2f1f9d26a4ae52bcfca24fd10f7f442de1fd90d7/standalone/report_linux.cpp)支持该短语为mmap ENOMEM路径，但不是设备上精确库版本认证。不把本次采集失败等同普通播放OOM，也不将问题归给工具便关单。

用户将当前目标明确为“时间模块播放功能，播放暂停之后内存没有回落/释放到播放之前”。继续原D2的播放/暂停排空责任，不新增整套极端场景或修改PLAN。先对照已有堆及实际暂停调度代码；后续目标证据使用同视野/已加载星表，不取完整Heap、不强制GC，观察Play、Pause后的实际分配与进程变化，必要当前帧/缓存与过期工作分别核算。

已有两份f0堆的帧身份有界比较：第二份14个frame中6个与首份为同对象，几何时刻距第二份最新约70.7秒；这6个在首份距最新约57.3秒。3个距最新13.448秒的帧经Query回调链（已有修复），另5个为最新及距最新0.116–0.491秒的近端帧。时刻差不是采集时长。固定早期组未在两图间增加，不凭弱表的最短图路径认定不受限泄漏；脚本文本截断，旧符号不能无依据映射当前产物。暂停时16ms定时器由effect清理，tick还核mode/generation；源码规则仍需新包实际观测支持。私有`remaining-frame-cohorts.json`保存无敏感值的比较，未重新取堆。

失败原件及分类归`E:/Dev/Starward-data/development/d1-d2-targeted-20261029/d2-sao-query-fix/memory-profiler/operation.json`、`c61-exit-log-classification.json`和`c61-fatal-diagnostic-phrases.json`；旧两份完整Heap及原普通Play均保留。Root未重连61、未重放collector或GPU场景。


## 2026-10-30：6b 轻量分配采样与帧缓存作用域修复

6b5e29b6已由用户连接，Root核341文件hash、官方currentPage及独立手机Map。用户在约10°星图首次选SAO后确认“位置正常”；Root前图为SAO20409/21:00:00，后图为21:00:20预览、播放三角恢复。位置正常是用户核对，星名截图不冒独立位置面板证据。用户完成Allocation sampling、20秒播放/暂停并保存；准确Profiler起止墙时未独立记录，没有新Heap、手机强制GC或GPU重播。

原件 `exact-row-fix/memory-profiler/sixb-play20-pause-allocation.heapprofile`：1,321,359B，SHA `0fbebf64ee82aedf64faa2f54fc9a2a76d9cdd5ef594ae583dcaae436e2130dd`；596节点、26,726样本，引用全部有效。self权重合计474,278,680B；函数th合计305,166,424B（64.34%），分别来自BSC/SAO投影。Root从实际Sources `/usr/sky/chunk_0.appservice.js:63:47624` 读正文，确认是projectStellarMotionDirection的射线构造。这是统计归属，不能当完整保留图、总分配或净驻留；[协议文档](https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler/#method-startSampling)说明已回收对象可由选项纳入，本导出未记录这些选项，不补造设置。

复用r17的准备1点、13点watch及晚暂停1点，全部相同PID/name/activity/startTicks、前后实例与原件SHA验证成立。PSS单位KiB：准备925039；watch起925205、最低917061、观测峰2949317、末1873777。Unknown峰2278265、末1180949；Graphics峰113024、末112808；Native Heap峰148009、末171193。watch末点开始在已暂停截图之后59.2114秒；晚点1767923（Unknown906401、Graphics112808、Native Heap187489）在图后1826.677秒。支持本调试条件下增长及部分回落，Unknown不等于JS/GPU，离散最大点不冒绝对峰，不由此宣称普通预览的释放或OOM结论。

实际SAO调用点 `:63:463720` 显示useMemo内部包含整个frame工厂IIFE及全局tile WeakMap读取；同一6b Taro输出仍是独立函数。二次编译改变了闭包词法位置，这不是手机强引用图读回。沿现完整owner回归加入BSC/SAO frame，用ES5、已安装Taro Terser和受控几何端口检查缓存持有：修前两项都保留丢弃的render payload而失败，原context/catalog/compass通过。窄修将两种frame工厂保持为模块级Object.freeze函数值，防止展开回render；不改缓存时效、星数、精度、时钟、取消或API。修后5项回收检查通过，另14项完整BSC/SAO输出、位置、transform和Query退休检查通过，小程序typecheck通过。GC仅用于隔离Node判断，不进入手机或产品。

新普通候选 `1de19f3ed376f8225fcd86f52451ba239e37c9408a01a984f7cad4efb5baac69`：341文件/5,212,454B，main1,993,362B、sky1,391,696B；1679源构建前后SHA `960d5f1de9be8da7c11c451e00f363cc2b31ce2e7dbced9bdd64af7769cbf52b`。完整编译、预算、physical guard、origin、inspect与prepared副本hash通过；AST确认两工厂在Object.freeze内，仅认证Taro输出。原6b/canonical字节不变；新frame-owner-fix/source-project已官方登记，等待用户重载准备，不由Root提前关闭现连接。

私有根 `E:/Dev/Starward-data/development/d1-d2-targeted-20261029/d2-sao-query-fix`。6b原件、PSS关联和源码片段归exact-row-fix/memory-profiler的allocation-original-receipt.json、play-pause-pss-assessment.json、allocation-owner-analysis.json与runtime-source；修复包绑定归frame-owner-fix的build-validation.json、compiled-frame-factory-boundaries.json及operation.json。新的微信二次编译、自然排空、完整普通Play、native/GPU物理退休和OOM均未验，D2及完整Goal不完成。

## 2026-10-30：1de 帧作用域修复的真机采样与自然回落

用户重开同一frame-owner-fix项目后，Root核prepared仍为1de19f3e/341文件/5,212,454B、官方currentPage为Sky；真实手机03/04图为10°、SAO20409、21:00:00→21:00:20暂停，连接正常。用户自行完成Allocation sampling并保存。没有新Heap、强制GC、源码重建或GPU专项重播；开发反馈身份不认证手机逐字节或runtime AppID。

原件 `frame-owner-fix/memory-profiler/owner-play20-pause-allocation.heapprofile` 为112,791B，SHA `2165abef130dee2001c807c6112b7c5eff21df3d412d27e32874561b7430f5fb`；577节点、370样本，节点引用全部有效。停止后再次核hash相同，官方Memory表显示相同函数及权重。

| 同场景采样指标 | 修前6b | 修后1de |
| --- | ---: | ---: |
| 节点self权重合计（B） | 474,278,680 | 6,584,880 |
| 已定位射线构造th的self权重（B） | 305,166,424 | 2,331,648 |
| PSS准备点（KiB） | 925,039 | 982,035 |
| 首段watch观测最大PSS（KiB） | 2,949,317 | 1,432,985 |

self采样权重下降98.61%、热点权重下降99.24%，支持帧作用域修复显著减少该场景的遗留负担；不是全部分配量、全部保留堆或进程内存下降比例。导出没有采样选项/精确Profiler墙钟起止；两版为不同调试会话，离散PSS最大值不冒绝对峰。静态/隔离回归、真实采样改善和手机完整保留图分别陈述，未补造修后的强引用图或二次编译源码。

首段PSS：982,035准备，13点watch末1,390,797；晚暂停1,291,946，采样开始在已暂停04图之后124.380秒。后续等待第二段操作期间，05/06手机图仍为21:00:20暂停；同进程PSS最低992,136，在04图后607.407秒，比原准备点高10,101KiB，最后又波动至1,161,139。完整曲线保留，不把最低点当长期稳定下界。首段暂停后可自然回到接近基线已取得目标证据，不能笼统继续记为“完全不释放”。

用户随后完成第二段21:00:20→21:01:20并暂停，07图由Root实看；没有启动Profiler。此前名为owner-second-play-pause的13点watch已在该段实际播放前结束，它只提供等待/静置证据，不能当活动峰。用户回执后新7点pause-drain完整结束：PSS 1,394,500→1,090,743KiB，末点开始于07图后72.199秒；Unknown 578,837→358,113、Graphics 132,084不变。全部相关记录的原件hash、前后PID/name/activity/startTicks在私有读回中匹配；原始身份不进入本记录。此补充支持再次播放后仍有自然回落，不证明活动期峰值或长期无累积。

官方Memory主页首次暂停可见110MB；第二段后聚焦窗口的实际截图为164MB并显示下降。后台UIA曾重复旧396MB及旧流量，明确排除其“当前值”意义；读取时间不是手机GC时刻。未点击Collect garbage/Start或结束调试，已保存Profile保持。进程PSS、所选VM计数、采样权重不能相加或互换。

完整分析归私有 `frame-owner-fix/memory-profiler/play-pause-assessment.json`；等待/第二段时序更正归 `second-play-observation-status.json`，可见VM图与滞后边界归 `second-settled-visible-vm-counter.*`。03–07手机原件沿同一IHqIBm session保存。此后无需重录这两段，保有效真机连接；持续普通Play的容量、第二段未覆盖的活动峰、native/GPU物理归属及历史OOM仍按原D2保持未验，完整Goal不完成。

<a id="six-field-memory-return"></a>
## 2026-10-30：六字段往返的分配、回落与剩余差额

同一1de19f3e/341文件候选、LAN API和Sky页面已核对，未重建或重连。用户完成Allocation sampling并保存，明确点按顺序没有完全按清单执行；实际顺序、次数及逐次输入时刻未知，不能把要求的“分→时→日→月→年→秒，各下一次再上一次”写成已观测事实。08、09、10手机图由Root实看，前后均为10°、SAO20409、2025-10-28 21:01:20暂停预览，后两图没有“正在更新天空”；这不单独证明全部请求或原生资源已退休。本轮无需因顺序差异重录。

原件 `frame-owner-fix/memory-profiler/owner-six-fields-return-allocation.heapprofile` 为230,551B，SHA `b0e44e1009c58965f534e8d307276cf523bfe874c922d4861a91d0eae7b70fd9`；933节点/1,650样本、全部节点引用有效，停止后再次核hash相同。self权重合计36,657,212B、samples权重合计36,420,348B；两个统计量不混用，均不冒整进程保留量/完整分配量。主要self包括th 11,822,400B（调用链为BSC及SAO的forEachProjected）、join 4,539,464B（主要位于WAServiceMainContext）、WARemoteDebug.addResource 3,845,136B、sub-vendors success 3,723,804B及n$ 2,954,712B。当前官方Memory表与原件一致；这些路径说明本轮包含真实星体工作及调试通路，不能据此把所有残余归给其中任一方。未取得本次完整retaining graph，也不与20秒Play直接作等工作量比例比较。

| 同一前台进程观察 | PSS（KiB） | Unknown（KiB） | Dalvik heap（KiB） | Graphics（KiB） |
| --- | ---: | ---: | ---: | ---: |
| 点按前准备点 | 1,142,713 | 327,477 | 178,525 | 132,084 |
| 13点watch观测最大值 | 1,475,464 | 628,741 | 207,809 | 132,860 |
| 已返回目标09图之后的首点 | 1,219,556 | 387,537 | 204,769 | 132,228 |
| watch末点 | 1,218,352 | 387,537 | 204,137 | 132,228 |
| 后续静置单点 | 1,313,440 | 394,893 | 270,589 | 132,228 |
| 正常退出的准备点（新操作清单发出前） | 1,203,272 | 315,045 | 239,009 | 132,228 |

watch从操作清单前开始，前两点不能笼统标为活动期；13点仅是离散观测，不冒绝对峰值。09图之后4点均已在已知最终页面之后，末点比准备点高75,639KiB（约73.9MiB）；后续单点比准备点高170,727KiB（约166.7MiB），没有继续单调下降。基线也只是单点，watch最初两点1,182,130/1,113,042已显示波动。所有原件SHA/终态及PID/name/activity/startTicks在私有分析中一致；时间是host/ADB观察区间，不假定逐次输入或手机GC时刻。

准备正常退出时另存一个同进程点，PSS又降为1,203,272KiB；Unknown 315,045已低于点按前327,477，Dalvik仍高于点按前。它补充自然回落与类别变化，不能只保较高或较低的点来宣称稳定。该点是在后续退出清单之前取得，归私有 `field-followup-exit-operation.json`；随后实际正常退Map的结果见[退出观察](#six-field-normal-exit)。

Root聚焦当前真机窗口后，Memory主页实际图显示所选VM为126MB、下降318kB/s；已保存为 `fields-settled-visible-vm-counter.*`。此前164MB属上一段暂停观察，不是紧邻本轮点按前的VM基线。当前低VM计数不能与整进程PSS相减来推算某个原生分配器，也不能证明没有旧对象保留。Root只打开Profiles查看，未开始新Profiler、取Heap、强制GC或关闭连接。

源码复核中，几何Query gcTime仍为0，目标时刻Query保原60秒响应复用；帧/SAO变换仍在原owner替换当前几何，已采用的模块工厂边界保留。HTTP响应缓存另有24项/6MiB编码JSON上限，这不是实际JS/native内存预算，不能单靠它解释上述差额。没有从本次统计采样单独建立必须新增的生产修复；也没有把“有自然下降”升级为整个内存问题已解决。

本轮结论：已有整体回落，但相同场景的稳定进程占用尚未建立，逐次点按收尾前后的差额也未被这份录制单独覆盖。按用户进一步澄清的要求，剩余增量继续保持未归因；后续已补[正常退出](#six-field-normal-exit)、[普通Play](#ordinary-play-natural-return)及[一次跨年往返](#ordinary-cross-year-settled)，不重录六字段或旧GPU包。完整分析、热路径及观察时序归私有 `field-memory-assessment.json`，执行终态归 `field-memory-operation.json`。全部本轮采集均已终态；这些后续记录补具体缺口，不升级本份无逐次时序的采样资格，完整D2/物理释放/OOM及Goal保持未完成。

后续沿该采样的公共JSON回调核到实际SAO/地景reader：单文件最大192KiB，原生读取在真实callback finally中释放文件lease；取消立即拒绝reader，但不把尚未结束的原生读冒已结束。SAO loader随wanted ids移除不再需要的解析tile，dispose清空loaded/published；6MiB是当前视野编码descriptor预算，不是物理堆上限。文件owner在写入后删掉transfer引用，任务完成清waiters/pending，只保文件descriptor。源码未建立“每次点按历史被这层无限缓存”的路径；这不证明所有真机callback实际已完成，也不是削减SAO内容或再加一层清缓存策略的依据。

<a id="six-field-normal-exit"></a>
## 2026-10-30：六字段后正常退出的同进程回落

用户按系统返回并回复“已回地图”，未应用预览、未关闭小程序或调试。官方currentPage实际为`pages/map/index`，11图由Root实看：月湾测试点、地点面板、地形仍在，连接正常。沿同一IHqIBm/1de19f3e观察；Root未发送手机输入，也未取Heap/强制GC/启动新Profiler。

用户回执后才启动7点系统watch，已正常exit0；原件 `owner-fields-exit-drain-1f183e4b-41df-4ce3-b6e8-66d0f0c21293.ndjson` SHA `18f771d262e60773f3048426d642b212c1eac09e62f594653b636ba6eafd29b5`，原始身份与退出准备点全部一致。PSS依次1,312,024、1,218,383、1,217,931、1,151,915、1,163,596、1,162,015、1,162,035KiB；末三点跨度1,581KiB，覆盖约53秒的host观察区间。末值比退出准备点1,203,272KiB低41,237KiB（约40.3MiB），比返回后首点低149,989KiB（约146.5MiB）。Graphics由退出前132,228降到107,100KiB，Unknown由返回后386,841降到301,761KiB。

激活当前真机窗口后的实际Memory截图为103MB、下降335kB/s，保存为 `fields-exit-visible-vm-counter.*`；同次UIA仍给159MB/上升321kB/s，明确排除其当前值含义。所选VM、进程分类和逻辑资源账各自陈述，不能相加或把差值当全部Sky物理字节。

这段建立正常退出后的自然回落和有限末段平台，不支持“退出后完全不释放”的笼统说法。Map是另一个有自身栅格/native资源的工作集；watch在用户回复之后开始，未覆盖实际卸载瞬间/切换峰，缺少完整分配器/retaining graph，不能证明所有Sky原生资源已释放或历史OOM关闭。完整读回归私有 `field-exit-memory-assessment.json`，执行终态归 `field-followup-exit-operation.json`。本次退出不再重做；后续已补[实际活动期与自然回落](#active-play-natural-return)，已有20/60秒暂停及本轮六字段/退出证据直接复用，保持当前有效调试连接。

<a id="active-play-natural-return"></a>
## 2026-10-30：两分钟Play的实际活动期与暂停后自然回落

继续同一1de19f3e候选及IHqIBm观察session，未重建、重连、取Heap、强制GC或开启Profiler。用户重新进入10°、SAO20409、2025-10-28 21:00:00暂停场景，12图由Root实看；当前Memory仅选中Allocation sampling而未开始。用户明确回复“已开始播放”后才启动13点系统watch，避免把准备等待当活动期。用户按清单兜底在已绘21:02:00自行暂停并确认，15图实看同一非空场景和暂停状态。

13/14图分别为实际播放中的21:00:51/21:01:50，host捕获时刻21:34:46.478Z/21:35:44.843Z。watch第1–6点均在用户开始回执之后、最后已知播放画面之前，具备活动阶段资格；第7–12点处于最后播放图和首个暂停图之间，不能按名义1x时钟猜测各点是否已暂停。第13点在15图之后，具备暂停阶段资格。用户确切暂停的host时刻未知，输入秒数、host观察区间与采样完成时刻分别保留。

| 同一前台进程阶段 | PSS（KiB） | Unknown（KiB） | Graphics（KiB） | 证据边界 |
| --- | ---: | ---: | ---: | --- |
| 播放前准备点 | 1,221,811 | 324,525 | 113,424 | 12图后、用户开始前 |
| 6个合格活动点范围 | 1,464,963–1,655,055 | 原始分类见私有分析 | 113,504 | 先后有升降，离散点不冒绝对峰值 |
| watch末点，已实看暂停之后 | 1,362,131 | 原始分类见私有分析 | 原始分类见私有分析 | 比准备点高140,320，后续仍有回落 |
| 后续暂停单点 | 1,241,458 | 344,485 | 113,368 | 比准备点高19,647（约19.2MiB/1.6%） |

6个合格活动点依次1,655,055、1,611,396、1,592,407、1,464,963、1,607,719、1,602,807KiB；全13点保留在私有分析，未删掉回升点或以最低值代替曲线。晚暂停点的host区间为21:42:09.094Z–21:42:14.278Z，距首个已知暂停画面约4分50秒；这不是精确停止到回落耗时。实际Memory截图此时显示所选VM为119MB、上升20.1kB/s，独立保存，未把它与PSS相减归因。

原件均在 `frame-owner-fix/memory-profiler/`：准备点 `owner-active-pre-3ce582fb-0e7f-4a26-abc8-93ac62903b0f.ndjson` SHA `512dfd17cedb048ffbb077e91e4f84ba76b77a07b6005b19f24af19ad5c49548`；13点watch `owner-active-play-drain-aa7b5d51-0d56-4320-a8c3-0664ad89b772.ndjson` SHA `c83ba790e553ceabb3140ef4b1defa06f5d399e0f336b70af3bd7e4abec71f9b`；晚暂停点 `owner-active-late-274de3b2-0fe0-48ae-a566-ff66d38a49af.ndjson` SHA `20109563e6543ae2d08de298086963ed1524122946c1b95c7451fcb625ca0edb`。全部终态，private PID/name/activity/startTicks核对一致；屏幕13–15及可见VM计数原件/hash由 `active-play-memory-assessment.json` 持有。执行状态 `active-play-memory-operation.json` 为 `ACTIVE_PERIOD_AND_NATURAL_RETURN_OBSERVED_ORDINARY_ENVIRONMENT_UNVERIFIED`，无待执行手机动作。

本轮支持：同一完整非空窄视野场景在这段实际活动期内并非单调积累；暂停后不经强制回收，进程占用自然回到准备点附近。结合此前修后20秒分配、60秒暂停、六字段与正常退出结果，帧作用域窄修已有实际改善依据，无需重播同一调试场景来凑轮次。它不能单独证明每次点按已在同条件下结束副作用、所有物理资源均释放、普通无调试运行的稳态容量或历史OOM根因已经关闭。随后用户明确“现在切换普通预览”，在原件核存和同包核对后结束本次调试，完成下节的普通运行观察；没有重取重型Heap。完整Goal继续active，原PLAN未改。

<a id="ordinary-play-natural-return"></a>
## 2026-10-30：同包普通预览的Play/Pause自然回落

用户明确同意切换后，Root先核当前源码1679文件SHA `960d5f1de9be8da7c11c451e00f363cc2b31ce2e7dbced9bdd64af7769cbf52b`、1de19f3e候选341文件/5,212,454B及两份采样导出完整，API ready。点击原真机窗“结束调试”返回一次foreground-PID工具错误，随后新窗口枚举确认该调试窗已消失、原主窗保留；不重复结束或杀进程。官方同项目auto_preview终态success，独立手机图实看非空Map和测试地点面板，建立 `frame-owner-fix/ordinary-phone-observation/starward-device-test-kJ5eEc`；前后候选hash相同，未重建或清缓存。普通执行仍是development_feedback，不认证phone逐字节/runtime AppID。

用户准备10°、SAO20363、2025-10-28 21:00:00暂停，02图实看；官方预警不可用提示在准备、播放和暂停画面均存在，未点重试或隐藏它。这是独立天气失败状态，不当作天空更新中，也不据此解释全部内存。与此前debug的SAO20409场景存在选中星/视野及环境状态差别，因此只比较本次自身前后，不能相减得到工具开销。

用户开始回执后才启动13点系统watch，03/04图实看21:00:38和21:01:57播放中；用户在21:02:00自行暂停，05/06图实看暂停及非空天空。第1–7点具有活动资格，第8–10点在最后播放图与首个暂停图之间，阶段保持未知；第11–13点具有暂停资格。没有Profiler、Heap、强制GC、自动Play或Root手机输入。

| 同一前台进程观察 | PSS（KiB） | 说明 |
| --- | ---: | --- |
| 播放前3点 | 984,904 → 910,852 → 910,621 | 保留首次较高点；后两点差231 |
| 7个合格活动点 | 1,134,588、1,143,060、1,140,743、1,081,028、1,148,511、1,147,136、1,088,988 | 有升降；离散最大值不冒绝对峰值 |
| 已实看暂停后的3点 | 1,098,768 → 1,098,880 → 1,097,307 | 最后比紧邻准备点高186,686，不能在这里就判回到基线 |
| 约05图后3分41秒至4分40秒的3点 | 938,945 → 913,265 → 967,733 | 自然回落后仍回升；分别比最后准备点高28,324、2,644、57,112 |
| 下一动作发出前的更晚准备点 | 874,989 | 仍是21:02:00暂停，低于原播放前两点；不丢弃此前回升数据 |

准备/13点watch/晚3点/更晚单点原件分别为 `owner-ordinary-pre-bd0cc1f4-57bd-4de5-8b8b-bb41f4063d29.ndjson`（SHA `360c73596fd5f0727eb21fe3cb77dee1be78a782914055baa25e15daf5af517a`）、`owner-ordinary-play-drain-65baa6e9-a73c-43f7-8301-2469d93b7bc8.ndjson`（`361e221c79f367a51ad61cffbf184f392881b94546bc1f84dd8f74faed7f7ad9`）、`owner-ordinary-late-6b09247c-6826-4a8d-9875-78c611e674c0.ndjson`（`ebb2f5f40d554037af6513418544cd60274b8c71df704a7d73fe1ade1e4b5251`）及 `owner-ordinary-year-pre-6a799732-1386-493b-9364-d0be12053cca.ndjson`。全部在现有 `frame-owner-fix/memory-profiler/`，私有PID/name/activity/startTicks核对同一实例；13点和晚3点均exit0。完整分类/时序、图hash和资格见 `ordinary-memory-assessment.json`，官方调用与操作状态见 `ordinary-memory-operation.json`。

本次补上修后普通运行的自然回落证据，不能再把当前窄视野Play描述为“暂停后完全不释放”；也不把偶尔回到基线的单点当所有操作均无残余或完整OOM验收。时间owner暂停清anchor、preview、heldPreview并结束playRequested；页面仍保当前合法显示，几何owner保一个有资格窗口，BSC/SAO变换缓存替换当前帧，没有从这些当前路径建立历史帧无限保留的新缺陷。源码只支持逻辑所有权，PSS不提供具体分配器retaining graph。剩余单次点按收尾由一个跨年份动作区分，复用原六字段采样，不重录六字段或重开已否决优化；完整物理、容量和旧native/普通退出原因仍未闭合。

<a id="ordinary-cross-year-settled"></a>
## 2026-10-30：普通运行单次跨年及返回同一目标的收尾

为补原六字段录制没有逐次时序的这一处缺口，用户只做2025→2024的一次年下箭头，再做2024→2025的一次年上箭头；均停留到“正在更新天空”消失后回报，未播放、应用或使用Profiler。07图实看2024-10-28 21:02:00，08图实看回到2025-10-28 21:02:00，均为同一10°/SAO20363、非空星图及暂停预览；原官方预警不可用提示保留。用户回执后才各取3点，阶段只标为已报告收尾/实看停留之后，不声称测到输入峰值或所有native副作用结束的精确时刻。

| 观察 | 同进程PSS（KiB） | 相对于首次操作前874,989KiB |
| --- | ---: | --- |
| 首次操作前、仍在2025 | 874,989 | 基线 |
| 一次年下箭头后，2024 | 901,896 → 880,050 → 859,418 | 最后低15,571 |
| 一次年上箭头回原时刻，2025 | 886,962 → 881,798 → 923,466 | 分别高11,973、6,809、48,477 |

全部点保留，不能只选返回后的最低点来宣布精确零残余。返回末点的增量中Dalvik约24,216KiB、Unknown约12,628KiB、Native约9,616KiB；这些进程分类不直接定位JS对象或业务持有者。结果与前面无新输入的空闲波动共同解释：本次一次跨年及返回没有复现旧的大幅持续累积，且首次点按后自然回到操作前以下；返回原目标后仍有波动，不能外推每次操作、全部内容/设备或历史OOM。

准备点SHA为 `9fb7dfab197e770a944d365b7855e706e99bedde087c6abbcba7aad81d593182`。下箭头后原件 `owner-ordinary-year-settled-9acfbe01-137f-48a2-95a6-fcd781e832a4.ndjson` SHA `3525b069382f4ce10a37892a14e4c51eb544a64f936b8c58ea04489bd71138a8`；返回原件 `owner-ordinary-year-return-8d6fae85-e759-4f93-a82c-eac81e9a1a67.ndjson` SHA `9b58b3f6429dd05f0d1d28c44d61679782343c5d75522b2bf9e8570a7b7cb0cf`。全部PID/name/activity/startTicks与普通准备/Play相同，两个watch均exit0；当前无采集或手机动作待执行。私有 `ordinary-memory-assessment.json` 的singleTap保存准备、逐次回执、全部分类、画面/hash和限制；`ordinary-memory-operation.json` 为 `ORDINARY_PLAY_AND_CROSS_YEAR_OBSERVED_NO_ACTION_PENDING`。

本轮没有新增生产代码；已有frame工厂窄修继续复用，同包普通Play和这次跨年往返提供目标改善证据。停止这一轮同类采集；完整负载/稳态容量、物理分配归属及旧崩溃原因仍按原D2保留，不以继续重复同一个短场景代替缺失域，也不把development_feedback称为完整验收。

<a id="ordinary-native-exit"></a>
## 2026-10-30：普通退出后的原生分类与停止补采

用户已明确撤销历史闪退归因待办；旧事件保留已知事实，只在后续产品体验再现时针对新现场处理。按当前PLAN同机制收敛规则，本段仅补普通Sky退出到Map的现有分类缺口，没有重播Play、取Heap或强制GC。

当前源码960d5f1d及普通候选1de19f3e未变。退出前实际画面为10°/SAO20363、2025-10-28 21:02:00暂停；Root保存3个前台进程点后，由用户按系统返回、未应用预览并回复“已回地图”，随后只取3个点。六点的私有process identity一致，observer均已返回。

| 同一进程阶段 | PSS（KiB） | Native Heap PSS（KiB） | Graphics summary（KiB） |
| --- | ---: | ---: | ---: |
| 退出前3点 | 907,406 → 893,023 → 894,070 | 106,955 → 106,955 → 106,955 | 113,108 → 113,108 → 113,108 |
| 返回Map后3点 | 1,048,648 → 916,052 → 913,801 | 119,611 → 106,551 → 106,551 | 107,176 → 107,132 → 107,132 |

退出后瞬态占用已自然回落，末点PSS较退出前区间高6,395–20,778KiB；native堆末点比退出前低404KiB，Graphics低5,976KiB。Map与Sky保留的原生页面不同，不能要求总量逐字节相等，也不由系统分类推断每张纹理的释放时刻。Root随后实看Map/地形阴影、原选点详情和云观星入口正常，未操作手机。

原件在既有frame-owner-fix/memory-profiler：owner-native-sky-pre-d1935323-cb1a-42c6-8e32-5a83b5ffc840.ndjson（SHA f410b00afe667dc41238f46fdae60aedf5c8597e612d3099e3af52a6eb0fca99），owner-native-map-after-2bee03e8-53c0-4766-a33e-571c41a59bd9.ndjson（SHA eb5e44b831add0a61f3e0d65db76381f8ce5e51aac0ea339b2561101914f01f2）。完整分类、host区间和实际画面hash归native-lifecycle-assessment.json，执行终态归native-lifecycle-operation.json。Map截图SHA 4246ca556f7527db6b37c287a7857924e4f5fe6cdf0aa315e0911418a17a0356，2026-10-29T23:20:09.435Z；runtime AppID及phone逐字节身份仍非正式认证。

结合已验证普通Play/Pause/跨年及既有GPU逻辑账，没有定位到新的持续资源增长或需要新增生产修复的独立成本。本轮地形/Sky同类内存采集停止，不再为精确分摊物理字节或绝对容量上限重复操作；这些平台未知仍如实保留，不冒全OOM保证。原P2 F04的故障实例替换、真实恢复及迟到结果隔离是不同机制，继续完成该最小目标观察。
