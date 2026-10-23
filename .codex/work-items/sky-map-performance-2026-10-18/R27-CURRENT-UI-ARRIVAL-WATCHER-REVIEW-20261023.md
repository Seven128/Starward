# R27 当前 UI 到达 watcher 独立审查

## 结论与范围

2026-10-23。对 Root 本次修改的原宿主 watcher 及其隔离 consumer 检查，**未发现新增的已确认 P1/P2**。有限 R27/current-ui 接线可继续使用；这不认证真实 R27 手机包已经到达、提前落盘、非空回调关联、内存归因或产品验收。

审查者只读代码、修改前精确原件、冻结 manifest 和相关协议，独立运行一条指定现有测试，并新增本文。没有运行真实 watcher，没有操作手机、IDE、ADB、预览或服务，没有写实际 collector、构建或修改冻结包、生产代码、PLAN、HANDOFF、INDEX。使用了当前开发 Skill、性能调查方法及相关 Context 的证据解释边界。

## 输入与冻结身份

修改前两份文件实际 SHA 与私有 `r27-current-ui-arrivals-20261023/before.private.json` 完全一致，未以 Git 是否跟踪代替原件比较。

| 输入 | 本次实际身份 |
| --- | --- |
| 原 watcher 修改前 | 3,393 B，`32998c5a08ed1a9466b6b6081cff2f66da49dd9577b926ce2d3c7f046ee0cdd1` |
| [当前 watcher](scripts/r25-watch-checkpoint-arrivals.mjs) | 5,028 B，`ae36d58d2e369e1fb7ed0981e5475c7cea311e5af46eb38d30ffaf893537a331` |
| 原 R27 test 修改前 | 10,286 B，`cc102b592ca68810332aa4be472b80b72a080aa91f61d50e0711345f661bce08` |
| [当前 R27 test](scripts/r27-memory-checkpoint.test.mjs) | 13,413 B，`b89539660c40fa3aef528f0b35970a747e0ddc96f75b7bc48eaa919f3ec9b49d` |
| gen31 固定 manifest | `34c003743125b49a507f8d935543fd82c87662be1de27e4ed14feba8344a63d5`；generation 31，source `920c9e0292fae9bdd331291a9b50d0dc357f3efb15d6b073bfbe686ca573c3b3` |
| gen32 固定 manifest | `b833bc3f203d79b31ada34b9bb3dedc5b887c7708a4d48518ae8da2058529ecb`；generation 32，source `3808382a6b7fc8dee945b1bfe42e563fa6793182d80dd6a99253c58f4aa88c3c` |

gen32 任务目录的 manifest 与私有 `frozen-gen32-originals/trial/manifest.json` 实际字节 SHA 相同。三个 checkpoint validator 沿用原 R25→R26→R27 严格协议。冻结 manifest 绑定的 R27 test 仍为修改前 `cc102…`；新增宿主 consumer test 是当前 `b895…`，不能改写为所有当前模板仍与冻结时相同。该宿主检查变化不构成手机包已变更的证据，也不需要重建冻结包。

## 参数、来源与责任边界

- `[]` 和仅 `--review-r26` 保持原 R25/R26 固定目录。新增仅 `--review-r27` 选择固定 gen31，附 `--current-ui` 选择固定 gen32；重复参数、R26/R27 混用、current-ui 单独使用及未知参数拒绝。不提供任意目录、generation、source 或输出覆盖参数。
- 导入 consumer helper 不会启动 watcher；只有直接执行入口才读原 USB runtime 和所选固定 manifest。主循环只读实际 collector，输出仍限于原私有 arrivals JSONL，使用 `wx` 创建。没有新网络请求、collector store、服务控制或手机输入。
- 记录先匹配 manifest generation，再通过对应严格 schema/validator、source hash 和文件名中的 runId/sequence 一致性。跨 generation 返回空；同 generation 的错 schema、错 source 或错命名抛错，不能靠 R27 标签把 R26 内容升级。
- R27 新增摘要仅 callback phase、capability 和样本数量。原 protocol 保留最多 8 个样本、原 32 KiB 包上限与既有所有者解释；摘要不输出函数源码、原对象或闭包，不把 Query option 的占位解释为到 aggregate 的强引用根。

## 并发、失败与终态语义

读取失败或 JSON 未完成时不记入 seen，下个既有 tick 可重读。语义校验失败立即退出；`readdir`、manifest/runtime 或输出写入失败同样不会产生正常 finished 回执。已验证后才加入 seen 并写摘要，实际原字节计算大小和 SHA；原 collector 的不可变同字节重送责任没有迁移到 watcher。

原外层 120,000 ms 窗口、250 ms 等待和原私有输出范围保持不变；没有扩大扫描、重试或采集预算。窗口在循环边界判断，文件 I/O 时间不能据此冒称精确 120 秒物理录制。`end` 结束后续外层轮询，当前目录迭代仍可处理其他文件；`finished: true` 只表示该 watcher 正常结束，`observed: 0` / `ended: false` 不认证任何目标证据。

**沿用的解释限制：** watcher 没有锁定唯一新 run，也没有排除启动前同 generation/source 的文件。这类文件会被实际读回，相应 end 也可能结束观察；`hostObservedAt` 是此次宿主读回时刻，`currentEndAlreadyPresent` 只标记该点为 end，不能单独证明新到达或首次落盘。继续沿 [既有恢复准备](R27-LIVE-COLLECTOR-RESUME-PREPARATION-20261023.md) 在运行前重核目录清单、保存新文件名/真实 baseline，并绑定实际新手机 session 与同 run 后续点。不得把不同 run 汇总成一条增长曲线。该限制存在于原 watcher，本次有限接线没有新增；当前实际新 R27 到达仍须另取证。

## 实际隔离检查

审查者使用 Node `v24.19.0` 独立执行：

```powershell
node --test --test-name-pattern='arrival watcher admits' .codex/work-items/sky-map-performance-2026-10-18/scripts/r27-memory-checkpoint.test.mjs
```

结果 **1 test / 1 pass / 0 fail / 0 skipped**，总时长 442.6204 ms。实际加载完整原 adapter/observer、当前 QueryClient 和本次 watcher 导出的 consumer；Taro request、时钟和 WeakRef 仅在既有 VM fixture 内控制，不发送真实 HTTP，也不运行其他用例的隔离 collector store。

该条明确检查 baseline 的空 callback 摘要，以及 active-5 的 **1 个 aggregate / 1 个 supported callback 样本**；还检查 generation 拒绝、partial/null JSON、错 source、错 filename、R26 冒充 R27 和原 R26 合法内容。它不是仅凭导入成功或空数组通过。fixture 的 source 是受控值，不能替代真实 frozen-source 手机包；此次也没有执行真实 120 秒文件到达循环、验证 OS 文件并发写入或终态退出时序。后三者的代码责任已只读审查，其实际运行证据留待必要目标窗口。

## 保留义务

允许继续的是原 watcher 的有限宿主接线。实际 R27 准入须读回新 schema/source/generation/sequence=1 baseline；非空关联须另看 active-5 与原 ID，drain-10 的新观察须区别于后续包携带的旧观察。提前持久化、WeakRef 目标能力、callback/Query 生命状态、观察成本和 OOM/持有根均未由本审查认证。UI、叠层及 Sky 六字段的既有未完成义务保持原状。
