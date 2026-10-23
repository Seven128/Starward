# R19 gen15 公共按钮拖出释放观察

## Candidate identity

`development_feedback`，沿已实际送达并绑定的普通 gen15：`generation-000015-Na0iwU/project`，bundle `63893429b0f47be8284a944d08a34f9230ffa4b87315de1d361ff361a25087d3`、345 件、5,023,790 B；session `starward-device-test-IrTg0l`。当前 DAY、原 TEST 附近完整 Map，terrain/LIGHT 开启。没有编译、刷新或重新绑定。手机完整字节/runtime AppID 仍未认证。

## Invocation result

Root 从当前 `feedback.json.deviceSession` 恢复完整嵌套路径。首次按摘要中省略层级的路径 capture 返回 ENOENT，发生在截图/输入前；没有因此重建或另启会话。随后公共 USB capture `ef46113f-02d4-4328-9d0e-1dd9ea96300d`（2026-10-23 UTC 02:34:25.276）成功，Root 实看等比图后，立即执行一次显式 USB `record-swipe`：从可见层叠按钮中心约 `(0.901,0.469)` 向左拖出到 `(0.68,0.469)`，请求 900ms，录制请求 6 秒。

公共命令 exit0、`actionSent=swipe`，返回视频 `recording-1792722883326.mp4` 和终态 capture `2e2132e9-529e-4927-81ea-0e1ddc6ea0f6`（UTC 02:34:43.326）。离线实际解码为 1080×2376、**3.454044 秒**，不按请求 6 秒认定覆盖。离线抽帧第一次因新父目录未创建而 ENOENT；创建本次私有 owner 后成功，没有追加手机输入。

## Observed product behavior

Root 实看初始与终态原图、8 个实际解码时刻的全画面拼图以及保持原像素的按钮裁片。释放后仍是完整 Map，没有误开 LayerSheet；可见地标、叠层和工具位置保持，按钮没有残留选中底色或几何缩小。采样时刻为 0、0.8、1.2、1.5、1.8、2、3 和末帧 3.444044 秒。

这些采样未解析出明确的 pressed 中间态。全画面拼图没有出现 LayerSheet，但不据离散帧保证所有未采样瞬间；取消终态也不区分具体原生事件名。没有为捕捉曲线重放同一手势。

## Verified

本次单一真实拖出释放路径没有提交层叠打开动作，终态按钮及 Map 可见状态正常。它补充原有效点击后的选中终态，与共享原生 Button 的取消责任相符，不等于完整按压合同通过。

本次 22 件原件/回执/实际视频/解码帧与审阅派生图共 31,781,132 B 已私有保存并逐件 SHA256 读回；manifest SHA256 `ccc297b140e1347b7e223fabe7b3b924054f89b7d2ee04b76b963ee0b04cdf5b`。私有 owner 为 `device-resume/r19-ui-20261022/gen15-press-cancel-20261023-1034`，源会话原件仍保留。

## Unverified

没有测得物理 80ms 按下/140ms 释放曲线、完整连续 pressed 状态、长按/重复、disabled/loading 或 Picker 原生边界；不能从此片段推导 FPS、响应时间、资源回收或全 UI/Goal 通过。采样未捕到明确 pressed 不是按钮反馈不存在的证据。绿色 vConsole 未点击。

## Invalidated

首次不完整 session 路径没有当前输入资格。旧 gen14 或冻结 gen32 不支持本次输入。请求时长和脚本手势时长不替代实际视频时间证据；裁片只供按钮对照，不替代全图判断。

## Cleanup

本次 recorder/离线解码浏览器与临时 HTTP server 已随原 owner 退出；没有后台 Play、watcher 或输入在途。手机保持普通 gen15 完整 Map，独占归 Root；后续任何输入重新 capture 并实际查看。保留现 feedback/session 与所有私有原件。原生双指时机问题仍待用户回复，未执行或录制双指。未改源码、PLAN、账号/N05/R6、服务、VPN、设备设置或设计资源，未提交/推送/上传。
