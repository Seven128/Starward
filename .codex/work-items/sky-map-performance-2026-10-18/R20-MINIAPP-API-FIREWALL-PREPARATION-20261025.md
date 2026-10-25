# 普通小程序 API 8806：防火墙窄修准备

2026-10-25。仅准备当前普通业务 API 的可审阅 Apply/Restore；没有实施防火墙修改、UAC、设备、IDE、构建、Git、共享服务或 VPN/TUN 操作。Root 的手机 TCP 超时与本机 `/health/ready` 成功是本项输入，不在本记录中冒充修复后结果。

## 准备结果

私有 owner：`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/network-topology-recovery-20261024/miniapp-api-firewall-20261025/`。

- `api-firewall.ps1`：默认 `-Mode Read`；有真实管理员 token 的 PowerShell 7 才可执行 `-Mode Apply` 或 `-Mode Restore`。
- `prepared.private.json`：动态 selected-origin、API launcher/真实 listener 出生身份、网卡、现有全部7条 Node 规则、预期新规则与源码/配置 pin。它是预期转移，不是执行回执。
- `phone-boundary.mjs`：仅 Apply 时复用既有 USB selector、session bundle/device binding 和只读手机 route，核当前授权目标与精确源地址。准备阶段未调用，不读取屏幕、账户或日志。
- `check-preparation.ps1`、`checks.private.json`、`read-only-preparation.private.json`：注入检查和真实只读状态。

复用既有 v1 Snapshot/Equivalent 与 v3 AddressKey/Complement 的同 SHA 源函数，只提取函数，不运行旧脚本。旧临时 v1 路径不存在，仓库原件仍与既有固定 SHA 一致；没有重放旧8792、ICS或Profiler入口。

## 变更和恢复边界

只处理 Public TCP、8806、当前实际 Node executable，以及当前绑定 host/授权 phone/物理网卡。先注册并完整读回两个地址补集 Block 和一个精确 Allow，再将原 Public Node TCP Block 的端口从 `0-8791,8793-65535` 改为 `0-8791,8793-8805,8807-65535`。旧8792例外、其它端口、UDP、Private规则及VPN保持。

Apply 要重新核文件 pin、真实 API 子进程及其已记录 launcher 祖先、出生时间、listener、地址/网卡/Public profile、防火墙策略、本机 ready 和同 USB 目标源地址。现用 api-owner 记录的是 launcher，实际 listener 是 tsx 后代，二者分别绑定，不能把 launcher PID 冒充监听 PID。失败的 NetSecurity 查询保持失败，不把 permission denied 当规则不存在。

Apply 在写前保留一次性 attempt，执行结果写独立 receipt；未知结果不得重发。失败恢复先收回原8806端口，再删除完整身份一致的自有规则。原规则或自有规则出现外部漂移时保留边界并报告，不能覆盖并行改动。Restore 不依赖仍存活的 API、设备或运行配置，只要求恢复代码边界 pin 和精确规则身份，避免会话结束后无法收口。

## 已完成检查与未验

- PowerShell AST 解析及 Node `--check` 通过。
- 10项注入检查通过：注册顺序、完整恢复、部分注册失败恢复、原/自有/非目标规则漂移拒绝、失败查询不冒空集、恢复代码 pin；遍历全部65536端口确认只有8806差异且8792保留，并核IPv4/IPv6补集。
- 真实 COM 只读确认完整7条 Node 规则仍与准备快照一致；实际系统写入0、实际设备操作0。
- 当前非提升 shell 的 NetSecurity 读取实际返回 `PermissionDenied / Windows System Error 5`。默认 Read 因此明确失败；真实管理员注册、读回与手机 HTTP 均未验，不能称防火墙或 API 已恢复。

交 Root 独审后，只需一次 scoped PowerShell 7 UAC 管理员同意即可执行已授权 Apply；不需要关VPN/防火墙或重启Codex。随后必须读具体 attempt/receipt、实际规则和同目标手机 HTTP，再决定业务验证或精确 Restore。脚本、快照和检查尚未上传，不新增通用网络平台。
