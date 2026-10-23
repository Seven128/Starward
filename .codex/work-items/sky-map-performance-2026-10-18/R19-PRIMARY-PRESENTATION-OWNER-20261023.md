# R19 primary Map/My presentation owner — 2026-10-23

本记录为父代理委托的限定实施与本机检查，不认证 WEAPP 合成、原生 Back、方向转场或真机完成。复用当前 checkout，没有改 PLAN、HANDOFF、Context、Map/My React、app.config、通用 hooks、设备、服务、冻结源码或候选。

## 已实施责任

`navigation/primary-navigation-controller.ts` 由旧 TabBar switch owner 迁为同一物理 Map Page 的唯一 My presentation owner：

- `createPrimaryNavigationController({ currentPage, changed? })`；`getSnapshot()/subscribe`、`show(owner)/hide()/dispose`、`openMy()/closeMy()`、`finishTransition(ticket)`、`owns(page)`、`isForeground(route)`、`presentationIdentity(route)`。
- 不可变 snapshot 为 `route/phase/transitionTicket/nativeVisible/foregroundRoute/disposed`。phase 只有 `closed/opening/open/closing`；根拥有实际动画与 timer，controller 不设延迟或 native 调用。
- 真实、相同且栈顶的 native Map 才能接收命令。重复同目标不重启；反向生成新 ticket；迟到完成不能完成新动画。同页布局 show 不换 snapshot/activation。
- 打开 My 立即退休 Map scope；关闭 My 立即退休 My scope，但 `closing` 时两者均非有效前台，Map 等 `closed` 后恢复需求/命中。closing 仍可被反向 openMy 接管。
- native 子页 hide/show 只暂停有效前台，不改变仍激活的逻辑 My identity；Map↔My 意图改变创建新 identity。卸载/dispose 后 identity、前台和晚到 ticket 全部无效。

`navigation/primary-page-navigation.ts` 保留 `openPrimaryPage(url): Promise<void>`，无 React、业务 store、计时器、第二 router 或全站 history：

- 当前 Map 的 My/Map 使用其 host 打开/关闭，不创建第二 Map。已有 native Map 的子页捕获实际 Page 与 delta，`navigateBack` 被接受并且该 Map 真实 show 后才应用最新逻辑目的；没有 Map 时仅 `reLaunch('/pages/map/index')` 建单一根，等待真实新 host show。
- 全局最多一个 host、一个 pending handoff 与一个最新 target。平台已经接受但 show 未到时持续等待；重复/新目标只更新同一次 handoff，不 timeout 重发。失败拒绝 promise，不选中目标，允许后续明确重试。在途观察栈暂不可读保留 unknown/pending，不派第二原生请求。初始栈不可读时拒绝本次操作并保当前状态，交调用者显示重试，不能把 unknown 当无 Map 而盲目 reLaunch 丢失未知状态。
- `pages/my/index` 在栈顶时打开 My 为 no-op；其 native 子页返回捕获的真实 My Page，保实例/scroll，必须由 wrapper 的真实 `useDidShow` 调 `showPrimaryNativePage(page)`，不能拿 promise 或栈投影冒充 show。
- 已接受回 native My 期间，最新目标若改成 Map，先等捕获 My 真 show，再按同一最新目标执行一次必要 Map 恢复；该操作有独立 ticket，旧 native callback 不能提交后一步。再次改 My 只改 Map handoff 的最终逻辑目标，不发第三原生操作。
- 新同名 Page 不能冒捕获 opener；原 opener 已被真实替换时拒绝。旧 host detach 不能移除新注册的 host。

共享即时端口：`registerPrimaryMapHost(controller): detach`、`subscribePrimaryMapPresentation`、`getPrimaryMapPresentationSnapshot`（无 host 恒 null）、`currentPresentedPageRoute(nativePage?)`、`readPagePresentationIdentity(page, route?)`、`isPagePresentationForeground(page, route?)`。只有实际栈顶、有效的 Map host 才投影逻辑 My；原生子页保自己的 Page identity/route。

## 本机验证

执行实际 controller，以及通过 `primary-page-navigation-test-support.ts` 执行的完整实际 dispatcher；仅替换 Taro native ports，没有模拟另一份路由实现。

```powershell
node tools/run-node.cjs --import tsx --test apps/wechat-miniapp/src/navigation/primary-navigation-controller.test.ts apps/wechat-miniapp/src/navigation/primary-page-navigation.test.ts
```

最终 **20 项通过、0 失败、0 跳过**，约 986 ms。覆盖真实 show/accept 两种顺序、防重、反向/晚 ticket、closing 不早恢复、布局同步、native child identity、同名不同实例、root 恢复、direct My 子页实例及 scroll、最新 Map 必要第二步、重新改 My、失败/重试、unknown 栈观察和旧 detach。

使用小程序现有 tsconfig 的 compilerOptions、`noEmit: true`，对 controller/dispatcher/support 及两份 test 的实际依赖建立 TS Program，最终 **0 诊断**。没有改 target/lib。初次准备检查发现 `findLastIndex` 超出既有 ES2022，已在生产 owner 改为向后有界查找；一次检查器缺 `noEmit` 参数的错误也已修正，不是产品失败。

自查已读当前上下文/授权独审与 interaction skill；实际查看当前采用增量的 `review-images/press.png`，确认 My 左入左出、新页右入、可接管与约 240 ms 的约束。此 owner 只提供状态/身份，不据此宣称已实现像素或实际动画。

## 根代理仍需整合与验收

旧 custom-tab-bar 的 `.open()/pending/failed` API 已退休；根负责移除 bar 生产消费者、接入 Map/My React、有效生命周期、唯一原生 Back、通知身份及既有调用夹具。My wrapper 必须在真实 native show 调 `showPrimaryNativePage`。Map 只从真实 Taro show/hide 驱动 controller，不能手工伪造 native 生命周期。

本代理短暂整替 dispatcher 期间别的测试曾报 `.tsx` fallback ENOENT；读文件时序未另采集，不能把推测当已证根因。最终文件仍是 `.ts`、支持器仍读真实 `.ts`，之后局部检查无该错误。随后只读运行 CustomNav 当前夹具为 8 通过/4 失败，四项仍依赖 switchTab-only fallback mocks/旧并发期望，已交根迁移；未把这些夹具或其语义冒充产品通过，也未改它们。

本记录不是独立审查。根整合后仍需必要独审、受影响检查，以及真实 WEAPP 的 Map→My→Map、Map→Search→Map 代表路径，验证同一地图状态、My 独立滚动、关闭后恢复、方向、中断、Back 和 native child/direct-entry 恢复。既有 gen8/QR 与真实手机待决边界保持。
