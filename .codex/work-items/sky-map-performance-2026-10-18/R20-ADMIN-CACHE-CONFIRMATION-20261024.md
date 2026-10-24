# R20 管理缓存确认修复（2026-10-24）

本轮沿唯一 PLAN 的管理命令恢复责任修复 [已确认的缓存 P2](R20-REMOTE-API-ADMIN-REVIEW-20261024.md)。基线为 main `1a8147e3de9b6cd3368f8e10f7abc72edf9180a8`；此记录描述尚未提交的本机改动，不替代精确 head CI、实际 Redis 恢复或完整 Goal 验收。

## 实现与边界

- `apps/admin-web/src/app/page.tsx` 只有在回执 actor/key/status 匹配后接纳本次 `cacheInvalidation`；管理读回匹配后，还需读取原 attempt 的累计 `cacheFailureObserved`。已知失败时，只有本次明确字符串 `COMPLETE` 才可确认。缺失、`UNKNOWN`、非标量状态继续显示未完成并保留原 body/key/receipt；未曾记录失败的旧协议响应仍按原兼容路径确认。
- `admin-session.ts` 将本次资格传入现有 settle 边界，同时保留内存中已知、但可能未成功写入 journal 的失败事实。清除失败仍标为结果未决，不会让下一次拒绝误当首次未提交。
- `admin-command-journal.ts` 在原 `readwrite` 清除事务中检查累计失败。这样另一窗口晚于当前窗口读取得到的 FAILED 也不能被当前窗口无资格的完成清除；entryId、会话/actor/credential 分域、原请求身份及新行保护不变。没有新增存储版本、自动重试、另一套恢复 owner 或外部服务。

现行 operations Context 已要求 receipt/readback/cache completion，本次修复落实该规则，无新增产品方案。已提交数据、公共缓存新鲜度与客户端本机恢复记录仍是不同结果。

## 修复前反例与修复后检查

先将回归加入原测试、保持生产代码未改，运行结果：

1. `node tools/run-node.cjs --test tools/miniapp/admin-page.test.mjs`：**0/1，exit 1**。真实 AdminPage / React / JSDOM / 加密 journal / IndexedDB 事务夹具走 FAILED → 重挂/重新认证 → 原 key 重试 → 缺少 postCommit，丢失“重试原操作”入口，正确结果断言失败。
2. `node tools/run-node.cjs --test --test-name-pattern='a cache failure recorded' tools/miniapp/admin-session.test.mjs`：**0/1，exit 1**。同一操作的第二窗口记录 FAILED 后，第一个窗口凭缺少完成资格的响应清除了 durable 行，`Missing expected rejection`。该新反例使 journal 清除事务检查成为必要修复，而不是假设性扩展。

完成修复后：

```text
node tools/run-node.cjs --test tools/miniapp/admin-page.test.mjs tools/miniapp/admin-session.test.mjs tools/miniapp/admin-operations-client.test.mjs
# 16 passed; 0 fail/cancel/skip; exit 0

npm run typecheck --workspace=@starward/admin-web
# exit 0

git diff --check -- apps/admin-web/src/app/page.tsx apps/admin-web/src/app/admin-session.ts apps/admin-web/src/app/admin-command-journal.ts tools/miniapp/admin-page.test.mjs tools/miniapp/admin-session.test.mjs
# exit 0
```

页面回归覆盖缺失/未知/非法资格不清记录、不显示确认、原请求字节和 key 不变，之后再次重挂不会自动发送；明确 COMPLETE 关闭同一操作，仅保留 scope salt。原无失败历史的缺字段响应仍正常确认。共享 owner 回归覆盖跨窗口累计事实、内存失败写盘失败、原记录保护及最终 COMPLETE；既有会话退休、身份隔离、丢回复、实际 Case 读回和 CLI 检查均通过。没有通过替换生产页面或关闭行为断言取得绿灯。

## 未验与交付状态

上述是实际生产页面/命令/journal 的受控本机验证，HTTP 返回与 IndexedDB 平台端口由现有夹具提供；不代表实际 Redis 故障/恢复、生产部署、浏览器崩溃持久性或真实业务无重复效果的新增环境证明。原有实际浏览器恢复证据与 PG/HTTP/CLI 证据按各自范围保留。

本轮未操作设备、IDE、ADB、共享 PG/API/桥/队列、VPN、冻结构建或私有原件；无依赖变更、Git 提交/推送。所有测试连接和组件已关闭。新独立审阅由 root 另行整合，不能把本实现者复核称为独审；完整 Goal、UI/设备/性能/OOM 及其它原义务保持未完成。
