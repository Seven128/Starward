# R20 精确账户媒体退休与续批恢复

2026-10-23，Asia/Shanghai。沿原PLAN/R20执行；HEAD仍为4b5a610a1aaa76f8cf5a727dd5403af4b72d83e0，成果未提交。此文接续[媒体生命周期](R20-MEDIA-LIFECYCLE-20261023.md)与[非提醒对账](R20-OUTBOX-RECOVERY-20261023.md)，不替代原UI/设备/性能义务。

## 当前实现与责任

- 精确`DELETE_ACCOUNT_MEDIA`沿既有MEDIA规模每页最多50项。逐项savepoint保留其他项成功，失败/未知引用保原意图，当前有效引用仅退休旧清理意图；`cleanup_attempted_at`让失败项轮转，不永久挡住未尝试对象。
- migration026增加标量累计progress；不保留已退休objectKey历史。每页独立提交，最终累计结果、effect和progress行移除同事务；COMMIT回包未知不重复计数或拿最后一页冒整批结果。
- 未完成且有新进展/未尝试/锁住对象沿同eventId/jobId续批。只有失败剩余页使用原业务重试预算，正常分页超过3页不会提前截断。无新broker或额外任务身份。
- 成功页后的execution记录、外层COMMIT或Redis迁移结果未知，不记业务失败或完成。原token执行一次`moveToDelayed`，异常时最多一次`moveToWait`，以库的控制错误交还；不通过独立读状态推断旧执行仍有锁。迁移不确定保DISPATCHED，由既有absence或BullMQ stalled机制接续。
- 为防重复stall最终failed句柄永远滞留，原reconciler只对确切账户媒体事件增加终态归档：current/legacy两队列均无live/unknown且至少一个明确failed，才在同dispatch epoch及`FOR UPDATE SKIP LOCKED`下归DEAD_LETTER。句柄/剩余对象保留，原显式replay负责重放。读错/超时不授权归档，getJob和getState整个探测共用in-flight所有权。未改提醒UNKNOWN协议。

分步迁移依据[官方BullMQ模式](https://docs.bullmq.io/patterns/process-step-jobs)及本机6.0.8的`Job.moveToDelayed`、`moveToWait`、Worker控制错误处理；不把文档示例当本项目成功证明。

## 独立反例与修复

`r20_account_media_review`先发现迁移已应用但回复丢失的风险；新代理`r20_continuation_recovery`在专用PG/Redis真实复现两条：已有2次存储失败后，恢复存储并成功一页，再分别在真实Redis迁移、真实CONTINUED COMMIT之后抛丢回复。修前都误写DEAD_LETTER，尚余51项；删掉该句柄并重启runtime后dispatchBatch=0。原Redis例的队列实际失败次数仍为2，证明数据库提前扣了不存在的失败。

root修复后，同两条回归保DISPATCHED和失败次数2；句柄丢失后恢复1个原任务，最终101个对象全部退休且累计receipt仅一条。独审复核原token、有界fallback、两队列探测、epoch/行锁及累计effect事务，没有剩余must-fix。终态新例实际调用BullMQ失败迁移，证明分类与原replay；不冒称实测了stalled定时器。

## 实际检查

| 检查 | 结果与边界 |
| --- | --- |
| `outbox-account-media-persistence.test.ts` | 原4项与2条丢回复回归6/6；终态夹具改正后另1/1。原4项含201对象/活引用/失败轮转、丢续批job与worker重建、page/final真实COMMIT丢回复、迁移前失败。不是同一次7项全绿日志。 |
| `outbox-dispatch-recovery.test.ts` | root最终5/5，含完整state-read超时所有权及两队列positive terminal/unknown。 |
| `outbox-recovery-persistence.test.ts` + 普通MEDIA持久化 | 独审合跑12/12：8（含父test）+4。以前“recovery11”是unit3+integration8，不能重复计数。 |
| 原提醒持久化两文件 | 独审15/15、0skip，独立reminder专库，提醒只增加processor token透传。 |
| 原账户退休/unknown SQL隔离 | 实现阶段针对2/2通过，未重跑整份头像/贡献历史套件。 |
| 类型/差异 | 最终Mini API noEmit与定向diff-check通过。较早981/42skip全本地套件不是本批全套结果。 |

日志保留于`tmp/r20-continuation-{reply-lost-before,commit-lost-before,recovery-after,affected-after,reminder-after}.log`及`tmp/r20-terminal-recovery-after.log`。修复前失败没有删除。终态夹具最初误用BullMQ6已移除的discard，改为实际支持的UnrecoverableError后通过；root首次unit命令漏`--import tsx`导致strip-only报错，改回项目入口后5/5。两者是夹具/调用失败，未算产品缺陷或隐藏成全绿。

## 源码身份与资源

最终SHA-256：outbox-worker `cae202d0b9ca64e8d32e8d1892be4613a2096a96d718b06674ed3f8517a22cd4`；account-media-retirement `313715401dfcd20ed59218bd7e7b74101f9d4085e3ada92c27785212b535488f`；outbox-dispatch-recovery `35e97fbe1d6d6e422c2fceac96307f8d3c35e953e722a1c4f81153a76ce6d929`。

只用本聊天PG60709的outbox/account-write/reminder合成专库、Redis59459随机queue及临时实际文件；未接原55441/API8799/bridge8798。root核无PG客户端、精确data/config/进程owner后，于20:44停止PG50528和Redis81516，两个端口无监听，owner.json已更新，数据/日志保留。前批Redis80952→82828进程重启证据复用，本批未再造同一重启试验。

迁移023–026尚未施加现用共享/生产环境，真实长期运行/云对象存储及完整媒体生产验收仍保留。真机、Map/Sky、完整Play OOM和全部未完成R/H/A/N继续由HANDOFF管理。
