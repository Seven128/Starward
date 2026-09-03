# Open Design 设计系统发布同步计划

> 状态：task-local / 非权威 / 已获授权并完成执行与 postcondition 验证。
> 目的：闭合 Open Design 0.21.1 的 `DESIGN_SYSTEM_NOT_PUBLISHED` 前置门，同时保证设计含义与已采纳不可变 Source 完全一致。
> 强制门：没有用户对本文件所述持久 provider mutation 的明确授权，不得执行 PATCH、不得绕过 exact design-system binding 创建项目。

## 1. 目标与非目标

目标仅有一个：把既有 Open Design design-system identity
`user:starward-mini-program-sky-canvas-field-signal-revision` 的 provider 状态同步为 `published`，并把它的根 `DESIGN.md` 对齐到已采纳不可变 Source 的精确正文，使新的 bounded prototype project 能合法绑定该 identity。

不改变：

- 根 `DESIGN.md`、`project_context/**`、生产代码、测试或任何既有 selected package；
- design-system title、category、surface、provenance、workspace/project 归属或 identity；
- system workspace project `ds-starward-mini-program-sky-canvas-field-signal-revision`；
- 任何产品逻辑、Surface/Control/状态/路由或 UI/UX 决策；
- 现有 pending revision 的状态；该 revision 不会被接受、合并或作为输入；
- provider 目录内除根 `DESIGN.md` 与 `metadata.json` 以外的 supporting files。

## 2. 已验证的执行前快照

验证日期：2026-09-02。个人 workspace member identifier 仅在 live API 调用时发现，不写入本文件、请求留档或仓库日志。

| 对象 | 当前状态 / SHA-256 | 判定 |
| --- | --- | --- |
| adopted immutable Source `docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/selected-source/DESIGN.md` | 41,787 bytes；`a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e` | 唯一 exact-body 输入 |
| system workspace project `DESIGN.md` | 41,787 bytes；`a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e` | 与 adopted Source byte-equivalent |
| structured design-system body | 24,093 chars；UTF-8 SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e` | 与 adopted Source string-equivalent |
| provider root `DESIGN.md` | 7,646 bytes；`e8d24553f50969845b8c44f952568e6fbaad59fb8aaab07299a963125f1bca15` | 旧模板 stub；不是 exact-value owner |
| provider `metadata.json` | SHA-256 `e112735b0dd6cd3c7e22545cdd1f3be54f06279c9e8b3c2c648a0fcd992ad6e4`；`status=draft`；`artifactMode` absent/null | 导致 exact-bound project 创建被拒绝 |
| pending revision `bccaa010-a3ef-4895-9fb0-4c874239fdac` | `status=pending`；base `e8d24553...`；proposed `b8ec8f96f6b6b4ec20272586616ccb52aa335ba86b4a70f67a74dd18b5a15ce8` | stale / noncanonical；禁止接受 |
| intended task project `starward-miniapp-field-signal-all-resources` | 不存在 | 先前带日期/版本后缀的失败请求没有遗留项目；当前 project ID 遵循 no-version owner rule |

adopted Source 已是 LF 结尾且无首尾多余空白。Open Design `normalizeBody` 的 `trim + one LF` 结果与原始字节相同，归一化后的 SHA-256 仍为 `a3868d...`。

## 3. Supported API 行为与选定动作

Open Design 0.21.1 daemon 原生支持：

- `PATCH /api/design-systems/:id`；
- mutation 前执行 workspace/resource authorization 与 `canMutateUserDesignSystem`；
- `artifactMode` 只接受 `generated` 或 `agent-managed`；
- 始终写入根 `DESIGN.md` 与 `metadata.json`；
- 当 effective `artifactMode != agent-managed` 时会额外调用 `writeGeneratedDesignSystemFiles`，重生成 supporting files。

授权后只发送以下语义字段；实际请求必须在运行时重新发现 workspace headers，且不得持久化个人 member identifier：

```json
{
  "status": "published",
  "artifactMode": "agent-managed",
  "body": "<adopted immutable Source 的精确 UTF-8 正文>"
}
```

选择 `agent-managed` 是为了把持久变更限制到两个已知文件，禁止 provider 基于旧模板或摘要重生成 supporting artifacts。请求不提交 title、category、surface、provenance、sourceNotes、projectId 或 workspaceId；daemon 必须从现有 metadata 保留它们。

## 4. 精确预期变更集

允许变化：

1. provider root `DESIGN.md`：从旧 stub `e8d24553...` 替换为 adopted exact body `a3868d...`；
2. provider `metadata.json`：
   - `status: draft → published`；
   - `artifactMode: absent/null → agent-managed`；
   - `updatedAt` 刷新；
   - JSON 序列化字节及文件 SHA-256 随之变化。

必须保持：

- metadata 的 identity、title、category、surface、createdAt、project/workspace 归属和 provenance 语义；
- provider design-system 其余文件的 path / byte length / SHA-256；
- pending revision 文件与 `status=pending`；
- system workspace project 的全文件快照，尤其其 exact `DESIGN.md=a3868d...`；
- 仓库所有 controlling Source 与已选资源；
- task project 仍须在同步验证成功后单独创建，不能由 PATCH 隐式产生。

## 5. 执行顺序、校验与中止条件

授权后按以下顺序执行：

1. 重新读取 Goal、本计划、working index、adopted Source；确认 target key、identity、expected digest 未变化。
2. 从 live `/api/workspace/directory` 发现 workspace context；读回 design system、metadata、pending revisions 与 project list。
3. 生成 task-local pre-mutation manifest，只记录非敏感对象、状态、文件清单和 SHA-256；不记录 member identifier、credential、cookie 或 token。
4. 若任一前置条件与第 2 节不一致，**不执行 PATCH**，把漂移报告为新的 decision-required。
5. 通过 supported PATCH 一次性提交第 3 节三个字段；不直接编辑 provider filesystem / `metadata.json`。
6. 立即读回并验证：
   - `status=published`；
   - structured body、provider root body、system project body 与 adopted Source 均为 `a3868d...`；
   - effective `artifactMode=agent-managed`；
   - identity / ownership / provenance fields 保持；
   - pending revision 仍 pending 且未成为 current body；
   - supporting files未变化；
   - intended task project 仍不存在。
7. 任一 postcondition 失败即停止，不创建项目、不开始 run，并保存实际差异供人工决策。
8. 全部 postconditions 通过后，才创建新的 bounded task project，读回核对 exact `designSystemId`，然后按 `commission-brief.md` 发起正式候选 run。

## 6. 失败与恢复边界

daemon 的实现是先写根 `DESIGN.md`、再写 metadata，并非可证明的跨文件事务。若请求中途失败，必须读取实际文件状态，不得盲目重试。即使只完成第一步，写入的也是 adopted exact body，设计含义不会漂移；但在 `status=published` 与完整 postconditions 闭合前仍禁止创建项目。

本计划不承诺自动 rollback：把 `artifactMode` 改回 `generated` 会触发 supporting-file 重生成，不是无副作用的逆操作。若同步后需要撤销，必须先形成新的、精确的恢复方案并再次取得用户授权。

## 7. 授权文本的解释边界

只有用户明确同意“将现有 Open Design design-system identity 按本计划同步为 published，并用 adopted exact body 对齐 provider root”才视为授权。泛化的“继续”“生成原型”或 Goal 自动续跑不扩大到这项持久 provider mutation。

该授权只覆盖本计划的一次同步及其只读验证；不构成接受候选、修改 UI/UX、选中资源、写 formal handoff、采纳 Authority 或修改生产代码的授权。

## 8. 执行结果

- 执行时间：2026-09-02；Open Design `0.21.1` dynamic daemon endpoint，经 live workspace context authorization。
- 结果：`status=published`、`artifactMode=agent-managed`；provider root、structured body、system project 与 adopted Source 均为 SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`。
- 30 个 supporting files 全部与 pre-mutation snapshot 一致；无新增/缺失文件；stale revision 仍 `pending`；system project 未在 mutation 时间窗内写入；目标 task project 仍不存在。
- 证据：`provider-pre-mutation-manifest.json` 与 `provider-post-mutation-report.json`。
