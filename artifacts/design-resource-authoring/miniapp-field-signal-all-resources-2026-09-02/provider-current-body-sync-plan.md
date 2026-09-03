# Open Design 当前设计系统正文同步计划

> 状态：task-local / 非权威 / 已获精确授权 / 已完成并通过 postcondition 验证。
> 授权依据：`DECISION_REQUIRED.md` 在用户看到完整边界后列明“同步 Open Design canonical design-system”，用户随后回复“继续”。该授权只覆盖本文件的一次 PATCH 与读回验证。
> 目的：在创建全量交互原型项目之前，把既有 Open Design design-system identity 的 structured body 从 base-only 正文同步到根 `DESIGN.md` 当前完整 Mini Program canonical section。

## 1. 精确输入与正文构造

- Stable target：`target.system.wechat-miniapp-sky-canvas-field-signal-2026-09-02`。
- Open Design identity：`user:starward-mini-program-sky-canvas-field-signal-revision`。
- 唯一 composed owner：根 `DESIGN.md` 的 `## WeChat Mini Program — Sky Canvas Field Signal` section。
- Immutable base Source：`docs/design-resources/miniapp-design-system-2026-09-02-sky-canvas-field-signal/selected-source/DESIGN.md`，SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e`。
- Immutable app-owned Map/Finder Source：`docs/design-resources/miniapp-field-signal-map-finder-ui/selected-source/DESIGN.md`，SHA-256 `b4cd506d99caf3c5f59351f295f01cb7330ac720ce39f03abe464a143e09112e`。
- `markdownSection` 正文（不含二级标题）为 32,370 chars / 51,554 UTF-8 bytes，SHA-256 `6ac7bf2f1fad5e9893c9c482f65749ca1ff1598664bfedeaa650e7be53d0990e`。
- Provider body 的唯一构造：二级标题原文 + LF + 上述完整 section 正文，执行 Open Design `trim + one LF` 归一化；结果必须为 32,419 chars / 51,605 UTF-8 bytes，SHA-256 `4c86d52c012900e71022e1725682b6119a62ea22935e426e83f965e0988158f1`。

不得只发送 `6ac7bf…` 对应的无标题正文，不得发送整个根 `DESIGN.md`，不得拼接旧 08-25 resource、provider supporting template 或 system-project 文件。

## 2. 执行前已验证快照

验证时间：2026-09-02；Open Design `0.21.1`。Personal workspace identifiers 仅从 live `/api/workspace/directory` 取用，不写入仓库、日志或回复。

| 对象 | 当前事实 |
| --- | --- |
| structured body | 24,093 chars；SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e` |
| provider root `DESIGN.md` | 41,787 bytes；SHA-256 `a3868d68649e51951f8ae9f9e7a4fa7a08a9270aa491f3f463d04fede655be2e` |
| provider metadata | `status=published`；`artifactMode=agent-managed`；SHA-256 `3fb1cc2c190cabc595371325d89e2e966f24a6143e2587cf3168bf048307bdb0` |
| supporting files（排除根 `DESIGN.md` / `metadata.json`） | 30 files；排序后的 `path<TAB>bytes<TAB>sha256` manifest SHA-256 `1ced0c8d52b77d5d4da9e5b00d199be3e1fc48404505c8a8119efc313fe5953a` |
| stale revision | `pending`；文件 SHA-256 `978b49ad81f2205100c3f534f961d8d167d04304a1361da97a901aa4fbf1dd41` |
| reviewed system project newest write | `2026-09-01T23:54:07.8797152Z` |
| bounded task project | `starward-miniapp-field-signal-all-resources` 不存在 |

机器可读副本：`provider-current-body-pre-mutation-manifest.json`。

## 3. 唯一允许的 mutation

通过 daemon 的 supported `PATCH /api/design-systems/:id`，只提交：

```json
{
  "status": "published",
  "artifactMode": "agent-managed",
  "body": "<第 1 节定义的 4c86d5… exact provider body>"
}
```

保持 `published` 避免 project binding 回退；保持 `agent-managed` 避免 provider 重生成 supporting files。请求不得提交或改变 title、category、surface、identity、project/workspace ownership、provenance 或 pending revision。

## 4. 必须成立的 postconditions

1. structured body 与 provider root `DESIGN.md` 均精确等于 32,419 chars / 51,605 bytes / SHA-256 `4c86d52c012900e71022e1725682b6119a62ea22935e426e83f965e0988158f1`。
2. metadata 仍为 `status=published`、`artifactMode=agent-managed`；identity、title、category、surface、project/workspace binding、createdAt 与 provenance 语义保持，只允许 `updatedAt` 和序列化字节相应变化。
3. 30 个 supporting files 的数量、路径、长度与 SHA-256 聚合必须仍为 `1ced0c8d…`；stale revision 仍为 `pending` 且同 hash。
4. reviewed system project 不因 PATCH 被写入；它保留 base Source 只作已审查的组成来源，不是当前 composed exact-value owner。
5. bounded task project 仍不存在；PATCH 不得隐式创建项目。
6. 读回验证结果写入 task-local post-mutation report，不含 personal workspace identifier、cookie、token 或 credential。

任一 postcondition 不成立，立即停止：不重试、不创建项目、不开始 generation，先保存实际差异并报告新的 decision-required。

## 5. 边界

这次同步不接受 stale revision、不物理删除历史审计资源、不修改生产代码/测试/产品逻辑，不选择候选，也不授权 DRA 审计停点之后的步骤。内部 identity 中既有的治理字符串不会进入新候选可见 UI；新项目标题、产品界面与设计文案不得出现 version、日期、revision 或旧/新双轨标签。

## 6. 实际 partial result 与精确 recovery

Registry PATCH 已执行一次并写入 exact root body `4c86d52c…`；metadata 仍为 published/agent-managed，supporting files、stale revision、system project 与目标 project 都保持原状。但是 structured GET 仍返回 `a3868d…`。机器可读事实见 `provider-current-body-partial-report.json`。

只读检查 Open Design 0.21.1 provider implementation 后确认：

- GET detail 与正式 generation 都按 `linked system workspace DESIGN.md ?? registry body` 解析正文；
- linked project 正是 metadata 的既有 `projectId=ds-starward-mini-program-sky-canvas-field-signal-revision`，其 `designSystemId` 回指同一 identity、`metadata.importedFrom=design-system`、`entryFile=DESIGN.md`；
- `PATCH /api/design-systems/:id` 只更新 registry package，不会更新已存在且非 legacy-placeholder 的 workspace `DESIGN.md`；
- 因而原第 4 节第 4 条“system project 不写入”与“structured/run exact body”在该 provider 版本下不能同时满足。前者被本 recovery 精确取代，但 partial result 本身不被抹去。

### 6.1 Build / Reuse / Buy 与选择

- Allowed：通过 provider 已支持的 `POST /api/projects/:id/files` 精确覆盖 linked project 的 `DESIGN.md`；通过新的 design-system identity 重建并重新绑定；在能够证明 run 不走 workspace override 时只使用 registry root。
- Selected：复用现有 linked project 和 provider project-file API，只覆盖 `DESIGN.md` 为同一 `4c86d52c…` exact body。这是已授权“同步 Open Design canonical design-system”的必要传输步骤，不改变任何 UI/UX、产品语义、identity 或 provenance。
- Rejected：新 identity 会制造第二 current system；忽略 structured/run mismatch 会违反 exact binding；直接编辑 provider filesystem 会绕过 authorization/audit；接受 stale revision 会引入非 canonical body。

### 6.2 Recovery preconditions

- linked project `DESIGN.md` 当前为 41,787 bytes / `a3868d...`；除该文件外有 117 files，排序 `path<TAB>bytes<TAB>sha256` manifest digest 为 `339359f880260932662688cb2ba5d6439d3ca10a22f1de96be2486adeb05e2ef`；newest write 为 `2026-09-01T23:54:07.8797152Z`。
- direct project API 读回：project id 与 metadata `projectId` 精确一致，`designSystemId` 精确回指当前 identity，`importedFrom=design-system`、`entryFile=DESIGN.md`。
- registry root 已精确为 `4c86d52c…`；structured body 仍为 `a3868d…`；目标 task project 仍不存在。

### 6.3 Recovery action 与 postconditions

只调用一次 `POST /api/projects/ds-starward-mini-program-sky-canvas-field-signal-revision/files`，JSON body 仅含 `name=DESIGN.md`、第 1 节 exact `content`、`overwrite=true`。不直接编辑 filesystem，不提交 HTML version fields，不写其他 project files。

恢复后必须同时成立：

1. linked project `DESIGN.md`、registry root、structured GET body 三者均为 `4c86d52c…`，并包含 Map/Finder current contract；
2. linked project 除 `DESIGN.md` 外 117 files 的聚合仍为 `339359f8…`；project identity、designSystemId、metadata 与 binding 保持；
3. provider 30 个 supporting files 仍为 `1ced0c8d…`，metadata published/agent-managed，stale revision pending；
4. bounded task project 仍不存在；
5. 结果写入 `provider-current-body-post-mutation-report.json`。任一失败继续停在项目创建之前，不重试。

## 7. 最终结果

- Recovery 已通过 supported project-file API 执行一次；registry root、linked project `DESIGN.md` 与 structured/run-resolved body 三者均为 `4c86d52c…`。
- Linked project 除 `DESIGN.md` 外 117 files 聚合仍为 `339359f8…`；provider 30 个 supporting files 聚合仍为 `1ced0c8d…`。
- Provider 保持 published/agent-managed；stale revision 仍 pending；目标 all-resources project 尚未创建。
- 证据：`provider-current-body-partial-report.json` 保留首次 partial 事实，`provider-current-body-post-mutation-report.json` 记录当前闭合状态。
