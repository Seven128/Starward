# 给 Tiny Context 的开发约定优化建议

反馈日期：2026-09-08。依据是 Starward 本机安装的 `project-tiny-context-harness@0.12.0`、schema 5 及当前项目；未核对上游其他版本。此文是供讨论的建议，不是新增项目开发指令。

## 可以直接转发的反馈

我们希望继续沿用 Tiny Context 的开发入口，让架构判断、适时抽取公共能力和复用成熟方案在普通开发中更可靠地执行。当前短合同已包含“复用现有 owners/components/mature capabilities、避免无用抽象”，方向正确；但何时触发、如何取舍、如何检查结果仍较宽泛。希望增强这几处决策提示，继续保持 Context 轻量，不引入每次开发都要走的架构文档、审批、阶段任务或评分门禁。

建议重点覆盖三个时机：新增能力前查现有职责与依赖；出现需要共同演进的真实重复时抽取并迁移调用方；选择新依赖或准备自建复杂能力时比较适合当前平台的成熟方案。完成时报告有实质影响的决定和实际验证，避免用“遵循最佳实践”代替证据。

## 我们实际观察到的情况

| 本机事实 | 对优化的启示 |
| --- | --- |
| `assets/agents/AGENTS_CORE.md` 已有复用/避免过度抽象的短约定；本项目根 AGENTS 被当前会话提供，能看到该规则 | 规则具备进入本次上下文的入口，但不证明每次实现都做出了好决策；应补触发条件和完成行为 |
| `sync-engine.js` 通过 merge-block 更新 AGENTS 托管区，保留区外内容 | 项目扩展区是现成能力，应继续保留；无需再生成一份内容相同的开发 skill |
| 当前项目只有 global.md 为默认 Context；architecture 和维护边界按需读取 | 保持按需读取，但开发约定应要求由实际改动识别受影响 owner，不能只等用户说出“架构”关键词；manifest triggers 是检索线索，不证明文件已读 |
| `doctor.js` 已提示 AGENTS.override 可能遮蔽入口，并说明不能证明宿主实际加载 | 这个边界应保留；可以进一步解释各入口的作用和迁移状态，不能把文件存在、结构通过等同指令已执行 |
| 架构记录拒绝了一个 UI 库，实现索引却仍写“未来接入”，并列出当前代码没有的 ConfigProvider | 这是项目事实重复维护产生的漂移，不是已证明的 Tiny Context 程序缺陷；索引应引用决策 owner，改动相关范围时同步修复陈旧引用 |
| 项目 UI skill 被用于小程序，但描述和技术步骤主要指向 React Native | 这是项目 skill 的平台路由问题；通用开发入口应鼓励先识别实际运行平台，再复用相应能力 |
| 现有 `verify-ui-contracts.mjs` 检查源码字符串，并明确标注运行时局限 | 可以约束特定结构，不能证明何时应该抽公共组件、库是否适配或架构整体合理 |

以上事实通过本地文件/代码核对；没有把历史维护债务逐项认定为仍然存在，也没有完成全仓架构审计。

## 建议落在什么位置

| 位置 | 负责内容 |
| --- | --- |
| Tiny Context 通用开发合同（AGENTS 托管区） | 简短的触发条件、复用/抽取/选型判断、结果核对和证据边界 |
| 已有开发 skill（如果某发行版仍提供） | 确有必要的可选操作方法，引用通用合同；不要与 AGENTS 维护同一套全文 |
| 项目 AGENTS 自有区 | 项目要求的执行补充及具体 Context/skill 入口；sync/upgrade 保留，合并冲突可见 |
| 架构及业务 Context | 当前真实边界、已采用/已拒绝的选型和关键理由，必要的重评条件；索引只导航 |
| 专项 UI/发布/验证 skill | 对应平台与场景的执行方法，不承担另一份项目事实源 |
| 临时比较或运行记录 | 留在任务资料里；无实质决定时不为每次开发增加 Context |

0.12.0 本地 sync 实际更新的是 AGENTS 短合同。本项目没有发现仍在使用的 Tiny Context 专属开发 SKILL.md；如果你们称它为“开发 skill”，建议文档清楚说明当前版本的物理入口、旧 skill 的迁移关系与宿主差异，避免用户以为两套都需要启用。

## 可讨论的最小合同补丁

下面是候选文本，建议替换/合并现有相关条款，不要把新旧规则叠加成两套流程：

```text
- Before adding or materially extending a capability, inspect the existing owner,
  its consumers, state/data ownership and dependency direction. Reuse or extend
  suitable project and platform capabilities before creating an equivalent.
- Extract a small shared unit when consumers share a responsibility that must
  evolve together, or the current requirement already defines that shared role.
  Migrate affected consumers within scope; avoid speculative generalization and
  forced unification based only on appearance, line count or repetition count.
- Before adopting a new dependency or building substantial custom machinery,
  consider suitable mature alternatives. Reuse current decisions and evidence;
  investigate only material gaps in target support, behavior, customization,
  maintenance, license and integration cost. Explain the decisive tradeoff.
- Review changed boundaries and affected consumers, including relevant lifecycle
  and failure behavior. Report material decisions and actual checks; structural
  validation and the presence of these instructions do not certify good design.
```

执行尺度也应明确：改颜色、修局部条件等小改沿已有 owner 直接完成，不触发一轮外部选型；跨职责扩展再查相关架构；复杂能力兼容性不确定时做小范围运行验证。技术调查应有边界，已有结论在条件未变时复用。自建并非默认错误，成熟库也不能因知名度而覆盖产品和运行时要求。

## 如何判断它真的有帮助

建议在 Tiny Context 自身的版本验证中保留少量可重复的开发任务，对比实际代码和行为；它们是工具评估样本，不是每个使用项目都必须完成的流程。

| 样本任务 | 应观察的结果 |
| --- | --- |
| 两处相同校验逻辑要一起修改 | 找到全部相关调用方，以同一规则实现并验证不同输入，旧副本不继续生效 |
| 两个外观相近但生命周期不同的控件 | 能保留独立职责，避免堆积无关开关的通用组件 |
| 新增被多处使用的图片查看交互 | 初次就明确共享 owner，页面仅提供内容与业务动作，关闭/取消/焦点行为一致 |
| 给现有组件改一个颜色 | 直接修改对应样式，不新增依赖、不做全面选型或无关重构 |
| 接入一个支持情况不确定的组件库 | 查实际目标支持并做必要的小范围验证；能说明采用或自建的关键理由 |
| 决策 owner 与索引内容冲突 | 查当前代码与权威记录，修正索引，保留“需求”和“实现未完成”的区别 |
| sync/upgrade 前存在项目自有规则 | 区外内容保留、重复/冲突标记有明确诊断；新会话与旧已加载指令区别可解释 |

检查应关注可观察结果：重复路径是否消失、依赖方向是否保持、调用方行为是否一致、是否少了不必要工作。不要以命中了几句政策关键词、文件行数下降或 agent 自评分作为效果证明。结构诊断可以可靠检查路径、引用、配置和部分边界；语义合理性仍需要代码审查与行为证据。

## Starward 已采用的本地补强

- [AGENTS.md 项目自有区](../AGENTS.md#project-local-implementation-decisions)：六条执行要求；原 Tiny Context 托管区保持不变。
- [现有 UI skill](../.codex/skills/uiux_design/SKILL.md)：共享交互职责、调用方迁移与验证，以及 native App / Taro-WEAPP 分流；没有新增通用开发 skill。
- [架构](../project_context/architecture.md)、[实现索引](../project_context/areas/main/implementation-index.md)与[manifest](../project_context/context.toml)：明确事实归属，修正过期 UI 库/Provider/设计资源引用，扩充按需检索词；不扩大默认 Context 全量加载。

Tiny Context 的 node_modules、托管模板和全局配置未修改；没有执行上游发布或发送反馈。上述规则能够被当前入口引用，其长期行为收益仍需后续开发任务验证。

## 本地核对入口

Tiny Context：`node_modules/project-tiny-context-harness/package.json`、`assets/agents/AGENTS_CORE.md`、`dist/lib/sync-engine.js`、`dist/lib/doctor.js`。

Starward：`AGENTS.md`、`project_context/context.toml`、`project_context/architecture.md`、`apps/wechat-miniapp/package.json`、`apps/wechat-miniapp/src/app.tsx`、`tools/miniapp/verify-ui-contracts.mjs`。这些路径是本次观察来源，分享给上游时无需附带 node_modules 或项目私有代码。
