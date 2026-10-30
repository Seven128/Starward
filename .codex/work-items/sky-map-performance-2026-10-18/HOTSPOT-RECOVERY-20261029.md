# 本机热点与 Meta 共享恢复证据

用户明确要求 LAN 真机调试，授权 Root 操作开发者工具桌面及本次热点/Meta 共享，并已允许管理员确认。用户曾自行开启热点并让手机连接，随后因手机不能上网、电脑也断网而关闭。2026-10-29 用户要求给出最小手动操作清单；这不是暂停完整 Goal。唯一 PLAN 未修改。

## 当前已恢复：2026-10-29

用户手动设置 Meta/Mihomo →“本地连接* 10”后，提升只读确认 public0/private1 的实际 ICS pair；当前热点 On、唯一客户端与无线 ADB 手机 wlan0 匹配。此前两个自动恢复操作保持终态，不重放。手机绑定 Wi-Fi 源地址访问 API8787 得到 HTTP200/ready=true，ChatGPT HTTPS 得到403（证明传输响应，非业务成功；qq测试工具失败，不声称所有网站均可用）。VPN/TUN、路由、节点、DNS和热点凭据未改。

当前私有根为 `E:/Dev/Starward-data/development/phone-hotspot-20261029`。原 WLAN API18536/collector16772 已退出；沿原 backend-data start owner 恢复 API，launcher29692/listener33952，绑定当前热点地址8787，祖先链及主机/手机ready均确认。`runtime-hotspot.private.json` 只替换原私有配置的 host，原任务库、606条地形/r6根与hash保持；未恢复数据库、迁移或启提醒worker。8798不再为本次普通候选启动。

两条新规则 `Starward-Goal-20261029-Hotspot-API[-BlockOtherSources]` 经 gsudo 成功安装及读回，只限热点地址/interface5、Node、TCP8787、唯一当前手机；其它源阻止、原WLAN规则和默认策略保留。`firewall-receipt.json` 已终态，禁止盲重放安装脚本。

源码完整构建并密封为普通候选 `349166eb15f093e2ab8eda396a7506123eab00ec627c27dde92322916d9dc371`；337文件/5,134,487B，源码前后指纹一致，旧普通aed9/旧plain/D2 f40均保留。正式 main 仍超2MiB 73,473B，未改门槛。反馈 run=`starward-device-feedback-knPMgs`，generation=`generation-000001-FYpGYy/project`，session=`starward-device-test-VwHYLf`；官方auto_preview成功一次，bind已成功。

旧s4关闭前已核新完整源码同步；当前仅s5及其独立“真机调试”窗口。QR最初选择TUN地址，已在官方界面切到热点并读回；编译等待经一次取消确认终态后，对相同候选调用一次remote(auto)。该调用虽timeout，实际手机已连接：当前手机→当前热点 TCP8001 established 且属于DevTools PID3000；Android14/N2401、AppID与prepared窄比对一致、env=develop，官方SDK3.17.5，窗口基础库标签3.17.6[1663]分别记录，连接显示Wi-Fi/服务器正常/非零流量。保持此会话，不因命令超时重推或重连。已通过正常入口进入非空Sky，8404真实亮星、45°视场、过去时刻21:00；后续Play/Pause/普通退出Memory已采集并导出，当前回Map，无采集在途；结果沿SKY-D2-CAUSAL当前节。图像、私有端点与进程身份仅保存在该私有根，工具成功不代表完整Goal验收。

## 前序失败及恢复记录

- 当前物理 WLAN 为 index17、Mihomo/Meta Tunnel 为 index29；当前热点下行为 Microsoft Wi-Fi Direct Virtual Adapter #2、index5、名称“本地连接* 10”。GUID 与本机私有原快照一致，不沿用旧电脑地址。
- 原只读 gsudo exec90681、用户开启热点后的 exec76991 均已成功；前者 5 个、后者 6 个连接均无已启用 ICS。旧 exec47302 取消和非管理员 E_ACCESSDENIED 不能继续当作当前快照缺失。
- 原生 WinRT 能力查询对 Mihomo 返回 Enabled/Off。受保护的“从 Mihomo profile 启动”调用返回 Success/On，但 COM 仍无共享 pair；主机 qq HTTPS 得到响应，ChatGPT HTTPS 超时。脚本已 Stop 成功并读回 Off、无共享、两个主机 HTTPS 均重新得到响应。403/501 只证明传输响应，不冒网站业务成功。
- 第二次有界尝试在启动后明确调用 ICS public0(Mihomo) → private1(当前热点)。启用 public 即返回 COM 0x80040201，未进入 private 成功阶段；脚本再次关闭热点、恢复无共享、确认主机 HTTPS 恢复。exec89696 已 exit1，无在途 UAC/网络操作，不重放这两个已终态操作。
- 网络连接 → Mihomo 属性窗口已打开。@oai/sky 的新鲜观察可见对话框，但两次输入均被工具拒绝：实际点位属 dllhost.exe，而可选窗口仅 explorer.exe。按文档刷新/激活后仍失败；备用原生窗口 inventory 同样没有可选择的属性窗口。没有通过脚本模拟 UI 或猜造句柄绕过这一工具边界。
- VPN/TUN、节点、路由、DNS和热点凭据未修改。原 API8787/PID18536、D2薄HTTP8798/PID16772及原物理WLAN的四条规则保留；手机网络切换后的可达性、调试LAN和业务API须重新实读，旧 WAN 回退不冒 LAN。无新的 Performance/Memory/Play 采集。

## 本机证据与恢复边界

私有根：`E:/Dev/Starward-data/development/phone-map-current-20261028/notice-reentry`。

- `ics-before-authoritative.private.json`、`ics-user-hotspot-before.private.json`：实际提升读取的原始 ICS 状态。
- `hotspot-winrt-capability.private.json`：只读能力和 adapter 绑定。
- `hotspot-mihomo-operation.private.json`、`hotspot-explicit-sharing-operation.private.json`：两次均 RECOVERED_OFF；`hotspot-explicit-sharing-apply.private.json` 保存失败边界。
- `start-hotspot-mihomo-guarded.ps1`、`set-hotspot-ics-pair.ps1`：精确身份、原快照、一次性回执、子进程限时和自动关闭/恢复保护。回执已存在，禁止不读结果直接重放；不作为新的通用网络框架。

用户手动操作目标：先关闭当前旧属性窗口，开启电脑移动热点，再从网络连接重新进入 Mihomo/Meta Tunnel 的属性→共享，勾允许其它网络用户连接，家庭网络下行选“本地连接* 10”，保存后让手机重连电脑热点。不能误选物理 WLAN/Hyper-V/WSL 作下行。若保存失败或电脑仍不能上网，先关闭热点恢复沟通；Root 再只读核验实际共享与作用，不盲目开启或重试原生接口。之后才核手机 Wi-Fi 公网、正确 DevTools LAN 地址/端口/对端与候选业务来源。
