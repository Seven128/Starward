# E2首次静态启用：正常消费者与失败边界（2026-10-05）

当前正式 Sky promotion 已补齐空 store 的开发路径：沿原候选、环境验证、OCI 准入、静态库存、备份和发布 owner，将候选的 Compose version/config/pull 与静态 preparation 移到备份前。同一原 lease 贯穿公开快照、DB backup 与后续 release；DB 备份仍在迁移前验证。没有部署、运行真实 Docker/PG/HTTPS、建立假旧 current、绕过 Sky backup v2 或增加平行库存。

前阶段[公开备份/隔离恢复](e2-sky-public-backup-contract-2026-10-05.md)的89项检查和两代实际星座PNG读回保其源码时态。本轮只补它已指出的正式 promotion 消费顺序缺口，不重跑该实跑脚本、旧HTTP/分配或page矩阵。全部33项和FAILED/UNKNOWN/MISSING保原，Goal active、无预算、未完成。

## 实现与责任

- [promoteReleaseCandidate](../../../../tools/deployment/promote-release-candidate.mjs)仍先冻结候选、验证环境及生产 digest/staging qualification。只有配置 Sky 的 lane 调原静态 owner 预准备，随后把同一 delivery 交给默认备份和发布；finally 释放原 lease。没有配置 Sky 的发布顺序不变。
- [原静态 owner](../../../../tools/deployment/sky-static-release.mjs)的 `prepareSkyStaticRelease` 调既有 Compose executor、`prepareSkyStaticDelivery`、image-artifact/source seal/history union 与 overlay。空目录只接候选 OCI producer 的公开输入；prepared inventory 不代表旧 current、运行 mount 或成功发布。
- `reuseSkyStaticRelease` 只接受当前进程实际预准备的原对象与活跃原 lease；再核 candidate 环境文件、tuple、source/body、inventory、delivery 和 overlay。私有 WeakMap 只保存本次执行关联，环境文件 digest 不写日志/证据。复制JSON不能跳过真实 preflight；环境文件或资源变更在迁移前失败。preparation末尾环境文件消失也会释放已取得的lease。
- [createVerifiedBackup](../../../../tools/deployment/verified-backup.mjs)传递原 delivery，由既有 capture 借用 lease；DB 加密、临时恢复/清理、manifest v2、公开 pool/sidecar 和原维护规则继续由原 owner 负责，facade在finally擦除自身读取的内存密钥。
- [executeRelease](../../../../tools/deployment/release.mjs)先核实际 backup v2，再由原 owner 重新核交接；已有真实 preflight 时不第二次 version/config/pull/preparation。原 overlay config、DB迁移、converge、readiness、静态验证和receipt继续。四个预备步骤记录 `executionPhase=BEFORE_VERIFIED_BACKUP`，不冒它们发生在backup之后。独立直接调用 release 的原顺序仍保留。

## 修前、修后和实际检查范围

修前有用反例已失败：原 facade 直接调用 backup，备份没有收到静态 delivery，也没有先经过 preparation。见[失败日志](../tmp/sky-first-enable-promotion-failing-before-2026-10-05.log)、[修前源码pins](../tmp/sky-first-enable-before-2026-10-05/source-pins.json)。此快照是在新增反例之后、产品修复之前；不把新增测试称旧产品源码。

[实际消费者测试](../../../../tools/deployment/promote-release-candidate.test.mjs)调用当前默认 promotion、静态准备、备份 facade/core 和 release core。既有两代真实星座PNG合计6,838B，经原标准writer封存为候选 fixture；revision/digest为明确synthetic身份。Docker执行、PG返回、HTTPS readiness和静态验证结果是测试注入，真实外部进程/网络没有运行。

| 场景 | 当前开发结果 |
| --- | --- |
| 原来不存在的store | 原writer/OCI准入消费后形成prepared union；真实文件backup v2读回2图/6,838B，backup过程中原lease存在，DB临时清理在迁移前 |
| 同候选第二次promotion | 每次pull一次；source不再extract，公开pool仍一个，使用本次候选路径、backup和进程交接；不生成operator-preview current |
| pull、backup source-schema、migration失败 | 不进入converge；pull失败不建store/不启DB操作；后两项保已准备公开文件且lease退休，没有假current |
| 复制的delivery、backup后资源损坏、环境文件改动 | 交接失败，不迁移；损坏原store不损坏已经验证的公开backup |
| preparation末尾环境文件丢失 | 读取失败且已取得lease退休，不启DB操作 |
| 非Sky及已有backup/release/preview/maintenance/recovery消费者 | 受影响原检查继续通过，没有把DB-only v1扩大为Sky备份 |

最终[受影响检查日志](../tmp/sky-first-enable-affected-consumers-current-2026-10-05.log)：8个owner/消费者文件，96 PASS、0 FAIL、0 SKIP。七个新增case包含上述实际默认消费者；未因检查数增加宣布验收。最后只修正一处finally缩进，产品控制流/测试逻辑没有再变，不重跑闭合测试。

本轮新测试的临时输入仅在受核验的系统tmp专属 `starward-release-env-` fixture根内生成并清理；环境文件丢失case只移动该fixture的一份候选文件到同目录 `.held-fixture`。原工作区、原源图、旧output、失败日志、服务及六项Settings/outbox没有移除或覆盖。新本轮诊断、文档归并及最后保留核验另存新文件，不调用封闭旧脚本。

## 限制与唯一后续入口

这是首次启用的源码/文件消费者开发验证，未运行真实Compose、PG恢复、静态TLS/native或生产正常路径。无新服务、构建、SDK调用、提交、推送、发布、采购或外联；原watch/BFF/IDE保留。前阶段两代PNG的18个源文件仍保；其18个control pins是前阶段快照，本轮静态owner、backup facade和release owner已改变，不能再全部声称当前一致。

下一只按[唯一PLAN](../PLAN.md)推进静态恢复消费者：隔离public bundle缺少source归属/原source artifact及managed inventory/current/rollback含义，不能直接拿它冒原source或生产current。复用原v2/OCI准入/writer/lease/current loader，先用明确非生产输入核最小缺口与保原失败路径，不建立通用恢复框架。真实production/rollback/supported-client引用全集、managed/live恢复、off-host恢复、独审、DevTools/Android/iOS、新月面、全图质量、全机物理容量和200DAU继续MISSING/UNVERIFIED或保其原FAILED。数据库恢复不表示全应用恢复；普通Prepared registry仍空。

最后的当前源码、原输入/WEAPP、六项、33项、Context、链接及真实远端HEAD读回见[本轮继续核验](continuation-verification-2026-10-05-first-static-enablement.json)。该回执只认证其明确范围，不关闭Goal。
