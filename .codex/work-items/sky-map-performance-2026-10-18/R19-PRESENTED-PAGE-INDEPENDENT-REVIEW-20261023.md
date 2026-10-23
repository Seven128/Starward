# R19 共享前景、Back 与迟到操作独立审查 — 2026-10-23

本次由父代理委托，目标为当前 WEAPP 的 Map-host My。审查代理只新增 `apps/wechat-miniapp/src/navigation/page-presentation.test.ts` 与本记录；生产修复由父代理完成。未改 PLAN、HANDOFF、Context、冻结构建或私有原件，未执行设备、服务、预览、发布或 Git 状态修改。读回 checkout 为 `codex/remote-main-20260908` / `5b27a062c670cb2336e8e5c00c7e7a4071db0fac`，现有未提交成果保留。

## 结论与范围

发现并复现 **1 个 P2**：Map-host My 的已知 `native()` 相册交接若先返回回调、后到达真实 `didShow`，`useAccountOperation` 会把同一个保留逻辑 owner 误读为实际 Map Page，提前退休操作。父代理修复后，同一失败检查通过；反向边界仍拒绝隐藏新意图、不同实际 Page 与新逻辑 activation 的旧结果。此次范围内没有第二个已确认 P1/P2。

新增 6 项行为检查全部通过（6 pass / 0 fail / 0 skip）。这是完整实际模块在本机安装的 React/Taro renderer 下的受控证据，**不构成目标 WEAPP 原生合成、方向动画、物理 Back、系统相册或内存验收**，也不认证整个 R19 或 Goal 已完成。

## 要求与实际审查输入

- PLAN 的 R19 与 execution order：一个物理 Map、My 独立滚动与前台责任、Map 隐藏不同于 Sky 卸载；新旧输入和迟到结果受同一 owner 约束；同一原生 Page 不得竞争多个 Back 容器；通知只由当前前景计时。`R19-MY-NAVIGATION-AUTHORITY-AUDIT-20261023.md` 给出 B 的授权和边界；没有将旧 A/B 等待重新作为阻塞。
- 当前 `uiux_design/SKILL.md`、`starward-miniapp-development/SKILL.md`、global/WEAPP Screen Contract、DESIGN 当前导航/按压条款及 development-feedback。最新无障碍排除范围保持，没有因 Skill 的通用检查列表扩张验收。
- 完整读取 `page-presentation.tsx`、primary controller/dispatcher、`use-primary-navigation`、`use-page-navigation`、`use-account-operation`/`account-operation`、`use-wechat-login`、`native-back-boundary`、red-light handoff、notification/visibility/page-route；读取 Map 当前承载/有效 hide/Back/My portal 段及 My native wrapper、唯一 My body、avatar/nickname 和 account navigation 实际消费者。未把另一代理尚在迁移的旧 bar fixtures 当新产品缺陷。

## P2：已知 native 交接的保留身份误读

修前的 `use-account-operation.ts` 只有在 `currentPresentedPageRoute(nativePage) === presentation.route` 时使用逻辑 activation。实际 Map-host My 调用相册期间 native hide 会让 controller 的前景资格变为 false，`currentPresentedPageRoute` 因而返回 `pages/map/index`。此时 `read.page` 从 My activation 改为实际 Map Page；相册回调先于 `didShow` 时，`operation.isCurrent()` 的真实 `observe()` 以 page 不同为由退休，即使已有 `nativeDepth` / `returning` 保护。

第一轮真实模块复现：3 项中 2 pass / 1 fail，失败项为 `known native media callback before didShow keeps the same My account operation`，期望 true，实得 false。这个检查控制的是既有支持的回调/onShow 顺序，不声称已经观察到当前手机发生该顺序。

父代理修复为：用 `readPagePresentationIdentity(actualNativePage, presentation.route)` 与保留的 `presentation.identity()` 比较，选择同一逻辑身份；前景资格仍由 `presentation.isCurrent()` 限制新 `begin`。未让任意 native 子页、未知 Page 或新 primary 意图共享身份。修后原 3 项相同检查全部通过，然后补核下面 3 项反向/通知边界，最终 6/6。

## 行为检查及覆盖边界

最终局部命令（cwd 为 `D:/dev/Starward/apps/wechat-miniapp`，与 npm workspace 的 tsx/tsconfig 入口一致，显式限定本文件）：

```powershell
node ../../tools/run-node.cjs --import tsx --test src/navigation/page-presentation.test.ts
```

| 检查 | 实际建立的证据 |
| --- | --- |
| mounted My 前景与导航 | 实际 Context、layout effects、`useSyncExternalStore` 和 lifecycle：隐藏不卸载；普通 native child 的 hide/show 保留 epoch；已接受导航可完成但不能写隐藏 UI；逻辑切换永久退休旧导航；My closing 时 Map 尚未恢复。 |
| 已知相册 callback 先于 show | 实际 `useAccountOperation` / `createAccountOperationOwner` / controller：native hide 保留同一 owner，回调及 show 后仍 current，最终只释放一次 busy。此为修前失败/修后通过的回归。 |
| 子任务 Back | 实际 `NativeBackBoundary` 在 provider 下只注册逻辑任务，没有新增 `PageContainer`；同一个进行中的 Back Promise 合并重复调用；editor commit 后下一次 Back 返回未消费，不连关 My；重新编辑可重新消费。 |
| 反向权限与实际 Page 身份 | 隐藏时不得 `begin`；已知 native allowance 中的不同真实 native child 或 My→Map→My 新 activation 都永久退休旧操作，后续返回不能复活。 |
| session renewal | 使用实际 Zustand vanilla store 的订阅和实际 account owner：已声明的同账户 A→null→A renewal 可推进 reset，保持同一操作；没有更改生产 renewal 规则。 |
| 通知归属和计时 | 完整 `FloatingNotificationHost` / `FloatingNotification` / visibility effect / 实际队列选择与 route owner：Map 和 My 只渲染当前通知，只有一个 3000ms 可见计时；native hide 和 My closing 为零；恢复后当前页重新计时，隐藏不删除未读队列。 |

最终结果为 6 pass / 0 fail / 0 skip，3038.2047ms；该局部结果不表示仍在合批修复的 npm 全量已经通过。fixture 使用本机实际 React 18.3.1、Taro renderer/runtime 4.2.1，真实 renderer 的 root `setData` 端口受控。生产模块完整转译并执行；只控制原生 Page stack / show-hide /组件端口、可见性交叉观察、服务账户读口和计时器。没有截取业务函数或手工模拟 React hooks，没有新增通用测试框架。真实 Map、My 全文与原生组件合成没有装入此 fixture，保留在目标验收。

准备中有两项已修 fixture 边界：通知初次直接 require workspace root 的 Zustand React adapter 使用了另一份 React，报 null `useCallback` dispatcher；之后 root-cwd 局部 6/6，但父代理 npm workspace 全量入口暴露 `react` 名称被小程序 tsconfig 映射至 `@types/react/index.d.ts`，本文件六项都在加载入口失败（`index_d_module`）。最终本 fixture 显式由 miniapp installed package 定位实际 React 文件，并将完整安装的 JSX runtime、react-reconciler、`zustand/react` 模块绑定到同一 React 实例，再按上述 workspace cwd/入口通过 6/6。没有修改这些依赖的实现或生产模块，没有放宽产品断言；两次加载准备失败均不是产品缺陷。父代理已报告合批 typecheck 退出 0；当前最终全量与 build 仍由其记录，此处不另行宣称。

## 修后核对的源身份

以下 SHA-256 是本次 6/6 后的读回；后续若这些 owner 再变，按相关行为重新核对，不把本记录扩大到未来版本。

| 源 | SHA-256 |
| --- | --- |
| `navigation/page-presentation.tsx` | `07c47f2623869688be61b975784a822304f54ec2db48dda63d72a31fd8055115` |
| `navigation/primary-page-navigation.ts` | `23f2678d50f48282d31de466e16551a51657c2eee24cd531f8abc3da9fc16f3a` |
| `navigation/primary-navigation-controller.ts` | `016ddf1b6882e038f801410638acfa043ee5973e6c854eb488ca856312422367` |
| `hooks/use-account-operation.ts` | `b960745e0870d41907f8ba9dfd7e1234b525b30104e73d499421b64cb6407812` |
| `hooks/use-page-navigation.ts` | `c305ed7b7d27e8e0c2e5a165f5b0a83f482d118573108ff7009a5c114464383b` |
| `components/native-back-boundary.tsx` | `45b1dde9766e055f19d263d5c7c0deffe641a06646b3fd12503e9178f82baff5` |
| `components/notification.tsx` | `5f829c48b64a6a157e9be587090766c709e6e1f88b4caa5a207731ffe932a48c` |
| `state/notification-page-route.ts` | `abd7f19b0c3f270d1f44794620b7660ac5d9b9f325e06eac98b510a79a11b3f5` |
| 新增 `navigation/page-presentation.test.ts` | `9a8d84edc3f7e761cccccdfe305eeb5d1c9990be85460988fbb5b01dac3e1234` |

## 仍需目标运行证据

按 PLAN 的当前有效候选观察 Map→My→Map、Map→Search→Map、My 编辑/登录/照片 Back、普通子页返回和通知前台。需要检查实际原生 Map/PageContainer/RootPortal 层级、方向及中途接管、Map 状态与 My 滚动、回调/onShow 两种顺序的实测可用性、隐藏查询/资源与最终恢复。原生相册的亮屏提醒和权限/取消保留原 owner；本机成功不替代必要目标观察或持续内存结果。此次没有新建手机资格，也没有把未回复的扫码视作完成。
