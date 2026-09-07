---
name: starward-design-resource
description: 为 Starward 探索页面风格、重构视觉、生成或局部修改可编辑 Figma 设计资源，并通过真实导出回看交付。用于明确的设计资源任务，不用于普通代码修复、后端或发布。
---

# Starward Design Resource

把普通产品描述和审美偏好转成可编辑、可回看、可继续修改的资源。设计判断由 Agent 补齐，不要求用户提供排版参数，不以固定模板或自评分保证审美。

## 执行模型

用户指定此 Skill 跟随调用任务的实际模型和推理档位（2026-09-07），不固定 Astra，不自行切换模型或启动其他模型代做。执行前从宿主配置/运行记录核实并记录；无法核实时填 `unknown`，不让模型自报补齐。

同一 A/B 成对试验保持调用模型和档位一致；宿主配置变化后开启新样本并标出差异。其他模型可以完整执行此 Skill，但不能冒充原帖 Astra 同模型复现。独立评审或会话隔离如获授权，也应继承调用任务设置，而不是硬编码模型。

## 范围与读取

先读用户输入、`project_context/global.md`、manifest 所需 owner、根 `DESIGN.md` 的小程序段及当前代码。小程序任务使用项目 `.codex/skills/uiux_design/SKILL.md` 的适用交互原则；不安装 React Native 依赖。首次地图/我的任务按 [starward-miniapp.md](references/starward-miniapp.md) 定位当前职责。

业务与交互不因视觉探索改变。默认只写本次设计资源与生成脚本；候选差异留在 `proposed-design-delta.md`，用户选定前不改根 DESIGN、生产页面或已采用资产。推荐标为 `recommended-unapproved`。不发布、不采购、不自动公开文件；此 Skill 不管理任务生命周期或建立长期验收工作流。

## 执行

1. 建立 `brief.md`：必须保留职责、希望改善的问题、探索范围、设备/素材和外部缺项。记录 HEAD、输入哈希、实际模型/effort 的宿主来源、工具版本；未知为 `unknown`，未知用量为 `null` 并解释。当前截图必须来自当前运行，缺失不能以历史图替代。
2. 按 [figma-runtime.md](references/figma-runtime.md) 探测真实写入、中文、图片、点击跳转、导出、局部修改和重跑。通过后只选一种主路径；失败仍可完成本地工程，不得批量生成并声称工具已通过。工具 schema 以实际发现为准。
3. 按 [design-method.md](references/design-method.md) 自主决定层级、分组、字体/图标比例、容器与密度。默认三方向，每方向目标页面成对；方向至少两个结构维度不同。用户另有数量要求时遵从用户。
4. 编写普通 Figma Plugin API 脚本，复用 `scripts/figma-helpers.js` 与现有图标。文字、布局、组件保持原生；地图/合法图片才可栅格。中文需实际加载和导出检查。生成者解释、模拟数据说明和候选名放画板外。
5. 每个方向保存全部 `round-0` 真正导出，再视觉回看；最多两轮正式视觉修订，每次指出位置、问题和预期变化，另存证据。技术修复单记，不用其掩盖重设计；无改善时保留失败结果。
6. 推荐一个方向，按用户测试计划补充状态、主题、尺寸和组件修改测试。静态原型说明连续手势的 trigger/preview/commit/cancel、竞争和恢复，不声称验证了真实手感。
7. 按 [delivery-and-review.md](references/delivery-and-review.md) 运行资源检查、生成匿名比较页并交付。原始比例查看、全部候选和未通过项必须可见；用户偏好不得代填。交接者能按节点映射改一条文案并重导出，而无需全量重做。

## 本地命令

在仓库根目录用 Node 24+：

```text
node .agents/skills/starward-design-resource/scripts/preflight.mjs <run-directory>
node .agents/skills/starward-design-resource/scripts/check-resources.mjs <run-directory>
node .agents/skills/starward-design-resource/scripts/build-review.mjs <run-directory>
node --test .agents/skills/starward-design-resource/tests/*.test.mjs
```

检查器只给确定性完整性/几何问题，不给美感通过证明。真实节点树与截图同轮导出；修改后旧截图不可冒充当前。缺少登录、权限、字体或插件时说明具体前提；不换账号、付费绕过、贴整页截图或改名伪造 `.fig`。
