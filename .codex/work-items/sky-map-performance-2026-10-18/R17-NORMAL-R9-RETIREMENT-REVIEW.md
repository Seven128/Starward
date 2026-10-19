# r9 task-only 退休观察独立审查

结论：**PREBUILD_REVIEW_PASS_RUNTIME_UNVERIFIED**，未发现 P1/P2。审查日期 2026-10-19。可由 root 按现有完整流水线准备、构建和核对 r9；本结论不绑定手机，也不关闭 Sky B。

审查了 [r9 范围](R17-NORMAL-R9-RETIREMENT-OBSERVATION.md)、实际三个 task 文件差异、生产 `sky-canvas-surface.ts`、原 controls、v3 runtime/strict dispatcher，以及 r8 冻结 manifest 和实际源码。未操作设备、ADB、IDE、服务、feedback、build、preview 或 Git 写入；未修改受审三个文件。以下 SHA256 对应本次审查的实际字节：

| 文件 | SHA256 |
| --- | --- |
| `scripts/build-r17-normal-baseline-v3.mjs` | `d706a76fa1f8b9e410b943d177f21035eea5ab99a468bef951bf9364d875103e` |
| `scripts/r17-normal-observations.ts` | `9f0fb5922771ca0719bbd647f558ac492c442bc32b65111f5a557dabff49d17a` |
| `scripts/r17-normal-baseline-v3-fixture.mjs` | `7b7a17af6861def2b5f81f800f92c2ca95f81322e714552ff7fd1cce6a7abcf8` |

原 `disposed` guard 仍先于观察；重复 dispose 不再调用 native teardown 或写回执。selection 的原异常仍继续抛出并阻止原本就未执行的后续步骤；context loss 与 node/display 四项赋值继续各自容错。`finally` 的 complete 回执在实际 teardown 后逐字段读取尺寸和 context loss，每项读取失败保存 null；extension 不支持、没有调用、返回、抛错均可区分。`outcome=returned` 不保证每个独立步骤成功，也不等于 GPU 分配回收。

观察状态只保存明确复制的 scalar 及固定形状记录。surface reader 位于原 factory/dispose 生命周期内，没有交给观察模块；观察模块的 storage writer 不捕获 native surface/context/teardown 回调。per-frame 路径只增加有界数值计数，无 JSON 或 Storage。每个 source binding 只覆盖一个 own-key；surface ID 与最后 surface 检查防止旧 surface 的迟到退休覆盖新记录。被拒事件只保留数量，不能据此证明其它 generation 已清理。构造计数从原尺寸有效性检查之后开始，copy 计数覆盖该模块的观察范围，并非独立的每 surface GPU 计数。

60s 仅替换同一条 guarded Pause timer；仍以实际产品 Play 为开始，保留 generation、实际播放代次、隐藏和卸载 guard。15s snapshot 仍封存约14s active metrics 并取消 recorder 的45s deadline，产品继续 Play。60s 回调晚到至 60.025s 时，相对时间按既有60000上限成为 null，严格协议接受；没有扩展旧 schema，也没有把15s metrics解释为60s全窗。Pause 回执保存实际 callback 结果和 Date.now wall stamp，不能证明单调时钟或精确耗时。30s paused drain 由 root 既有设备/进程观察承担。

独立复核使用 builder 原 `preparedSources` 函数的内存导出：仅把相对 import 和 import.meta URL 指向原文件，导出既有函数，不调用 `main` 或写 candidate。TypeScript 为5.9.3；这次实际执行的是 fixture 的 transpile/runtime 检查，不冒充完整 candidate typecheck。

- r9 内存 overlay：**25/25**，包括实际 post-teardown 字段、失败/unsupported/null、selection 原异常、Storage 失败、重复 dispose、旧 surface 迟到，以及59.999s仍播放、60.025s null、same-run/hide/unmount、503/424/迟到回包和原 strict dispatcher。
- 原 r8 实际冻结源码经同一 fixture 历史分支：**21/21**。
- 8个有限 argv 场景：**8/8**。r9 必须 observe-a1，拒绝混合 revision、重复和未知 flag；r8/r7 合法入口保留。
- 当前1573个生产输入全部与 r8 manifest 的 production binding 相同。r8 manifest `c888e807494165c375c4d1c0379c39b72a790dcfea1936bfb05bb63abe629722`、map report `e69113388f4e7162dca438ca37d09c1a86032621cde1ac02bb6e1767ccc97025`、surface/controls/observer 冻结源码及当前 preparation 的审查前后 hash 相等。

root 构建前仍应确认上述三个受审文件 hash。完整构建、delta typecheck、映射与主包预算，以及实际新候选送达均尚未在本审查执行。真机需在 ready 保存绑定的 session/surface ID，在至少60s正常 Play、成功正常 Pause、至少30s drain和实际 Map退出后精确读取同一 source key。缺失、绑定不符、仅 ready/attempt、Storage失败或不匹配 generation 均保留 UNKNOWN；即使 complete且尺寸归零/contextLost=true，也只证明该 surface 的退休边界，不能替代引用图、其它进程 scope、持续播放表现或完整 B 验收。
