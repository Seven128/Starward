# R19 有效页面共享 hook 夹具迁移（2026-10-23）

## 结论与范围

本次仅迁移测试边界，不修改生产实现、PLAN、Context、HANDOFF、设备、构建、服务或 Git 状态。四组原有 26 个失败用例已迁移到真实展示页 owner；加入同一物理 Map 的 My ABA、My 登录隐藏取消、未完成原生主页面交接复用三个有具体机制差异的检查后，正式入口 **29/29 通过，0 跳过**。同批工作区正式 TypeScript 检查退出 0。

涉及文件：

- `hooks/use-account-navigation.test.ts`：14 项。
- `hooks/use-wechat-login.test.ts`：4 项。
- `content/settings/location-handoff.test.ts`：2 项参数化机制检查。
- `content/share/navigation.test.ts`：9 项。
- `navigation/page-presentation-test-support.ts`：共同测试载体；组件夹具迁移代理同时复用，并协调追加原生 resize、单次 timer、同步 hide/show、既有反事实 source override 等窄端口。

## 原失败与修复边界

原完整 Mini Program 日志：

`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/my-navigation-miniapp-tests-20261023T020535072.log`

四组共 26 项原失败都停在新增依赖边界：旧 VM loader 没有注入 `usePresentedPageLifecycle`，或直接拒绝 `@/navigation/page-presentation`。旧登录测试还替换了生产账户 hook，设置测试抽取函数体，分享测试仅模拟退役的 `switchTab`；这些路径无法证明当前共享 owner 的实际语义。

新共同载体直接运行 Mini Program 已安装的 React 18、Taro React renderer 与 runtime；通过完整模块载入执行 `page-presentation.tsx`、`primary-page-navigation.ts`、`primary-navigation-controller.ts`、页面导航、账户导航、账户操作及登录 hook。原生生命周期只是控制进入实际 Taro hook 的端口，未替换为 noop 生命周期。Zustand 使用实际 vanilla/react adapter，并绑定同一个 Mini Program React。明确指定 runtime React 路径，避免正式 tsx 入口把类型声明路径当作运行代码。

设置与分享均运行完整生产页面。设置从实际 `SettingsControls.openSheet("LOCATION")` 到实际 `SettingsSheet.openLocation`，检验导航成功回调的 EventChannel；不再抽取函数体。分享运行实际公共接收与主页面 dispatcher；无原生栈时失败/恢复、同步 dispatch 拒绝及明确拒绝后的新重试仍被断言。远端 API、账户存储、原生 API 和无关展示叶是明确受控端口；没有私有数据、真实登录、剪贴板或外部访问。

## 保留的行为与双 dispatch 假设修正

- 账户 ABA、reset、identity mismatch、卸载与新请求均不能复活旧账户操作；旧 finally 不能释放后继锁。
- 正常 native hide 后，已接受 handoff 的成功清理仍可完成；隐藏或已退休的源页面不得发布失败 UI。
- 同一物理 Map 上 My→Map→My 改变逻辑激活身份，不能复活旧导航或旧登录；逻辑隐藏会取消正在等待的登录信号。
- 未知原生页面/读取失败保留明确恢复反馈，不盲发导航。
- 设置定位意图在正常原生导航 hide 后仍交给目标；账户 ABA、map reset、identity mismatch 或卸载后不得交付。
- 分享参数 A→B 后，实际 `requestSpotOpen` 写入序列严格为 `["public-spot", "new-public-spot"]`。过期卡片进入 missing 后，“返回地图”不增加 viewport/spot 写入次数。

旧分享夹具假定 hide/show、参数变更或过期后可以直接发第二次 `switchTab`。真实共享 dispatcher 的未完成 primary native handoff 只保留一项，当前新意图复用同一真实 Promise；它尚未拒绝时不能把第二次物理 dispatch 作为正确性条件。现已分别检查：旧 caller 已退休且没有当前 caller 时，迟到失败无反馈；当前有效 caller 正等待同一真实 Promise 时，可显示该真实失败；明确拒绝后的显式 retry 才发一项新的 native 操作。主代理核对并认可这一生产机制，未因此放宽失效 caller 或业务写入断言。

## 实际检查

从仓库根目录运行：

```text
npm run node -- --import tsx --test apps/wechat-miniapp/src/hooks/use-account-navigation.test.ts apps/wechat-miniapp/src/hooks/use-wechat-login.test.ts apps/wechat-miniapp/src/content/settings/location-handoff.test.ts apps/wechat-miniapp/src/content/share/navigation.test.ts
```

结果：29 tests / 29 pass / 0 fail / 0 cancelled / 0 skipped；耗时约 4.53 秒。完整本机日志：

`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/presentation-hook-fixture-tests-20261023.log`

```text
npm run typecheck --workspace @starward/wechat-miniapp
```

正式 workspace TypeScript 5.9.3 入口退出 0（工具会话 `80144` 完成回执）；未修改 tsconfig 或调用根 TypeScript 6。受影响文件 `git diff --check` 退出 0。

这些证据只证明声明的真实 React hook、共享状态与受控原生端口语义。未运行 WEAPP 编译、DevTools 或手机操作，不能替代真实 Page 栈、原生 Back、My 方向转场、同层地图或设备验收；其未验义务继续由主 Goal 保留。
