# R19 公共主目的地 owner 独立审查 — 2026-10-22

审查者：独立子代理 `primary_owner_review`。只读审查生产源码、消费者、测试与责任依据，仅新增本报告；未修改生产代码、PLAN/HANDOFF、资源或服务，未构建、预览或操作设备。

审查快照：2026-10-22 14:58 UTC；checkout `codex/remote-main-20260908`，HEAD `5b27a062c670cb2336e8e5c00c7e7a4071db0fac`。本地未提交成果是本次实际审查对象，HEAD 不代表这些成果已提交。

## 结论

**未确认本批引入的 P1/P2。** 当前可作为 R19 的共同依赖准备继续集成，但不是去底栏或新路由方案交付，也不建立真实 WEAPP 转场、导航栈或 Map 资源生命周期的通过结论。

本次依据为 AGENTS.md、`PLAN.md` 的责任/顺序及完整 R19 段、`REQUIREMENTS.md` 最新 R19、`R19-NAVIGATION-RESEARCH-20261022.md`、消费者准备报告，以及 global/architecture、Mini Program Screen Contract 和相关 DESIGN/交互技能规则。当前 My A/B 选择仍未解决；未把“继续”解释为批准其中一种。

## 审查结果与定位

1. **共同派发入口与未批准方案边界。** `navigation/primary-page-navigation.ts:5` 直接返回原 `Taro.switchTab({ url })` 的结果，没有新增异步包装、栈搜索、重试或可见性状态。原生同步抛错、Promise 成败及生命周期保留。`primary-navigation.ts:10–19` 的 URL 类型和精确识别来自既有 Map/My 声明，不增加目的地或第二套路由表。`app.config.ts` 的 tab 注册、`pages/my/index.tsx` 和 `use-page-navigation.ts` 在当前 diff 中未改；因此本批没有暗选 A、B 或 Skyline，也没有把旧 TabBar 隐藏后称为新产品模型。

2. **依赖方向。** dispatcher 仅运行时依赖 Taro，`PrimaryPageUrl` 为 type-only import；调用者依赖 dispatcher，没有反向引用页面、store 或业务模块。新增 test support 只供测试运行实际生产 dispatcher，并只替换 Taro 原生 port，不进入生产依赖。没有发现本批引入的循环依赖或业务真值复制。

3. **controller、通用返回与 Sky。** controller 的 `switchTab` port 政名为 `openPage`，但 `currentPage`/visible/revision/pending、真实 show 才提交选择、失败保原页面和迟到回执隔离均未改变。custom TabBar 供给实际 owner。`CustomNav` 仍先执行 dirty-leave 授权、复核原 attempt、尝试 Back，再仅由当前 attempt 使用原 fallback；未知栈和失败提示没有被 dispatcher 接管。Sky `returnToSkyEntry` 仅两处派发替换，`beginReturn/cancelReturn`、小快照资格、黑场、超时及 own-finalizer 保持原责任；没有把已卸载 Map 改成无条件 Back，也没有添加第二次超时导航。

4. **真实消费者迁移。** 对消费者准备报告列明的 14 个文件、23 处原 direct `switchTab` 逐项核对当前 diff；主目的地字符串、参数选择、同步/异步调用位置及原 catch/finally 均保留。重点核查 Search 的真实 opener 优先、当前意图才能 fallback，Auth 的 attempt/位置意图，贡献记录的身份与选点，编辑器 dirty-leave 保护，计划删除后原恢复，分享当前请求的 fail/release，地点/来源的错误恢复。没有把各领域身份、取消或恢复责任合并进通用 dispatcher。生产源码搜索 `switchTab` 后只剩 dispatcher；测试原生 port 不属于遗留产品调用。

5. **通知主页面恢复。** `components/notification.tsx:44–50` 先保留显式 `onAction`，否则仅精确 `/pages/map/index` 与 `/pages/my/index` 进入共同 owner，普通路由继续 `navigateTo`。`NotificationAction.navigation` 删除前在当前生产消费者中没有赋值；现行有 route 的通知为权限说明 `/pages/auth/index`，其 push 行为保持。通知队列、pageRoute 归属、单宿主、可见计时和隐藏 cleanup 未因该迁移改变。未发现依赖该已删除字段的生产恢复动作。带参数、片段或其它近似字符串不被当成当前 primary URL；这不是新增的主页面参数协议。

## 本次验证

独立执行新增通知派发分支的单项检查，理由是它是本批唯一从动态 method 改为目的地选择的行为变化；未重复完整消费者套件或构建：

```text
node tools/run-node.cjs --import tsx --test --test-reporter=spec --test-name-pattern="notification recovery reaches primary pages" apps/wechat-miniapp/src/components/notification-host.test.ts
```

结果：**1/1 通过**，0 fail/cancelled/skipped；756.2341 ms。该测试运行生产 `NotificationComponent` 动作和真实 dispatcher，替换原生 port，验证 Map、My、普通权限页，以及显式领域动作优先。现有 75 项消费者检查与 typecheck 的通过沿用准备报告，不冒称本审查者重新执行。

另外审阅 controller 的重复/失败/真实 show/迟到测试、CustomNav/native Back 测试适配、custom TabBar 适配、Sky 返回与消费者 VM 适配；它们保留原行为断言，未把生产 owner 换成独立空 stub。开发级源码与 VM 证据不能代替目标运行时效果。

关键审查字节：

- `primary-page-navigation.ts` SHA256 `bad00b1b8e9bc6eb26f7722aafed809941c60f773885676789bcc87f36e42930`
- `primary-navigation-controller.ts` SHA256 `803cdf6bbb37c0038e8dfe10e50280258a6c5e5e75a1ef39cc84f8fe2f66fb15`
- `components/notification.tsx` SHA256 `2170db4838b4f0147b67b5ab3573cc1b5b150732169865154c855ec8b14e1682`

## 剩余边界

- My A/B 的方向/真实页面或有效可见性职责取舍待明确。当前 native dispatch 仍是旧机制，不能据此删除 tab 注册后直接验收。
- 最终路由方案确定后，shared owner 必须完成真实 opener、无根直达、通知/分享恢复和 Sky 重建 Map 的新机制，再退役旧 cover/订阅/几何。不能仅把 dispatcher 内 `switchTab` 全局替换成 `navigateTo`：那会改变 Map 唯一性、栈界限和 Sky 已卸载返回语义。
- 原生接受之后的 show/unload、正常 Back、隐藏与卸载差异、My 与 Search 实际方向/状态连续性及 Map→Sky→Map 资源释放，仍需新候选的目标运行时证据。当前无新候选运行审查，也未审阅新的转场视频，因此这些项保持未验证。
- 共享 dispatcher 目前没有夺取各调用者的 pending、超时、身份或失败恢复所有权。本报告不把旧调用者未改的潜在问题扩写为本批回归，也不宣称整个 R19、性能或内存 Goal 已完成。
