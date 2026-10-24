# NightReport 独立审查（2026-10-24）

独立审阅者 `review_night_report_completion`。范围为原完整 WIP 与本轮确认协议：纯请求合同、真实聚合器、SQLite snapshot/receipt、持久化 service/runtime、HTTP/server/start、mobile pending/client/Tonight、structured owner 和 OpenAPI。读取唯一 PLAN NightReport 要求、原 WIP/续批记录、原生 Tonight Screen/Source 合同及当前 callers。未修改生产代码、PLAN、HANDOFF、Context、依赖或 Git 状态；本报告不覆盖完整 Tonight family、目标设备、生产鉴权或整个 Goal。

## 已确认发现：legacy unknown 仍可被另一 owner 的同 key 读回误确认（P2）

审查时的 `night-report-client.ts` 在旧 pending 缺少 `qualification` 时置为 unknown，却随后用当前可信 owner 的 request-result 读回确认并删除该记录。服务端回执按 actor/requestId 分域，因此当前 owner 的匹配 key/full input 并不证明原未知 attempt 属于它。后来取得的 owner 资格不能反向定义原 attempt 的身份。

实际反例走真实随机 loopback Fastify、真实 SQLite 和生产 mobile client，仅可信 resolver 身份与本地 storage 端口为合成边界：

1. owner A 以 `legacy-owner-unknown` 提交原非空报告。
2. owner B 合法使用相同 requestId/完整输入，得到另一个 actor 域内的不同报告。这也覆盖旧 WIP 曾允许身份切换后沿原 key 提交而留下重复 actor 域记录的恢复条件。
3. 保留 A 的旧格式 pending（没有原 owner/storage 资格），在 B 身份下执行实际 `load`。
4. 客户端返回 B 报告，并把原 unknown pending 从 1 清到 0。正确性断言 **0通过/1失败**。

原件：`tmp/r20-night-review-legacy-owner.test.ts`、`tmp/r20-night-review-legacy-owner.log`。输出为原报告 `legacy-owner-report-1`、B 报告/返回结果 `legacy-owner-report-2`、pending=0。测试最后关闭全部 HTTP/SQLite 资源。

该问题已即时交 root。Root 随后通知已改为：无原资格的 legacy unknown 只取得独立 key 的明确 ephemeral 临时查询，原字节继续保留；即使切回 A，也不凭当前身份猜历史归属。Root 新增正式 A/B 同 key 回归，并正同步原文档。本次独审保留原失败，**修复后的最终结论交新的独立审阅者**，不把本报告当最终通过。

## 其余已核边界与实际检查

- 已知 qualification 路径在 HTTP 前保存完整原输入/key/owner/storage；server 请求字段只限制 fallback，trusted resolver 仍为授权 owner。原 owner 丢回复后的 guest/另一 owner 查询使用独立 ephemeral 请求；明确 owner 限制也防止 session→POST 间身份变化后错误持久化。
- SQLite effect/receipt 同事务，provider 聚合在事务外；actor/requestId/full input 一致性、不可变 snapshot、重启原证据回放、部分 route 缺失、双连接准入与 receipt insert 故障回滚由实际模块与正式 HTTP 检查贯通。旧 generic token 表没有被提升为报告。
- Tonight 仍使用原 POST 查询，无新增 Save action；真实 Query key 和请求同源，原报告在刷新/失败时明确显示保留，改变观星夜不会接受另一夜的迟到结果。平台显示、Expo/storage 和外部 provider 在组件检查中仍是隔离端口，不能代表设备。
- structured probe 已使用实际 aggregator/runtime/snapshot/readback，代表链成立仍保 `passes:false` 和 family 缺口；缺 snapshot 与伪刷新 replay 的对照均拒绝。
- OpenAPI 公开区分 session、POST 和两种 private readback，storage/owner 限制不是 credential，支持六种现有 profile。实际 JSON、内部 `$ref`、四条路径和 profile 集检查通过；需要随 root 的 legacy unknown 修复同步终态叙述。

本审阅者独立执行：

| 入口 | 实际结果 | 原件 |
| --- | --- | --- |
| API NightReport HTTP + 原 service | **15/15** | `tmp/r20-night-independent-http.log` |
| structured NightReport | **3/3** | `tmp/r20-night-independent-structured.log` |
| 实际 Tonight/F07 消费者文件 | **8/8** | `tmp/r20-night-independent-consumer.log` |
| 本审阅者 legacy owner 反例 | **0/1，确认缺陷** | `tmp/r20-night-review-legacy-owner.log` |
| 限定 diff-check / OpenAPI JSON 与 refs | 通过 | 当前命令结果 |

前三项执行时 root 已在修复 legacy 分支并增加正式用例，不能用它们覆盖此前反例或冒称本审阅者完成修后全范围独审。不同入口不相加为一个全套。未重复整仓、旧失败矩阵、共享基础设施或设备检查；没有将 root 原有类型通过冒本审阅者实际执行。

## 保留义务与资源关闭

需新独审确认 legacy 修复、最终相关整合及对应提交的精确 CI。真实 provider 覆盖/许可/完整 Tonight 内容、生产身份/部署、设备 SQLite/原生与所有 Goal 设备/性能/OOM 义务继续保留。旧 `1a8147e3` Product CI 失败不由本地检查改写。

本次全部命令已结束，使用的随机 HTTP listener/SQLite handles 均关闭；合成 tmp 证据保留本机。没有启停共享 API/PG/队列、IDE、手机、ADB、VPN 或冻结构建，没有部署、上传、新依赖、Git 写入或额外 agent。完成后本审阅者结束，不复用。
