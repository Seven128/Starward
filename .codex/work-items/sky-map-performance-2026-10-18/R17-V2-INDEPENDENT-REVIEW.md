# R17 v2 probe / accepted-action independent review

2026-10-19。独立审查 task-only v2 runtime/protocol、既有 collector 接入和 accepted-action 诊断。只写本报告；未操作手机、DevTools、feedback、服务、账号、数据库或网络端口，未读取 raw heap、媒体或私人配置，未修改产品、被审源码、PLAN、HANDOFF 或 INDEX。

## 当前审查状态

**前向 origin-8797 的 v2/collector、accepted-action 源码、恢复修复与两份完整 bundle 独立复核通过，未发现尚未修复且阻止这项 frozen/synthetic 窄对照准入的缺陷。** 仅支持由 root 选择该任务诊断候选；不是产品修复、手机结果或 R17 A/B 验收。两个实际发现及修复证据见下。

最终审查身份为 `accepted-action-direct` / generation 23 / 同一继承地址的本地桥 8797：

| 身份 | 独立读回值 |
| --- | --- |
| 当前 manifest | `tmp/r17-accepted-action-trial/accepted-action-direct-origin-8797/manifest.json` |
| manifest SHA-256 | `de10bc2376cbd526e84e706af2091a8b6e5b3e01ca798090b90027cacdc7d30c` |
| 完整 source binding SHA-256 | `e1db6155ee6ae56ea9450bb7564d63bb61a204889898d25266f2c3dd85503099` |
| probe 的预先确定 build-source binding | `da7bbb913bfc115316f4525c77e8dcf2ba36edb896e3161f9c62578ef32a117e`，parent/delta/templates/port 的绑定，不是 bundle bytes |
| 两份完整 bundle SHA-256 | `25f4742bc30f46765a286788fb10db6e81439cc7940ca6ff676738f5736d389f` |
| bundle 规模 | 两份均 338 文件 / 5,004,508 B；主包 2,016,853 B，余量 80,299 B |

两份 bundle 分别为上述 trial 的 `source/apps/wechat-miniapp/dist/weapp-check-r17-accepted-direct-8797` 与 `project/weapp`。当前 manifest/evidence/builder/templates 的实际 SHA、预构建 binding-input hash、四份差异源码的实际 SHA 全部一致；独立扫描完整编译 JS 得到 3 个文件中的 7 个桥地址 literal，唯一 trial origin 是 8797，反向替换端口的 hash 与原继承地址 hash 一致，没有混入 8795。原 e3e3e1cf… 包保留为未选中准备，当前 evidence 的 `previousPrepared.role=UNSELECTED_PREPARATION` 也一致。

## 已发现的具体问题

1. 初审 controls 的 `control("actualPlay")` 漏传真实成功结果，导致已成功的 Play 被记为 null。已即时报告；模板与原准备源码现已改为 `control("actualPlay", true)`，focused fixture 新增 true 断言并由独审重新运行通过。
2. 原 controls 只缓存 metrics，不缓存 terminal。15 秒 metrics 未入库/失败时，20 秒 terminal 会被真实 collector 以 424 拒收；之后面板重试仍只重发 metrics，无法补同次已封存 terminal。原 fixture 失败分支 mock terminal 为 200，未覆盖此边界。已报告 root/builder 并在前向 source 修复：仅保留一份已封存 serialized terminal，确认同 run metrics 已入库后才能发送；424 撤销本地依赖确认，下一次显式 metrics 重试成功后补同一字节。没有轮询、递归重试或新的 Play/Pause，hide/unmount/new case 清除状态并拦住迟到回应。独立运行更新 fixture 17 项全过；同一 fixture 在原 controls 上失败于 `r17-accepted-action-fixture.mjs:216`（缺失 metrics 时本应 5 个请求，旧路径实际 6 个），建立修复前后反证。

## 已独立运行的证据

- `node --test .../r17-phone-probe-v2.test.mjs .../r17-phone-probe-collector.test.mjs`：8/8 通过（v2 七项与 collector 一项）。覆盖真实对象身份的 A→B→A、首次 accepted 去重、superseded/duplicate、显式 clone、错配、synthetic 零真实 accepted、独立 seal、缺时钟、2,200 条事件的有界/过期行为、allowlist、v1 兼容和 collector 的 424/409/容量/并发/重试。
- v2 runtime standalone `tsc --noEmit --target ES2022 --module commonjs --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck`：通过。
- 原准备的 `verifyAcceptedActionFixture`：独立重跑通过。当前 page 完整正文等于已审查的 parent→delta 变换；source manifest 有 1,567 项、相对 gen22 恰好四项 binding 差异，四份差异文件实际 SHA 均一致。两份原 bundle 均 338 文件 / 5,003,995 B，均为上述 e3e3e1cf… 指纹。原 manifest SHA `159322f73ec1008028abd94cd9d807bddd58a9d6e014f4d97eff96ae9bea5eea`；此证据只归原未选中准备。
- 前向 origin-8797 的同一 focused fixture：17 项通过；当前 builder/templates 的实际 SHA、binding-input SHA 与新 manifest 一致，四份差异源码 hash 及完整 page 变换再次读回一致。v2 runtime/protocol 未改，复用仍有效的七项 recorder 和 collector 证据，不重复历史测试。
- 新 bundle 的两份完整 fingerprint 由独审实际重算，均为 25f4742b…389f。当前构建记录的 11 项 static checks 全 true；delta typecheck 是 parent 20 → current 20、无新增诊断，**不是**全项目零类型错误。没有重复编译历史 sibling 或重跑已准入的 CPU/cache/Scene 全链。

## 观测与产品边界核对

`acceptedPage` 的完整变换与当前 page 逐字一致。原 accepted state/ref type、functional updater、完整比较与 record、三个 null 退休点保留；shared `sky-command-state.ts` 本体不改。新 helper 立即、恰好一次求值 updater，先同步完整 ref，再 dispatch 同一个对象/null；同 identity 仍 dispatch，updater 抛错不写 ref/dispatch，dispatch 抛错保留已写 ref。direct 与 closure 只改变最终 React action 形式，完整 accepted record 仍在 React state/queue 中，不能据此排除整个 publication/React 边界。

实际完整 Scene、native RAF、初始 ready copy、冻结 facade、文字缓存、图片需求/退休与所有原 accepted 消费者都仍在原路径。fixture 还实际读回并比较了 surface、lifecycle、Scene、CPU/text helper、time owner、selected-object 与 artwork 等未受影响的 owner；page 的完整 request 字段、draw scheduling dependencies 和 accepted updater 与 parent 保持一致。没有迁移 time intent/admission、全局禁 React、缩小 state、改变资源负载或新增 writer。

v2 的 intent 从 observation-time owner 实际 `publish` 的新 public-state 对象发号，presentation memo 通过该次捕获的 `timeIntent` 精确查号，没有晚读 snapshot 或按 `at` 猜身份。原 memo 的五项 dependencies、原调用/回退和原 presentation 对象身份保留；只有请求时刻匹配的输出绑定 token/sequence，committed fallback 显式 unbound，异常保持原 throw 并以 `completed=false` 结束 span。该成本只覆盖此 memo，resource revision 当前为 null，不能代表完整 catalogue/SAO/constellation/Scene 准备。

原 frame 构建后显式 `request`，仅当原 HiPS resolve 实际克隆时 `inheritFrame`。`paintStarted` 标记消费，真实 successful display-copy/publication 路径才 `accepted`；frozen 路径只 `syntheticAccepted`。错配丢弃绑定；未知/过期计数而不重建身份。首次 accepted、superseded 输入、同 intent 和同 frame 的重复 presents 分开；旧 latest-time-conditional 分布仍保留旧意义，不能冒充新分布。`unconsumedCpuMs` 是封存时未观察到消费的已知 memo 成本，过期成本单列 unresolved，不是 request−paint 或可全部消除的浪费。

## 封存、恢复、collector 与数据保留

15 秒 export 只封 metrics，原 1 秒延迟仍在，实际 recording-start 与 seal 明确分开；20 秒原 guarded Pause 使用 latest callback/current run guard，记录 attempt 的实际 boolean/null，仅 true 才记 success。metrics 与 terminal 的重复 snapshot 返回独立副本且字节稳定；terminal 只含同 run/build/window/clock 与固定 metrics-seal，不能重写已封 metrics。新 controls 每 run 只缓存一份 metrics 和一份 terminal serialized body；依赖未到就保留 terminal，显式 metrics 成功后最多发送一次，424 后等待显式重试。重试不重复封存或 Play/Pause。replacement run、hide、unmount 与迟到 acknowledgement 都有 generation/identity fence。

collector 仍是原 route。bridge 对 auth/cookie、非 POST、原始输入超 32,768 B 和 JSON 解析失败在存储前拒绝；v1/v2/terminal 使用 exact-key allowlist，拒绝额外字段。runtime 输出的字符串只含 finite mode/run/build 与原 public identifiers；名称、报告、账号/Context binding、坐标、绝对观测时间或对象 reference 不进入新增链路。此 schema 的字符串均为 ASCII，client 的长度检查不会漏掉多字节文本；bridge 仍独立按 bytes 限制。

collector 在使用输入构造路径之前验证。一个 promise tail 串行化写入；同 run metrics 与 terminal 使用独立文件、各自 exact serialized-body 重试 200、冲突 409；已有 metrics 的 bytes 保持，terminal 必须匹配已存 v2 metrics，缺失为 424。`wx` 独占创建与 EEXIST readback 防止覆盖，两种 receipt 共用总 32 个 JSON 文件上限，容量已满仍允许相同内容重试。collector fixture 在隔离临时目录验证这些实际文件效果，没有接触 live 879x。

intent/preparation 环各 2,048 条 scalar，样本/时间集合各 2,048，public identifier 集合各 8，导出 link 最多 32；两个 WeakMap 每 256 次插入换代、不强持有 state/frame keys。新增关联中不持有 report、frame、state、caller closure、文本/payload 历史或 image；计数饱和，过期身份不冒认。TM/Page/facade 只保留首末两次命名标量与 capture 数；terminal 恢复增加的保留是一份有限 serialized string，没有无界队列、轮询或历史追加。当前 probe 观察成本必须在后继模式比较中保持一致。

## gen22 有限结论核对

已实际读取 `R17-CPU-TEXT-METRICS-RESULT.json` 命名的两份非敏感外部 JSON 回执与六份内存 NDJSON；八份文件的长度、SHA 和逐字段结构化摘录均一致，每个内存 sample 均只有一个已核前台 owner。wide 回执确为 14,002 ms、478 次 CPU Scene、8,404 BSC / 666 SAO 行、16 tiles、45°，真实 accepted 为零。wide watch PSS 2,546,106→3,050,866 KiB、Unknown 1,806,628→2,281,156 KiB；paused drain 仍高。

这些记录支持“冻结条件下仍有显著进程增长”，不支持精确速率、gen21 百分比收益、allocator 归因或正常产品修复。TM/Page 标量来自原 owner 的固定 UI 转录，v1 回执没有这些字段；本审查未读取媒体，故没有把这些转录另行声称为机器回执证据。narrow 名称路径为空的首轮仍不能证明缓存干预有效。

## 未被本次审查关闭的义务

新候选的手机绑定、同等非空负载、真实 Play/Pause、metrics/terminal 实际送达与进程内存结果由 root 接续，本报告没有操作或提前认证。冻结/synthetic 的 acceptedCopies 与 A-latency 预期仍为零；必须在完整 normal GPU/copy/caption/accepted 路径验证后才能声称交互或播放修复。这个 direct action 对照即使仍增长，也只能否定捕获 closure 是该条件下增长的必要条件，不能排除完整 React state/queue、整个 accepted publication 或其它 native/JS allocator。PLAN 的 R17 A/B 与其他 Goal 剩余义务全部保留。

