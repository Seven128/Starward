# 需求变更与方案一次性对账索引 · selected v2

## 最终方案

| 方案 | 仓库内最终文件 | SHA-256 | Downloads 同字节副本 | 原始 V2.0 状态 |
|---|---|---|---|---|
| 产品方案 V2.1 | `docs/design-resources/miniapp-v2-drift-correction-2026-08-20/reconciled/今晚去观星_微信小程序产品方案_V2.1_DRA最终对账版.md` | `752893A4331318DCDD33F974D5A9F68D1B0E91CE868C96CFA5C8D317AF367211` | `C:/Users/777/Downloads/今晚去观星_微信小程序产品方案_V2.1_DRA最终对账版.md` | 保持不变，SHA-256 `AF2D9B60C59B23D3040133974AB8C8AEA99DB43C566317AA3EDE4241C0786944` |
| 技术方案 V2.1 | `docs/design-resources/miniapp-v2-drift-correction-2026-08-20/reconciled/今晚去观星_微信小程序技术架构与技术实现方案_V2.1_DRA最终对账版.md` | `30C83F527112F6C0EAC4F1E613FEF53C3C0CEF3F3DC76A9E002E3CDFF028D8DB` | `C:/Users/777/Downloads/今晚去观星_微信小程序技术架构与技术实现方案_V2.1_DRA最终对账版.md` | 保持不变，SHA-256 `82A281D1CD2D21556383876A24C62B7614CAB9531B7A98ED37535FC62041A98E` |

## 对账结论

- 两份 V2.1 是完整文件：保留 V2.0 全部未受影响内容，并在文首加入最终规范性对账章；对账章列明优先级、最终 IA、组件/状态合同、全部 U1–U33 决策表、inactive/partial/excluded 边界与 selected 资源身份。
- 旧冲突文字只保留用于基线追溯；凡与 V2.1 对账章或 `selected-requirement-dispositions.json` 冲突者均为非规范历史，不得进入实现要求。
- exact visual truth 仍由 `DESIGN.md` 的 `target.system.wechat-miniapp-soft-instruments-2026-08-05` 持有；本 selected v2 只拥有本次页面、组件、状态与交互投影。
- 97 个 requirement disposition 与 selected HTML locator 已冻结，无 decision-required。3 个 partial 与 1 个 excluded 是外部真实数据/生产能力边界，不是未解决的设计选择。

## 选择与可编辑上游

- Human selection：2026-08-22，用户结束需求变更循环并委托完成 DRA。
- Immutable resource：`docs/design-resources/miniapp-selected-source-2026-08-22-v2/index.html`，SHA-256 `9F7E60C1233D76D9A00800D594AF273CC9ECC5F537840DDC4E72A407286E5E31`。
- Editable upstream：Open Design project `starward-miniapp-v2-drift-correction-2026-08-20` / conversation `61006884-d0d8-48d2-bc4c-f0136e8ade3b`。
- 更新规则：不得覆盖 selected v2；后续变更必须发布新版本。
