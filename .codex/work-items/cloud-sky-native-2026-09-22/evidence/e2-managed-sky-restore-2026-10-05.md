# E2全新managed prepared store恢复：原消费者与依赖（2026-10-05）

在[首次静态启用](e2-first-static-enablement-2026-10-05.md)之后，本轮补了原恢复消费者的全新managed prepared store入口。既有public backup v1组件保存union与source tuple/publication hash，但没有各source原index/artifact及URL归属。因此本次重新准入已缓存的原OCI producer，并逐文件/headers核对备份，再用原writer、lease、overlay和prepared inventory发布机制形成全新store。没有从union猜source、编造artifact、生成旧current或切换运行时。

代码入口是[原静态owner](../../../../tools/deployment/sky-static-release.mjs)的 `restoreManagedSkyStaticBackup`，由[原DB恢复core](../../../../tools/deployment/database-recovery-execution.mjs)及[原facade/CLI](../../../../tools/deployment/recover-database.mjs)消费。显式 `--sky-managed-restore-directory` 与原 `--sky-restore-directory` 互斥，沿原 `--confirm-sky-publication-hash` 精确确认。原DB environment、target及encrypted SHA确认保原；无此新参数时原隔离公开文件/DB-only行为不变。

恢复目录必须全新且parent为真实plain路径，与配置store/backup不得重叠；occupied目录明确失败且内容原样保留。没有自动pull，镜像必须已在所选仓库namespace内可用。digest/revision逐原source读取，不把当前candidate补进历史快照。原image label、image-artifact、source index/body及headers全部由原owner验证；每个source必须等于备份的publication hash，最终union必须与备份双向完全相含，且files/bytes一致。完成前再次核实际backup metadata/body。只有全部通过才写prepared pointer；lease在成功或失败时释放，失败新stage保留供诊断，不清理原数据。

原 `writePreparedInventory` 的同一小职责用于正常preparation及此恢复：先读回immutable overlay、再原子rename prepared pointer。没有新的库存、通用恢复框架或第二exporter。恢复产生新的source/generation目录身份；来源tuple和公开URL/bytes/headers保持，原目录名不是可移植current/rollback证明。

新store沿原结构保各source及最终union的payload副本，6,838B是最终publication的逻辑body，不能当整个restore工作盘或物理分配。失败stage和metadata另计，本轮没有重测全机分配或声称去重/容量通过。

DB恢复receipt继续v2，但显式记录 `skyRestore.status=RESTORED_MANAGED_PREPARED_STORE`、store/publication/generation/overlay及 `sourceAdmission=ORIGINAL_CACHED_OCI_REVALIDATED`、`runtimeApplied=false`。静态准备在DB effects前完成；若后续DB schema恢复失败，已验证的新静态store保留，receipt整体failed、不会冒全应用恢复。live mount/current和原DB cutover仍各由其原消费者负责；本轮没有调用真实DB、Docker、网络或部署。

## 开发证据

修前[反例](../tmp/managed-sky-restore-failing-before-2026-10-05.log)明确失败于原core只认识隔离文件目录，managed参数不能通过原确认路径。[修前四文件pins](../tmp/managed-sky-restore-before-2026-10-05/source-pins.json)在新增case之前保存，产品/测试均为此前真实时态。

[实际消费者检查](../../../../tools/deployment/recover-database.test.mjs)新增六个case，复用已有两代星座真实PNG（2图、6,838B）。原source label/OCI身份仍是继承synthetic fixture，Docker、PG与HTTPS观察由测试注入；原writer、backup读回、source admission、恢复core/facade、prepared inventory和后续preparation/loader执行当前真实代码与文件。没有重跑前阶段物理backup或旧HTTP/page矩阵。

| 检查 | 本轮实际开发结果 |
| --- | --- |
| 两原source→全新managed store | 两cached artifact重新准入；全部旧URL/headers、union/files/bytes和tuple读回，OCI阶段在DB前，lease退休，无current |
| 原preparation/loader消费 | 正常preparation复用已恢复source，不再extract；缺current时loader明确失败并释放lease |
| 原镜像missing/revision/publication错误 | 不启DB、不发布prepared pointer，原owned artifact清理路径执行，lease退休；原源不变 |
| occupied、confirmation、互斥、store/backup重叠、junction parent | 0 Docker/DB动作，occupied文件原样保留 |
| backup metadata在source解析中漂移 | 最后核验失败，不发布prepared pointer、不启DB，lease退休 |
| DB schema恢复失败 | 原DB/edge未停止，临时DB清理；新有效静态store保留，failed receipt明确runtime未应用 |
| 实际facade | 真实部署环境/密钥/manifest读入并传新参数与所选仓库给原admission；缺cached OCI在DB进程前失败 |

最终[8文件受影响日志](../tmp/managed-sky-restore-affected-consumers-current-2026-10-05.log)：102 PASS、0 FAIL、0 SKIP。首次owner检查29通过。随后边界检查的首次日志10通过/2失败保留：loader fixture错误地把receipt父目录包住store，不符合原consumer路径合同，已改成独立receipt目录；occupied native EEXIST被原错误过滤归unexpected，新增路径guard现给明确 `restore_directory_exists`。修后12消费者检查通过，再补backup漂移/facade并运行最终影响检查；这些修复与结果不倒填旧日志。

测试临时输入在已核realpath的系统tmp、专属 `starward-recovery-`/`starward-release-env-`根生成并清理；junction仅指同一fixture。原PNG/output、原store、失败证据、六项Settings/outbox、watch/BFF/IDE未移除或重启。普通Prepared registry空；无新提交、推送、云部署、发布、采购、外联、agent或分支操作。

## 未完成与下一依赖

此结果证明fresh managed preparation的开发消费者，不证明完整离线恢复、live cutover、可信生产source/current/rollback/client全集、off-host恢复或实际服务器容量。原OCI不可用时本路径明确失败；公开backup组件本身仍没有各source index/artifact及精确URL归属，不能用union补假OCI证明。

下一只按[唯一PLAN](../PLAN.md)：沿原backup/retention/recovery owner补最小source元数据归档/URL归属，使新备份在原镜像缺失时仍能核恢复。复用同public pool和原writer，不为此复制完整payload或重放旧实跑；旧backup能力原样分类，不能凭空升级为完整恢复。live/current/rollback、真正生产/客户端引用、独审、DevTools/Android/iOS、新月面、完整图质、物理资源及200DAU保持各自FAILED/UNKNOWN/MISSING。全部33项未整体验收，Goal active无预算。

当前原输入/WEAPP/服务、六项、33项、源码/文档/链接与真实远端HEAD见[本轮继续核验](continuation-verification-2026-10-05-managed-sky-restore.json)。

最后audit r1把前阶段18个control pins的允许变化仍限定为首次启用的3个owner，因而误拒本轮另3个已授权recovery消费者；本轮较新baseline的4个owner变化guard此前已通过。实际hash清点确认旧control共6个已知变化、其余12个一致，原18源仍一致；已保原r1脚本并另建r2，没有改产品或重跑旧HTTP/build。具体[guard修正记录](managed-sky-restore-audit-guard-correction-2026-10-05.json)保该诊断失败与时态，不把旧pins说成当前全一致。
