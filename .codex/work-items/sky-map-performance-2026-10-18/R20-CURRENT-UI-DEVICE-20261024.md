# 当前普通 UI 构建与 USB 推送（2026-10-24）

本轮沿用户最新“USB 连接、自动推送、人类介入后置”的明确指令准备 `development_feedback`。完整 Goal 未完成，实际当前行动由 HANDOFF 拥有。

## Candidate identity

- canonical 当前源码完整普通 WEAPP 构建：**339 件／5,025,700 B／`e9e540552df10842784eb21bb44e924b989a48f2894321b50af5dc1dd0153de6`**。build-time origin 已验证是完整的当前手机侧物理 LAN API8806；没有 loopback、fixture-mode 或新诊断注入。
- 改动前 canonical 普通包339件／5,017,634B／`bee4293e758aca95534d69e4c754f5019ce334ec5bde8d10a194010b48e90af5` 已在 private owner 完整复制并逐文件指纹比对后才清理生成根重编。原 gen18、gen34、其他冻结代、Harness 和原件未被重建/refresh。
- 新 feedback：`%TEMP%/starward-device-feedback-V87XzN`，generation1，prepared project 位于 `generation-000001-XncFQK/project`。此包保留，不原位重写成新候选。

## Invocation result

- 官方 Skill 0.3.14、当前 CLI 登录/版本入口沿已核 session 复用。通过现有 `device-feedback start --delivery auto` 发起一次官方 `auto_preview`，不是二维码或 true-debug 冒充推送。
- 原诊断 stdout 是完整结构化 `ok:false`、tool=`auto_preview`、code=`10`，明确 **main package source size 2051KB exceed max limit 2048KB**。因此本次未送达，不绑定，不把一次命令 exit0 的外层 wrapper 当成业务成功。
- 外层规范化 receipt 仍保 `error/status:unknown/taskId:null`；原 stdout/base64/process metadata 完整保留。root 只从该原件读回具体官方拒包结果，没有伪造 success、重复调用或猜测一个不存在的 taskId。它不是超时后不明送达，也不能直接重发同一超限包。
- 本地构建 exit0，webpack 10项 warning（含已有 CSS order／asset recommendation）；不以 webpack 建议阈值替代微信官方包限制。相对旧339件普通输出，仅5个JS变更：main common +1180B、Map +164B、Sky detail +6105B等。本地文件和官方编译计量口径不同。

## Observed product behavior

本代尚无手机画面或输入，不能作正常 My／Picker／叠层／Sky 结果。root 已实际查看并读取当前采用 My 原图及局部适配源，未重选或重画。

## Verified

- 唯一 USB transport 的 bounded shell 已执行成功；当时 Awake、interactive=true、keyguardShowing=false。USB 就绪不证明候选送达或当前账号关联。
- 原库保22、任务副本26且原业务指纹不变；新 API8806 的 host/listener/进程归属和 ready=true 已成立，见 [副本 owner](R20-CURRENT-PHONE-API-20261024.md)。无 worker/reminder/admin 能力扩张。
- 选定 host 接口与手机当前 WLAN 范围匹配，接口 Up、对应路由 Alive。没有更改 VPN/TUN、路由、网络类别或防火墙。

## Unverified

- ADB shell 对新 host/8806 的只读 HTTP probe 返回 `nc: connect: No route to host`。已保留实际错误并停止重复探测；这不等于实际 WeChat 请求失败或已经证明防火墙原因。当前 shell token 未提升，防火墙读取为权限不可用；尚未申请 UAC 或改规则。
- 当前自动推送收件账号/手机关联、WeChat API 可达性与原 session/账户，均需一个准入成功的新候选实际确认。真实 QWeather／WeChat凭据仍缺；媒体关闭，正常 My、合法只读 Picker、真实 H4 等保其各自条件。
- 官方主包超限是已确认交付失败，按原 R6/包体 owner 修复后才新建当前候选。不能用桌面、本地字节、开发大包开关或旧成功认定本包已准入。

## Invalidated

旧 gen18 的截图/输入资格不能用于此新代；本代未 bind、没有可用的新 device session。冻结 gen34 的代码/字节和旧失败继续保留。

## Cleanup

普通构建已结束，官方进程已终止；新失败 feedback 和诊断保留，不移除原窗口或旧未知 handle。必要 API8806／PG55441 保留运行，其 stop owner 分别归当前副本与前置数据 lane。private 原件位于 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/root-usb-20261024/`；没有数据上传、账号/草稿清理或 R6 重发。
