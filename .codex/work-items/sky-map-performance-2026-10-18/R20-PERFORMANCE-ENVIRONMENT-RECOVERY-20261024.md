# 本机性能分析环境恢复记录（现已后置）

**2026-10-25后续状态：用户已明确把层叠性能、云观星播放性能（含相关内存/OOM）后置。以下环境/失败均保留为采集时记录，不是当前第一步。** Root随后从自有手机浮层正常结束这次WAN调试，以原ef6同generation普通auto_preview重新打开（新单次官方success、源不变），完成只读Picker打开/Back取消/回Map开发反馈。核微信15源pin/canonical ef6不变后，官方关闭自有RTtHkV源码及关联debug窗口，实际只余项目列表。全部临时原件保留；未全局quit/kill、未动VPN/防火墙。PC热点/profile/API owner仍保留供后续正常功能依赖，当前不需用户UAC/重启。具体新状态以HANDOFF与R19-PICKER-READONLY-20261025为准。

用户先要求记录进度，再明确授权root操作电脑与USB手机搞通既有方案，必要人类动作后置。主用仍为“真机调试开发者工具”的Performance/Memory；历史手机LAN/重场景/完整可解析Heap的资格不改，但当前环境必须实证恢复。完整Goal、UI→叠层→Sky顺序、gen34冻结、OOM未解决和全部未完义务保留，不以环境准备关闭产品验收。

## 当前确认与仍欠

- USB唯一授权目标、盐化硬件绑定与实际Map截图可用。当前普通候选 **HGyEOG/gen1 AKYc0l**，源码完整339件/5,037,760B、SHA **ef6eeee2bb44ef2af5c3ddde69961faa2650a7ce9c27ff6392a6ff39fd9c3cd1**；官方auto_preview终态success，shared/private大包开关均false，实际MM Map后绑定嵌套 **G2HMxB**。15:06:28.093Z新session捕获并实看Map，SHA396f48d6…；这仅为development_feedback。
- 已开启手机原有Wi-Fi热点，PC连接原已保存profile。手机源地址/网关及neighbor **REACHABLE**，新拓扑消除了原酒店路径No route/FAILED边界。VPN/TUN保持原配置且Up，DNS/HTTPS可达。
- API新host8806沿同一任务隔离DB/secret/启动参数重启，本机ready200；**手机HTTP仍未通过**。当前Public Node明确Block覆盖8806；旧8792 Allow的host/peer不匹配，不能借旧孔。
- 当前**手机LAN仍未通过**，但超时的remote后来已实际启动：手机Map与独立真机调试窗、双向非零消息（收到1238/发出666、待发/未确认0）、Memory活动VM均实读。15:34Z手机明确提示选择VPN虚拟地址的LAN失败、已回退WAN；按fresh截图关闭提示后，15:37Z实际Map SHA4e0c66be…保留。实际8001/8002无listener，21216/11535为内部debug服务，不冒LAN端口。当前仅恢复WAN运行时附着，未操作/导出新Performance或Heap。

## 网络操作的归属

两条新设备scope均独审：[更多共享](R20-TETHERING-SETTINGS-SCOPE-20261024.md)/[审查](R20-TETHERING-SETTINGS-SCOPE-REVIEW-20261024.md)，[专用Wi-Fi页](R20-WIFI-TETHER-PAGE-20261024.md)/[审查](R20-WIFI-TETHER-PAGE-REVIEW-20261024.md)。沿原设备身份、实际系统组件/BASE窗口、前台、未锁与60s单次截图/输入守卫操作；没有raw ADB输入旁路。

Root实看系统More与Wi-Fi热点页，只启用手机已有热点开关。未改SSID/PSK/安全性/AP频段/USB或蓝牙共享；截图可能含原凭据，仅private保存，不转录、不上传。PC使用同名已保存的WPA3-Personal profile，未提取或重写密钥；仅将该profile成本Unrestricted→Fixed，原值和条件恢复归phone-hotspot-metered-owner.private.json。连接由已有配置完成，失败恢复边界和原WLAN归phone-profile-connect-owner.private.json。热点实际显示2个客户端，不处理另一客户端；后续规则仍限本手机peer。

当前API私有owner在network-topology-recovery-20261024/current-phone-api-hotspot-20261024T142546688Z/。旧API先按PID/exe/UTC/config精确停止；新API仅改MINIAPP_API_HOST，其它DB/cacheprefix/secret/flags不变。一次shell误用LASTEXITCODE把已完成stop判为失败，未重复stop；确认旧已停后才继续已准备的新启动。原PG55441/旧8791和共享服务未动。

Windows原热点/ICS没有启动或变更；原“Meta共享的”标记仍只是局部事实，private pair未完整读回。没有停止或重配VPN/TUN，没有新proxy、bridge、adb reverse或防火墙变更。

## IDE与自动化恢复

官方0.3.14和明确skill-version门禁equal/loginExpired=false/cliTokenRequired=false已核，CLI与MCP授权分开。先前漏版本的skip_check不算准入，未查找MCP token。

已完成最新源码普通fullbuild并保全手机不可变副本，才官方关闭旧pJQ08K窗口，打开独立当前 **RTtHkV/gen1 5jgvk5** fullMode窗口；保持一个源码项目窗口。IDE补入pages/my/index.wxss 25B，真实340件/5,037,785B、SHA **a2012e729ccf5e1b8b0440f06ed0c46877f06c3dea824118055dbb6aa63b14e3**，与原ef6候选分开记。未删除SDK文件维持旧指纹、未反写仓库源码；HGyEOG字节未动。官方独立模拟器截图484×1047完整Map/8聚合已实看，属于桌面。

新项目官方currentPage与remote各首次调用均timeout waiting for automator response；实读未产生新LAN listener/独立调试窗，没有盲重发。按既有startup-recovery做一次同路径官方CLI auto启动，实际autoPort只监听loopback、程序匹配本版IDE。官方页面调用仍超时；随后已安装公开miniprogram-automator.connect/currentPage成功读回pages/map/index并仅disconnect，不关IDE。由此定位为官方封装自动化入口失败，不能宣称产品未启动。

基于已资格化公开SDK新派发remote(true)，实际UI先明确main2062KB>2048KB；只改该IDE副本private的bigPackageSizeSupport=true，保shared/普通手机候选不变。后续RPC仍timeout且原回执保持unknown/error，**后来实际手机/WAN调试窗证实服务端已启动**；另写hotspot-remote-server-outcome-resolution.private.json关联，不手改原RPC或自动重放。当前保留一个liteMode源码窗与一个必要独立debug窗。普通执行条件与这次true-debug分开，不用旧普通绑定冒源字节独立验证。

## 系统权限与电脑图形接口

实际shell仍非提升。旧一次RunAs只读ICS helper被Windows取消，未启动、未提升，没有inspection回执；未反复发UAC。现有Codex管理员快捷方式为VBS RunAs，未找到无UAC合法路径；“测试API管理员”快捷方式未启动。完整任务授权不代表OS令牌。

只读WTS核对Windows10.0.19045当前会话/console、connection state与flags=1，locked=false，未将故障归为锁屏。Computer Use对设置、网络连接和旧新IDE均有FrameArrived/capture timeout；元素点击无geometry；普通F6/Tab未取得可观察焦点变化。一次支持的窗口恢复、激活、非continuous显示活动请求、两个JS会话重建仍失败，停止同条件循环。UIA可读不代表原生输入成功；没有假坐标、私有GUI协议、PowerShell UI Automation、安全设置或凭据旁路。

WinRT只读仅找到connected WLAN，VPN无ConnectionProfile，不以WLAN profile冒VPN共享出口。未执行Start/Stop/Configure Tethering或放宽脚本策略。手机既有stay-on=15、screen timeout1800000、keyguard三false只读保留，未改电源/锁屏。

## 2026-10-25 电脑输入边界的有限判别

当前真实手机debug窗口可读Memory面板/活动VM，但普通Tab后焦点仍外层popup document；按[Chrome官方快捷键](https://developer.chrome.com/docs/devtools/shortcuts/)做一次无采集副作用的前一面板导航后，实际仍Memory。未证明输入成功，未开始/导出profile或重复多种键组合。三类窗口与这个新debug窗的capture失败事实仍在，停止同条件UI循环。

[SendInput受完整性级别约束](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput)是一项可判别解释，不直接当根因。只用PROCESS_QUERY_LIMITED_INFORMATION/TOKEN_QUERY实读：工具shell和DevTools browser/CLI主进程均RID8192（Medium）、Elevated=false、UIAccess=false、ElevationType=limited、Session2；未实读Sky内部helper，不宣称排除所有权限问题。原生token/安全设置没有变化，也不能把管理员重启冒capture修复保证。

另按[OpenInputDesktop](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-openinputdesktop)/[GetUserObjectInformation](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getuserobjectinformationw)只读当前线程与输入desktop：均Default，threadDesktopReceivesInput=true、error0。未切desktop、写安全状态或尝试通过锁屏/UAC；这个结果只限定当前tool shell，不能替代实际图形接口结果。private原件host-process-integrity-readback-20261025.private.json、input-desktop-readback-20261025.private.json保留。

当前仍需管理员系统入口以完成有限firewall资格/修复；电脑图形操作接口本身另待恢复复核。现场可用性已异步询问，未收到答复，不因elapsed time重发RunAs或把原任务完整授权当OS令牌。此后用户已后置两类性能，WAN会话已正常结束；当前继续独立功能/正确性责任，不扩profiler选择或重建冻结代。
## 有限防火墙准备与下一边界

原生netsh只读已确认Public/Private ON且BlockInbound/AllowOutbound，38个相关规则块private保全。PowerShell读取权限失败不外推所有只读入口不可用。当前API Public Block的范围覆盖8806；旧API/DevTools例外均带旧scope，未重放。

[双owner恢复准备](R20-CURRENT-FIREWALL-RECOVERY-20261024.md)已冻结：固定spec、只读DryRun、26项纯区间/解析/缺端口拒绝通过。**DevTools真实LAN ports/PID及提升读取的完整唯一rule Name/filters仍缺，尚无Apply/Restore可执行入口或合格plan**；不是已备好可运行的修复。补齐实际端口/规则再新独审、实现有限派发及条件恢复；不得关防火墙、整体移除Block、信任所有网卡或放开其它热点客户端。

通路通过标准仍为当前手机→业务API实际响应，以及实际DevTools外部端口的手机peer持续TCP、有效消息/运行画面；随后按原问题取得必要性能资料。电脑capture/input和UAC若仍无法由工具完成，只保留最小系统动作；独立源码工作继续，不重建gen34或重选性能方案。

## 本机原件与清理

原件仅在既有private device-resume/network-topology-recovery-20261024/，包括WTS/显示/readonly profiles、旧UAC/ICS、两网络恢复owner、当前API owner、规则快照、源候选/截图和SDK回执；未上传。旧EFK/gEFX已失去当前输入资格，保留原件待精确退休；当前仍需的手机热点/profile、API、IDE窗口/调试服务及条件恢复责任由HANDOFF交接。运行中所需资源不盲清，临时物件仅按实际owner结束。