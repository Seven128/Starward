# R19 gen5 官方预览终态与恢复独立核验

2026-10-22。独立只读核验；仅新增本报告及本机私有必要原件，未修改 feedback、生产代码、守卫或候选，未操作设备、IDE、服务，未再次调用预览。

## 结论

证据足以将 **gen5 这一次 `auto_preview` 业务调用认定为成功终态**。官方运行日志明确记录 `toolName=auto_preview / clientName=Codex / entry=skill-call / mcpStatus=success / toolStatus=success / errorCode=0`，并与唯一的 gen5 prepared project、CLI runtime、上传任务及时间相互对应。这个判断采用的是业务调用结束记录，不能仅由 COS 上传完成、包装层退出状态或手机可见画面替代。

该成功发生在 `2026-10-22T12:54:34.860Z`，比包装层 `12:54:19.040Z` 的 timeout 晚 **15.820 秒**。原包装层因 120 秒超时未取得结构化结果，仍是 `disposition:error / boundary:timeout / result.status:unknown / success:null / taskId:null`；该原始事实也成立。本核验没有恢复原 API 回执或公开 taskId。

支持唯一 state owner 在完整保全原记录、候选与本证据关联的条件下，作一次明确标注为 **官方运行日志重建** 的 task-local 终态修复，再沿现有可见候选核对和 bind 流程继续。不能调用 `recordOfficialTaskResult` 假装查询了一个不存在的公开 handle；不需要重发预览，也不需要修改通用 no-replay / no-bind 守卫。若不保留来源区分、身份发生漂移或无法通过现有候选核验，则维持 unknown 并继续独立工作。

## 候选与包装层身份

- Feedback run：`%LOCALAPPDATA%/Temp/starward-device-feedback-TAV3wm`。
- Generation：`5`；prepared project：`generation-000005-5gZGgg/project`；创建于 `2026-10-22T12:52:18.992Z`。
- Bundle SHA-256：`2ff0c01667882db9a874789f48ba49cef6f764f04f7f1a00606db182eeb9e331`；**350 个文件、5,013,260 bytes**。
- Prepared config byte SHA-256：`f353db3094255b6b0e8c371b6c67605591134dc2e21bd3f41a1e4a14b57cd437`；semantic SHA-256：`0aa7d7abd5a080d3605db69879e7682792b8591fc3431c5503031c7abe6875ff`。
- 独立调用现有 `sourceBinding`、`fingerprintBundle` 只读复核，包 hash、文件数、字节数和 prepared config 的字节/语义 hash 均与原 feedback 相符；`assertGenerationCurrent(run)` 也通过，确认当前 source config 的语义仍符合该 generation。没有重新编译或改动 frozen generation。
- 官方 terminal 行的 AppID 与 prepared config 内部比对相同；报告不记录其值。

包装层原诊断 `.official-process-b3b87fc5-5cb9-4216-88e9-701e15927432.json`：

- `startedAt=2026-10-22T12:52:19.007Z`，`completedAt=2026-10-22T12:54:19.040Z`。
- `exitCode:null / signal:SIGTERM / errorCode:device_feedback_official_timeout`。
- 实际观察并完整保留 55 bytes stderr，仅为已开始 `Codex auto_preview` 的 skill-call 提示；stdout 为空，未截断。这不是业务失败回执，也不证明 IDE 的远端工作被取消。

## 官方调用关联

主日志名 `2026-10-21-20-25-41-660.log`；以下时间采用日志自身的 `+08:00`。

| 原位置 | 时间 | 可确认事实 |
| --- | --- | --- |
| L22468 | 20:52:19.169 | `session_init / clientName=Codex / entry=skill-call / authResult=allow`。仅是本次调用的时间锚点，不把授权成功当作预览成功。 |
| L22473–L22477 | 20:52:25.482–20:52:26.623 | 唯一 CLI backend 建立；`project ready` 同一行直接关联 `generation-000005-5gZGgg/project` 与 `rt:CLI_8108b266c4d4923a2ddac29314e4ebee`。 |
| L22696–L22703 | 20:52:29.742–20:52:29.802 | 同一 runtime 唯一 `startUploadTaskWithProxyFunc`，随后 `getUploadTaskResult`。 |
| L22716 | 20:52:36.550 | 同一 runtime 进入 `doUpload:start`。 |
| L22722、L22731 | 20:52:40.921、20:54:29.129 | COS 上传耗时 **108,208 ms**。仅是中间阶段完成。 |
| L22732–L22733 | 20:54:29.130–20:54:29.890 | 同一 runtime 的内部异步上传 commit 完成。其内部标识不是公开 taskId。 |
| L22734–L22738 | 20:54:34.856–20:54:34.858 | 同一 runtime 上传阶段结束，L22736 明确 `progressSuccess`。L22735 的 `parseError` 是该上传阶段计时标签；未用其单独证明成功或失败。 |
| **L22739** | **20:54:34.860** | **`auto_preview / Codex / skill-call` 的业务结束明确为 `toolStatus=success / errorCode=0`，持续 135,684 ms**。该终态才是恢复依据。 |

从 L22468 到 L22739 的实际调用窗口共 **272 行**：259 行带 runtime，全部是上述唯一 CLI runtime；仅有一个 `project ready`、一个 upload start，以及一条工具调用结束记录。该结束行本身没有 runtime/project 字段，所以最后一步关联属于基于**唯一调用、同一上传连续过程、相隔 2 ms 的结束记录及相符持续时间**的明确推断，不能描述为公开 taskId 的直接查询。

业务结束时间减去 `durationMs=135684` 得到调用起点 `2026-10-22T12:52:19.176Z`，比包装层开始晚 169 ms，与 L22468 的 session_init 时间相符。原日志附近的 `rt:0` 模拟器记录在本次调用窗口之前，没有第二个竞争的 CLI runtime 或 auto_preview 结束记录。终态行中的 AppID 与 prepared config 比对相符，进一步排除其他项目结果。

未以手机画面作为这个业务终态的证据；未读取凭据、cookie、聊天、私有 IPC、应用打包实现或其他未知接口。日志中的官方 stack 文件名只是原日志元数据，没有打开对应实现。

## 可执行的恢复边界

`tools/miniapp/device-feedback-official.mjs:443` 的 `normalizedOfficialState` 会把 `completed + result.status:unknown` 归为 `unknown / result_conflict`，所以单改顶层 disposition 不足以恢复成功。这个检查正确，无需放宽。

如果 root 选择写入，建议在原 run 的 `withFeedbackRun` 锁内完成以下一个受约束操作：

1. 再核验 feedback 原始 SHA-256、generation `5`、bundle hash、完整原 official tuple、`deviceSession:null`，并调用现有 `assertGenerationCurrent`；若原状态已变化则停止，不能覆盖另一个执行者。
2. 保留原 feedback 原始字节、原 timeout diagnostic、原 `official` 对象与本证据 manifest 的 hash。后续 cleanup 前由 owner 保留所需 frozen candidate；本核验没有删除任何候选。
3. 可写入顶层 `disposition:completed`，并把 `result` 定义为本次**重建的标准化业务摘要**：`tool:auto_preview / status:success / success:true / taskId:null / taskType:null`。同时在 `result` 本身加入如 `recoveredFrom:official_runtime_log`、`structuredReceiptRecovered:false`；在 `resolution` 保留详细 provenance、结论、时间、generation/bundle、证据路径/hash、`originalOfficial`、原 feedback hash，以及 `originalStructuredResultRecovered:false`。保持原 timeout diagnostic，不把它改成 exit 0。`boundary` 可标明 `official_runtime_log_reconstruction`，明确这不是原始 transport 回执。
4. `result` 内的来源说明必要：现有 `device-feedback.mjs:61` 直接输出 `officialResult:run.official.result`，仅把说明放在 `resolution` 会使通常摘要遗漏这个差别。不得把重建对象描述为原 API 输出，不得伪造 `taskId`，不得用内部上传 commit 标识替代公开 handle。
5. 使用现有 fresh foreground observation 实际识别 intended phone 上的新 gen5 界面之后，才沿原 `bind --confirm official_update_completed`。日志业务成功不等于手机已运行该候选；该观察确认也不等于所有界面、交互或性能验收完成。输入仍遵守 fresh capture 与原 guard。不要重发 auto_preview 以取得一个更好看的回执。

只在内存中构造上述带 provenance 的假设对象，现有 `normalizedOfficialState` 与 `assertOfficialOutcomeResolved` 均返回 `completed`；**没有向 feedback 保存它，也没有调用 bind**。`bindConfirmedGeneration` 仍会执行原 generation 验证和设备会话创建/绑定检查，没有测试替身或通用守卫修改。

这是一条有独立官方业务终态证据的任务内恢复边界，不能扩展为“所有超时均可改 success”，不能把可见画面、COS 完成或非零退出当作未来调用的替代终态。

## 原件保全

私有目录：`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/gen5-preview-recovery-originals`。原换行及字节不转换；不入仓库、不上传。

| 私有原件 | Bytes | SHA-256 |
| --- | ---: | --- |
| `2026-10-21-20-25-41-660.L22455-L22742.raw.log` | 116,957 | `bb371905015e0c6a21b16aa5280a423917516718c9ed9dbdf730560fb9451360` |
| `feedback-gen5-before-resolution.json` | 1,982 | `f992e50416faf942ea3b33f17fe14ae91c31200dbada8688038f829e985917cf` |
| `official-process-gen5-original.json` | 469 | `bdfc6c9444a933f317efb1e16c662dabd1088570a0833f92a2789b180b29a93a` |

`manifest.json` SHA-256：`4adbfe2f54ec8abe12b73fa5552a9b084123f385a41e2aac07ac9b11d72a1ec5`。它记录源日志读取时文件大小与 hash、原日志 L22455–L22742 的 byte offset `[7304665,7421622)`、片段 hash、候选身份以及现有 generation 核验摘要。前后邻近少量日志用于界定调用窗口，不把邻近模拟器/心跳记录归入本次预览。写入后重新读回三份保全文件，长度和 SHA-256 均匹配 manifest。

报告只公开非敏感关联和结论。原始日志可能含平台内部材料，应保持私有。
