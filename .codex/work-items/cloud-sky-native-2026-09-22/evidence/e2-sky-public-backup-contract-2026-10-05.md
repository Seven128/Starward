# E2：已绑定静态库存的公开资源备份与隔离恢复

已在原 backup/release/preview/retention/recovery 消费者补齐 **已绑定 store** 的公开资源快照增量。Sky 已配置时生成 `starward-verified-backup-v2`，保存可读回的公开 URL 并集；无 Sky 配置的 DB v1 保持原合同。原 33 项没有全项最终通过，Goal 仍 active、无预算。这不是生产备份全集、部署或恢复演练证明。

## 实际缺口、范围和决定

直接读取 `verified-backup.mjs`、`backup-maintenance.mjs`、`recover-database.mjs`/两恢复 owner、`release.mjs`、`promote-release-candidate.mjs`、`operator-preview.mjs`、`sky-static-release.mjs`/retention CLI、`tools/miniapp/backup-restore.mjs` 及相应实际调用者。旧正式备份只验证 PostgreSQL，Sky 配置的 release 也只验证该 DB v1；本地 development DB utility 是另一 DB-only 工具，不把它当 Sky 备份或改变其业务。

- 新 `tools/deployment/sky-static-backup.mjs` 只负责共享公开快照合同、读回和隔离恢复，复用原 `mergeSkyStaticBundles`/`writeSkyStaticBundle`、route/header/hash/普通文件检查，不新增 exporter、巡天、租约或清理框架。
- `captureSkyStaticBackup` 在原 static-release owner 使用同一个 lease 和 OCI seal/history-union 校验。standalone backup 获取/释放原 lease；preview 把已加载 delivery 传给备份并借用其**仍有效**的 lease，不能再锁自己或借已释放对象。记录范围是 `RETAINED_PUBLIC_URL_UNION`，不是 running current、成功发布或支持客户端全集。包括已绑定保留源及旧 URL，也可能含尚未部署的 prepared 源。
- 一个 publication hash 对应一个新的 `sky-public-<hash>/publication` 数据池。相同并集再次备份只验证并复用数据；实际 inventory 的小型 hash 命名 sidecar 原样保留，不把重复来源/镜像版本压成同一来历。新池经原 writer 完成/读回，已有池损坏则拒绝、不覆盖；异常阶段保留。
- 根 backup v2 增加固定大小的 `skyStaticBackup` 身份，inventory source 列表在独立 sidecar，不扩旧 DB manifest 的条目长度。DB 加密、schema restore 验证、临时 DB 退休及旧七日策略不变；公开静态文件无私人数据，不混入 DB dump、env/key 或业务备份。
- 配置 Sky 的正式 release 在 Compose/pull 前拒绝 DB-only v1，并读回 v2 的真实文件、hash、headers 和 sidecar。pre-deployment backup 不被误要求等于**未来候选**的 union；原 release 的候选绑定、生产确认、staging 资格、原 static 验证及 lease 退休继续。
- DB maintenance 识别 v2 并验证其公开快照，但七日过期仍只处理匹配的加密 DB 文件及 manifest，**不删除公开数据池、旧 URL 或 sidecar**。本轮实际 apply 只在明示、限定临时测试夹具中；没有实际业务清理。
- 原 recovery 接受 DB v1/v2；v2 的 Sky 损坏在 DB 动作前拒绝。显式 `--sky-restore-directory` 和 `--confirm-sky-publication-hash` 通过原 writer 恢复到新的隔离目录，不覆盖 backup/current store 或现有输出。没有选此参数时 v2 只验证公开快照并恢复 DB；v2 recovery receipt 明记 `runtimeApplied=false`，不能拿 DB cutover 或隔离文件恢复称为 Sky/current/整应用切换。旧 DB v1 不被改写为有 Sky 的版本。
- 原 retention CLI 新增本地 backup 观察：校验所选目录的实际 encrypted 身份、v2 快照及来源，绑定**真实存在**的同 hash generation/已绑定 source。旧 v1、other lane、unsupported schema、缺 store 引用各有状态；读失败/损坏/观察变化拒绝，不变成空集。完整性验证缓存键绑定全部 component 字段，不能用同 pool 已验结果忽略另一 manifest 的虚报字节。仍 `referenceCompleteness=UNVERIFIED`、`deletableBytes=null`；不把本地选集当 off-host/rollback/client 全集。

## 修前反例与当前检查

原始代码/测试在 `tmp/sky-backup-before-2026-10-05/`，追加必要消费者的旧源码在 `tmp/sky-static-consumer-before-backup-2026-10-05.mjs`、`tmp/operator-preview-test-support-before-backup-2026-10-05.mjs`。这是本次增量之前的工作区内容，不回退 Git 或原未提交成果。

1. `tmp/sky-backup-release-failing-before-2026-10-05.log`：配置 Sky 的 DB-only backup 被原流程接受并到达 process 边界，新增要求先失败；修后在任何 process 前拒绝。
2. `tmp/sky-backup-cache-identity-failing-before-2026-10-05.log`、对应 before-cache-fix 源码/测试：同数据池第二份 manifest 虚报 bytes 时遗漏拒绝；完整 component cache key 修后拒绝。
3. `tmp/sky-backup-boundary-first-2026-10-05.log` 的 2 pass/1 fail 保原；失败是测试把损坏**旧单图池**错认成未创建的新两图池，并非产品回归。旧坏池不使另一并集失效；修夹具先绑定/损坏所测当前池后通过。原 first-test 副本保留。
4. 旧 static consumer 的 DB v1 夹具在新 guard 下失效，日志 `tmp/sky-backup-static-consumer-before-migration-2026-10-05.log` 保原。已迁到实际文件快照夹具，未放松 guard；其中实际默认 preview loader→默认 backup consumer 验证旧 current/新 prepared 并存及原 lease 借用。

当前 `tmp/sky-backup-consumers-current-2026-10-05.log` 为 **89 pass / 0 fail / 0 skip**，覆盖 8 个直接影响 owner/caller 文件：release、verified-backup、DB recovery、static release、static consumer、operator-preview、原 bundle、promotion；没有复跑已闭合 UI/HTTP/物理分配矩阵。正常旧/新并集、borrow/退休、相同 pool 复用、headers/逐文件隔离恢复、路径/确认/覆盖拒绝、损坏/错误身份、v1 兼容、DB 到期不删 Sky、回滚及 release 静态资格均有相应开发检查。测试里的 PG/Docker/Compose/HTTP 响应是夹具，未动现有数据库/容器/服务，不完成真实远端恢复或独审。

## 实际文件增量与保留限制

`scripts/exercise-sky-public-backup-2026-10-05.mjs` / `output/sky-public-backup-1005-e2-r1/` 实际调用原 lease/capture 和新 read/restore。复用已保留的 `output/sky-static-owner-independent-1002-r4/normal-store`：两个真实星座 PNG、旧/新 immutable URL，总 **6,838 B**，union `238ed3c88e3b9f7dd71062f9b849ae6cb64dac151ee60aa0f20c0f6675263d66`。两 source 的 `111…`/`222…` OCI 身份是**继承的开发夹具**，不是 trusted production image；没有新增虚构 DB/生产备份记录或以此补生产缺证。

实际新增一个公开数据池和一个隔离恢复，二者各 6,838 payload B，另有 metadata；再次 capture 没有新增数据池，已写数据修改时刻未变。两原 PNG→backup→restore 字节完全一致、records/headers 原样；原 store 全部 18 文件的长度/hash 与 18 个控制源码前后相同，lease 最终不存在。虚报 byte identity 和错误 publication 确认均被拒绝，错误确认没有输出目录。timings 是本次软件标量，不外推整主机/容量；这是文件副本，不称物理 dedup。无下载、图像加工、OCI build/pull/再提取、HTTP replay、DB 动作、服务启动、远端操作或部署。

尚未关闭：

- **正式首次启用/空 store 迁移**：`promoteReleaseCandidate` 在 pull/preparation 前调用 standalone backup；新 Sky guard 需要已有已绑定 inventory，不把空目录或 candidate 当旧 current。已有 store 的正常/失败路径已验证，首次启用正式 lane 的正常依赖仍欠缺；下一直接沿原 promotion/backup/release/preparation owner 闭合，不绕过 v2 guard、不捏造生产历史/回滚记录或执行部署。
- 此公开快照恢复的是公共文件/headers，**不是 managed source provenance/OCI admission、live mount/current pointer 或全应用恢复**。实际已有 selected fixture 的身份只证明其有限开发绑定；从备份恢复 managed store 的安全准入、真正 rollback/client/备份引用全集及 off-host durability 未验。
- 已知生产名称查询失败、trusted current/rollback/client/Sky 实际备份输入 MISSING/UNVERIFIED 保原，旧 input probe 的 11 pins 保历史 epoch；本轮确有 owner source 增量，不重跑旧清点或把旧 unchanged 断言冒当前。
- 515 frontend/173 backend 当前 page 输入未改；普通 Prepared registry 仍空，M87 不采用/原外围及图质 FAILED 保原。watch3432、BFF24040、IDE13736 不重启，P1 无新根因不循环 SDK。DevTools/Android/iOS、新月面、物理峰/全机盘/混合200DAU、修后独审及全量最终验收继续未通过。

所有改动未提交/推送。唯一下一依赖以 [PLAN](../PLAN.md) 为准；本轮读回/保留与本地、真实远端 HEAD 再核见 `continuation-verification-2026-10-05-sky-backup.json`。
