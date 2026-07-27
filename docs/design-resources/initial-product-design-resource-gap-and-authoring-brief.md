# 《今晚去观星》初版全量设计资源差距审计与 Authoring 委托说明

> 文档性质：后续 `design-resource-authoring` 的初始提案与委托输入，属于 ordinary Source。
<!-- ty-source-item:start key=ncomp-uiux-authoring-brief-not-canonical-handoff kind=non_completing -->
> 当前状态：初始审计已完成一次最终 reconciliation；正式 implementation handoff 已生成并通过 preflight。本文仍是提案/审计 Source，不替代该 handoff。
<!-- ty-source-item:end -->
> 审计快照：`main@a569b889a2c15b19efc933f774aa0f11848f0528` 加 2026-07-25 当前工作区。
> 产品边界：Expo + React Native 移动 APP、owner-only 个人试用版、Android 为当前运行验收目标，iOS 保留同一产品/交互语义但运行证据延期；运营端为桌面 Web。
> 成本边界：所有外部数据服务合计不超过 CNY 200/月、CNY 2,400/年，paid 默认 0，免费且合格的来源优先，任何购买/升档仍需 owner 单独批准。
> 建议最终 handoff 路径：`docs/design-resources/starward-residual-implementation-handoff.md`。

## 1. 结论先行

### 1.1 审计结论

初版产品对应的**物料级 UI/UX 设计源已经完整覆盖**，不是只覆盖了一部分：

| 核算项 | 当前结果 | 证据 |
| --- | ---: | --- |
| 产品 Surface / Outcome | 14 / 14 | 12 个移动 Surface + 2 个运营/质量 Surface |
| Stable Control | 95 / 95 | 83 个移动 Control + 12 个 ops Control |
| 页面装配 | 19 | 移动 12 个 page assembly + ops 7 个 workspace assembly |
| 控件验收场景 | 240 | 移动 208 + ops 32 |
| 移动高风险交互 | 6 组 | A～F |
| Ops 高风险交互 | 1 组 | REV-43 |
| 已采纳 immutable target | 4 / 4 | 2 个 page constraint + 2 个 control exact-with-declared-coverage |
| 新高保真页面、线框、组件板或视觉方向 | **0 个需要新增** | 现有 selected Source 已覆盖物料级设计决定 |
| 必须新增的设计交付物 | **1 个** | residual `design-resource-handoff-v1` |
| 外部生产内容缺口 | **1 类** | 合法且真实的地点媒体，不可用生成图伪造 |
| 移动实现/验收 blocker | 9 个控件 | 8 个真机/能力项 + 1 个生产媒体项 |
| Ops 实现/验收 blocker | 12 个控件 | 真实 endpoint/authn/authz/副作用与恢复证据 |

`npm run design:targets:verify` 的当前结果为：

```json
{
  "status": "passed",
  "target_files": 14,
  "outcomes": 14,
  "controls": 95,
  "mobile": {
    "outcomes": 12,
    "controls": 83,
    "page_assemblies": 12,
    "acceptance_scenarios": 208,
    "haptic_applicable": 49,
    "haptic_not_applicable": 34,
    "unresolved_controls": 9
  },
  "operations": {
    "outcomes": 2,
    "controls": 12,
    "page_assemblies": 7,
    "acceptance_scenarios": 32,
    "backend_authority_pending_controls": 12
  }
}
```

### 1.2 “基本没实现”与“设计资源缺失”不是同一件事

当前生产 UI 尚未完成 selected-design conformance，这个判断成立；但它是**实现差距**：

- 原生冷启动入口、业务路由、真实 MapView、领域持久化、真实服务副作用和重启恢复尚未闭环。
- 当前页面大量仍是动作按钮、固定演示或证据卡。
- `packages/ui-system/src/tokens.ts` 与 `DESIGN.md` 的 exact token source 存在明显漂移。
- 现有代码不得反向决定页面布局、视觉、状态或交互，也不得因为“代码里没做”就推导“需要再设计一套”。

设计资源本身已由 `DESIGN.md` 采纳并覆盖 14/95。重复生成全量 UI 会产生第二套候选、造成设计真值冲突，并增加后续 Long-Task 的 conformance 歧义。

### 1.3 唯一应由下一次 `design-resource-authoring` 补齐的资源

下一次 authoring 的目标不是生成新页面，而是：

1. 以四个已采纳 immutable target 为 selected Source。
2. 编制一个 project-native residual implementation handoff。
3. 用可解析 locator、完整 source profile/dependency closure、条件、八维 coverage、验证方法和 blocker lineage，把 14 Surface、95 Control 全部送入后续开发工作流。
4. 运行并通过：

```text
ty-context design-resource preflight docs/design-resources/starward-residual-implementation-handoff.md
```

只有 preflight 发现某一物料级决定确实没有任何现有 Source 覆盖时，才允许追加一个窄范围、成组的 study；不得预先生成 filler。

## 2. 审计边界与分类方法

### 2.1 资源缺口计算

本次按 `design-resource-authoring` 的规则核算：

```text
需要委托的设计资源
  = 初版完整开发范围内的物料级 UI/UX 决定
  - selected existing Source 已明确覆盖的决定
```

物料级决定是指改变后会显著改变用户所见、所懂、可执行动作或反馈的决定。纯代码结构、Provider 选择、数据库、真实权限执行、原生性能、部署或测试证据不是设计资源。

### 2.2 八个必须核算的维度

每个适用的 subject × target × condition 必须对以下八维给出唯一 disposition：

1. `surface_flow`
2. `visual_content`
3. `component_control`
4. `state_interaction`
5. `motion`
6. `adaptation_input`
7. `accessibility`
8. `assets`

可用 disposition 只能是：

- `covered`
- `not_applicable`
- `excluded_by_scope`
- `decision_required`
- `unavailable`

最终 ready handoff 不能残留 `decision_required` 或 `unavailable` 的设计决定。生产媒体、真机调参和后端 authority 可以作为**明确的 target-local acceptance blocker**保留，因为相关 UI 语义已经 covered；不得伪装为已完成。

### 2.3 本文不做的事

- 不生成 wireframe、高保真候选、Figma 文件、组件板、Logo、插画或地点照片。
- 不修改 `project_context/**`、`DESIGN.md`、`docs/source-plan.md`、四个 frozen target、生产代码、测试或 Long-Task Contract。
- 不创建第二份 Source Plan、Design Authority、coverage registry 或工作流状态。
- 不宣称任何生产 UI、原生行为、后端副作用、测试、部署或发布已经完成。

## 3. Authority 与冲突顺序

后续 authoring 和实现必须按以下顺序消费信息：

1. 用户当前指令和已批准的个人试用版/成本 override。
2. 初版产品大纲：产品能力、业务规则和版本范围。
3. 初版技术方案：技术义务、数据/安全/离线/平台边界。
4. `docs/source-plan.md`：两份初版方案、当前 profile、决定、风险、控件与验收的完整结构化 Source。
5. `project_context/**`：持久化产品责任、Surface/Screen 所有权与架构边界。
6. `DESIGN.md`：唯一 exact token source、视觉系统、模式、长期交互规则和四个 canonical target adoption。
7. Page target：只控制其声明的页面空间、层级、route、模式/状态和装配。
8. Control `implementation-contract.json`：只在其声明字段、状态和条件内控制 exact 控件实现事实。
9. `.codex/skills/uiux_design/**`：React Native 实现伴随规则，必须服从前述 Source。
10. 当前生产代码：只说明“现在实现成什么样”，不得反向成为设计 Authority。

冲突规则：

- 产品、安全、隐私、成本、真实数据规则优先于视觉样例。
- exact control contract 与其 HTML 投影冲突时，以 JSON contract 为准。
- target 与 Product/Screen Contract 或 `DESIGN.md` 冲突时，停止并走 Authority Revision。
- frozen target 内部旧 `unselected candidate` 元数据是 provenance drift，不覆盖 `DESIGN.md` 的后续 canonical adoption。
- 不允许在实现时自行挑选冲突版本或临时“设计得好看”。

## 4. 直接输入与稳定身份索引

### 4.1 产品、技术、Context 与治理 Source

| Key | 路径 | Bytes / lines | SHA-256 | 用途 |
| --- | --- | ---: | --- | --- |
| `S-PRODUCT` | `C:\Users\777\.codex\attachments\2b04420e-d962-47fb-89bc-bfa9926cb096\pasted-text.txt` | 44,172 / 1,995 | `bd537db472da2b5baa06effc3769b837363e3489901034cb338a30af4a3e62ba` | 初版产品完整目标 |
| `S-ARCH` | `C:\Users\777\.codex\attachments\c27e0f73-3a63-4355-b713-45759e60fe8e\pasted-text.txt` | 53,663 / 2,042 | `1de938f5a16c1e3040ec967457479031d576b00c25d3b34c85ebb69d555b38b3` | 初版技术完整目标 |
| `S-DESIGN` | `DESIGN.md` | 16,803 / 222 | `b973880891c71d5242f9263ef88b2a7196c2ba189372da17ee4cdac06f352106` | exact token source、视觉/交互规范、target registry |
| `S-SOURCE-PLAN` | `docs/source-plan.md` | 605,466 / 6,995 | `0ad612ce4aa0a425762e243910c726da9124892186d597f45a5f2f0114ab1287` | 14 Outcome、95 Control、完整 REQ/OBL/AC |
| `S-GAP-AUDIT` | `docs/architecture/implementation-gap-audit.md` | 28,185 / 333 | `8851eee54cc5240913e1efa78c4b65548dcfe12dd2eacd38103b7cf2ffacfdea` | 当前实现与设计资源缺口事实 |
| `S-GAP-PLAN` | `docs/architecture/gap-driven-supplemental-development-plan.md` | 52,677 / 999 | `417d293eee1c8838c2f439f78bfa7908ea7bd442c8eb5b2301a22e0dbfadd9c8` | 完整补开发顺序与 handoff 委托边界 |
| `S-CONTEXT-GLOBAL` | `project_context/global.md` | 8,167 / 86 | `647ad92f4505205afa95a6373248840b2f9e3972fae7cecb5dd46dea809ba1ed` | 全局产品/运行事实 |
| `S-CONTEXT-ARCH` | `project_context/architecture.md` | 5,535 / 51 | `7f7c52e15cc3f194d51ccef4343bb39f31b806c56d983461f702dda3703fc9fa` | 架构所有权与边界 |
| `S-CONTEXT-AREA` | `project_context/areas/main.md` | 6,918 / 70 | `55d2fb357bd061e388245624375513adde4dfca7126235d5a0a53478c2aee61b` | main area 索引 |
| `S-SURFACE` | `project_context/areas/main/product-surface-contract.md` | 15,850 / 173 | `0c6b3c3855002921ee01487d378ce241c1e36311059ed46d054e72c0af0e9b67` | 14 Surface 的信息/动作/反馈 owner |
| `S-SCREEN` | `project_context/areas/main/screen-contracts.md` | 22,330 / 185 | `c59c64b5418027725ae1aaac1074cd35a4263343eccb12872e9993fc542ee057` | 页面区域、顺序、overlay、route、验证 |
| `S-VERIFY` | `project_context/areas/main/verification.md` | 22,470 / 124 | `0149e2c04693b238971e56337d618533e2010721d768c41ea3910a9c569cfe44` | 项目自有验证边界 |
| `S-RN-SKILL` | `.codex/skills/uiux_design/SKILL.md` | 8,907 / 119 | `96fd6fbbc37d76ed6d0b2c3dd1520b9a514318887cd2d5d544dfcfa55b4ed6d9` | RN 交互实现 companion |
| `S-RN-CONTRACT` | `.codex/skills/uiux_design/references/react-native-interaction-contract.md` | 10,254 / 156 | `328937755c99bc5e4dfa9d27031363dc1bb7463bbaea4bbdd801e946f1261a3c` | Gesture/Motion/Haptic/A11y 双平台细则 |

### 4.2 四个 selected immutable target 的完整文件闭包

#### `target.mobile-product-pages-v2` — constraint

| 文件 | Bytes | SHA-256 |
| --- | ---: | --- |
| `docs/design-targets/mobile-product-pages-v2/index.html` | 110,133 | `21838ed2a28f218fb4b37a05827b1be1d6993b23a02fa97847e78fdaa0af4271` |
| `docs/design-targets/mobile-product-pages-v2/coverage-manifest.json` | 18,808 | `6f99c5a965f167db39babacb853c984aa01e7805095dc9350b7126e36a1ed46f` |
| `docs/design-targets/mobile-product-pages-v2/README.md` | 7,328 | `4c95723f217be83d22b0b3b86f34787a4d455408a3b3e863b817ca8cd4c53801` |

#### `target.mobile-controls-v3` — exact-with-declared-coverage

| 文件 | Bytes | SHA-256 |
| --- | ---: | --- |
| `docs/design-targets/mobile-controls-v3/implementation-contract.json` | 4,369,582 | `01f4eae8bb5e01b126480669d79f168508fcf2c821b9edce916dc77fdaae12c4` |
| `docs/design-targets/mobile-controls-v3/index.html` | 3,478,940 | `c29beac7c41549478544beadef96810fb662487480032c15be5db6e536991b2a` |
| `docs/design-targets/mobile-controls-v3/control-atlas-manifest.json` | 114,255 | `50acbe4417de45a75c6d5855b5b39fd1edd2c2ef345648f497654017d7f21aab` |
| `docs/design-targets/mobile-controls-v3/README.md` | 11,112 | `425f998f414efad7a2b870583d0e5e4fb0872babb22e6774e39bc7c1a0f120fc` |

#### `target.ops-product-pages-v1` — constraint

| 文件 | Bytes | SHA-256 |
| --- | ---: | --- |
| `docs/design-targets/ops-product-pages-v1/index.html` | 88,914 | `40510c23a88c00cb614cddeeaf9f4c895bc6d70c365b6ded7c5a2e286c4a55b5` |
| `docs/design-targets/ops-product-pages-v1/coverage-manifest.json` | 12,458 | `0362730488ec82620979a3ae317b8c3ad89081000071c6deb1901973e426d8e2` |
| `docs/design-targets/ops-product-pages-v1/README.md` | 7,020 | `196220d3c3b800d41badb3e3ec97095321454309e6e96780f059a482e3fc546b` |

#### `target.ops-controls-v2` — exact-with-declared-coverage

| 文件 | Bytes | SHA-256 |
| --- | ---: | --- |
| `docs/design-targets/ops-controls-v2/implementation-contract.json` | 383,183 | `13f0d0f50224e61045ad859bbd43d26da15689603121929907c44fe15fabb388` |
| `docs/design-targets/ops-controls-v2/index.html` | 89,704 | `dc82a4865b3f5fd235a1dadecc736430100a59599d1e439b406c23c18a9f645b` |
| `docs/design-targets/ops-controls-v2/control-atlas-manifest.json` | 26,596 | `0a93f4f96fcb3419e3b7394ab5bc30db7b50ea8d16baebb840425b7a03f45586` |
| `docs/design-targets/ops-controls-v2/README.md` | 7,812 | `2fe73b0ac41c5bfe6ce4903123eebfd48ebdd4f6f07dc33e6a8ec327dbc2a76a` |

四套资源均为 repo-local、完整、自包含；HTML 没有外部运行依赖。README/manifest/JSON 不是可随意省略的说明文件，它们是 target identity、coverage、locator 和 non-claim 的闭包组成部分。

### 4.3 设计系统支持资源

这些资源已存在，但不是四个 selected target 的替代品：

| 资源 | SHA-256 | 分类 |
| --- | --- | --- |
| `docs/design-system/README.md` | `9d9200f92523caa98a2e96463de26360f742531696bb16ad13d78b486934e695` | 导航/来源说明 |
| `docs/design-system/BRAND.md` | `99fa5c492fd3939c7ae3dee76c5d5ce95ede356d03080b4e5338c42cf6e4ca9f` | supporting brand narrative |
| `docs/design-system/system/variables.css` | `3e8fa332cd8045402f75ba2891caf2f830eec708e007a307ef87415266d6d069` | generated token consumer，不是 token Authority |
| `docs/design-system/system/theme.json` | `464988a68ff3795d218110b32715b1ceaeb468be74f3abaabb2251453c67c1fc` | generated theme seed |
| `docs/design-system/system/kit.html` | `2347e1d73c1830439dfaa18960e98575bdea3ea186e65d999a03ad9744e70917` | light kit preview |
| `docs/design-system/system/kit.dark.html` | `e10afdc72a7d83116034930c5c1e55e77a05d7bd04077cdd7a1f90553b50d690` | dark kit preview |
| `docs/design-system/context/reference-trip-images.md` | `e4b3ff5f16343d052349e58a2e6c988c710c19ee56f7733eea2d57ff76b14b98` | inspiration evidence |
| `docs/design-system/context/reference-astronomy-images.md` | `e103b5afd6e65f15c6649e96385429ef5809e8c5bb9455e21465323fe1f91595` | inspiration evidence |

`DESIGN.md` YAML front matter仍是唯一 exact-value token source。CSS、JSON、Kit、target 内嵌 token 和 `packages/ui-system/src/tokens.ts` 都只能是 consumer 或验证输入。

### 4.4 Open Design provenance

Goal index：

- 路径：`C:\Users\777\AppData\Roaming\Open Design\namespaces\release-stable-win\data\starward-system-uiux-goal-index-20260722.md`
- Bytes：31,491
- SHA-256：`42213de35f4ebf9e4fc78b5b38d0d95d8ec637f96576da9cf53256da69304456`
- Provider：local Open Design 0.15.1
- 历史 design-system binding：`user:design-md`

| Target | Project ID | Run / conversation | Template | Agent / recorded model | Provider qualifier |
| --- | --- | --- | --- | --- | --- |
| mobile pages v2 | `starward-system-mobile-20260722-v2` | run `261940e8-fc69-45fa-a80f-9a6f30572606` | `mobile-app` | `codex` / `gpt-5.6-sol` | succeeded |
| ops pages v1 | `starward-system-ops-20260722-v1` | run `53ca36e4-ea4c-4b76-a963-8d1c2fe2e7c0` | `dashboard` | `codex` / `gpt-5.6-sol` | succeeded |
| mobile controls v3 | `starward-mobile-control-atlas-20260722-v3` | run `a52b37d9-1c3d-4c18-93b5-ab62acd3f453`; conversation `79c9eb03-f0e8-4690-9657-556f199fd82c` | `docs-page` | `codex` / run start recorded `model: null` | `artifact-ready/run-unreconciled`；不得写成 provider succeeded |
| ops controls v2 | `starward-ops-control-atlas-20260722-v2` | run `04e4d7bb-c45a-4ab4-8015-e38e3de97cdf`; conversation `34e437dd-a192-43da-b610-46ce49a009e2` | `docs-page` | `codex` / run start recorded `model: null` | succeeded |

Agent/model 的机器来源是对应
`C:\Users\777\AppData\Roaming\Open Design\namespaces\release-stable-win\data\runs\<run-id>\events.jsonl`
的 `start` event。两个 control-atlas run 的 model 确实记录为 `null`；后续 handoff 必须把它表示为“provider 未记录/不可恢复”的 qualifier，或从 provider 的其他可验证元数据补齐，不能猜测模型。若当前 strict schema 不接受该外部边界，则 handoff 在取得可验证值前不得声称 ready。

Editable upstream update route：

1. 在对应 Open Design project 中修改。
2. 不覆盖当前已采纳 baseline。
3. 导出新 immutable version。
4. 复核完整文件、hash、运行状态和独立浏览器结果。
5. 通过 UI Authority workflow 更新 canonical adoption。

## 5. 初版产品完整目标与现有设计资源的 crosswalk

下表核算的是“是否仍需新设计资源”，不是“生产实现是否完成”。

| 初版范围 | 必须表达的物料级内容 | 当前 owner / target | 设计资源 disposition |
| --- | --- | --- | --- |
| 产品定位、三类主要用户、五个场景、完整决策闭环 | 结论→地点→时间→路线→现场→观测/拍摄；新手/摄影/目视渐进披露 | `DESIGN.md`、Source Plan、mobile pages | `existing-covered` |
| 五入口 IA | 今晚、地图、行程、天空、我的；上下文入口不新增一级 Tab | `primary-tab-bar` + mobile pages | `existing-covered` |
| 6.1 初次使用与偏好 | 基础信息、用户类型、出行条件、设施要求、观测偏好、设备；权限拒绝和手动替代 | `mobile-shell-and-preferences` | `existing-covered` |
| 6.2 今晚 A～F | 位置/日期、综合建议、条件摘要、可见目标、推荐地点、主备方案 | `tonight-decision` | `existing-covered` |
| 6.3 条件与预报 A～E | 小时矩阵、多模型、15 日趋势、昼夜/蒙影、地图型天气数据 | `forecast-and-astronomy` | `existing-covered` |
| 6.4 观星地图 A～E | 基础地图、天空/出行/设施/用户筛选、图层、地点卡、路线与外部交接 | `map-route-discovery` | `existing-covered` |
| 6.5 地点详情 A～J | 基础、今晚条件、光污染、地平线/遮挡、实景/摄影、最后一公里、设施、安全、评价、快捷操作 | `spot-detail-and-trust` | `existing-covered`；真实生产媒体仍是外部 blocker |
| 6.6 推荐与评分 | 三层结果、硬阻断、天空/目标/地点/出行/可信度排序、画像倾向、解释 | Tonight + Map + Spot 控件 | `existing-covered` |
| 6.7 行程 A～G | 首页、新建、总览、分时段、待规划、路线比较、编辑、复制/分享、协作冲突 | `itinerary-and-collaboration` | `existing-covered` |
| 6.8 360°天空 A～F | 星空、时间、方向、遮挡、轨迹、视场与 AR 降级 | `sky-orientation-ar` | `existing-covered`；真机 capability/调参另行验证 |
| 6.9 摄影助手 A～F | 输入、自动条件、手机/相机输出、预设、规则化解释、检查表与保存 | `shooting-assistant` | `existing-covered` |
| 6.10 现场模式 | 核心信息、现场工具、安全、主备切换、返程、位置分享、离线同步 | `field-offline-safety` | `existing-covered` |
| 6.11 用户贡献 | 新地点、实况、评价、纠错、可信度、媒体隐私、审核状态 | `community-contribution` | `existing-covered` |
| 6.12 天象与工具箱 | 天象日历、空间站、天体位置、摄影工具、其他工具、内容与来源/过期边界 | `notifications-and-toolbox` | `existing-covered` |
| 6.13 个人中心 | 账号、游客合并、我的内容、设备、会话、隐私、导出/删除、帮助/来源 | `identity-profile-privacy` | `existing-covered` |
| 关键数据模型与推荐输出 | Spot/Forecast/Celestial Window/Itinerary/Field Report/Shooting Plan 的用户可见状态；结论/行动/证据三级 | Source Plan + exact controls | `existing-covered` |
| 通知体系 | 出发前、行程中、长期；规则、权限、频率、深链过期/失效恢复 | `notifications-and-toolbox` | `existing-covered` |
| MVP/V1/V2/V3 | 版本范围可延后但设计语义不丢失；PWA/小程序不替代 RN APP | Source Plan + Screen Contract | `existing-covered` |
| 埋点与产品指标 | consent、漏斗、数据状态分段、定义过期、相关非因果 | `product-metrics-dashboard` | `existing-covered` |
| 地点/审核/数据源/推荐后台 | revision、审核、来源健康、任务、重放、规则发布、审计 | `admin-data-operations` | `existing-covered`；真实 backend authority 待实现 |
| 发布/质量/恢复/可观测 | promotion gate、技术/数据质量、备份恢复、指标 | `quality-release-observability` | `existing-covered`；真实副作用待实现 |
| 风险与不确定性 | 数据来源、地点真实性、预测不确定、敏感坐标、专业分层、disabled/unknown/degraded | Source Plan + state contracts | `existing-covered` |
| CNY 200/月 profile | paid 默认 0、成本/来源/状态可见、到阈值时诚实降级、不自动购买 | Product/technical Source + data/ops controls | `existing-covered`；账单/Provider gate 是实现 |

产品大纲的逐项字段和技术义务不应在 handoff 中重新转述并成为第二 owner。后续 authoring 必须通过 `docs/source-plan.md` 的稳定 marker/anchor 引用它们。

## 6. 14 Surface / 95 Control 完整索引

### 6.1 移动端 12 Surface / 83 Control

| Surface | Route / entry | Stable controls |
| --- | --- | --- |
| `mobile-shell-and-preferences` | `/onboarding-preferences`; 我的→偏好与权限 | `primary-tab-bar`, `permission-step`, `preference-wizard`, `profile-switcher` |
| `tonight-decision` | `/tonight`; 一级 Tab 今晚 | `location-date-refresh`, `decision-hero`, `condition-summary-expander`, `visible-target-timeline`, `recommendation-card`, `plan-backup-selector` |
| `forecast-and-astronomy` | `/forecast`; 今晚→专业证据 | `hourly-matrix`, `model-selector`, `trend-calendar`, `twilight-window-strip`, `weather-layer-panel` |
| `map-route-discovery` | `/map`; 一级 Tab 地图 | `map-search-context-bar`, `map-filter-sheet`, `map-layer-selector`, `map-marker-density-surface`, `selected-spot-sheet`, `route-plan-editor`, `external-navigation-action` |
| `spot-detail-and-trust` | `/spot/:spotId`; 地图→地点详情 | `spot-hero`, `spot-media-gallery`, `evidence-section-nav`, `horizon-polar-view`, `access-facility-fact-list`, `safety-block`, `trust-panel`, `spot-action-dock` |
| `itinerary-and-collaboration` | `/trips` 与详情子路由；一级 Tab 行程 | `itinerary-library`, `itinerary-creation-form`, `itinerary-detail-tabs`, `itinerary-overview-card`, `observation-timeline-editor`, `candidate-tray`, `route-option-comparator`, `version-and-share-actions`, `collaboration-panel` |
| `sky-orientation-ar` | `/sky`; 一级 Tab 天空 | `sky-canvas`, `sky-object-and-layer-panel`, `sky-time-scrubber`, `orientation-follow-toggle`, `orientation-calibration-sheet`, `obstruction-and-trajectory-overlay`, `field-of-view-overlay`, `ar-mode-toggle` |
| `shooting-assistant` | `/shooting`; 天空→摄影助手 | `shooting-setup-form`, `shooting-preset-picker`, `shooting-recommendation`, `ai-explanation-panel`, `shooting-checklist`, `save-shooting-plan` |
| `field-offline-safety` | `/field`; 行程/今晚→现场 | `offline-pack-manager`, `field-dashboard`, `night-red-mode-toggle`, `field-tool-grid`, `return-to-parking`, `backup-switcher`, `safety-session-panel`, `location-share-action`, `offline-sync-queue` |
| `community-contribution` | `/contribute`; 地点详情/我的→贡献 | `new-spot-wizard`, `field-report-form`, `multidimensional-review-form`, `correction-report`, `media-privacy-review`, `contribution-status-center` |
| `notifications-and-toolbox` | `/toolbox`; 我的→通知与工具箱 | `notification-rule-editor`, `notification-settings-center`, `notification-message-deeplink`, `toolbox-index`, `celestial-event-detail`, `astronomy-calculator-form` |
| `identity-profile-privacy` | `/me`; 一级 Tab 我的 | `auth-gate-sheet`, `guest-data-merge`, `profile-hub`, `content-library-browser`, `equipment-manager`, `session-security`, `privacy-center`, `export-delete-flow`, `help-and-source-center` |

### 6.2 Ops 2 Surface / 12 Control

| Surface | Workspaces | Stable controls |
| --- | --- | --- |
| `admin-data-operations` | `data-operations`, `moderation`, `recommendation` | `admin-spot-editor`, `moderation-queue`, `data-source-dashboard`, `job-operations-console`, `recommendation-replay-console`, `rule-release-control`, `admin-access-audit` |
| `quality-release-observability` | `release-quality`, `recovery`, `metrics` | `release-promotion-gate`, `technical-observability-dashboard`, `data-quality-dashboard`, `backup-restore-exercise`, `product-metrics-dashboard` |

`share` 是辅助 page projection，不是第 13 个 ops stable control。

### 6.3 Source Plan marker 规则

`docs/source-plan.md` 当前有 1,302 个 `ty-source-item`：

| kind | 数量 |
| --- | ---: |
| `requirement` | 273 |
| `control` | 760 |
| `acceptance` | 122 |
| `technical_obligation` | 63 |
| `risk_fact` | 40 |
| `outcome_result` | 14 |
| `non_completing` | 16 |
| `forbidden_shortcut` | 9 |
| `non_goal` | 5 |

每个 stable control 已有：

- 1 个 `user-task` requirement；
- 8 个 control facts：`location`, `trigger`, `input`, `loading`, `empty`, `success`, `failure`, `feedback`。

后续 handoff 应引用这些稳定 key，不得只写“见原型”。

## 7. 已有资源在八维上的覆盖

### 7.1 Mobile page target

`target.mobile-product-pages-v2` 已覆盖：

- `surface_flow`：12 个 route、五 Tab、上下文入口和页面装配。
- `visual_content`：390×844 页面层级、Map/Sky 沉浸结构、Bottom Sheet 25/55/90、结论/行动/证据。
- `adaptation_input` 的声明范围：主视口、44px、safe-area、reduced-motion guard。
- 11 类页面数据/操作状态：`success`, `loading`, `empty`, `no-results`, `stale`, `partial`, `degraded`, `unknown`, `error`, `disabled`, `saving`。
- 三模式：planning、night、red-light。

它不证明：

- 原生 iOS/Android physics、haptics、sensor/camera/map/system gesture。
- production API、真实数据、性能、安全、生产媒体。
- 样例地点、时间、评分或人物是产品事实。

### 7.2 Mobile control target

`target.mobile-controls-v3` 已覆盖：

- 83 个 component family：62 个 `reuse-or-compose`，21 个 `new-product-specific`。
- 15 个控件工程字段：identity、component、visual、states、interaction state machine、motion、haptics、accessibility、platform/system、content/localization、data/privacy/safety、assets、observability/performance、acceptance、unresolved。
- 19 类 control state：`default`, `pressed`, `focus-visible`, `selected`, `disabled`, `loading`, `saving`, `success`, `error`, `stale`, `partial`, `degraded`, `unknown`, `empty`, `no-results`, `blocked`, `permission-denied`, `conflict`, `offline`。
- 7 个 motion recipe：press、selection sync、Bottom Sheet settle、scrub follow、timeline drag、mode transition、async status。
- 5 个 haptic recipe；49 个控件 applicable，34 个逐项 `not-applicable + reason`。
- 16 个 project-authored inline SVG symbol：`search`, `location`, `refresh`, `chevron`, `check`, `warning`, `error`, `drag`, `navigation`, `clock`, `layer`, `privacy`, `download`, `share`, `sensor`, `none`。
- 12 个 page assembly、208 个 Given/When/Then、A～F。
- 360/390/430 宽度语义、200% text、safe area、键盘/屏幕阅读器、full/reduced motion、iOS/Android 平台差异。

因此不需要再生成：

- 新的通用组件库或 component inventory。
- 新的状态板、motion board、图标集、微文案表或数据可视化 grammar。
- 一控件一张设计图。

### 7.3 Ops page/control target

Ops 资源已覆盖：

- 7 个工作区、12 个 stable control、1 个辅助 share projection。
- 11 个 component family，其中 `promotion-gate` 被两个控件复用。
- 1440×900、1180 compact、900 narrow、1024×768、820×900。
- 鼠标、键盘、focus return、200% zoom、reduced motion。
- 12 类页面 common state，加各控件专属状态。
- 32 个 Given/When/Then。
- REV-43 的 impact preview、双确认、exact text、saving/idempotency、error/retry、success/audit、recovery。
- 绝大多数 ops 资产为 `explicit-none`；两个 dashboard 使用 project-authored HTML/CSS 图形，不需要外部图片。

真实 endpoint、身份认证、授权、审计不可篡改性、发布和恢复副作用不是设计缺口。

## 8. 真正的差距与 disposition

| Gap key | 差距 | 分类 | 下一 owner / 动作 |
| --- | --- | --- | --- |
| `DR-GAP-001` | 没有 `design-resource-handoff-v1` | `new-resource-needed` | 下一次 `design-resource-authoring` 编制并 preflight |
| `GOV-GAP-001` | `context:doctor` 报 Design Authority Index `missing`、token source `missing-or-unselected` | governance prerequisite，不是设计资源 | 先用 `context_uiux_design` 修复 discoverability |
| `META-GAP-001` | frozen target 内部仍写 `unselected candidate` 和旧 upstream hash | provenance drift | handoff 记录后续 canonical adoption；不得改 frozen baseline |
| `ASSET-GAP-001` | `spot-media-gallery` 缺合法真实生产地点媒体 | external content blocker | 内容/资产 owner 采购或采集并记录许可；不得用生成图关闭 |
| `NATIVE-GAP-001` | 8 个非媒体控件缺代表设备调参或 capability POC | implementation/evidence | RN/平台 owner 在 Android 真机验证；iOS runtime deferred |
| `OPS-GAP-001` | 12 个 ops 控件缺真实 backend authority | implementation/evidence | endpoint/authn/authz/idempotency/audit/recovery |
| `TOKEN-GAP-001` | `packages/ui-system/src/tokens.ts` 与 `DESIGN.md` exact tokens 漂移 | implementation | 由 Long-Task 单向从 `DESIGN.md` 投影，不再设计 |
| `IMPL-GAP-001` | 当前生产 UI 未完成 target→implementation→runtime evidence | implementation | 后续 Single-Goal Long-Task |
| `PROVIDER-GAP-001` | mobile control run 非终态但 artifact 已完整独立验证 | qualifier | 保留 `artifact-ready/run-unreconciled`，不得伪称 succeeded |

### 8.1 Design Authority discoverability 的准确处置

当前命令输出：

```text
design authority: configured; project-level visual-system configuration only
design authority signals: index=missing, token_source=missing-or-unselected, classified_references=0
```

处置要求：

- 由 `context_uiux_design` 让 harness 能发现现有 `DESIGN.md` 的 exact token source、generation direction 和 target classification。
- 不复制 token。
- 不创建第二个 `DESIGN.md` 或 registry。
- 不修改 frozen target。
- 该治理修复完成后再生成 handoff；它不是 style redesign。

### 8.2 Token drift 不是设计委托

`packages/ui-system/src/tokens.ts` 当前仍含如：

- planning canvas `#F4F7FB`，而 `DESIGN.md` 为 `#FFFFFF`；
- primary `#2D7FF9`，而 `DESIGN.md` 为 `#1677FF`；
- night canvas `#071321`，而 `DESIGN.md` 为 `#111111`；
- red canvas `#100302`，而 `DESIGN.md` 为 `#050000`；
- title/body/label/spacing 集合也不一致。

这些值已经由 `DESIGN.md` 决定。后续工作是实现层投影与 conformance，不允许再生成一个视觉候选来“解决”。

## 9. 下一次 design-resource-authoring 的准确委托

### 9.1 委托 ID

`STARWARD-DR-RESIDUAL-HANDOFF-V1`

### 9.2 Intent

`handoff`

### 9.3 Scope ceiling

`system-slice`，严格限于：

- 14 个既有 Surface；
- 95 个既有 stable Control；
- 4 个既有 selected immutable target；
- 已声明条件和 blocker；
- 一个 residual implementation handoff。

不扩展产品功能、不改设计方向、不新增 target。

### 9.4 Commission envelope

以下是提案形状，不是 handoff schema：

```yaml
intent: handoff
scope:
  ceiling: system-slice
  subjects:
    - 14 existing surface keys
    - 95 existing stable control keys
    - 4 selected target keys
  necessary_context:
    - initial product and technical attachments
    - docs/source-plan.md
    - Product Surface and Screen Contracts
    - DESIGN.md
    - implementation gap audit and supplemental development plan
    - Starward React Native interaction companion
  excluded:
    - new visual direction
    - new low-fi or high-fi page candidates
    - duplicate component library
    - Figma requirement
    - logo, illustration or synthetic place media
    - production implementation, tests or Contract
  platform:
    mobile: React Native Android current; iOS semantic parity with runtime deferred
    operations: responsive desktop web
  viewports:
    mobile: [360, 390, 430, tablet/landscape declared behavior]
    mobile_review: [820, 1024, 1440]
    operations: [820, 1024, 1180, 1440]
coverage:
  dimensions:
    - surface_flow
    - visual_content
    - component_control
    - state_interaction
    - motion
    - adaptation_input
    - accessibility
    - assets
  existing_mappings:
    - target.mobile-product-pages-v2
    - target.mobile-controls-v3
    - target.ops-product-pages-v1
    - target.ops-controls-v2
  new_visual_resources: []
  required_output:
    - residual implementation handoff
provider:
  new_generation_required: false
  policy: preserve existing Open Design provenance; discover live capability only if a provider call becomes genuinely necessary
expected_entry: docs/design-resources/starward-residual-implementation-handoff.md
review_promise: handoff-checks
```

### 9.5 必须输入

Authoring 开始时必须完整读取：

1. 本文。
2. `docs/source-plan.md`。
3. `DESIGN.md`。
4. Product Surface Contract。
5. Screen Contracts。
6. 四个 target 的全部 14 个文件。
7. `docs/architecture/implementation-gap-audit.md`。
8. `docs/architecture/gap-driven-supplemental-development-plan.md`。
9. `.codex/skills/uiux_design/SKILL.md` 及其 RN interaction reference。
10. Open Design goal index。

初版两份附件用于 provenance/full-scope check；具体业务和技术语义优先通过当前 `docs/source-plan.md` 的 stable markers 消费，避免重复 owner。

### 9.6 唯一输出文件

建议创建：

```text
docs/design-resources/starward-residual-implementation-handoff.md
```

输出必须：

- 是普通 Markdown Source。
- 含人类可读、由 Tiny Context 识别的非渲染 Source Item boundary facts。
- 恰好包含一个 fenced `yaml design-resource-handoff-v1` block。
- 不把 exact 数值、布局、状态或动效重新抄成第二真值；用 typed locator 指向 canonical resource。
- 通过 shared preflight。

本文在 final selection/handoff 完成后只允许**一次** idempotent reconciliation：

- 记录 handoff path、hash、preflight 结果和完成日期。
- 记录未改变 selection 的事实。
- 不把 unresolved blocker写成已解决。
- 不修改产品范围或现有 target。

## 10. Handoff source profile 与 dependency closure 要求

| Profile | Target | 类型 | Canonical entry | 必须纳入的完整文件 | Runtime dependency |
| --- | --- | --- | --- | --- | --- |
| `profile-mobile-pages-v2` | `target.mobile-product-pages-v2` | `implementation_app` | `index.html` | HTML + coverage manifest + README | self-contained；无外部依赖 |
| `profile-mobile-controls-v3` | `target.mobile-controls-v3` | `implementation_app` | exact `implementation-contract.json`; HTML 为 interactive projection | JSON contract + HTML + atlas manifest + README | self-contained；无外部依赖 |
| `profile-ops-pages-v1` | `target.ops-product-pages-v1` | `implementation_web` | `index.html` | HTML + coverage manifest + README | self-contained；无外部依赖 |
| `profile-ops-controls-v2` | `target.ops-controls-v2` | `implementation_web` | exact `implementation-contract.json`; HTML 为 interactive projection | JSON contract + HTML + atlas manifest + README | self-contained；无外部依赖 |
| `profile-design-authority` | `DESIGN.md` | `reference` | whole resource + relevant Markdown anchors | `DESIGN.md` | 不引用 generated CSS/JSON 作为 Authority |
| `profile-product-source` | Product/Screen/Source Plan | `reference` | stable Markdown anchors/markers | Source Plan + Product Surface + Screen Contract | ordinary Source/Context |

要求：

- 所有 repo-local 文件 `acquisition: complete`。
- media type、bytes 和 SHA-256 必须重新计算并与本提案/`DESIGN.md` 对照。
- 不把 Open Design 本地 project 路径当成运行依赖；它只作为 editable upstream locator。
- 不把 frozen target 内嵌的旧 `DESIGN.md`/Source Plan hash 当作当前依赖。
- 不把参考图、临时 clipboard 路径、历史 v1/v2 rejected atlas 加入 selected target closure。

## 11. Typed locator 计划

Handoff 必须使用 validator 支持的 locator：

- `html_selector`
- `markdown_anchor`
- `json_pointer`
- `css_selector`
- `css_custom_property`
- 有边界的 `whole_resource`

建议映射：

### 11.1 Mobile page

- Surface identity/route/entry：`coverage-manifest.json#/outcomes/<index>`。
- 页面 frame/composition：`index.html` 的对应 route/outcome renderer 和有界 `whole_resource`/selector。
- Stable control projection：`[data-outcome="<surface>"][data-control="<control>"]`。
- 不能用一个默认页面 frame 覆盖未显示的 native motion、sensor、haptic 或 accessibility acceptance。

### 11.2 Mobile controls

- Control contract：`implementation-contract.json#/controls/<stable-control-id>`。
- Page assembly：`#/pageAssemblyContracts/<index>`。
- State semantics：`#/stateSemantics/<state-key>`。
- Motion/haptic/icon：`#/motionRecipes/<key>`、`#/hapticRecipes/<key>`、`#/iconRegistry/<key>`。
- Interactive specimen：HTML `[data-outcome][data-control][data-specimen]`。
- A～F：`#/highRiskFlows/<A-F>`。

### 11.3 Ops pages

- Outcome/workspace/route：coverage manifest 的 `outcomes`, `routes`, `sampleStates`, `guardedInteractions`。
- Stable projection：`[data-outcome="<surface>"][data-control="<control>"]`。
- `share-projection` 必须标为 auxiliary/non-stable。

### 11.4 Ops controls

- Control contract：`implementation-contract.json#/controls/<index>`，同时用 `identity.stableControlId` 防止数组序号漂移。
- Page assembly：`#/pageAssemblyContracts/<index>`。
- HTML specimen：`[data-outcome][data-control][data-specimen][data-state][data-route]`。
- REV-43：对应 contract state machine/acceptance refs + HTML executable flow。

### 11.5 DESIGN 与 Source

- exact token source：`DESIGN.md` front matter使用有界 `whole_resource`，解释规则用 Markdown anchors。
- 14 Outcome：`docs/source-plan.md#outcome.<surface-key>`。
- Product/Screen owner：相应 Surface/Screen Markdown heading anchor。
- 不用行号作为唯一 locator；hash + stable anchor/pointer 才是可恢复身份。

## 12. 必须声明的条件

### 12.1 Mobile

- Platform：
  - Android：当前 target，真机 acceptance required。
  - iOS：产品/交互/组件语义 applicable；实际 build/runtime evidence deferred/unverified。
- Viewport：
  - 390×844 baseline。
  - 360、390、430 宽度。
  - tablet/landscape 按 contract 的 split/reflow/measure 规则。
- Mode：
  - `planning`
  - `night`
  - `red-light`
- Page data states：
  - `success`, `loading`, `empty`, `no-results`, `stale`, `partial`, `degraded`, `unknown`, `error`, `disabled`, `saving`
- Control states：
  - 19 个 state semantics 的适用子集。
- Motion：
  - full motion
  - reduced motion
  - low-power/instant alternative（仅声明控件适用时）
- Input：
  - touch
  - keyboard/accessibility activation
  - screen reader
  - drag/scrub/direct manipulation
  - system back/deep link
  - sensor/camera/map capability 的 permission/deny/degrade
- Content：
  - zh-CN default
  - 1.6× translation expansion
  - long place/model/user names
  - local date/time + IANA timezone
  - locale-aware units/numbers
  - stale/source/version/confidence/error ID
- Accessibility：
  - ≥44px
  - 200% text
  - semantic name/order/state
  - non-color-only encoding
  - safe-area and keyboard avoidance
  - focus return
  - reduced motion/transparency
  - red-light no bright white/blue flash

### 12.2 Ops

- Viewport：
  - 1440×900 preferred
  - 1180 compact
  - below 900 narrow
  - explicit 1024×768 and 820×900 review
- Input：
  - mouse/pointer
  - keyboard
  - focus-visible/return
  - Escape/back within local layer
- Adaptation：
  - 200% zoom
  - no page-level horizontal overflow
  - table/local region may manage its own bounded overflow
- Motion：
  - full
  - reduced
- States：
  - common 12 states plus contract-specific conflict/rollback/failed-validation/owner-only states
- Permission：
  - role/field visibility
  - reauthentication/MFA where declared
  - deny-by-default
- Content：
  - long IDs/error/audit IDs
  - explicit timezone
  - source/version/freshness
  - sample-only must not look production

## 13. Subject × target × condition × dimension accounting rules

### 13.1 Surface ownership

- 每个 14 Surface 必须只有一个 unambiguous surface subject。
- 95 个 stable Control 分别归属其 owning Surface。
- 一个 stable key 不得被两个 subject 重复 owner。
- Primary tab、共享 Context 或通用状态可被引用，但不能成为第二 Surface owner。

### 13.2 Page target 与 control target 不互相冒领

- Page constraint 负责 frame、hierarchy、route、regions、page composition 和其实际显示的状态。
- Exact control target 负责声明字段内的 anatomy、props、state owner、interaction、motion、a11y、platform、content、assets 和 scenarios。
- Page target 的 native physics/real service 等 cell 应 `not_applicable` 或按其声明范围排除，并给 Source-backed rationale。
- Control target 不能替代 page target 的整体页面构图。
- supporting `DESIGN.md`/Context 不能单独替代 exact target 的 machine-readable evidence。

### 13.3 Blocker 与 coverage 分离

- `spot-media-gallery` 的媒体布局、比例、隐私/来源标签、placeholder/error treatment 已 `covered`。
- 合法真实地点媒体本身是 downstream acceptance blocker，不应把 assets 设计 cell 写成缺失。
- 真机 tuning/capability 与 ops backend authority 同理：交互/反馈设计 covered，真实运行效果仍 blocking。
- 这样既能让 handoff 结构 preflight 通过，也不会错误宣称生产完成。

## 14. Source Item 要求

Handoff 中至少要形成以下 readable Source Item 组：

1. 交付 scope、必要上下文与 exclusions。
2. 四个 target 的 selection、class、hash、conditions 和 non-claims。
3. 14 个 Surface 的 applicability/owner。
4. 95 个 Control 的 target/locator 映射。
5. 三模式、viewport、state、motion、input、content、a11y 条件。
6. 八维 coverage/disposition。
7. 每个 verification method。
8. 9 个 mobile unresolved control 的精确 item/method lineage。
9. 12 个 ops backend-authority blocker 的精确 lineage。
10. provider/artifact/design-system qualifier。
11. editable upstream update route。
12. proposal reconciliation status。

用于 coverage 的 design Source Item kind 只能使用：

- `requirement`
- `control`
- `acceptance`

不要把 exact JSON 内容整段复制进 Markdown。每个 control mapping item 应引用：

- owning surface；
- Source Plan 的 user-task + 8 个 control fact keys；
- page target locator；
- exact control JSON pointer；
- applicable conditions；
- verification methods；
- blocker（若有）。

## 15. Verification method catalogue

每个方法必须能在后续 Contract 中映射为独立可失败 Assertion；不能把所有内容归为一个“visual compare”。

| Method ID | 要证明的事实 | 不能替代它的证据 |
| --- | --- | --- |
| `dr-resource-integrity` | 文件存在、bytes/hash/media type/JSON/HTML 可读 | provider project 存在 |
| `dr-source-profile-closure` | canonical entry、全部依赖、acquisition complete | 单张截图或 URL |
| `dr-stable-key-bijection` | 14/95、无缺失/多余/重复 | prose 列表 |
| `dr-surface-flow` | root entry、route、back/deep link、区域与跨页结果 | detached specimen |
| `dr-visual-content` | target 条件下层级、内容、模式与视觉对比 | hash |
| `dr-component-control` | anatomy、props、variants、owner/event/boundary | 页面出现一个按钮 |
| `dr-state-interaction` | trigger/input/validation/loading/empty/success/failure/recovery | 静态 default frame |
| `dr-motion-full` | property、起止、时序、interruption/reversal/settle | nominal duration 文本 |
| `dr-motion-reduced` | 非仅加速的 reduced alternative | full-motion pass |
| `dr-adaptation-input` | viewport、safe area、keyboard、gesture/input、overflow | 390 单视口截图 |
| `dr-accessibility` | role/name/order/state/44px/200%/contrast/focus/reduced | DOM presence |
| `dr-assets-license` | icon/media identity、license、replacement、mode treatment | placeholder 可见 |
| `dr-design-conformance` | 生产 actual 与 exact/constraint target 的可归因比较 | resource preflight |
| `dr-mobile-native-device` | Android 代表设备上的 gesture/sensor/camera/haptic/a11y/perf | Web atlas 或模拟器 |
| `dr-ops-backend-effect` | endpoint/authn/authz/idempotency/audit/rollback/recovery | 本地 sample flow |
| `dr-root-cold-start-journey` | 真实生产入口冷启动可达并完成目标 | 独立 route/deep link |
| `dr-shared-context-consistency` | Tonight/Map/Spot/Route/Trip/Sky 的地点/时间/revision 一致 | 单页局部状态 |

资源阶段可执行：

```text
npm run design:targets:verify
ty-context design-resource preflight <handoff.md>
```

生产 conformance、真机和 backend methods 由后续 Long-Task 绑定并执行；handoff 只声明其独立方法、Source lineage 和阻断条件。

## 16. 必须保留的 mobile blocker

9 个 unresolved control，10 个具体 blocker item：

| Control | Blocker item | Owner | Development | Native acceptance |
| --- | --- | --- | --- | --- |
| `map-filter-sheet` | `map-filter-sheet.device-tuning` | Mobile interaction owner | 不阻塞开发 | 阻塞 |
| `map-marker-density-surface` | `map-marker-density-surface.device-tuning` | Mobile interaction owner | 不阻塞开发 | 阻塞 |
| `selected-spot-sheet` | `selected-spot-sheet.device-tuning` | Mobile interaction owner | 不阻塞开发 | 阻塞 |
| `spot-media-gallery` | `spot-media-gallery.production-media` | Content/assets owner | 不阻塞开发 | 阻塞 |
| `observation-timeline-editor` | `observation-timeline-editor.device-tuning` | Mobile interaction owner | 不阻塞开发 | 阻塞 |
| `sky-time-scrubber` | `sky-time-scrubber.device-tuning` | Mobile interaction owner | 不阻塞开发 | 阻塞 |
| `orientation-follow-toggle` | `orientation-follow-toggle.capability-poc` | Mobile platform owner | 不阻塞开发 | 阻塞 |
| `orientation-calibration-sheet` | `orientation-calibration-sheet.device-tuning` | Mobile interaction owner | 不阻塞开发 | 阻塞 |
| `orientation-calibration-sheet` | `orientation-calibration-sheet.capability-poc` | Mobile platform owner | 不阻塞开发 | 阻塞 |
| `ar-mode-toggle` | `ar-mode-toggle.capability-poc` | Mobile platform owner | 不阻塞开发 | 阻塞 |

平台解释：

- Android：以上适用的 tuning/POC/媒体进入当前 target 的 native acceptance。
- iOS：设计与代码语义仍 applicable；实际 device POC/tuning 随 iOS runtime target 延期，状态必须是 `deferred/unverified`，不能写成 pass 或 not-applicable。

生产媒体要求：

- 必须是真实地点媒体。
- 必须有许可、来源、地点/时间/处理状态、隐私/EXIF 处置。
- AI/处理图、非原地点、模糊位置和过期素材必须显著标注。
- 不能用生成图、品牌氛围图或当前 placeholder 关闭 blocker。

## 17. 必须保留的 ops blocker

以下 12 个控件的 `ownershipVersion.unresolvedDecisions[0]` 均为：

> Backend API endpoint and production authorization remain downstream authority.

控件集合：

1. `admin-spot-editor`
2. `moderation-queue`
3. `data-source-dashboard`
4. `job-operations-console`
5. `recommendation-replay-console`
6. `rule-release-control`
7. `admin-access-audit`
8. `release-promotion-gate`
9. `technical-observability-dashboard`
10. `data-quality-dashboard`
11. `backup-restore-exercise`
12. `product-metrics-dashboard`

后续 method lineage 至少覆盖：

- real endpoint
- authentication
- authorization / field permission
- reauthentication/MFA when declared
- impact preview / exact confirmation
- idempotency
- immutable audit/readback
- failure/timeout/retry
- rollback/recovery
- sensitive-data redaction
- real telemetry/data source

这些是后端 authority 和 effect 证明，不需要再设计一套 ops 页面。

## 18. 不应委托的资源

| 候选资源 | Disposition | 原因 |
| --- | --- | --- |
| 全量移动高保真重做 | `omitted-existing-coverage` | 12 page + 83 exact controls 已覆盖 |
| 全量 ops 重做 | `omitted-existing-coverage` | 7 workspace + 12 exact controls 已覆盖 |
| 低保真 wireframe | `omitted-existing-coverage` | 信息架构和页面层级已选定 |
| 新视觉方向候选 | `omitted-existing-coverage` | `DESIGN.md` 与 selected targets 已治理 |
| 新 component library/atlas | `omitted-existing-coverage` | 83 mobile families、11 ops families 已映射 |
| 新状态/动效板 | `omitted-existing-coverage` | 19 states、7 motion recipes、240 scenarios 已覆盖 |
| 新微文案 deck | `omitted-existing-coverage` | 每控件已有 label/help/error/empty/safety/localization owner；业务文案由 Source Plan 控制 |
| 新数据可视化 grammar | `omitted-existing-coverage` | 矩阵、时间带、地图/图例、极坐标、路线、仪表、ops 图形已有 exact/constraint |
| 新 icon set | `omitted-existing-coverage` | 16 个自包含 project-authored SVG symbol |
| Logo/品牌插画 | `not_applicable` | `DESIGN.md` 明确禁止无证据发明 |
| 生成地点实景 | `forbidden` | 不能代表真实地点/许可 |
| Figma 文件 | `not_required` | 当前 repo-local HTML/JSON 已是完整 machine-readable Source；除非用户另行要求协作编辑 |
| 原生物理常数视觉稿 | `not-a-design-resource` | 需代表设备 tuning，不能从 Web/Apple 示例抄常数 |
| 后端 API/auth 流程图替代实现 | `not-a-design-resource` | ops 视觉反馈已设计，缺的是真实 authority/effect |
| Provider 购买/数据源 UI | `excluded` | CNY 200/月与 paid approval 是产品/运行规则，不能由 authoring 自动采购或发明 |

## 19. Forbidden inferences

后续 authoring 与 Long-Task 都不得推断：

- HTML 能渲染等于原生实现完成。
- hash 或 preflight 通过等于生产 fidelity、正确性或 acceptance。
- sample 北京/清水河/时间/评分/人物是业务事实。
- `unselected candidate` 旧字段否定 `DESIGN.md` 后续 adoption。
- mobile v3 provider run 已 succeeded。
- Web motion 常数可直接作为 RN 真机常数。
- iOS runtime 延期等于 iOS 设计/代码不适用。
- placeholder 是生产地点媒体。
- ops 本地 deterministic flow 证明真实权限/审计/发布/恢复。
- 当前代码或截图可以为自己授权。
- PWA、小程序、静态 Kit 或 detached route 可以替代 RN APP 的完成证明。
- CNY 200/月允许自动付费或绕过 owner approval。

## 20. Authoring 执行顺序

1. **治理前置**：单独调用 `context_uiux_design`，修复 `context:doctor` 对现有 Design Authority 的 discoverability；不做视觉重构。
2. **重新读取与 hash**：完整读取本文、Source Plan、Context、`DESIGN.md`、14 个 target 文件和 goal index。
3. **确认 selection**：selection basis 是既有 owner 选择 + `DESIGN.md` canonical adoption；不再发起视觉方向选择。
4. **建立 source profiles**：四套 implementation profile + Design/Product reference profile，acquisition complete。
5. **建立 subjects**：14 Surface、95 Control，唯一 owner，无重复。
6. **建立 locator**：HTML selector、JSON pointer、Markdown anchor、bounded whole resource。
7. **核算 conditions**：平台、viewport、mode、state、motion、input、content、a11y。
8. **核算八维 cells**：每个 applicable cell 唯一 disposition；target-specific、condition-specific。
9. **绑定 Source Items**：不能只写“见原型”。
10. **声明 verification methods**：每个方法可独立失败。
11. **保留 blocker lineage**：10 个 mobile item、12 个 ops item、provider qualifier。
12. **写唯一 handoff**：一个 Markdown、恰好一个 strict block。
13. **一次 proposal reconciliation**：仅写回 handoff identity/preflight/status。
14. **运行 preflight**。
15. **失败处置**：
    - locator/hash/dependency/schema 问题：修 handoff。
    - 真正未定义的物料级设计决定：停止 ready 声明，追加最窄 grouped study。
    - 外部媒体/真机/backend blocker：保持 blocker，不在 authoring 中伪造解决。

## 21. Handoff 完成标准

只有同时满足以下条件，才能称为 ready：

- [ ] Design Authority discoverability 已修复并重新 doctor。
- [ ] 四个 target、14 个文件的 bytes/hash 已重算。
- [ ] 4 个 source profile 的 canonical entry、dependencies 和 acquisition 完整。
- [ ] 14 Surface 全部存在且唯一。
- [ ] 95 Control 全部存在且一一映射。
- [ ] page constraint 与 control exact target 的职责没有混用。
- [ ] mobile/ops 的平台、viewport、mode、state、motion、input、content、a11y 条件完整。
- [ ] 八维 coverage 每个适用 cell 有唯一 disposition。
- [ ] covered cell 有 same-target/same-condition locator、Source item 和 verification method。
- [ ] `not_applicable`/`excluded_by_scope` 有 Source-backed rationale。
- [ ] 10 个 mobile blocker item 原样保留。
- [ ] 12 个 ops backend-authority blocker 原样保留。
- [ ] mobile v3 provider qualifier 原样保留。
- [ ] editable upstream owner/locator/update/export route 完整。
- [ ] proposal reconciliation path/status 完整。
- [ ] 只有一个 fenced `design-resource-handoff-v1` block。
- [ ] `npm run design:targets:verify` 通过。
- [ ] `ty-context design-resource preflight <handoff.md>` 通过。
- [ ] 没有修改 Source Plan、Context、`DESIGN.md`、frozen target、代码、测试或 Contract。

## 22. 后续 Long-Task 输入

Handoff preflight 通过后，完整补开发的 Single-Goal Long-Task 输入至少包括：

1. `docs/source-plan.md`
2. 本提案及完成后的一次 reconciliation
3. `docs/design-resources/starward-residual-implementation-handoff.md`
4. 四个 immutable target 的完整文件闭包
5. `DESIGN.md`
6. Product Surface / Screen Contracts
7. implementation gap audit
8. supplemental development plan

Long-Task 必须：

- 把 handoff 放入 `task.source_paths`。
- 把 handoff + 对应 target 全文件 + conditions 放入 target Check `verification_inputs`。
- 把每个 verification method 映射为独立 positive Assertion。
- 把 blocker 的 Source-item/method lineage 保留到 target-local machine Claim 或 external confirmation。
- 通过真实 production root entry、cold-start journey、native/runtime/backend evidence 完成，而不是靠文档或静态 target。

## 23. 信息查找索引

| 要查的问题 | 首选位置 |
| --- | --- |
| 初版产品逐字段目标 | 产品附件；`docs/source-plan.md` Section 5 |
| 初版技术逐字段义务 | 技术附件；`docs/source-plan.md` Section 5/6 |
| 当前个人试用版与 CNY 200/月 override | `docs/source-plan.md` Section 2/3/6/9；`project_context/global.md` |
| 14 Outcome 完整需求 | `docs/source-plan.md#outcome.<surface-key>` |
| 95 Control 的用户任务与状态事实 | `docs/source-plan.md` 对应 `ctrl-*` / `req-*-user-task` markers |
| Surface 信息/动作/反馈 owner | `project_context/areas/main/product-surface-contract.md` |
| 页面区域、顺序、overlay、route、验证 | `project_context/areas/main/screen-contracts.md` |
| exact token、模式、视觉/交互禁区 | `DESIGN.md` |
| 四个 target 的 canonical adoption/class/hash | `DESIGN.md` “Selected implementation target registry” |
| 12 个移动页面构图 | `docs/design-targets/mobile-product-pages-v2/` |
| 83 个移动 exact 控件 | `docs/design-targets/mobile-controls-v3/implementation-contract.json` |
| 2 个 ops 页面/7 workspace | `docs/design-targets/ops-product-pages-v1/` |
| 12 个 ops exact 控件 | `docs/design-targets/ops-controls-v2/implementation-contract.json` |
| Open Design project/run/provenance | Open Design goal index |
| 当前实现事实与 16 MVP/14 Outcome gap | `docs/architecture/implementation-gap-audit.md` |
| 19 工作包/Stage/Long-Task 顺序 | `docs/architecture/gap-driven-supplemental-development-plan.md` |
| RN Press/Gesture/Sheet/Haptic/A11y 实现 | `.codex/skills/uiux_design/**` |
| 项目验证命令与证据边界 | `project_context/areas/main/verification.md` |
| target 静态集合校验 | `tools/verify-design-targets.mjs` / `npm run design:targets:verify` |
| Design Authority discoverability | `npm run context:doctor` |
| handoff 结构校验 | `ty-context design-resource preflight <handoff.md>` |
| 当前移动生产入口 | `apps/mobile/index.js`, `apps/mobile/src/shell/MobileShellScreen.tsx`, `apps/mobile/src/shell/WebApplication.tsx`, `apps/mobile/src/shell/application-route.ts` |
| 当前 ops 生产入口 | `apps/admin-web/src/main.tsx`, `apps/admin-web/src/app/page.tsx` |
| 当前 runtime token consumer | `packages/ui-system/src/tokens.ts` |

## 24. Ready verdict

- 初版产品/技术 Source：完整可读。
- Product/Screen Context：14 Surface 已建立。
- Design Authority 内容：已配置且已采纳四个 target。
- Selected design coverage：14/14 Surface、95/95 Control，完整。
- 新视觉资源需求：无。
- Authoring 输入：充分。
- Authoring 唯一产品：residual implementation handoff。
- 当前阻断：
  1. Design Authority discoverability 先修复；
  2. handoff 尚未生成/preflight；
  3. 9 个 mobile 和 12 个 ops downstream blocker 尚未由实现/证据关闭。

因此，本提案已经可以直接作为下一次 `design-resource-authoring` 的输入；下一次任务不应重做 UI，而应编制、验证并交付唯一 residual handoff。

## 25. 可直接用于下一任务的指令

```text
使用 design-resource-authoring，完整读取
docs/design-resources/initial-product-design-resource-gap-and-authoring-brief.md，
按 STARWARD-DR-RESIDUAL-HANDOFF-V1 执行。

本次 intent 是 handoff，不是 exploration，也不生成新的全量页面、线框、高保真候选、
组件 atlas、图标、Logo、插画或地点媒体。四个 DESIGN.md 已采纳的 repo-local target
就是 selected immutable Source。

先确认 context:doctor 能发现现有 DESIGN.md 的 canonical Design Authority Index、
exact token source 和四类 reference；若仍缺失，只报告该治理前置并路由
context_uiux_design，不得由本 Skill 修改 Context 或 DESIGN.md。

治理前置满足后，创建且只创建
docs/design-resources/starward-residual-implementation-handoff.md：
- 人类可读 ty-source-item facts；
- 恰好一个 design-resource-handoff-v1 strict block；
- 4 个完整 source profile/dependency closure；
- 14 Surface / 95 Control；
- 全部 platform/viewport/mode/state/motion/input/content/a11y conditions；
- 八维 subject × target × condition coverage；
- typed local locators；
- 可独立失败的 verification methods；
- 10 个 mobile blocker item、12 个 ops backend-authority blocker 和 mobile v3
  artifact-ready/run-unreconciled qualifier 的完整 lineage；
- editable upstream update route；
- proposal reconciliation path/status。

不得修改 docs/source-plan.md、project_context/**、DESIGN.md、四个 frozen target、
生产代码、测试或 Long-Task Contract；不得用生成媒体、Web 物理常数、样例后端流程
伪造 blocker 已关闭。

完成后只对本初始提案做一次 idempotent reconciliation，记录 handoff path/hash/status，
运行 npm run design:targets:verify 和
ty-context design-resource preflight
docs/design-resources/starward-residual-implementation-handoff.md。
只有两者通过且没有未处置的设计 cell，才报告 handoff ready。
```

## 26. Final reconciliation（2026-07-26，仅此一次）

本节是对初始提案的单次、幂等最终 reconciliation；前文保留为 authoring 输入和审计历史，不把历史时态改写成第二份 handoff。

| 字段 | 最终记录 |
| --- | --- |
| Handoff | `docs/design-resources/starward-residual-implementation-handoff.md` |
| Handoff SHA-256 | `c3ec565705598dceb76d8a735d6ca3d71f31be9c1229b3fe929ce6a4db3e6463` |
| Schema / block | 恰好一个 `design-resource-handoff-v1` strict block |
| Shared preflight | `passed`；111 subjects × 8 dimensions = 888 grouped rows；22 acceptance blockers |
| Target verification | `passed`；14 target files、14 outcomes、95 controls、19 assemblies、240 scenarios |
| Design Authority doctor | `passed`；`index=present`、`token_source=selected`、`classified_references=4` |
| Context validation | `passed` |
| Selection | 未改变；继续使用 `DESIGN.md` 已采纳的四套 immutable target |
| 新视觉资源 | `none`；未生成重复页面、wireframe、高保真方向、atlas、图标、Logo、插画、地点媒体或 Figma |
| 治理变更 | 仅在 `DESIGN.md` 增加 parser-readable Design Authority Index，使既有权威可发现；未改变视觉方向、token 或 target 内容 |
| 保留 blocker | 10 个 mobile item（9 controls）与 12 个 ops backend-authority blocker 均未关闭、降级或改写 |
| Provider qualifier | mobile controls v3 继续为 `artifact-ready/run-unreconciled`，未推断 provider run succeeded |
| 后续用途 | 可作为显式 `/long-task-workflow` 的正式 Source；handoff、完整 target closure、conditions 和 verification methods 必须进入 Contract/Checks/Assertions |

最终 handoff 采用四套完整 `implementation_app` 机器可读 profile 和两套 `reference` profile。ops 的平台条件仍是 responsive desktop web；之所以不把自包含 HTML 声明为 `implementation_web`，是因为当前 shared validator 会把文件中的 `URL.createObjectURL(new Blob(...))` 误识别为本地 `url(new...)` 依赖。未为通过校验而修改冻结 target 或伪造依赖文件。

本 reconciliation 不表示生产 UI、Android 真机、iOS runtime、真实地点媒体、ops backend effect、部署或用户验收已经完成。

## 27. Post-reconciliation 产品权威刷新（2026-07-26）

本节记录 owner 在最终 reconciliation 之后作出的显式产品/技术决定，不是第二次候选选择或重新设计：

- Tonight `/tonight`、Map `/map`、Trips `/trips`、Sky `/sky`、Me `/me` 必须是一个持久 native Tab navigator 中的五个独立根 route/Screen。
- 每个 Tab 拥有自己的 nested stack 和主滚动/沉浸画布状态；切换不得依赖共享根 `ScrollView`、页面高度/锚点跳转或 `activeDestination` 条件伪页面。
- 深链先激活归属 Tab；Back 关闭 route-owned layer 后只弹出该 Tab 栈；Tab 切换不制造跨 Tab Back 历史。

设计资源 disposition：

| 字段 | 刷新后记录 |
| --- | --- |
| 新视觉资源 | `none`；现有 mobile page target 已分别覆盖五个目的地，`primary-tab-bar` exact target 已覆盖点击/深链与标签内导航状态保留 |
| Selection / frozen target | 未改变；未编辑四套 immutable target，也未启动 Open Design/Figma/provider generation |
| Handoff | 继续使用唯一 canonical `docs/design-resources/starward-residual-implementation-handoff.md` |
| 当前 Handoff SHA-256 | `f1f27018774a1feb839be50157214a54485c32bb2c845a878b5559216aa44f81` |
| 旧 digest | Section 26 的 `c3ec565…e6463` 仅表示首次 reconciliation 快照；不得作为本次刷新后的 Contract 输入 |
| Lineage | 已加入 `req-mobile-shell-and-preferences-independent-primary-routes`、`obl-mobile-shell-and-preferences-primary-tab-navigation-architecture`、`ac-mobile-shell-and-preferences-tab-state-and-native-navigation`，并刷新 `dr-control-primary-tab-bar` |
| Digest closure | 已刷新 Source Plan、补开发方案、gap audit、Architecture、Product Surface、Screen Contract 和 Verification Context 的完整 SHA-256 |
| Shared preflight | `passed`；111 subjects × 8 dimensions = 888 grouped rows；22 acceptance blockers |
| Target verification | `passed`；selection、14 outcomes、95 controls、19 assemblies、240 scenarios 均未改变 |

因此，这次决定没有形成新的 UI/UX 设计缺口；它把已有设计中“五个目的地”的含义收紧为可实施、可验收的独立页面导航契约。生产代码目前仍未满足该契约，后续由 `DEV-NAV-001` 和 Long-Task 的导航 Checks 关闭。
