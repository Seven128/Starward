# R19 gen2 官方预览失败独立核对

2026-10-22；只读核对，不修改生产代码、守卫或 feedback state，不调用新 preview。原始材料仅保存在本机私有目录。

## 结论

证据足以将 **gen2 的这一次 `auto_preview` 业务结果认定为终态失败**：官方上传任务明确报告主包源代码 **2050 KB 超过 2048 KB**，随后同一调用以失败结束。它不是仅由 CLI 非零退出、普通工具 status 或包装层错误推导出的失败。

原包装层记录仍是 `disposition:error / result.status:unknown / taskId:null`，本次没有改写。没有恢复出可供官方 task 查询的公开 `taskId`。日志中上传流程的内部 `async_*` commit 标识不能充当它。

可以由唯一 state owner 在完整保留原记录和本报告证据关联的前提下，作一次明确标注为 **官方运行日志恢复** 的失败状态修复，再修复包体并正常生成下一候选。不得声称恢复到了原始结构化业务回执，不得把 gen2 标记成功或绑定到手机，不得用伪造 taskId 调用任务结果记录入口。本报告本身不执行状态修复或重发。

## 候选身份

- Feedback run：`%LOCALAPPDATA%/Temp/starward-device-feedback-TAV3wm`。
- Generation：`2`；prepared project：`generation-000002-v5347l/project`。
- Bundle SHA-256：`367e107a214b32807fab76bd90f9feac4e5e4915c22f0e413911268bf40ee3b7`。
- 338 个文件、5,000,289 bytes；创建时间 `2026-10-22T10:56:06.816Z`。
- 独立使用现有 `sourceBinding` 与 `fingerprintBundle` 只读复核 prepared bundle：上述 hash、文件数、字节数及 prepared config semantic hash 均与 feedback 记录相符。未重新编译或修改 frozen generation。

## 官方证据关联

以下时间均为日志自身的 `+08:00` 时间。主日志名为 `2026-10-21-20-25-41-660.log`，错误日志名为 `2026-10-22-18-57-02-975.log`。

| 原日志位置 | 时间 | 可确认事实 |
| --- | --- | --- |
| 主日志 L11061–L11065 | 18:56:13.319–18:56:14.585 | 创建 CLI backend；`project ready, projectpath=...generation-000002-v5347l/project` 与 `rt:CLI_b3b5487b9930c6c7d07a164fc547c728` 在同一条记录中直接对应。 |
| 主日志 L11284–L11291 | 18:56:17.669–18:56:17.727 | 同一 rt 开始 upload task，并进入 `getUploadTaskResult`。 |
| 主日志 L11302–L11304 | 18:56:26.287–18:56:26.288 | 同一 rt 完成打包阶段并进入 `doUpload:start`。 |
| 主日志 L11319–L11321 | 18:56:51.769–18:56:52.753 | 同一 rt 的 COS 上传阶段结束并提交上传任务。该阶段完成不表示预览成功。 |
| 错误日志 L1 | 18:57:02.177 | `task type:upload exec error`；错误正文明确为代码包大小超限，主包 2050 KB > 2048 KB，带服务错误时间 18:56:55。 |
| 主日志 L11322 | 18:57:02.178 | `toolName=auto_preview`，`mcpStatus=success`，**`toolStatus=fail`**，`errorCode=10`，持续 55,196 ms。传输成功与业务失败同时存在，不能把前者当成预览成功。 |
| 主日志 L11344–L11345 | 19:06:17.697–19:06:17.698 | 上述同一 rt 的 utility backend 退出并销毁；只是后续结束证据，不单独用它证明上传失败。 |

在 `18:56:00–18:57:02` 的最小相关主日志窗口内，共 269 条记录，带 rt 的 254 条均为上述同一 rt；只有一次 `startUploadTaskWithProxyFunc` 和一次 `auto_preview` 调用结束记录。该窗口旁只有上述一个时间匹配的独立错误日志。错误日志本身没有 project/rt 字段，因此错误内容到 gen2 的最后一步是基于**唯一调用、同一上传阶段、相隔 1 ms 的失败结束**的关联判断；它不是公开 taskId 直接查询结果。

19:04 的 `check_wechatide_status` 成功与本次预览结果无关，未用作成功证据。没有检查凭据、cookie、私有 IPC 或应用打包代码，也没有调用其他预览入口。

## 现有 owner 与恢复边界

- `tools/miniapp/device-feedback-official.mjs:300` 附近的 `classifyOfficialPreviewResult` 将 transport/tool error 保留为 `error + unknown`；它明确不把该错误视为远端效果已取消。这次原包装层记录符合该规则。
- 同文件 `assertOfficialOutcomeResolved`（L390–L395）拒绝 `pending`、`unknown`、`error`、`invoking` 的 replay；该守卫正确且无需削弱。
- `tools/miniapp/device-feedback-session.mjs:110` 起的 `recordOfficialTaskResult` 只接收对**已保存原 taskId**的明确查询回执，缺失原 taskId 必须先从外部恢复；本次没有这样的公开 handle，因此不能调用它并把自行构造的 `{status:failed}` 冒充查询回执。
- `tools/miniapp/device-feedback-binding.mjs:30` 起只允许成功/人工预览等可绑定状态；失败 gen2 不能绑定。

建议 root 唯一执行状态写入时：

1. 再核对 run、generation number、bundle hash 和当前原始 official tuple 仍与上述记录一致，避免覆盖其他执行者的新状态。
2. 保留本次 `error/unknown` 原文备份及其 SHA-256，不覆盖或删除其历史含义；新增的恢复依据必须注明是本机官方日志、关联方式、结论 `failed`、证据 manifest 和本报告，保留 `taskId:null`。
3. 仅记录本次业务失败的终态，不能伪造实际收到过的 structured response、成功送达或手机候选绑定。现有 task-result API 不支持这种无公开 handle 的日志恢复；如采用一次 task-local state 修复，须作为有证据的恢复操作独立留痕，而非修改通用分类/守卫逻辑。
4. 修复实际包体问题后走原有 generation/build/delivery 流程。若无法保持以上证据与状态区分，则继续保留 `unknown`，不得删除 run、另起 start 或更换入口来绕开 no-replay。

`assertGenerationCurrent` 的整体验证曾在当前 canonical build 的读取边界返回 `bundle_app_json_required`；随后定点只读确认 prepared 与 canonical 的 `app.json` 均存在，并完成了仅针对 frozen prepared bundle 的身份核对。未把这次并行构建期读取失败解释成 gen2 变更，也未重跑预览。写入 owner 应在其构建结束后自行核验当前 source binding。

## 原件保全

私有目录：`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r19-ui-20261022/preview-failure-originals`。

只复制以下必要范围的原始字节，原换行未转换；`manifest.json` 记录源文件读取时 hash、byte offset、line range 和片段 hash。原件不进入仓库、不上传。

| 私有原件 | SHA-256 |
| --- | --- |
| `2026-10-21-20-25-41-660.L11061-L11065.raw.log` | `ee512ed0ddafc0144d78789209cec2ca2af174f1cbc34bbb1b6da5a32da20e1d` |
| `2026-10-21-20-25-41-660.L11284-L11323.raw.log` | `a4b23cebc35f496db13939c92f769e3d807c21589b3a22d1adda46ef495ff38b` |
| `2026-10-21-20-25-41-660.L11344-L11345.raw.log` | `af76305e2814715b0d334004d44db73f7da58273127227f573fba15258e4c23b` |
| `2026-10-22-18-57-02-975.L1-L1.raw.log` | `56c831b7e6ce67090a57db4082c8aafd602bc94b00ac0bab705bae5865fee916` |
| `feedback-gen2-before-resolution.json` | `6bc9c67d1cc9ac7d1b8c0787702c86d5997cfb8f8a1da2d39b3c78bc92857dd5` |

报告只含候选/非敏感运行关联摘要；原始日志可能包含平台内部材料，应保持私有。
