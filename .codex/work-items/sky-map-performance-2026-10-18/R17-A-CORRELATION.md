# R17 A：复用 gen25，补齐 request 边界

2026-10-19。A 仍 **UNVERIFIED**，B 仍 **UNVERIFIED**。本次没有手机输入、DevTools/ADB/服务操作、候选构建或交付，没有改生产源码、调度/accepted 状态所有权、PLAN/HANDOFF/INDEX，也没有重录 CPU。只复用原始正常路径证据，并完成有限的 task-local 观察扩展与软件检查。

## 已有证据实际回答了什么

原始回执是外部 `E:/Dev/Starward-data/verification/sky-map-20261018/probe-metrics/baseline-r17-1-kld3md55q3.json`：40,383 B，SHA-256 `31046ac272dfc30e662672f5651727e3017b0c98a85f2d1b605c5edccf73dcf1`，compact body 27,329 B。已重新验证原始 v3 allowlist、精确 hash 和 gen25/normal/source binding，未重写原件。[机器结果](R17-A-CORRELATION.json)保存本次有界分析。

它绑定 normal / generation 25 / buildSource `10236f0e034ae96d9e31ed5e081a837a53f4cdd128e3f9ac34da6d588f151a4c`，完整本地 bundle `d4ed31dfe62d4d0268eb3d415d932d0f958615ba6a9ac98e474edc7a13432819`；手机整包字节及 runtime AppID 的未验边界继续保留。当前 gen26、旧输入 session 与原官方 UNKNOWN 均不由此改变。

记录窗口为 **14,006 ms**，origin-relative recording start 1,012 ms、metrics seal 15,018 ms，实际 Play event 2 ms，因此相对 Play 约 1,010–15,016 ms。Page scalar 从 origin-relative 1 ms 到 15,018 ms，约多含前一秒；不能拿 Page 全段累计耗时除以 14,006 ms 的帧数。原产品 Pause 在 20,013 ms，晚于 metrics seal，未把这次 20 秒 Pause 当持续播放验收。Date.now 为 1 ms nominal 的 wall elapsed，monotonic=false，本次 invalid/backward read 都为 0；没有把它转成线程 CPU 或物理 FPS。

- **真正的 first-accepted 分布是 460 次**，全部在 v3 的有效 coarse elapsed 覆盖内，p50 59 ms、p95 68 ms、最大 150 ms。原结果摘要中的 2 次 `timing.intentToAcceptedWallMs` 是旧的“仅匹配最新时刻”条件样本，不能代表 511 个 intents。460 次中 458 次在后续 intent 已 supersede 后才第一次 accepted；18 次是重复 intent 呈现。未 accepted intents 51，50 已 supersede；两帧 accepted 无可用 intent 关联。supersede 不等于作废，也不单独证明错误或可跳过工作。
- 464 次 presentation 准备中 **460 已消费，仅 4 未消费**；已消费准备的 known subtotal 251 ms（227 valid，233 belowResolution），未消费只有 known subtotal 3 ms（3 valid，1 belowResolution），没有 expired preparation。该准备只涵盖 `presentSkyTime` memo，不能把其他 React、constellation 或实际星点投影成本算进来。没有支持将准备迁往另一 admission writer 的可观成本证据。
- 原始 first 16 + last 16 链中，30 条既消费又首次 accepted：intent→preparation 开始 p50 9 ms（1–13）；presentation 完成→paint 开始 **p50 40 ms（25–47）**；paint→首次 accepted p50 10 ms（6–14）。这是首尾选择的 30 条，**不是随机全窗分布**，不能和全窗 p95 混用或用各自最大值相加。原链没有 request 时点，40 ms 仍把 React 剩余工作、effect 触发、Page 更新和 lifecycle 等候混在一起。

已有 CPU 中投影和微信 updateValues 责任及映射限制继续按 [R17-NORMAL-CPU-ATTRIBUTION](R17-NORMAL-CPU-ATTRIBUTION.md) 解释。CPU 全文件不是上述精确 14 秒同窗，不再重跑同一捕获。

## 生产调用者和下一决定

`spot-sky-page.tsx` 在 render 的 `useMemo` 中生成 time presentation，完整 `draw` closure 通过现有 `useEffect` 提交 `canvasLifecycle.request`；手势/资源更新也使用该 draw owner。`sky-canvas-lifecycle.ts` 用同一个 latest/dirty/busy writer、一个已有 scheduled callback 与 native callback 来合并和准入。当前记录从 presentation 完成直接跳到 paint，遗漏了实际 draw/request 边界。

当前安装的 Taro runtime `node_modules/@tarojs/runtime/dist/dom/root.js` 通过已有 `scheduleTask`/`performUpdate` 调 Page setData，callback 再执行 `flushUpdateCallback`。这证明一个需要观察的框架边界，不证明本例所有 passive effects 必须等待 setData。已有实际 Page 496 submitted / 495 completed、pending 1 / max 2 支持观察真实 Page；没有证据要求扩大到 component/custom-wrapper。Page 原 observer 的 latency 使用 performance→Date fallback 并 clamp，不能与 v3 时钟合并或作为校准耗时；本扩展只复用它的计数。

下一次同一完整正常路径的目标观察将 presentation 完成→paint 分成：

1. **完成→首次 request**：包含剩余 render/effect/下游更新等候；若主要时间在这里，调查 render→effect 边界和实际 Page 更新，不改 native writer 或直接删状态。
2. **首次 request→首次 paint**：包含 existing lifecycle 的等候/合并/准入；若主要时间在这里，调查当前 writer 的 busy/scheduled/readiness，不能把请求减 paint 当浪费。
3. **Page 计数位置**：分别在 preparation finish / first request / first paint 记录 `[submitted, completed, pending]`，用于判断同一阶段是否出现已提交、完成或仍在途的 Page 更新。它只有时间关联，**不证明 payload/intent 身份、因果、React render 成本或物理呈现**。若某一侧仍混杂，这次结果决定再细分哪一侧；不预建完整 profiler。

paint→accepted 及 superseded、失败/取消、duplicate、unknown 的原 v3 责任保持原样。原 CPU 排名和本扩展都不能替代实际拖动/六字段输入的 A 验收，也不回答 B 的分配/增长问题。

## 已实现的最小扩展

- [r17-a-correlation-instrumentation.mjs](scripts/r17-a-correlation-instrumentation.mjs) 是纯 source materializer；输入原 v3 runtime 和 Page observer，返回增强源字符串，不写目录或构建候选。原 v3/runtime/observer、normal gen25 builder 和历史 manifest 未改。
- [r17-a-correlation-runtime.ts](scripts/r17-a-correlation-runtime.ts) 在现有 bounded preparation 记录加数字字段；request 边界只读一次既有固定 Date 时钟，无新每帧对象/JSON、无新 closure 或 frame/payload retention。finish/paint 复用已有 stamp。normal 模式由既有 run binding 锁定，开始时复位；全窗仍受原 45 秒/2,048 preparation ring、15 秒 seal 与 20 秒同次正常 Pause 的 owners 限制。
- 可选 `aCorrelation.schemaVersion = starward-r17-a-correlation-v1` 只出现在 normal v3 metrics。两项阶段分布覆盖**当前保留的 preparations**，未 request/paint 的项为 notObserved；低于分辨率、clock unavailable/backward/mixed-run/out-of-range 保留 unknown。它不是未消费工作成本。原 expiry counts 保持，不能将被 ring 淘汰的记录当作已测或零。
- 只导出 first 4 + last 4 条 request/Page 位置，与原 v3 32 条链的 prepareToken 对应；完整阶段聚合仍覆盖最多 2,048 retained preparations。所有新增数组、统计对象与排序只在 seal/export 生成。
- [r17-a-correlation-protocol.mjs](scripts/r17-a-correlation-protocol.mjs) 严格校验版本、normal mode、phase coverage、数值/null、原链 token 和固定字段；仍用 32 KiB 上限。collector 只将 dispatcher import 切到此模块；v1/v2/v3 原 validator 和 terminal 字节规则未改，原回执不迁移。服务不会因此自动 reload。

## 下一个候选接线（尚未执行）

由 root 在真实候选/官方 UNKNOWN/设备绑定边界解决后，用**有限的新正常观察 revision**准备 A+B 候选；实际下一 generation 必须从当前 feedback owner 取得，不能用新代码重贴 gen25 或改其 manifest。原 build25 和 review-r2 保留为历史证据。

1. 对新 revision 的 `preparedSources`，先使用原 normal 构造，再调用 `addR17ACorrelation({runtime, pageObserver})`；将返回值写新 isolated source 的同名 runtime/observer，另加入 `r17-a-correlation-runtime.ts`。将 helper/materializer/protocol/test 纳入该 revision 的 template hash 与 buildSource binding。保留 complete source、正常 math/memo/full accepted publication、所有 renderer/copy/caption/resource demand/retirement 和原 Pause。
2. 新 controls 应用一个独有但仅诊断的标签（例如“正常Sky关联 A1”），generation/source binding 应是新 revision 的实值。不要修改旧 gen25 label 来假称同一包。既有 baseline fixture 的 runtime loader 需要允许唯一 `./r17-a-correlation-runtime` import；新 fixture validator 选择 `r17-a-correlation-protocol.mjs`，严格 delta typecheck、完整构建/包体/来源指纹由原 builder owner 继续负责。
3. 既有 bridge 若直接预校验 v3，应将该 import 与 collector 一起切到新 dispatcher；部署其 v3/v2/v1 dependencies，再按现场 owner 做所需有界 reload。当前服务是否已加载新模块、HTTP 新扩展/terminal admission 仍 **UNVERIFIED**；不能从 portable store 测试宣称已可收手机回执。
4. 下一次实际观察使用新的 public Context/数据源身份和真实 source/build/target 绑定，确认正常非空 Scene、BSC/SAO、相关 text/native calls 与 accepted。无需重新 CPU 捕获；B 的有效 normal allocation 样本、症状同条件和 paused drain 仍由 root 单独推进。未知 Page identity 或时钟仍为 unknown，不回写旧数据。

## 实际检查

`node --test` 一次合批执行 `r17-a-correlation.test.mjs`、原 `r17-phone-probe-v3.test.mjs`、v2、v1 和 collector：**29/29 通过**。新增 6 项包含无落盘候选的 strict TS（strict/noUncheckedIndexedAccess/exactOptionalPropertyTypes）、request 首次去重和两个相位、时钟未知、Page receiver/返回/重复 callback、2,200 次输入的 bounded ring/32 KiB、normal run 锁定、固定 terminal/collector dependency/idempotency/冲突与旧协议共存。

首次 strict TS 发现 request 方法参数 `sequence` 遮蔽 recorder run id；已改为既有 `binding.windowId`，并增加非首 intent 的全 ring 有效相位断言后才合批通过。该失败保留在这里；没有把类型通过当目标响应性通过。

`node scripts/r17-a-correlation-analysis.mjs --write`（从本 work-item 目录运行时）重新校验原 receipt hash/allowlist并写机器结果；没有重读 CPU 大文件或重跑手机。

尚未验证：新 normal revision 的完整 materialization/fixture/build、真实服务 admission、手机 phase/Page 关联和观察成本、独立审查，以及所有 A/B/完整 Goal 产品验收。上述软件准备不关闭这些义务。
