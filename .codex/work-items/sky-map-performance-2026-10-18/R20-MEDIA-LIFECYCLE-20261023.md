# R20 媒体持久登记、有限清理与恢复消费者

本批继续完整active Goal；前一轮有实际实现/验证进展。当前checkout/HEAD不变，保留全部dirty成果。本批不运行IDE/手机/ADB/preview，不动现用或冻结候选及原共享服务。PLAN的范围、UI→叠层→Sky顺序和全部未撤销义务不变。

后续精确账户媒体分支已取得[有界退休/续批与独审](R20-ACCOUNT-MEDIA-BATCHES-20261023.md)：026、逐项独立进度、同job续批及两处真实丢回复反例均已处理。下文是此前023–025/普通MEDIA批次，不能把当时未完成状态当当前方向；完整媒体部署/长期运行仍未验。

## 本批实现

- **头像写入意图**：023新增`account_avatar_write_intents`。准备事务先取得账户锁，核ACTIVE/原回执/CAS，再持久登记完整请求digest；写入事务重新锁账户和意图后才写字节，引用/回执/旧对象退休成功时移除意图。准备或写事务COMMIT回包未知不授权删除。过期意图的物理清理持行锁，活跃writer由SKIP LOCKED保护；退休tombstone保同key/digest，精确重试可重新取得许可。账户删除在同事务接管未提交头像。历史回执保持兼容的只读回放，新回执绑定完整元数据。
- **普通MEDIA维护**：头像与贡献采用各自独立事务并共用现有MEDIA job，外层仍持outbox行锁。贡献已有durable upload session/派生objectKey可追回写后回滚残留，未另造同类上传框架。024/025的attempt时间使已失败项不永久占据每一批首部；批量规模沿现有outbox维护规模，不改变用户数据上限。贡献逐对象确认，头像逐项savepoint；成功项先持久保留，再按原job重试机制处理未完成部分。
- **贡献过期**：扫描有限候选，每账户先SHARE、再按序锁父记录和上传记录，活跃账户/父记录SKIP LOCKED。EXPIRED行的objectKey是删除意图，实际删除成功并确认后才清空。普通列表/上传/移除/撤回不再运行全局对象清理，其他账户的删除失败不影响请求结果。
- **真实恢复消费者**：只读投影在原deadline准确暴露未提交上传的EXPIRED，不改变持久revision、ATTACHED或冻结attempt。显式replacement在原父锁内判断expiresAt并登记旧key，保持其他照片、单次revision及原key回放。formal intent保自身整批有效期与合同，不硬套draft替换协议。持久记录的历史轴/默认值通过同一个`normalizeContributionSubmission` owner维护。
- **跨事务确认**：贡献删除确认仅锁可取得的EXPIRED行后清空key；普通MVCC读回若仍有未确认意图则抛`contribution_media_cleanup_ack_pending`。这使包含userId的MEDIA事件在账号注销已持DELETE锁时释放外层outbox并重试；skip不等于确认，注销接管与旧事件的effect身份保留。

队列明确absence/派发代次/活跃事务与Redis重启证据归[对账记录](R20-OUTBOX-RECOVERY-20261023.md)；完整删除/审核/提交锁序与trigger/FK证据归[锁序记录](R20-CONTRIBUTION-LOCK-ORDER-20261023.md)。它们是同一媒体责任依赖，不是新的竞争方案。

## 观察与验证范围

| 路径 | 当前有效结果 |
| --- | --- |
| 头像、私有写和原profile批次 | 最后root以新专用PG/真实文件运行25/25，0skip。覆盖prepare丢回包无put、写后rollback、真实COMMIT回包丢失、跨实际expiry的活跃writer、清理与精确重试锁等待、删除接管、历史回执/活引用与原私有写屏障。 |
| 贡献原有功能 | 改为维护owner后原43项通过；新增有效期/客户端桥接后46/46通过。最初3失败是旧测试仍要求用户请求物理清理；保留实际对象断言并移至显式维护，不删掉恢复要求。 |
| 贡献有限维护真实PG/文件 | `contribution-media-maintenance-postgres.test.ts` 1/1（内含有界候选、失败轮转、独立文件成功、普通读取无清理、账户/父记录活跃锁跳过）。初轮fixture漏candidateLocation，在尚未创建上传前失败；补合规输入后通过。 |
| 到期至客户端重选 | `contribution-upload-lifetime.test.ts`以实际`uploadSelectedFile`函数源码的限定转换、Service和内存仓储串联PENDING/UPLOADED恢复；这是函数级消费者证据，不能冒完整WEAPP页面。真实PG回归另1/1，包含两状态/残留、读不改原行、单revision/回放、失败保留、最后旧图删除且新图仍在。 |
| outbox及普通MEDIA | 实现阶段合跑14/14；普通MEDIA加入独审等待环后文件4/4、0skip。真实专用Redis进程80952→82828后，job已缺失而PG仍DISPATCHED，同event恢复、真实对象删除、effect一条。不是仅模拟断连。 |
| 原提醒与锁序消费者 | 提醒真实15/15，保UNKNOWN/授权消耗；锁序6/6、上传/媒体发布3/3、准入4/4、既有擦除/receipt3/3。均为对应隔离范围，不外推真机或远端环境。 |
| 整合 | 最后Mini API noEmit通过；定向diff检查通过。上一批981通过/42skip没有在本批整套重复，不能宣称当前新增PG/Redis用例已被那个旧套件覆盖。 |

## 独审与修复前后

新独审代理`r20_media_review2`先读原媒体实现并复现：complete报过期、list仍PENDING、replacement报invalid、revision未变。它随后实施上述窄有效期修复，不能将自修称独立审阅。root已独立复核共享predicate/读投影、实际客户端调用者、持锁replacement、历史保留和两类测试：新projection不会续期或执行清理，替换仍由写owner准入，fixture/source转换不等于设备验收。

`r20_queue_lock_review`独立找到真实生产者交界：用户MEDIA事件持外层outbox锁，注销持upload DELETE并等待outbox，清理确认又等待DELETE。真实baseline在观察到`pg_stat_activity`等待后失败（fixture lock_timeout只是有界退出）；root改确认owner后，该代理再次确认ack_pending时意图仍在、外层释放、原任务重试后仅一个effect、最终DELETED及对象为空。详细结论/源码身份见[独审记录](R20-QUEUE-LOCK-INDEPENDENT-REVIEW-20261023.md)。本批所有代理已结束，未复用旧会话。

## 测试资源与仍未完成

只使用本聊天自建PG60709及新建Redis59459，未接原55441/8799/8798。测试结束root已按owner核验并停止两服务；PG数据、Redis配置及日志保留在任务tmp的`r20-owned-pg-ebf43edc084147a5a861d73157969816`和`r20-owned-redis-71c645fa5369491c945423c31e5867d9`。名字/PID只证明记录当时，未来须读真实状态。第一次PowerShell数组构造形成一个未用的合并数据库名，已改显式数组创建正确专库；未用测试库保留，未重置任何原数据库。

**媒体责任尚未整体完成**：精确分支的代码与本机验证现归[后续批次](R20-ACCOUNT-MEDIA-BATCHES-20261023.md)，不再继续旧整批方案。部署迁移023–026/真实长期运行、管理legacy幂等/跨窗口未知恢复/缓存持久补偿、UI/设备/原生资源及Sky OOM等全部保留。不要因局部文件清理或队列恢复通过关闭整个性能Goal。
