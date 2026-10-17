# 六组实机反馈的方案依据

这是用户照片/现场报告和有限源码核读，不是新一轮产品验收。完整原话及UX05–UX10在REQUIREMENTS，方法归唯一PLAN，当前运行/阶段只见CONTINUE。三图原字节在[图像与hash清单](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/user-feedback-2026-10-13/manifest.json)，仅作UI缺陷参考，不是天文素材的取得、加工或采用。手机物理照片有透视、反光及玻璃表面痕迹，不能量测精确投影、颜色或性能；源候选字节未独立确认。

| 输入 | 实际可见/用户报告 | 可支持结论与未决 |
| --- | --- | --- |
| [图1](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/user-feedback-2026-10-13/user-feedback-20261013-image-1.jpg) | 右侧M85/M98名称在边缘换行；其余M60/M91等与目录圈可见。用户报告拖动名字抖动。 | 名称完整边框布局确需处理；单图不能测抖动或证明与手抖同因。 |
| [图2](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/user-feedback-2026-10-13/user-feedback-20261013-image-2.jpg) | 全景天穹内多项M/NGC目录名、银河核心方向及边缘M81仍可见。 | 不能只核“恒星”名称；需分目录自动名、方向guide和显式选择，旧恒星局部证据不认证此全景行为。 |
| [图3](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/user-feedback-2026-10-13/user-feedback-20261013-image-3.jpg) | 时间面板18:30、四树形地景轮廓与显著亮色天穹边圈。用户报告滚动时短闪后消失、转夜后少星和黄白圈随后恢复。 | 四树闪现/时间闪烁作为真实用户失败保留；照片不足以判定是程序地景回退、大气层、缺图、旧时刻或混合结果。 |

当前实现核读：

- `sky-label-presentation.ts`的恒星自动名乘`skyObjectNameOpacity`，深空名沿`skyDeepAuxiliaryDecisionOpacity`，公共边缘渐隐只用锚点纵坐标；目标guide另经`projectSkyTargetLabels`。这些差异支持扩大公共名称规则和完整文字边框责任，不能直接给所有家族复制一份恒星算法或把照片中的全部名称判为选中名。
- `use-sky-orientation.ts`已在Android校准后接`createSkyPresentationFilter`，后者用Quaternion.js及已有速度自适应短弧旋转；raw attitude仍供校准。`device-orientation-view.ts`保已验证角度适配及曾拒绝的额外指南针拉回。新手抖要求允许重评当前显示滤波/实际接线与延迟，但没有理由叠第二层时间滤波、破坏停住/校准或断言现有滤波已足够。
- `sky-viewport.ts`的`skyInsetsFromControls`按底部控件上缘求bottom，`skyViewportCenter`把宽视场移向未遮挡区域中心；页面把该insets用于Canvas view、dome/pinch和拖动。新覆盖菜单要求明确取代菜单开关导致的投影重新构图，仍需保独立遮挡/命中/标签退场边界。
- 星点已有`sky-star-transition`的accepted显示过渡；地景已有`sky-landscape-readiness`与原native image生命周期。应抽取它们共同的“可用后按呈现时间渐显”责任并迁移适用消费者，不能新造图片资源库。不同光学LOD、透明coverage和source-over/加法仍由原家族持有；下载完成不等于可绘/成功呈现。
- `use-sky-landscape.ts`已有publication/Canvas/readiness和有效coarse-retention，`sky-scene-render.ts`已有真实mask/程序回退分支。时间闪烁必须追踪公共时刻、报告/几何资格与这些实际owner；不能仅因图3见树就指认网络或撤掉所有失败恢复。
- 现`LiquidGlassSurface`已有blur样式及reduced-transparency回退；CSS存在不证明微信Canvas叠层实际取样/性能。新方案先交付RGBA半透明覆盖层，低成本native模糊仅作经有界目标样本验证的增强；无全屏readback/第二Canvas/持续CPU模糊方案。

r49无障碍摘要修复先于本次新修订完成：修前真实漏名反例、修后4项受影响行为/Mini类型/源码独审/普通构建与预算通过，14:39实际普通天空/单中文名/星名/菜单已见；原生无障碍树与朗读未验，详情沿[native-label证据](native-label-submit-2026-10-13.md)。r50阶段观察只有类型通过，尚无build/推送/原生样本；收到本次计划请求后归档三probe/核两前像SHA并逐字恢复r49普通源码、helper退休，无手机输入，见[退出回执](../../../../output/cloud-sky-native-updated-ide-2026-10-12-r1/r50-scene-cost-interrupted.json)。不能把它当广角耗时归因结果。

本次方案修订的文档前像与原33行见同output目录的document-preimages.json、original-33-rows-before.json；它们仅保存旧文本，不是当前执行入口。旧失败/未验、原图/中间及全部未提交成果保持。

收口：`sky_feedback_plan_review`独立读回完整六组/方案/Goal/入口/相关Context与必要源码，实际查看三张保存照片并核SHA/字节，逐行核原33项保持，未发现阻断方案交付项。明确抖动两机制、目标透明度×就绪进度、源alpha/LOD/accepted信用、时间/四树未知根因和半透明/有条件模糊范围，旧菜单重构图Context矛盾已替换。仅只读审查，未改文件、跑产品检查/构建或操作手机；完成即关闭。

本轮文档验证：ty-context结构检查通过，13个相关Markdown文件的651个本地目标存在，受影响diff检查通过；原33行逐字对比不变、两普通源SHA恢复一致、临时helper已离开源码、三原图hash匹配。完整GOAL-TEXT已实际读回；这只证明保存/结构与一致性范围，不是产品正确性认证。方案请求后0产品测试/0构建/0手机操作，原生六组仍待后续明确开始后实施。Goal再次读回仍blocked/无预算，未改工具正文或创建重复目标。
