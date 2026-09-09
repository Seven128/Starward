---
name: starward-design-resource
description: 为 Starward 组合 Tiny Context design-resource 与项目设计方法，使用 Stitch 探索、修改和采用可编辑设计资源，保留项目风格与持续偏好校准。用于设计资源任务，不用于普通实现修复。
---

# Starward Design Resource

这是 Tiny Context `design-resource` 的项目入口，保留 `$starward-design-resource` 的调用方式。用户说使用 design-resource 或要求生成、修改、整理、采用 Starward 设计资源时，也通过此入口组合项目方法。把普通产品描述和审美反馈转成可继续修改的资源；设计判断由 Agent 补齐，不要求用户提供排版参数。

## 读取与组合

1. 从仓库根读取 `project_context/global.md`、manifest 的默认项和本次页面/组件 owner。读取 `project_context/product-profile.md` 的设计质量、概念分工与跨场景一致性原则，根 `DESIGN.md` 的目标平台档案，以及 `project_context/context-maintenance.md` 的设计资源与持续校准两节。精确 tokens 留在 DESIGN，业务/状态留在 Screen Contract，已采用构图留在资源包；本 Skill 不另存风格事实。
2. 完整读取仓库安装的 [Tiny Context design-resource](../../../node_modules/project-tiny-context-harness/assets/skills/design-resource/SKILL.md)，按任务读取其 Stitch 或 adoption 引用；相对引用以包内 Skill 所在目录解析。通用生成、恢复、保存、交付与采用流程直接使用该能力，不复制一份到本项目。包缺失时明确报告缺少的文件，不声称已读取，也不自动换生成器。
3. 小程序按 [当前 owner 导航](references/starward-miniapp.md) 找到相关 Screen Contract、当前采用入口、源文件与视觉/动效参考，实际查看适用资源。使用 `.codex/skills/uiux_design/SKILL.md` 中适用于 WEAPP 的交互原则；原生 App 使用自己的档案和 Source，不继承小程序值。
4. 生成或视觉修订时读 [设计推敲方法](references/design-method.md) 与 [项目 Stitch 补充](references/stitch-route.md)。涉及复杂能力时，按设计方法先用成熟方案与真实示例校验功能范围和可行性，不等到开发阶段才调研；局部视觉微调复用既有结论。仅检查、整理或采用已有资源时无需建立生成连接。包内能力与项目扩展只加载一次，反向提及不形成递归读取。

## 保留的项目体验

- 视觉生成与修改默认由 Stitch 完成。Codex 协调跟随调用任务的实际模型/effort，不固定模型；宿主与 Stitch 服务模型分开，任务需要记录时以实际可见值为准，未知不猜测。
- 沿用已选方向，把用户普通语言、需要改善的具体区域与明确保留项交给 Stitch。新探索未指定数量时，保留从一屏两个有实质区别方向开始的项目默认；用户指定数量/范围优先，已有方向不重新制造候选。没有修改要求不凑修改轮数。
- 在设计资源阶段建立本次涉及的公共组件定义与消费者关系，按[设计方法](references/design-method.md#设计阶段就建立公共组件)复用/记录共享职责和变体，让后续开发沿用同一契约；可编辑共享资源、静态复制和生产组件分别如实标注。
- 按 DESIGN.md 小程序 §1.3 与产品 Context 形成正向设计目标：阅读重心、紧凑而可读的层级、恰当材质与图标、连续交互。实际查看有用途的参考区域；不预写一套任意精确字号/圆角/间距，也不把“简洁”降成默认控件或线框壳。同一业务对象沿用可辨认的共同表达。
- 首次交付包含原请求范围内的精修。按设计方法先看完整真实画面，再修具体比例、层级、密度或交互问题；保存原稿与修订，不以自评分替用户决定审美。可见面与独立命中区分别设计，不靠整体缩小获得密度。
- 资源留在 `docs/design-resources/`；按用户要求逐页推进。候选、偏好选择和采用范围遵循上游 adoption 与项目维护 owner；拟议的规则差异可留在候选 `proposed-design-delta.md`，不能悄悄覆盖现行要求。已有采用或实现授权直接执行其范围，不重复索取授权。
- 每次明确反馈、修订或采用后，执行维护 owner 的持续校准：在原 owner 更新有新增事实的原则、偏好、风格或页面决定及范围/原因，并修正相关旧说法。不能只更新资源链接，也不把单页材质自动推广到全产品。无新增事实不制造 Context 修改。
- 开发遵循 AGENTS 的通用契约及当前采用来源，无需再次调用生成 Skill。采用与生产迁移分别如实报告；升级 skill 不重新采用或重生成现有资源。

## 按需下游转换与检查

只有任务需要 Figma 交付时才读 [Figma runtime](references/figma-runtime.md) 与 [原生资源契约](references/delivery-and-review.md)。保留 Stitch 原稿，验证实际转换结果，不把 HTML 或截图冒充原生节点。

以下现有检查器只用于该 Figma 原生资源契约；普通 Stitch 资源不运行它们，也不启动旧 A/B 实验。需要时在仓库根用 Node 24+：

```text
node .agents/skills/starward-design-resource/scripts/preflight.mjs <run-directory>
node .agents/skills/starward-design-resource/scripts/check-resources.mjs <run-directory>
node .agents/skills/starward-design-resource/scripts/build-review.mjs <run-directory>
node --test .agents/skills/starward-design-resource/tests/*.test.mjs
```

这些工具只检查其声明的完整性/几何契约，不证明审美或生产完成。
