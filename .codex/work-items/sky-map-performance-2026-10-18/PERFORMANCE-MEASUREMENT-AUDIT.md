# R17 性能测量方法审计

2026-10-19。只读审计当前实现、安装的 Taro 4.2.1 源码及已保存证据；没有操作手机、ADB、DevTools、服务或远端，也没有修改生产源码、PLAN、HANDOFF、Skill 或 Context。本文件不复述 Web GPT Pro 的整份报告，而核对它涉及的测量事实。gen22 只有完整构建证据，尚无 RESULT，不能补写成已经运行。

## 结论与优先级

当前已经得到有价值的排除证据，问题不是“完全没测到”。gen21 在保留完整 CPU Scene、真实 React/Taro publication、原生 RAF、图片生命周期及文字测量时，取消后续 GPU、renderer staging 和 native present，仍出现大幅进程内存增长。因此下一步应集中于保留下来的责任边界。它排除了这些被移除路径是本次增长的必要条件，没有证明它们在完整产品中永远没有独立问题。

取证困难主要来自四个可修正问题：应用内窗口与主机内存窗口不对齐；某些重要数值只显示成压缩文本而不随结构化 receipt 导出；Page、React、Canvas、进程内存被放在同一讨论中却并不测量同一层；每个分支都重新复制并核验大量历史准备成果。应修复这些具体边界，并利用已经准备好的有界实验，不把“先建完监控平台”变成下一轮的前置条件。

## 当前数字究竟测了什么

| 字段/结果 | 实际代码语义 | 能支持的结论与限制 |
| --- | --- | --- |
| `K total/max/failures` | `r17-page-bridge-observer.ts::inspectData` 遍历 `setData` 第一个参数的 enumerable own keys；没有记录 React render/commit。 | 当前 gen21 JSON 已修正为 `pageEnumerableOwnKeysTotal=4327`、`pageEnumerableOwnKeysMax=10`。旧 `reactCommits/maxCommitMs` 解释错误。数字本身未变；不能引用为 React 次数或毫秒。 |
| `S/C/P/M/L` | 捕获的原生 Page 实例 `setData` 调用、首个 callback、未回调数/峰值、调用到 callback 的同步时钟差。保留原参数、receiver、返回和异常。 | 492/492、pending 0/max 2 支持该实例的 callback-bearing 请求未积累未回调队列。它不是 React reconciliation 时间、全小程序 bridge 队列、原生合成完成或显示延迟；无 callback 调用另记 `Q`。 |
| `B calls:bytes/max/failures` | reset 后最早 16 个 payload 的 JSON UTF-8 长度；原始 payload/字符串不保留。 | 只有早期大小样本，不能当整段总流量、峰值保证或 retained heap。 |
| `G calls:bytes/max` | 原 owner 的 `bufferData` 成功返回后记录 Float32 元素长度乘 4。 | 是该上传路径的流量；不是 GPU resident bytes、全部纹理/TWGL 分配，也不是 GPU 完成。 |
| `cpu.*` | `performance.now()` / `Date.now()` 包围同步工作区间。 | 是同步调用经历的 wall duration，可能包含阻塞、调度/GC；不是 OS 线程 CPU time。各阶段有包含关系，不能把独立 totals/maxima 相加成帧耗时。 |
| `nativeCallbackMs` | `paintStarted(frame)` 到 lifecycle completion callback；按 frame 对象 WeakMap 关联。 | 不等于物理显示时刻。异步 owner 正常完成与 native pixels 可见是不同事实。 |
| `acceptedCopies`、`acceptedGapMs` | 正常路径在 `surface.present` 和 `attempt.publish` 返回后计数/打点。 | 是应用接受点的副本与间隔，不是屏幕 FPS。gen21/22 合成路径故意不调用 accepted，零是诊断合同，不是正常产品通过。 |
| `intentToAcceptedWallMs` | 只有 accepted 时间与当时 latest intent 时间相等才记录。 | 是匹配子集延迟；快速覆盖的 intent 不在样本中。必须和 publications/distinct/accepted 数量及缺口一起解释。 |
| p50/p95 | 最先 2,048 个有效样本排序，overflow 后仍累加 totals，但不再追加 percentile 样本。 | 未溢出时覆盖实际窗口；溢出时是前缀分位数，不是整个运行的无偏估计。 |
| `schemaValidated` | `r17-phone-probe-protocol.mjs` 的结构、字段、大小、数值范围校验。 | 它允许合法全零、部分窗口及 synthetic zero acceptance；不能代替场景有效性判定。现有报告已另行保留早期全零无效案例，这是正确做法。 |

来源：[observer](scripts/r17-page-bridge-observer.ts)、[runtime](scripts/r17-phone-probe-runtime.ts)、[protocol](scripts/r17-phone-probe-protocol.mjs)、[插入位置](scripts/build-r17-phone-probe.mjs)、[gen21 当前结果](R17-CPU-PAGE-ONLY-RESULT.json)。本次没有重跑未变化的探针 fixture。

## Page 覆盖与 React Profiler

已安装的 `node_modules/@tarojs/runtime/dist/dom/root.js` 中，`findCustomWrapper` 根据虚拟节点和 `customWrapperCache` 查找组件；`performUpdate` 在更新阶段分别调用组件 `ctx.setData(data, cb)` 与 Page `ctx.setData(normalUpdate, cb)`。`dist/dsl/common.js::createRecursiveComponentConfig` 在 wrapper attach/detach 时维护这个缓存。现有 observer 只挂到 render 时捕获的 `Taro.getCurrentInstance().page`，不会自动观察这些其他组件实例。builder 已明确标注 `raw-instance-only-no-custom-wrapper-or-other-page`；该限制应保持在结论中。

但 normal `apps/wechat-miniapp/src`、config 和 gen21 对应源码没有 `CustomWrapper`/`custom-wrapper` 使用命中。因此目前不能把“理论上存在漏测路径”写成“本场景已有巨大 CustomWrapper 队列”。只有出现实际 wrapper/原生组件或 Page 计数与责任边界不符的具体证据时，才需要拓展该组件的观察，而不是先包裹全应用所有 `setData`。

当前产品源码和 task probe 没有 `<Profiler>`/`onRender` 采集；没有真实 React commit 数或 duration 证据。若下一问题是“哪些 React 子树重复 commit、花费多少”，可以对目标子树进行短时、计数/数值聚合的 Profiler 试验，并先证明当前 renderer/build 确实触发回调。React 官方说明 profiling 增加开销，默认 production build 不开启；仅加一个标签不能保证当前 Taro 4.2.1 + React 18.3.1 构建具有该能力，也不能把 React DOM 的配置直接搬来。[React Profiler 官方文档](https://react.dev/reference/react/Profiler)

若问题仅是“每次有效 publication 是否不断重建某个 effect、注册/清理多少 listener/RAF/loader”，在那个真实 owner 记录少量生命周期计数比接整套 React DevTools 更直接。计数解决机制疑问，不等同于 retained bytes。

## 窗口与进程内存：现有结果不要计算精确斜率

`r17-sky-memory.mjs` 在连接设备后设定 host `performance.now()` 起点。每个 sample 依次执行前台检查、activity owner 解析、进程列表、1–4 个 `dumpsys meminfo`、末尾前台检查，最后才输出一个 `elapsedMs`；随后等待 interval，再开始下一次。它没有记录每个 meminfo 的开始/结束时刻，也没有应用内 Play 的关联时间。

因此该时间是**整次多命令采样结束相对 helper 起点的时间**，不是各字段共同的手机瞬时点；轮询周期包含 ADB/系统查询耗时，不等于 interval。gen21 采样结束间隔实际约 7.22–7.63 秒。脚本先依据 resumed Activity 的 ProcessRecord 绑定被测 PID/name，并核验 meminfo header，避免把预加载 Appbrand 当当前页面；末尾前台检查不能升级为整个采样区间的原子快照。

gen21 同时存在至少四个窗口：

| 窗口 | 实际边界 |
| --- | --- |
| Scene receipt | 正常 Play 后延迟 1 秒开始；约 Play 后 15 秒 snapshot，实际 `elapsedMs=13998`。 |
| Page/G upload 标量 | 实际 Play reset 起算，约 15 秒导出时 pinned；不是前一行的 13,998 ms 窗口。 |
| 合成 `V/T/J` 总量 | 首次 ready copy/freeze 后累计，不在 Play reset；651 次 publication 不能直接除以 receipt 的 13,998 ms。 |
| 进程内存 watch | Play 前启动，sample completion 到 47,274 ms；含启动前平段、播放和成功暂停后的样本。20 秒只是安排原 guarded Pause 的 timer delay，实际执行仍受事件循环影响。 |

可报告首末样本 PSS 增加 915,266 KiB、Unknown 增加 871,792 KiB，以及暂停后仍保留大量进程占用；不可把它除以 47.274 秒或 20 秒，作为严谨的播放分配/泄漏率，也不可拿不同 warm/restart/swap/debug 条件算百分比收益。当前 gen21 RESULT 的 `meaning` 已承认起点和暂停混入，保留该限制。

PSS/RSS/Swap 和 Unknown 属于整个宿主 Appbrand 进程，不是 Starward 单独的 V8 heap。Unknown 是未能更细分类的内存，不能据此选定 JS/native/GPU allocator。GL/EGL 记账平稳也不代表所有 GPU/图形相关 native 分配都不存在。[Android dumpsys 官方说明](https://developer.android.com/tools/dumpsys#meminfo)

**最小改进**：下一次必须改采样 owner 时，加 `sampleStartElapsedMs` / `sampleEndElapsedMs`，只测已经绑定的前台 owner，必要时重查身份；应用 receipt 增加同一 run 的实际 Play、export、Pause 调用/成功状态及单调时钟时间。跨 host/phone 两种时钟用一次现有 collector 收到标记的往返边界作粗关联，不直接相减、不建设同步时钟平台。若本轮只需判断“接近 GiB 的增长是否仍发生”，已建 gen22 可用 before/after + 成功暂停判别，无需为精确斜率重建它。

## 真机堆快照与观察干扰

现有 [target route](TARGET-HEAP-OBSERVATION-ROUTE.md) 已证明当前原生菜单可导出到专门 trace 目录，且已安装 GUI 导入器会删除手机原件；精确 pull 保留原件的选择合理。它不是一个每轮都必须重做的能力发现任务。

[target heap result](R17-TARGET-HEAP-DIAGNOSIS.md) 只有一份初始 V8 快照，`self_size=71,087,332` 字节。播放后第二次导出没有产生不同文件，且 profiler 操作期间 native/Swap 发生很大变化。因此这不是“两快照稳定”，无法确定播放后的强保留增长或回收后的底线。多次点击 snapshot/Force GC 只会污染下一轮；当前停止决定正确。只有具体新条件解决了导出失败，才重新打开这条路线。

本地 Node 的 1,920 次 Scene + forced GC 结果只能排除其覆盖路径中的明显强引用持续保留；它缺实际 React/Taro、真实 Canvas、完整图片/标签路径和手机 VM，不能替代真机 after snapshot。它仍是有用的低成本边界证据，不需为安全感重新跑。

## 实验准备成本可以收敛

完整源码构建、当前 bundle 指纹、手机可达 origin/包体检查、正确整包交付和关键旁路的行为验证都必要。生成产物手改、拼装不同代 JS/WXML 或取消输入/前台守卫不是成本优化。

可减的是重复证明无关历史：`build-r17-cpu-text-metrics-trial.mjs::verification` 每次重新读取五个此前 trial 的全部源码及两份 bundle、原始 baseline/candidate 的全部源码及两份 bundle、normal bindings，再跑未变的 parent fixture 与新 fixture。在通常 prepare → build → inspect 顺序中，该完整 verification 会执行四次，prepare 还另行获取历史 bindings。gen22 当前复制 1,566 个源码文件，只改变 surface/controls 并新增 cache owner。这里指出代码执行次数，未测量并不声称这些步骤耗时多少分钟。

之后同类实验可继续用一个 task-local builder/manifest owner，提供少数互斥的已验证边界模式：固定一次可信 parent，继承它的完整构建/fixture 结果；每个新模式核验 parent 身份、实际输入与变更 delta，跑新增行为和受影响消费者；完整构建后核验**当前**输出及交付副本。历史 sibling trial 不是当前构建输入，无改动证据时不用每轮重哈希整条历史链。若 parent/dependency/规则变更，才重新准入受影响证据。

不要为已有 gen22 反向重构脚本，也不把实验框架抽象成为新大型工程。等下一次确有同机制分支要构建时，才在同 owner 消除这段重复。分支策略改变真正机制时仍需单独检查，不能为了共享而隐藏差异。

## 最小下一轮与停止条件

1. **先用已准备 gen22 回答一个问题**：在 gen21 冻结合成背景下，大部分精确文字测量命中缓存后，同等短时正常 Play 的明显进程增长是否仍发生。固定现有真实数据/FOV/debug 条件；记录实际 native glyph calls、hit/miss/entries 与已成功暂停状态。缓存只允许的两种 font、逐 surface 生命周期和无原生 TextMetrics 保留已有 focused fixture；不重做父层研究。
2. 继续明显增长：结束“重复 native measureText 是必要条件”的这条分支。下一步结合实际代码与高扇出 owner 的证据，在 publication/生命周期或剩余 Scene 分配中选**一个**可判别边界；不串行遍历所有可能 API。
3. 增长显著消失：结论只到被缓存替代的一组操作影响结果，包含 save/font/measure/restore 及短命 JS 工作。必须把拟议修复带回完整正常绘制、真实名字和生命周期后验证，不能把 frozen 合成版本交付，也不能单凭此断定原生 API 泄漏。
4. 机制问题得到结果就停止该诊断。一次短时 normal build 不再增长可支持这次修复验证，但不能自动关闭整个连续播放/用户体验验收；后续回到原有 PLAN 的必要正常产品证据。不要把未变化的所有 FOV/手势/平台重新扩成矩阵。

已有自动导出/guarded Pause 是正确方向，它避免模型多轮截图延迟把 20 秒实验拖成 45 秒崩溃。输入仍应来自新鲜已查看截图；实验期间无需不断打开菜单。导出失败先重试缓存的同一 payload，而不是重新播放。

## 应沉淀什么，放在哪里

优先扩展已有 `development-feedback.md#performance-measurement-boundaries` 和现有 miniapp-development/device Skill 的按需引用，暂不新建并行“性能总 Skill”。现有 Context 已有分层、最小观察、宿主内存、禁止把录屏 PTS 当 FPS 和停止规则；无需重复。新增只需：

- 一个小的“测量问题 → owner/单位/起止/有效性 → 足够证据即停止”段落，强调 schema pass 不等于非空有效工作，Page callback/React commit/accepted copy 各有边界。
- 当前 Taro Page 与组件 `setData` 分流的事实和版本复核条件，以及 profiling 能力需先证明当前 target/build 支持。版本源码是事实源，Context 不复制整份实现。
- 采样记录区间而非伪造瞬时点、保留 Play/Pause 关联和 observer effect；失败的 target heap export 不反复升级。
- task-local run 只保留 hypothesis、输入绑定、一次干预、命名计量、结果、限制和下一决策。历史数据/候选 hash/失败日志仍在 task，完整 raw heap/手机媒体仍在私有外部 owner。

最值得小幅改进的现有工具是 receipt：v1 没有 trial 名/build fingerprint、Page/TM 结构化标量，重要数值靠 UI 压缩文字转录，已实际造成 K 的解释错误。下次触碰 probe 时，在现有严格大小/白名单/幂等 collector 下加有界、命名、带窗口语义的诊断字段；必要时版本化协议，仍不要导出 payload、对象图或账户数据。无须另建遥测服务，hash 也只绑定构建输入，不声称独立读回了手机已安装字节。

最后，gen15/16 是**五个 stellar owner 的 paired GPU/星表比较**，两边都含当前 time UI/geometry。`R17-PHONE-PROBE-BUILD.json` 和 `R17-PHONE-COMPARISON.md` 已明确该事实。两边都崩溃只能说明这轮 stellar 改动不是单独差异，不能推出“时间模块改造前产品也会崩”。若要回答何时引入回归，应按实际兼容数据准备真正的时间模块前后对照；它是另一种实验，不可重命名现有 baseline 代替，也不应无依据阻塞当前已能缩小原因的工作。
