# P1 现安装初始化前窗口等待定位

**新增进展：实际服务端分派在建立MCP transport前等待项目窗口IPC，固定超时300秒。底层renderer无回复原因及真实page仍UNKNOWN。** 本轮全为现安装/既有日志前缀只读核查，零新HTTP、初始化、SDK、工具、授权、截图、构建或重启；安装、产品源码及300WEAPP不改。

## 实际owner与顺序

[钉住的8个安装模块及既有回执/日志前缀](p1-server-root-readback-2026-10-06.json)：现2.02.2609232包中McpServerService的handlePost通过token/trust后，先await bootstrapProjectWindowsForInitialize，再reportSessionInit allow、create/connect transport、handleRequest。bootstrap枚举所有非closing项目窗口，Promise.all逐个callClientService(IAutomatorBridgeService, notifyMcpBootstrap)；成功才记preparedWinIds，失败捕获后继续。heartbeat只读running/port/sessions，没有执行此链，因此HTTP200不证明初始化可用。

调用经AbTransferActionService→messager invoke；ABMessagerProxy fakeInvoke/transferInvoke使用MAX_INVOKE_TIMEOUT=3e5，超时抛Error(Timeout)。renderer notifyMcpBootstrap先await ensureStarted，其startDevtools可等待settings rehydration/init；之后才发起compileSimulatorForBootstrap的promise而不await它。源码允许多种无回复原因，不证明当前renderer执行到了哪一步。未获信任client分支会返回403/auth task，不能把原无headers直接说成授权弹窗等待。

## 原请求时刻对应与限度

原单次4秒探针checkedAt=2026-10-05T19:45:56.763Z，依原脚本是在请求关闭和只读输入复核后写出。旧日志2026-10-02-07-09-21-988.log第38506行2026-10-06 03:50:52.753+08记录bootstrap失败Error Timeout；下一堆栈为实际ABMessagerProxy模块的timer，38510行同一时刻为Codex/cli-mcp/session_init/allow。距原回执295990ms，与回执已含约4秒客户deadline及300秒IPC等待相符。日志保存行号/SHA/固定类别，不保存原body、session/token或敏感字段；两个既有完整前缀SHA读回一致，增长不作整体不变保证。

这是较强的服务端阶段/时序证据，缺requestId和动态window/callback归属，不能唯一认领原probe、不能声称当前renderer死锁/ghost window、不能声称初始化返回或原截图失败全部同一原因。客户关闭也不证明服务器取消；本轮不创建新session或清旧session。原初始化无headers/返回缺失、旧CLI_CLIENT_DEADLINE/MCP_INIT_ERROR与真实原生page UNKNOWN均保持。

## 决定

不通过延长客户timeout、反复initialize、清缓存、关闭未知项目窗口或编辑安装绕过证据缺口。只读下一证据收窄到原会话实际项目renderer消息/lifecycle与start/settings owner，先定位工作区归属和未回复callback，再决定是否有本工作区可修owner。没有此证据就保UNKNOWN转独立新合格Q1，不重扫无变化日志；这些安装控制事实不替代云观星产品验收。普通Prepared空/光学HiPS关，NGC5907当前显示FAILED退出及全部33项账保持。

P1 原官方会话renderer精确归属只读定位：已定位现安装initialize在transport前等待所有非closing项目窗口notifyMcpBootstrap，IPC固定300秒；原四秒探针回执后295990ms出现bootstrap Timeout堆栈及同刻Codex/cli-mcp/allow，强相关但日志无requestId，不冒唯一因果或已恢复。下一只沿原13736/23977当前项目窗口/renderer生命周期及ensureStarted→startDevtools→settings rehydration owner证据定位未回复callback与本工作区归属；区分消息未达、窗口失效与内部start等待，不据此猜ghost window，不延超时/重发initialize/SDK/截图，不改安装或重启有效3432/24040/13736。仅得到具体可修本工作区owner后一次有界原会话验证再验真实page/WXML/Canvas/控件/Back；若缺新可行动归属证据保UNKNOWN并转独立合格Q1供给，不循环扫描日志。Q1 NGC5907完整区域原59Scene/93请求与失败保护恢复保留，当前连续显示FAILED退出，17.067′不补25.6′外围、目录不扩/5906 Dup不互换；成品只有新合格更广覆盖/可信几何或有依据新处理证据才重开，不重下/无变化加工/PSF/线性小修/掩边补缺。普通Prepared空/HiPS关；原R1、全部FAILED/UNKNOWN/33项、完整交互/图质、真实权限/可见时长/物理峰、Android-iOS/新版月面/200DAU/独审保开放。Goal active无预算，无提交推送采购部署发布外联。
