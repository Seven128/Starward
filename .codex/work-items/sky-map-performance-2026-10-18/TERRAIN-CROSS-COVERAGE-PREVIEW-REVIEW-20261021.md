# 地形跨覆盖父图候选独立审查

2026-10-21。独立只读检查当前四个生产文件及其 Map、Spot、光害、文件和受控退出消费者；没有修改生产代码或测试，没有操作手机、IDE、服务、构建、推送、提交或上传。仅写本报告及相邻 JSON。

**未发现本次跨覆盖候选新增的 P1/P2，可继续完整候选的有界手机观察。** 这不是跨覆盖性能或无内存泄漏验收。候选应实际证明旧 fine A → 覆盖新视窗的 parent B → fine B；r19 的旧录像只证明先前的同 ID 地形更新及仍存在的覆盖缺口，没有证明本次父图分支。

## 审查依据与身份

完整读取实现报告和 `R19-NATIVE-OVERLAY-PHONE-REVIEW.md`，检查四文件当前实现及 Git diff，追踪 `terrain-overlay-coverage`、`use-raster-image`、`use-resource-query`、Map 的两层 installer、Map→Sky/重新加载入口和 Spot 点位消费者。性能证据解释遵循开发 skill 的 performance-investigation 方法。HEAD 及当前工作区包含前序未提交修复；本审查绑定完整文件哈希，不把全部 Git diff 都当成本次新变化。

| 生产文件（相对 `apps/wechat-miniapp/src/`） | SHA-256 |
| --- | --- |
| `hooks/use-terrain-overlay.ts` | `c2a446c2e383b25da748cd134f51a805acdabbefeeed3324e6d945e10bec3438` |
| `pages/map/use-map-raster-installation.ts` | `ab0769adccbd331e1312b25e048b049ce3f6f092ac1279ec9e52d53aa49257ed` |
| `pages/map/map-ground-overlay.ts` | `1dc86c0af9c551a9de87175b7038bc3ed3cf8358742e0140e303669f6708e349` |
| `pages/map/index.tsx` | `9e62b429a15c8ded708be75f037ec9d14be619912875bb1779c7c9e1143cff1e` |

四哈希与实现报告一致。相关四文件 `git diff --check` 为 exit 0。

## 关键结论

| 边界 | 源码/受控检查结果 |
| --- | --- |
| 实际视窗与缓冲区 | Map 的细图请求继续用 `mapTerrainBounds`，父图准入另传 `nativeViewport.bounds`。已有 target 覆盖实际视窗时，单纯缓冲边缘超出或更细请求不会准入父图。范围来自 target 原始边界，不移动或拉伸旧图。 |
| 当前身份与迟到父图 | 实际 target 采用处再次执行准入；当前 identity 的 fine 已排队也拒绝 parent。`useTerrainOverlay` 通过当前 query identity、完整覆盖校验、细图优先及完成后关闭 optional read，避免旧响应重新获得显示资格。parent 不进入细图 coverage hysteresis。 |
| 同 ID 能力消失 | `canReplace` 使用真实命令 context 观察到的能力，pending/unknown/debt 阻止新跨覆盖准入。跨覆盖 parent 携带 `same-id-only` 到派发处；能力此时缺席会保留原实际 target，释放未派发 parent pin，不走第二半透明 slot。普通 fine 保留既有缺能力兼容路径。 |
| 初始父图恢复 | 空表面仍可用初始 parent；同 identity 的本地文件恢复保留 `compatible`。跨覆盖 parent 的恢复保留严格策略，fine 接管后才恢复普通策略；没有把新限制扩散到 Spot 点位/radius 路径。 |
| 失败、超时与迟到 | 同 ID 更新交给 native 后同时保留旧、新文件；未知结果撤下已呈现来源声明。重复失败清理不继续增加原生文件；真正成功 remove 才释放 pin。迟到回调仍受原 slot/file 身份约束，不退休后继文件。 |
| 受控退出/取消 | `suspendForExit` 阻止 effect 重装，Map→Sky 和显式重新加载先等两个独立 installer 真正清理。取消恢复最新 target 及 replacement 策略，不能恢复过时捕获。实际 redirect 已发出后仍沿既有不可取消边界处理。 |

原生成功回执依然不等于物理像素完成或 GPU 释放；上述最后两行只证明当前受控 JS/native 回调模型中的所有权行为。

## 有限复查

复用实现者已完成的 92/92 与 miniapp typecheck，不重跑全套。独审选跑 11 个既有行为检查，全部通过，覆盖：实时准入撤销不重启 fine、A→parent B→fine B 的 ID/bounds/pin、准入后 update 消失、parent update 失败与清理欠债、update 超时迟到、pending update 期间 suspend、实际视窗/缓冲区分离、可取消退出恢复最新源、初始 parent 恢复、fine 已排队拒绝迟到 parent、缺 update 的跨覆盖拒绝。准确命令、名称和结果见相邻 JSON。

这些检查部分使用提取源码的 hook 状态模拟，native API 由受控回调提供；它们能检查状态和资源协议，不能证明手机调度、半透明像素合成、原子换图、可见延迟或实际内存回收。没有以测试耗时推导产品 FPS 或吞吐。

## 保留的后续义务

下一步仍是当前完整候选的真实 Map 地形＋光害观察：确保出现新的实际视窗缺口，确认 parent 的真实覆盖和临时来源，再由当前 fine 接管；检查透明区、错位、细节恢复和停止交互后的正确终态。连续快速缩小/移动、云层及三层组合仍须沿原 PLAN 完成；不因一次代表路径通过就泛化验收。

外部非受控 Map teardown 缺少可靠原生销毁围栏仍是既有未决项；受控 pin 归零不能消除它，也不能证明目标堆/GPU 无泄漏。Sky 两个重点、Memory 图/保留证据及完整 Goal 没有因本审查而完成。

`map-and-finder.md` 当前仍写初始父图/两 slot 的旧范围，后续与候选采用合批更新时应替换为最终实际采用的准入和同 ID 责任；本报告没有自行扩大 Context，也不以文档旧句否定用户已授权、PLAN 已列的有界跨覆盖试验。
