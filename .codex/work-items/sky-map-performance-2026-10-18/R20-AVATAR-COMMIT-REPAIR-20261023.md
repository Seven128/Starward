# R20 头像提交安全与旧媒体退休：第一批实现

## 授权与范围

用户已明确恢复本分叉完整Goal、开始实施，并将微信开发者工具和手机调试后置。沿原PLAN R20先交付已提交头像保护；不操作IDE/手机/ADB/preview，不重启现用PG/API/bridge，不更新冻结候选。

本批修改提交、回放和旧对象退休的责任边界，未完成整个媒体/队列重构。

## 实现

- `MiniappService.saveAccountAvatar`只在仓储持有账户事务、通过ACTIVE/幂等回放/CAS检查后执行对象写入。对象key纳入预期profile revision，防止后续不同版本重新占用已退休key；旧收据回放不重新上传或重设当前引用。
- `PostgresMiniappRepository.saveAccountAvatar`在同一事务提交新引用、回执、旧对象退休意图与MEDIA outbox事件。复用现有`account_deletion_media_queue`及`DELETE_ACCOUNT_MEDIA`协议，无新schema或broker；账户删除也复用该入队owner。
- 用户请求不执行旧对象删除，不因提交错误盲删新对象。数据库COMMIT的结果未知时保留字节，允许原payload/revision/key重试。回放校验版本、MIME、zoom和revision。
- `account-media-retirement.ts`在既有worker事务中消费持久意图。删除失败保留意图；当前头像或规范媒体引用优先于历史退休意图；无效引用读回不能成为删除许可。禁用媒体store抛明确不可用，不误确认清理。
- 内存测试仓储同步真实边界，历史头像收据不再覆写较新的对象引用。Context旧“先写再补偿”说明已更新，并明确仍缺完整孤儿清理。

## 验证与失败记录

1. 修复前新增3项行为回归全部失败，分别为旧文件删除错误、已提交新头像`account_avatar_object_missing`、CAS拒绝前仍发生第3次上传；既有2项通过。不是仅断言实现形状。
2. 修复后`node ../../tools/run-node.cjs --import tsx --test src/account-profile.test.ts`为5/5通过，验证当前头像真实非空读回、相同重试和历史回放。
3. 本轮新建独立PG cluster于任务tmp/r20-owned-pg-ebf43edc084147a5a861d73157969816，监听127.0.0.1:60709；仅使用新建`starward_account_write_20261023`数据库。真实迁移和真实LocalFilesystemMediaObjectStore，不连接历史55441或其它调试服务。生命周期由root统一控制；完成后状态另见HANDOFF，创建记录不代表仍运行。
4. 真实数据库检查使用`ACCOUNT_PRIVATE_WRITE_TEST_DATABASE_URL`和现有受限数据库名合同，运行`--test-concurrency=1 src/account-media-retirement-postgres.test.ts src/account-private-write-postgres.test.ts src/account-profile.test.ts`。首轮17通过/1失败，失败为新测试key过短、尚未进入提交故障注入；改为合法key后18/18通过、无skip。
5. 18项包含：真实COMMIT后故障注入丢回执、同键并发只上传一次、实际队列和MEDIA事件读回、另一仓储实例读回持久意图、禁用/失败删除保留队列、成功重试/重复消费、当前引用保护、既有删号后私有写拒绝以及两种收藏/删除真实行锁顺序。不是完整删除/审核锁序证明，也不是实际BullMQ/Redis重启验收。
6. Mini API noEmit在首批源码修改后通过。后续共享admin改动属于另一并行责任，最终类型结果按整合批次记录，不以早期通过覆盖新代码。

## 独立审查

新建代理`r20_avatar_review`独立审查实际diff/调用者并运行头像5项测试与定向diff检查。发现禁用store空成功会丢意图、旧删号回归仍要求先put两项必须修复，均已修正。其复测确认禁用store抛错且不ack，当前5/5通过；未找到当前支持路径重新发布退休头像key的正常竞争。审阅后代理已关闭。root随后补齐上述18项真实数据库/文件验证；不将root新增验证称作代理已执行。

## 保留义务

- 写入成功后事务回滚/结果长期未知的孤儿对象，仍需持久staging与引用对账；本批采用保数据安全，不声称无孤儿或存储已完整回落。
- Contribution读/写路径仍有全局cleanup，完整持久退休、容量/批次限制待后续同owner整合。
- 非提醒DISPATCHED事件在Redis job丢失时的恢复尚未实施；真实BullMQ执行/重启缺口保留，提醒UNKNOWN语义不改。
- 账户删除/审核既有完整锁顺序问题未修；收藏两种排序通过不能替代该验证。
- 设备UI/性能、R28、正常Play OOM及全部原R/H/A/N义务不因本批通过关闭。
