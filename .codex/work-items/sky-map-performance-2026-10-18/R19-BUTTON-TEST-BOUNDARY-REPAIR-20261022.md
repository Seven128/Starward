# R19 共享按钮测试边界修复（2026-10-22）

## 范围与结论

本次只修改以下 5 个既有测试，并新增一个共用测试 adapter；不修改生产组件、PLAN、HANDOFF、构建、手机候选、服务或 Git 状态。

- `components/share-poster-package.test.ts`
- `content/plan/detail/plan-reminder-destination.test.ts`
- `content/spot-document-fields.test.ts`
- `features/my/my-avatar-display.test.ts`
- `components/event-modal-motion.test.ts`
- 新增 `components/shared-button-test-support.ts`

以上路径相对 `apps/wechat-miniapp/src/`。修复后指定检查 14/14 通过。本次没有发现上述范围内的生产产品缺陷。

## 首个失败边界

以 gen8 已完成的全量检查为基线，不重复全量测试：私有日志 `r19-ui-20261022/ui-gen8-miniapp-suite.log` 和结构化 `ui-gen8-miniapp-failures.private.json` 记录这 5 个文件共 9 项失败。

前 4 组测试的 `vm.require` 白名单尚未接受生产新增的 `@/components/shared-button-press`，直接在导入阶段拒绝。事件弹窗的同类旧端口采用空对象回退，导致真实 JSX 的共享按钮类型变为 `undefined`，原 `type === "Button"` 查找因此失败。检查真实 `astronomical-event-modal.tsx`，选择及详情入口仍存在，状态与动作仍由原组件负责；这不是按钮业务已消失的证据。

## 共有修复规则

`sharedButtonTestBoundary` 读取并编译真实 `shared-button-press.tsx`，把其原生宿主接到调用方原有的受控 Button 端口。它只展开这一无 hooks 的共享边界，不递归执行事件详情等其他组件，也不改变各夹具的 hooks 与生命周期模型。它同时适配经典 JSX 的 children 参数及 jsx-runtime 的 `props.children`，保留按钮内的实际图片与文本树。

adapter 没有复制 disabled、loading、busy、点击、按压或域逻辑。禁用合并及点击拦截继续执行真实 SharedButton；重复提交、账号有效性、异步退役、只读与头像状态继续执行原生产 owner。没有为测试恢复旧生产 imports，也没有每文件复制按压实现。

## 保留的业务断言与检查

原断言未删除或放宽：

- 分享海报：真实包内图标 PNG 字节与路径，实际 native-image port 的解码成功后才绘制。
- 提醒身份验证：真实挂载门禁、快速重复点击、账号 A→B→A 后的中止、迟到结果不更新及卸载后不再提交。
- 地点文档：冻结长值完整文本、忙时保留编辑输入和值、空字段原生占位、设施选项禁用与完整多段正文。
- 头像：红光自动隐藏缓存彩色图、日间恢复相同图片和裁剪、明确选图后的原生 Slider 主题值及不意外保存。
- 事件弹窗：选择与详情按钮到达真实 owner，系统减少动态效果变化保留暂存选择/详情/预览日期，关闭退役旧 timer。

执行：

```powershell
node tools/run-node.cjs --import tsx --test apps/wechat-miniapp/src/components/share-poster-package.test.ts apps/wechat-miniapp/src/content/plan/detail/plan-reminder-destination.test.ts apps/wechat-miniapp/src/content/spot-document-fields.test.ts apps/wechat-miniapp/src/features/my/my-avatar-display.test.ts apps/wechat-miniapp/src/components/event-modal-motion.test.ts apps/wechat-miniapp/src/components/shared-button-press.test.ts
```

结果：14 项，14 通过，0 失败、跳过或取消；测试运行约 1.35 秒。包含既有共享按钮 3 项边界检查，确认禁用/忙碌拦截、原事件与平台处理器传递、无按压遮罩的关闭动作。

## 证据边界

这些测试执行真实生产组件与共享按钮 facade，但原生宿主仍是受控呈现端口。结果不证明 WEAPP 原生 hover、触摸取消、按压时序、真实颜色合成、动画或物理设备手感，也不完成 R19 或完整 Goal 验收。海报图像端口及各业务/生命周期模型保留原检查范围；全量检查、类型检查、构建与目标运行时验证由主执行者在合批里处理。
