# E2 离线静态 source 恢复：开发结果与保留边界

本轮沿原 backup、static writer/lease 与 recovery owner，补上新备份缺少原 source 元数据的问题。正式配置的默认备份现在携带各 source 的原始 index、delivery fragment、image artifact 和精确 URL 归属；缓存 OCI 不可用时，恢复 core 仍可生成 fresh managed prepared store。未生成运行 current、回滚选择或新的 OCI 准入证明，没有部署。

## 修前缺口与实现

[上一阶段](e2-managed-sky-restore-2026-10-05.md)的 managed 恢复依赖原 cached OCI。新增的实际 configured-backup 消费者在修前明确失败：返回 `starward-sky-static-backup-v1`，未达到 source 元数据归档的 v2 合同。保留[修前日志](../tmp/offline-sky-source-failing-before-2026-10-05.log)，未倒填为通过。

- 应用备份根仍是 `starward-verified-backup-v2`。Sky component 新增 `starward-sky-static-backup-v2`，在原九项身份字段上增加 `sourceMetadataSha256`；旧 component v1 与 DB-only 根 v1 保原能力分类。
- 同一 `sky-public-<publicationHash>` payload pool 下增加不可改写的 `sources-<sha256>.json`。每个 source 保存原三份控制文件的 canonical base64，与原 inventory 的目录、顺序、revision/digest、publication 和全部 URL/body/header 对应。原源 seal 校验和 archive readback 共用原 bundle predicates；URL union 不容多出无 source 归属的记录。
- configured capture 使用原 lease，在读取、写入及完成后核对原控制 bytes 和 prepared pointer。等 publication 复用原 payload pool，不复制完整影像，也不把缺失元数据从 union 推导成原 source。
- fresh managed 恢复用同一个 `writeSkyStaticBundle`、lease、overlay 和 inventory publisher。writer 的最小可选输入保留原 index/fragment bytes；包括有效非标准 JSON 排版，仍需与实际写出的 URL/body/header 完整相符。artifact 也原样写入并复核，没有第二个 exporter 或生成的 OCI seal。
- 新 component 返回 `sourceAdmission=VERIFIED_BACKUP_RESTORED_ORIGINAL_METADATA`；旧 public-only component 仍走 `ORIGINAL_CACHED_OCI_REVALIDATED`，镜像缺失时失败。两者均是 `RESTORED_MANAGED_PREPARED_STORE`、`runtimeApplied=false`，保持无 current 的拒绝语义。

## 与真实加密备份的绑定

仅公开快照的 SHA/readback 不能证明 source 归档的来历。本轮复用现有 AES-256-GCM：默认 backup 将完整新 component 的按 key 排序的 SHA 放入 AAD；原加密 key、nonce、envelope owner 保持。恢复 core 用实际 manifest component 解密认证，再执行可选静态恢复或 DB 操作。

新 component 不能与旧无绑定密文配对；改 source digest 后重新计算 inventory/archive/component 全套 SHA，即使公开快照 readback 自洽，也不能通过原密文认证。删去 source 元数据降回旧 component 同样拒绝。manifest key 顺序变化仍正常恢复。旧 DB-only/旧 component 的历史加密路径保持兼容。

低层 `readSkyStaticBackup` / direct static restore 只证明完整性；release/retention 的现有只读校验也不代替 key 认证、许可、真实 producer/OCI 或客户端全集。真实 key 绑定证据来自下面默认 backup→recovery core 的开发消费者，而不是独立文件探针。

## 验证和实际文件

[本轮相关消费者日志](../tmp/offline-sky-source-affected-consumers-current-2026-10-06.log)：**107 PASS，0 FAIL，0 SKIP**。范围为原 promotion、release、verified-backup、recover-database、sky-static-release、sky-static-consumer、operator-preview、sky-static-bundle 八个检查模块；没有重跑 frontend/backend/旧旅程矩阵。较上一阶段增加三项 recovery 与两项 static owner 检查。

新增检查执行默认 configured `executeVerifiedBackup`、实际密文/manifest 文件、原恢复 core 和真实两张 PNG；Docker、PG 与 HTTPS 使用注入。覆盖镜像 repository 缺失/零 OCI 调用、key 顺序兼容、原 metadata bytes、同 pool 重用、无绑定/自洽重算/降级拒绝、缺失/摘要错误/artifact 错误/source 顺序错误在目标目录与 DB 副作用前失败，以及旧消费者原生命周期。没有实际远端 DB restore 或生产服务。

另一次[封存文件探针](../../../../output/sky-offline-source-backup-1006-e2-r1/result.json)只调用当前 direct capture 和 fresh managed static owner，读取原缓存中的 `telescopium.png`、`triangulum-australe.png`；不生成 DB 备份、不调用 OCI/PG/HTTP，不重建全包或启动服务。

| 实际读回 | 数值/含义 |
| --- | --- |
| 两张原 PNG 的公开 payload | 6,838B |
| 两个 source 原三份控制文件合计 | 3,176B |
| 新 encoded metadata sidecar | 4,629B |
| 备份 pool 全部六文件逻辑长度 | 14,120B，包含 metadata，不是分配盘 |
| fresh source payload＋union payload | 6,838＋6,838＝13,676B，真实副本分别计入 |
| fresh store 全部十四文件逻辑长度 | 20,216B，包含 metadata/overlay |
| 同 pool 再 capture | payload/sidecar mtime 不变；仍一个 pool |
| OCI 调用 | 0，探针 execute 遇调用即失败 |
| 原 store 文件与当前七个控制 pins | 前后相同；原十八文件保留 |
| current / lease | 无运行 current；操作结束 lease 退休 |

探针继承的 revision/digest 是原开发 fixture 合成身份，绝不补 trusted production OCI。其一次计时只描述本次软件执行，不作为压力、容量、恢复时间目标或物理去重结果。探针[源码](../scripts/exercise-offline-sky-source-2026-10-06.mjs)和[日志](../tmp/offline-sky-source-file-exercise-2026-10-06.log)封存，不再次运行覆盖。

本轮修前 bytes archive 仅覆盖最先修改的五个 source/test 文件；后来两个 crypto/recovery owner 的修前身份来自[上一阶段最终读回](continuation-verification-2026-10-05-managed-sky-restore.json)，没有伪造七文件修前 archive。当前七项改动、旧备份十八控制项的历史代次、原源、当前 page/WEAPP 与服务、六项保留业务、分支及真实远端见[本轮最终读回](continuation-verification-2026-10-06-offline-sky-source.json)。旧探针和失败日志保持原始时态。

## 当前依赖及未验义务

下一只按 PLAN 顶部推进：先核对恢复 prepared→原正式 release/current、历史回滚选择的现有消费者与最小缺口，再补有决定力的正常/失败开发路径。不能用恢复 metadata 伪造 prior current/rollback、用 injected OCI 冒真实发布，或为缺真实引用造清理规则。Q1/Q2 的新合格输入与 P1 的新控制面根因仍独立。

完整 live/off-host/application 恢复、trusted production/current/rollback/支持客户端引用全集、Linux 全机盘、物理峰及200DAU混合容量、DevTools WXML/Canvas/控件/Back、Android/iOS、新版月面、修后独审仍未验。普通 Prepared registry 保持空；矩形/外围/饱和伪影等 FAILED、第三 source-null UNKNOWN、缺证 MISSING 均保原。全部33项最终验收未整体关闭，Goal active、无预算，无提交/推送/部署/发布。
