# Staging 当前只读核对

归唯一 PLAN P4/P6；2026-10-28 Root 沿现有 `backend-diagnostics.yml` 与固定诊断 owner 读取当前 staging。运行代码是远端 main `1fd25800fb624d39fd98248f1aa3ac1da33c7de2`，不包含本机 dirty 实现。既有 protected connection mirror 比七项 connection variables 的更新时间都晚，直接复用，未读回/打印秘密或改写 Secret。没有构建、发布、迁移、备份恢复、启动 worker、重放提醒、清理或改 host。

| 现有固定检查 | 实际结果 |
| --- | --- |
| [host-storage 40604451833](https://github.com/Seven128/Starward/actions/runs/40604451833) | 完整汇总观察成功，release 文件系统可用 10,353,348,608 B（约9.64 GiB）。Docker Images 14.85GB、BuildCache 7.51GB；rounded reclaimable 不表示可删除的本项目集合。报告明确 `NON_ATOMIC` / `referenceCompleteness=UNVERIFIED` / `cleanupAuthorization=NONE`。 |
| [host 40604671659](https://github.com/Seven128/Starward/actions/runs/40604671659) | **FAILED `host_preflight_disk_below_10_gib`**。沿原10 GiB前置条件，未降低门槛或以统计成功冒部署就绪。 |
| [runtime 40604777288](https://github.com/Seven128/Starward/actions/runs/40604777288) | **FAILED `runtime_diagnostic_container_ambiguous`**；需由独立identity解释，不猜测多个运行容器。 |
| [identity 40604933393](https://github.com/Seven128/Starward/actions/runs/40604933393) | 一个匹配API容器、零运行、状态exited；project/service/user匹配，revision `1ccdbecd8ead24250bf75e8fd4319f17f403f688`，image digest `sha256:de4bcfb09bb74e99b43df9d8cce993741bce93c59b3b67bcca604bdc57a80f8f`。只读观察成立，健康判定仍失败。 |
| [release-reference 40605206089](https://github.com/Seven128/Starward/actions/runs/40605206089) | 当前指针/历史成功回执链可读且身份一致，仍指向revision `262d7531916c0b1b995fe8937321c044c9fb9ca5`；与当前exited API不同。失败回执批次 `UNKNOWN/budget_exceeded`，完整引用仍未核定，整个workflow未通过。不得按历史成功指针擅选旧镜像或恢复DB，也不扩大扫描预算求“全绿”。 |

固定输出的本机读回位于 `E:/Dev/Starward-data/development/terrain-d1-20261028/staging-{host-storage,host-preflight,runtime,identity,release-reference}-readback.json`。这些记录不含连接、路径、凭证、数据或原始日志。结果界定了现有disk拒绝和停止的API，未证明普通API/DB健康、当前dirty候选部署、正式生产容量、云媒体、OSS/CDN或手机结果。镜像/缓存清理仍缺明确归属及完整保留/恢复集合，不能执行daemon-wide prune。

fresh只读独立核对进一步定位：release-reference的首次目录枚举遇到第513个目录项触发既有上限，后续observedFileCount/revision/imageDigest尚未赋值。此为源码推导的瞬时下界；实际总项数、有效/匹配回执数及字节仍未知，不是已证超过128份有效回执或8MiB。已有测试明确覆盖无关目录项耗尽枚举预算后的UNKNOWN并保留独立成功指针链；没有发现本次可支持的本地算法修复，过滤后再计数会放宽既定预算。未运行新检查、远端命令或清理。

远端相关动作先停在已知边界，继续本机独立实现；没有新增采购、外部提交或要求用户立即介入。
