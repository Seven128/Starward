# P4 管理输入窄修：独立审阅

2026-10-25。独立于实现者，只读审阅本批产品源码及测试；仅新增本记录。范围是 PLAN P4.1 的顶层 body 形状与共享 text/revision 错误分类，不是完整嵌套 DTO、实际环境或 P4 全量验收。

## 结论

**未发现本批 must-fix，准许进入 Root 集成检查。** 不能据此宣称已部署、真实 PG 零写、生产凭据或小程序目标验收完成。

- 四个当前管理 controller 共 24 个接受 body 的 HTTP 路由均已逐源核对。直接方法在 `adminOperationsContext` 完成认证、operation 授权及 repository 资格检查后准入；两个 Spot command 转发与 unpublish/retire 转发进入原方法/私有 lifecycle owner，没有先读取 body。bodyless source retrieve 不被新增要求误伤。
- `admin-operations-support.ts:16` 的共享准入拒绝 absent/null/scalar/array；`requiredText`、`requiredRevision` 和复用它们的 idempotency 校验抛 400 `BadRequestException`。现有 `ApiExceptionFilter` 的 HttpException 分支直接产生 `INVALID_INPUT`、`retryable=false`，不会再被 message 中的 provider/revision 误分类。没有扩大全局字符串兜底。
- 四代表 HTTP 入口的六种非法 body、两个字段反例、未认证 null、合法 PATCH/GET 读回、真实 repository conflict/provider error 的控制均有实际 Nest/Fastify inject 断言。业务零写和读回是隔离 repository 端口事实，记录已准确限定其证明范围。
- 文本长度/trim、revision 范围与 idempotency 身份规则延续原实现，成功请求的字段/原 requestBody、command、repository 事务及缓存 owner 未改。真正冲突仍 409/CONFLICT，可重试 provider 失败仍 503/PROVIDER_UNAVAILABLE。
- 已检查 admin-web 的 400 消费及 journal owner：首次确定拒绝可修输入；存在先前 unresolved outcome/已知 receipt 时仍保留原操作，不能用本次 400/403 抹掉先前提交/缓存失败。CLI 延续现有 error envelope，不需要新增协议。

## 独立执行的检查

1. worker cwd：`node ../../tools/run-node.cjs --import tsx --test src/admin-auth.test.ts src/admin-operations.controller.test.ts src/api-exception-filter.test.ts`：**16/16 pass，0 skipped**。
2. 根目录：`node tools/run-node.cjs --test tools/miniapp/admin-operations-client.test.mjs tools/miniapp/admin-session.test.mjs tools/miniapp/admin-page.test.mjs`：**16/16 pass，0 skipped**，包含真实 React 页面隔离端口、未知提交/丢回复、权限变化和跨窗口缓存失败恢复。
3. 限定写集 `git diff --check`：exit 0。仅有现有 LF/CRLF 提示，无空白错误。

未运行服务、连接 PG/Redis、启动构建、操作设备/IDE/Git 状态/网络，未修改 App、PLAN 或 HANDOFF。实现者报告的 typecheck 未在独审中重复执行。

## 审阅输入身份

基线为 Root 核定的 main `1bef1a09819b563fe44d6437a200210ff30606f7`，审阅对象是其本地未提交增量：

| 文件 | SHA-256 |
| --- | --- |
| workers/miniapp-api/src/admin-operations-support.ts | c2762d89992f8970d23a17d3ec3f3615e119a3baba8f37ce24730e1bd153061a |
| workers/miniapp-api/src/admin.controller.ts | de748d5cbead51229716a50ec03ee50ed488cc6377e2fa28cf3d354fcc8a913d |
| workers/miniapp-api/src/admin-operations.controller.ts | bbaed2e383435ccc5b2708adc3029107549dd7feb56d0c99869a0f28a9bc3c06 |
| workers/miniapp-api/src/admin-publication.controller.ts | d72b4829b59bf66e77139cafe1046bedd5b08ca7aec8bc0dd0506fbf0573c821 |
| workers/miniapp-api/src/admin-event-catalog.controller.ts | 0f009405b15fe5f137e3a63ceea64206da4dd4914784d1922f5d4e17c5065fcb |
| workers/miniapp-api/src/admin-auth.test.ts | a95f5d2570af0f744ced011f1ec31d9b9a08276b02558dd3312f9a031a43b344 |
| workers/miniapp-api/ADMIN-AUTH.md | 4546d6ed908c56340f9d2c0d0812db952000294dc84ad36f25c91e4ed51b25f7 |

后续若改变这些输入，按实际受影响差异重新判断本结论；本表不是额外产品门禁。
