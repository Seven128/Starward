# R19 公共主目的地消费者准备 — 2026-10-22

本项由主代理分配，属于 R19 导航的共同依赖迁移。14 个生产消费者中的 23 处直接 `Taro.switchTab({ url })` 已改为调用 `navigation/primary-page-navigation.ts` 的 `openPrimaryPage(url)`。该 owner 由主代理提供，当前仍原样返回 `Taro.switchTab({ url })` 的结果；同步异常、Promise 成功/失败和真实原生生命周期均沿当前实现。

**本项没有完成去底栏、My 左入左出或新路由迁移。** 尚待用户选择的 My A/B 未作决定；没有改 app.config、custom TabBar、Map/My 有效可见性或 Sky 返回机制。没有操作设备、服务、预览、构建或 Git 状态清理，原未提交工作与冻结候选保持。

## 迁移范围与保留的责任

相对 `apps/wechat-miniapp/src/`：

| 消费者 | 调用数 | 保留的责任 |
| --- | ---: | --- |
| `content/achievement/index.tsx` | 1 | 未登录时返回 My |
| `content/article/detail/index.tsx` | 1 | 无效文章/地点入口返回 Map |
| `content/contribution/contribution-editor.tsx` | 2 | 撤回后按 records/Map 选择回退；先挂起原生离开保护、失败后恢复；内嵌关闭与账号变化独立处理 |
| `content/contribution/contribution-records.tsx` | 1 | 正式地点当前身份读取、account/version/abort fencing、Map selection/camera 更新、pending 和错误恢复 |
| `content/event/modal-host-page.tsx` | 1 | 原事件关闭后 180 ms 返回，navigateBack 失败才回退 Map |
| `content/plan/detail/plan-editor-page.tsx` | 6 | 删除后回退与“已删除”事实、账号变化恢复、缺少有效地点恢复、未保存编辑离开保护和失败恢复 |
| `content/plan/list/index.tsx` | 1 | 未登录恢复到 My |
| `content/settings/index.tsx` | 1 | 原账号恢复入口；同步重试、账号清理和 auth reLaunch 不变 |
| `content/share/index.tsx` | 1 | 匿名公开分享接收；spot/plan/失效入口的 pending、身份/过期/页面资格与独立 failure/release |
| `content/spot-feedback/index.tsx` | 3 | 账号变化、不可编辑本人反馈、无剩余差异的原目标与恢复含义 |
| `features/spot/spot-detail-page.tsx` | 1 | 无效详情返回 Map 的重复抑制、失败状态和重试 |
| `spot/data-source/index.tsx` | 2 | 有效地点 footer 返回失败提示与无效入口恢复；来源查询资格和 EventChannel reading 分支不变 |
| `pages/auth/index.tsx` | 1 | 默认区域重置、位置意图取消和 attempt 资格、失败反馈与 own-finalizer |
| `pages/map/search-page.tsx` | 1 | 先回真实 opener；失败后且 intent 仍有效才回退 Map，双失败保留搜索内容和恢复信息 |

没有把上述不同业务恢复合并进导航 dispatcher。共享 owner 只负责主目的地原生派发，调用者仍持有原意图、取消、身份、pending、错误提示与清理。移除 achievement 和 spot/data-source 因此不再使用的 Taro default import，原命名生命周期 imports 保留。

## 开发验证

既有 9 个测试文件改为复用主代理提供的 `navigation/primary-page-navigation-test-support.ts`：加载实际生产 owner，只替换 `@tarojs/taro` native port。AST/VM 消费者不以独立 fake `openPrimaryPage` 代替真实 owner，也未添加只镜像封装的测试；原行为断言保留。

执行：

```text
node tools/run-node.cjs --import tsx --test --test-reporter=spec
  apps/wechat-miniapp/src/content/share/navigation.test.ts
  apps/wechat-miniapp/src/content/contribution/contribution-record-navigation.test.ts
  apps/wechat-miniapp/src/content/plan/detail/plan-delete.test.ts
  apps/wechat-miniapp/src/content/contribution/native-leave-guard.test.ts
  apps/wechat-miniapp/src/features/spot/detail-page-navigation.test.ts
  apps/wechat-miniapp/src/pages/map/search-return.test.ts
  apps/wechat-miniapp/src/pages/map/search-selection-lifecycle.test.ts
  apps/wechat-miniapp/src/spot/data-source/source-availability.test.ts
  apps/wechat-miniapp/src/pages/auth/location-intent.test.ts
```

实际命令以同一行传递所有参数。结果 **75/75 通过，0 fail / 0 skipped / 0 cancelled**，用时 3561.8201 ms。覆盖既有的 native 同步失败、异步失败与重试、导航重复抑制、hide/show、account/ABA/reset/Context/page/selection 退休、旧 finalizer 隔离、分享过期与匿名状态、计划删除成功但两条导航失败、native 编辑保护、来源部分/缺失资料独立恢复。

`npm run typecheck --workspace @starward/wechat-miniapp` 完整通过（exit 0）。分配生产范围内再次搜索 `switchTab` 无剩余直接调用；23 处调用与 14 个导入相符。针对分配的生产/测试目录执行 `git diff --check` exit 0，仅出现既有 `contribution-record-media.tsx` 的 CRLF→LF 提示，该文件本项未编辑。

本项无新增运行失败记录。以上是开发级消费者行为与类型证据，不证明真机导航方向、去底栏几何、原生栈、Map 保留/卸载或最终候选验收。本项已作调用链自查；独立审阅与更广的共同 owner 集成由主代理统一完成。
