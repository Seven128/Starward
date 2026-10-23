# R19 gen9 普通预览：初始化失败的独立边界复核

结论：本次官方 CLI 进程确已尝试并终止，但有足够的正面控制流证据判定 **`preview` 业务处理器尚未调用**。可以在完整保留本次原件后，记录一份只针对本次调用的 task-local `not_invoked` / 初始化失败处置，再由原 owner 在 IDE 命令入口实际恢复后发起一次新的普通预览。不能把原 `error / unknown` 回执改写成平台预览业务 `failed` 或成功，不能凭公开 refresh 命令 exit 0 认定投递完成。

本次复核没有调用预览、启动或关闭 IDE、操作设备/服务/Git、修改 feedback state 或任何生产/守卫文件；只新增本证据。没有套用 gen8 的自动投递失败结论。

## 本次原件

- feedback：`C:\Users\momoooo\AppData\Local\Temp\starward-device-feedback-TAV3wm\feedback.json`，复核时 SHA256 `2501a237b43b16af2213775fa4d917dc3cca557256e387cd3d36c40c2fd197d9`。
- generation：`generation-000009-YFKuNJ`；bundle SHA256 `a6daa76cfa7ef274030fbc60db0b6cbea48566976bd78db58a44438c2d73afe5`，345 件 / 5,020,981 B；`deviceSession:null`。
- diagnostic：该 generation 下 `.official-process-39539710-e9ae-4564-afc4-30b7bb029425.json`，SHA256 `812fa322f8e8f780bb57ae75f1b05c631c7cc5f848edb1a054d32c3e2410297c`。
- 原记录时间严格采用 UTC 字段：`2026-10-22T18:43:54.187Z` 至 `2026-10-22T18:44:24.460Z`，30.273 秒；`exitCode:4294967295`，`signal:null`，`errorCode:device_feedback_official_failed`。
- `stdout` 0 B；`stderr` 342 B，完整保留，`truncated:false`。实际解码内容依次为初始化、punycode 弃用提示、尝试连接旧 59012 端口、`初始化错误: wait IDE port timeout, undefined`。没有预览准备、编译、上传、二维码或业务结果输出。
- feedback 原回执仍是 `disposition:error / boundary:failed / result.status:unknown / success:null / taskId:null`。这里的 `boundary:failed` 是进程异常的通用分类，不能据此宣称远端预览业务终态。

## 实际实现边界

复核了 `tools/miniapp/device-feedback-official.mjs`（SHA256 `fc4cf68fbd54aa52cbaee76ffb9fbd8082facf1b3ba395ab18318272b272a786`）与 `device-feedback-preview.mjs`（`f2273256e6d897d96952a40ec11aa77d882d6dc33df8312b1791c7b8c63bd5d`）。`OfficialWechatDevtools.preview()` 调用安装中的普通 `index.js`，参数为 `preview` 与本代 project/QR/info 输出位置；不是本次未调用的 skill `auto_preview` 入口。其外层进程等待上限为 120 秒。本次约 30 秒自然非零退出，错误码不是外层 `official_timeout`，不属于外层超时杀掉一个可能已在运行的预览任务。

root 已确认：原 refresh 未传 `--cli`；现场只读 `resolveOfficialCli()` 选择 PATH 中 `D:\微信web开发者工具` 安装，实际 executable 为该目录 `微信开发者工具.exe`、cwd 同目录、prefix 对应普通 `index.js` bootstrap。root 另保留本机选定 metadata。该安装的实际源码已由本代理读取：

- `D:\微信web开发者工具\resources\app.asar.unpacked\js\common\cli\index.js`，SHA256 `3751162de8167f75359818779a991a765a7c6bd4e41029f549789d177205f962`。
- 同目录 `cli.bat`，SHA256 `89800bcdb3321eca9ae4f6c8770b40c000f20e7076de19000226cd88a8679b50`；其普通 CLI bootstrap 与项目 resolver 的入口一致。本结论不把 `wechatide.cmd` 的 skill 入口混作本次普通 preview 入口。

安装源码为压缩单行，下列定位采用解码字符串 UTF-16 的零基 offset：

1. `1022149`：`preview` 命令注册只设置 `global.v2Handler` 为延后执行的闭包，注册本身不发预览请求。
2. `401135`：初始化尝试 `notifyCLIPort`；函数 `E`（`100336`）仅对 IDE 做 `updatePort` 握手，不传 project 或 preview 命令。
3. 握手失败时，初始化调用 `u.start(...)` 后在 `401523` 等待 `getIDEPort()`。已完整读取 launcher `450959..453383`：它只启动 IDE 并给出 CLI/remote/可选 IDE 端口、GPU 等启动参数，没有 project/preview 指令，不另存或延后重放本次预览。
4. `100111`：`getIDEPort()` 无有效端口时设置 30 秒计时器，拒绝值正是 `wait IDE port timeout`。这与本次完整 stderr 和 30.273 秒进程终态对应。
5. `401546` 后的 `connect` 升级与初始化完成均须等待上一步成功。本次在初始化 `catch`（`401816`）打印 `initialize-fail` 并执行 `process.exit(-1)`。
6. `global.v2Handler ? await global.v2Handler() : ...` 在 `401942`，位于该初始化 catch 之后；本次退出不会到达它。实际 preview handler（`1022340`）才会显示“准备中”并调用预览 transport。因此本判断建立在错误字符串、时间和发送控制流共同对应上，不是由“没看到二维码”推导。

正常的 IDE 进程启动尝试可能发生；不能据此把**整个 CLI 调用**描述为未发出。可确认为未发出的是本次 `preview` 业务请求。当前无 listener/进程等后读不是这个结论的主要依据，也不证明当时所有 IDE 状态。

## 一次恢复的约束

- 在任何处置前，完整保全原 feedback、诊断与本代候选，核对原件 SHA；本证据不修改它们。
- task-local receipt 需绑定上述 diagnostic hash、generation/bundle、原工具、起止时间、无 taskId 的原回执及本报告，明确写 `preview_handler_not_invoked_due_to_ide_initialization_failure`。可表达“初始化失败，预览未调用”；不伪造平台业务 `failed`、不复用旧二维码、不删除未知记录。
- 只在 root 负责的同一安装 IDE 命令入口实际恢复，并通过原 generation/source guard 后，由既有 owner 发起 **一次新的** 普通预览，生成新的独立诊断。保留原守卫，不能为恢复而普遍将 `unknown`/timeout 放行。
- 本次没有 taskId，不能伪造 task poll。若新调用跨入业务后又出现 timeout/unknown，则按其自身证据保留 no-replay；本报告不授权下一次递归重试。
- 原因仍止于 IDE 初始化端口边界：不推断 AppID、登录、平台权限、包上传或产品 UI 有问题；没有手机接收、绑定或验收结论。

无需为本判断额外扫描宽泛 IDE 日志：安装内唯一相应等待与初始化退出顺序已经给出正面边界证据。后续如果发现实际执行安装/源码与上述身份不符，或出现同调用的 preview 业务日志，必须撤回本处置资格并保持原 unknown，不借本报告覆盖冲突证据。
