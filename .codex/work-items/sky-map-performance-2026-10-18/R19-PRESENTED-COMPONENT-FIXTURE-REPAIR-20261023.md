# R19 presented component fixture repair — 2026-10-23

本记录只修复既有测试在新前景 owner 下的夹具失配，不改变生产代码，不代表 WEAPP / 手机已验收。原全量日志：
`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/my-navigation-miniapp-tests-20261023T020535072.log`。

## 原失败分类与修复

- `native-back-boundary-lifecycle.test.ts`：生产导出现在是读取 presentation context 的薄 wrapper。旧 fixture 的剩余 bare require 使新依赖落入应用 tsconfig 的 React 声明别名。改用唯一共享 `navigation/page-presentation-test-support.ts` 的已安装 React 18 / Taro renderer，递归加载完整 wrapper、context、native container owner；只提供 PageContainer / 原生生命周期端口。7 项原行为断言保留：初次 shown、单次 leave、异步命令期间卸载、新层 rearm、hide/show、失效回调、Map 子树保持及私有错误不泄漏。既有 `NATIVE_BACK_BOUNDARY_SOURCE` 反事实输入仍可用。
- `notification-host.test.ts`：旧 host 函数抽取遗漏 `usePagePresentation`；恢复操作仍将 primary 端口设置为 `switchTab`。现在恢复操作加载完整真实模块及 dispatcher；My / Map 动作实际改变同一个 controller，普通页面仍调用 native push，显式领域回调仍拥有动作。host 用真实 React、真实通知选择/可见性 owner 和注入的 native observer 验证 retained Map + My 两个实例在 Map → My → Map 时仅一处前景 host，退出过渡期间无 host；route、native safeTop、滚动到新队首、可见通知计时、hide/show、取消后的旧 timer 均保持真实行为。既有过期、触摸暂停、退出动画、替换队列与去重断言继续保留。静态组合检查区分实体 Map 根与委托给唯一 MyLibraryPage 的 RootPortal，而不是要求该 portal 再加一个通知 host。
- `data-presentation.test.ts`：dirty-leave 的旧 primary fallback fixture 仍用 `switchTab`。改为完整真实 CustomNav + usePageNavigation + primary dispatcher，经可控 native Back / reLaunch 接受或拒绝。两种返回外观都验证：取消保留 dirty、取消后能再次决策、授权后才清理、Back 拒绝后走共享 root 恢复、恢复也拒绝时重新标 dirty 并显示错误、锁释放后可再次决策。原其余数据/来源内容断言不变。
- `semantic-asset-test-support.ts`：为新 map 图标显式接入真实 `primaryNavigationIconPath`，不复制路径规则、不替换生产依赖。既有 semantic、retained package、poster 三处消费者一并验证。

与 hook fixture 代理协调后，仅在共享测试支持补齐这些窄端口：`taro`、native resize、同一 React commit 前的 hide/show cycle、先删除 timer 再触发的单次 fire/expire、warnings 捕获、source override、幂等 dispose、明确 null guest identity。首次组合试跑另暴露 fixture 的 `navigateBack` 错误要求参数；真实 API 允许 `navigateBack()`，已将测试端口参数默认设为 `{}`。该失败没有归因给生产组件，也没有恢复旧生产 API。

## 验证

在 `apps/wechat-miniapp` 工作目录使用既有 workspace 正式入口：

```text
node ../../tools/run-node.cjs --import tsx --test src/components/native-back-boundary-lifecycle.test.ts src/components/notification-host.test.ts src/components/data-presentation.test.ts src/components/semantic-asset.test.ts src/components/shared-rendering-regression.test.ts src/components/share-poster-package.test.ts
```

最终合跑 **33 / 33 通过，0 failed，0 skipped**，3.949 秒。日志：
`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/presented-component-fixture-check-20261023.log`。
上述 4 个指定 fixture / support 与协调的共享支持 `git diff --check` 通过。

未发现已确认的生产缺陷。这里证据只证明真实 JavaScript / React owner 下的行为及 fixture 兼容；PageContainer 原生 Back、My 的物理组合/方向/动画、实际通知遮挡与触摸、目标手机路线与内存仍由原 R19 / Goal 验收负责。未操作设备、服务、预览候选或 Git 状态。
