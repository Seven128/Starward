# Open Design 当前设计系统审计修订同步计划

> 状态：task-local / 非权威 / 已获 owner 授权 / 待执行。
> 授权依据：owner 在首轮候选审计后明确当前流程为“DRA 设计资源 → 需求变更 → 设计资源”，并进一步确认时间轴等组件应先修改设计系统，再更新设计资源。
> 目的：把同一 current design-system identity 的 exact composed body 同步为 owner 审计后已通过 repository checks 的单一当前正文，再 material-revise 同一个六 Surface DRA project。

## 1. Exact input

- Stable target：`target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`。
- Provider identity：`user:starward-mini-program-sky-canvas-field-signal-revision`；linked system project `ds-starward-mini-program-sky-canvas-field-signal-revision`。
- 唯一 composed owner：根 `DESIGN.md` 的 `## WeChat Mini Program — Sky Canvas Field Signal` section。
- Immutable sources：base `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`；Map/Finder foundation `b4cd506d99caf3c5f59351f295f01cb7330ac720ce39f03abe464a143e09112e`；review-directed components `c38f599e55209c942809c118d5321e598de31523ded81078ff532e900d915c62`。
- Canonical section body（不含二级标题）：37,518 chars / 58,826 UTF-8 bytes / SHA-256 `81d865516305874121119356eb0b0112c9b4fa893d0110bd8d99d85d3a341583`。
- Exact provider body：二级标题 + LF + section body，经 `trim + one LF`；37,567 chars / 58,877 UTF-8 bytes / SHA-256 `c06f403fe2bda35e7d804b94cd1ea7627aafd298eda54b1928c88b917a82802f`。
- Current commission：`commission-brief.md`。它必须作为 task project `COMMISSION.md` 的 exact UTF-8 content 覆盖后才可运行修订。

不得发送整个根 `DESIGN.md`，不得拼接旧 08-25 resource、首轮候选正文、provider supporting template 或第三方地图截图。

## 2. Live preconditions

Open Design `0.21.1` daemon health 正常。Workspace/member context 每次从 live `/api/workspace/directory` 发现，只放请求 header，不写入仓库、报告或回复。

- Structured/run-resolved body、provider registry root `DESIGN.md`、linked system project `DESIGN.md` 当前均为 32,419 chars / 51,605 bytes / SHA-256 `4c86d52c012900e71022e1725682b6119a62ea22935e426e83f965e0988158f1`。
- Provider metadata：`status=published`、`artifactMode=agent-managed`、linked project ID 精确匹配；metadata SHA-256 `ab26193d8978b03af8feef95eaaa9decd7fb8445d9b30e46297f31c4cb226d71`。
- Provider supporting set（排除根 `DESIGN.md` / `metadata.json`）：30 files；用 JS 默认字符串排序后，将每项 `path<TAB>bytes<TAB>sha256` 以 LF 无尾换行连接，其 SHA-256 为 `e6055568e0057913973b2a0f5a6c867b6257f80668366e8a3adf8e81cb989869`。
- Stale revision `bccaa010-a3ef-4895-9fb0-4c874239fdac` 仍 `pending`，文件 SHA-256 `978b49ad81f2205100c3f534f961d8d167d04304a1361da97a901aa4fbf1dd41`。
- Linked system project 除 `DESIGN.md` 外 117 files；同一聚合算法 SHA-256 `f814f72fcdf915abeff9629d25bcf67032323884c78e478caaf17778710faa29`。
- Existing task project `starward-miniapp-field-signal-all-resources`：`kind=design-resource`、`intent=design-resource-authoring`、skill `frontend-design`、exact design-system binding、entry `index.html`，无 scenario/plugin snapshot；当前六个 user files 为 `COMMISSION.md`、`index.html`、`assets/styles.css`、`assets/app.js`、`coverage.json`、`README.md`。

## 3. Allowed mutations

1. 通过 supported `PATCH /api/design-systems/:id` 一次提交 `status=published`、`artifactMode=agent-managed`、exact `c06f403…` body。它只更新 registry package。
2. 通过 supported `POST /api/projects/ds-starward-mini-program-sky-canvas-field-signal-revision/files` 一次提交 `name=DESIGN.md`、相同 exact body、`overwrite=true`。这是 Open Design 0.21.1 让 structured/run resolution 使用当前正文所必需的 linked-project 同步。
3. 两路设计系统 postconditions 全部成立后，通过 supported task project file API 一次覆盖 `COMMISSION.md` 为当前 repo commission exact bytes。

这些动作不得提交 title/category/surface/project identity/workspace binding/provenance、不得接受 pending revision、不得改 supporting files、不得创建第二 design-system identity、不得改首轮 candidate files。Provider filesystem 只读用于独立 postcondition，不直接编辑。

## 4. Required postconditions

1. Structured GET、provider registry root和 linked system project 三路 body 都精确为 `c06f403…` / 37,567 chars / 58,877 bytes，并包含 review-directed source hash、default-peek Finder、Event Opportunity Window、Calibrated Time Scale、Full-Sky Orientation Canvas 与 viewport 无“演示数据”规则。
2. Provider 仍 `published/agent-managed`；identity、project binding、created/provenance 保持，仅允许更新时间与 metadata 序列化相应变化。
3. Provider 30 supporting files、linked project 117 other files、stale pending revision 的文件级集合/长度/hash 与 precondition 完全一致。
4. Task project ID/name/kind/intent/skill/design-system/entry/scenario/plugin binding 不变；更新 `COMMISSION.md` 不修改五个首轮候选文件。
5. 写入不含 workspace member ID、token、cookie 或 credential 的 `provider-review-body-sync-report.json`。任一 postcondition 失败即停止，不开始 DRA run。

## 5. Downstream boundary

同步完成只建立 provider current-input parity，不选择候选、不证明设计或生产合规。随后仍需在同一 task project/conversation 用 Codex / `gpt-5.6-sol` / `xhigh` / `frontend-design` / exact current system、无 plugin/snapshot，先重跑 style-application closure，再 material-revise 全部六 Surface。修订候选完成后必须再次停在 Design Resource Review & Selection Stop；用户明确通过前不得读取 downstream DRA references 或生成正式 handoff。
