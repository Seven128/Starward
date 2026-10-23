# 热点 LAN 真机调试接手

用户于 2026-10-23 暂停完整 Goal，明确要求先跑通热点局域网真机调试，必要人类动作使用最小清单。已通过 read_thread 完整读回关联聊天 `01a167bd-bac7-7861-9781-542125a3c681` 的用户消息及结论。VPN/TUN 保持；用户在关联聊天提出的必要时离线手动对照仅为后备，当前没有执行。

## 当前范围与保护

- 本聊天原 Goal 已通过 update_goal 实际 paused，当前get_goal仍确认paused。两个 H7/R28 子代理已 interrupted；本聊天不继续产品修复、R27 同问采集或 R28 激活。LAN任务开始时PLAN SHA为 `d236f3b5745d6ea9493848a14ec74a295bca86c676af720b301b081cb6babd60`；19时后的只读核对发现共享HANDOFF已由另一聊天更新为源码实施、设备后置，PLAN现为 `c953cdb6ecd64107e2b1b541ff50d8f57607127ce7ebad8ae09ec2736e98f05f`。本LAN任务没有编辑PLAN或覆盖另一聊天的总HANDOFF，当前网络进度仅更新本文。
- 复用普通 gen18，prepared 位于原 feedback 的 `generation-000018-4Kvksw/project`；重新指纹为 `bee4293e758aca95534d69e4c754f5019ce334ec5bde8d10a194010b48e90af5`、339 件、5,017,634 B。未重建任何冻结代。当前目标是改微信调试传输条件，业务数据仍沿原任务 USB 8798 通道。
- 用户已确认开发工具登录、手机开热点及电脑连接。USB 目标唯一且可用；Android 无线 ADB 开关不是微信 LAN 调试的前提。手机截图最初在非小程序前台被公共守卫拒绝，没有读取其它手机内容。

## 已执行与实际结果

- `miniapp:devtools:sync` 返回 current、0.3.14、reloadRequired=false。当前入口 `D:/微信web开发者工具`；第一次登录过期，官方 login 窗口已打开。原 pending 查询返回 Task not found 后没有重复登录；用户完成登录后 status 实读 loginExpired=false / versionRelation=equal。不保存账号标识。
- 热点 WLAN 已获得新的 /24 本地直连路由，Meta TUN 保持 Up。精确本机地址只用于当前操作，不作为稳定配置。当前 shell 未提升；防火墙规则读取返回拒绝访问，尚未更改规则或防火墙。
- 原 55441/8799/8798 均未监听。先由原 pg_ctl/data owner 恢复已有隔离 PG；随后沿原 `start-readonly-api-terrain-r20.private.ps1` 恢复只读 API，实际 `/health/ready` 为 200、ready=true。未重种 DB、迁移、清账户或改原配置；volatile Context/内存 cache 重新开始，不能与旧运行作同条件性能数值比较。
- 自动审批拒绝一次启动 8798 bridge 的命令，仅返回 `blocked by policy`。未改入口绕过。已准备并仅语法检查私有 `lan-debug-20261023/start-existing-data-lane.ps1` 与 cmd；用户亲自双击。随后实际 health 为 upstream200、anonymousOnly=true、accountRoutesAvailable=false、reminderWorker=false；stderr 0 B；原 USB 8798 映射实际存在。服务配置 SHA `f10f5a7e0dc77d701fc788e19fa1643b49692f589d4152aea8391410daccb4fc`、bridge entry SHA `90c9a2911c390b2085fbf8da2fcd2bb8c5e93d9976e54ce39367a53aa6fd48d9` 保持。collector 在恢复前为 27 件，未清理、未采样。
- 同一 prepared 项目已通过官方 initializer 打开 fullMode；官方模拟器截图实际显示 Map、采用工具栏与无底栏。它是桌面模拟器图，不是手机连接证明。
- official currentPage 首次超时；一次有界官方 cli auto 恢复返回 autoPort=requestedAutoPort，随后 currentPage 仍超时。停止该读页恢复分支，不重复旧 SDK/端口/重启清单。官方 screenshot 是工作通道。
- 已发起一次该项目的 `automation_viewport_action --action remote`，执行宿主 session 29114；原句柄已收为 `timeout waiting for automator response`，没有重发、未宣称手机连接。已让用户按实际窗口判断：若已有二维码不重发，若仍普通项目则点击一次真机调试，再选热点 WLAN 地址的 LAN 模式，先不扫码。等待用户确认二维码就绪，才核当前监听与实际手机到电脑的通路。

## 下一步与成功边界

用户回报并提供当前 DevTools `2.02.2610192` 截图：`main package source size 2066KB exceed max limit 2048KB`（17:26:07）。失败发生在调试连接之前，不能归因 LAN 或 TUN。普通 gen18 原官方预览仅余8,957B，不能将其当当前真机调试准入。没有重发同一个超限条件。

沿当前官方 project-config 场景和字段表，在**仅此 prepared 项目**新增 `project.private.config.json`，只含 `setting.bigPackageSizeSupport=true`；该官方选项用于预览/真机调试。独立核查见 [LAN 包体审计](LAN-DEBUG-PACKAGE-AUDIT-20261023.md)，新代理已结束。未改仓库配置、源码、正式2MiB预算或任一冻结代。这是开发期工具条件，实际成功待验，不声称生产超限修复。

配置后核字节时发现 IDE 在17:19:33另生成了25B的 `pages/my/index.wxss`，仅内容注释；原339文件无变更/缺失。已把唯一新增注释文件完整保全到私有 `ide-created-empty-my-style.wxss`，精确移除该生成物后重新指纹恢复为原339件/5,017,634B/`bee4293e…`。没有将IDE生成内容反写生产；若官方下一操作再次生成，记录该实际条件，不循环删除制造结果。

新增官方开发期开关后，用户截图已显示二维码和4946KB总包，Android、LAN勾选且选中真实WLAN地址。没有再次出现2066KB拒包；这只证明本次开发期打包已到二维码，不是正式2MiB预算修复。原SDK超时通道未重试。

手机USB shell读回到热点电脑的直连路由，电脑端IPv4 TCP连接成功，但手机访问两个实际调试监听均约3秒失败。Windows实际存在该DevTools程序的Public入站TCP/UDP阻断、Private允许；不是凭默认防火墙猜测。实际提升执行已成功，第一次守卫遇到LAN选项重建端口而停止；第二次发现显式阻断而停止，均未改规则。精确例外首版被Windows地址前缀校验拒绝，已回滚；修正IPv6全范围表达后，实际读回成功。

当前临时变更：原Public TCP阻断仍启用，覆盖除当前手机外的所有IPv4及全部IPv6；补一条阻断保护当前手机其它TCP端口；只允许该手机到当前WLAN地址、该DevTools可执行文件的两个实际调试TCP端口。UDP及其它规则、网络类别、VPN/TUN均未改。修后手机同一路径两个TCP连接分别111ms/105ms成功，证明该连接层已恢复；不证明微信完整握手或旧Sky断连原因。精确身份、规则名/原范围、创建/失败/回滚与恢复脚本均保存在私有 `lan-debug-20261023/`，主要回执 `firewall-exception-result-2.private.json`，原规则备份 `firewall-original-block-2.private.json`，结束时用已准备的 `restore-owned-firewall.ps1` 恢复并读回，不按历史PID/端口重放。

### 首次热点连接结果与换网

用户扫码后实际手机Map显示连接正常，USB实看扩展面板收到105条消息，稍后364条、待确认/待发送均0，面板保留 `cmdId1005/errCode1`。官方 currentPage 返回 `/pages/map/index`；systemInfo 返回嵌套result，当前解析未取得其platform字段，不以空字段推断设备失败。

用户电脑截图显示NIO目标、非零收发、Memory面板50.5MB、调试往返774ms、连接方式“其他”。这不是FPS或已证明LAN。Windows两个实际调试端口的持续连接仅来自同一DevTools自己的loopback客户端；没有当前手机peer连接。手机只读 `ss -tn dst <当前电脑>` 也没有匹配TCP行。保留“LAN未认证”，不把这些观察扩大为已证全部WAN原因、TUN根因或热点平台永久不支持。没有进入Sky、Play或Heap采集。

用户说明没有第二台热点手机，但两台均可接酒店Wi-Fi，于是选择这一真实条件变化。Root已沿公共USB fresh capture/实看，点击调试“结束”及确认；随后目标离开Mini Program前台，守卫拒绝进一步截图，未读取其它手机内容。此为主动结束，不是产品崩溃。热点临时防火墙例外已实际恢复：原TCP阻断RemoteAddress=Any、两条任务临时规则已移除，回执 `firewall-restore-result.private.json`；VPN未改。

### 酒店 Wi-Fi 实际结果

用户确认两台连接酒店Wi-Fi并重新生成LAN二维码后，出现额外的实际对外监听TCP8002；另外两个随机监听仍存在，不能混称它们的职责。已绑定当前DevTools进程/创建时间、WLAN地址及手机wlan路由，对本次手机→电脑8002作与此前相同的有限防火墙例外，实际规则读回成功。电脑本机IPv4连接成功；手机仍失败。

本次进一步在同一个受限USB网络诊断中只归类该探测stderr：exit1、noRoute=true、refused/reset/timeout/permissionDenied均false；不是只凭空输出当失败。手机到该电脑的邻居项为FAILED，表明当前局域网邻居解析未成功。它支持酒店设备隔离或其它链路限制，不等于已查清酒店AP配置，也不归因VPN或继续修改Windows防火墙。没有扫码该酒店二维码、没有Sky/Heap/Play采集。

酒店临时规则已通过原恢复owner恢复：`hotel-firewall-restore-result.private.json` success、原阻断RemoteAddress=Any、两条hotel临时规则已移除。旧热点及酒店例外均不再活动；不重跑已完成恢复脚本。

### 电脑移动热点接入过程

用户无第二台热点手机；下一条候选是电脑保持酒店Wi-Fi与VPN/TUN，同时通过Windows移动热点让测试手机直接连接电脑。微软支持文档明确可以共享现有Wi-Fi，无需流量卡；这是可行的系统能力说明，不是本机已经成功。电脑存在Wi-Fi Direct虚拟适配器，icssvc/SharedAccess当前停止但可手动启动。

已打开 `ms-settings:network-mobilehotspot`。PowerShell7无法加载WinRT类型；两个显式shell选择仍实读7.6.5，不能把它们说成5.1验证。之后显式调用系统WindowsPowerShell进行只读WinRT能力查询，被该shell的执行策略拒绝加载本地脚本；没有放宽或绕过执行策略，不能据此判断热点硬件不支持。

用户已打开电脑移动热点并让手机连接，但手机提示Wi-Fi无互联网。实际核对：Wi-Fi Direct #2、InterfaceIndex9已Up，地址192.168.137.1/24；icssvc/SharedAccess运行，原WLAN酒店上行及Meta TUN均Up。手机路由确实通过wlan到电脑热点，邻居为REACHABLE。沿现有同一防火墙owner只为当前phone→192.168.137.1、该DevTools进程、TCP8002建立当前临时例外，规则回执 `pc-hotspot-firewall-result.private.json` success；手机随后TCP连接152ms成功。

独立互联网探测只建立：手机shell通过Wi-Fi的公网IPv4 TCP连接成功；`www.qq.com:443`连接未通过。尚未区分DNS解析、解析结果或目标TCP限制，不能据此说完全无互联网或已证明DNS错误。附加ping没有取得可解析结果，未据它继续改DNS/VPN。旧COM共享读取没有给出足够状态，也不能据它修改共享配置。未开启或关闭手机移动数据。

用户随后报18:31:25真机调试Timeout，明确是在**新二维码出现之前**卡“等待进程”；手机并未扫码或进入这次会话，不能归因Sky、手机内存或已经失败的LAN握手。当前外部监听已从8002变为8001，临时端口规则需在后续手机操作前随实际owner补齐，但它不是已证二维码前超时原因。

本机同一DevTools日志在18:29:55明确 `DGetProject / initWithProxyFunc` 等待30000ms超时，后续出现内部messageCenter超时；限定时间窗及非敏感摘要已保存 `preqr-timeout-summary.private.json`。没有读取或复制无关凭据/网络正文。Root核当前生产源码/config/packages无新增diff、gen18仍339件原bundle、私有大包开关true，沿官方initializer只关闭当前prepared项目；旧backend72328及auto/LAN监听均实读退出。随后同一绝对路径fullMode重开，模拟器控件实际出现，官方currentPage成功返回 `pages/map/index`。没有重建、清缓存/Storage、换账号或退出整个IDE。

恢复后一次官方 `automation_viewport_action remote`（exec session61028）最终仍返回 automator 超时，原结果已保全 `remote-after-reopen.raw.private.txt`；用户实看确认新二维码出现。该回执不能用于推断动作未发生，没有重复调用。用户选中 LAN / 192.168.137.1；随后核当前 DevTools backend 对外监听8002，手机TCP可达。`update-owned-lan-ports.ps1` 已实际执行并读回成功，仅把当前PC热点例外补齐8001/8002，保留相同手机、本地接口、程序及其它端口阻断。回执 `pc-hotspot-port-update.private.json`。用户扫码后一直转圈，未进入Map；不把二维码或端口可达计为微信握手成功。未进行Sky/Heap/Play。

### 热点互联网边界与恢复

针对扫码转圈，仅进一步检查已失败的域名边界：手机通过热点网关发出一条有界UDP DNS查询，实际收到匹配查询ID、rcode0、一个A记录且属于VPN内部198.18/15范围的回复。结合先前公网IP TCP成功、域名TCP失败，支持热点共享与VPN虚拟DNS地址转发不兼容这一候选；尚未证明唯一根因。未改DNS、代理、VPN/TUN或手机移动数据。

用户展示Windows移动热点共享源灰色。让用户只关闭Windows热点后，下拉可用但只有WLAN，无Meta。当前实读Wi-Fi Direct断开并失去192.168.137.1，WLAN与Meta仍Up，符合用户关闭热点，不是VPN退出。包含热点密码的用户截图不复制到仓库、不复述其中秘密。

旧COM属性读取为空不能当作无ICS能力；本次显式方法调用返回E_ACCESSDENIED，定位了此前读边界。按已授权Windows管理规则，以实际提升的只读PowerShell7读取ICS成功，`ics-state.private.json`确认能枚举WLAN与Meta，两者在热点关闭状态都未开启ICS。用户已重开热点并连回手机；`ics-state-on.private.json`成功枚举Wi-Fi Direct #2，所有枚举项的传统ICS SharingEnabled仍为false。不能把这个API视图当作现代移动热点完全没有NAT的证明。

为排除手机shell测试误走其它源地址，热点重开后仅作一次绑定手机热点源地址的TCP探测：公网IP成功、域名失败。此时原DevTools8001/8002监听均已退出，因此同批LAN端口失败不能归因防火墙/热点回归；需未来新二维码实际监听。用户提出“网关只接受不转发”，回复明确区分：已见至少部分转发，具体疑点在虚拟DNS地址后续转发，不是所有请求均不转发。

限定Windows ICS的单次原生调整已尝试：备份当前全部API视图及精确Meta/热点GUID、地址和状态，只计划Meta为public、当前Wi-Fi Direct为private；不改VPN客户端、节点、DNS或路由配置。`set-hotspot-sharing.ps1 -Action Apply`在实际提升进程内返回 `0x80040201`（事件无法调用任何订户），未成功；同一脚本即时回滚并读回原pair的SharingEnabled=false，`ics-apply.private.json`的rollback.success=true。WLAN/Meta/热点仍Up，相关系统服务均Running，不重启服务、不重注册DLL、不重试同一COM调用。

自动ICS接口失败后，用户已在Windows“网络连接→Meta属性→共享”完成共享到“本地连接* 2”，并回复成功。只读提升核验 `ics-state-after-ui.private.json` 确认Meta SharingEnabled=true/type0、Wi-Fi Direct true/type1、WLAN false。手机同一热点源地址绑定的公网IP和域名TCP均成功，域名访问从调整前失败变为成功；这是该网络边界恢复的实际证据，尚不替代微信完整启动。VPN/TUN保持开启，未改客户端、节点或DNS规则。当前Windows ICS共享pair活动；自动尝试前的原状态仍保存在 `ics-scoped-backup.private.json`，带精确owner守卫的 `set-hotspot-sharing.ps1 -Action Restore` 可恢复该pair，尚未执行。

域名连接恢复后，本聊天仅发起一次同gen18的官方remote调用，exec session6554已收尾；私有输出 `remote-after-ics-ui.raw.private.txt`仍含automator timeout，不以宿主exit0计成功、不重复发起。随后实际出现同DevTools backend的0.0.0.0:8001监听，手机绑定热点源地址到该实际端口TCP成功（123ms，仅连接层耗时）。当前临时防火墙已包含8001，因此没有扩大规则或再次修改网络。

准备USB画面核验时，原设备采集session守卫报bundle_changed_start_new_session。实际差异仅是IDE在18:37重开项目时再次生成的25B `pages/my/index.wxss`注释文件；当前其余339文件按原聚合规则重算仍严格等于原bee4293e…，新增文件与前次保全的注释原件SHA及内容一致。此次保留它，不循环删除、不重建。当前实际340件/5,017,659B/SHA `54ec99e57858230effcb90bdc10b0e801631d35d6c02e57f243e9aaac30f6641`，证据 `bundle-after-ide-reopen.private.json`。原session和原记录保留，公共start仅新建采集绑定 `C:/Users/momoooo/AppData/Local/Temp/starward-device-test-JCBlCw`；该本机包身份不宣称已逐字节验证手机内的包。

用户扫码后报告黑屏、LAN失败并回退WAN；19:15的公共USB实图也明确显示“连接局域网 ws://192.168.137.1:8001/ 失败，已切换回广域网模式”以及“连接断开”，私有截图 `starward-device-test-JCBlCw/screen-3bb8b7cd-f8f5-40df-8cb6-1983cdbc9540.png`。因此本次LAN明确失败，不能把热点域名恢复当作微信握手完成。没有进入Map/Sky或开始内存采集。

当前8001无手机Established对端，进一步读回监听也已退出。限定时间窗主进程日志记录19:11:27 root init success，19:13:42.935 native-window-close，随后19:13:42.980 remote quit、19:13:45强制结束仍closing的窗口；19:16出现messageCenter等待300000ms超时。这些仅说明调试窗口退出及调用未正常完成，尚不能判定是谁关闭、关闭与手机首次报错的先后，也不能倒推出更早TCP探测无效。服务端日志没有足够的本次LAN握手拒绝原因。未重试二维码、修改防火墙/路由或读取无关手机内容。

用户确认19:13的窗口由自己关闭；尚未确认关闭与手机首次报错的先后，所以不直接认定初始失败原因。Root沿新采集session的fresh capture→实看逐步确认旧错误、展开面板（cmdId1006/errCode-1、ERR_CONNECTION_TIMED_OUT、已接收0），执行“结束→确定”。随后公共前台守卫拒绝截图，符合主动退出而非新崩溃，没有读取其它手机内容。

排除窗口关闭这一干扰的单次新会话已发起，原exec session4635已终态且回执仍timeout，私有 `remote-window-kept-open.raw.private.txt`。实际新的8001监听由同一DevTools拥有。19:23开始有界只读连接观察 `window-kept-open-connections.private.jsonl`（exec session30123已正常结束，90次采样）；它只记录8001/8002监听身份与当前测试手机TCP状态，不采包正文。

**当前已证明Map LAN直连：** 用户确认保持电脑窗口打开后已进Map。观察90次均有预期DevTools监听，19:24:45.639至19:25:44.467的35次采样持续有手机peer Established；随后手机自身 `ss`也有同一192.168.137.1:8001 Established。19:25 USB实图显示正常Map及绿色已连接，19:33 Windows再次读回同一持续连接。手机系统连接信息确认默认网络为WIFI且VALIDATED。此次没有关闭VPN、没有以广域网回退冒充LAN成功。

已移动手机调试浮层以露出搜索入口，沿真实搜索进入保留的“隔离测试·星河平台”点位面板。曾打开天文事件面板后通过正常Android Back返回；地图空白点击只关闭面板，不产生新选点。未改产品状态/源码以绕过入口。点位页19:34实图显示空气质量和近期天气不可用，19:35显示计划不可用；保留这些数据/只读桥账户限制，不计完整产品链路通过。

19:36沿正常“云观星”按钮进入Sky，真实星图/星座线/随后插画可见。用户先提供电脑Memory截图，回报Map RTT不到100ms而进Sky后“未连接”/RTT空；当时VM显示80.1MB。Root停止拟议视野/采集动作，只读确认19:41电脑及手机到8001两端仍Established，手机浮层显示已连接、服务器正常，界面菜单能响应。一次官方currentPage实读success=true、`sky/detail/index`（原结果 `sky-current-page.raw.private.txt`）。用户随后提供电脑恢复截图：Wi-Fi、RTT142ms、消息继续收发、VM106MB。准确结论是本轮Sky进入后出现暂时调试状态异常并恢复，不是已证底层LAN永久断开，也不是已证OOM/泄漏。两张VM数值不是同条件保留量曲线，不据此诊断增长。

用户按最小手动步骤完成双指捏合（现有公共USB入口不提供双指）。19:50实图 `starward-device-test-JCBlCw/screen-63abbc83-321b-45b0-b682-de7e7bc573ef.png` 显示264.4°、完整天空圆盘、密集非空星图、星座及地平轮廓；手机浮层两项正常，电脑监听和手机Established仍存在。未开始Play、未开其它profiler、没有再换网络/扫码。

### 2026-10-23 最终结果：LAN 与单次 Heap 导出通路已打通

证据模式为 `development_feedback`；本节确认诊断采集能力，不认证完整产品验收。

用户确认已保存本次唯一Heap快照，20:00:49文件落在用户指定的现有D盘目录。Root使用既有 `scripts/diagnose-target-heap.mjs` 完整解析并验证；没有重采、重建或将原始内容上传/写入Git。

- 原始文件：`D:/dev/sky-lan-fullview.heapsnapshot`，99,830,747B（约95.2MiB），SHA-256 `a36c31772fa2d29da5db6f222837e531f5ee14b64c443537bcf3c654a29ea14c`。
- 解析报告：`D:/dev/sky-lan-fullview.analysis.json`。状态 `INITIAL_SNAPSHOT_ONLY`；1,395,696节点、4,851,854条边。声明数量、节点/边步长、逐节点边数之和、全部目标引用对齐及范围均通过；所记录节点self_size合计117,811,513B。该合计不是整个进程/RSS/GPU内存。
- 场景核验：`D:/dev/sky-lan-fullview.target-check.json`。只输出源码已知的固定公开标记和计数，原始字符串、属性值及节点身份未披露。实际对象属性引用包含 `sky-orientation-route` 6处、`sky-orientation-canvas` 16处及 `sky/detail/index` 7处；有WebGLRenderingContext、OffscreenCanvas与CanvasRenderingContext2D对象。结合本次官方currentPage和真机完整视野实图，支持此快照包含当前Sky相关内容；它不证明跨VM、native或GPU的全部保留情况。

**本轮完成边界：** 保持VPN/TUN的真实LAN真机调试、普通gen18正常Sky完整视野、一次Heap快照生成/导出及本地完整性检查已实现。进入Sky曾出现短暂调试状态异常后恢复，保留该事实，不将其改写为全程无异常。没有运行Play增长曲线或完成OOM原因归因；单份快照不能关闭泄漏、A/B性能或完整Goal的其余义务。原Goal仍paused，另一聊天的源码实施/总HANDOFF/PLAN未被本任务覆盖。

**当前状态与后续边界：** 20:10实读仍有当前DevTools的8001监听及手机Established，Meta仍Up。用户要求保留Harness/冻结构建/私有原件，本任务保留当前有效gen18、采集session、原件和已完成快照，不运行会删除它们的feedback/session stop。正在使用的Windows ICS Meta→当前热点及仅当前手机/接口/DevTools/8001–8002的有限防火墙例外继续支撑此会话；本轮没有在有效连接中执行恢复。结束该调试会话后，按本文件的精确owner备份与 `restore-owned-firewall.ps1` 恢复临时防火墙，并按需要用 `set-hotspot-sharing.ps1 -Action Restore` 恢复本次ICS pair，均须先核当前状态；不重放已成功恢复的旧热点/酒店规则。没有新的必需人类动作；如继续内存原因调查，应复用本次有效基线，另按待决问题选择观察，不重复此网络准入试验。

当前PC热点临时规则仍活动；原阻断范围备份 `pc-hotspot-firewall-original-block.private.json`，当前 `restore-owned-firewall.ps1` 已对齐PC热点两条规则，尚未执行。结束该调试会话时实际恢复并读回，当前保留理由与范围见上文；热点/酒店旧恢复回执已成功，不重跑。Windows热点及其密码由用户开启，未改其SSID/密码、VPN/TUN、账号或业务构建。完整Goal继续paused。

本轮网络准入与单次采集到此停止，保留已有成果。后续若继续调查，沿公共USB fresh capture→实看→输入，并以当前问题选择必要观察；不把Android无线调试开关当USB或微信LAN的前提，不重做已回答的网络对照。

用户随后明确收口标准：本次已经解决的“高内存场景中调试连接可用，以及Heap快照功能正常”足以认可该方案跑通，不要求逐项验证Performance、Allocation sampling或Allocation timeline。后续将现有官方真机调试通路作为卡顿/响应延迟与内存增长问题的主力排查路线，围绕实际待决问题直接选用必要录制和分析；不先安排额外功能准入清单。遇到具体操作失败或数据缺口时才处理对应边界。这个决定不把尚未使用的功能写成已实测，也不改变单份快照/JS执行层的证据范围，更不关闭OOM根因和产品修复义务。

### 开发skill沉淀与检查

按用户后续明确要求，[开发skill](../../skills/starward-miniapp-development/SKILL.md#performance-investigations)与[性能方法](../../skills/starward-miniapp-development/references/performance-investigation.md)已收敛为“真机调试开发者工具（主用）”和“普通预览与 Android 系统观测（备用）”。备用仅保留核心关联、进程/域判断、有限寿命/owner观察和早期导出逻辑。新增[VPN/TUN LAN指引](../../skills/starward-miniapp-development/references/true-debug-lan.md)，按拓扑、共享出口与下行、手机侧地址、实际端口/防火墙、窗口保活及真实连接证据组织；本机地址/参数、时间线与原始失败材料仍只归本任务。

设备skill、开发Context与同一PLAN的选型文字已同步，保留其它聊天正在实施的源码与任务义务。独立只读审查发现设备skill仍固定物理WLAN、恢复时无条件remote两处冲突，均已修正，审查代理已结束。项目skill检查4/4通过，4份YAML由项目已有解析器成功解析，64条本地引用/23个锚点无缺失，变更文档diff检查通过。内置Python quick_validate因缺少PyYAML不能启动；使用上述现有检查补检，未安装新依赖，也未以文档检查冒充产品验证。本轮沉淀未操作IDE/手机/网络或重采性能数据。

私有日志与用户启动脚本归 `C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/lan-debug-20261023/`；原账号、N05、R6、8791、VPN/配对、全部 Harness/冻结构建与原件保留。后续读回服务而非重跑用户脚本；不上传数据。
