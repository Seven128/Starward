# E2 恢复后的原发布、current 与旧 digest 消费者

前阶段沿原 `release.mjs`、preview/current loader、backup 和 static writer/lease，修复正式 release 接受无认证绑定新 Sky component 的反例。该阶段进程/网络为注入；2026-10-07新增本地真实PG与隔离Caddy证据见末段，不能倒改旧阶段时态。没有部署或制作生产 prior current/rollback 证明。

## 反例与修复

新 source-capable component 的原 GCM 绑定已由[上一阶段 recovery core](e2-offline-sky-source-2026-10-06.md)执行；正式 release 原先仅验证公开快照、密文长度/SHA 和 manifest 的 restore 状态。新的真实消费者使用两张原 PNG、实际默认 `executeVerifiedBackup` 文件，再把密文换成无 component 绑定的有效 GCM 密文并同步 manifest SHA。修前正式 release 仍成功：[日志](../tmp/restored-release-auth-failing-before-2026-10-06.log)明确 `Missing expected rejection: unbound`，不是 mock 先报错。

仅新 `starward-sky-static-backup-v2` component 增加 release 认证：读取原 key owner、调用原 `decryptBackup` 核完整 component/AAD 与 GCM tag，在任何 Compose/迁移/服务动作前拒绝无绑定、自洽重算 source identity、损坏密文和错误 key。认证失败记录 `release_backup_sky_authentication_invalid`；不记录 key、dump 或原 crypto 异常内容。成功记录 `AES_256_GCM_BOUND_COMPONENT_VERIFIED`，清零本函数持有的 key/返回 dump buffer。

读取前复用 recovery 现有 `maxBackupBytes + 4096` envelope 上限；解密后沿原512B最小/配置最大 dump 限制。没有新加密设施、持久化明文、通用恢复框架或旧 DB-only/component v1 能力升级。release 峰值还包括认证时的密文/明文临时 buffer，未测物理峰，不能把有界当4GB/生产容量通过。

## 实际开发消费者

[当前相关检查](../tmp/restored-release-affected-consumers-current-2026-10-06.log)：**112 PASS、0 FAIL、0 SKIP**；沿前阶段八个相关模块，新增五项消费者检查。原107检查保前阶段日志，不覆盖为当前。

| 消费者 | 实际结果 |
| --- | --- |
| 正式 release 认证失败 | 四类失败均在进程/HTTP前拒绝；failed receipt 无已通过 backup/delivery，原 prepared pointer bytes 不变 |
| 正式 release 正常 | 原恢复 source→默认 configured backup→默认 prepare/verify→真实 receipt；两PNG共6,838B、GET/GET/HEAD、原overlay；仅检查选定应用 OCI revision，无source重新提取 |
| envelope 有界 | 1MiB配置下超过原 envelope 上限的文件在读取/认证与进程前拒绝 |
| 保留旧 digest | 新 revision 静态验证失败后，原 prepared URL/source保留；按原文档生成旧revision/digest descriptor与fresh默认认证backup，再走同一 release；两PNG/union不减、source不重拷，两个成功receipt和一个failed receipt原样保留 |
| preview current | fresh prepared 尚无current时check明确失败；原默认deploy/backup/verify通过后才写current，原loader随后读成功receipt/挂载/overlay；旧digest验证失败保原pointer，成功旧digestdeploy后才切换pointer，随后原check通过 |

以上真实文件路径在每项检查自己的 `starward-release-env-*` 系统临时目录运行；仅该可再生成 fixture 在绝对路径/前缀核验后清理。读取[前阶段已封存的原两PNG/source archive](../../../../output/sky-offline-source-backup-1006-e2-r1/result.json)，该输出/原store不改、不重跑。fixture source revision/digest仍是合成身份；应用旧image/schema/accepted writes、Docker/PG/runtime discovery、readiness/TLS和HTTP均注入，不能声称真实回滚兼容、target服务恢复或生产current。

正式 release 只产生正式 receipt，未伪造 preview current。preview current 的文件更新由原 `operatePreview` 在正常完成后执行；新检查未注入 prepare/verify/backup/loader替身。旧digest回滚仍要求真实schema与已接受写入兼容，fresh备份不能代替这个决定。

修前[两文件原字节](../tmp/restored-release-before-2026-10-06/source-pins.json)、[初次认证/正常消费者](../tmp/restored-release-auth-and-file-consumers-first-2026-10-06.log)、[旧digest消费者](../tmp/restored-release-prior-consumer-first-2026-10-06.log)、[current消费者](../tmp/restored-preview-current-consumer-first-2026-10-06.log)全部保留。[最终时态/HEAD读回](continuation-verification-2026-10-06-restored-release-consumers.json)核本轮仅原release owner和消费者test变化、原源/封存文件、旧证据控制代次、六项业务、现WEAPP/watch/服务和真实远端。

## 下一依赖和保留义务

恢复→原发布/current/保留旧digest的开发消费者已补本轮边界。操作说明已列出两种互斥的显式静态恢复选项及 fresh prepared 的含义。真实host/current/rollback/client引用全集、Linux全机盘、全应用/off-host恢复、物理峰与200DAU仍缺；无部署/清理授权。

此前转Q1的下一步已执行并由当前PLAN替代，本文不维护另一套下一步。具体失败源、普通Prepared空及无新根因不循环P1的边界保持。

全部33项最终验收、已知FAILED/UNKNOWN/MISSING、DevTools/Android/iOS/新版月面、修后独审保持未完成；此前active只属该历史阶段，本次Goal实际blocked、无预算且用户授权继续，无提交/推送/部署/发布。

## 2026-10-07 本地真实PG与恢复出口增量

复用原封存两PNG/source sidecar及现有backup/recovery/static owner，单一当前探针位于任务tmp/live-pg-verification.mjs。现Starward demo PG仅创建本轮自有随机临时库；不停止共享服务、不修改旧数据库。最小公开引用fixture的真实pg_dump/pg_restore、GCM绑定、原managed writer和两个HTTP正文读回通过，既有16数据库名单前后相同、全部自有临时库清理。实际3,149B dump不含真实用户数据，随机key仅内存，结束清零；保留envelope不能当后续可操作恢复备份。

进一步沿原迁移owner在自有空库执行全部22个Mini Program应用迁移，重复执行新增0；真实backup/隔离restore后MAX版本`022_plan_reminder_subscription_challenges`、public表/视图列结构580项相同，含PostGIS和本轮引用fixture，不冒76个业务表。174,192B真实dump及两条公开URL/hash/正文6,838B读回通过；生产用户/全业务引用与可恢复保管key仍不由此供应。原20份封存/managed文件和对应控制代次保原，每阶段pins分别归属，不把旧控制pins改成当前。

空库首次启用实证发现旧CASE查询仍解析不存在的schema_migrations，返回relation-does-not-exist；已修verified-backup的schemaVersion，先单独catalog存在性查询，仅存在时读取public表，未知catalog读回拒绝，迁移/恢复版本语义不变。旧实际失败见`output/sky-live-pg-verification/empty-schema-before.json`；修后原owner真实空库返回EMPTY_UNINITIALIZED。现八模块120 PASS/0 FAIL/0 SKIP，初次fixture适配失败日志保留；现有迁移runner及22SQL均未改。

复用本机缓存Caddy的实际image ID，在独占临时容器只读挂载恢复publication及原生成delivery.caddy，两个GET正文/hash/原headers和static标记一致，未出版路径404。首次局部探针Caddyfile单行block语法FAILED已保留，修为标准多行后通过；不是原生成片段故障。镜像无pull/重建，测试容器已核自身label并移除，原运行容器名单未变。

原始结果：[最小真实PG](../../../../output/sky-live-pg-verification/result.json)、[真实Caddy挂载/出口](../../../../output/sky-live-pg-verification/caddy-readback.json)、[真实应用迁移/隔离restore](../../../../output/sky-live-pg-application-schema/result.json)、[120影响检查](../../../../output/sky-live-pg-application-schema/affected-owner-checks.log)。这是本机公开fixture恢复证据：完整应用数据/真实引用、完整recovery facade与服务切换、Caddy TLS/API fallback、trusted生产OCI/current/rollback、off-host、Linux物理峰/混合200DAU、设备与最终独审仍MISSING/UNVERIFIED。没有生产部署/发布/外联，全部33项仍开放；下一仅按PLAN。

同一探针的`--application-consumers`路径再复用现有`insertExplicitTestSpot`（生产形状的隔离测试记录，非真实现场核验）、PostgresMiniappRepository及ObservationContextService，不扩测试矩阵或复制脚本。22原迁移→正式发布门禁形状的公开fixture→正常getSpot/getDetail→原备份/隔离restore→新repository实际读取，地点和详情完整deepEqual。原Context是48h cache，不在PG dump中；新MemoryCache get旧ID明确not-found，原owner用相同公开地点/日期/时刻重新resolve，new ID且原fingerprint、时区、选定时刻、夜间边界、privacyClass一致，随后get新ID读回成功。这不是既有Context被备份，也不是Redis/客户端Back恢复或报告/天文渲染通过。

实际读回见[原持久化消费者结果](../../../../output/sky-live-pg-consumers/result.json)：原控制/source 10 pins和20封存文件不变，原16数据库名单不变，自有临时库全部退出；无共享Redis读写、供应商请求、服务启动/停止或BFF切换。现有repository、Context/cache owner和fixture源码未改。该局部消费者已补，完整应用接受写入、全引用/媒体/Redis/outbox、生产key保管与live/off-host/current/rollback仍缺，只有PLAN维护下一依赖。
