---
name: starward-design-resource
description: 为 Starward 使用 Stitch 探索页面风格、生成与局部修改设计候选，检查真实渲染并交付可编辑资源。用于明确的设计资源任务，不用于普通代码修复、后端或发布。
---

# Starward Design Resource

把普通产品描述和审美偏好转成可编辑、可回看、可继续修改的资源。设计判断由 Agent 补齐，不要求用户提供排版参数，不以固定模板或自评分保证审美。

## 执行模型

Codex 协调、需求整理与检查跟随调用任务的实际模型和推理档位，不固定 Astra。视觉生成与修改默认使用 Stitch（用户于 2026-09-07 明确选用）；Stitch 的服务模型不受 Codex 任务设置控制。分别记录 Codex 宿主模型/effort 和 Stitch 可见模式/模型；无法核实时填 `unknown`，不让模型自报补齐。

只有明确复做旧 Codex A/B 方法试验时才要求成对调用模型和档位一致。Stitch 与旧 Codex/Figma 路线属于生产路线比较，不声称同模型实验。独立评审或会话隔离如获授权，应继承调用任务设置。

## 范围与读取

先读用户输入、`project_context/global.md`、manifest 所需 owner、根 `DESIGN.md` 的小程序段及当前代码。小程序任务使用项目 `.codex/skills/uiux_design/SKILL.md` 的适用交互原则；不安装 React Native 依赖。首次地图/我的任务按 [starward-miniapp.md](references/starward-miniapp.md) 定位当前职责。

业务与交互不因视觉探索改变。默认只写本次设计资源与生成脚本；候选差异留在 `proposed-design-delta.md`，用户选定前不改根 DESIGN、生产页面或已采用资产。推荐标为 `recommended-unapproved`。不发布、不采购、不自动公开文件；此 Skill 不管理任务生命周期或建立长期验收工作流。

## 执行

1. 建立 `brief.md`：必须保留职责、希望改善的问题、探索范围、设备/素材和外部缺项。记录 HEAD、输入哈希、实际模型/effort 的宿主来源、工具版本；未知为 `unknown`，未知用量为 `null` 并解释。当前截图必须来自当前运行，缺失不能以历史图替代。
2. 按 [stitch-route.md](references/stitch-route.md) 使用现成官方工具/MCP或已登录网页。先跑通本次所需连接；不开发通用适配器，不以 Figma 探针作为 Stitch 生成前提。
3. 用 [design-method.md](references/design-method.md) 检查需求和结果，向 Stitch 传达产品职责、普通语言偏好、具体参考区域及用途。专业排版补全交给 Stitch，不预写一套精确字号/圆角/间距让其照抄。已有选中方向时延续它；新探索默认从一屏两个有实质差别的方向开始，用户数量与范围要求优先。
4. 保存 Stitch 的完整原稿、实际提示词与参考，再按相同内容视口展示真实渲染。Codex 不先重绘/精修再冒充 Stitch 默认产出；候选名称、说明和装饰展示留在产品画面外。
5. 用户选定方向后，将普通语言反馈和明确保留项传给 Stitch 做局部修改。新探索默认先验证一次修改；不暗中追加候选。保留修改前后与额外输出，技术失败/重试单记。没有具体修改要求时不凭空制造新一轮。
6. 有明显价值且在授权范围内再延伸页面或补充状态。范围由当前请求决定，不自动展开旧测试计划中的全主题、全状态矩阵。静态原型不证明真实连续手势和产品交互。
7. 按 [stitch-route.md](references/stitch-route.md) 交付实际支持的项目链接、原始 HTML/图片或其他可编辑产物，报告业务、可读性与命中区域问题。需要 Figma 时再按 [figma-runtime.md](references/figma-runtime.md) 检查转换，并使用 [delivery-and-review.md](references/delivery-and-review.md) 的 Figma 契约；转换成本单列，不提前承诺原生节点资源。

## 逐页交付与采用

小程序页面资源的保存、权威分工、采用与像素还原规则由 `project_context/context-maintenance.md` 的 `Mini Program Page Design Resources` 节维护。生成、替换或采用小程序资源时必须读取；开发读取义务由项目入口和 Screen Contract 承接，不依赖开发者再次调用本 Skill。

- 资源保存在 `docs/design-resources/`，探索候选与正式采用稿分开；已有用户选中方向时延续它。按用户要求逐页推进，不批量替换尚未确认的页面。
- 按当前需求交付实际可用的设计源文件、视觉参考、素材与必要的实现说明，明确资源覆盖范围和可复现的比较条件。具体内容从页面 owner 和采用稿推导，不在本 Skill 维护产品检查清单；资源清单、提示词和运行记录不塞进 Context。
- 在用户确认本页采用且替换已获授权后，将唯一有效资源入口写入所属 Screen Contract，并同步处理 DESIGN.md/Context 中的明确差异，撤掉该页旧入口。未确认候选不能成为开发基准；其他页面与未覆盖状态沿用现有规则。已有采用授权时不重复询问。
- 资源应足以支持后续开发严格还原和验证；具体检查方法由当前需求、改动与目标运行时决定。复用 AGENTS.md 的 Tiny Context 开发约定与适用实现 Skill，资源生成结果不能证明生产还原。设计采用与生产代码迁移分别如实报告，不因新增此规则直接修改生产页面。

## 本地命令

以下是保留的 Codex/Figma 路线检查器，要求其原生节点契约；不直接用于 Stitch 原始输出，不伪造节点快照来通过。需要该路线时在仓库根目录用 Node 24+：

```text
node .agents/skills/starward-design-resource/scripts/preflight.mjs <run-directory>
node .agents/skills/starward-design-resource/scripts/check-resources.mjs <run-directory>
node .agents/skills/starward-design-resource/scripts/build-review.mjs <run-directory>
node --test .agents/skills/starward-design-resource/tests/*.test.mjs
```

检查器只给确定性完整性/几何问题，不给美感通过证明。真实节点树与截图同轮导出；修改后旧截图不可冒充当前。缺少登录、权限、字体或插件时说明具体前提；不换账号、付费绕过、贴整页截图或改名伪造 `.fig`。
