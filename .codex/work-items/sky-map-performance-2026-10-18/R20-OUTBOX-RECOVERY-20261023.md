# R20 非提醒 Outbox 对账证据（2026-10-23）

范围：PLAN R20 媒体职责中的非提醒 DISPATCHED 丢 job 恢复及普通 MEDIA sweep 维护接线。复用当前 checkout、PostgreSQL/BullMQ 与 event/effect 身份；未操作 DevTools、手机、共享调试服务或冻结构建。独立审查仍由本轮 owner 集成，不把本记录当完整 Goal 验收。

最新精确账户媒体续批、两处真实丢回复修复及终态分类见[后续批次](R20-ACCOUNT-MEDIA-BATCHES-20261023.md)。absence规则保持；仅确切账户媒体的positive failed且无live/unknown peer可在同epoch/行锁下归档死信，句柄不删除、不自动重发，getState纳入原probe所有权。下方11/14/Redis进程重启是此前有效范围，最新新增/受影响检查另列，不冒同一全套。

## 当前实现

- `outbox-dispatch-recovery.ts` 是非提醒队列缺失对账 owner。只在当前与 legacy queue 的 `getJob` 都成功返回 undefined 时候选；任意现存 handle（包括无法判定状态）、读取错误和超时都不等于缺失。
- 对照本机已安装 BullMQ 6.0.8：`QueueGetters.getJob` → `Job.fromId` → `RedisQueueBackend.getJobData`，只有成功 HGETALL 得到空数据才返回 undefined。没有删除 active/waiting/failed/completed/unknown handle 来强行触发恢复。
- 网络探测全部在数据库锁外。恢复时用 DISPATCHED 与扫描所得完整微秒精度 `dispatched_at` 检查同一派发代次，再 `FOR UPDATE SKIP LOCKED`。现有所有 queue.add 派发持同一 outbox 行锁并更新该时间；并发新派发要么仍持锁，要么代次已经变化。
- 单个 probe 保留尚未结束的全部 Redis 读取。超时只报告 unknown；即使一条读先失败，另一条读未 settle 时后续轮次也不再排新命令，不让断网每轮累积请求。
- 有界 keyset 扫描覆盖后续页；普通 worker 周期与 one-shot 的 idle drain 都能继续对账。恢复保留 eventId、业务 payload、effectKey、尝试计数和提醒语义。
- worker 的失败落账按所观察派发代次条件更新，且不把 COMPLETE outbox/execution 改回失败；已提交后丢失 COMMIT 回包仍由现有 effect receipt 防重复副作用。

### 普通 MEDIA sweep

复用 root 的贡献维护 owner 与头像意图维护 owner，依次执行贡献 cleanup、独立 repository pool 事务中的头像 retirement；两者执行期间保留外层 outbox 行锁，头像锁不会跨越贡献账户锁等待。头像事务 COMMIT 后再据 `failedIntentCount` 触发 job 重试。贡献失败也继续尝试头像；任一失败不写成功 effect，却保留另一 owner 已提交的进度。

该分支成功返回 `MEDIA_MAINTAINED` 与本次维护计数，去掉旧的固定“上传流水线禁用”声明；无其它代码消费者依赖旧字段。精确 `DELETE_ACCOUNT_MEDIA` 继续使用原独立 batch 协议，其后续 partial/fairness 处理由 root 的退休 owner 审查，不由本记录冒称已经完成。

## 实际检查

专用环境由 root 创建和管理：PG `starward_outbox_b18f445389a2`，Redis 59459。本测试只使用随机 `starward-outbox-recovery-*` queue、专用合成库和临时本地对象目录。连接串不作为部署配置。

- `outbox-dispatch-recovery.test.ts` + `outbox-recovery-persistence.test.ts`：**11/11 通过、0 跳过**（含父 test），真实 PG/BullMQ 集成涵盖现存/legacy handle、提醒排除、读错误/超时不改数据库、活跃 PG 事务跳过、微秒代次竞态、有界后页扫描、非空本地对象实际删除与 durable effect、worker 重启后的同 event 不重复删除，以及真实 COMMIT 完成后注入丢回包的重试。probe 还单独验证并发一读拒绝/另一读悬挂时不会新增命令。
- 新增 `outbox-media-maintenance-persistence.test.ts` **3/3 通过**；与前述两文件在同专用库顺序合跑最终 **14/14 通过、0 跳过**。贡献存储故障时头像已退休且重试不重复删除；头像一坏一好时好头像与贡献 ack 已提交，坏意图保留。两方向均实际达到 DEAD_LETTER，解除故障后通过真实 `replayDeadLetter` 完成同一 event，effect 仅一条。migration 023/024/025 通过 fixture 正常 migrate 后使用。
- 既有 `plan-reminder-dispatcher-persistence.test.ts`、`reminder-attempt-persistence.test.ts` 在独立 `starward_reminder_b18f445389a2` 与随机 reminder queue：**15/15 通过、0 跳过**。包括并发授权消耗、UNKNOWN 不重发、取消/删除/改期、真实 NOTIFICATION 锁释放及 effect 失败后的重放，不把非提醒策略套到提醒。
- 最后一项丢回包反例执行了真实 PG COMMIT，然后仅在返回给 worker 时抛错。BullMQ 自动重试，两次执行均保留 COMPLETE，effect 只有一条。
- Mini API `tsc --noEmit -p workers/miniapp-api/tsconfig.json` exit 0。针对本次文件的 `git diff --check` 无空白错误。

### 实际 Redis 进程重启

复用脚本 `tmp/r20-outbox-redis-restart.mts`，先核真实 job 和 PG DISPATCHED，再停在 READY 等 root 操作。root 核实独占服务 owner 后，对专用 59459 执行 shutdown nosave，并从同一配置重新启动；PID **80952 → 82828**、PONG 成功。该专用服务关闭持久化以制造明确丢 job，不能外推为生产 Redis 配置。

原 probe 27431 继续后 exit 0：

- event `7456503a-ed45-4465-8b46-0ed810f91fc6` 的 Redis job 确认不存在，PG 仍为 DISPATCHED。
- 通过真实 `OutboxWorkerRuntime.dispatchBatch` 恢复同 event，MEDIA worker 删除实际临时本地对象并持久完成。
- 结果 `ACTUAL_REDIS_RESTART_RECOVERED`，`effectCount=1`、`deletedObjectCount=1`；对象 readback 为 null。
- 断连时出现 ECONNRESET；连接恢复后才判定 job 缺失，没有将网络错误转成 absence。没有启停其它 Redis/PG/调试服务。

## 修复过程与界限

初轮 fixture 的 UUID/text 参数推断与对象 key 格式错误已修。丢 COMMIT 回包 fixture 首次未保留 pg Pool.connect 的 callback overload，导致观察等待；仅中止自己的测试进程，修复 overload 和精确 event 归属后相关检查通过。中断遗留的合成记录曾触发一次计数失败，后续真实 worker 完成该原 event；没有把 harness 失败伪称产品失败或丢弃义务。

普通 MEDIA 新 fixture 的 WGS84 system 与 PG 时间参数类型准备错误已经修正，并只精确清理了本 fixture 的四条未派发记录；修复后的实际 sweep 三项及合跑十四项通过。

证据覆盖当前本地 PG、现有 BullMQ 和临时对象存储的行为，不代表生产部署、云对象存储或设备验收。Reminder UNKNOWN/授权消耗未改写。所有正常 Play OOM、UI/叠层/Sky、其它 R/H/A/N 义务仍在原 HANDOFF。
