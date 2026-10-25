# 普通小程序 API 8806 防火墙准备：独立审阅

2026-10-25。独立于准备者，只读审阅私有 `miniapp-api-firewall-20261025` 中的脚本、快照、手机边界与注入检查，仅新增本记录。未执行 Apply、Restore、UAC、实际防火墙查询/注册、设备、网络、服务、IDE、构建或 Git 操作；`Get-Command New-NetFirewallRule` 只用于检查命令参数定义。

## 结论

**本轮发现的空接口注册参数缺口已修复，当前输入未发现其余 must-fix。Root 可在实际提权成立后进入一次受控 Apply 试验。** 这只说明准备边界和注入检查可进入真实验证，不表示规则已注册、手机 HTTP 已恢复或本次目标完成。实际系统权限仍由 Windows token/UAC 决定。

首轮 `api-firewall.ps1:80` 使用 `@($r.Interfaces).Count` 判断可选接口；两个补集 Block 的 Interfaces 为 null，而 PowerShell 的该表达式计数为1，实际抽取注册函数会显式绑定空 `InterfaceAlias`。原注入器会过滤掉空项，没有识别这个准备/兼容缺口。Root 已将第80–81行改为先过滤 null/空白接口，再选择明确的 `InterfaceType=Any` 或真正的 `InterfaceAlias`；检查器现在要求两个补集 Block 覆盖全部接口、Allow 仅绑定当前实际物理网卡。独审再次执行10项检查通过，并在内存中还原旧分支，确认它会以 `empty_interface_alias_rejected` 失败；没有真实规则变更。

## 审阅范围与结果

- 原规则的唯一字段差异是 LocalPorts 从 `0-8791,8793-65535` 改为 `0-8791,8793-8805,8807-65535`。全部65536端口的注入检查确认只有8806改变，8792旧例外保留；原规则其他字段相同，其他6条 Node 规则按完整已记录字段集合核对。
- 三条新规则均为准确 Node executable、Public、Inbound TCP8806。两个 Block 分别是授权 phone 与绑定 host 的完整 IPv4/IPv6地址补集，另一地址维度为 Any，并覆盖所有接口；Allow 仅为精确 host/phone 对及已记录物理网卡。没有全局放行、关闭防火墙、UDP/Private或VPN/TUN变更。
- `ApplyOwned` 先注册并完整读回 remote/local/allow，再核全部 Node 规则、host/phone边界和原规则，最后才从原 Block 排除8806。部分注册、查询失败或读回不符不能冒成功；NetSecurity PermissionDenied 不会被当作规则缺失。
- Apply 实际执行前复核文件 pin、API listener进程/出生/可执行文件、已记录 launcher祖先/出生/配置、唯一host地址、physical adapter/GUID/Public profile、防火墙策略和本机 ready。`phone-boundary.mjs` 只复用现有 USB 选择、bundle/session/device binding 与一次只读 route，核同一授权手机的源地址；没有屏幕、账户、日志、输入或网络重配置。它不建立手机业务HTTP或运行AppID证据。
- 真实管理员 token 检查在任何规则写入之前。操作锁只串行化本目录操作；一次性 CreateNew attempt 在规则写入前保留，独立 invocation receipt 区分执行结果。已有 attempt、未知结果或部分状态需先读回，不应再次发送 Apply。
- Restore及Apply失败恢复先核原/自有规则完整身份，先恢复原8806阻断，再按精确持久规则ID删除自有规则。原或自有规则漂移时拒绝覆盖，保留边界并报告；不删除未知规则。Restore只要求恢复代码边界 pin，不依赖API、手机或运行配置仍存活，避免会话结束后无法收口。
- 旧 v1/v3 仅经固定SHA与AST抽取指定函数，不执行旧脚本顶层流程。当前10项FilePins全部匹配；没有重放旧8792、ICS或Profiler操作。

## 独立检查

1. `pwsh -NoProfile -File check-preparation.ps1`：10项通过、ParserErrors=0、ActualFirewallPolicyMutations=0、ActualDeviceOperations=0。已先审阅其函数抽取和命令替身，确认不会调用真实注册/删除命令。
2. 内存旧分支反查：新检查器拒绝旧空 InterfaceAlias 分支，零实际系统/设备操作。
3. 独立比较原/预期非端口字段、两个地址补集、精确Allow地址、三规则TCP8806/Public及Restore pin类别，均成立。
4. `node --check phone-boundary.mjs`：exit0；10项当前文件pin逐件匹配。

## 当前审阅输入

| 文件 | SHA-256 |
| --- | --- |
| api-firewall.ps1 | bad6f4d9e6ea61d9c8b08c94a356686901ae3fcb09595bf8fbe47b263e84a020 |
| prepared.private.json | 3541e036ae8f1dd54539bddeba8f052c4ff9765d70d6cb96a8801d3f91a6d88d |
| check-preparation.ps1 | 2c98fa5d665ac253cda05e1027a8a6aba5797f4034f8b148e8f26b05802afbf0 |
| phone-boundary.mjs | f114fc69b405387be2b9e8597cffa3b62daacbb3430bcd304950e3aa4cc7e642 |

执行前仍应核这些具体输入与是否已有 attempt/receipt。实际注册、完整规则读回、相同手机TCP/HTTP、必要恢复及真实业务旅程保持未验；注入通过不能替代它们，也不建立正式身份、部署或完整产品结论。
