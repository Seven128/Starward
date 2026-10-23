# 栅格删除失败恢复：独立审阅

2026-10-21。独立审阅 [原问题](R22-OVERLAY-LIFETIME-OWNER-AUDIT-20261021.md)、[修复记录](R22-RASTER-CLEANUP-RETRY-REPAIR-20261021.md)、当前资源 owner／测试及实际 Hook、adapter 和 native pin 消费者。**本次修复没有尚存 P1/P2 阻断项，可进入后续整合候选。** 这不关闭整体叠层资源、native pending 或手机验收。

## 被审变更与结论

- `raster-image-resources.ts:76–90` 的生产差异仅为 `makeRoom` 的申请内失败路径集合及候选过滤。每次调用重新建立集合，旧 `cleanupFailed` 文件能在下一次实际预算需求中重试；本次失败后，所有同物理路径 alias 均不再成为本次候选。
- 每轮成功至少 detach 一个 entry，或释放实际文件；失败将其物理路径加入本次集合。准入 mutation 串行执行，不会在等待期间不断加入新的候选，因此持续删除失败仍会有界结束并返回 `raster_image_budget_busy`。没有新增轮询、定时器或资源预算。
- 回收前仍要求无 readers、无 pins、未在删除。若别名仍有合法 reader／pin，只 detach 空闲逻辑 entry，不删除物理文件或扣减 `readyBytes`。真正 unlink 前将该路径的所有 alias 标记为 removing，`retainPath` 继续拒绝取得正在删除的文件。
- 删除失败仍保留 `entries`、`files`、`physicalSizes` 与字节账本，并记录 `cleanupFailed`。只有 adapter 确认完成，才扣减物理大小并 detach 全部 alias；成功后失败标记随已删除 entry 退休，没有把重试发起当作文件消失。
- 两个准入调用点仍在原串行 owner：取得下载名额时 `makeRoom(1, 0)`，实际文件到达时按新增物理字节 `makeRoom(0, delta)`。取消、失败下载回收、close、native pin 释放和已有完整性检查未改动。这里的“一次”指一次预算准入调用，不冒称整个下载生命周期只会调用一次回收。

真实消费者仍由 `useRasterImage` 在重试时再次 acquire；共享 `mapRasterFiles` 保持八文件／16 MiB／两下载。`createRasterFileAdapter` 原样转交平台 unlink 结果，`map-raster-files` 仅将明确的文件不存在响应视为删除成功。native coordinator 仍通过原 `retainPath` 持有文件；本修复不干预其 ack 或超时资格。云量 polygons 不经过此文件 owner，不能由这项修复代验。

## 回归与证据边界

实际对比冻结 r22 源与当前代码时，先仅剔除冻结候选的两个已知 `terrainWait` 诊断插入；得到原 owner SHA `2ae75bcb7233097f5d17783de3c692a848aeee26a3c409b28ec3330da4a5457e`，与原审阅一致。随后仅存在上述 `makeRoom` 差异，没有借比较覆盖或改写冻结文件。

测试差异是既有内存 adapter 的实际删除尝试记录，以及两条行为回归。第一条检查临时失败后下一需求能删除 A、取得 C，同时 B 的 pin 和实际字节保持；第二条检查同路径 alias 在连续失败中每次申请只有一次真实 remove，恢复后保留同一 owner 成功准入。修前 filter 永久跳过失败 entry，且未失败 alias 可在同次申请再次 unlink，分别与这两条期待直接冲突。实现记录报告修前两项均失败；本独审核了对应原字节与断言，没有重造或倒填历史失败输出。

为直接查看修后输出，仅运行两个新增行为用例：

`node tools/run-node.cjs --import tsx --test --test-name-pattern 'later demand retries|one budget request' apps/wechat-miniapp/src/services/raster-image-resources.test.ts`

实际退出 0，2/2 通过。没有重跑完整 owner／adapter／typecheck 矩阵；实现记录中的 9/9、4/4 和 typecheck 保持其原执行归属。本次用例不删除真实文件，也不提供手机 unlink 失败或资源回落证据。

## 被审字节与剩余义务

| 文件 | SHA-256 |
| --- | --- |
| `apps/wechat-miniapp/src/services/raster-image-resources.ts` | `db2291fbb31e0484ce35cb06a73d012eb4cf5f93e28d45f61bb3527c1ffc26d3` |
| `apps/wechat-miniapp/src/services/raster-image-resources.test.ts` | `411d40341c15551bc9d621e28e33699b2b4395e790e2771fff0249cf13895f10` |
| `apps/wechat-miniapp/src/services/map-raster-files.ts` | `d3ad99cc48e9a569efe1c9cd32a9a4bc361678448584360c89c17744f70e00d9` |

本次只新增本报告；没有修改生产／测试、PLAN/HANDOFF，没有设备、IDE、服务、构建、Git 或数据上传操作。冻结 r22 的同包 Stable 对照应继续使用其原字节；后续完整候选再带入本修复。原生永久 pending、外部卸载／同名实例、三层连续操作与实际资源回落、Sky allocation failure 和完整 Goal 均保留未完成。
