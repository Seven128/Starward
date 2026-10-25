# P4 管理输入结构与错误分类：HTTP 判别和窄修

2026-10-25。仅涉及小程序 BFF 的四个管理 controller 及其共享输入 owner；没有设备、IDE、Git、构建、共享 PG/Redis/API、网络、App 或线上操作。基线由 Root 确认为 main `1bef1a09819b563fe44d6437a200210ff30606f7`；本记录不声称已提交、已部署或 P4 全部完成。

## 判别结论

复用 `workers/miniapp-api/src/admin-auth.test.ts` 的 Nest/Fastify `inject` 入口和生产 `ApiExceptionFilter`，使用隔离凭据及有状态 repository 端口。没有监听网络端口，也没有连接实际 PostgreSQL。

- Spot PATCH、moderation request-changes、publication-assessments、event-catalog source 四个代表入口，对 JSON `null` 和缺失 body 均实际返回 **500 / PROVIDER_UNAVAILABLE / retryable=true**。
- Spot PATCH 带幂等 key 时，array/boolean/number/string body 会在读取缺失 revision 后成为 **409 / CONFLICT / retryable=true**。
- 同批非法输入的业务写调用数为 0，HTTP GET 读回仍为 `Original`；合法 OWNER PATCH 为 200，写调用数变为 1，GET 读回 `Saved`。因此证据是错误分类缺陷，不是非法写已成功，也不是整条 harness 不可用。
- 顶层准入修复后，有界追加了同边界的两个 object 字段反例：非法 `expectedRevision` 仍为 409/CONFLICT；event-source 缺 `provider` 为 503/PROVIDER_UNAVAILABLE。两个问题均由通用字符串分类先匹配 revision/provider 引起，HTTP 已复现。

首次从仓库根目录运行 tsx 时未选到 worker 的 decorators tsconfig；随后从 worker cwd 使用现有入口。首次失败属于检查入口，不计为产品反例。上述 HTTP 反例均来自正确 cwd 的实际 Nest/Fastify 运行。

## 实现

- `admin-operations-support.ts` 增加共享 `assertAdminObjectBody`。四个 controller 的所有接受 body 的路径在既有认证/权限之后、字段读取/业务调用之前接入；现有转发路径复用被调用方法的准入。
- 共享的 object/text/revision 准入抛出 Nest `BadRequestException`；`AdminController` 改为复用原 support 内的 text/revision/idempotency owner。没有扩充全局字符串兜底，没有改变 `ApiExceptionFilter`、身份、RBAC、事务、旧/新 command 路径或完整请求身份。
- body 仍按各业务原 owner 验证字段、嵌套内容和权益；这次只补已证实的顶层对象和标量字段分类边界，不声称全字段 schema 审计已完成。
- 既有 HTTP error envelope 已被 admin-web 与 CLI 消费，本次无需客户端协议改造。`ADMIN-AUTH.md` 记录当前边界。

## 结果与范围

| 检查 | 当前结果 | 证据边界 |
| --- | --- | --- |
| worker cwd：`node ../../tools/run-node.cjs --import tsx --test src/admin-auth.test.ts src/admin-operations.controller.test.ts src/api-exception-filter.test.ts` | **16/16 pass** | 实际 Nest/Fastify 路由/body/filter；隔离 repository 端口 |
| 新 HTTP 回归 | 四代表入口 × 六种 body 状态均 400/INVALID_INPUT/nonretryable；两 object 字段反例同样正确 | null、array、boolean、number、string、absent；不外推完整嵌套 schema |
| 认证/真实失败控制 | 无凭据 null 仍 403；合法 PATCH 成功；业务 revision conflict 仍 409、provider failure 仍 503，均 retryable | 原业务错误没有被输入兜底吞掉 |
| 根目录：`node tools/run-node.cjs --test tools/miniapp/admin-operations-client.test.mjs tools/miniapp/admin-session.test.mjs tools/miniapp/admin-page.test.mjs` | **16/16 pass** | 既有 CLI 与实际 React 页面隔离端口，包含未知提交/刷新 journal/403 后恢复与缓存失败语义 |
| `npm run typecheck --workspace @starward/miniapp-api` | **exit 0** | 当前 worker 全量 noEmit 类型检查；不是发布构建 |

零写与 GET 读回来自受控 repository 端口；不冒数据库持久化/真实管理凭据/生产或部署结果。现用环境、迁移023–026、真实对象存储与长期恢复仍由 PLAN P4 的原责任持有。独立审查由 Root 安排，未在本记录中冒充完成。
