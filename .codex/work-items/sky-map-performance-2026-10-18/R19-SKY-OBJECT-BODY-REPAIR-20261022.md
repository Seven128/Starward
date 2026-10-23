# R19 Sky 天体正文：共享视口候选修复

2026-10-22。执行子代理沿根代理分配修复 `R19-SOURCE-TARGET-REVIEW-20261022.md` 的 HR8162 资料正文空白 P2。读取根 AGENTS、当前交互/开发 Skill、DESIGN 小程序范围及 Sky 菜单/资料 owner；复用已采用完整菜单与长资料构图，不重新生成资源或减少内容。本报告为实施记录与自查，不是独立审查或目标验收。

## 已确认输出与仍未确认的原因

实际通过 `view_image` 查看当前 gen7 私有 `starward-device-feedback-TAV3wm/starward-device-test-bCQoHb` 的 `screen-434c3899-4c0b-4b66-b221-00e034e064f6.png`、`screen-f9906b47-fbe1-44ac-9a94-13c52331b38e.png`。两图均有 Alderamin / HR8162、定位/跟踪/来源动作及北353.1°/高度49.3°；分隔线以下大面积为空，未见介绍、事实或 loading/error/partial。这确认的是目标输出缺陷，不是唯一根因。

`SkyCatalogInformation` 的正文按 `useResourceQuery` 当前输出分别渲染 pending、error/unavailable、stale、partial 和有效 data；无数据（包括 query disabled）仍返回 `isPending=true`，所以单一 `active=false` 不足以解释连加载提示都没有。前置位置由另一个 query owner 提供，来源页也有独立可见生命周期；它们成功不能证明同次 modal 资料成功。本代理没有取得该 modal 的 query 回执、实际 WXML 或原生几何，未宣称网络已排除。

第一候选责任边界是 `SkyObjectDialog` 的原生滚动视口。旧路径在 flex item 上叠加 `flex:1 1 0`、百分比 height/max-height 减法和异步 header `boundingClientRect`。该测量可能在入场缩放中取得呈现尺寸，但未沿披露转场端点复测；即使数值有效，也没有实际证明原生 ScrollView 的内部可用高度。此为可由小改动收敛的候选假说，**尚未证明它是 gen7 空白的唯一原因**。

## 本次改变

- `features/sky/sky-object-dialog.tsx`：名称/核心区继续固定；新增普通 `View` 分配剩余高度，原增强 ScrollView 绝对填满此视口，原正文通过内部内容 View 传入。
- `features/sky/spot-sky-page.scss`：原16Px正文内边距移至内容 View；视口有限、内部滚动条和原弹窗外观不变。ScrollView 不再同时承担 flex 分配、header 高度减法和正文 padding。
- 退休 header `nextTick`/selector query、CSS 高度变量和唯一 `SkyObjectPriorityLayout` 通知。`sky-object-position-action.tsx` 仅移除这项测量触发；定位/跟踪、位置 query 的 suspended/retry、科学量和来源逻辑不变。标题、位置的实际高度变化由同一 flex 布局直接分配剩余空间。
- `sky-object-dialog.test.ts` 由已退休测量实现的抽取测试改为实际 React/Taro renderer 的内容交接检查：加载内容进入原生 scroll-view，优先区转为有效位置、正文转为部分资料/事实后，仍使用同一滚动节点且不保留旧加载内容。`sky-object-position-saving.test.ts` 移除无用的旧测量 port stub，原请求/动作断言保留。
- 未改 `spot-sky-page.tsx`，未动根代理并行的导航迁移；未改服务、科学内容、测量诊断、PLAN 或 HANDOFF。没有启动 IDE、构建、服务或手机输入。

## 已执行检查

`node tools/run-node.cjs --import tsx --test` 指定以下三个既有检查文件，**4项通过**：

- `sky-object-dialog.test.ts`：当前正文真实进入 Taro scroll-view、位置/资料状态更新保同节点。
- `sky-catalog-information-recovery.test.ts`：stale/unavailable/partial 保正确事实与重试，精确影像 publication 继续传给资料和来源 route。
- `sky-object-position-saving.test.ts`：共享时间提交仍暂停位置请求与相机动作。

`npm run typecheck --workspace @starward/wechat-miniapp` 完成 exit0。受影响文件 `git diff --check` 完成 exit0，只有既有 SCSS CRLF→LF 提示；旧测量标识在 Sky 源码中无残留。

第一次新 renderer fixture 因 React 相对路径少一层失败，修正后重跑全4项通过；这是测试 fixture 问题，不将它写成产品失败或 native 证据。该 renderer 不计算原生几何，检查通过也**不能关闭真机空白 P2**。

## 合批候选最小目标复验

gen7仍是修复前候选。根代理统一完整构建/同步后，在同一普通预览和实际 HR8162 入口确认：

1. 打开资料后，分隔线以下实际可见当前 loading、可恢复错误/部分资料，或真实介绍/别名/详细事实之一；不能再只保巨大空白。若仍空白，优先在现有有效通道分别取得正文 child/WXML、ScrollView及祖先可用矩形和同次 query 状态，不能仅继续猜数据或增加 CSS。
2. 长资料可在正文内部滚到最后有效事实，细滚动条出现；身份及原定位/跟踪/来源动作继续可见，既有字级/边距/科学字段完整，正文不穿出弹窗。直接点星体不新增搜索返回箭头。
3. 打开来源并原生 Back 后恢复同一 HR8162/地点/精确时刻与原星图，正文仍实际可见且可滚；不能以来源页 BSC 内容替代此项。同一 viewport 的报告目标保原短正文/参考时段可见即可，不扩大成无差别逐对象循环。

这些目标条件与根代理当前来源/导航合批验证共用一次候选。没有新增全面主题/硬件组合或重复预览要求；现有未验义务仍保留。Context `spot-and-sky.md:49` 所称“内容滚动与测量责任”在候选采用后应由根代理与同批事实对齐为“内容滚动与视口布局责任”，不把本实现报告当成 native 通过。

本次源码 SHA256：`sky-object-dialog.tsx` 为 `1fae3228548e6da09564bd3c62f3dfae8fc9ca7f9b68a7fa16f4786c79f4492b`；`sky-object-position-action.tsx` 为 `b9a8c1bcf5abe2453d91a9d4bfc2d26383b302934ea1d53bc6a9f93430c6809e`；SCSS 当时为 `9baff6297290f5169d9c337002a0b4c0853f488e5908643b2d6a7c9b190c9c24`。未赋予目标候选或最终交付资格。
