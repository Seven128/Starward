# NightReport 确认协议与实际持久化续批

沿唯一 PLAN 的 NightReport 责任完成原 WIP，原 [WIP/修前记录](R20-NIGHT-REPORT-PERSISTENCE-20261024.md) 和 [真实丢回复反例](R20-REMOTE-RECONCILIATION-20261024.md) 保留。协议[最终独审](R20-NIGHT-REPORT-FINAL-REVIEW-20261024.md)及[时区增量独审](R20-NIGHT-REPORT-TIMEZONE-REVIEW-20261024.md)已完成；交付/精确head CI归HANDOFF。完整 Tonight family、设备或生产鉴权仍未完成。

## 实现边界

- 原 POST 查询、真实聚合器和 SQLite snapshot/receipt 同事务继续复用。新增 uncached `/v1/night-report-session` 从同一可信 resolver 给出派发前的 storage/owner 资格；caller 字段只能限制 fallback，不能授权。owner/存储要求不满足时拒绝，不切到临时报表来确认旧尝试。
- mobile 在 HTTP 前保存完整原输入、requestId 和原资格。身份丢失或变为另一 owner 时，可用独立 requestId 获得明确 ephemeral 的基础查询，原 pending 字节保持。原 owner 恢复才使用原 key 对账；确认以后再刷新使用新 key。缺失或不匹配的响应资格、失败读回、取消均不清旧 pending。
- 旧 WIP pending 没有原 owner 资格时按 unknown 保留；当前 owner 即使有同 key/完整输入的合法回执，也不能反向定义历史归属或自动清 pending。只给独立明确 ephemeral 的基础查询；原资格须经可证的授权恢复后才有确认条件，不向新身份重发未知原尝试。旧 direct `create` 的合法 ephemeral v1 响应兼容，不称已保存。
- receipt/readback 带服务端 ownerId；既有 SQLite receipt 字节不重写，读回按查询 actor 补资格。原 generatedAt/expiresAt、source versions、内容与 partial 意义不刷新；旧 generic token 表原样保留，不能迁成假报告。
- structured Tonight probe 改为真实聚合器和 snapshot/receipt/reopen owner。代表链成立仍 `passes:false`，保真实供给/权限/完整内容/设备等 family 缺口。OpenAPI 对齐 session、private reads、mode/owner 限制、响应资格、unknown/conflict 和既有全部 profile。

## 最终结果

- 新 unknown 跨 owner 误确认反例已关闭；实际 HTTP／SQLite／client 正式9项及原 service7项 **16/16**，含标准 UTC 原输入/持久读回与非法时区拒绝。修前 UTC 1 fail/8过滤skip、legacy跨owner 0/1失败原件都保留。
- 最终 API workspace 类型及31文件 **144/144**；mobile fast 类型及38文件 **150/150**，无失败/跳过。两者是各自真实入口，不相加冒全仓。日志 `tmp/r20-api-final-type-20261024.log` / `tmp/r20-api-final-20261024.log` / `tmp/r20-mobile-reviewed-final-20261024.log`。
- structured 四个已改持久化owner合跑 **12/12**；NightReport本身3项，仍保整个 family `passes:false`。Context结构和限定diff检查通过。
- root 实际默认 `start.ts` 组合使用自有新 SQLite 目录和随机loopback端口，health/session/private missing/非法请求边界通过；NightReport snapshot/receipt均0，未访问外部provider，进程已关闭。入口接线 smoke不替代上面的非空聚合持久化或真实供应。
- 新独审实际复跑 HTTP/service、structured、Tonight及原跨owner反例；协议限定范围无未闭合P1/P2，UTC增量17份前审源码未变、1份合同变化经另审。旧 unqualified 的原归属仍缺证明，保持unknown，不称已自动对账。

## 首批检查（历史）

- API 真实随机 loopback HTTP、真实 SQLite、实际 mobile client：7 项新协议/持久化用例，加原 service 7 项，**14/14**。覆盖非空 ready、独立 route missing 的 partial、完整输入冲突、重启原证据回放、双连接并发、receipt insert 失败真实 rollback、提交丢回复、guest/另一 owner/原 owner 恢复、缺资格、旧 unknown readback 与旧 direct v1 响应。日志 `tmp/r20-night-http-final-20261024.log`。
- actual Tonight/Query/store/client 的非空内容、确认后新 key、改变夜晚及旧响应取消保留 pending，和原 F07 消费者、当前 Map 两文件合跑 **16/16**。日志 `tmp/r20-night-map-consumers-final-20261024.log`。RN/Expo 显示、AsyncStorage 与外部响应为隔离边界，不是设备结果。
- structured **3/3**：真实非空/partial 持久化代表链成立，但整个 family 仍未通过；缺实际 snapshot 和伪刷新 replay 两项反例均拒绝。没有泛化运行其余 family 或新建门禁。
- 此前本批 API/mobile 类型均 exit0；最终新字段/整合后的完整相关入口与新独审待 root 收口。运行数据、PG、设备、共享调试服务、冻结包均未被这些检查改变。

## CI 与未完成义务

已提交 main `1a8147e3` 的 Context 40059873056 success，Product 40059872996 failure。失败为原 Tonight 消费者夹具直接加载 Expo crypto 的 `__DEV__` 两错误（137 pass/2 fail）；后续步骤 skipped。本机已补真正平台/storage 测试边界并通过受影响消费者，旧远端失败不改写，新未提交代码没有对应远端 CI。

本模块代码/相关检查/新独审已完成，已授权 Git/精确 head CI 收口按HANDOFF实际结果。真实 provider/完整 Tonight 内容、生产身份/部署、设备 SQLite/原生结果不因 POC 持久化完成。原完整 Goal、UI→叠层→Sky、Map 原生故障重建、H4、持续手势/资源和 OOM 均保留。手机已由用户授权 USB 推送，当前候选及官方拒包归 [当前设备记录](R20-CURRENT-UI-DEVICE-20261024.md)，gen18/gen34等受保护包不刷新。
