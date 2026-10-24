# NightReport 当前修复最终独审（2026-10-24）

独立审阅者 `review_night_report_final`。按唯一 PLAN 的 NightReport 责任复核原 WIP 与当前修复：纯合同、实际聚合器、SQLite snapshot/receipt、持久化 service/runtime、HTTP/server/start 的接线、mobile pending/client/Tonight、structured owner 和 OpenAPI。读取 [续批记录](R20-NIGHT-REPORT-CONFIRMATION-20261024.md)、[前审反例](R20-NIGHT-REPORT-INDEPENDENT-REVIEW-20261024.md)、现行 Source/Screen/架构合同及实际调用者。仅新建本报告与本审阅者日志/哈希记录，未修改生产、测试、PLAN、HANDOFF、Context、依赖或 Git。

## 结论

**本限定修复范围未发现未关闭的 P1/P2。** 前审的 legacy unknown 跨 owner 误确认已关闭。当前无原 owner 资格的旧记录始终保留 unknown；当前 owner 即使持有同 requestId/完整输入的合法回执，也不能反向证明原归属或清除 pending。独立临时查询明确要求 ephemeral 并使用另一请求身份，原记录字节保留。切回原来可能的 owner 也不会自动猜定历史身份。

这解决错误确认与未知尝试丢失，不代表旧记录的原归属已恢复。没有原资格证明时仍欠授权恢复条件；本次没有清理旧 pending，也没有把保守保留称为已自动完成对账。

## 已核闭合边界

- 新尝试在 POST 前保存完整输入、requestId 与服务端 session 给出的 storage/owner 资格。请求字段只限制 fallback，可信 resolver 仍独占授权。session 到 POST 间身份变化不能把原 owner 尝试改成 guest 或另一 owner 的持久写入。
- 已资格 owner 尝试在提交丢回复后，guest/另一 owner 可取得独立 ephemeral 基础结果而不清原 pending；原 owner 恢复后以原 key/原输入重试，并经匹配 owner 的实际 private receipt/report 读回确认。缺失资格、读回失败或取消保留原尝试；确认后刷新才取得新 key/新报告。
- SQLite 效果与 receipt 同事务提交，聚合在事务外；同 actor/key 的完整输入冲突不覆盖原报告。实际重启回放保 generatedAt/expiresAt、provenance、原内容与 partial 意义；并发准入及 receipt insert 故障回滚通过真实连接/表效果确认。旧 generic token 表没有被解释成报告。
- Tonight 继续使用原 POST 查询与同一 committed context；没有新增 Save action。实际消费者可显示非空结论、窗口和来源，确认后刷新换 key，另一夜的迟到响应不能成为当前夜内容，取消不清未确认记录。
- structured 已接实际 aggregator/runtime/snapshot/readback；代表链通过仍保 `passes:false`，缺 snapshot 和伪刷新 replay 的对照均拒绝。OpenAPI 当前区分 session、POST/private reads、mode/owner 限制、unknown/conflict 和六种已有 profile，并明确旧 unqualified 归属缺口。

## 本审阅者实际检查

| 入口 | 结果 | 本地原件 |
| --- | --- | --- |
| 实际 NightReport HTTP + 原 service | **15/15**，无 fail/skip | `tmp/r20-night-final-review-http.log` |
| structured NightReport | **3/3**，无 fail/skip | `tmp/r20-night-final-review-structured.log` |
| 实际 Tonight/F07 消费者文件 | **8/8**，无 fail/skip | `tmp/r20-night-final-review-consumer.log` |
| 前审原 legacy 跨 owner 反例脚本，原脚本不改后重跑 | **1/1**，pending 保留 | `tmp/r20-night-final-review-legacy-owner.log` |
| OpenAPI JSON、内部 refs、四条 NightReport 路径、六 profile、legacy unknown 叙述 | 通过 | 本审阅者命令结果 |
| 限定 diff-check | 通过；仅 CRLF 提示 | 本审阅者命令结果 |

前审 `tmp/r20-night-review-legacy-owner.log` 的失败原件保留。新 HTTP 正式用例同时断言另一 owner 同 key 报告不被作为返回的原尝试、临时请求使用独立 key、pending 字节不变、SQLite 不新增持久效果。没有仅凭通过数判断修复，也未重跑全仓或旧故障矩阵。审阅的 18 个责任源/协议文件哈希保存在 `tmp/r20-night-final-review-source-hashes.json`；本报告不覆盖随后变化的不同字节。

## 保留义务与资源

本次不启动默认 `start.ts` 进程，仅核对它实际注入聚合器/SQLite runtime/可信 resolver 的源码接线；root 的启动 smoke、最终整合检查与对应提交的精确 CI 仍各按实际结果判断。当前未提交代码不受旧 CI 成功覆盖，旧 `1a8147e3` Product CI 失败不由这些本地检查改写。

真实 provider 覆盖/许可、完整 Tonight 内容、生产身份/部署、原生设备存储/导航和完整 family/Goal 仍保留。旧 unknown 原归属缺证明的状态没有被设备、类型或本地通过替代。全部命令已结束，实际随机 loopback listener/SQLite handles 由测试关闭；合成原件留本机。未启停共享服务、设备、IDE、ADB、VPN 或冻结包，未部署、上传、添加依赖、Git 写入或再开 agent。本审阅者完成后结束，不复用。
