# B4 来源页往返：原生返回层所有权

## 用户结果与责任

从天体资料打开“来源与许可”页后，来源页应拥有其原生返回操作；返回星图后仍显示同一天体资料。星图的 `selectedCatalogObject` 在 `useDidHide` 后保留，供返回时恢复。此前 `NativeBackBoundary` 只看已选天体/日期等披露状态，星图隐藏后仍可保持自己的原生 Back 层，可能与来源页的返回竞争。

现在该层仅在 `pageVisible` 且存在披露时启用。隐藏星图会撤回其原生 Back 所有权，返回星图时由 `useDidShow` 恢复页面可见性；没有为来源页建立第二套天体选择状态。既有 `NativeBackBoundary` 在失活时忽略离开回调。来源页仍通过现有 `CustomNav` 返回，资料请求只在来源页可见时运行。

## 证据

- 新测试从实际 `spot-sky-page.tsx` JSX 提取 `NativeBackBoundary.active` 表达式，断言可见已选天体时拥有 Back、隐藏但保留天体或日期时不拥有 Back。修复前隐藏场景失败，修复后通过；共享边界原有测试同步改为核新条件。
- 相关返回、公共 Context 生命周期与原生边界 18/18 通过；Mini `typecheck` 通过。
- 正式 WEAPP 构建在专属 `sky-b4-source-0924` 隔离 slot 通过，日志 [b4-source-return-isolated-build-2026-09-24.log](b4-source-return-isolated-build-2026-09-24.log)。仅有已有三条 webpack 样式顺序/资产大小提示。

这只证明页面层所有权和本机构建；Android 来源页返回后 Canvas 曾在旧包失败，本次未使用手机，不能声称该故障修复或焦点/原生 Back 行为已通过真机。P1 仍须集中目标验证。
