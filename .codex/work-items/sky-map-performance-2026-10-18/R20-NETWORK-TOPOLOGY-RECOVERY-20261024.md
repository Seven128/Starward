# R20 当前网络拓扑恢复准备

2026-10-24，主机只读诊断；没有执行网络状态变化。手机、ADB、IDE、构建、推送及 PG/API 均由当前 root 独占，本次未操作。

Root后续仅尝试一次RunAs/Hidden运行本文只读helper（06:49:05.182Z）；Windows最终返回“操作已被用户取消”，helper未启动、无新inspection回执，未取得管理员token或更改网络。不推断取消是人为还是系统超时，不自动重发。终态归private `root-uac-read-attempt.private.json`。用户可用时仍只先需处理这一次系统提升确认；下文“尚未尝试提权”仅描述本作者先前准备阶段。

## 首个失败边界

Root 已取得手机到当前业务 API 的 `No route to host`、手机邻居 `FAILED` 和主机邻居 `Stale`。这首先指向当前设备互通/邻居解析边界；没有证据把它认定为 Windows 防火墙导致。访客网络设备隔离仍只是候选。此时扩大入站规则不能建立邻居路径。

本次独立主机读回确认，当前并未复用前次可用的 PC 热点拓扑：

- 物理 Wi-Fi 上行和现有 VPN/TUN 均为 Up；没有停用或修改。
- 两个 Wi-Fi Direct 适配器均为 Disconnected，仅有自动私网地址，没有当前可用的热点下行。
- 系统 WinRT 返回 `TetheringCapability=Enabled`、`TetheringOperationalState=Off`、`ClientCount=0`。现有热点 SSID 配置存在；只保存摘要，没有读取或输出密码，也没有改动 SSID。
- 前次共享的 VPN/TUN 与热点下行 GUID 都仍唯一存在；前者 Up，后者 Disconnected。硬件/适配器身份尚可复用，历史地址和共享有效性不能直接继承。

## 当前权限与既有 owner

实际 shell token 为非提升。当前 `HNetCfg.HNetShare` 的只读枚举返回 `0x80070005 / E_ACCESSDENIED`；因此当前 ICS pair **未知**，不是“没有共享”，也不是已确认沿用前次 pair。Windows 移动热点与传统 ICS API 的视图也不能相互替代。

已按既有 owner 核对以下私有材料，没有覆盖它们：

- `lan-debug-20261023/ics-scoped-backup.private.json`：前次调整前的原 pair，双方原状态均未开启传统 ICS。
- `ics-apply.private.json`：前次实际提升后的自动 Apply 失败 `0x80040201`，即时 rollback 成功；不能重放该失败调用或把它当作成功恢复入口。
- `ics-state-after-ui.private.json`：随后由用户在系统“网络连接 → 实际 VPN 网卡属性 → 共享”操作，才读回 VPN public/type0、热点 private/type1，WLAN 未共享。前次有手机绑定热点源地址的公网和域名成功证据。
- 旧 `set-hotspot-sharing.ps1` 有一次性 receipt、精确旧身份与旧地址守卫。Apply 已有终态；Restore 只负责前次拥有的 pair，不能直接用来恢复今天热点或清除未知当前共享。
- 旧防火墙 owner 与原备份保留。本次未读出当前防火墙配置、没有新增规则、没有执行旧恢复脚本。

## 可复用准备与最小后续动作

私有准备目录：`C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/network-topology-recovery-20261024/`。

当前回执包括 `host-topology.private.json`、`existing-pair-identity.private.json`、`ics-current.private.json` 及 `hotspot-state-connected-profile.private.json`。精确网卡、地址和 SSID 摘要仅留在该目录。

已准备 **只读** `read-existing-hotspot-owner.ps1`，未执行。它核真实提升 token，使用新的唯一 receipt，不覆盖旧备份；读取现有热点状态和当前 ICS 配置，不启动热点或修改共享。只做了解析检查。没有生成或执行新的写操作恢复脚本：当前 pair 读权限未取得，而已知原生共享 Apply 曾实际失败，尚无已验证能保全当前共享用途的自动复合恢复入口。

供 root 在合适时机使用的依赖顺序：

1. 若需要 ICS 当前事实，先通过获准的 Windows 提升入口运行上述只读 helper。尚未尝试提权；不能宣称启动辅助进程就得到管理员 token。若系统要求 UAC，而工具不能供给该安全桌面交互，届时唯一先需用户处理的是批准这一次明确的 UAC，不是重跑开发环境。
2. 在当前 pair 已知且保全后，恢复用户**现有**移动热点；不重设 SSID/密码，不停 VPN/TUN。热点开关存在受支持的 Windows WinRT 入口，但本次只验证了读取，未将其写操作及共享副作用视为已验证。普通热点开关本身是否需要人工交互尚未建立。
3. 若恢复后仍需重建前次 VPN→当前热点共享，使用已有系统共享面板路径；遇到相同 `0x80040201` 不重试 COM、不注册 DLL、不放宽执行策略、不重启网络服务。具体只需把现有 VPN 网卡共享到实际热点下行，保留原 pair 与回滚责任。
4. 手机重连、实际手机到新下行的连通性和 API 地址/监听绑定由 root 接续核对；本次不重复手机探测。当前 API 绑定的是物理上行，恢复热点后不能仅凭主机本地 health 宣称手机业务请求已可用。拓扑恢复后才判断是否存在精确端口/防火墙义务。

这些是依赖与必要交互边界，不替代总 HANDOFF 的唯一下一步，也不改变 Goal 的未完成义务。当前尚无新的人类动作已被证明必须立即发生；可以继续独立源码工作并把 UAC/系统面板留到确需恢复网络时。

## 工具边界与验证

PowerShell 7.6.5 / .NET 10 直接解析 WinRT 类型失败。本次仅为 Windows 自带 WinRT 查询使用系统 Windows PowerShell 5.1 / .NET Framework；未安装依赖。首次查询发现 `GetConnectionProfiles()` 包含多个保存的断开 Wi-Fi profile，故改为唯一当前连接 Wi-Fi profile 后得到上述状态，不能把 profile 列表数量当作活动连接数量。

微软说明 .NET 5 以后不再直接消费 WinMD；本次窄范围使用 .NET Framework 与该平台边界一致。[.NET WinRT compatibility](https://learn.microsoft.com/en-us/dotnet/core/compatibility/interop/5.0/built-in-support-for-winrt-removed)。热点读取/启动是不同调用，后者有自己的异步结果和能力要求，不能从读取成功推断恢复成功。[Tethering manager](https://learn.microsoft.com/en-us/uwp/api/windows.networking.networkoperators.networkoperatortetheringmanager.createfromconnectionprofile?view=winrt-26100)、[StartTetheringAsync](https://learn.microsoft.com/en-us/uwp/api/windows.networking.networkoperators.networkoperatortetheringmanager.starttetheringasync?view=winrt-26100)。共享事实沿 Windows 原生接口和现有项目 owner 读取。[INetSharingManager](https://learn.microsoft.com/en-us/windows/win32/api/netcon/nn-netcon-inetsharingmanager)。

复用控制源：[开发 skill](../../skills/starward-miniapp-development/SKILL.md)、[VPN/TUN LAN 指引](../../skills/starward-miniapp-development/references/true-debug-lan.md)、[既有 LAN owner](LAN-DEBUG-RESUME-20261023.md)。三条本地链接已按实际目录解析存在；此处 `../../skills` 正确，`../../../skills` 不存在。私有 helper 已通过 PowerShell 7 和系统 PowerShell 5.1 的解析检查，均零语法错误，未执行 helper。本次没有取得新的手机连通、业务成功、热点恢复或防火墙通过证据。
