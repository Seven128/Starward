# 可直接粘贴到新 Goal 的启动输入

```text
$long-task-workflow

在 C:\Dev\Starward 中完成《今晚去观星》微信小程序 V2.1.1 的完整 Long Task 交付。

唯一启动索引是：
docs/long-task-inputs/wechat-miniapp-v2-2026-08-22/LONG_TASK_INPUT.md

同时读取其同目录 INPUT_MANIFEST.json，并完整读取索引列出的两份 V2.1.1 方案、formal selected handoff v3 及其全部依赖闭包、DESIGN.md、相关 project_context、现有 docs/wechat-miniapp-v2-source.md 和真实生产代码。

重要约束：
1. 这是新的 Long Task Workflow，不是继续 DRA，也不是长程工作流之外的自举方案。
2. 现有 docs/wechat-miniapp-v2-source.md 只是含旧事实的 marked Source 骨架。先用 V2.1.1 + selected v3 全量对账并重建其 Census/Fact/Obligation；不得直接用旧 manifest Compile。
3. 先运行 v3 design-resource preflight，完成 UI Authority Closure、Context Delta 和 Architecture Deliberation；然后创建或修订恰好一个 canonical delivery-contract.yaml。不要建立第二份 Contract、计划或结果账本。
4. 实现必须落在 apps/wechat-miniapp、workers/miniapp-api、packages/miniapp-contracts 及必要的真实支撑/验证 owner 中；selected HTML 只是 constraint，不是生产代码。
5. 原始 V2.0、selected v1/v2/v3 都不可覆盖；保留用户已有的无关工作树修改。
6. 不要让我重新选择已在 DRA 中确定的产品/UI 决策。只有真实外部选择或权限才提问；可验证工作继续推进。
7. 完成第一次 Authority Lock 后，若 execution_model_checkpoint.required 为 true，严格停在 Skill 规定的终端回合并输出它要求的精确中文回复提示；在我解除卡点前不要开始产品实现、构建或测试。
8. 卡点解除后，按 Skill 的 packet-first、当前候选、唯一 Final Gate 和诚实 External Confirmation 规则持续执行，直到达到可证明的终态。
```

