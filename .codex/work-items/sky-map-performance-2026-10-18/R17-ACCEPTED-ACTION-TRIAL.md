# R17 finite accepted-action trial

2026-10-19。沿当前 PLAN 的 accepted-publication 窄边界继续，依据 `R17-PUBLICATION-REVIEW.md`；唯一产品路径干预是 accepted setter 的最终 React action 形式。任务专用源码、完整 WEAPP 构建及证据位于本 work item，生产源码和已有 gen22/历史 trial 不改。当前构建状态和最终指纹以配套 JSON 为准；本文不宣称手机结果。

## 有限 mode 与直接 parent

`scripts/build-r17-accepted-action-trial.mjs` 只接受 `accepted-action-direct`、`accepted-action-closure` 两种 build-time mode。先完整构建 direct，closure 仅保留同一入口供后续有证据需要时使用，本次不建立第二个手机候选。

直接 parent 为已完成 gen22 CPU/text-metrics trial：source manifest SHA-256 `8c0a1a0fb006da9bb9b953d83c9e4eaf6d40efaed544f6cea6817e0f0c5fd639`，完整 source binding `4b700a7a83e0b49154cc56f59680718e013d819e500196eab496c506688b28c4`，两份完整 bundle 均为 `da4eedbb6cf06bd895c53bd06b6f414c021e1ab4f8df4840533927cebc48b842`。首次 admission 读取当前 gen22 的完整 source、manifest、证据及两份 bundle；后续操作复用该 admission 和原有 CPU/cache 验证，不遍历五个历史 sibling 或重放全链 fixture。

## 精确干预与继承

新 helper `r17-accepted-action.ts` 保留原 updater 的立即、恰好一次求值，先同步完整 ref，再调用一次原 React dispatch。direct 发送同一 `next` 对象或 null；closure 发送 `() => next`。同 identity 仍 dispatch，updater 抛错不写 ref/dispatch，dispatch 抛错保留已完成的 ref 写入。完整 accepted state type、原 equality/updater、三个 null 退休点和所有实际消费者保留。

原完整 CPU Scene、文字缓存、冻结 facade、synthetic publication、首次 native ready copy、图片加载与退休、相机、选择反馈和原 native RAF 不变。禁止 Apply、pick 和 Sources；诊断 label 含明确的 mode。冻结画面仍不能证明正常 renderer、真实 accepted copy、像素或 R17 A/B 验收。

## v2 观察接入

复用 [v2 probe](scripts/R17-PROBE-V2.md) 的 runtime/protocol，不建立第二个 collector。source delta 限于 page、controls、v2 runtime 与新 accepted helper。`buildGeneration=23`；`buildSourceSha256` 是生成前确定的 parent+delta/template binding，不是手机最终 bundle bytes，最终 bundle 指纹另记在构建 JSON。

page 只在原 `timePresentation` memo 的实际执行范围发放 preparation token，原 memo dependencies 与返回 presentation 对象身份保持。此 span 只涵盖该次 presentation preparation，不能代表 base、SAO、constellations 或全部 CPU。关联使用 observation-time owner 实际发布的 public-state identity，随同完整 request frame 显式传播到 resolve clone；committed fallback 保留 unbound，绝不按相同时间字符串猜 identity。相同 token 的多次 request、repaint 与重复 accepted 分开记录；synthetic 仅进入独立 scalar，不冒充真实 accepted/A latency。

正常产品 Play 触发计量，原 15 秒 metrics export 和 20 秒 guarded original Pause 保留。15 秒封存 CPU/Scene/time/标量窗口；20 秒先记 attempt，读取原 latest callback 的实际 boolean/null，只有 true 记 success，再封存同 runId 的单份 terminal serialized bytes。只有 metrics 已确认 stored 才发 terminal；晚到的 metrics 成功或手动重导出可以最多补发一次同 bytes。terminal 424 会撤销本地依赖确认，等待下一次显式 metrics 导出，不创建轮询或递归重试、不重放 Play/Pause。terminalExport 记录封存时的导出请求，实际 HTTP 到达由 collector 收据建立。hide、unmount、新 case 会清除待发/确认状态，并阻止晚到响应发出旧 terminal；原失败与 runStartAt guard 保留。

## 本地 origin 恢复

首份完整 direct/8795 构建保留在 `tmp/r17-accepted-action-trial/accepted-action-direct/`，是 **UNSELECTED_PREPARATION**，其 source/result 不覆盖。旧 builder 字节与构建证据另存于同一 tmp root 的 `inherited-8795-*`，用于保留已封存绑定。

root 已确认原账号服务保持，并从手机真实核验同一 bridge 的 8797 HTTP 可达。依其恢复指令，同一 builder 增加第 5 个有限参数 `8795|8797`。8797 使用全新 `accepted-action-direct-origin-8797/source` 与 `project` 目录，复用 gen22 已编译的同一物理地址，仅替换本地 bridge port；完整重新构建，不修改生成 JS。port 只进入 manifest/build-input hash，runtime binding 仍是已审查的四字段。新 bundle 会检查全部编译 bridge literals 只有选定 origin，最终指纹在 JSON 中；root 仍负责实际唯一候选选择与手机绑定。

## 验证与使用

focused fixture 验证 direct/closure action 类型、完整 state/ref identity、立即求值、A→B→A、相等值、null 与异常；验证原 memo/result/完整 request/draw deps、fallback unbound 和 preparation 失败；执行实际 task controls 与原 page Play/Pause guard，检查 15 秒 metrics、20 秒同 run terminal、replacement run、hidden/unmount 和导出失败。v2 自有 7 项测试由其 owner 保留。父候选未变的 CPU/cache/Scene/native/image 证据继承，当前 source readback 与完整 delta typecheck/构建/包体/readback 单独记录。

```powershell
node .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-accepted-action-trial.mjs prepare accepted-action-direct 23 8797
node .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-accepted-action-trial.mjs build accepted-action-direct 23 8797
node .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-accepted-action-trial.mjs inspect accepted-action-direct 23 8797
```

当前 isolated source/project 位于 `tmp/r17-accepted-action-trial/accepted-action-direct-origin-8797/`。builder 只读取本地输入/生成产物，不访问或重启服务，不操作手机、DevTools 或 feedback。完整 source 构建之后再复制为 project/weapp，不能编辑生成 JS。

## 当前构建结果

8797 direct23 已完成 `prepare → build → inspect`：1,567 份 source binding，source SHA-256 `e1db6155ee6ae56ea9450bb7564d63bb61a204889898d25266f2c3dd85503099`，manifest SHA-256 `de10bc2376cbd526e84e706af2091a8b6e5b3e01ca798090b90027cacdc7d30c`。生成 bundle 与 `project/weapp` readback 均为 `25f4742bc30f46765a286788fb10db6e81439cc7940ca6ff676738f5736d389f`，338 文件、5,004,508 bytes。main 2,016,853 bytes、余量 80,299 bytes；sky 1,347,932 bytes。三个生成 JS 中共七处 bridge literal 均为选定 8797 origin，没有残留 8795 trial origin。

17 项 focused 检查通过；delta typecheck 为父候选 20 条、当前 20 条、新增 0，不能称全量类型检查无错误。11 项现有完整构建静态检查通过，当前 source 与两份 bundle readback 通过。初次 checker 曾把同一既有 TS7016 消息中的不同 source-root 路径误计为新增，已修正路径归一化并保留 task-local 证据；未因此修改产品代码。手机运行、内存结果和实际候选选择仍归 root，当前构建不建立这些结论。

若同等有效工作量下增长继续，只能排除 accepted action 捕获闭包在该条件下是增长的必要条件；完整 record 仍在 React state/update queue。若增长显著改变，仍需对正常 renderer/copy/caption/accepted 路径及同样负载复核；必要时用同一 builder 的 closure mode 控制相同 v2 观察成本。任何冻结诊断都不关闭 R17 A/B、图像质量或长期内存义务。
