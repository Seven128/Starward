# R20 outbox 与贡献锁序独立审阅（2026-10-23）

结论：本轮发现一个必须修复的 MEDIA/账户注销等待环，已由 root 修复并用失败前/修复后的真实 PostgreSQL、BullMQ 和文件结果验证。当前所审责任未发现剩余必须修复项。这个结论不关闭其余 R20、原 R/H/A/N 或设备/OOM 义务。

## 范围与已有证据

审阅当前 dirty checkout 的 `outbox-dispatch-recovery.ts`、`outbox-worker.ts`、`contribution-transaction-locks.ts`、`account-data-erasure.ts`、`contribution-media-maintenance.ts`，以及 `postgres-repository.ts` 的实际调用者。顺着 MEDIA 外层事务、媒体确认、账户删除、审核、媒体审核、merge、PUBLISH、draft/formal 写入与 migration 009/010/012/013/014 的 trigger/FK 检查，未将 helper 的局部顺序当作完整事务顺序。

复用并核对 [队列证据](R20-OUTBOX-RECOVERY-20261023.md) 与 [贡献锁证据](R20-CONTRIBUTION-LOCK-ORDER-20261023.md) 的实际断言及源码：此前队列恢复 11、ordinary MEDIA partial 3、提醒 15、锁冲突 6、上传/媒体发布 3、准入 4、纯投影 3 项结果各自保留其范围；本审阅者没有将这些全部重跑。专用 Redis 进程重启的 80952→82828 与实际同 event 恢复来自该已有记录，非本审阅者另做的重启。

本审阅者未修改生产代码、未启动/停止服务。只有 root 明确分配专用库后，新增下面的真实回归并执行；IDE、手机、共享 PG/API/桥及冻结构建未操作。

## 发现并修复的等待环

普通 MEDIA worker 在 `#process` 持有 outbox event 的 `FOR UPDATE`，随后调用独立事务的贡献维护。expiry 提交之后，对象删除和 `acknowledgeContributionMediaDeletion` 之间存在合法并发窗口：

1. 实际投稿产生的 `ContributionMediaUploadCreated` event 带 `payload.userId`；worker 持有其 outbox 锁，expiry 已把媒体提交为 EXPIRED。
2. 对象删除等待期间，同一账户的真实 `deleteAccount` 取得账户/投稿锁、删除上传行，并在擦除身份关联的 `UPDATE outbox_events` 等 worker。
3. 原 ack 的直接 `UPDATE contribution_media_uploads` 等注销的未提交 DELETE；外层 worker 又在应用内等待该独立 ack 连接。数据库只看到后两条等待边，外层持锁连接处于应用等待，不能依赖数据库死锁检测自动恢复。

旧 ordinary MEDIA fixture 使用不带 userId 的维护 sweep，因此此前 partial/retry 成功没有覆盖这个交界。

root 将两种媒体表的 ack 改为：先用 `FOR UPDATE SKIP LOCKED` 取得可确认的 EXPIRED 行，再置空 object key；最后用普通 MVCC 读回是否仍有相应 EXPIRED object key。未确认为空时抛出 `contribution_media_cleanup_ack_pending`，使 worker 回滚外层 outbox 事务并按原队列机制重试。跳过被另一事务占用的行不会被当作确认完成。

## 新的实证

用例位于 `workers/miniapp-api/src/outbox-media-maintenance-persistence.test.ts`：`a user-origin MEDIA sweep cannot hold account erasure behind its cleanup acknowledgement`。

- root 分配的独占 PostgreSQL 库：`starward_outbox_b18f445389a4`；专用 Redis 59459 的随机 `starward-outbox-recovery-*` queue；对象为临时本地合成字节。没有应用任何生产配置。
- 使用实际 `ContributionService.createDraft/createUpload` 产生带 userId 的 event，经真实 `dispatchBatch` 和 MEDIA worker 执行；使用实际 `deleteAccount`。只暂停真实 store 删除的完成时机，不伪造 SQL 行或数据库锁。
- 先通过 `pg_stat_activity` 确认注销确实在 `UPDATE outbox_events` 等锁，再放行对象删除进入 ack。
- **修复前：1 fail、exit 1**，用例耗时约 5,622ms；错误是 `cleanup acknowledgement blocked account erasure: error: canceling statement due to lock timeout`。4,500ms lock timeout 是 fixture 的有界退出条件，不是生产恢复机制。
- **修复后：完整该文件 4/4 通过、0 跳过、exit 0**。新增用例约 738ms，另外两个独立 owner 故障/重放子例也通过。
- 新用例明确捕获 `ack_pending`，此时读回 EXPIRED/object key 仍在；随后原 BullMQ 重试产生 FAILED(ack_pending) → 单一 COMPLETE 和一条 effect。账户最终为 DELETED，上传行不存在，投稿私有正文已擦除，真实对象读取为 null。不能仅以“不超时”作为成功依据。
- Mini API `tsc --noEmit -p workers/miniapp-api/tsconfig.json` exit 0；相关文件 `git diff --check` 无空白错误。全部测试进程、随机 queue 和连接已由 fixture 正常关闭；服务/数据库的保留或停止仍归 root。

## 其余审阅结论

- 非提醒恢复仅将两个 queue 成功返回 undefined 作为 absence；任何 handle、错误、超时不触发恢复。超时/一支拒绝后，全部未 settle 的 Redis 读取仍归同一 pending probe，不逐轮追加命令。
- Redis 读取在 PG 锁外；DISPATCHED + 完整精度 dispatched_at 的 CAS 和 `SKIP LOCKED` 防止抢占已变代次或正在持有行锁的执行。keyset 页不是只重看第一批。失败写回同样受所观察代次与非 COMPLETE 状态约束，已提交 effect/execution 不被丢 COMMIT 回包改回失败。
- 新恢复显式排除全部映射为 NOTIFICATION 的 event；既有 reminder UNKNOWN、授权消耗和外部派发事务责任未被非提醒策略替换。
- 管理贡献写入先取得账户 SHARE，再可选 canonical spot，再 submission，之后才取 case/media/revision；实际用户写入的账户锁模式与 migration 009 trigger 一致。原生数据库 trigger 和父子 FK 没有被绕过。
- PUBLISH 在 canonical spot 之前取得已知 owner 集合；在 spot 锁内重新核对，只对“新增 owner 且尚未业务写入”做最多三次新事务重选。修订冲突、数据库错误和未知提交结果不被这条分支盲目重试。
- 擦除后的投稿被排除在 publication 更新之外，已独立成立的 canonical 公共事实、merge 关系和发布历史继续按原边界保留。既有锁序测试涵盖前后顺序和隐私结果，不是普遍无死锁证明。

审阅时 SHA-256：

| 文件 | SHA-256 |
| --- | --- |
| outbox-media-maintenance-persistence.test.ts | b6c0768d6615de5a7992e1b3789469a8e8ae36662e93ad4e924a607ec270f339 |
| outbox-worker.ts | d205c445e5404ad3be90e582cd2b7f5c9fce34719c90524be1549e5c4fb07868 |
| outbox-dispatch-recovery.ts | e828c107c3eaa04f324ceb2e6946df7011cb724d99e83c08d4751e24acc0f856 |
| contribution-transaction-locks.ts | 6c71dc5f77b0c3ba4a9bce4b4f1774fd5b0b434c9117f928603f31e5c145a03d |
| contribution-media-maintenance.ts | 786e09b36a9ec3077377069be4409649e6d9da61be3218f4bbc5240011e111be |
| account-data-erasure.ts | 6fbfe041c62bdb72fb8d52990d79d2f8d8d9e43b6b771caf0a8d3b82ace44783 |
| postgres-repository.ts | a9c0a8e5131f96f9ebb2b72f0da51dc20718cce4e8f236de58cf7d41f398b5d7 |

源码身份是本次检查记录，不将共享文件后续修改自动纳入结论。本结果仍不证明生产 Redis/云对象存储/部署、所有可能并发组合、手机/UI/Map/Sky 或正常 Play 内存/OOM 已完成。
