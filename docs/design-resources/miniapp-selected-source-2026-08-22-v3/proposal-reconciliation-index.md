# 需求变更与方案一次性对账索引 · selected v3

## 最终方案

| 方案 | 仓库内最终文件 | SHA-256 | Downloads 同字节副本 | 原始 V2.0 状态 |
|---|---|---|---|---|
| 产品方案 V2.1.1 | `docs/design-resources/miniapp-v2-drift-correction-2026-08-20/reconciled/今晚去观星_微信小程序产品方案_V2.1.1_LongTask输入定稿版.md` | `EE158A18E81F0ED5CD8051FA8CD6CFC009EF4782EEDB7C17CE11674ACECAA42E` | `C:/Users/777/Downloads/今晚去观星_微信小程序产品方案_V2.1.1_LongTask输入定稿版.md` | 保持不变，SHA-256 `AF2D9B60C59B23D3040133974AB8C8AEA99DB43C566317AA3EDE4241C0786944` |
| 技术方案 V2.1.1 | `docs/design-resources/miniapp-v2-drift-correction-2026-08-20/reconciled/今晚去观星_微信小程序技术架构与技术实现方案_V2.1.1_LongTask输入定稿版.md` | `77A510C8A5FE32C425BEBB5D113028CCB275BA9443C3678EF7DC40EB9E6BE7DA` | `C:/Users/777/Downloads/今晚去观星_微信小程序技术架构与技术实现方案_V2.1.1_LongTask输入定稿版.md` | 保持不变，SHA-256 `82A281D1CD2D21556383876A24C62B7614CAB9531B7A98ED37535FC62041A98E` |

## 对账结论

- 两份 V2.1.1 是完整文件：保留原始 V2.0 全部未受影响内容，并以文首规范性对账章统一覆盖冲突的历史投影。
- V2.1.1 只修正 V2.1 下游可见的版本、日期、状态和关联产品元数据；U1–U33、97 项 requirement disposition、selected HTML、Provider 字节与设计含义均未改动。
- selected v2 保持不可变历史版本；selected v3 是供 Long Task 使用的无歧义输入版本。
- exact visual truth 仍由 `DESIGN.md` 的 `target.system.wechat-miniapp-soft-instruments-2026-08-05` 持有；本 selected v3 只拥有本次页面、组件、状态与交互投影。
- 3 个 partial 与 1 个 excluded 是外部真实数据/生产能力边界，不是未解决的设计选择。

## 选择与可编辑上游

- Human selection：2026-08-22，用户结束需求变更循环并委托完成 DRA。
- Immutable resource：`docs/design-resources/miniapp-selected-source-2026-08-22-v3/index.html`，SHA-256 `9F7E60C1233D76D9A00800D594AF273CC9ECC5F537840DDC4E72A407286E5E31`。
- Supersedes for downstream use：`miniapp-selected-source-2026-08-22-v2`（保留，不覆盖）。
- Editable upstream：Open Design project `starward-miniapp-v2-drift-correction-2026-08-20` / conversation `61006884-d0d8-48d2-bc4c-f0136e8ade3b`。
- 更新规则：不得覆盖 selected v1/v2/v3；后续变更必须发布新版本。
