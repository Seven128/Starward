# P3 独立WEAPP入口：天气资格与未来时间边界

2026-10-25。承接唯一[PLAN](PLAN.md) P3，仍为 `development_feedback`。记录时基线为main `2f32ccaf`，本批4个生产文件及5个测试文件共9件增量尚未提交；本文不建立第二计划或完整P3验收。当前运行与后续操作只归[HANDOFF](HANDOFF.md)。

## 实际反例与修复责任

Root先核canonical旧产物58dc、339件/5,036,803B，经官方CLI打开s4；一次 `simulator_open_page` 后实际Map、currentPage及元素查询可用。正式 `spot:` 的Sky/report/geometry允许匿名，因此可独立于正常My推进。Root沿Search选择任务库明确标为“隔离测试”的正式点再进入Sky；该资料不代表实际场地或正式身份验收。

修前Sky显示“天空资料未加载”。同Context匿名HTTP为200、整体 `dataState=UNAVAILABLE`，但BSCv3星场、48/48 frames、48 observationFrames及覆盖当前时刻的timeModel均可用；warnings来自天气小时、预警及来源不可用。独审确认状态耦合在 `astronomy-service` 的完整SkyReport和精确目标投影。窄修将这类独立有效天文结果归为 `PARTIAL`；`computeDecision`、天气缺测/预警/出行决策及真正整体失效、权限/Context拒绝、坏几何守卫保原含义。

Map规划Context为13:00Z，晚于当时现实04:xxZ。另一独审确认初始bind、cancel及页面/presentation fallback遗漏上限；因修前天气gate已阻止绘制，未观察到未来天空实际绘制。修复在原时间owner保真实 `committedAt` 作Context身份，并为每binding建立合法 `restoreAt`；初始、取消与呈现fallback共用该基准。公共Context仅由显式Apply提交，正常Play同run内稍早的真实完成帧语义保留。样式、设计资源和Map未来规划未改。

## 已完成的开发检查与构建

| 检查 | 实际结果与边界 |
| --- | --- |
| 天气投影反查 | 旧实现2项失败，均为UNAVAILABLE不等于PARTIAL；窄修后astronomy-reuse/weather-astronomy-coverage **14/14通过**。覆盖天气UNAVAILABLE/EXPIRED、有效天文及精确目标和仍不可用的出行决策。 |
| 时间owner及消费者 | 新反例在旧实现为10 pass/2 fail；修后相关源检查 **108/108通过、0 skipped**。Root补空值守卫、nullable来源时间校验和测试类型声明后，location-preview **3/3通过**。 |
| 类型检查 | Mini API与Mini Program两workspace均exit0；未把先前类型错误计为通过。 |
| 完整WEAPP编译 | canonical和隔离构建均exit0，各有既有10项CSS顺序/webpack建议警告；均通过包体预算和实际编译地址owner检查。 |

首次目标对比遇到不同请求的 `source.retrievedAt` 差异；检查保全部科学及来源字段，并独立验证合法采集时间，不要求两次读取时间相等。上述源/类型检查不替代控件可见性、真实用户操作或物理设备结果。

| 产物 | 文件/总字节 | 主包字节 | SHA256 |
| --- | --- | --- | --- |
| 当前canonical | 339 / 5,037,238 | 2,025,876 | `413a55fb88e640372c2ac2774642d828bb4fc4ba1355f757752e20e49d44a485` |
| 当前隔离WEAPP | 339 / 5,037,218 | 2,025,856 | `2d68c3ea45c6bf98017b49e488990000f8bfcc4e714482a76a4eca09e489b8eb` |

原手机58dc候选及其原件保留，不能冒充本批新源码。s4在最新源码完整编译及refresh触发后精确关闭，随后使用s5隔离入口；不将refresh回执当作渲染一致性证明。

## 当前源码的真实运行读回

原API暖进程不是watch。本轮复用既有PG备份/恢复owner，来源备份848,158B，独立副本恢复fingerprint匹配；未写原业务库、重启原API、启动worker或接触Redis。当前源码隔离API本轮为12104/8807，后端源SHA为 `c3fb23612f92112f2bdb6913f77a5391c6b6ec3882b1d11e946b814a351a236b`。Root核可执行路径、UTC出生瞬时、监听owner和源码SHA均匹配；出生时间文本格式不等不构成进程替换，不据此重启。

实际HTTP读回未发送管理或用户凭据：

| 消费者 | 结果 |
| --- | --- |
| 原Context | 200/FRESH，revision仍为1，`selectedAt=2026-10-25T13:00:00.000Z`，规划时刻未改。 |
| 完整SkyReport | 200/PARTIAL、星场AVAILABLE、48/48可用帧；天气48行仍缺测，预警状态仍UNAVAILABLE。 |
| 精确目标 | 200/PARTIAL、3项，结果时刻精确等于实际帧 `2026-10-25T06:03:48.468Z`。 |

WEAPP实际可访问标签报告已呈现8404颗目录对象，iOS首次帧为05:33:13.058Z，Android对照帧为06:03:48.468Z，均早于各自观测时的现实当前；原Map Context仍为13:00Z。这支持当前源码的独立天文可用及初始时间上限结果，不证明SAO已实际加载、所有目录对象都可见、正常Play或全部取消/应用旅程完成。

私有原图、原HTTP响应、route、构建和运行回执归既有entry owner的 `desktop-sky-*`、`sky-current-api-selection.private.json` 及 `sky-current-4086cb4f36b44324/`；关键读回为 `current-sky-http.private.json`、`current-sky-runtime.private.json`、`canonical-built.private.json`、`isolated-built.private.json`。窗口和服务收尾状态由HANDOFF维护，不能仅凭这些文件重用旧进程或输入许可。

## 显示边界与采用资源

iPhone及Pixel 9的官方截图均只见天空；Root读到页面opacity=1、visibility=visible，meta有非零布局和浅色文字、z=8，菜单display=flex、52×388、z=12且aria-expanded=true，Canvas父层z=0。独审未发现源码z序理由；普通节点或expanded事实不能证明控件实际可见。

官方截图实现只读审阅未发现“把业务Canvas单独后贴到顶层”的代码；公开wait/编码参数或同函数别名不能构成另一合成通道。一次公开popup返回成功，但截图仅2×2，属无效画面。当前保留桌面像素合成未判明，既不认定工具故障，也不猜改z-index或cover-view；真实控件可见性和视觉一致性未通过。

当前采用源 `5385664345158066168` 已经现有官方Stitch CLI v0.12.0只读恢复，无缓存列表22项、未截断且节点仍在。HTML为166,459B，SHA `4c6cfc021e5f3c02db4036eab437fe64d25f57c8adbd49864a755ce598345c79`，与历史采用稿一致，含A–K共11态。当前官方PNG为377×512，SHA `fdcd63106b02ead5a3834c2c25451359a46ab9c38c5849266d867383db6343d2`，已实看，仅展示E时间态及入场序列；不能冒充缺失的旧全尺寸 `adopted-stitch-render.png`。原件与回执归private entry的 `adopted-sky-5385664345158066168/`。其黑色天空占位不供应真实星图、传感器或产品验收，没有生成、上传或修改远端资源。

## 已排除的诊断假设

“裸Z wire格式阻断Play/整数尺”的疑点已撤销。Node对原始HTTP JSON直接解析并反查242个时间字段，小时行、模型边界/knots、观测帧和星场几何均为canonical `.000Z`。此前显示差异来自PowerShell默认JSON日期转换后再序列化；后续原串核对用 `-DateKind String` 或Node `JSON.parse`。原响应经既有投影后模型可用，源owner可进入PLAYING、精确前进一秒并接受整数尺输入；这仅排除格式阻断，不能替代实际WEAPP Play验收。未为该假设改代码、增加normalizer或新回归；私有反查归 `wire-time-recheck.private.json`。

## 保全、CI与未完范围

桌面切换前只核当前官方scene的四个已知Starward storage key均不存在，未读取无限制值、未推定其他scene或N05为空，也未清storage。原服务、原库、私有原件、N05/R6、VPN及冻结代保留；无提醒重发、部署重试或原件上传。

Map同时出现过相机调整未完成提示，点位/详情保留。只读追踪表明它可合并请求期限、范围修正或原生投影失败，不能从截图归因为Context失败或F04物理资源退休。本轮随后沿既有Native读回函数、当前所选正式测试点和原机型做了一次有效读回：page实例前后稳定，布局/getScale/getRegion已返回，selected-projection的toScreenLocation在既有2.5秒读取期限内未收回，后续角点/逆投影未取得。因此不认证4km或居中，也不推断永久不支持、物理释放或源算法错误，不重试同条件或添加fallback。此前`.cmd`多行参数导致的语法错误和Node路径别名导入失败均为准备/读回入口错误，没有计作产品反例；有效调用复用现有官方原生CLI，回执为private run的`map-focus-native-cli.private.json`和`map-focus-native-summary.private.json`。原机型已恢复，popup/s5已精确关闭后同路径重开作此读回；关闭前已确认产物指纹完整匹配2d68。

已交付head `2f32ccaf` 的Product40160622692和Context40160622664通过，但不覆盖当前dirty P3。该head的staging40161606084在镜像发布前因 `host_preflight_disk_below_10_gib` 失败，发布/promotion跳过，未部署。真实控件、Cancel/Apply、正常Play、SAO、手机、正式身份/供给及完整视觉仍有未验范围；两类性能和内存/OOM继续后置，OOM仍未解决，整个Goal未完成。
