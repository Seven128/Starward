# R17 时间管线独立复核

2026-10-19。只读审核当前 `944a1d6c` 的源码、既有手机 receipt 与当前 Context；本次没有操作手机、DevTools、服务，没有修改产品实现、PLAN、HANDOFF、INDEX 或 durable Context。Web GPT Pro 的建议按 root 提供的摘要作为待验证假说，本记录不声称独立读取了其完整对话。本文是当前任务的局部复核，不是另一个实施方案。

## 结论

应先改进 **输入与准备工作关联的测量**，再决定是否移动准备边界。源码确实把时间几何、目录绑定、SAO 选择/准备、星座和部分资源选择放在 Canvas latest/coalescing 之前；但既有数据并不支持“多数准备算完就被丢弃”。`preparedRequests` 是 writer 请求次数，不是昂贵准备次数。现成的正常 Play 窗口里，已准备和已绘的**不同时间数量非常接近**，大部分多余 request 很可能是同一输入的资源/动画/页面请求。不能据请求数直接发起一次时间管线重构。

当前一个更明确的问题是：`intentToAcceptedWallMs` 的名字超出了探针实际语义。它只记录恰好仍等于 latest intent 的 accepted，而且没有“此输入已记录首次接受”的状态。因此会漏掉被更新覆盖的输入，也可能把最终时刻的后续渐显/资源重绘重复算作输入延迟。正常 Play 中只有 6/510 或 0/547 个输入产生这种样本。现有 p95 不能代表完整交互延迟。

accepted publication 可以在有热点证据时缩小 React/UI 消费范围，但不能只把大对象换成 ref：当前 accepted record 同时驱动可点击名称、来源、实际已绘时钟、选择位置、相机和资源需求。尤其 `SkySelectedObject → onPosition → draw` 是真实反馈路径，删掉 React 通知或 `position.report === frame.data` 会破坏它的更新或身份边界。

## 1. 真实的输入到后继 render 路径

以下引用均相对于仓库根目录；行号属于当前源码。

1. `sky-observation-time.ts` 独占 FIXED/PREVIEW/PLAYING/PAUSED、binding、committedAt、runStartAt 和 elapsed anchor。`tick(elapsedAt)` 用开始时刻加真实 elapsed 推进，调度迟到不会令 1x 变慢；覆盖端点会进入 PAUSED。`pause()` 保留最后意图时刻，`hide(elapsedAt)` 先 tick 再暂停，`cancel()` 还原 committedAt。
2. `spot-sky-page.tsx:1958–1971` 用 `setInterval(advanceSkyTime, 16)` 作生产者；`:2472–2476` 经 visibility/Context/日期编辑守卫调用 `tick(Date.now())` 和 `setTimeIntent`。这是计时器生产者，后面的 writer 才是 native Canvas RAF admission。源码注释“reuse native cadence”不能解释为此处已经使用原生 RAF。
3. React render 中 `:1916–1957` 先由绑定求 requestedAt，取得窗口模型，再执行 `presentSkyTime`、fine-target 的可用覆盖和 geometryReport。`presentSkyTime` 是瞬时报告派生；不会写 Query/公共 Context，保 weather 与几何供应的独立含义。
4. `:1980–1987` 绑定 BSC immutable catalog 和位置 presentation；`:2067–2175` 用已接受相机/尺寸与当前时间准备 SAO、独立影像需求、星座 frame、地景等。`useSkyStellarSupplement` 的 selection/resolved useMemo、`resolveConstellationFrame` 均在 writer 前发生。BSC/SAO 的精确坐标仍有按实际 draw 惰性计算部分，不能把整个星表成本归于 React prepare。
5. `:2282–2312` 构造 `draw`；`:2373–2378` effect 调用它。`draw` 组装资源/时间快照后才 `canvasLifecycle.request(frame)`。同一 draw 还可被相机动作、资源/位置回调和过渡续帧调用。
6. `sky-canvas-lifecycle.ts` 只持有 `latest`、一个 pending admission、一个 busy draw。较新 request 替换 latest；native RAF/其有界 fallback 后再 snapshot 并 paint。`resolveFrame` 目前只在实际 draw 前读取最新有效 HiPS，不是时间几何的统一准备入口。完整 Scene 的完成回调当前同步执行；这里的 callback 不是 GPU fence 或物理显示回执。
7. `spot-sky-page.tsx:1550–1777` 以当前相机 intent 求实际 view，执行 drawSkyScene、同帧名称布局和 source completion；`:1800–1821` 只有当前 attempt 的 `surface.present` 成功后才 publish。publish 同步更新命中 ref、accepted frame、相机/FOV，并在有限动画未完成时向同一个 writer 请求 continuation。
8. accepted state 引起后继 React render。若时间/相机/资源身份都没变，已有 useMemo 可复用；不能推断每次 render 都重算整套几何。相机确实改变时，它又更新资源 demand；选择位置的 child effect 也会请求 draw。这是受 owner 约束的反馈，不是已证实的无限循环。

### 不是“每帧远端请求”

`useSkyTimeGeometry` 在原/retained 模型覆盖当前时间时令 binding 为 null。Play 时 `fineTargetBinding` 明确禁用。SAO loader 的 update/resume effect 由实际 tile IDs 的 key、active 和 measuredView 驱动，不因每次产生 selection 对象就重新下载。API/网络可以有自己的异常，但从这条时间调用链不能得出“每帧拉接口”解释。

## 2. 复用现成证据，而不是再跑同样的长试验

来自 `R17-PHONE-COMPARISON.json` 的四个时间尺窗口：

| 窗口 | requests / paint | prepared 不同时刻 / painted 不同时刻 | presentation / constellation 调用 |
| --- | ---: | ---: | ---: |
| baseline wide-time | 99 / 68 | 44 / 44 | 44 / 44 |
| candidate wide-time | 98 / 67 | 36 / 35 | 36 / 36 |
| baseline narrow-time | 84 / 62 | 47 / 47 | 47 / 47 |
| candidate narrow-time | 91 / 68 | 50 / 50 | 50 / 50 |

四个 camera 窗口虽有 263–271 次 request、79–98 次 paint，时间始终只有一个值，presentation 与 constellation 调用均为 0。它们尤其不能证明大量时间准备被浪费。

进一步只读外部 `Starward-data/verification/sky-map-20261018/probe-metrics` 已存的三个约 14 秒 Play receipt：

| receipt / 条件 | intent | requests / paint | prepared / painted 不同时刻 | presentation / constellation 调用 | constellation CPU / draw CPU |
| --- | ---: | ---: | ---: | ---: | ---: |
| `candidate-r17-1-ble5msdhok.json`，gen20 debug-off，正常画面 | 510 | 681 / 489 | 462 / 456 | 461 / 461 | 1278 / 5278 ms |
| `candidate-r17-1-zfayq1keye.json`，gen20 debug-on，正常画面 | 547 | 682 / 490 | 466 / 461 | 465 / 465 | 1241 / 5416 ms |
| `candidate-r17-1-r0c4x784cx.json`，gen21 CPU/page-only 合成输出 | 561 | 675 / 490 | 460 / 457 | 459 / 459 | 1272 / 4902 ms |

这里的集合仅保留 distinct 数量，不导出关联身份；窗口开始前已有的 frame、同一时刻多版本资源和重复访问也会影响计数。因此上述数字不是“精确丢失六次准备”的证明，更不能算精确可省 CPU。但它们明确不支持把 `681 − 489 = 192` 当作白算次数。若扩大到完整 Play，现有不同时间计数依然接近，新增测量应该解释这个差异，而不是先假定反面。

CPU stages 的调用层次有嵌套，表内不可相加为总帧预算。gen21 不具备真实持续显示，不能比较其 FPS、source correctness 或产品成功。gen20 debug-off 的持续增长与 gen21 去除 recurring GPU/native-present 之后仍增长是内存线 B 的证据；本审核不据 CPU 表判断 allocator。

## 3. 现有延迟探针的具体盲点

`scripts/r17-phone-probe-runtime.ts:91–98,123–136`：

- intent 保存的是一个 `latestIntent = { at, wall }`，无输入序号。
- request 仅统计 frameAt；paint 记录 frame object 到 started wall 的 WeakMap。
- accepted 只有 `acceptedAt === latestIntent.at` 才记 wall 差；后续同一时刻的 accepted 没有去重。
- 所以拖动更新到 B 后，A 的有效完成不会进入此分布；停止拖动后，B 的多个过渡/资源 accepted 却都可能进入。
- `maximumRequestedMinusAcceptedMs` 是天空时间的差，不是墙钟延迟。时间尺跨过几小时所产生的大值不能当成 UI 卡住几小时。
- `nativeCallbackMs` 量的是 Scene 的 JS 完成回调边界，当前并非外部 native bridge acknowledgement；`displayCopy` 返回也不证明屏幕 scanout。

正常 debug-off Play 中 `intentToAcceptedWallMs` 只有 6 个样本，debug-on 为 0，尽管分别完成 489/490 个真实 accepted copy。正常 Play 的这个 38ms p95 和 0ms 不是低延迟证明。此前时间尺 175/143ms 等仍可保留为“旧探针条件样本”，不要删除原始结果，也不要把它升格成所有输入到显示的 p95。

最小补测应在既有 probe 中使用有界数字 identity：一次实际 intent mutation 一个 sequence；derived preparation 一个 token，绑定 scope generation、intent sequence 和真实资源 revision；request/paint/accepted 继承 token。在 finish 时汇总：实际 prepare CPU、被 paint 消费与从未消费的 CPU、每个 intent 的首次 accepted、superseded、同一 intent 重复 present、以及 accepted 后触发的 render/request 数。用固定容量 ring 或当前/上一 token 结算，不能为每帧 retain 整份报告、闭包或序列化内容。A→B→A 必须是三个不同命令身份；只用 at 不够。时间尺与 Play 的合并语义分别报告，不把主动 supersession 当掉帧。

若这次关联表显示准备浪费很小，停止重构 admission，把 profile 转向真正在消费的星座/名称/React 热点。若显示 material unconsumed CPU，才在现有单 writer 里做一个可回退的真实路径试验；不得先完整迁移所有 hooks。

## 4. accepted frame 缩成 UI 投影的真实边界

`setPresentedSkyFrame` 用 `skyCommandStateSetter` 同步写 ref 再写 React state。`previous.data === frame.data && previous.frameAt === frame.frameAt` 是 early equality 的前提；Play 每次新时刻的新报告通常无法复用 previous，因此会发布新的 state。这是源码可证事实，不是 retained heap 泄漏的证据；当前只留最新记录，是否被其它框架/closure 保留要由独立 memory 证据回答。

目前至少有这些真实消费者：

- `:2744–2783`：当前已绘场景、实际时钟、地景、已接受目录名称，以及要求同一相机/frame 的 DOM 内容。
- `:2461–2469`：source action 从同步 accepted ref 校验 mode、Canvas generation、Context、播放 run 和实际已绘来源。
- `:2655–2668`：定位动作使用已接受相机、尺寸、frame 和时刻；不能拿请求中的相机补上。
- `:3508–3528`：`SkySelectedObject` 的位置 presentation 来自 accepted paintedData；其 effect 将 `{data,catalog,report}` 给 `onSkySelectionPosition`，后者同步写 ref 并请求 draw。paint 中 `:1585–1588` 再要求 `position.report === frame.data` 和精确 Context/time/catalog 身份才画选择标记。
- `:2067–2175`：accepted camera 改变资源 view；`applyTrackedPosition` 则要求最新 observation intent，再将当前目标位置交回原 camera owner。
- 名称/星点/ready image transition 的 commit 和有限续帧，必须随真实 copy 成功；不能随 UI 更新节流而延后。

因此，若 profile 证明 React/UI 是热点，可以让**一个不可变 accepted record**继续同步拥有所有上述事实，再把实际 UI 需要的投影、订阅和相等性分开优化。但把每帧 record 仅藏进 ref、降低 accepted 发布频率或删 report 身份检查，都会让某些 consumer 落后或失去防串帧的证明。尤其普通模式 `SkySelectedObject` 即使 `visualName=false`，它的位置订阅仍工作；它不是可直接删掉的“重复文字组件”。

另外，成功 publish 并不无条件重算全部资源：`setPresentedCamera` 已按九维 basis/FOV/center 保持精确相同对象；多数 image hooks 的 useMemo 依赖其标量/身份，而不是临时 view 对象本身。必须测实际 memo miss/consumer 才能把优化范围放对。

## 5. 8 个名称 / 6 个星座的前置拒绝

**目录名称 8 个：当前已在 native measureText 前停止。** `spot-sky-page.tsx:1619–1623` 先检查 `nameLayout.names.length === 8` 再测字，`sky-name-layout.ts:134–146` 再负责实际放置。因此这一建议不能再作为未做的重复优化。

`projectSkyCatalogNames(..., wholeLayout=true)` 确实还会生成和按真实亮度排序完整候选，因为前几个可能碰撞/越界/是已选对象，必须继续找后面的可放置对象。直接 `.slice(0, 8)` 会改变原语义。只有 profile 证实候选扫描/排序占比值得处理时，才考虑同顺序惰性迭代；需保留原参与者、退出 envelope、地景/整字框和 hit 行为。

**星座 6 个：还有局部的提前拒绝空间。** 当前 `:1633–1642` 对整组投影 label 做 flatMap，并先 `surface.measureText`；只有进入 `nameLayout.constellation` 后才检查 `decorations.length >= 6`。可以把剩余容量资格放到同一个 name-layout owner、在测字前停止，或给 owner 一个只有尚需布局时才调用的 measurement thunk。不要在 page 复制第二个容量常量。

计数必须是“成功占位”，不是候选数或当前 visible caption 数。新生 caption 初始 opacity=0 仍已在 `decorations` 占位，page 随后才滤 `opacity > .01`；仅按最终输出数组计数会误多放/多测。边界外或碰撞失败候选不占位，不能简单只测第一批 6 个。其价值是减少已确定无效的 native measurement；不能把它称为当前数百 MiB 增长的已证实修复，窄视野可能本来不足 6 个星座。

## 6. 对原 PLAN / Context 的建议

无需另起引擎或另一份 PLAN，也不应先采用整体 prepare 前移。原 `runtime-and-domain.md:362–364` 已把“测明 unpresented preparation 的有用避免量、单一 writer、无额外 RAF 等待、保末态与 exact-time/commit”列为条件方向；Web 建议与这条现有方向一致，并未自动推翻它。

建议 root 在同一 R17 模块明确两条不同结果：A 是输入/准备/已接受显示延迟与尾部等待；B 是持续 Play 的进程内存增长/退出。A 的当前下一步应是修正上述关联观测，B 按当前 native text metrics/React/CPU 剩余边界推进。不能用 B 的冻结合成输出通过 A，或用减少迭代次数掩盖 B。

本次可长期沉淀的新增内容很小：**请求数不等于准备次数；first accepted latency 必须关联输入身份并区分 supersession/重复呈现；同步 Scene callback 不是 native/GPU completion；accepted UI 投影优化不能降级权威记录。** 具体 runs、数字、未成功工具和本次候选留 task evidence。已有 Context 已覆盖测量层次、观察开销、内存口径和停止规则，不宜复制一套平行政策。

完成后才能评价整体产品改进：正常未冻结候选、相同真实 BSC/SAO/资源与实际数据路径、Play/Pause/末态、六字段与 ruler、取消/Apply、hide/Source 回来、选中/跟踪/来源，以及受影响的实际延迟和内存范围。复用已有效的未变证据，不因此重跑整套排列组合。

## 读取与验证范围

完整读取本审核涉及的 time owner/presentation、Canvas lifecycle、name-layout/label-presentation、constellation-scene/labels、stellar scene 的当前 transform/绑定入口、stellar supplement hook/scene、selected-object，以及 page 上述相应范围。读取既有 comparison 与已命名的三个外部 receipt，只输出计数/耗时，没有读取账号、原生 storage、凭据或 raw heap。没有运行新测试：本次没有产品变更，源码与现成结构化证据足以支持这些限定结论；目标性能和内存因果仍待原 owner 的下一次有界实验。
