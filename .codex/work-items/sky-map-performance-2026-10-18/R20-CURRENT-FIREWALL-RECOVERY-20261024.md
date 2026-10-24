# R20 当前防火墙恢复准备（2026-10-24）

状态：**只读准备已冻结，未取得执行资格；未修复网络或证明性能分析链路可用。**

本次受父任务委派，只沿既有 LAN firewall owner 准备当前 API 与 DevTools 两个 owner 的有限恢复。完整读取了当前 AGENTS、true-debug-lan 方法、旧 owner 三个脚本和父任务的当前私有网络/规则记录；历史脚本只作方法参考，没有重放或覆盖。未更改网络、防火墙、进程、设备、服务、IDE、Git 或既有私有原件；未提权。

## 当前证据与缺口

- 父任务已实测：现有手机热点、PC 保存的 WLAN profile、VPN 在线；本机 API readiness 成功。手机到 PC 可达性与 HTTP 边界失败、Public Node Block 覆盖当前端口见父任务私有记录。本准备没有将本机 readiness 当成手机访问成功。
- 准备时只读核对了当前 API listener 的 PID、UTC 创建时间及程序，并绑定其原 launcher receipt。所有这些都必须在资格化及任何未来写入前重新核对。
- 现有 netsh 快照有同名不同程序/协议/配置的规则；必须用程序与实际唯一 rule Name 绑定，不能按 DisplayName 批量改动。快照不含完整 provider Name 与全部 filter，因此仍缺真实提升读取的 ActiveStore/PersistentStore 精确状态。
- DevTools 当前实际 LAN transport ports/PID/receipt 尚未提供，不能借历史端口、旧手机规则或普通预览端口代替。固定 spec 保持 DevTools qualified=false。

## 已交付的私有准备

位置：既有 private owner 的 device-resume/network-topology-recovery-20261024/firewall-recovery-20261024-v1/；当前地址、WLAN profile、GUID、PID 等仅保留在那里。

- spec.private.json：固定双 owner，当前 API 8806 与待实读的 DevTools LAN；绑定当前 origin、connection、API receipt、netsh snapshot 的 SHA256。
- prepare-plan.ps1：只读资格化/DryRun，默认验证固定 spec；无 Apply、Restore、提权或任意命令入口。缺实际 LAN 资格时，在 Admin/防火墙访问和 proposal 写入前拒绝。完整资格化还要求真实 Admin token、当前 WLAN/profile/host/gateway/VPN、程序/PID/UTC 身份、actual listener、唯一来源规则、全部七类 filters、两 store 一致及额外 Block 排查。
- scope-math.ps1：只做有限 IPv4/端口区间计算。
- Test-Preparation.ps1 与 preparation-checks.private.json：26 项检查通过，范围是纯区间行为、PowerShell 解析和缺实端口的首次写入前拒绝；没有模拟一套防火墙平台。
- APPLY-RESTORE-CONTRACT.private.md：未来有限 dispatcher 的精确更改、单次 receipt/不可变 backup、先记录 intent 后调用、完整读回、部分失败条件回滚、仍属本 owner expected-state 才恢复、外部冲突保留及重复执行规则。**目前是契约，尚未实现或测试 Apply/Restore。**
- manifest.private.json：准备包冻结清单；SHA256 为 20C5972262295DB594C2C20E9A54A904B51970ABB467958B82DD8B176ED3B3AF。

## 收敛的更改边界与交付条件

沿旧 owner 方法，Node 原 Block 只减当前 8806，保留旧 8792 hole；新增 current-host/peer 的 other-local/other-remote（含 IPv6）Blocks 与精确 WLAN Allow。DevTools 原 Block 只减新 peer IPv4，保留旧 excluded peer、其它范围及完整 IPv6；新增新 peer 的其它端口/其它 local Blocks 与精确 host/peer/实际端口/WLAN Allow。UDP、其它 profile、旧规则及其它 filter 不变。任何可能覆盖目标的额外有效 Block、GPO、未知 keyword/filter/范围均先拒绝，不修改 foreign 规则。

因缺实际 LAN 端口与完整提升规则状态，本轮采用父任务允许的先交可填 spec 与关闭条件分支，避免把未知目标包装成可派发的管理员入口。下一步由父任务补实读 LAN receipt 和全部精确规则状态，执行新的独立审查，再实现并审查有限 Apply/Restore dispatcher。之后才可做单次备份/派发、真实手机 HTTP 和 true-debug LAN TCP 流量验证，以及性能采集验收。

本轮无 qualified plan、无 pre-change firewall backup、无执行 receipt、无 live restore 验证；这些义务全部保留。PLAN、HANDOFF、Context 和旧脚本没有修改。
