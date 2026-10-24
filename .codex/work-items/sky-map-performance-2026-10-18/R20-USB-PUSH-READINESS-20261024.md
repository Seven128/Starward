# USB 与自动推送只读准备（2026-10-24）

用户最新明确手机可用、USB 连接、采用推送调试并将必要人类动作后置。本记录仅为后续 UI → 叠层 → Sky 的 `development_feedback` 准备；没有推送、构建或手机操作。总执行状态仍归 HANDOFF，完整 Goal 不因通路就绪而完成。

## Candidate identity

- 没有创建新候选。保留的普通 gen18 属原 feedback `TAV3wm`；其 prepared 项目与原设备 session 均实际存在，原 feedback 仍记录 `operator_confirmed`、无 pending 官方任务、无 stale cleanup 标记。该历史确认不提供当前手机输入资格。
- 原 feedback 记录 339 件、bundle `bee4293e758aca95534d69e4c754f5019ce334ec5bde8d10a194010b48e90af5`。本次通过现有 `fingerprintBundle` 只读重算实际 prepared WEAPP：**340 件、5,017,659 B、SHA-256 `54ec99e57858230effcb90bdc10b0e801631d35d6c02e57f243e9aaac30f6641`**，与既有 LAN owner 记录一致。没有删除 IDE 附加文件、重建或刷新它。
- LAN 后续独立采集 session 仍存在；R28/gen34 trial 目录实际存在，未读取/改变其内容。原 gen26 UNKNOWN、N05 和已送达 R6 均未操作。

## Invocation result

- `npm run miniapp:devtools:sync`：official Skill **0.3.14**，`current`、`changedFiles=[]`、`reloadRequired=false`。完整读取同步后 root、initializer、previewer 及相关项目/设备 owner；未改安装包。
- 当前 PATH 的 `wechatide` 与运行进程均指向 D 盘同一 Electron 安装。CLI `Codex` status 实际 `success=true`、`versionRelation=equal`、`loginExpired=false`、`cliTokenRequired=false`。`mcpTokenRequired=true` 只约束 MCP；本次工具目录未提供已注册的 wechatide MCP，已使用当前允许的官方 CLI，未读取或寻找 token。
- `npm run miniapp:device -- doctor --transport usb`：ADB **1.0.41**，检测 **1** 台 `device`，`transportReady=true`、`usbReady=true`。没有输出或保存设备标识。
- `npm run miniapp:device:feedback -- doctor --cli <当前 D 盘 cli.bat>`：`officialTool=available`、`automaticUpdate=available`、`ordinaryPreview=available`、`login=ready`、`usbReady=true`。
- 官方 `project_list --scope all` 实际 **4 项**，包含 canonical 源码项目和三个历史入口。列表不证明窗口状态，旧交接的“仅一项”不能作为当前事实。本次没有移除或关闭任何入口。
- 对原 gen18 exact prepared 路径仅发起一次官方 `automation_runtime_info(action=currentPage)`，返回 `ok=false`；当前页/场景仍未建立。输出归约没有保留具体错误字段，故不推断为登录、产品或手机故障，也未重试、另开窗口或恢复旧 automator。

## Observed product behavior

未读取手机像素、未输入、未推送或启动产品旅程。USB doctor 不证明 shell、截图、触控、当前小程序或当前包身份。

## Verified

- 当前唯一 USB transport 已授权；官方 CLI 登录与相应预览能力就绪。
- 原 gen18 与关键 session/冻结入口仍在；此次未破坏保全资料。
- 本次检查旧交接提及的 PG/API/bridge/collector 四个端口均未见监听。未据此启动、重启或接管服务；旧 PID/端口仍只是历史定位，数据库或数据丢失也不能由无监听推出。

## Unverified

- **当前自动推送收件账号/设备关联**未取得新证据。官方规则仍是发往与工具同登录态的微信；USB 本身不选择推送收件方。旧已成功推送证据可沿原 owner 核对其身份适用性，不能把本次 doctor 当收件确认。
- 当前项目窗口/页面、手机前台/显示/锁屏、shell/截图/输入、业务 API 可达性、原账号与草稿均未观察。
- USB 与 ADB 不转发业务 API。新候选若消费本机服务，需选当前手机可达的已授权 LAN/remote origin，并验证编译字节；不把 loopback 请求解释成桌面地址，不新建 `adb reverse` 或改 VPN。
- 当前源码、新 API 和候选同步、实际 UI/设备/性能/OOM 均未验。

## Invalidated

- 不沿用原 gen18 的 screenshot/input authority，不用其历史包代表当前 main。
- temp 目录最新修改时间对应的 `fXMI6J` 实际是 2 文件、官方结果 unknown 的旧 preview Harness，**不是当前产品 feedback**；已排除，不重放其未知官方请求。

## Cleanup

只执行状态、help、项目列表、存在性和指纹读取；Skill sync 本次无需更新。全部命令已结束，无新建 helper/service、feedback、device session、构建或推送，无源代码/PLAN/HANDOFF/Git 写入、手机/账号/草稿或 VPN/网络规则变更。

目前没有已证实必须用户介入的 USB/登录阻断。root 完成当前批次并核对现用源码/数据后，可通过现有 owner 创建**新**普通候选，保留原 gen18/gen34：

```text
npm run miniapp:device:feedback -- start --project D:\dev\Starward\apps\wechat-miniapp --delivery auto --cli D:\微信web开发者工具\cli.bat
```

该命令须在当前同账号目标资格已核并完成相称编译后执行；本次没有调用。收到 pending/unknown 时保留原 handle，先查结果；当前手机可见后再按原 owner 绑定并取得新鲜 USB 图像。若实际账号/信任/锁屏边界要求人类动作，继续独立准备后再集中报告最小清单。
