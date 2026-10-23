# R19 primary return consumer fixtures — 2026-10-23

本记录是根代理委托的限定测试迁移与本机验证，不认证 WEAPP 实际页面、方向转场、原生 Back 或手机完成。没有修改生产 dispatcher、controller、业务 caller、PLAN、HANDOFF、Context；没有设备、服务、构建、Git 或上传操作，既有 dirty 工作与失败日志保留。

## 修复边界

生产已退休 TabBar，并由 `primary-page-navigation.ts` 对真实栈选择 `navigateBack` 或单一 Map 根的 `reLaunch`。这次八份旧消费者夹具仍只提供 `switchTab`，或为每次栈读取返回新对象，不能建立实际 dispatcher 所需的 Page 身份和真实 show 资格。迁移范围：

- `content/contribution/contribution-record-navigation.test.ts`
- `content/plan/detail/plan-delete.test.ts`
- `features/sky/sky-page-navigation-ownership.test.ts`
- `features/sky/sky-return-entry.test.ts`
- `features/spot/detail-page-navigation.test.ts`
- `pages/auth/location-intent.test.ts`
- `pages/map/search-return.test.ts`
- `services/one-shot-location.test.ts`

`plan-operation-test-support.ts` 无需修改。计划删除仍使用原有真实 account operation owner，保留取消、账号 ABA、卸载/实际离页、旧完成不能释放新锁，以及已知 native confirmation 的 callback-before-show / show-before-callback 两种顺序。

共享 `primary-page-navigation-test-support.ts` 保留原 `primaryPageNavigationForTest(taro)` 的完整实际模块执行和 native 错误语义，仅增加显式 `primaryPageNativeRuntimeForTest(initialStack, onNativeCall?)`：初始栈必填，native call 为独立 deferred，`setStack`、`showMap`、`hideMap` 分别由测试驱动。它使用真实 controller 注册/show，不在 native 接受时自动投影栈或捏造 show，不添加 `switchTab` 兼容，不把未知栈当无 Map。可选观察器只把实际发出的 native call 加入 Sky 原有来源导航记录，以保持调用顺序。

## 保留并补强的实际行为

- 正式贡献记录使用当前公共 spot 身份与名字，保持地图更新顺序；回到捕获的同一 Map 后才释放打开锁。native acceptance 本身不能完成 handoff。
- 详情恢复在失败后保内容与重试状态；明确重试只创建一份 native Map root，接受回调和栈投影都不能提前清除失败，必须等真实 host show。
- Search 正常返回保同一 Map；无 Map 的直接入口先验证原生返回失败，再走实际 Map root fallback；只清自己捕获的恢复提示，双失败仍可恢复。
- 默认区域按钮先清旧 GPS 意图并重设区域，再真实返回 Map；等待 show 时重复点击不能再创建 Map。取消后的旧 GPS 回执不能覆盖区域或发提示。
- Sky 退出仍等整页黑场完成，受控 `Map.mapUnloaded()` 后从仅 Sky 的真实测试栈重建唯一 Map 根。接受、实际栈、show、Map 的 mounted/ready/reveal 保持不同责任；元数据/空 Context 不阻止恢复。
- 来源入口的画面身份、资源替换、Context/binding/隐藏/卸载/校准退休，Back 先关 disclosure，及隐藏后旧返回不能启动 fallback/发异页通知，全部保留原断言。

## Sky 超时旧断言为何更换

旧夹具把 10 秒 UI 超时后的第二次返回当成第二次独立 `switchTab`，据此要求第一份 native 拒绝不能取消第二份 Map 重建。当前 dispatcher 的已确认责任是 **一个不可取消的 native handoff**：UI 超时只释放黑场，后一次 UI 返回加入同一 promise，不能盲发第二个 root。故同一真实 native 拒绝会使两张 Sky lifecycle return ticket 均失败；这不表示另一次实际 Map 重建被取消。

根代理已确认按该机制验证。替换的断言验证：超时后 lifecycle 意图仍保留、再次 UI 返回实际 native call 仍只有一份、唯一操作真实拒绝后双方票据释放，随后明确重试才允许新 root；新 root 接受后仍必须真实 Map show，最后唯一 Map 的 readiness/reveal 仍由 Map 自己完成。迟到 native 成功恢复 Map 的独立用例，以及旧隐藏/卸载回调不能做 fallback 的用例继续保留。没有放宽生产防重、未知栈或晚回执守卫。

## 本机验证与证据

既有全量失败日志由根保留在私有 `r19-ui-20261022/my-navigation-miniapp-tests-20261023T020535072.log`。本代理初次运行八份范围得到 60 项中 49 通过、11 失败，失败均落在上述旧 native ports/栈/show 或旧双操作机制；终端返回曾截断，该截断结果不替代根的原完整日志。

正式迁移后执行：

```powershell
node ../../tools/run-node.cjs --import tsx --test src/content/contribution/contribution-record-navigation.test.ts src/content/plan/detail/plan-delete.test.ts src/features/sky/sky-page-navigation-ownership.test.ts src/features/sky/sky-return-entry.test.ts src/features/spot/detail-page-navigation.test.ts src/pages/auth/location-intent.test.ts src/pages/map/search-return.test.ts src/services/one-shot-location.test.ts
```

结果 **60 通过、0 失败、0 跳过，2587.6451 ms**。完整私有日志：

`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/primary-return-fixture-check-20261023-1.log`

按现有小程序 `tsconfig.json` 解析 compilerOptions，使用本项目 TypeScript **5.9.3**，对八份测试和共享支持器共九个实际 roots 及其真实依赖建立 `noEmit` Program，**0 diagnostics**。没有更改 tsconfig、target 或 lib。日志在相同私有目录的 `primary-return-fixture-typecheck-20261023.log`。

这些是实际模块加显式 native ports 的本机测试；提取页面命令的夹具仍只提供有界命令行为证据。真实 WEAPP 的 Map→My→Map、Map→Search→Map、原生 Page 回程/方向/动画/屏幕合成，以及尚未绑定的 gen8 手机 UI 验收仍由根继续，不被这次测试通过替代。
